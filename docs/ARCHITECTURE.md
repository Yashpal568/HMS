# HMS Architecture

## 1. Decision
Phase 1 uses a modular monolith, not microservices.

Why:
- Faster for a small team
- Easier deployment
- Easier debugging
- Strong module boundaries are still possible
- Lower operational complexity
- Services can be extracted later if justified

## 2. System — Web First
Phase 1 is a browser-based web application. Desktop packaging is Phase 2 and will reuse the frontend and backend rather than requiring a rewrite.

```text
Hospital Users
      |
 HTTPS / Secure LAN
      |
 Next.js Web Application
      |
 REST API
      |
 NestJS Modular Monolith
      |
 +----+-----------+------------+
 |                |            |
Auth/RBAC      HMS Modules   Audit/Security
 |                |            |
 +----------------+------------+
                  |
            Data Access Layer
                  |
            MongoDB Atlas
                  |
        +---------+---------+
        |                   |
   Private Storage      Redis/Workers
```

### Future Windows Desktop
```text
Existing Next.js/React UI
          |
       Electron
          |
      HMS.exe/.msi
          |
      NestJS API
          |
   MongoDB Atlas or
   approved local MongoDB
```

Do not duplicate HMS business logic inside Electron.

## 3. Domain Modules
Identity, Hospital, Patients, Appointments, Clinical, IPD, Nursing, Lab, Pharmacy, Inventory, Billing, Documents, Notifications, Reports, Audit, Security.

Each module owns its business rules. Cross-module communication uses explicit services/events.

## 4. AI-Ready Design
```text
Authorized User
 → Authentication
 → Authorization
 → AI Gateway
 → Data Minimization
 → Tool Allowlist
 → AI Orchestrator
 → Approved HMS APIs
 → Output Validation
 → Human Approval when required
 → Audit
```

AI receives no MongoDB credentials and cannot execute arbitrary database queries.

## 5. SaaS
Every tenant-owned record must be server-scoped. Candidate models:
- shared collections + tenantId
- isolated databases/collections

Choose after scale/security requirements are confirmed.

## 6. On-Premise and Desktop Compatibility
Build web-first while keeping infrastructure-specific functionality behind configuration/adapters.

Later, the same frontend can be packaged with Electron as a Windows `.exe`/`.msi`. The Electron client must continue using the NestJS API; it must never connect directly to MongoDB.

If a hospital requires no cloud dependency, the same backend can later be deployed on a hospital-local server with an approved local MongoDB deployment.

Therefore the product supports three deployment targets without rebuilding the core HMS:
1. Web + cloud backend + MongoDB Atlas
2. Web + hospital-local backend + local MongoDB
3. Windows Electron client + cloud or hospital-local backend/database


## 7. Example Data Flow
```text
Receptionist
 → POST /api/v1/patients
 → Auth
 → Permission
 → Validation
 → Patient Service
 → MongoDB
 → Audit
 → Response
```

Future AI:
```text
Doctor
 → AI assistant
 → AI Gateway
 → permission check
 → patient-history tool
 → minimum data
 → model
 → draft
 → doctor approval
 → normal HMS API
 → audit
```

## 8. Reliability
Health checks, graceful errors, idempotent jobs, transactions where required, reconciliation for asynchronous operations and tested backups.

## 9. Guardrails
Do not add microservices, AI, third-party integrations or architecture changes without an approved reason.
