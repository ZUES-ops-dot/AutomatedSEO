export type SeoLogLevel = "debug" | "info" | "warn" | "error";

export function logSeoEvent(level: SeoLogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    scope: "seo",
    level,
    message,
    ...meta
  };
  const line = JSON.stringify(payload);
  switch (level) {
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(line);
      }
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      if (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) {
        void import("@sentry/nextjs")
          .then((Sentry) => {
            Sentry.captureMessage(message, { level: "error", extra: meta });
          })
          .catch(() => undefined);
      }
      break;
    default:
      console.log(line);
  }
}
