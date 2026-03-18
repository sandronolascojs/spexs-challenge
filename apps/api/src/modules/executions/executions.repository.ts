import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type NewAlertEvent,
  type NewExecution,
  type NewNodeExecution,
  alertEvents,
  executions,
  nodeExecutions,
  workflowConnections,
  workflowNodes,
  workflows,
} from '@spexs/db';
import { AlertEventStatus } from '@spexs/types';
import type {
  ExecutionStatus,
  NodeExecutionStatus,
  SortDirection,
} from '@spexs/types';
import { and, desc, eq, sql } from 'drizzle-orm';

@Injectable()
export class ExecutionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createExecution(data: NewExecution) {
    const [created] = await this.database.db
      .insert(executions)
      .values(data)
      .returning();

    return created;
  }

  async createNodeExecutions(data: NewNodeExecution[]) {
    if (data.length === 0) return [];

    return this.database.db.insert(nodeExecutions).values(data).returning();
  }

  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    extra?: {
      error?: string;
      output?: Record<string, unknown>;
      completedAt?: Date;
    },
  ) {
    const [updated] = await this.database.db
      .update(executions)
      .set({
        status,
        ...extra,
      })
      .where(eq(executions.id, executionId))
      .returning();

    return updated;
  }

  async updateNodeExecutionStatus(
    nodeExecutionId: string,
    status: NodeExecutionStatus,
    extra?: {
      inputData?: Record<string, unknown>;
      outputData?: Record<string, unknown>;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
    },
  ) {
    const [updated] = await this.database.db
      .update(nodeExecutions)
      .set({
        status,
        ...extra,
      })
      .where(eq(nodeExecutions.id, nodeExecutionId))
      .returning();

    return updated;
  }

  async getNodeExecutionStatus(nodeExecutionId: string) {
    const [exec] = await this.database.db
      .select({
        status: nodeExecutions.status,
        outputData: nodeExecutions.outputData,
      })
      .from(nodeExecutions)
      .where(eq(nodeExecutions.id, nodeExecutionId))
      .limit(1);
    return exec || null;
  }

  async findExecutionById(executionId: string) {
    const [execution] = await this.database.db
      .select()
      .from(executions)
      .where(eq(executions.id, executionId))
      .limit(1);

    if (!execution) return null;

    const nodeExecs = await this.database.db
      .select()
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, executionId));

    return { ...execution, nodeExecutions: nodeExecs };
  }

  async findByWorkflowId(
    workflowId: string,
    query: {
      page: number;
      pageSize: number;
      status?: ExecutionStatus;
      sortDirection?: SortDirection;
    },
  ) {
    const offset = (query.page - 1) * query.pageSize;

    const conditions = [eq(executions.workflowId, workflowId)];
    if (query.status) {
      conditions.push(
        eq(executions.status, query.status) as ReturnType<typeof eq>,
      );
    }

    const whereClause = and(...conditions);

    const items = await this.database.db
      .select()
      .from(executions)
      .where(whereClause)
      .orderBy(desc(executions.startedAt))
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database.db
      .select({ total: sql<number>`count(*)` })
      .from(executions)
      .where(whereClause);

    const total = Number(totalResult?.total ?? 0);

    return {
      items,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Load the full workflow graph (workflow + nodes + connections)
   * needed for execution.
   */
  async loadWorkflowGraph(workflowId: string) {
    const [workflow] = await this.database.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) return null;

    const nodes = await this.database.db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.workflowId, workflowId));

    const connections = await this.database.db
      .select()
      .from(workflowConnections)
      .where(eq(workflowConnections.workflowId, workflowId));

    return { workflow, nodes, connections };
  }

  /**
   * Idempotency check: find if there is an OPEN alert
   */
  async findOpenAlertEvent(workflowId: string) {
    const [event] = await this.database.db
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.workflowId, workflowId),
          eq(alertEvents.status, AlertEventStatus.OPEN),
        ),
      )
      .limit(1);

    return event || null;
  }

  /**
   * Idempotency enforcement: create an OPEN alert
   */
  async createAlertEvent(data: NewAlertEvent) {
    const [created] = await this.database.db
      .insert(alertEvents)
      .values(data)
      .returning();

    return created;
  }

  /**
   * Update the step logs for an alert event
   */
  async updateAlertEventStepLogs(eventId: string, stepLogs: any[]) {
    await this.database.db
      .update(alertEvents)
      .set({ stepLogs })
      .where(eq(alertEvents.id, eventId));
  }

  /**
   * Resolve an alert event perfectly.
   */
  async resolveAlertEvent(eventId: string, status: AlertEventStatus) {
    await this.database.db
      .update(alertEvents)
      .set({ status, resolvedAt: new Date() })
      .where(eq(alertEvents.id, eventId));
  }
}
