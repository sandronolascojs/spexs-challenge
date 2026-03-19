/**
 * Seed script — populates the database with realistic demo data.
 *
 * Usage:
 *   pnpm --filter @spexs/db db:seed
 *
 * Requires DATABASE_URL in packages/db/.env (same file used by drizzle-kit).
 *
 * Strategy:
 *  - Users are created via `auth.api.signUpEmail` so Better Auth handles
 *    password hashing and the accounts table atomically.
 *  - All domain data (workflows, events, comments, notifications) is inserted
 *    directly via Drizzle for full control over IDs, timestamps and state.
 *  - The script is idempotent: it clears all domain data on every run so
 *    re-running is safe. Auth rows (users/accounts/sessions) are only
 *    inserted if the email doesn't already exist.
 */

import 'dotenv/config';
import { createId } from '@paralleldrive/cuid2';
import { AlertEventStatus, NodeType } from '@spexs/types';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import {
  alertEvents,
  eventComments,
  notifications,
  users,
  workflowConnections,
  workflowNodes,
  workflows,
} from './schema';

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Create packages/db/.env');
}

const sql = postgres(databaseUrl);
const db = drizzle(sql, { schema });

/**
 * Minimal Better Auth instance used only to create users.
 * We omit rate-limiting, HaveIBeenPwned, and audit hooks — those are
 * runtime concerns that don't belong in a seed script.
 */
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
  emailAndPassword: { enabled: true },
  // Better Auth uses nanoid by default — produces a text string compatible
  // with our text PK. We do NOT set generateId:false because our users.id
  // column has no SQL DEFAULT; the CUID2 defaultFn only runs through Drizzle.
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a user via Better Auth's signUpEmail handler.
 * If the email already exists Better Auth throws — we catch and look up the
 * existing user id directly via Drizzle so the rest of the seed can continue.
 */
async function resolveUserId(params: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: params.name,
        email: params.email,
        password: params.password,
      },
    });
    console.log(`  ✓ ${params.email}  (${result.user.id})`);
    return result.user.id;
  } catch {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, params.email))
      .limit(1);

    if (!existing) {
      throw new Error(`Failed to create or find user for ${params.email}`);
    }

    console.log(`  ↩ ${params.email} already exists (${existing.id})`);
    return existing.id;
  }
}

function daysAgo(days: number): Date {
  const MS_PER_DAY = 86_400_000;
  return new Date(Date.now() - days * MS_PER_DAY);
}

function hoursAgo(hours: number): Date {
  const MS_PER_HOUR = 3_600_000;
  return new Date(Date.now() - hours * MS_PER_HOUR);
}

function minutesFromNow(minutes: number): Date {
  const MS_PER_MINUTE = 60_000;
  return new Date(Date.now() + minutes * MS_PER_MINUTE);
}

// ── Clear domain data ─────────────────────────────────────────────────────────

