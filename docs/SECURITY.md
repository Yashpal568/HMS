# Hospital Management System — Security Architecture & Governance

**Product**: Hospital Management System (HMS MedCore)  
**Classification**: Multi-Tenant Healthcare SaaS Platform  
**Security Standard**: Zero-Trust Multi-Tenant Isolation & Defense-in-Depth  
**Status**: Authoritative Security Directive  

---

## 1. Security Architecture Principles

1. **Defense in Depth**: Security controls are enforced at every architectural tier: edge/WAF, TLS transport, reverse proxy, JWT authentication, tenant context resolution, RBAC guards, service-level scoping, and MongoDB Atlas database access.
2. **Authoritative Backend**: Client-side routing and UI toggles are purely user experience affordances; the NestJS backend is the sole authoritative gatekeeper for authentication, tenant isolation, and RBAC authorization.
3. **Zero Direct Database Exposure**: Web applications, mobile clients, Electron desktop shells, and AI models have zero direct network exposure or credentials to MongoDB Atlas. All access flows through the authenticated NestJS API.
4. **Mandatory Tenant Scoping**: Every tenant-owned data access must be scoped to the authenticated caller's verified `tenantId`. A cross-tenant leak is classified as a Severity-0 (P0) critical defect.
5. **Least Privilege**: Users, services, and API keys operate with only the minimum set of permissions necessary to execute their designated duties.

---

## 2. Multi-Tenant Isolation & Identity Governance

### The Tenant Context Security Invariant
```text
Authenticated Session (JWT)
            │
            ▼
    Cryptographic Verification
            │
            ▼
    Extract Verified `tenantId`
            │
            ▼
Bind to Request Context (req.user.tenantId)
            │
            ▼
Pass to Tenant-Scoped Repository Query
```

- **No Client Tenant Trust**: The backend **never** accepts or honors a `tenantId` supplied by the client via request body, query string, or HTTP headers.
- **Uniform Error Masking**: Querying a resource belonging to another tenant returns `404 Not Found` (identical to a non-existent ID) to prevent cross-tenant entity enumeration, while internally raising a security audit warning.
- **Boundary Separation**:
  - **Platform Super Admin**: Manages SaaS tenants and billing; zero access to patient health records or clinical notes.
  - **Hospital Admin**: Manages own hospital staff and configuration; zero access to platform configuration or other hospitals.

---

## 3. Mandatory Tenant-Isolation Testing Strategy

Every release build and test suite must validate tenant isolation against the following attack scenarios:

| Test Scenario | Attack Simulation | Expected Result |
|---|---|---|
| **Scenario 1: Cross-Tenant Resource Read (IDOR)** | User from Hospital A requests Patient ID belonging to Hospital B via `GET /api/v1/patients/:id`. | HTTP `404 Not Found`; zero data returned; security audit logged. |
| **Scenario 2: Cross-Tenant Mutation** | Doctor from Hospital A attempts `PATCH /api/v1/patients/:id` on Hospital B's patient. | HTTP `404 Not Found`; Hospital B's patient record remains untouched. |
| **Scenario 3: Cross-Tenant Administration** | Hospital Admin from Hospital A attempts `DELETE /api/v1/users/:id` on Hospital B's staff user. | HTTP `404 Not Found`; target user unaffected. |
| **Scenario 4: Tenant Parameter Tampering** | Attacker injects `"tenantId": "target_tenant_id"` into `POST /api/v1/patients`. | Payload `tenantId` is stripped; record created with caller's verified `tenantId`. |
| **Scenario 5: Cross-Tenant Query Enumeration** | User from Hospital A requests `GET /api/v1/patients?limit=100`. | Response contains only Hospital A patients; zero Hospital B patients included. |

---

## 4. Authentication & Session Security

- **Password Hashing**:
  - Salted and hashed using `bcryptjs` with a work factor of 12.
  - Plaintext passwords are never stored, logged, or returned in API responses.
  - Schema definition marks password hashes `{ select: false }` to prevent accidental database extraction.
