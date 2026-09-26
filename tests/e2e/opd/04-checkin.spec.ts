import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import { AppointmentStatus, AppointmentType, QueuePriority, QueueEntryStatus } from '@hms/types';

describe('OPD Test Suite 04: Reception Check-In & Clinical Triage', () => {
  let ctx: OpdTestContext;
  let patient1Id: string;
  let patient2Id: string;
  let appointment1Id: string;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // Register Patient 1
    const p1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Deepak', last: 'Verma' },
        dateOfBirth: '1985-06-10',
        gender: 'male',
        contacts: {
          phone: '+919876500222',
          address: { street: '1st Cross', city: 'Bengaluru', state: 'KA', postalCode: '560001' },
        },
        emergencyContact: { name: 'Kiran', relationship: 'Wife', phone: '+919876500223' },
      });
    patient1Id = p1.body.data.id || p1.body.data._id;

    // Register Patient 2
    const p2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Anita', last: 'Deshmukh' },
        dateOfBirth: '1993-09-18',
        gender: 'female',
        contacts: {
          phone: '+919876500333',
          address: { street: '2nd Main', city: 'Bengaluru', state: 'KA', postalCode: '560002' },
        },
        emergencyContact: { name: 'Sanjay', relationship: 'Husband', phone: '+919876500334' },
      });
    patient2Id = p2.body.data.id || p2.body.data._id;

    // Book appointment for Patient 1
    const appt = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: patient1Id,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '10:00 - 10:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'High fever and fatigue',
      });
    appointment1Id = appt.body.data.id || appt.body.data._id;
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-CHK-01: Receptionist checks in scheduled patient with triage vitals & priority', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/appointments/${appointment1Id}/check-in`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        priority: QueuePriority.URGENT,
        chiefComplaint: 'High fever, rigors, body aches',
        triageNotes: 'Triage desk assessment indicates febrile illness',
        vitals: {
          bpSystolic: 125,
          bpDiastolic: 82,
          pulse: 98,
          temperature: 101.4,
          spO2: 97,
          respiratoryRate: 20,
          weight: 68,
          height: 172,
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(AppointmentStatus.CHECKED_IN);
    expect(res.body.data.triagePriority).toBe(QueuePriority.URGENT);
    expect(res.body.data.triageVitals.temperature).toBe(101.4);
    expect(res.body.data.triageVitals.bmi).toBe(23.0);
    expect(res.body.data.triageVitals.bmiCategory).toBe('normal');
  });

  it('OPD-CHK-02: Walk-In check-in automatically enrolls in queue and generates appointment record', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: patient2Id,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        priority: QueuePriority.NORMAL,
        chiefComplaint: 'Acute cough and sore throat',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QueueEntryStatus.WAITING);
    expect(res.body.data.appointmentId).toBeDefined();
    expect(res.body.data.tokenNumber).toBeGreaterThanOrEqual(1);
  });

  it('OPD-CHK-03: Duplicate check-in prevention rejects checking in an already checked-in appointment', async () => {
    // Attempt to check in appointment1Id again
    const dupRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/appointments/${appointment1Id}/check-in`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({ priority: QueuePriority.NORMAL });

    // Throws 409 Conflict to prevent duplicate queue entry and appointment check-in
    expect([400, 409]).toContain(dupRes.status);
  });
});
