import { NextRequest, NextResponse } from "next/server";

import { getRedisClient } from "@/lib/redis";
import { getTenantIdFromRequest } from "@/lib/tenant";
import { logSeoEvent } from "@/lib/seo-log";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

let lastMemoryPruneAt = 0;
const MEMORY_PRUNE_INTERVAL_MS = 30_000;
const MEMORY_PRUNE_SIZE_THRESHOLD = 400;

function ipKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ?? request.headers.get("x-real-ip") ?? "unknown"
  );
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function pruneMemoryIfNeeded(now: number) {
  if (buckets.size === 0) {
    return;
  }
  if (buckets.size < MEMORY_PRUNE_SIZE_THRESHOLD && now - lastMemoryPruneAt < MEMORY_PRUNE_INTERVAL_MS) {
    return;
  }
  lastMemoryPruneAt = now;
  prune(now);
}

async function rateLimitWithRedis(
  redis: NonNullable<ReturnType<typeof getRedisClient>>,
  key: string,
  max: number,
  windowMs: number
): Promise<NextResponse | null> {
  await redis.connect().catch(() => undefined);
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.pexpire(key, windowMs);
  }
  if (n > max) {
    const pttl = await redis.pttl(key);
    const retryAfterSec = Math.max(1, Math.ceil((pttl > 0 ? pttl : windowMs) / 1000));
    return NextResponse.json(
      { error: "Too many requests.", retryAfterSec, backend: "redis" as const },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) }
      }
    );
  }
  return null;
}

function rateLimitMemory(
  request: NextRequest,
  tenantId: string,
  options: { namespace: string; max: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  pruneMemoryIfNeeded(now);
  const memKey = `${tenantId}:${options.namespace}:${ipKey(request)}`;
  let bucket = buckets.get(memKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + options.windowMs };
    buckets.set(memKey, bucket);
  }
  bucket.count += 1;
  if (bucket.count > options.max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests.", retryAfterSec, backend: "memory" as const },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) }
      }
    );
  }
  return null;
}

/**
 * Fixed-window rate limit: uses Redis when `REDIS_URL` is set, otherwise in-memory (single instance only).
 * If Redis errors at runtime, falls back to in-memory for that request (avoids 500s when Redis is down).
 */
export async function rateLimitResponse(
  request: NextRequest,
  options: { namespace: string; max: number; windowMs: number }
): Promise<NextResponse | null> {
  const tenantId = getTenantIdFromRequest(request);
  const redis = getRedisClient();
  if (redis) {
    const key = `rl:v1:${tenantId}:${options.namespace}:${ipKey(request)}`;
    try {
      return await rateLimitWithRedis(redis, key, options.max, options.windowMs);
    } catch (error) {
      logSeoEvent("warn", "Redis rate limit failed; using in-memory fallback.", { error: String(error) });
    }
  }

  return rateLimitMemory(request, tenantId, options);
}
