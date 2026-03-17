'use client';

import { BellRing, GalleryVerticalEnd, GitBranch } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

const navMain = [
  {
    title: 'Workflows',
    url: '/workflows',
    icon: GitBranch,
    isActive: true,
    items: [
      { title: 'All Workflows', url: '/workflows' },
      { title: 'New Workflow', url: '/workflows/new' },
    ],
  },
  {
    title: 'Events',
    url: '/events',
    icon: BellRing,
    items: [
      { title: 'Open', url: '/events?status=open' },
      { title: 'History', url: '/events' },
    ],
  },
];

const pinnedWorkflows = [
  { name: 'CPU Threshold Alert', url: '/workflows/1', icon: GitBranch },
  { name: 'Memory Variance Watch', url: '/workflows/2', icon: GitBranch },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            Workflow Manager
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={pinnedWorkflows} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
