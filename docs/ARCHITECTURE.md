# HMS MedCore — System Architecture Specification

**SOURCE-OF-TRUTH OWNER**: `docs/ARCHITECTURE.md` (SYSTEM ARCHITECTURE)  
**Classification**: Authoritative  
**Version:** 3.0.0  
**Pattern:** Modular Monolith API with Distributed Client Surfaces  
**System of Record:** MongoDB Atlas  
**In-Memory Cache & Queue:** Redis  

---

## 1. Architectural Topology

HMS MedCore is structured as a **Multi-Tenant Software-as-a-Service Platform** composed of four distinct application surfaces communicating with a unified backend:

```text
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│     Hospital HMS Client   │  │   Patient Mobile Portal   │  │     SaaS Super Admin      │
│      (apps/hms-client)    │  │    (apps/patient-app)     │  │    (apps/super-admin)     │
│   Next.js 16 (App Router) │  │  Next.js 16 (Mobile-First)│  │  Next.js 16 (Dark Theme)  │
└─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
              │                              │                              │
              │ (HTTPS / JSON REST API)      │                              │
              └──────────────────────────────┼──────────────────────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │     Cloudflare WAF / CDN    │
                              │    (DDoS, SSL Termination)  │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │   Canonical Shared Backend  │
                              │        (apps/server)        │
                              │   NestJS Modular Monolith   │
                              │    Node 22 / TypeScript     │
                              └───────┬─────────────┬───────┘
                                      │             │
                    ┌─────────────────┘             └─────────────────┐
                    ▼                                                 ▼
     ┌──────────────────────────────┐                  ┌──────────────────────────────┐
     │        MongoDB Atlas         │                  │         Managed Redis        │
     │   Cloud System of Record     │                  │  Cache, Rate-Limits, Queues  │
     │(Multi-Tenant Scoped Cluster) │                  │  (Tenant-Scoped Key Prefix)  │
     └──────────────────────────────┘                  └──────────────────────────────┘
```

---

## 2. The Four Application Surfaces

### 1. `apps/server` (Shared Canonical Backend)
- **Role:** The solitary backend and system-of-record gatekeeper for all frontends.
- **Framework:** NestJS 12, Express platform, Node 22, TypeScript 5.8.
- **Pattern:** Modular Monolith organized by bounded domain contexts.
- **Key Modules:**
  - `AuthModule`: Multi-tenant credentials verification, password hashing (`bcryptjs` cost 12), token lifecycle, account lockout.
  - `TenantModule`: Tenant provisioning, organization metadata, subscription entitlement checks.
  - `RolesModule`: Role registry, granular permission catalogs, RBAC guards.
  - `PatientsModule`: Patient demographics, sequence generator (`counters`), duplicate detection engine.
  - `AppointmentsModule`: Doctor schedule rosters, slot calculation, sequential token generation, OPD queue board, check-in, cancellation.
  - `EmrModule`: Clinical encounters, chief complaints, vitals, ICD-coded diagnoses, e-prescriptions.
  - `IpdModule`: Bed allocation, ward transfers, inpatient tracking, nursing stations.
  - `OrganizationModule`: Clinical & operational departments (`departments`), sub-teams (`teams`), and 8-step `HospitalOnboarding` state machine.
  - `WorkforceModule`: Staff directory (`employees`), shift rosters (`workforce_schedules`), daily attendance with punctuality checks (`attendance_records`), and multi-day leave requests (`leave_requests`).
  - `WorkspacesModule`: Catalog of 9 standard operational workspaces and dynamic workspace resolution engine (`resolveUserWorkspaces`).
  - `InventoryMigrationModule`: 4-stage bulk inventory migration pipeline (Upload, Mapping, Validation, Chunked Execution) for 10k-50k legacy records.
  - `CommunicationModule`: Multi-context clinical tasks (`hospital_tasks`), threaded comments, and enterprise staff notifications (`hospital_notifications`).
  - `QueueModule`: High-concurrency OPD waitlist engine (`queue_entries`), atomic token calling, and real-time waiting line telemetry.
  - `LaboratoryModule`: Diagnostic test catalog, orders, sample accessioning, result verification.
  - `PharmacyModule`: Medicine Master catalog, batch management, FEFO dispensing.
  - `InventoryModule`: Consumable catalog, suppliers, purchase orders, stock ledger.
  - `BillingModule`: Tariff masters, itemized invoices, payment recording, credit notes.
  - `AuditModule`: Centralized immutable security and clinical audit logger (`audit_logs`).
  - `AiGatewayModule`: Phase 2 abstracted AI Gateway, tool registry, and policy engine.

