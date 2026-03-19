import { type INestApplication, Injectable, Logger } from '@nestjs/common';
import * as trpcExpress from '@trpc/server/adapters/express';
import { z } from 'zod';
import { buildEventsRouter } from '../events/events.router';
import { EventsService } from '../events/events.service';
import { buildExecutionsRouter } from '../executions/executions.router';
import { ExecutionsService } from '../executions/executions.service';
import { buildWorkflowsRouter } from '../workflows/workflows.router';
import { WorkflowsService } from '../workflows/workflows.service';
import { createTrpcContext } from './trpc.context';
import { TrpcService } from './trpc.service';

@Injectable()
export class TrpcRouter {
  appRouter: ReturnType<typeof this.buildRouter>;
  private readonly logger = new Logger(TrpcRouter.name);

  constructor(
    private readonly trpc: TrpcService,
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
    private readonly eventsService: EventsService,
  ) {
    this.appRouter = this.buildRouter();
  }

  private buildRouter() {
    return this.trpc.router({
      hello: this.trpc.publicProcedure
        .input(z.object({ name: z.string().min(1).optional() }))
        .query(({ input }) => {
          return { message: `Hello, ${input?.name ?? 'World'}!` };
        }),

      me: this.trpc.protectedProcedure.query(({ ctx }) => {
        return { user: ctx.session.user };
      }),

      workflows: buildWorkflowsRouter(this.trpc, this.workflowsService),
      executions: buildExecutionsRouter(this.trpc, this.executionsService),
      events: buildEventsRouter(this.trpc, this.eventsService),
    });
  }

  async applyMiddleware(app: INestApplication) {
    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
        createContext: createTrpcContext,
        onError: ({ path, error }) => {
          if (error.code === 'INTERNAL_SERVER_ERROR') {
            this.logger.error(
              `tRPC error on ${path}: ${error.message}`,
              error.stack,
            );
          }
        },
      }),
    );
  }
}

export type AppRouter = TrpcRouter['appRouter'];
