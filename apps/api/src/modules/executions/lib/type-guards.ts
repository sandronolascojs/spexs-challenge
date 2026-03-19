/** Narrows an unknown value to a plain object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrows an unknown value to a record containing a `value` property. */
export function isRecordWithValue(
  value: unknown,
): value is Record<string, unknown> & { value: unknown } {
  return isRecord(value) && 'value' in value;
}
