# Hospital Management System — Backend Architecture Specification

**SOURCE-OF-TRUTH OWNER**: `docs/BACKEND.md` (BACKEND ENGINEERING)  
**Classification**: Authoritative  
**Application**: `apps/server/`  
**Framework**: NestJS (TypeScript)  
**Database**: MongoDB Atlas (via Mongoose ODM)  
**Cache & Queue**: Redis & BullMQ  
**Status**: Authoritative Backend Specification  

---

## 1. Architectural Philosophy: The Single Canonical Backend

The entire HMS SaaS platform and patient ecosystem is powered by a **single canonical backend application**: `apps/server/`.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                            │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐   │
│   │  apps/hms-client   │ │  apps/patient-app  │ │  apps/super-admin  │   │
│   │  (Hospital/Doctor) │ │  (Patient Platform)│ │  (Platform Owner)  │   │
│   └─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘   │
└─────────────┼──────────────────────┼──────────────────────┼──────────────┘
              │                      │                      │
              ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   CANONICAL BACKEND API (apps/server/)                   │
│   REST API Gateway (/api/v1)                                             │
│   ├── Auth, RBAC & Tenant Resolution Middleware                          │
│   ├── Modular Monolith Domain Services                                   │
│   ├── Redis Caching, Rate Limiting & BullMQ Background Queues            │
│   └── Mongoose Tenant-Scoped Data Access Layer                           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ TLS 1.3 / Authenticated Driver
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           STORAGE & DATA TIER                            │
│     MongoDB Atlas (System of Record)  │  Managed Redis (Cache & Queue)   │
└──────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Strict Backend Invariants**:
> - There are NEVER separate backend services for each frontend. All three frontends communicate with `apps/server/`.
> - The backend is architected as a clean **Modular Monolith**. It provides high development velocity and unified transactions without premature microservice distributed-systems complexity.
> - Frontends, mobile clients, and AI agents have ZERO direct database connections.

---

## 2. Request Lifecycle & Execution Pipeline

Every inbound API request passes through a strictly ordered pipeline before accessing or mutating data:

```text
HTTP Request
     │
     ▼
[1] Global Middleware (Helmet, CORS, Request ID, Rate Limiter)
     │
     ▼
[2] Authentication Guard (JwtAuthGuard verifies JWT signature & expiration)
     │
     ▼
[3] Tenant Resolution (req.user.tenantId extracted and verified)
     │
     ▼
[4] Authorization Guards (RolesGuard & PermissionsGuard enforce RBAC)
     │
     ▼
[5] Input Validation Pipe (ValidationPipe with class-validator & DTOs)
     │
     ▼
[6] Controller Handler (Routes endpoint, extracts DTO and verified user context)
     │
     ▼
[7] Domain Service Layer (Executes business rules; enforces { tenantId } scoping)
     │
     ▼
[8] Mongoose Data Layer (MongoDB Atlas queries scoped to authenticated tenant)
     │
     ▼
[9] Standardized Response / Exception Filter (Formats uniform JSON envelope)
```

---

## 3. Modular Monolith Architecture

The backend codebase is structured into cohesive NestJS domain modules located in `apps/server/src/`:

```text
apps/server/src/
├── auth/                 # JWT issuing, bcryptjs hashing, account lockouts
├── users/                # User accounts, profiles, credential updates
├── roles/                # Tenant-scoped RBAC roles & permissions
├── hospitals/            # Hospital facilities, branches, configuration
├── departments/          # Clinical & administrative department catalogs
├── doctors/              # Doctor profiles, specialties, OPD shift schedules
├── staff/                # Hospital personnel & duty rosters
├── patients/             # Master patient index (UHID), demographics, allergies
├── appointments/         # Outpatient bookings, slots, check-in flows
├── queue/                # Real-time OPD queue orchestration, token issuance
├── clinical/             # Encounters, clinical notes, vitals, diagnoses
├── prescriptions/        # Electronic prescriptions (Rx), dosage regimens
├── medicines/            # Medicine Master formulary & bulk CSV import
├── medicine-batches/     # Lot tracking, expiry management, batch pricing
├── inventory/            # Surgical supplies, consumables, equipment tracking
├── procurement/          # Suppliers, Purchase Orders, Goods Receipt Notes
├── laboratory/           # Lab tests catalog, orders, sample tracking, reports
├── billing/              # Consolidated invoices, tariffs, adjustments, taxes
├── payments/             # Financial settlement receipts, payment gateway webhooks
├── notifications/        # Queue alerts, SMS/WhatsApp dispatch (BullMQ)
├── documents/            # S3/R2 presigned URL generation, file metadata
├── audit/                # Immutable security & operational audit trail
├── saas/                 # Tenant onboarding, subscription plans, usage limits
├── database/             # Mongoose connection & tenant plugin configuration
└── health/               # Readiness & liveness health check endpoints
```

---

## 4. Tenant Isolation at the Data Access Layer

### 4.1. The Zero-Trust Tenancy Invariant
```typescript
// Standard Service Method Pattern
async findPatientById(tenantId: string, patientId: string): Promise<PatientDocument> {
  const patient = await this.patientModel.findOne({
    _id: patientId,
    tenantId: new Types.ObjectId(tenantId), // MANDATORY TENANT SCOPING
  }).exec();

  if (!patient) {
    // Uniform 404 masks existence of cross-tenant entities
    throw new NotFoundException(`Patient with ID "${patientId}" not found`);
  }

  return patient;
}
```

