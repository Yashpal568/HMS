import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmrController } from './emr.controller.js';
import { EmrService } from './emr.service.js';
import { Encounter, EncounterSchema } from './schemas/encounter.schema.js';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema.js';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { Queue, QueueSchema } from '../queue/schemas/queue.schema.js';
import { QueueEntry, QueueEntrySchema } from '../queue/schemas/queue-entry.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { LaboratoryModule } from '../laboratory/laboratory.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Encounter.name, schema: EncounterSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
      { name: Queue.name, schema: QueueSchema },
      { name: QueueEntry.name, schema: QueueEntrySchema },
    ]),
    AuditModule,
    RolesModule,
    forwardRef(() => LaboratoryModule),
  ],
  controllers: [EmrController],
  providers: [EmrService],
  exports: [EmrService],
})
export class EmrModule {}
