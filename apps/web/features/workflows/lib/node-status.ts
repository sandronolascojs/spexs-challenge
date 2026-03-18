import type { NodeStatus } from '@/components/ui/react-flow/node-status-indicator';
import { NodeExecutionStatus } from '@spexs/types';

export function mapExecutionStatusToIndicator(
  status?: NodeExecutionStatus,
): NodeStatus {
  if (!status) return 'initial';

  switch (status) {
    case NodeExecutionStatus.RUNNING:
      return 'loading';
    case NodeExecutionStatus.SUCCESS:
      return 'success';
    case NodeExecutionStatus.FAILED:
      return 'error';
    default:
      return 'initial';
  }
}
