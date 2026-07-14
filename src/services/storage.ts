import axios, { AxiosError } from "axios";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const DEFAULT_EXTENSION = ".bin";
const UPLOADS_DIRECTORY = path.resolve(process.cwd(), "uploads");

const CONTENT_TYPE_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

export interface StorageService {
  uploadFromUrl(url: string, mediaId: string): Promise<string>;
}

export class LocalStorageService implements StorageService {
  constructor(private readonly uploadsDirectory = UPLOADS_DIRECTORY) {}

  async uploadFromUrl(url: string, mediaId: string): Promise<string> {
    await this.ensureUploadsDirectory();

    let outputPath: string | undefined;

    try {
      const response = await axios.get<NodeJS.ReadableStream>(url, {
        responseType: "stream",
      });
      const contentTypeHeader =
        typeof response.headers["content-type"] === "string"
          ? response.headers["content-type"]
          : undefined;
      const extension = this.resolveExtension(url, contentTypeHeader);
      const fileName = `${this.sanitizeMediaId(mediaId)}${extension}`;

      outputPath = path.join(this.uploadsDirectory, fileName);

      await pipeline(response.data, createWriteStream(outputPath));

      return outputPath;
    } catch (error) {
      if (outputPath) {
        await this.removePartialFile(outputPath);
      }

      throw this.normalizeError(error, url);
    }
  }

  private async ensureUploadsDirectory(): Promise<void> {
    await mkdir(this.uploadsDirectory, { recursive: true });
  }

  private resolveExtension(url: string, contentTypeHeader?: string): string {
    const urlExtension = this.getExtensionFromUrl(url);

    if (urlExtension) {
      return urlExtension;
    }

    const contentTypeExtension = this.getExtensionFromContentType(contentTypeHeader);

    if (contentTypeExtension) {
      return contentTypeExtension;
    }

    return DEFAULT_EXTENSION;
  }

  private getExtensionFromUrl(fileUrl: string): string | null {
    try {
      const parsedUrl = new URL(fileUrl);
      const extension = path.extname(parsedUrl.pathname);

      if (!extension) {
        return null;
      }

      return this.isSafeExtension(extension) ? extension.toLowerCase() : null;
    } catch {
      const extension = path.extname(fileUrl);
      return extension && this.isSafeExtension(extension) ? extension.toLowerCase() : null;
    }
  }

  private getExtensionFromContentType(contentTypeHeader?: string): string | null {
    if (!contentTypeHeader) {
      return null;
    }

    const contentType = contentTypeHeader.split(";")[0].trim().toLowerCase();

    return CONTENT_TYPE_EXTENSION_MAP[contentType] ?? null;
  }

  private isSafeExtension(extension: string): boolean {
    return /^\.[a-z0-9]+$/i.test(extension);
  }

  private sanitizeMediaId(mediaId: string): string {
    const sanitizedMediaId = mediaId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!sanitizedMediaId) {
      throw new Error("mediaId must contain at least one valid filename character");
    }

    return sanitizedMediaId;
  }

  private async removePartialFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      const unlinkError = error as NodeJS.ErrnoException;

      if (unlinkError.code !== "ENOENT") {
        throw unlinkError;
      }
    }
  }

  private normalizeError(error: unknown, url: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status) {
        return new Error(
          `Failed to download media from ${url}. HTTP ${axiosError.response.status}.`,
        );
      }

      if (axiosError.message) {
        return new Error(`Failed to download media from ${url}. ${axiosError.message}`);
      }
    }

    if (error instanceof Error) {
      return new Error(`Failed to store media from ${url}. ${error.message}`);
    }

    return new Error(`Failed to store media from ${url}.`);
  }
}
