# Milestone 01 — Authentication, RBAC & Security Foundation

## Objective
Establish the foundational security architecture, user identity management, and dynamic Role-Based Access Control (RBAC) that all future hospital modules will rely on, backed by MongoDB Atlas.

## Scope
- User identity collection conforming to `docs/DATABASE.md`.
- Salted and hashed password storage via `bcryptjs` (cost factor 12).
- Dynamic RBAC engine (`User -> Role -> Permissions`) with 9 system roles and 30 granular enterprise permissions seeded on boot.
- Secure session management using signed JWT access tokens and HttpOnly `SameSite=lax` cookies.
- Brute-force account lockout protection (5 failed attempts trigger a 15-minute lock).
- Generic error messages for failed authentication to prevent user enumeration.
- Reusable NestJS guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`) and decorators (`@RequirePermissions()`, `@Roles()`, `@CurrentUser()`).
- Audit logging foundation recording sensitive security events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`) with secrets redacted.
- Hospital login user interface (`/login`) following `docs/DESIGN.md`.
- Global `AuthProvider` in Next.js managing session state and client-side authorization helpers.

## Out of Scope
- Clinical patient management.
- Multi-factor authentication (MFA / TOTP) hardware tokens (deferred to production hardening).
- External OAuth2 / SSO providers (deferred to enterprise integration phase).
- Patient or appointment scheduling views.
- Electronic Medical Records (EMR).

## Prerequisites
- Node.js 22 LTS environment.
- Monorepo structure (`apps/web`, `apps/api`, `packages/types`).
- Active MongoDB Atlas cluster connection with connection monitoring.
- Health probe `GET /api/v1/health`.

## User Workflows
1. **Bootstrap Super Admin**: System boots and seeds initial roles, permissions, and default Super Admin user (`admin@hms.local`).
2. **Staff Login**: Hospital employee accesses `/login`, enters email and password. System checks status (`ACTIVE`), checks lockout (`lockUntil`), compares hash, issues JWT, sets HttpOnly cookie, logs audit event, and routes to application shell.
3. **Failed Authentication**: Invalid credentials increment `loginAttempts`. Upon 5 failed attempts, the account is locked for 15 minutes. A generic error ("Invalid email or password") is returned.
4. **Session Verification**: Client calls `GET /api/v1/auth/me` on startup; backend returns sanitized user profile and permission list.
5. **Staff Logout**: User triggers logout from header; session cookie is cleared, local state reset, audit event recorded, and user returned to `/login`.

## Frontend Requirements
- **Pages**:
  - `/login`: Professional enterprise login screen featuring hospital branding, email/password fields, password visibility toggle, loading spinner, and error banner.
- **Components**:
  - `AuthProvider` (`apps/web/src/context/auth-context.tsx`): React context exposing `user`, `token`, `isLoading`, `login()`, `logout()`, `hasPermission()`, and `hasAnyRole()`.
  - `UnauthorizedAccess` (`apps/web/src/components/unauthorized.tsx`): 403 Forbidden screen with return navigation.
- **Forms**:
  - Accessible credentials form with keyboard submission, required field indicators, and disabled submit during transit.
- **States**: Loading spinner, authentication error alert, account locked notice.
- **Responsive Behavior**: Centered desktop login card; responsive full-width mobile container.

## Backend Requirements
- **Modules**: `AuthModule`, `UsersModule`, `RolesModule`, `AuditModule`.
- **Controllers**:
  - `AuthController`: Handles `/login`, `/logout`, `/me`, and test endpoints.
  - `RolesController`: Handles `/roles` retrieval.
- **Services**:
  - `AuthService`: Credential verification, JWT signing, lockout evaluation.
  - `UsersService`: User lookup, login attempt increment/reset, seeding.
  - `RolesService`: Role and permission seeding, permission mapping.
  - `AuditService`: Redacted audit log persistence.
