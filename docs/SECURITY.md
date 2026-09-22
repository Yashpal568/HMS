# Hospital Management System — Security Architecture & Governance

**SOURCE-OF-TRUTH OWNER**: `docs/SECURITY.md` (SECURITY)  
**Classification**: Authoritative  
**Product**: Multi-Tenant Hospital Management SaaS & Patient Healthcare Platform  
**Security Model**: Zero-Trust Multi-Tenant Isolation & Defense-in-Depth  
**Status**: Authoritative Security Directive  

---

## 1. Core Security Principles

1. **Defense in Depth**: Layered security controls enforced at every boundary: Cloudflare Edge/WAF -> TLS transport -> NestJS API Gateway -> JWT verification -> Tenant context extraction -> RBAC Guards -> Tenant-scoped Service queries -> MongoDB Atlas data layer.
2. **Authoritative Backend**: Client applications (`hms-client`, `patient-app`, `super-admin`) are untrusted presentation layers. All authentication, tenant isolation, and authorization logic resides exclusively on `apps/server/`.
3. **Zero Direct Database Exposure**: Frontend applications, mobile clients, desktop shells, and AI agents have zero network access or credentials to MongoDB Atlas or Redis.
4. **Mandatory Tenant Scoping**: Every database interaction for hospital data is scoped by `tenantId`. Cross-tenant data leaks are classified as Severity-0 (P0) critical defects.
5. **Principle of Least Privilege**: Users, micro-processes, and background jobs operate with the minimum necessary permissions.
6. **No Unverified Regulatory Claims**: The system implements rigorous privacy and security controls aligned with industry standards (e.g. OWASP, HIPAA, GDPR, ISO 27001 principles); however, formal certification claims are prohibited until independent third-party audits are completed and legally signed off.

---

## 2. Multi-Tenant Isolation & Identity Governance

### 2.1. The Tenant Context Security Invariant

```text
HTTP Request (Bearer Token or HttpOnly Cookie)
             │
             ▼
     Cryptographic Verification (JwtAuthGuard)
             │
             ▼
     Extract Verified `tenantId` from JWT Payload
             │
             ▼
     Bind to Request Context (`req.user.tenantId`)
             │
             ▼
     Tenant-Scoped Service Layer (`{ tenantId: req.user.tenantId, ... }`)
             │
             ▼
     MongoDB Atlas (Compound Index on `{ tenantId: 1, ... }`)
```

- **Zero Trust for Client-Provided Tenant Identifiers**: The backend strictly ignores and strips any `tenantId` passed in request bodies, query strings, or headers. The tenant identity is derived exclusively from the cryptographically verified JWT session context (`req.user.tenantId`).
- **Uniform Error Masking for IDOR Prevention**: Attempting to query, mutate, or delete a resource belonging to another tenant returns `404 Not Found` (identical to a non-existent ID). This prevents cross-tenant entity enumeration, while internally emitting a security audit warning.
- **Strict Separation of Platform vs. Hospital Privileges**:
  - **Platform Super Admin**: Manages SaaS tenants, subscriptions, plan limits, and global system configurations. Has ZERO access to clinical EMR, prescriptions, doctor notes, or patient records.
  - **Hospital Administrator**: Manages their own hospital facility, departments, staff accounts, and operational settings. Has ZERO access to platform-level configurations, other tenants' data, or super-admin functions.

---

## 3. Mandatory Tenant-Isolation Attack Validation Matrix

Every CI/CD build and test suite must continuously validate tenant isolation against these five attack scenarios:

| Test Scenario | Attack Simulation | Expected Result |
|---|---|---|
| **Scenario 1: Cross-Tenant Resource Read (IDOR)** | User from Hospital A requests Patient ID belonging to Hospital B via `GET /api/v1/patients/:id`. | HTTP `404 Not Found`; zero data returned; security warning logged in audit trail. |
| **Scenario 2: Cross-Tenant Mutation** | Doctor from Hospital A attempts `PATCH /api/v1/patients/:id` on Hospital B's patient record. | HTTP `404 Not Found`; Hospital B's patient record remains untouched. |
| **Scenario 3: Cross-Tenant Administration** | Hospital Admin from Hospital A attempts `DELETE /api/v1/users/:id` targeting Hospital B's doctor. | HTTP `404 Not Found`; target user unaffected. |
| **Scenario 4: Tenant Parameter Tampering** | Attacker injects `"tenantId": "hospital_b_id"` into `POST /api/v1/patients`. | Payload `tenantId` is stripped; record is saved with caller's verified `req.user.tenantId`. |
| **Scenario 5: Cross-Tenant Query Enumeration** | User from Hospital A requests `GET /api/v1/patients?limit=100`. | Query results contain only Hospital A records; zero Hospital B records leaked. |

