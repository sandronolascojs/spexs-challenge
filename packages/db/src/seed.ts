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
 *  - All domain data is inserted directly via Drizzle for full control over
 *    IDs, timestamps and state.
 *  - The script is idempotent: domain data is cleared on every run. Auth rows
 *    (users/accounts/sessions) are reused if the email already exists.
 */

import 'dotenv/config';
import { createId } from '@paralleldrive/cuid2';
import {
  AlertEventStatus,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeType,
} from '@spexs/types';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import {
  alertEvents,
  eventComments,
  executions,
  nodeExecutionComments,
  nodeExecutions,
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

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
  emailAndPassword: { enabled: true },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Layout constants ──────────────────────────────────────────────────────────
// Node card dimensions (approximate): 280px wide × 160px tall.
// COL_GAP: 420px per column  (280 card + 140 breathing room).
// ROW_GAP: 220px per fan-out row (160 card + 60 breathing room).

const COL_GAP = 420;
const ROW_GAP = 220;
const START_X = 100;
const CENTER_Y = 260;

/** Single-row node at column n, vertically centered. */
const COL = (n: number) => ({ x: START_X + n * COL_GAP, y: CENTER_Y });

/**
 * Fan-out node at column n, row r (0 = top branch, 1 = bottom branch).
 * Rows are symmetric around CENTER_Y so the connector from the source
 * node splits cleanly between the two targets.
 */
const ROW = (col: number, row: number) => ({
  x: START_X + col * COL_GAP,
  y: CENTER_Y - ROW_GAP / 2 + row * ROW_GAP,
});

// ── Timestamp helpers ─────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MS_PER_DAY);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * MS_PER_HOUR);
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * MS_PER_MINUTE);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * MS_PER_MINUTE);
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

// ── Clear domain data ─────────────────────────────────────────────────────────

