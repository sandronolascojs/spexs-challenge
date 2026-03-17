# Better Auth Integration

## Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Better Auth instance — single source of truth for auth config |
| `src/trpc/trpc.context.ts` | Creates tRPC context, extracts session from request |
| `src/trpc/trpc.service.ts` | Exposes `publicProcedure` and `protectedProcedure` |

## Auth instance (`src/lib/auth.ts`)

Configure database, providers, and plugins here. Never import from `@thallesp/nestjs-better-auth` here.

```ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: /* adapter */,
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session['user'];
```

## tRPC context (`src/trpc/trpc.context.ts`)

Called on every tRPC request. Converts Node.js headers to Web API Headers for Better Auth,
then resolves the session. Session is `null` for unauthenticated requests.

```ts
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/auth';

export interface TrpcContext {
  session: Session | null;
}

export async function createTrpcContext({ req }: { req: Request }): Promise<TrpcContext> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return { session };
}
```

Pass `createContext: createTrpcContext` to `trpcExpress.createExpressMiddleware` in `TrpcRouter.applyMiddleware`.

## Procedures (`src/trpc/trpc.service.ts`)

Two procedures are available for use in all feature routers:

### `publicProcedure`
No auth required. `ctx.session` is `Session | null`.

```ts
// Use for public API endpoints
router = this.trpc.router({
  healthCheck: this.trpc.publicProcedure.query(() => ({ ok: true })),
});
```

### `protectedProcedure`
Requires a valid session. Throws `UNAUTHORIZED` if not authenticated.
`ctx.session` is narrowed to `Session` (never null).

```ts
// Use for any endpoint that requires a logged-in user
router = this.trpc.router({
  me: this.trpc.protectedProcedure.query(({ ctx }) => ({
    user: ctx.session.user, // Session — not null
  })),
});
```

## NestJS route protection (REST controllers)

`AuthModule.forRoot({ auth })` registers a global `AuthGuard`. All NestJS controllers
are protected by default. Use decorators to override:

```ts
import { Session, AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

@Controller('example')
export class ExampleController {
  // Protected (default) — 401 if not authenticated
  @Get('me')
  getMe(@Session() session: UserSession) {
    return session.user;
  }

  // Public — no auth needed
  @Get('public')
  @AllowAnonymous()
  getPublic() {
    return { ok: true };
  }

  // Optional — session present if authenticated, null otherwise
  @Get('optional')
  @OptionalAuth()
  getOptional(@Session() session: UserSession | null) {
    return { authenticated: !!session };
  }
}
```

**Note:** tRPC routes bypass the NestJS `AuthGuard` because they are mounted via Express
middleware, not NestJS route handlers. Auth for tRPC is handled entirely by
`publicProcedure` / `protectedProcedure`.

## Required env vars

| Var | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Encryption secret — minimum 32 chars. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Base URL of the API (e.g. `http://localhost:3001`) |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:3000`) |

## Database adapter

`memoryAdapter()` is used for development. **Replace before production.**

```ts
// Prisma
import { prismaAdapter } from 'better-auth/adapters/prisma';
database: prismaAdapter(prisma, { provider: 'postgresql' })

// Drizzle
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
database: drizzleAdapter(db, { provider: 'pg' })
```
