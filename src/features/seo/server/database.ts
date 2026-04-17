import { appEnv } from "@/features/seo/server/env";
import { logSeoEvent } from "@/lib/seo-log";
import type { SeoPersistenceState } from "@/features/seo/types";
import type { Pool, PoolClient } from "pg";

export const SEO_COLLECTION_ROW_PREFIX = "collection:";

const stateRowId = "default";
const tableName = "seo_runtime_state";

let didWarnAboutPg = false;

let poolSingleton: Pool | null | undefined = undefined;
let tableEnsured = false;

function stringToLockPair(s: string): [number, number] {
  let h1 = 0;
  for (let i = 0; i < s.length; i++) {
    h1 = (Math.imul(31, h1) + s.charCodeAt(i)) | 0;
  }
  let h2 = 5381;
  for (let i = 0; i < s.length; i++) {
    h2 = (Math.imul(33, h2) ^ s.charCodeAt(i)) | 0;
  }
  const mask = 0x7fffffff;
  return [(h1 & mask) + 1, (h2 & mask) + 1];
}

async function getPool(): Promise<Pool | null> {
  if (poolSingleton !== undefined) {
    return poolSingleton;
  }

  if (!appEnv.databaseUrl) {
    poolSingleton = null;
    return null;
  }

  try {
    const { Pool } = await import("pg");
    poolSingleton = new Pool({
      connectionString: appEnv.databaseUrl,
      max: 5,
      ssl: appEnv.databaseUrl.includes("sslmode=require") || appEnv.databaseUrl.includes("railway") ? true : undefined
    });
    return poolSingleton;
  } catch (error) {
    if (!didWarnAboutPg) {
      didWarnAboutPg = true;
      logSeoEvent("warn", "DATABASE_URL is set but the pg module could not be loaded; using file storage.", {
        error: String(error)
      });
    }

    poolSingleton = null;
    return null;
  }
}

async function ensureTable(pool: Pool | Pick<PoolClient, "query">) {
  if (tableEnsured) {
    return;
  }
  await pool.query(
    `create table if not exists ${tableName} (
      id text primary key,
      state jsonb not null,
      updated_at timestamptz not null default now()
    )`
  );
  tableEnsured = true;
}

export async function readStateFromDatabase() {
  const pool = await getPool();
  if (!pool) {
    return null;
  }

  try {
    await ensureTable(pool);
    const result = await pool.query(`select state from ${tableName} where id = $1 limit 1`, [stateRowId]);
    const rawState = result.rows[0]?.state;

    return rawState && typeof rawState === "object" ? (rawState as Partial<SeoPersistenceState>) : null;
  } catch (error) {
    logSeoEvent("error", "Failed to read SEO runtime state from Postgres.", { error: String(error) });
    return null;
  }
}

export async function readCollectionStatesFromDatabase(keys: Array<keyof SeoPersistenceState>) {
  const pool = await getPool();
  if (!pool || keys.length === 0) {
    return {} as Partial<SeoPersistenceState>;
  }

  try {
    await ensureTable(pool);
    const result = await pool.query(
      `select id, state from ${tableName} where id = any($1::text[])`,
      [keys.map((key) => `${SEO_COLLECTION_ROW_PREFIX}${String(key)}`)]
    );

    return result.rows.reduce((collections: Partial<SeoPersistenceState>, row: Record<string, unknown>) => {
      const rowId = typeof row.id === "string" ? row.id : "";
      const rawState = row.state;
      if (!rowId.startsWith(SEO_COLLECTION_ROW_PREFIX) || !rawState || typeof rawState !== "object") {
        return collections;
      }

      const key = rowId.slice(SEO_COLLECTION_ROW_PREFIX.length) as keyof SeoPersistenceState;
      Object.assign(collections, { [key]: rawState });
      return collections;
    }, {} as Partial<SeoPersistenceState>);
  } catch (error) {
    logSeoEvent("error", "Failed to read SEO runtime state collections from Postgres.", { error: String(error) });
    return {} as Partial<SeoPersistenceState>;
  }
}

export async function writeStateToDatabase(state: SeoPersistenceState) {
  const pool = await getPool();
  if (!pool) {
    return false;
  }

  try {
    await ensureTable(pool);
    await pool.query(
      `insert into ${tableName} (id, state, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id)
       do update set state = excluded.state, updated_at = now()`,
      [stateRowId, JSON.stringify(state)]
    );

    return true;
  } catch (error) {
    logSeoEvent("error", "Failed to write SEO runtime state to Postgres.", { error: String(error) });
    return false;
  }
}

export async function writeCollectionStateToDatabase<K extends keyof SeoPersistenceState>(key: K, value: SeoPersistenceState[K]) {
  const pool = await getPool();
  if (!pool) {
    return false;
  }

  try {
    await ensureTable(pool);
    await pool.query(
      `insert into ${tableName} (id, state, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id)
       do update set state = excluded.state, updated_at = now()`,
      [`${SEO_COLLECTION_ROW_PREFIX}${String(key)}`, JSON.stringify(value)]
    );

    return true;
  } catch (error) {
    logSeoEvent("error", `Failed to write SEO collection '${String(key)}' to Postgres.`, { error: String(error) });
    return false;
  }
}

/**
 * Runs read–mutate–write for a single collection inside a transaction with an advisory lock
 * so concurrent instances cannot overwrite each other's updates when using Postgres.
 */
export async function readCollectionRowJson(client: PoolClient, rowId: string): Promise<unknown> {
  const res = await client.query(`select state from ${tableName} where id = $1`, [rowId]);
  return res.rows[0]?.state;
}

export async function upsertCollectionRowJson(client: PoolClient, rowId: string, state: unknown) {
  await client.query(
    `insert into ${tableName} (id, state, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id)
     do update set state = excluded.state, updated_at = now()`,
    [rowId, JSON.stringify(state)]
  );
}

export async function runLockedCollectionMutation<T>(rowId: string, lockKey: string, handler: (client: PoolClient) => Promise<T>): Promise<T | null> {
  const pool = await getPool();
  if (!pool) {
    return null;
  }

  const [k1, k2] = stringToLockPair(lockKey);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureTable(client);
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [k1, k2]);
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logSeoEvent("error", "Locked collection mutation failed; transaction rolled back.", { rowId, error: String(error) });
    throw error;
  } finally {
    client.release();
  }
}

export async function getPostgresPool(): Promise<Pool | null> {
  return getPool();
}

export async function closeDatabasePool() {
  if (poolSingleton) {
    await poolSingleton.end();
  }
  poolSingleton = undefined;
  tableEnsured = false;
}

export async function pingDatabase(): Promise<{ ok: boolean; backend: "postgres" | "unconfigured"; detail?: string }> {
  const pool = await getPool();
  if (!pool) {
    return { ok: true, backend: "unconfigured" };
  }
  try {
    await pool.query("select 1");
    return { ok: true, backend: "postgres" };
  } catch (error) {
    return { ok: false, backend: "postgres", detail: String(error) };
  }
}
