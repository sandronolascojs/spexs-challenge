import { Injectable } from '@nestjs/common';
import { TRPCError, initTRPC } from '@trpc/server';
import SuperJSON from 'superjson';
import type { TrpcContext } from './trpc.context';

const t = initTRPC.context<TrpcContext>().create({ transformer: SuperJSON });

/**
 * Public procedure — no authentication required.
 * ctx.session is Session | null.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires an authenticated session.
 * Throws UNAUTHORIZED if the request has no valid session.
 * ctx.session is narrowed to Session (never null).
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

@Injectable()
export class TrpcService {
  router = t.router;
  mergeRouters = t.mergeRouters;
  publicProcedure = publicProcedure;
  protectedProcedure = protectedProcedure;
}
