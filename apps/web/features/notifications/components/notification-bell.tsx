'use client';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { WORKFLOW_TABS } from '@/features/workflows/lib/search-params';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks/http/use-notifications';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NotificationData {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  workflowId: string | null;
  eventId: string | null;
}

function getNotificationHref(notification: NotificationData): string {
  return notification.workflowId
    ? `/workflows/${notification.workflowId}?tab=${WORKFLOW_TABS.HISTORY}`
    : '/events';
}

// ── Bell ───────────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: countData } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = countData?.count ?? 0;
  const notifications = notificationsData?.items ?? [];

  function handleMarkAllRead() {
    markAllReadMutation.mutate(undefined);
  }

  function handleClick(id: string, isRead: boolean) {
    if (!isRead) markReadMutation.mutate({ notificationId: id });
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton>
          <Bell />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-auto size-5 justify-center rounded-full px-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={4}
        className="w-72"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleMarkAllRead();
              }}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <Bell className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          <DropdownMenuGroup>
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} asChild>
                <Link
                  href={getNotificationHref(notification)}
                  onClick={() =>
                    handleClick(notification.id, notification.isRead)
                  }
                  className="flex items-start gap-2"
                >
                  {/* Unread dot */}
                  <div className="flex w-2 shrink-0 justify-center pt-1">
                    <div
                      className={cn(
                        'size-1.5 rounded-full',
                        notification.isRead ? 'bg-transparent' : 'bg-primary',
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        notification.isRead
                          ? 'text-muted-foreground'
                          : 'font-medium',
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/events" onClick={() => setOpen(false)}>
                <ExternalLink />
                View all events
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
