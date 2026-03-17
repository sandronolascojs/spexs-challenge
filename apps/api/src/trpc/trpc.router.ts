import { INestApplication, Injectable } from '@nestjs/common';
import * as trpcExpress from '@trpc/server/adapters/express';
import { z } from 'zod';
import { TrpcService } from './trpc.service';
import { createTrpcContext } from './trpc.context';

@Injectable()
export class TrpcRouter {
  appRouter: ReturnType<typeof this.buildRouter>;

  constructor(private readonly trpc: TrpcService) {
    this.appRouter = this.buildRouter();
  }

  private buildRouter() {
    return this.trpc.router({
      // Public example — no auth required
      hello: this.trpc.publicProcedure
        .input(z.object({ name: z.string().min(1).optional() }))
        .query(({ input }) => {
          return { message: `Hello, ${input?.name ?? 'World'}!` };
        }),

      // Protected example — requires a valid session
      me: this.trpc.protectedProcedure.query(({ ctx }) => {
        return { user: ctx.session.user };
      }),
    });
  }

  async applyMiddleware(app: INestApplication) {
    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
        createContext: createTrpcContext,
      }),
    );
  }
}

export type AppRouter = TrpcRouter['appRouter'];
