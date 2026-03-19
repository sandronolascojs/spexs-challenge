import {
  type EdgeProps,
  type EdgeTypes,
  getSmoothStepPath,
} from '@xyflow/react';

// ── ID helpers ────────────────────────────────────────────────────────────────

function gradientId(id: string) {
  return `wf-grad-${id}`;
}

function glowFilterId(id: string) {
  return `wf-glow-${id}`;
}

// ── Shared path ───────────────────────────────────────────────────────────────

function buildPath(props: EdgeProps): string {
  const [path] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 8,
  });
  return path;
}

// ── Default variant ───────────────────────────────────────────────────────────

function WorkflowEdgeDefault(props: EdgeProps) {
  const { id, selected, sourceX, sourceY, targetX, targetY } = props;
  const d = buildPath(props);
  const gid = gradientId(id);
  const fid = glowFilterId(id);

  return (
    <>
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" style={{ stopColor: 'var(--chart-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--chart-2)' }} />
        </linearGradient>
        <filter id={fid}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer */}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={5}
        opacity={0.3}
        filter={`url(#${fid})`}
      />

      {/* Main stroke */}
      <path
        id={id}
        d={d}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={1.75}
        strokeDasharray={selected ? '6 4' : undefined}
        style={
          selected ? { animation: 'wf-dash 0.5s linear infinite' } : undefined
        }
      />

      {/* Main stroke */}
      <path
        id={id}
        d={d}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={1.75}
        strokeDasharray={selected ? '6 4' : undefined}
        style={
          selected ? { animation: 'wf-dash 0.5s linear infinite' } : undefined
        }
      />
    </>
  );
}

// ── Animated variant (flowing particle) ──────────────────────────────────────

function WorkflowEdgeAnimated(props: EdgeProps) {
  const { id, selected, sourceX, sourceY, targetX, targetY } = props;
  const d = buildPath(props);
  const gid = gradientId(id);
  const fid = glowFilterId(id);

  return (
    <>
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" style={{ stopColor: 'var(--chart-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--chart-2)' }} />
        </linearGradient>
        <filter id={fid}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer */}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={5}
        opacity={0.25}
        filter={`url(#${fid})`}
      />

      {/* Main stroke */}
      <path
        id={id}
        d={d}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={1.75}
        strokeDasharray={selected ? '6 4' : undefined}
        style={
          selected ? { animation: 'wf-dash 0.5s linear infinite' } : undefined
        }
      />

      {/* Flowing particle */}
      <circle r="3" style={{ fill: 'var(--chart-1)' }} opacity={0.9}>
        <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
      </circle>
    </>
  );
}

// ── Edge type registry ────────────────────────────────────────────────────────

export const WORKFLOW_EDGE_TYPES: EdgeTypes = {
  'workflow-default': WorkflowEdgeDefault,
  'workflow-animated': WorkflowEdgeAnimated,
};
