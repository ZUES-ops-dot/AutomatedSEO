/**
 * Long-running BullMQ worker. Run alongside the Next.js app:
 *   REDIS_URL=... USE_JOB_QUEUE=true DATABASE_URL=... npm run worker:seo
 */
import { Worker } from "bullmq";

import { appEnv } from "@/features/seo/server/env";
import { runFullCycleJob, runSeoJob, type JobName } from "@/features/seo/server/jobs";
import { SEO_JOBS_QUEUE_NAME } from "@/lib/queue/seo-jobs-queue";
import { getRedisClient } from "@/lib/redis";
import { logSeoEvent } from "@/lib/seo-log";

async function main() {
  if (!appEnv.redisUrl) {
    logSeoEvent("error", "worker:seo requires REDIS_URL.", {});
    process.exit(1);
  }

  const redis = getRedisClient();
  if (!redis) {
    logSeoEvent("error", "Redis client unavailable.", {});
    process.exit(1);
  }

  try {
    await redis.connect();
  } catch (error) {
    logSeoEvent("error", "Redis connect failed; worker cannot start.", { error: String(error) });
    process.exit(1);
  }

  const worker = new Worker(
    SEO_JOBS_QUEUE_NAME,
    async (bullJob) => {
      const name = bullJob.data?.job as JobName | undefined;
      if (!name) {
        throw new Error("Missing job name in queue payload.");
      }
      if (name === "full-cycle") {
        return runFullCycleJob();
      }
      return runSeoJob(name);
    },
    {
      connection: redis.duplicate({ maxRetriesPerRequest: null }),
      concurrency: 1
    }
  );

  worker.on("failed", (job, error) => {
    logSeoEvent("error", "SEO queue job failed.", { jobId: job?.id, error: String(error) });
  });

  const shutdown = async () => {
    await worker.close().catch(() => undefined);
    await redis.quit().catch(() => undefined);
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  logSeoEvent("info", "SEO jobs worker started.", { queue: SEO_JOBS_QUEUE_NAME });
}

void main().catch((error) => {
  logSeoEvent("error", "SEO worker fatal.", { error: String(error) });
  process.exit(1);
});