- **Guards & Decorators**:
  - `JwtAuthGuard`: Reusable Passport JWT guard.
  - `RolesGuard`: Role validation against `@Roles()`.
  - `PermissionsGuard`: Permission validation against `@RequirePermissions()`.

## Database Requirements
- **Collections**:
  - `users`: `email` (unique index), `passwordHash` (`select: false`), `firstName`, `lastName`, `role`, `department`, `phone`, `status`, `loginAttempts`, `lockUntil`, `createdAt`, `updatedAt`.
  - `roles`: `name` (unique index), `displayName`, `description`, `permissions` (array), `isSystem`, timestamps.
  - `permissions`: `name` (unique index, `resource.action`), `displayName`, `module`, `description`, timestamps.
  - `audit_logs`: `userId`, `action`, `resource`, `status`, `details` (sanitized), `ipAddress`, `userAgent`, `timestamp` (descending index).
- **Indexes**:
  - `users`: `{ email: 1 }` (unique)
  - `roles`: `{ name: 1 }` (unique)
  - `permissions`: `{ name: 1 }` (unique)
  - `audit_logs`: `{ timestamp: -1 }`, `{ userId: 1, timestamp: -1 }`

## API Requirements
- `POST /api/v1/auth/login`: Accepts `{ email, password }`, returns `{ success, user, accessToken }` and sets HttpOnly cookie.
- `POST /api/v1/auth/logout`: Clears session cookie, returns `{ success: true }`.
- `GET /api/v1/auth/me`: Protected by `JwtAuthGuard`, returns authenticated `{ success, user }`.
- `GET /api/v1/auth/protected-test`: Protected by `JwtAuthGuard` + `PermissionsGuard` (`users.read`).
- `GET /api/v1/roles`: Protected by `JwtAuthGuard` + `RolesGuard` (`super_admin`, `hospital_admin`).

## RBAC Requirements
- **Roles**: `super_admin`, `hospital_admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `lab_technician`, `accountant`, `radiologist`.
- **Permissions**: 30 enterprise permissions across users, roles, patients, appointments, emr, prescriptions, lab, billing, audit, and settings.

## Security Requirements
- Passwords salted with bcrypt cost factor 12.
- Password hashes excluded by default from database queries.
- Zero exposure of internal errors, MongoDB errors, or stack traces.
- Cookies configured with `HttpOnly`, `SameSite=lax`, and `Secure` in production.
- Helmet security headers and CORS restricted to configured origins.

## Audit Requirements
- `LOGIN_SUCCESS`: Records user email, IP address, user agent, timestamp.
- `LOGIN_FAILED`: Records attempted email, IP address, timestamp, failure reason.
- `LOGOUT`: Records user identity and timestamp.
- Strict rule: Passwords, tokens, and hashes must NEVER appear in audit records.

## UX Requirements
- Seamless redirects between unauthenticated `/login` and protected routes.
- Loading indicator during credential validation.
- Clear error notification when credentials do not match.

## Testing Requirements
- Unit tests for `AuthService`, `RolesGuard`, `PermissionsGuard`, `UsersService`.
- Rejection of invalid passwords and non-existent users.
- Verification of account lockout after 5 consecutive failed attempts.
- Verification of permission and role guard enforcement.

## Acceptance Criteria
- [x] User model exists with hashed passwords.
- [x] Login and logout endpoints work.
- [x] Authentication state verified via `/auth/me`.
- [x] Reusable `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` work.
- [x] Security audit logs recorded without secret leakage.
- [x] Unit tests pass across auth and RBAC services.
- [x] Monorepo builds cleanly.

## Dependencies
- Upstream: None (Root foundation).
- Downstream: Milestone 02 (Application Shell + Dashboard) and all subsequent milestones.

## Implementation Notes
- Node 22 ESM compatibility requires `import type { Connection } from 'mongoose'` and injection via `@Inject(getConnectionToken())`.
- Passwords must never be logged or transmitted in plain text.

## Do Not Implement
- Patient registration, appointment scheduling, EMR, or billing modules.
