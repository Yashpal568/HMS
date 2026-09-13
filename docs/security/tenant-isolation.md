# Tenant Isolation Security Policy & Threat Defense

**Product**: Hospital Management System (HMS MedCore)  
**Security Classification**: Critical Medical SaaS Infrastructure  
**Authoritative Scope**: Multi-Tenant Isolation, IDOR Defense, Cross-Tenant Security Testing  

---

## 1. Threat Model & Security Objectives

In a multi-tenant healthcare SaaS application, **tenant data leakage is a critical security vulnerability (P0)**. A failure of tenant isolation risks unauthorized disclosure of Protected Health Information (PHI), medical history, diagnoses, and financial transactions between independent hospital organizations.

### Primary Threat Vectors

| Threat Vector | Description | Risk Level | Architectural Defense |
|---|---|---|---|
| **Insecure Direct Object Reference (IDOR)** | Attacker from Tenant A guesses or iterates an ObjectId belonging to Tenant B (e.g. `GET /api/v1/patients/65df8b...`). | **CRITICAL** | All queries strictly bind `{ _id: id, tenantId: user.tenantId }`. Cross-tenant probes return uniform `404 Not Found`. |
| **Tenant Parameter Tampering** | Attacker injects a forged `tenantId` into the request body or query parameter (`{ "tenantId": "tenant_b", "amount": 100 }`). | **CRITICAL** | Request DTOs strip client-supplied `tenantId`. Backend forces `tenantId` directly from verified JWT claims. |
| **Header Spoofing** | Attacker sends malicious `X-Tenant-ID` or `Host` headers attempting to trick middleware into cross-tenant context. | **CRITICAL** | The system **never** reads tenant context from arbitrary request headers. Session JWT is the sole authoritative source. |
| **Privilege Escalation across Tenants** | Tenant A Administrator attempts to invoke administrative endpoints on Tenant B staff or settings. | **CRITICAL** | RBAC validation is evaluated exclusively within the caller's verified `tenantId` namespace. |
| **Information Disclosure via Error Timing** | Attacker differentiates between nonexistent IDs and foreign tenant IDs via response codes or timing differentials. | **HIGH** | Uniform error responses: querying a non-existent entity and querying an entity owned by another tenant both return identical `404 Not Found` messages. |

---

## 2. Multi-Layer Defense Architecture

The HMS enforces tenant isolation across four defensive lines:

```text
[ Incoming Request ]
        │
        ▼
[ Layer 1: Cryptographic Authentication ]
  - Validates JWT signature and expiration.
  - Extracts authenticated user claims: { sub: userId, tenantId: string, role: string }.
        │
        ▼
[ Layer 2: Context Binding & Sanitization ]
  - NestJS Interceptor/Guard binds verified tenantId to execution context.
  - ValidationPipe strips any client-provided `tenantId` from request bodies.
        │
        ▼
[ Layer 3: Service-Level Tenant Scoping ]
  - Application services enforce `tenantId` as a non-optional parameter in every domain method.
  - Example: `patientService.findById(id, tenantId)`
        │
        ▼
[ Layer 4: Data Layer Compound Scoping ]
  - Mongoose queries execute against indexed compound filters:
    `PatientModel.findOne({ _id: patientId, tenantId: userTenantId })`
  - Zero unscoped queries allowed.
```

---

## 3. Uniform Error Handling & Existence Masking

To prevent attackers from using error responses to enumerate valid patient records or user IDs across different hospitals:

1. **Existence Masking**:
   If a user from Hospital A attempts to fetch a resource with ID `XYZ` that belongs to Hospital B:
   - ❌ **DO NOT RETURN**: `403 Forbidden` with `"You do not have access to Hospital B's patient"`. (This leaks that patient `XYZ` exists in Hospital B).
   - ✅ **MUST RETURN**: `404 Not Found` with uniform error message `"Resource not found"`.
2. **Audit Escalation**:
   While a `404 Not Found` is returned to the client, an internal security event `CROSS_TENANT_ACCESS_ATTEMPT` is dispatched to the security audit trail with the caller's `userId`, `tenantId`, targeted `resourceId`, and client IP.

---

## 4. Platform Admin vs Hospital Admin Security Boundaries

The system strictly decouples SaaS provider administrators from hospital customer administrators:

```text
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│        Platform Super Admin           │   │         Hospital Admin                │
├───────────────────────────────────────┤   ├───────────────────────────────────────┤
│ • Bound to Platform Global Scope      │   │ • Bound strictly to Tenant A          │
│ • Can provision & suspend tenants     │   │ • Can configure Hospital A settings   │
│ • Can manage billing plans & modules  │   │ • Can create/manage Hospital A staff  │
│ • CANNOT view patient EMR/records     │   │ • CANNOT manage other hospitals       │
│ • CANNOT alter clinical notes         │   │ • CANNOT access Platform Admin APIs   │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
```

---

## 5. Mandatory Tenant-Isolation Automated Test Suite

Every release, pull request, and milestone build must execute automated tenant-isolation regression tests.

### Required Test Scenarios

#### Scenario 1: Cross-Tenant Resource Read (IDOR)
- **Setup**: Create Tenant A (with Patient PA) and Tenant B (with Patient PB).
- **Execution**: Authenticate as Doctor in Tenant A; issue `GET /api/v1/patients/{PB._id}`.
- **Assertion**:
  - Response HTTP Status: `404 Not Found`.
  - Response body contains standard error envelope; zero clinical data from Patient PB.
  - Security audit log contains `CROSS_TENANT_ACCESS_ATTEMPT` warning.

#### Scenario 2: Cross-Tenant Resource Mutation
- **Setup**: Tenant A Doctor attempts `PATCH /api/v1/patients/{PB._id}` with updated demographics.
- **Assertion**:
  - Response HTTP Status: `404 Not Found`.
  - Patient PB record in database remains completely unmodified.

#### Scenario 3: Cross-Tenant Resource Deletion
- **Setup**: Tenant A Admin attempts `DELETE /api/v1/users/{Tenant_B_User._id}`.
- **Assertion**:
  - Response HTTP Status: `404 Not Found`.
  - Tenant B user remains intact and active.

#### Scenario 4: Request Body Parameter Tampering
- **Setup**: Tenant A Receptionist sends `POST /api/v1/patients` with payload containing `"tenantId": "Tenant_B_ID"`.
- **Assertion**:
  - Created patient record in MongoDB Atlas has `tenantId: Tenant_A_ID`.
  - Client-supplied `tenantId` is completely ignored and overridden by authenticated JWT context.

#### Scenario 5: Cross-Tenant List / Query Scoping
- **Setup**: 50 patients registered in Tenant A; 50 patients registered in Tenant B.
- **Execution**: Tenant A user calls `GET /api/v1/patients?limit=100`.
- **Assertion**:
  - Response returns exactly the 50 patients belonging to Tenant A.
  - Zero patients from Tenant B are included in the results or pagination metadata.
