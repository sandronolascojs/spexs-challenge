'use client';

import { Panel, type PanelProps, useReactFlow, useStore } from '@xyflow/react';
import React, { useCallback } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function ZoomSelect({
  className,
  ...props
}: Omit<PanelProps, 'children'>) {
  const { zoomTo, fitView } = useReactFlow();

  const handleZoomChange = useCallback(
    (value: string | null) => {
      if (!value) {
        return;
      }

      if (value === 'best-fit') {
        fitView();
      } else {
        const zoomValue = Number.parseFloat(value);
        if (!Number.isNaN(zoomValue)) {
          zoomTo(zoomValue);
        }
      }
    },
    [fitView, zoomTo],
  );

  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);

  const zoomLevels = React.useMemo(() => {
    const levels = [];
    const zoomIncrement = 50;

    for (
      let i = Math.ceil(minZoom * 100);
      i <= Math.floor(maxZoom * 100);
      i += zoomIncrement
    ) {
      levels.push((i / 100).toString());
    }

    return levels;
  }, [minZoom, maxZoom]);

  return (
    <Panel
      className={cn(
        'flex rounded-md border border-border bg-card/95 text-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <Select onValueChange={handleZoomChange}>
        <SelectTrigger className="w-[140px] border-0 bg-transparent shadow-none">
          <SelectValue placeholder="Zoom" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="best-fit">Best Fit</SelectItem>
          <div className="mx-2 my-1 border-t border-border" />
          {zoomLevels.map((level) => (
            <SelectItem key={level} value={level}>
              {`${(Number.parseFloat(level) * 100).toFixed(0)}%`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Panel>
  );
}
