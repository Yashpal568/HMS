# Hospital Management System — Deployment Strategy

**Product**: Hospital Management System (HMS MedCore)  
**Model**: Multi-Tenant SaaS Platform  
**Database**: MongoDB Atlas  
**Status**: Authoritative Deployment Policy  

---

## 1. Approved Deployment Direction

**WEB-FIRST MULTI-TENANT SAAS → WINDOWS DESKTOP (.EXE) LATER**

The official business direction is a cloud-hosted, subscription-based Multi-Tenant SaaS application.

---

## 2. Primary Architecture: Cloud Multi-Tenant SaaS

```text
Hospital Clinicians & Staff (Browsers)
                  │
                  ▼ HTTPS / WAF
       Next.js Web Application
                  │ HTTPS REST API
                  ▼
  NestJS Modular Monolith API Gateway
    ├── Authentication & Session Verification
    ├── Tenant Context Resolution (req.user.tenantId)
    ├── RBAC Authorization Guards
    └── Tenant-Scoped Domain Services
                  │ TLS 1.2+ Mongoose Driver
                  ▼
        MongoDB Atlas Cloud Cluster
    ├── Multi-AZ High Availability
    ├── Continuous Automated Backups
    └── Enforced Encryption at Rest & In-Transit
```

All hospitals and medical clinics operate as isolated tenants on this managed cloud architecture.

---

## 3. Secondary Architecture: Windows Desktop Shell (Phase 2)

```text
Next.js Web Application UI
            │
            ▼
   Electron Shell Wrapper
            │
            ▼
    HMS.exe / HMS.msi
            │ HTTPS REST API
            ▼
     NestJS Cloud API
            │
            ▼
      MongoDB Atlas
```

The desktop packaging completely reuses the existing Next.js web application and cloud API. A separate desktop backend or direct desktop-to-database connection is strictly prohibited.

---

## 4. Non-Negotiable Deployment Rules

1. **Strict Tenant Isolation**: All tenant-owned queries must be server-scoped using `tenantId`.
2. **Zero Direct Database Exposure**: Neither browser clients nor Electron wrappers can connect directly to MongoDB Atlas.
3. **Modular Monolith Integrity**: All business logic remains centralized in NestJS domain services.
4. **Phase 1 Independence**: Phase 1 is 100% web-first and does not install or depend on Electron.
5. **No Microservices**: The entire system deploys as a clean modular monolith.
6. **No PostgreSQL/Prisma**: MongoDB Atlas is the exclusive system of record.
