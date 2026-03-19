import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ExecutionsModule } from '../executions/executions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TrpcRouter } from './trpc.router';
import { TrpcService } from './trpc.service';

@Module({
  imports: [
    WorkflowsModule,
    ExecutionsModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
