import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Brain,
  ChatCircleText,
  CheckSquareOffset,
  Headset,
  IdentificationCard,
  Lifebuoy,
  Play,
  Scales,
  WarningCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { friendlyError } from "../api/http";
import type { Activity, DemoScenario } from "../api/types";
import { Reveal } from "../components/common";
import { DecisionBars, OutcomeBadge } from "../components/Signals";
import { humanize, timeAgo } from "../lib/format";
import { useChat } from "../state/chat";

const PRINCIPLES = [
  { icon: CheckSquareOffset, t: "It acts", d: "Cancels, updates addresses, starts returns and refunds. Not just links to help articles." },
  { icon: IdentificationCard, t: "It verifies you", d: "Order number plus email before it shows or touches anything private." },
  { icon: Scales, t: "It decides with odds", d: "NACE Drex returns calibrated probabilities, checked against policy thresholds." },
  { icon: ChatCircleText, t: "It asks first", d: "Every change needs your explicit confirmation. Nothing happens silently." },
  { icon: Headset, t: "It knows its limits", d: "Risky or upset? It hands off to a person with the full context." },
];

function ConfirmDialog({ open, onCancel, onConfirm, busy }: { open: boolean; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <button type="button" className="modal__scrim" aria-label="Cancel" onClick={onCancel} tabIndex={-1} />
      <div className="modal__card">
        <h2 id="reset-title" className="display">
          Reset the demo data?
        </h2>
        <p className="muted">Orders, refunds and escalations go back to their starting state. Open conversations will be cleared.</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={busy}>
            Keep data
          </button>
          <button ref={ref} type="button" className="btn btn--accent btn--sm" onClick={onConfirm} disabled={busy}>
            {busy ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ s, index, onRun, running }: { s: DemoScenario; index: number; onRun: () => void; running: boolean }) {
  return (
    <Reveal index={index % 2} className="scenario">
      <div className="scenario__top">
        <span className="scenario__num mono">{String(index + 1).padStart(2, "0")}</span>
        <h3>{s.title}</h3>
      </div>
      {s.description && <p className="scenario__desc">{s.description}</p>}
      {(s.order_number || s.email) && (
        <div className="scenario__ids">
          {s.order_number && <span className="mono">{s.order_number}</span>}
          {s.email && <span className="mono">{s.email}</span>}
        </div>
      )}
      <blockquote className="scenario__prompt">“{s.prompt}”</blockquote>
      {s.expected && (
        <p className="scenario__expected">
          <span>Expected</span>
          {s.expected}
        </p>
      )}
      <button type="button" className="btn btn--sm scenario__run" onClick={onRun} disabled={running}>
        <Play size={14} weight="fill" /> Run this scenario
      </button>
    </Reveal>
  );
}

function DecisionsFeed({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const a = await api.activity();
      setData(a);
      setError(null);
      setUpdated(Date.now());
    } catch (err) {
      setError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    const c = setInterval(() => tick((x) => x + 1), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [load, refreshKey]);

  const decisions = Array.isArray(data?.decisions) ? data.decisions.slice(0, 8) : [];
  const escalations = Array.isArray(data?.escalations) ? data.escalations.slice(0, 5) : [];

  return (
    <aside className="feed" aria-live="polite">
      <div className="feed__head">
        <div>
          <h2>Decisions feed</h2>
          <p className="feed__status">
            <span className={`live-dot ${error ? "is-error" : ""}`} />
            {error ? "Reconnecting…" : updated ? `Live · updated ${timeAgo(new Date(updated).toISOString())}` : "Connecting…"}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={() => void load()} aria-label="Refresh now" title="Refresh now">
          <ArrowClockwise size={18} />
        </button>
      </div>

      {error && !data && (
        <p className="feed__error">
          <WarningCircle size={16} /> {error}
        </p>
      )}

      {data && decisions.length === 0 && escalations.length === 0 && (
        <div className="feed__empty">
          <Brain size={28} weight="light" />
          <p>No decisions yet. Run a scenario and they'll show up here within a few seconds.</p>
        </div>
      )}

      {decisions.length > 0 && (
        <ul className="feed__list">
          {decisions.map((d, i) => (
            <li key={d.id ?? `${d.type}-${d.created_at}-${i}`} className={`feed-item feed-item--${d.outcome ?? "none"}`}>
              <div className="feed-item__head">
                <span className="feed-item__type">{humanize(d.type) || "Decision"}</span>
                <OutcomeBadge outcome={d.outcome} />
              </div>
              <div className="feed-item__meta">
                {d.order_number && <span className="mono">{d.order_number}</span>}
                <span>{timeAgo(d.created_at)}</span>
              </div>
              <DecisionBars probabilities={d.probabilities} thresholds={d.thresholds} size="sm" />
              {d.hard_rule && <p className="feed-item__rule">Hard rule · {humanize(d.hard_rule)}</p>}
            </li>
          ))}
        </ul>
      )}

      {escalations.length > 0 && (
        <div className="feed__esc">
          <h3>
            <Lifebuoy size={16} /> Escalations
          </h3>
          <ul>
            {escalations.map((e, i) => (
              <li key={e.reference ?? i}>
                <span className="mono feed__ref">{e.reference ?? "–"}</span>
                <span className="feed__reason">{humanize(e.reason) || "Handoff"}</span>
                <span className="muted">
                  {e.order_number ? `${e.order_number} · ` : ""}
                  {timeAgo(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export function DemoPage() {
  const { runScenario, pending, setShowSignals, newConversation } = useChat();
  const [scenarios, setScenarios] = useState<DemoScenario[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api.scenarios().then(
      (s) => alive && setScenarios(s),
      (e: unknown) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const doReset = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      setConfirmOpen(false);
      setToast({ ok: true, text: "Demo data reset. Every scenario is ready to run again." });
      setRefreshKey((k) => k + 1);
      void newConversation();
    } catch (err) {
      setToast({ ok: false, text: friendlyError(err) });
    } finally {
      setResetting(false);
    }
  };

  const run = (s: DemoScenario) => {
    setShowSignals(true);
    void runScenario(s);
  };

  return (
    <div className="demo page">
      <section className="container demo__hero">
        <div className="demo__hero-top">
          <span className="eyebrow">
            <span className="dot" /> Live demo · Saba × NACE Drex
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmOpen(true)}>
            <ArrowCounterClockwise size={15} /> Reset demo data
          </button>
        </div>
        <h1 className="display demo__title rise">
          Support that doesn't just answer.
          <br />
          <em>It resolves.</em>
        </h1>
        <p className="demo__lede rise" style={{ ["--i" as string]: 1 }}>
          Ava is Saba's support agent. Ask her to cancel an order and she cancels it. She verifies who you are first, sends each action to
          NACE Drex for a calibrated probability, checks that probability against the store's policy thresholds, shows you exactly what will
          change and waits for your OK, and hands the conversation to a person when the odds or your mood say she should.
        </p>
      </section>

      <section className="container">
        <ol className="principles">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.t} index={i}>
              <span className="principles__icon">
                <p.icon size={22} weight="light" />
              </span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="container demo__main">
        <div className="demo__scenarios">
          <div className="demo__section-head">
            <h2 className="display h-md">Try a scenario</h2>
            <p className="muted">Each one opens a fresh chat, verifies the customer and sends the prompt. Watch the signals panel as Ava works.</p>
          </div>
          {error ? (
            <div className="state-block" role="alert">
              <h3>Scenarios didn't load</h3>
              <p className="muted">{friendlyError(error)}</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAttempt((a) => a + 1)}>
                <ArrowClockwise size={14} /> Try again
              </button>
            </div>
          ) : !scenarios ? (
            <div className="scenario-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 300 }} />
              ))}
            </div>
          ) : (
            <div className="scenario-grid">
              {scenarios.map((s, i) => (
                <ScenarioCard key={s.id} s={s} index={i} onRun={() => run(s)} running={pending} />
              ))}
            </div>
          )}

          <div className="identities">
            <h3>Demo customers</h3>
            <ul>
              <li>
                <span className="mono">sara@example.com</span>
                <span className="muted">Orders SB1001 to SB1007</span>
              </li>
              <li>
                <span className="mono">guest@example.com</span>
                <span className="muted">SB1008, charged twice</span>
              </li>
              <li>
                <span className="mono">omar@example.com</span>
                <span className="muted">SB1009, high claim history</span>
              </li>
            </ul>
          </div>
        </div>
        <DecisionsFeed refreshKey={refreshKey} />
      </section>

      <ConfirmDialog open={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={() => void doReset()} busy={resetting} />
      {toast && (
        <div className={`toast ${toast.ok ? "" : "toast--bad"}`} role="status">
          {toast.ok ? null : <WarningCircle size={18} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
