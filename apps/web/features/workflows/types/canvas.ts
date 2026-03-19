import type { AppRouter } from '@api/trpc';
import type { NodeExecutionStatus, NodeType } from '@spexs/types';
import type { inferRouterOutputs } from '@trpc/server';
import type { Node } from '@xyflow/react';

// ── tRPC-inferred types (single source of truth via router output) ────────────
type RouterOutput = inferRouterOutputs<AppRouter>;
export type WorkflowDetail = RouterOutput['workflows']['getById'];
export type WorkflowListResponse = RouterOutput['workflows']['list'];
export type WorkflowListItem = WorkflowListResponse['items'][number];
export type WorkflowListMeta = WorkflowListResponse['meta'];

// ── Node from the backend ─────────────────────────────────────────────────────
export type WorkflowNodeRow = WorkflowDetail['nodes'][number];
export type WorkflowConnectionRow = WorkflowDetail['connections'][number];

// ── Generic node data for the canvas ──────────────────────────────────────────
export interface WorkflowNodeData extends Record<string, unknown> {
  nodeId: string;
  nodeType: NodeType;
  label: string;
  nodeData: Record<string, unknown>;
  workflowId: string;
  isActive: boolean;
  executionStatus?: NodeExecutionStatus;
}

// ── React Flow node type ──────────────────────────────────────────────────────
export type WorkflowCanvasNode = Node<WorkflowNodeData>;

// ── Node status map for canvas polling ────────────────────────────────────────
/** Lightweight map of nodeId → execution status used by the canvas poller. */
export type NodeStatusMap = Record<string, { status: NodeExecutionStatus }>;
