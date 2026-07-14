-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "likeCount" INTEGER,
    "commentsCount" INTEGER,
    "localPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);
