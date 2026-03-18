import { Injectable } from '@nestjs/common';
import { NodeType, type WorkflowListQueryInput } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { topologicalSortNodes } from './lib/topological-sort';
import { WorkflowsRepository } from './workflows.repository';

const DEFAULT_TRIGGER_POSITION = { x: 0, y: 0 };

@Injectable()
export class WorkflowsService {
  constructor(private readonly repository: WorkflowsRepository) {}

  // ── Workflow CRUD ─────────────────────────────────────────────────────────

  listByUser(userId: string, query: WorkflowListQueryInput) {
    return this.repository.findAllByUserId(userId, query);
  }

  async getById(id: string) {
    const workflow = await this.repository.findById(id);

    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    return workflow;
  }

  async create(name: string, userId: string) {
    const workflow = await this.repository.create({
      name,
      createdBy: userId,
    });

    // Create a default trigger node
    await this.repository.createNode({
      workflowId: workflow.id,
      type: NodeType.TRIGGER_THRESHOLD,
      name: 'Trigger',
      data: { metricName: '', operator: 'gt', thresholdValue: 0 },
      position: DEFAULT_TRIGGER_POSITION,
    });

    return this.getById(workflow.id);
  }

  async update(id: string, name: string, userId: string) {
    await this.assertOwnership(id, userId);

    const updated = await this.repository.updateName(id, name);

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

  // ── Node CRUD ─────────────────────────────────────────────────────────────

  async addNode(
    workflowId: string,
    input: {
      type: NodeType;
      name: string;
      data: Record<string, unknown>;
      position: { x: number; y: number };
    },
    userId: string,
  ) {
    await this.assertOwnership(workflowId, userId);

    return this.repository.createNode({
      workflowId,
      type: input.type,
      name: input.name,
      data: input.data,
      position: input.position,
    });
  }

  async removeNode(nodeId: string, userId: string) {
    await this.assertNodeOwnership(nodeId, userId);
    await this.repository.deleteNode(nodeId);
  }

  async updateNodeData(
    nodeId: string,
    data: Record<string, unknown>,
    userId: string,
  ) {
    await this.assertNodeOwnership(nodeId, userId);

    const updated = await this.repository.updateNodeData(nodeId, data);

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Node not found' });
    }

    return updated;
  }

  async updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
    userId: string,
  ) {
    await this.assertNodeOwnership(nodeId, userId);

    const updated = await this.repository.updateNodePosition(nodeId, position);

    if (!updated) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Node not found' });
    }

    return updated;
  }

  // ── Connection CRUD ───────────────────────────────────────────────────────

  async addConnection(
    input: {
      workflowId: string;
      fromNodeId: string;
      toNodeId: string;
      fromOutput?: string;
      toInput?: string;
    },
    userId: string,
  ) {
    await this.assertOwnership(input.workflowId, userId);

    // Validate no cycle before creating the connection
    const existingConnections =
      await this.repository.findConnectionsByWorkflowId(input.workflowId);

    const workflow = await this.repository.findById(input.workflowId);

    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    // Create a temporary connection to test for cycles
    const testConnections = [
      ...existingConnections,
      {
        id: 'test',
        workflowId: input.workflowId,
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        fromOutput: input.fromOutput ?? 'main',
        toInput: input.toInput ?? 'main',
        createdAt: new Date(),
      },
    ];

    try {
      topologicalSortNodes(workflow.nodes, testConnections);
    } catch {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This connection would create a cycle in the workflow',
      });
    }

    return this.repository.createConnection(input);
  }

  async removeConnection(connectionId: string, userId: string) {
    await this.assertConnectionOwnership(connectionId, userId);
    await this.repository.deleteConnection(connectionId);
  }

  // ── Ownership checks ─────────────────────────────────────────────────────

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

  private async assertNodeOwnership(nodeId: string, userId: string) {
    const owner = await this.repository.findNodeOwner(nodeId);

    if (!owner) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Node not found' });
    }

    if (owner.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not own this workflow',
      });
    }
  }

  private async assertConnectionOwnership(
    connectionId: string,
    userId: string,
  ) {
    const owner = await this.repository.findConnectionOwner(connectionId);

    if (!owner) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Connection not found',
      });
    }

    if (owner.createdBy !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not own this workflow',
      });
    }
  }
}
