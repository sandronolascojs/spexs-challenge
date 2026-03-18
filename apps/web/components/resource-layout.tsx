'use client';

import { ListPagination } from '@/components/list-pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@spexs/types';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ResourceSection {
  title?: string;
  description?: string;
  content: ReactNode;
}

type LayoutSize = 'md' | 'lg' | 'xl' | '2xl' | 'full';

const layoutSizeClasses: Record<LayoutSize, string> = {
  md: 'max-w-4xl', // 896px
  lg: 'max-w-5xl', // 1024px
  xl: 'max-w-6xl', // 1152px
  '2xl': 'max-w-7xl', // 1280px
  full: 'max-w-full',
};

const LOADING_CARD_SKELETON_KEYS = [
  'resource-card-skeleton-1',
  'resource-card-skeleton-2',
  'resource-card-skeleton-3',
  'resource-card-skeleton-4',
  'resource-card-skeleton-5',
  'resource-card-skeleton-6',
  'resource-card-skeleton-7',
  'resource-card-skeleton-8',
] as const;

const LOADING_PAGINATION_SKELETON_KEYS = [
  'resource-pagination-skeleton-1',
  'resource-pagination-skeleton-2',
  'resource-pagination-skeleton-3',
] as const;

interface ResourceLayoutProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Actions to display in the header (buttons, etc.) */
  headerActions?: ReactNode;
  /** Filters content (sort, filters) - displayed below header on the right */
  filters?: ReactNode;
  /** Main content */
  children?: ReactNode;
  /** Alternative: Main content sections */
  sections?: ResourceSection[];
  /** Configuration section content */
  config?: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Pagination meta for list views */
  paginationMeta?: PaginationMeta;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Additional class names */
  className?: string;
  /** Layout max-width size (defaults to 'full') */
  size?: LayoutSize;
}

/**
 * Reusable layout component for resource pages.
 * Standard structure:
 * 1. Header (title + description + actions)
 * 2. Filters bar (sort, filters) - aligned right
 * 3. Content (grid, list, sections)
 * 4. Footer (pagination - always visible)
 */
export const ResourceLayout = ({
  title,
  description,
  headerActions,
  filters,
  children,
  sections = [],
  config,
  isLoading = false,
  error = null,
  paginationMeta,
  onPageChange,
  onPageSizeChange,
  className,
  size = 'full',
}: ResourceLayoutProps) => {
  const containerClasses = cn(
    'mx-auto flex h-full min-h-0 w-full flex-col p-6',
    layoutSizeClasses[size],
    className,
  );

  // Default pagination meta when not provided (10 items to avoid breaking UI)
  const defaultPaginationMeta: PaginationMeta = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const activePaginationMeta = paginationMeta ?? defaultPaginationMeta;

  if (isLoading) {
    return (
      <div className={containerClasses}>
        <div className="flex flex-1 flex-col space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              {description && <Skeleton className="h-4 w-72" />}
            </div>
            <div className="flex flex-col items-end gap-3">
              <Skeleton className="h-9 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-[130px]" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {LOADING_CARD_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
          {/* Pagination skeleton */}
          <div className="flex items-center justify-between pt-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1">
              {LOADING_PAGINATION_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-8 w-8" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClasses}>
        <Card className="border-destructive/50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">
                  Something went wrong
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Page Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Title and Description */}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {/* Right: Actions and Filters */}
          <div className="flex flex-col items-end gap-3">
            {headerActions && (
              <div className="flex shrink-0 items-center gap-2">
                {headerActions}
              </div>
            )}
            {filters}
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-6 flex-1 min-h-0 overflow-y-auto">
          {children}

          {/* Sections (alternative to children) */}
          {sections.length > 0 && (
            <div className="space-y-6">
              {sections.map((section) => (
                <section
                  key={`${section.title ?? 'section'}-${section.description ?? ''}`}
                  className="space-y-4"
                >
                  {(section.title || section.description) && (
                    <div className="space-y-1">
                      {section.title && (
                        <h2 className="text-lg font-semibold tracking-tight">
                          {section.title}
                        </h2>
                      )}
                      {section.description && (
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      )}
                    </div>
                  )}
                  {section.content}
                </section>
              ))}
            </div>
          )}

          {/* Configuration Section */}
          {config && (
            <section className="mt-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage settings and preferences
                </p>
              </div>
              {config}
            </section>
          )}
        </div>

        {/* Footer - Pagination (always visible) */}
        {onPageChange && (
          <div className="mt-6 shrink-0 pt-4">
            <ListPagination
              meta={activePaginationMeta}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};
