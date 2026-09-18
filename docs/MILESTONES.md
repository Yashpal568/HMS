# Hospital Management System — Master Implementation Milestones (M0 - M13)

**SOURCE-OF-TRUTH OWNER**: `docs/MILESTONES.md` (DEVELOPMENT ROADMAP)  
**Classification**: Authoritative  
**Product**: Multi-Tenant Hospital Management SaaS & Patient Healthcare Platform  
**Roadmap Execution**: Sequential Milestone Delivery with Strict Boundaries  
**Status**: Authoritative Milestone Index  

---

## 1. Master Milestone Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MASTER MILESTONE ROADMAP                           │
├──────────────┬────────────────────────────────────────────┬─────────────────┤
│ MILESTONE    │ DOMAIN FOCUS                               │ STATUS          │
├──────────────┼────────────────────────────────────────────┼─────────────────┤
│ Milestone 0  │ Project Foundation & Monorepo Topology     │ COMPLETED       │
│ Milestone 1  │ Authentication + Multi-Tenancy + RBAC      │ READY / NEXT    │
│ Milestone 2  │ Hospital + Departments + Doctors + Staff   │ PLANNED         │
│ Milestone 3  │ Patient Foundation (Master Patient Index)  │ PLANNED         │
│ Milestone 4  │ Appointments + OPD Queue Engine            │ PLANNED         │
│ Milestone 5  │ Clinical Workflow + Prescriptions (EMR)   │ PLANNED         │
│ Milestone 6  │ Pharmacy + Inventory & Procurement         │ PLANNED         │
│ Milestone 7  │ Laboratory Information System (LIS)        │ PLANNED         │
│ Milestone 8  │ Billing + Payments & Accounting            │ PLANNED         │
│ Milestone 9  │ Patient Discovery Platform (patient-app)   │ PLANNED         │
│ Milestone 10 │ SaaS Platform + Super Admin (super-admin)  │ PLANNED         │
│ Milestone 11 │ Notifications + Telemetry & Analytics      │ PLANNED         │
│ Milestone 12 │ Production Hardening & Security Audit      │ PLANNED         │
│ Milestone 13 │ Phase 2 AI Intelligence & Copilots         │ PLANNED         │
└──────────────┴────────────────────────────────────────────┴─────────────────┘
```

> [!IMPORTANT]
> **Strict Milestone Discipline**:
> - Never implement features belonging to upcoming milestones.
> - Never start the next milestone automatically upon completing the current one.
> - Await explicit user authorization before initiating any new milestone.

---

## 2. Milestone Specifications

### Milestone 0: Project Foundation
- **Status**: **COMPLETED**
- **Objective**: Establish the production monorepo architecture, TypeScript configurations, shared UI packages, database connectivity, and the 4-application folder topology.
- **Deliverables**:
  - `apps/server/` (NestJS modular monolith baseline)
  - `apps/hms-client/` (Next.js hospital workstation shell)
  - `apps/patient-app/` (Next.js mobile-first patient application foundation)
  - `apps/super-admin/` (Next.js SaaS platform owner console foundation)
  - `packages/ui/`, `packages/types/`, `packages/config/`, `packages/auth/`
  - MongoDB Atlas Mongoose connection & Redis client baseline.

---

### Milestone 1: Authentication + Multi-Tenancy + RBAC
- **Status**: **READY / NEXT ACTION**
- **Objective**: Implement enterprise multi-tenant identity governance, JWT authentication, and granular RBAC.
- **In Scope**:
  - `tenants`, `users`, `roles`, `permissions` collections and Mongoose schemas.
  - Multi-tenant JWT issuance with cryptographically verified `tenantId`, `userId`, `role`, and `permissions`.
  - Passwords hashed with `bcryptjs` (work factor 12) and account lockout after 5 failed attempts.
  - NestJS Guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`.
  - Tenant context extraction (`req.user.tenantId`) and uniform `404 Not Found` for cross-tenant IDOR probes.
  - Auth controllers in `apps/server/` and authentication contexts across frontends.
- **Out of Scope**: Clinical workflows, patient records, appointments, billing.

---

### Milestone 2: Hospital + Departments + Doctors + Staff
- **Status**: **PLANNED**
- **Objective**: Model the physical and operational structure of each hospital tenant.
- **In Scope**:
  - `hospitals`, `departments`, `doctors`, `staff` collections.
  - Hospital branch configuration, clinical specialties, and department hierarchy.
  - Physician professional registry, consultation fees, and shift slot schedules.
  - Staff duty rosters and department assignments.
  - Administrative management screens in `apps/hms-client`.
- **Out of Scope**: Patient registration, appointments, EMR notes.

---

### Milestone 3: Patient Foundation
- **Status**: **PLANNED**
- **Objective**: Implement the Master Patient Index (MPI) and longitudinal patient demographic registry.
- **In Scope**:
  - `patients` collection with tenant-scoped unique UHID generation.
  - Patient registration (demographics, phone, email, emergency contacts).
  - Clinical allergy alerts banner and chronic conditions tracking.
  - Patient search with fuzzy matching, phone lookup, and pagination.
  - Duplicate record detection heuristics.
- **Out of Scope**: Doctor consultation notes, billing generation.

---

### Milestone 4: Appointments + Queue
- **Status**: **PLANNED**
- **Objective**: Build the outpatient appointment scheduling engine and live OPD queue tracker.
- **In Scope**:
  - `appointments` and `queues` collections.
  - Slot availability calculation based on doctor shift schedules.
  - Appointment booking, check-in, rescheduling, and cancellation.
  - Daily token generation (e.g. `A-001`, `A-002`) and queue position calculation.
  - Live doctor queue cockpit in `apps/hms-client` (Next patient, Call, Complete, Skip).
