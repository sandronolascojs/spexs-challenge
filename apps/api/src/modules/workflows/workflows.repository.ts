import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type NewWorkflow,
  type NewWorkflowRecipient,
  type Workflow,
  workflowRecipients,
  workflows,
} from '@spexs/db';
import {
  WORKFLOW_SORT_FIELDS,
  type WorkflowCanvasState,
  type WorkflowListQueryInput,
  buildOrderBy,
  calculatePaginationMeta,
} from '@spexs/types';
import { eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class WorkflowsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string) {
    const [workflow] = await this.database.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (!workflow) return null;

    const recipients = await this.database.db
      .select()
      .from(workflowRecipients)
      .where(eq(workflowRecipients.workflowId, id));

    return { ...workflow, recipients };
  }

  async findAllByUserId(userId: string, query: WorkflowListQueryInput) {
    const offset = (query.page - 1) * query.pageSize;

    const baseWhereClause = eq(workflows.createdBy, userId);

    const orderByColumn = (() => {
      if (query.sortBy === WORKFLOW_SORT_FIELDS.NAME) {
        return workflows.name;
      }
      if (query.sortBy === WORKFLOW_SORT_FIELDS.UPDATED_AT) {
        return workflows.updatedAt;
      }
      if (query.sortBy === WORKFLOW_SORT_FIELDS.STATUS) {
        return workflows.isActive;
      }
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

    const userWorkflows = await this.database.db
      .select()
      .from(workflows)
      .where(baseWhereClause)
      .orderBy(orderByClause)
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database.db
      .select({ total: sql<number>`count(*)` })
      .from(workflows)
      .where(baseWhereClause);

    const total = Number(totalResult?.total ?? 0);
    const meta = calculatePaginationMeta(query.page, query.pageSize, total);

    if (userWorkflows.length === 0) {
      return { items: [], meta };
    }

    const workflowIds = userWorkflows.map((w) => w.id);

    const allRecipients = await this.database.db
      .select()
      .from(workflowRecipients)
      .where(inArray(workflowRecipients.workflowId, workflowIds));

    const recipientsByWorkflowId = allRecipients.reduce<
      Record<string, typeof allRecipients>
    >((acc, recipient) => {
      const existing = acc[recipient.workflowId] ?? [];
      existing.push(recipient);
      acc[recipient.workflowId] = existing;
      return acc;
    }, {});

    return {
      items: userWorkflows.map((workflow) => ({
        ...workflow,
        recipients: recipientsByWorkflowId[workflow.id] ?? [],
      })),
      meta,
    };
  }

  async create(
    workflowData: NewWorkflow,
    recipientData: Omit<
      NewWorkflowRecipient,
      'workflowId' | 'id' | 'createdAt'
    >[],
  ) {
    return this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(workflows)
        .values(workflowData)
        .returning();

      const recipients =
        recipientData.length > 0
          ? await tx
              .insert(workflowRecipients)
              .values(
                recipientData.map((r) => ({ ...r, workflowId: created.id })),
              )
              .returning()
          : [];

      return { ...created, recipients };
    });
  }

  async updateIsActive(id: string, isActive: boolean) {
    const [updated] = await this.database.db
      .update(workflows)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    return updated ?? null;
  }

  async updateCanvasState(id: string, canvasState: WorkflowCanvasState) {
    const [updated] = await this.database.db
      .update(workflows)
      .set({ canvasState, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();

    return updated ?? null;
  }

  async update(
    id: string,
    workflowData: Partial<Workflow>,
    recipientData: Omit<
      NewWorkflowRecipient,
      'workflowId' | 'id' | 'createdAt'
    >[],
  ) {
    return this.database.db.transaction(async (tx) => {
      const [updatedWorkflow] = await tx
        .update(workflows)
        .set({
          ...workflowData,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, id))
        .returning();

      if (!updatedWorkflow) {
        return null;
      }

      await tx
        .delete(workflowRecipients)
        .where(eq(workflowRecipients.workflowId, id));

      const recipients =
        recipientData.length > 0
          ? await tx
              .insert(workflowRecipients)
              .values(
                recipientData.map((recipient) => ({
                  ...recipient,
                  workflowId: id,
                })),
              )
              .returning()
          : [];

      return { ...updatedWorkflow, recipients };
    });
  }

  async deleteById(id: string) {
    await this.database.db.delete(workflows).where(eq(workflows.id, id));
  }
}
