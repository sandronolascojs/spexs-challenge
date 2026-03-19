# Workflow Manager

A fullstack alert workflow application built with **NestJS** (API), **tRPC** (type-safe API layer), and **Next.js** (frontend).

---

## Product Features

### Visual Workflow Builder

A React Flow canvas where workflows are constructed by placing nodes and drawing edges between them. The graph is a directed acyclic graph (DAG) — the UI prevents cycles before they reach the API, and the backend validates again with a topological sort before persisting any connection.

**Available node types:**

| Node | Role | What it does |
|---|---|---|
| **Manual Trigger** | Trigger | Always fires; forwards arbitrary key/value data into execution context |
| **Threshold Trigger** | Trigger | Compares a metric value against a threshold using `gt / lt / gte / lte / eq`; fires only when the condition is met |
| **Variance Trigger** | Trigger | Fires when `abs(current − base) > base × deviation% / 100`; useful for anomaly detection |
| **Output Message** | Processing | Renders a Handlebars template (`{{trigger.metricName}}`, `{{trigger.value}}`, etc.) into a human-readable alert message |
| **Recipient Email** | Output | Delivers the rendered message to a list of email addresses via Mailtrap sandbox |
| **Recipient In-App** | Output | Creates a persistent notification record for the triggering user; appears in the notification bell immediately |

Workflow templates (`threshold`, `variance`, `scratch`) pre-seed a sensible node/connection layout on creation so users can start configuring rather than building from scratch.

### Execution Engine

Clicking **Run** on the canvas (or **Retry** on a failed execution) enqueues a background job. The frontend polls `executions.getProgress` to stream per-node status updates in real time without a WebSocket.

Execution flow per job:
1. Nodes are processed in topological order.
2. Each node is marked `RUNNING`, the executor runs, then it is marked `SUCCESS` or `FAILED`.
3. After the first (trigger) node: if the condition is not met, the execution completes as `SUCCESS` with downstream nodes skipped — no alert event is created.
4. If the condition is met: an idempotency check runs. If an `OPEN` or `SNOOZED` event already exists for that workflow, all downstream nodes are marked `SKIPPED` and no duplicate event is created.
5. On failure: the execution is marked `FAILED` and the job is retained in BullMQ for manual retry.
6. On retry: the processor resumes from the last checkpoint — nodes already marked `SUCCESS` are skipped, so execution continues from the failed step rather than restarting from scratch.

### Alert Event Lifecycle

Events are created when a trigger condition fires and no duplicate exists. They stay `OPEN` until a user acts.

```
Trigger condition fires
  └─ Condition met?
       ├─ No  → execution SUCCESS, no event created
       └─ Yes → OPEN event created ◄─── blocked if OPEN or SNOOZED event already exists
                  ├─ User resolves → RESOLVED (optional comment stored)
                  └─ User snoozes → SNOOZED (snoozedUntil set)
                       └─ Cron (@every minute) reopens when snoozedUntil < now → OPEN
```

### Snooze

Postpone an open event for a configurable duration (15 min, 30 min, 1 h, 2 h, 4 h, 8 h, 24 h). During the snooze window:

- No duplicate events are created for that workflow.
- In-app and email notifications are suppressed.
- The event card shows a "Snoozed until HH:MM" badge.

A `@Cron(EVERY_MINUTE)` task in `EventsService` queries SNOOZED events with `snoozedUntil ≤ now` and bulk-reopens them automatically.

### Global Events Page

Cross-workflow alert history with:
- **Workflow filter** — scope the list to a specific workflow
- **Status filter** — OPEN / SNOOZED / RESOLVED
- URL-persisted filter state via `nuqs` (shareable, back-button safe)
- **Resolve** action — with an optional free-text comment
- **Snooze** action — with duration picker

### Execution History (per-workflow)

The History tab on a workflow page shows every alert event for that workflow. Each event is expandable into an accordion of node execution steps, each showing input data, output data, error details, and timing. A **Retry** button appears on failed executions. Step-level threaded comments can be added from a slide-out sheet on any step.

### In-App Notifications

