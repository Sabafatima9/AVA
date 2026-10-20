import pino, {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";
import { redactLogLine } from "./redact.js";

export { redactLogLine, redactValue } from "./redact.js";

export function createLogger(options?: {
  level?: LoggerOptions["level"];
  destination?: DestinationStream;
}): Logger {
  const settings: LoggerOptions = {
    level: options?.level ?? "info",
    hooks: {
      streamWrite(line) {
        return redactLogLine(line);
      },
    },
  };
  if (options?.destination) {
    return pino(settings, options.destination);
  }
  return pino(settings);
}
