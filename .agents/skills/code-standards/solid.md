# SOLID Principles

## S — Single Responsibility Principle

Every function, hook, component, and class has exactly one reason to change.

```ts
// ❌ BAD — fetches data, transforms it, and formats for display all in one place
function UserCard({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => setUser({ ...data, name: data.firstName + ' ' + data.lastName }));
  }, [id]);

  return <div>{user?.name.toUpperCase()}</div>;
}

// ✅ GOOD — each concern in its own layer
// hooks/http/use-user.ts → fetches
// lib/formatters.ts → formats
// components/user-card.tsx → renders
function UserCard({ id }: { id: string }) {
  const { data: user } = useUser(id);
  return <div>{formatDisplayName(user)}</div>;
}
```

## O — Open/Closed Principle

Code is open for extension, closed for modification. Extend behaviour through composition,
not by editing existing logic.

```ts
// ❌ BAD — adding a new variant requires editing the function
function getStatusColor(status: OrderStatus): string {
  if (status === OrderStatus.Pending) return 'yellow';
  if (status === OrderStatus.Completed) return 'green';
  // every new status = edit this function
  return 'gray';
}

// ✅ GOOD — extend by adding a map entry, never touching existing logic
const STATUS_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'yellow',
  [OrderStatus.Processing]: 'blue',
  [OrderStatus.Completed]: 'green',
  [OrderStatus.Cancelled]: 'red',
};

function getStatusColor(status: OrderStatus): string {
  return STATUS_COLOR[status];
}
```

## L — Liskov Substitution Principle

Subtypes must be substitutable for their base type without breaking correctness.
In TypeScript: never narrow a type in a way that breaks its contract.

```ts
// ❌ BAD — override breaks the expected contract
interface Repository<T> {
  findById(id: string): Promise<T>;
}

class CachedUserRepository implements Repository<User> {
  findById(id: string): Promise<User> {
    // throws if id is numeric — violates the string contract
    if (Number.isNaN(Number(id))) throw new Error('numeric ids only');
    return this.cache.get(id);
  }
}

// ✅ GOOD — honour the full contract of the interface
```

## I — Interface Segregation Principle

No code should depend on methods it does not use. Keep interfaces narrow.

```ts
// ❌ BAD — component receives an entire User object but only needs name
function Avatar({ user }: { user: User }) {
  return <img src={user.avatarUrl} alt={user.name} />;
}

// ✅ GOOD — depend only on what you use
interface AvatarProps {
  name: string;
  avatarUrl: string;
}

function Avatar({ name, avatarUrl }: AvatarProps) {
  return <img src={avatarUrl} alt={name} />;
}
```

## D — Dependency Inversion Principle

High-level modules must not depend on low-level modules. Both should depend on abstractions.
In practice: inject dependencies, do not hard-code them.

```ts
// ❌ BAD — service is tightly coupled to a specific implementation
class NotificationService {
  send(message: string) {
    new SendGridClient().send(message); // hard-coded
  }
}

// ✅ GOOD — depends on an abstraction
interface EmailClient {
  send(message: string): Promise<void>;
}

class NotificationService {
  constructor(private readonly emailClient: EmailClient) {}

  send(message: string): Promise<void> {
    return this.emailClient.send(message);
  }
}
```

## DRY — Don't Repeat Yourself

Every piece of knowledge has a single, authoritative representation.
Duplication is not just copy-paste — it includes parallel logic, mirrored conditionals,
and re-declared types or constants.

```ts
// ❌ BAD — same transformation in two places
const adminUsers = users.filter(u => u.role === 'admin');
// ... elsewhere ...
const admins = allUsers.filter(u => u.role === 'admin');

// ✅ GOOD — one place, one name
const isAdmin = (user: User): boolean => user.role === UserRole.Admin;
```

DRY does **not** mean abstracting three lines that happen to look similar.
Abstract when there is a shared concept, not just shared syntax.
