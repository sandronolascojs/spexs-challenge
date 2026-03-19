import { Injectable } from '@nestjs/common';
import type {
  AddStepCommentInput,
  ListAlertEventsInput,
  ResolveAlertEventInput,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { ExecutionsService } from '../executions/executions.service';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly executionsService: ExecutionsService,
  ) {}

  async list(input: ListAlertEventsInput) {
    const { workflowId, status, page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const { items, total } = await this.repository.findEvents(
      pageSize,
      offset,
      workflowId,
      status,
    );

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async resolve(input: ResolveAlertEventInput, userId: string) {
    // 1. Mark event as RESOLVED
    const updated = await this.repository.resolveEvent(input.eventId);

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or already resolved',
      });
    }

    // 2. Insert resolution comment if provided
    if (input.comment?.trim()) {
      await this.repository.createEventComment(
        input.eventId,
        userId,
        input.comment.trim(),
      );
    }

    return updated;
  }

  async addStepComment(input: AddStepCommentInput, userId: string) {
    return this.executionsService.addStepComment(input, userId);
  }
}
