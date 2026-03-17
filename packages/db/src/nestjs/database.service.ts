import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db, pool } from '../db';
import type { Database } from '../db';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  /**
   * Drizzle database instance — fully typed with the project schema.
   * Use this in repositories: this.database.db.query.users.findFirst(...)
   */
  readonly db: Database = db;

  async onModuleDestroy(): Promise<void> {
    await pool.end();
  }
}
