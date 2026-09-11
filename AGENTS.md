# AGENTS.md — Permanent Operating Instructions for AI Coding Agent

This is a production-oriented Hospital Management System (HMS).
This document is the authoritative, binding operational directive for every AI coding session on this repository.

---

## 1. Core Operating Principles

1. **Autonomous Development with Strict Boundaries**:
   - The user has granted full permissions for proactive execution: run commands, install needed dependencies, run builds, execute tests, and repair issues without intermediate confirmation prompts.
   - However, you must operate **STRICTLY WITHIN THE ASSIGNED CURRENT MILESTONE**.
   - NEVER implement features belonging to future milestones.
   - NEVER invent hospital workflows or business requirements not specified in the documentation.
   - NEVER fabricate hospital data (e.g. fake patient stats, appointment counts, or revenue). Real data or authentic empty states only.

2. **System Architecture Hierarchy**:
   - Priority Order:
     ```text
     Security > Architecture > Database Integrity > PRD > Design System > Convenience
     ```
   - **Frontend MUST NEVER connect directly to MongoDB**:
     ```text
     Next.js Web / Electron Shell
                ↓
         NestJS REST API
                ↓
     Authentication & RBAC Guards
                ↓
          Data Access Layer
                ↓
          MongoDB Atlas
     ```
   - All external requests must be authenticated, authorized, and validated.

3. **Protection of Sensitive Medical Data**:
   - Passwords must always be hashed with bcryptjs (cost factor 12) and never stored or returned in plaintext.
   - Password hashes and secrets must never be exposed to frontend or logged in audit records.
   - Security-sensitive actions must be audited in the `audit_logs` collection with sanitized metadata.
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
- Read `task.md` (root) and `docs/TASK.md` to identify the **Current Milestone**.
- Read the specific milestone specification in `docs/milestones/Mxx_[NAME].md`.
- Read the relevant architectural source of truth:
  - `docs/PRD.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATABASE.md`
  - `docs/BACKEND.md`
  - `docs/FRONTEND.md`
  - `docs/DESIGN.md`
  - `docs/SECURITY.md`
  - `docs/API.md`
  - `docs/DEVELOPMENT.md`

### Step 2: UNDERSTAND
- Confirm the explicit boundaries: What is IN SCOPE vs OUT OF SCOPE for this milestone.
- Review existing components, schemas, and services to reuse rather than recreate.
- Understand the data structures and DTO validation rules.

### Step 3: PLAN
- Outline the minimal, clean changes required across backend, database, and frontend.
- Ensure no future milestone features are inadvertently pulled in.

### Step 4: IMPLEMENT
- Implement in small, verifiable steps.
- Backend: Follow `Controller -> Guard/Decorator -> Service -> Mongoose Model`.
- Frontend: Follow `AppShell -> Centralized apiClient -> UI Component -> Page`.
- Enforce validation using `class-validator` and `zod`.
- Enforce authorization using `@RequirePermissions()` and `@Roles()`.

### Step 5: TEST
- Add and run automated unit tests (`vitest run`).
- Add and run end-to-end API tests (`vitest run --config ./vitest.config.e2e.ts`).
- Execute monorepo typecheck: `pnpm typecheck` (zero TypeScript errors).
- Execute monorepo linter: `pnpm lint` (zero warnings, zero errors).
- Execute monorepo production build: `pnpm build` (zero build errors).

### Step 6: DOCUMENT
- Update `walkthrough.md` in the artifact directory with technical details, tested flows, and validation outputs.
- Document any non-obvious design choices or verified assumptions.

### Step 7: UPDATE TASK
- Update `task.md` (and `docs/TASK.md`):
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
- ❌ DO NOT invent requirements or clinical workflows.
- ❌ DO NOT create fake numbers or mock statistics in production dashboard widgets.
- ❌ DO NOT connect frontend or AI directly to MongoDB.
- ❌ DO NOT introduce unapproved npm packages without technical justification.
- ❌ DO NOT commit `.env` or sensitive credentials to Git.
- ❌ DO NOT claim regulatory certifications (HIPAA, GDPR, ISO 27001) without verified legal sign-off.
- ❌ DO NOT start the next milestone automatically after completing the current one.
