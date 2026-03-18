export enum TriggerType {
  THRESHOLD = 'threshold',
  VARIANCE = 'variance',
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
}

export enum WorkflowCanvasNodeKind {
  TRIGGER = 'trigger',
  MESSAGE = 'message',
  RECIPIENT = 'recipient',
}