async function clearDomainData(): Promise<void> {
  // Delete in FK-safe order (children before parents)
  await db.delete(notifications);
  await db.delete(eventComments);
  await db.delete(alertEvents);
  await db.delete(workflowConnections);
  await db.delete(workflowNodes);
  await db.delete(workflows);
  console.log('  ✓ Cleared existing domain data');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('\n🌱  Starting seed…\n');

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('Creating users…');

  const aliceId = await resolveUserId({
    name: 'Alice Demo',
    email: 'alice@example.com',
    password: 'Sp3xs!Alice#2026$Demo',
  });

  const bobId = await resolveUserId({
    name: 'Bob Tester',
    email: 'bob@example.com',
    password: 'Sp3xs!Bob#2026$Test',
  });

  // ── 2. Clear domain data (idempotent) ─────────────────────────────────────
  console.log('\nClearing domain data…');
  await clearDomainData();

  // ── 3. Workflows ──────────────────────────────────────────────────────────
  console.log('\nCreating workflows…');

  // Workflow A — Threshold: CPU > 80%
  const wfThresholdId = createId();
  await db.insert(workflows).values({
    id: wfThresholdId,
    name: 'CPU High Alert',
    isActive: true,
    createdBy: aliceId,
  });

  // Workflow B — Variance: Revenue deviation > 20%
  const wfVarianceId = createId();
  await db.insert(workflows).values({
    id: wfVarianceId,
    name: 'Revenue Variance Alert',
    isActive: true,
    createdBy: aliceId,
  });

  // Workflow C — Inactive threshold (owned by Bob)
  const wfInactiveId = createId();
  await db.insert(workflows).values({
    id: wfInactiveId,
    name: 'Disk Space Monitor (paused)',
    isActive: false,
    createdBy: bobId,
  });

  console.log(`  ✓ "CPU High Alert"              (${wfThresholdId})`);
  console.log(`  ✓ "Revenue Variance Alert"      (${wfVarianceId})`);
  console.log(`  ✓ "Disk Space Monitor (paused)" (${wfInactiveId})`);

  // ── 4. Nodes ──────────────────────────────────────────────────────────────
  console.log('\nCreating nodes and connections…');

  // — Workflow A nodes —
  const triggerAId = createId();
  const messageAId = createId();
  const emailAId = createId();
  const inAppAId = createId();

  await db.insert(workflowNodes).values([
    {
      id: triggerAId,
      workflowId: wfThresholdId,
      type: NodeType.TRIGGER_THRESHOLD,
      name: 'CPU Threshold Trigger',
      data: { metricName: 'cpu_usage', operator: 'gt', threshold: 80 },
      position: { x: 100, y: 150 },
    },
    {
      id: messageAId,
      workflowId: wfThresholdId,
      type: NodeType.OUTPUT_MESSAGE,
      name: 'Alert Message',
      data: {
        template:
          'CPU usage is at {{cpu_usage}}%, which exceeds the threshold of 80%.',
      },
      position: { x: 400, y: 150 },
    },
    {
      id: emailAId,
      workflowId: wfThresholdId,
      type: NodeType.RECIPIENT_EMAIL,
      name: 'Email Ops Team',
      data: { recipients: ['ops@example.com', 'alice@example.com'] },
      position: { x: 700, y: 80 },
    },
    {
      id: inAppAId,
      workflowId: wfThresholdId,
      type: NodeType.RECIPIENT_IN_APP,
      name: 'In-App Notification',
      data: {},
      position: { x: 700, y: 240 },
    },
  ]);

  await db.insert(workflowConnections).values([
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: triggerAId,
      toNodeId: messageAId,
    },
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: messageAId,
      toNodeId: emailAId,
    },
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: messageAId,
      toNodeId: inAppAId,
    },
  ]);

  // — Workflow B nodes —
  const triggerBId = createId();
  const messageBId = createId();
  const emailBId = createId();

  await db.insert(workflowNodes).values([
    {
      id: triggerBId,
      workflowId: wfVarianceId,
      type: NodeType.TRIGGER_VARIANCE,
      name: 'Revenue Variance Trigger',
      data: { baseValue: 10000, deviationPercent: 20 },
      position: { x: 100, y: 150 },
    },
    {
      id: messageBId,
      workflowId: wfVarianceId,
      type: NodeType.OUTPUT_MESSAGE,
      name: 'Variance Message',
      data: {
        template:
          'Revenue deviated by {{trigger.deviationPercentage}}% from the base of ${{trigger.baseValue}}. Current: ${{trigger.value}}.',
      },
      position: { x: 400, y: 150 },
    },
    {
      id: emailBId,
      workflowId: wfVarianceId,
      type: NodeType.RECIPIENT_EMAIL,
      name: 'Email Finance Team',
      data: { recipients: ['finance@example.com'] },
      position: { x: 700, y: 150 },
    },
  ]);

  await db.insert(workflowConnections).values([
    {
      id: createId(),
      workflowId: wfVarianceId,
      fromNodeId: triggerBId,
      toNodeId: messageBId,
    },
    {
      id: createId(),
      workflowId: wfVarianceId,
      fromNodeId: messageBId,
      toNodeId: emailBId,
    },
  ]);

  // — Workflow C — single trigger node only —
  await db.insert(workflowNodes).values({
    id: createId(),
    workflowId: wfInactiveId,
    type: NodeType.TRIGGER_THRESHOLD,
    name: 'Disk Space Trigger',
    data: { metricName: 'disk_free_gb', operator: 'lt', threshold: 10 },
    position: { x: 100, y: 150 },
  });

  console.log('  ✓ All nodes and connections created');

  // ── 5. Alert Events ───────────────────────────────────────────────────────
  console.log('\nCreating alert events…');

  // Event 1 — RESOLVED (2 days ago, resolved 1 day ago)
  const event1Id = createId();
  await db.insert(alertEvents).values({
    id: event1Id,
    workflowId: wfThresholdId,
    status: AlertEventStatus.RESOLVED,
    triggerData: { metricValue: 92, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: daysAgo(2),
    resolvedAt: daysAgo(1),
  });

  // Event 2 — OPEN (3 hours ago)
  const event2Id = createId();
  await db.insert(alertEvents).values({
    id: event2Id,
    workflowId: wfThresholdId,
    status: AlertEventStatus.OPEN,
    triggerData: { metricValue: 88, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: hoursAgo(3),
  });

  // Event 3 — SNOOZED (1 hour ago, snoozed for 2 more hours)
  const event3Id = createId();
  await db.insert(alertEvents).values({
    id: event3Id,
    workflowId: wfVarianceId,
    status: AlertEventStatus.SNOOZED,
    triggerData: { metricValue: 7500, evaluatedThreshold: 10000 },
    stepLogs: [],
    createdAt: hoursAgo(1),
    snoozedUntil: minutesFromNow(120),
  });

  // Event 4 — RESOLVED with comments (5 days ago)
  const event4Id = createId();
  await db.insert(alertEvents).values({
    id: event4Id,
    workflowId: wfVarianceId,
    status: AlertEventStatus.RESOLVED,
    triggerData: { metricValue: 6000, evaluatedThreshold: 10000 },
    stepLogs: [],
    createdAt: daysAgo(5),
    resolvedAt: daysAgo(4),
  });

  // Event 5 — OPEN (30 min ago, threshold workflow — second concurrent open)
  const event5Id = createId();
  await db.insert(alertEvents).values({
    id: event5Id,
    workflowId: wfThresholdId,
    status: AlertEventStatus.OPEN,
    triggerData: { metricValue: 95, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: hoursAgo(0.5),
  });

  console.log('  ✓ 5 events: 2 open, 1 snoozed, 2 resolved');

  // ── 6. Event Comments ─────────────────────────────────────────────────────
  console.log('\nCreating resolution comments…');

  await db.insert(eventComments).values([
    {
      id: createId(),
      eventId: event1Id,
      userId: aliceId,
      content:
        'CPU spike caused by a batch job. Adjusted cron schedule to off-peak hours.',
      createdAt: daysAgo(1),
    },
    {
      id: createId(),
      eventId: event4Id,
      userId: aliceId,
      content:
        'Revenue drop was due to a public holiday. Expected and within acceptable range.',
      createdAt: daysAgo(4),
    },
    {
      id: createId(),
      eventId: event4Id,
      userId: bobId,
      content: 'Confirmed with Finance team — no action required.',
      createdAt: daysAgo(4),
    },
  ]);

  console.log('  ✓ 3 resolution comments added');

  // ── 7. In-App Notifications ───────────────────────────────────────────────
  console.log('\nCreating notifications…');

  await db.insert(notifications).values([
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event2Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 88%, which exceeds the threshold of 80%.',
      isRead: false,
      createdAt: hoursAgo(3),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfVarianceId,
      eventId: event3Id,
      title: 'Alert triggered',
      message: 'Revenue deviated 25% from base of $10,000. Current: $7,500.',
      isRead: false,
      createdAt: hoursAgo(1),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event1Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 92%, which exceeds the threshold of 80%.',
      isRead: true,
      createdAt: daysAgo(2),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event5Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 95%, which exceeds the threshold of 80%.',
      isRead: false,
      createdAt: hoursAgo(0.5),
    },
  ]);

  console.log('  ✓ 4 notifications (3 unread, 1 read)');

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  alice@example.com  /  Sp3xs!Alice#2026$Demo');
  console.log('  bob@example.com    /  Sp3xs!Bob#2026$Test\n');

  await sql.end();
}

seed().catch((err: unknown) => {
  console.error('\n❌  Seed failed:', err);
  void sql.end();
  process.exit(1);
});
