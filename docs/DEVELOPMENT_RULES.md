# Hospital Management System — Permanent Development Rules & Protocols

**SOURCE-OF-TRUTH OWNER**: `docs/DEVELOPMENT_RULES.md` (ENGINEERING PROCESS)  
**Classification**: Authoritative  
**Audience**: AI Coding Agents & Software Engineers  
**Status**: Authoritative, Non-Negotiable Operational Protocols  

---

## 1. Explicit Source-of-Truth Ownership & Hierarchy

Every requirement, architectural design, and operational constraint in this repository has an **explicit, designated owner**. Documents are NOT equal in authority. When two documents conflict, the higher-ranking owner in the hierarchy below strictly prevails.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOURCE-OF-TRUTH OWNERSHIP MAP                        │
├─────────────────────┬─────────────────────────────┬─────────────────────────┤
│ TOPIC               │ SOURCE OF TRUTH             │ CLASSIFICATION          │
├─────────────────────┼─────────────────────────────┼─────────────────────────┤
│ Product requirements│ `docs/PRD.md`               │ Authoritative (Product) │
│ System architecture │ `docs/ARCHITECTURE.md`      │ Authoritative (System)  │
│ Database & schemas  │ `docs/DATABASE.md`          │ Authoritative (Data)    │
│ Security & RBAC     │ `docs/SECURITY.md`          │ Authoritative (Security)│
│ Frontend engineering│ `docs/FRONTEND.md`          │ Authoritative (Frontend)│
│ Backend engineering │ `docs/BACKEND.md`           │ Authoritative (Backend) │
│ UI/UX & design      │ `docs/DESIGN.md`            │ Authoritative (Design)  │
│ SaaS business model │ `docs/SAAS.md`              │ Authoritative (SaaS)    │
│ Patient experience  │ `docs/PATIENT_PLATFORM.md`  │ Authoritative (Patient) │
│ AI & Agent systems  │ `docs/AI_ARCHITECTURE.md`   │ Authoritative (AI)      │
│ Deployment & infra  │ `docs/DEPLOYMENT.md`        │ Authoritative (Infra)   │
│ Engineering process │ `docs/DEVELOPMENT_RULES.md` │ Authoritative (Process) │
│ Development roadmap │ `docs/MILESTONES.md`        │ Authoritative (Roadmap) │
│ Architectural history│ `docs/DECISIONS.md`        │ Historical Log          │
│ Current work state  │ `task.md`                   │ Operational Tracker     │
│ Developer onboarding│ `README.md`                 │ Reference & Entry Point │
└─────────────────────┴─────────────────────────────┴─────────────────────────┘
```

### Detailed Ownership Responsibilities

1. **`docs/PRD.md` — OWNER: PRODUCT REQUIREMENTS**
   - Authoritative for: Product vision, product scope, user types, functional requirements, business workflows, feature priorities, Phase 1 vs Phase 2 boundaries, and acceptance criteria.
   - Low-level technical decisions must not be placed here unless they directly define product requirements.

2. **`docs/ARCHITECTURE.md` — OWNER: SYSTEM ARCHITECTURE**
   - Authoritative for: Application boundaries (`apps/server`, `apps/hms-client`, `apps/patient-app`, `apps/super-admin`), backend/frontend architecture, modular monolith strategy, inter-application communication, service boundaries, and structural constraints.
   - If another document conflicts regarding application boundaries or system topology, `ARCHITECTURE.md` wins.

3. **`docs/DATABASE.md` — OWNER: DATA MODEL**
   - Authoritative for: MongoDB Atlas architecture, collection data dictionary (all 26 collections), entity relationships, indexes, tenant scoping (`tenantId`), schema constraints, lifecycle states, and MongoDB vs. Redis responsibilities.
   - No frontend or backend document may independently invent a conflicting database model.

4. **`docs/SECURITY.md` — OWNER: SECURITY**
   - Authoritative for: Authentication security, authorization, RBAC, tenant isolation invariants, secrets handling, encryption at rest/in transit, session tokens, API security, audit logging, sensitive data handling, and AI security boundaries.
   - Security requirements CANNOT be weakened by another document for implementation convenience.

5. **`docs/FRONTEND.md` — OWNER: FRONTEND ENGINEERING**
   - Authoritative for: Frontend application conventions, routing, layouts, UI architecture, state management, API consumption patterns, shared packages, responsive behavior, and accessibility.
   - Does NOT override PRD product requirements or backend security rules.

6. **`docs/BACKEND.md` — OWNER: BACKEND ENGINEERING**
   - Authoritative for: NestJS conventions, module organization, controllers, services, DTOs, guards, middleware, API conventions, error envelopes, backend testing, and background workers.
   - Does NOT override `DATABASE.md` or `SECURITY.md`.

7. **`docs/DESIGN.md` — OWNER: UI/UX DESIGN**
   - Authoritative for: Visual language, design system, typography, spacing, components, layout principles, accessibility presentation, dashboard design, and patient application styling.
   - Design choices must never alter functional requirements or clinical data accuracy.

8. **`docs/SAAS.md` — OWNER: SAAS BUSINESS MODEL**
   - Authoritative for: Tenants, commercial subscription plans, feature entitlements, usage limits, trial periods, SaaS billing, tenant lifecycle, and platform-level SaaS behavior.

9. **`docs/PATIENT_PLATFORM.md` — OWNER: PATIENT EXPERIENCE**
   - Authoritative for: Patient application, hospital discovery, doctor discovery, appointment booking wizard, live OPD queue experience, patient records access (PHR), notifications, and patient-facing workflows.
   - Does NOT override security or database ownership rules.

10. **`docs/AI_ARCHITECTURE.md` — OWNER: AI/AGENT ARCHITECTURE**
    - Authoritative for: AI Gateway, agent orchestrator, agent tools, agent permissions, safety filters, human approval protocols, auditability, and Phase 2 implementation roadmaps.
    - AI architecture must NEVER override `SECURITY.md` or grant direct database access.

11. **`docs/DEPLOYMENT.md` — OWNER: DEPLOYMENT & INFRASTRUCTURE**
    - Authoritative for: Vercel edge deployment, Render container hosting, Cloudflare edge, MongoDB Atlas, Redis hosting, Dockerfiles, CI/CD pipelines, and environment configuration.

12. **`docs/DEVELOPMENT_RULES.md` — OWNER: ENGINEERING PROCESS**
    - Authoritative for: How Antigravity operates, coding workflows, documentation standards, testing requirements, dependency rules, scope control, anti-hallucination rules, and change management.

13. **`docs/MILESTONES.md` — OWNER: DEVELOPMENT ROADMAP**
    - Authoritative for: Milestone definitions (M00–M13), milestone ordering, scope boundaries, phase ordering, and completion criteria.
    - Defines **WHEN** features are built; does NOT redefine **WHAT** the product is.

14. **`docs/DECISIONS.md` — OWNER: ARCHITECTURAL DECISION HISTORY**
    - Historical decision records answering "Why did we choose this?".
    - Does NOT replace active architecture documents. When a decision changes:
      1. Update `DECISIONS.md`
      2. Update the relevant authoritative document
      3. Update `task.md` if the current milestone is affected.

15. **`task.md` — OWNER: CURRENT EXECUTION STATE**
    - Authoritative for: Current milestone, completed deliverables, in-progress tasks, blocked work, and immediate next action.
    - Must remain concise; must NOT become another PRD.

16. **`README.md` — OWNER: DEVELOPER ENTRY POINT**
    - Onboarding and summary document linking developers to authoritative sources.
    - Must NOT become a competing source of truth. In case of conflict, the detailed authoritative document wins.

---

## 2. Document Classification Header Standard

Every documentation file created or updated in this repository MUST declare its ownership and classification at the top:

```markdown
**SOURCE-OF-TRUTH OWNER**: `docs/<filename>.md` (<TOPIC>)  
**Classification**: Authoritative | Supporting | Historical | Reference  
```

- **Authoritative**: Primary source of truth for its designated domain.
- **Supporting**: Specialized supplementary technical guide (e.g. `docs/API.md`, `docs/DEVELOPMENT.md`).
- **Historical**: Decision records, audit logs, or previous milestone walkthroughs (e.g. `docs/DECISIONS.md`).
- **Reference**: Onboarding materials, entry points, or third-party references (e.g. `README.md`).

---

## 3. Source-of-Truth Conflict Resolution Protocol

When encountering conflicting specifications across documents, follow this mandatory 7-step resolution process:

```text
Step 1: Identify which documents disagree.
  ↓
