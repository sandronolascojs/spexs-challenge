import {
  type ConnectionLineComponentProps,
  getSmoothStepPath,
} from '@xyflow/react';

/**
 * Shown while the user is dragging a new connection between nodes.
 * Renders as a dashed gradient line to indicate an in-progress connection.
 */
export function WorkflowConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
}: ConnectionLineComponentProps) {
  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
  });

  const gradId = 'wf-conn-line-grad';

  return (
    <g>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
        >
          <stop offset="0%" style={{ stopColor: 'var(--chart-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--chart-2)' }} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        strokeLinecap="round"
        opacity={0.75}
      />
    </g>
  );
}