A notification bell in the sidebar shows an unread count badge (capped at `99+`). The dropdown lists recent notifications with title, message, and relative timestamp. Individual notifications can be marked read on click; a "Mark all read" button clears the badge in bulk. Clicking a notification navigates to the relevant workflow history tab or events page.

### Email Notifications

When a `RecipientEmail` node executes, the rendered message is delivered via Mailtrap's sandbox API. Disabled by default (`SEND_EMAILS=false`); set to `true` and provide Mailtrap credentials to enable live delivery.

### Resolution Comments

When resolving an alert event, an optional free-text comment can be recorded. Comments are stored in the `event_comments` table and displayed inline on the resolved event card.

### Step-Level Comments

Any node execution step in the history panel has a "View Comments" button that opens a right-side sheet. Comments are cursor-paginated and posted directly from the sheet. Useful for incident post-mortems or handoff notes.

### Authentication

Email/password sign-up and sign-in powered by Better Auth with scrypt hashing. Sessions are enforced globally via an `AuthGuard`; the tRPC context exposes a typed `session` to every procedure. Public procedures explicitly opt out.

---

## Why BullMQ?

Workflow execution is the core operation of this application and it cannot run inside an HTTP request/response cycle for several reasons:

**Decoupled execution** — When a user triggers a workflow, the API enqueues a job and returns an `executionId` immediately. The actual node-by-node execution runs in a background worker (`ExecutionsProcessor`). The client then polls `executions.getProgress` for live status updates. This keeps API response times predictable regardless of how long a workflow takes.

**Crash recovery** — Jobs are enqueued with `removeOnFail: false`, meaning they survive Redis restarts and API crashes. On `onApplicationBootstrap`, the API scans for executions stuck in `RUNNING` state that have no active BullMQ job and automatically re-enqueues them. This prevents executions from being silently lost after a crash.

**Retry with checkpointing** — When a failed execution is retried, the processor re-processes nodes in topological order but skips any node already marked `SUCCESS` in the database. BullMQ's job model (a single retained job per failed execution) maps cleanly onto this pattern: the job carries the full execution graph and the database is the source of truth for progress.

**Backpressure and concurrency control** — BullMQ workers process one job at a time by default. This naturally limits concurrent workflow executions per API instance without any additional synchronisation code, preventing resource exhaustion when many users trigger workflows simultaneously.

**Observable job state** — BullMQ exposes job state (`active`, `waiting`, `delayed`, `failed`, `completed`) which the crash-recovery logic on startup uses to distinguish truly orphaned executions from ones that are legitimately queued.

In short, BullMQ provides the reliability guarantees needed for background work (persistence, retries, crash recovery) with a clean NestJS integration (`@nestjs/bullmq`) and minimal operational overhead on top of the Redis instance already required by Better Auth rate limiting.

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
| Canvas | React Flow (`@xyflow/react`) |
| Forms | react-hook-form + Zod |
| State | Zustand (dialog/execution state), `nuqs` (URL state) |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |

---

## Prerequisites

- **Node.js** ≥ 20 (dev mode only)
- **pnpm** ≥ 9 — `npm i -g pnpm` (dev mode only)
- **Docker** and **Docker Compose**

---

## Running the Application

There are two ways to run the stack locally:

| Mode | When to use |
|---|---|
| **Docker (full stack)** | Production-like testing — everything runs in containers, no Node/pnpm required |
| **Dev mode (`pnpm dev`)** | Active development — hot reload, fast iteration |

### Docker Compose Profiles

Two profiles are available. Pass `--profile <name>` to select which services start:

| Profile | Services started | Use when |
|---|---|---|
| `infra` | `db`, `redis` | Dev mode — spin up only the infrastructure, run the apps locally with `pnpm dev` |
| `full` | `db`, `redis`, `api`, `web` | Full containerised stack — no Node/pnpm required on the host |

```bash
# Infrastructure only (for dev mode)
docker compose --profile infra up -d

# Full stack (production-like)
docker compose --profile full up -d --build
```

---

## Option A — Full Docker Stack (production-like)

