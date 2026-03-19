import { VARIABLE_TOKEN_PATTERN } from '../../shared/variable-token-pattern';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VariableItem {
  /** Dot-notation path used in `{{...}}` templates, e.g. `trigger.metricName` */
  key: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Actual runtime value from the last execution (undefined when no run yet) */
  value?: string;
  type: 'string' | 'number' | 'boolean' | 'object';
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Internal engine keys to skip when flattening output data. */
const INTERNAL_KEYS = new Set(['triggered', 'triggerData']);
const MAX_FLATTEN_DEPTH = 4;

// ── Public API ────────────────────────────────────────────────────────────────

/** Checks if a value is a plain object (not null, not an array). */
function isPlainObject(
  value: string | number | boolean | object,
): value is Record<string, unknown> {
  return typeof value === 'object' && !Array.isArray(value);
}

/**
 * Recursively flattens a JSON object into dot-notation paths.
 * Skips internal engine flags (`triggered`, `triggerData`) and null values.
 *
 * Example:
 *   `{ trigger: { metricName: "cpu", value: 95 } }`
 *   → `[{ key: "trigger.metricName", value: "cpu", type: "string" }, ...]`
 */
export function flattenOutputData(
  source: Record<string, unknown>,
  prefix = '',
  depth = 0,
): VariableItem[] {
  const items: VariableItem[] = [];

  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (rawValue === null || rawValue === undefined) continue;
    if (INTERNAL_KEYS.has(rawKey)) continue;

    const dotKey = prefix ? `${prefix}.${rawKey}` : rawKey;

    if (typeof rawValue === 'string') {
      items.push({
        key: dotKey,
        label: dotKey,
        value: rawValue,
        type: 'string',
      });
    } else if (typeof rawValue === 'number') {
      items.push({
        key: dotKey,
        label: dotKey,
        value: String(rawValue),
        type: 'number',
      });
    } else if (typeof rawValue === 'boolean') {
      items.push({
        key: dotKey,
        label: dotKey,
        value: String(rawValue),
        type: 'boolean',
      });
    } else if (isPlainObject(rawValue) && depth < MAX_FLATTEN_DEPTH) {
      items.push(...flattenOutputData(rawValue, dotKey, depth + 1));
    }
  }

  return items;
}

// ── Resolved segments ─────────────────────────────────────────────────────────

export interface ResolvedSegment {
  /** Stable key derived from character offset — safe to use as React key. */
  key: string;
  text: string;
  /** True when the value was resolved from config (static preview value). */
  isResolved: boolean;
  /** True when the token exists but has no static preview value (runtime-only). */
  isDynamic: boolean;
}

/**
 * Splits a template into segments, resolving known static values and
 * marking runtime-only tokens so they can be highlighted differently.
 * Each segment has a stable `key` built from its character offset.
 */
export function resolveTemplateSegments(
  template: string,
  variableMap: Map<string, string>,
): ResolvedSegment[] {
  const parts = template.split(VARIABLE_TOKEN_PATTERN);
  const segments: ResolvedSegment[] = [];
  let offset = 0;

  for (const part of parts) {
    VARIABLE_TOKEN_PATTERN.lastIndex = 0;
    if (VARIABLE_TOKEN_PATTERN.test(part)) {
      const variableKey = part.slice(2, -2);
      const resolved = variableMap.get(variableKey);
      if (resolved !== undefined) {
        segments.push({
          key: `resolved-${offset}`,
          text: resolved,
          isResolved: true,
          isDynamic: false,
        });
      } else {
        segments.push({
          key: `dynamic-${offset}`,
          text: part,
          isResolved: false,
          isDynamic: true,
        });
      }
    } else {
      segments.push({
        key: `text-${offset}`,
        text: part,
        isResolved: false,
        isDynamic: false,
      });
    }
    offset += part.length;
  }

  return segments;
}
