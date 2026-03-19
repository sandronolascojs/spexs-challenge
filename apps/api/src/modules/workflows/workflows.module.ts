import { Module } from '@nestjs/common';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowsService } from './workflows.service';

@Module({
  providers: [WorkflowsRepository, WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
