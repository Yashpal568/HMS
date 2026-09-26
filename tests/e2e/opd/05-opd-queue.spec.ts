import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import { QueuePriority, QueueEntryStatus } from '@hms/types';

describe('OPD Test Suite 05: OPD Queue Management & Priority Dequeue', () => {
  let ctx: OpdTestContext;
  let routinePatientId: string;
  let urgentPatientId: string;
  let emergencyPatientId: string;

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // Register 3 patients with different clinical priorities
    const createPatient = async (firstName: string, phone: string) => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          name: { first: firstName, last: 'Patient' },
          dateOfBirth: '1980-01-01',
          gender: 'male',
          contacts: { phone, address: { street: 'Main St', city: 'BLR', state: 'KA', postalCode: '560001' } },
          emergencyContact: { name: 'Kin', relationship: 'Family', phone },
        });
      return res.body.data.id || res.body.data._id;
    };

    routinePatientId = await createPatient('Routine', '+919100000001');
    urgentPatientId = await createPatient('Urgent', '+919100000002');
    emergencyPatientId = await createPatient('Emergency', '+919100000003');

    // 1. Check in Routine patient FIRST
    await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: routinePatientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        priority: QueuePriority.NORMAL,
        chiefComplaint: 'Mild checkup',
      });

    // 2. Check in Urgent patient SECOND
    await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: urgentPatientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        priority: QueuePriority.URGENT,
        chiefComplaint: 'High fever',
      });

    // 3. Check in Emergency patient THIRD
    await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        patientId: emergencyPatientId,
        doctorId: ctx.doctorId,
        department: 'General Medicine',
        priority: QueuePriority.EMERGENCY,
        chiefComplaint: 'Severe chest tightness',
      });
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-QUE-01: Retrieves doctor queue showing all 3 waiting patients sorted by priority weight', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/queue/doctor')
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.meta.summary.waiting).toBe(3);

    // Verify ordering: Emergency (weight 100) first, then Urgent (weight 10), then Routine (weight 0)
    expect(res.body.data[0].priority).toBe(QueuePriority.EMERGENCY);
    expect(res.body.data[1].priority).toBe(QueuePriority.URGENT);
    expect(res.body.data[2].priority).toBe(QueuePriority.NORMAL);
  });

  it('OPD-QUE-02: CALL NEXT atomically dequeues EMERGENCY patient first regardless of check-in time', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/queue/call-next')
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({})
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe(QueuePriority.EMERGENCY);
    expect(res.body.data.status).toBe(QueueEntryStatus.CALLED);
    expect(String(res.body.data.patientId._id || res.body.data.patientId)).toBe(emergencyPatientId);
  });

  it('OPD-QUE-03: Clinician skips absent patient with auditable cancellation reason', async () => {
    // Get the called emergency entry ID
    const docQueue = await request(ctx.app.getHttpServer())
      .get(`/api/v1/queue/doctor?status=${QueueEntryStatus.CALLED}`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .expect(200);

    const calledEntryId = docQueue.body.data[0]._id || docQueue.body.data[0].id;

    const skipRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/queue/entries/${calledEntryId}/skip`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({ reason: 'Patient did not answer room call after 3 attempts' })
      .expect(200);

    expect(skipRes.body.success).toBe(true);
    expect(skipRes.body.data.status).toBe(QueueEntryStatus.SKIPPED);
  });
});
