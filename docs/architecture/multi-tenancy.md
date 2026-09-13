# Multi-Tenancy Architecture Specification

**Product**: Hospital Management System (HMS MedCore)  
**Model**: Multi-Tenant Software-as-a-Service (SaaS)  
**Database**: MongoDB Atlas  
**Status**: Authoritative Architectural Standard  

---

## 1. Executive Summary & Tenancy Philosophy

The Hospital Management System is engineered as a **web-first, multi-tenant Software-as-a-Service (SaaS) platform**. Every healthcare institution, hospital network, clinic, or medical organization onboarded to the platform operates as an isolated, sovereign **Tenant**.

### Core Tenancy Hierarchy

```text
Platform (SaaS Provider)
  │
  ├── Tenant A (Apollo Memorial Hospital)
  │     ├── Configuration & Branches
  │     ├── Staff Users & RBAC Roles
  │     ├── Patients (UHID unique to Tenant A)
  │     ├── Appointments & OPD Queues
  │     ├── EMR & Clinical Records
  │     ├── Inpatient Admissions & Beds
  │     ├── Laboratory Tests & Worklists
  │     ├── Pharmacy & Medicine Batches
  │     ├── Inventory & Procurement
  │     └── Invoices & Financial Transactions
  │
  ├── Tenant B (Metro General Clinic)
  │     ├── Configuration & Branches
  │     ├── Staff Users & RBAC Roles
  │     ├── Patients (UHID unique to Tenant B)
  │     └── ...
  │
  └── Tenant C (City Care Health Center)
```

> [!CRITICAL]
> **Strict Tenant Isolation Invariant**:  
> Under no circumstances can Tenant A view, query, modify, export, or deduce the existence of Tenant B's clinical, demographic, operational, or financial data. Cross-tenant leakage is classified as a Severity-0 / P0 security failure.

---

## 2. Tenancy Isolation Strategy

### Shared Database with Discriminator (`tenantId`) Scoping

The system utilizes a **shared database with indexed document-level discriminator fields (`tenantId`)** on MongoDB Atlas.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Atlas Database                          │
│                                                                        │
│  ┌─────────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Global Collections    │   │      Tenant-Owned Collections      │  │
│  │  - tenants              │   │  - users (tenantId)                │  │
│  │  - subscriptions        │   │  - patients (tenantId)             │  │
│  │  - plans                │   │  - appointments (tenantId)         │  │
│  │  - platform_users       │   │  - encounters (tenantId)           │  │
│  │  - platform_audit_logs  │   │  - invoices (tenantId)             │  │
│  └─────────────────────────┘   └────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Why Shared Database with Indexed Discriminators?
1. **Operational Agility**: Zero-downtime schema migrations, unified index management, and centralized cluster monitoring.
2. **Resource Efficiency**: Optimal memory utilization on MongoDB Atlas without connection pooling sprawl across thousands of individual tenant databases.
3. **Strict Software Controls**: Tenant isolation is guaranteed programmatically at the NestJS Data Access and Service layers, backed by mandatory compound indexes.

---

## 3. Platform Level vs Hospital Level Separation

The architecture establishes a strict security perimeter dividing **Platform Administration** from **Hospital/Tenant Administration**.

```text
┌───────────────────────────────────────────────────────────────────────┐
│                    PLATFORM LEVEL (SaaS Provider)                     │
├───────────────────────────────────────────────────────────────────────┤
│ Responsibilities:                                                     │
│ - Tenant Onboarding & Lifecycle (provision, suspend, reactivate)     │
│ - Subscription & Plan Management (limits, module enablement)          │
│ - Platform Global Telemetry, Health, and Resource Utilization         │
│ - Global System Configuration                                         │
│                                                                       │
│ Trust Boundary: Platform Super Admins only                            │
│ Clinical Access: ZERO access to patient EMR, diagnosis, or health     │
└───────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ (Isolation Barrier)
┌───────────────────────────────────────────────────────────────────────┐
│                     HOSPITAL LEVEL (Tenant Space)                     │
├───────────────────────────────────────────────────────────────────────┤
│ Responsibilities:                                                     │
│ - Hospital Configuration (branches, departments, wards, tariffs)      │
│ - Staff Management & Role Assignment within the Tenant                │
│ - Clinical Workflows (OPD, IPD, EMR, Vitals, Prescriptions)           │
│ - Operational Workflows (Lab orders, Pharmacy dispensing, Inventory)  │
│ - Financial Operations (Invoicing, Payments, Collections)             │
│                                                                       │
│ Trust Boundary: Tenant Staff (Doctors, Nurses, Receptionists, Admins) │
│ Platform Access: ZERO access to platform config, other tenant data   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. Tenant Context Resolution Pipeline

Every incoming API request is processed through an authoritative backend pipeline that extracts and binds the verified `tenantId` to the execution context.

```text
Client Request (HTTPS)
       │
       ▼
