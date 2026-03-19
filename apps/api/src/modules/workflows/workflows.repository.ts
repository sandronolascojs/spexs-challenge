import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type NewWorkflow,
  type NewWorkflowNode,
  workflowConnections,
  workflowNodes,
  workflows,
} from '@spexs/db';
import {
  WORKFLOW_SORT_FIELDS,
  type WorkflowListQueryInput,
  buildOrderBy,
  calculatePaginationMeta,
} from '@spexs/types';
import { eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class WorkflowsRepository {
  constructor(private readonly database: DatabaseService) {}

  // ── Workflow CRUD ─────────────────────────────────────────────────────────

  async findById(id: string) {
    const [workflow] = await this.database.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!workflow) return null;

    const [nodes, connections] = await Promise.all([
      this.database.db
        .select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, id)),
      this.database.db
        .select()
        .from(workflowConnections)
        .where(eq(workflowConnections.workflowId, id)),
    ]);

    return { ...workflow, nodes, connections };
  }

  async findAllByUserId(userId: string, query: WorkflowListQueryInput) {
    const offset = (query.page - 1) * query.pageSize;
    const baseWhereClause = eq(workflows.createdBy, userId);

    const orderByColumn = (() => {
      if (query.sortBy === WORKFLOW_SORT_FIELDS.NAME) return workflows.name;
      if (query.sortBy === WORKFLOW_SORT_FIELDS.UPDATED_AT)
        return workflows.updatedAt;
      if (query.sortBy === WORKFLOW_SORT_FIELDS.STATUS)
        return workflows.isActive;
      return workflows.createdAt;
    })();

    const orderByClause = buildOrderBy(
      query,
      {
        [WORKFLOW_SORT_FIELDS.NAME]: workflows.name,
        [WORKFLOW_SORT_FIELDS.CREATED_AT]: workflows.createdAt,
        [WORKFLOW_SORT_FIELDS.UPDATED_AT]: workflows.updatedAt,
        [WORKFLOW_SORT_FIELDS.STATUS]: workflows.isActive,
      },
      orderByColumn,
    );

    const [userWorkflows, [totalResult]] = await Promise.all([
      this.database.db
        .select()
        .from(workflows)
        .where(baseWhereClause)
        .orderBy(orderByClause)
        .limit(query.pageSize)
        .offset(offset),
      this.database.db
        .select({ total: sql<number>`count(*)` })
        .from(workflows)
        .where(baseWhereClause),
    ]);

    const total = Number(totalResult?.total ?? 0);
    const meta = calculatePaginationMeta(query.page, query.pageSize, total);

    if (userWorkflows.length === 0) {
      return { items: [], meta };
    }

    // Batch-load node counts for all workflows
    const workflowIds = userWorkflows.map((w) => w.id);
    const nodeCounts = await this.database.db
      .select({
        workflowId: workflowNodes.workflowId,
        count: sql<number>`count(*)`,
      })
      .from(workflowNodes)
      .where(inArray(workflowNodes.workflowId, workflowIds))
      .groupBy(workflowNodes.workflowId);

    const nodeCountByWorkflowId = new Map(
      nodeCounts.map((row) => [row.workflowId, Number(row.count)]),
    );

    return {
      items: userWorkflows.map((workflow) => ({
        ...workflow,
        nodeCount: nodeCountByWorkflowId.get(workflow.id) ?? 0,
      })),
      meta,
    };
  }

  async create(data: NewWorkflow) {
    const [created] = await this.database.db
      .insert(workflows)
      .values(data)
      .returning();

    return created;
  }

  async updateName(id: string, name: string) {
    const [updated] = await this.database.db
      .update(workflows)
      .set({ name, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    return updated ?? null;
  }

  async updateIsActive(id: string, isActive: boolean) {
    const [updated] = await this.database.db
      .update(workflows)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    return updated ?? null;
  }

  async deleteById(id: string) {
    await this.database.db.delete(workflows).where(eq(workflows.id, id));
  }

  // ── Node CRUD ─────────────────────────────────────────────────────────────

  async createNode(data: NewWorkflowNode) {
    const [created] = await this.database.db
      .insert(workflowNodes)
      .values(data)
      .returning();

    // Touch workflow updatedAt
    await this.database.db
      .update(workflows)
      .set({ updatedAt: new Date() })
      .where(eq(workflows.id, data.workflowId));

    return created;
  }

  async deleteNode(nodeId: string) {
    // Get the node's workflowId before deleting
    const [node] = await this.database.db
      .select({ workflowId: workflowNodes.workflowId })
      .from(workflowNodes)
      .where(eq(workflowNodes.id, nodeId))
      .limit(1);

    await this.database.db
      .delete(workflowNodes)
      .where(eq(workflowNodes.id, nodeId));

    if (node) {
      await this.database.db
        .update(workflows)
        .set({ updatedAt: new Date() })
        .where(eq(workflows.id, node.workflowId));
    }
  }

  async updateNodeData(nodeId: string, data: Record<string, unknown>) {
    const [updated] = await this.database.db
      .update(workflowNodes)
      .set({ data, updatedAt: new Date() })
      .where(eq(workflowNodes.id, nodeId))
      .returning();

    return updated ?? null;
  }

  async updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const [updated] = await this.database.db
      .update(workflowNodes)
      .set({ position, updatedAt: new Date() })
      .where(eq(workflowNodes.id, nodeId))
      .returning();

    return updated ?? null;
  }

  // ── Connection CRUD ───────────────────────────────────────────────────────

  async createConnection(data: {
    workflowId: string;
    fromNodeId: string;
    toNodeId: string;
    fromOutput?: string;
    toInput?: string;
  }) {
    const [created] = await this.database.db
      .insert(workflowConnections)
      .values(data)
      .returning();

    await this.database.db
      .update(workflows)
      .set({ updatedAt: new Date() })
      .where(eq(workflows.id, data.workflowId));

    return created;
  }

  async deleteConnection(connectionId: string) {
    const [connection] = await this.database.db
      .select({ workflowId: workflowConnections.workflowId })
      .from(workflowConnections)
      .where(eq(workflowConnections.id, connectionId))
      .limit(1);

    await this.database.db
      .delete(workflowConnections)
      .where(eq(workflowConnections.id, connectionId));

    if (connection) {
      await this.database.db
        .update(workflows)
        .set({ updatedAt: new Date() })
        .where(eq(workflows.id, connection.workflowId));
    }
  }

  /**
   * Find the node that owns a given nodeId (for ownership checks).
   */
  async findNodeOwner(nodeId: string) {
    const [node] = await this.database.db
      .select({
        workflowId: workflowNodes.workflowId,
      })
      .from(workflowNodes)
      .where(eq(workflowNodes.id, nodeId))
      .limit(1);

    if (!node) return null;

    const [workflow] = await this.database.db
      .select({
        createdBy: workflows.createdBy,
      })
      .from(workflows)
      .where(eq(workflows.id, node.workflowId))
      .limit(1);

    if (!workflow) return null;

    return {
      workflowId: node.workflowId,
      createdBy: workflow.createdBy,
    };
  }

  /**
   * Find the connection's owner (for ownership checks).
   */
  async findConnectionOwner(connectionId: string) {
    const [connection] = await this.database.db
      .select({
        workflowId: workflowConnections.workflowId,
      })
      .from(workflowConnections)
      .where(eq(workflowConnections.id, connectionId))
      .limit(1);

    if (!connection) return null;

    const [workflow] = await this.database.db
      .select({
        createdBy: workflows.createdBy,
      })
      .from(workflows)
      .where(eq(workflows.id, connection.workflowId))
      .limit(1);

    if (!workflow) return null;

    return {
      workflowId: connection.workflowId,
      createdBy: workflow.createdBy,
    };
  }

  /**
   * Find connections for a workflow (used for cycle detection).
   */
  async findConnectionsByWorkflowId(workflowId: string) {
    return this.database.db
      .select()
      .from(workflowConnections)
      .where(eq(workflowConnections.workflowId, workflowId));
  }

  /**
   * Lightweight ownership check — fetches only the createdBy column
   * instead of loading the full workflow graph (nodes + connections).
   */
  async findOwnerById(workflowId: string) {
    const [workflow] = await this.database.db
      .select({ id: workflows.id, createdBy: workflows.createdBy })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    return workflow ?? null;
  }
}
