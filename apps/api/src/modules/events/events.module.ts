import { Module } from '@nestjs/common';
import { ExecutionsModule } from '../executions/executions.module';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [ExecutionsModule],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
})
export class EventsModule {}
