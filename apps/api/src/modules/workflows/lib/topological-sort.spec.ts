import type { WorkflowConnection, WorkflowNode } from '@spexs/db';
import { NodeType } from '@spexs/types';
import { topologicalSortNodes } from './topological-sort';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  type: NodeType = NodeType.OUTPUT_MESSAGE,
): WorkflowNode {
  return {
    id,
    workflowId: 'wf-1',
    type,
    name: `Node ${id}`,
    data: {},
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeConnection(
  id: string,
  fromNodeId: string,
  toNodeId: string,
): WorkflowConnection {
  return {
    id,
    workflowId: 'wf-1',
    fromNodeId,
    toNodeId,
    fromOutput: 'main',
    toInput: 'main',
    createdAt: new Date(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('topologicalSortNodes', () => {
  it('returns a single node unchanged', () => {
    const nodes = [makeNode('a')];
    const result = topologicalSortNodes(nodes, []);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns nodes in dependency order for a linear chain', () => {
    const nodes = [makeNode('c'), makeNode('a'), makeNode('b')];
    const connections = [
      makeConnection('e1', 'a', 'b'),
      makeConnection('e2', 'b', 'c'),
    ];

    const result = topologicalSortNodes(nodes, connections);

    const ids = result.map((n) => n.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('handles a diamond DAG correctly', () => {
    // a → b, a → c, b → d, c → d
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const connections = [
      makeConnection('e1', 'a', 'b'),
      makeConnection('e2', 'a', 'c'),
      makeConnection('e3', 'b', 'd'),
      makeConnection('e4', 'c', 'd'),
    ];

    const result = topologicalSortNodes(nodes, connections);
    const ids = result.map((n) => n.id);

    // a must come before b, c; both b and c before d
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'));
  });

  it('includes disconnected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('standalone')];
    const connections = [makeConnection('e1', 'a', 'b')];

    const result = topologicalSortNodes(nodes, connections);

    expect(result).toHaveLength(3);
    const ids = result.map((n) => n.id);
    expect(ids).toContain('standalone');
  });

  it('throws a TRPCError when the graph has a cycle', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections = [
      makeConnection('e1', 'a', 'b'),
      makeConnection('e2', 'b', 'c'),
      makeConnection('e3', 'c', 'a'), // cycle
    ];

    expect(() => topologicalSortNodes(nodes, connections)).toThrow(
      'Workflow graph contains a cycle',
    );
  });

  it('throws a TRPCError for a self-loop', () => {
    const nodes = [makeNode('a')];
    const connections = [makeConnection('e1', 'a', 'a')];

    expect(() => topologicalSortNodes(nodes, connections)).toThrow(
      'Workflow graph contains a cycle',
    );
  });

  it('returns empty array for empty input', () => {
    const result = topologicalSortNodes([], []);
    expect(result).toEqual([]);
  });

  it('preserves the correct WorkflowNode objects (not just IDs)', () => {
    const nodeA = makeNode('a');
    nodeA.data = { metricName: 'cpu' };

    const result = topologicalSortNodes([nodeA], []);
    expect(result[0].data).toEqual({ metricName: 'cpu' });
  });
});
