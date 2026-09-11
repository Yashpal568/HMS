# HMS DEVELOPMENT RULES

This is a production-oriented Hospital Management System.

The following documents are authoritative:

1. PRD.md
2. ARCHITECTURE.md
3. DATABASE.md
4. DESIGN.md
5. SECURITY.md
6. API.md
7. DEVELOPMENT.md
8. task.md

Priority:

Security > Architecture > Database integrity > PRD > Design > convenience

Never invent requirements.

Never create fake hospital data.

Never expose sensitive information.

Never bypass authentication/RBAC.

Never connect frontend directly to MongoDB.

Never hard-code secrets.

Never implement future milestones unless explicitly instructed.

Reuse existing components and services.

Do not repeatedly rebuild or verify completed infrastructure.

When a milestone is completed:

1. Update task.md
2. Record implementation
3. Record remaining issues
4. Identify the next milestone
5. STOP

Do not automatically start the next milestone.

Before modifying architecture:

1. Read ARCHITECTURE.md
2. Explain the proposed change
3. Update architecture documentation
4. Then implement

Before modifying database schema:

1. Read DATABASE.md
2. Update DATABASE.md
3. Implement the schema change

Before creating UI:

1. Read DESIGN.md
2. Reuse existing components
3. Do not create a new visual system

Before adding dependencies:

1. Check whether an existing dependency can solve the problem
2. Add the smallest appropriate dependency
3. Document why it was added

Do not rewrite working code without a concrete reason.

Do not create placeholder implementations that pretend to be production functionality.

Do not fabricate API responses or statistics.

Use real backend data whenever a feature requires data.

All sensitive hospital data must be treated as confidential.

AI features are Phase 2.
Do not implement AI unless the current task explicitly belongs to Phase 2.

Electron/Desktop packaging is a later phase.
Do not introduce Electron during web development.

Current strategy:

Web application first.
Electron packaging later.

Development workflow:

READ → PLAN → IMPLEMENT → TEST → DOCUMENT → UPDATE TASK → STOP
