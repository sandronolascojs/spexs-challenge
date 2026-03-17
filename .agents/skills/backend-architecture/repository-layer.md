# Repository Layer

The repository is the only place that talks to the database. Nothing else does.

## Responsibility

- Execute queries (find, create, update, delete)
- Map raw DB rows to domain types if needed
- No business logic, no validation, no throwing domain errors

## What does NOT belong here

| Thing | Where it belongs |
|---|---|
| Business rules ("user must be active to order") | Service |
| Input validation | tRPC router (Zod schema) |
| Throwing `TRPCError` / HTTP exceptions | Service |
| Calling another service | Service |
| Sending emails / events | Service |

## Pattern

`DatabaseService` is a global provider — inject it directly without adding `DatabaseModule`
to each feature module's `imports` array (it is already registered globally in `AppModule`).

```ts
// users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@spexs/db';
import { eq } from 'drizzle-orm';
import { users } from '@spexs/db';
import type { User, NewUser } from '@spexs/db';

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.database.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return result ?? null;
  }

  findAll(): Promise<User[]> {
    return this.database.db.query.users.findMany();
  }

  async create(data: NewUser): Promise<User> {
    const [created] = await this.database.db
      .insert(users)
      .values(data)
      .returning();
    return created;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const [updated] = await this.database.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: string): Promise<User | null> {
    const [deleted] = await this.database.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return deleted ?? null;
  }
}
```

## Rules

- Access the Drizzle instance via `this.database.db` — never import `db` from `@spexs/db` directly inside a NestJS class.
- Import table references (`users`, `sessions`, …) and operators (`eq`, `and`, …) from `@spexs/db` and `drizzle-orm`.
- Repository methods return `null` for not-found — the service decides whether to throw.
- Return types use the inferred Drizzle types from `@spexs/db` (`User`, `NewUser`, etc.), not raw query results.
- One repository per module. Never inject another module's repository — go through the service.
- Never import a service into a repository (always service → repository, never the reverse).