### 2. `apps/hms-client` (Hospital & Clinical Operations)
- **Role:** Comprehensive management interface for hospital staff.
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Key Roles Served:**
  - Hospital Administrators (Settings, Staff, Subscriptions, Billing, Audit).
  - Doctors & Specialists (Consultation Workspace, OPD Queue, EMR, Prescriptions, Lab Orders).
  - Receptionists & Nursing Staff (Patient Intake, OPD Check-In, Ward Admissions, Vitals).
  - Pharmacists & Lab Technicians (Dispensing, Batch Tracking, Test Processing).

### 3. `apps/patient-app` (Patient Healthcare Portal)
- **Role:** Standalone consumer healthcare application designed mobile-first.
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Key Features:**
  - Hospital Discovery & Search (facilities, specialties, accreditation, directions).
  - Doctor Discovery (profiles, specialties, consultation hours, fees).
  - Appointment Booking Wizard with live slot picker.
  - Real-Time OPD Queue Tracking (Assigned token, serving token, patients ahead, estimated wait).
  - Personal Health Records (Prescriptions, lab reports, discharge summaries, bills).
  - Strict privacy: Patient records are never publicly searchable.

### 4. `apps/super-admin` (SaaS Platform Owner Console)
- **Role:** Sovereign central command center for the SaaS platform owner, operations engineers, and commercial account managers.
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, High-contrast Dark Theme.
- **Key Modules & Architecture:**
  - **Tenant Provisioning Engine:** Onboard new hospital organizations (`tenants`), generate slugs, configure domain routing, and execute automated initial facility and database seeding.
  - **Commercial Plan Catalog (`plans`):** Maintain plan tiers (`FREE_TRIAL`, `STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`), configure quotas (doctors, staff, beds, cloud storage), and control module entitlement flags.
  - **Subscription Lifecycle Engine (`subscriptions`):** Manage billing cycles, trial expirations, payment renewal tracking, grace periods, and suspension state machines.
  - **Platform-Wide Operations Telemetry:** Aggregated cross-tenant health dashboards: active tenant count, daily OPD appointment throughput, database cluster latency, connection pool utilization, and memory footprint.
  - **Platform Security & Audit Center:** Immutable logging of all platform administrative interventions (`TENANT_SUSPEND`, `PLAN_UPDATE`, `QUOTA_OVERRIDE`, etc.).
  - **Emergency Maintenance & Global Broadcasts:** Platform-wide announcements and maintenance mode kill switches.
  - **The Strict Zero-PHI Boundary:** The console has zero clinical endpoints, zero patient data visibility, and zero medical chart access. Platform admins manage hospital organizations, not patients.

---

## 3. Dual-Plane Architecture & Request Pipeline

