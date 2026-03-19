import { ComparisonOperator } from '@spexs/types';

const OPERATOR_SYMBOL: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GREATER_THAN]: '>',
  [ComparisonOperator.LESS_THAN]: '<',
  [ComparisonOperator.GREATER_THAN_OR_EQUAL]: '\u2265',
  [ComparisonOperator.LESS_THAN_OR_EQUAL]: '\u2264',
  [ComparisonOperator.EQUAL]: '=',
};

export function getOperatorSymbol(
  operator: ComparisonOperator | null | undefined,
): string {
  if (!operator) return '?';
  return OPERATOR_SYMBOL[operator] ?? '?';
}
