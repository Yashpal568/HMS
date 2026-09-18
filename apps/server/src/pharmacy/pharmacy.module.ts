import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PharmacyController } from './pharmacy.controller.js';
import { PharmacyService } from './pharmacy.service.js';
import { Medicine, MedicineSchema } from './schemas/medicine.schema.js';
import { MedicineBatch, MedicineBatchSchema } from './schemas/medicine-batch.schema.js';
import {
  DispensingRecord,
  DispensingRecordSchema,
} from './schemas/dispensing-record.schema.js';
import {
  PharmacyTransaction,
  PharmacyTransactionSchema,
} from './schemas/pharmacy-transaction.schema.js';
import { Prescription, PrescriptionSchema } from '../emr/schemas/prescription.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AuditModule } from '../audit/audit.module.js';
import { RolesModule } from '../roles/roles.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Medicine.name, schema: MedicineSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
      { name: DispensingRecord.name, schema: DispensingRecordSchema },
      { name: PharmacyTransaction.name, schema: PharmacyTransactionSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuditModule,
    RolesModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
