import { Injectable } from '@nestjs/common';
import type { EventListQueryInput, TriggerPayload } from '@spexs/types';
import { EventStatus } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  async getById(id: string) {
    const event = await this.repository.findById(id);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    return event;
  }

  async listByWorkflow(workflowId: string, query: EventListQueryInput) {
    return this.repository.findByWorkflowId(workflowId, query);
  }

  async trigger(workflowId: string, payload: TriggerPayload, userId: string) {
    const existingOpenEvent =
      await this.repository.findOpenEventByWorkflowId(workflowId);

    if (existingOpenEvent) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'An open event already exists for this workflow. Resolve it before triggering a new one.',
      });
    }

    return this.repository.create({
      workflowId,
      triggerPayload: payload,
      triggeredBy: userId,
    });
  }

  async resolve(eventId: string, userId: string, comment?: string) {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    if (event.status === EventStatus.RESOLVED) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Event is already resolved.',
      });
    }

    if (comment?.trim()) {
      await this.repository.addComment({
        eventId,
        authorId: userId,
        comment: comment.trim(),
      });
    }

    const updated = await this.repository.updateStatus(eventId, {
      status: EventStatus.RESOLVED,
      resolvedBy: userId,
    });

    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to resolve event.',
      });
    }

    return this.repository.findById(eventId);
  }

  async addComment(eventId: string, userId: string, comment: string) {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    return this.repository.addComment({
      eventId,
      authorId: userId,
      comment: comment.trim(),
    });
  }
}
