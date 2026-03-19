import { type SQL, asc, desc } from 'drizzle-orm';
import { SORT_DIRECTIONS, SORT_FIELDS } from '../constants/pagination';
import type { PaginationQuery } from '../schemas/pagination';

/**
 * Generic helper to build orderBy clause from pagination query.
 * Maps sortBy field names to drizzle column references.
 *
 * @param pagination - Pagination query parameters
 * @param columnMap - Map of field names to drizzle column references
 * @param defaultField - Default field to sort by if sortBy is not provided
 * @returns Drizzle orderBy clause
 *
 * @example
 * ```ts
 * const orderBy = buildOrderBy(
 *   pagination,
 *   {
 *     createdAt: documents.createdAt,
 *     name: documents.name,
 *   },
 *   documents.createdAt
 * );
 * ```
 */
export function buildOrderBy<TColumn>(
  pagination: PaginationQuery,
  columnMap: Record<string, TColumn>,
  defaultField: TColumn,
): SQL {
  const sortField = pagination.sortBy ?? SORT_FIELDS.CREATED_AT;
  const column = columnMap[sortField] ?? defaultField;

  return pagination.sortDirection === SORT_DIRECTIONS.ASC
    ? asc(column as never)
    : desc(column as never);
}
