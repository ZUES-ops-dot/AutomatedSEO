import { Queue } from "bullmq";

import { appEnv } from "@/features/seo/server/env";
import type { JobName } from "@/features/seo/server/jobs";
import { getRedisClient } from "@/lib/redis";
import { logSeoEvent } from "@/lib/seo-log";

export const SEO_JOBS_QUEUE_NAME = "seo-jobs";

let queueSingleton: Queue | null | undefined;

function getQueue(): Queue | null {
  if (queueSingleton !== undefined) {
    return queueSingleton;
  }
  if (!appEnv.useJobQueue) {
    queueSingleton = null;
    return null;
  }
  const redis = getRedisClient();
  if (!redis) {
    queueSingleton = null;
    return null;
  }
  queueSingleton = new Queue(SEO_JOBS_QUEUE_NAME, {
    connection: redis.duplicate({ maxRetriesPerRequest: null })
  });
  return queueSingleton;
}

export function isSeoJobQueueAvailable(): boolean {
  return Boolean(appEnv.redisUrl && appEnv.useJobQueue && getRedisClient());
}

export async function enqueueSeoJob(job: JobName, options?: { idempotencyKey?: string }) {
  const queue = getQueue();
  if (!queue) {
    throw new Error("SEO job queue is not configured (set REDIS_URL and USE_JOB_QUEUE=true).");
  }
  const bullJob = await queue.add(
    "run",
    { job, idempotencyKey: options?.idempotencyKey },
    {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
      attempts: 2,
      backoff: { type: "exponential", delay: 4000 }
    }
  );
  logSeoEvent("info", "Enqueued SEO job.", { job, bullJobId: String(bullJob.id) });
  return bullJob;
}
