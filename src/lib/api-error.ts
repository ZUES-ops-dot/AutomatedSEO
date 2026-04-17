import { NextResponse } from "next/server";

export function jsonError(message: string, status = 500, details?: Record<string, unknown>) {
  return NextResponse.json(details ? { error: message, ...details } : { error: message }, { status });
}

export function catchToJsonError(error: unknown, fallback: string) {
  if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message.trim().length > 0) {
    return jsonError(error.message, 500);
  }
  return jsonError(fallback, 500);
}
