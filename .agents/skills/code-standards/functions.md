# Functions

## Do one thing

A function should do exactly one thing and do it well.
If you need "and" to describe what it does, split it.

```ts
// ❌ BAD — validates AND saves AND sends notification
async function submitOrder(data: OrderInput) {
  if (!data.items.length) throw new Error('empty order');
  const order = await db.order.create(data);
  await emailClient.send(order.userId, 'Order confirmed');
  return order;
}

// ✅ GOOD — each step is named and isolated
async function submitOrder(data: OrderInput): Promise<Order> {
  validateOrder(data);
  const order = await createOrder(data);
  await notifyOrderConfirmed(order);
  return order;
}
```

## Short

If a function exceeds ~20 lines, it is almost certainly doing more than one thing.
Extract named sub-functions. The extracted name documents the intent better than a comment would.

## One level of abstraction per function

Do not mix high-level orchestration with low-level detail in the same function.

```ts
// ❌ BAD — mixes orchestration with string parsing detail
function processImport(raw: string) {
  const lines = raw.split('\n').filter(Boolean).map(l => l.trim());
  for (const line of lines) {
    const [id, name, email] = line.split(',');
    db.user.upsert({ id, name, email });
  }
}

// ✅ GOOD — orchestration reads like a sentence
function processImport(raw: string) {
  const rows = parseImportFile(raw);
  rows.forEach(upsertUser);
}
```

## Arguments

- 0–2 arguments: ideal
- 3+ arguments: use a named options object

```ts
// ❌ BAD
function createUser(name: string, email: string, role: UserRole, sendWelcome: boolean) {}

// ✅ GOOD
interface CreateUserOptions {
  name: string;
  email: string;
  role: UserRole;
  sendWelcome: boolean;
}

function createUser(options: CreateUserOptions): Promise<User> {}
```

## No boolean flag arguments

Boolean arguments are a sign the function does two things. Split it.

```ts
// ❌ BAD
function fetchUsers(includeDeleted: boolean) {}

// ✅ GOOD
function fetchActiveUsers(): Promise<User[]> {}
function fetchAllUsers(): Promise<User[]> {}
```

## Pure functions preferred

A function that takes inputs and returns an output with no side effects is easier to test,
understand, and reuse. Isolate side effects (DB writes, API calls, state mutation) at the
edges — keep the core logic pure.
