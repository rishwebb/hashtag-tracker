import axios, { AxiosError } from "axios";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v20.0";
const MAX_MEDIA_ITEMS = 500;
const DEFAULT_PAGE_LIMIT = 50;

type GraphPaging = {
  next?: string;
};

type GraphResponse<T> = {
  data: T[];
  paging?: GraphPaging;
};

type HashtagSearchItem = {
  id: string;
  name?: string;
};

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

type MediaFetchOptions = {
  limit?: number;
  maxItems?: number;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAccessToken(): string {
  return getRequiredEnv("ACCESS_TOKEN");
}

function getInstagramUserId(): string {
  return getRequiredEnv("USER_ID");
}

function getHashtagName(): string {
  return getRequiredEnv("HASHTAG");
}

function buildGraphUrl(path: string): string {
  return `${GRAPH_API_BASE_URL}${path}`;
}

function normalizeAxiosError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    const apiMessage = axiosError.response?.data?.error?.message;
    const status = axiosError.response?.status;

    if (apiMessage && status) {
      return new Error(`Instagram Graph API error (${status}): ${apiMessage}`);
    }

    if (apiMessage) {
      return new Error(`Instagram Graph API error: ${apiMessage}`);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown Instagram Graph API error");
}

async function fetchPage<T>(url: string): Promise<GraphResponse<T>> {
  try {
    const response = await axios.get<GraphResponse<T>>(url);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function fetchAllPages<T>(
  initialUrl: string,
  maxItems = MAX_MEDIA_ITEMS,
): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = initialUrl;

  while (next && items.length < maxItems) {
    const response: GraphResponse<T> = await fetchPage<T>(next);
    const remaining = maxItems - items.length;

    items.push(...response.data.slice(0, remaining));
    next = response.paging?.next;
  }

  return items;
}

export async function getHashtagId(hashtag = getHashtagName()): Promise<string> {
  const accessToken = getAccessToken();
  const userId = getInstagramUserId();

  const url =
    `${buildGraphUrl("/ig_hashtag_search")}` +
    `?user_id=${encodeURIComponent(userId)}` +
    `&q=${encodeURIComponent(hashtag)}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const response: GraphResponse<HashtagSearchItem> = await fetchPage<HashtagSearchItem>(
    url,
  );
  const hashtagMatch = response.data[0];

  if (!hashtagMatch?.id) {
    throw new Error(`No Instagram hashtag found for "${hashtag}"`);
  }

  return hashtagMatch.id;
}

function buildMediaUrl(
  hashtagId: string,
  mediaType: "top_media" | "recent_media",
  options?: MediaFetchOptions,
): string {
  const accessToken = getAccessToken();
  const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");

  return (
    `${buildGraphUrl(`/${encodeURIComponent(hashtagId)}/${mediaType}`)}` +
    `?user_id=${encodeURIComponent(getInstagramUserId())}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&limit=${limit}` +
    `&access_token=${encodeURIComponent(accessToken)}`
  );
}

export async function getTopMedia(
  hashtagId: string,
  options?: MediaFetchOptions,
): Promise<InstagramMedia[]> {
  const url = buildMediaUrl(hashtagId, "top_media", options);
  const maxItems = options?.maxItems ?? MAX_MEDIA_ITEMS;

  return fetchAllPages<InstagramMedia>(url, maxItems);
}

export async function getRecentMedia(
  hashtagId: string,
  options?: MediaFetchOptions,
): Promise<InstagramMedia[]> {
  const url = buildMediaUrl(hashtagId, "recent_media", options);
  const maxItems = options?.maxItems ?? MAX_MEDIA_ITEMS;

  return fetchAllPages<InstagramMedia>(url, maxItems);
}
