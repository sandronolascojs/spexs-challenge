import type { NodeExecutionStatus } from '@spexs/types';
import type { Edge } from '@xyflow/react';
import { useMemo } from 'react';
import type {
  WorkflowCanvasNode,
  WorkflowConnectionRow,
  WorkflowDetail,
  WorkflowNodeRow,
} from '../types/canvas';

const ACTIVE_EDGE_STYLE = { stroke: '#6366f1', strokeWidth: 2 } as const;
const INACTIVE_EDGE_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2,
  strokeDasharray: '6 3',
} as const;

/**
 * Map node type to React Flow node type string for the `nodeTypes` registry.
 * All nodes use the generic 'workflow' node type.
 */
function toReactFlowNodeType(nodeType: string): string {
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
  const position = nodeRow.position as { x: number; y: number };

  return {
    id: nodeRow.id,
    type: toReactFlowNodeType(nodeRow.type),
    position: { x: position.x, y: position.y },
    data: {
      nodeId: nodeRow.id,
      nodeType: nodeRow.type,
      label: nodeRow.name,
      nodeData: (nodeRow.data ?? {}) as Record<string, unknown>,
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
    type: 'smoothstep',
    animated: isActive,
    style: isActive ? ACTIVE_EDGE_STYLE : INACTIVE_EDGE_STYLE,
  };
}

/**
 * Converts the workflow's DB-backed nodes and connections into React Flow
 * nodes and edges. This is the single source of truth for the canvas graph.
 */
export function useWorkflowGraph(
  workflow: WorkflowDetail,
  nodeStatuses?: Record<string, any>,
) {
  return useMemo(() => {
    const nodes = workflow.nodes.map((nodeRow) => {
      const statusData = nodeStatuses?.[nodeRow.id];
      const status = statusData ? statusData.status : undefined;
      return nodeRowToCanvasNode(
        nodeRow,
        workflow.id,
        workflow.isActive,
        status,
      );
    });

    const edges = workflow.connections.map((connection) =>
      connectionRowToEdge(connection, workflow.isActive),
    );

    return { nodes, edges };
  }, [workflow, nodeStatuses]);
}
