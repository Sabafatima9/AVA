import {
  ArrowClockwise,
  ArrowsInSimple,
  ArrowsOutSimple,
  ArrowUp,
  ChatCircleDots,
  Headset,
  NotePencil,
  ShieldCheck,
  User,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Message } from "../../api/types";
import { Markdown } from "../../lib/markdown";
import { type ChatEntry, useChat } from "../../state/chat";
import { SignalsPanel } from "./SignalsPanel";
import { UiBlock } from "./UiBlocks";

const STATUS: Record<string, string[]> = {
  message: ["Reading your message…", "Checking the order…", "Weighing the decision…", "Writing a reply…"],
  verify: ["Verifying your details…", "Matching the order…", "Loading the order…"],
  escalate: ["Finding a teammate…", "Writing up the handoff…"],
  start: ["Connecting to Ava…"],
};

function AvaMark({ size = 36 }: { size?: number }) {
  return (
    <span className="ava-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
        <circle cx="18" cy="18" r="18" fill="var(--forest)" />
        <path d="M11.5 24.5 18 10l6.5 14.5" fill="none" stroke="#EDF0EA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="21" r="2.2" fill="var(--accent)" />
      </svg>
    </span>
  );
}

function Typing({ kind }: { kind: string }) {
  const lines = STATUS[kind] ?? STATUS.message ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const t = setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 1900);
    return () => clearInterval(t);
  }, [lines]);
  return (
    <div className="msg msg--assistant msg--typing" aria-live="polite">
      <AvaMark size={28} />
      <div className="typing">
        <span className="typing__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="typing__text" key={i}>
          {lines[i]}
        </span>
      </div>
    </div>
  );
}

function ErrorNotice() {
  const { error, retry, pending } = useChat();
  const [left, setLeft] = useState(error?.retryAfter ?? 0);
  useEffect(() => {
    setLeft(error?.retryAfter ?? 0);
    if (!error?.retryAfter) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [error]);
  if (!error || pending) return null;
  return (
    <div className="chat-error" role="alert">
      <WarningCircle size={20} />
      <p>{error.message}</p>
      {(error.canRetry || error.needsNewConversation) && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={retry} disabled={left > 0}>
          <ArrowClockwise size={14} />
          {error.needsNewConversation ? "New conversation" : left > 0 ? `Retry in ${left}s` : "Retry"}
        </button>
      )}
    </div>
  );
}

function MessageView({ entry, isLastAssistant }: { entry: ChatEntry; isLastAssistant: boolean }) {
  const m: Message = entry.message;
  if (m.role === "system") {
    return <p className="msg-system">{m.text}</p>;
  }
  if (m.role === "customer") {
    return (
      <div className={`msg msg--customer ${entry.variant ? `msg--${entry.variant}` : ""}`}>
        <div className="bubble">
          {entry.variant === "verification" && <ShieldCheck size={15} weight="bold" />}
          <span>{m.text}</span>
        </div>
      </div>
    );
  }
  const ui = Array.isArray(m.ui) ? m.ui : [];
  return (
    <div className="msg msg--assistant">
      <AvaMark size={28} />
      <div className="msg__col">
        {m.text && (
          <div className="bubble">
            <Markdown text={m.text} />
          </div>
        )}
        {ui.map((u, i) => (
          <UiBlock key={`${m.id}-${i}`} ui={u} active={isLastAssistant} messageId={m.id} />
        ))}
      </div>
    </div>
  );
}

