import { Module } from '@nestjs/common';
import { DatabaseModule } from '@spexs/db';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [DatabaseModule],
  providers: [EventsRepository, EventsService],
  exports: [EventsService],
})
export class EventsModule {}
