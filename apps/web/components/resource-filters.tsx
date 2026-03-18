'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';

export interface SortOption {
  label: string;
  value: string;
}

interface ResourceFiltersProps {
  /** Available sort options */
  sortOptions?: readonly SortOption[];
  /** Current sort field */
  sortBy?: string;
  /** Callback when sort field changes */
  onSortByChange?: (value: string) => void;
  /** Sort direction: 'asc' or 'desc' */
  sortDirection?: 'asc' | 'desc';
  /** Callback when sort direction changes */
  onSortDirectionChange?: (value: 'asc' | 'desc') => void;
  /** Additional content to render in filters bar */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Reusable filters bar for resource list views.
 * Includes sort by and sort direction controls.
 * Positioned to the right by default.
 */
export function ResourceFilters({
  sortOptions = [],
  sortBy,
  onSortByChange,
  sortDirection = 'desc',
  onSortDirectionChange,
  children,
  className,
}: ResourceFiltersProps) {
  const showSort = sortOptions.length > 0 && onSortByChange !== undefined;
  const showSortDirection = onSortDirectionChange !== undefined;
  const selectedSortOption = sortOptions.find(
    (option) => option.value === sortBy,
  );
  const selectedSortLabel = selectedSortOption?.label;

  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      {/* Additional filters */}
      {children}

      {/* Sort By */}
      {showSort && (
        <Select
          value={sortBy}
          onValueChange={(value) => {
            if (!value) {
              return;
            }

            onSortByChange(value);
          }}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Sort by">{selectedSortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort Direction */}
      {showSortDirection && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() =>
            onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
          }
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUpAZ className="h-4 w-4" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
