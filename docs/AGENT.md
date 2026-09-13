# HMS DEVELOPMENT RULES

This is a production-oriented Multi-Tenant SaaS Hospital Management System (HMS MedCore).

The following documents are authoritative:

1. PRD.md
2. ARCHITECTURE.md
3. DATABASE.md
4. DESIGN.md
5. SECURITY.md
6. API.md
7. DEVELOPMENT.md
8. docs/architecture/multi-tenancy.md
9. docs/security/tenant-isolation.md
10. docs/saas/subscriptions.md
11. task.md

Priority:

Tenant Isolation > Security > Architecture > Database integrity > PRD > Design > Convenience

Core Rules:
1. This is a multi-tenant SaaS HMS.
2. Tenant isolation is mandatory.
3. Never trust client-provided tenant identifiers.
4. Never perform unscoped tenant database queries.
5. Never bypass backend authorization.
6. Never expose one tenant's data to another tenant.
7. Platform and hospital administrative privileges are separate.
8. MongoDB Atlas is the system of record.
9. Do not introduce PostgreSQL/Prisma without explicit architectural approval.
10. AI is Phase 2.
11. Electron is later.
12. Never fabricate hospital data.
13. Never invent clinical rules.
14. Never invent permissions.
15. Never invent pricing.
16. Never invent subscription limits.
17. Never implement future milestones automatically.
18. Read the relevant milestone specification before coding.
19. Test tenant isolation for tenant-aware features.

When a milestone is completed:

1. Update task.md
2. Record implementation
3. Record remaining issues
4. Identify the next milestone
5. STOP

Do not automatically start the next milestone.

Development workflow:

READ → UNDERSTAND → PLAN → IMPLEMENT → TEST → DOCUMENT → UPDATE TASK → STOP