function Composer() {
  const { sendText, pending, draft, setDraft, starting, open } = useChat();
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  useEffect(() => {
    if (open && window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, [open, draft === ""]);

  const submit = () => {
    if (!draft.trim() || pending || starting) return;
    sendText(draft);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        placeholder="Ask about an order, a return, a product…"
        aria-label="Message Ava"
        maxLength={2000}
      />
      <button type="submit" className="composer__send" disabled={!draft.trim() || pending || starting} aria-label="Send message">
        <ArrowUp size={18} weight="bold" />
      </button>
    </form>
  );
}

function ChatPanel({
  canDock,
  inlineSignals,
  mobileTab,
  setMobileTab,
}: {
  canDock: boolean;
  inlineSignals: boolean;
  mobileTab: "chat" | "signals";
  setMobileTab: (t: "chat" | "signals") => void;
}) {
  const chat = useChat();
  const { entries, pending, pendingKind, starting, verification, state, docked, showSignals } = chat;
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
  }, [entries.length, pending, chat.error]);

  let lastAssistant = -1;
  entries.forEach((e, i) => {
    if (e.message.role === "assistant") lastAssistant = i;
  });
  const lastIsAssistant = lastAssistant === entries.length - 1;
  const verified = verification.level !== "L0";

  return (
    <section className="chat-panel" aria-label="Chat with Ava">
      <header className="chat-head">
        <div className="chat-head__row">
          <AvaMark size={38} />
          <div className="chat-head__id">
            <p className="chat-head__name">
              Ava <span className="chat-head__dot">·</span> <span className="chat-head__role">AI assistant</span>
            </p>
            <span className={`verify-badge ${verified ? "is-verified" : ""}`}>
              {verified ? <ShieldCheck size={13} weight="fill" /> : <User size={13} />}
              {verified ? `Verified${verification.customer_first_name ? ` · ${verification.customer_first_name}` : ""}` : "Guest"}
              {verification.level === "L2" && <span className="verify-badge__lvl">L2</span>}
            </span>
          </div>
          <div className="chat-head__icons">
            <button type="button" className="icon-btn" onClick={() => void chat.newConversation()} title="New conversation" aria-label="New conversation">
              <NotePencil size={19} />
            </button>
            {canDock && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => chat.setDocked(!docked)}
                title={docked ? "Float" : "Expand to side panel"}
                aria-label={docked ? "Float chat" : "Expand chat to side panel"}
              >
                {docked ? <ArrowsInSimple size={19} /> : <ArrowsOutSimple size={19} />}
              </button>
            )}
            <button type="button" className="icon-btn" onClick={chat.closeChat} title="Close" aria-label="Close chat">
              <X size={19} />
            </button>
          </div>
        </div>
        <div className="chat-head__bar">
          <label className="switch">
            <input type="checkbox" checked={showSignals} onChange={(e) => chat.setShowSignals(e.target.checked)} />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            <span>Behind the scenes</span>
          </label>
          <button type="button" className="human-btn" onClick={chat.escalate} disabled={pending || starting || state === "escalated"}>
            <Headset size={16} />
            {state === "escalated" ? "Human notified" : "Talk to a human"}
          </button>
        </div>
        {inlineSignals && (
          <div className="chat-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mobileTab === "chat"} className={mobileTab === "chat" ? "is-on" : ""} onClick={() => setMobileTab("chat")}>
              Conversation
            </button>
            <button type="button" role="tab" aria-selected={mobileTab === "signals"} className={mobileTab === "signals" ? "is-on" : ""} onClick={() => setMobileTab("signals")}>
              Drex signals
            </button>
          </div>
        )}
      </header>

      {inlineSignals && mobileTab === "signals" ? (
        <SignalsPanel className="signals--inline" />
      ) : (
        <>
          <div className="chat-list" ref={listRef}>
            {starting && entries.length === 0 && <Typing kind="start" />}
            {entries.map((e, i) => (
              <MessageView key={e.message.id} entry={e} isLastAssistant={i === lastAssistant && lastIsAssistant && !pending} />
            ))}
            {pending && <Typing kind={pendingKind ?? "message"} />}
            <ErrorNotice />
          </div>
          {state === "escalated" && (
            <p className="chat-escalated">
              <Headset size={15} /> A person from our team has this conversation. You can keep adding details here.
            </p>
          )}
          <Composer />
        </>
      )}
    </section>
  );
}

function useMedia(query: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

export function ChatWidget() {
  const { open, openChat, docked, showSignals, closeChat } = useChat();
  const wide = useMedia("(min-width: 1100px)");
  const mid = useMedia("(min-width: 720px)");
  const [mobileTab, setMobileTab] = useState<"chat" | "signals">("chat");
  const sideBySide = wide && showSignals;
  const isDocked = mid && (docked || sideBySide);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  // Lock page scroll on small screens where the chat is full-screen.
  useEffect(() => {
    if (!open || mid) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mid]);

  return (
    <>
      <button
        type="button"
        className={`launcher ${open ? "is-hidden" : ""}`}
        onClick={() => openChat()}
        aria-label="Chat with Ava, our AI assistant"
      >
        <span className="launcher__icon">
          <ChatCircleDots size={22} weight="fill" />
        </span>
        <span className="launcher__text">
          <strong>Ask Ava</strong>
          <span>Orders, returns, refunds</span>
        </span>
      </button>

      <div
        className={`chat-shell ${open ? "is-open" : ""} ${isDocked ? "is-docked" : "is-floating"} ${sideBySide ? "has-signals" : ""} ${!mid ? "is-mobile" : ""}`}
        aria-hidden={!open}
      >
        {open && sideBySide && <SignalsPanel />}
        {open && <ChatPanel canDock={mid} inlineSignals={showSignals && !sideBySide} mobileTab={mobileTab} setMobileTab={setMobileTab} />}
      </div>
    </>
  );
}
