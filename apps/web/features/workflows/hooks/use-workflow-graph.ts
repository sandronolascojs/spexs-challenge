import type { NodeExecutionStatus } from '@spexs/types';
import type { Edge } from '@xyflow/react';
import { useMemo } from 'react';
import type {
  NodeStatusMap,
  WorkflowCanvasNode,
  WorkflowConnectionRow,
  WorkflowDetail,
  WorkflowNodeRow,
} from '../types/canvas';

/**
 * Maps a DB node type string to the React Flow `nodeTypes` registry key.
 * Trigger variants → 'trigger', output_ → 'message', recipient_ → 'recipient'.
 */
function toReactFlowNodeType(nodeType: string): string {
  if (nodeType === 'manual_trigger') return 'manual-trigger';
  if (nodeType.startsWith('trigger_')) return 'trigger';
  if (nodeType.startsWith('output_')) return 'message';
  if (nodeType.startsWith('recipient_')) return 'recipient';
  return 'default';
}

function nodeRowToCanvasNode(
  nodeRow: WorkflowNodeRow,
  workflowId: string,
  isActive: boolean,
  executionStatus?: NodeExecutionStatus,
): WorkflowCanvasNode {
  return {
    id: nodeRow.id,
    type: toReactFlowNodeType(nodeRow.type),
    position: { x: nodeRow.position.x, y: nodeRow.position.y },
    data: {
      nodeId: nodeRow.id,
      nodeType: nodeRow.type,
      label: nodeRow.name,
      nodeData: nodeRow.data ?? {},
      workflowId,
      isActive,
      executionStatus,
    },
    draggable: true,
    selectable: true,
  };
}

function connectionRowToEdge(
  connection: WorkflowConnectionRow,
  isActive: boolean,
): Edge {
  return {
    id: connection.id,
    source: connection.fromNodeId,
    target: connection.toNodeId,
    sourceHandle: connection.fromOutput,
    targetHandle: connection.toInput,
    type: isActive ? 'workflow-animated' : 'workflow-default',
  };
}

/**
 * Converts the workflow's DB-backed nodes and connections into React Flow
 * nodes and edges. This is the single source of truth for the canvas graph.
 */
export function useWorkflowGraph(
  workflow: WorkflowDetail,
  nodeStatuses?: NodeStatusMap,
) {
  return useMemo(() => {
    const nodes = workflow.nodes.map((nodeRow) => {
      const progressEntry = nodeStatuses?.[nodeRow.id];
      return nodeRowToCanvasNode(
        nodeRow,
        workflow.id,
        workflow.isActive,
        progressEntry?.status,
      );
    });

    const edges = workflow.connections.map((connection) =>
      connectionRowToEdge(connection, workflow.isActive),
    );

    return { nodes, edges };
  }, [workflow, nodeStatuses]);
}
