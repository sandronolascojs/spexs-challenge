---
name: backend-architecture
description: NestJS backend patterns for apps/api. Covers module structure, repository layer, service layer, avoiding circular dependencies, module imports/exports, and tRPC route organisation per module.
user-invocable: false
---

# Backend Architecture

Patterns for the NestJS API at `apps/api`. Every module follows the same layered structure.

## Files

- [module-structure.md](./module-structure.md) — anatomy of a feature module: repository, service, tRPC router, module wiring
- [repository-layer.md](./repository-layer.md) — repository pattern: what lives here, how to inject, rules
- [trpc-routes.md](./trpc-routes.md) — how to write tRPC routes per module and merge them into the root router
- [circular-dependencies.md](./circular-dependencies.md) — how to avoid circular deps: module imports, forwardRef rules, export discipline
- [auth.md](./auth.md) — Better Auth setup, `publicProcedure` vs `protectedProcedure`, session in tRPC context, NestJS guard decorators
