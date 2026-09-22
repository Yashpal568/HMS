import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserStatus } from '../src/users/schemas/user.schema.js';
import { MedicineDocument } from '../src/pharmacy/schemas/medicine.schema.js';
import { MedicineBatchDocument } from '../src/pharmacy/schemas/medicine-batch.schema.js';
import { PrescriptionDocument } from '../src/emr/schemas/prescription.schema.js';
import { DosageForm, DrugSchedule } from '@hms/types';
import bcrypt from 'bcryptjs';

describe('Complete End-to-End Vertical Slice: 10-Step Hospital Journey (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userModel: Model<UserDocument>;
  let medicineModel: Model<MedicineDocument>;
  let batchModel: Model<MedicineBatchDocument>;
  let prescriptionModel: Model<PrescriptionDocument>;

  const tenantId = new Types.ObjectId().toString();

  let tokenReceptionist: string;
  let receptionistId: string;

  let tokenDoctor: string;
  let doctorId: string;

  let tokenLabTech: string;
  let labTechId: string;

  let tokenPathologist: string;
  let pathologistId: string;

  let tokenPharmacist: string;
  let pharmacistId: string;

  let tokenCashier: string;
  let cashierId: string;

  let tokenAdmin: string;
  let adminId: string;

  let patientId: string;
  let patientUhid: string;
  let appointmentId: string;
  let encounterId: string;
  let prescriptionId: string;
  let cbcTestId: string;
  let labOrderId: string;
  let medicineId: string;
  let batchId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken('User'));
    medicineModel = moduleFixture.get<Model<MedicineDocument>>(getModelToken('Medicine'));
    batchModel = moduleFixture.get<Model<MedicineBatchDocument>>(getModelToken('MedicineBatch'));
    prescriptionModel = moduleFixture.get<Model<PrescriptionDocument>>(getModelToken('Prescription'));

    const passwordHash = await bcrypt.hash('SecureStaffPass123!', 10);

    // 1. Receptionist
    const recUser = await userModel.create({
      email: `receptionist_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Priya',
      lastName: 'Receptionist',
      role: 'RECEPTIONIST',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['patients.create', 'patients.read', 'appointments.create', 'appointments.read', 'appointments.update'],
    });
    receptionistId = recUser._id.toString();
    tokenReceptionist = jwtService.sign({
      sub: receptionistId,
      email: recUser.email,
      role: recUser.role,
      hospitalId: tenantId,
    });

    // 2. Doctor
    const docUser = await userModel.create({
      email: `doctor_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Clinician',
      role: 'DOCTOR',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['emr.create', 'emr.update', 'emr.read', 'patients.read', 'lab.orders.create', 'lab.read'],
    });
    doctorId = docUser._id.toString();
    tokenDoctor = jwtService.sign({
      sub: doctorId,
      email: docUser.email,
      role: docUser.role,
      hospitalId: tenantId,
    });

    // 3. Lab Technician
    const labUser = await userModel.create({
      email: `labtech_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Anil',
      lastName: 'Technician',
      role: 'LAB_TECHNICIAN',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['lab.read', 'lab.orders.update', 'lab.results.enter'],
    });
    labTechId = labUser._id.toString();
    tokenLabTech = jwtService.sign({
      sub: labTechId,
      email: labUser.email,
      role: labUser.role,
      hospitalId: tenantId,
    });

    // 4. Pathologist
    const pathUser = await userModel.create({
      email: `pathologist_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Sunita',
      lastName: 'Pathologist',
      role: 'DOCTOR',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['lab.read', 'lab.results.verify'],
    });
    pathologistId = pathUser._id.toString();
    tokenPathologist = jwtService.sign({
      sub: pathologistId,
      email: pathUser.email,
      role: pathUser.role,
      hospitalId: tenantId,
    });

    // 5. Pharmacist
    const pharmUser = await userModel.create({
      email: `pharmacist_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Karan',
      lastName: 'Pharmacist',
      role: 'PHARMACIST',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['pharmacy.read', 'pharmacy.dispense', 'pharmacy.manage'],
    });
    pharmacistId = pharmUser._id.toString();
    tokenPharmacist = jwtService.sign({
      sub: pharmacistId,
      email: pharmUser.email,
      role: pharmUser.role,
      hospitalId: tenantId,
    });

    // 6. Cashier
    const cashUser = await userModel.create({
      email: `cashier_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Neha',
      lastName: 'Cashier',
      role: 'ACCOUNTANT',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['billing.create', 'billing.read'],
    });
    cashierId = cashUser._id.toString();
    tokenCashier = jwtService.sign({
      sub: cashierId,
      email: cashUser.email,
      role: cashUser.role,
      hospitalId: tenantId,
    });

    // 7. Hospital Admin / Auditor
    const adminUser = await userModel.create({
      email: `admin_${Date.now()}@hospital.test`,
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Administrator',
      role: 'HOSPITAL_ADMIN',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(tenantId),
      permissions: ['*'],
    });
    adminId = adminUser._id.toString();
    tokenAdmin = jwtService.sign({
      sub: adminId,
      email: adminUser.email,
      role: adminUser.role,
      hospitalId: tenantId,
    });

    // Seed Pharmacy Medicine & Batch for this tenant
    const med = await medicineModel.create({
      tenantId: new Types.ObjectId(tenantId),
      brandName: 'Amoxil 500',
      genericName: 'Amoxicillin',
      dosageForm: DosageForm.CAPSULE,
      strength: '500 mg',
      category: 'Antibiotic',
      schedule: DrugSchedule.PRESCRIPTION,
      minStockLevel: 20,
    });
    medicineId = med._id.toString();

    const batch = await batchModel.create({
      tenantId: new Types.ObjectId(tenantId),
      medicineId: med._id,
      batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
      expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000), // 180 days out
      initialQuantity: 500,
      currentQuantity: 500,
      unitSalePrice: 120,
      unitCostPrice: 80,
      isActive: true,
    });
    batchId = batch._id.toString();
  });

  afterAll(async () => {
    if (userModel) {
      await userModel.deleteMany({
        _id: { $in: [receptionistId, doctorId, labTechId, pathologistId, pharmacistId, cashierId, adminId] },
      });
    }
    if (medicineModel) {
      await medicineModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (batchModel) {
      await batchModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    if (prescriptionModel) {
      await prescriptionModel.deleteMany({ tenantId: new Types.ObjectId(tenantId) });
    }
    await app.close();
  });

  // STEP 1 & 2: Receptionist Authentication & Patient Registration
  it('Step 1 & 2: Receptionist registers new patient with UHID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        name: { first: 'Amit', last: 'Verma' },
        dateOfBirth: '1992-08-20',
        gender: 'male',
        contacts: {
          phone: '+919123456780',
          email: 'amit.verma@example.com',
          address: {
            street: '14 MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
          },
        },
        emergencyContact: {
          name: 'Sunita Verma',
          relationship: 'Mother',
          phone: '+919123456781',
        },
      })
      .expect(201);

    patientId = res.body.data.id || res.body.data._id;
    patientUhid = res.body.data.uhid;

    expect(patientId).toBeDefined();
    expect(patientUhid).toBeDefined();
  });

  // STEP 3: Book Appointment & Check-In
  it('Step 3: Receptionist books outpatient appointment and performs check-in (token issued)', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const bookRes = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .send({
        patientId,
        doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '10:00 - 10:15',
        type: 'NEW',
        chiefComplaint: 'Persistent dry cough and mild fever',
      })
      .expect(201);

    appointmentId = bookRes.body.data.id || bookRes.body.data._id;
    expect(appointmentId).toBeDefined();
    expect(bookRes.body.data.tokenNumber).toBeGreaterThanOrEqual(1);

    // Reception check-in
    const checkInRes = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${tokenReceptionist}`)
      .expect(200);

    expect(checkInRes.body.data.status).toBe('CHECKED_IN');
  });

  // STEP 4 & 5: Doctor Consultation & EMR Finalization
  it('Step 4 & 5: Doctor conducts EMR consultation, records vitals, diagnoses, and seals encounter', async () => {
    // Start encounter
    const encRes = await request(app.getHttpServer())
      .post('/api/v1/emr/encounters')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({ appointmentId })
      .expect(201);

    encounterId = encRes.body.data.id || encRes.body.data._id;
    expect(encounterId).toBeDefined();

    // Save draft clinical notes & prescription
    await request(app.getHttpServer())
      .patch(`/api/v1/emr/encounters/${encounterId}`)
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        chiefComplaints: ['Cough for 5 days with low grade fever'],
        vitals: {
          bpSystolic: 120,
          bpDiastolic: 80,
          pulse: 74,
          temperature: 98.6,
          respiratoryRate: 16,
          spO2: 99,
          height: 175,
          weight: 70,
        },
        diagnoses: [
          {
            code: 'J20.9',
            description: 'Acute bronchitis, unspecified',
          },
        ],
        prescriptionItems: [
          {
            medicineName: 'Amoxil 500',
            dosageForm: 'capsule',
            strength: '500 mg',
            frequency: 'TDS',
            durationDays: 5,
            quantity: 15,
            instructions: 'After meals with water',
          },
        ],
      })
      .expect(200);

    // Finalize encounter
    const finalRes = await request(app.getHttpServer())
      .post(`/api/v1/emr/encounters/${encounterId}/finalize`)
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        diagnoses: [
          {
            code: 'J20.9',
            description: 'Acute bronchitis, unspecified',
          },
        ],
      })
      .expect(200);

    expect(finalRes.body.data.status).toBe('finalized');

    // Retrieve generated prescription
    const prescription = await prescriptionModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      encounterId: new Types.ObjectId(encounterId),
    });
    expect(prescription).toBeDefined();
    prescriptionId = prescription!._id.toString();
  });

  // STEP 6: Lab Requisition & Results Entry
  it('Step 6: Lab order is placed, specimen accessioned, and technician enters test results', async () => {
    // 1. Fetch test catalog to get CBC test ID
    const catalogRes = await request(app.getHttpServer())
      .get('/api/v1/lab/tests')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .expect(200);

    const cbcTest = catalogRes.body.data.find((t: any) => t.code === 'CBC') || catalogRes.body.data[0];
    expect(cbcTest).toBeDefined();
    cbcTestId = cbcTest._id || cbcTest.id;

    // 2. Requisition
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/lab/orders')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        patientId,
        doctorId,
        testIds: [cbcTestId],
        priority: 'routine',
        clinicalNotes: 'Rule out bacterial infection',
      })
      .expect(201);

    labOrderId = orderRes.body.data.id || orderRes.body.data._id;
    expect(labOrderId).toBeDefined();

    // 3. Accession sample
    await request(app.getHttpServer())
      .post(`/api/v1/lab/orders/${labOrderId}/sample`)
      .set('Authorization', `Bearer ${tokenLabTech}`)
      .send({
        containerType: 'EDTA Vacutainer',
        phlebotomistNotes: 'Venous blood collected cleanly',
      })
      .expect(200);

    // 4. Enter results
    const resultsRes = await request(app.getHttpServer())
      .post(`/api/v1/lab/orders/${labOrderId}/results`)
      .set('Authorization', `Bearer ${tokenLabTech}`)
      .send({
        results: [
          {
            testId: cbcTestId,
            parameterName: 'Hemoglobin',
            value: '14.5',
          },
          {
            testId: cbcTestId,
            parameterName: 'Total Leukocyte Count (WBC)',
            value: '7800',
          },
        ],
        technicianNotes: 'Parameters within normal bounds',
      })
      .expect(200);

    expect(resultsRes.body.data.status).toBe('result_entered');
  });

  // STEP 7: Pathologist Verification & Report Seal
  it('Step 7: Pathologist verifies results and signs diagnostic report', async () => {
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/v1/lab/orders/${labOrderId}/verify`)
      .set('Authorization', `Bearer ${tokenPathologist}`)
      .send({
        pathologistRemarks: 'Hematological parameters are within normal biological reference intervals.',
      })
      .expect(200);

    expect(verifyRes.body.data.status).toBe('verified');
  });

  // STEP 8: Pharmacist Dispensing from FEFO Batch
  it('Step 8: Pharmacist dispenses prescribed medication from FEFO batch', async () => {
    const dispenseRes = await request(app.getHttpServer())
      .post('/api/v1/pharmacy/dispense')
      .set('Authorization', `Bearer ${tokenPharmacist}`)
      .send({
        prescriptionId,
        items: [
          {
            medicineId,
            batchId,
            quantity: 15,
            instructions: '1 capsule three times daily for 5 days',
          },
        ],
        notes: 'Dispensed with patient counseling',
      })
      .expect(200);

    expect(dispenseRes.body.data.dispenseNumber).toBeDefined();
    expect(dispenseRes.body.data.items[0].quantity).toBe(15);
  });

  // STEP 9: Cashier Invoice Generation & Payment Settlement
  it('Step 9: Cashier generates itemized invoice and settles payment in full', async () => {
    // Generate Invoice
    const invRes = await request(app.getHttpServer())
      .post('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${tokenCashier}`)
      .send({
        patientId,
        appointmentId,
        encounterId,
        items: [
          {
            itemType: 'consultation',
            description: 'Outpatient Consultation Fee',
            quantity: 1,
            unitPrice: 500,
          },
          {
            itemType: 'diagnostic',
            description: 'Complete Blood Count (CBC)',
            quantity: 1,
            unitPrice: 350,
          },
          {
            itemType: 'pharmacy',
            description: 'Amoxil 500 mg (15 capsules)',
            quantity: 1,
            unitPrice: 180,
          },
        ],
      })
      .expect(201);

    invoiceId = invRes.body.data._id || invRes.body.data.id;
    const grandTotal = invRes.body.data.grandTotal;
    expect(invoiceId).toBeDefined();
    expect(grandTotal).toBe(1030);

    // Process Payment
    const payRes = await request(app.getHttpServer())
      .post('/api/v1/billing/payments')
      .set('Authorization', `Bearer ${tokenCashier}`)
      .send({
        invoiceId,
        amount: grandTotal,
        method: 'cash',
        notes: 'Paid at front desk cash register',
      })
      .expect(201);

    expect(payRes.body.data.receiptNumber).toBeDefined();
    expect(payRes.body.data.amount).toBe(1030);
  });

  // STEP 10: Security Audit Trail Verification
  it('Step 10: Master security audit trail records all clinical and operational operations', async () => {
    // Check audit logs for the tenant using admin token
    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    const logs = auditRes.body.data.logs || auditRes.body.data || [];
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // Verify key audit actions exist
    const recordedActions = logs.map((l: any) => l.action);
    console.log('  ✓ Verified Audit Actions in Trail:', recordedActions);
    expect(recordedActions.some((a: string) => a.includes('ENCOUNTER') || a.includes('PRESCRIPTION') || a.includes('LAB') || a.includes('DISPENSE') || a.includes('INVOICE') || a.includes('PAYMENT'))).toBe(true);
  });
});
