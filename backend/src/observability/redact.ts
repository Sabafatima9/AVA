/**
 * Redaction rules shared by the Node logger (pino) and the Worker logger
 * (console JSON). No runtime imports, so it works in both environments.
 */

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "x-customer-token",
  "cookie",
  "set-cookie",
]);

/**
 * Secret-bearing key names. A numeric `*tokens` value is a usage count, not a
 * secret, so it stays visible: IF-DREX-7 requires `input_tokens` in the log.
 */
const SENSITIVE_KEY = /key|token|secret|password|pepper/i;

const USAGE_COUNT_KEY = /tokens$/i;

/** NACE keys, Supabase secret keys, and Google API keys. */
const SECRET_TEXT =
  /nace_sk_[A-Za-z0-9_-]*|sb_secret_[A-Za-z0-9_-]*|AIza[0-9A-Za-z_-]{20,}/g;

const URL_PASSWORD = /([a-z][a-z0-9+.-]*:\/\/[^\s:@/"]*):[^\s@/"]*@/gi;

export const REDACTED = "[redacted]";

export function isSensitiveKey(key: string, value: unknown): boolean {
  if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
    return true;
  }
  if (typeof value === "number" && USAGE_COUNT_KEY.test(key)) {
    return false;
  }
  return SENSITIVE_KEY.test(key);
}

export function maskSecretText(value: string): string {
  return value
    .replace(SECRET_TEXT, REDACTED)
    .replace(URL_PASSWORD, `$1:${REDACTED}@`);
}

/**
 * Drop sensitive keys and mask NACE, Supabase, or Google secret strings and
 * URL passwords anywhere in the value.
 */
export function redactValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === "string") {
    return maskSecretText(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (seen.has(value)) {
    return REDACTED;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = isSensitiveKey(key, entry)
      ? REDACTED
      : redactValue(entry, seen);
  }
  return output;
}

/** Last step before a log line is written. The result stays one JSON line. */
export function redactLogLine(line: string): string {
  const newline = line.endsWith("\n") ? "\n" : "";
  const body = newline.length > 0 ? line.slice(0, -1) : line;
  try {
    return JSON.stringify(redactValue(JSON.parse(body))) + newline;
  } catch {
    return maskSecretText(line);
  }
}
