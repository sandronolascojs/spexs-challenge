import type { NodeExecutor, WorkflowContext } from '../executor-types';
import { isRecord } from '../type-guards';

/**
 * Creates a real in-app notification for the triggering user.
 * Reads the rendered message from context (set by the OutputMessage node)
 * and stores it via the NotificationsService.
 */
export const recipientInAppExecutor: NodeExecutor = async ({
  node,
  context,
  userId,
  services,
}) => {
  const messageEntry = context.message;
  const messageText =
    messageEntry !== null &&
    typeof messageEntry === 'object' &&
    'text' in messageEntry &&
    typeof messageEntry.text === 'string'
      ? messageEntry.text
      : '';

  const triggerEntry = context.trigger;
  const workflowId = node.workflowId;

  // Extract event id from context if the processor attached it
  const eventId =
    isRecord(context) && typeof context.activeEventId === 'string'
      ? context.activeEventId
      : undefined;

  await services.notifications.create({
    userId,
    workflowId,
    eventId,
    title: 'Alert triggered',
    message: messageText || 'A workflow alert condition was met.',
  });

  const output: WorkflowContext = {
    notification: {
      sent: true,
      channel: 'in_app',
      userId,
      message: messageText,
    },
  };

  return output;
};
