'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Fragment } from 'react';

export interface DashboardBreadcrumbItem {
  id: string;
  label: ReactNode;
  href?: string;
}

interface DashboardTopNavbarProps {
  items: readonly DashboardBreadcrumbItem[];
  className?: string;
  contentClassName?: string;
  withBorder?: boolean;
}

function renderBreadcrumbItem(
  item: DashboardBreadcrumbItem,
  isLastItem: boolean,
): ReactNode {
  if (!isLastItem && item.href) {
    return <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>;
  }

  return <BreadcrumbPage>{item.label}</BreadcrumbPage>;
}

export function DashboardTopNavbar({
  items,
  className,
  contentClassName,
  withBorder = false,
}: DashboardTopNavbarProps) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
        withBorder && 'border-b',
        className,
      )}
    >
      <div
        className={cn('flex flex-1 items-center gap-2 px-4', contentClassName)}
      >
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 h-8 shrink-0 self-center"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {items.map((item, index) => {
              const isLastItem = index === items.length - 1;

              return (
                <Fragment key={item.id}>
                  <BreadcrumbItem>
                    {renderBreadcrumbItem(item, isLastItem)}
                  </BreadcrumbItem>
                  {!isLastItem && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
