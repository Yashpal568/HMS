# Hospital Management System — Security Policy & Controls

This document defines the security architecture, data governance principles, and access controls for the Hospital Management System (HMS).

---

## 1. Security Architecture Principles

1. **Defense in Depth**: Security controls are enforced across multiple tiers: network, transport, API gateway, application controller, service authorization, and database layer.
2. **Authoritative Backend**: Client-side route protection is a user experience feature; the NestJS backend is the sole authoritative gatekeeper for authentication and authorization.
3. **Zero Direct Database Exposure**: Neither web clients, mobile apps, desktop Electron wrappers, nor AI models have direct network access or credentials to MongoDB Atlas.
4. **Least Privilege**: Users and services operate with only the minimum set of permissions necessary to execute their duties.

---

## 2. Authentication & Identity Management

- **Password Hashing**:
  - Passwords are salted and hashed using `bcryptjs` with a work factor of 12.
  - Plaintext passwords are never persisted to disk, transmitted in logs, or returned in API responses.
  - Password hashes are marked `{ select: false }` on the Mongoose user schema, ensuring they are excluded by default from database queries.
- **Brute-Force & Lockout Protection**:
  - Consecutive failed login attempts are tracked via `loginAttempts`.
  - Upon 5 consecutive failed attempts, the account is locked for 15 minutes (`lockUntil`).
  - Successful authentication resets `loginAttempts` to 0.
- **User Enumeration Prevention**:
  - Failed authentication attempts emit generic error responses: `"Invalid email or password"`.
  - The API does not disclose whether a given username or email address exists.
- **Account Status Verification**:
  - Accounts with status `INACTIVE` or `SUSPENDED` are rejected during authentication regardless of password validity.

---

## 3. Session & Token Strategy

- **Dual-Channel Tokens**:
  - Signed JSON Web Tokens (JWT) signed using HMAC SHA-256 (`HS256`) with a 24-hour expiration window.
  - Tokens are transmitted in the response body for programmatic access (e.g. mobile/desktop) AND set as a browser cookie.
- **Cookie Security**:
  - Cookies are marked `HttpOnly` to prevent JavaScript access and protect against cross-site scripting (XSS) token harvesting.
  - Set to `SameSite=lax` to mitigate Cross-Site Request Forgery (CSRF).
  - Configured with `Secure=true` in production environments.
- **Token Invalidation on Logout**:
  - Invoking `POST /api/v1/auth/logout` explicitly clears the session cookie and logs a security audit event.

---

## 4. Role-Based Access Control (RBAC)

- **Architecture**:
  ```text
  User → Assigned Role → Permission Array → Guard Evaluation
  ```
- **Permission Representation**: Formatted as `resource.action` (e.g. `patients.read`, `prescriptions.create`, `billing.payments.process`).
- **Reusable Guards**:
  - `JwtAuthGuard`: Confirms valid authenticated session.
  - `RolesGuard`: Validates role claims against `@Roles('super_admin', 'hospital_admin')`.
  - `PermissionsGuard`: Validates required permissions against `@RequirePermissions('resource.action')`.
- **Method-Level Protection**: Controllers must declare authorization requirements declaratively using decorators.

---

## 5. Sensitive Medical & Financial Data Handling

- **Personally Identifiable Information (PII)**:
  - Patient identifiers, contacts, and clinical files are accessible strictly to authorized clinical and administrative personnel.
  - Sensitive patient demographics are masked on non-essential operational displays.
- **Financial Precision**:
  - All financial monetary fields (invoices, payments, tariffs, refunds) are stored as MongoDB `Decimal128` or integer minor units (cents/paise) to avoid IEEE floating-point calculation drift.
- **AI Data Minimization (Phase 2)**:
  - Any future AI model integration must pass through an AI Gateway that redacts PII before prompt compilation.
  - AI receives no database credentials and has zero direct query capabilities.

---

## 6. Audit Logging Infrastructure

- **Audit Collection (`audit_logs`)**:
  - Every security-sensitive action is permanently logged:
    - Authentication events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`).
    - Administrative changes (user creation, role assignment).
    - Clinical access and prescription generation.
    - Financial operations (invoicing, payments, refunds).
- **Mandatory Redaction**:
  - Audit logging services automatically strip all passwords, password hashes, bearer tokens, and secrets from the `details` payload.
- **Audit Immutability**:
  - Audit logs cannot be modified or deleted through application APIs.

---

## 7. Network & API Security

- **Security HTTP Headers (Helmet)**:
  - Content Security Policy (CSP).
  - HTTP Strict Transport Security (HSTS).
  - X-Content-Type-Options: `nosniff`.
  - X-Frame-Options: `DENY` (Clickjacking prevention).
- **Cross-Origin Resource Sharing (CORS)**:
  - Restricted to explicitly allowlisted origins (configured via `CORS_ORIGINS`).
  - Wildcard (`*`) origins are strictly prohibited.
- **Input Validation**:
  - Global `ValidationPipe` enforces whitelisting and rejects non-whitelisted request properties.
- **Rate Limiting (Production)**:
  - Throttler protection on sensitive endpoints to prevent credential stuffing and denial of service.

---

## 8. Database Security (MongoDB Atlas)

- **Network Restrictions**: Database access restricted to verified application server IP addresses or VPC peering.
- **Transport Encryption**: Enforced TLS 1.2+ for all database connections.
- **Secrets Management**:
  - MongoDB connection strings and secrets stored in local `.env` files that are strictly excluded by `.gitignore`.
  - Only template `.env.example` with non-sensitive placeholders is committed.

---

## 9. Regulatory Notice

> [!IMPORTANT]
> This system incorporates enterprise healthcare security best practices. However, do not claim formal compliance with HIPAA, GDPR, ISO 27001, or local digital health regulatory standards unless formal legal and technical audit verification has been executed and certified by authorized regulatory bodies.
