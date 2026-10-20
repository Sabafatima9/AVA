export function money(amount: number | undefined | null, currency = "USD"): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return shortDate(iso);
}

/** "cancel_order" → "Cancel order" */
export function humanize(key: string | undefined | null): string {
  if (!key) return "";
  const s = key.replace(/^p_/, "").replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pct(p: number | undefined | null, digits = 0): string {
  if (p === undefined || p === null || !Number.isFinite(p)) return "–";
  return `${(p * 100).toFixed(digits)}%`;
}

export function isDefaultVariant(title: string | undefined): boolean {
  return !title || /^default( title)?$/i.test(title.trim());
}
