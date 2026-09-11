# HMS Implementation Roadmap

## Milestone 0 — Discovery
Create and review:
- open questions
- ERD
- RBAC matrix
- API conventions
- security architecture
- deployment plan
- design system

## Milestone 1 — Foundation
- Next.js
- NestJS
- MongoDB Atlas
- environment config
- Docker
- auth
- users
- roles
- permissions
- audit foundation
- logging
- health checks

## Milestone 2 — Patient + OPD
- hospital/departments
- doctors
- patient registration/search/profile
- schedules
- appointments
- queue/check-in
- consultation
- prescriptions
- OPD billing

## Milestone 3 — IPD + Nursing
- wards
- rooms
- beds
- admissions
- allocation
- transfers
- rounds
- nursing
- discharge

## Milestone 4 — Laboratory
- tests
- orders
- samples
- results
- verification
- reports

## Milestone 5 — Pharmacy + Inventory
- medicines
- batches
- expiry
- suppliers
- purchasing
- receiving
- stock ledger
- dispensing
- returns

## Milestone 6 — Billing + Reports
- services
- tariffs
- invoices
- payments
- receipts
- outstanding
- refunds
- operational/financial reports

## Milestone 7 — Production Readiness
- authorization tests
- security review
- audit verification
- backup/restore
- monitoring
- performance
- UAT
- deployment documentation

## Milestone 8 — Phase 2 AI
Only after Phase 1 is stable and approved.

Start with low-risk assistants such as hospital knowledge and appointment support, then documentation/summarization and operational intelligence.

## First Vertical Slice
```text
Login
 → RBAC
 → Register patient
 → Book appointment
 → Doctor consultation
 → Prescription
 → Invoice
 → Payment
 → Audit
```

Validate this slice before building every module.
