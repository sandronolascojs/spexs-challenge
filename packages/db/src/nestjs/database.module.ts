import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global module — import once in AppModule.
 * DatabaseService is then available for injection in every module without
 * needing to add DatabaseModule to each feature module's imports array.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
