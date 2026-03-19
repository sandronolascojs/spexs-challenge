'use client';

import { BellRing, GalleryVerticalEnd, GitBranch } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { NavWorkflows } from '@/components/nav-workflows';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { AlertEventStatus } from '@spexs/types';

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
      { title: 'Open', url: `/events?status=${AlertEventStatus.OPEN}` },
      { title: 'History', url: '/events' },
    ],
  },
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
        <NavWorkflows />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
