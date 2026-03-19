import type { AlertEventStatus } from '../enums/events';

export interface DashboardRecentWorkflow {
  id: string;
  name: string;
  isActive: boolean;
  nodeCount: number;
  updatedAt: Date;
}

export interface DashboardRecentEvent {
  id: string;
  workflowId: string;
  workflowName: string;
  status: AlertEventStatus;
  createdAt: Date;
}

export interface DashboardStats {
  workflows: {
    total: number;
    active: number;
  };
  events: {
    total: number;
    open: number;
    snoozed: number;
    resolved: number;
  };
  executions: {
    total: number;
    succeeded: number;
    failed: number;
  };
  recent: {
    workflows: DashboardRecentWorkflow[];
    events: DashboardRecentEvent[];
  };
}
