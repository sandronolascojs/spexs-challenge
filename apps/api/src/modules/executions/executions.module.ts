import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExecutionsProcessor } from './executions.processor';
import { ExecutionsRepository } from './executions.repository';
import { ExecutionsService } from './executions.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'executions',
    }),
    NotificationsModule,
  ],
  providers: [ExecutionsRepository, ExecutionsService, ExecutionsProcessor],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
