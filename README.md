# HMS MedCore — Hospital Management SaaS & Patient Healthcare Platform

[![Monorepo: pnpm](https://img.shields.io/badge/monorepo-pnpm-orange.svg)](https://pnpm.io)
[![Backend: NestJS](https://img.shields.io/badge/backend-NestJS%2011-red.svg)](https://nestjs.com)
[![Frontend: Next.js](https://img.shields.io/badge/frontend-Next.js%2015-black.svg)](https://nextjs.org)
[![Database: MongoDB Atlas](https://img.shields.io/badge/database-MongoDB%20Atlas-green.svg)](https://www.mongodb.com/atlas)
[![Cache: Redis](https://img.shields.io/badge/cache-Redis-red.svg)](https://redis.io)
[![TypeScript: 5.8](https://img.shields.io/badge/language-TypeScript%205.8-blue.svg)](https://www.typescriptlang.org)

**SOURCE-OF-TRUTH OWNER**: `README.md` (DEVELOPER ENTRY POINT)  
**Classification**: Reference & Onboarding Entry Point  

---

## 1. Product Mission & Overview

**HMS MedCore** is a multi-tenant healthcare Software-as-a-Service (SaaS) platform engineered for modern healthcare networks, multispecialty hospitals, and outpatient clinics, coupled with a consumer-facing Patient Healthcare Platform.

The platform is architected around **four distinct application surfaces** sharing a unified, secure backend foundation:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOUR APPLICATION SURFACES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. apps/server/       │ The ONLY canonical backend API (NestJS + TypeScript)│
│                       │ Shared by all three frontends. Encapsulates multi-  │
│                       │ tenancy, RBAC, clinical EMR, pharmacy, and billing. │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ 2. apps/hms-client/   │ Dedicated Hospital Management workstation (Next.js) │
│                       │ Used by Hospital Administrators, Physicians (Doctor │
│                       │ Cockpit), Nurses, Pharmacists, and Billing staff.   │
├───────────────────────┼─────────────────────────────────────────────────────┤
│ 3. apps/patient-app/  │ Mobile-first Patient Healthcare portal (Next.js)    │
│                       │ Hospital/Doctor discovery, appointment scheduling,  │
│                       │ live OPD Queue Tracker, and Personal Health Records.│
├───────────────────────┼─────────────────────────────────────────────────────┤
│ 4. apps/super-admin/  │ Dedicated SaaS Platform Owner console (Next.js)     │
│                       │ Tenant provisioning, commercial subscription tiers, │
│                       │ plan quotas, platform telemetry, and system health. │
└───────────────────────┴─────────────────────────────────────────────────────┘
```

---

## 2. Architecture & Communication Topology

All three frontend applications communicate exclusively with the canonical NestJS REST API (`apps/server/`). No client application, mobile app, desktop shell, or AI agent ever establishes a direct connection to MongoDB Atlas.

```text
   apps/hms-client/          apps/patient-app/          apps/super-admin/
  (Hospital & Doctor)       (Patient Platform)         (SaaS Owner Console)
           │                         │                          │
           └─────────────────────────┼──────────────────────────┘
                                     │ HTTPS REST API (/api/v1)
                                     ▼
                        ┌──────────────────────────┐
                        │       apps/server/       │
                        │   (Modular Monolith API) │
                        └────────────┬─────────────┘
                                     │ TLS 1.3 / Driver
                                     ▼
                        ┌──────────────────────────┐
                        │      MongoDB Atlas       │
                        │   (System of Record)     │
                        └──────────────────────────┘
```

### Core Architectural Decisions:
- **Modular Monolith**: The backend is architected as a clean modular monolith in NestJS to ensure single-database ACID transaction safety across complex clinical and billing workflows.
- **Strict Multi-Tenancy**: Every hospital tenant is completely isolated using discriminator scoping (`tenantId`). The backend derives `tenantId` strictly from the cryptographically verified JWT payload (`req.user.tenantId`). Client-supplied tenant IDs are strictly rejected.
- **Single Medicine Master**: The hospital formulary (`medicines`) is the authoritative source for Pharmacy and Billing. The billing engine never maintains a duplicate medicine catalog.
- **AI-Ready in Phase 1**: Full AI Gateway architecture and 18 specialized agents are cataloged and designed; implementation is strictly deferred to Phase 2.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js 22, NestJS 11, TypeScript 5.8, Mongoose ODM, Passport.js, JWT, BullMQ |
| **Frontend Applications** | Next.js 15 (App Router), React 19, Tailwind CSS v4, Radix UI Primitives, Lucide Icons |
| **Database & Cache** | MongoDB Atlas (Multi-region replica set), Managed Redis (In-memory cache, rate limits, BullMQ) |
| **Monorepo Tooling** | pnpm workspaces, Turborepo, Vitest, ESLint, OxLint |
| **Infrastructure (Target)** | Render (Docker for Server & Workers), Vercel (Edge for Frontends), Cloudflare (WAF/DNS) |

---

## 4. Repository Structure

```text
hms-medcore/
├── apps/
│   ├── server/          # Canonical NestJS REST API backend
│   ├── hms-client/      # Dedicated Hospital & Doctor workstation web app
│   ├── patient-app/     # Mobile-first Patient Healthcare platform
│   └── super-admin/     # SaaS Platform Owner management console
├── packages/
│   ├── ui/              # Shared Tailwind & Radix UI component library
│   ├── types/           # Shared TypeScript domain contracts, DTOs & enums
│   ├── config/          # Centralized ESLint, Tailwind, and TSConfigs
│   └── auth/            # Shared JWT payload decoders and session context utilities
├── docs/                # Master documentation suite (14 authoritative specifications)
├── infrastructure/      # Dockerfiles and deployment configurations
├── task.md              # Active development execution tracker
└── README.md            # Project overview & architectural guide
```

---

## 5. Master Documentation Index

All architectural specifications, database schemas, and security protocols are maintained in `docs/`:

1. [docs/PRD.md](file:///e:/FluBird/docs/PRD.md) — Master Product Requirements Document (v3.0.0).
2. [docs/ARCHITECTURE.md](file:///e:/FluBird/docs/ARCHITECTURE.md) — System Architecture, Topology & Request Pipeline.
3. [docs/DATABASE.md](file:///e:/FluBird/docs/DATABASE.md) — 26 Collections Data Dictionary, Compound Indexes & Single Catalog.
4. [docs/SECURITY.md](file:///e:/FluBird/docs/SECURITY.md) — Zero-Trust Tenant Isolation, RBAC & OWASP Alignment.
5. [docs/FRONTEND.md](file:///e:/FluBird/docs/FRONTEND.md) — Specifications for `hms-client`, `patient-app`, and `super-admin`.
6. [docs/BACKEND.md](file:///e:/FluBird/docs/BACKEND.md) — NestJS Modular Monolith, Redis Queues, and Error Standards.
7. [docs/DESIGN.md](file:///e:/FluBird/docs/DESIGN.md) — Design Tokens, Typography, HSL Palettes & Real-Time Queue UI.
8. [docs/SAAS.md](file:///e:/FluBird/docs/SAAS.md) — Commercial Tiers, Subscription Lifecycles & Quota Enforcement.
9. [docs/PATIENT_PLATFORM.md](file:///e:/FluBird/docs/PATIENT_PLATFORM.md) — Patient Discovery, Booking Wizard & Live Queue Engine.
10. [docs/AI_ARCHITECTURE.md](file:///e:/FluBird/docs/AI_ARCHITECTURE.md) — Phase 2 AI Gateway & 18 Specialized Agents Catalog.
11. [docs/DEPLOYMENT.md](file:///e:/FluBird/docs/DEPLOYMENT.md) — Cloud Hybrid Hosting (Render, Vercel, Cloudflare, Atlas).
12. [docs/DEVELOPMENT_RULES.md](file:///e:/FluBird/docs/DEVELOPMENT_RULES.md) — The 20 Permanent Development Rules.
13. [docs/MILESTONES.md](file:///e:/FluBird/docs/MILESTONES.md) — Master Roadmap (Milestones M00 through M13).
14. [docs/DECISIONS.md](file:///e:/FluBird/docs/DECISIONS.md) — Architecture Decision Records (ADR 001 to ADR 015).

---

## 6. Local Development Setup

### Prerequisites
- **Node.js**: v20+ or v22 LTS
- **pnpm**: v9+ (`npm install -g pnpm`)
- **MongoDB Atlas** cluster URI or local MongoDB instance
- **Redis** instance (local or managed)

### Quick Start
```bash
# 1. Clone repository and install dependencies
git clone https://github.com/Yashpal568/HMS.git
cd HMS
pnpm install

# 2. Configure environment variables in apps/server/.env
cp apps/server/.env.example apps/server/.env
# Update MONGODB_URI and JWT_SECRET

# 3. Start development servers
pnpm dev
```

### Application Ports
- **Backend API (`apps/server`)**: `http://localhost:4000`
- **Hospital Client (`apps/hms-client`)**: `http://localhost:3000`
- **Patient Platform (`apps/patient-app`)**: `http://localhost:3001`
- **Super Admin Console (`apps/super-admin`)**: `http://localhost:3002`

---

## 7. Verification & Testing Commands

```bash
# Run TypeScript compilation checks across all 4 applications
pnpm typecheck

# Run linter across all packages and apps
pnpm lint

# Run automated backend unit tests
pnpm test

# Build production bundles for all applications
pnpm build
```

---

## 8. Development Lifecycle & Operating Rules

All engineering sessions follow the standardized **READ -> UNDERSTAND -> PLAN -> IMPLEMENT -> TEST -> DOCUMENT -> UPDATE TASK -> STOP** lifecycle defined in [AGENTS.md](file:///e:/FluBird/AGENTS.md) and [docs/DEVELOPMENT_RULES.md](file:///e:/FluBird/docs/DEVELOPMENT_RULES.md).

- **Current Milestone**: **Milestone 1 — Authentication + Multi-Tenancy + RBAC** *(Awaiting explicit user instruction)*.
- **Milestone 0 (Project Foundation)**: **COMPLETED**.
