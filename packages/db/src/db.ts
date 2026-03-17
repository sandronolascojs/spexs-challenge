import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * postgres.js client — lazy connection, established on first query.
 * Ended via DatabaseService.onModuleDestroy in the NestJS lifecycle.
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = postgres(process.env.DATABASE_URL);

/**
 * Drizzle database instance with the full schema.
 * Import this directly in non-NestJS contexts (e.g. auth.ts, scripts, migrations).
 * In NestJS, inject DatabaseService and access db via service.db.
 */
export const db: Database = drizzle(sql, { schema });
