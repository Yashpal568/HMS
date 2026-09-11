# HMS Backend Specification

## Stack
- Node.js
- TypeScript
- NestJS
- REST API
- MongoDB Atlas
- Choose ONE data-access approach; do not add multiple competing ORMs/ODMs without approval
- Redis + BullMQ only where justified
- OpenAPI/Swagger

## Architecture
```text
Controller
  ↓
Authentication / Authorization
  ↓
DTO Validation
  ↓
Application Service
  ↓
Repository / Data Access
  ↓
MongoDB Atlas
```

Controllers must not contain database business logic.

## Modules
auth, users, roles, permissions, hospital, departments, staff, patients, appointments, opd, emr, ipd, nursing, laboratory, pharmacy, inventory, billing, documents, notifications, reports, audit, security, events, integrations, settings, health.

## API
Base path: `/api/v1`

Examples:
```text
GET    /patients
POST   /patients
GET    /patients/:id
PATCH  /patients/:id

GET    /appointments
POST   /appointments
PATCH  /appointments/:id
POST   /appointments/:id/check-in

POST   /encounters
PATCH  /encounters/:id
POST   /prescriptions

POST   /lab/orders
POST   /lab/results
POST   /lab/results/:id/verify

POST   /admissions
POST   /beds/:id/allocate
POST   /beds/:id/transfer

POST   /invoices
POST   /payments
POST   /refunds
```

## Authorization
For every protected operation:
1. Authenticate
2. Resolve permission
3. Resolve hospital/tenant/branch scope
4. Resolve resource access
5. Execute service

Never rely on frontend checks.

## Validation and Errors
Validate all external input. Use a consistent error format:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Requested resource was not found.",
    "requestId": "..."
  }
}
```

Never expose stack traces/secrets in production.

## Consistency
Use MongoDB transactions when multiple documents must change atomically and the Atlas deployment supports the required transaction topology.

Examples:
- payment + invoice
- bed allocation + occupancy
- dispensing + stock
- stock receipt + ledger

For workflows that cannot be transactional, use explicit state/reconciliation/outbox mechanisms.

## Audit
Sensitive service methods must create audit records: patient access/change, clinical notes, prescriptions, lab verification, billing/refunds, permissions, exports, documents and security actions.

## Events
Use events/outbox records for meaningful state changes. Events support decoupling and future AI/integrations; they are not a reason to create microservices.

## Background Jobs
Notifications, large reports, document processing, maintenance and future AI jobs. Jobs should be idempotent where possible.

## File Handling
Backend controls document access. Validate type/size, generate safe object keys and keep storage private.

## Logging
Structured request IDs, module/action, duration and status. Never log passwords, tokens, secrets, full clinical notes or unnecessary patient identifiers.

## Health
Provide liveness, readiness, database and worker health checks.

## Security
HTTPS, strict CORS allowlist, rate limiting, secure headers, request limits, object authorization and input validation.
