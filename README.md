<p align="center">
  <img src="frontend/public/logo192.png" alt="Al-Awael ERP" width="80" />
</p>

<h1 align="center">Al-Awael ERP</h1>
<p align="center">
  نظام إدارة مراكز الأوائل للرعاية النهارية<br/>
  <em>Enterprise Resource Planning for Al-Awael Day Care Centers</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" />
  <img src="https://img.shields.io/badge/backend-Express%2FMongoDB-blue" />
  <img src="https://img.shields.io/badge/frontend-React%2018%20%2B%20MUI%205-61DAFB" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

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
# Run all backend tests
npm test

# Run frontend tests
npm run test:frontend
```

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

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/alawael
JWT_SECRET=<your-secret>
NODE_ENV=development
```

See `.env.example` for the full list of supported variables.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, branch naming, and PR guidelines.

---

## License

[MIT](LICENSE) © Al-Awael Day Care Centers
