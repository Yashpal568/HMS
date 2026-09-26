import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';
import { QueuePriority, QueueEntryStatus } from '@hms/types';
import { Types } from 'mongoose';

describe('OPD Test Suite 09: Queue Concurrency & Atomic Dequeue Integrity', () => {
  let ctx: OpdTestContext;
  let secondDoctorToken: string;
  let secondDoctorId: string;

  beforeAll(async () => {
    ctx = await setupOpdTestContext();

    // Create a second doctor in the same tenant and department
    const doc2 = await ctx.models.user.create({
      email: `doctor2_${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      firstName: 'Doctor',
      lastName: 'Two',
      role: 'DOCTOR',
      department: 'General Medicine',
      status: 'ACTIVE' as any,
      hospitalId: new Types.ObjectId(ctx.tenantId),
      permissions: ['emr.read', 'emr.update', 'appointments.read', 'patients.read'],
    });
    secondDoctorId = doc2._id.toString();
    secondDoctorToken = ctx.jwtService.sign({
      sub: secondDoctorId,
      email: doc2.email,
      role: doc2.role,
      hospitalId: ctx.tenantId,
    });
  });

  afterAll(async () => {
    await ctx.models.user.deleteOne({ _id: new Types.ObjectId(secondDoctorId) });
    await teardownOpdTestContext(ctx);
  });

  it('OPD-CONC-01: Simultaneous CALL NEXT from concurrent sessions guarantees mutual exclusion', async () => {
    // Register 4 patients and check them in to Doctor 1's queue
    const patientIds: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const p = await request(ctx.app.getHttpServer())
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          name: { first: `ConcurrentPatient${i}`, last: 'Test' },
          dateOfBirth: '1990-01-01',
          gender: 'female',
          contacts: { phone: `+91999900000${i}`, address: { street: 'St', city: 'City', state: 'ST', postalCode: '100001' } },
          emergencyContact: { name: 'Kin', relationship: 'Kin', phone: `+91999900000${i}` },
        });
      const pId = p.body.data.id || p.body.data._id;
      patientIds.push(pId);

      await request(ctx.app.getHttpServer())
        .post('/api/v1/queue/check-in')
        .set('Authorization', `Bearer ${ctx.receptionistToken}`)
        .send({
          patientId: pId,
          doctorId: ctx.doctorId,
          department: 'General Medicine',
          priority: i % 2 === 0 ? QueuePriority.URGENT : QueuePriority.NORMAL,
          chiefComplaint: `Concurrent symptom #${i}`,
        });
    }

    // Fire 2 concurrent CALL NEXT operations simultaneously targeting the same doctor queue
    const [call1, call2] = await Promise.all([
      request(ctx.app.getHttpServer())
        .post('/api/v1/queue/call-next')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({}),
      request(ctx.app.getHttpServer())
        .post('/api/v1/queue/call-next')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({}),
    ]);

    expect(call1.status).toBe(201);
    expect(call2.status).toBe(201);

    const token1 = call1.body.data?.tokenNumber;
    const token2 = call2.body.data?.tokenNumber;

    // Both operations must have dequeued different patients
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);

    const id1 = call1.body.data?._id;
    const id2 = call2.body.data?._id;
    expect(id1).not.toBe(id2);

    // Verify both are now in CALLED status
    const entry1 = await ctx.models.queueEntry.findById(id1).exec();
    const entry2 = await ctx.models.queueEntry.findById(id2).exec();
    expect(entry1?.status).toBe(QueueEntryStatus.CALLED);
    expect(entry2?.status).toBe(QueueEntryStatus.CALLED);
  });
});
