import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { ApiError, api } from "../api";
import { friendlyError } from "../api/http";
import type {
  ChatAction,
  ConversationState,
  DemoScenario,
  Message,
  Trace,
  TurnResponse,
  Verification,
} from "../api/types";

// ---------------------------------------------------------------------------
// Types

export interface ChatEntry {
  message: Message;
  /** Local-only decoration for customer bubbles (e.g. verification). */
  variant?: "verification" | "quick_reply";
}

export interface TurnTrace {
  turn: number;
  at: string;
  label: string;
  trace: Trace;
}

export interface ChatError {
  message: string;
  retryAfter?: number;
  canRetry: boolean;
  needsNewConversation: boolean;
}

interface Session {
  id: string;
  token: string;
}

interface ChatValue {
  open: boolean;
  docked: boolean;
  showSignals: boolean;
  entries: ChatEntry[];
  traces: TurnTrace[];
  verification: Verification;
  state: ConversationState;
  pending: boolean;
  pendingKind: "message" | "verify" | "escalate" | "start" | null;
  error: ChatError | null;
  starting: boolean;
  draft: string;
  usedProposals: ReadonlySet<string>;
  ratedMessages: ReadonlyMap<string, number>;
  setDraft: (text: string) => void;
  openChat: (opts?: { docked?: boolean; draft?: string }) => void;
  closeChat: () => void;
  setDocked: (docked: boolean) => void;
  setShowSignals: (show: boolean) => void;
  newConversation: () => Promise<void>;
  sendText: (text: string) => void;
  sendQuickReply: (label: string, value: string) => void;
  sendAction: (action: Extract<ChatAction, { type: "confirm" | "decline" }>, label: string) => void;
  verify: (orderNumber: string, email: string) => Promise<boolean>;
  escalate: () => void;
  rate: (messageId: string, rating: number) => Promise<void>;
  retry: () => void;
  runScenario: (scenario: DemoScenario) => Promise<void>;
  verifyFromTrackPage: (orderNumber: string, email: string) => Promise<void>;
}

const ChatContext = createContext<ChatValue | null>(null);
const SESSION_KEY = "saba.chat.session.v1";
const GUEST: Verification = { level: "L0" };

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { conversation_id?: string; client_token?: string };
    return s.conversation_id && s.client_token ? { id: s.conversation_id, token: s.client_token } : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ conversation_id: s.id, client_token: s.token }));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function customerMessage(id: string, text: string): Message {
  return { id, role: "customer", text, created_at: new Date().toISOString(), ui: [] };
}

function toChatError(err: unknown): ChatError {
  const needsNew =
    err instanceof ApiError &&
    (err.kind === "unauthorized" || (err.kind === "not_found" && /conversation/i.test(`${err.code} ${err.message}`)));
  const retryable = !(err instanceof ApiError) || ["rate_limited", "server", "network"].includes(err.kind);
  const e: ChatError = { message: friendlyError(err), canRetry: retryable && !needsNew, needsNewConversation: needsNew };
  if (err instanceof ApiError && err.retryAfterSeconds) e.retryAfter = err.retryAfterSeconds;
  return e;
}

// ---------------------------------------------------------------------------

