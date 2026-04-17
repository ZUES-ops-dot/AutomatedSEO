import { appendFile, mkdir } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";

import { appendDomainEvent } from "@/features/seo/server/event-store";
import { getDataRootDirectory } from "@/features/seo/server/runtime-paths";
import type { TenantId } from "@/features/seo/types";
import { DEFAULT_TENANT_ID, getTenantIdFromRequest } from "@/lib/tenant";
import { logSeoEvent } from "@/lib/seo-log";

const AUDIT_FILENAME = "seo-audit.jsonl";
const MAX_LINE_BYTES = 16_384;

export type AuditEvent = {
  action: string;
  detail?: Record<string, unknown>;
  /** When set, duplicated to Postgres `seo_domain_events` and JSONL. */
  tenantId?: TenantId;
};

function auditFilePath() {
  return path.join(getDataRootDirectory(), AUDIT_FILENAME);
}

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  const tenantId = event.tenantId ?? DEFAULT_TENANT_ID;
  const payload = {
    ts: new Date().toISOString(),
    tenantId,
    action: event.action,
    ...(event.detail ? { detail: event.detail } : {})
  };

  try {
    const root = getDataRootDirectory();
    await mkdir(root, { recursive: true });
    const line = JSON.stringify(payload);
    const safe = line.length > MAX_LINE_BYTES ? `${line.slice(0, MAX_LINE_BYTES)}…` : line;
    await appendFile(auditFilePath(), `${safe}\n`, { flag: "a" });
  } catch (error) {
    logSeoEvent("warn", "Audit log append failed.", { error: String(error) });
  }

  void appendDomainEvent({
    tenantId,
    streamId: "audit",
    eventType: event.action,
    payload
  });
}

export async function appendAuditEventFromRequest(request: NextRequest, event: Omit<AuditEvent, "tenantId">) {
  return appendAuditEvent({ ...event, tenantId: getTenantIdFromRequest(request) });
}
