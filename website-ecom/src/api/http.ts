// Thin fetch wrapper for the real backend. Errors are normalised into ApiError
// so the UI can show a friendly message (and honour Retry-After on 429).

export type ApiErrorKind = "rate_limited" | "server" | "network" | "client" | "not_found" | "unauthorized";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;
  readonly kind: ApiErrorKind;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    requestId?: string | undefined;
    retryAfterSeconds?: number | undefined;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.retryAfterSeconds = opts.retryAfterSeconds;
    if (opts.status === 0) this.kind = "network";
    else if (opts.status === 429) this.kind = "rate_limited";
    else if (opts.status === 401 || opts.status === 403) this.kind = "unauthorized";
    else if (opts.status === 404) this.kind = "not_found";
    else if (opts.status >= 500) this.kind = "server";
    else this.kind = "client";
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "rate_limited":
        return err.retryAfterSeconds
          ? `Ava is handling a lot of messages right now. Try again in ${err.retryAfterSeconds}s.`
          : "Ava is handling a lot of messages right now. Try again in a moment.";
      case "network":
        return "We couldn't reach Saba. Check your connection and try again.";
      case "server":
        return "Something went wrong on our side. Nothing was changed, so it's safe to retry.";
      case "unauthorized":
        return "This chat session has expired. Start a new conversation to continue.";
      case "not_found":
        return err.message || "We couldn't find that.";
      default:
        return err.message || "That didn't work. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(1, Math.round(secs));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(1, Math.round((date - Date.now()) / 1000));
  return undefined;
}

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | undefined; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : null,
      signal: init.signal ?? null,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError({ status: 0, code: "network_error", message: "Network error" });
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data: unknown = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const env = (data as { error?: { code?: string; message?: string; request_id?: string } } | null)?.error;
    throw new ApiError({
      status: res.status,
      code: env?.code ?? `http_${res.status}`,
      message: env?.message ?? res.statusText,
      requestId: env?.request_id,
      retryAfterSeconds: parseRetryAfter(res.headers.get("retry-after")),
    });
  }
  if (!isJson) {
    // e.g. the SPA fallback answered with index.html: the API is not there.
    throw new ApiError({ status: 502, code: "bad_gateway", message: "The API returned a non-JSON response." });
  }
  return data as T;
}
