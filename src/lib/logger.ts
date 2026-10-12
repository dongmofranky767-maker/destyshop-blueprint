// Logs techniques structurés (JSON sur stdout) — compatibles avec tout collecteur (Docker, Loki, CloudWatch…).
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, source: string, message: string, context?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), level, source, message, ...(context ? { context } : {}) };
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (source: string, msg: string, ctx?: Record<string, unknown>) => emit("debug", source, msg, ctx),
  info: (source: string, msg: string, ctx?: Record<string, unknown>) => emit("info", source, msg, ctx),
  warn: (source: string, msg: string, ctx?: Record<string, unknown>) => emit("warn", source, msg, ctx),
  error: (source: string, msg: string, ctx?: Record<string, unknown>) => emit("error", source, msg, ctx),
};
