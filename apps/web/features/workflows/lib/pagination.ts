import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  SORT_DIRECTIONS,
  type SortDirection,
  WORKFLOW_SORT_FIELDS,
  type WorkflowSortField,
} from '@spexs/types';

export interface WorkflowPaginationState {
  page: number;
  pageSize: number;
  sortBy: WorkflowSortField;
  sortDirection: SortDirection;
}

export const DEFAULT_WORKFLOW_PAGINATION: WorkflowPaginationState = {
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: WORKFLOW_SORT_FIELDS.CREATED_AT,
  sortDirection: SORT_DIRECTIONS.DESC,
};

export interface SortOption {
  label: string;
  value: WorkflowSortField;
}

export const WORKFLOW_SORT_OPTIONS: readonly SortOption[] = [
  { label: 'Name', value: WORKFLOW_SORT_FIELDS.NAME },
  { label: 'Created', value: WORKFLOW_SORT_FIELDS.CREATED_AT },
  { label: 'Updated', value: WORKFLOW_SORT_FIELDS.UPDATED_AT },
  { label: 'Status', value: WORKFLOW_SORT_FIELDS.STATUS },
];
