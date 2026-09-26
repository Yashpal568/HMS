import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserStatus } from '../src/users/schemas/user.schema.js';
import { PatientDocument } from '../src/patients/schemas/patient.schema.js';
import { AppointmentDocument } from '../src/appointments/schemas/appointment.schema.js';
import { QueueDocument } from '../src/queue/schemas/queue.schema.js';
import { QueueEntryDocument } from '../src/queue/schemas/queue-entry.schema.js';
import { EncounterDocument } from '../src/emr/schemas/encounter.schema.js';
import { PrescriptionDocument } from '../src/emr/schemas/prescription.schema.js';
import { LabTestDocument } from '../src/laboratory/schemas/lab-test.schema.js';
import { LabOrderDocument } from '../src/laboratory/schemas/lab-order.schema.js';
import {
  AppointmentStatus,
  AppointmentType,
  QueuePriority,
  QueueEntryStatus,
  EncounterStatus,
  PrescriptionStatus,
  LabTestCategory,
  LabOrderPriority,
} from '@hms/types';
import bcrypt from 'bcryptjs';

describe('OPD Cockpit End-to-End Operational Workflow (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let userModel: Model<UserDocument>;
  let patientModel: Model<PatientDocument>;
  let appointmentModel: Model<AppointmentDocument>;
  let queueModel: Model<QueueDocument>;
  let queueEntryModel: Model<QueueEntryDocument>;
  let encounterModel: Model<EncounterDocument>;
  let prescriptionModel: Model<PrescriptionDocument>;
  let labTestModel: Model<LabTestDocument>;
  let labOrderModel: Model<LabOrderDocument>;

  const tenantId = new Types.ObjectId().toString();

  let tokenReceptionist: string;
  let receptionistId: string;

  let tokenDoctor: string;
  let doctorId: string;

  let patient1Id: string;
  let patient1Uhid: string;

  let patient2Id: string;
  let patient2Uhid: string;

  let appointment1Id: string;
  let encounter1Id: string;
  let cbcTestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken('User'));
    patientModel = moduleFixture.get<Model<PatientDocument>>(getModelToken('Patient'));
    appointmentModel = moduleFixture.get<Model<AppointmentDocument>>(getModelToken('Appointment'));
    queueModel = moduleFixture.get<Model<QueueDocument>>(getModelToken('Queue'));
    queueEntryModel = moduleFixture.get<Model<QueueEntryDocument>>(getModelToken('QueueEntry'));
    encounterModel = moduleFixture.get<Model<EncounterDocument>>(getModelToken('Encounter'));
    prescriptionModel = moduleFixture.get<Model<PrescriptionDocument>>(getModelToken('Prescription'));
    labTestModel = moduleFixture.get<Model<LabTestDocument>>(getModelToken('LabTest'));
    labOrderModel = moduleFixture.get<Model<LabOrderDocument>>(getModelToken('LabOrder'));

    const passwordHash = await bcrypt.hash('SecureStaffPass123!', 10);

    // 1. Receptionist User
    const recUser = await userModel.create({
      email: `opd_receptionist_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Aarti',
      lastName: 'Sharma',
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
    receptionistId = recUser._id.toString();
    tokenReceptionist = jwtService.sign({
      sub: receptionistId,
      email: recUser.email,
      role: recUser.role,
      hospitalId: tenantId,
    });

    // 2. Doctor User
    const docUser = await userModel.create({
      email: `opd_doctor_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Malhotra',
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
    doctorId = docUser._id.toString();
    tokenDoctor = jwtService.sign({
      sub: doctorId,
      email: docUser.email,
      role: docUser.role,
      hospitalId: tenantId,
    });

    // 3. Seed Catalog Lab Test for this tenant
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
    cbcTestId = labTest._id.toString();
  });

  afterAll(async () => {
    if (userModel) {
      await userModel.deleteMany({ _id: { $in: [receptionistId, doctorId] } });
    }
    if (patientModel) {
      await patientModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (appointmentModel) {
      await appointmentModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (queueModel) {
      await queueModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (queueEntryModel) {
      await queueEntryModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (encounterModel) {
      await encounterModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (prescriptionModel) {
      await prescriptionModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (labTestModel) {
      await labTestModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (labOrderModel) {
      await labOrderModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    await app.close();
  });

  // STEP 1: Patient 1 Registration (Scheduled Outpatient)
  it('Step 1: Receptionist registers Outpatient Patient 1 and generates unique UHID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        name: { first: 'Rajesh', last: 'Gupta' },
        dateOfBirth: '1984-05-12',
        gender: 'male',
        contacts: {
          phone: '+919876543210',
          email: 'rajesh.gupta@example.com',
          address: {
            street: '42 Ring Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560034',
          },
        },
        emergencyContact: {
          name: 'Meena Gupta',
          relationship: 'Spouse',
          phone: '+919876543211',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    patient1Id = res.body.data.id || res.body.data._id;
    patient1Uhid = res.body.data.uhid;

    expect(patient1Id).toBeDefined();
    expect(patient1Uhid).toMatch(/^UHID-\d{4}-\d{6}$/);
  });

  // STEP 2: Patient 2 Registration (Walk-In Outpatient)
  it('Step 2: Receptionist registers Walk-In Patient 2 and generates unique UHID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        name: { first: 'Kavita', last: 'Nair' },
        dateOfBirth: '1995-11-28',
        gender: 'female',
        contacts: {
          phone: '+919812345678',
          email: 'kavita.nair@example.com',
          address: {
            street: '18 Palace Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560052',
          },
        },
        emergencyContact: {
          name: 'Ramesh Nair',
          relationship: 'Brother',
          phone: '+919812345679',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    patient2Id = res.body.data.id || res.body.data._id;
    patient2Uhid = res.body.data.uhid;

    expect(patient2Id).toBeDefined();
    expect(patient2Uhid).toMatch(/^UHID-\d{4}-\d{6}$/);
  });

  // STEP 3: Outpatient Appointment Booking (Patient 1)
  it('Step 3: Receptionist books outpatient appointment for Patient 1 with sequential daily token', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        patientId: patient1Id,
        doctorId: doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '10:00 - 10:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'Severe throbbing headache and blurred vision',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    appointment1Id = res.body.data.id || res.body.data._id;
    expect(appointment1Id).toBeDefined();
    expect(res.body.data.status).toBe(AppointmentStatus.SCHEDULED);
    expect(res.body.data.tokenNumber).toBe(1);
  });

  // STEP 4: Reception Check-In with Clinical Triage (Patient 1)
  it('Step 4: Receptionist checks in Patient 1 with clinical triage vitals and marks URGENT priority', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointment1Id}/check-in`)
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        priority: QueuePriority.URGENT,
        chiefComplaint: 'Severe throbbing headache, blurred vision, dizziness',
        triageNotes: 'Patient appears acutely distressed; high blood pressure flagged at triage desk',
        vitals: {
          bpSystolic: 160,
          bpDiastolic: 100,
          pulse: 92,
          temperature: 98.6,
          spO2: 98,
          respiratoryRate: 18,
          weight: 70,
          height: 170,
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(AppointmentStatus.CHECKED_IN);
    expect(res.body.data.triagePriority).toBe(QueuePriority.URGENT);
    expect(res.body.data.triageVitals.bpSystolic).toBe(160);
    expect(res.body.data.triageVitals.bpDiastolic).toBe(100);
    expect(res.body.data.triageVitals.bmi).toBe(24.2);
    expect(res.body.data.triageVitals.bmiCategory).toBe('normal');

    // Verify live OPD queue entry exists in WAITING state
    const queueEntry = await queueEntryModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      appointmentId: new Types.ObjectId(appointment1Id),
    }).exec();

    expect(queueEntry).toBeDefined();
    expect(queueEntry?.status).toBe(QueueEntryStatus.WAITING);
    expect(queueEntry?.priority).toBe(QueuePriority.URGENT);
    expect(queueEntry?.tokenNumber).toBe(1);
  });

  // STEP 5: Walk-In Patient Queue Check-In (Patient 2)
  it('Step 5: Receptionist checks in Walk-In Patient 2 directly into OPD Queue with auto-created Appointment', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        patientId: patient2Id,
        doctorId: doctorId,
        department: 'General Medicine',
        priority: QueuePriority.NORMAL,
        chiefComplaint: 'Routine checkup and mild seasonal rhinitis',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe(2);
    expect(res.body.data.status).toBe(QueueEntryStatus.WAITING);
    expect(res.body.data.appointmentId).toBeDefined();

    // Verify linked walk-in appointment was automatically created in CHECKED_IN state
    const walkInAppt = await appointmentModel.findById(res.body.data.appointmentId).exec();
    expect(walkInAppt).toBeDefined();
    expect(walkInAppt?.type).toBe(AppointmentType.WALK_IN);
    expect(walkInAppt?.status).toBe(AppointmentStatus.CHECKED_IN);
    expect(walkInAppt?.tokenNumber).toBe(2);
  });

  // STEP 6: Doctor OPD Workboard Queue Check
  it('Step 6: Doctor retrieves live OPD queue and views waiting patients', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/queue/doctor')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.summary.waiting).toBe(2);
  });

  // STEP 7: Doctor Calls Next Patient (Priority-Weighted Dequeue)
  it('Step 7: Doctor calls next patient — URGENT Patient 1 is dequeued first over routine walk-in', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/queue/call-next')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({})
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe(1);
    expect(res.body.data.status).toBe(QueueEntryStatus.CALLED);
    expect(String(res.body.data.patientId._id || res.body.data.patientId)).toBe(patient1Id);
  });

  // STEP 8: Doctor Starts Consultation Encounter & Verifies Pre-Populated Triage Vitals
  it('Step 8: Doctor starts consultation encounter — vitals pre-populated from triage check-in', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/emr/encounters')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({ appointmentId: appointment1Id })
      .expect(201);

    expect(res.body.success).toBe(true);
    encounter1Id = res.body.data.id || res.body.data._id;
    expect(encounter1Id).toBeDefined();
    expect(res.body.data.status).toBe(EncounterStatus.DRAFT);

    // Verify triage vitals are pre-populated into the consultation encounter
    expect(res.body.data.vitals.bpSystolic).toBe(160);
    expect(res.body.data.vitals.bpDiastolic).toBe(100);
    expect(res.body.data.vitals.pulse).toBe(92);
    expect(res.body.data.vitals.bmi).toBe(24.2);

    // Verify queue entry transitioned to IN_CONSULTATION
    const queueEntry = await queueEntryModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      appointmentId: new Types.ObjectId(appointment1Id),
    }).exec();
    expect(queueEntry?.status).toBe(QueueEntryStatus.IN_CONSULTATION);
    expect(queueEntry?.consultationStartedAt).toBeDefined();
  });

  // STEP 9: Doctor Documents Clinical Findings, Diagnosis & Orders (Rx + Lab)
  it('Step 9: Doctor documents clinical examination, ICD-10 diagnosis, prescription, and lab request', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/emr/encounters/${encounter1Id}`)
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        chiefComplaints: ['Severe throbbing headache with visual disturbance for 2 days'],
        examinationNotes: 'Patient alert, oriented. Bilateral pupillary reflex normal. Elevated blood pressure. S1, S2 audible.',
        diagnoses: [
          {
            code: 'I10',
            description: 'Essential (primary) hypertension',
          },
        ],
        prescriptionItems: [
          {
            medicineName: 'Amlodipine 5mg',
            dosageForm: 'tablet',
            strength: '5 mg',
            frequency: 'OD',
            durationDays: 30,
            quantity: 30,
            instructions: 'Take 1 tablet daily in the morning after breakfast',
          },
        ],
        prescriptionNotes: 'Low sodium diet, monitor BP weekly',
        investigations: [
          {
            testName: 'Complete Blood Count',
            instructions: 'Fasting venous blood sample',
            urgency: 'urgent',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.diagnoses.length).toBe(1);
    expect(res.body.data.diagnoses[0].code).toBe('I10');
    expect(res.body.data.prescription).toBeDefined();
    expect(res.body.data.prescription.items.length).toBe(1);
  });

  // STEP 10: Doctor Finalizes Consultation Encounter (Seals EMR & Auto-Completes Queue)
  it('Step 10: Doctor finalizes consultation — seals encounter, generates Rx, creates Lab Order, marks Queue COMPLETED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/emr/encounters/${encounter1Id}/finalize`)
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        diagnoses: [
          {
            code: 'I10',
            description: 'Essential (primary) hypertension',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(EncounterStatus.FINALIZED);
    expect(res.body.data.finalizedAt).toBeDefined();

    // Verify appointment status transitioned to COMPLETED
    const updatedAppt = await appointmentModel.findById(appointment1Id).exec();
    expect(updatedAppt?.status).toBe(AppointmentStatus.COMPLETED);

    // Verify queue entry transitioned to COMPLETED with completedAt timestamp
    const completedQueueEntry = await queueEntryModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      appointmentId: new Types.ObjectId(appointment1Id),
    }).exec();

    expect(completedQueueEntry?.status).toBe(QueueEntryStatus.COMPLETED);
    expect(completedQueueEntry?.completedAt).toBeDefined();

    // Verify parent queue counters
    const parentQueue = await queueModel.findById(completedQueueEntry?.queueId).exec();
    expect(parentQueue?.totalCompleted).toBe(1);
  });

  // STEP 11: Downstream Handoff Verification (Pharmacy & Laboratory)
  it('Step 11: Verify Downstream Handoff — Prescription is ACTIVE and STAT Lab Order is created', async () => {
    // Pharmacy Downstream Handoff
    const rx = await prescriptionModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      encounterId: new Types.ObjectId(encounter1Id),
    }).exec();

    expect(rx).toBeDefined();
    expect(rx?.status).toBe(PrescriptionStatus.ACTIVE);
    expect(rx?.items[0].medicineName).toBe('Amlodipine 5mg');

    // Laboratory Downstream Handoff
    const labOrder = await labOrderModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      appointmentId: new Types.ObjectId(appointment1Id),
    }).exec();

    expect(labOrder).toBeDefined();
    expect(labOrder?.priority).toBe(LabOrderPriority.STAT);
    expect(labOrder?.testIds.map((t) => t.toString())).toContain(cbcTestId);
  });

  // STEP 12: Continuous OPD Queue Flow — Call Next Patient (Walk-In Patient 2)
  it('Step 12: Continuous Flow — Doctor calls next patient, seamlessly advancing to Walk-In Patient 2', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/queue/call-next')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({})
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe(2);
    expect(res.body.data.status).toBe(QueueEntryStatus.CALLED);
    expect(String(res.body.data.patientId._id || res.body.data.patientId)).toBe(patient2Id);
  });
});
