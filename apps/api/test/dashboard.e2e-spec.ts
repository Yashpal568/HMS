import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let validToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@hms.local',
        password: 'Admin@HMS2026',
      });

    validToken = loginRes.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/dashboard should reject unauthenticated requests with 401', () => {
    return request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .expect(401);
  });

  it('GET /api/v1/dashboard should allow authenticated requests and return structured summary', () => {
    return request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)
      .expect((res) => {
        if (!res.body.success || !res.body.data) {
          throw new Error(`Expected success and data in body, got: ${JSON.stringify(res.body)}`);
        }
        const data = res.body.data;
        if (!data.system || !data.authAndUsers || !data.moduleReadiness || !data.clinicalOverview) {
          throw new Error(`Missing expected fields in dashboard response: ${JSON.stringify(data)}`);
        }
        if (data.clinicalOverview.todayAppointments.count !== 0) {
          throw new Error('Expected zero appointments in empty state');
        }
      });
  });
});
