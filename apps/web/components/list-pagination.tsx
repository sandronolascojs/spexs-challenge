'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PAGE_SIZE,
  LARGE_PAGE_SIZE,
  type PaginationMeta,
  SMALL_PAGE_SIZE,
  XLARGE_PAGE_SIZE,
} from '@spexs/types';

/** Official page size options from pagination constants */
const PAGE_SIZE_OPTIONS = [
  SMALL_PAGE_SIZE, // 10
  DEFAULT_PAGE_SIZE, // 20
  LARGE_PAGE_SIZE, // 50
  XLARGE_PAGE_SIZE, // 100
];

interface ListPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  showPageSize?: boolean;
  showTotal?: boolean;
}

/**
 * Reusable list pagination component.
 * Always visible, even with 0 or 1 page.
 * Uses official pagination constants from @agenticrelay/types.
 */
export function ListPagination({
  meta,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
  showPageSize = true,
  showTotal = true,
}: ListPaginationProps) {
  const { page, pageSize, total, totalPages } = meta;

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const hasMultiplePages = totalPages > 1;

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];

    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 sm:flex-row',
        className,
      )}
    >
      {/* Left side - Total count and page size */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showTotal && (
          <span>
            {total === 0 ? (
              'No items'
            ) : (
              <>
                Showing {startItem}-{endItem} of {total}
              </>
            )}
          </span>
        )}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">per page</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side - Page navigation using shadcn Pagination */}
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => canGoPrevious && onPageChange(page - 1)}
              className={cn(!canGoPrevious && 'pointer-events-none opacity-50')}
              aria-disabled={!canGoPrevious}
            />
          </PaginationItem>

          {getPageNumbers().map((pageNum, index) => (
            <PaginationItem
              key={pageNum === 'ellipsis' ? `ellipsis-${index}` : pageNum}
            >
              {pageNum === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => hasMultiplePages && onPageChange(pageNum)}
                  isActive={pageNum === page}
                  className={cn(!hasMultiplePages && 'pointer-events-none')}
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => canGoNext && onPageChange(page + 1)}
              className={cn(!canGoNext && 'pointer-events-none opacity-50')}
              aria-disabled={!canGoNext}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
