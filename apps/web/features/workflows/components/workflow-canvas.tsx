'use client';

import { ZoomSelect } from '@/components/ui/react-flow/zoom-select';
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTRPC } from '@/lib/trpc/client';
import { type CreateWorkflowInput, createWorkflowSchema } from '@spexs/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useWorkflowGraph } from '../hooks/use-workflow-graph';
import { buildWorkflowCanvasState, createsCycle } from '../lib/flow-rules';
import { useWorkflowDialogStore } from '../stores/dialog-store';
import type { WorkflowWithRecipients } from '../types/canvas';
import { MessageNode } from './nodes/message-node';
import { RecipientNode } from './nodes/recipient-node';
import { TriggerNode } from './nodes/trigger-node';
import { TriggerWorkflowButton } from './trigger-workflow-button';
import { WorkflowNodeDialog } from './workflow-node-dialog';

// ── Node type registry ────────────────────────────────────────────────────────
// Defined outside the component to avoid re-registering on each render.
const NODE_TYPES: NodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  recipient: RecipientNode,
};

// ── Inner canvas ──────────────────────────────────────────────────────────────
// Separated so `useWorkflowGraph` stays inside the ReactFlowProvider tree.
function WorkflowCanvasInner({
  workflow,
}: { workflow: WorkflowWithRecipients }) {
  const { nodes: initialNodes, edges: initialEdges } =
    useWorkflowGraph(workflow);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const closeDialog = useWorkflowDialogStore((state) => state.closeDialog);

  const updateMutation = useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflow.id }),
        );
        await queryClient.invalidateQueries(trpc.workflows.list.queryFilter());
        closeDialog();
      },
    }),
  );

  const updateCanvasMutation = useMutation(
    trpc.workflows.updateCanvas.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.workflows.getById.queryFilter({ id: workflow.id }),
        );
      },
    }),
  );

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  function persistCanvasState(nextNodes: Node[], nextEdges: Edge[]) {
    const canvasState = buildWorkflowCanvasState(
      nextNodes,
      nextEdges,
      workflow.canvasState,
    );

    updateCanvasMutation.mutate({
      id: workflow.id,
      canvasState,
    });
  }

  function handleSaveWorkflow(nextInput: CreateWorkflowInput) {
    const validation = createWorkflowSchema.safeParse(nextInput);
    if (!validation.success) {
      return;
    }

    updateMutation.mutate({
      id: workflow.id,
      ...validation.data,
    });
  }

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    if (createsCycle(edges, connection.source, connection.target)) {
      return;
    }

    setEdges((currentEdges) => {
      const nextEdges = addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: workflow.isActive,
        },
        currentEdges,
      );
      persistCanvasState(nodes, nextEdges);
      return nextEdges;
    });
  };

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={(connection) => {
          if (!connection.source || !connection.target) {
            return false;
          }

          return !createsCycle(edges, connection.source, connection.target);
        }}
        onNodeDragStop={(_, nextNode) => {
          const nextNodes = nodes.map((node) =>
            node.id === nextNode.id
              ? { ...node, position: nextNode.position }
              : node,
          );
          persistCanvasState(nextNodes, edges);
        }}
        onReconnect={(oldEdge, newConnection) => {
          if (!newConnection.source || !newConnection.target) {
            return;
          }

          if (
            createsCycle(
              edges.filter((edge) => edge.id !== oldEdge.id),
              newConnection.source,
              newConnection.target,
            )
          ) {
            return;
          }

          setEdges((currentEdges) => {
            const nextEdges = reconnectEdge(
              oldEdge,
              newConnection,
              currentEdges,
            );
            persistCanvasState(nodes, nextEdges);
            return nextEdges;
          });
        }}
        onEdgesDelete={(deletedEdges) => {
          const deletedEdgeIds = new Set(deletedEdges.map((edge) => edge.id));
          const nextEdges = edges.filter(
            (edge) => !deletedEdgeIds.has(edge.id),
          );
          persistCanvasState(nodes, nextEdges);
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
        <Controls
          showInteractive={false}
          className="!border !border-border !bg-card !text-foreground shadow-sm [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground [&_button:hover]:!bg-accent [&_button:hover]:!text-accent-foreground [&_svg]:!text-foreground"
        />
        <ZoomSelect position="top-right" />
        <TriggerWorkflowButton workflow={workflow} />
      </ReactFlow>

      <WorkflowNodeDialog
        workflow={workflow}
        isSaving={updateMutation.isPending}
        onSave={handleSaveWorkflow}
      />
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

  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery(trpc.workflows.getById.queryOptions({ id: workflowId }));

  if (isLoading) return <CanvasLoading />;
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
