<p align="center">
  <img src="frontend/public/logo192.png" alt="Al-Awael ERP" width="80" />
</p>

<h1 align="center">Al-Awael ERP — v3.1.0</h1>
<p align="center">
  نظام إدارة مراكز الأوائل للرعاية النهارية<br/>
  <em>Enterprise Resource Planning for Al-Awael Day Care Centers</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v3.1.0-blue" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" />
  <img src="https://img.shields.io/badge/backend-Express%2FMongoDB-blue" />
  <img src="https://img.shields.io/badge/frontend-React%2018%20%2B%20MUI%205-61DAFB" />
  <img src="https://img.shields.io/badge/sprint%20gate-752%20passing-brightgreen" />
  <img src="https://img.shields.io/badge/eslint-0%20errors-brightgreen" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## Documentation

| Document                                                | Description                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [blueprint/README.md](docs/blueprint/README.md)         | 🎯 **Unified Platform Blueprint** — ERP+EMR+CRM+Rehab vision, 14 bounded contexts, canonical data model, 6-level RBAC, phased roadmap |
| [MODULES.md](docs/MODULES.md)                           | 🗺️ **خريطة الوحدات** — 127 backend module + 80+ frontend page                                                                         |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | System architecture, design decisions, module breakdown                                                                               |
| [architecture/decisions/](docs/architecture/decisions/) | Architecture Decision Records (ADRs 001–009)                                                                                          |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md)                   | Developer setup guide, code standards, git workflow                                                                                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                      | Contribution guidelines and PR process                                                                                                |
| [SECURITY.md](SECURITY.md)                              | Vulnerability disclosure policy + PDPL compliance posture + scope                                                                     |
| [CHANGELOG.md](CHANGELOG.md)                            | Full release history                                                                                                                  |

### Ops & Saudi gov integrations (4.0.x)

| Document                                                                                  | Description                                                                         |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [4.0.x-DELIVERY.md](docs/4.0.x-DELIVERY.md)                                               | 📋 **4.0.x delivery summary** — before/after scorecard + patch-release timeline     |
| [OPERATIONS.md](docs/OPERATIONS.md)                                                       | 🚨 **One-page operator index** — health hierarchy, incident paths, SLI recipes      |
| [HR_COMPLIANCE_GUIDE.md](docs/HR_COMPLIANCE_GUIDE.md)                                     | 🩺 **HR daily/weekly/monthly playbook** — GOSI + SCFHS license + CPE credits        |
| [sprints/SPRINT_2026_04_17-18.md](docs/sprints/SPRINT_2026_04_17-18.md)                   | 2-day sprint + 4.0.1–4.0.6 follow-ups (rate limits / circuits / metrics / runbooks) |
| [sprints/GOV_INTEGRATIONS_GO_LIVE.md](docs/sprints/GOV_INTEGRATIONS_GO_LIVE.md)           | Flip-to-live checklist per Saudi gov provider + Prometheus + SLI PromQL recipes     |
| [runbooks/](docs/runbooks/README.md)                                                      | On-call playbooks — one per alert (circuit / rate-limit / misconfigured)            |
| [dashboards/gov-integrations.grafana.json](docs/dashboards/gov-integrations.grafana.json) | Grafana 10.x dashboard — 12 panels, import directly                                 |
| [alerts/gov-integrations.yml](docs/alerts/gov-integrations.yml)                           | Alertmanager rule groups — circuit / rate-limit / SLI / config                      |

Ops quick commands: `npm run gov:status` (CLI snapshot, exit 0/1/2 for cron) · `npm run cpe:attention` (SCFHS CPE compliance digest, exit 0/1/2 for cron) · `npm run preflight` (deploy gate — non-zero if any live adapter is misconfigured) · `npm run dsar:hash -- <nationalId>` (PDPL subject-hash for compliance queries) · `GET /api/health/integrations/summary` (unauth liveness) · `GET /api/health/metrics/integrations` (unauth Prometheus scrape).

---

## Overview

Al-Awael ERP is a comprehensive enterprise resource planning system designed for day care center management.
It covers children, staff, finance, HR, supply chain, communications, e-learning, and more — all within a single monorepo.

---

## Project Structure

