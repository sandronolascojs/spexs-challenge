import { Injectable } from '@nestjs/common';
import type {
  CreateWorkflowInput,
  UpdateWorkflowCanvasInput,
  UpdateWorkflowInput,
  WorkflowCanvasEdge,
  WorkflowCanvasNodePosition,
  WorkflowCanvasState,
  WorkflowListQueryInput,
} from '@spexs/types';
import { workflowCanvasNodePositionSchema } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { WorkflowsRepository } from './workflows.repository';

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_TRIGGER_HEIGHT = 164;
const DEFAULT_MESSAGE_HEIGHT = 120;
const DEFAULT_VERTICAL_GAP = 72;
const DEFAULT_HORIZONTAL_GAP = 24;

const TRIGGER_NODE_ID = 'trigger';
const MESSAGE_NODE_ID = 'message';
const RECIPIENT_NODE_PREFIX = 'recipient-';
const EDGE_TRIGGER_MESSAGE_ID = 'edge-trigger-message';
const EDGE_MESSAGE_RECIPIENT_PREFIX = 'edge-message-recipient-';

const CANVAS_NODE_KIND = workflowCanvasNodePositionSchema.shape.kind.enum;

type WorkflowRecipientSeed = { id: string };

function recipientNodeId(recipientId: string): string {
  return `${RECIPIENT_NODE_PREFIX}${recipientId}`;
}

function computeRecipientStartX(count: number): number {
  const totalWidth =
    count * DEFAULT_NODE_WIDTH +
    Math.max(0, count - 1) * DEFAULT_HORIZONTAL_GAP;
  return -(totalWidth / 2);
}

function hasPersistedCanvasState(canvasState: WorkflowCanvasState): boolean {
  return canvasState.nodePositions.length > 0 || canvasState.edges.length > 0;
}

function hasCycle(
  nodeIds: ReadonlySet<string>,
  edges: readonly WorkflowCanvasEdge[],
): boolean {
  const adjacencyByNodeId = new Map<string, string[]>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const nodeId of nodeIds) {
    adjacencyByNodeId.set(nodeId, []);
  }

  for (const edge of edges) {
    if (!edge.sourceNodeId || !edge.targetNodeId) continue;
    adjacencyByNodeId.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }

  function dfs(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    const neighbors = adjacencyByNodeId.get(nodeId) ?? [];
    for (const nextNodeId of neighbors) {
      if (dfs(nextNodeId)) {
        return true;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId) && dfs(nodeId)) {
      return true;
    }
  }

  return false;
}

@Injectable()
export class WorkflowsService {
  constructor(private readonly repository: WorkflowsRepository) {}

  listByUser(userId: string, query: WorkflowListQueryInput) {
    return this.repository.findAllByUserId(userId, query);
  }

  async getById(id: string) {
    const workflow = await this.repository.findById(id);

    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    if (!hasPersistedCanvasState(workflow.canvasState)) {
      const initialCanvasState = this.buildInitialCanvasState(
        workflow.recipients,
      );
      await this.repository.updateCanvasState(workflow.id, initialCanvasState);
      return { ...workflow, canvasState: initialCanvasState };
    }

    return workflow;
  }

  async create(input: CreateWorkflowInput, userId: string) {
    const created = await this.repository.create(
      {
        name: input.name,
        triggerType: input.triggerType,
        messageTemplate: input.messageTemplate,
        canvasState: this.buildDefaultCanvasState(),
        createdBy: userId,
        ...(input.triggerType === 'threshold'
          ? {
              metricName: input.metricName,
              operator: input.operator,
              thresholdValue: input.thresholdValue,
            }
          : {
              baseValue: input.baseValue,
              deviationPercentage: input.deviationPercentage,
            }),
      },
      input.recipients,
    );

    const initialCanvasState = this.buildInitialCanvasState(created.recipients);
    await this.repository.updateCanvasState(created.id, initialCanvasState);

    return { ...created, canvasState: initialCanvasState };
  }

  async update(input: UpdateWorkflowInput, userId: string) {
    await this.assertOwnership(input.id, userId);

    const updated = await this.repository.update(
      input.id,
      {
        name: input.name,
        triggerType: input.triggerType,
        messageTemplate: input.messageTemplate,
        ...(input.triggerType === 'threshold'
          ? {
              metricName: input.metricName,
              operator: input.operator,
              thresholdValue: input.thresholdValue,
              baseValue: null,
              deviationPercentage: null,
            }
          : {
              metricName: null,
              operator: null,
              thresholdValue: null,
              baseValue: input.baseValue,
              deviationPercentage: input.deviationPercentage,
            }),
      },
      input.recipients,
    );

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    return updated;
  }

