import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';
import { Patient, PatientSchema } from './schemas/patient.schema.js';
import { Counter, CounterSchema } from './schemas/counter.schema.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    AuditModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