---

## 4. Authentication & Session Security

1. **Password Hashing**:
   - Passwords hashed using `bcryptjs` with an adaptive work factor of 12.
   - Plaintext passwords and hashes are never returned in API responses or logs (`{ select: false }` on User schema).
2. **Brute-Force & Lockout Protection**:
   - Accounts track consecutive failed attempts via `failedLoginAttempts`.
   - Upon 5 consecutive failed login attempts, the account is locked for 15 minutes (`lockUntil`).
   - Successful login resets failed attempts to 0.
3. **User Enumeration Defense**:
   - Authentication failures return uniform generic errors: `"Invalid email or password"`.
   - The API never reveals whether a given email address exists in the system.
4. **Session & Token Management**:
   - Cryptographically signed JSON Web Tokens (JWT) using HMAC SHA-256 (`HS256`) or asymmetric RSA.
   - Short-lived Access Tokens (15–60 minutes) combined with sliding Refresh Tokens stored in Redis with revocation capability.
   - Browser cookies set as `HttpOnly`, `SameSite=lax`, and `Secure=true` (in production) to prevent XSS-based token theft.

---

## 5. Role-Based Access Control (RBAC)

The system enforces granular authorization at the controller and service levels:

```text
Request ──► JwtAuthGuard ──► RolesGuard ──► PermissionsGuard ──► Controller Handler
```

- **Permissions Structure**: Granular format `resource:action` (e.g. `patients:read`, `patients:create`, `prescriptions:issue`, `billing:invoice_void`).
- **Decorators**:
  - `@Roles('HOSPITAL_ADMIN', 'DOCTOR')`
  - `@RequirePermissions('prescriptions:issue')`
- **Guards**:
  - `JwtAuthGuard`: Confirms authenticated cryptographic session.
  - `RolesGuard`: Validates caller's role against route requirements.
  - `PermissionsGuard`: Checks whether the user's role/permission set contains all required permission tokens.

---

## 6. API Security, Input Validation & Rate Limiting

1. **Strict Input Validation**:
   - All inbound payloads validated using NestJS `ValidationPipe` with `class-validator` and `zod` schemas.
   - Unknown properties automatically stripped via `whitelist: true` and `forbidNonWhitelisted: true`.
2. **Rate Limiting & DoS Mitigation**:
   - Distributed rate limiting managed via Redis (`nestjs/throttler` with Redis store).
   - Global rate limit: 100 requests per minute per IP.
   - Sensitive auth endpoints (`/auth/login`, `/auth/register`): 5 requests per minute per IP.
   - Tenant-level throttling prevents single-tenant traffic spikes from impacting platform availability.
3. **HTTP Security Headers**:
   - Hardened with `helmet` middleware:
     - Strict Content Security Policy (CSP)
     - HTTP Strict Transport Security (HSTS: `max-age=31536000; includeSubDomains; preload`)
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
4. **CORS Hardening**:
   - Origin whitelisting restricted strictly to designated domains (`hms-client`, `patient-app`, `super-admin`). Wildcard CORS (`*`) is prohibited.

---

## 7. Data Protection & Encryption Standards

1. **Encryption in Transit**:
   - All communication over public networks requires TLS 1.3 or TLS 1.2 with forward-secret cipher suites.
   - Plain HTTP requests automatically redirected to HTTPS.
2. **Encryption at Rest**:
   - MongoDB Atlas volumes encrypted using AES-256 encryption at rest.
   - Redis cache instances configured with TLS in-transit encryption and encrypted storage volumes.
3. **Protected Health Information (PHI) Handling**:
   - Patient clinical notes, diagnostic results, and prescriptions restricted to authorized clinical personnel.
   - Demographic exports and audit reports require administrative authorization and are logged.
4. **Zero Secrets in Source Control**:
   - Secrets (`JWT_SECRET`, database URIs, API keys) managed via environment variables and secret stores. `.env` files are strictly excluded via `.gitignore`.

---

## 8. Redis Security & Key Namespacing

Redis is used for caching, rate limiting, temporary authentication state, and BullMQ background queues. To prevent cross-tenant collisions or state poisoning:

