import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Queue, QueueSchema } from './schemas/queue.schema.js';
import { QueueEntry, QueueEntrySchema } from './schemas/queue-entry.schema.js';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema.js';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Queue.name, schema: QueueSchema },
      { name: QueueEntry.name, schema: QueueEntrySchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService, MongooseModule],
})
export class QueueModule {}
