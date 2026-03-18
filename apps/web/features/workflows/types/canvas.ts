import type { AppRouter } from '@api/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { Node } from '@xyflow/react';

// ── tRPC-inferred types (single source of truth via router output) ────────────
type RouterOutput = inferRouterOutputs<AppRouter>;
export type WorkflowWithRecipients = RouterOutput['workflows']['getById'];
export type WorkflowListResponse = RouterOutput['workflows']['list'];
export type WorkflowListItem = WorkflowListResponse['items'][number];
export type WorkflowListMeta = WorkflowListResponse['meta'];

// ── Node data shapes (derived from the single source of truth) ────────────────
export type TriggerNodeData = {
  workflowId: WorkflowWithRecipients['id'];
  workflowName: WorkflowWithRecipients['name'];
  triggerType: WorkflowWithRecipients['triggerType'];
  metricName: WorkflowWithRecipients['metricName'];
  operator: WorkflowWithRecipients['operator'];
  thresholdValue: WorkflowWithRecipients['thresholdValue'];
  baseValue: WorkflowWithRecipients['baseValue'];
  deviationPercentage: WorkflowWithRecipients['deviationPercentage'];
  isActive: WorkflowWithRecipients['isActive'];
};

export type MessageNodeData = {
  workflowId: WorkflowWithRecipients['id'];
  messageTemplate: WorkflowWithRecipients['messageTemplate'];
};

export type RecipientNodeData = {
  workflowId: WorkflowWithRecipients['id'];
  recipientId: WorkflowWithRecipients['recipients'][number]['id'];
  channel: WorkflowWithRecipients['recipients'][number]['channel'];
  recipient: WorkflowWithRecipients['recipients'][number]['recipient'];
};

// ── React Flow node types ─────────────────────────────────────────────────────
export type TriggerNode = Node<TriggerNodeData, 'trigger'>;
export type MessageNode = Node<MessageNodeData, 'message'>;
export type RecipientNode = Node<RecipientNodeData, 'recipient'>;
export type WorkflowCanvasNode = TriggerNode | MessageNode | RecipientNode;
