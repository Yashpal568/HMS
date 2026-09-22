# Hospital Management System — Master Implementation Milestones (M0 - M16)

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
│ Milestone 1  │ Authentication + Multi-Tenancy + RBAC      │ COMPLETED       │
│ Milestone 2  │ Hospital + Departments + Doctors + Staff   │ COMPLETED       │
│ Milestone 3  │ Patient Foundation (Master Patient Index)  │ COMPLETED       │
│ Milestone 4  │ Appointments + OPD Queue Engine            │ COMPLETED       │
│ Milestone 5  │ Clinical Workflow + Prescriptions (EMR)   │ COMPLETED       │
│ Milestone 6  │ IPD & Bed Management                       │ COMPLETED       │
│ Milestone 7  │ Laboratory Information System (LIS)        │ COMPLETED       │
│ Milestone 8  │ Pharmacy & Dispensing                      │ COMPLETED       │
│ Milestone 9  │ Inventory, Stock & Procurement             │ COMPLETED       │
│ Milestone 10 │ Billing, Invoicing & Payments              │ COMPLETED       │
│ Milestone 11 │ Reports, Analytics & Master Audit Center   │ COMPLETED       │
│ Milestone 12 │ Production Hardening & Disaster Recovery   │ COMPLETED       │
│ Milestone 13 │ SaaS Platform Owner Console & Super Admin  │ COMPLETED       │
│ Milestone 14 │ Patient Discovery Platform (patient-app)   │ READY / NEXT    │
│ Milestone 15 │ Phase 2 AI Intelligence & Copilots         │ DEFERRED (PH 2) │
│ Milestone 16 │ Windows Desktop Electron Packaging         │ PLANNED         │
└──────────────┴────────────────────────────────────────────┴─────────────────┘
```

> [!IMPORTANT]
> **Strict Milestone Discipline**:
> - Never implement features belonging to upcoming milestones.
> - Never start the next milestone automatically upon completing the current one.
> - Await explicit user authorization before initiating any new milestone.

---

## 2. Milestone Specifications

### Milestone 0: Project Foundation & Monorepo Topology
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
- **Status**: **COMPLETED**
- **Objective**: Implement enterprise multi-tenant identity governance, JWT authentication, and granular RBAC.
- **Deliverables**:
  - `tenants`, `users`, `roles`, `permissions` collections and Mongoose schemas.
  - Multi-tenant JWT issuance with cryptographically verified `tenantId`, `userId`, `role`, and `permissions`.
  - Passwords hashed with `bcryptjs` (work factor 12) and account lockout after 5 failed attempts.
  - NestJS Guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`.
  - Tenant context extraction (`req.user.tenantId`) and uniform `404 Not Found` for cross-tenant IDOR probes.

---

### Milestone 2: Hospital + Departments + Doctors + Staff
- **Status**: **COMPLETED**
- **Objective**: Model the physical and operational structure of each hospital tenant.
- **Deliverables**:
  - `hospitals`, `departments`, `doctors`, `staff` collections.
  - Hospital branch configuration, clinical specialties, and department hierarchy.
  - Physician professional registry, consultation fees, and shift slot schedules.
  - Staff duty rosters and department assignments in `apps/hms-client`.

---

### Milestone 3: Patient Foundation (Master Patient Index)
- **Status**: **COMPLETED**
- **Objective**: Implement the Master Patient Index (MPI) and longitudinal patient demographic registry.
- **Deliverables**:
  - `patients` collection with tenant-scoped unique sequential UHID generation (`PAT-YYYY-NNNNNN`).
  - Patient registration (demographics, phone, email, emergency contacts).
  - Clinical allergy alerts banner and chronic conditions tracking.
  - Deterministic and probabilistic duplicate record detection heuristics.

---

### Milestone 4: Appointments + OPD Queue Engine
- **Status**: **COMPLETED**
- **Objective**: Outpatient appointment scheduling engine and live OPD queue tracker.
- **Deliverables**:
  - `appointments` and `queues` collections.
  - Slot availability calculation based on doctor shift schedules.
  - Daily token generation (`#1`, `#2`, etc.) and queue state machine (`SCHEDULED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`).
  - Doctor queue cockpit in `apps/hms-client`.