  async updateCanvas(input: UpdateWorkflowCanvasInput, userId: string) {
    await this.assertOwnership(input.id, userId);
    this.validateCanvasState(input.canvasState);

    const updated = await this.repository.updateCanvasState(
      input.id,
      input.canvasState,
    );

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    return updated;
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    await this.assertOwnership(id, userId);

    const updated = await this.repository.updateIsActive(id, isActive);

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    await this.assertOwnership(id, userId);
    await this.repository.deleteById(id);
  }

  async deleteRecipient(
    workflowId: string,
    recipientId: string,
    userId: string,
  ) {
    await this.assertOwnership(workflowId, userId);

    const workflow = await this.repository.findById(workflowId);
    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    if (workflow.recipients.length <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Cannot delete the last recipient. A workflow must have at least one recipient.',
      });
    }

    await this.repository.deleteRecipient(recipientId);
  }

  private async assertOwnership(workflowId: string, userId: string) {
    const workflow = await this.repository.findById(workflowId);

    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    if (workflow.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not own this workflow',
      });
    }
  }

  private buildDefaultCanvasState(): WorkflowCanvasState {
    return {
      nodePositions: [],
      edges: [],
    };
  }

  private buildInitialCanvasState(
    recipients: readonly WorkflowRecipientSeed[],
  ): WorkflowCanvasState {
    const nodePositions: WorkflowCanvasNodePosition[] = [
      {
        nodeId: TRIGGER_NODE_ID,
        kind: CANVAS_NODE_KIND.TRIGGER,
        x: -(DEFAULT_NODE_WIDTH / 2),
        y: 0,
      },
      {
        nodeId: MESSAGE_NODE_ID,
        kind: CANVAS_NODE_KIND.MESSAGE,
        x: -(DEFAULT_NODE_WIDTH / 2),
        y: DEFAULT_TRIGGER_HEIGHT + DEFAULT_VERTICAL_GAP,
      },
    ];

    const recipientsY =
      DEFAULT_TRIGGER_HEIGHT +
      DEFAULT_VERTICAL_GAP +
      DEFAULT_MESSAGE_HEIGHT +
      DEFAULT_VERTICAL_GAP;
    const startX = computeRecipientStartX(recipients.length);

    const recipientNodes = recipients.map((recipient, index) => ({
      nodeId: recipientNodeId(recipient.id),
      kind: CANVAS_NODE_KIND.RECIPIENT,
      x: startX + index * (DEFAULT_NODE_WIDTH + DEFAULT_HORIZONTAL_GAP),
      y: recipientsY,
    }));

    const edges: WorkflowCanvasEdge[] = [
      {
        edgeId: EDGE_TRIGGER_MESSAGE_ID,
        sourceNodeId: TRIGGER_NODE_ID,
        targetNodeId: MESSAGE_NODE_ID,
        sourceHandleId: null,
        targetHandleId: null,
      },
      ...recipients.map((recipient) => ({
        edgeId: `${EDGE_MESSAGE_RECIPIENT_PREFIX}${recipient.id}`,
        sourceNodeId: MESSAGE_NODE_ID,
        targetNodeId: recipientNodeId(recipient.id),
        sourceHandleId: null,
        targetHandleId: null,
      })),
    ];

    return {
      nodePositions: [...nodePositions, ...recipientNodes],
      edges,
    };
  }

  private validateCanvasState(canvasState: WorkflowCanvasState): void {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    for (const nodePosition of canvasState.nodePositions) {
      if (nodeIds.has(nodePosition.nodeId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Duplicate node id: ${nodePosition.nodeId}`,
        });
      }
      nodeIds.add(nodePosition.nodeId);
    }

    for (const edge of canvasState.edges) {
      if (edgeIds.has(edge.edgeId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Duplicate edge id: ${edge.edgeId}`,
        });
      }
      edgeIds.add(edge.edgeId);

      if (edge.sourceNodeId && !nodeIds.has(edge.sourceNodeId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Edge source not found: ${edge.sourceNodeId}`,
        });
      }

      if (edge.targetNodeId && !nodeIds.has(edge.targetNodeId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Edge target not found: ${edge.targetNodeId}`,
        });
      }

      if (
        edge.sourceNodeId &&
        edge.targetNodeId &&
        edge.sourceNodeId === edge.targetNodeId
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Self-loop is not allowed on node: ${edge.sourceNodeId}`,
        });
      }
    }

    if (hasCycle(nodeIds, canvasState.edges)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Circular connections are not allowed in workflow canvas',
      });
    }
  }
}
