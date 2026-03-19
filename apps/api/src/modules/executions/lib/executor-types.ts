import type { Notification } from '@spexs/db';
import type {
  CreateNotificationInput,
  ExecutorNode,
  SendEmailInput,
  SendEmailResult,
  WorkflowContext,
} from '@spexs/types';

// Re-export pure domain types so existing importers don't break
export type { ExecutorNode, WorkflowContext } from '@spexs/types';

/**
 * Narrow contract for the email service — only the method executors need.
 * The real EmailService satisfies this; tests can provide a plain mock.
 */
export interface ExecutorEmailService {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/**
 * Narrow contract for the notifications service — only the method executors need.
 * The real NotificationsService satisfies this; tests can provide a plain mock.
 */
export interface ExecutorNotificationsService {
  create(input: CreateNotificationInput): Promise<Notification>;
}

/**
 * Injectable services available to executors at runtime.
 * Passed from the processor so executors stay testable (no direct DI).
 */
export interface ExecutorServices {
  readonly email: ExecutorEmailService;
  readonly notifications: ExecutorNotificationsService;
}

/**
 * Input provided to each node executor.
 */
export interface NodeExecutorInput {
  /** Lean node data (id, type, workflowId, data) */
  readonly node: ExecutorNode;
  /** Accumulated context from all upstream nodes */
  readonly context: WorkflowContext;
  /** ID of the user who triggered the execution */
  readonly userId: string;
  /** Injectable services (email, notifications, etc.) */
  readonly services: ExecutorServices;
}

/**
 * A function that executes the logic for a specific node type.
 * Returns a new context that will be merged into the execution context.
 */
export type NodeExecutor = (
  input: NodeExecutorInput,
) => Promise<WorkflowContext>;