---

### Milestone 5: Clinical Workflow + Prescriptions (EMR)
- **Status**: **COMPLETED**
- **Objective**: Physician clinical consultation workspace and electronic health record documentation.
- **Deliverables**:
  - `encounters`, `clinical_notes`, `vitals`, `diagnoses`, `prescriptions` collections.
  - Structured SOAP consultation notes and ICD-10 diagnostic coding.
  - Electronic Prescriptions (Rx) referencing the hospital Medicine Master formulary.
  - Active allergy contraindication engine and vital signs recording with abnormal threshold alerts.
  - Immutability lock on finalized encounters.

---

### Milestone 6: IPD & Bed Management
- **Status**: **COMPLETED**
- **Objective**: Inpatient admissions, bed matrix, and clinical transfer workflows.
- **Deliverables**:
  - `admissions`, `wards`, `beds`, `discharges` collections.
  - Concurrency-safe atomic bed reservation and internal transfers with housekeeping release.
  - Real-time census calculations and discharge summary authoring.

---

### Milestone 7: Laboratory Information System (LIS)
- **Status**: **COMPLETED**
- **Objective**: Diagnostic investigation ordering, specimen accessioning, and pathologist verification.
- **Deliverables**:
  - `lab_orders`, `lab_reports`, `tests` collections.
  - Diagnostic test directory with normal reference ranges and panic critical limits.
  - Dual-bench technician worksheet and pathologist verification sign-off seal.
  - Generation of verified PDF lab reports with secure pre-signed download links.

---

### Milestone 8: Pharmacy & Dispensing
- **Status**: **COMPLETED**
- **Objective**: Medication formulary, batch inventory tracking, and dispensing workstation.
- **Deliverables**:
  - `medicines`, `medicine_batches`, `dispenses` collections.
  - First-Expiry, First-Out (FEFO) batch allocation at the dispensing counter.
  - Concurrency-safe atomic stock deduction and thermal print label generation.

---

### Milestone 9: Inventory, Stock & Procurement
- **Status**: **COMPLETED**
- **Objective**: Hospital consumables catalog, supplier management, and purchase workflows.
- **Deliverables**:
  - `inventory_items`, `suppliers`, `purchase_orders`, `purchase_receipts` (GRN), `stock_movements`.
  - Sequential purchase order requisition (`PO-YYYY-NNNNN`) and GRN delivery workstation (`GRN-YYYY-NNNNN`).
  - Departmental transfers and physical stock adjustments with reason codes.
  - Multi-currency integration defaulting to Indian Rupee (`₹ INR`).

---

### Milestone 10: Billing, Invoicing & Payments
- **Status**: **COMPLETED**
- **Objective**: Unified patient financial settlement, invoicing, and revenue cycle management.
- **Deliverables**:
  - `services`, `invoices`, `payments`, `refunds` collections with high-precision integer arithmetic.
  - Unbilled clinical charge auto-aggregator combining OPD, LIS, pharmacy, and bed charges.
  - Multi-method payment processing (Cash, Card, UPI, Insurance) and itemized statements.
  - Permission-controlled refunds authorization queue.

---

### Milestone 11: Reports, Analytics & Master Audit Center
- **Status**: **COMPLETED**
- **Objective**: Hospital operational census, financial analytics, and immutable audit inspection.
- **Deliverables**:
  - Operational census reports (Bed occupancy %, ALOS, clinician workloads, lab TAT).
  - Financial revenue dashboards (Accounts Receivable ageing matrix, cashier reconciliation).
  - Pharmacy and inventory risk dashboards (Near-expiry batches, stockouts).
  - Master Audit Center with multi-criteria search and RFC-4180 CSV export.

---

