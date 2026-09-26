import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import { AppointmentStatus, AppointmentType } from '@hms/types';

describe('OPD Test Suite 03: Outpatient Appointments & Slot Scheduling', () => {
  let ctx: OpdTestContext;
  let patientId: string;
  let appointmentId: string;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // Register a patient for appointment booking
    const pRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Meera', last: 'Sen' },
        dateOfBirth: '1988-07-19',
        gender: 'female',
        contacts: {
          phone: '+919876500112',
          email: 'meera.sen@example.com',
          address: {
            street: '78 Park Street',
            city: 'Kolkata',
            state: 'West Bengal',
            postalCode: '700016',
          },
        },
        emergencyContact: {
          name: 'Anupam Sen',
          relationship: 'Spouse',
          phone: '+919876500113',
        },
      });

    patientId = pRes.body.data.id || pRes.body.data._id;
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-APP-01: Books outpatient appointment with doctor schedule and daily token', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '09:00 - 09:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'Intermittent migraine headaches',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    appointmentId = res.body.data.id || res.body.data._id;
    expect(appointmentId).toBeDefined();
    expect(res.body.data.status).toBe(AppointmentStatus.SCHEDULED);
    expect(res.body.data.tokenNumber).toBe(1);
  });

  it('OPD-APP-02: Double-booking prevention rejects conflicting slot for same clinician', async () => {
    // Attempt to book another patient in the exact same timeSlot with the same doctor
    const pRes2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Rohit', last: 'Roy' },
        dateOfBirth: '1992-02-14',
        gender: 'male',
        contacts: {
          phone: '+919876500999',
          address: { street: 'Main Rd', city: 'Kolkata', state: 'WB', postalCode: '700001' },
        },
        emergencyContact: { name: 'Pooja', relationship: 'Sister', phone: '+919876500998' },
      });
    const patient2Id = pRes2.body.data.id || pRes2.body.data._id;

    const conflictRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: patient2Id,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '09:00 - 09:15',
        type: AppointmentType.NEW,
        chiefComplaint: 'Fever and body aches',
      })
      .expect(409);

    expect(conflictRes.body.success).toBe(false);
  });

  it('OPD-APP-03: Retrieves appointment by ID with uniform masked 404 for nonexistent records', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id || res.body.data._id).toBe(appointmentId);

    // Nonexistent ID
    await request(ctx.app.getHttpServer())
      .get('/api/v1/appointments/60c72b2f9b1d8b2badbee555')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(404);
  });

  it('OPD-APP-04: Cancels appointment with auditable reason code', async () => {
    // Register a dedicated patient to avoid single appointment per day rule
    const pRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Tanvi', last: 'Bose' },
        dateOfBirth: '1995-02-14',
        gender: 'female',
        contacts: { phone: '+919876599887', address: { street: 'Lake Rd', city: 'Kolkata', state: 'WB', postalCode: '700029' } },
        emergencyContact: { name: 'Parent', relationship: 'Mother', phone: '+919876599888' },
      });
    const cancelPatientId = pRes.body.data.id || pRes.body.data._id;

    // Book a temporary appointment to cancel
    const bookRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: cancelPatientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        scheduledAt: todayStr,
        timeSlot: '09:30 - 09:45',
        type: AppointmentType.FOLLOW_UP,
        chiefComplaint: 'Follow-up consultation',
      });

    const tempApptId = bookRes.body.data.id || bookRes.body.data._id;

    const cancelRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/appointments/${tempApptId}/cancel`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({ reason: 'Patient requested cancellation due to travel' })
      .expect(200);

    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe(AppointmentStatus.CANCELLED);
  });
});
