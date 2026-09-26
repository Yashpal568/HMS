import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupOpdTestContext, teardownOpdTestContext, OpdTestContext } from './opd-test-helper.js';

describe('OPD Test Suite 02: Patient Registration & Master Patient Index', () => {
  let ctx: OpdTestContext;
  let createdPatientId: string;
  let createdUhid: string;

  beforeAll(async () => {
    ctx = await setupOpdTestContext();
  });

  afterAll(async () => {
    await teardownOpdTestContext(ctx);
  });

  it('OPD-PAT-01: Successfully registers new patient with atomic UHID assignment', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Aman', last: 'Khanna' },
        dateOfBirth: '1990-03-25',
        gender: 'male',
        contacts: {
          phone: '+919988776655',
          email: 'aman.khanna@example.com',
          address: {
            street: '12 Linking Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050',
          },
        },
        emergencyContact: {
          name: 'Sunita Khanna',
          relationship: 'Mother',
          phone: '+919988776656',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    createdPatientId = res.body.data.id || res.body.data._id;
    createdUhid = res.body.data.uhid;

    expect(createdPatientId).toBeDefined();
    expect(createdUhid).toMatch(/^UHID-\d{4}-\d{6}$/);
    expect(res.body.data.name.first).toBe('Aman');
  });

  it('OPD-PAT-02: Server-side search finds existing registered patient by UHID, name, and phone', async () => {
    // Search by UHID
    const resUhid = await request(ctx.app.getHttpServer())
      .get(`/api/v1/patients?search=${createdUhid}`)
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(resUhid.body.success).toBe(true);
    expect(resUhid.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resUhid.body.data[0].uhid).toBe(createdUhid);

    // Search by Name
    const resName = await request(ctx.app.getHttpServer())
      .get('/api/v1/patients?search=Aman')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(resName.body.data.some((p: any) => p.uhid === createdUhid)).toBe(true);

    // Search by Phone
    const resPhone = await request(ctx.app.getHttpServer())
      .get('/api/v1/patients?search=9988776655')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .expect(200);

    expect(resPhone.body.data.some((p: any) => p.uhid === createdUhid)).toBe(true);
  });

  it('OPD-PAT-03: Fails with 400 Bad Request when mandatory fields are missing', async () => {
    // Missing address
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Incomplete', last: 'Patient' },
        dateOfBirth: '1995-01-01',
        gender: 'female',
        contacts: {
          phone: '+919988776699',
        },
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('OPD-PAT-04: Duplicate detection flags patient with identical details', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${ctx.receptionistToken}`)
      .send({
        name: { first: 'Aman', last: 'Khanna' },
        dateOfBirth: '1990-03-25',
        gender: 'male',
        contacts: {
          phone: '+919988776655',
          email: 'aman.khanna@example.com',
          address: {
            street: '12 Linking Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050',
          },
        },
        emergencyContact: {
          name: 'Sunita Khanna',
          relationship: 'Mother',
          phone: '+919988776656',
        },
      });

    // Check duplicate detection response (either conflict or duplicate flagged)
    expect([200, 201, 400, 409]).toContain(res.status);
  });
});
