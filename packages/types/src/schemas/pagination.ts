import { z } from 'zod';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORT_DIRECTIONS,
} from '../constants/pagination';

/**
 * Base pagination query parameters schema.
 * Use this for API endpoints that support pagination.
 */
export const paginationQuerySchema = z.object({
  /**
   * Page number (1-indexed).
   * @default 1
   */
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),

  /**
   * Number of items per page.
   * @default 20
   * @max 200
   */
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),

  /**
   * Field to sort by.
   * Optional, depends on endpoint implementation.
   */
  sortBy: z.string().optional(),

  /**
   * Sort direction.
   * @default 'desc'
   */
  sortDirection: z
    .enum([SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC])
    .default(SORT_DIRECTIONS.DESC),
});

/**
 * Pagination query parameters type.
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Paginated response metadata schema.
 */
export const paginationMetaSchema = z.object({
  /**
   * Current page number.
   */
  page: z.number().int().positive(),

  /**
   * Number of items per page.
   */
  pageSize: z.number().int().positive(),

  /**
   * Total number of items across all pages.
   */
  total: z.number().int().nonnegative(),

  /**
   * Total number of pages.
   */
  totalPages: z.number().int().nonnegative(),

  /**
   * Whether there is a next page.
   */
  hasNextPage: z.boolean(),

  /**
   * Whether there is a previous page.
   */
  hasPreviousPage: z.boolean(),
});

/**
 * Pagination metadata type.
 */
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Paginated response schema.
 * Generic schema for paginated API responses.
 *
 * @example
 * ```ts
 * const paginatedUsersSchema = paginatedResponseSchema(userSchema);
 * ```
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    /**
     * Array of items for the current page.
     */
    items: z.array(itemSchema),

    /**
     * Pagination metadata.
     */
    meta: paginationMetaSchema,
  });

/**
 * Helper function to calculate pagination metadata.
 */
export const calculatePaginationMeta = (
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
