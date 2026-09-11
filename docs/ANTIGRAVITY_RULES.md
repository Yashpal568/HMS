# Antigravity IDE — Mandatory HMS Build Rules

## Mission
Implement the HMS from the approved specification without hallucinating requirements.

## Read First
Before coding, read:
- PRD.md
- FRONTEND.md
- BACKEND.md
- DATABASE.md
- ARCHITECTURE.md
- DESIGN.md

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
1. Foundation
2. Auth/RBAC
3. Patient
4. Appointment/OPD
5. EMR
6. IPD
7. Lab
8. Pharmacy
9. Inventory
10. Billing
11. Reports
12. Security/operations
13. UAT
14. Phase 2 AI

Never generate the entire production system in one step.

## Feature Completion
A screen is NOT a complete feature.

Complete means:
- frontend
- backend
- database
- validation
- authorization
- audit
- tests
- errors/loading/empty states
- documentation

## Never Invent
Do not invent:
- hospital policy
- clinical protocols
- medicine dosages
- reference ranges
- insurance rules
- permissions
- fields with business impact
- external APIs
- credentials
- compliance certifications
- workflows

## Security
Never expose MongoDB to browser. Never put secrets in client code/source control. Never create bypass accounts. Never disable auth to make development easier. Never log credentials/tokens/sensitive medical records.

## Database
Do not duplicate concepts into multiple collections without an approved reason. Do not manually alter production data. Do not add random indexes. Keep schema/index changes version-controlled.

## Dependencies
Before adding a package, explain its purpose and why an existing package cannot be reused.

## Clinical Safety
Phase 1 must not autonomously diagnose, prescribe, recommend treatment or decide discharge.

## AI
Phase 2 only. When enabled:
- AI Gateway
- explicit tool allowlist
- user permission checks
- minimum necessary data
- output validation
- human approval for consequential actions
- AI audit logs
- no direct DB access

## Verification
After every meaningful change:
- typecheck
- lint
- relevant unit tests
- relevant integration tests
- relevant E2E tests

Fix failures before moving forward.

## UI
Use the shared design system. Do not invent a new visual language per screen. Do not create fake production metrics.

## Change Control
Major changes require approval:
- database architecture
- authentication architecture
- new module
- external integration
- clinical workflow
- financial workflow
- AI behavior
- deployment architecture

## Report Every Task
```text
IMPLEMENTED:
...

FILES CHANGED:
...

TESTS RUN:
...

RESULT:
...

OPEN QUESTIONS:
...

ASSUMPTIONS:
...
```

## Final Principle
Correctness > speed.
Security > convenience.
Approved requirements > AI guesses.
Simple architecture > unnecessary complexity.


## Web-First / Desktop-Later Rule
Phase 1 is a web application. Do NOT introduce Electron, desktop installers or desktop-specific architecture unless explicitly approved.

The frontend and backend must remain cleanly separated so the frontend can later be packaged with Electron.

Electron is a delivery shell, not a replacement for the backend. Never let Electron access MongoDB directly.
