# Hospital Management System — Master Architecture

**Product**: Hospital Management System (HMS MedCore)  
**Deployment Model**: Multi-Tenant Software-as-a-Service (SaaS)  
**Database**: MongoDB Atlas  
**Architecture Style**: Modular Monolith  
**Status**: Authoritative Architectural Standard  

---

## 1. Architectural Strategy & Decision Record

### Modular Monolith over Microservices
The system is implemented as a **modular monolith** running on NestJS and Next.js. Microservices are explicitly prohibited.

**Architectural Rationale**:
- **Simplicity & Velocity**: High development velocity without network partition latency, distributed consensus overhead, or distributed transaction management.
- **Strict Domain Boundaries**: Modular structure enforces clean boundaries through explicit NestJS module imports, DTO contracts, and service injection.
- **Operational Efficiency**: Lower deployment complexity, centralized logging, and unified monitoring on MongoDB Atlas.
- **Future Extraction Path**: If a domain module (such as Laboratory or Billing) warrants independent horizontal scaling in the future, its clean interfaces allow straightforward extraction into a standalone microservice.

---

## 2. Multi-Tenant SaaS High-Level Architecture

The primary deployment model is a **cloud-hosted, multi-tenant SaaS platform**:

```text
               ┌─────────────────────────────────────────────────────────┐
               │                      Client Tier                        │
               │   • Web Browsers (Next.js / React 19 / TypeScript)      │
               │   • [Phase 2] Windows Desktop Wrapper (Electron)        │
               └────────────────────────────┬────────────────────────────┘
                                            │ HTTPS / TLS 1.3
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │                     Edge & Network                      │
               │   • Reverse Proxy / Cloudflare WAF / Helmet             │
               │   • Rate Limiting & DDOS Protection                     │
               └────────────────────────────┬────────────────────────────┘
                                            │ Reverse Proxy
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │                   Application Tier                      │
               │            NestJS 12 Modular Monolith                   │
               │                                                         │
               │  ┌───────────────────────┬───────────────────────────┐  │
               │  │  Platform Level       │  Hospital Level           │  │
               │  │  - Tenant Management  │  - Identity & RBAC        │  │
               │  │  - Subscriptions      │  - Patient Registry       │  │
               │  │  - Plans & Modules    │  - Appointments & OPD     │  │
               │  │  - Global Telemetry   │  - Clinical EMR           │  │
               │  │                       │  - IPD & Beds             │  │
               │  │                       │  - Laboratory & Pharmacy  │  │
               │  │                       │  - Billing & Invoicing    │  │
               │  └───────────────────────┴───────────────────────────┘  │
               │                                                         │
               │   + Tenant Context Interceptor & Scoped Repositories    │
               └────────────────────────────┬────────────────────────────┘
                                            │ TLS 1.2+ Mongoose Driver
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │                      Data Tier                          │
               │                 MongoDB Atlas Cluster                   │
               │                                                         │
               │  ┌─────────────────────────┬─────────────────────────┐  │
               │  │ Global Collections      │ Tenant Collections      │  │
               │  │ - tenants               │ - users (tenantId)      │  │
               │  │ - subscriptions         │ - patients (tenantId)   │  │
               │  │ - plans                 │ - appointments (tenant) │  │
               │  │ - platform_users        │ - encounters (tenantId) │  │
               │  └─────────────────────────┴─────────────────────────┘  │
               │                                                         │
               │   • Automated Multi-AZ Replication                      │
               │   • Point-in-Time Recovery Backups                      │
               │   • Encryption at Rest & In-Transit                     │
               └─────────────────────────────────────────────────────────┘
```

---

## 3. The Tenant Context & Isolation Pipeline

Tenant isolation is enforced by an authoritative pipeline on every incoming request. The client is never trusted to specify its tenant context.

```text
Client Request
      │
      ▼
1. Authentication (JwtAuthGuard)
   - Validates cryptographic JWT signature.
   - Extracts claims: { sub: userId, tenantId: string, role: string }.
      │
      ▼
2. Tenant Context Resolution (TenantContextInterceptor)
   - Extracts verified tenantId from JWT payload.
   - Binds tenant context to request execution object (`req.user.tenantId`).
   - Ignores or rejects any client-supplied `tenantId` in request headers or body.
      │
      ▼
3. Authorization & RBAC (RolesGuard & PermissionsGuard)
   - Evaluates caller's role and granular permissions (`patients.create`, etc.).
   - Confirms role validity within the caller's tenant boundary.
      │
      ▼
4. Tenant-Scoped Application Service
   - Application service receives caller's verified `tenantId`.
   - Injects `tenantId` into entity create payloads.
   - Attaches `tenantId` to all query criteria.
      │
      ▼
5. Tenant-Scoped Repository / Data Access Layer
   - Executes Mongoose operations with mandatory `{ tenantId }` predicate.
   - Leverages compound index `{ tenantId: 1, ... }`.
      │
      ▼
MongoDB Atlas (Isolated Tenant Dataset)
```

