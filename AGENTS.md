# AGENTS.md — Permanent Operating Instructions for AI Coding Agent

This is a production-oriented Multi-Tenant Software-as-a-Service (SaaS) Hospital Management System (HMS MedCore) & Patient Healthcare Platform.
This document is the authoritative, binding operational directive for every AI coding session on this repository.

---

## 1. Core Operating Principles

1. **Multi-Tenant SaaS Foundation & Four Applications**:
   - The system is built as a **Multi-Tenant SaaS Product** hosted on MongoDB Atlas.
   - The repository strictly maintains four distinct applications:
     1. `apps/server/`: The single canonical NestJS REST API shared by all frontends.
     2. `apps/hms-client/`: Dedicated Hospital & Doctor workstation web app (Next.js).
     3. `apps/patient-app/`: Dedicated mobile-first Patient Healthcare platform (Next.js).
     4. `apps/super-admin/`: Dedicated SaaS Platform Owner console (Next.js).
   - **Tenant isolation is mandatory** at the backend data access layer.
   - **Never trust client-provided tenant identifiers**: The backend must derive `tenantId` exclusively from the cryptographically verified JWT session context (`req.user.tenantId`).
   - **Never perform unscoped tenant database queries**: All queries against tenant-owned collections must be scoped by `{ tenantId }`.
   - **Never expose one tenant's data to another tenant**: Cross-tenant data leaks are Severity-0 (P0) critical security failures.
   - **Platform and Hospital administrative privileges are strictly separate**: Platform Super Admins manage tenants and plans with zero clinical access; Hospital Admins manage their own hospital with zero platform privileges and zero cross-hospital access.

2. **Autonomous Development with Strict Boundaries**:
   - The user has granted full permissions for proactive execution: run commands, install needed dependencies, run builds, execute tests, and repair issues without intermediate confirmation prompts.
   - However, you must operate **STRICTLY WITHIN THE ASSIGNED CURRENT MILESTONE**.
   - NEVER implement features belonging to future milestones.
   - NEVER invent hospital workflows or business requirements not specified in the documentation.
   - NEVER fabricate hospital data (e.g. fake patient stats, appointment counts, or revenue). Real data or authentic empty states only.
   - NEVER invent pricing, subscription limits, or clinical rules.
   - NEVER start the next milestone automatically after completing the current one. Await explicit instruction.

3. **System Architecture Hierarchy**:
   - Priority Order:
     ```text
     Tenant Isolation > Security > Architecture > Database Integrity > PRD > Design System > Convenience
     ```
   - **Frontends, Electron, and AI MUST NEVER connect directly to MongoDB Atlas**:
     ```text
     apps/hms-client | apps/patient-app | apps/super-admin
                           │
                           ▼
                 apps/server (NestJS REST API)
                           │
                 Authentication & Tenant Resolution (req.user.tenantId)
                           │
                       RBAC Guards
                           │
                 Tenant-Scoped Service Layer
                           │
                 Data Access Layer ({ tenantId: user.tenantId, ... })
                           │
                      MongoDB Atlas
     ```
   - All external requests must be authenticated, tenant-resolved, authorized, and validated.
   - **MongoDB Atlas is the cloud system of record**: Do not introduce PostgreSQL or Prisma without explicit architectural approval.
   - **AI is Phase 2**: The architecture is AI-ready via an AI Gateway, but AI models are strictly deferred to Phase 2.
   - **Electron is later**: Web-first SaaS primary; Electron desktop packaging is deferred to Phase 2 and will reuse the web app and cloud API.

4. **Protection of Sensitive Medical Data**:
   - Passwords must always be hashed with bcryptjs (cost factor 12) and never stored or returned in plaintext.
   - Password hashes and secrets must never be exposed to frontend or logged in audit records.
   - Security-sensitive actions must be audited in the `audit_logs` collection with sanitized metadata.
   - Cross-tenant IDOR probes must return uniform `404 Not Found` to prevent entity enumeration across hospitals.
   - Never commit environment files (`.env`) or cloud connection strings to source control.

---

## 2. Mandatory Development Cycle

Every development session must strictly follow this sequential workflow:

```text
READ
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
TEST
  ↓
DOCUMENT
  ↓
UPDATE TASK
  ↓
STOP
```