Runs the entire application (PostgreSQL, Redis, API, frontend) in containers using the production Dockerfiles.

### 1. Clone

```bash
git clone <repo-url>
cd spexs-challenge
```

### 2. Create environment files

**API** — create `apps/api/.env`:

```env
NODE_ENV=production
PORT=3001

# Credentials only — URLs are overridden by docker-compose automatically
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spexs

# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3001

FRONTEND_URL=http://localhost:3000

REDIS_HOST=localhost
REDIS_PORT=6379

# Email (optional)
SEND_EMAILS=false
MAILTRAP_API_KEY=
MAILTRAP_INBOX_ID=
FROM_EMAIL=hello@example.com
```

> The `DATABASE_URL`, `REDIS_HOST`, `BETTER_AUTH_URL`, and `FRONTEND_URL` values in `.env` are used for dev mode. Docker Compose automatically overrides them with the correct internal service hostnames (`db`, `redis`, `api`, `web`) — you do not need separate files.

**Frontend** — create `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Build and start all services

```bash
docker compose --profile full up -d --build
```

This builds and starts in dependency order:
1. `db` (PostgreSQL 17) — port `5432`
2. `redis` (Redis 7) — port `6379`
3. `api` (NestJS) — waits for `db` and `redis` to be healthy, port `3001`
4. `web` (Next.js) — waits for `api` to be healthy, port `3000`

### 4. Run migrations and seed

```bash
# Run migrations against the containerised DB
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spexs pnpm --filter @spexs/db db:migrate

# Seed demo data
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spexs pnpm --filter @spexs/db db:seed
```

Or exec into the api container:

```bash
docker compose exec api node -e "require('./dist/scripts/migrate')"
```

### 5. Open the app

- Frontend: http://localhost:3000
- API: http://localhost:3001

### Useful Docker commands

```bash
# View logs for all services
docker compose --profile full logs -f

# View logs for a single service
docker compose --profile full logs -f api

# Stop everything
docker compose --profile full down

# Stop and remove volumes (wipes the database)
docker compose --profile full down -v

# Rebuild a single service after code changes
docker compose --profile full up -d --build api
```

---

## Option B — Dev Mode (hot reload)

### 1. Clone and install

```bash
git clone <repo-url>
cd spexs-challenge
pnpm install
```

### 2. Start infrastructure only

```bash
docker compose --profile infra up -d
```

This starts only PostgreSQL and Redis (no app containers).

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

### 6. Start the development servers

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

---

## Demo Accounts

Both setup options create the same demo users via the seed script:

| Email | Password |
|---|---|
| alice@example.com | Sp3xs!Alice#2026$Demo |
| bob@example.com | Sp3xs!Bob#2026$Test |

The seed is **idempotent** — re-running it clears and recreates all domain data while reusing existing auth accounts.

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

## Testing

The API has a full unit test suite (**120 tests, 12 suites**) covering all service and executor logic. Tests use Jest with `ts-jest` and the NestJS testing module. All external dependencies (repositories, BullMQ queues, email service, notifications service) are replaced with typed Jest mocks — no database or Redis connection required to run tests.

### Running tests

```bash
# Run all tests once
pnpm --filter @spexs/api test

# Watch mode
pnpm --filter @spexs/api test:watch

