# Hospital Management System & Patient Healthcare Platform — Master PRD

**SOURCE-OF-TRUTH OWNER**: `docs/PRD.md` (PRODUCT REQUIREMENTS)  
**Classification**: Authoritative  
**Document Version:** 3.0.0  
**Product Status:** Multi-Tenant SaaS Platform + Patient Healthcare Ecosystem  
**Target Architecture:** Cloud-Native, 4 Application Surfaces, MongoDB Atlas, AI-Ready (Phase 2)  
**Primary Database:** MongoDB Atlas (System of Record)  
**Cache & Queue:** Redis  

---

## 1. Executive Summary & Vision

The **HMS MedCore Platform** is an enterprise-grade, cloud-native **Multi-Tenant Software-as-a-Service (SaaS) Hospital Management System and Patient Healthcare Ecosystem**.

Unlike legacy, single-installation hospital management software, HMS MedCore operates as a sovereign multi-tenant platform serving independent hospitals, outpatient clinics, and medical enterprise networks worldwide from a unified cloud backend, while concurrently providing a direct-to-consumer mobile-first patient healthcare experience and a platform-owner SaaS management interface.

### The Four Sovereign Application Surfaces

The platform explicitly separates four specialized application surfaces that all communicate with a single canonical backend:

```text
                     ┌──────────────────────────────────────────────┐
                     │          Platform Super Admin Console        │
                     │               (apps/super-admin)             │
                     └──────────────────────┬───────────────────────┘
                                            │ (Platform APIs)
                                            ▼
┌───────────────────────────┐    ┌──────────────────────────────────┐    ┌───────────────────────────┐
│     Hospital HMS Client   │    │      Canonical Shared Backend    │    │    Patient Mobile Portal  │
│      (apps/hms-client)    ├───►│           (apps/server)          │◄───┤     (apps/patient-app)    │
│  [Admin, Doctors, Staff]  │    │     NestJS Modular Monolith      │    │  [Discovery, Queue, PHI]  │
└───────────────────────────┘    └──────────┬─────────────────┬─────┘    └───────────────────────────┘
                                            │                 │
                                            ▼                 ▼
                                   ┌─────────────────┐ ┌─────────────┐
                                   │  MongoDB Atlas  │ │    Redis    │
                                   │System of Record │ │Cache & Queue│
                                   └─────────────────┘ └─────────────┘
```

1. **`apps/server`**: The single canonical backend engine (NestJS, TypeScript, MongoDB Atlas, Redis). It powers all business logic, tenant isolation, RBAC authorization, healthcare workflows, queue calculations, and the future Phase 2 AI Gateway. Frontends NEVER communicate directly with MongoDB.
2. **`apps/hms-client`**: The dedicated hospital management application (Next.js, Tailwind CSS) used by Hospital Administrators, Consulting Physicians, Nurses, Receptionists, Pharmacists, Lab Technicians, and Billing Officers.
3. **`apps/patient-app`**: A standalone, mobile-first patient application (Next.js, Tailwind CSS) providing hospital and doctor discovery, appointment booking, live OPD queue tracking, and secure access to personal medical records.
4. **`apps/super-admin`**: A standalone SaaS provider command console (Next.js, Tailwind CSS) for platform owners to govern tenant provisioning, subscriptions, plan entitlements, usage limits, platform telemetry, and system-wide security.

---

## 2. Core Operating Principles & Invariants

1. **Strict Multi-Tenant Isolation**:
   - Every hospital is an isolated, sovereign tenant.
   - Tenant isolation is enforced at the backend data access layer.
   - The backend strictly derives `tenantId` from the cryptographically verified JWT session context (`req.user.tenantId`). Client-supplied tenant identifiers are NEVER trusted.
   - All queries and mutations against tenant collections are automatically scoped by `{ tenantId }`.
   - Cross-tenant IDOR probes return uniform `404 Not Found` to prevent entity enumeration.
