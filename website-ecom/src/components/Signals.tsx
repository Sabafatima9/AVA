import { ArrowDownRight, ArrowRight, ArrowUpRight, Gavel, ShieldCheck, UserSwitch, XCircle } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { humanize, pct } from "../lib/format";
import { OUTCOME_LABEL, outcomeTone, pairProbabilities } from "../lib/probabilities";

export function ProbBar({
  label,
  value,
  threshold,
  direction,
  passes,
  tone,
  size = "md",
}: {
  label: string;
  value: number;
  threshold?: number | undefined;
  direction?: "min" | "max" | undefined;
  passes?: boolean | undefined;
  tone?: "ok" | "warn" | "bad" | "neutral" | "accent";
  size?: "sm" | "md" | "lg";
}) {
  const v = Math.max(0, Math.min(1, value));
  const t = threshold === undefined ? undefined : Math.max(0, Math.min(1, threshold));
  const resolvedTone = tone ?? (passes === undefined ? "neutral" : passes ? "ok" : "bad");
  return (
    <div className={`pbar pbar--${size} pbar--${resolvedTone}`}>
      <div className="pbar__head">
        <span className="pbar__label">{label}</span>
        <span className="pbar__value mono">{pct(v)}</span>
      </div>
      <div className="pbar__track">
        <div className="pbar__fill" style={{ "--v": v } as CSSProperties} />
        {t !== undefined && (
          <div className="pbar__marker" style={{ left: `${t * 100}%` }}>
            <span className="pbar__marker-tag mono">
              {direction === "max" ? "≤" : "≥"} {pct(t)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OutcomeBadge({ outcome, large }: { outcome: string | undefined; large?: boolean }) {
  const tone = outcomeTone(outcome);
  const Icon = tone === "ok" ? ShieldCheck : tone === "warn" ? UserSwitch : tone === "bad" ? XCircle : Gavel;
  return (
    <span className={`outcome outcome--${tone} ${large ? "outcome--lg" : ""}`}>
      <Icon size={large ? 18 : 14} weight="bold" />
      {OUTCOME_LABEL[outcome ?? ""] ?? (humanize(outcome) || "Pending")}
    </span>
  );
}

export function DecisionBars({
  probabilities,
  thresholds,
  size = "md",
}: {
  probabilities: Record<string, number> | undefined | null;
  thresholds: Record<string, number> | undefined | null;
  size?: "sm" | "md" | "lg";
}) {
  const { rows, unmatched } = pairProbabilities(probabilities, thresholds);
  if (rows.length === 0 && unmatched.length === 0) return null;
  return (
    <div className="dbars">
      {rows.map((r) => (
        <ProbBar
          key={r.key}
          label={humanize(r.key)}
          value={r.value}
          threshold={r.threshold}
          direction={r.direction}
          passes={r.passes}
          size={size}
        />
      ))}
      {unmatched.length > 0 && (
        <div className="dbars__thresholds">
          {unmatched.map((u) => (
            <span key={u.key} className="mono">
              {humanize(u.key)} {pct(u.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrendArrow({ trend }: { trend: string | null | undefined }) {
  const t = (trend ?? "").toLowerCase();
  if (/(up|ris|wors|increas)/.test(t)) return <ArrowUpRight className="trend trend--up" size={18} weight="bold" aria-label="rising" />;
  if (/(down|fall|improv|decreas|better)/.test(t)) return <ArrowDownRight className="trend trend--down" size={18} weight="bold" aria-label="falling" />;
  return <ArrowRight className="trend trend--flat" size={18} weight="bold" aria-label="steady" />;
}

/** Semicircle gauge, 0..1 */
export function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  const r = 54;
  const c = Math.PI * r;
  const tone = v >= 0.6 ? "bad" : v >= 0.3 ? "warn" : "ok";
  return (
    <svg className={`gauge gauge--${tone}`} viewBox="0 0 140 80" role="img" aria-label={`${label}: ${pct(v)} chance frustrated or worse`}>
      <path d="M16 72 A54 54 0 0 1 124 72" className="gauge__track" />
      <path d="M16 72 A54 54 0 0 1 124 72" className="gauge__fill" style={{ strokeDasharray: `${c}`, strokeDashoffset: `${c * (1 - v)}` }} />
      {[0.3, 0.6].map((t) => {
        const a = Math.PI * (1 - t);
        const x1 = 70 + Math.cos(a) * 44;
        const y1 = 72 - Math.sin(a) * 44;
        const x2 = 70 + Math.cos(a) * 64;
        const y2 = 72 - Math.sin(a) * 64;
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} className="gauge__tick" />;
      })}
    </svg>
  );
}
