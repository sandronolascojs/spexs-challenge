'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface DashboardStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  breakdown?: { label: string; value: number; className?: string }[];
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  breakdown,
}: DashboardStatCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {breakdown.map((item) => (
              <span
                key={item.label}
                className={`text-xs text-muted-foreground ${item.className ?? ''}`}
              >
                {item.value} {item.label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
