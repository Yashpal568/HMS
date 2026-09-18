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
- **Role:** Centralized command center for the SaaS product owner.
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Key Features:**
  - Tenant Management (Create, provision, configure, activate/suspend hospital tenants).
  - Plan & Subscription Governance (Tiers, bed/doctor/storage limits, feature flags).
  - Platform Telemetry (Active tenants, system load, API latency, MongoDB Atlas health).
  - Platform Security Ledger (Cross-tenant security logs, admin action audits).
  - Zero Clinical Access: Platform Super Admins CANNOT view private patient records.

---

## 3. Request Lifecycle & Multi-Tenant Pipeline

Every incoming HTTP request traverses a strict, sequential pipeline:

```text
1. Network Ingestion (Cloudflare HTTPS / TLS Termination)
      ↓
2. Global Middlewares (Helmet, CORS, CookieParser)
      ↓
3. Authentication Guard (JwtAuthGuard)
   - Validates Bearer JWT signature, issuer, expiration
   - Decodes claims into req.user: { id, email, role, tenantId, surface }
      ↓
4. Tenant Resolution Interceptor
   - Extracts tenantId exclusively from verified req.user.tenantId
   - Sets execution context AsyncLocalStorage: TenantContext
   - Rejects unauthenticated or unscoped tenant requests with 401/403
      ↓
5. Authorization Guards (@RequirePermissions(), @Roles())
   - Evaluates required permissions against user's verified privileges
      ↓
6. Input Validation (ValidationPipe with class-validator & class-transformer)
   - Strips unwhitelisted properties, enforces strict DTO types
      ↓
7. Domain Service Execution
   - Queries executed against MongoDB with mandatory filter: { tenantId: user.tenantId, ... }
      ↓
8. Security Audit Recording (AuditService)
   - Sanitized audit log entry committed to audit_logs collection
      ↓
9. Response Serialization (Uniform ApiResponse envelope)
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
