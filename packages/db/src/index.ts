// Schema — tables, relations, and inferred types
export * from './schema';

// Drizzle instance — for use outside NestJS (auth.ts, scripts, migrations)
export { db, pool } from './db';
export type { Database } from './db';

// NestJS module — import DatabaseModule in AppModule
export { DatabaseModule } from './nestjs/database.module';
export { DatabaseService } from './nestjs/database.service';