async function clearDomainData(): Promise<void> {
  await db.delete(nodeExecutionComments);
  await db.delete(notifications);
  await db.delete(eventComments);
  await db.delete(alertEvents);
  await db.delete(nodeExecutions);
  await db.delete(executions);
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

  // ── 2. Clear domain data ──────────────────────────────────────────────────
  console.log('\nClearing domain data…');
  await clearDomainData();

  // ── 3. Workflows ──────────────────────────────────────────────────────────
  console.log('\nCreating workflows…');

  const wfThresholdId = createId();
  const wfVarianceId = createId();
  const wfInactiveId = createId();

  await db.insert(workflows).values([
    {
      id: wfThresholdId,
      name: 'CPU High Alert',
      isActive: true,
      createdBy: aliceId,
    },
    {
      id: wfVarianceId,
      name: 'Revenue Variance Alert',
      isActive: true,
      createdBy: aliceId,
    },
    {
      id: wfInactiveId,
      name: 'Disk Space Monitor',
      isActive: false,
      createdBy: bobId,
    },
  ]);

  console.log(`  ✓ "CPU High Alert"          (${wfThresholdId})`);
  console.log(`  ✓ "Revenue Variance Alert"  (${wfVarianceId})`);
  console.log(`  ✓ "Disk Space Monitor"      (${wfInactiveId})`);

  // ── 4. Nodes ──────────────────────────────────────────────────────────────
  console.log('\nCreating nodes and connections…');

  // ── Workflow A: CPU High Alert ────────────────────────────────────────────
  // Layout: trigger → message → [email, in-app] (fan-out)
  //
  //  [Trigger]  →  [Message]  →  [Email]
  //                           ↘  [In-App]

  const wfA_triggerId = createId();
  const wfA_messageId = createId();
  const wfA_emailId = createId();
  const wfA_inAppId = createId();

  await db.insert(workflowNodes).values([
    {
      id: wfA_triggerId,
      workflowId: wfThresholdId,
      type: NodeType.TRIGGER_THRESHOLD,
      name: 'CPU Threshold',
      data: { metricName: 'cpu_usage', operator: 'gt', threshold: 80 },
      position: COL(0),
    },
    {
      id: wfA_messageId,
      workflowId: wfThresholdId,
      type: NodeType.OUTPUT_MESSAGE,
      name: 'Alert Message',
      data: {
        template:
          'CPU usage is at {{trigger.value}}%, exceeding the threshold of {{trigger.threshold}}%.',
      },
      position: COL(1),
    },
    {
      id: wfA_emailId,
      workflowId: wfThresholdId,
      type: NodeType.RECIPIENT_EMAIL,
      name: 'Email Ops Team',
      data: { emails: ['ops@example.com'] },
      position: ROW(2, 0),
    },
    {
      id: wfA_inAppId,
      workflowId: wfThresholdId,
      type: NodeType.RECIPIENT_IN_APP,
      name: 'In-App Notification',
      data: {},
      position: ROW(2, 1),
    },
  ]);

  await db.insert(workflowConnections).values([
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: wfA_triggerId,
      toNodeId: wfA_messageId,
    },
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: wfA_messageId,
      toNodeId: wfA_emailId,
    },
    {
      id: createId(),
      workflowId: wfThresholdId,
      fromNodeId: wfA_messageId,
      toNodeId: wfA_inAppId,
    },
  ]);

  // ── Workflow B: Revenue Variance Alert ────────────────────────────────────
  // Layout: trigger → message → email (linear)
  //
  //  [Trigger]  →  [Message]  →  [Email]

  const wfB_triggerId = createId();
  const wfB_messageId = createId();
  const wfB_emailId = createId();

  await db.insert(workflowNodes).values([
    {
      id: wfB_triggerId,
      workflowId: wfVarianceId,
      type: NodeType.TRIGGER_VARIANCE,
      name: 'Revenue Variance',
      data: {
        metricName: 'revenue',
        baseValue: 10000,
        deviationPercentage: 20,
      },
      position: COL(0),
    },
    {
      id: wfB_messageId,
      workflowId: wfVarianceId,
      type: NodeType.OUTPUT_MESSAGE,
      name: 'Variance Message',
      data: {
        template:
          'Revenue deviated by {{trigger.deviationPercentage}}% from baseline ${{trigger.baseValue}}. Current: ${{trigger.value}}.',
      },
      position: COL(1),
    },
    {
      id: wfB_emailId,
      workflowId: wfVarianceId,
      type: NodeType.RECIPIENT_EMAIL,
      name: 'Email Finance Team',
      data: { emails: ['finance@example.com'] },
      position: COL(2),
    },
  ]);

  await db.insert(workflowConnections).values([
    {
      id: createId(),
      workflowId: wfVarianceId,
      fromNodeId: wfB_triggerId,
      toNodeId: wfB_messageId,
    },
    {
      id: createId(),
      workflowId: wfVarianceId,
      fromNodeId: wfB_messageId,
      toNodeId: wfB_emailId,
    },
  ]);

  // ── Workflow C: Disk Space Monitor (inactive, single trigger) ─────────────

  await db.insert(workflowNodes).values({
    id: createId(),
    workflowId: wfInactiveId,
    type: NodeType.TRIGGER_THRESHOLD,
    name: 'Disk Space Trigger',
    data: { metricName: 'disk_free_gb', operator: 'lt', threshold: 10 },
    position: COL(0),
  });

  console.log('  ✓ All nodes and connections created');

  // ── 5. Executions + Node Executions + Alert Events ────────────────────────
  console.log('\nCreating executions and alert events…');

  // ── Execution 1: CPU spike 2 days ago — RESOLVED ──────────────────────────
  // All nodes succeeded. Event resolved next day with comment.

  const exec1StartedAt = daysAgo(2);
  const exec1Id = createId();
  const event1Id = createId();

  await db.insert(executions).values({
    id: exec1Id,
    workflowId: wfThresholdId,
    status: ExecutionStatus.SUCCESS,
    triggeredBy: aliceId,
    triggerData: { metricValue: 92 },
    startedAt: exec1StartedAt,
    completedAt: addSeconds(exec1StartedAt, 3),
  });

  const exec1_ne_trigger = createId();
  const exec1_ne_message = createId();
  const exec1_ne_email = createId();
  const exec1_ne_inapp = createId();

  await db.insert(nodeExecutions).values([
    {
      id: exec1_ne_trigger,
      executionId: exec1Id,
      nodeId: wfA_triggerId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: { metricValue: 92 },
      outputData: {
        trigger: {
          metricName: 'cpu_usage',
          value: 92,
          threshold: 80,
          triggered: true,
        },
      },
      startedAt: exec1StartedAt,
      completedAt: addSeconds(exec1StartedAt, 1),
    },
    {
      id: exec1_ne_message,
      executionId: exec1Id,
      nodeId: wfA_messageId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        trigger: { metricName: 'cpu_usage', value: 92, threshold: 80 },
      },
      outputData: {
        message: {
          text: 'CPU usage is at 92%, exceeding the threshold of 80%.',
        },
      },
      startedAt: addSeconds(exec1StartedAt, 1),
      completedAt: addSeconds(exec1StartedAt, 1),
    },
    {
      id: exec1_ne_email,
      executionId: exec1Id,
      nodeId: wfA_emailId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'CPU usage is at 92%, exceeding the threshold of 80%.',
        },
      },
      outputData: { email: { sent: true, recipients: ['ops@example.com'] } },
      startedAt: addSeconds(exec1StartedAt, 1),
      completedAt: addSeconds(exec1StartedAt, 2),
    },
    {
      id: exec1_ne_inapp,
      executionId: exec1Id,
      nodeId: wfA_inAppId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'CPU usage is at 92%, exceeding the threshold of 80%.',
        },
      },
      outputData: { notification: { sent: true, channel: 'in_app' } },
      startedAt: addSeconds(exec1StartedAt, 2),
      completedAt: addSeconds(exec1StartedAt, 3),
    },
  ]);

  await db.insert(alertEvents).values({
    id: event1Id,
    workflowId: wfThresholdId,
    executionId: exec1Id,
    status: AlertEventStatus.RESOLVED,
    triggerData: { metricValue: 92, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: exec1StartedAt,
    resolvedAt: daysAgo(1),
  });

  // ── Execution 2: CPU spike 3 hours ago — OPEN (duplicate blocked) ─────────
  // Trigger fired again while event 1 was still open — downstream nodes
  // were skipped (idempotency). A second open event was created because
  // event 1 was already resolved by the time this runs in a real session.
  // Here we seed it as a fresh OPEN event for demo purposes.

  const exec2StartedAt = hoursAgo(3);
  const exec2Id = createId();
  const event2Id = createId();

  await db.insert(executions).values({
    id: exec2Id,
    workflowId: wfThresholdId,
    status: ExecutionStatus.SUCCESS,
    triggeredBy: aliceId,
    triggerData: { metricValue: 88 },
    startedAt: exec2StartedAt,
    completedAt: addSeconds(exec2StartedAt, 2),
  });

  await db.insert(nodeExecutions).values([
    {
      id: createId(),
      executionId: exec2Id,
      nodeId: wfA_triggerId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: { metricValue: 88 },
      outputData: {
        trigger: {
          metricName: 'cpu_usage',
          value: 88,
          threshold: 80,
          triggered: true,
        },
      },
      startedAt: exec2StartedAt,
      completedAt: addSeconds(exec2StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec2Id,
      nodeId: wfA_messageId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        trigger: { metricName: 'cpu_usage', value: 88, threshold: 80 },
      },
      outputData: {
        message: {
          text: 'CPU usage is at 88%, exceeding the threshold of 80%.',
        },
      },
      startedAt: addSeconds(exec2StartedAt, 1),
      completedAt: addSeconds(exec2StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec2Id,
      nodeId: wfA_emailId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'CPU usage is at 88%, exceeding the threshold of 80%.',
        },
      },
      outputData: { email: { sent: true, recipients: ['ops@example.com'] } },
      startedAt: addSeconds(exec2StartedAt, 1),
      completedAt: addSeconds(exec2StartedAt, 2),
    },
    {
      id: createId(),
      executionId: exec2Id,
      nodeId: wfA_inAppId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'CPU usage is at 88%, exceeding the threshold of 80%.',
        },
      },
      outputData: { notification: { sent: true, channel: 'in_app' } },
      startedAt: addSeconds(exec2StartedAt, 1),
      completedAt: addSeconds(exec2StartedAt, 2),
    },
  ]);

  await db.insert(alertEvents).values({
    id: event2Id,
    workflowId: wfThresholdId,
    executionId: exec2Id,
    status: AlertEventStatus.OPEN,
    triggerData: { metricValue: 88, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: exec2StartedAt,
  });

  // ── Execution 3: Revenue variance 1 hour ago — SNOOZED ───────────────────
  // Email step failed (SMTP timeout). Event is open and snoozed for 2 hours.

  const exec3StartedAt = hoursAgo(1);
  const exec3Id = createId();
  const event3Id = createId();
  const exec3_ne_email = createId();

  await db.insert(executions).values({
    id: exec3Id,
    workflowId: wfVarianceId,
    status: ExecutionStatus.FAILED,
    triggeredBy: aliceId,
    triggerData: { metricValue: 7500 },
    error: 'RECIPIENT_EMAIL: SMTP connection timeout after 30s',
    startedAt: exec3StartedAt,
    completedAt: addSeconds(exec3StartedAt, 35),
  });

  await db.insert(nodeExecutions).values([
    {
      id: createId(),
      executionId: exec3Id,
      nodeId: wfB_triggerId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: { metricValue: 7500 },
      outputData: {
        trigger: {
          metricName: 'revenue',
          value: 7500,
          baseValue: 10000,
          deviationPercentage: 20,
          actualDeviation: 2500,
          triggered: true,
        },
      },
      startedAt: exec3StartedAt,
      completedAt: addSeconds(exec3StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec3Id,
      nodeId: wfB_messageId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        trigger: { metricName: 'revenue', value: 7500, baseValue: 10000 },
      },
      outputData: {
        message: {
          text: 'Revenue deviated by 20% from baseline $10000. Current: $7500.',
        },
      },
      startedAt: addSeconds(exec3StartedAt, 1),
      completedAt: addSeconds(exec3StartedAt, 1),
    },
    {
      id: exec3_ne_email,
      executionId: exec3Id,
      nodeId: wfB_emailId,
      status: NodeExecutionStatus.FAILED,
      inputData: {
        message: {
          text: 'Revenue deviated by 20% from baseline $10000. Current: $7500.',
        },
      },
      error: 'SMTP connection timeout after 30s',
      startedAt: addSeconds(exec3StartedAt, 2),
      completedAt: addSeconds(exec3StartedAt, 35),
    },
  ]);

  await db.insert(alertEvents).values({
    id: event3Id,
    workflowId: wfVarianceId,
    executionId: exec3Id,
    status: AlertEventStatus.SNOOZED,
    triggerData: { metricValue: 7500, evaluatedThreshold: 10000 },
    stepLogs: [],
    createdAt: exec3StartedAt,
    snoozedUntil: minutesFromNow(120),
  });

  // ── Execution 4: Revenue variance 5 days ago — RESOLVED ──────────────────
  // All steps succeeded. Event resolved next day with two comments.

  const exec4StartedAt = daysAgo(5);
  const exec4Id = createId();
  const event4Id = createId();

  await db.insert(executions).values({
    id: exec4Id,
    workflowId: wfVarianceId,
    status: ExecutionStatus.SUCCESS,
    triggeredBy: aliceId,
    triggerData: { metricValue: 6000 },
    startedAt: exec4StartedAt,
    completedAt: addSeconds(exec4StartedAt, 3),
  });

  await db.insert(nodeExecutions).values([
    {
      id: createId(),
      executionId: exec4Id,
      nodeId: wfB_triggerId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: { metricValue: 6000 },
      outputData: {
        trigger: {
          metricName: 'revenue',
          value: 6000,
          baseValue: 10000,
          deviationPercentage: 20,
          actualDeviation: 4000,
          triggered: true,
        },
      },
      startedAt: exec4StartedAt,
      completedAt: addSeconds(exec4StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec4Id,
      nodeId: wfB_messageId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        trigger: { metricName: 'revenue', value: 6000, baseValue: 10000 },
      },
      outputData: {
        message: {
          text: 'Revenue deviated by 20% from baseline $10000. Current: $6000.',
        },
      },
      startedAt: addSeconds(exec4StartedAt, 1),
      completedAt: addSeconds(exec4StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec4Id,
      nodeId: wfB_emailId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'Revenue deviated by 20% from baseline $10000. Current: $6000.',
        },
      },
      outputData: {
        email: { sent: true, recipients: ['finance@example.com'] },
      },
      startedAt: addSeconds(exec4StartedAt, 1),
      completedAt: addSeconds(exec4StartedAt, 3),
    },
  ]);

  await db.insert(alertEvents).values({
    id: event4Id,
    workflowId: wfVarianceId,
    executionId: exec4Id,
    status: AlertEventStatus.RESOLVED,
    triggerData: { metricValue: 6000, evaluatedThreshold: 10000 },
    stepLogs: [],
    createdAt: exec4StartedAt,
    resolvedAt: daysAgo(4),
  });

  // ── Execution 5: CPU spike 30 min ago — OPEN ──────────────────────────────
  // In-app step failed. Event is open awaiting resolution.

  const exec5StartedAt = minutesAgo(30);
  const exec5Id = createId();
  const event5Id = createId();
  const exec5_ne_inapp = createId();

  await db.insert(executions).values({
    id: exec5Id,
    workflowId: wfThresholdId,
    status: ExecutionStatus.FAILED,
    triggeredBy: aliceId,
    triggerData: { metricValue: 95 },
    error: 'RECIPIENT_IN_APP: Database write failed',
    startedAt: exec5StartedAt,
    completedAt: addSeconds(exec5StartedAt, 4),
  });

  await db.insert(nodeExecutions).values([
    {
      id: createId(),
      executionId: exec5Id,
      nodeId: wfA_triggerId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: { metricValue: 95 },
      outputData: {
        trigger: {
          metricName: 'cpu_usage',
          value: 95,
          threshold: 80,
          triggered: true,
        },
      },
      startedAt: exec5StartedAt,
      completedAt: addSeconds(exec5StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec5Id,
      nodeId: wfA_messageId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        trigger: { metricName: 'cpu_usage', value: 95, threshold: 80 },
      },
      outputData: {
        message: {
          text: 'CPU usage is at 95%, exceeding the threshold of 80%.',
        },
      },
      startedAt: addSeconds(exec5StartedAt, 1),
      completedAt: addSeconds(exec5StartedAt, 1),
    },
    {
      id: createId(),
      executionId: exec5Id,
      nodeId: wfA_emailId,
      status: NodeExecutionStatus.SUCCESS,
      inputData: {
        message: {
          text: 'CPU usage is at 95%, exceeding the threshold of 80%.',
        },
      },
      outputData: { email: { sent: true, recipients: ['ops@example.com'] } },
      startedAt: addSeconds(exec5StartedAt, 1),
      completedAt: addSeconds(exec5StartedAt, 2),
    },
    {
      id: exec5_ne_inapp,
      executionId: exec5Id,
      nodeId: wfA_inAppId,
      status: NodeExecutionStatus.FAILED,
      inputData: {
        message: {
          text: 'CPU usage is at 95%, exceeding the threshold of 80%.',
        },
      },
      error: 'Database write failed: connection pool exhausted',
      startedAt: addSeconds(exec5StartedAt, 2),
      completedAt: addSeconds(exec5StartedAt, 4),
    },
  ]);

  await db.insert(alertEvents).values({
    id: event5Id,
    workflowId: wfThresholdId,
    executionId: exec5Id,
    status: AlertEventStatus.OPEN,
    triggerData: { metricValue: 95, evaluatedThreshold: 80 },
    stepLogs: [],
    createdAt: exec5StartedAt,
  });

  console.log(
    '  ✓ 5 executions and 5 alert events (2 open, 1 snoozed, 2 resolved)',
  );

  // ── 6. Step comments (node_execution_comments) ────────────────────────────
  console.log('\nCreating step comments…');

  await db.insert(nodeExecutionComments).values([
    // Comment on the failed email step in exec 3 (variance, SMTP timeout)
    {
      id: createId(),
      nodeExecutionId: exec3_ne_email,
      userId: aliceId,
      content:
        'SMTP relay was down during our maintenance window. Will retry once the window closes.',
      createdAt: addSeconds(exec3StartedAt, 40),
    },
    {
      id: createId(),
      nodeExecutionId: exec3_ne_email,
      userId: bobId,
      content:
        'Confirmed — relay is back up. Safe to retry or snooze until tomorrow.',
      createdAt: hoursAgo(0.5),
    },
    // Comment on the failed in-app step in exec 5 (CPU spike)
    {
      id: createId(),
      nodeExecutionId: exec5_ne_inapp,
      userId: aliceId,
      content:
        'Connection pool exhausted due to a spike in background jobs. Pool size increased to 50. Retry should succeed.',
      createdAt: minutesAgo(20),
    },
  ]);

  console.log('  ✓ 3 step comments added');

  // ── 7. Event comments (resolution notes) ─────────────────────────────────
  console.log('\nCreating event resolution comments…');

  await db.insert(eventComments).values([
    // Resolved CPU spike (event 1)
    {
      id: createId(),
      eventId: event1Id,
      userId: aliceId,
      content:
        'CPU spike was caused by the nightly analytics batch job. Rescheduled it to 03:00 UTC to avoid peak hours.',
      createdAt: daysAgo(1),
    },
    // Resolved revenue variance (event 4) — two comments
    {
      id: createId(),
      eventId: event4Id,
      userId: aliceId,
      content:
        'Revenue drop on a public holiday — expected seasonal dip. No action required.',
      createdAt: daysAgo(4),
    },
    {
      id: createId(),
      eventId: event4Id,
      userId: bobId,
      content: 'Confirmed with Finance. They were already aware. Closing.',
      createdAt: addSeconds(daysAgo(4), 600),
    },
  ]);

  console.log('  ✓ 3 event resolution comments added');

  // ── 8. In-App Notifications ───────────────────────────────────────────────
  console.log('\nCreating notifications…');

  await db.insert(notifications).values([
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event2Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 88%, exceeding the threshold of 80%.',
      isRead: false,
      createdAt: hoursAgo(3),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfVarianceId,
      eventId: event3Id,
      title: 'Alert triggered',
      message:
        'Revenue deviated by 20% from baseline $10,000. Current: $7,500.',
      isRead: false,
      createdAt: hoursAgo(1),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event1Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 92%, exceeding the threshold of 80%.',
      isRead: true,
      createdAt: daysAgo(2),
    },
    {
      id: createId(),
      userId: aliceId,
      workflowId: wfThresholdId,
      eventId: event5Id,
      title: 'Alert triggered',
      message: 'CPU usage is at 95%, exceeding the threshold of 80%.',
      isRead: false,
      createdAt: minutesAgo(30),
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
