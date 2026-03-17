import type { ComparisonOperator, TriggerType } from '../enums/workflows';

// Trigger payload — discriminated union stored as JSONB in the events table.
// Captures the exact values that caused an event to fire.

export interface ThresholdTriggerPayload {
  readonly triggerType: TriggerType.THRESHOLD;
  readonly metricName: string;
  readonly metricValue: number;
  readonly operator: ComparisonOperator;
  readonly thresholdValue: number;
}

export interface VarianceTriggerPayload {
  readonly triggerType: TriggerType.VARIANCE;
  readonly baseValue: number;
  readonly currentValue: number;
  readonly deviationPercentage: number;
  readonly actualDeviation: number;
}

export type TriggerPayload = ThresholdTriggerPayload | VarianceTriggerPayload;