export function ChatProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const onDemo = location.pathname.startsWith("/demo");

  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [signalsOverride, setSignalsOverride] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [traces, setTraces] = useState<TurnTrace[]>([]);
  const [verification, setVerification] = useState<Verification>(GUEST);
  const [convState, setConvState] = useState<ConversationState>("active");
  const [pendingKind, setPendingKind] = useState<ChatValue["pendingKind"]>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState("");
  const [usedProposals, setUsedProposals] = useState<Set<string>>(() => new Set());
  const [ratedMessages, setRatedMessages] = useState<Map<string, number>>(() => new Map());

  const sessionRef = useRef<Session | null>(loadSession());
  const startPromise = useRef<Promise<Session> | null>(null);
  const restored = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);
  const turnCounter = useRef(0);
  const epoch = useRef(0); // bumps on "new conversation" so stale responses are dropped

  // Signals default ON on /demo, OFF elsewhere, unless the user toggled it.
  const showSignals = signalsOverride ?? onDemo;
  useEffect(() => {
    setSignalsOverride(null);
  }, [onDemo]);

  const resetLocal = useCallback(() => {
    setEntries([]);
    setTraces([]);
    setVerification(GUEST);
    setConvState("active");
    setError(null);
    setUsedProposals(new Set());
    setRatedMessages(new Map());
    retryRef.current = null;
    turnCounter.current = 0;
  }, []);

  const createSession = useCallback(async (): Promise<Session> => {
    const myEpoch = epoch.current;
    setStarting(true);
    try {
      const res = await api.createConversation();
      const s = { id: res.conversation_id, token: res.client_token };
      if (myEpoch !== epoch.current) return s;
      sessionRef.current = s;
      saveSession(s);
      setVerification(res.verification ?? GUEST);
      setConvState(res.state ?? "active");
      setEntries((res.messages ?? []).map((m) => ({ message: m })));
      return s;
    } finally {
      setStarting(false);
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<Session> => {
    if (sessionRef.current) return sessionRef.current;
    if (!startPromise.current) {
      startPromise.current = createSession().finally(() => {
        startPromise.current = null;
      });
    }
    return startPromise.current;
  }, [createSession]);

  const startFresh = useCallback(async () => {
    try {
      setError(null);
      await ensureSession();
    } catch (err) {
      setError(toChatError(err));
      retryRef.current = () => void startFresh();
    }
  }, [ensureSession]);

  // On first open: restore an existing session, or start a new one.
  useEffect(() => {
    if (!open || restored.current) return;
    restored.current = true;
    const s = sessionRef.current;
    if (!s) {
      void startFresh();
      return;
    }
    setStarting(true);
    api
      .getConversation(s.id, s.token)
      .then((snap) => {
        setEntries((snap.messages ?? []).map((m) => ({ message: m })));
        setVerification(snap.verification ?? GUEST);
        setConvState(snap.state ?? "active");
      })
      .catch(() => {
        sessionRef.current = null;
        saveSession(null);
        void startFresh();
      })
      .finally(() => setStarting(false));
  }, [open, startFresh]);

  const applyTurn = useCallback((res: TurnResponse, label: string) => {
    const msgs = Array.isArray(res.messages) ? res.messages : [];
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.message.id));
      return [...prev, ...msgs.filter((m) => !seen.has(m.id)).map((m) => ({ message: m }))];
    });
    if (res.verification) setVerification(res.verification);
    if (res.state) setConvState(res.state);
    if (res.trace) {
      turnCounter.current += 1;
      const t: TurnTrace = { turn: turnCounter.current, at: new Date().toISOString(), label, trace: res.trace };
      setTraces((prev) => [...prev, t].slice(-30));
    }
  }, []);

  /**
   * Runs one request/response turn. The customer bubble (if any) is added
   * immediately; the request closure is reused verbatim on retry so the
   * client_message_id stays the same (server-side idempotency).
   */
  const runTurn = useCallback(
    async (
      kind: NonNullable<ChatValue["pendingKind"]>,
      label: string,
      bubble: ChatEntry | null,
      call: (s: Session) => Promise<TurnResponse>,
    ): Promise<TurnResponse | null> => {
      const myEpoch = epoch.current;
      if (bubble) setEntries((prev) => [...prev, bubble]);
      setError(null);
      setPendingKind(kind);
      const attempt = async (): Promise<TurnResponse | null> => {
        setError(null);
        setPendingKind(kind);
        try {
          const s = await ensureSession();
          const res = await call(s);
          if (myEpoch !== epoch.current) return null;
          applyTurn(res, label);
          retryRef.current = null;
          return res;
        } catch (err) {
          if (myEpoch !== epoch.current) return null;
          setError(toChatError(err));
          retryRef.current = () => void attempt();
          return null;
        } finally {
          if (myEpoch === epoch.current) setPendingKind(null);
        }
      };
      return attempt();
    },
    [ensureSession, applyTurn],
  );

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const id = uuid();
      void runTurn("message", text, { message: customerMessage(id, text) }, (s) =>
        api.sendMessage(s.id, s.token, { client_message_id: id, text }),
      );
    },
    [runTurn],
  );

  const sendQuickReply = useCallback(
    (label: string, value: string) => {
      const id = uuid();
      void runTurn("message", label, { message: customerMessage(id, label), variant: "quick_reply" }, (s) =>
        api.sendMessage(s.id, s.token, { client_message_id: id, action: { type: "quick_reply", value } }),
      );
    },
    [runTurn],
  );

  const sendAction = useCallback(
    (action: Extract<ChatAction, { type: "confirm" | "decline" }>, label: string) => {
      setUsedProposals((prev) => new Set(prev).add(action.proposal_id));
      const id = uuid();
      void runTurn("message", label, { message: customerMessage(id, label), variant: "quick_reply" }, (s) =>
        api.sendMessage(s.id, s.token, { client_message_id: id, action }),
      );
    },
    [runTurn],
  );

  const verify = useCallback(
    async (orderNumber: string, email: string) => {
      const order = orderNumber.trim().toUpperCase();
      const mail = email.trim();
      const res = await runTurn(
        "verify",
        `Verify ${order}`,
        { message: customerMessage(uuid(), `${order} · ${mail}`), variant: "verification" },
        (s) => api.verifyOrder(s.id, s.token, order, mail),
      );
      return !!res && !!res.verification && res.verification.level !== "L0";
    },
    [runTurn],
  );

  const escalate = useCallback(() => {
    void runTurn("escalate", "Talk to a human", { message: customerMessage(uuid(), "I'd like to talk to a person."), variant: "quick_reply" }, (s) =>
      api.escalate(s.id, s.token, "customer_requested"),
    );
  }, [runTurn]);

  const rate = useCallback(async (messageId: string, rating: number) => {
    const s = sessionRef.current;
    if (!s) return;
    setRatedMessages((prev) => new Map(prev).set(messageId, rating));
    try {
      await api.feedback(s.id, s.token, rating);
    } catch {
      /* feedback is best-effort */
    }
  }, []);

  const newConversation = useCallback(async () => {
    epoch.current += 1;
    sessionRef.current = null;
    startPromise.current = null;
    saveSession(null);
    resetLocal();
    setPendingKind(null);
    restored.current = true;
    await startFresh();
  }, [resetLocal, startFresh]);

  const retry = useCallback(() => {
    if (error?.needsNewConversation) {
      void newConversation();
      return;
    }
    retryRef.current?.();
  }, [error, newConversation]);

  const openChat = useCallback((opts?: { docked?: boolean; draft?: string }) => {
    setOpen(true);
    if (opts?.docked !== undefined) setDocked(opts.docked);
    if (opts?.draft !== undefined) setDraft(opts.draft);
  }, []);

  const runScenario = useCallback(
    async (sc: DemoScenario) => {
      setOpen(true);
      setDocked(true);
      await newConversation();
      const myEpoch = epoch.current;
      if (!sessionRef.current) return;
      let prompt = sc.prompt;
      if (sc.order_number && sc.email) {
        const ok = await verify(sc.order_number, sc.email);
        if (!sessionRef.current || myEpoch !== epoch.current) return;
        if (!ok) {
          setError(null);
          prompt = `${sc.prompt} (My order is ${sc.order_number} and my email is ${sc.email}.)`;
        }
      }
      sendText(prompt);
    },
    [newConversation, verify, sendText],
  );

  const verifyFromTrackPage = useCallback(
    async (orderNumber: string, email: string) => {
      setOpen(true);
      if (!restored.current) {
        // Not opened yet in this page life: start clean rather than racing a restore.
        await newConversation();
      }
      await verify(orderNumber, email);
    },
    [verify, newConversation],
  );

  const value = useMemo<ChatValue>(
    () => ({
      open,
      docked,
      showSignals,
      entries,
      traces,
      verification,
      state: convState,
      pending: pendingKind !== null,
      pendingKind,
      error,
      starting,
      draft,
      usedProposals,
      ratedMessages,
      setDraft,
      openChat,
      closeChat: () => setOpen(false),
      setDocked,
      setShowSignals: (v: boolean) => setSignalsOverride(v),
      newConversation,
      sendText,
      sendQuickReply,
      sendAction,
      verify,
      escalate,
      rate,
      retry,
      runScenario,
      verifyFromTrackPage,
    }),
    [
      open,
      docked,
      showSignals,
      entries,
      traces,
      verification,
      convState,
      pendingKind,
      error,
      starting,
      draft,
      usedProposals,
      ratedMessages,
      openChat,
      newConversation,
      sendText,
      sendQuickReply,
      sendAction,
      verify,
      escalate,
      rate,
      retry,
      runScenario,
      verifyFromTrackPage,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