- **Mandatory Tenant Namespacing**: Every tenant-specific Redis key MUST follow the prefix format:
  ```text
  tenant:{tenantId}:{module}:{key}
  ```
  Examples:
  - `tenant:60f1b2c3d4e5f6a7b8c9d0e1:queue:active_token:doctor_12`
  - `tenant:60f1b2c3d4e5f6a7b8c9d0e1:rate_limit:user_88`
  - `tenant:60f1b2c3d4e5f6a7b8c9d0e1:cache:department_list`
- **Network Isolation**: Redis access is restricted to internal VPC/private networks with mandatory authentication (`AUTH` password required).

---

## 9. Secure File Handling (Documents & Medical Scans)

1. **Direct Uploads Prohibited**: Frontend clients never upload large medical scans or lab PDFs directly to the NestJS API server memory.
2. **Pre-Signed URL Workflow**:
   ```text
   1. Client requests upload ticket: POST /api/v1/documents/presigned-upload
   2. Server validates user permissions and generates time-limited (15m) S3/R2 presigned PUT URL
   3. Client uploads file directly to object storage via HTTPS
   4. Client notifies server: POST /api/v1/documents/confirm-upload
   5. Server records document metadata in `documents` collection
   ```
3. **MIME-Type & Extension Whitelisting**: Restricted to approved medical document formats (`application/pdf`, `image/jpeg`, `image/png`, `application/dicom`). Executable files (`.exe`, `.sh`, `.js`) are strictly rejected.
4. **Time-Limited Read Access**: Patient documents are accessed exclusively via short-lived (5-minute) pre-signed download URLs.

---

## 10. Immutable Audit Logging & Sanitization

All security-sensitive operations are logged to the `audit_logs` collection:

- **Audited Events**:
  - Authentication successes, failures, and account lockouts
  - User creation, role changes, and permission modifications
  - Patient record creation, updates, and sensitive medical record reads
  - Prescription issuance and pharmacy dispensing
  - Invoice adjustments, discounts, and payments/refunds
  - Tenant status modifications and SaaS plan updates
- **Strict Data Sanitization Invariant**:
  ```text
  PROHIBITED IN LOGS & AUDIT PAYLOADS:
  - Plaintext passwords or password hashes
  - JWT tokens, bearer tokens, or session cookies
  - Credit card numbers, CVVs, or bank credentials
  - Raw unmasked clinical notes or HIV/sensitive diagnostic observations
  ```

---

## 11. OWASP API Security Compliance Alignment

The platform architecture directly addresses the OWASP API Security Top 10:

1. **API1: Broken Object Level Authorization (BOLA)** -> Addressed by mandatory `{ tenantId, _id }` scoped queries on all entity lookups.
2. **API2: Broken Authentication** -> Addressed by bcryptjs (work factor 12), account lockouts, secure JWTs, and HttpOnly cookies.
3. **API3: Broken Object Property Level Authorization** -> Addressed by DTO whitelisting (`ValidationPipe` strips untrusted properties).
4. **API4: Unrestricted Resource Consumption** -> Addressed by Redis-backed rate limiting and mandatory pagination limits (max 100 items/page).
5. **API5: Broken Function Level Authorization (BFLA)** -> Addressed by `@Roles` and `@RequirePermissions` guards on all controller routes.
6. **API6: Unrestricted Access to Sensitive Business Flows** -> Addressed by step-by-step state machines for queue management, pharmacy dispensing, and billing.
7. **API7: Server Side Request Forgery (SSRF)** -> Addressed by prohibiting user-controlled outbound URL fetching in the API.
8. **API8: Security Misconfiguration** -> Addressed by hardened Helmet headers, disabled verbose stack traces in production, and CORS whitelisting.
9. **API9: Improper Inventory Management** -> Addressed by single canonical REST API versioned under `/api/v1` with OpenAPI/Swagger specifications.
10. **API10: Unsafe Consumption of APIs** -> Addressed by strict schema validation of all third-party webhook and integration payloads.

---

## 12. SaaS Platform Owner & Super Admin Security Profile

To preserve tenant sovereignty and medical privacy across multi-tenant SaaS operations, the system enforces a cryptographically segregated security profile for the SaaS Platform Owner (`SUPER_ADMIN`).

