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
  LabOrderPriority,
} from '@hms/types';
import { Types } from 'mongoose';

describe('OPD Test Suite 06: Doctor Consultation & EMR Encounter Lifecycle', () => {
  let ctx: OpdTestContext;
  let patientId: string;
  let appointmentId: string;
  let encounterId: string;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // Register Patient
    const p = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Sunil', last: 'Gavaskar' },
        dateOfBirth: '1970-07-10',
        gender: 'male',
        contacts: { phone: '+919811223344', address: { street: 'Stadium Rd', city: 'BLR', state: 'KA', postalCode: '560001' } },
        emergencyContact: { name: 'Rohan', relationship: 'Son', phone: '+919811223345' },
      });
    patientId = p.body.data.id || p.body.data._id;

    // Book Appointment
    const appt = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '11:00 - 11:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'Chest tightness on exertion',
      });
    appointmentId = appt.body.data.id || appt.body.data._id;

    // Check in with Triage Vitals
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        priority: QueuePriority.URGENT,
        vitals: {
          bpSystolic: 145,
          bpDiastolic: 92,
          pulse: 84,
          temperature: 98.4,
          spO2: 99,
          respiratoryRate: 16,
          weight: 78,
          height: 175,
        },
      });
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-ENC-01: Start consultation encounter pre-populates triage vitals and syncs queue to IN_CONSULTATION', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/emr/encounters')
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({ appointmentId })
      .expect(201);

    expect(res.body.success).toBe(true);
    encounterId = res.body.data.id || res.body.data._id;
    expect(encounterId).toBeDefined();
    expect(res.body.data.status).toBe(EncounterStatus.DRAFT);

    // Verify vitals pre-populated from reception triage
    expect(res.body.data.vitals.bpSystolic).toBe(145);
    expect(res.body.data.vitals.bpDiastolic).toBe(92);
    expect(res.body.data.vitals.bmi).toBe(25.5);

    // Verify queue entry transitioned to IN_CONSULTATION
    const qEntry = await ctx.models.queueEntry.findOne({
      tenantId: new Types.ObjectId(ctx.tenantId),
      appointmentId: new Types.ObjectId(appointmentId),
    }).exec();
    expect(qEntry?.status).toBe(QueueEntryStatus.IN_CONSULTATION);
    expect(qEntry?.consultationStartedAt).toBeDefined();
  });

  it('OPD-ENC-02: Saves draft clinical notes, ICD-10 diagnosis, prescription, and lab investigation requisitions', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/emr/encounters/${encounterId}`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({
        chiefComplaints: ['Exertional angina and shortness of breath for 1 week'],
        examinationNotes: 'Regular S1, S2, no murmurs. Bilateral vesicular breath sounds.',
        diagnoses: [
          {
            code: 'I20.9',
            description: 'Angina pectoris, unspecified',
          },
        ],
        prescriptionItems: [
          {
            medicineName: 'Aspirin 75mg',
            dosageForm: 'tablet',
            strength: '75 mg',
            frequency: 'OD',
            durationDays: 30,
            quantity: 30,
            instructions: 'Post dinner with water',
          },
        ],
        investigations: [
          {
            testName: 'Complete Blood Count',
            instructions: 'Fasting whole blood',
            urgency: 'urgent',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.diagnoses.length).toBe(1);
    expect(res.body.data.diagnoses[0].code).toBe('I20.9');
    expect(res.body.data.prescription).toBeDefined();
  });

  it('OPD-ENC-03: Finalize consultation seals encounter, creates active Rx, generates STAT lab order, and completes queue', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/emr/encounters/${encounterId}/finalize`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({
        diagnoses: [
          {
            code: 'I20.9',
            description: 'Angina pectoris, unspecified',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(EncounterStatus.FINALIZED);
    expect(res.body.data.finalizedAt).toBeDefined();

    // Verify appointment status COMPLETED
    const updatedAppt = await ctx.models.appointment.findById(appointmentId).exec();
    expect(updatedAppt?.status).toBe(AppointmentStatus.COMPLETED);

    // Verify queue entry status COMPLETED
    const updatedQEntry = await ctx.models.queueEntry.findOne({
      tenantId: new Types.ObjectId(ctx.tenantId),
      appointmentId: new Types.ObjectId(appointmentId),
    }).exec();
    expect(updatedQEntry?.status).toBe(QueueEntryStatus.COMPLETED);
    expect(updatedQEntry?.completedAt).toBeDefined();

    // Verify Pharmacy Downstream Handoff
    const rx = await ctx.models.prescription.findOne({
      tenantId: new Types.ObjectId(ctx.tenantId),
      encounterId: new Types.ObjectId(encounterId),
    }).exec();
    expect(rx?.status).toBe(PrescriptionStatus.ACTIVE);

    // Verify Laboratory Downstream Handoff
    const labOrder = await ctx.models.labOrder.findOne({
      tenantId: new Types.ObjectId(ctx.tenantId),
      appointmentId: new Types.ObjectId(appointmentId),
    }).exec();
    expect(labOrder?.priority).toBe(LabOrderPriority.STAT);
  });
});