# Coverage report (output to apps/api/coverage/)
pnpm --filter @spexs/api test:cov
```

### Test suite breakdown

| Suite | File | Tests | What is covered |
|---|---|---|---|
| `WorkflowsService` | `workflows/workflows.service.spec.ts` | 17 | CRUD, ownership checks (FORBIDDEN/NOT_FOUND), template seeding (3-node threshold, 1-node scratch), cycle detection on `addConnection` |
| `topologicalSortNodes` | `workflows/lib/topological-sort.spec.ts` | 8 | Linear chains, diamond DAGs, disconnected nodes, self-loops, cycle detection, empty input |
| `ExecutionsService` | `executions/executions.service.spec.ts` | 12 | `execute` happy path + 4 guard errors (already running, not found, inactive, no nodes), `retryExecution` (re-enqueue + error cases), `getProgress`, `onApplicationBootstrap` crash recovery (orphan re-enqueue + skip if job active) |
| `ExecutionsProcessor` | `executions/executions.processor.spec.ts` | 7 | Full threshold→message→email pipeline, trigger-not-fired skipping, idempotency (resume from checkpoint, skip downstream on existing OPEN event), node failure → FAILED status, missing nodeExecutionId mapping, manual trigger pipeline |
| `triggerThresholdExecutor` | `executions/lib/executors/trigger-threshold.executor.spec.ts` | 11 | All 5 operators (`gt`, `lt`, `gte`, `lte`, `eq`), boundary values, default-to-zero for missing/invalid triggerData, schema validation errors |
| `triggerVarianceExecutor` | `executions/lib/executors/trigger-variance.executor.spec.ts` | 9 | Above/below/at boundary deviations, negative deviation (drop), `actualDeviation`/`currentValue` exposure, default-to-zero, 100% deviation edge case, schema validation |
| `manualTriggerExecutor` | `executions/lib/executors/manual-trigger.executor.spec.ts` | 4 | Always-triggered, triggerData forwarding, non-record triggerData, missing triggerData |
| `outputMessageExecutor` | `executions/lib/executors/output-message.executor.spec.ts` | 7 | Handlebars interpolation, nested variables, missing variables (empty string), static text, template preserved in output, empty template throws |
| `recipientEmailExecutor` | `executions/lib/executors/recipient-email.executor.spec.ts` | 8 | Send + return context, multi-recipient, no emails configured (skip), missing emails field (skip), missing message throws, whitespace-only message throws, non-record message throws |
| `recipientInAppExecutor` | `executions/lib/executors/recipient-in-app.executor.spec.ts` | 5 | Notification creation, fallback message, `activeEventId` forwarding, no EmailService call, custom `workflowId` |
| `EventsService` | `events/events.service.spec.ts` | 15 | Paginated list + offset calculation, resolve (with/without comment, whitespace trim, not-found), snooze (timing, eventId forwarding, not-found), `reopenExpiredSnoozedEvents` cron (no-op, batch reopen, N+1 prevention), `getComments`, `addStepComment` delegation |
| `NotificationsService` | `notifications/notifications.service.spec.ts` | 9 | Create (with/without optional fields), paginated list + totalPages calculation, `isRead` filter passthrough, `countUnread`, `markRead` (not-found), `markAllRead` |

### Test patterns

- **Typed mock factories** — `buildMockRepository()` returns `{ [K in keyof Repository]: jest.Mock }`, ensuring mock shape stays in sync with the real type at compile time.
- **No `as` assertions** — context values are narrowed with explicit type guards in each test file.
- **No database required** — `@spexs/db` is mocked globally via `moduleNameMapper` in Jest config (`src/__mocks__/@spexs/db.ts`).
- **BullMQ queue** is injected as a plain object mock via the `BullQueue_executions` token — no Redis connection needed.

---

## Available Scripts

Run from the **monorepo root** unless otherwise noted.

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode (turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint with Biome |

Run from **`apps/api/`**:

| Command | Description |
|---|---|
| `pnpm test` | Run all unit tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:cov` | Run tests with coverage report |

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

### tRPC namespaces

| Namespace | Procedures |
|---|---|
| `workflows` | CRUD, node/connection management, toggleActive |
| `executions` | execute, retry, getProgress, getLastExecution, getDetails, getComments |
| `events` | list, resolve, snooze, getComments, addStepComment |
| `notifications` | list, unreadCount, markRead, markAllRead |

### Duplicate prevention

When a trigger condition is met the processor calls `findOpenAlertEvent` before creating a new event. This query matches both `OPEN` and `SNOOZED` statuses — so no duplicate is created during a snooze window.

### Execution status model

```
ExecutionStatus:     PENDING → RUNNING → SUCCESS | FAILED
NodeExecutionStatus: PENDING → RUNNING → SUCCESS | FAILED | SKIPPED
AlertEventStatus:    OPEN → SNOOZED ↔ OPEN → RESOLVED
```
