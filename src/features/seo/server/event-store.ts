import { getPostgresPool } from "@/features/seo/server/database";
import type { TenantId } from "@/features/seo/types";
import { logSeoEvent } from "@/lib/seo-log";

const tableName = "seo_domain_events";

let tableEnsured = false;

async function ensureDomainEventsTable() {
  if (tableEnsured) {
    return;
  }
  const pool = await getPostgresPool();
  if (!pool) {
    return;
  }
  await pool.query(`
    create table if not exists ${tableName} (
      id bigserial primary key,
      tenant_id text not null default 'default',
      stream_id text not null,
      event_type text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    )
  `);
  await pool.query(
    `create index if not exists seo_domain_events_tenant_stream_idx on ${tableName} (tenant_id, stream_id, id)`
  );
  tableEnsured = true;
}

export type DomainEventInput = {
  tenantId: TenantId;
  streamId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

/**
 * Append-only domain event row (event sourcing / HA audit). No-op when Postgres is unavailable.
 */
export async function appendDomainEvent(input: DomainEventInput): Promise<void> {
  const pool = await getPostgresPool();
  if (!pool) {
    return;
  }
  try {
    await ensureDomainEventsTable();
    await pool.query(
      `insert into ${tableName} (tenant_id, stream_id, event_type, payload)
       values ($1, $2, $3, $4::jsonb)`,
      [input.tenantId, input.streamId, input.eventType, JSON.stringify(input.payload)]
    );
  } catch (error) {
    logSeoEvent("error", "Failed to append domain event to Postgres.", { error: String(error) });
  }
}

export type StoredDomainEvent = {
  id: string;
  tenantId: TenantId;
  streamId: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
};

/** Read recent events for replay / debugging (newest first). */
export async function readDomainEvents(options: {
  tenantId?: TenantId;
  streamId?: string;
  limit?: number;
} = {}): Promise<StoredDomainEvent[]> {
  const pool = await getPostgresPool();
  if (!pool) {
    return [];
  }
  try {
    await ensureDomainEventsTable();
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (options.tenantId) {
      params.push(options.tenantId);
      clauses.push(`tenant_id = $${params.length}`);
    }
    if (options.streamId) {
      params.push(options.streamId);
      clauses.push(`stream_id = $${params.length}`);
    }
    const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
    params.push(limit);
    const lim = `$${params.length}`;
    const result = await pool.query(
      `select id, tenant_id, stream_id, event_type, payload, created_at
       from ${tableName}
       ${where}
       order by id desc
       limit ${lim}`,
      params
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      tenantId: String(row.tenant_id),
      streamId: String(row.stream_id),
      eventType: String(row.event_type),
      payload: row.payload,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  } catch (error) {
    logSeoEvent("error", "Failed to read domain events.", { error: String(error) });
    return [];
  }
}
