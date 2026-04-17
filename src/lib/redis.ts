import IORedis from "ioredis";

import { appEnv } from "@/features/seo/server/env";
import { logSeoEvent } from "@/lib/seo-log";

let client: IORedis | null | undefined;

/**
 * Shared Redis connection for rate limiting and BullMQ. Returns null when `REDIS_URL` is unset.
 * Uses `maxRetriesPerRequest: null` as required by BullMQ.
 */
export function getRedisClient(): IORedis | null {
  if (client !== undefined) {
    return client;
  }

  if (!appEnv.redisUrl) {
    client = null;
    return null;
  }

  try {
    client = new IORedis(appEnv.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true
    });
    client.on("error", (error: Error) => {
      logSeoEvent("warn", "Redis connection error.", { error: String(error) });
    });
    return client;
  } catch (error) {
    logSeoEvent("warn", "Redis client could not be created.", { error: String(error) });
    client = null;
    return null;
  }
}

export async function pingRedis(): Promise<{ ok: boolean; backend: "redis" | "unconfigured"; detail?: string }> {
  const r = getRedisClient();
  if (!r) {
    return { ok: true, backend: "unconfigured" };
  }
  try {
    await r.connect().catch(() => undefined);
    const pong = await r.ping();
    return { ok: pong === "PONG", backend: "redis" };
  } catch (error) {
    return { ok: false, backend: "redis", detail: String(error) };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (client && client !== null) {
    await client.quit().catch(() => undefined);
  }
  client = undefined;
}
