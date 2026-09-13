# Antigravity IDE — Mandatory HMS Build Rules

## Mission
Implement the Multi-Tenant SaaS Hospital Management System (HMS MedCore) from approved specifications without hallucinating requirements.

## Read First
Before coding, read:
- PRD.md
- FRONTEND.md
- BACKEND.md
- DATABASE.md
- ARCHITECTURE.md
- DESIGN.md
- SECURITY.md
- API.md
- DEVELOPMENT.md
- docs/architecture/multi-tenancy.md
- docs/security/tenant-isolation.md
- docs/saas/subscriptions.md
- task.md

## Multi-Tenant SaaS Rules
1. **Strict Tenant Isolation**: All tenant-owned records must be scoped server-side using `{ tenantId }`.
2. **Never Trust Client Tenant Identifiers**: The backend derives `tenantId` exclusively from the verified JWT session (`req.user.tenantId`). Never accept `tenantId` from client request bodies, queries, or custom headers.
3. **Zero Unscoped Queries**: Never call `.find()`, `.findOne()`, or update queries on tenant-owned models without `{ tenantId }`.
4. **Platform vs Hospital Separation**: Platform Super Admins manage SaaS subscriptions and tenants with zero clinical access; Hospital Admins manage their hospital with zero platform privileges and zero cross-hospital access.
5. **MongoDB Atlas is System of Record**: No PostgreSQL or Prisma.
6. **AI is Phase 2**: AI Gateway via controlled APIs only; zero direct database access.
7. **Electron is Later**: Web-first SaaS primary; Electron desktop packaging is deferred to Phase 2 and reuses the web app and cloud API.

## No Silent Assumptions
If unclear:
```text
OPEN QUESTION:
...

WHY IT MATTERS:
...

OPTIONS:
A. ...
B. ...

WAITING FOR APPROVAL: YES
```

## Build in Small Milestones
Follow the sequential milestone roadmap in `docs/milestones/`. Never generate the entire production system in one step.

## Feature Completion
A screen is NOT a complete feature. Complete means:
- frontend UI
- backend REST API
- database schema with compound indexed `tenantId`
- input validation via DTO pipes
- tenant-aware authorization & RBAC guards
- audit logging
- automated unit and tenant-isolation tests
- error/loading/empty states
- documentation

## Never Invent
Do not invent:
- hospital policy
- clinical protocols
- medicine dosages
- reference ranges
- insurance rules
- permissions
- pricing or subscription limits
- external APIs or credentials
- compliance certifications
- workflows

## Security
Never expose MongoDB Atlas directly to the browser, Electron, or AI. Never put secrets in client code or source control. Never create bypass accounts. Never disable auth to make development easier. Never log credentials, tokens, or sensitive medical records.

## Database
Do not duplicate concepts into multiple collections without an approved reason. Do not manually alter production data. Do not add random indexes. Keep schema and index changes version-controlled.

## Dependencies
Before adding a package, explain its purpose and why an existing package cannot be reused.

## Clinical Safety
Phase 1 must not autonomously diagnose, prescribe, recommend treatment, or decide discharge.

## AI
Phase 2 only. When enabled:
- AI Gateway
- explicit tool allowlist
- user permission checks & tenant context inheritance
- minimum necessary data
- output validation
- human approval for consequential actions
- AI audit logs
- no direct DB access

## Verification
After every meaningful change:
- typecheck (`pnpm typecheck`)
- lint (`pnpm lint`)
- relevant unit tests (`pnpm test`)
- relevant integration/e2e tests (`pnpm test:e2e`)

Fix failures before moving forward.

## UI
Use the shared design system. Do not invent a new visual language per screen. Do not create fake production metrics. Authentic empty states only.

## Final Principle
Correctness > speed.  
Security > convenience.  
Tenant Isolation > convenience.  
Approved requirements > AI guesses.  
Simple architecture > unnecessary complexity.
