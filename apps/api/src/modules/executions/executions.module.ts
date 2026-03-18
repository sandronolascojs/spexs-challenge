import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExecutionsProcessor } from './executions.processor';
import { ExecutionsRepository } from './executions.repository';
import { ExecutionsService } from './executions.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'executions',
    }),
  ],
  providers: [ExecutionsRepository, ExecutionsService, ExecutionsProcessor],
  exports: [ExecutionsService, ExecutionsRepository],
})
export class ExecutionsModule {}
