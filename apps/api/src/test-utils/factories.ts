/**
 * Shared test factories and mock builders.
 *
 * Every factory returns a fully-typed object that matches the Drizzle
 * inferred row type — no `any`, no `as`, no `unknown`.
 */
import type {
  AlertEvent,
  Execution,
  NodeExecution,
  NodeExecutionComment,
  Notification,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
} from '@spexs/db';
import {
  AlertEventStatus,
  type CreateNotificationInput,
  ExecutionStatus,
  type ExecutorNode,
  NodeExecutionStatus,
  NodeType,
  type SendEmailInput,
  type SendEmailResult,
} from '@spexs/types';
import type {
  ExecutorEmailService,
  ExecutorNotificationsService,
  ExecutorServices,
} from '../modules/executions/lib/executor-types';

// ── Timestamp defaults ───────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T12:00:00.000Z');

// ── Workflow factories ───────────────────────────────────────────────────────

export function buildWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    isActive: true,
    createdBy: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildWorkflowNode(
  overrides: Partial<WorkflowNode> = {},
): WorkflowNode {
  return {
    id: 'node-1',
    workflowId: 'wf-1',
    type: NodeType.OUTPUT_MESSAGE,
    name: 'Node 1',
    data: {},
    position: { x: 0, y: 0 },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildWorkflowConnection(
  overrides: Partial<WorkflowConnection> = {},
): WorkflowConnection {
  return {
    id: 'conn-1',
    workflowId: 'wf-1',
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    fromOutput: 'main',
    toInput: 'main',
    createdAt: NOW,
    ...overrides,
  };
}

// ── Execution factories ──────────────────────────────────────────────────────

export function buildExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: 'exec-1',
    workflowId: 'wf-1',
    status: ExecutionStatus.RUNNING,
    triggeredBy: 'user-1',
    triggerData: {},
    error: null,
    output: null,
    startedAt: NOW,
    completedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

export function buildNodeExecution(
  overrides: Partial<NodeExecution> = {},
): NodeExecution {
  return {
    id: 'ne-1',
    executionId: 'exec-1',
    nodeId: 'node-1',
    status: NodeExecutionStatus.PENDING,
    inputData: null,
    outputData: null,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

export function buildExecutorNode(
  overrides: Partial<ExecutorNode> = {},
): ExecutorNode {
  return {
    id: 'node-1',
    type: NodeType.OUTPUT_MESSAGE,
    workflowId: 'wf-1',
    data: {},
    ...overrides,
  };
}

// ── Alert event factories ────────────────────────────────────────────────────

export function buildAlertEvent(
  overrides: Partial<AlertEvent> = {},
): AlertEvent {
  return {
    id: 'event-1',
    workflowId: 'wf-1',
    status: AlertEventStatus.OPEN,
    triggerData: {},
    stepLogs: [],
    executionId: null,
    createdAt: NOW,
    resolvedAt: null,
    snoozedUntil: null,
    ...overrides,
  };
}

// ── Notification factories ───────────────────────────────────────────────────

export function buildNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    workflowId: null,
    eventId: null,
    title: 'Test Notification',
    message: 'Test message',
    isRead: false,
    createdAt: NOW,
    ...overrides,
  };
}

// ── Node execution comment factories ─────────────────────────────────────────

export function buildNodeExecutionComment(
  overrides: Partial<NodeExecutionComment> = {},
): NodeExecutionComment {
  return {
    id: 'comment-1',
    nodeExecutionId: 'ne-1',
    userId: 'user-1',
    content: 'Test comment',
    createdAt: NOW,
    ...overrides,
  };
}

// ── Mock executor services ───────────────────────────────────────────────────

export interface MockEmailService extends ExecutorEmailService {
  send: jest.Mock<Promise<SendEmailResult>, [SendEmailInput]>;
}

export interface MockNotificationsService extends ExecutorNotificationsService {
  create: jest.Mock<Promise<Notification>, [CreateNotificationInput]>;
}

export function buildMockEmailService(
  sendResult: SendEmailResult = { sent: true, messageId: 'msg-123' },
): MockEmailService {
  return {
    send: jest
      .fn<Promise<SendEmailResult>, [SendEmailInput]>()
      .mockResolvedValue(sendResult),
  };
}

export function buildMockNotificationsService(): MockNotificationsService {
  return {
    create: jest
      .fn<Promise<Notification>, [CreateNotificationInput]>()
      .mockResolvedValue(buildNotification()),
  };
}

export function buildMockExecutorServices(overrides?: {
  emailResult?: SendEmailResult;
}): ExecutorServices & {
  email: MockEmailService;
  notifications: MockNotificationsService;
} {
  return {
    email: buildMockEmailService(overrides?.emailResult),
    notifications: buildMockNotificationsService(),
  };
}
