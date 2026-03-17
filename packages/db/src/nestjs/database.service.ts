import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { type Database, close, db, initialize } from '../db';

export const DATABASE_OPTIONS = Symbol('DATABASE_OPTIONS');

export interface DatabaseModuleOptions {
  databaseUrl: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly db: Database = db;

  @Inject(DATABASE_OPTIONS)
  private readonly options!: DatabaseModuleOptions;

  onModuleInit(): void {
    initialize(this.options.databaseUrl);
  }

  async onModuleDestroy(): Promise<void> {
    await close();
  }
}
