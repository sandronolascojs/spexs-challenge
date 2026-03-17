# Types and Schemas

## No `any`, no `unknown`, no type assertions

Every value must have a correct, specific type. Reaching for `any`, `unknown`, or `as`
means the types are wrong somewhere upstream — fix the root cause.

```ts
// ❌ Never
const data: any = response.json();
const user = response as User;
function process(input: unknown) {}

// ✅ Always type correctly from the source
const data: ApiResponse<User> = await response.json();
// If the API shape is not typed, add a Zod schema and parse it
const user = UserSchema.parse(await response.json());
```

## Zod schemas are the single source of truth for runtime shapes

Define the schema once, infer the TypeScript type from it — never write the type separately.

```ts
// ❌ BAD — type and schema can drift
type CreateUserDto = {
  name: string;
  email: string;
  role: UserRole;
};

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']), // magic strings, and drifts from the type
});

// ✅ GOOD — one definition
import { UserRole } from '@spexs/types';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

## Enum-driven schemas

Always use `z.nativeEnum(Enum)` for TypeScript enums in Zod.
Never re-declare the enum values as string literals inside the schema.

```ts
// ❌ BAD
role: z.enum(['admin', 'member', 'guest'])

// ✅ GOOD
role: z.nativeEnum(UserRole)
```

## Shared types live in `@spexs/types`

Types and enums used by both frontend and backend (or between multiple apps/packages)
belong in `packages/types` and are imported as `@spexs/types`.

```ts
// ✅ Import shared domain types from the package
import { UserRole, OrderStatus, type User, type Order } from '@spexs/types';
```

Never duplicate a domain type in `apps/web` or `apps/api` if it is already in `@spexs/types`.

## DTOs and API contracts

- **Input DTOs** (what the API receives): defined with Zod, type inferred, validated at the boundary.
- **Output types** (what the API returns): typed interfaces or inferred from Zod schemas, exported from `@spexs/types`.
- Never use plain `object` or untyped JSON as a function return type.

## Generics over repetition

When two types share structure, extract a generic — do not duplicate.

```ts
// ❌ BAD
interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
}
interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
}

// ✅ GOOD
interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
}

type PaginatedUsers = Paginated<User>;
type PaginatedOrders = Paginated<Order>;
```
