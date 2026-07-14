import { prisma } from "../db/prisma";
import { unlink } from "node:fs/promises";
import * as InstagramService from "./instagram";
import { LocalStorageService, type StorageService } from "./storage";

const MAX_MEDIA_ITEMS = 500;

export type SyncSummary = {
  fetched: number;
  inserted: number;
  updated: number;
  failed: number;
};

type SyncDependencies = {
  storageService?: StorageService;
};

type SyncMediaKind = "top" | "recent";

async function syncMediaCollection(
  mediaKind: SyncMediaKind,
  dependencies: SyncDependencies = {},
): Promise<SyncSummary> {
  const storageService = dependencies.storageService ?? new LocalStorageService();
  const summary: SyncSummary = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
  };

  console.info(`[sync:${mediaKind}] Starting sync`);

  try {
    const hashtagId = await InstagramService.getHashtagId();
    console.info(`[sync:${mediaKind}] Resolved hashtag ID: ${hashtagId}`);

    const mediaItems =
      mediaKind === "top"
        ? await InstagramService.getTopMedia(hashtagId, { maxItems: MAX_MEDIA_ITEMS })
        : await InstagramService.getRecentMedia(hashtagId, { maxItems: MAX_MEDIA_ITEMS });

    summary.fetched = mediaItems.length;
    console.info(`[sync:${mediaKind}] Fetched ${summary.fetched} media item(s)`);

    for (const media of mediaItems) {
      let localPath: string | null = null;

      try {
        const existingMedia = await prisma.media.findUnique({
          where: { id: media.id },
          select: { id: true },
        });

        localPath = await storageService.uploadFromUrl(media.media_url, media.id);

        await prisma.media.upsert({
          where: { id: media.id },
          create: {
            id: media.id,
            caption: media.caption,
            mediaType: media.media_type,
            mediaUrl: media.media_url,
            permalink: media.permalink,
            timestamp: new Date(media.timestamp),
            likeCount: media.like_count,
            commentsCount: media.comments_count,
            localPath,
          },
          update: {
            caption: media.caption,
            mediaType: media.media_type,
            mediaUrl: media.media_url,
            permalink: media.permalink,
            timestamp: new Date(media.timestamp),
            likeCount: media.like_count,
            commentsCount: media.comments_count,
            localPath,
          },
        });

        if (existingMedia) {
          summary.updated += 1;
        } else {
          summary.inserted += 1;
        }
      } catch (error) {
        summary.failed += 1;

        if (localPath) {
          try {
            await unlink(localPath);
          } catch {
            // Ignore cleanup failures so one bad file never blocks the sync.
          }
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`[sync:${mediaKind}] Failed to process media ${media.id}: ${message}`);
      }
    }

    console.info(
      `[sync:${mediaKind}] Completed sync. fetched=${summary.fetched} inserted=${summary.inserted} updated=${summary.updated} failed=${summary.failed}`,
    );

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[sync:${mediaKind}] Sync failed before completion: ${message}`);
    throw error;
  }
}

export async function syncTopMedia(
  dependencies?: SyncDependencies,
): Promise<SyncSummary> {
  return syncMediaCollection("top", dependencies);
}

export async function syncRecentMedia(
  dependencies?: SyncDependencies,
): Promise<SyncSummary> {
  return syncMediaCollection("recent", dependencies);
}
