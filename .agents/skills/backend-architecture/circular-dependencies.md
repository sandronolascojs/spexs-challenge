# Avoiding Circular Dependencies

Circular dependencies in NestJS cause runtime errors and are a sign of poor module design.
The solution is almost always better boundary discipline, not `forwardRef`.

## The dependency direction rule

Dependencies must flow in one direction only:

```
Router → Service → Repository → Database
```

Nothing lower in the stack imports anything higher.

```
// ❌ NEVER
UsersRepository → UsersService   (repository importing service)
UsersService → UsersRouter       (service importing router)
OrdersModule → UsersModule → OrdersModule  (mutual module imports)
```

## Cross-feature dependencies: import the module, inject the service

When feature A needs data from feature B, import `FeatureBModule` and inject `FeatureBService`.
Never inject `FeatureBRepository` directly from outside its own module.

```ts
// ❌ BAD — crosses module boundaries at the wrong layer
@Injectable()
export class OrdersService {
  constructor(private readonly usersRepository: UsersRepository) {} // wrong layer
}

// ✅ GOOD — go through the service, import the module
@Injectable()
export class OrdersService {
  constructor(private readonly usersService: UsersService) {}
}

// orders/orders.module.ts
@Module({
  imports: [UsersModule],   // import the module to access its exports
  providers: [OrdersRepository, OrdersService, OrdersRouter],
  exports: [OrdersService, OrdersRouter],
})
export class OrdersModule {}

// users/users.module.ts — must export UsersService for OrdersModule to use it
@Module({
  providers: [UsersRepository, UsersService, UsersRouter],
  exports: [UsersService, UsersRouter],  // export what other modules are allowed to use
})
export class UsersModule {}
```

## Export discipline

Only export what other modules legitimately need.

| Provider | Export? |
|---|---|
| `[Feature]Service` | Yes — other services may need it |
| `[Feature]Router` | Yes — TrpcModule needs it to merge routers |
| `[Feature]Repository` | No — internal to the module |

## If you think you need `forwardRef`

Stop. A genuine need for `forwardRef` almost always means two modules have a circular
business dependency. The fix is to:

1. Extract the shared logic into a third module that both can import, or
2. Redesign the dependency direction so one module clearly owns the concept

`forwardRef` is a last resort for unavoidable circular references (e.g. self-referential
entities). It is not a workaround for design issues.

## Module import checklist

Before adding an import to a module, ask:
- Does this module own the concept I need, or am I reaching into the wrong layer?
- Will this create a cycle? (`A imports B` and `B imports A`)
- Am I importing a module or trying to inject a provider directly without importing its module?

```ts
// ❌ BAD — using a service from a module that was never imported
@Module({
  providers: [OrdersService], // OrdersService injects UsersService...
})                            // ...but UsersModule is not imported — NestJS will throw

// ✅ GOOD
@Module({
  imports: [UsersModule],     // UsersModule exports UsersService → now injectable
  providers: [OrdersService],
})
```
