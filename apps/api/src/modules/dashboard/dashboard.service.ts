import { Injectable } from '@nestjs/common';
import type { DashboardStats } from '@spexs/types';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const [workflows, events, executions, recentWorkflows, recentEvents] =
      await Promise.all([
        this.repository.countWorkflows(userId),
        this.repository.countEventsByStatus(),
        this.repository.countExecutionsByStatus(),
        this.repository.findRecentWorkflows(userId),
        this.repository.findRecentEvents(),
      ]);

    return {
      workflows,
      events,
      executions,
      recent: {
        workflows: recentWorkflows,
        events: recentEvents,
      },
    };
  }
}
