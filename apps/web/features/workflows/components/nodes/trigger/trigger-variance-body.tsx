import type { TriggerVarianceData } from '@spexs/types';

interface TriggerVarianceBodyProps {
  data: TriggerVarianceData;
}

export function TriggerVarianceBody({ data }: TriggerVarianceBodyProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Base Value
        </p>
        <p className="font-mono text-sm font-semibold">{data.baseValue}</p>
      </div>
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Max Deviation
        </p>
        <p className="font-mono text-sm font-semibold">
          &plusmn;{data.deviationPercentage}%
        </p>
      </div>
    </div>
  );
}
