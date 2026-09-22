# Hospital Management System — Production Deployment Operations Guide

**SOURCE-OF-TRUTH OWNER**: `docs/DEPLOYMENT_GUIDE.md` (DEPLOYMENT)  
**Classification**: Operational Directive  
**Infrastructure Model**: Cloud Hybrid (Vercel Edge Frontends + Render Docker Backend + MongoDB Atlas Data Tier)  

---

## 1. Architecture Overview

```text
               ┌────────────────────────────────────────────────────────┐
               │              CLOUDFLARE EDGE & WAF TIER                │
               │   • DDoS Shield • TLS 1.3 • Strict CSP • HSTS          │
               └────────┬───────────────────────┬───────────────────────┘
                        │                       │
           HTTPS (Next.js SSR/Static)           │ HTTPS (REST API)
                        │                       │
       ┌────────────────┴───────────────┐       │
       ▼                                ▼       ▼
┌───────────────┐               ┌───────────────────────────────────────┐
│  VERCEL EDGE  │               │              RENDER CLOUD             │
│               │               │                                       │
│ • hms-client  │               │ • apps/server (Dockerized NestJS API) │
│ • patient-app │               │ • Health Probes (/api/v1/health)      │
│ • super-admin │               │ • Rate Limiter (@nestjs/throttler)    │
└───────────────┘               └───────────────────┬───────────────────┘
                                                    │ TLS (Encrypted in transit)
                                                    ▼
                                ┌───────────────────────────────────────┐
                                │             MONGODB ATLAS             │
                                │ • Multi-Region Replica Set            │
                                │ • AES-256 Encryption at Rest          │
                                │ • Continuous Point-in-Time Backups    │
                                └───────────────────────────────────────┘
```

---

## 2. Production Environment Variables Checklist

### Backend API Service (`apps/server`)
| Variable | Value / Format | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security filters & disables verbose stacks |
| `PORT` | `3001` (or dynamic `$PORT`) | NestJS HTTP listener port |
| `API_PREFIX` | `api/v1` | Canonical REST API version prefix |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/hms_prod?retryWrites=true&w=majority` | Cloud system of record connection string |
| `JWT_SECRET` | 64-character cryptographically random string | HMAC SHA-256 session signature key |
| `CORS_ORIGINS` | Comma-delimited list of production frontend URLs | Strict origin whitelisting |

### Frontend Applications (`hms-client`, `patient-app`, `super-admin`)
| Variable | Value / Format | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.medcore.health/api/v1` | Base URL for centralized `apiClient` |
| `NEXT_PUBLIC_APP_ENV` | `production` | Disables debug banners and activates production metrics |

---

## 3. Pre-Flight Verification & Quality Gates

Prior to any deployment to production, the repository must pass all five automated CI validation gates:

```bash
# Gate 1: Monorepo Typecheck (0 errors required)
pnpm typecheck

# Gate 2: Monorepo Linter (0 errors, 0 warnings required)
pnpm lint

# Gate 3: Server Unit Tests (100% pass rate required)
pnpm --filter @hms/server test

# Gate 4: Security & Vertical Slice End-to-End Tests
pnpm --filter @hms/server test:e2e

# Gate 5: Production Bundle Build (All packages)
pnpm build
```

---

## 4. Production Security Headers & Health Monitoring

### Verified Security Headers
- `Content-Security-Policy`: Default-src `'self'`, script-src `'self'`, frame-ancestors `'none'`.
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
- `X-Frame-Options`: `DENY` (prevents clickjacking attacks).
- `X-Content-Type-Options`: `nosniff` (prevents MIME sniffing).
- `Referrer-Policy`: `strict-origin-when-cross-origin`.
- `Cache-Control`: `no-store, no-cache, must-revalidate` (protects clinical and patient data).

### Telemetry Probes
- **Liveness Probe**: `GET /api/v1/health` (used by container orchestrator to confirm process vitality).
- **Deep Readiness Probe**: `GET /api/v1/health/deep` (returns database roundtrip latency in ms, connection pool size, memory heap usage, and uptime).
