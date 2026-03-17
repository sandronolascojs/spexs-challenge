# tRPC Routes

Each feature module owns its own tRPC sub-router. The root `TrpcRouter` merges them all.

## File: `[feature]/[feature].router.ts`

The router is responsible for:
- Declaring input schemas (Zod)
- Calling the service
- Returning the response

No business logic lives here. The router is just a typed HTTP boundary.

```ts
// users/users.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc/trpc.service';
import { UsersService } from './users.service';
import { UserRole } from '@spexs/types';

// Input schemas — defined once, close to the router
const GetUserByIdSchema = z.object({
  id: z.string().uuid(),
});

const ListUsersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

@Injectable()
export class UsersRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly usersService: UsersService,
  ) {}

  router = this.trpc.router({
    getById: this.trpc.procedure
      .input(GetUserByIdSchema)
      .query(({ input }) => this.usersService.findById(input.id)),

    list: this.trpc.procedure
      .input(ListUsersSchema)
      .query(({ input }) => this.usersService.findAll(input)),

    create: this.trpc.procedure
      .input(CreateUserSchema)
      .mutation(({ input }) => this.usersService.create(input)),

    update: this.trpc.procedure
      .input(UpdateUserSchema)
      .mutation(({ input }) => this.usersService.update(input.id, input)),

    delete: this.trpc.procedure
      .input(GetUserByIdSchema)
      .mutation(({ input }) => this.usersService.delete(input.id)),
  });
}
```

## Merging into the root router

Every feature router is merged in `trpc/trpc.router.ts` under its feature namespace.
The namespace becomes the key used on the frontend (`trpc.users.list`, `trpc.orders.create`).

```ts
// trpc/trpc.router.ts
@Injectable()
export class TrpcRouter {
  appRouter: ReturnType<typeof this.buildRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly usersRouter: UsersRouter,
    private readonly ordersRouter: OrdersRouter,
  ) {
    this.appRouter = this.buildRouter();
  }

  private buildRouter() {
    return this.trpc.router({
      users: this.usersRouter.router,
      orders: this.ordersRouter.router,
    });
  }

  async applyMiddleware(app: INestApplication) {
    app.use('/trpc', trpcExpress.createExpressMiddleware({ router: this.appRouter }));
  }
}

export type AppRouter = TrpcRouter['appRouter'];
```

## Module wiring for a new feature router

1. Add `[Feature]Router` to `providers` and `exports` in `[feature].module.ts`
2. Import `[Feature]Module` in `trpc/trpc.module.ts`
3. Inject `[Feature]Router` in `TrpcRouter` constructor
4. Add the sub-router to `buildRouter()`

```ts
// trpc/trpc.module.ts
@Module({
  imports: [
    UsersModule,
    OrdersModule,
    // add new feature modules here
  ],
  providers: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
```

## Rules

- Input schemas live in the router file, not in the service or repository.
- Use `z.nativeEnum(Enum)` for enum inputs — never magic strings.
- Use `.query()` for reads, `.mutation()` for writes — always.
- The router calls exactly one service method per procedure. If you need more, add a service method.
- Throw `TRPCError` from the service, never from the router.
