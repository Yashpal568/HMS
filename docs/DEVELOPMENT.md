# HMS Development Standards & Workflow

This document specifies the engineering conventions, coding standards, architectural patterns, and testing guidelines for the Hospital Management System.

---

## 1. Core Engineering Workflow

Every engineering session must adhere to the standardized 8-step cycle defined in `AGENTS.md`:

```text
READ → UNDERSTAND → PLAN → IMPLEMENT → TEST → DOCUMENT → UPDATE TASK → STOP
```

1. **READ**: Inspect the assigned milestone specification in `docs/milestones/`.
2. **UNDERSTAND**: Clarify all in-scope and out-of-scope boundaries.
3. **PLAN**: Verify architecture and database schema requirements before writing code.
4. **IMPLEMENT**: Build in small, verifiable increments. Never introduce unneeded dependencies.
5. **TEST**: Run automated tests, linter, typechecks, and build scripts.
6. **DOCUMENT**: Record architectural decisions in `walkthrough.md`.
7. **UPDATE TASK**: Update `task.md` with current milestone status.
8. **STOP**: Present results to the user and halt execution. Do NOT auto-advance to subsequent milestones.

---

## 2. Monorepo Architecture

The repository is organized as a pnpm workspace:

```text
FluBird/
├── apps/
│   ├── web/           # Next.js 16 (React 19) Hospital Web Application
│   └── api/           # NestJS 12 (Node 22) Modular Monolith REST API
├── packages/
│   ├── types/         # Shared domain contracts, enums, interfaces
│   ├── ui/            # Shared UI components
│   └── config/        # Shared configuration presets
├── docs/              # Master specifications and milestone docs
│   └── milestones/    # Individual milestone specifications (M01 to M14)
├── AGENTS.md          # Operating instructions for AI coding assistants
├── task.md            # Current work state and milestone progress
└── pnpm-workspace.yaml
```

---

## 3. Backend Conventions (NestJS)

### Architecture
All business capabilities must follow the modular monolith pattern:
```text
Controller
   ↓
Guards & Decorators (Authentication & RBAC)
   ↓
DTO Validation (class-validator)
   ↓
Application Service
   ↓
Data Access (Mongoose Models)
   ↓
MongoDB Atlas
```

- Controllers must remain thin. Never execute database queries directly within a controller.
- Database operations belong inside Services.
- Cross-module communication must use explicit service injection.

### TypeScript & ESM
- Use NodeNext module resolution.
- Explicit `.js` extensions are mandatory for relative imports (e.g. `import { AuthService } from './auth.service.js';`).
- When importing Mongoose types, use `import type { Model, Connection } from 'mongoose';` to prevent ESM named export runtime errors.
- Always inject Mongoose connection via `@Inject(getConnectionToken())`.

### Validation
- Validate all incoming HTTP payloads using NestJS global `ValidationPipe` with:
  ```typescript
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  ```
- DTOs must use `class-validator` and `class-transformer` decorators.

### API Response Format
All REST endpoints must adhere to the standard envelope:
- **Success Response**:
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **Error Response**:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Human readable error description without stack trace.",
      "requestId": "req-123456"
    }
  }
  ```

---

## 4. Frontend Conventions (Next.js)

### Architecture
- Next.js App Router (`apps/web/src/app/`).
- Server Components by default; use `'use client'` only where state, effects, or browser event listeners are required.
- Wrap all authenticated routes in the reusable `AppShell` (`apps/web/src/components/layout/app-shell.tsx`).
- Centralized API Client: All network requests MUST use `apiClient` from `apps/web/src/lib/api-client.ts`. Never scatter ad-hoc `fetch()` calls across components.

### UI & Styling
- Strictly adhere to `docs/DESIGN.md`.
- Tailwind CSS v4 styling with semantic tokens: `slate` neutral surfaces, `teal` primary accents, `emerald` success, `amber` warning, `red` danger.
- Avoid loud gradients, heavy drop shadows, or glassmorphism.
- Use `lucide-react` icons consistently. All icon buttons must provide an `aria-label` for screen reader accessibility.

### React 19 & Effect Rules
- Do NOT call `setState` synchronously within a `useEffect` body (`react-hooks/set-state-in-effect`).
- Execute asynchronous state initialization within an async function called inside the effect, or set state inside `.then()` callbacks.

---

## 5. Database Conventions (MongoDB Atlas)

- MongoDB Atlas is the authoritative cloud system of record.
- **Frontend MUST NEVER connect directly to MongoDB**.
- **Collection Naming**: Plural lowercase snake_case (e.g. `users`, `patients`, `appointments`, `audit_logs`).
- **Schema Naming**: Singular PascalCase (e.g. `User`, `Patient`, `Appointment`).
- **Financial Precision**: All monetary values MUST be stored as `Decimal128` or integer minor units (cents/paise). Never use JavaScript floating-point numbers for currency calculations.
- **Indexes**: Add compound indexes strictly based on actual query patterns (e.g. `{ hospitalId: 1, uhid: 1 }`). Never add random indexes.

---

## 6. Testing Standards

- **Unit Tests**: Place alongside source files with `.spec.ts` extensions.
  - Run via `pnpm --filter api run test`.
- **E2E Tests**: Place in `apps/api/test/` with `.e2e-spec.ts` extensions.
  - Run via `pnpm --filter api run test:e2e`.
- All tests must be deterministic, self-contained, and run without lingering database locks.

---

## 7. Git & Version Control

- **Commit Message Convention**: Follow Conventional Commits:
  - `feat(auth): ...`
  - `feat(shell): ...`
  - `feat(patients): ...`
  - `fix(billing): ...`
  - `docs(milestones): ...`
- **Zero Secrets**: Never commit `.env`, private keys, or credentials. `.env.example` must contain only empty placeholders.
