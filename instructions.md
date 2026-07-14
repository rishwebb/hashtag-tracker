# Setup

1. Install dependencies with `npm install`.
2. Add a `.env` file in the project root.
3. Generate Prisma client artifacts with `npm run prisma:generate`.
4. Apply the database migration with `npm run prisma:migrate`.
5. Start the app locally with `npm run dev`.

# Environment Variables

The project expects the following variables:

- `DATABASE_URL`: PostgreSQL connection string for Prisma.
- `ACCESS_TOKEN`: Meta Graph API access token.
- `USER_ID`: Instagram Business or Creator account user ID.
- `HASHTAG`: Hashtag to search, without the `#`.
- `PORT`: Optional HTTP server port. Defaults to `3000`.

# Tradeoffs

- Local storage instead of S3
- In-memory queue instead of SQS

# AI Usage

- ChatGPT
- What AI generated
  - Initial implementations for the Instagram sync flow, queue abstraction, cron job, API route, server wiring, and repository documentation.
- What I reviewed
  - TypeScript structure, Prisma integration points, API validation logic, logging, and project bootstrap flow.
- What I tested myself
  - TypeScript compilation with `tsc --noEmit`
  - Prisma client generation
  - Manual review of the queue, cron, sync, and API response shapes