---

## 4. Platform Level vs. Hospital Level Separation

The system maintains a rigid boundary between SaaS platform management and hospital healthcare operations:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM LEVEL BOUNDARY                            │
├───────────────────────────────────────────────────────────────────────────┤
│ Target Users: SaaS Operations & Engineering Team                          │
│ Permissions: Platform Super Admin                                        │
│ Core Responsibilities:                                                    │
│ - Onboard, activate, suspend, or terminate hospital tenants               │
│ - Configure subscription plans, feature flags, and module allocations     │
│ - Monitor global cluster health, error rates, and resource utilization    │
│ Security Constraint: Zero access to patient medical records or PHI        │
└───────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼ (Strict Security Boundary)
┌───────────────────────────────────────────────────────────────────────────┐
│                        HOSPITAL LEVEL BOUNDARY                            │
├───────────────────────────────────────────────────────────────────────────┤
│ Target Users: Hospital Staff (Doctors, Nurses, Receptionists, Admins)     │
│ Permissions: Hospital-scoped roles (Hospital Admin, Doctor, Nurse, etc.)  │
│ Core Responsibilities:                                                    │
│ - Patient care: registration, OPD queue, clinical EMR, IPD beds          │
│ - Ancillary services: Laboratory orders, pharmacy dispensing, inventory   │
│ - Financials: Billing, tariffs, payments, receipts                        │
│ Security Constraint: Strictly bound to own hospital (Zero cross-hospital) │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phase 2 AI-Ready Architecture

The HMS architecture is built from Phase 1 to be **AI-ready**, while all actual AI model integrations and intelligent agents are scheduled for **Phase 2**.

```text
Clinician / User
       │
       ▼
Next.js Application UI
       │ HTTPS / REST
       ▼
AI Gateway / Orchestrator (Phase 2)
       ├── PII Data Minimization & Token Redaction
       ├── Tool Execution Allowlists
       └── Prompt Safety & Anti-Injection Guardrails
       │
       ▼
Controlled HMS REST APIs (Inherits Auth & Tenant Context)
       ├── Authentication & Tenant Resolution
       ├── RBAC Permissions Verification
       └── Tenant-Scoped Domain Services
       │
       ▼
MongoDB Atlas (Audited & Scoped Access)
       │
       ▼
Generated Draft (Clinical Note / Summary / Prediction)
       │
       ▼
Mandatory Human Clinician Review & Explicit Sign-off
```

### AI Architecture Rules
1. **Zero Direct Database Exposure**: AI models never receive MongoDB connection strings or query permissions.
2. **Inherited Tenancy**: AI accesses hospital data exclusively via authenticated HMS API endpoints and inherits the tenant context and RBAC permissions of the invoking clinician.
3. **Draft Only / Human in the Loop**: AI never writes directly to finalized clinical records without human verification.

---

## 6. Future Desktop Architecture (Electron)

The project follows a **Web-First Strategy**:
```text
Web Application First (Production Cloud SaaS)
                   │
                   ▼
  Phase 2 Desktop Packaging (Electron Shell)
```

### Electron Client Rules
- **Code Reuse**: The desktop client packages the existing Next.js web application inside an Electron Chromium shell.
- **Zero Local Database**: The Electron application connects exclusively over HTTPS to the NestJS cloud API.
- **No Direct MongoDB Access**: The desktop client never connects directly to MongoDB Atlas.
- **No Parallel Desktop Codebase**: Business logic and UI components are shared 100% between web and desktop.

---

## 7. Reliability, Auditability & Operational Continuity

1. **System Health Probes**: Centralized `/api/v1/health` endpoint verifies MongoDB Atlas replica set connectivity and server uptime.
2. **Immutable Audit Logging**: All authentication events, cross-tenant security probes, clinical chart modifications, and financial transactions are recorded in the `audit_logs` collection with sanitized payloads.
3. **Financial Precision**: All monetary values are represented as `Decimal128` or integer minor units to eliminate floating-point drift.
4. **Automated Recovery**: MongoDB Atlas multi-AZ automated failover and continuous point-in-time backups.
