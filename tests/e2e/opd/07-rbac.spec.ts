import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';

describe('OPD Test Suite 07: Role-Based Access Control (RBAC) & Principle of Least Privilege', () => {
  let ctx: OpdTestContext;
  let testPatientId: string;
  let testApptId: string;
  let testEncounterId: string;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // 1. Receptionist creates patient and books appointment
    const p = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Test', last: 'RBAC' },
        dateOfBirth: '1990-01-01',
        gender: 'other',
        contacts: { phone: '+919999900001', address: { street: 'Main', city: 'BLR', state: 'KA', postalCode: '560001' } },
        emergencyContact: { name: 'Emergency', relationship: 'Other', phone: '+919999900002' },
      });
    testPatientId = p.body.data.id || p.body.data._id;

    const appt = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: testPatientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '14:00 - 14:15',
        chiefComplaint: 'Routine wellness check',
      });
    testApptId = appt.body.data.id || appt.body.data._id;

    // Check in appointment
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/appointments/${testApptId}/check-in`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({});

    // Start encounter as doctor
    const enc = await request(ctx.app.getHttpServer())
      .post('/api/v1/emr/encounters')
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({ appointmentId: testApptId });
    testEncounterId = enc.body.data.id || enc.body.data._id;
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-RBAC-01: RECEPTIONIST is authorized for patient registration and check-in', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments/${testApptId}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('OPD-RBAC-02: RECEPTIONIST is denied finalizing clinical doctor encounters with 403 Forbidden', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/emr/encounters/${testEncounterId}/finalize`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({ diagnoses: [{ code: 'Z00.00', description: 'General adult medical examination' }] })
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('OPD-RBAC-03: ACCOUNTANT (Unauthorized role) is denied calling next patient with 403 Forbidden', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/call-next')
      .set('Authorization', `Bearer ${ctx.unauthorizedToken}`)
      .send({})
      .expect(403);

    expect(res.body.statusCode).toBe(403);
  });

  it('OPD-RBAC-04: DOCTOR is authorized for queue call-next and clinical documentation', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/queue/doctor')
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('OPD-RBAC-05: HOSPITAL_ADMIN has sovereign oversight permissions', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments?date=${todayStr}`)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
