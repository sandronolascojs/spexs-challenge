const OPERATOR_SYMBOL: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  eq: '=',
};

export function getOperatorLabel(operator: string | null): string {
  if (!operator) return '?';
  return OPERATOR_SYMBOL[operator] ?? '?';
}
