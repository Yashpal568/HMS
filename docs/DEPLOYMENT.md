# Hospital Management System — Deployment & Infrastructure Topology

**SOURCE-OF-TRUTH OWNER**: `docs/DEPLOYMENT.md` (DEPLOYMENT & INFRASTRUCTURE)  
**Classification**: Authoritative  
**Architecture Model**: Cloud Hybrid (Serverless Edge Frontends + Containerized Backend + Managed Cloud Data)  
**Status**: Authoritative Infrastructure Specification  

---

## 1. Production Deployment Topology

The system deploys across best-in-class cloud infrastructure providers optimized for each component's runtime requirements:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE EDGE & NETWORK TIER                        │
│   • Anycast DNS • Global CDN • Web Application Firewall (WAF)               │
│   • DDoS Mitigation • Automated TLS 1.3 Termination                         │
└───────┬───────────────────────────────┬───────────────────────────────┬─────┘
        │                               │                               │
        ▼                               ▼                               ▼
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│   VERCEL EDGE    │            │   VERCEL EDGE    │            │   VERCEL EDGE    │
│  apps/hms-client │            │ apps/patient-app │            │ apps/super-admin │
│ (Hospital/Doctor)│            │(Patient Platform)│            │ (Platform Owner) │
└────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
         │                               │                               │
         └───────────────────────┬───────┴───────────────────────────────┘
                                 │ REST API Calls (HTTPS)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RENDER CLOUD CONTAINER TIER                       │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │     apps/server (Web Service)   │   │  apps/server (BullMQ Worker)    │  │
│  │   Dockerized NestJS REST API    │   │   Dockerized Background Worker  │  │
│  │   Auto-scaling, Health checks   │   │   Reports, SMS, Queue Alerts    │  │
│  └────────────────┬────────────────┘   └────────────────┬────────────────┘  │
└───────────────────┼─────────────────────────────────────┼───────────────────┘
                    │ Private Network                     │ Private Network
                    ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MANAGED DATA SERVICES                            │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │          MONGODB ATLAS          │   │          MANAGED REDIS          │  │
│  │   Primary System of Record      │   │   Cache, Rate Limits & BullMQ   │  │
│  │   Multi-region replica set      │   │   High-performance in-memory    │  │
│  │   Encrypted at rest (AES-256)   │   │   Tenant-namespaced keys        │  │
│  └─────────────────────────────────┘   └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Hosting Assignments

| Component | Technology | Target Platform | Justification |
|---|---|---|---|
| **`apps/hms-client`** | Next.js / Tailwind | **Vercel** | Fast global edge delivery, instant SSR, automated preview deployments. |
| **`apps/patient-app`** | Next.js / Mobile-First | **Vercel** | Low-latency mobile consumer access, image optimization at the edge. |
| **`apps/super-admin`** | Next.js / Tailwind | **Vercel** | Isolated deployment domain, custom authentication boundary. |
| **`apps/server` (API)** | NestJS / TypeScript | **Render (Docker)** | Persistent Node.js container, high concurrency, zero cold starts, health probes. |
| **Background Workers** | NestJS / BullMQ | **Render (Docker)** | Dedicated worker process executing report generation and alert queues without starving the API. |
| **Database** | MongoDB Atlas | **MongoDB Atlas** | Managed multi-node replica set, automated point-in-time backups, SOC 2 compliant. |
| **Cache & Queue** | Redis | **Managed Redis** | Low-latency in-memory cache, pub/sub, rate limiting, and BullMQ backing. |
| **DNS & Security** | Cloudflare | **Cloudflare** | SSL/TLS termination, WAF rules blocking malicious scrapers, edge rate limiting. |

---

## 3. Docker Infrastructure Architecture

Docker is used specifically for the backend API and worker processes to ensure absolute runtime parity between staging and production. Frontends are deployed natively via Vercel without unnecessary container overhead.

### 3.1. Backend Dockerfile (`apps/server/Dockerfile`)
```dockerfile
# Multi-stage production build for NestJS API
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile
COPY apps/server/ ./apps/server/
RUN pnpm --filter @hms/server build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/apps/server/dist ./apps/server/dist
EXPOSE 4000
CMD ["node", "apps/server/dist/main.js"]
```

---

## 4. Environment Variables & Secrets Management

Environment configurations are partitioned by service and surface. Under no circumstances are `.env` files committed to version control.

### 4.1. Backend Environment Variables (`apps/server`)
```bash
# Server Runtime
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1

# Security & Sessions
JWT_SECRET=super_secret_cryptographic_key_minimum_32_chars
JWT_EXPIRES_IN=24h

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/hms_medcore?retryWrites=true&w=majority

# Cache & Queues
REDIS_HOST=managed-redis.host.internal
REDIS_PORT=6379
REDIS_PASSWORD=redis_auth_password
REDIS_TLS=true

# Storage (S3 / Cloudflare R2)
STORAGE_BUCKET=hms-clinical-documents
STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=r2_access_key
STORAGE_SECRET_ACCESS_KEY=r2_secret_key

# CORS Allowed Origins
CORS_ORIGINS=https://hms.medcore.health,https://patient.medcore.health,https://admin.medcore.health
```

### 4.2. Frontend Environment Variables (`hms-client`, `patient-app`, `super-admin`)
```bash
NEXT_PUBLIC_API_URL=https://api.medcore.health/api/v1
NEXT_PUBLIC_APP_ENV=production
```

---

## 5. CI/CD Deployment Pipeline (GitHub Actions)

Every pull request and merge to `main` executes a rigorous verification pipeline:

```text
git push origin main
         │
         ▼
[Step 1] Monorepo Typecheck (`pnpm typecheck` — 0 TypeScript errors required)
         │
         ▼
[Step 2] Monorepo Linter (`pnpm lint` — 0 warnings, 0 errors required)
         │
         ▼
[Step 3] Backend Unit & Tenant Tests (`pnpm test` — 100% passing required)
         │
         ▼
[Step 4] Build Validation (`pnpm build` across all 4 applications)
         │
         ├──► Success: Vercel triggers atomic edge deployments (hms-client, patient-app, super-admin)
         └──► Success: Render pulls Docker image and executes zero-downtime rolling deployment (server)
```
