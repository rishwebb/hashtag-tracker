import { syncRecentMedia } from "./sync";

export const SYNC_RECENT_HASHTAG_MEDIA_JOB = "SYNC_RECENT_HASHTAG_MEDIA" as const;

export interface Queue {
  enqueue(job: string, payload: unknown): Promise<void>;
}

export class InMemoryQueue implements Queue {
  async enqueue(job: string, payload: unknown): Promise<void> {
    console.info(`[queue] Enqueuing job "${job}"`);

    switch (job) {
      case SYNC_RECENT_HASHTAG_MEDIA_JOB:
        await this.handleSyncRecentHashtagMedia(payload);
        return;
      default:
        throw new Error(`Unknown job: ${job}`);
    }
  }

  private async handleSyncRecentHashtagMedia(_payload: unknown): Promise<void> {
    const summary = await syncRecentMedia();

    console.info(
      `[queue] Job "${SYNC_RECENT_HASHTAG_MEDIA_JOB}" completed. fetched=${summary.fetched} inserted=${summary.inserted} updated=${summary.updated} failed=${summary.failed}`,
    );
  }
}
