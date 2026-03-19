import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Global module — import once in AppModule.
 * EmailService is then injectable everywhere without repeated imports.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
