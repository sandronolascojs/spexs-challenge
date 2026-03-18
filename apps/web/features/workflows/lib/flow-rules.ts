import {
  type WorkflowCanvasEdge,
  type WorkflowCanvasNodePosition,
  type WorkflowCanvasState,
  workflowCanvasNodePositionSchema,
} from '@spexs/types';
import type { Edge, Node } from '@xyflow/react';

const CANVAS_NODE_KIND = workflowCanvasNodePositionSchema.shape.kind.enum;

function getNodeKindFromNodeType(
  type: string,
): WorkflowCanvasNodePosition['kind'] | null {
  if (type === CANVAS_NODE_KIND.TRIGGER) {
    return CANVAS_NODE_KIND.TRIGGER;
  }
  if (type === CANVAS_NODE_KIND.MESSAGE) {
    return CANVAS_NODE_KIND.MESSAGE;
  }
  if (type === CANVAS_NODE_KIND.RECIPIENT) {
    return CANVAS_NODE_KIND.RECIPIENT;
  }

  return null;
}

export function createsCycle(
  existingEdges: readonly Edge[],
  sourceNodeId: string,
  targetNodeId: string,
): boolean {
  if (sourceNodeId === targetNodeId) {
    return true;
  }

  const adjacencyByNodeId = new Map<string, string[]>();

  for (const edge of existingEdges) {
    const existingTargets = adjacencyByNodeId.get(edge.source) ?? [];
    existingTargets.push(edge.target);
    adjacencyByNodeId.set(edge.source, existingTargets);
  }

  const newTargets = adjacencyByNodeId.get(sourceNodeId) ?? [];
  newTargets.push(targetNodeId);
  adjacencyByNodeId.set(sourceNodeId, newTargets);

  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    const neighbors = adjacencyByNodeId.get(nodeId) ?? [];
    for (const neighborId of neighbors) {
      if (dfs(neighborId)) {
        return true;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return dfs(sourceNodeId);
}

export function buildWorkflowCanvasState(
  nodes: readonly Node[],
  edges: readonly Edge[],
  existingCanvasState: WorkflowCanvasState,
): WorkflowCanvasState {
  const persistedNodePositions = nodes
    .map((node) => {
      const kind = getNodeKindFromNodeType(node.type ?? '');
      if (!kind) {
        return null;
      }

      return {
        nodeId: node.id,
        kind,
        x: node.position.x,
        y: node.position.y,
      };
    })
    .filter(
      (
        nodePosition,
      ): nodePosition is WorkflowCanvasState['nodePositions'][number] =>
        nodePosition !== null,
    );

  const connectedEdges: WorkflowCanvasEdge[] = edges.map((edge) => ({
    edgeId: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandleId: edge.sourceHandle ?? null,
    targetHandleId: edge.targetHandle ?? null,
  }));

  const draftEdges = existingCanvasState.edges.filter(
    (edge) => edge.sourceNodeId === null || edge.targetNodeId === null,
  );

  const edgesById = new Map<string, WorkflowCanvasEdge>();
  for (const edge of [...connectedEdges, ...draftEdges]) {
    edgesById.set(edge.edgeId, edge);
  }

  return {
    nodePositions: persistedNodePositions,
    edges: [...edgesById.values()],
  };
}
