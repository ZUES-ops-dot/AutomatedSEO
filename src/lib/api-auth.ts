import type { NextRequest } from "next/server";

import { appEnv } from "@/features/seo/server/env";
import { jsonError } from "@/lib/api-error";

function readProvidedSecret(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const headerSecret = request.headers.get("x-job-secret") ?? "";
  return bearer || headerSecret;
}

export function isApiAuthorized(request: NextRequest) {
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
