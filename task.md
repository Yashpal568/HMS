# Hospital Management System — Master Task & Work State

## Project
Hospital Management System (HMS MedCore)

## Current Milestone
Milestone 03 — Patient Management

## Status
PLANNING COMPLETE

## Completed
- **Project Setup & Monorepo Infrastructure**: Next.js 16 (React 19), NestJS 12 (Node 22), TypeScript 5.8, Tailwind CSS v4, pnpm workspaces, ESLint, OxLint, Vitest.
- **MongoDB Atlas Integration**: Live connection to MongoDB Atlas cluster (`cluster0.u0fr4ag.mongodb.net/hms_dev`) with connection monitoring and `/api/v1/health` readiness reporting.
- **Milestone 01 — Authentication, RBAC & Security Foundation**:
  - `User`, `Role`, `Permission`, `AuditLog` Mongoose schemas.
  - Salted password hashing via `bcryptjs` (cost 12), 15-minute account lockout on 5 failed attempts.
  - JWT token issuance, HttpOnly `SameSite=lax` session cookies, Passport strategy.
  - Reusable execution guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `@RequirePermissions()`, `@Roles()`, `@CurrentUser()`.
  - Initial seed data: 9 hospital roles, 30 granular enterprise permissions, default Super Admin (`admin@hms.local`).
  - Redacted security audit logging (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`).
  - Enterprise login UI (`/login`) with error feedback and accessibility.
- **Milestone 02 — Application Shell & Dashboard**:
  - Reusable `AppShell` wrapping authenticated views and enforcing session checks.
  - Categorized `Sidebar` navigation matching `docs/DESIGN.md` with upcoming milestone notice dialogs.
  - Header bar with breadcrumbs, Atlas connection indicator, user profile dropdown, and logout trigger.
  - Reusable UI state components: `Skeleton`, `CardSkeleton`, `TableSkeleton`, `EmptyState`, `ErrorState`.
  - Backend `DashboardModule` with `GET /api/v1/dashboard` querying real user metrics, database readiness, uptime, and recent audit trail.
  - Zero-Fake-Data compliance: Clinical metrics for unbuilt modules return genuine empty states (`count: 0`).
  - Dynamic root route (`/`) redirecting authenticated users to `/dashboard` and unauthenticated to `/login`.
  - 23 unit tests + 2 e2e tests passing in `apps/api`.
  - Production build passing across all workspaces.
  - Synced to GitHub repository (`https://github.com/Yashpal568/HMS.git`).

## In Progress
None. All planning and project-control specifications are complete.

## Next Milestone
Milestone 03 — Patient Management (`docs/milestones/M03_PATIENT_MANAGEMENT.md`)

---

## Milestone Index

| # | Milestone Specification | Target Phase | Status |
|---|---|---|---|
| 01 | [M01_AUTHENTICATION_RBAC_SECURITY.md](file:///e:/FluBird/docs/milestones/M01_AUTHENTICATION_RBAC_SECURITY.md) | Phase 1 Core | **COMPLETE** |
| 02 | [M02_APPLICATION_SHELL_DASHBOARD.md](file:///e:/FluBird/docs/milestones/M02_APPLICATION_SHELL_DASHBOARD.md) | Phase 1 Core | **COMPLETE** |
| 03 | [M03_PATIENT_MANAGEMENT.md](file:///e:/FluBird/docs/milestones/M03_PATIENT_MANAGEMENT.md) | Phase 1 Core | **NOT STARTED (NEXT)** |
| 04 | [M04_APPOINTMENTS_OPD_QUEUE.md](file:///e:/FluBird/docs/milestones/M04_APPOINTMENTS_OPD_QUEUE.md) | Phase 1 Core | **NOT STARTED** |
| 05 | [M05_EMR_CLINICAL_CONSULTATION.md](file:///e:/FluBird/docs/milestones/M05_EMR_CLINICAL_CONSULTATION.md) | Phase 1 Core | **NOT STARTED** |
| 06 | [M06_IPD_BED_MANAGEMENT.md](file:///e:/FluBird/docs/milestones/M06_IPD_BED_MANAGEMENT.md) | Phase 1 Core | **NOT STARTED** |
| 07 | [M07_LABORATORY_INFORMATION_SYSTEM.md](file:///e:/FluBird/docs/milestones/M07_LABORATORY_INFORMATION_SYSTEM.md) | Phase 1 Core | **NOT STARTED** |
| 08 | [M08_PHARMACY_DISPENSING.md](file:///e:/FluBird/docs/milestones/M08_PHARMACY_DISPENSING.md) | Phase 1 Core | **NOT STARTED** |
| 09 | [M09_INVENTORY_PROCUREMENT.md](file:///e:/FluBird/docs/milestones/M09_INVENTORY_PROCUREMENT.md) | Phase 1 Core | **NOT STARTED** |
| 10 | [M10_BILLING_INVOICING_PAYMENTS.md](file:///e:/FluBird/docs/milestones/M10_BILLING_INVOICING_PAYMENTS.md) | Phase 1 Core | **NOT STARTED** |
| 11 | [M11_REPORTS_ANALYTICS_AUDIT_CENTER.md](file:///e:/FluBird/docs/milestones/M11_REPORTS_ANALYTICS_AUDIT_CENTER.md) | Phase 1 Core | **NOT STARTED** |
| 12 | [M12_PRODUCTION_HARDENING_SECURITY_BACKUP.md](file:///e:/FluBird/docs/milestones/M12_PRODUCTION_HARDENING_SECURITY_BACKUP.md) | Phase 1 Core | **NOT STARTED** |
| 13 | [M13_PHASE_2_AI_INTELLIGENCE.md](file:///e:/FluBird/docs/milestones/M13_PHASE_2_AI_INTELLIGENCE.md) | Phase 2 AI | **NOT STARTED** |
| 14 | [M14_ELECTRON_DESKTOP_PACKAGING.md](file:///e:/FluBird/docs/milestones/M14_ELECTRON_DESKTOP_PACKAGING.md) | Phase 2 Desktop | **NOT STARTED** |

---

## Current Acceptance Criteria (For Milestone 03 — Patient Management)
- [ ] Patient Mongoose schema created conforming strictly to `docs/DATABASE.md`.
- [ ] Sequential, collision-free UHID generation (`UHID-YYYY-XXXXXX`).
- [ ] Registration form validates demographics, contacts, emergency contact, and allergies.
- [ ] Duplicate detection flags matching phone + date of birth.
- [ ] Patient directory lists, searches, and paginates records.
- [ ] Patient profile view displays clinical header banner with allergy warnings.
- [ ] Backend API endpoints protected by JWT and RBAC (`patients.create`, `patients.read`, `patients.update`).
- [ ] Audit logs recorded for patient operations without leaking secrets.
- [ ] Automated unit and API integration tests pass.
- [ ] Monorepo build, lint, and typecheck pass with zero errors.

---

## Important Constraints & Rules
- **Rule 1**: Operate strictly on the assigned milestone. NEVER begin Milestone 04 or any other milestone until Milestone 03 is complete and verified.
- **Rule 2**: Read `AGENTS.md` and `docs/milestones/M03_PATIENT_MANAGEMENT.md` before coding.
- **Rule 3**: Never invent clinical fields or workflows. Follow `docs/DATABASE.md` and `docs/PRD.md`.
- **Rule 4**: Frontend must NEVER connect directly to MongoDB Atlas. Always query through NestJS REST API.
- **Rule 5**: Never use fake patient statistics or numbers.
- **Rule 6**: STOP after completing Milestone 03. Do NOT automatically proceed to Milestone 04.
