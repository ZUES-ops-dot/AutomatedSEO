import type { NextRequest } from "next/server";

import type { TenantId } from "@/features/seo/types";
import { appEnv } from "@/features/seo/server/env";

export const DEFAULT_TENANT_ID: TenantId = "default";

const TENANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

/**
 * Resolves tenant from `X-Tenant-Id` when multi-tenant mode is enabled, otherwise always `default`.
 * When enabled, unknown or invalid headers fall back to `default`.
 */
export function getTenantIdFromRequest(request: NextRequest): TenantId {
  if (!appEnv.multiTenantEnabled) {
    return DEFAULT_TENANT_ID;
  }
  const raw = request.headers.get("x-tenant-id")?.trim();
  if (!raw || !TENANT_PATTERN.test(raw)) {
    return DEFAULT_TENANT_ID;
  }
  return raw;
}
