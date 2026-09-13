# Hospital Management System — Master PRD
Version 2.0 | Multi-Tenant SaaS | Phase 1 Core HMS → Phase 2 AI | Database: MongoDB Atlas

## 1. Product Vision & Goal
The Hospital Management System (HMS MedCore) is built as a **SaaS-first, multi-tenant Hospital Management System**. 

The system delivers an enterprise-grade, web-first cloud platform serving multiple independent hospitals, clinics, and healthcare networks from a single, resilient multi-tenant architecture on MongoDB Atlas. It covers patient registration, OPD, EMR, IPD, nursing, laboratory, pharmacy, inventory, billing, documents, notifications, reports, staff administration, audit, and platform security.

Because the system manages mission-critical healthcare operations and Protected Health Information (PHI):
- **Tenant Isolation** is a non-negotiable security invariant.
- **Data Integrity**, **RBAC authorization**, and **immutable auditability** are first-class requirements.
- **MongoDB Atlas** is the sole authoritative system of record.
- **Web-First** is the primary deployment model; Electron desktop packaging is deferred to Phase 2.
- **AI-Ready** architecture is established in Phase 1, with AI implementation strictly deferred to Phase 2.

---

## 2. SaaS Architecture & Tenancy Model

### Tenancy Hierarchy
```text
Platform (SaaS Provider)
  │
  ├── Tenant A (Hospital / Clinic A)
  │     ├── Configuration & Branches
  │     ├── Users, Roles & Permissions
  │     ├── Patients & Medical Records
  │     ├── Appointments & OPD Queues
  │     ├── Inpatient Admissions & Beds
  │     ├── Laboratory & Pharmacy
  │     └── Billing & Inventory
  │
  ├── Tenant B (Hospital / Clinic B)
  │     └── [Completely Isolated Workspace & Data]
  │
  └── Tenant C (Hospital / Clinic C)
```

### Key Tenancy Principles
1. **Absolute Isolation**: Tenant A must never be able to access, view, or modify Tenant B's data under any circumstance.
2. **Backend Enforcement**: Tenant context is derived strictly from the authenticated user's verified session/JWT claims on the backend. The backend never trusts client-supplied tenant identifiers.
3. **Data Scoping**: Every tenant-owned database entity is stamped with an indexed `tenantId`. All queries on tenant collections are scoped by `tenantId`.
4. **Platform vs. Hospital Separation**:
   - **Platform Level**: SaaS provider operations (tenant provisioning, subscription lifecycle, plan definitions, global platform telemetry, system maintenance).
   - **Hospital Level**: Customer healthcare operations (hospital configuration, staff, patients, clinical consultations, billing, dispensing, inventory).
   - Hospital administrators have **zero** platform-level privileges and cannot cross hospital boundaries.

---

## 3. Subscription & Plan Model

The architecture is subscription-ready and built on three conceptual entities:
- **`Tenant`**: The customer organization (hospital, medical center, clinic).
- **`Subscription`**: The commercial contract governing tenant status and lifecycle.
- **`Plan`**: The tier configuration defining enabled modules, resource allocations, and capabilities.

### Subscription Lifecycle States
- **`TRIAL`**: Initial evaluation period with full or configured capabilities.
- **`ACTIVE`**: Paid subscription in good operational standing.
- **`PAST_DUE`**: Grace period following payment failure; warning banner displayed.
- **`SUSPENDED`**: Operational access locked due to non-payment or compliance policy hold.
- **`CANCELLED`**: Customer requested cancellation; active until period end.
- **`EXPIRED`**: Period elapsed without renewal; locked or read-only archive state.

> [!NOTE]
> **No Hardcoded Pricing or Gateways**:  
> Payment gateways (e.g. Stripe, Razorpay) and specific pricing tiers are not implemented in Phase 1. Subscriptions are managed administratively by Platform Super Admins until payment milestones are scheduled.

---

