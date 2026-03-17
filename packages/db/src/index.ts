// Schema — tables, relations, and inferred types
export * from './schema';

// Drizzle instance — lazy proxies, initialized by DatabaseModule.forRootAsync()
export { db, sql, initialize, close } from './db';
export { Database } from './db';

// NestJS module — import DatabaseModule in AppModule via forRootAsync()
export { DatabaseModule } from './nestjs/database.module';
export {
  DatabaseService,
  DatabaseModuleOptions,
  DATABASE_OPTIONS,
} from './nestjs/database.service';
