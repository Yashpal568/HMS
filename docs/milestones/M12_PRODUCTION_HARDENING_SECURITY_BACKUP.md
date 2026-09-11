# Milestone 12 — Production Hardening, Security & Disaster Recovery

## Objective
Harden the entire Hospital Management System for production deployment, implementing advanced rate limiting, automated backup and restore verification tooling, deep health monitoring, full vertical-slice integration test suites, and operational disaster recovery runbooks conforming to `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.

## Scope
- Security Hardening & Rate Limiting:
  - Global and route-specific rate limiting (`@nestjs/throttler`) protecting sensitive endpoints (`/auth/login`, `/billing/payments`, `/reports/export`).
  - Production security headers tuning via Helmet (Strict CSP, HSTS, X-Content-Type-Options, Frameguards).
  - Automatic session idle timeout and token expiration handling on the frontend.
  - Strict input sanitization preventing NoSQL injection and XSS payloads.
- Automated Backup & Disaster Recovery Tooling:
  - Automated snapshot and export tooling for MongoDB Atlas collections.
  - Documented and tested point-in-time restore procedures with verified RTO (Recovery Time Objective) and RPO (Recovery Point Objective).
  - Data retention configuration scripts for operational and audit collections.
- Deep Operational Health & Telemetry:
  - Enhanced `/health` endpoint reporting database latency, memory footprint, active connection count, and background worker status.
  - Production structured logging format (JSON output with request ID correlation).
- Complete End-to-End Vertical Slice Automated Test Suite:
  - Single automated test executing the full hospital lifecycle:
    1. Authenticate as Receptionist.
    2. Register new patient with UHID.
    3. Book appointment and check in.
    4. Authenticate as Doctor.
    5. Conduct consultation, record vitals, diagnoses, e-prescription, and lab requisition.
    6. Authenticate as Lab Technician; collect sample and enter results.
    7. Authenticate as Pathologist; verify lab report.
    8. Authenticate as Pharmacist; dispense prescription from batch using FEFO.
    9. Authenticate as Cashier; generate invoice and process full payment.
    10. Verify that all actions are recorded in the security audit trail.
- Production Deployment & Operations Documentation (`docs/DEPLOYMENT_GUIDE.md`).

## Out of Scope
- Direct deployment to live production cloud infrastructure (handled by hospital infrastructure team).
- Phase 2 AI features (Milestone 13).
- Windows Desktop Electron packaging (Milestone 14).

## Prerequisites
- Milestones 01 through 11 fully completed and functional.
- All core hospital domain modules integrated and verified.

## User Workflows
1. **DDoS / Brute-Force Defense**: Malicious client sends 20 login requests in 5 seconds; rate-limiter intercepts after 5 attempts and responds with HTTP 429 Too Many Requests.
2. **Session Idle Expiration**: Hospital workstation left unattended for 30 minutes; frontend automatically logs out the user, destroys active tokens, and presents a session expired screen.
3. **Automated Disaster Recovery Verification**: Operations engineer executes the restore verification script against a staging replica; system validates database integrity, indexes, and document counts without data loss.
4. **End-to-End Vertical Slice Execution**: Automated CI pipeline runs the complete 10-step patient journey, asserting zero regression across all integrated hospital modules.

## Frontend Requirements
- **Components**:
  - `SessionTimeoutModal`: Warning dialog counting down when user is idle for >25 minutes, prompting to extend session.
  - `OfflineBanner`: Alert bar indicating network loss or backend disconnection.
  - `DeepHealthDashboard`: Administrative system health view showing latency, memory, and database status.
- **Security Behaviors**:
  - Automatically wipes session tokens upon token expiration or HTTP 401.
  - Prevents caching of sensitive medical pages in browser history.

## Backend Requirements
- **Modules**: Integration of `@nestjs/throttler` and enhanced `HealthModule`.
- **Guards & Middleware**:
  - `ThrottlerGuard`: Applied globally with custom limits for authentication and financial transactions.
  - `CorrelationIdMiddleware`: Injects a unique `x-request-id` into all requests and responses for log tracing.
- **Filters**:
  - `GlobalExceptionFilter`: Sanitizes all exceptions, logging full errors internally while emitting generic, safe responses to clients.

## Database Requirements
- **Index Verification**: Run automated index verification script to ensure all query paths across all collections are supported by optimal compound indexes.
- **Data Retention & Archival**: Time-to-Live (TTL) index configuration on temporary tokens and session collections.

## API Requirements
- `GET /api/v1/health/deep`: Returns detailed system telemetry:
  ```json
  {
    "status": "ok",
    "database": {
      "status": "connected",
      "latencyMs": 14,
      "poolSize": 10
    },
    "memory": {
      "heapUsedMb": 85,
      "heapTotalMb": 120
    },
    "uptimeSeconds": 86400
  }
  ```
- All endpoints emit HTTP 429 when rate limit thresholds are exceeded.

## RBAC Requirements
- Complete verification of the 9 roles and 30 permissions across every controller endpoint.
- Negative test verification: Assert that unauthorized roles are rejected across all routes.

## Security Requirements
- Zero plaintext secrets in source code, configuration files, or environment examples.
- Helmet security headers: Content Security Policy, HTTP Strict Transport Security (HSTS), X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- Verification that no stack traces or MongoDB error objects escape to the client in production mode.

## Audit Requirements
- `SYSTEM_BACKUP_EXECUTE`: Records backup execution and archive hash.
- `DISASTER_RECOVERY_TEST`: Records restore test timestamp and record counts.
- `RATE_LIMIT_BREACH`: Records IP address and targeted route when throttling triggers.

## UX Requirements
- Seamless session extension dialog that does not disrupt clinical workflows mid-entry.
- Clean and non-alarming error messages for end users when temporary network disruptions occur.

## Testing Requirements
- End-to-End Vertical Slice Test Suite (`apps/api/test/vertical-slice.e2e-spec.ts`).
- Rate limiting tests: 429 response emitted upon limit breach.
- Security exception filter tests: Assert internal server errors return generic message and correlation ID.
- Full test suite execution across monorepo: `pnpm test` and `pnpm test:e2e`.

## Acceptance Criteria
- [ ] Rate limiting active on authentication and financial endpoints.
- [ ] Security headers properly configured and verified via HTTP response inspection.
- [ ] Global exception filter sanitizes all error responses and assigns correlation IDs.
- [ ] Deep health check reports database latency and memory footprint.
- [ ] End-to-end vertical slice test suite passes from registration to payment.
- [ ] Disaster recovery runbook and backup tooling documented and verified.
- [ ] Full monorepo lint, typecheck, and production builds pass cleanly.

## Dependencies
- Upstream: Milestones 01 through 11 (All Phase 1 HMS Modules).
- Downstream: Phase 1 sign-off and approval to proceed with Phase 2 AI / Desktop Packaging.

## Implementation Notes
- This milestone hardens existing modules rather than introducing new business domains.
- Maintain existing architecture and keep the codebase simple and maintainable.

## Do Not Implement
- Phase 2 AI features or Electron desktop packaging.
