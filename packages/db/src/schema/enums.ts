import {
  ComparisonOperator,
  EventStatus,
  NotificationChannel,
  TriggerType,
} from '@spexs/types';
import { pgEnum } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// PostgreSQL enums — values listed explicitly from the TypeScript enums
// in @spexs/types. Keeps DB constraints and TS types in sync.
// ---------------------------------------------------------------------------

export const triggerTypeEnum = pgEnum('trigger_type', [
  TriggerType.THRESHOLD,
  TriggerType.VARIANCE,
]);

export const comparisonOperatorEnum = pgEnum('comparison_operator', [
  ComparisonOperator.GREATER_THAN,
  ComparisonOperator.LESS_THAN,
  ComparisonOperator.GREATER_THAN_OR_EQUAL,
  ComparisonOperator.LESS_THAN_OR_EQUAL,
  ComparisonOperator.EQUAL,
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL,
]);

export const eventStatusEnum = pgEnum('event_status', [
  EventStatus.OPEN,
  EventStatus.RESOLVED,
]);
