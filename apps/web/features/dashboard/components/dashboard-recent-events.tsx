'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardRecentEvent } from '@spexs/types';
import { AlertEventStatus } from '@spexs/types';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Moon } from 'lucide-react';
import Link from 'next/link';

interface DashboardRecentEventsProps {
  events: DashboardRecentEvent[];
}

const EVENT_STATUS_CONFIG = {
  [AlertEventStatus.OPEN]: {
    label: 'Open',
    icon: AlertTriangle,
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  [AlertEventStatus.SNOOZED]: {
    label: 'Snoozed',
    icon: Moon,
    badgeClass:
      'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  [AlertEventStatus.RESOLVED]: {
    label: 'Resolved',
    icon: CheckCircle2,
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
} as const;

export function DashboardRecentEvents({ events }: DashboardRecentEventsProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
          <Link
            href="/events"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <RecentEventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventRow({ event }: { event: DashboardRecentEvent }) {
  const config =
    EVENT_STATUS_CONFIG[event.status] ??
    EVENT_STATUS_CONFIG[AlertEventStatus.OPEN];
  const StatusIcon = config.icon;

  return (
    <li className="flex items-center gap-3">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${config.badgeClass}`}
      >
        <StatusIcon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/workflows/${event.workflowId}`}
          className="truncate text-sm font-medium hover:underline"
        >
          {event.workflowName}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {format(new Date(event.createdAt), 'MMM d, HH:mm')}
        </div>
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide ${config.badgeClass}`}
      >
        {config.label}
      </Badge>
    </li>
  );
}
