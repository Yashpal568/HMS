import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../apps/server/src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserStatus } from '../../apps/server/src/users/schemas/user.schema.js';
import { PatientDocument } from '../../apps/server/src/patients/schemas/patient.schema.js';
import { AppointmentDocument } from '../../apps/server/src/appointments/schemas/appointment.schema.js';
import { QueueDocument } from '../../apps/server/src/queue/schemas/queue.schema.js';
import { QueueEntryDocument } from '../../apps/server/src/queue/schemas/queue-entry.schema.js';
import { EncounterDocument } from '../../apps/server/src/emr/schemas/encounter.schema.js';
import { PrescriptionDocument } from '../../apps/server/src/emr/schemas/prescription.schema.js';
import { LabTestDocument } from '../../apps/server/src/laboratory/schemas/lab-test.schema.js';
import { LabOrderDocument } from '../../apps/server/src/laboratory/schemas/lab-order.schema.js';
import { AuditLogDocument } from '../../apps/server/src/audit/schemas/audit-log.schema.js';
import { LabTestCategory } from '@hms/types';
import bcrypt from 'bcryptjs';

export interface OpdTestContext {
  app: INestApplication;
  jwtService: JwtService;
  tenantId: string;
  receptionistToken: string;
  receptionistId: string;
  doctorToken: string;
  doctorId: string;
  adminToken: string;
  adminId: string;
  unauthorizedToken: string;
  unauthorizedId: string;
  cbcTestId: string;
  models: {
    user: Model<UserDocument>;
    patient: Model<PatientDocument>;
    appointment: Model<AppointmentDocument>;
    queue: Model<QueueDocument>;
    queueEntry: Model<QueueEntryDocument>;
    encounter: Model<EncounterDocument>;
    prescription: Model<PrescriptionDocument>;
    labTest: Model<LabTestDocument>;
    labOrder: Model<LabOrderDocument>;
    auditLog: Model<AuditLogDocument>;
  };
}

