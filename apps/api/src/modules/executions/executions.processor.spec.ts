import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NodeExecution } from '@spexs/db';
import {
  AlertEventStatus,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeType,
} from '@spexs/types';
import {
  buildAlertEvent,
  buildExecutorNode,
  buildMockEmailService,
  buildMockNotificationsService,
  buildNodeExecution,
} from '../../test-utils/factories';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  type ExecutionJobData,
  ExecutionsProcessor,
} from './executions.processor';
import { ExecutionsRepository } from './executions.repository';

// Silence NestJS logger output during tests — error logs from intentional
// failure paths pollute the test runner console.
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});

// ── Mock types ───────────────────────────────────────────────────────────────

type MockRepo = {
  [K in keyof ExecutionsRepository]: jest.Mock;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRepository(): MockRepo {
  return {
    getNodeExecutionStatus: jest.fn().mockResolvedValue(null),
    updateNodeExecutionStatus: jest
      .fn()
      .mockResolvedValue(buildNodeExecution()),
    updateExecutionStatus: jest.fn().mockResolvedValue({}),
    findOpenAlertEvent: jest.fn().mockResolvedValue(null),
    createAlertEvent: jest.fn().mockResolvedValue(buildAlertEvent()),
    updateAlertEventStepLogs: jest.fn().mockResolvedValue(undefined),
    updateAlertEventExecutionId: jest.fn().mockResolvedValue(undefined),
    resolveAlertEvent: jest.fn().mockResolvedValue(undefined),
    createExecution: jest.fn(),
    createNodeExecutions: jest.fn(),
    findExecutionById: jest.fn(),
    findByWorkflowId: jest.fn(),
    loadWorkflowGraph: jest.fn(),
    findActiveExecution: jest.fn(),
    findExecutionProgress: jest.fn(),
    findLastExecution: jest.fn(),
    findExecutionWithDetails: jest.fn(),
    addNodeExecutionComment: jest.fn(),
    findAllRunningExecutions: jest.fn(),
    findCommentsByNodeExecutionId: jest.fn(),
  };
}

function makeJobData(
  overrides: Partial<ExecutionJobData> = {},
): ExecutionJobData {
  return {
    executionId: 'exec-1',
    sortedNodes: [],
    nodeExecutionIdByNodeId: {},
    triggerData: {},
    userId: 'user-1',
    ...overrides,
  };
}

async function createProcessor() {
  const repository = createMockRepository();
  const emailService = buildMockEmailService();
  const notificationsService = buildMockNotificationsService();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ExecutionsProcessor,
      { provide: ExecutionsRepository, useValue: repository },
      { provide: EmailService, useValue: emailService },
      { provide: NotificationsService, useValue: notificationsService },
      { provide: 'BullQueue_executions', useValue: {} },
    ],
  }).compile();

  const processor = module.get<ExecutionsProcessor>(ExecutionsProcessor);

  return { processor, repository, emailService, notificationsService };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExecutionsProcessor', () => {
  describe('successful execution flow', () => {
    it('executes a threshold trigger → output message → email pipeline', async () => {
      const { processor, repository } = await createProcessor();

      const triggerNode = buildExecutorNode({
        id: 'trigger-1',
        type: NodeType.TRIGGER_THRESHOLD,
        data: {
          metricName: 'cpu_usage',
          operator: 'gt',
          thresholdValue: 80,
        },
      });
      const messageNode = buildExecutorNode({
        id: 'msg-1',
        type: NodeType.OUTPUT_MESSAGE,
        data: {
          template: 'Alert: {{trigger.metricName}} is {{trigger.value}}',
        },
      });
      const emailNode = buildExecutorNode({
        id: 'email-1',
        type: NodeType.RECIPIENT_EMAIL,
        data: { emails: ['admin@test.com'] },
      });

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [triggerNode, messageNode, emailNode],
          nodeExecutionIdByNodeId: {
            'trigger-1': 'ne-1',
            'msg-1': 'ne-2',
            'email-1': 'ne-3',
          },
          triggerData: { value: 95 },
        }),
      );

      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-1',
        NodeExecutionStatus.RUNNING,
        expect.objectContaining({ startedAt: expect.any(Date) }),
      );
      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-1',
        NodeExecutionStatus.SUCCESS,
        expect.objectContaining({ outputData: expect.any(Object) }),
      );
      expect(repository.updateExecutionStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.SUCCESS,
        expect.objectContaining({ output: expect.any(Object) }),
      );
      expect(repository.createAlertEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          executionId: 'exec-1',
          status: AlertEventStatus.OPEN,
        }),
      );
    });

    it('marks remaining nodes SKIPPED when trigger does not fire', async () => {
      const { processor, repository } = await createProcessor();

      const triggerNode = buildExecutorNode({
        id: 'trigger-1',
        type: NodeType.TRIGGER_THRESHOLD,
        data: { metricName: 'cpu_usage', operator: 'gt', thresholdValue: 80 },
      });
      const messageNode = buildExecutorNode({
        id: 'msg-1',
        type: NodeType.OUTPUT_MESSAGE,
        data: { template: 'Alert!' },
      });

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [triggerNode, messageNode],
          nodeExecutionIdByNodeId: { 'trigger-1': 'ne-1', 'msg-1': 'ne-2' },
          triggerData: { value: 50 },
        }),
      );

      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-2',
        NodeExecutionStatus.SKIPPED,
      );
      expect(repository.createAlertEvent).not.toHaveBeenCalled();
      expect(repository.updateExecutionStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.SUCCESS,
        expect.any(Object),
      );
    });
  });

  describe('idempotency', () => {
    it('skips already-successful nodes and links existing event', async () => {
      const { processor, repository } = await createProcessor();

      const successfulNodeExec: Pick<NodeExecution, 'status' | 'outputData'> = {
        status: NodeExecutionStatus.SUCCESS,
        outputData: { trigger: { triggered: true, value: 95 } },
      };
      repository.getNodeExecutionStatus.mockResolvedValueOnce(
        successfulNodeExec,
      );

      const existingEvent = buildAlertEvent({ id: 'existing-event' });
      repository.findOpenAlertEvent.mockResolvedValueOnce(existingEvent);

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [
            buildExecutorNode({
              id: 'trigger-1',
              type: NodeType.TRIGGER_THRESHOLD,
              data: { metricName: 'cpu', operator: 'gt', thresholdValue: 80 },
            }),
            buildExecutorNode({
              id: 'msg-1',
              type: NodeType.OUTPUT_MESSAGE,
              data: { template: 'Alert!' },
            }),
          ],
          nodeExecutionIdByNodeId: { 'trigger-1': 'ne-1', 'msg-1': 'ne-2' },
        }),
      );

      expect(repository.updateAlertEventExecutionId).toHaveBeenCalledWith(
        'existing-event',
        'exec-1',
      );
    });

    it('skips downstream when OPEN alert already exists', async () => {
      const { processor, repository } = await createProcessor();

      repository.findOpenAlertEvent.mockResolvedValueOnce(
        buildAlertEvent({ id: 'existing-event' }),
      );

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [
            buildExecutorNode({
              id: 'trigger-1',
              type: NodeType.TRIGGER_THRESHOLD,
              data: { metricName: 'cpu', operator: 'gt', thresholdValue: 80 },
            }),
            buildExecutorNode({
              id: 'msg-1',
              type: NodeType.OUTPUT_MESSAGE,
              data: { template: 'Alert!' },
            }),
          ],
          nodeExecutionIdByNodeId: { 'trigger-1': 'ne-1', 'msg-1': 'ne-2' },
          triggerData: { value: 95 },
        }),
      );

      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-2',
        NodeExecutionStatus.SKIPPED,
      );
      expect(repository.createAlertEvent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('marks execution FAILED when a node executor throws', async () => {
      const { processor, repository } = await createProcessor();

      repository.findOpenAlertEvent.mockResolvedValueOnce(null);

      await expect(
        processor.executeWorkflow(
          makeJobData({
            sortedNodes: [
              buildExecutorNode({
                id: 'trigger-1',
                type: NodeType.MANUAL_TRIGGER,
              }),
              buildExecutorNode({
                id: 'msg-1',
                type: NodeType.OUTPUT_MESSAGE,
                data: {},
              }),
            ],
            nodeExecutionIdByNodeId: { 'trigger-1': 'ne-1', 'msg-1': 'ne-2' },
          }),
        ),
      ).rejects.toThrow();

      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-2',
        NodeExecutionStatus.FAILED,
        expect.objectContaining({ error: expect.any(String) }),
      );
      expect(repository.updateExecutionStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.FAILED,
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it('skips nodes with no nodeExecutionId mapping', async () => {
      const { processor, repository } = await createProcessor();

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [
            buildExecutorNode({
              id: 'trigger-1',
              type: NodeType.MANUAL_TRIGGER,
            }),
          ],
          nodeExecutionIdByNodeId: {},
        }),
      );

      expect(repository.updateNodeExecutionStatus).not.toHaveBeenCalled();
      expect(repository.updateExecutionStatus).toHaveBeenCalledWith(
        'exec-1',
        ExecutionStatus.SUCCESS,
        expect.any(Object),
      );
    });
  });

  describe('manual trigger flow', () => {
    it('executes full pipeline and creates alert event', async () => {
      const { processor, repository } = await createProcessor();

      await processor.executeWorkflow(
        makeJobData({
          sortedNodes: [
            buildExecutorNode({
              id: 'trigger-1',
              type: NodeType.MANUAL_TRIGGER,
            }),
            buildExecutorNode({
              id: 'msg-1',
              type: NodeType.OUTPUT_MESSAGE,
              data: { template: 'Manual run executed' },
            }),
          ],
          nodeExecutionIdByNodeId: { 'trigger-1': 'ne-1', 'msg-1': 'ne-2' },
        }),
      );

      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-1',
        NodeExecutionStatus.SUCCESS,
        expect.any(Object),
      );
      expect(repository.updateNodeExecutionStatus).toHaveBeenCalledWith(
        'ne-2',
        NodeExecutionStatus.SUCCESS,
        expect.any(Object),
      );
      expect(repository.createAlertEvent).toHaveBeenCalled();
    });
  });
});
