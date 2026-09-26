import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import { AppointmentType } from '@hms/types';

describe('OPD Test Suite 08: Multi-Tenant Data Isolation & IDOR Protection', () => {
  let tenantA: OpdTestContext;
  let tenantB: OpdTestContext;

  let patientAId: string;
  let appointmentAId: string;

  beforeAll(async () => {
    tenantA = await setupOpdTestContext();
    tenantB = await setupOpdTestContext();

    // Register Patient in Tenant A
    const pA = await request(tenantA.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tenantA.receptionistToken}`)
      .send({
        name: { first: 'Isolated', last: 'TenantA' },
        dateOfBirth: '1985-05-15',
        gender: 'female',
        contacts: { phone: '+919777700001', address: { street: 'Street A', city: 'BLR', state: 'KA', postalCode: '560001' } },
        emergencyContact: { name: 'Kin A', relationship: 'Kin', phone: '+919777700002' },
      });
    patientAId = pA.body.data.id || pA.body.data._id;

    // Book Appointment in Tenant A
    const apptA = await request(tenantA.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${tenantA.receptionistToken}`)
      .send({
        patientId: patientAId,
        doctorId: tenantA.doctorId,
        department: 'General Medicine',
        scheduledAt: new Date().toISOString().split('T')[0],
        timeSlot: '15:00 - 15:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'Confidential clinical condition',
      });
    appointmentAId = apptA.body.data.id || apptA.body.data._id;
  });

  afterAll(async () => {
    await teardownOpdTestContext(tenantA);
    await teardownOpdTestContext(tenantB);
  });

  it('OPD-ISO-01: Tenant B cannot access Tenant A patient details — returns uniform 404 Not Found', async () => {
    const res = await request(tenantB.app.getHttpServer())
      .get(`/api/v1/patients/${patientAId}`)
      .set('Authorization', `Bearer ${tenantB.receptionistToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('OPD-ISO-02: Tenant B cannot access Tenant A appointment — returns uniform 404 Not Found', async () => {
    const res = await request(tenantB.app.getHttpServer())
      .get(`/api/v1/appointments/${appointmentAId}`)
      .set('Authorization', `Bearer ${tenantB.receptionistToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('OPD-ISO-03: Tenant B patient search never returns Tenant A patients', async () => {
    const res = await request(tenantB.app.getHttpServer())
      .get('/api/v1/patients?search=TenantA')
      .set('Authorization', `Bearer ${tenantB.receptionistToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('OPD-ISO-04: Tenant B clinician queue call-next never dequeues Tenant A waiting patients', async () => {
    // Check in Patient A in Tenant A
    await request(tenantA.app.getHttpServer())
      .post(`/api/v1/appointments/${appointmentAId}/check-in`)
      .set('Authorization', `Bearer ${tenantA.receptionistToken}`)
      .send({});

    // Tenant B doctor calls next
    const resB = await request(tenantB.app.getHttpServer())
      .post('/api/v1/queue/call-next')
      .set('Authorization', `Bearer ${tenantB.doctorToken}`)
      .send({})
      .expect(201);

    // Should return null (no patients waiting in Tenant B)
    expect(resB.body.data).toBeNull();
  });
});
