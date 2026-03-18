import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionStatus,
  NodeExecutionStatus,
  type NodeProgressMap,
  nodeProgressEntrySchema,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { EnvService } from '../../lib/env/env.service';
import { topologicalSortNodes } from '../workflows/lib/topological-sort';
import type { ExecutionJobData } from './executions.processor';
import { ExecutionsRepository } from './executions.repository';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  private redisClient: Redis;

  constructor(
    private readonly repository: ExecutionsRepository,
    @InjectQueue('executions') private readonly executionsQueue: Queue,
    private readonly env: EnvService,
  ) {
    this.redisClient = new Redis({
      host: this.env.get('REDIS_HOST') || 'localhost',
      port: Number(this.env.get('REDIS_PORT')) || 6379,
    });
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
        triggerData: (executionData.triggerData ?? {}) as Record<
          string,
          unknown
        >,
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
   * Reads the active execution states from Redis hash cache
   */
  async getProgress(executionId: string): Promise<NodeProgressMap> {
    const cacheKey = `execution-progress:${executionId}`;
    const rawData = await this.redisClient.hgetall(cacheKey);

    // If redis is entirely empty for this key, it might not have started yet or it expired
    if (!rawData || Object.keys(rawData).length === 0) {
      return {};
    }

    // Parse out the stringified JSON rows per node
    const parsedData: NodeProgressMap = {};
    for (const [nodeId, payloadString] of Object.entries(rawData)) {
      try {
        const parsed = nodeProgressEntrySchema.safeParse(
          JSON.parse(payloadString),
        );
        if (parsed.success) {
          parsedData[nodeId] = parsed.data;
        }
      } catch {
        // Ignore malformed JSON entries
      }
    }

    return parsedData;
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
}
