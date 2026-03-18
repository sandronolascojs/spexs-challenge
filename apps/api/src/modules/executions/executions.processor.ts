import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  AlertEventStatus,
  ExecutionStatus,
  NodeExecutionStatus,
} from '@spexs/types';
import type { NodeType } from '@spexs/types';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { EnvService } from '../../lib/env/env.service';
import { ExecutionsRepository } from './executions.repository';
import { getNodeExecutor } from './lib/executor-registry';
import type { WorkflowContext } from './lib/executor-types';

interface NodeExecutionReference {
  id: string; // the workflowNodes row object without full typing just id/type/workflowId
  type: NodeType;
  workflowId: string;
  data: unknown;
}

export interface ExecutionJobData {
  executionId: string;
  sortedNodes: NodeExecutionReference[];
  nodeExecutionIdByNodeId: Record<string, string>;
  triggerData: Record<string, unknown>;
  userId: string;
}

@Processor('executions')
@Injectable()
export class ExecutionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionsProcessor.name);
  private redisClient: Redis;

  constructor(
    private readonly repository: ExecutionsRepository,
    private readonly env: EnvService,
  ) {
    super();
    this.redisClient = new Redis({
      host: this.env.get('REDIS_HOST') || 'localhost',
      port: Number(this.env.get('REDIS_PORT')) || 6379,
    });
  }

  async process(job: Job<ExecutionJobData>) {
    const {
      executionId,
      sortedNodes,
      nodeExecutionIdByNodeId,
      triggerData,
      userId,
    } = job.data;

    let context: WorkflowContext = { triggerData };
    let isFirstNode = true;
    let activeEventId: string | null = null;
    const stepLogs: any[] = [];

    try {
      this.logger.log(`Starting background execution for ${executionId}`);

      for (const node of sortedNodes) {
        const nodeExecutionId = nodeExecutionIdByNodeId[node.id];
        if (!nodeExecutionId) continue;

        // --- IDEMPOTENCY CHECK ---
        const existingExecution =
          await this.repository.getNodeExecutionStatus(nodeExecutionId);
        if (
          existingExecution &&
          existingExecution.status === NodeExecutionStatus.SUCCESS
        ) {
          this.logger.log(`Skipping already successful node: ${node.id}`);
          if (existingExecution.outputData) {
            context = {
              ...context,
              ...(existingExecution.outputData as Record<string, unknown>),
            };
          }
          continue;
        }

        // 1. Mark Node RUNNING
        await this.repository.updateNodeExecutionStatus(
          nodeExecutionId,
          NodeExecutionStatus.RUNNING,
          { startedAt: new Date(), inputData: context },
        );
        await this.cacheNodeProgress(
          executionId,
          node.id,
          NodeExecutionStatus.RUNNING,
        );

        try {
          // 2. Execute Node
          const executor = getNodeExecutor(node.type);
          const output = await executor({ node: node as any, context, userId });

          // 3. Mark Node SUCCESS
          await this.repository.updateNodeExecutionStatus(
            nodeExecutionId,
            NodeExecutionStatus.SUCCESS,
            { outputData: output, completedAt: new Date() },
          );
          await this.cacheNodeProgress(
            executionId,
            node.id,
            NodeExecutionStatus.SUCCESS,
            undefined,
            output,
          );

          // Accumulate the context rather than overwriting it purely
          context = { ...context, ...output };

          // LOG TO ALERT EVENT
          const nodeLog = {
            nodeId: node.id,
            nodeType: node.type,
            status: NodeExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output,
          };
          stepLogs.push(nodeLog);

          // IDEMPOTENCY ENGINE
          if (isFirstNode) {
            isFirstNode = false;
            const triggered = !!(context.trigger as any)?.triggered;

            if (triggered) {
              const openEvent = await this.repository.findOpenAlertEvent(
                node.workflowId,
              );

              if (openEvent) {
                this.logger.warn(
                  `Workflow ${node.workflowId} has an OPEN alert event. Aborting downstream action calls (Idempotency).`,
                );
                activeEventId = openEvent.id;
                // Pre-fill logs if it's an existing event? Usually we just want THIS execution's logs
                // But the requirement says "keep that updated and detailed to the user view"
                // Let's just track this execution's progress in the alert event
                await this.markRemainingNodesSkipped(
                  sortedNodes,
                  node.id,
                  nodeExecutionIdByNodeId,
                  executionId,
                );
                break;
              }
              const newEvent = await this.repository.createAlertEvent({
                workflowId: node.workflowId,
                status: AlertEventStatus.OPEN,
                triggerData: {
                  metricValue: (context.trigger as any)?.value,
                  evaluatedThreshold:
                    (context.trigger as any)?.thresholdValue ??
                    (context.trigger as any)?.baseValue,
                },
                stepLogs: [],
              });
              activeEventId = newEvent.id;
            } else {
              await this.markRemainingNodesSkipped(
                sortedNodes,
                node.id,
                nodeExecutionIdByNodeId,
                executionId,
              );
              break;
            }
          }

          // Sync logs to DB if we have an active event
          if (activeEventId) {
            await this.repository.updateAlertEventStepLogs(
              activeEventId,
              stepLogs,
            );
          }
        } catch (nodeError) {
          const errorMessage =
            nodeError instanceof Error
              ? nodeError.message
              : 'Unknown executor error';

          await this.repository.updateNodeExecutionStatus(
            nodeExecutionId,
            NodeExecutionStatus.FAILED,
            { error: errorMessage, completedAt: new Date() },
          );
          await this.cacheNodeProgress(
            executionId,
            node.id,
            NodeExecutionStatus.FAILED,
            errorMessage,
          );

          // LOG FAILURE TO ALERT EVENT
          if (activeEventId) {
            stepLogs.push({
              nodeId: node.id,
              nodeType: node.type,
              status: NodeExecutionStatus.FAILED,
              error: errorMessage,
              completedAt: new Date(),
            });
            await this.repository.updateAlertEventStepLogs(
              activeEventId,
              stepLogs,
            );
          }

          // We do NOT mark the remaining nodes as skipped. They remain PENDING
          // so this job can be resumed/retried gracefully from this point.

          await this.repository.updateExecutionStatus(
            executionId,
            ExecutionStatus.FAILED,
            {
              error: errorMessage,
              completedAt: new Date(),
            },
          );

          throw nodeError; // Let BullMQ handle failure/retry, keeping the job in failed state
        }
      }

      // Final Execution State
      await this.repository.updateExecutionStatus(
        executionId,
        ExecutionStatus.SUCCESS,
        {
          output: context,
          completedAt: new Date(),
        },
      );

      // Auto-close Alert Event if completely successful
      if (activeEventId) {
        await this.repository.resolveAlertEvent(
          activeEventId,
          AlertEventStatus.RESOLVED,
        );
      }
    } catch (globalError) {
      this.logger.error(`Execution failed catastrophically: ${globalError}`);
      throw globalError;
    }
  }

  private async markRemainingNodesSkipped(
    sortedNodes: NodeExecutionReference[],
    failedNodeId: string,
    nodeExecutionIdByNodeId: Record<string, string>,
    executionId: string,
  ) {
    const failedIndex = sortedNodes.findIndex(
      (node) => node.id === failedNodeId,
    );
    for (let i = failedIndex + 1; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const nodeExecutionId = nodeExecutionIdByNodeId[node.id];

      if (nodeExecutionId) {
        await this.repository.updateNodeExecutionStatus(
          nodeExecutionId,
          NodeExecutionStatus.SKIPPED,
        );
        await this.cacheNodeProgress(
          executionId,
          node.id,
          NodeExecutionStatus.SKIPPED,
        );
      }
    }
  }

  private async cacheNodeProgress(
    executionId: string,
    nodeId: string,
    status: NodeExecutionStatus,
    error?: string,
    outputData?: Record<string, unknown>,
  ) {
    // We use a Redis HASH where key is `execution:{executionId}` and Field is `{nodeId}`
    // The TRPC progress endpoint will simply run `HGETALL execution:{executionId}`
    const payload = JSON.stringify({
      nodeId,
      status,
      ...(error ? { error } : {}),
      ...(outputData ? { outputData } : {}),
    });

    // Store in Redis and automatically expire the key after 1 hour (3600s) to keep memory clean
    const cacheKey = `execution-progress:${executionId}`;
    await this.redisClient.hset(cacheKey, nodeId, payload);
    await this.redisClient.expire(cacheKey, 3600);
  }
}
