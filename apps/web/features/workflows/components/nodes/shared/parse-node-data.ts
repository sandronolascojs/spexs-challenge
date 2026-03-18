import {
  type OutputMessageData,
  type RecipientEmailData,
  type RecipientInAppData,
  type TriggerThresholdData,
  type TriggerVarianceData,
  outputMessageDataSchema,
  recipientEmailDataSchema,
  recipientInAppDataSchema,
  triggerThresholdDataSchema,
  triggerVarianceDataSchema,
} from '@spexs/types';

/**
 * Safely parses untyped node data into a strongly typed TriggerThresholdData.
 * Returns `null` if the data doesn't match the schema.
 */
export function parseTriggerThresholdData(
  raw: Record<string, unknown>,
): TriggerThresholdData | null {
  const result = triggerThresholdDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Safely parses untyped node data into a strongly typed TriggerVarianceData.
 * Returns `null` if the data doesn't match the schema.
 */
export function parseTriggerVarianceData(
  raw: Record<string, unknown>,
): TriggerVarianceData | null {
  const result = triggerVarianceDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Safely parses untyped node data into a strongly typed OutputMessageData.
 * Returns `null` if the data doesn't match the schema.
 */
export function parseOutputMessageData(
  raw: Record<string, unknown>,
): OutputMessageData | null {
  const result = outputMessageDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Safely parses untyped node data into a strongly typed RecipientEmailData.
 * Returns `null` if the data doesn't match the schema.
 */
export function parseRecipientEmailData(
  raw: Record<string, unknown>,
): RecipientEmailData | null {
  const result = recipientEmailDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Safely parses untyped node data into a strongly typed RecipientInAppData.
 * Returns `null` if the data doesn't match the schema.
 */
export function parseRecipientInAppData(
  raw: Record<string, unknown>,
): RecipientInAppData | null {
  const result = recipientInAppDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}
