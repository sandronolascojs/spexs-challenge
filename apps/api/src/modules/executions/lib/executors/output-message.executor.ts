import { outputMessageDataSchema } from '@spexs/types';
import { TRPCError } from '@trpc/server';
import Handlebars from 'handlebars';
import type { NodeExecutor, WorkflowContext } from '../executor-types';

/**
 * Interpolates the message template using Handlebars with the execution context.
 * Supports `{{trigger.metricName}}`, `{{trigger.value}}`, etc.
 */
export const outputMessageExecutor: NodeExecutor = async ({
  node,
  context,
}) => {
  const parsed = outputMessageDataSchema.safeParse(node.data);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid output message node data: ${parsed.error.message}`,
    });
  }

  const compiledTemplate = Handlebars.compile(parsed.data.template);
  const renderedMessage = compiledTemplate(context);

  const output: WorkflowContext = {
    message: {
      text: renderedMessage,
      template: parsed.data.template,
    },
  };

  return output;
};
