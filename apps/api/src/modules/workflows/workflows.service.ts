import { Injectable } from '@nestjs/common';
import {
  ComparisonOperator,
  NodeType,
  type WorkflowListQueryInput,
  WorkflowTemplate,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { topologicalSortNodes } from './lib/topological-sort';
import { WorkflowsRepository } from './workflows.repository';

// ── Template node/connection seed definitions ─────────────────────────────────

interface SeedNode {
  type: NodeType;
  name: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

interface SeedConnection {
  fromIndex: number;
  toIndex: number;
}

interface TemplateSeed {
  nodes: SeedNode[];
  connections: SeedConnection[];
}

const TEMPLATE_SEEDS: Record<WorkflowTemplate, TemplateSeed> = {
  [WorkflowTemplate.THRESHOLD]: {
    nodes: [
      {
        type: NodeType.TRIGGER_THRESHOLD,
        name: 'Threshold Trigger',
        data: {
          metricName: 'cpu_usage',
          operator: ComparisonOperator.GREATER_THAN,
          thresholdValue: 80,
        },
        position: { x: 100, y: 100 },
      },
      {
        type: NodeType.OUTPUT_MESSAGE,
        name: 'Alert Message',
        data: {
          template:
            'Alert: {{trigger.metricName}} is {{trigger.value}} (threshold: {{trigger.thresholdValue}})',
        },
        position: { x: 100, y: 380 },
      },
      {
        type: NodeType.RECIPIENT_EMAIL,
        name: 'Send Email',
        data: { emails: [] },
        position: { x: 100, y: 660 },
      },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
    ],
  },

  [WorkflowTemplate.VARIANCE]: {
    nodes: [
      {
        type: NodeType.TRIGGER_VARIANCE,
        name: 'Variance Trigger',
        data: {
          metricName: 'memory_usage',
          baseValue: 60,
          deviationPercentage: 20,
        },
        position: { x: 100, y: 100 },
      },
      {
        type: NodeType.OUTPUT_MESSAGE,
        name: 'Anomaly Message',
        data: {
          template:
            'Anomaly: {{trigger.metricName}} deviated by {{trigger.deviationPercentage}}% from baseline {{trigger.baseValue}}',
        },
        position: { x: 100, y: 380 },
      },
      {
        type: NodeType.RECIPIENT_EMAIL,
        name: 'Send Email',
        data: { emails: [] },
        position: { x: 100, y: 660 },
      },
    ],
    connections: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
    ],
  },

  [WorkflowTemplate.SCRATCH]: {
    nodes: [
      {
        type: NodeType.TRIGGER_THRESHOLD,
        name: 'Trigger',
        data: {
          metricName: '',
          operator: ComparisonOperator.GREATER_THAN,
          thresholdValue: 0,
        },
        position: { x: 100, y: 100 },
      },
    ],
    connections: [],
  },
};

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

  async create(name: string, template: WorkflowTemplate, userId: string) {
    const workflow = await this.repository.create({ name, createdBy: userId });

    const seed = TEMPLATE_SEEDS[template];

    const createdNodes = await Promise.all(
      seed.nodes.map((node) =>
        this.repository.createNode({ workflowId: workflow.id, ...node }),
      ),
    );

    await Promise.all(
      seed.connections.map(({ fromIndex, toIndex }) =>
        this.repository.createConnection({
          workflowId: workflow.id,
          fromNodeId: createdNodes[fromIndex].id,
          toNodeId: createdNodes[toIndex].id,
        }),
      ),
    );

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
    const workflow = await this.repository.findOwnerById(workflowId);

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