1. Web Application Firewall & Rate Limiting
       │
       ▼
2. JwtAuthGuard (Passport JWT Strategy)
       ├── Validates cryptographic signature
       ├── Verifies token expiration
       └── Decodes payload: { sub: userId, tenantId: string, role: string }
       │
       ▼
3. TenantContextInterceptor / Guard
       ├── Extracts tenantId from verified JWT payload
       ├── Rejects unassigned or mismatched tenant tokens
       ├── Validates tenant operational status (Active / Suspended)
       └── Binds tenantId to Request Execution Context (req.user.tenantId)
       │
       ▼
4. PermissionsGuard & RolesGuard
       ├── Validates role within tenant context
       └── Confirms user has permission (e.g. 'patients.create')
       │
       ▼
5. Tenant-Scoped Application Service
       ├── Injects tenantId into entity creation
       └── Passes tenantId as mandatory query predicate
       │
       ▼
6. Mongoose Data Access Layer
       ├── Executes MongoDB query with { tenantId: req.user.tenantId }
       └── Uses compound index { tenantId: 1, ... }
       │
       ▼
MongoDB Atlas (Isolated Result Set)
```

### Golden Rules of Tenant Context
1. **Never Trust Client-Provided Identifiers**: The backend **never** accepts `tenantId` from client request bodies, query strings, or unverified custom headers (`x-tenant-id`).
2. **Authoritative Extraction**: The `tenantId` is exclusively derived from the cryptographically verified JWT issued upon successful authentication.
3. **No Unscoped Queries**: Any database query against a tenant-owned collection that omits `{ tenantId }` is an architectural defect.

---

## 5. Collection Ownership Classification

All MongoDB collections are strictly categorized into three architectural tiers:

| Classification | Description | TenantId Field | Example Collections |
|---|---|---|---|
| **GLOBAL / PLATFORM-OWNED** | Managed exclusively by the SaaS provider for cross-tenant operations and billing. | NO (`tenantId` not present; records define tenants) | `tenants`, `subscriptions`, `plans`, `platform_users`, `platform_audit_logs` |
| **TENANT-OWNED** | Sovereign hospital records partitioned by institution. | **YES (Mandatory `tenantId: ObjectId`, Indexed)** | `users`, `roles`, `permissions`, `patients`, `appointments`, `encounters`, `vitals`, `diagnoses`, `prescriptions`, `wards`, `beds`, `lab_orders`, `medicines`, `inventory_items`, `invoices`, `payments`, `audit_logs` |
| **SYSTEM-OWNED** | Internal system operational and state infrastructure. | Conditional (System settings may be global or tenant-overridden) | `system_settings`, `outbox_events`, `migrations` |

---

## 6. Tenant-Scoped Unique Identifiers

In a multi-tenant SaaS environment, unique constraints must be scoped to the tenant. Global uniqueness across all hospitals is neither required nor desirable for hospital-specific identifiers.

### 1. Patient Unique Hospital Identifier (UHID)
- **Constraint**: Unique **per hospital/tenant**.
- **Index**: `{ tenantId: 1, uhid: 1 }` with `unique: true`.
- **Format**: `UHID-YYYY-NNNNNN` (e.g. `UHID-2026-000001`).
- Two different hospitals can both have patient `UHID-2026-000001` without collision.

### 2. Staff Email & Login
- **Constraint**: Unique across the system (global email index `{ email: 1 }` with `unique: true`) to prevent authentication routing ambiguities.
- Compound index `{ tenantId: 1, email: 1 }` optimizes staff lookups within a hospital directory.

### 3. Invoices, Lab Orders, & Prescriptions
- **Invoice Number**: `{ tenantId: 1, invoiceNumber: 1 }` (unique: true).
- **Lab Order Number**: `{ tenantId: 1, orderNumber: 1 }` (unique: true).
- **Prescription Number**: `{ tenantId: 1, prescriptionNumber: 1 }` (unique: true).

---

## 7. Migration & Scalability Roadmap

1. **Phase 1 (Current)**:
   - Single MongoDB Atlas replica set with shared collections.
   - Mandatory `tenantId` discriminator and compound indexes.
   - Rigorous automated unit, e2e, and penetration tests verifying tenant isolation.

2. **Phase 2 (Future / Enterprise Multi-Region)**:
   - For enterprise tier customers requiring physical data residency (e.g. dedicated compliance requirements), the architecture cleanly supports routing specific `tenantId` connections to dedicated MongoDB database instances via a Tenant Connection Factory without altering domain service logic.
