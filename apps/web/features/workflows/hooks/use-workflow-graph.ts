import {
  type WorkflowCanvasState,
  workflowCanvasNodePositionSchema,
} from '@spexs/types';
import type { Edge } from '@xyflow/react';
import { useMemo } from 'react';
import type {
  MessageNode,
  RecipientNode,
  TriggerNode,
  WorkflowCanvasNode,
  WorkflowWithRecipients,
} from '../types/canvas';

const NODE_WIDTH = 320;
const TRIGGER_HEIGHT = 164;
const MESSAGE_HEIGHT = 120;
const VERTICAL_GAP = 72;
const HORIZONTAL_GAP = 24;

const ACTIVE_EDGE_STYLE = { stroke: '#6366f1', strokeWidth: 2 } as const;
const INACTIVE_EDGE_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2,
  strokeDasharray: '6 3',
} as const;
const CANVAS_NODE_KIND = workflowCanvasNodePositionSchema.shape.kind.enum;

function computeRecipientStartX(count: number): number {
  const totalWidth =
    count * NODE_WIDTH + Math.max(0, count - 1) * HORIZONTAL_GAP;
  return -(totalWidth / 2);
}

function getDefaultNodes(
  workflow: WorkflowWithRecipients,
): WorkflowCanvasNode[] {
  const triggerNode: TriggerNode = {
    id: 'trigger',
    type: CANVAS_NODE_KIND.TRIGGER,
    position: { x: -(NODE_WIDTH / 2), y: 0 },
    data: {
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggerType: workflow.triggerType,
      metricName: workflow.metricName,
      operator: workflow.operator,
      thresholdValue: workflow.thresholdValue,
      baseValue: workflow.baseValue,
      deviationPercentage: workflow.deviationPercentage,
      isActive: workflow.isActive,
    },
    draggable: true,
    selectable: true,
  };

  const messageY = TRIGGER_HEIGHT + VERTICAL_GAP;
  const messageNode: MessageNode = {
    id: 'message',
    type: CANVAS_NODE_KIND.MESSAGE,
    position: { x: -(NODE_WIDTH / 2), y: messageY },
    data: {
      workflowId: workflow.id,
      messageTemplate: workflow.messageTemplate,
    },
    draggable: true,
    selectable: true,
  };

  const recipientsY = messageY + MESSAGE_HEIGHT + VERTICAL_GAP;
  const startX = computeRecipientStartX(workflow.recipients.length);

  const recipientNodes: RecipientNode[] = workflow.recipients.map(
    (recipient, index) => ({
      id: `recipient-${recipient.id}`,
      type: CANVAS_NODE_KIND.RECIPIENT,
      position: {
        x: startX + index * (NODE_WIDTH + HORIZONTAL_GAP),
        y: recipientsY,
      },
      data: {
        workflowId: workflow.id,
        recipientId: recipient.id,
        channel: recipient.channel,
        recipient: recipient.recipient,
      },
      draggable: true,
      selectable: true,
    }),
  );

  return [triggerNode, messageNode, ...recipientNodes];
}

export function useWorkflowGraph(workflow: WorkflowWithRecipients) {
  return useMemo(() => {
    const defaultNodes = getDefaultNodes(workflow);
    const defaultNodePositionsById = new Map(
      defaultNodes.map((node) => [node.id, node.position]),
    );
    const canvasState: WorkflowCanvasState = workflow.canvasState ?? {
      nodePositions: [],
      edges: [],
    };

    const edgeStyle = workflow.isActive
      ? ACTIVE_EDGE_STYLE
      : INACTIVE_EDGE_STYLE;
    const nodeIds = new Set(defaultNodes.map((node) => node.id));
    const nodePositionsById = new Map(
      canvasState.nodePositions.map((nodePosition) => [
        nodePosition.nodeId,
        { x: nodePosition.x, y: nodePosition.y },
      ]),
    );

    const nodes = defaultNodes.map((node) => ({
      ...node,
      position: nodePositionsById.get(node.id) ??
        defaultNodePositionsById.get(node.id) ?? { x: 0, y: 0 },
    }));

    const storedConnectedEdges = canvasState.edges.filter(
      (edge) =>
        edge.sourceNodeId !== null &&
        edge.targetNodeId !== null &&
        nodeIds.has(edge.sourceNodeId) &&
        nodeIds.has(edge.targetNodeId),
    );

    const edges: Edge[] = storedConnectedEdges.map((edge) => ({
      id: edge.edgeId,
      source: edge.sourceNodeId ?? '',
      target: edge.targetNodeId ?? '',
      sourceHandle: edge.sourceHandleId ?? undefined,
      targetHandle: edge.targetHandleId ?? undefined,
      type: 'smoothstep',
      animated: workflow.isActive,
      style: edgeStyle,
    }));

    return { nodes, edges };
  }, [workflow]);
}
