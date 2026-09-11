# Hospital Management System — Master Planning Consistency & Architecture Issues

This document records architectural ambiguities, cross-document discrepancies, and recommended resolutions identified during the master development planning audit.

---

## Issue 1: Password Hashing Algorithm Specification

- **Conflict**: 
  `docs/PRD.md` (Section 8) mentions *"Argon2id if application-managed passwords are used"*, whereas `docs/BACKEND.md` and the existing active backend implementation utilize `bcryptjs` (salt cost factor 12).
- **Affected Documents**: 
  `docs/PRD.md`, `docs/BACKEND.md`, `docs/SECURITY.md`, `apps/api/src/auth/auth.service.ts`.
- **Recommended Resolution**: 
  Standardize on `bcryptjs` (cost 12) for Phase 1 development.
- **Reason**: 
  `bcryptjs` is an industry-standard, production-proven password hashing algorithm that runs reliably across all operating systems (Windows, Linux, macOS) in Node 22 without requiring native C++ build toolchains (`node-gyp`, Python, Visual Studio build tools) that frequently fail in automated cross-platform developer environments. If Argon2id is strictly mandated by hospital compliance, it can be swapped behind the existing `AuthService` abstraction during production hardening (Milestone 12).

---

## Issue 2: Milestone Granularity & Roadmap Alignment

- **Conflict**: 
  The legacy `docs/IMPLEMENTATION_ROADMAP.md` grouped Patient Registration, Doctor Schedules, Appointments, OPD Queue, Doctor Consultation, Prescriptions, and OPD Billing into a single massive milestone labeled "Milestone 2 — Patient + OPD". Conversely, the active project prompts executed Milestone 1 as *Authentication & RBAC* and Milestone 2 as *Application Shell & Dashboard*, directing Milestone 3 specifically to *Patient Management*.
- **Affected Documents**: 
  `docs/IMPLEMENTATION_ROADMAP.md`, `docs/PRD.md`, `docs/TASK.md`, `docs/milestones/`.
- **Recommended Resolution**: 
  Adopt the granular 14-milestone plan in `docs/milestones/` where Patient Management (M03), Appointments & OPD (M04), EMR Consultation (M05), IPD (M06), Laboratory (M07), Pharmacy (M08), Inventory (M09), and Billing (M10) are discrete milestones.
- **Reason**: 
  Healthcare modules have intricate data models, regulatory requirements, and user interfaces. Bundling patient registration with clinical consultations, prescriptions, and billing into a single release introduces high cognitive load, risks untested edge cases, violates the user directive to avoid monolithic commits, and prevents rigorous end-to-end verification.

---

## Issue 3: Clinical & Financial Data Retention Period

- **Conflict**: 
  `docs/DATABASE.md` (Section 10) leaves data retention as an open question (*"Retention is an OPEN QUESTION and must be approved based on law, hospital policy and operational requirements"*).
- **Affected Documents**: 
  `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/milestones/M11_REPORTS_ANALYTICS_AUDIT_CENTER.md`, `docs/milestones/M12_PRODUCTION_HARDENING_SECURITY_BACKUP.md`.
- **Recommended Resolution**: 
  Configure operational collections (`patients`, `encounters`, `invoices`, `audit_logs`) without automatic TTL deletion. Retain all records indefinitely during development and staging. Implement configurable retention rules during Milestone 12 based on the target jurisdiction's health records law (e.g. 7 years for adult medical records, permanent for master patient index).
- **Reason**: 
  Prematurely purging clinical or audit history during active development could result in unexpected test failures and non-reproducible states.

---

## Issue 4: SaaS Tenant Model Strategy

- **Conflict**: 
  `docs/ARCHITECTURE.md` (Section 5) states: *"Candidate models: shared collections + tenantId, or isolated databases/collections. Choose after scale/security requirements are confirmed."*
- **Affected Documents**: 
  `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/BACKEND.md`.
- **Recommended Resolution**: 
  Use shared collections with mandatory `hospitalId` and `branchId` scoping on all domain entities for Phase 1. Isolate tenant access strictly through backend service queries and RBAC guards.
- **Reason**: 
  Shared collections with indexed `hospitalId` are substantially simpler to manage, migrate, and test in a modular monolith running on a single MongoDB Atlas cluster, while preserving a clean migration path to database-per-tenant if enterprise multi-hospital isolation is required in Phase 2.

---

## Issue 5: AI Operational Boundaries & Database Access

- **Conflict**: 
  `docs/PRD.md` Section 3 lists potential Phase 2 AI assistants (Reception assistant, Doctor copilot, Lab assistant), while `docs/ARCHITECTURE.md` Section 4 and `docs/DATABASE.md` mandate that AI receives no direct database credentials.
- **Affected Documents**: 
  `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/milestones/M13_PHASE_2_AI_INTELLIGENCE.md`.
- **Recommended Resolution**: 
  All AI functionality is deferred exclusively to Milestone 13. When implemented, AI must operate through an explicit AI Gateway with strict PII data minimization, a read-only tool allowlist, and mandatory human clinician sign-off before any draft note can be committed to the database.
- **Reason**: 
  Clinical safety and regulatory liability mandate that AI can never independently modify patient medical records without explicit physician review and approval.
