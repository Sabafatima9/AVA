// Pairs Drex probabilities with policy thresholds for display.
// Backends name thresholds in different ways ("p_fraud", "p_fraud_max",
// "max_p_fraud"), so matching is deliberately forgiving.

export type Direction = "min" | "max";

export interface ProbRow {
  key: string;
  value: number;
  threshold?: number;
  direction: Direction;
  passes?: boolean;
}

const RISKY = /(fraud|abuse|risk|takeover|chargeback|scam|dispute|suspic|frustrat|human)/i;

function normalize(k: string): { base: string; dir?: Direction } {
  let base = k.toLowerCase();
  let dir: Direction | undefined;
  const m = base.match(/^(min|max)_(.+)$/) ?? base.match(/^(.+)_(min|max)$/);
  if (m) {
    const [a, b] = [m[1] as string, m[2] as string];
    if (a === "min" || a === "max") {
      dir = a;
      base = b;
    } else {
      dir = b as Direction;
      base = a;
    }
  }
  base = base.replace(/_(threshold|limit|cutoff)$/, "");
  return dir ? { base, dir } : { base };
}

export function pairProbabilities(
  probabilities: Record<string, number> | undefined | null,
  thresholds: Record<string, number> | undefined | null,
): { rows: ProbRow[]; unmatched: { key: string; value: number }[] } {
  const probs = Object.entries(probabilities ?? {}).filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const ths = Object.entries(thresholds ?? {}).filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const used = new Set<string>();

  const rows: ProbRow[] = probs.map(([key, value]) => {
    const pk = key.toLowerCase();
    const pBase = pk.replace(/^p_/, "");
    let match: { key: string; value: number; dir?: Direction } | undefined;
    for (const [tk, tv] of ths) {
      if (used.has(tk)) continue;
      const n = normalize(tk);
      const tBase = n.base.replace(/^p_/, "");
      if (n.base === pk || tBase === pBase) {
        match = n.dir ? { key: tk, value: tv, dir: n.dir } : { key: tk, value: tv };
        break;
      }
    }
    const direction: Direction = match?.dir ?? (RISKY.test(key) ? "max" : "min");
    if (!match) return { key, value, direction };
    used.add(match.key);
    const passes = direction === "min" ? value >= match.value : value <= match.value;
    return { key, value, threshold: match.value, direction, passes };
  });

  const unmatched = ths.filter(([k]) => !used.has(k)).map(([key, value]) => ({ key, value }));
  return { rows, unmatched };
}

export const OUTCOME_LABEL: Record<string, string> = {
  auto_approve: "Auto-approved",
  human_review: "Human review",
  deny: "Denied",
};

export function outcomeTone(outcome: string | undefined): "ok" | "warn" | "bad" | "neutral" {
  if (outcome === "auto_approve") return "ok";
  if (outcome === "human_review") return "warn";
  if (outcome === "deny") return "bad";
  return "neutral";
}