```
alawael-erp/
├── backend/                 # Express.js API server (MongoDB)
│   ├── config/              #   Config & DB connection
│   ├── middleware/           #   Auth, validation, error handling
│   ├── models/              #   Mongoose schemas
│   ├── routes/              #   REST API endpoints
│   ├── services/            #   Business logic layer
│   ├── test-utils/          #   Test helpers & factories
│   ├── test-templates/      #   Test template fixtures
│   └── __tests__/           #   Jest test suites
│
├── frontend/                # React 18 + Material-UI 5 SPA
│   ├── src/
│   │   ├── components/      #   Reusable UI components
│   │   ├── pages/           #   Page-level views
│   │   ├── services/        #   API service layer
│   │   └── contexts/        #   React contexts
│   └── cypress/             #   E2E tests (Cypress)
│
├── supply-chain-management/ # Supply Chain module (standalone)
│   ├── backend/
│   └── frontend/
│
├── finance-module/          # Finance module (standalone)
├── intelligent-agent/       # AI agent module
├── secretary_ai/            # AI secretary assistant
├── whatsapp/                # WhatsApp integration
├── mobile/                  # Mobile app (React Native)
├── dashboard/               # Admin analytics dashboard
├── gateway/                 # API gateway
├── graphql/                 # GraphQL layer
│
├── deploy/                  # Deployment configurations
│   ├── nginx/               #   Nginx reverse proxy config
│   └── ...                  #   Hostinger, Docker configs
│
├── monitoring/              # Prometheus, Grafana configs
├── helm/                    # Helm charts (Kubernetes)
├── k8s/                     # Kubernetes raw manifests
├── services/                # Microservices (61 services)
│
├── docs/                    # Documentation hub
│   ├── api/                 #   Postman collections & API docs
│   ├── wiki/                #   Project wiki (100+ articles)
│   └── archive/             #   Historical session reports
│
├── scripts/                 # Build, deploy & utility scripts
├── ops/                     # Ops scripts (gitignored)
├── tests/                   # Integration & cross-module tests
│
├── docker-compose.yml       # Main compose (development)
├── docker-compose.production.yml
├── docker-compose.professional.yml
├── Dockerfile               # Root multi-stage Dockerfile
├── nginx.conf               # Root nginx configuration
├── package.json             # Monorepo orchestration
├── CHANGELOG.md             # Release history
├── CONTRIBUTING.md          # Contribution guidelines
└── LICENSE                  # MIT License
```

---

## Architecture

```
                    ┌─────────────┐
                    │   Nginx     │  (reverse proxy, SSL termination)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Express  │ │ Express  │ │ Socket.IO│
        │ (PM2 x2)│ │ (PM2 x2)│ │ WebSocket│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
     ┌───────┴─────────────┴────────────┘
     │
     ├──► MongoDB           (primary data store)
     ├──► Redis / ioredis   (caching, rate limiting, sessions)
     └──► NATS / In-Memory  (message queue, event bus)
```

**Key Components:**

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| API Server      | Express 4.18 + express-async-errors                     |
| Database        | MongoDB (Mongoose 9) + MongoMemoryServer (tests)        |
| Cache           | Redis (ioredis 5) with circuit breaker                  |
| Real-time       | Socket.IO 4.7 (cluster-aware)                           |
| Auth            | JWT + RBAC (role-based + permission-based)              |
| Observability   | Winston logging, OpenTelemetry, Prometheus metrics      |
| Security        | Helmet, CSRF, rate limiting, mongo-sanitize, XSS filter |
| Process Manager | PM2 (cluster mode, graceful shutdown)                   |
| Frontend        | React 18 + Material-UI 5 + React Router 6               |

---

## API Documentation

- **Swagger UI**: `/api-docs` (available when `ENABLE_SWAGGER=true` or non-test env)
- **Health Check**: `GET /health` — liveness probe (API + DB + Redis + WebSocket)
- **Readiness**: `GET /readiness` — Kubernetes-style readiness probe
- **Metrics**: `GET /metrics` — Prometheus-compatible (protected by `METRICS_TOKEN`)
- **Cache Stats**: `GET /api/cache-stats` — Redis + in-memory cache statistics

All API endpoints are prefixed with `/api` and documented in the Swagger spec.

---

