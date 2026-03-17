# Module Structure

Every feature in `apps/api/src` is a self-contained NestJS module with a fixed layer order.

## Directory layout

```
src/
├── trpc/
│   ├── trpc.service.ts       # initTRPC — shared tRPC primitives
│   ├── trpc.router.ts        # Root router — merges all feature sub-routers
│   └── trpc.module.ts
│
├── [feature]/                # e.g. users/, orders/
│   ├── [feature].repository.ts
│   ├── [feature].service.ts
│   ├── [feature].router.ts   # tRPC sub-router for this feature
│   └── [feature].module.ts
│
└── app.module.ts             # Imports all feature modules + TrpcModule
```

## Layer responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Repository | `*.repository.ts` | All database access. No business logic. |
| Service | `*.service.ts` | Business logic. Uses repository. No DB access directly. |
| tRPC Router | `*.router.ts` | Input validation (Zod), calls service, returns response. No logic. |
| Module | `*.module.ts` | Wires the three layers. Declares exports when other modules need them. |

## Example: `users` module

```ts
// users/users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  findAll(params: FindAllUsersParams): Promise<User[]> {
    return this.db.user.findMany({ where: params });
  }

  create(data: CreateUserDto): Promise<User> {
    return this.db.user.create({ data });
  }
}
```

```ts
// users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }

  findAll(params: FindAllUsersParams): Promise<User[]> {
    return this.usersRepository.findAll(params);
  }

  create(data: CreateUserDto): Promise<User> {
    return this.usersRepository.create(data);
  }
}
```

```ts
// users/users.router.ts  — see trpc-routes.md for full detail
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
  });
}
```

```ts
// users/users.module.ts
@Module({
  imports: [DatabaseModule], // import what you need, export what others need
  providers: [UsersRepository, UsersService, UsersRouter],
  exports: [UsersService, UsersRouter], // export UsersRouter so TrpcModule can merge it
})
export class UsersModule {}
```

## Root router merges all feature sub-routers

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
}
```

```ts
// trpc/trpc.module.ts
@Module({
  imports: [UsersModule, OrdersModule], // import feature modules to access their routers
  providers: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
```
