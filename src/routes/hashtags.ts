import { Router } from "express";

import { prisma } from "../db/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(value: unknown, fallback: number): number | null {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

export const hashtagsRouter = Router();

hashtagsRouter.get("/", async (req, res) => {
  const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);

  if (page === null) {
    return res.status(400).json({ error: "Query parameter page must be a positive integer." });
  }

  if (limit === null) {
    return res
      .status(400)
      .json({ error: "Query parameter limit must be a positive integer." });
  }

  if (limit > MAX_LIMIT) {
    return res
      .status(400)
      .json({ error: `Query parameter limit must not exceed ${MAX_LIMIT}.` });
  }

  try {
    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      prisma.media.count(),
      prisma.media.findMany({
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      page,
      limit,
      total,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[hashtags] Failed to fetch media: ${message}`);

    return res.status(500).json({ error: "Internal server error" });
  }
});