## 4. Phase 1 Core Modules (In-Scope)

1. **Platform Foundation & Multi-Tenancy**: Tenant context resolution, tenant isolation guards, organization configuration.
2. **Authentication & Security**: Multi-tenant login, session tokens, account lockout, audit logging.
3. **Users, Roles & RBAC**: Tenant-scoped user directory, granular permissions, role assignment.
4. **Hospital & Facilities**: Branches, departments, wards, rooms, beds, doctor schedules.
5. **Patient Management**: Centralized registry, tenant-scoped unique UHID, demographics, contacts, allergies, duplicate detection.
6. **Appointments & OPD**: Doctor schedules, booking, token generation, queue management, check-in.
7. **Doctor Consultation & EMR**: Encounters, chief complaints, clinical notes, vitals, ICD-coded diagnoses, electronic prescriptions.
8. **IPD & Bed Management**: Inpatient admission, bed allocation, intra-hospital transfers, rounds, discharge summaries.
9. **Nursing Station**: Vitals monitoring, medication administration records (eMAR), nursing tasks.
10. **Laboratory Information System (LIS)**: Test catalog, lab orders, sample collection, result entry, pathologist verification.
11. **Pharmacy & Dispensing**: Medicine catalog, batch management, expiry tracking, FEFO dispensing, prescription fulfillment.
12. **Inventory & Procurement**: Item catalog, suppliers, purchase orders, goods receipt notes (GRN), stock ledger, departmental transfers.
13. **Billing, Invoicing & Payments**: Tariff masters, invoices, receipts, payment tracking, credit notes, refunds.
14. **Document Management**: Clinical file attachments, diagnostic uploads, protected access audit.
15. **Notifications**: In-app operational alerts and automated clinical reminders.
16. **Reports & Dashboards**: Operational census, bed occupancy, revenue attribution, financial summaries.
17. **Audit & Security Center**: Master immutable audit trail, cross-tenant security anomaly logging.

---

## 5. Phase 2 AI Intelligence (Controlled Roadmap)

The Phase 1 architecture is engineered to be **AI-ready** while keeping all AI model execution strictly in Phase 2.

Planned controlled AI capabilities include:
- Reception / appointment scheduling assistant
- Hospital clinical knowledge assistant
- Doctor documentation & clinical note drafting copilot
- Patient medical record summarization
- Discharge summary drafting
- Laboratory result anomaly flagging
- Pharmacy drug-drug interaction alerts
- Inventory demand & expiry forecasting
- Hospital management intelligence & census forecasting
- Security anomaly & unusual access detection

### AI Architectural Safeguards
- **Zero Direct Database Exposure**: AI models never receive MongoDB connection strings or query credentials.
- **AI Gateway**: All AI requests pass through an AI Gateway that enforces data minimization, PII redaction, and tool allowlists.
- **Mandatory Human Sign-Off**: AI drafts notes or summaries; a licensed human clinician must explicitly review and sign before anything is committed to a patient's medical record.

---

## 6. Initial User Roles

- **Platform Super Admin**: Manages tenants, plans, and global infrastructure. Zero clinical access.
- **Hospital Admin**: Manages hospital settings, departments, staff, and hospital-level workflows. Bound to single tenant.
- **Doctor**: Clinical consultations, encounters, diagnosis, prescriptions, inpatient rounds.
- **Nurse**: Patient vitals, bed tracking, medication administration, nursing notes.
- **Receptionist**: Patient registration, appointment booking, queue management, check-in.
- **Lab Technician**: Specimen collection, result recording, preliminary lab processing.
- **Pharmacist**: Prescription review, batch stock verification, dispensing.
- **Accountant**: Invoice generation, payment receipting, financial reconciliation.
- **Inventory Manager**: Stock receiving, purchase orders, departmental distribution.

---

## 7. Core Workflows

