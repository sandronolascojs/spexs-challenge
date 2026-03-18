/**
 * Pagination constants for API requests and UI components.
 */

/**
 * Default page size for paginated lists.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Small page size for compact lists.
 */
export const SMALL_PAGE_SIZE = 10;

/**
 * Medium page size for standard lists.
 */
export const MEDIUM_PAGE_SIZE = 20;

/**
 * Large page size for detailed lists.
 */
export const LARGE_PAGE_SIZE = 50;

/**
 * Extra large page size for bulk operations.
 */
export const XLARGE_PAGE_SIZE = 100;

/**
 * Maximum allowed page size to prevent excessive data fetching.
 */
export const MAX_PAGE_SIZE = 200;

/**
 * Default page number (first page).
 */
export const DEFAULT_PAGE = 1;

/**
 * Default sort direction.
 */
export const DEFAULT_SORT_DIRECTION = 'desc' as const;

/**
 * Available sort directions.
 */
export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortDirection =
  (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

/**
 * Common sort fields for pagination.
 */
export const SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  NAME: 'name',
} as const;

export type SortField = (typeof SORT_FIELDS)[keyof typeof SORT_FIELDS];

/**
 * Sortable fields for documents.
 */
export const WORKFLOW_SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  NAME: 'name',
  STATUS: 'isActive',
} as const;

export type WorkflowSortField =
  (typeof WORKFLOW_SORT_FIELDS)[keyof typeof WORKFLOW_SORT_FIELDS];

/**
 * Pagination configuration presets.
 */
export const PAGINATION_PRESETS = {
  /**
   * Small pagination (10 items per page).
   * Use for mobile views or compact lists.
   */
  small: {
    pageSize: SMALL_PAGE_SIZE,
    page: DEFAULT_PAGE,
  },

  /**
   * Standard pagination (20 items per page).
   * Use for most list views.
   */
  standard: {
    pageSize: MEDIUM_PAGE_SIZE,
    page: DEFAULT_PAGE,
  },

  /**
   * Large pagination (50 items per page).
   * Use for desktop views or detailed lists.
   */
  large: {
    pageSize: LARGE_PAGE_SIZE,
    page: DEFAULT_PAGE,
  },

  /**
   * Extra large pagination (100 items per page).
   * Use for bulk operations or admin views.
   */
  xlarge: {
    pageSize: XLARGE_PAGE_SIZE,
    page: DEFAULT_PAGE,
  },
} as const;

export type PaginationPreset = keyof typeof PAGINATION_PRESETS;
