# Milestone 02 — Application Shell & Dashboard

## Objective
Build the reusable enterprise healthcare application shell (Sidebar, Header, Breadcrumbs, responsive layout) and the authoritative hospital dashboard backed by live backend telemetry and real empty states (strictly zero fake numbers).

## Scope
- Reusable authenticated application layout (`AppShell`) protecting child routes and handling session state.
- Enterprise healthcare sidebar navigation strictly categorized according to `docs/DESIGN.md`: Overview, Clinical, Operations, Finance, Administration, Security.
- Responsive navigation drawer supporting desktop workstations, laptops, and mobile devices.
- Unbuilt module representation with informative milestone notices (zero broken 404 links, zero fake APIs).
- Sticky header bar (`Header`) with dynamic breadcrumbs, live Atlas indicator, user profile summary, and logout trigger.
- Centralized frontend API client (`apiClient`) with automatic bearer token attachment and error normalization.
- Reusable UI state components: `Skeleton`, `CardSkeleton`, `TableSkeleton`, `EmptyState`, and `ErrorState`.
- Authoritative Dashboard backend service and controller (`GET /api/v1/dashboard`) exposing real user metrics, database readiness, uptime, and recent audit logs.
- Dynamic root routing (`/`) redirecting authenticated users to `/dashboard` and unauthenticated users to `/login`.

## Out of Scope
- Functional clinical patient records (Milestone 03).
- OPD appointment booking or queue token dispatch (Milestone 04).
- Fabricating fake clinical numbers (e.g. "1,248 patients", "87 appointments", "₹4,52,000 revenue").
- Building separate Electron packaging (Phase 2).

## Prerequisites
- Milestone 01 (Authentication, RBAC & Security Foundation) complete and verified.
- Active MongoDB Atlas cluster with `users` and `audit_logs` collections.

## User Workflows
1. **Accessing Application**: Authenticated user navigates to `/dashboard` (or `/`). System verifies session via `AppShell`.
2. **Reviewing Operations**: Staff views real system telemetry (uptime, MongoDB Atlas status, total staff accounts, zero lockouts).
3. **Reviewing Audit Feed**: Administrators review live recent security events (successful logins, logouts, actor emails, IP addresses).
4. **Navigating Upcoming Modules**: Clicking an unbuilt module (e.g. Patients, Appointments) triggers an informative modal dialog explaining the milestone schedule.
5. **Signing Out**: User selects "Sign out" from the header account menu; session cookies are cleared, local token removed, and user redirected to `/login`.

## Frontend Requirements
- **Pages**:
  - `/dashboard`: Main operational workspace with telemetry cards, live audit trail, module roadmap matrix, and clinical empty states.
  - `/`: Root redirect handler routing users dynamically to `/dashboard` or `/login`.
- **Components**:
  - `AppShell` (`apps/web/src/components/layout/app-shell.tsx`): Wraps authenticated views, renders loading pulse during verification, redirects unauthenticated requests.
  - `Sidebar` (`apps/web/src/components/layout/sidebar.tsx`): Navigation sidebar with hospital branding, version badge, categorized links, and milestone dialog.
  - `Header` (`apps/web/src/components/layout/header.tsx`): 64px sticky bar with breadcrumbs, Atlas live indicator, user profile dropdown, and logout.
  - `CardSkeleton` & `TableSkeleton`: Loading shimmers during async data retrieval.
  - `EmptyState`: Professional empty state card for unpopulated sections.
  - `ErrorState`: Error card with retry action button.
- **Responsive Behavior**:
  - Desktop: Fixed 256px sidebar, offset main view.
  - Mobile/Tablet: Slide-out drawer with accessible backdrop and dismiss controls.

## Backend Requirements
- **Modules**: `DashboardModule` registered in `AppModule`.
- **Controllers**:
  - `DashboardController`: `GET /api/v1/dashboard` guarded by `JwtAuthGuard`.
- **Services**:
  - `DashboardService`: Aggregates real user statistics (`totalUsers`, `activeUsers`, `lockedUsers`, role breakdown), retrieves the latest 8 audit logs from Atlas, evaluates database readiness, and returns structured module roadmap data.
- **Business Rules**:
  - Never fabricate numbers: Clinical overview fields for unbuilt modules return `count: 0` with explanatory milestone notes.

## Database Requirements
- **Collections Utilized**: `users`, `audit_logs`.
- **Schema Updates**: Indexed `status` property added to `audit_logs`.
- **Indexes Utilized**: `{ timestamp: -1 }` on `audit_logs` for efficient recent activity queries.

## API Requirements
- `GET /api/v1/dashboard`:
  - Protected: `JwtAuthGuard` (Bearer token or session cookie).
  - Response: `{ success: true, data: { system, authAndUsers, recentAuditActivity, moduleReadiness, clinicalOverview } }`.
  - Errors: 401 Unauthorized for missing/invalid session token.

## RBAC Requirements
- Protected by `JwtAuthGuard`. Accessible to any authenticated hospital staff role.
- Roles displayed dynamically in header and welcome banner.

## Security Requirements
- All dashboard endpoints require valid authentication.
- API errors do not leak database internals or stack traces.
- Client token expired states automatically clear localStorage and redirect to `/login`.

## Audit Requirements
- Dashboard access does not produce high-volume redundant audit logs.
- Sensitive audit logs displayed on the dashboard automatically redact passwords, hashes, and tokens.

## UX Requirements
- Loading skeletons prevent layout shifts while telemetry is loading.
- Informative empty states clearly communicate that clinical data will populate when the respective modules are implemented.
- Error state provides an intuitive "Retry Request" trigger.

## Testing Requirements
- Unit tests for `DashboardService` validating real user counts, role breakdown, audit logs, and zero-fake empty states.
- Unit tests for `DashboardController` validating response wrapper.
- End-to-end tests verifying:
  - `GET /api/v1/dashboard` without token returns HTTP 401.
  - `GET /api/v1/dashboard` with valid token returns HTTP 200 with structured data.

## Acceptance Criteria
- [x] Reusable `AppShell`, `Sidebar`, and `Header` exist.
- [x] Route `/dashboard` exists and is protected against unauthenticated access.
- [x] Real user identity and role are rendered from authentication state.
- [x] Logout works seamlessly from the header.
- [x] Future modules are represented with roadmap indicators and scheduling notices.
- [x] Zero fake hospital statistics are used.
- [x] Loading, empty, and error states exist.
- [x] Unit and e2e tests pass.
- [x] Monorepo production build passes.

## Dependencies
- Upstream: Milestone 01 (Authentication, RBAC & Security Foundation).
- Downstream: Milestone 03 (Patient Management) and all future functional modules.

## Implementation Notes
- Async data fetching inside `useEffect` must be executed within an async IIFE or callback to prevent React 19 synchronous setState effect lint errors.

## Do Not Implement
- Clinical patient registration, appointment scheduling, consultation notes, or invoice generation.
