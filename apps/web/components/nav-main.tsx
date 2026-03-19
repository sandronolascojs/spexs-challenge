'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

type NavLeafItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: never;
};

type NavGroupItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items: { title: string; url: string }[];
};

type NavItem = NavLeafItem | NavGroupItem;

function NavLeaf({ item }: { item: NavLeafItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <Link href={item.url}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroup({ item }: { item: NavGroupItem }) {
  return (
    <SidebarMenuItem>
      <Collapsible
        defaultOpen={item.isActive}
        className="group/collapsible w-full"
      >
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={item.title}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton asChild>
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items ? (
            <NavGroup key={item.title} item={item} />
          ) : (
            <NavLeaf key={item.title} item={item} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
