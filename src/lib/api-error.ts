import { NextResponse } from "next/server";

export function jsonError(message: string, status = 500, details?: Record<string, unknown>) {
  return NextResponse.json(details ? { error: message, ...details } : { error: message }, { status });
}

/** Explicit HTTP status for API handlers (preferred over inferring from message text). */
export class ApiHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

function inferClientErrorStatus(message: string): number | null {
  const trimmed = message.trim();
  if (/\bnot found\b/i.test(trimmed)) {
    return 404;
  }
  if (trimmed.startsWith("Invalid ")) {
    return 400;
  }
  return null;
}

export function catchToJsonError(error: unknown, fallback: string) {
  if (error instanceof ApiHttpError) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof Error) {
    const inferred = inferClientErrorStatus(error.message);
    if (inferred !== null) {
      return jsonError(error.message.trim(), inferred);
    }
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message.trim().length > 0) {
    return jsonError(error.message, 500);
  }

  return jsonError(fallback, 500);
}
