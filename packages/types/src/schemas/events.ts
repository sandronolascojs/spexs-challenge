import { z } from 'zod';
import { EVENT_SORT_FIELDS, SORT_DIRECTIONS } from '../constants/pagination';
import { EventStatus } from '../enums/events';
import { ComparisonOperator, TriggerType } from '../enums/workflows';
import {
  createPaginatedResponseSchema,
  paginationQuerySchema,
} from './pagination';

// ── Trigger payload sub-schemas ───────────────────────────────────────────────

const thresholdPayloadSchema = z.object({
  triggerType: z.literal(TriggerType.THRESHOLD),
  metricName: z.string().min(1),
  metricValue: z.number(),
  operator: z.enum(ComparisonOperator),
  thresholdValue: z.number(),
});

const variancePayloadSchema = z.object({
  triggerType: z.literal(TriggerType.VARIANCE),
  baseValue: z.number(),
  currentValue: z.number(),
  deviationPercentage: z.number(),
  actualDeviation: z.number(),
});

// ── Router-level trigger schemas (workflowId + payload wrapper) ───────────────

export const triggerThresholdEventSchema = z.object({
  workflowId: z.string().min(1),
  payload: thresholdPayloadSchema,
});

export const triggerVarianceEventSchema = z.object({
  workflowId: z.string().min(1),
  payload: variancePayloadSchema,
});

// ── Resolve / comment schemas ─────────────────────────────────────────────────

export const resolveEventSchema = z.object({
  eventId: z.string().min(1),
  comment: z.string().optional(),
});

export const addCommentSchema = z.object({
  eventId: z.string().min(1),
  comment: z.string().min(1),
});

// ── Query / list schemas ──────────────────────────────────────────────────────

// z.enum requires a non-empty tuple — derive it from EVENT_SORT_FIELDS.
type EventSortFieldValue =
  (typeof EVENT_SORT_FIELDS)[keyof typeof EVENT_SORT_FIELDS];
const EVENT_SORT_FIELD_VALUES = Object.values(EVENT_SORT_FIELDS) as [
  EventSortFieldValue,
  ...EventSortFieldValue[],
];

export const eventListQuerySchema = paginationQuerySchema.extend({
  workflowId: z.string().min(1).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  sortBy: z.enum(EVENT_SORT_FIELD_VALUES).default(EVENT_SORT_FIELDS.OPENED_AT),
  sortDirection: z
    .enum([SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC])
    .default(SORT_DIRECTIONS.DESC),
});

// ── Response schemas ──────────────────────────────────────────────────────────

const eventCommentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  authorId: z.string(),
  comment: z.string(),
  createdAt: z.date(),
});

const eventSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(EventStatus),
  triggerPayload: z.record(z.string(), z.unknown()),
  triggeredBy: z.string(),
  openedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().nullable(),
  comments: z.array(eventCommentSchema),
});

export const paginatedEventListSchema =
  createPaginatedResponseSchema(eventSchema);

// ── Inferred types ────────────────────────────────────────────────────────────

export type TriggerThresholdEventInput = z.infer<
  typeof triggerThresholdEventSchema
>;
export type TriggerVarianceEventInput = z.infer<
  typeof triggerVarianceEventSchema
>;
export type ResolveEventInput = z.infer<typeof resolveEventSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type EventListQueryInput = z.infer<typeof eventListQuerySchema>;
export type EventComment = z.infer<typeof eventCommentSchema>;
export type Event = z.infer<typeof eventSchema>;
export type PaginatedEventList = z.infer<typeof paginatedEventListSchema>;
