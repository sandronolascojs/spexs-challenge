import {
  type DynamicModule,
  Global,
  type InjectionToken,
  Module,
  type OptionalFactoryDependency,
} from '@nestjs/common';
import {
  DATABASE_OPTIONS,
  type DatabaseModuleOptions,
  DatabaseService,
} from './database.service';

export interface DatabaseModuleAsyncOptions<TDeps extends object[]> {
  inject: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (
    ...args: TDeps
  ) => DatabaseModuleOptions | Promise<DatabaseModuleOptions>;
}

/**
 * Global module — import once in AppModule via forRootAsync().
 * DatabaseService is then available for injection in every module without
 * needing to add DatabaseModule to each feature module's imports array.
 */
@Global()
@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic module pattern requires a class
export class DatabaseModule {
  static forRootAsync<TDeps extends object[]>(
    options: DatabaseModuleAsyncOptions<TDeps>,
  ): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_OPTIONS,
          inject: options.inject,
          useFactory: options.useFactory,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
