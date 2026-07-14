# Hashtag Tracker

Hashtag Tracker syncs Instagram hashtag media through the Meta Graph API, stores media metadata in PostgreSQL with Prisma, downloads assets locally, and exposes a paginated `GET /hashtags` endpoint for consumers.

## Overview

The service has two main responsibilities:

- sync Instagram media for the matcha hashtag using the Meta Graph API
- expose stored media through a simple paginated API

The write path is intentionally separated into small services so queueing, storage, and sync strategies can evolve independently.

## Features

- Fetches Instagram hashtag media using the Meta Graph API
- Supports paginated ingestion up to 500 media items
- Prevents duplicate records with Prisma upsert
- Downloads media assets to local storage
- Runs automatic recent-media sync every 3 hours
- Exposes a paginated REST API
- Abstracts queue and storage implementations for future AWS migration

## Architecture

```text
Client
   |
GET /hashtags
   |
Express
   |
Prisma
   |
PostgreSQL

Cron
   |
Queue
   |
SyncService
   |
InstagramService
   |
StorageService
```

## Tech Stack

- TypeScript
- Node.js
- Express
- Prisma
- PostgreSQL
- node-cron
- Axios

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with the required environment variables described in `instructions.md`.

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Run the database migration:

```bash
npm run prisma:migrate
```

## Environment Variables

The application expects these variables:

- `DATABASE_URL`: PostgreSQL connection string
- `ACCESS_TOKEN`: Meta Graph API access token
- `USER_ID`: Instagram Business or Creator account ID
- `HASHTAG`: Hashtag to sync, without `#`
- `PORT`: Optional server port, defaults to `3000`

## Run Locally

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

## Running Migrations

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply schema changes locally:

```bash
npm run prisma:migrate
```

## Folder Structure

```text
src/
  app.ts
  server.ts
  cron/
    recentMedia.ts
  db/
    prisma.ts
  routes/
    hashtags.ts
  services/
    instagram.ts
    queue.ts
    storage.ts
    sync.ts
prisma/
  schema.prisma
  migrations/
```

## API

Endpoint:

```http
GET /hashtags?page=1&limit=20
```

Query parameters:

- `page`: defaults to `1`
- `limit`: defaults to `20`, maximum `100`

Response shape:

```json
{
  "page": 1,
  "limit": 20,
  "total": 42,
  "data": [
    {
      "id": "17800000000000000",
      "caption": "Sample post",
      "mediaType": "IMAGE",
      "mediaUrl": "https://example.com/media.jpg",
      "permalink": "https://www.instagram.com/p/example/",
      "timestamp": "2026-07-14T12:00:00.000Z",
      "likeCount": 12,
      "commentsCount": 3,
      "localPath": "uploads/17800000000000000.jpg",
      "createdAt": "2026-07-14T12:05:00.000Z"
    }
  ]
}
```

## Design Decisions

- Prisma is used for database access and migrations to keep schema management explicit.
- Local storage is abstracted behind `StorageService` so S3 can be added later without rewriting sync logic.
- Queue execution is abstracted behind `Queue` so the in-memory implementation can be replaced with SQS.
- Media writes use `upsert` keyed by Instagram media ID to avoid duplicates across repeated syncs.
- Instagram pagination is capped at 500 items to match the assignment requirement and keep sync bounds predictable.

## Tradeoffs

- Local filesystem storage instead of S3
- In-memory queue instead of SQS
- Sequential media processing for simpler failure isolation and logging
