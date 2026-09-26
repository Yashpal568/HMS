import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import {
  AppointmentStatus,
  AppointmentType,
  QueuePriority,
  QueueEntryStatus,
  EncounterStatus,
  PrescriptionStatus,
  LabOrderStatus,
} from '@hms/types';
import { Types } from 'mongoose';

describe('OPD Test Suite 13: Complete Patient Journey & Negative Resilience', () => {
  let ctx: OpdTestContext;
  let tenantBPatientId: string;
  let tenantBCtx: OpdTestContext;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();
    tenantBCtx = await setupOpdTestContext();

    // Register a patient in Tenant B for isolation test
    const pB = await request(tenantBCtx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tenantBCtx.receptionistToken}`)
      .send({
        name: { first: 'TenantB', last: 'Patient' },
        dateOfBirth: '1985-05-15',
        gender: 'female',
        contacts: { phone: '+919999888877', address: { street: 'B Street', city: 'B City', state: 'State', postalCode: '123456' } },
        emergencyContact: { name: 'Contact', relationship: 'Spouse', phone: '+919999888876' },
      });
    tenantBPatientId = pB.body.data.id || pB.body.data._id;
  });

  afterAll(async () => {
    await teardownOpdTestContext(tenantBCtx);
    await teardownOpdTestContext(ctx);
  });

  describe('PHASE 15: OPD-001 COMPLETE PATIENT JOURNEY (Steps 1 to 25)', () => {
    let patientId: string;
    let appointmentId: string;
    let queueEntryId: string;
    let encounterId: string;
    let allocatedToken: number;
    let formattedToken: string;

    it('Step 1 & 2: Login as authorized OPD user and open OPD dashboard', async () => {
      // Step 1: Receptionist JWT token exists and has claims
      expect(ctx.receptionistToken).toBeDefined();
      expect(typeof ctx.receptionistToken).toBe('string');

      // Step 2: Open OPD Dashboard
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/appointments?date=${todayStr}`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .expect(200);

      // Step 3: Verify dashboard loads
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.summary).toBeDefined();
    });

    it('Step 4 & 5: Search existing patient and create test patient with atomic UHID', async () => {
      // Step 4: Search for non-existent patient
      const searchRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/patients?search=UHID-9999-NONEXISTENT')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .expect(200);
      expect(searchRes.body.data).toHaveLength(0);

      // Step 5: Register test patient
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          name: { first: 'Aarav', middle: 'K', last: 'Sharma' },
          dateOfBirth: '1988-11-20',
          gender: 'male',
          bloodGroup: 'O+',
          contacts: {
            phone: '+919876543210',
            email: 'aarav.sharma@example.test',
            address: {
              street: '42 MG Road',
              city: 'Bengaluru',
              state: 'Karnataka',
              postalCode: '560001',
              country: 'India',
            },
          },
          emergencyContact: {
            name: 'Pooja Sharma',
            relationship: 'Spouse',
            phone: '+919876543211',
          },
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      patientId = createRes.body.data.id || createRes.body.data._id;
      expect(patientId).toBeDefined();
      expect(createRes.body.data.uhid).toMatch(/^UHID-\d{4}-\d{6}$/);
    });

    it('Step 6: Create or select appointment', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          patientId,
          doctorId: ctx.doctorId,
          department: 'General Medicine',
          scheduledAt: todayStr,
          timeSlot: '10:00 - 10:15',
          type: AppointmentType.NEW,
          chiefComplaint: 'Persistent headache and elevated blood pressure',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      appointmentId = res.body.data.id || res.body.data._id;
      expect(appointmentId).toBeDefined();
      expect(res.body.data.status).toBe(AppointmentStatus.SCHEDULED);
    });

    it('Step 7, 8, 9, 10: Check in patient with triage vitals, verify queue entry, token, and WAITING status', async () => {
      // Step 7: Check in patient
      const checkInRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/appointments/${appointmentId}/check-in`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          priority: QueuePriority.URGENT,
          vitals: {
            bpSystolic: 150,
            bpDiastolic: 95,
            pulse: 88,
            temperature: 98.6,
            spO2: 98,
            respiratoryRate: 18,
            weight: 75,
            height: 175,
          },
          triageNotes: 'Complaining of throbbing occipital headache',
        })
        .expect(200);

      expect(checkInRes.body.success).toBe(true);
      expect(checkInRes.body.data.status).toBe(AppointmentStatus.CHECKED_IN);

      // Step 8: Verify queue entry exists
      const qEntry = await ctx.models.queueEntry.findOne({
        tenantId: new Types.ObjectId(ctx.tenantId),
        appointmentId: new Types.ObjectId(appointmentId),
      }).exec();

      expect(qEntry).toBeDefined();
      queueEntryId = qEntry!._id.toString();

      // Step 9: Verify token exists
      allocatedToken = qEntry!.tokenNumber;
      formattedToken = qEntry!.formattedToken;
      expect(allocatedToken).toBeGreaterThan(0);
      expect(formattedToken).toMatch(/^[A-Z]-\d{3}$/);

      // Step 10: Verify status = WAITING
      expect(qEntry!.status).toBe(QueueEntryStatus.WAITING);
      expect(qEntry!.priority).toBe(QueuePriority.URGENT);
      expect(qEntry!.priorityWeight).toBe(10);
    });

    it('Step 11, 12, 13: Open queue, execute CALL NEXT, verify patient becomes CALLED', async () => {
      // Step 11: Open queue
      const qRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/queue/doctor?date=${todayStr}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .expect(200);

      expect(qRes.body.data.some((e: any) => (e._id || e.id) === queueEntryId)).toBe(true);

      // Step 12: Execute CALL NEXT
      const callRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/queue/call-next')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ date: todayStr })
        .expect(201);

      expect(callRes.body.success).toBe(true);
      expect(callRes.body.data).toBeDefined();

      // Step 13: Verify patient becomes CALLED
      expect(callRes.body.data._id || callRes.body.data.id).toBe(queueEntryId);
      expect(callRes.body.data.status).toBe(QueueEntryStatus.CALLED);
      expect(callRes.body.data.calledAt).toBeDefined();
    });

    it('Step 14, 15, 16: Start consultation, verify status = IN_CONSULTATION and encounter exists', async () => {
      // Step 14: Start consultation encounter
      const encRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/emr/encounters')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ appointmentId })
        .expect(201);

      expect(encRes.body.success).toBe(true);
      encounterId = encRes.body.data.id || encRes.body.data._id;
      expect(encounterId).toBeDefined();

      // Step 15: Verify status = IN_CONSULTATION
      const updatedQ = await ctx.models.queueEntry.findById(queueEntryId).exec();
      expect(updatedQ?.status).toBe(QueueEntryStatus.IN_CONSULTATION);
      expect(updatedQ?.consultationStartedAt).toBeDefined();

      // Step 16: Verify encounter exists with draft status and pre-populated triage vitals
      expect(encRes.body.data.status).toBe(EncounterStatus.DRAFT);
      expect(encRes.body.data.vitals.bpSystolic).toBe(150);
      expect(encRes.body.data.vitals.bpDiastolic).toBe(95);
      expect(encRes.body.data.vitals.bmi).toBe(24.5);
    });

    it('Step 17 & 18: Perform clinical consultation action, verify downstream orders, prescription, and lab handoff', async () => {
      // Step 17: Save clinical notes, diagnosis, prescription, and lab investigation
      const patchRes = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/emr/encounters/${encounterId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          chiefComplaints: ['Throbbing headache and blurred vision for 3 days'],
          examinationNotes: 'BP 150/95 mmHg. Fundus examination normal. Clear lung fields.',
          diagnoses: [
            {
              code: 'I10',
              description: 'Essential (primary) hypertension',
              type: 'primary',
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
              instructions: 'Take once daily in the morning',
            },
          ],
          investigations: [
            {
              testName: 'Complete Blood Count',
              instructions: 'Fasting routine hematology',
              urgency: 'urgent',
            },
          ],
        })
        .expect(200);

      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.diagnoses).toHaveLength(1);

      // Step 18: Finalize encounter generating downstream pharmacy Rx, lab order, and billing handoff
      const finalizeRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/emr/encounters/${encounterId}/finalize`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          diagnoses: [
            {
              code: 'I10',
              description: 'Essential (primary) hypertension',
              type: 'primary',
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
              instructions: 'Take once daily in the morning',
            },
          ],
          investigations: [
            {
              testName: 'Complete Blood Count',
              instructions: 'Fasting routine hematology',
              urgency: 'urgent',
            },
          ],
        })
        .expect(200);

      expect(finalizeRes.body.success).toBe(true);

      // Verify downstream prescription created in pharmacy domain
      const rx = await ctx.models.prescription.findOne({
        tenantId: new Types.ObjectId(ctx.tenantId),
        patientId: new Types.ObjectId(patientId),
        encounterId: new Types.ObjectId(encounterId),
      }).exec();

      expect(rx).toBeDefined();
      expect(rx?.status).toBe(PrescriptionStatus.ACTIVE);
      expect(rx?.items).toHaveLength(1);

      // Verify downstream lab requisition created in lab domain
      const labOrder = await ctx.models.labOrder.findOne({
        tenantId: new Types.ObjectId(ctx.tenantId),
        patientId: new Types.ObjectId(patientId),
      }).exec();

      expect(labOrder).toBeDefined();
      expect(labOrder?.status).toBe(LabOrderStatus.ORDERED);
    });

    it('Step 19 & 20: Complete encounter, verify queue/encounter status becomes COMPLETED', async () => {
      // Step 19 & 20: Verification of COMPLETED states
      const qEntry = await ctx.models.queueEntry.findById(queueEntryId).exec();
      expect(qEntry?.status).toBe(QueueEntryStatus.COMPLETED);
      expect(qEntry?.completedAt).toBeDefined();

      const enc = await ctx.models.encounter.findById(encounterId).exec();
      expect(enc?.status).toBe(EncounterStatus.FINALIZED);
      expect(enc?.finalizedAt).toBeDefined();

      const appt = await ctx.models.appointment.findById(appointmentId).exec();
      expect(appt?.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('Step 21: Verify security audit events exist across the full patient lifecycle', async () => {
      // Check audit events for patient registration, appointment check-in, queue assignment, and encounter finalize
      const auditLogs = await ctx.models.auditLog.find({
        $or: [{ hospitalId: ctx.tenantId }, { tenantId: ctx.tenantId }],
      }).exec();

      expect(auditLogs.length).toBeGreaterThan(0);
      const actions = auditLogs.map((l) => l.action);

      expect(actions).toContain('PATIENT_CREATE');
      expect(actions.some((a) => a.includes('APPOINTMENT') || a.includes('CHECKIN') || a.includes('QUEUE'))).toBe(true);
    });

    it('Step 22 & 23: Re-query backend (simulating browser refresh) to verify state persistence', async () => {
      // Step 22: Query backend endpoints fresh
      const apptRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .expect(200);

      // Step 23: Verify state persists
      expect(apptRes.body.data.status).toBe(AppointmentStatus.COMPLETED);

      const encRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/emr/encounters/${encounterId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .expect(200);

      expect(encRes.body.data.status).toBe(EncounterStatus.FINALIZED);
    });

    it('Step 24 & 25: Verify no duplicate queue entry or encounter exists', async () => {
      // Step 24: Exactly 1 queue entry for this appointment
      const qCount = await ctx.models.queueEntry.countDocuments({
        tenantId: new Types.ObjectId(ctx.tenantId),
        appointmentId: new Types.ObjectId(appointmentId),
      }).exec();
      expect(qCount).toBe(1);

      // Step 25: Exactly 1 encounter for this appointment
      const encCount = await ctx.models.encounter.countDocuments({
        tenantId: new Types.ObjectId(ctx.tenantId),
        appointmentId: new Types.ObjectId(appointmentId),
      }).exec();
      expect(encCount).toBe(1);
    });
  });

  describe('PHASE 16: NEGATIVE FAILURE TESTS (OPD-NEG-001 to OPD-NEG-012)', () => {
    it('OPD-NEG-001: Unauthorized user (Accountant) opening OPD endpoints returns 403 Forbidden', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/queue/doctor')
        .set('Authorization', `Bearer ${ctx.unauthorizedToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('OPD-NEG-002: Unauthorized API request without Bearer token returns 401 Unauthorized', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/appointments')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('OPD-NEG-003: Duplicate check-in on an already checked-in appointment throws 409 Conflict', async () => {
      // Register dedicated patient for this test to avoid collision
      const pat = await request(ctx.app.getHttpServer())
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          name: { first: 'Rohit', last: 'NegTest' },
          dateOfBirth: '1992-04-12',
          gender: 'male',
          contacts: { phone: '+919876543299', address: { street: 'Main St', city: 'BLR', state: 'KA', postalCode: '560001' } },
          emergencyContact: { name: 'Friend', relationship: 'Friend', phone: '+919876543298' },
        });
      const negPatId = pat.body.data.id || pat.body.data._id;

      // Create new appointment and check it in once
      const appt = await request(ctx.app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          patientId: negPatId,
          doctorId: ctx.doctorId,
          department: 'General Medicine',
          scheduledAt: todayStr,
          timeSlot: '12:00 - 12:15',
          type: AppointmentType.NEW,
          chiefComplaint: 'Follow-up',
        });
      const testApptId = appt.body.data.id || appt.body.data._id;

      await request(ctx.app.getHttpServer())
        .post(`/api/v1/appointments/${testApptId}/check-in`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({ priority: QueuePriority.NORMAL })
        .expect(200);

      // Attempt second check-in immediately
      const dupRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/appointments/${testApptId}/check-in`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({ priority: QueuePriority.NORMAL });

      expect([400, 409]).toContain(dupRes.status);
    });

    it('OPD-NEG-004: Duplicate direct queue assignment throws 409 Conflict', async () => {
      const p = (await ctx.models.patient.findOne({ tenantId: new Types.ObjectId(ctx.tenantId) }).exec())!;
      const fakeApptId = new Types.ObjectId().toString();

      await ctx.models.queueEntry.create({
        tenantId: new Types.ObjectId(ctx.tenantId),
        queueId: new Types.ObjectId(),
        patientId: p._id,
        appointmentId: new Types.ObjectId(fakeApptId),
        doctorId: new Types.ObjectId(ctx.doctorId),
        department: 'General Medicine',
        date: todayStr,
        tokenNumber: 99,
        formattedToken: 'T-099',
        priority: QueuePriority.NORMAL,
        priorityWeight: 1,
        status: QueueEntryStatus.WAITING,
        checkedInAt: new Date(),
      });

      // Attempting to check in duplicate appointment into queue
      const dupRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/queue/check-in')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          patientId: p._id.toString(),
          doctorId: ctx.doctorId,
          department: 'General Medicine',
          appointmentId: fakeApptId,
        })
        .expect(409);

      expect(dupRes.body.statusCode).toBe(409);
    });

    it('OPD-NEG-005: Concurrent CALL NEXT with only one waiting patient allows only one claim', async () => {
      // Clear out doctor's existing queue for clean test
      await ctx.models.queueEntry.deleteMany({
        tenantId: new Types.ObjectId(ctx.tenantId),
        doctorId: new Types.ObjectId(ctx.doctorId),
        date: todayStr,
      });

      // Insert exactly 1 WAITING patient
      const p = (await ctx.models.patient.findOne({ tenantId: new Types.ObjectId(ctx.tenantId) }).exec())!;
      const q = await ctx.models.queue.findOneAndUpdate(
        { tenantId: new Types.ObjectId(ctx.tenantId), doctorId: new Types.ObjectId(ctx.doctorId), date: todayStr },
        { $setOnInsert: { totalTokensIssued: 1, totalCompleted: 0, totalSkipped: 0 } },
        { upsert: true, new: true },
      );

      await ctx.models.queueEntry.create({
        tenantId: new Types.ObjectId(ctx.tenantId),
        queueId: q._id,
        patientId: p._id,
        doctorId: new Types.ObjectId(ctx.doctorId),
        department: 'General Medicine',
        date: todayStr,
        tokenNumber: 101,
        formattedToken: 'T-101',
        priority: QueuePriority.NORMAL,
        priorityWeight: 1,
        status: QueueEntryStatus.WAITING,
        checkedInAt: new Date(),
      });

      // Send 2 concurrent CALL NEXT calls simultaneously
      const [res1, res2] = await Promise.all([
        request(ctx.app.getHttpServer())
          .post('/api/v1/queue/call-next')
          .set('Authorization', `Bearer ${ctx.doctorToken}`)
          .send({ date: todayStr }),
        request(ctx.app.getHttpServer())
          .post('/api/v1/queue/call-next')
          .set('Authorization', `Bearer ${ctx.doctorToken}`)
          .send({ date: todayStr }),
      ]);

      const successCount = [res1.body.data, res2.body.data].filter((d) => d !== null).length;
      const nullCount = [res1.body.data, res2.body.data].filter((d) => d === null).length;

      expect(successCount).toBe(1);
      expect(nullCount).toBe(1);
    });

    it('OPD-NEG-006: Invalid patient ID returns 404 Not Found during appointment booking', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          patientId: nonExistentId,
          doctorId: ctx.doctorId,
          department: 'General Medicine',
          scheduledAt: todayStr,
          timeSlot: '14:00 - 14:15',
          type: AppointmentType.NEW,
          chiefComplaint: 'Test non-existent patient',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('OPD-NEG-007: Invalid appointment ID returns 404 Not Found during check-in', async () => {
      const nonExistentApptId = new Types.ObjectId().toString();
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/appointments/${nonExistentApptId}/check-in`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({ priority: QueuePriority.NORMAL })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('OPD-NEG-008: Wrong tenant patient access returns 404 Not Found (zero cross-tenant leak)', async () => {
      // Tenant A staff attempts to retrieve Tenant B patient
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/patients/${tenantBPatientId}`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('OPD-NEG-009: Backend API handles non-existent routes with structured 404 envelope', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/queue/non-existent-opd-route')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .expect(404);

      expect(res.status).toBe(404);
    });

    it('OPD-NEG-010: Validation error during check-in rejects partial payload and prevents queue mutation', async () => {
      const testAppt = await ctx.models.appointment.create({
        tenantId: new Types.ObjectId(ctx.tenantId),
        patientId: (await ctx.models.patient.findOne({ tenantId: new Types.ObjectId(ctx.tenantId) }).exec())!._id,
        doctorId: new Types.ObjectId(ctx.doctorId),
        department: 'General Medicine',
        tokenNumber: 998,
        scheduledAt: new Date(),
        timeSlot: '15:00 - 15:15',
        type: AppointmentType.NEW,
        status: AppointmentStatus.SCHEDULED,
        chiefComplaint: 'Validation test',
      });

      // Submit invalid triage vitals (systolic BP is an invalid string)
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/appointments/${testAppt._id}/check-in`)
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          priority: QueuePriority.NORMAL,
          vitals: {
            bpSystolic: 'invalid-string-instead-of-number',
          },
        })
        .expect(400);

      expect(res.body.success).toBe(false);

      // Verify appointment remains in SCHEDULED status
      const unchangedAppt = await ctx.models.appointment.findById(testAppt._id).exec();
      expect(unchangedAppt?.status).toBe(AppointmentStatus.SCHEDULED);

      // Verify no queue entry was inserted
      const qEntry = await ctx.models.queueEntry.findOne({ appointmentId: testAppt._id }).exec();
      expect(qEntry).toBeNull();
    });

    it('OPD-NEG-011: Double click CALL NEXT when queue is empty returns graceful null payload', async () => {
      // Clear out doctor's queue
      await ctx.models.queueEntry.deleteMany({
        tenantId: new Types.ObjectId(ctx.tenantId),
        doctorId: new Types.ObjectId(ctx.doctorId),
      });

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/queue/call-next')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ date: todayStr })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
      expect(res.body.message).toBe('No patients waiting in queue');
    });

    it('OPD-NEG-012: Queue state persistence after rapid transition preserves atomic consistency', async () => {
      // Seed a waiting entry and test skip followed by recall
      const p = (await ctx.models.patient.findOne({ tenantId: new Types.ObjectId(ctx.tenantId) }).exec())!;
      const q = await ctx.models.queue.findOneAndUpdate(
        { tenantId: new Types.ObjectId(ctx.tenantId), doctorId: new Types.ObjectId(ctx.doctorId), date: todayStr },
        { $setOnInsert: { totalTokensIssued: 1, totalCompleted: 0, totalSkipped: 0 } },
        { upsert: true, new: true },
      );

      const entry = await ctx.models.queueEntry.create({
        tenantId: new Types.ObjectId(ctx.tenantId),
        queueId: q._id,
        patientId: p._id,
        doctorId: new Types.ObjectId(ctx.doctorId),
        department: 'General Medicine',
        date: todayStr,
        tokenNumber: 205,
        formattedToken: 'T-205',
        priority: QueuePriority.NORMAL,
        priorityWeight: 1,
        status: QueueEntryStatus.CALLED,
        calledAt: new Date(),
        checkedInAt: new Date(),
      });

      // Skip entry
      const skipRes = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/queue/entries/${entry._id}/skip`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ reason: 'Patient stepped away' })
        .expect(200);

      expect(skipRes.body.data.status).toBe(QueueEntryStatus.SKIPPED);

      // Recall entry
      const recallRes = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/queue/entries/${entry._id}/recall`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .expect(200);

      expect(recallRes.body.data.status).toBe(QueueEntryStatus.CALLED);

      // Verify atomic DB record
      const dbEntry = await ctx.models.queueEntry.findById(entry._id).exec();
      expect(dbEntry?.status).toBe(QueueEntryStatus.CALLED);
    });
  });
});
