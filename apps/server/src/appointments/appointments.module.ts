import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema.js';
import { DoctorSchedule, DoctorScheduleSchema } from './schemas/doctor-schedule.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuditModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