### OPD Workflow
Registration (generates tenant-scoped UHID) → Appointment/Walk-in → Check-in & Queue Token → Doctor Consultation → Vitals & Diagnoses → Investigation / E-Prescription → Billing & Invoicing → Payment Collection → Follow-up.

### IPD Workflow
Inpatient Admission → Bed Allocation → Doctor Rounds & Nursing Care → Investigations & Pharmacy Dispensing → Discharge Clearance → Final Invoicing & Settlement.

### Laboratory Workflow
Order Creation → Specimen Collection & Barcode Labeling → Processing → Result Entry → Pathologist Verification → Final Report Publication.

### Pharmacy Workflow
Prescription Receipt → Batch & Expiry Validation (FEFO) → Medication Dispensing → Stock Ledger Deduction → Payment Receipt.

### Inventory Workflow
Purchase Order Generation → Supplier Delivery & Goods Receipt (GRN) → Batch & Expiry Registration → Stock Movements & Issue → Departmental Adjustments.

### Billing Workflow
Service Tariff Lookup → Invoice Compilation → Payment Processing (Cash/Card/Online/UPI) → Receipt Issuance → Reconciliation.

---

## 8. Non-Functional Requirements

- **Tenant Isolation**: Non-negotiable backend-enforced partitioning. Cross-tenant leakage is a Severity-0 defect.
- **Security by Default**: Enforce least privilege, encrypted communications, and secure token handling.
- **Responsive Enterprise Web UI**: Desktop, tablet, and mobile-friendly responsive layouts with accessible components.
- **Financial Precision**: Use MongoDB `Decimal128` or integer minor units (paise/cents) for all monetary fields; avoid floating-point math.
- **Auditability**: Permanent, immutable audit trail for all authentication, clinical, and financial actions.
- **Structured Telemetry**: Standardized logging with correlation IDs; no sensitive PHI or credentials in logs.
- **Zero-Fake-Data Compliance**: Dashboards and widgets display genuine telemetry or authentic empty states; no mock figures.

---

## 9. Security & Governance Standards

- **Authentication**: Salted and hashed passwords using `bcryptjs` (work factor 12). Account lockout for 15 minutes after 5 failed attempts.
- **Session Security**: Signed HMAC SHA-256 JWTs transmitted via `HttpOnly`, `SameSite=lax`, `Secure` cookies.
- **Tenant Context Protection**: Derives `tenantId` strictly from verified JWT claims; rejects/sanitizes any client-supplied tenant overrides.
- **RBAC**: Guard evaluation using `@Roles()` and `@RequirePermissions('resource.action')`.
- **Existence Masking**: Cross-tenant IDOR probes return uniform `404 Not Found` to prevent entity enumeration across hospitals.
- **Database Security**: Enforced TLS 1.2+ to MongoDB Atlas, network IP access allowlists, least-privilege database user.
- **Regulatory Notice**: The system implements enterprise healthcare security best practices. Do not claim formal HIPAA, GDPR, or ISO 27001 certifications without third-party legal and technical audit verification.

---

## 10. Deployment Strategy

### Primary: Cloud Multi-Tenant SaaS
- **Frontend**: Next.js 16 (React 19, TypeScript) hosted on high-availability web infrastructure.
- **Backend**: NestJS 12 modular monolith (Node.js 22, TypeScript) hosted on scalable application servers.
- **Database**: MongoDB Atlas cloud cluster with automated continuous backups, multi-AZ replica sets, and encryption at rest.

### Future: Windows Desktop Packaging (Phase 2)
- Once the web SaaS platform is complete and verified, package the existing Next.js frontend using Electron to produce an installable Windows desktop application (`.exe`/`.msi`).
- The Electron application connects exclusively to the NestJS cloud API over HTTPS and never connects directly to MongoDB.

### Prohibitions
- ❌ Do NOT deploy as an on-premise single-tenant architecture.
- ❌ Do NOT use PostgreSQL or Prisma.
- ❌ Do NOT allow direct database access from frontend, Electron, or AI.
