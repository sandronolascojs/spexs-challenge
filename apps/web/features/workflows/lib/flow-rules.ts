import type { Edge } from '@xyflow/react';

/**
 * Client-side cycle detection for the canvas.
 * Checks if adding an edge from `sourceNodeId` to `targetNodeId` would
 * create a cycle in the existing graph.
 */
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