- **Brute-Force & Lockout Protection**:
  - Accounts track consecutive failed login attempts via `failedLoginAttempts`.
  - Upon 5 consecutive failed attempts, the account is locked for 15 minutes (`lockUntil`).
  - Successful authentication resets failed attempts to 0.
- **User Enumeration Defense**:
  - Failed logins return generic responses: `"Invalid email or password"`.
  - The API does not disclose whether a given email address exists.
- **Session & Cookie Security**:
  - Signed JSON Web Tokens (JWT) signed using HMAC SHA-256 (`HS256`) with a 24-hour expiration.
  - Set as `HttpOnly` cookies to protect against cross-site scripting (XSS) token harvesting.
  - Set to `SameSite=lax` to mitigate Cross-Site Request Forgery (CSRF).
  - Configured with `Secure=true` in production environments.

---

## 5. Role-Based Access Control (RBAC)

- **Permission Architecture**:
  ```text
  User → Tenant Context → Assigned Role → Permission Set → Guard Evaluation
  ```
- **Granular Permissions**: Formatted as `resource.action` (e.g. `patients.read`, `prescriptions.create`, `billing.invoices.create`).
- **Reusable Guards**:
  - `JwtAuthGuard`: Verifies valid cryptographic session.
  - `RolesGuard`: Validates role claims against `@Roles('super_admin', 'hospital_admin')`.
  - `PermissionsGuard`: Validates required permissions against `@RequirePermissions('resource.action')`.

---

## 6. Sensitive Medical & Financial Data Handling

- **Protected Health Information (PHI)**:
  - Patient demographics, clinical encounters, and diagnostic reports are accessible strictly to authorized clinical personnel within the specific hospital tenant.
  - Sensitive identifiers are masked on general administrative screens.
- **Financial Precision Standard**:
  - All monetary values are represented as MongoDB `Decimal128` or integer minor currency units to eliminate floating-point calculation drift.
- **Phase 2 AI Gateway**:
  - Future AI models operate strictly via an AI Gateway enforcing data minimization, PII token redaction, and read-only tool allowlists.
  - AI receives zero MongoDB credentials.

---

## 7. Audit Logging & Security Event Monitoring

- **Audit Collection (`audit_logs`)**:
  - Security-sensitive operations are permanently recorded:
    - Authentication events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`).
    - Administrative actions (user creation, role modification).
    - Cross-tenant access attempts (`CROSS_TENANT_ACCESS_ATTEMPT`).
    - Clinical access and prescription generation.
    - Invoicing, payments, and refunds.
- **Mandatory Redaction**:
  - Passwords, hashes, tokens, authorization headers, and card/bank numbers are automatically stripped from audit payloads.
- **Audit Immutability**:
  - Audit log documents cannot be updated or deleted through application APIs.

---

## 8. Network, API & Infrastructure Security

- **Security HTTP Headers (Helmet)**:
  - Strict Content Security Policy (CSP).
  - HTTP Strict Transport Security (HSTS).
  - X-Content-Type-Options: `nosniff`.
  - X-Frame-Options: `DENY` (Clickjacking defense).
- **Cross-Origin Resource Sharing (CORS)**:
  - Restricted strictly to explicitly allowlisted web application domains.
  - Wildcard (`*`) CORS origins are prohibited in production.
- **Input Validation**:
  - NestJS global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- **Database Security (MongoDB Atlas)**:
  - Enforced TLS 1.2+ for all database connections.
  - Network IP allowlists and VPC peering.
  - Dedicated least-privilege application database user.
  - Automated continuous backups with point-in-time recovery.

---

## 9. Regulatory Notice

> [!IMPORTANT]
> This system implements enterprise healthcare security and multi-tenant isolation best practices. However, do not claim formal compliance with HIPAA, GDPR, ISO 27001, or local digital health regulatory bodies without formal technical and legal audit verification by certified assessment authorities.
