'use client';

import { ZoomSelect } from '@/components/ui/react-flow/zoom-select';
import {
  Background,
  BackgroundVariant,
  type Connection,
  type NodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc/client';
import { NodeExecutionStatus } from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkflowGraph } from '../hooks/use-workflow-graph';
import { createsCycle } from '../lib/flow-rules';
import { useWorkflowDialogStore } from '../stores/dialog-store';
import type { WorkflowDetail } from '../types/canvas';
import { NodePanel } from './node-panel';
import { WorkflowDialogs } from './nodes/edit/workflow-dialogs';
import { MessageNode } from './nodes/message-node';
import { RecipientNode } from './nodes/recipient-node';
import { TriggerNode } from './nodes/trigger-node';
import { TriggerWorkflowButton } from './trigger-workflow-button';

// ── Node type registry ────────────────────────────────────────────────────────
const NODE_TYPES: NodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  recipient: RecipientNode,
};

const EMPTY_STATUSES = {};

function WorkflowCanvasInner({ workflow }: { workflow: WorkflowDetail }) {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const setNodePanelOpen = useWorkflowDialogStore((s) => s.setNodePanelOpen);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: lastExecution } = useQuery(
    trpc.executions.getLastExecution.queryOptions({ workflowId: workflow.id }),
  );

  const { data: progressData } = useQuery({
    ...trpc.executions.getProgress.queryOptions({
      executionId: executionId || '',
    }),
    enabled: !!executionId,
    refetchInterval: executionId ? 1000 : false,
  });

  const nodeStatuses = progressData ?? EMPTY_STATUSES;
  const isExecuting = Object.values(nodeStatuses).some(
    (s: any) => s.status === NodeExecutionStatus.RUNNING,
  );

  const { nodes: initialNodes, edges: initialEdges } = useWorkflowGraph(
    workflow,
    nodeStatuses,
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const invalidateWorkflow = useCallback(() => {
    void queryClient.invalidateQueries(
      trpc.workflows.getById.queryFilter({ id: workflow.id }),
    );
    void queryClient.invalidateQueries(
      trpc.executions.getLastExecution.queryFilter({ workflowId: workflow.id }),
    );
  }, [queryClient, trpc, workflow.id]);

  // Detect when execution finishes (isExecuting: true → false) and refresh caches
  const wasExecutingRef = useRef(false);
  useEffect(() => {
    if (wasExecutingRef.current && !isExecuting && executionId) {
      invalidateWorkflow();
      setExecutionId(null);
    }
    wasExecutingRef.current = isExecuting;
  }, [isExecuting, executionId, invalidateWorkflow]);

  const removeNodeMutation = useMutation(
    trpc.workflows.removeNode.mutationOptions({
      onSuccess: invalidateWorkflow,
    }),
  );

  const addConnectionMutation = useMutation(
    trpc.workflows.addConnection.mutationOptions({
      onSuccess: invalidateWorkflow,
    }),
  );

  const removeConnectionMutation = useMutation(
    trpc.workflows.removeConnection.mutationOptions({
      onSuccess: invalidateWorkflow,
    }),
  );

  const updateNodePositionMutation = useMutation(
    trpc.workflows.updateNodePosition.mutationOptions(),
  );

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (createsCycle(edges, connection.source, connection.target)) return;

      // Optimistic: update local state immediately
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: workflow.isActive,
          },
          currentEdges,
        ),
      );

      // Persist to DB
      addConnectionMutation.mutate({
        workflowId: workflow.id,
        fromNodeId: connection.source,
        toNodeId: connection.target,
        fromOutput: connection.sourceHandle ?? 'main',
        toInput: connection.targetHandle ?? 'main',
      });
    },
    [edges, setEdges, workflow.isActive, workflow.id, addConnectionMutation],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={(connection) => {
          if (!connection.source || !connection.target) return false;
          return !createsCycle(edges, connection.source, connection.target);
        }}
        onNodeDragStop={(_, nextNode) => {
          updateNodePositionMutation.mutate({
            nodeId: nextNode.id,
            position: { x: nextNode.position.x, y: nextNode.position.y },
          });
        }}
        onReconnect={(oldEdge, newConnection) => {
          if (!newConnection.source || !newConnection.target) return;
          if (
            createsCycle(
              edges.filter((edge) => edge.id !== oldEdge.id),
              newConnection.source,
              newConnection.target,
            )
          )
            return;

          setEdges((currentEdges) =>
            reconnectEdge(oldEdge, newConnection, currentEdges),
          );

          // Remove old edge, create new connection
          removeConnectionMutation.mutate({ connectionId: oldEdge.id });
          addConnectionMutation.mutate({
            workflowId: workflow.id,
            fromNodeId: newConnection.source,
            toNodeId: newConnection.target,
            fromOutput: newConnection.sourceHandle ?? 'main',
            toInput: newConnection.targetHandle ?? 'main',
          });
        }}
        onEdgesDelete={(deletedEdges) => {
          for (const edge of deletedEdges) {
            removeConnectionMutation.mutate({ connectionId: edge.id });
          }
        }}
        onNodesDelete={(deletedNodes) => {
          for (const node of deletedNodes) {
            removeNodeMutation.mutate({ nodeId: node.id });
          }
        }}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={['Backspace', 'Delete']}
        className="h-full w-full bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          className="opacity-40"
        />
        <ZoomSelect position="top-right" />
        <Panel position="top-left" className="m-4">
          <Button
            size="sm"
            className="gap-1.5 shadow-sm"
            onClick={() => setNodePanelOpen(true)}
          >
            <Plus className="size-4" />
            Add Node
          </Button>
        </Panel>
        <TriggerWorkflowButton
          workflow={workflow}
          lastExecution={lastExecution}
          onTriggerSuccess={setExecutionId}
          isExecuting={isExecuting}
        />
      </ReactFlow>

      <NodePanel workflowId={workflow.id} />
      <WorkflowDialogs />
    </>
  );
}

// ── Loading / error states ─────────────────────────────────────────────────────
function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading workflow…</p>
      </div>
    </div>
  );
}

function CanvasError({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-destructive">
        <AlertCircle className="size-8" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────
interface WorkflowCanvasProps {
  workflowId: string;
}

export function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  const trpc = useTRPC();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery(trpc.workflows.getById.queryOptions({ id: workflowId }));

  if (!isMounted || isLoading) return <CanvasLoading />;
  if (error) return <CanvasError message="Failed to load workflow." />;
  if (!workflow) return <CanvasError message="Workflow not found." />;

  return (
    <ReactFlowProvider>
      <div className="h-full w-full overflow-hidden">
        <WorkflowCanvasInner workflow={workflow} />
      </div>
    </ReactFlowProvider>
  );
}