### Milestone 12: Production Hardening, Security & Disaster Recovery
- **Status**: **COMPLETED**
- **Objective**: Multi-tier rate limiting, zero-leakage exceptions, security headers, and disaster recovery verification.
- **Deliverables**:
  - Multi-tier throttling via `@nestjs/throttler` (Global: 100/min, Auth: 5/min, Financial: 10/min).
  - Helmet CSP hardening, sensitive cache control headers, and `CorrelationIdMiddleware`.
  - Deep health telemetry endpoint (`GET /api/v1/health/deep`).
  - Automated backup and point-in-time restore verification tooling (`backup-atlas.ts`, `restore-verify.ts`).
  - Authoritative Disaster Recovery Runbook (`docs/DISASTER_RECOVERY_RUNBOOK.md`).
  - 100% test pass rate across 19/19 E2E and 117/117 unit tests.

---

### Milestone 13: SaaS Platform Owner Console & Super Admin Control Plane
- **Status**: **COMPLETED**
- **Detailed Specification**: [docs/milestones/M13_SUPER_ADMIN_PLATFORM.md](file:///e:/FluBird/docs/milestones/M13_SUPER_ADMIN_PLATFORM.md)
- **Objective**: Multi-tenant operational control plane for the SaaS platform owner (`apps/super-admin/` and backend `/api/v1/super-admin/*`).
- **In Scope**:
  - Hospital tenant provisioning wizard creating Tenant, Hospital, and initial Admin User atomically.
  - Tenant lifecycle state machine (`ACTIVE`, `TRIAL`, `SUSPENDED`, `OFFBOARDED`).
  - Commercial subscription tier catalog governance (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
  - Quota burst override management (Doctors, Beds, Storage) with automatic expiration.
  - Platform-wide operational telemetry (Atlas cluster ping, Redis memory, request throughput).
  - Platform immutable audit ledger for Super Admin actions.
  - System-wide maintenance and incident announcement broadcaster.
  - **Zero-PHI Technical Invariant**: Cryptographic rejection of Super Admin access to clinical data (`403 Forbidden`).
- **Out of Scope**: Direct access to patient medical charts, clinical encounter notes, prescriptions, or lab results.

---

### Milestone 14: Patient Discovery & Consumer Healthcare Platform
- **Status**: **READY / NEXT ACTION**
- **Detailed Specification**: [docs/milestones/M14_PATIENT_DISCOVERY_PLATFORM.md](file:///e:/FluBird/docs/milestones/M14_PATIENT_DISCOVERY_PLATFORM.md)
- **Objective**: Consumer-facing mobile-first healthcare portal (`apps/patient-app/`).
- **In Scope**:
  - Hospital and physician search/filter directory with fee transparency.
  - 5-step self-service appointment booking wizard.
  - Real-time OPD Queue Tracker (Token number, current serving, estimated wait).
  - Secure Personal Health Records (PHR) vault for prescriptions and lab PDFs.
- **Out of Scope**: Hospital administration or clinical doctor workspaces.

---

### Milestone 15: Phase 2 AI Intelligence & Copilots
- **Status**: **DEFERRED TO PHASE 2**
- **Detailed Specification**: [docs/milestones/M15_PHASE_2_AI_INTELLIGENCE.md](file:///e:/FluBird/docs/milestones/M15_PHASE_2_AI_INTELLIGENCE.md)
- **Objective**: Deploy bounded clinical and operational AI copilots via the AI Gateway.
- **In Scope**:
  - AI Gateway with token metering, PII redactor, and provider routing.
  - Specialized healthcare agents (Reception FAQ, Documentation Copilot, Lab Summarizer).
  - Mandatory human clinician review and sign-off on all AI-assisted notes.
- **Out of Scope**: Autonomous clinical decision-making or autonomous prescription authorization.

---

### Milestone 16: Windows Desktop Electron Packaging
- **Status**: **PLANNED**
- **Detailed Specification**: [docs/milestones/M16_ELECTRON_DESKTOP_PACKAGING.md](file:///e:/FluBird/docs/milestones/M16_ELECTRON_DESKTOP_PACKAGING.md)
- **Objective**: Package the existing Next.js web application into an enterprise Windows desktop application (`.exe` / `.msi`) using Electron.
- **In Scope**:
  - Desktop hardware adapter for direct silent thermal printing and barcode scanning.
  - Windows installers with enterprise desktop shortcuts.
  - Strict REST API communication (zero direct DB access).
- **Out of Scope**: Offline database replicas or rewriting frontend in native C# / WPF.
