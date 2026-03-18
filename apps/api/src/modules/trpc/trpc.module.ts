import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TrpcRouter } from './trpc.router';
import { TrpcService } from './trpc.service';

@Module({
  imports: [WorkflowsModule, EventsModule],
  providers: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