Step 2: Determine the domain owner using the Ownership Table.
  ↓
Step 3: The authoritative owner strictly wins.
  ↓
Step 4: DO NOT silently choose one version and continue.
  ↓
Step 5: If the conflict represents an actual architectural/product change, record the ADR in docs/DECISIONS.md.
  ↓
Step 6: Update the outdated document so duplicate/conflicting information is removed.
  ↓
Step 7: Continue implementation only when the source of truth is unambiguous.
```

---

## 4. No Duplicate Requirements Standard

Do NOT duplicate detailed requirements across multiple files. Distribute responsibilities according to domain roles:

- **`PRD.md`** ➔ Defines **WHAT** the product does.
- **`ARCHITECTURE.md`** ➔ Defines **HOW** the system is structured.
- **`DATABASE.md`** ➔ Defines **HOW DATA** is structured and indexed.
- **`SECURITY.md`** ➔ Defines **HOW DATA & ACCESS** are protected.
- **`MILESTONES.md`** ➔ Defines **WHEN** features are built.
- **`task.md`** ➔ Defines **WHAT WE ARE DOING NOW**.

---

## 5. Change Management Protocol

Whenever an implementation requires modifying an architectural or database decision:
1. Identify the affected source-of-truth document.
2. Determine whether the change is intentional.
3. Update the relevant authoritative document first.
4. Add a new decision record to `docs/DECISIONS.md`.
5. Update dependent documentation (`task.md`, `ARCHITECTURE.md`, etc.).
6. Then and only then, implement the code changes.
7. **Never allow code to silently diverge from documented architecture.**

---

## 6. Anti-Hallucination Protocols

If information is NOT present in the authoritative source-of-truth documents:
1. **DO NOT invent it.**
2. Inspect existing codebase schemas and services.
3. Inspect related module specifications.
4. If still unresolved, explicitly document the assumption or request clarification.

**Prohibited Fabrications**:
- Invented clinical workflows or medical rules.
- Invented API endpoints or DTO parameters.
- Invented database collections, fields, or relations.
- Invented RBAC permissions or role hierarchies.
- Invented subscription limits or commercial pricing.
- Invented autonomous AI capabilities.

---

## 7. Implementation Traceability Chain

Every code commit and feature implementation must maintain an unbroken chain of traceability:

```text
PRD Requirement (WHAT)
       │
       ▼
