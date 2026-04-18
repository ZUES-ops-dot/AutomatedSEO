import type { NextRequest } from "next/server";

import { appEnv } from "@/features/seo/server/env";
import { jsonError } from "@/lib/api-error";

function readRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    const protocol =
      forwardedProto ?? request.nextUrl?.protocol?.replace(/:$/, "") ?? "http";
    return `${protocol}://${host}`;
  }

  return request.nextUrl?.origin ?? "http://localhost";
}

function matchesRequestOrigin(value: string, requestOrigin: string) {
  try {
    return new URL(value).origin === requestOrigin;
  } catch {
    return false;
  }
}

function isSameOriginRequest(request: NextRequest) {
  const requestOrigin = readRequestOrigin(request);
  const origin = request.headers.get("origin")?.trim();
  if (origin === requestOrigin) {
    return true;
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer && matchesRequestOrigin(referer, requestOrigin)) {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  return fetchSite === "same-origin";
}

function readProvidedSecret(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const headerSecret = request.headers.get("x-job-secret") ?? "";
  return bearer || headerSecret;
}

export function isApiAuthorized(request: NextRequest) {
  if (isSameOriginRequest(request)) {
    return true;
  }
  if (!appEnv.jobSecret) {
    return process.env.NODE_ENV !== "production";
  }
  return readProvidedSecret(request) === appEnv.jobSecret;
}

export function requireApiAuthorization(request: NextRequest) {
  if (isApiAuthorized(request)) {
    return null;
  }

  if (!appEnv.jobSecret && process.env.NODE_ENV === "production") {
    return jsonError("JOB_SECRET is required in production.", 503);
  }

  return jsonError("Unauthorized.", 401);
}
