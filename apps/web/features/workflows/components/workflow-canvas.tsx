'use client';

import { ZoomControls } from '@/components/ui/react-flow/zoom-controls';
import { ZoomSelect } from '@/components/ui/react-flow/zoom-select';
import {
  Background,
  BackgroundVariant,
  type Connection,
  type EdgeTypes,
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
import { ExecutionStatus, NodeType } from '@spexs/types';
import { AlertCircle, Loader2, Play, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useExecutionProgress,
  useLastExecution,
  useRetryExecution,
} from '../hooks/http/use-executions';
import {
  useAddConnection,
  useRemoveConnection,
  useRemoveNode,
  useUpdateNodeData,
  useUpdateNodePosition,
  useWorkflow,
} from '../hooks/http/use-workflows';
import { useWorkflowGraph } from '../hooks/use-workflow-graph';
import { createsCycle } from '../lib/flow-rules';
import { useWorkflowDialogStore } from '../stores/dialog-store';
import { useExecutionStore } from '../stores/execution-store';
import type { NodeStatusMap, WorkflowDetail } from '../types/canvas';
import { WorkflowConnectionLine } from './edges/connection-line';
import { WORKFLOW_EDGE_TYPES } from './edges/workflow-edge';
import { NodePanel } from './node-panel';
import { ManualTriggerNode } from './nodes/manual-trigger/manual-trigger-node';
import { MessageNode } from './nodes/message/message-node';
import { RecipientNode } from './nodes/recipient/recipient-node';
import { TriggerNode } from './nodes/trigger/trigger-node';
import { WorkflowDialogs } from './nodes/workflow-dialogs';

// ── Node type registry ────────────────────────────────────────────────────────
const NODE_TYPES: NodeTypes = {
  'manual-trigger': ManualTriggerNode,
  trigger: TriggerNode,
  message: MessageNode,
  recipient: RecipientNode,
};

// ── Edge type registry ────────────────────────────────────────────────────────
const EDGE_TYPES: EdgeTypes = {
  ...WORKFLOW_EDGE_TYPES,
};

const EMPTY_STATUSES: NodeStatusMap = {};

function WorkflowCanvasInner({ workflow }: { workflow: WorkflowDetail }) {
  const setNodePanelOpen = useWorkflowDialogStore((s) => s.setNodePanelOpen);
  const openDialog = useWorkflowDialogStore((s) => s.openDialog);

  // Execution state is written by ManualTriggerNode via the store
  const { activeExecutionId, setActiveExecutionId } = useExecutionStore();

  const { data: lastExecution } = useLastExecution(workflow.id);

  const { data: progressData } = useExecutionProgress(
    activeExecutionId,
    !!activeExecutionId,
  );

  // While a run is active, derive a NodeStatusMap from the DB-backed progress
  // response so `useWorkflowGraph` can merge statuses into each node.
  // Once the run finishes and we clear activeExecutionId, fall back to the
  // persisted statuses from the last execution query.
  const liveStatuses: NodeStatusMap = useMemo(() => {
    if (!progressData?.nodeStatusByNodeId) return EMPTY_STATUSES;
    return Object.fromEntries(
      Object.entries(progressData.nodeStatusByNodeId).map(([nodeId, entry]) => [
        nodeId,
        { nodeId, status: entry.status },
      ]),
    );
  }, [progressData?.nodeStatusByNodeId]);

  const lastRunStatuses: NodeStatusMap = useMemo(() => {
    if (!lastExecution?.nodeStatusByNodeId) return EMPTY_STATUSES;
    return Object.fromEntries(
      Object.entries(lastExecution.nodeStatusByNodeId).map(
        ([nodeId, status]) => [nodeId, { nodeId, status }],
      ),
    );
  }, [lastExecution?.nodeStatusByNodeId]);

  const nodeStatuses = activeExecutionId ? liveStatuses : lastRunStatuses;

  // Execution finished = the DB says the execution is no longer RUNNING.
  // This is authoritative — no more inferring from node-level progress counts.
  const executionFinished =
    !!activeExecutionId &&
    !!progressData &&
    progressData.executionStatus !== ExecutionStatus.RUNNING &&
    progressData.executionStatus !== ExecutionStatus.PENDING;

  const { nodes: initialNodes, edges: initialEdges } = useWorkflowGraph(
    workflow,
    nodeStatuses,
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const invalidateWorkflow = useCallback(async () => {
    // Invalidation is handled by the hooks themselves via their onSuccess;
    // this no-op stub keeps call sites that pass it as onSuccess working.
  }, []);

  // When execution finishes, force a refetch then clear the active ID.
  const { refetch: refetchLastExecution } = useLastExecution(workflow.id);
  useEffect(() => {
    if (!executionFinished) return;
    void refetchLastExecution().then(() => {
      setActiveExecutionId(null);
    });
  }, [executionFinished, refetchLastExecution, setActiveExecutionId]);

  const removeNodeMutation = useRemoveNode(workflow.id);
  const addConnectionMutation = useAddConnection(workflow.id);
  const removeConnectionMutation = useRemoveConnection(workflow.id);
  const clearNodeTemplateMutation = useUpdateNodeData(workflow.id);
  const updateNodePositionMutation = useUpdateNodePosition(workflow.id);
  const retryMutation = useRetryExecution(workflow.id);

  const lastExecutionFailed = lastExecution?.status === ExecutionStatus.FAILED;

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (createsCycle(edges, connection.source, connection.target)) return;

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: workflow.isActive ? 'workflow-animated' : 'workflow-default',
          },
          currentEdges,
        ),
      );

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

          // If an edge into the message node was deleted, clear the persisted
          // template so stale {{variable}} tokens don't linger in node data.
          const messageNode = workflow.nodes.find(
            (n) => n.type === NodeType.OUTPUT_MESSAGE,
          );
          if (messageNode) {
            const targetsMessageNode = deletedEdges.some(
              (e) => e.target === messageNode.id,
            );
            if (targetsMessageNode) {
              clearNodeTemplateMutation.mutate({
                nodeId: messageNode.id,
                data: { template: '' },
              });
            }
          }
        }}
        onNodesDelete={(deletedNodes) => {
          for (const node of deletedNodes) {
            removeNodeMutation.mutate({ nodeId: node.id });
          }
        }}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        connectionLineComponent={WorkflowConnectionLine}
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
        <ZoomControls />
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
        {/* Bottom-right: Run / Retry / executing indicator */}
        <Panel position="bottom-right" className="m-4">
          {activeExecutionId ? (
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              Running…
            </div>
          ) : lastExecutionFailed && lastExecution ? (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 shadow-sm"
              disabled={retryMutation.isPending}
              onClick={() =>
                retryMutation.mutate(
                  { executionId: lastExecution.id },
                  {
                    onSuccess: (result) =>
                      setActiveExecutionId(result.executionId),
                  },
                )
              }
            >
              {retryMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Retry
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 shadow-sm"
              disabled={!workflow.isActive}
              onClick={() =>
                openDialog({
                  type: 'run-trigger',
                  data: { workflowId: workflow.id },
                })
              }
            >
              <Play className="size-3.5" />
              Run
            </Button>
          )}
        </Panel>
      </ReactFlow>

      <NodePanel workflowId={workflow.id} existingNodes={workflow.nodes} />
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
        <p className="text-sm">Loading workflow...</p>
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: workflow, isLoading, error } = useWorkflow(workflowId);

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