Architecture Decision (HOW STRUCTURED)
       │
       ▼
Database / Security Model (HOW DATA / ACCESS IS CONTROLLED)
       │
       ▼
Milestone Roadmap (WHEN IN SEQUENCE)
       │
       ▼
task.md Execution Task (WHAT IS ACTIVE NOW)
       │
       ▼
Code Implementation (apps/server, apps/hms-client, apps/patient-app, apps/super-admin)
       │
       ▼
Automated Tests & Typecheck (VERIFICATION)
```

---

## 8. The 20 Permanent Development Rules

1. **Read `docs/PRD.md`**: Confirm product goals and module functional scopes before writing code.
2. **Read `docs/ARCHITECTURE.md`**: Align with the established 4-application monorepo topology.
3. **Read `docs/DATABASE.md` for Database Work**: Adhere to the 26 collections, schema patterns, compound indexes, and `Decimal128` financial precision.
4. **Read `docs/SECURITY.md` for Security Work**: Enforce zero-trust tenant context extraction (`req.user.tenantId`), RBAC guards, and `bcryptjs` (work factor 12).
5. **Read Relevant Domain Documentation**: Review `PATIENT_PLATFORM.md`, `SAAS.md`, or `AI_ARCHITECTURE.md` before coding.
6. **Never Invent Requirements**: Do not fabricate unapproved clinical workflows, pricing, or rules.
7. **Never Duplicate Existing Applications or Modules**: Reuse existing code in `packages/ui`, `packages/auth`, and `apps/server/src/`.
8. **Never Repeat Completed Setup Work**: Do not reinitialize packages, install redundant libraries, or restart setup cycles.
9. **Never Silently Change Architecture**: Document all architectural modifications in `docs/DECISIONS.md`.
10. **Never Bypass Tenant Isolation**: All tenant queries must include `{ tenantId: user.tenantId }`. IDOR probes return `404 Not Found`.
11. **Never Bypass RBAC**: Every protected route must be guarded by `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard`.
12. **Never Expose MongoDB to Frontend Applications**: Frontends, mobile clients, and AI agents have zero direct DB connections.
13. **Never Give AI Unrestricted Database Access**: AI is deferred to Phase 2 and operates exclusively via bounded tools inheriting caller RBAC.
14. **Keep Work Inside Current Milestone**: Never build features belonging to upcoming milestones prematurely.
15. **Test Changes**: Write and run unit tests (`vitest run`) and e2e tests for new business logic.
16. **Typecheck**: Verify that `pnpm typecheck` passes with zero errors across all 4 applications and packages.
17. **Lint**: Verify that `pnpm lint` passes with zero warnings and zero errors.
18. **Build Where Applicable**: Confirm production builds pass (`pnpm build`).
19. **Update Documentation When Architecture Changes**: Ensure all changes are reflected in authoritative docs and `task.md`.
20. **Report Exactly What Was Changed**: Deliver transparent reports detailing documents updated, folders created, and next milestone targets.

---

## 9. Mandatory Step-by-Step Task Lifecycle

```text
READ (Specs & Milestones)
  ↓
UNDERSTAND (Boundaries & Constraints)
  ↓
PLAN (Verify existing code & plan minimal edits)
  ↓
IMPLEMENT (Modular code adhering to RBAC & Tenant Scoping)
  ↓
TEST (Unit tests, typecheck, lint, build)
  ↓
DOCUMENT (Update walkthrough.md and architecture docs)
  ↓
UPDATE TASK (Update task.md execution tracker)
  ↓
STOP (Awaiting user instructions; do NOT automatically start next milestone)
```
