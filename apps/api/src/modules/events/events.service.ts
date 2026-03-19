import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  AddStepCommentInput,
  GetEventCommentsInput,
  ListAlertEventsInput,
  ResolveAlertEventInput,
  SnoozeAlertEventInput,
} from '@spexs/types';
import { TRPCError } from '@trpc/server';
import { ExecutionsService } from '../executions/executions.service';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly repository: EventsRepository,
    private readonly executionsService: ExecutionsService,
  ) {}

  async list(input: ListAlertEventsInput) {
    const { workflowId, status, page, pageSize, sortBy, sortDirection } = input;
    const offset = (page - 1) * pageSize;

    const { items, total } = await this.repository.findEvents(
      pageSize,
      offset,
      workflowId,
      status,
      sortBy,
      sortDirection,
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
    const updated = await this.repository.resolveEvent(input.eventId);

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or already resolved',
      });
    }

    if (input.comment?.trim()) {
      await this.repository.createEventComment(
        input.eventId,
        userId,
        input.comment.trim(),
      );
    }

    return updated;
  }

  async snooze(input: SnoozeAlertEventInput) {
    const snoozedUntil = new Date(Date.now() + input.snoozeMinutes * 60 * 1000);

    const updated = await this.repository.snoozeEvent(
      input.eventId,
      snoozedUntil,
    );

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or not in an open state',
      });
    }

    return updated;
  }

  async getComments(input: GetEventCommentsInput) {
    return this.repository.findEventComments(input.eventId);
  }

  async addStepComment(input: AddStepCommentInput, userId: string) {
    return this.executionsService.addStepComment(input, userId);
  }

  /** Every minute: reopen snoozed events whose snooze period has expired. */
  @Cron(CronExpression.EVERY_MINUTE)
  async reopenExpiredSnoozedEvents() {
    const expired = await this.repository.findExpiredSnoozedEvents();

    if (expired.length === 0) return;

    this.logger.log(
      `Reopening ${expired.length} expired snoozed event(s): ${expired.map((e) => e.id).join(', ')}`,
    );

    const expiredIds = expired.map((e) => e.id);
    await this.repository.reopenEventsByIds(expiredIds);
  }
}