export async function setupOpdTestContext(customTenantId?: string): Promise<OpdTestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const jwtService = moduleFixture.get<JwtService>(JwtService);
  const userModel = moduleFixture.get<Model<UserDocument>>(getModelToken('User'));
  const patientModel = moduleFixture.get<Model<PatientDocument>>(getModelToken('Patient'));
  const appointmentModel = moduleFixture.get<Model<AppointmentDocument>>(getModelToken('Appointment'));
  const queueModel = moduleFixture.get<Model<QueueDocument>>(getModelToken('Queue'));
  const queueEntryModel = moduleFixture.get<Model<QueueEntryDocument>>(getModelToken('QueueEntry'));
  const encounterModel = moduleFixture.get<Model<EncounterDocument>>(getModelToken('Encounter'));
  const prescriptionModel = moduleFixture.get<Model<PrescriptionDocument>>(getModelToken('Prescription'));
  const labTestModel = moduleFixture.get<Model<LabTestDocument>>(getModelToken('LabTest'));
  const labOrderModel = moduleFixture.get<Model<LabOrderDocument>>(getModelToken('LabOrder'));
  const auditLogModel = moduleFixture.get<Model<AuditLogDocument>>(getModelToken('AuditLog'));

  const tenantId = customTenantId || new Types.ObjectId().toString();
  const passwordHash = await bcrypt.hash('SecureStaffPass123!', 10);

  // 1. Receptionist User
  const recUser = await userModel.create({
    email: `reception_${Date.now()}_${Math.random().toString(36).substring(7)}@hospital.test`,
    passwordHash,
    firstName: 'Priya',
    lastName: 'Receptionist',
    role: 'RECEPTIONIST',
    status: UserStatus.ACTIVE,
    hospitalId: new Types.ObjectId(tenantId),
    permissions: [
      'patients.create',
      'patients.read',
      'appointments.create',
      'appointments.read',
      'appointments.update',
    ],
  });
  const receptionistId = recUser._id.toString();
  const receptionistToken = jwtService.sign({
    sub: receptionistId,
    email: recUser.email,
    role: recUser.role,
    hospitalId: tenantId,
  });

  // 2. Doctor User
  const docUser = await userModel.create({
    email: `doctor_${Date.now()}_${Math.random().toString(36).substring(7)}@hospital.test`,
    passwordHash,
    firstName: 'Rajesh',
    lastName: 'Clinician',
    role: 'DOCTOR',
    department: 'General Medicine',
    status: UserStatus.ACTIVE,
    hospitalId: new Types.ObjectId(tenantId),
    permissions: [
      'emr.read',
      'emr.update',
      'appointments.read',
      'patients.read',
      'laboratory.orders.read',
      'pharmacy.prescriptions.read',
    ],
  });
  const doctorId = docUser._id.toString();
  const doctorToken = jwtService.sign({
    sub: doctorId,
    email: docUser.email,
    role: docUser.role,
    hospitalId: tenantId,
  });

  // 3. Hospital Admin User
  const admUser = await userModel.create({
    email: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@hospital.test`,
    passwordHash,
    firstName: 'Vikram',
    lastName: 'Administrator',
    role: 'HOSPITAL_ADMIN',
    status: UserStatus.ACTIVE,
    hospitalId: new Types.ObjectId(tenantId),
    permissions: ['*'],
  });
  const adminId = admUser._id.toString();
  const adminToken = jwtService.sign({
    sub: adminId,
    email: admUser.email,
    role: admUser.role,
    hospitalId: tenantId,
  });

  // 4. Unauthorized User (Accountant without EMR/OPD privileges)
  const unauth = await userModel.create({
    email: `unauth_${Date.now()}_${Math.random().toString(36).substring(7)}@hospital.test`,
    passwordHash,
    firstName: 'Rohan',
    lastName: 'Accountant',
    role: 'ACCOUNTANT',
    status: UserStatus.ACTIVE,
    hospitalId: new Types.ObjectId(tenantId),
    permissions: ['billing.create', 'billing.read'],
  });
  const unauthorizedId = unauth._id.toString();
  const unauthorizedToken = jwtService.sign({
    sub: unauthorizedId,
    email: unauth.email,
    role: unauth.role,
    hospitalId: tenantId,
  });

  // 5. Seed Diagnostic Lab Test for downstream matching
  const labTest = await labTestModel.create({
    tenantId: new Types.ObjectId(tenantId),
    code: 'CBC',
    name: 'Complete Blood Count',
    category: LabTestCategory.HEMATOLOGY,
    specimenType: 'Whole Blood EDTA',
    tariffPrice: 450,
    isActive: true,
    parameters: [
      { name: 'Hemoglobin', unit: 'g/dL', referenceMin: 12.0, referenceMax: 16.5 },
      { name: 'WBC Count', unit: 'cells/mcL', referenceMin: 4000, referenceMax: 11000 },
      { name: 'Platelets', unit: 'lakh/mcL', referenceMin: 1.5, referenceMax: 4.5 },
    ],
  });
  const cbcTestId = labTest._id.toString();

  return {
    app,
    jwtService,
    tenantId,
    receptionistToken,
    receptionistId,
    doctorToken,
    doctorId,
    adminToken,
    adminId,
    unauthorizedToken,
    unauthorizedId,
    cbcTestId,
    models: {
      user: userModel,
      patient: patientModel,
      appointment: appointmentModel,
      queue: queueModel,
      queueEntry: queueEntryModel,
      encounter: encounterModel,
      prescription: prescriptionModel,
      labTest: labTestModel,
      labOrder: labOrderModel,
      auditLog: auditLogModel,
    },
  };
}

export async function teardownOpdTestContext(ctx: OpdTestContext) {
  const { models, tenantId, app, receptionistId, doctorId, adminId, unauthorizedId } = ctx;
  const tObjectId = new Types.ObjectId(tenantId);

  await models.user.deleteMany({ _id: { $in: [receptionistId, doctorId, adminId, unauthorizedId] } });
  await models.patient.deleteMany({ tenantId: tObjectId });
  await models.appointment.deleteMany({ tenantId: tObjectId });
  await models.queue.deleteMany({ tenantId: tObjectId });
  await models.queueEntry.deleteMany({ tenantId: tObjectId });
  await models.encounter.deleteMany({ tenantId: tObjectId });
  await models.prescription.deleteMany({ tenantId: tObjectId });
  await models.labTest.deleteMany({ tenantId: tObjectId });
  await models.labOrder.deleteMany({ tenantId: tObjectId });
  await models.auditLog.deleteMany({ hospitalId: tenantId });
  await app.close();
}
