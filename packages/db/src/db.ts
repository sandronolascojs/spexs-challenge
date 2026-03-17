import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type Database = NodePgDatabase<typeof schema>;

/**
 * Shared connection pool.
 * The pool is lazy — it establishes connections only when the first query runs.
 * Closed via DatabaseService.onModuleDestroy in the NestJS lifecycle.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Drizzle database instance with the full schema.
 * Import this directly in non-NestJS contexts (e.g. auth.ts, scripts, migrations).
 * In NestJS, inject DatabaseService and access db via service.db.
 */
export const db: Database = drizzle(pool, { schema });
