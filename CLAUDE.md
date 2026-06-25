# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BibleBee is a React + Vite Bible memorization app with dual deployment options:
- **Vercel**: Frontend + Serverless API
- **Cloudflare Pages**: Static frontend + API proxy to Vercel

Tech stack:
- Frontend: React 19 + Vite 8 + Tailwind CSS
- Auth: Clerk
- Database: Neon Postgres
- Local cache: IndexedDB

## Development Commands

Start both frontend and API:
```bash
npm run dev
```

Or run separately:
```bash
npm run dev:api  # Local API on port 3001
npm run dev:web  # Frontend on port 5173
```

Build:
```bash
npm run build
```

Lint:
```bash
npm run lint
```

## Architecture

### Directory Structure

- `src/` - React frontend application
- `api/` - Vercel serverless functions (API endpoints)
- `server/lib/` - Shared server logic (database, auth, utilities)
- `server/routes/` - Route handlers for memorization and plans
- `functions/` - Cloudflare Pages API proxy
- `public/data/` - Static Bible data (combined.json, frequent.json)
- `scripts/` - Local development scripts

### Key Frontend Files

- `src/App.jsx` - Main application component (large file, ~54k tokens)
- `src/lib/indexed-db.js` - IndexedDB wrapper with 3 stores:
  - `static_json` - Caches combined/frequent Bible data
  - `user_cache` - Caches user plans and memorization data
  - `pending_ops` - Queues operations for `/api/sync`
- `src/lib/api-client.js` - API communication layer
- `src/lib/bible-data.js` - Bible data utilities

### API Architecture

All API endpoints are in `api/*.js` as Vercel serverless functions. They import shared logic from `server/lib/` and `server/routes/`.

Key endpoints:
- `GET /api/bootstrap` - Initial data load (user, plans, memorization)
- `POST /api/sync` - Batch sync IndexedDB operations to database
- `GET /api/plans` - List plans (supports guest mode)
- `POST /api/plans/:planId/select` - Select a plan
- `GET /api/memorization` - Get user's memorization data
- `POST /api/memorization/review` - Update flashcard status
- `POST /api/feedback` - Submit user feedback
- `GET /api/leaderboard` - Get mastery leaderboard

### Data Flow

1. Frontend uses IndexedDB for offline-first caching
2. User actions queue in `pending_ops` store
3. `/api/sync` endpoint processes batched operations
4. Static Bible data loaded from `public/data/`:
   - `combined.json` - Full Bible (large, cached in IndexedDB)
   - `frequent.json` - Common verses (reloaded on refresh)

### Environment Variables

Frontend (`.env.local`):
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key

Vercel:
- `BIBLEBEE_DATABASE_URL` - Neon connection string
- `CLERK_SECRET_KEY` - Clerk server key
- `CLERK_WEBHOOK_SIGNING_SECRET` - Webhook verification
- `FRONTEND_ORIGINS` - CORS whitelist (comma-separated)

Cloudflare Pages:
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `API_PROXY_TARGET` - Vercel API URL (e.g., https://bible-bee.vercel.app)

## Development Notes

- Vite dev server proxies `/api/*` to `http://127.0.0.1:3001`
- Local API runs via `scripts/dev-api.mjs` using Node's `--env-file`
- Cloudflare Pages only proxies API requests, doesn't run business logic
- All database operations go through `server/lib/db.js`
- Auth middleware in `server/lib/auth.js` validates Clerk tokens
