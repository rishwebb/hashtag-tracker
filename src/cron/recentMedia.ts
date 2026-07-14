import cron from "node-cron";

import {
  InMemoryQueue,
  SYNC_RECENT_HASHTAG_MEDIA_JOB,
  type Queue,
} from "../services/queue";

const RECENT_MEDIA_CRON_SCHEDULE = "0 */3 * * *";

export function startRecentMediaCron(queue: Queue = new InMemoryQueue()) {
  const task = cron.schedule(RECENT_MEDIA_CRON_SCHEDULE, async () => {
    try {
      await queue.enqueue(SYNC_RECENT_HASHTAG_MEDIA_JOB, {
        job: SYNC_RECENT_HASHTAG_MEDIA_JOB,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[cron] Failed to enqueue recent media sync job: ${message}`);
    }
  });

  console.info(`[cron] Scheduled recent media sync with expression "${RECENT_MEDIA_CRON_SCHEDULE}"`);

  return task;
}
