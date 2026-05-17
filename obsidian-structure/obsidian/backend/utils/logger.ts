import appConfig from "../config/appConfig";

// ─── Log Levels ───────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = appConfig.isProd ? "info" : "debug";

// ─── Colors for dev ───────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  debug: "\x1b[36m",   // cyan
  info: "\x1b[32m",    // green
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// ─── Log Entry Shape ──────────────────────────────────────────────────────────

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  uid?: string;
  workspaceId?: string;
}

// ─── Format ───────────────────────────────────────────────────────────────────

const formatProd = (entry: LogEntry): string => {
  // Structured JSON for CloudWatch
  return JSON.stringify(entry);
};

const formatDev = (entry: LogEntry): string => {
  const color = COLORS[entry.level];
  const level = entry.level.toUpperCase().padEnd(5);
  const context = entry.context ? `${COLORS.dim}[${entry.context}]${COLORS.reset} ` : "";
  const data = entry.data ? `\n${COLORS.dim}${JSON.stringify(entry.data, null, 2)}${COLORS.reset}` : "";
  const error = entry.error
    ? `\n${COLORS.error}${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ""}${COLORS.reset}`
    : "";

  return `${COLORS.dim}${entry.timestamp}${COLORS.reset} ${color}${COLORS.bold}${level}${COLORS.reset} ${context}${entry.message}${data}${error}`;
};

// ─── Core Logger ──────────────────────────────────────────────────────────────

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
};

const buildEntry = (
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown,
  err?: unknown
): LogEntry => {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    data,
  };

  if (err instanceof Error) {
    entry.error = {
      message: err.message,
      stack: appConfig.isDev ? err.stack : undefined,
      code: (err as NodeJS.ErrnoException).code,
    };
  }

  return entry;
};

const log = (entry: LogEntry): void => {
  const formatted = appConfig.isProd ? formatProd(entry) : formatDev(entry);

  switch (entry.level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
};

// ─── Logger Factory ───────────────────────────────────────────────────────────

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  debug(message: string, data?: unknown): void {
    if (!shouldLog("debug")) return;
    log(buildEntry("debug", message, this.context, data));
  }

  info(message: string, data?: unknown): void {
    if (!shouldLog("info")) return;
    log(buildEntry("info", message, this.context, data));
  }

  warn(message: string, data?: unknown): void {
    if (!shouldLog("warn")) return;
    log(buildEntry("warn", message, this.context, data));
  }

  error(message: string, err?: unknown, data?: unknown): void {
    if (!shouldLog("error")) return;
    log(buildEntry("error", message, this.context, data, err));
  }

  // Child logger with sub-context
  child(subContext: string): Logger {
    return new Logger(
      this.context ? `${this.context}:${subContext}` : subContext
    );
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// Default root logger
export const logger = new Logger();

// Context-specific logger factory
export const createLogger = (context: string): Logger => new Logger(context);

// Request logger helper — attaches requestId to entries
export const createRequestLogger = (requestId: string, context?: string): Logger => {
  return new Logger(context ? `${context}:${requestId}` : requestId);
};

export default Logger;
