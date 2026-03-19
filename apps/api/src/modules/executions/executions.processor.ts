import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  AlertEventStatus,
  ExecutionStatus,
  type ExecutorNode,
  NodeExecutionStatus,
  type WorkflowContext,
} from '@spexs/types';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { ExecutionsRepository } from './executions.repository';
import { getNodeExecutor } from './lib/executor-registry';
import type { ExecutorServices } from './lib/executor-types';
import { isRecord } from './lib/type-guards';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutionJobData {
  executionId: string;
  sortedNodes: ExecutorNode[];
  nodeExecutionIdByNodeId: Record<string, string>;
  triggerData: Record<string, unknown>;
  userId: string;
}

interface StepLog {
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  completedAt: Date;
  output?: WorkflowContext;
  error?: string;
}

/** Shape returned by trigger executors (threshold + variance). */
interface TriggerOutput {
  triggered: boolean;
  value: number;
  thresholdValue?: number;
  baseValue?: number;
}

/** Safely narrows `context.trigger` to a typed object, or null. */
function parseTriggerOutput(trigger: unknown): TriggerOutput | null {
  if (!isRecord(trigger) || typeof trigger.triggered !== 'boolean') {
    return null;
  }

  return {
    triggered: trigger.triggered,
    value: typeof trigger.value === 'number' ? trigger.value : 0,
    thresholdValue:
      typeof trigger.thresholdValue === 'number'
        ? trigger.thresholdValue
        : undefined,
    baseValue:
      typeof trigger.baseValue === 'number' ? trigger.baseValue : undefined,
  };
}

@Processor('executions')
@Injectable()
export class ExecutionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionsProcessor.name);
  private readonly services: ExecutorServices;

  constructor(
    private readonly repository: ExecutionsRepository,
    emailService: EmailService,
  ) {
    super();
    this.services = { email: emailService };
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
    const stepLogs: StepLog[] = [];

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
              ...existingExecution.outputData,
            };
          }

          // When the trigger node (first in sorted order) was already successful,
          // recover the event context so downstream action nodes can continue.
          if (isFirstNode) {
            isFirstNode = false;
            const triggerResult = parseTriggerOutput(context.trigger);
            if (triggerResult?.triggered) {
              const openEvent = await this.repository.findOpenAlertEvent(
                node.workflowId,
              );
              if (openEvent) {
                activeEventId = openEvent.id;
                // Update the event's executionId to this execution so getDetails
                // fetches the correct node execution rows.
                await this.repository.updateAlertEventExecutionId(
                  openEvent.id,
                  executionId,
                );
              }
            }
          }

          continue;
        }

        // 1. Mark Node RUNNING
        await this.repository.updateNodeExecutionStatus(
          nodeExecutionId,
          NodeExecutionStatus.RUNNING,
          { startedAt: new Date(), inputData: context },
        );

        try {
          // 2. Execute Node
          const executor = getNodeExecutor(node.type);
          const output = await executor({
            node,
            context,
            userId,
            services: this.services,
          });

          // 3. Mark Node SUCCESS
          await this.repository.updateNodeExecutionStatus(
            nodeExecutionId,
            NodeExecutionStatus.SUCCESS,
            { outputData: output, error: null, completedAt: new Date() },
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
            const triggerResult = parseTriggerOutput(context.trigger);
            const triggered = triggerResult?.triggered ?? false;

            if (triggered) {
              const openEvent = await this.repository.findOpenAlertEvent(
                node.workflowId,
              );

              if (openEvent) {
                this.logger.warn(
                  `Workflow ${node.workflowId} has an OPEN alert event. Aborting downstream action calls (Idempotency).`,
                );
                activeEventId = openEvent.id;
                await this.repository.updateAlertEventExecutionId(
                  openEvent.id,
                  executionId,
                );
                await this.markRemainingNodesSkipped(
                  sortedNodes,
                  node.id,
                  nodeExecutionIdByNodeId,
                );
                break;
              }
              const newEvent = await this.repository.createAlertEvent({
                workflowId: node.workflowId,
                executionId,
                status: AlertEventStatus.OPEN,
                triggerData: {
                  metricValue: triggerResult?.value,
                  evaluatedThreshold:
                    triggerResult?.thresholdValue ?? triggerResult?.baseValue,
                },
                stepLogs: [],
              });
              activeEventId = newEvent.id;
            } else {
              await this.markRemainingNodesSkipped(
                sortedNodes,
                node.id,
                nodeExecutionIdByNodeId,
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

      // The inner node-level catch already calls updateExecutionStatus(FAILED)
      // for node errors. Here we only need to handle errors that occur outside
      // the node loop (e.g. DB failures during idempotency checks) where the
      // execution row would otherwise stay stuck at RUNNING forever.
      await this.repository
        .updateExecutionStatus(executionId, ExecutionStatus.FAILED, {
          error:
            globalError instanceof Error
              ? globalError.message
              : 'Unknown error',
          completedAt: new Date(),
        })
        .catch((updateError) => {
          this.logger.error(
            `Failed to mark execution ${executionId} as FAILED: ${updateError}`,
          );
        });

      throw globalError;
    }
  }

  private async markRemainingNodesSkipped(
    sortedNodes: ExecutorNode[],
    lastProcessedNodeId: string,
    nodeExecutionIdByNodeId: Record<string, string>,
  ) {
    const lastIndex = sortedNodes.findIndex(
      (node) => node.id === lastProcessedNodeId,
    );
    for (let i = lastIndex + 1; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const nodeExecutionId = nodeExecutionIdByNodeId[node.id];

      if (nodeExecutionId) {
        await this.repository.updateNodeExecutionStatus(
          nodeExecutionId,
          NodeExecutionStatus.SKIPPED,
        );
      }
    }
  }
}
