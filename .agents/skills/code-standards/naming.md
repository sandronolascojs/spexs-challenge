# Naming

Names are the most powerful documentation tool available. A well-named function, variable,
or type makes comments unnecessary.

## Reveal intent

The name should answer: what is this, what does it do, why does it exist.

```ts
// ❌ Bad
const d = new Date();
const arr = users.filter(u => u.active);
function calc(a: number, b: number) {}

// ✅ Good
const createdAt = new Date();
const activeUsers = users.filter(isActiveUser);
function calculateMonthlyRevenue(orders: Order[]): number {}
```

## Conventions

| Thing | Convention | Example |
|---|---|---|
| Variables / functions | camelCase | `activeUsers`, `fetchOrders` |
| Types / interfaces / enums | PascalCase | `UserRole`, `OrderStatus`, `CreateUserDto` |
| Enum members | PascalCase | `UserRole.Admin` |
| Constants | SCREAMING_SNAKE_CASE | `PAGE_SIZE`, `WEEK_MS` |
| React components | PascalCase | `UserCard`, `OrdersList` |
| Files — components | kebab-case | `user-card.tsx` |
| Files — hooks | kebab-case, prefixed `use-` | `use-user-list.ts` |
| Boolean variables/props | prefix `is`, `has`, `can`, `should` | `isLoading`, `hasPermission` |

## Functions: verbs, nouns for what they return

```ts
// Actions → verb + noun
createOrder, deleteUser, fetchInvoices, validateInput

// Predicates → is/has/can prefix
isAdmin, hasPermission, canEditPost

// Event handlers → handle + event
handleSubmit, handleRowClick

// Hooks → use prefix
useOrdersList, useCreateUser
```

## Avoid abbreviations

Abbreviations save a few keystrokes and cost hours of comprehension later.

```ts
// ❌ Bad
const usr = getUsr();
const cfg = loadCfg();
function calcRev(ords: Ord[]) {}

// ✅ Good
const user = getUser();
const config = loadConfig();
function calculateRevenue(orders: Order[]) {}
```

Exceptions: universally understood abbreviations (`id`, `url`, `api`, `dto`, `ctx`, `db`).

## Avoid noise words

`data`, `info`, `manager`, `helper`, `util`, `handler` are almost always meaningless.
Name the thing by what it specifically is or does.

```ts
// ❌ Bad
class UserManager {}
const userData = fetchUserInfo();

// ✅ Good
class UserRepository {}
const user = fetchUser(id);
```
