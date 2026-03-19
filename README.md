# Workflow Manager

A fullstack alert workflow application built with **NestJS** (API), **tRPC** (type-safe API layer), and **Next.js** (frontend).

## Features

- **Workflow builder** — visual canvas with threshold and variance trigger nodes, message output, and recipient nodes (email + in-app)
- **Alert lifecycle** — events stay open until manually resolved; duplicate prevention blocks re-triggering while an open/snoozed event exists
- **Snooze** — postpone an open event for a configurable duration; no duplicates or notifications are generated during the snooze window. A cron task reopens events automatically when the snooze expires
- **In-app notifications** — real-time bell with unread count, populated when a `RecipientInApp` node executes
- **Global events page** — cross-workflow history with workflow and status filters (Open / Snoozed / Resolved)
- **Resolution comments** — optional note recorded when resolving an event, displayed inline on the event card
- **Step-level comments** — threaded notes per node execution, accessible from the execution history panel
- **Email notifications** — via Mailtrap sandbox (disabled by default, toggled with `SEND_EMAILS=true`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, App Router, React 19, TanStack Query v5 |
| API | NestJS, tRPC v11, SuperJSON |
| Auth | Better Auth (email/password, scrypt) |
| Database | PostgreSQL 17, Drizzle ORM |
| Queue | BullMQ + Redis |
| Scheduler | `@nestjs/schedule` (cron for snooze reactivation) |
| Email | Mailtrap sandbox |

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm i -g pnpm`
- **Docker** (for PostgreSQL and Redis)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd spexs-challenge
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d db redis
```

This starts:
- PostgreSQL 17 on `localhost:5432` (user: `postgres`, password: `postgres`, db: `spexs`)
- Redis 7 on `localhost:6379`

### 3. Configure environment variables

**API** — create `apps/api/.env`:

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgres://postgres:postgres@localhost:5432/spexs

# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3001

FRONTEND_URL=http://localhost:3000

REDIS_HOST=localhost
REDIS_PORT=6379

# Email (optional — set to true + add Mailtrap credentials to enable)
SEND_EMAILS=false
MAILTRAP_API_KEY=
MAILTRAP_INBOX_ID=
FROM_EMAIL=hello@example.com
```

**Frontend** — create `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Database CLI** — create `packages/db/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spexs
```

### 4. Run migrations

```bash
pnpm --filter @spexs/db db:migrate
```

### 5. Seed demo data

```bash
pnpm --filter @spexs/db db:seed
```

This creates two demo users and three sample workflows with alert events in various states:

| Email | Password |
|---|---|
| alice@example.com | Sp3xs!Alice#2026$Demo |
| bob@example.com | Sp3xs!Bob#2026$Test |

The seed is **idempotent** — re-running it clears and recreates all domain data while reusing existing auth accounts.

### 6. Start the development servers

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

---

## Environment Variables Reference

### `apps/api/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `3001` | API server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | **Yes** | — | Auth signing secret (min 32 chars). Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | **Yes** | — | Full URL where the API is reachable (e.g. `http://localhost:3001`) |
| `FRONTEND_URL` | No | `http://localhost:3000` | Primary trusted CORS origin |
| `ALLOWED_ORIGINS` | No | — | Comma-separated additional CORS origins |
| `REDIS_HOST` | No | `localhost` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `SEND_EMAILS` | No | `false` | Set to `true` to enable Mailtrap email delivery |
| `MAILTRAP_API_KEY` | No | — | Mailtrap API key (required when `SEND_EMAILS=true`) |
| `MAILTRAP_INBOX_ID` | No | — | Mailtrap sandbox inbox ID |
| `FROM_EMAIL` | No | `hello@example.com` | Sender address |

### `apps/web/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | URL of the API — used by both the browser (client components) and the server (RSC prefetching). Baked at build time. |

### `packages/db/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (used by `drizzle-kit` and the seed script) |

---

## Available Scripts

Run from the **monorepo root** unless otherwise noted.

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode (turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint with Biome |

Run from **`packages/db/`**:

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:seed` | Seed demo data (idempotent) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

---

## Project Structure

```
spexs-challenge/
├── apps/
│   ├── api/                    # NestJS + tRPC backend
│   │   └── src/
│   │       ├── lib/            # Auth instance, env schema
│   │       └── modules/
│   │           ├── workflows/  # Workflow CRUD + canvas graph
│   │           ├── executions/ # BullMQ processor, executor registry
│   │           ├── events/     # Alert event lifecycle + snooze cron
│   │           ├── notifications/ # In-app notification CRUD
│   │           ├── email/      # Mailtrap email service
│   │           └── trpc/       # Root router, context, rate limiting
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router pages
│       └── features/
│           ├── workflows/      # Canvas, history view, trigger dialogs
│           ├── events/         # Shared resolve/snooze dialogs, global events view
│           └── notifications/  # Notification bell + hooks
└── packages/
    ├── db/                     # Drizzle schema, migrations, seed
    └── types/                  # Shared enums, Zod schemas, constants
```

---

## Architecture Notes

### Event lifecycle

```
Trigger fires
  └─ Condition met?
       ├─ No  → execution SUCCESS, no event created
       └─ Yes → OPEN event created ◄─── blocked if OPEN or SNOOZED event already exists
                  ├─ User resolves → RESOLVED (optional comment stored)
                  └─ User snoozes → SNOOZED (snoozedUntil set)
                       └─ Cron (@every minute) reopens when snoozedUntil < now → OPEN
```

> **Duplicate prevention**: before creating a new alert event the processor checks for any existing event in `OPEN` or `SNOOZED` state for that workflow. If one is found, all downstream nodes (message, email, in-app) are skipped and no new event row is created — the execution completes as SUCCESS with nodes marked SKIPPED.

### tRPC namespaces

| Namespace | Procedures |
|---|---|
| `workflows` | CRUD, node/connection management, toggleActive |
| `executions` | execute, retry, getProgress, getLastExecution, getDetails, getComments |
| `events` | list, resolve, snooze, getComments, addStepComment |
| `notifications` | list, unreadCount, markRead, markAllRead |

### Duplicate prevention

When a trigger condition is met the processor calls `findOpenAlertEvent` before creating a new event. This query matches both `OPEN` and `SNOOZED` statuses — so no duplicate is created during a snooze window.

---

## Extra Feature: Snooze

Selecting **Snooze** on an open event postpones it for a chosen duration (15 min – 24 h). During the snooze:

- No new duplicate events are created for that workflow
- In-app and email notifications are suppressed
- The event shows a "Snoozed until HH:MM" badge

A `@Cron(EVERY_MINUTE)` task in `EventsService` queries for SNOOZED events with `snoozedUntil ≤ now` and reopens them automatically.
