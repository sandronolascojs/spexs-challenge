import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

let _sql: ReturnType<typeof postgres> | undefined;
let _db: Database | undefined;

/**
 * Initialize the database connection. Called by DatabaseService.onModuleInit
 * after NestJS has loaded env vars via ConfigModule. Safe to call multiple
 * times — subsequent calls are no-ops.
 */
export function initialize(databaseUrl: string): void {
  if (_sql) return;
  _sql = postgres(databaseUrl);
  _db = drizzle(_sql, { schema });
}

/** Close the connection pool. Called by DatabaseService.onModuleDestroy. */
export async function close(): Promise<void> {
  await _sql?.end();
}

function resolveSql(): ReturnType<typeof postgres> {
  if (!_sql)
    throw new Error(
      'Database not initialized — DatabaseModule.forRootAsync() must be configured in AppModule',
    );
  return _sql;
}

function resolveDb(): Database {
  if (!_db)
    throw new Error(
      'Database not initialized — DatabaseModule.forRootAsync() must be configured in AppModule',
    );
  return _db;
}

/**
 * Drizzle database instance — lazy proxy, real connection established on
 * first access after initialize() is called by DatabaseService.onModuleInit.
 *
 * Import this directly in non-NestJS contexts (auth.ts, scripts, migrations).
 * In NestJS, inject DatabaseService and access via service.db.
 */
export const db: Database = new Proxy({} as Database, {
  get: (_, prop) => Reflect.get(resolveDb(), prop),
});

/**
 * postgres.js client — lazy proxy, same lifecycle as db above.
 * Ended via DatabaseService.onModuleDestroy.
 */
export const sql: ReturnType<typeof postgres> = new Proxy(
  {} as ReturnType<typeof postgres>,
  { get: (_, prop) => Reflect.get(resolveSql(), prop) },
);
