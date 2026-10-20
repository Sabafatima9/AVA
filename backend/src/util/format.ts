export function dollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function money(cents: number): string {
  return `$${(Math.round(cents) / 100).toFixed(2)}`;
}

export function cardLabel(brand: string, last4: string): string {
  return `${brand} •••• ${last4}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 12" style, UTC. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, toMs: number): number {
  return Math.floor((toMs - Date.parse(fromIso)) / DAY_MS);
}

export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
