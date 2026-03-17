import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { db, sql } from '../db';
import type { Database } from '../db';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  /**
   * Drizzle database instance — fully typed with the project schema.
   * Use this in repositories: this.database.db.query.users.findFirst(...)
   */
  readonly db: Database = db;

  async onModuleDestroy(): Promise<void> {
    await sql.end();
  }
}
