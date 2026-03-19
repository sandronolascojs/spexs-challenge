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