### Step 1: READ
- Read `AGENTS.md` (this file).
- Read `task.md` (root) to identify the **Current Milestone** (OWNER: Current Execution State).
- Read the specific milestone specification in `docs/MILESTONES.md` (OWNER: Development Roadmap).
- Consult the authoritative Source-of-Truth owners per `docs/DEVELOPMENT_RULES.md`:
  1. `docs/PRD.md` — Product Requirements
  2. `docs/ARCHITECTURE.md` — System Architecture
  3. `docs/DATABASE.md` — Data Model & Schemas
  4. `docs/SECURITY.md` — Security & RBAC
  5. `docs/FRONTEND.md` — Frontend Engineering
  6. `docs/BACKEND.md` — Backend Engineering
  7. `docs/DESIGN.md` — UI/UX Design
  8. `docs/SAAS.md` — SaaS Business Model
  9. `docs/PATIENT_PLATFORM.md` — Patient Experience
  10. `docs/AI_ARCHITECTURE.md` — AI/Agent Architecture
  11. `docs/DEPLOYMENT.md` — Deployment & Infrastructure
  12. `docs/DEVELOPMENT_RULES.md` — Engineering Process
  13. `docs/MILESTONES.md` — Development Roadmap
  14. `docs/DECISIONS.md` — Architectural Decision History
- **Conflict Rule**: If two documents conflict, the higher-ranking owner strictly wins. Do not proceed with ambiguity.

### Step 2: UNDERSTAND
- Confirm explicit boundaries: What is IN SCOPE vs OUT OF SCOPE for this milestone.
- Review existing components, schemas, and services to reuse rather than recreate.
- Understand tenant scoping, data structures, and DTO validation rules.

### Step 3: PLAN
- Outline minimal, clean changes required across backend, database, and frontend.
- Ensure no future milestone features or unapproved packages are pulled in.

### Step 4: IMPLEMENT
- Implement in small, verifiable steps.
- Backend: Follow `Controller -> Guard/Decorator -> Service -> Mongoose Model with { tenantId }`.
- Frontend: Follow `AppShell -> Centralized apiClient -> UI Component -> Page`.
- Enforce validation using `class-validator` and `zod`.
- Enforce authorization using `@RequirePermissions()` and `@Roles()`.

### Step 5: TEST
- Add and run automated unit tests (`vitest run`).
- Add and run end-to-end API tests (`vitest run --config ./vitest.config.e2e.ts`).
- Execute tenant-isolation tests for tenant-aware features.
- Execute monorepo typecheck: `pnpm typecheck` (zero TypeScript errors).
- Execute monorepo linter: `pnpm lint` (zero warnings, zero errors).
- Execute monorepo production build: `pnpm build` (zero build errors).

### Step 6: DOCUMENT
- Update `walkthrough.md` in the artifact directory with technical details, tested flows, and validation outputs.
- Document any non-obvious design choices or verified assumptions in `docs/DECISIONS.md`.

### Step 7: UPDATE TASK
- Update `task.md`:
  - Mark the completed milestone as `COMPLETE`.
  - Advance the **Current Milestone** to the next milestone in sequence.
  - Update completed checklist and milestone index.

### Step 8: STOP
- Output the required final report.
- **STOP EXECUTION IMMEDIATELY**.
- **DO NOT AUTOMATICALLY BEGIN THE NEXT MILESTONE**.
- Await the user's explicit instruction before touching the next milestone.

---

## 3. Strict Prohibitions

- ❌ DO NOT start building before reading the milestone specification.
- ❌ DO NOT implement features belonging to upcoming milestones.
- ❌ DO NOT invent requirements, clinical workflows, or pricing rules.
- ❌ DO NOT trust client-supplied `tenantId` in request bodies, query params, or headers.
- ❌ DO NOT execute unscoped queries on tenant collections.
- ❌ DO NOT create fake numbers or mock statistics in production dashboard widgets.
- ❌ DO NOT connect frontend, Electron, or AI directly to MongoDB.
- ❌ DO NOT introduce PostgreSQL or Prisma.
- ❌ DO NOT introduce unapproved npm packages without technical justification.
- ❌ DO NOT commit `.env` or sensitive credentials to Git.
- ❌ DO NOT claim regulatory certifications (HIPAA, GDPR, ISO 27001) without verified legal sign-off.
- ❌ DO NOT start the next milestone automatically after completing the current one.
