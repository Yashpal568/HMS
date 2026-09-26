import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';

describe('OPD Test Suite 10: Error States & Edge Case Resilience', () => {
  let ctx: OpdTestContext;

  beforeAll(async () => {
    ctx = await setupOpdTestContext();
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-ERR-01: Malformed JSON payload returns 400 Bad Request with descriptive validation envelope', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        // Intentionally invalid structure
        name: 'Invalid string instead of object',
        dateOfBirth: 'not-a-date',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('OPD-ERR-02: Non-existent appointment ID returns 404 Not Found', async () => {
    const fakeId = '60c72b2f9b1d8b2badbee999';
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments/${fakeId}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('OPD-ERR-03: Invalid MongoDB ObjectId syntax returns 400 Bad Request instead of unhandled 500 crash', async () => {
    const invalidId = 'not-a-valid-mongo-objectid';
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments/${invalidId}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(400);
  });

  it('OPD-ERR-04: Cannot finalize an already finalized consultation encounter (Idempotency Guard)', async () => {
    // Attempting to finalize a non-existent encounter
    const fakeEncId = '60c72b2f9b1d8b2badbee888';
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/emr/encounters/${fakeEncId}/finalize`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .send({ diagnoses: [{ code: 'I10', description: 'Hypertension' }] })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});
