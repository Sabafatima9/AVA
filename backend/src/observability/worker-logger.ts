import { redactValue } from "./redact.js";

/** Minimal structured logger for Workers: one redacted JSON line per call. */
export interface Log {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Log;
}

type Sink = (level: "info" | "warn" | "error", line: string) => void;

const consoleSink: Sink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export function createWorkerLogger(
  bindings: Record<string, unknown> = {},
  sink: Sink = consoleSink,
): Log {
  const write = (
    level: "info" | "warn" | "error",
    event: string,
    data?: Record<string, unknown>,
  ) => {
    const record = {
      level,
      time: new Date().toISOString(),
      event,
      ...bindings,
      ...(data ?? {}),
    };
    sink(level, JSON.stringify(redactValue(record)));
  };
  return {
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, data) => write("error", event, data),
    child: (extra) => createWorkerLogger({ ...bindings, ...extra }, sink),
  };
}

export const silentLogger: Log = {
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};
