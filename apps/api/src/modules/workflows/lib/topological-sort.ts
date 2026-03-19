import type { WorkflowConnection, WorkflowNode } from '@spexs/db';
import { TRPCError } from '@trpc/server';
import toposort from 'toposort';

/**
 * Returns the workflow nodes in topological execution order.
 *
 * Uses Kahn's algorithm (via the `toposort` library) to sort nodes based
 * on their connections. Throws a `TRPCError` if the graph contains a cycle.
 *
 * @param nodes – all nodes belonging to the workflow
 * @param connections – all connections belonging to the workflow
 * @returns nodes sorted so every node comes after all its dependencies
 */
export function topologicalSortNodes(
  nodes: readonly WorkflowNode[],
  connections: readonly WorkflowConnection[],
): WorkflowNode[] {
  const nodeById = new Map<string, WorkflowNode>(
    nodes.map((node) => [node.id, node]),
  );

  // Build edge list for toposort: [fromNodeId, toNodeId]
  const edges: [string, string][] = connections.map((connection) => [
    connection.fromNodeId,
    connection.toNodeId,
  ]);

  let sortedIds: string[];

  try {
    sortedIds = toposort.array([...nodeById.keys()], edges);
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Workflow graph contains a cycle',
    });
  }

  return sortedIds
    .map((id) => nodeById.get(id))
    .filter((node): node is WorkflowNode => node !== undefined);
}
