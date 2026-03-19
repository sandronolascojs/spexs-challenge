import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  alertEvents,
  executions,
  workflowNodes,
  workflows,
} from '@spexs/db';
import { AlertEventStatus, ExecutionStatus } from '@spexs/types';
import type {
  DashboardRecentEvent,
  DashboardRecentWorkflow,
} from '@spexs/types';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

const RECENT_ITEM_LIMIT = 5;

@Injectable()
export class DashboardRepository {
  constructor(private readonly database: DatabaseService) {}

  async countWorkflows(
    userId: string,
  ): Promise<{ total: number; active: number }> {
    const [totalResult, activeResult] = await Promise.all([
      this.database.db
        .select({ count: sql<number>`count(*)` })
        .from(workflows)
        .where(eq(workflows.createdBy, userId)),
      this.database.db
        .select({ count: sql<number>`count(*)` })
        .from(workflows)
        .where(
          and(eq(workflows.createdBy, userId), eq(workflows.isActive, true)),
        ),
    ]);

    return {
      total: Number(totalResult[0]?.count ?? 0),
      active: Number(activeResult[0]?.count ?? 0),
    };
  }

  async countEventsByStatus(): Promise<{
    total: number;
    open: number;
    snoozed: number;
    resolved: number;
  }> {
    const rows = await this.database.db
      .select({ status: alertEvents.status, count: sql<number>`count(*)` })
      .from(alertEvents)
      .groupBy(alertEvents.status);

    const countByStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));

    const open = countByStatus.get(AlertEventStatus.OPEN) ?? 0;
    const snoozed = countByStatus.get(AlertEventStatus.SNOOZED) ?? 0;
    const resolved = countByStatus.get(AlertEventStatus.RESOLVED) ?? 0;

    return { total: open + snoozed + resolved, open, snoozed, resolved };
  }

  async countExecutionsByStatus(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
  }> {
    const rows = await this.database.db
      .select({ status: executions.status, count: sql<number>`count(*)` })
      .from(executions)
      .groupBy(executions.status);

    const countByStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));

    const succeeded = countByStatus.get(ExecutionStatus.SUCCESS) ?? 0;
    const failed = countByStatus.get(ExecutionStatus.FAILED) ?? 0;
    const pending = countByStatus.get(ExecutionStatus.PENDING) ?? 0;
    const running = countByStatus.get(ExecutionStatus.RUNNING) ?? 0;

    return {
      total: succeeded + failed + pending + running,
      succeeded,
      failed,
    };
  }

  async findRecentWorkflows(
    userId: string,
  ): Promise<DashboardRecentWorkflow[]> {
    const recentWorkflows = await this.database.db
      .select()
      .from(workflows)
      .where(eq(workflows.createdBy, userId))
      .orderBy(desc(workflows.updatedAt))
      .limit(RECENT_ITEM_LIMIT);

    if (recentWorkflows.length === 0) return [];

    const workflowIds = recentWorkflows.map((w) => w.id);
    const nodeCounts = await this.database.db
      .select({
        workflowId: workflowNodes.workflowId,
        count: sql<number>`count(*)`,
      })
      .from(workflowNodes)
      .where(inArray(workflowNodes.workflowId, workflowIds))
      .groupBy(workflowNodes.workflowId);

    const nodeCountByWorkflowId = new Map(
      nodeCounts.map((r) => [r.workflowId, Number(r.count)]),
    );

    return recentWorkflows.map((w) => ({
      id: w.id,
      name: w.name,
      isActive: w.isActive,
      nodeCount: nodeCountByWorkflowId.get(w.id) ?? 0,
      updatedAt: w.updatedAt,
    }));
  }

  async findRecentEvents(): Promise<DashboardRecentEvent[]> {
    const recentEvents = await this.database.db
      .select({
        id: alertEvents.id,
        workflowId: alertEvents.workflowId,
        status: alertEvents.status,
        createdAt: alertEvents.createdAt,
      })
      .from(alertEvents)
      .orderBy(desc(alertEvents.createdAt))
      .limit(RECENT_ITEM_LIMIT);

    if (recentEvents.length === 0) return [];

    const workflowIds = [...new Set(recentEvents.map((e) => e.workflowId))];
    const workflowRows = await this.database.db
      .select({ id: workflows.id, name: workflows.name })
      .from(workflows)
      .where(inArray(workflows.id, workflowIds));

    const workflowNameById = new Map(workflowRows.map((w) => [w.id, w.name]));

    return recentEvents.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      workflowName: workflowNameById.get(e.workflowId) ?? 'Unknown',
      status: e.status as AlertEventStatus,
      createdAt: e.createdAt,
    }));
  }
}
