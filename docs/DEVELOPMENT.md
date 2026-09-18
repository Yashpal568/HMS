# Hospital Management System — Development Standards & Workflow

**SOURCE-OF-TRUTH OWNER**: `docs/DEVELOPMENT_RULES.md` (ENGINEERING PROCESS)  
**Classification**: Supporting Developer Guide  
**Product**: Hospital Management System (HMS MedCore)  
**Architecture**: Multi-Tenant SaaS Modular Monolith  
**Database**: MongoDB Atlas  
**Status**: Supporting Engineering Guide  

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

## 2. Multi-Tenant SaaS Development Rules

### Rule 1: Zero Unscoped Queries
Every database query executed on a tenant-owned collection **must** include `{ tenantId }` in the query predicate:
```typescript
// ❌ CRITICAL SECURITY FLAW: Unscoped query leaks cross-tenant data
const patient = await this.patientModel.findOne({ _id: id });

// ✅ AUTHORITATIVE PATTERN: Scoped strictly to authenticated tenant
const patient = await this.patientModel.findOne({ _id: id, tenantId });
```

### Rule 2: Never Trust Client-Supplied Tenant Identifiers
The client must **never** specify or override its `tenantId` via request bodies, query parameters, or HTTP headers. The backend derives `tenantId` exclusively from the cryptographically verified JWT session:
```typescript
// In Controller:
@Post()
@RequirePermissions('patients.create')
async create(
  @Body() dto: CreatePatientDto,
  @CurrentUser() user: AuthenticatedUser,
) {
  // Pass verified user.tenantId down to service
  return this.patientsService.create(dto, user.tenantId, user.userId);
}
```

### Rule 3: Uniform Error Masking (Existence Masking)
When querying a resource by ID that belongs to another hospital tenant, always return `404 Not Found` (never `403 Forbidden`) to prevent cross-tenant ID enumeration attacks.

---

## 3. Backend Architecture & Conventions (NestJS)

### Execution Pipeline
All business capabilities must follow the modular monolith pattern:
```text
Controller
   ↓
Guards & Decorators (JwtAuthGuard, RolesGuard, PermissionsGuard)
   ↓
DTO Validation (ValidationPipe with class-validator)
   ↓
Application Service (Tenant-Scoped Business Logic)
   ↓
Data Access (Mongoose Models with { tenantId } filter)
   ↓
MongoDB Atlas Cluster
```

- **Controllers**: Must remain thin. Validate inputs via DTOs and delegate directly to services.
- **Services**: Own the domain logic. Accept `tenantId` as a mandatory parameter for all tenant-scoped operations.
- **TypeScript & ESM**:
  - Use NodeNext module resolution.
  - Explicit `.js` extensions are mandatory for relative imports (e.g. `import { AuthService } from './auth.service.js';`).
  - When importing Mongoose types, use `import type { Model, Connection } from 'mongoose';` to prevent ESM runtime errors.
  - Always inject Mongoose connection via `@Inject(getConnectionToken())`.

### Validation Pipeline
Incoming HTTP payloads are validated globally using `ValidationPipe`:
```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

---

## 4. Frontend Architecture & Conventions (Next.js)

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
- **Collection Classification**:
  - Global / Platform-Owned: `tenants`, `subscriptions`, `plans`, `platform_users`, `platform_audit_logs`.
  - Tenant-Owned: Mandatory indexed `tenantId: ObjectId` (e.g. `users`, `patients`, `appointments`, `invoices`).
  - System-Owned: `system_settings`, `outbox_events`.
- **Financial Precision**: All monetary values MUST be stored as `Decimal128` or integer minor units (cents/paise). Never use JavaScript floating-point numbers for currency calculations.
- **Indexes**: Add compound indexes with `tenantId` as the leading key (e.g. `{ tenantId: 1, uhid: 1 }`).

---

## 6. Testing Standards

- **Unit Tests**: Place alongside source files with `.spec.ts` extensions.
  - Run via `pnpm --filter api run test`.
- **E2E Tests**: Place in `apps/api/test/` with `.e2e-spec.ts` extensions.
  - Run via `pnpm --filter api run test:e2e`.
- **Tenant-Isolation Tests**: Every tenant-owned module must include automated tests asserting:
  - Cross-tenant read returns 404.
  - Cross-tenant update/delete returns 404.
  - List queries strictly return only caller's tenant data.
  - Injected request body `tenantId` is ignored.

---

## 7. Git & Version Control

- **Commit Message Convention**: Follow Conventional Commits:
  - `feat(auth): ...`
  - `feat(shell): ...`
  - `feat(patients): ...`
  - `fix(billing): ...`
  - `docs(milestones): ...`
- **Zero Secrets**: Never commit `.env`, private keys, or credentials. `.env.example` must contain only empty placeholders.
