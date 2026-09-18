import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabTest, LabTestSchema } from './schemas/lab-test.schema.js';
import { LabOrder, LabOrderSchema } from './schemas/lab-order.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { LaboratoryService } from './laboratory.service.js';
import { LaboratoryController } from './laboratory.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LabTest.name, schema: LabTestSchema },
      { name: LabOrder.name, schema: LabOrderSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuditModule,
  ],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}
