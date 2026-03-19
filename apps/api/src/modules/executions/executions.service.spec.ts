import { Test, type TestingModule } from '@nestjs/testing';
import { ExecutionStatus, NodeExecutionStatus, NodeType } from '@spexs/types';
import type { Queue } from 'bullmq';
import {
  buildExecution,
  buildNodeExecution,
  buildWorkflow,
  buildWorkflowNode,
} from '../../test-utils/factories';
import type { ExecutionJobData } from './executions.processor';
import { ExecutionsRepository } from './executions.repository';
import { ExecutionsService } from './executions.service';

// ── Mock types ───────────────────────────────────────────────────────────────

type MockRepo = {
  [K in keyof ExecutionsRepository]: jest.Mock;
};

interface MockQueue {
  add: jest.Mock;
  getJobs: jest.Mock;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRepository(): MockRepo {
  const workflow = buildWorkflow();
  const node = buildWorkflowNode({
    type: NodeType.MANUAL_TRIGGER,
    name: 'Trigger',
  });

  return {
    findActiveExecution: jest.fn().mockResolvedValue(null),
    loadWorkflowGraph: jest.fn().mockResolvedValue({
      workflow,
      nodes: [node],
      connections: [],
    }),
    createExecution: jest
      .fn()
      .mockResolvedValue(buildExecution({ status: ExecutionStatus.RUNNING })),
    createNodeExecutions: jest
      .fn()
      .mockResolvedValue([buildNodeExecution({ nodeId: node.id })]),
    findExecutionById: jest.fn(),
    findByWorkflowId: jest.fn(),
    findExecutionProgress: jest.fn(),
    findLastExecution: jest.fn(),
    findExecutionWithDetails: jest.fn(),
    updateExecutionStatus: jest.fn().mockResolvedValue({}),
    updateNodeExecutionStatus: jest.fn(),
    getNodeExecutionStatus: jest.fn(),
    findOpenAlertEvent: jest.fn(),
    createAlertEvent: jest.fn(),
    updateAlertEventStepLogs: jest.fn(),
    updateAlertEventExecutionId: jest.fn(),
    resolveAlertEvent: jest.fn(),
    addNodeExecutionComment: jest.fn(),
    findAllRunningExecutions: jest.fn().mockResolvedValue([]),
    findCommentsByNodeExecutionId: jest.fn(),
  };
}

function createMockQueue(): MockQueue {
  return {
    add: jest.fn().mockResolvedValue({}),
    getJobs: jest.fn().mockResolvedValue([]),
  };
}

async function createService() {
  const repository = createMockRepository();
  const queue = createMockQueue();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ExecutionsService,
      { provide: ExecutionsRepository, useValue: repository },
      { provide: 'BullQueue_executions', useValue: queue },
    ],
  }).compile();

  const service = module.get<ExecutionsService>(ExecutionsService);

  return { service, repository, queue };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExecutionsService', () => {
  describe('execute', () => {
    it('creates execution, node executions, and enqueues a BullMQ job', async () => {
      const { service, repository, queue } = await createService();

      const result = await service.execute('wf-1', { value: 42 }, 'user-1');

      expect(result.executionId).toBe('exec-1');
      expect(repository.findActiveExecution).toHaveBeenCalledWith('wf-1');
      expect(repository.loadWorkflowGraph).toHaveBeenCalledWith('wf-1');
      expect(repository.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'user-1',
        }),
      );
      expect(repository.createNodeExecutions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            executionId: 'exec-1',
            status: NodeExecutionStatus.PENDING,
          }),
        ]),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'execute-workflow',
        expect.objectContaining({ executionId: 'exec-1', userId: 'user-1' }),
        expect.objectContaining({
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });

    it('throws CONFLICT if workflow is already running', async () => {
      const { service, repository } = await createService();
      repository.findActiveExecution.mockResolvedValueOnce(
        buildExecution({ id: 'exec-old', status: ExecutionStatus.RUNNING }),
      );

      await expect(service.execute('wf-1', {}, 'user-1')).rejects.toThrow(
        'Workflow is already running',
      );
    });

    it('throws NOT_FOUND if workflow does not exist', async () => {
      const { service, repository } = await createService();
      repository.loadWorkflowGraph.mockResolvedValueOnce(null);

      await expect(service.execute('wf-missing', {}, 'user-1')).rejects.toThrow(
        'Workflow not found',
      );
    });

    it('throws BAD_REQUEST if workflow is not active', async () => {
      const { service, repository } = await createService();
      repository.loadWorkflowGraph.mockResolvedValueOnce({
        workflow: buildWorkflow({ isActive: false }),
        nodes: [buildWorkflowNode()],
        connections: [],
      });

      await expect(service.execute('wf-1', {}, 'user-1')).rejects.toThrow(
        'Workflow is not active',
      );
    });

    it('throws BAD_REQUEST if workflow has no nodes', async () => {
      const { service, repository } = await createService();
      repository.loadWorkflowGraph.mockResolvedValueOnce({
        workflow: buildWorkflow(),
        nodes: [],
        connections: [],
      });

      await expect(service.execute('wf-1', {}, 'user-1')).rejects.toThrow(
        'Workflow has no nodes',
      );
    });
  });

  describe('retryExecution', () => {
    it('re-enqueues a failed execution and sets status to RUNNING', async () => {
      const { service, repository, queue } = await createService();

      const failedExecution = buildExecution({
        status: ExecutionStatus.FAILED,
        triggerData: { value: 42 },
      });
      repository.findExecutionById.mockResolvedValueOnce({
        ...failedExecution,
        nodeExecutions: [
          buildNodeExecution({
            id: 'ne-1',
            nodeId: 'node-1',
            status: NodeExecutionStatus.SUCCESS,
          }),
        ],
      });

      const result = await service.retryExecution('exec-1', 'user-1');

      expect(result.executionId).toBe('exec-1');
      expect(repository.updateExecutionStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.RUNNING,
        expect.objectContaining({ error: undefined }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'execute-workflow',
        expect.objectContaining({ executionId: 'exec-1' }),
        expect.any(Object),
      );
    });

    it('throws NOT_FOUND if execution does not exist', async () => {
      const { service, repository } = await createService();
      repository.findExecutionById.mockResolvedValueOnce(null);

      await expect(service.retryExecution('missing', 'user-1')).rejects.toThrow(
        'Execution not found',
      );
    });

    it('throws BAD_REQUEST if execution is not failed', async () => {
      const { service, repository } = await createService();
      repository.findExecutionById.mockResolvedValueOnce({
        ...buildExecution({ status: ExecutionStatus.SUCCESS }),
        nodeExecutions: [],
      });

      await expect(service.retryExecution('exec-1', 'user-1')).rejects.toThrow(
        'Only failed executions can be retried',
      );
    });
  });

  describe('getProgress', () => {
    it('returns execution progress from repository', async () => {
      const { service, repository } = await createService();

      const mockProgress = {
        executionId: 'exec-1',
        executionStatus: ExecutionStatus.RUNNING,
        nodeStatusByNodeId: {
          'n-1': { status: NodeExecutionStatus.SUCCESS, error: null },
        },
      };
      repository.findExecutionProgress.mockResolvedValueOnce(mockProgress);

      const result = await service.getProgress('exec-1');
      expect(result).toEqual(mockProgress);
    });

    it('throws NOT_FOUND if execution does not exist', async () => {
      const { service, repository } = await createService();
      repository.findExecutionProgress.mockResolvedValueOnce(null);

      await expect(service.getProgress('missing')).rejects.toThrow(
        'Execution not found',
      );
    });
  });

  describe('onApplicationBootstrap', () => {
    it('does nothing when there are no running executions', async () => {
      const { service, repository, queue } = await createService();

      await service.onApplicationBootstrap();

      expect(repository.findAllRunningExecutions).toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('re-enqueues orphaned running executions', async () => {
      const { service, repository, queue } = await createService();

      const orphan = buildExecution({ id: 'exec-orphan' });
      repository.findAllRunningExecutions.mockResolvedValueOnce([orphan]);
      repository.findExecutionById.mockResolvedValueOnce({
        ...orphan,
        nodeExecutions: [buildNodeExecution({ id: 'ne-1', nodeId: 'node-1' })],
      });
      queue.getJobs.mockResolvedValueOnce([]);

      await service.onApplicationBootstrap();

      expect(queue.add).toHaveBeenCalledWith(
        'execute-workflow',
        expect.objectContaining({ executionId: 'exec-orphan' }),
        expect.any(Object),
      );
    });

    it('skips re-enqueue if BullMQ job already exists', async () => {
      const { service, repository, queue } = await createService();

      repository.findAllRunningExecutions.mockResolvedValueOnce([
        buildExecution({ id: 'exec-active' }),
      ]);
      queue.getJobs.mockResolvedValueOnce([
        { data: { executionId: 'exec-active' } },
      ]);

      await service.onApplicationBootstrap();

      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
