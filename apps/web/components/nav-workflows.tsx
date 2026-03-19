'use client';

import {
  Folder,
  Forward,
  GitBranch,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { WORKFLOW_TABS } from '@/features/workflows/lib/search-params';
import { useTRPC } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';

export function NavWorkflows() {
  const { isMobile } = useSidebar();
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.workflows.list.queryOptions({
      page: 1,
      pageSize: 3,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    }),
  );

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Recent Workflows</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuSkeleton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  const workflows = data?.items ?? [];

  if (workflows.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Recent Workflows</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-sidebar-foreground/70">
              <Link href="/workflows/new">
                <GitBranch className="text-sidebar-foreground/70" />
                <span>Create your first workflow</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Workflows</SidebarGroupLabel>
      <SidebarMenu>
        {workflows.map((workflow) => (
          <SidebarMenuItem key={workflow.id}>
            <SidebarMenuButton asChild>
              <Link
                href={`/workflows/${workflow.id}?tab=${WORKFLOW_TABS.CANVAS}`}
              >
                <GitBranch />
                <span className="truncate">{workflow.name}</span>
                {workflow.isActive && (
                  <span className="ml-auto size-2 rounded-full bg-emerald-500" />
                )}
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <SidebarMenuAction showOnHover asChild>
                <DropdownMenuTrigger>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </DropdownMenuTrigger>
              </SidebarMenuAction>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem asChild>
                  <Link
                    href={`/workflows/${workflow.id}?tab=${WORKFLOW_TABS.CANVAS}`}
                  >
                    <Folder className="text-muted-foreground" />
                    <span>View Workflow</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <span>Simulate Trigger</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 />
                  <span>Delete Workflow</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-sidebar-foreground/70">
            <Link href="/workflows">
              <MoreHorizontal className="text-sidebar-foreground/70" />
              <span>All Workflows</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