2. **Strict Privilege Separation (Platform vs. Hospital vs. Patient)**:
   - Platform Super Admins govern SaaS plans, subscriptions, and tenant lifecycles with **zero clinical access** to private patient medical charts.
   - Hospital Administrators manage their hospital's staff, doctors, and configuration with **zero platform privileges** and **zero cross-hospital access**.
   - Patients have access strictly to their own authorized medical records and appointment tokens.
3. **Canonical Shared Backend**:
   - There is only ONE backend (`apps/server`). Frontends do not maintain separate backends.
4. **Authentic Data (Zero Fake Metrics)**:
   - Dashboard widgets, census counters, and telemetry report real data or authentic empty states. No fabricated mock numbers.
5. **Phase 2 AI Readiness**:
   - Phase 1 establishes an AI-ready architecture with an abstracted AI Gateway, tool registry, and permission engine. Model execution is strictly deferred to Phase 2.

---

## 3. Detailed Application Surfaces

### Surface 1: `apps/server` (Canonical Shared Backend)
- **Technology:** NestJS 12, Node 22, TypeScript, Mongoose 9, MongoDB Atlas, Redis.
- **Architectural Pattern:** Modular Monolith with bounded domain modules.
- **Capabilities:**
  - Multi-tenant JWT authentication, password hashing (`bcryptjs` cost 12), account lockout.
  - Role-Based Access Control (RBAC) with granular permissions and `@RequirePermissions()` decorators.
  - Multi-tenant request pipeline resolving verified `tenantId` into request execution context.
  - Unified REST APIs for Hospital Admin, Doctors, Staff, Patients, and Super Admin.
  - Real-time OPD queue orchestration engine with sequential daily token generation.
  - Centralized Security Audit Ledger (`audit_logs` collection).
  - Background worker dispatch and Redis caching pipeline.

