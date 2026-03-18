import Handlebars from 'handlebars';
import type { NodeExecutor, WorkflowContext } from '../executor-types';

interface OutputMessageNodeData {
  readonly template: string;
}

/**
 * Interpolates the message template using Handlebars with the execution context.
 * Supports `{{trigger.metricName}}`, `{{trigger.value}}`, etc.
 */
export const outputMessageExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const nodeData = node.data as OutputMessageNodeData;
  const compiledTemplate = Handlebars.compile(nodeData.template);
  const renderedMessage = compiledTemplate(context);

  const output: WorkflowContext = {
    message: {
      text: renderedMessage,
      template: nodeData.template,
    },
  };

  return output;
};
