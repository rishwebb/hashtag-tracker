# Hashtag Tracker

Hashtag Tracker is a backend service that periodically synchronizes Instagram hashtag media from the Meta Graph API, stores media metadata in PostgreSQL, downloads media locally, and exposes the stored data through a paginated REST API. The project demonstrates backend architecture, scheduled jobs, queue abstraction, database design, and service separation.

## Overview

The service has two main responsibilities:

- sync Instagram media for the matcha hashtag using the Meta Graph API
- expose stored media through a simple paginated API

This project intentionally favors readability and clear separation of responsibilities over premature optimization.

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
                     Meta Graph API
                           |
                    InstagramService
                           |
                      SyncService
                    /             \
                   /               \
          StorageService         Prisma
               |                    |
         Local uploads         PostgreSQL

Cron -> Queue -> SyncService

Client -> GET /hashtags -> Express -> Prisma -> PostgreSQL
```

The queue is currently an in-memory FIFO queue that serializes sync jobs. It exists behind an abstraction so it can later be replaced with Amazon SQS or another distributed queue.

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

## Database Schema

The main table is `Media`, which stores:

- `id` (primary key)
- `caption`
- `mediaType`
- `mediaUrl`
- `permalink`
- `timestamp`
- `likeCount`
- `commentsCount`
- `localPath`
- `createdAt`

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

Pagination uses SQL `OFFSET` / `LIMIT` through Prisma. Offset pagination is sufficient here because the assignment scope is small and ingestion is capped at 500 records per sync.

Success response shape:

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

Example `400 Bad Request` response:

```json
{
  "error": "Query parameter page must be a positive integer."
}
```

Example `500 Internal Server Error` response:

```json
{
  "error": "Internal server error"
}
```

## Error Handling

- Database writes use Prisma `upsert` operations to prevent duplicate records.
- Failed downloads or per-item processing errors are logged without stopping the entire sync.
- If a download succeeds but the database write fails, the downloaded file is cleaned up to avoid orphaned local files.
- API failures from the Meta Graph API are surfaced with normalized error messages and can be retried on the next scheduled sync.
- The `/hashtags` route validates input and returns `400` for invalid pagination parameters and `500` for unexpected failures.

## Assumptions

- Meta API synchronization processes a maximum of 500 media items per run.
- Only hashtag media accessible through the configured Meta Graph API credentials is synchronized.
- One scheduled sync job runs at a time through the current in-memory queue flow.
- Local filesystem storage is acceptable for the assignment environment.

## Design Decisions

- Prisma is used for database access and migrations to keep schema management explicit.
- Local storage is abstracted behind `StorageService` so S3 can be added later without rewriting sync logic.
- Queue execution is abstracted behind `Queue` so the in-memory implementation can be replaced with SQS.
- Media writes use `upsert` keyed by Instagram media ID to avoid duplicates across repeated syncs.
- Instagram pagination is capped at 500 items to match the assignment requirement and keep sync bounds predictable.

## Tradeoffs

- Local filesystem storage instead of S3
- In-memory queue instead of SQS
- Sequential media processing simplifies failure isolation and deterministic logging at the expense of throughput. For larger workloads, batched concurrent workers would be a better fit.

## Security

- Credentials are loaded from environment variables.
- Prisma uses parameterized queries under the hood for database access.
- Request parameters are validated before database access.
- `.env` is excluded from version control through `.gitignore`.

## Deployment

For production, I would deploy this with:

- Docker
- Amazon ECS
- Amazon RDS
- Amazon S3
- Amazon SQS
- EventBridge Scheduler

## Future Improvements

- Replace local storage with Amazon S3
- Replace the in-memory queue with Amazon SQS
- Add concurrent worker processing
- Add retry logic and dead-letter queues
- Add Prometheus metrics
- Add distributed tracing
- Containerize and automate deployment workflows
