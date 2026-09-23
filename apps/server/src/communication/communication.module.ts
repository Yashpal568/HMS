import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HospitalTask,
  HospitalTaskSchema,
} from './schemas/hospital-task.schema.js';
import {
  HospitalNotification,
  HospitalNotificationSchema,
} from './schemas/hospital-notification.schema.js';
import { CommunicationService } from './communication.service.js';
import { CommunicationController } from './communication.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HospitalTask.name, schema: HospitalTaskSchema },
      { name: HospitalNotification.name, schema: HospitalNotificationSchema },
    ]),
  ],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
