import { z } from 'zod';
import { AlertEventStatus } from '../enums/events';
import { paginationQuerySchema } from './pagination';

export const listAlertEventsSchema = paginationQuerySchema.extend({
  workflowId: z.string().optional(),
  status: z.nativeEnum(AlertEventStatus).optional(),
});

export type ListAlertEventsInput = z.infer<typeof listAlertEventsSchema>;

export const resolveAlertEventSchema = z.object({
  eventId: z.string(),
  comment: z.string().optional(),
});

export type ResolveAlertEventInput = z.infer<typeof resolveAlertEventSchema>;

export const snoozeAlertEventSchema = z.object({
  eventId: z.string(),
  /** Number of minutes to postpone the event. 1–1440 (1 day max). */
  snoozeMinutes: z.number().int().min(1).max(1440),
});

export type SnoozeAlertEventInput = z.infer<typeof snoozeAlertEventSchema>;

export const getEventCommentsSchema = z.object({
  eventId: z.string(),
});

export type GetEventCommentsInput = z.infer<typeof getEventCommentsSchema>;
