import { Test, type TestingModule } from '@nestjs/testing';
import { AlertEventStatus } from '@spexs/types';
import {
  buildAlertEvent,
  buildNodeExecutionComment,
} from '../../test-utils/factories';
import { ExecutionsService } from '../executions/executions.service';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

// ── Mock types ───────────────────────────────────────────────────────────────

type MockEventsRepo = {
  [K in keyof EventsRepository]: jest.Mock;
};

type MockExecutionsService = {
  [K in keyof ExecutionsService]: jest.Mock;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRepository(): MockEventsRepo {
  return {
    findEvents: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    resolveEvent: jest.fn().mockResolvedValue(
      buildAlertEvent({
        status: AlertEventStatus.RESOLVED,
        resolvedAt: new Date(),
      }),
    ),
    snoozeEvent: jest.fn().mockResolvedValue(
      buildAlertEvent({
        status: AlertEventStatus.SNOOZED,
        snoozedUntil: new Date(),
      }),
    ),
    findExpiredSnoozedEvents: jest.fn().mockResolvedValue([]),
    reopenEvent: jest.fn().mockResolvedValue(undefined),
    reopenEventsByIds: jest.fn().mockResolvedValue(undefined),
    createEventComment: jest.fn().mockResolvedValue(undefined),
    findEventComments: jest.fn().mockResolvedValue([]),
  };
}

function createMockExecutionsService(): MockExecutionsService {
  const comment = buildNodeExecutionComment();
  return {
    addStepComment: jest.fn().mockResolvedValue(comment),
    execute: jest.fn(),
    retryExecution: jest.fn(),
    getProgress: jest.fn(),
    getLastExecutionStatus: jest.fn(),
    getExecutionDetails: jest.fn(),
    getStepComments: jest.fn(),
    onApplicationBootstrap: jest.fn(),
  };
}

async function createService() {
  const repository = createMockRepository();
  const executionsService = createMockExecutionsService();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EventsService,
      { provide: EventsRepository, useValue: repository },
      { provide: ExecutionsService, useValue: executionsService },
    ],
  }).compile();

  const service = module.get<EventsService>(EventsService);

  return { service, repository, executionsService };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EventsService', () => {
  describe('list', () => {
    it('returns paginated events with correct meta', async () => {
      const { service, repository } = await createService();

      const event = buildAlertEvent({ id: 'e-1' });
      repository.findEvents.mockResolvedValueOnce({ items: [event], total: 1 });

      const result = await service.list({
        page: 1,
        pageSize: 10,
        sortDirection: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('e-1');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('calculates offset correctly for page 2', async () => {
      const { service, repository } = await createService();

      await service.list({
        page: 2,
        pageSize: 5,
        workflowId: 'wf-1',
        status: AlertEventStatus.OPEN,
        sortBy: 'openedAt',
        sortDirection: 'asc',
      });

      // offset = (2 - 1) * 5 = 5
      expect(repository.findEvents).toHaveBeenCalledWith(
        5,
        5,
        'wf-1',
        AlertEventStatus.OPEN,
        'openedAt',
        'asc',
      );
    });
  });

  describe('resolve', () => {
    it('resolves an open event and returns the updated row', async () => {
      const { service, repository } = await createService();

      const result = await service.resolve({ eventId: 'event-1' }, 'user-1');

      expect(result.status).toBe(AlertEventStatus.RESOLVED);
      expect(repository.resolveEvent).toHaveBeenCalledWith('event-1');
    });

    it('creates a comment when one is provided alongside resolve', async () => {
      const { service, repository } = await createService();

      await service.resolve(
        { eventId: 'event-1', comment: 'False alarm' },
        'user-1',
      );

      expect(repository.createEventComment).toHaveBeenCalledWith(
        'event-1',
        'user-1',
        'False alarm',
      );
    });

    it('trims whitespace before deciding whether to store a comment', async () => {
      const { service, repository } = await createService();

      await service.resolve({ eventId: 'event-1', comment: '   ' }, 'user-1');

      expect(repository.createEventComment).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when event is already resolved or missing', async () => {
      const { service, repository } = await createService();
      repository.resolveEvent.mockResolvedValueOnce(undefined);

      await expect(
        service.resolve({ eventId: 'missing' }, 'user-1'),
      ).rejects.toThrow('Event not found or already resolved');
    });
  });

  describe('snooze', () => {
    it('computes snoozedUntil within expected range', async () => {
      const { service, repository } = await createService();

      const before = Date.now();
      await service.snooze({ eventId: 'event-1', snoozeMinutes: 30 });
      const after = Date.now();

      const [[, snoozedUntilArg]] = repository.snoozeEvent.mock.calls as [
        [string, Date],
      ];

      const snoozedMs = snoozedUntilArg.getTime();
      const offsetMs = 30 * 60 * 1000;

      expect(snoozedMs).toBeGreaterThanOrEqual(before + offsetMs);
      expect(snoozedMs).toBeLessThanOrEqual(after + offsetMs);
    });

    it('passes eventId to repository', async () => {
      const { service, repository } = await createService();

      await service.snooze({ eventId: 'event-42', snoozeMinutes: 15 });

      expect(repository.snoozeEvent).toHaveBeenCalledWith(
        'event-42',
        expect.any(Date),
      );
    });

    it('throws NOT_FOUND when event is not snoozable', async () => {
      const { service, repository } = await createService();
      repository.snoozeEvent.mockResolvedValueOnce(null);

      await expect(
        service.snooze({ eventId: 'missing', snoozeMinutes: 10 }),
      ).rejects.toThrow('Event not found or not in an open state');
    });
  });

  describe('reopenExpiredSnoozedEvents (cron)', () => {
    it('does nothing when no expired events exist', async () => {
      const { service, repository } = await createService();

      await service.reopenExpiredSnoozedEvents();

      expect(repository.findExpiredSnoozedEvents).toHaveBeenCalled();
      expect(repository.reopenEventsByIds).not.toHaveBeenCalled();
    });

    it('batch-reopens all expired events in a single call', async () => {
      const { service, repository } = await createService();

      repository.findExpiredSnoozedEvents.mockResolvedValueOnce([
        buildAlertEvent({ id: 'e-1', status: AlertEventStatus.SNOOZED }),
        buildAlertEvent({ id: 'e-2', status: AlertEventStatus.SNOOZED }),
        buildAlertEvent({ id: 'e-3', status: AlertEventStatus.SNOOZED }),
      ]);

      await service.reopenExpiredSnoozedEvents();

      expect(repository.reopenEventsByIds).toHaveBeenCalledTimes(1);
      expect(repository.reopenEventsByIds).toHaveBeenCalledWith([
        'e-1',
        'e-2',
        'e-3',
      ]);
    });

    it('does NOT call reopenEvent per item (avoids N+1)', async () => {
      const { service, repository } = await createService();

      repository.findExpiredSnoozedEvents.mockResolvedValueOnce([
        buildAlertEvent({ id: 'e-1', status: AlertEventStatus.SNOOZED }),
        buildAlertEvent({ id: 'e-2', status: AlertEventStatus.SNOOZED }),
      ]);

      await service.reopenExpiredSnoozedEvents();

      expect(repository.reopenEvent).not.toHaveBeenCalled();
      expect(repository.reopenEventsByIds).toHaveBeenCalledTimes(1);
    });
  });

  describe('getComments', () => {
    it('delegates to repository with the correct eventId', async () => {
      const { service, repository } = await createService();

      const commentRow = {
        id: 'c-1',
        content: 'Test comment',
        userId: 'u-1',
        userName: 'Alice',
        userImage: null as string | null,
        createdAt: new Date(),
      };
      repository.findEventComments.mockResolvedValueOnce([commentRow]);

      const result = await service.getComments({ eventId: 'event-1' });

      expect(repository.findEventComments).toHaveBeenCalledWith('event-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test comment');
    });
  });

  describe('addStepComment', () => {
    it('delegates to ExecutionsService with correct args', async () => {
      const { service, executionsService } = await createService();

      const input = { nodeExecutionId: 'ne-1', content: 'Step note' };
      await service.addStepComment(input, 'user-1');

      expect(executionsService.addStepComment).toHaveBeenCalledWith(
        input,
        'user-1',
      );
    });
  });
});