### 12.1. Dual-Plane Separation & Identity Segregation

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PLATFORM CONTROL PLANE (apps/super-admin)             │
│   Identity: Role = SUPER_ADMIN | tenantId = null | surface = SUPER_ADMIN│
│   Endpoints: /api/v1/super-admin/*                                     │
│   Scope: Tenants, Plans, Subscriptions, Platform Telemetry, Audit Logs │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         STRICT ARCHITECTURAL FIREWALL
                        (SurfaceGuard & RolesGuard: 403)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    TENANT DATA PLANE (apps/hms-client)                 │
│   Identity: Role = HOSPITAL_ADMIN/DOCTOR/NURSE | tenantId = <hospital> │
│   Endpoints: /api/v1/patients, /api/v1/emr, /api/v1/billing, etc.      │
│   Scope: PHI, Encounters, Diagnoses, Prescriptions, Financials         │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Identity Segregation**:
   - Super Admin users exist in the platform namespace with `tenantId: null` and `role: 'SUPER_ADMIN'`.
   - JWT tokens issued for Super Admin sessions explicitly stamp `surface: 'SUPER_ADMIN'` and `tenantId: null`.
2. **Control Plane Route Binding**:
   - All SaaS management operations are strictly confined to the `/api/v1/super-admin/*` route prefix.
   - Routes within this prefix require `@Roles('SUPER_ADMIN')` and specific `platform.*` permission tokens.

### 12.2. Strict Zero-PHI Access Invariant (Technical Enforcement)

- **Absolute Prohibition**: Platform Super Admins, DevOps engineers, and support staff have **ZERO access to Protected Health Information (PHI)** or tenant clinical operations.
- **Enforcement Mechanism**:
  - Any request bearing a `SUPER_ADMIN` token sent to clinical endpoints (`/api/v1/patients/*`, `/api/v1/emr/*`, `/api/v1/lab/*`, `/api/v1/pharmacy/*`, `/api/v1/billing/*`) is intercepted and rejected with `HTTP 403 Forbidden` (`TENANT_PHI_ACCESS_PROHIBITED`).
  - No database query in the platform control plane includes Mongoose models for `Patient`, `Encounter`, `Prescription`, `LabOrder`, or `Invoice`.
  - The Super Admin client application (`apps/super-admin`) contains zero clinical UI components, zero medical record views, and zero patient data hooks.

### 12.3. Platform Permission Tokens

Platform operations are gated by fine-grained platform-level permission tokens:

| Permission Token | Description | Assigned Roles |
|---|---|---|
| `platform.tenants.read` | View tenant list, operational status, tier, license usage, and aggregated stats. | `SUPER_ADMIN`, `SUPPORT_LEAD` |
| `platform.tenants.manage` | Provision new hospital tenants, update subdomains, configure custom domains. | `SUPER_ADMIN` |
| `platform.tenants.suspend` | Suspend or reinstate hospital tenant access due to non-payment or breach. | `SUPER_ADMIN` |
| `platform.plans.manage` | Create, update, or archive subscription pricing tiers, limits, and modules. | `SUPER_ADMIN`, `BILLING_ADMIN` |
| `platform.subscriptions.manage` | Modify subscription statuses, apply custom quota bursts, reconcile billing. | `SUPER_ADMIN`, `BILLING_ADMIN` |
| `platform.telemetry.read` | View real-time cluster health, active user counts, throughput, and error rates. | `SUPER_ADMIN`, `DEVOPS` |
| `platform.audit.read` | Inspect immutable platform-tier security, governance, and audit trails. | `SUPER_ADMIN` |
| `platform.broadcast.manage` | Publish and revoke platform-wide maintenance banners and critical notices. | `SUPER_ADMIN` |

### 12.4. Authentication & Session Hardening for Super Admins

Because the SaaS Platform Owner possesses platform-level controls, enhanced identity safeguards are mandatory:

1. **Prohibition of Self-Registration**:
   - Super Admin accounts cannot be created via public registration or tenant invitation endpoints.
   - Accounts can only be provisioned via break-glass seed scripts or direct database initialization by authorized DevOps leads.
2. **Mandatory Multi-Factor Authentication (MFA/TOTP)**:
   - Super Admin accounts require RFC 6238 Time-based One-Time Password (TOTP) verification.
   - Access tokens are only issued after successful secondary factor verification.
3. **Short Session Lifetimes & Aggressive Timeouts**:
   - Idle session timeout is strictly capped at 15 minutes.
   - Refresh tokens have a maximum lifetime of 12 hours and require re-authentication.
4. **Session IP & User-Agent Binding**:
   - Super Admin session tokens are tied to client IP and User-Agent fingerprint hashes in Redis; token replay from differing networks triggers automatic session invalidation and alert logging.
5. **Comprehensive Platform Audit Logging**:
   - All mutations on tenants, plans, and subscription quotas are recorded in `audit_logs` with `tenantId: null`, actor role `SUPER_ADMIN`, client IP, and target tenant metadata.

