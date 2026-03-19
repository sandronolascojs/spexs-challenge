import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type NewAlertEvent,
  type NewExecution,
  type NewNodeExecution,
  alertEvents,
  executions,
  nodeExecutionComments,
  nodeExecutions,
  users,
  workflowConnections,
  workflowNodes,
  workflows,
} from '@spexs/db';
import { AlertEventStatus, ExecutionStatus } from '@spexs/types';
import type { NodeExecutionStatus, SortDirection } from '@spexs/types';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { topologicalSortNodes } from '../workflows/lib/topological-sort';

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
      error?: string | null;
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

    const whereClause = query.status
      ? and(
          eq(executions.workflowId, workflowId),
          eq(executions.status, query.status),
        )
      : eq(executions.workflowId, workflowId);

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
  async updateAlertEventStepLogs(eventId: string, stepLogs: unknown[]) {
    await this.database.db
      .update(alertEvents)
      .set({ stepLogs })
      .where(eq(alertEvents.id, eventId));
  }

  /**
   * Update the executionId on an alert event so getDetails fetches
   * the correct (most recent) execution's node status rows.
   */
  async updateAlertEventExecutionId(eventId: string, executionId: string) {
    await this.database.db
      .update(alertEvents)
      .set({ executionId })
      .where(eq(alertEvents.id, eventId));
  }

  /**
   * Resolve an alert event.
   */
  async resolveAlertEvent(eventId: string, status: AlertEventStatus) {
    await this.database.db
      .update(alertEvents)
      .set({ status, resolvedAt: new Date() })
      .where(eq(alertEvents.id, eventId));
  }

  /**
   * Find the currently RUNNING execution for a workflow (used to block parallel runs).
   */
  async findActiveExecution(workflowId: string) {
    const [execution] = await this.database.db
      .select({ id: executions.id, status: executions.status })
      .from(executions)
      .where(
        and(
          eq(executions.workflowId, workflowId),
          eq(executions.status, ExecutionStatus.RUNNING),
        ),
      )
      .limit(1);

    return execution || null;
  }

  /**
   * Lean progress query: returns the execution's own status plus a map of
   * nodeId → NodeExecutionStatus. Used by the canvas poller to track a
   * running execution in real time.
   */
  async findExecutionProgress(executionId: string) {
    const [execution] = await this.database.db
      .select({
        id: executions.id,
        status: executions.status,
      })
      .from(executions)
      .where(eq(executions.id, executionId))
      .limit(1);

    if (!execution) return null;

    const nodeExecs = await this.database.db
      .select({
        nodeId: nodeExecutions.nodeId,
        status: nodeExecutions.status,
        error: nodeExecutions.error,
      })
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, executionId));

    const nodeStatusByNodeId = Object.fromEntries(
      nodeExecs.map((row) => [
        row.nodeId,
        { status: row.status, error: row.error },
      ]),
    );

    return {
      executionId: execution.id,
      executionStatus: execution.status,
      nodeStatusByNodeId,
    };
  }

  /**
   * Find the most recent execution for a workflow.
   * Includes per-node outputData keyed by nodeId so the UI can display
   * real runtime values as variable previews in node edit dialogs.
   */
  async findLastExecution(workflowId: string) {
    const [execution] = await this.database.db
      .select({
        id: executions.id,
        status: executions.status,
        startedAt: executions.startedAt,
        completedAt: executions.completedAt,
      })
      .from(executions)
      .where(eq(executions.workflowId, workflowId))
      .orderBy(desc(executions.startedAt))
      .limit(1);

    if (!execution) return null;

    const nodeExecs = await this.database.db
      .select({
        nodeId: nodeExecutions.nodeId,
        outputData: nodeExecutions.outputData,
        status: nodeExecutions.status,
      })
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, execution.id));

    // Map nodeId → outputData for O(1) lookup in the UI
    const nodeOutputByNodeId = Object.fromEntries(
      nodeExecs
        .filter((ne) => ne.outputData !== null)
        .map((ne) => [ne.nodeId, ne.outputData]),
    );

    // Map nodeId → execution status so the canvas can restore status indicators
    // from the last run even when there is no active live-poll session.
    const nodeStatusByNodeId = Object.fromEntries(
      nodeExecs.map((ne) => [ne.nodeId, ne.status]),
    );

    return { ...execution, nodeOutputByNodeId, nodeStatusByNodeId };
  }

  /**
   * Find an execution with its node executions and their comments.
   * Used by the execution details view in the history panel.
   */
  async findExecutionWithDetails(executionId: string) {
    const [execution] = await this.database.db
      .select()
      .from(executions)
      .where(eq(executions.id, executionId))
      .limit(1);

    if (!execution) return null;

    const nodeExecs = await this.database.db
      .select()
      .from(nodeExecutions)
      .where(eq(nodeExecutions.executionId, executionId))
      .orderBy(nodeExecutions.createdAt);

    const nodeExecutionIds = nodeExecs.map((ne) => ne.id);

    const comments =
      nodeExecutionIds.length > 0
        ? await this.database.db
            .select()
            .from(nodeExecutionComments)
            .where(
              inArray(nodeExecutionComments.nodeExecutionId, nodeExecutionIds),
            )
            .orderBy(nodeExecutionComments.createdAt)
        : [];

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const commentUsers =
      userIds.length > 0
        ? await this.database.db
            .select({ id: users.id, name: users.name, image: users.image })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

    const userById = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

    const commentsWithUser = comments.map((c) => ({
      ...c,
      userName: userById[c.userId]?.name ?? 'Unknown',
      userImage: userById[c.userId]?.image ?? null,
    }));

    const commentsByNodeExecutionId = commentsWithUser.reduce<
      Record<string, typeof commentsWithUser>
    >((accumulator, comment) => {
      const key = comment.nodeExecutionId;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(comment);
      return accumulator;
    }, {});

    const nodeExecutionsWithComments = nodeExecs.map((ne) => ({
      ...ne,
      comments: commentsByNodeExecutionId[ne.id] ?? [],
    }));

    const workflowNodeRows = await this.database.db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.workflowId, execution.workflowId));

    const workflowConnectionRows = await this.database.db
      .select()
      .from(workflowConnections)
      .where(eq(workflowConnections.workflowId, execution.workflowId));

    const allWorkflowNodes = topologicalSortNodes(
      workflowNodeRows,
      workflowConnectionRows,
    );

    return {
      ...execution,
      nodeExecutions: nodeExecutionsWithComments,
      allWorkflowNodes,
    };
  }

  /**
   * Add a comment to a specific node execution step.
   */
  async addNodeExecutionComment(data: {
    nodeExecutionId: string;
    userId: string;
    content: string;
  }) {
    const [created] = await this.database.db
      .insert(nodeExecutionComments)
      .values(data)
      .returning();

    return created;
  }

  /**
   * Find all executions currently in RUNNING state across all workflows.
   * Used at boot time to recover any that lost their BullMQ job.
   */
  async findAllRunningExecutions() {
    return this.database.db
      .select()
      .from(executions)
      .where(eq(executions.status, ExecutionStatus.RUNNING));
  }

  /**
   * Cursor-paginated comments for a specific node execution.
   * Ordered newest-first; cursor is the ISO timestamp of the oldest item
   * on the previous page.
   */
  async findCommentsByNodeExecutionId(params: {
    nodeExecutionId: string;
    cursor?: string;
    limit: number;
  }) {
    const { nodeExecutionId, cursor, limit } = params;

    const whereClause = cursor
      ? and(
          eq(nodeExecutionComments.nodeExecutionId, nodeExecutionId),
          lt(nodeExecutionComments.createdAt, new Date(cursor)),
        )
      : eq(nodeExecutionComments.nodeExecutionId, nodeExecutionId);

    const rows = await this.database.db
      .select()
      .from(nodeExecutionComments)
      .where(whereClause)
      .orderBy(desc(nodeExecutionComments.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const userIds = [...new Set(items.map((c) => c.userId))];
    const commentUsers =
      userIds.length > 0
        ? await this.database.db
            .select({ id: users.id, name: users.name, image: users.image })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

    const userById = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

    const itemsWithUser = items.map((c) => ({
      ...c,
      userName: userById[c.userId]?.name ?? 'Unknown',
      userImage: userById[c.userId]?.image ?? null,
    }));

    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem?.createdAt ? lastItem.createdAt.toISOString() : null;

    return { items: itemsWithUser, nextCursor };
  }
}