- **Out of Scope**: Clinical prescriptions, pharmacy dispensing.

---

### Milestone 5: Clinical Workflow + Prescriptions (EMR)
- **Status**: **PLANNED**
- **Objective**: Physician clinical consultation workspace and electronic health record documentation.
- **In Scope**:
  - `encounters`, `clinical_notes`, `vitals`, `diagnoses`, `prescriptions` collections.
  - Structured SOAP consultation notes and ICD-10 diagnostic coding.
  - Electronic Prescriptions (Rx) referencing the hospital Medicine Master formulary.
  - Vital signs recording with abnormal threshold alerts.
- **Out of Scope**: Pharmacy stock deduction, financial billing.

---

### Milestone 6: Pharmacy + Inventory & Procurement
- **Status**: **PLANNED**
- **Objective**: Medication formulary, batch inventory tracking, and procurement workflows.
- **In Scope**:
  - `medicines` (Medicine Master with bulk CSV/Excel import), `medicine_batches`, `inventory`, `suppliers`, `purchases` collections.
  - First-Expiry, First-Out (FEFO) batch allocation at the dispensing counter.
  - Prescription fulfillment workflow with pharmacist sign-off.
  - Purchase Orders, Goods Receipt Notes (GRN), and reorder threshold alerts.
  - Zero catalog duplication: Pharmacy consumes the single Medicine Master.
- **Out of Scope**: Patient billing invoice settlement.

---

### Milestone 7: Laboratory Information System (LIS)
- **Status**: **PLANNED**
- **Objective**: Diagnostic investigation ordering, specimen collection, and result reporting.
- **In Scope**:
  - `lab_orders`, `lab_reports` collections.
  - Diagnostic test directory with normal reference ranges.
  - Specimen collection and barcode tracking.
  - Result parameter entry, abnormal flag detection, and pathologist verification.
  - Generation of verified PDF lab reports with secure pre-signed download links.
- **Out of Scope**: External reference lab B2B integrations.

---

### Milestone 8: Billing + Payments & Accounting
- **Status**: **PLANNED**
- **Objective**: Unified patient financial settlement, invoicing, and revenue cycle management.
- **In Scope**:
  - `invoices`, `payments` collections.
  - Consolidated invoicing aggregating doctor consultation fees, pharmacy batch items, and lab tests.
  - Multi-method payments (Cash, Card, UPI, Insurance) with atomic transaction receipts.
  - Strict decimal precision (`Decimal128`) eliminating floating-point errors.
  - Revenue summaries and daily collection reconciliation reports.
- **Out of Scope**: Third-party commercial insurance clearinghouse integrations.

---

### Milestone 9: Patient Discovery Platform
- **Status**: **PLANNED**
- **Objective**: Consumer-facing web portal for hospital/doctor discovery and live queue monitoring.
- **In Scope**:
  - Complete `apps/patient-app/` implementation.
  - Public hospital and physician search/filter directory.
  - 5-step self-service appointment booking wizard.
  - Real-time OPD Queue Tracker (Token, Serving, Ahead, Wait time calculation).
  - Secure Personal Health Records (PHR) vault for prescriptions and lab reports.
- **Out of Scope**: Hospital administration or clinician workspaces.

---

### Milestone 10: SaaS Platform + Super Admin
- **Status**: **PLANNED**
- **Objective**: Multi-tenant operational control plane for the SaaS platform owner.
- **In Scope**:
  - Complete `apps/super-admin/` implementation.
  - Hospital tenant provisioning wizard and lifecycle management (Activate, Suspend).
  - Commercial subscription tier governance (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
  - Quota enforcement (physician seats, beds, cloud storage).
  - Platform telemetry and cross-tenant health metrics.
- **Out of Scope**: Accessing private patient health records.

---

### Milestone 11: Notifications + Telemetry & Analytics
- **Status**: **PLANNED**
- **Objective**: Event-driven notification dispatch and executive operational analytics.
- **In Scope**:
  - `notifications` collection and BullMQ background workers.
  - Approaching-turn queue alerts, appointment confirmations via SMS and WhatsApp.
  - Operational hospital dashboards (bed occupancy velocity, OPD throughput).
  - Tenant-level audit log search and security event tracking.
- **Out of Scope**: Generative AI analytics.

---

### Milestone 12: Production Hardening & Security Audit
- **Status**: **PLANNED**
- **Objective**: End-to-end security penetration testing, automated backup validation, and performance optimization.
- **In Scope**:
  - Execution of the 5 tenant-isolation attack scenarios.
  - Helmet CSP hardening, CORS origin lockdown, and Redis rate-limiting stress testing.
  - MongoDB Atlas point-in-time recovery verification.
  - Production Docker builds and Render/Vercel zero-downtime deployment pipelines.
- **Out of Scope**: Phase 2 AI agents.

---

### Milestone 13: Phase 2 AI Intelligence & Copilots
- **Status**: **DEFERRED TO PHASE 2**
- **Objective**: Deploy bounded clinical and operational AI copilots via the AI Gateway.
- **In Scope**:
  - AI Gateway with token metering, PII redactor, and provider routing.
  - The 18 specialized healthcare agents (Reception, Documentation Copilot, Queue Agent, etc.).
  - Bounded tool execution inheriting user RBAC context.
  - Mandatory human clinician review and sign-off on all AI-assisted notes.
- **Out of Scope**: Autonomous clinical decision-making.
