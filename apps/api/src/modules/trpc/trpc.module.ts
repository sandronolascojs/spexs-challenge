import { Module } from '@nestjs/common';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TrpcRouter } from './trpc.router';
import { TrpcService } from './trpc.service';

@Module({
  imports: [WorkflowsModule],
  providers: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
