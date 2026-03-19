import { Test, type TestingModule } from '@nestjs/testing';
import { NodeType, WorkflowTemplate } from '@spexs/types';
import {
  buildWorkflow,
  buildWorkflowConnection,
  buildWorkflowNode,
} from '../../test-utils/factories';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowsService } from './workflows.service';

// ── Mock types ───────────────────────────────────────────────────────────────

type MockRepo = {
  [K in keyof WorkflowsRepository]: jest.Mock;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRepository(): MockRepo {
  const workflow = buildWorkflow();
  const node = buildWorkflowNode({ type: NodeType.TRIGGER_THRESHOLD });

  return {
    findById: jest.fn().mockResolvedValue({
      ...workflow,
      nodes: [node],
      connections: [],
    }),
    findOwnerById: jest.fn().mockResolvedValue({
      id: workflow.id,
      createdBy: workflow.createdBy,
    }),
    findAllByUserId: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    create: jest
      .fn()
      .mockResolvedValue(buildWorkflow({ id: 'wf-new', name: 'New' })),
    createNode: jest
      .fn()
      .mockImplementation(
        (data: Parameters<WorkflowsRepository['createNode']>[0]) =>
          Promise.resolve(
            buildWorkflowNode({
              ...data,
              id: `node-${data.workflowId}-${Date.now()}`,
            }),
          ),
      ),
    createConnection: jest.fn().mockResolvedValue(buildWorkflowConnection()),
    updateName: jest.fn().mockResolvedValue(buildWorkflow({ name: 'Updated' })),
    updateIsActive: jest
      .fn()
      .mockResolvedValue(buildWorkflow({ isActive: false })),
    deleteById: jest.fn().mockResolvedValue(undefined),
    deleteNode: jest.fn().mockResolvedValue(undefined),
    deleteConnection: jest.fn().mockResolvedValue(undefined),
    updateNodeData: jest
      .fn()
      .mockResolvedValue(buildWorkflowNode({ data: { template: 'new' } })),
    updateNodePosition: jest
      .fn()
      .mockResolvedValue(buildWorkflowNode({ position: { x: 50, y: 50 } })),
    findNodeOwner: jest.fn().mockResolvedValue({
      workflowId: 'wf-1',
      createdBy: 'user-1',
    }),
    findConnectionOwner: jest.fn().mockResolvedValue({
      workflowId: 'wf-1',
      createdBy: 'user-1',
    }),
    findConnectionsByWorkflowId: jest.fn().mockResolvedValue([]),
  };
}

async function createService() {
  const repository = createMockRepository();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WorkflowsService,
      { provide: WorkflowsRepository, useValue: repository },
    ],
  }).compile();

  const service = module.get<WorkflowsService>(WorkflowsService);

  return { service, repository };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WorkflowsService', () => {
  describe('getById', () => {
    it('returns the workflow when found', async () => {
      const { service } = await createService();

      const result = await service.getById('wf-1');

      expect(result.id).toBe('wf-1');
    });

    it('throws NOT_FOUND when workflow does not exist', async () => {
      const { service, repository } = await createService();
      repository.findById.mockResolvedValueOnce(null);

      await expect(service.getById('missing')).rejects.toThrow(
        'Workflow not found',
      );
    });
  });

  describe('create', () => {
    it('creates workflow with THRESHOLD template — 3 nodes, 2 connections', async () => {
      const { service, repository } = await createService();

      const seededWorkflow = buildWorkflow({ id: 'wf-new' });
      const n1 = buildWorkflowNode({
        id: 'n-1',
        type: NodeType.TRIGGER_THRESHOLD,
      });
      const n2 = buildWorkflowNode({
        id: 'n-2',
        type: NodeType.OUTPUT_MESSAGE,
      });
      const n3 = buildWorkflowNode({
        id: 'n-3',
        type: NodeType.RECIPIENT_EMAIL,
      });

      // create() returns the bare row; getById() is called at the end
      repository.create.mockResolvedValueOnce(seededWorkflow);
      repository.createNode
        .mockResolvedValueOnce(n1)
        .mockResolvedValueOnce(n2)
        .mockResolvedValueOnce(n3);
      repository.findById.mockResolvedValueOnce({
        ...seededWorkflow,
        nodes: [n1, n2, n3],
        connections: [],
      });

      await service.create('My Alert', WorkflowTemplate.THRESHOLD, 'user-1');

      expect(repository.create).toHaveBeenCalledWith({
        name: 'My Alert',
        createdBy: 'user-1',
      });
      expect(repository.createNode).toHaveBeenCalledTimes(3);
      expect(repository.createConnection).toHaveBeenCalledTimes(2);
    });

    it('creates workflow with SCRATCH template — 1 node, 0 connections', async () => {
      const { service, repository } = await createService();

      const scratchWorkflow = buildWorkflow({ id: 'wf-scratch' });
      const triggerNode = buildWorkflowNode({
        id: 'n-1',
        type: NodeType.TRIGGER_THRESHOLD,
      });

      repository.create.mockResolvedValueOnce(scratchWorkflow);
      repository.createNode.mockResolvedValueOnce(triggerNode);
      repository.findById.mockResolvedValueOnce({
        ...scratchWorkflow,
        nodes: [triggerNode],
        connections: [],
      });

      await service.create('Scratch', WorkflowTemplate.SCRATCH, 'user-1');

      expect(repository.createNode).toHaveBeenCalledTimes(1);
      expect(repository.createConnection).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates workflow name after lightweight ownership check', async () => {
      const { service, repository } = await createService();

      const result = await service.update('wf-1', 'New Name', 'user-1');

      expect(repository.findOwnerById).toHaveBeenCalledWith('wf-1');
      expect(repository.updateName).toHaveBeenCalledWith('wf-1', 'New Name');
      expect(result.name).toBe('Updated');
    });

    it('throws FORBIDDEN when user is not the owner', async () => {
      const { service, repository } = await createService();
      repository.findOwnerById.mockResolvedValueOnce({
        id: 'wf-1',
        createdBy: 'other-user',
      });

      await expect(service.update('wf-1', 'Hack', 'user-1')).rejects.toThrow(
        'You do not own this workflow',
      );
    });

    it('throws NOT_FOUND when workflow does not exist', async () => {
      const { service, repository } = await createService();
      repository.findOwnerById.mockResolvedValueOnce(null);

      await expect(service.update('missing', 'New', 'user-1')).rejects.toThrow(
        'Workflow not found',
      );
    });

    it('throws NOT_FOUND when updateName returns null (row deleted mid-flight)', async () => {
      const { service, repository } = await createService();
      repository.updateName.mockResolvedValueOnce(null);

      await expect(service.update('wf-1', 'New', 'user-1')).rejects.toThrow(
        'Workflow not found',
      );
    });
  });

  describe('toggleActive', () => {
    it('deactivates a workflow', async () => {
      const { service, repository } = await createService();

      const result = await service.toggleActive('wf-1', false, 'user-1');

      expect(repository.updateIsActive).toHaveBeenCalledWith('wf-1', false);
      expect(result.isActive).toBe(false);
    });

    it('activates a workflow', async () => {
      const { service, repository } = await createService();
      repository.updateIsActive.mockResolvedValueOnce(
        buildWorkflow({ isActive: true }),
      );

      const result = await service.toggleActive('wf-1', true, 'user-1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('delete', () => {
    it('checks ownership then deletes', async () => {
      const { service, repository } = await createService();

      await service.delete('wf-1', 'user-1');

      expect(repository.findOwnerById).toHaveBeenCalledWith('wf-1');
      expect(repository.deleteById).toHaveBeenCalledWith('wf-1');
    });

    it('throws FORBIDDEN if caller does not own the workflow', async () => {
      const { service, repository } = await createService();
      repository.findOwnerById.mockResolvedValueOnce({
        id: 'wf-1',
        createdBy: 'other-user',
      });

      await expect(service.delete('wf-1', 'user-1')).rejects.toThrow(
        'You do not own this workflow',
      );
    });
  });

  describe('addNode', () => {
    it('creates a node after ownership check', async () => {
      const { service, repository } = await createService();

      const input = {
        type: NodeType.OUTPUT_MESSAGE,
        name: 'Alert Message',
        data: { template: 'Hello {{trigger.value}}' },
        position: { x: 100, y: 200 },
      };

      await service.addNode('wf-1', input, 'user-1');

      expect(repository.createNode).toHaveBeenCalledWith({
        workflowId: 'wf-1',
        ...input,
      });
    });
  });

  describe('removeNode', () => {
    it('checks node ownership then deletes', async () => {
      const { service, repository } = await createService();

      await service.removeNode('n-1', 'user-1');

      expect(repository.findNodeOwner).toHaveBeenCalledWith('n-1');
      expect(repository.deleteNode).toHaveBeenCalledWith('n-1');
    });

    it('throws FORBIDDEN when user does not own the node', async () => {
      const { service, repository } = await createService();
      repository.findNodeOwner.mockResolvedValueOnce({
        workflowId: 'wf-1',
        createdBy: 'other-user',
      });

      await expect(service.removeNode('n-1', 'user-1')).rejects.toThrow(
        'You do not own this workflow',
      );
    });

    it('throws NOT_FOUND when node does not exist', async () => {
      const { service, repository } = await createService();
      repository.findNodeOwner.mockResolvedValueOnce(null);

      await expect(service.removeNode('missing', 'user-1')).rejects.toThrow(
        'Node not found',
      );
    });
  });

  describe('updateNodeData', () => {
    it('updates data after ownership check', async () => {
      const { service, repository } = await createService();

      const newData = { template: 'Updated {{trigger.value}}' };
      await service.updateNodeData('n-1', newData, 'user-1');

      expect(repository.findNodeOwner).toHaveBeenCalledWith('n-1');
      expect(repository.updateNodeData).toHaveBeenCalledWith('n-1', newData);
    });
  });

  describe('updateNodePosition', () => {
    it('updates position after ownership check', async () => {
      const { service, repository } = await createService();

      const newPos = { x: 300, y: 400 };
      await service.updateNodePosition('n-1', newPos, 'user-1');

      expect(repository.updateNodePosition).toHaveBeenCalledWith('n-1', newPos);
    });
  });

  describe('addConnection', () => {
    it('creates a valid connection after cycle detection passes', async () => {
      const { service, repository } = await createService();

      const n1 = buildWorkflowNode({
        id: 'n-1',
        type: NodeType.TRIGGER_THRESHOLD,
      });
      const n2 = buildWorkflowNode({
        id: 'n-2',
        type: NodeType.OUTPUT_MESSAGE,
      });
      repository.findById.mockResolvedValueOnce({
        ...buildWorkflow(),
        nodes: [n1, n2],
        connections: [],
      });

      await service.addConnection(
        { workflowId: 'wf-1', fromNodeId: 'n-1', toNodeId: 'n-2' },
        'user-1',
      );

      expect(repository.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({ fromNodeId: 'n-1', toNodeId: 'n-2' }),
      );
    });

    it('throws BAD_REQUEST when adding a connection that creates a cycle', async () => {
      const { service, repository } = await createService();

      // Existing: n-1 → n-2
      repository.findConnectionsByWorkflowId.mockResolvedValueOnce([
        buildWorkflowConnection({ fromNodeId: 'n-1', toNodeId: 'n-2' }),
      ]);

      const n1 = buildWorkflowNode({
        id: 'n-1',
        type: NodeType.TRIGGER_THRESHOLD,
      });
      const n2 = buildWorkflowNode({
        id: 'n-2',
        type: NodeType.OUTPUT_MESSAGE,
      });
      repository.findById.mockResolvedValueOnce({
        ...buildWorkflow(),
        nodes: [n1, n2],
        connections: [
          buildWorkflowConnection({ fromNodeId: 'n-1', toNodeId: 'n-2' }),
        ],
      });

      // Adding n-2 → n-1 would close the cycle
      await expect(
        service.addConnection(
          { workflowId: 'wf-1', fromNodeId: 'n-2', toNodeId: 'n-1' },
          'user-1',
        ),
      ).rejects.toThrow('This connection would create a cycle');
    });
  });

  describe('removeConnection', () => {
    it('checks ownership then deletes the connection', async () => {
      const { service, repository } = await createService();

      await service.removeConnection('conn-1', 'user-1');

      expect(repository.findConnectionOwner).toHaveBeenCalledWith('conn-1');
      expect(repository.deleteConnection).toHaveBeenCalledWith('conn-1');
    });

    it('throws FORBIDDEN when user does not own the connection', async () => {
      const { service, repository } = await createService();
      repository.findConnectionOwner.mockResolvedValueOnce({
        workflowId: 'wf-1',
        createdBy: 'other-user',
      });

      await expect(
        service.removeConnection('conn-1', 'user-1'),
      ).rejects.toThrow('You do not own this workflow');
    });

    it('throws NOT_FOUND when connection does not exist', async () => {
      const { service, repository } = await createService();
      repository.findConnectionOwner.mockResolvedValueOnce(null);

      await expect(
        service.removeConnection('missing', 'user-1'),
      ).rejects.toThrow('Connection not found');
    });
  });
});
