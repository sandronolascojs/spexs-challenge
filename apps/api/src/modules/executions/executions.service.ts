import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  type AddStepCommentInput,
  ExecutionStatus,
  type GetStepCommentsInput,
  NodeExecutionStatus,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import { topologicalSortNodes } from '../workflows/lib/topological-sort';
import type { ExecutionJobData } from './executions.processor';
import { ExecutionsRepository } from './executions.repository';

@Injectable()
export class ExecutionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    private readonly repository: ExecutionsRepository,
    @InjectQueue('executions')
    private readonly executionsQueue: Queue<ExecutionJobData>,
  ) {}

  async onApplicationBootstrap() {
    const runningExecutions = await this.repository.findAllRunningExecutions();

    if (runningExecutions.length === 0) return;

    this.logger.log(
      `Found ${runningExecutions.length} RUNNING execution(s) at boot — checking BullMQ…`,
    );

    for (const execution of runningExecutions) {
      // Check if a BullMQ job is already active/waiting for this execution
      const jobs = await this.executionsQueue.getJobs([
        'active',
        'waiting',
        'delayed',
      ]);
      const hasActiveJob = jobs.some(
        (job) => job.data.executionId === execution.id,
      );

      if (hasActiveJob) {
        this.logger.log(
          `Execution ${execution.id} has an active BullMQ job — letting it resume`,
        );
        continue;
      }

      // No job in queue — re-enqueue using the stored execution data
      this.logger.warn(
        `Execution ${execution.id} has no BullMQ job — re-enqueueing for recovery`,
      );

      const executionData = await this.repository.findExecutionById(
        execution.id,
      );
      if (!executionData) continue;

      const graph = await this.repository.loadWorkflowGraph(
        executionData.workflowId,
      );
      if (!graph) continue;

      const sortedNodes = topologicalSortNodes(graph.nodes, graph.connections);

      const nodeExecutionIdByNodeId = Object.fromEntries(
        executionData.nodeExecutions.map((row) => [row.nodeId, row.id]),
      );

      await this.executionsQueue.add(
        'execute-workflow',
        {
          executionId: executionData.id,
          sortedNodes: sortedNodes.map((n) => ({
            id: n.id,
            type: n.type,
            workflowId: n.workflowId,
            data: n.data,
          })),
          nodeExecutionIdByNodeId,
          triggerData: executionData.triggerData ?? {},
          userId: executionData.triggeredBy,
        } satisfies ExecutionJobData,
        { removeOnComplete: true, removeOnFail: false },
      );
    }
  }

  /**
   * Execute a workflow: create execution + node_execution rows, then run
   * each node in topological order while streaming status via SSE.
   */
  async execute(
    workflowId: string,
    triggerData: Record<string, unknown>,
    userId: string,
  ) {
    // 0. Block if workflow is already running (no parallel executions)
    const activeExecution =
      await this.repository.findActiveExecution(workflowId);
    if (activeExecution) {
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          'Workflow is already running. Wait for completion or retry if failed.',
      });
    }

    // 1. Load the workflow graph
    const graph = await this.repository.loadWorkflowGraph(workflowId);

    if (!graph) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Workflow not found',
      });
    }

    if (!graph.workflow.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workflow is not active',
      });
    }

    if (graph.nodes.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workflow has no nodes',
      });
    }

    // 2. Topologically sort nodes
    const sortedNodes = topologicalSortNodes(graph.nodes, graph.connections);

    // 3. Create execution row (RUNNING)
    const execution = await this.repository.createExecution({
      workflowId,
      status: ExecutionStatus.RUNNING,
      triggeredBy: userId,
      triggerData,
    });

    // 4. Create all node_execution rows (PENDING)
    const nodeExecutionRows = await this.repository.createNodeExecutions(
      sortedNodes.map((node) => ({
        executionId: execution.id,
        nodeId: node.id,
        status: NodeExecutionStatus.PENDING,
      })),
    );

    // Build lookup: nodeId → nodeExecutionId
    const nodeExecutionIdByNodeId = Object.fromEntries(
      nodeExecutionRows.map((row) => [row.nodeId, row.id]),
    );

    // 5. Enqueue background execution job in BullMQ
    await this.executionsQueue.add(
      'execute-workflow',
      {
        executionId: execution.id,
        sortedNodes: sortedNodes.map((n) => ({
          id: n.id,
          type: n.type,
          workflowId: n.workflowId,
          data: n.data,
        })),
        nodeExecutionIdByNodeId,
        triggerData,
        userId,
      } satisfies ExecutionJobData,
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { executionId: execution.id };
  }

  /**
   * Resumes a previously FAILED execution by leveraging the processor's idempotency.
   */
  async retryExecution(executionId: string, userId: string) {
    const executionData = await this.repository.findExecutionById(executionId);
    if (!executionData) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }

    if (executionData.status !== ExecutionStatus.FAILED) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only failed executions can be retried',
      });
    }

    const graph = await this.repository.loadWorkflowGraph(
      executionData.workflowId,
    );
    if (!graph) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Workflow not found anymore',
      });
    }

    const sortedNodes = topologicalSortNodes(graph.nodes, graph.connections);

    const nodeExecutionIdByNodeId = Object.fromEntries(
      executionData.nodeExecutions.map((row) => [row.nodeId, row.id]),
    );

    // Transition back to RUNNING
    await this.repository.updateExecutionStatus(
      executionId,
      ExecutionStatus.RUNNING,
      {
        error: undefined,
      },
    );

    await this.executionsQueue.add(
      'execute-workflow',
      {
        executionId: executionData.id,
        sortedNodes: sortedNodes.map((n) => ({
          id: n.id,
          type: n.type,
          workflowId: n.workflowId,
          data: n.data,
        })),
        nodeExecutionIdByNodeId,
        triggerData: executionData.triggerData ?? {},
        userId,
      } satisfies ExecutionJobData,
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { executionId };
  }

  /**
   * Reads execution progress from the database — the single source of truth.
   * Returns the execution's own status plus per-node statuses.
   */
  async getProgress(executionId: string) {
    const progress = await this.repository.findExecutionProgress(executionId);

    if (!progress) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }

    return progress;
  }

  async getLastExecutionStatus(workflowId: string) {
    return this.repository.findLastExecution(workflowId);
  }

  async getExecutionDetails(executionId: string) {
    const details = await this.repository.findExecutionWithDetails(executionId);
    if (!details) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }
    return details;
  }

  async getStepComments(input: GetStepCommentsInput) {
    return this.repository.findCommentsByNodeExecutionId(input);
  }

  async addStepComment(input: AddStepCommentInput, userId: string) {
    return this.repository.addNodeExecutionComment({
      nodeExecutionId: input.nodeExecutionId,
      userId,
      content: input.content,
    });
  }
}
