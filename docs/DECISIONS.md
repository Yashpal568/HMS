# Hospital Management System — Architecture Decision Records (ADR)

**SOURCE-OF-TRUTH OWNER**: `docs/DECISIONS.md` (ARCHITECTURAL DECISION HISTORY)  
**Classification**: Historical Record  
**Product**: Multi-Tenant Hospital Management SaaS & Patient Healthcare Platform  
**Status**: Authoritative Architectural History & Decisions Log  

---

## Decision Index

- [Decision 001: Multi-Tenant SaaS Product Model](#decision-001-multi-tenant-saas-product-model)
- [Decision 002: Four Separate Application Surfaces](#decision-002-four-separate-application-surfaces)
- [Decision 003: Single Shared NestJS Canonical Backend](#decision-003-single-shared-nestjs-canonical-backend)
- [Decision 004: Hospital Admin and Doctor Experiences Inside `hms-client`](#decision-004-hospital-admin-and-doctor-experiences-inside-hms-client)
- [Decision 005: Autonomous Patient Application (`patient-app`)](#decision-005-autonomous-patient-application-patient-app)
- [Decision 006: Dedicated SaaS Super Admin Application (`super-admin`)](#decision-006-dedicated-saas-super-admin-application-super-admin)
- [Decision 007: MongoDB Atlas as Cloud System of Record](#decision-007-mongodb-atlas-as-cloud-system-of-record)
- [Decision 008: Redis for Caching, Rate Limiting, Temporary State & Queues](#decision-008-redis-for-caching-rate-limiting-temporary-state--queues)
- [Decision 009: Targeted Dockerization for Backend Server & Workers](#decision-009-targeted-dockerization-for-backend-server--workers)
- [Decision 010: Next.js Frontends Deployed to Vercel Edge](#decision-010-nextjs-frontends-deployed-to-vercel-edge)
- [Decision 011: NestJS Server and Workers Deployed to Render](#decision-011-nestjs-server-and-workers-deployed-to-render)
- [Decision 012: Cloudflare Edge for DNS, CDN, WAF & Security](#decision-012-cloudflare-edge-for-dns-cdn-waf--security)
- [Decision 013: Modular Monolith Backend Architecture](#decision-013-modular-monolith-backend-architecture)
- [Decision 014: AI Ready in Phase 1; AI Implementation in Phase 2](#decision-014-ai-ready-in-phase-1-ai-implementation-in-phase-2)
- [Decision 015: Shared Medicine Master Across Inventory, Pharmacy & Billing](#decision-015-shared-medicine-master-across-inventory-pharmacy--billing)
- [Decision 016: Immutable Finalized Clinical Encounters & Active Allergy Contraindication Engine](#decision-016-immutable-finalized-clinical-encounters--active-allergy-contraindication-engine)

---

### Decision 001: Multi-Tenant SaaS Product Model
- **Context**: The product must serve multiple independent hospitals, clinics, and medical chains on cloud infrastructure.
- **Decision**: Architect the system from day one as a sovereign multi-tenant SaaS platform hosted on MongoDB Atlas with document-level discriminator fields (`tenantId`).
- **Rationale**: Single-tenant hosting creates immense operational overhead when managing updates, schemas, and maintenance across hundreds of clinics. Multi-tenancy with strict data access layer enforcement provides rapid onboarding and cost efficiency.
- **Consequences**: Every tenant collection must be indexed and scoped by `{ tenantId }`. Cross-tenant IDOR probes must uniformly return `404 Not Found`.

---

### Decision 002: Four Separate Application Surfaces
- **Context**: The product serves distinct user personas with fundamentally divergent security requirements, UX expectations, and deployment lifecycles.
- **Decision**: Partition the monorepo into four distinct applications:
  1. `apps/server/` (NestJS backend API)
  2. `apps/hms-client/` (Hospital administration & clinical staff)
  3. `apps/patient-app/` (Consumer patient healthcare portal)
  4. `apps/super-admin/` (SaaS platform owner console)
- **Rationale**: Prevents accidental leakage of administrative or patient data into unrelated bundles, isolates attack surfaces, and allows independent continuous deployment.
- **Consequences**: Frontends must be maintained as standalone Next.js apps reusing shared packages in `packages/`.

---

### Decision 003: Single Shared NestJS Canonical Backend
- **Context**: Multiple frontends require API services for authentication, appointments, and billing.
- **Decision**: Maintain a single canonical backend application (`apps/server/`) in NestJS serving all three frontends.
- **Rationale**: Avoids redundant business logic, duplicated schema models, and out-of-sync validation rules that occur when building separate backend-for-frontend (BFF) layers prematurely.
- **Consequences**: All API routes are unified under `/api/v1` with role-based and surface-based guards.

---

### Decision 004: Hospital Admin and Doctor Experiences Inside `hms-client`
- **Context**: Physicians and hospital administrators frequently operate within the same physical hospital environment and require shared real-time awareness of clinic operations.
- **Decision**: Host both the Hospital Administrator and Doctor experiences inside `apps/hms-client/` with role-based workspace segregation.
- **Rationale**: Doctors and administrators interact with shared clinical resources (schedules, departments, appointments). Creating a separate `doctor-app` would lead to duplicated UI components and navigation infrastructure.
- **Consequences**: The AppShell dynamically switches between Administrator and Doctor Cockpit navigation based on verified JWT role claims.

---

### Decision 005: Autonomous Patient Application (`patient-app`)
- **Context**: Patients require a mobile-first, consumer-grade experience for discovery, appointments, and live OPD queue tracking.
- **Decision**: Establish `apps/patient-app/` as a completely decoupled Next.js web application.
- **Rationale**: Patient interfaces require extreme performance on mobile cellular networks, high accessibility, and zero exposure to internal hospital administrative workflows.
- **Consequences**: Patient features must never be mixed into `hms-client`. Patient health records must never become publicly indexable.

---

### Decision 006: Dedicated SaaS Super Admin Application (`super-admin`)
- **Context**: The SaaS platform provider needs an operational control plane for onboarding hospital tenants, setting subscription tiers, and inspecting system telemetry.
- **Decision**: Establish `apps/super-admin/` as an isolated application with distinct domain hosting.
- **Rationale**: Hospital administrators must never have access to platform tenant controls, and platform operators must never have access to private patient clinical records.
- **Consequences**: Strict role restriction (`PLATFORM_SUPER_ADMIN`). Hospital Admin credentials cannot authenticate against this application.

---

### Decision 007: MongoDB Atlas as Cloud System of Record
- **Context**: Healthcare workflows produce polymorphic clinical notes, varying lab parameters, and nested electronic prescription lines.
- **Decision**: Select MongoDB Atlas as the primary cloud database. PostgreSQL and Prisma are strictly excluded.
- **Rationale**: Document data models naturally match healthcare EMR structures (encounters with nested observation components) while MongoDB Atlas provides enterprise encryption at rest, automatic sharding, and multi-region replica sets.
- **Consequences**: Frontends, Electron shells, and AI models are strictly prohibited from connecting directly to MongoDB.

---

### Decision 008: Redis for Caching, Rate Limiting, Temporary State & Queues
- **Context**: The system requires low-latency token counting, distributed rate limiting, and reliable asynchronous background processing.
- **Decision**: Integrate Managed Redis with tenant-aware key namespacing (`tenant:{tenantId}:...`) and BullMQ.
- **Rationale**: Keeps MongoDB Atlas focused on authoritative persistent transactions while offloading transient queue states and high-frequency rate-limit counters to ultra-fast in-memory storage.
- **Consequences**: Redis must never be used as a permanent patient database. All tenant keys must include tenant prefixes.

---

### Decision 009: Targeted Dockerization for Backend Server & Workers
- **Context**: Next.js frontends and NestJS backend processes have distinct deployment characteristics.
- **Decision**: Utilize Docker containerization specifically for `apps/server/` and background workers. Next.js frontends are deployed natively to edge platforms.
- **Rationale**: Containerizing static Next.js frontends introduces unnecessary build overhead and cold-start latency compared to native Vercel Edge hosting. Containerizing the NestJS server guarantees runtime parity.
- **Consequences**: Dockerfiles are maintained strictly for `apps/server/` and worker runtimes.

---

### Decision 010: Next.js Frontends Deployed to Vercel Edge
- **Context**: Frontends need global low-latency CDN distribution, fast image optimization, and rapid CI/CD preview environments.
- **Decision**: Plan deployment of `hms-client`, `patient-app`, and `super-admin` to Vercel.
- **Rationale**: Vercel offers native Next.js optimization, edge caching, and zero-configuration branch preview environments.
- **Consequences**: Frontend builds must adhere strictly to edge-compatible Next.js patterns.

---

### Decision 011: NestJS Server and Workers Deployed to Render
- **Context**: The backend API requires persistent Node.js processes, web sockets for real-time queue updates, and background worker queues.
- **Decision**: Plan deployment of `apps/server/` web service and BullMQ worker processes to Render using Docker containers.
- **Rationale**: Render offers cost-effective, persistent container instances with integrated health checks, private networking, and automated zero-downtime rolling deploys.
- **Consequences**: The NestJS server exposes dedicated `/health/liveness` and `/health/readiness` probes.

---

### Decision 012: Cloudflare Edge for DNS, CDN, WAF & Security
- **Context**: Healthcare SaaS platforms are frequent targets of DDoS attacks and malicious web scraping.
- **Decision**: Route all public traffic through Cloudflare Anycast DNS and Web Application Firewall (WAF).
- **Rationale**: Provides edge DDoS mitigation, SSL/TLS termination, automated bot protection, and IP reputation filtering prior to traffic hitting application servers.
- **Consequences**: Cloudflare security headers and origin certificates are enforced.

---

### Decision 013: Modular Monolith Backend Architecture
- **Context**: Healthcare domains (patients, appointments, pharmacy, billing) are deeply interconnected.
- **Decision**: Implement the backend as a cohesive Modular Monolith in NestJS before considering microservices.
- **Rationale**: Premature microservices introduce severe distributed transactions complexity, network latency, and operational fragility. A modular monolith provides clean domain separation with single-database ACID transaction safety.
- **Consequences**: Modules must communicate through clean internal service interfaces rather than cross-module raw database queries.

---

### Decision 014: AI Ready in Phase 1; AI Implementation in Phase 2
- **Context**: Artificial intelligence copilots are a core commercial differentiator, but premature AI implementation destabilizes foundational clinical workflows.
- **Decision**: Defer AI agent implementations strictly to Phase 2 while designing all Phase 1 REST APIs and schemas to be AI-ready.
- **Rationale**: High-quality AI copilots require reliable, normalized clinical data and robust RBAC guards. Attempting AI before establishing clean data models causes unpredictable hallucinations and security vulnerabilities.
- **Consequences**: No LLM models or LangChain dependencies in Phase 1. REST APIs and audit logs are designed with tool calling in mind.

---

### Decision 015: Shared Medicine Master Across Inventory, Pharmacy & Billing
- **Context**: Pharmaceutical catalog duplication between pharmacy dispensing and patient invoicing leads to pricing drift, tax miscalculations, and stock discrepancies.
- **Decision**: Enforce a strict single-source-of-truth Medicine Master (`medicines`) shared across Inventory, Pharmacy, and Billing.
- **Rationale**: Guarantees that invoices always consume authentic batch MRPs and tax rates directly from verified pharmacy inventory.
- **Consequences**: The billing module is strictly prohibited from creating or maintaining its own separate medication price list. Bulk CSV/Excel import is supported.

---

### Decision 016: Immutable Finalized Clinical Encounters & Active Allergy Contraindication Engine
- **Context**: Medical liability and patient safety require that sealed doctor consultations cannot be retroactively altered, and that physicians are actively protected against ordering medications to which a patient has a documented allergy.
- **Decision**: Finalized encounters are sealed and protected against all further mutations; any edit attempts after finalization are rejected with `400 Bad Request`. During prescription creation, an active contraindication engine cross-references prescribed drug names against the patient's allergy records, displaying real-time visual alerts and emitting safety events.
- **Rationale**: Clinical records form the legal and medical basis for patient care. Immutability satisfies regulatory auditability requirements, while contraindication checking prevents adverse drug events (ADEs).
- **Consequences**: All changes to sealed records must be made via addenda or new subsequent consultation encounters. All finalizations trigger atomic appointment status advancement and audit logging.

---

### Decision 017: FEFO Automated Batch Selection & Concurrency-Safe Stock Deduction
- **Context**: Hospital pharmacies must dispense medications before expiration to prevent clinical wastage and patient harm, and multiple dispensing counters may fulfill prescriptions simultaneously against shared batch inventory.
- **Decision**: The pharmacy system automatically sorts available batches by `expiryDate ASC` and pre-selects the earliest non-expired batch (`isFefoRecommended: true`). All stock deductions are performed using atomic MongoDB operators (`findOneAndUpdate({ _id: batchId, tenantId, currentQuantity: { $gte: quantity } }, { $inc: { currentQuantity: -quantity } })`).
- **Rationale**: FEFO (First Expiry, First Out) minimizes pharmaceutical shrinkage, while atomic conditional updates eliminate race conditions without requiring coarse-grained distributed table locks.
- **Consequences**: Expired batches (`daysToExpiry <= 0`) are disqualified from dispensing and return `400 Bad Request`. Every movement is audited in `pharmacy_transactions` with running `balanceAfter`.



