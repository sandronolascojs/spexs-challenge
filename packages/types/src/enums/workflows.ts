// ── Node-based workflow engine enums ──────────────────────────────────────────

export enum NodeType {
  TRIGGER_THRESHOLD = 'trigger_threshold',
  TRIGGER_VARIANCE = 'trigger_variance',
  OUTPUT_MESSAGE = 'output_message',
  RECIPIENT_EMAIL = 'recipient_email',
  RECIPIENT_IN_APP = 'recipient_in_app',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
}
