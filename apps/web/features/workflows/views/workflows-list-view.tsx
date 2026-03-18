'use client';

import { DashboardTopNavbar } from '@/components/layout/dashboard-top-navbar';
import { ResourceFilters } from '@/components/resource-filters';
import { ResourceLayout } from '@/components/resource-layout';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MemoizedWorkflowCard } from '../components/workflow-card';
import {
  DEFAULT_WORKFLOW_PAGINATION,
  WORKFLOW_SORT_OPTIONS,
  type WorkflowPaginationState,
} from '../lib/pagination';

function parseWorkflowSortField(
  sortBy: string,
): WorkflowPaginationState['sortBy'] | null {
  for (const option of WORKFLOW_SORT_OPTIONS) {
    if (option.value === sortBy) {
      return option.value;
    }
  }

  return null;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <GitBranch className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="mb-1 text-base font-semibold">
          No workflows created yet
        </h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Get started by creating your first workflow. Workflows can be created
          from templates or from scratch and configured directly in the canvas.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/workflows/new">
            <Plus className="mr-2 size-4" />
            Use Template
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/workflows/new?mode=scratch">
            <Plus className="mr-2 size-4" />
            Create Empty
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function WorkflowsListView() {
  const [pagination, setPaginationState] = useState<WorkflowPaginationState>(
    DEFAULT_WORKFLOW_PAGINATION,
  );

  const setPagination = (patch: Partial<WorkflowPaginationState>) => {
    setPaginationState((currentState) => ({
      ...currentState,
      ...patch,
    }));
  };

  const trpc = useTRPC();
  const {
    data: response,
    isLoading,
    error,
  } = useQuery(trpc.workflows.list.queryOptions(pagination));

  const workflows = response?.items ?? [];
  const meta = response?.meta;
  const layoutError = error ? new Error(error.message) : null;

  const handleSortByChange = (sortBy: string) => {
    const sortField = parseWorkflowSortField(sortBy);
    if (!sortField) {
      return;
    }

    void setPagination({
      page: 1,
      sortBy: sortField,
    });
  };

  const handleSortDirectionChange = (sortDirection: 'asc' | 'desc') => {
    void setPagination({ page: 1, sortDirection });
  };

  const handlePageChange = (page: number) => {
    void setPagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    void setPagination({ page: 1, pageSize });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardTopNavbar items={[{ id: 'workflows', label: 'Workflows' }]} />

      <ResourceLayout
        title="Workflows"
        description="Monitor and manage your alert workflows."
        size="2xl"
        className="min-h-0 flex-1 p-4 pt-0"
        isLoading={isLoading}
        error={layoutError}
        headerActions={
          <Button asChild size="sm">
            <Link href="/workflows/new?mode=scratch">
              <Plus className="mr-2 size-4" />
              Create Empty
            </Link>
          </Button>
        }
        filters={
          <ResourceFilters
            sortOptions={WORKFLOW_SORT_OPTIONS}
            sortBy={pagination.sortBy}
            onSortByChange={handleSortByChange}
            sortDirection={pagination.sortDirection}
            onSortDirectionChange={handleSortDirectionChange}
          />
        }
        paginationMeta={
          meta ?? {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        }
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      >
        {!workflows.length ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workflows.map((workflow) => (
              <MemoizedWorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </ResourceLayout>
    </div>
  );
}
