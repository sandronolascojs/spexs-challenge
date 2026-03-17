# No Magic Values

Magic strings, numbers, and boolean flags scattered through code are a maintenance hazard.
They make refactoring error-prone, break search, and hide intent.

## Rule: every literal that carries meaning must be named

```ts
// ❌ BAD
if (user.role === 'admin') { ... }
if (status === 'pending') { ... }
setTimeout(fn, 86400000);
const items = data.slice(0, 20);

// ✅ GOOD
if (user.role === UserRole.Admin) { ... }
if (status === OrderStatus.Pending) { ... }
setTimeout(fn, WEEK_MS);
const items = data.slice(0, PAGE_SIZE);
```

## Enums over string unions for domain values

Use `enum` for any value that belongs to a closed set of domain concepts.

```ts
// ✅ Enum for domain values — lives in packages/types (@spexs/types)
export enum UserRole {
  Admin = 'admin',
  Member = 'member',
  Guest = 'guest',
}

export enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Cancelled = 'cancelled',
}
```

String unions (`type Status = 'active' | 'inactive'`) are only acceptable for purely
structural/presentational distinctions with no domain meaning.

## Zod schemas must reference enums — never re-declare literals

```ts
// ❌ BAD — duplicates domain values, drifts out of sync
const schema = z.object({
  role: z.enum(['admin', 'member', 'guest']),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
});

// ✅ GOOD — z.nativeEnum keeps a single source of truth
import { UserRole, OrderStatus } from '@spexs/types';

const schema = z.object({
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(OrderStatus),
});
```

Always use `z.nativeEnum(Enum)` — it infers the correct type automatically with no assertions needed.

## Named constants for numbers

```ts
// ❌ BAD
const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

// ✅ GOOD
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const expiresAt = Date.now() + WEEK_MS;
```

Constants reused across features go in a shared `constants/` file or in `@spexs/types`.
