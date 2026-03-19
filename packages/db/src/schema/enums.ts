import {
  AlertEventStatus,
  ComparisonOperator,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeType,
} from '@spexs/types';
import { pgEnum } from 'drizzle-orm/pg-core';

// ── New node-based engine enums ───────────────────────────────────────────────

export const nodeTypeEnum = pgEnum('node_type', [
  NodeType.MANUAL_TRIGGER,
  NodeType.TRIGGER_THRESHOLD,
  NodeType.TRIGGER_VARIANCE,
  NodeType.OUTPUT_MESSAGE,
  NodeType.RECIPIENT_EMAIL,
  NodeType.RECIPIENT_IN_APP,
]);

export const executionStatusEnum = pgEnum('execution_status', [
  ExecutionStatus.PENDING,
  ExecutionStatus.RUNNING,
  ExecutionStatus.SUCCESS,
  ExecutionStatus.FAILED,
]);

export const nodeExecutionStatusEnum = pgEnum('node_execution_status', [
  NodeExecutionStatus.PENDING,
  NodeExecutionStatus.RUNNING,
  NodeExecutionStatus.SUCCESS,
  NodeExecutionStatus.FAILED,
  NodeExecutionStatus.SKIPPED,
]);

export const alertEventStatusEnum = pgEnum('alert_event_status', [
  AlertEventStatus.OPEN,
  AlertEventStatus.RESOLVED,
]);

// ── Shared enums ──────────────────────────────────────────────────────────────

export const comparisonOperatorEnum = pgEnum('comparison_operator', [
  ComparisonOperator.GREATER_THAN,
  ComparisonOperator.LESS_THAN,
  ComparisonOperator.GREATER_THAN_OR_EQUAL,
  ComparisonOperator.LESS_THAN_OR_EQUAL,
  ComparisonOperator.EQUAL,
]);
