import type { TriggerVarianceData } from '@spexs/types';

interface TriggerVarianceBodyProps {
  data: TriggerVarianceData;
}

export function TriggerVarianceBody({ data }: TriggerVarianceBodyProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Metric
        </p>
        <p className="truncate text-sm font-semibold">{data.metricName}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Base value</p>
          <p className="font-mono text-sm font-semibold">{data.baseValue}</p>
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Max deviation</p>
          <p className="font-mono text-sm font-semibold">
            &plusmn;{data.deviationPercentage}%
          </p>
        </div>
      </div>
    </div>
  );
}