The architecture strictly segregates the system into two operational planes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                 PLATFORM CONTROL PLANE (apps/super-admin)              │
│       Tenant Management • Plan Catalog • Subscriptions • Telemetry     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Platform APIs: /api/v1/super-admin/*
                                    │ (Guarded by: @Roles(SUPER_ADMIN) + @RequirePermissions('platform.*'))
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CANONICAL BACKEND (apps/server)                      │
│                                                                        │
│   ┌────────────────────────────────┐  ┌────────────────────────────┐   │
│   │ Platform Control Services      │  │ Tenant Clinical Services   │   │
│   │ (PlatformContext: tenantId=null│  │ (TenantContext:            │   │
│   │  or managing specific tenant)  │  │  tenantId=user.tenantId)   │   │
│   └────────────────────────────────┘  └────────────────────────────┘   │
│                   │                                 │                  │
│                   │                                 ▼                  │
│                   │                   ┌────────────────────────────┐   │
│                   │                   │ Zero-PHI Security Barrier  │   │
│                   │                   │ (SUPER_ADMIN rejected with │   │
│                   │                   │  403 on clinical routes)   │   │
│                   │                   └────────────────────────────┘   │
└───────────────────┼─────────────────────────────────┼──────────────────┘
                    │                                 │
                    ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TENANT DATA PLANE (apps/hms-client)                  │
│      Patients • OPD Queue • Consultations • IPD • Pharmacy • Billing   │
└────────────────────────────────────────────────────────────────────────┘
```

### Request Pipeline & Execution Context:

Every incoming HTTP request traverses a strict, sequential pipeline:

```text
1. Network Ingestion (Cloudflare HTTPS / TLS Termination)
      ↓
2. Global Middlewares (Helmet CSP/HSTS, CorrelationIdMiddleware, Cache-Control, CORS)
      ↓
3. Authentication Guard (JwtAuthGuard)
   - Validates Bearer JWT signature, issuer, expiration
   - Decodes claims into req.user: { id, email, role, tenantId, surface }
      ↓
4. Execution Context & Tenant Resolution
   - If Surface == 'SUPER_ADMIN':
     - Binds PlatformContext (global scope, no tenant constraint for platform entities).
     - SurfaceGuard strictly blocks access to clinical endpoints (/patients, /emr, /ipd, etc.) -> HTTP 403 Forbidden.
   - If Surface == 'HOSPITAL' | 'PATIENT':
     - Extracts tenantId exclusively from verified req.user.tenantId.
     - Binds TenantContext (AsyncLocalStorage) scoped strictly to that tenantId.
     - Rejects unauthenticated or unscoped tenant requests -> HTTP 401/403.
      ↓
5. Authorization Guards (@RequirePermissions(), @Roles())
   - Evaluates required permissions against user's verified privileges
      ↓
6. Input Validation (ValidationPipe with class-validator & class-transformer)
   - Strips unwhitelisted properties, enforces strict DTO types
      ↓
7. Domain Service Execution
   - Control Plane: Operates on platform collections (tenants, plans, subscriptions, platform telemetry).
   - Data Plane: Queries executed against MongoDB with mandatory filter: { tenantId: user.tenantId, ... }
      ↓
8. Security Audit Recording (AuditService)
   - Platform actions logged with platform metadata; clinical actions logged with tenantId.
      ↓
9. Response Serialization (Uniform ApiResponse envelope with correlationId)
```

---

## 4. Database Architecture (MongoDB Atlas)

- **System of Record:** MongoDB Atlas Cloud Database Cluster (replica set with automatic failover).
- **Driver:** Mongoose 9 ODM with TypeScript typing.
- **Collection Classification:**
  1. **Platform-Owned Collections:** `tenants`, `subscriptions`, `plans`, `platform_audit_logs`. Managed exclusively by Platform Super Admins.
  2. **Tenant-Owned Collections:** `users`, `roles`, `patients`, `appointments`, `doctor_schedules`, `encounters`, `prescriptions`, `medicines`, `medicine_batches`, `invoices`, `admissions`, `lab_orders`, `audit_logs`. Every document contains an indexed `tenantId: ObjectId`.
  3. **System Sequence Collections:** `counters` for atomic sequential number generation (`UHID-YYYY-NNNNNN`, daily OPD tokens, invoice numbers).
- **Index Strategy:** Compound multi-tenant indexes (e.g., `{ tenantId: 1, uhid: 1 }` unique, `{ tenantId: 1, scheduledAt: 1, doctorId: 1 }`).

---

## 5. Caching & Queue Architecture (Redis)

Redis is deployed as an in-memory acceleration and background orchestration layer:

```text
┌────────────────────────────────────────────────────────┐
│                      Redis Tier                        │
├──────────────────────────┬─────────────────────────────┤
│ Cache Acceleration       │ Session & Rate Limiting     │
│ - Doctor Schedules       │ - IP Rate Limits            │
│ - Hospital Catalog       │ - Failed Login Lockout      │
│ - Medicine Master        │ - Temporary OTP State       │
├──────────────────────────┼─────────────────────────────┤
│ Queue Orchestration      │ Worker Background State     │
│ - OPD Queue Proximity    │ - Export Report Generation  │
│ - Notification Dispatch  │ - Phase 2 AI Jobs           │
└──────────────────────────┴─────────────────────────────┘
```

- **Tenant-Aware Key Pattern:** All Redis keys are strictly namespaced:
  - `tenant:{tenantId}:doctor:{doctorId}:schedule:{date}`
  - `tenant:{tenantId}:opd:queue:{doctorId}:{date}`
  - `tenant:{tenantId}:rate_limit:{ip}`
- **Source of Truth Invariant:** MongoDB Atlas is the permanent source of truth. Redis data is transient.

---

## 6. Deployment & Infrastructure Target

```text
Client Surfaces (Next.js)      Backend Platform (NestJS)      Data Persistence
─────────────────────────      ─────────────────────────      ────────────────
apps/hms-client  ──► Vercel    apps/server ──► Docker/Render  MongoDB Atlas (M10+)
apps/patient-app ──► Vercel    Workers     ──► Docker/Render  Upstash / Redis Cloud
apps/super-admin ──► Vercel
```

- **Frontends:** Deployed on Vercel with automatic edge routing and Next.js Turbopack builds.
- **Backend API:** Dockerized container deployed on Render with health checks on `/api/v1/health`.
- **DNS & Security:** Cloudflare provides DNS management, SSL termination, DDoS mitigation, and WAF rules.
- **Continuous Integration:** GitHub Actions runs automated lint, typecheck, unit tests, and production builds on every pull request.

---

## 7. Enterprise Patient Journey & Hospital Operational Workflow

A large hospital (designed for 10,000–20,000+ daily visits) requires clear decoupling between scheduled appointments, clinical encounters, live queue entries, and financial billing statements.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   END-TO-END PATIENT LIFECYCLE                                         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  1. PATIENT REGISTRATION / MPI LOOKUP
     ├── Deterministic Search (UHID, Phone)
     └── Demographics, Emergency Contacts, Allergy Ledger
        ↓
  2. INTAKE ROUTING
     ├── Advance Online/Portal Booking ──► Appointment (SCHEDULED) ──► Check-In
     └── Walk-In / Emergency Arrival   ──► Direct Check-In
        ↓
  3. QUEUE INTAKE & TRIAGE
     ├── Nurse Triage: Vitals, Acuity Level (NORMAL, URGENT, EMERGENCY)
     ├── Queue Allocation: Doctor/Department Queue Session
     └── Sequential Token Issuance (e.g. C-021) ──► QueueEntry (WAITING)
        ↓
  4. CLINICAL ENCOUNTER (Doctor Consultation Cockpit)
     ├── Clinician Dequeue: Atomic CALL NEXT ──► QueueEntry (CALLED)
     ├── Patient Enters Chamber ──► QueueEntry (IN_CONSULTATION)
     ├── Encounter Initialization: Encounter (DRAFT / IN_PROGRESS)
     ├── Clinical Charting: Chief complaints, ICD-10 diagnoses, clinical notes
     └── Clinical Orders Pipeline:
         ├── e-Prescription (Rx) ──► Pharmacy Queue (FEFO Batch Allocation)
         ├── Laboratory Requisition ──► LIS Specimen Worklist (Accessioning)
         └── Inpatient Admission Order (if required) ──► IPD Bed Matrix
        ↓
  5. CONSULTATION SEALING
     ├── Clinician Signs & Finalizes Encounter ──► Encounter (FINALIZED, Immutable)
     └── Queue Status Transition ──► QueueEntry (COMPLETED)
        ↓
  6. FINANCIAL SETTLEMENT & PHARMACY DISPENSING
     ├── Pharmacy Counter: FEFO batch dispense & barcode verification
     ├── Central Billing: Itemized Invoice (Consultation + Pharmacy + Lab)
     └── Cashier Settlement: UPI / Cash / Card / Insurance TPA ──► Payment Receipt
        ↓
  7. ARCHIVAL & HISTORICAL MEDICAL RECORD
     ├── Longitudinal EMR timeline aggregation
     └── Nightly Materialized Rollup ──► Daily Census & Revenue Summaries
```

---

## 8. Decoupled Appointment vs Encounter vs OPD Queue Workflow

```text
┌─────────────────────────┐     1:1 or Walk-In      ┌─────────────────────────┐
│       APPOINTMENT       │ ──────────────────────► │        ENCOUNTER        │
│ (Calendar & Scheduling) │                         │  (Clinical Examination) │
└───────────┬─────────────┘                         └────────────┬────────────┘
            │ Generates                                          │
            ▼                                                    ▼
┌─────────────────────────┐       Concurrency-Safe       ┌─────────────────────────┐
│       QUEUE ENTRY       │ ───────────────────────────► │   CONSULTATION CHART    │
│ (Live Operational Flow) │    Atomic findOneAndUpdate   │ (Prescriptions & Orders)│
└─────────────────────────┘                              └─────────────────────────┘
```

1. **Appointment**: Represents a calendar reservation or future time slot. Does NOT hold clinical documentation or diagnostic findings.
2. **QueueEntry**: Represents a physical patient present at the clinic awaiting clinical service. Governed by a strict state machine (`WAITING` -> `CALLED` -> `IN_CONSULTATION` -> `COMPLETED`).
3. **Encounter**: Represents the official clinical interaction between patient and clinician. Supports both advance-scheduled visits and unscheduled walk-in emergencies.
4. **Concurrency Guarantee**: Two simultaneous "CALL NEXT PATIENT" requests cannot claim the same patient. The backend executes atomic document-level updates (`findOneAndUpdate`) on `QueueEntry` matching `{ status: WAITING }` sorted by priority weight, eliminating race conditions.

---

## 9. Real-Time Event Architecture for Queues & Command Centers

To eliminate client polling across 10,000–20,000 patients, all queue state transitions emit domain events:

- `queue.entry_checked_in`: Token assigned; updates receptionist dashboard and waiting census.
- `queue.entry_called`: Broadcasts to Doctor Cockpit, Reception Waiting Room Display, and Patient Mobile App.
- `queue.consultation_started`: Updates departmental room occupancy status.
- `queue.consultation_completed`: Triggers automated billing item aggregation and frees clinician chamber.
- `queue.entry_skipped`: Re-queues or archives absent patient without stalling OPD throughput.

---

## 10. Four-Stage Enterprise Scalability Roadmap

The platform architecture is designed to scale across four distinct growth tiers without requiring high-risk architectural rewrites:

```text
STAGE 1: MODULAR MONOLITH BASELINE (Current Phase)
├── NestJS Modular Monolith API
├── MongoDB Atlas Primary Cluster (M10/M20) with strict compound indexes
├── Basic Redis Rate Limiting & Session Invalidation
├── Server-side cursor and offset pagination (capped at 100)
└── Target: 500 – 2,500 visits/day

STAGE 2: READ-OPTIMIZATION & ASYNC WORKERS
├── Pre-computed Materialized Read Models (daily_operational_census, daily_revenue_summaries)
├── Redis Distributed Caching for static catalogs (medicines, tariffs, doctor schedules)
├── BullMQ Workers for async workloads (bulk imports, PDF generation, SMS/WhatsApp notifications)
└── Target: 2,500 – 7,500 visits/day

STAGE 3: HORIZONTAL STATELESS SCALING & READ-REPLICAS
├── Multiple stateless NestJS server instances behind Cloudflare Load Balancer
├── MongoDB Atlas Replica Sets with Secondary Read Preference for heavy reports (secondaryPreferred)
├── Redis Pub/Sub / WebSocket Cluster for real-time OPD token boards
└── Target: 7,500 – 15,000 visits/day

STAGE 4: ENTERPRISE DATA PARTITIONING & SHARDING
├── Dedicated worker clusters for batch imports and heavy background analytics
├── MongoDB Atlas Zone-Based Sharding (partitioned by tenantId or geographic region)
├── Targeted service extraction ONLY where specific domain bottlenecks are proven by metrics
└── Target: 15,000 – 25,000+ visits/day
```

---

## 11. Production-Readiness Framework: Architectural Preparedness vs Validation

> [!IMPORTANT]
> **Definitive Architectural Statement**:
> The HMS platform is currently **ARCHITECTURALLY PREPARED** to evolve towards enterprise scale (10,000–20,000+ patient visits/day) through bounded domain decoupling, compound index indexing, concurrency-safe atomic operations, and materialized read models.
> 
> However, the system is **NOT CLAIMED TO BE PRODUCTION-VALIDATED** at 20,000 visits/day until formal load testing (Locust/k6 synthetic test suites), network latency profiling, memory leak audits, and stress testing are executed against dedicated cloud staging infrastructure.

---

## 12. Enterprise Hospital Foundation Subsystems

### 12.1. Workforce & Institutional HR Architecture (`apps/server/src/workforce/`)
- **Personnel Decoupling**: Separates institutional `Employee` records from digital `User` credentials. Hospital staff (interns, nurses, orderlies) are registered immediately with sequential IDs (`EMP-YYYY-NNNN`) without credential bloat.
- **Roster & Overnight Shift Engine**: Calculates `isOvernight` flag automatically when shifts cross midnight (`22:00 -> 06:00`), ensuring continuous operational coverage across hospital wards.
- **Attendance & Punctuality Ledger**: Automatically flags check-ins exceeding 15 minutes after shift start as `LATE`, tracks early departures, and enforces auditable two-person correction approvals.
- **Leave Synchronization**: Multi-day leave approvals automatically sync with the daily attendance ledger, marking dates in the approval range as `ON_LEAVE`.

### 12.2. Organization & Facility Onboarding (`apps/server/src/organization/`)
- **Clinical & Operational Hierarchy**: Models `Department` and `Team` hierarchies with automatic tenant-scoped seeding of 12 standard healthcare services upon hospital provisioning.
- **8-Step Onboarding State Machine**: Tracks facility configuration from initial hospital profile setup through workforce registration, bed mapping, tariff imports, and pharmacy onboarding (`hospital_onboardings` collection).

### 12.3. Dynamic Workspace Resolution Engine (`apps/server/src/workspaces/`)
- **Standard Workspace Catalog**: 9 standardized workspace templates (`HOSPITAL_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `ACCOUNTANT`, `INVENTORY_MANAGER`, `DEPARTMENT_MANAGER`).
- **Dynamic Resolution (`WorkspacesService.resolveUserWorkspaces`)**: Evaluates user roles, staff types, and department assignments to serve customized navigation trees, actions, and widgets without client-side role heuristics.

### 12.4. Asynchronous Bulk Inventory Migration Pipeline (`apps/server/src/inventory-migration/`)
- **4-Stage Ingestion Pipeline**: Ingests up to 50,000 legacy medicine/inventory rows via CSV with RFC 4180 parsing, intelligent column alias matching, pre-execution error validation, and chunked database execution.
- **Ledger Invariant Guarantee**: Creates `Medicine` master records, `MedicineBatch` tracking, and writes immutable `StockMovement` records of type `OPENING_BALANCE` ensuring accounting reconciliation.

### 12.5. Clinical Tasks & Enterprise Staff Notifications (`apps/server/src/communication/`)
- **Context-Linked Healthcare Tasks**: Facilitates clinical task creation linked to specific entities (`PATIENT`, `ENCOUNTER`, `WARD`, `INVENTORY`) with priority tagging and threaded comments.
- **In-App Real-Time Notifications**: Automatically dispatches targeted notifications upon task assignment, lab critical panic alerts, or near-expiry batch warnings with direct action deep-links.


