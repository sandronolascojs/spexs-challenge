import { Test, type TestingModule } from '@nestjs/testing';
import { buildNotification } from '../../test-utils/factories';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

// ── Mock types ───────────────────────────────────────────────────────────────

type MockRepo = {
  [K in keyof NotificationsRepository]: jest.Mock;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockRepository(): MockRepo {
  return {
    create: jest.fn().mockResolvedValue(buildNotification()),
    findByUserId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    countUnread: jest.fn().mockResolvedValue(0),
    markRead: jest.fn().mockResolvedValue(buildNotification({ isRead: true })),
    markAllRead: jest.fn().mockResolvedValue(undefined),
  };
}

async function createService() {
  const repository = createMockRepository();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationsService,
      { provide: NotificationsRepository, useValue: repository },
    ],
  }).compile();

  const service = module.get<NotificationsService>(NotificationsService);

  return { service, repository };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  describe('create', () => {
    it('persists a new notification and returns the row', async () => {
      const { service, repository } = await createService();

      const result = await service.create({
        userId: 'user-1',
        workflowId: 'wf-1',
        eventId: 'event-1',
        title: 'Alert triggered',
        message: 'CPU exceeded threshold',
      });

      expect(result.id).toBe('notif-1');
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        workflowId: 'wf-1',
        eventId: 'event-1',
        title: 'Alert triggered',
        message: 'CPU exceeded threshold',
      });
    });

    it('coerces optional fields to null when not provided', async () => {
      const { service, repository } = await createService();

      await service.create({
        userId: 'user-1',
        title: 'Alert',
        message: 'Message',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: null,
          eventId: null,
        }),
      );
    });
  });

  describe('list', () => {
    it('returns paginated notifications with correct meta', async () => {
      const { service, repository } = await createService();

      const n1 = buildNotification({ id: 'n-1' });
      const n2 = buildNotification({ id: 'n-2' });
      repository.findByUserId.mockResolvedValueOnce({
        items: [n1, n2],
        total: 2,
      });

      const result = await service.list(
        { page: 1, pageSize: 10, sortDirection: 'desc' },
        'user-1',
      );

      expect(result.items).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('passes isRead filter through to repository', async () => {
      const { service, repository } = await createService();

      await service.list(
        { page: 1, pageSize: 5, isRead: false, sortDirection: 'desc' },
        'user-1',
      );

      expect(repository.findByUserId).toHaveBeenCalledWith('user-1', {
        page: 1,
        pageSize: 5,
        isRead: false,
      });
    });

    it('calculates totalPages correctly for multi-page results', async () => {
      const { service, repository } = await createService();

      repository.findByUserId.mockResolvedValueOnce({ items: [], total: 23 });

      const result = await service.list(
        { page: 1, pageSize: 10, sortDirection: 'desc' },
        'user-1',
      );

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('countUnread', () => {
    it('returns the unread count wrapped in an object', async () => {
      const { service, repository } = await createService();
      repository.countUnread.mockResolvedValueOnce(7);

      const result = await service.countUnread('user-1');

      expect(result.count).toBe(7);
      expect(repository.countUnread).toHaveBeenCalledWith('user-1');
    });

    it('returns zero when no unread notifications exist', async () => {
      const { service } = await createService();

      const result = await service.countUnread('user-1');

      expect(result.count).toBe(0);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read and returns updated row', async () => {
      const { service, repository } = await createService();

      const result = await service.markRead(
        { notificationId: 'notif-1' },
        'user-1',
      );

      expect(result.isRead).toBe(true);
      expect(repository.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it('throws NOT_FOUND when notification does not belong to caller', async () => {
      const { service, repository } = await createService();
      repository.markRead.mockResolvedValueOnce(null);

      await expect(
        service.markRead({ notificationId: 'notif-other' }, 'user-1'),
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications as read and returns success flag', async () => {
      const { service, repository } = await createService();

      const result = await service.markAllRead('user-1');

      expect(result.success).toBe(true);
      expect(repository.markAllRead).toHaveBeenCalledWith('user-1');
    });
  });
});
