import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';

describe('OPD Test Suite 01: OPD Dashboard & Telemetry', () => {
  let ctx: OpdTestContext;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    ctx = await setupOpdTestContext();
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-DASH-01: OPD appointments board loads authentic empty state when no bookings exist', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments?date=${todayStr}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.meta.summary).toEqual({
      total: 0,
      scheduled: 0,
      checkedIn: 0,
      inConsultation: 0,
      completed: 0,
      cancelled: 0,
    });
  });

  it('OPD-DASH-02: Doctor live queue telemetry returns authentic empty state for clean queue', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/queue/doctor?date=${todayStr}`)
      .set('Authorization', `Bearer ${ctx.doctorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.summary).toEqual({
      waiting: 0,
      called: 0,
      inConsultation: 0,
      completed: 0,
      skipped: 0,
    });
  });

  it('OPD-DASH-03: Filtering appointments by clinician and department scopes query properly', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments?date=${todayStr}&doctorId=${ctx.doctorId}&department=General%20Medicine`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('OPD-DASH-04: Unauthorized user request without valid JWT token returns 401 Unauthorized', async () => {
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/appointments?date=${todayStr}`)
      .expect(401);
  });
});