### 4.2. Database Query Rules
1. **Never perform an unscoped query** on a tenant-owned collection.
2. **Never read `tenantId` from `req.body` or `req.query`**. Always inject `req.user.tenantId`.
3. **IDOR Defense**: If a query matching `_id` fails because `tenantId` does not match, return `404 Not Found` (never `403 Forbidden`). This prevents malicious attackers from enumerating valid IDs belonging to other hospitals.

---

## 5. Redis Architecture & BullMQ Queues

Redis provides ultra-fast in-memory state and decoupled background job processing.

### 5.1. Tenant-Aware Redis Key Namespacing
To prevent multi-tenant cache collision, all keys must use tenant prefixes:
```text
tenant:{tenantId}:{module}:{key}
```
Examples:
- `tenant:60f1b2c3d4e5f6a7b8c9d0e1:queue:active_token:doctor_12`
- `tenant:60f1b2c3d4e5f6a7b8c9d0e1:cache:doctor_schedules:2026-09-12`
- `tenant:60f1b2c3d4e5f6a7b8c9d0e1:throttler:ip_192.168.1.1`

### 5.2. Background Job Queues (BullMQ)
Long-running and asynchronous tasks are offloaded to BullMQ worker queues:
1. **`notifications-queue`**: Dispatches SMS, WhatsApp, and push notifications for approaching queue turns and appointment confirmations.
2. **`reports-queue`**: Generates complex multi-month financial and census reports as asynchronous downloadable PDFs/CSVs.
3. **`audit-queue`**: Batches non-blocking audit records to minimize API latency.
4. **`bulk-import-queue`**: Validates, deduplicates, and ingests large pharmaceutical and inventory catalogs in chunked transactions.
5. **`analytics-rollup-queue`**: Executes nightly aggregation crons to generate `daily_operational_census` and `daily_revenue_summaries`.
6. **`ai-tasks-queue` (Phase 2)**: Schedules asynchronous LLM summarization of clinical records.

### 5.3. Real-Time Event Architecture & Redis Pub/Sub
- Whenever a queue entry changes state (`WAITING` -> `CALLED` -> `IN_CONSULTATION` -> `COMPLETED`), `QueueService` publishes a tenant-scoped event: `tenant:{tenantId}:events:queue`.
- The WebSocket / SSE gateway consumes these events and pushes live updates to Doctor Workstations, Reception Token Boards, and Patient Mobile Apps without requiring database polling.

### 5.4. Graceful Degradation & Redis Outage Invariant
> [!IMPORTANT]
> **Zero Data Loss Invariant**:
> Redis is strictly transient. If Redis crashes or suffers a network partition:
> 1. Permanent patient registration, appointment scheduling, clinical encounters, and billing continue uninterrupted against MongoDB Atlas.
> 2. Primary concurrency safety relies on MongoDB document-level atomic writes (`findOneAndUpdate`), which operate independently of Redis.
> 3. Real-time updates fall back to client interval heartbeats until Redis reconnects.
> 4. Redis outage NEVER corrupts or halts healthcare delivery.

---

## 6. Enterprise OPD Queue Engine Architecture

The queue engine (`apps/server/src/queue/`) implements a state machine ensuring atomic patient reservation:

```text
POST /api/v1/queue/check-in ──► Allocates sequential token, sets status = WAITING
POST /api/v1/queue/call-next ──► Atomic findOneAndUpdate claims top priority WAITING patient ──► status = CALLED
PATCH /api/v1/queue/entries/:id/start ──► Validates transition ──► status = IN_CONSULTATION
PATCH /api/v1/queue/entries/:id/complete ──► Validates transition, increments completed counter ──► status = COMPLETED
PATCH /api/v1/queue/entries/:id/skip ──► Patient absent ──► status = SKIPPED
```

- **Race Condition Prevention**: `callNextPatient` uses MongoDB atomic sort and update (`{ priorityWeight: -1, tokenNumber: 1 }`). If multiple browser tabs or assisting staff click "CALL NEXT" concurrently, MongoDB serializes the writes — exactly one request claims the patient, while subsequent requests claim the next waiting patient or receive `null`.

---

## 7. Medicine Formulary & Billing Integration Flow

The backend guarantees single-source-of-truth inventory pricing across clinical, pharmacy, and billing workflows:

1. **Medicine Master as Authoritative Catalog**:
   - `medicines` collection holds brand names, generic formulations, dosage forms, and HSN codes.
   - Bulk import endpoint (`POST /api/v1/medicines/bulk-import`) parses standard CSV/Excel sheets with validation and duplicate prevention.
2. **Batch-Driven Dispensing & Pricing**:
   - Prescription items reference the `medicineId`.
   - Pharmacy dispensing allocates from `medicine_batches` based on FEFO (First-Expiry, First-Out).
   - Invoicing imports the verified batch `salePrice` and calculates GST.
   - The billing module maintains ZERO duplicate medication price catalogs.

---

## 7. Error Handling & Standardized Response Envelope

All API endpoints return a uniform response envelope:

### Success Response Envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

### Error Response Envelope:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested appointment record does not exist",
    "timestamp": "2026-09-12T15:45:00.000Z",
    "requestId": "req-98f12a-3341"
  }
}
```
In production environments, detailed stack traces and internal MongoDB driver error messages are suppressed to prevent technical footprint reconnaissance.
