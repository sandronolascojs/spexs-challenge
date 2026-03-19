'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Panel, useReactFlow } from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useCallback } from 'react';

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.22, maxZoom: 1.25 });
  }, [fitView]);

  return (
    <Panel position="bottom-left" className="m-4">
      <div className="flex flex-col border border-border bg-card shadow-sm">
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-none"
          onClick={handleZoomIn}
        >
          <Plus data-icon />
        </Button>
        <Separator />
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-none"
          onClick={handleZoomOut}
        >
          <Minus data-icon />
        </Button>
        <Separator />
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-none"
          onClick={handleFitView}
        >
          <Maximize data-icon />
        </Button>
      </div>
    </Panel>
  );
}
