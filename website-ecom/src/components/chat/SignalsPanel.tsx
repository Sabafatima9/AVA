import { Brain, Cpu, Lightning, Pulse, Scales, Warning, Wrench } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { humanize, pct } from "../../lib/format";
import { useChat } from "../../state/chat";
import { DecisionBars, Gauge, OutcomeBadge, ProbBar, TrendArrow } from "../Signals";

export function SignalsPanel({ className }: { className?: string }) {
  const { traces, pending } = useChat();
  const [selected, setSelected] = useState<number | null>(null);
  const latest = traces[traces.length - 1];

  // Follow the newest turn unless the presenter pinned an older one.
  useEffect(() => {
    setSelected(null);
  }, [traces.length]);

  const current = selected === null ? latest : traces.find((t) => t.turn === selected) ?? latest;
  const tr = current?.trace;

  return (
    <aside className={`signals ${className ?? ""}`} aria-label="Behind the scenes: live signals from NACE Drex">
      <div className="signals__head">
        <div>
          <p className="signals__title">Behind the scenes</p>
          <p className="signals__sub">
            <span className={`live-dot ${pending ? "is-busy" : ""}`} /> Live signals from NACE Drex
          </p>
        </div>
        {traces.length > 1 && (
          <div className="signals__turns" role="tablist" aria-label="Turns">
            {traces.slice(-6).map((t) => (
              <button
                key={t.turn}
                type="button"
                role="tab"
                aria-selected={t.turn === current?.turn}
                className={t.turn === current?.turn ? "is-on" : ""}
                onClick={() => setSelected(t.turn)}
              >
                {t.turn}
              </button>
            ))}
          </div>
        )}
      </div>

      {!tr ? (
        <div className="signals__empty">
          <Pulse size={34} weight="light" />
          <p>{pending ? "Ava is thinking. Signals arrive with her reply." : "Send a message and watch what Ava reads, checks and decides on each turn."}</p>
        </div>
      ) : (
        <div className="signals__body" key={current?.turn}>
          <p className="signals__turn-label">
            <span className="mono">Turn {current?.turn}</span>
            <span className="signals__quote">“{current?.label}”</span>
          </p>

          {/* Mood + intent */}
          <div className="sig-grid">
            <section className="sig-card sig-mood">
              <h4>
                <Pulse size={14} /> Mood
              </h4>
              {tr.mood ? (
                <div className="sig-mood__body">
                  <Gauge value={tr.mood.p_frustrated_or_worse ?? 0} label={tr.mood.label} />
                  <div className="sig-mood__text">
                    <span className="sig-big">{humanize(tr.mood.label)}</span>
                    <span className="sig-small">
                      {pct(tr.mood.p_frustrated_or_worse)} frustrated or worse <TrendArrow trend={tr.mood.trend} />
                    </span>
                  </div>
                </div>
              ) : (
                <p className="sig-na">Not measured this turn</p>
              )}
            </section>

            <section className="sig-card">
              <h4>
                <Brain size={14} /> Intent
              </h4>
              {tr.intent ? (
                <>
                  <span className="sig-big">{humanize(tr.intent.label)}</span>
                  <ProbBar label="Confidence" value={tr.intent.confidence ?? 0} tone="accent" size="sm" />
                </>
              ) : (
                <p className="sig-na">–</p>
              )}
              {typeof tr.wants_human === "number" && (
                <ProbBar label="Wants a human" value={tr.wants_human} tone={tr.wants_human >= 0.5 ? "warn" : "neutral"} size="sm" />
              )}
            </section>
          </div>

          {/* Decision */}
          <section className={`sig-card sig-decision ${tr.decision ? `is-${tr.decision.outcome}` : ""}`}>
            <h4>
              <Scales size={14} /> Decision
            </h4>
            {tr.decision ? (
              <>
                <div className="sig-decision__head">
                  <span className="sig-big">{humanize(tr.decision.type)}</span>
                  <OutcomeBadge outcome={tr.decision.outcome} large />
                </div>
                <DecisionBars probabilities={tr.decision.probabilities} thresholds={tr.decision.thresholds} size="lg" />
                {tr.decision.hard_rule && (
                  <p className="sig-rule">
                    <Warning size={16} weight="bold" /> Hard rule: <strong>{humanize(tr.decision.hard_rule)}</strong>
                  </p>
                )}
                {tr.decision.policy_version && <p className="sig-policy mono">policy {tr.decision.policy_version}</p>}
              </>
            ) : (
              <p className="sig-na">No action to decide on this turn.</p>
            )}
          </section>

          {/* Tools */}
          <section className="sig-card">
            <h4>
              <Wrench size={14} /> Tools called
            </h4>
            {Array.isArray(tr.tools) && tr.tools.length > 0 ? (
              <ul className="sig-tools">
                {tr.tools.map((t, i) => (
                  <li key={`${t.name}-${i}`} style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="sig-tools__name mono">{t.name}</span>
                    <span className="sig-tools__desc">{t.display || t.args_summary}</span>
                    {typeof t.ms === "number" && <span className="sig-tools__ms mono">{Math.round(t.ms)} ms</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sig-na">None</p>
            )}
          </section>

          {/* Footer stats */}
          <div className="sig-stats">
            <div>
              <span className="sig-stats__k">
                <Lightning size={13} /> Drex
              </span>
              <span className="sig-stats__v mono">
                {tr.drex?.latency_ms !== undefined ? `${Math.round(tr.drex.latency_ms)} ms` : "–"}
                {tr.drex?.degraded && <span className="pill pill--warn">degraded</span>}
              </span>
              {(tr.drex?.request_ids ?? []).slice(0, 3).map((id) => (
                <span key={id} className="sig-stats__id mono" title={id}>
                  {id}
                </span>
              ))}
            </div>
            <div>
              <span className="sig-stats__k">
                <Cpu size={13} /> LLM
              </span>
              <span className="sig-stats__v mono">{tr.llm?.latency_ms !== undefined ? `${Math.round(tr.llm.latency_ms)} ms` : "–"}</span>
              {tr.llm?.model && <span className="sig-stats__id mono">{tr.llm.model}</span>}
              {(tr.llm?.input_tokens !== undefined || tr.llm?.output_tokens !== undefined) && (
                <span className="sig-stats__id mono">
                  {tr.llm?.input_tokens ?? "–"} in · {tr.llm?.output_tokens ?? "–"} out
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
