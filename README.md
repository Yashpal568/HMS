# Hospital Management System (HMS)

## Project Purpose
A secure, professional Hospital Management System covering patient registration, OPD, EMR, IPD, nursing, laboratory, pharmacy, inventory, billing, documents, notifications, reports, staff administration, audit, and security.

## Architecture
- Phase 1: Web application (Next.js + NestJS + MongoDB Atlas)
- Phase 2: Windows Desktop application (Electron + Next.js + NestJS + MongoDB Atlas)
The architecture follows a modular monolith approach for the backend to keep it maintainable.

## Technology Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, NestJS, TypeScript, REST API, OpenAPI/Swagger
- **Database**: MongoDB Atlas
- **Development**: pnpm, Git, ESLint, Prettier

## Folder Structure
```
hms/
├── apps/
│   ├── web/ (Next.js frontend)
│   └── api/ (NestJS backend)
├── packages/
│   ├── ui/ (Shared UI components)
│   ├── types/ (Shared TypeScript types)
│   └── config/ (Shared configurations)
├── docs/ (Documentation)
├── infrastructure/ (Docker & Deployment scripts)
```

## Prerequisites
- Node.js (v18+)
- pnpm (v8+)
- MongoDB Atlas cluster (or local instance)

## Installation & Environment Setup
1. Clone the repository
2. Run `pnpm install`
3. Copy `.env.example` to `.env` in `apps/api` (and root if necessary)
4. Fill in the required variables (e.g., `MONGODB_URI`)

## Development Commands
- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run lint`: Run ESLint across the workspace
- `pnpm run format`: Format code with Prettier
- `pnpm run typecheck`: Run TypeScript type checking
- `pnpm run test`: Run tests across the workspace

## How to start frontend
```bash
cd apps/web
pnpm run dev
```

## How to start backend
```bash
cd apps/api
pnpm run dev
```

## MongoDB Atlas Configuration
Ensure your `MONGODB_URI` does not contain production secrets in your local `.env`. The system uses standard MongoDB connection strings. Atlas Network Access should be properly configured to allow your IP.

## Current Development Milestone
**CURRENT MILESTONE:**
Initial Project Setup
