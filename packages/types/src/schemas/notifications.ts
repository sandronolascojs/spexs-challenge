import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

export const listNotificationsSchema = paginationQuerySchema.extend({
  isRead: z.boolean().optional(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

export const markNotificationReadSchema = z.object({
  notificationId: z.string(),
});

export type MarkNotificationReadInput = z.infer<
  typeof markNotificationReadSchema
>;

export const createNotificationSchema = z.object({
  userId: z.string(),
  workflowId: z.string().optional(),
  eventId: z.string().optional(),
  title: z.string(),
  message: z.string(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
