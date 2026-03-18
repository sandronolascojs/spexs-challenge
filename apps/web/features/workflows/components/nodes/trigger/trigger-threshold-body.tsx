import type { TriggerThresholdData } from '@spexs/types';
import { getOperatorSymbol } from '../../../lib/operator-label';

interface TriggerThresholdBodyProps {
  data: TriggerThresholdData;
}

export function TriggerThresholdBody({ data }: TriggerThresholdBodyProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Metric
        </p>
        <p className="truncate font-mono text-sm font-semibold">
          {data.metricName}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">value</span>
        <span className="font-mono text-sm font-bold text-primary">
          {getOperatorSymbol(data.operator)}
        </span>
        <span className="font-mono text-xs font-semibold">
          {data.thresholdValue}
        </span>
      </div>
    </div>
  );
}