### Surface 2: `apps/hms-client` (Hospital Management Application)
- **Technology:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons.
- **Audience:** Hospital Administrators, Medical Directors, Doctors, Clinical Staff.
- **Sub-Workspaces:**
  1. **Hospital Administrator Experience:**
     - Overview Analytics Cockpit & Live Telemetry.
     - Facility Settings (Departments, Wards, Rooms, Beds).
     - Staff Directory, Role Assignment & Permission Auditing.
     - Centralized Patient Directory & Intake Management.
     - Master Schedule Roster & Clinic Operating Hours.
     - Billing, Tariff Masters, Insurance & Financial Reconciliation.
     - Comprehensive Hospital Audit Trail.
  2. **Doctor & Clinical Experience:**
     - Consulting Physician Dashboard (Today's Schedule & Patient Queue).
     - Electronic Medical Records (EMR) & Clinical Encounter Intake.
     - Chief complaints, vitals capture, allergy warnings, ICD-coded diagnoses.
     - Electronic Prescriptions (linked to Medicine Master catalog).
     - Diagnostic Laboratory Test Ordering & Result Verification.
     - Patient Medical History & Follow-up Scheduling.
  3. **Departmental Operations:**
     - Reception & OPD Registration Desk.
     - IPD Admissions, Bed Allocation & Nursing Stations.
     - Pharmacy Dispensing & Inventory Management.
     - Diagnostic Laboratory Information System (LIS).

### Surface 3: `apps/patient-app` (Patient Healthcare Portal)
- **Technology:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Mobile-First Responsive Design.
- **Audience:** Patients, Family Caregivers.
- **Key Modules:**
  1. **Authentication & Profile:** Secure patient signup, login, multi-factor security, personal contact and emergency demographics.
  2. **Hospital Discovery:** Search and browse verified hospital networks, departments, facilities, clinical accreditations, and contact directions.
  3. **Doctor Discovery:** Filter doctors by specialty, affiliated hospital, consultation days, experience, and fee structure.
  4. **Appointment Booking Wizard:** Select hospital, specialty, consulting doctor, consultation date, and interactive time slot. Instant booking confirmation.
  5. **Real-Time OPD Queue Tracking:**
     - View allocated daily token number (e.g., `A-027`).
     - Real-time display of currently serving token (e.g., `A-019`).
     - Live calculation of patients ahead in queue and estimated wait time in minutes.
     - Automated turn-approaching notifications.
  6. **Personal Health Records (PHR) Vault:** Access authorized electronic prescriptions, laboratory test reports, visit history, discharge summaries, and medical invoices.
  7. **Privacy Guarantee:** Patient medical data is cryptographically protected and never publicly discoverable.

### Surface 4: `apps/super-admin` (SaaS Platform Owner Console)
- **Technology:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Dark Theme Console Aesthetics.
- **Audience:** SaaS Platform Super Admins, DevOps, Platform Support Operations.
- **Key Modules:**
  1. **Tenant Governance:** Create and onboard hospital tenants, activate/deactivate hospitals, configure tenant-specific domains and hospital metadata.
  2. **Subscription & Plan Engine:** Define plan tiers (Trial, Clinic, Hospital, Enterprise Network), set bed/doctor/storage quotas, toggle feature flags, and manage subscription lifecycles.
  3. **Platform Telemetry:** Monitor system-wide active tenant census, MongoDB Atlas connection health, Redis queue latency, and global request volume.
  4. **Platform Security Ledger:** Audit platform administrative actions, monitor cross-tenant security anomalies, and track administrative logins.
  5. **Global Support & System Announcements:** Broadcast maintenance notices and manage tenant support escalations.

---

## 4. Key Functional Modules (Phase 1 Scope)

| Module | Scope & Responsibilities | Core Entities |
|---|---|---|
| **Multi-Tenancy & Platform** | Strict tenant context resolution, tenant provisioning, sovereign isolation. | `tenants`, `subscriptions`, `plans` |
| **Authentication & RBAC** | JWT authentication, bcryptjs (cost 12), lockout policies, role & permission guards. | `users`, `roles`, `permissions`, `audit_logs` |
| **Facility Management** | Hospital branches, medical departments, wards, rooms, and operational beds. | `hospitals`, `departments`, `wards`, `beds` |
| **Patient Foundation** | Universal Health ID (`UHID-YYYY-NNNNNN`), demographics, duplicate detection, allergy registry. | `patients`, `counters` |
| **Appointments & OPD Queue** | Doctor schedules, slot reservation, double-booking prevention, daily token issuance, reception check-in. | `appointments`, `doctor_schedules`, `queues` |
| **Clinical EMR & Consultation** | Encounters, chief complaints, vitals, clinical progress notes, diagnoses, e-prescriptions. | `encounters`, `prescriptions`, `diagnoses` |
| **IPD & Ward Management** | Inpatient admissions, bed tracking, ward transfers, nursing charts, discharge summaries. | `admissions`, `bed_assignments`, `nursing_notes` |
| **Laboratory (LIS)** | Test catalog, lab order requisition, specimen collection, result entry, pathologist sign-off. | `lab_tests`, `lab_orders`, `lab_results` |
| **Pharmacy & Medicine Master** | Canonical Medicine Master catalog, batch tracking, expiry monitoring, FEFO dispensing. | `medicines`, `medicine_batches`, `dispensations` |
| **Inventory & Procurement** | Hospital consumables, equipment, suppliers, purchase orders, goods receipts, stock ledger. | `inventory_items`, `suppliers`, `purchase_orders` |
| **Billing & Invoicing** | Unified billing engine, tariff masters, itemized invoices, receipt generation, refunds. | `invoices`, `payments`, `tariff_rates` |
| **Audit & Security Center** | Immutable logging of all sensitive data access, authentication events, and clinical modifications. | `audit_logs` |

---

## 5. Architectural Invariants for Medicine & Billing

To prevent catalog duplication, stock discrepancy, and revenue leakage:

```text
┌────────────────────────────────────────────────────────┐
│               Canonical Medicine Master                │
│             (Brand, Generic, Form, Dosage)             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Medicine Batches & Stock                 │
│         (Batch No, Expiry Date, MRP, Unit Cost)        │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Pharmacy Dispensing   │ │      Billing & Invoicing  │
│   (FEFO Stock Deduction)  │ │   (Direct Tariff Pull)    │
└───────────────────────────┘ └───────────────────────────┘
```

1. **Single Source of Truth:** `medicines` collection is the master drug catalog.
2. **Batch Tracking:** Stock quantities, batch numbers, unit costs, and expiry dates are managed in `medicine_batches`.
3. **No Duplicate Billing Catalog:** The billing module NEVER maintains its own copy of medicines; billable medication charges reference `medicine_batches`.
4. **Bulk Import:** Hospitals populate the Medicine Master through standardized CSV/Excel bulk upload. The application NEVER hardcodes thousands of drug names in source code.

---

## 6. Real-Time OPD Queue Architecture

The OPD Queue system synchronizes Reception Check-In, Doctor Consultation, and Patient App live status:

1. **Token Allocation:** Generated sequentially per doctor/date upon booking or walk-in arrival (e.g., `A-001`, `A-002`).
2. **Reception Check-In:** When patient arrives, status transitions from `SCHEDULED` to `CHECKED_IN` (Waiting).
3. **Doctor Consultation Flow:**
   - Doctor calls next patient: Status transitions to `IN_CONSULTATION`.
   - Doctor concludes encounter: Status transitions to `COMPLETED`.
   - Patient absent: Doctor/Reception marks `NO_SHOW` or `SKIPPED`.
4. **Live Metrics Calculation:**
   - **Currently Serving:** Lowest token currently `IN_CONSULTATION`.
   - **Patients Ahead:** Count of `CHECKED_IN` tokens preceding current patient.
   - **Estimated Waiting Time:** `(Patients Ahead) × (Doctor's Configured Slot Duration)`.

---

## 7. Phase 2 AI Roadmap (Controlled Architecture)

AI capabilities are strictly Phase 2 deliverables, built on top of the Phase 1 AI Gateway:

```text
Hospital Data / Patient Request
              ↓
     Phase 2 AI Gateway
              ↓
      Agent Orchestrator
              ↓
   Policy & Permissions Engine (Inherits User Scope & Tenant ID)
              ↓
      Narrow Approved Tools (No Direct Database Queries)
              ↓
   Human Approval Check (High-Impact Clinical Decisions)
              ↓
       Execution & Audit Log
```

- **Core Tenet:** The core HMS remains 100% operational if AI services are unavailable.
- **Safety Boundary:** AI agents never have direct database access and cannot autonomously make high-impact clinical prescriptions or diagnosis decisions.

---

## 8. Summary of Milestones

- **Milestone 0:** Project Foundation & Repository Reorganization (COMPLETED)
- **Milestone 1:** Authentication + Multi-Tenancy + RBAC (READY / NEXT)
- **Milestone 2:** Hospital + Departments + Doctors + Staff
- **Milestone 3:** Patient Foundation & Centralized Registry
- **Milestone 4:** Appointments & OPD Queue Engine
- **Milestone 5:** Clinical Workflow & Electronic Prescriptions
- **Milestone 6:** IPD & Ward Management
- **Milestone 7:** Laboratory Information System (LIS)
- **Milestone 8:** Pharmacy, Medicine Master & Inventory
- **Milestone 9:** Billing, Invoicing & Payments
- **Milestone 10:** Patient Healthcare Discovery Platform (`apps/patient-app`)
- **Milestone 11:** SaaS Management & Super Admin Console (`apps/super-admin`)
- **Milestone 12:** Production Hardening, Security, Backup & Audit Center
- **Milestone 13:** Phase 2 AI Intelligence & Specialized Agent Network
