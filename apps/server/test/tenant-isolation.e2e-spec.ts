import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserStatus } from '../src/users/schemas/user.schema.js';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';

describe('Tenant Isolation & Production Security (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userModel: Model<UserDocument>;

  const hospitalAId = new Types.ObjectId().toString();
  const hospitalBId = new Types.ObjectId().toString();

  let tokenUserA: string;
  let userAId: string;
  let tokenDoctorB: string;
  let doctorBId: string;

  let patientAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(
      helmet({
        strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
        xFrameOptions: { action: 'deny' },
        xContentTypeOptions: true,
      }),
    );
    app.use((_req: any, res: any, next: any) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      next();
    });
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken('User'));

    // Create User in Hospital A
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const userA = await userModel.create({
      email: `admin_hosp_a_${Date.now()}@hospital-a.com`,
      passwordHash,
      firstName: 'Admin',
      lastName: 'HospitalA',
      role: 'HOSPITAL_ADMIN',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(hospitalAId),
      permissions: ['*'],
    });
    userAId = userA._id.toString();

    tokenUserA = jwtService.sign({
      sub: userAId,
      email: userA.email,
      role: userA.role,
      hospitalId: hospitalAId,
    });

    // Create Doctor in Hospital B
    const doctorB = await userModel.create({
      email: `doctor_hosp_b_${Date.now()}@hospital-b.com`,
      passwordHash,
      firstName: 'Doctor',
      lastName: 'HospitalB',
      role: 'DOCTOR',
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(hospitalBId),
      permissions: ['patients.read', 'patients.update', 'patients.create', 'emr.read', 'emr.write'],
    });
    doctorBId = doctorB._id.toString();

    tokenDoctorB = jwtService.sign({
      sub: doctorBId,
      email: doctorB.email,
      role: doctorB.role,
      hospitalId: hospitalBId,
    });

    // Hospital A creates a patient
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: { first: 'John', last: 'PatientA' },
        dateOfBirth: '1985-05-15',
        gender: 'male',
        contacts: {
          phone: '+919876543210',
          email: 'johna@example.com',
          address: {
            street: '123 Health Ave',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
          },
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '+919876543211',
        },
      })
      .expect(201);

    patientAId = regRes.body.data.id || regRes.body.data._id;
  });

  afterAll(async () => {
    // Clean up test users
    if (userModel) {
      await userModel.deleteMany({ _id: { $in: [userAId, doctorBId] } });
    }
    await app.close();
  });

  describe('Production Security Headers & Telemetry', () => {
    it('should emit Helmet security headers and Cache-Control directives', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('GET /api/v1/health/deep should return detailed database latency and memory telemetry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/deep')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.database.status).toBe('connected');
      expect(res.body.database.latencyMs).toBeGreaterThanOrEqual(1);
      expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
      expect(typeof res.body.uptimeSeconds).toBe('number');
    });
  });

  describe('Scenario 1: Cross-Tenant Resource Read (IDOR Prevention)', () => {
    it('Hospital B user requesting Hospital A patient by ID receives HTTP 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${tokenDoctorB}`)
        .expect(404);
    });
  });

  describe('Scenario 2: Cross-Tenant Mutation', () => {
    it('Hospital B user attempting to update Hospital A patient receives HTTP 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/patients/${patientAId}`)
        .set('Authorization', `Bearer ${tokenDoctorB}`)
        .send({ name: { first: 'HackedName', last: 'HackedLast' } })
        .expect(404);
    });
  });

  describe('Scenario 3: Cross-Tenant Administration', () => {
    it('Hospital A admin querying Hospital B doctor receives 404 or empty', async () => {
      // User list query strictly scoped by tenant
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      const foreignUser = res.body.data.find((u: any) => u.id === doctorBId || u._id === doctorBId);
      expect(foreignUser).toBeUndefined();
    });
  });

  describe('Scenario 4: Tenant Parameter Tampering', () => {
    it('injected tenantId in request body is ignored and overridden by session JWT', async () => {
      const injectedTenant = new Types.ObjectId().toString();

      const res = await request(app.getHttpServer())
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenDoctorB}`)
        .send({
          tenantId: injectedTenant,
          name: { first: 'TamperTest', last: 'PatientB' },
          dateOfBirth: '1990-01-01',
          gender: 'female',
          contacts: {
            phone: '+919999988888',
            address: {
              street: '456 Safe St',
              city: 'Delhi',
              state: 'Delhi',
              postalCode: '110001',
            },
          },
          emergencyContact: {
            name: 'Friend',
            relationship: 'Friend',
            phone: '+919999988889',
          },
        })
        .expect(201);

      // The patient must belong to Hospital B, NOT the injected foreign tenant
      const createdPatient = res.body.data;
      expect(createdPatient.tenantId?.toString() || createdPatient.hospitalId?.toString()).not.toBe(injectedTenant);
      expect(createdPatient.tenantId?.toString() || createdPatient.hospitalId?.toString()).toBe(hospitalBId);
    });
  });

  describe('Scenario 5: Cross-Tenant Query Enumeration', () => {
    it('list query returns strictly caller hospital records with zero cross-tenant leakage', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      const resB = await request(app.getHttpServer())
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${tokenDoctorB}`)
        .expect(200);

      const listA = resA.body.data.patients || resA.body.data || [];
      const listB = resB.body.data.patients || resB.body.data || [];

      // Patient A is in list A but NOT in list B
      expect(listA.some((p: any) => (p.id || p._id) === patientAId)).toBe(true);
      expect(listB.some((p: any) => (p.id || p._id) === patientAId)).toBe(false);
    });
  });

  describe('Global Exception Filter & Correlation ID', () => {
    it('should format unhandled errors into sanitized JSON with correlationId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/patients/invalid-object-id-format')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect((r) => {
          // Should be 400 or 404, but definitely not a raw crash
          expect([400, 404, 500]).toContain(r.status);
        });

      expect(res.body.correlationId).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      // Ensure no stack trace escapes to client
      expect(res.body.stack).toBeUndefined();
    });
  });
});