## Quick Start

### Prerequisites

| Tool    | Version   |
| ------- | --------- |
| Node.js | >= 18.0.0 |
| npm     | >= 9.0.0  |
| MongoDB | >= 5.0    |

### Installation

```bash
# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Development

```bash
# Start backend only
npm run dev

# Start frontend only
npm run start:frontend

# Start both (concurrent)
npm run dev:all
```

> **VS Code:** Use the pre-configured tasks in the Command Palette → `Tasks: Run Task` for optimal DX.

### Testing

```bash
# Run the sprint gate — 752 tests that CI enforces on every PR
npm run test:sprint

# Run the full backend suite (includes many legacy suites with stale
# import paths — the sprint gate above is the CI-authoritative number)
npm test

# Run frontend tests
npm run test:frontend
```

Run `npm run test:sprint` before pushing anything that touches
`backend/` or `.github/workflows/` — it's the same suite
`sprint-tests.yml` enforces, so a green local run matches CI. See
[CONTRIBUTING.md](CONTRIBUTING.md) § Code Quality for the full pre-push
checklist.

### Production Build

```bash
# Build frontend for production
npm run build

# Start production backend
npm run start:prod
```

---

## Deployment

### Hostinger VPS

```bash
# Automated deploy (SSH pull + build + PM2 restart)
python ops/_pull_build_vps.py

# Health check
python ops/_vps_health.py
```

### Docker

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.production.yml up -d --build
```

---

## Quality & CI

```bash
npm run lint          # ESLint
npm run lint:all      # Lint backend + frontend
```

Husky + lint-staged run automatically on every commit.
GitHub Actions CI validates PRs and main branch pushes.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust:

| Variable                  | Required | Default       | Description                                     |
| ------------------------- | -------- | ------------- | ----------------------------------------------- |
| `PORT`                    | No       | `3001`        | HTTP server port                                |
| `NODE_ENV`                | Yes      | `development` | `development` / `production` / `test`           |
| `MONGODB_URI`             | Yes\*    | localhost     | MongoDB connection string (\* required in prod) |
| `JWT_SECRET`              | Yes      | —             | JWT signing key (min 32 chars recommended)      |
| `REDIS_HOST`              | No       | `localhost`   | Redis server hostname                           |
| `REDIS_PORT`              | No       | `6379`        | Redis server port                               |
| `REDIS_PASSWORD`          | No       | —             | Redis auth password                             |
| `CORS_ORIGINS`            | Prod     | —             | Comma-separated allowed origins                 |
| `FRONTEND_URL`            | No       | —             | Frontend URL for CORS fallback                  |
| `SSL_ENABLED`             | No       | `false`       | Enable HSTS and secure cookies                  |
| `ENABLE_SWAGGER`          | No       | `true`        | Enable Swagger UI at `/api-docs`                |
| `METRICS_TOKEN`           | No       | —             | Bearer token for `/metrics` endpoint            |
| `ENABLE_AUTO_BACKUP`      | No       | `false`       | Enable scheduled MongoDB backups                |
| `SLOW_QUERY_THRESHOLD_MS` | No       | `500`         | Mongoose slow query warning threshold           |
| `MONGOOSE_DEBUG`          | No       | `false`       | Log all Mongoose queries                        |
| `OTEL_ENABLED`            | No       | `false`       | Enable OpenTelemetry tracing                    |

---

## Utility Scripts

```bash
# Development setup (env check + dependency audit + service connectivity)
node backend/scripts/dev-setup.js

# Check service connectivity (MongoDB, Redis, etc.)
node backend/scripts/check-services.js

# Generate secure secrets for .env
node backend/scripts/generate-secrets.js

# Reset database to clean state
node backend/scripts/db-reset.js

# Clean up logs, cache, temp files
node backend/scripts/cleanup.js

# Check for outdated/vulnerable dependencies
node backend/scripts/check-deps.js

# View and analyze application logs
node backend/scripts/log-viewer.js

# Inspect registered Express routes
node backend/scripts/inspect-routes.js

# Project statistics (files, lines, tests, etc.)
node backend/scripts/project-stats.js
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, branch naming, and PR guidelines.

---

## License

[MIT](LICENSE) © Al-Awael Day Care Centers
