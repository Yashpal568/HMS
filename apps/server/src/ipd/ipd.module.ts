import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpdController } from './ipd.controller.js';
import { IpdService } from './ipd.service.js';
import { BedService } from './bed.service.js';
import { Ward, WardSchema } from './schemas/ward.schema.js';
import { Bed, BedSchema } from './schemas/bed.schema.js';
import { Admission, AdmissionSchema } from './schemas/admission.schema.js';
import { BedAllocation, BedAllocationSchema } from './schemas/bed-allocation.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ward.name, schema: WardSchema },
      { name: Bed.name, schema: BedSchema },
      { name: Admission.name, schema: AdmissionSchema },
      { name: BedAllocation.name, schema: BedAllocationSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuditModule,
  ],
  controllers: [IpdController],
  providers: [IpdService, BedService],
  exports: [IpdService, BedService],
})
export class IpdModule {}
