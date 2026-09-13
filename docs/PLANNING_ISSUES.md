# Hospital Management System — Master Planning Consistency & Architecture Issues

This document records architectural decisions, resolved discrepancies, and active project governance notes identified during the master development planning audit.

---

## Issue 1: Password Hashing Algorithm Specification

- **Status**: **RESOLVED**
- **Resolution**: Standardized exclusively on `bcryptjs` (salt cost factor 12) for all authentication in Phase 1.
- **Affected Documents**: `docs/PRD.md`, `docs/BACKEND.md`, `docs/SECURITY.md`, `apps/api/src/auth/auth.service.ts`.
- **Reason**: `bcryptjs` is an industry-standard, production-proven password hashing library that runs reliably across all environments (Windows, Linux, macOS) in Node 22 without requiring native C++ build toolchains (`node-gyp`, Python) that frequently fail in automated cross-platform developer setups.

---

## Issue 2: Milestone Granularity & Roadmap Alignment

- **Status**: **RESOLVED**
- **Resolution**: Adopted the granular 14-milestone plan in `docs/milestones/` where Patient Management (M03), Appointments & OPD (M04), EMR Consultation (M05), IPD (M06), Laboratory (M07), Pharmacy (M08), Inventory (M09), and Billing (M10) are discrete, verifiable milestones.
- **Affected Documents**: `docs/IMPLEMENTATION_ROADMAP.md`, `docs/PRD.md`, `docs/TASK.md`, `docs/milestones/`.
- **Reason**: Healthcare modules have intricate data models, regulatory requirements, and user interfaces. Discrete milestones guarantee zero monolithic commits, prevent untested edge cases, and ensure rigorous automated verification before advancing.

---

## Issue 3: Clinical & Financial Data Retention Period

- **Status**: **RESOLVED FOR PHASE 1**
- **Resolution**: Configure operational collections (`patients`, `encounters`, `invoices`, `audit_logs`) without automatic TTL deletion. Retain all records indefinitely during development and staging. Implement configurable retention rules during Milestone 12 based on the target jurisdiction's health records law.
- **Affected Documents**: `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/milestones/M11_REPORTS_ANALYTICS_AUDIT_CENTER.md`, `docs/milestones/M12_PRODUCTION_HARDENING_SECURITY_BACKUP.md`.
- **Reason**: Prematurely purging clinical or audit history during active development could result in unexpected test failures and non-reproducible states.

---

## Issue 4: SaaS Tenant Model Strategy

- **Status**: **RESOLVED & FINALIZED**
- **Decision**: The Hospital Management System is finalized as a **Multi-Tenant SaaS Product**.
- **Implementation Pattern**: Shared database on MongoDB Atlas with mandatory compound indexed `tenantId` discriminator fields on all tenant-owned collections.
- **Isolation Enforcement**: Tenant context is derived strictly from the authenticated user's verified JWT session (`req.user.tenantId`). The backend never trusts client-supplied tenant identifiers.
- **Boundary Separation**: Decoupled Platform Super Admin (SaaS operations, tenant provisioning, plan management) from Hospital Admin (hospital staff, patient care, billing). Hospital admins have zero platform-level privileges.
- **Affected Documents**: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/API.md`, `docs/DEVELOPMENT.md`, `docs/architecture/multi-tenancy.md`, `docs/security/tenant-isolation.md`, `docs/saas/subscriptions.md`.

---

## Issue 5: AI Operational Boundaries & Database Access

- **Status**: **RESOLVED & FINALIZED**
- **Resolution**: AI functionality is deferred exclusively to Phase 2 (Milestone 13). When implemented, AI must operate through an explicit AI Gateway with strict PII data minimization, a read-only tool allowlist, and mandatory human clinician sign-off before any draft note can be committed to the database. AI models receive zero MongoDB credentials.
- **Affected Documents**: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/milestones/M13_PHASE_2_AI_INTELLIGENCE.md`.
- **Reason**: Clinical safety and regulatory liability mandate that AI can never independently modify patient medical records without explicit physician review and approval.

---

## Issue 6: System of Record Standardization (MongoDB Atlas vs PostgreSQL/Prisma)

- **Status**: **RESOLVED & PURGED**
- **Conflict**: Early preliminary draft planning documents contained legacy references to PostgreSQL and Prisma.
- **Resolution**: MongoDB Atlas is the sole, authoritative cloud database system of record. All references to PostgreSQL and Prisma ORM have been completely purged from all specifications. All models are implemented natively in Mongoose.
- **Affected Documents**: `docs/HMS_Master_PRD_AI_Ready_Build_Plan.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`.
- **Reason**: Aligns 100% of documentation with the active, verified MongoDB Atlas deployment and test suite.
