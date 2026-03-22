# ALAWAEL ERP System

**نظام مراكز الأوائل للرعاية النهارية — Unified ERP Platform**

> **Status**: ✅ Production Ready | **Backend**: 258 test suites (7,319 tests) | **Frontend**: React 18 + MUI 5 | **CI**: GitHub Actions ✅ | **VPS**: Deployed

## Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | >= 22.0.0 | Yes |
| npm | >= 11.0.0 | Yes |
| MongoDB | >= 6.0 | Yes (or set `USE_MOCK_DB=true`) |
| Redis | >= 7.0 | Optional (set `DISABLE_REDIS=true`) |
| Docker | >= 24.0 | Optional (for containerized deployment) |

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# Install all dependencies
npm run install:all

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start development server
npm run dev            # Backend only
npm run dev:all        # Backend + Frontend
```

### Quality Commands
```bash
npm test               # Run backend tests (7,319 tests)
npm run test:frontend  # Run frontend tests
npm run lint           # ESLint checks
```

## 📁 Project Structure

```
alawael-erp/
│
├── backend/                    # 🔧 Node.js/Express API Server
│   ├── __tests__/             #    258 test suites, 7,319 tests
│   ├── controllers/           #    Route controllers
│   ├── models/                #    Mongoose schemas
│   ├── middleware/             #    Express middleware
│   ├── routes/                #    API routes
│   ├── services/              #    Business logic
│   ├── config/                #    Configuration
│   └── server.js              #    Entry point
│
├── frontend/                   # 🌐 React 18 Web App (MUI 5)
│   ├── src/                   #    Source code
│   ├── public/                #    Static assets
│   └── build/                 #    Production build (565 chunks)
│
├── deploy/                     # 🚀 Deployment & Infrastructure
│   ├── hostinger/             #    VPS deploy scripts (PM2, Nginx)
│   ├── docker/                #    Docker production configs
│   ├── terraform/             #    IaC (Terraform)
│   └── ssl/                   #    SSL setup scripts
│
├── k8s/                        # ☸️  Kubernetes manifests
├── helm/                       # ⎈  Helm charts
│
├── docs/                       # 📚 Documentation Hub
│   ├── api/                   #    API documentation
│   ├── architecture/          #    System architecture
│   └── *.md                   #    Guides & reports
│
├── .github/workflows/          # 🔄 CI/CD (5 jobs: lint, test, build, security, summary)
│
├── alawael-wiki/               # 📖 Project Wiki
├── scripts/                    # 🛠️  Utility scripts
├── monitoring/                 # 📊 Monitoring configs
├── tests/                      # 🧪 Integration/E2E tests
│
├── supply-chain-management/    # 📦 SCM Module
├── finance-module/             # 💰 Finance Module
├── intelligent-agent/          # 🤖 AI/ML Services
├── mobile/                     # 📱 Mobile App
├── whatsapp/                   # 💬 WhatsApp Integration
├── gateway/                    # 🔌 API Gateway
├── graphql/                    # 📊 GraphQL Server
│
├── docker-compose.yml          # Docker: Development
├── docker-compose.production.yml
├── docker-compose.professional.yml
├── Dockerfile                  # Main Dockerfile
├── nginx.conf                  # Root Nginx config
├── package.json                # Monorepo root
└── README.md
```

## ✨ Key Features

### Quality Management
- **Unified CLI**: `./quality` - Central control for all services
- **Automated Gates**:
  - Push → Fast quality check (phase2 tests)
  - PR → Strict quality gate (all tests)
- **Branch Protection**: Enforced in GitHub (requires both gates)
- **Backend Status**: 29/29 test suites, 894/894 tests ✅

### Core Services
| Service | Status | Details |
|---------|--------|---------|
| Backend | ✅ STABLE | 258 suites, 7,319 tests, 0 failures |
| Frontend | ✅ READY | React 18 + MUI 5 (565 chunks) |
| Database | ✅ STABLE | MongoDB + Redis |
| CI/CD | ✅ GREEN | 5 jobs all passing |
| VPS | ✅ LIVE | PM2 cluster at 72.60.84.56 |

## 📚 Essential Documentation

### Getting Started
- **[QUICKSTART_QUALITY.md](QUICKSTART_QUALITY.md)** - Quality gate guide & commands
- **[QUICK_START.md](QUICK_START.md)** - System overview & first steps
- **[DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md)** - Container deployment

### Development
- **[backend/tests/helpers/README.md](backend/tests/helpers/README.md)** - Backend quality setup
- **[API_REFERENCE.md](API_REFERENCE.md)** - Full endpoint documentation
- **[INTEGRATIONS_README.md](INTEGRATIONS_README.md)** - Service integrations

### Operations
- **[DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md)** - Production deployment
- **[MONITORING_SYSTEM.md](MONITORING_SYSTEM.md)** - Health monitoring
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick command reference

## 🎯 Workflow Commands

### Quality Control
```bash
# Central quality CLI (all-in-one)
./quality all              # Full system check
./quality quick            # Fast smoke tests
./quality backend          # Backend strict (all tests)
./quality backend:push     # Backend fast (phase2)
./quality frontend         # Frontend only
./quality status           # System status

# Or use Make
make -f Makefile.quality quality:all
```

### Development
```bash
# Backend
cd backend
npm run quality:push       # Push-ready checks
npm run quality:ci         # PR-ready checks
npm test                   # Run all tests

# Frontend
cd frontend
npm test                   # React tests
npm test -- --coverage    # With coverage report
```

## 🔐 Continuous Integration

### GitHub Workflows
- **`.github/workflows/backend-quality-push.yml`** - Fast push checks (phase2)
- **`.github/workflows/backend-quality-gate.yml`** - Strict PR gate (all tests)
- **`.github/workflows/system-quality-gate.yml`** - Full system quality

### Branch Protection
Setup automatic branch protection:
```bash
# Preview changes
./scripts/github/enable-branch-protection.ps1 -DryRun

# Apply (requires GITHUB_TOKEN)
$env:GITHUB_TOKEN = "<your-token>"
./scripts/github/enable-branch-protection.ps1
```

**Requirements**: Both push + PR gates must pass before merge

## 📊 Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Test Suites | 258/258 | ✅ All passing |
| Test Cases | 7,319/7,319 | ✅ All passing |
| CI Jobs | 5/5 | ✅ Green |
| Regressions | 0 | ✅ Zero |
| Guard Script | Active | ✅ Enforced |
| VPS Deploy | Live | ✅ Healthy |

## 🛠️ Project Status

### Backend
- **Tests**: 258 suites, 7,319 tests (all passing)
- **Coverage**: Full test coverage
- **Quality**: No regressions, guard script active
- **Stability**: Production-ready, deployed on VPS

### Frontend
- **Framework**: React 18 + Material-UI 5
- **Build**: 565 JS chunks in production
- **Quality**: Production build verified
- **Status**: Deployed and live

### System
- **Infrastructure**: Docker & Kubernetes ready
- **Deployment**: Production-ready
- **Monitoring**: Health checks active

## 📖 Documentation Organization

### Current (Active)
Root-level markdown files focus on:
- Quick starts and guides
- Active project information
- Operational procedures

### Archive
Historical documentation available in:
- `docs/archive/` - Legacy documentation
- Organized by prefix (00_, 01_, 99_ patterns)
- Full audit trail preserved

## 🔧 Maintenance Commands

```bash
# Verify all components
npm run quality:backend     # Backend full check

# System-wide check
make -f Makefile.quality quality:all

# Quick smoke test
./quality quick

# Guard check (mock centralization)
npm run test:guard:maintenance-mocks
```

## 📞 Support & Next Steps

### For New Team Members
1. Read [QUICKSTART_QUALITY.md](QUICKSTART_QUALITY.md) (5 min)
2. Run `./quality status` (30 sec)
3. Try `./quality quick` (2 min)

### For Setup Issues
1. Check [DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md)
2. Review [MONGODB_SETUP.md](MONGODB_SETUP.md)
3. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

### For Development
1. Review [backend/tests/helpers/README.md](backend/tests/helpers/README.md)
2. Check [API_REFERENCE.md](API_REFERENCE.md)
3. Run `./quality backend` before commit

## 🎯 Key Achievements

```
✅ 258/258 Backend Test Suites Passing
✅ 7,319/7,319 Individual Tests Passing
✅ Zero Test Regressions
✅ Full Test Coverage Maintained
✅ Guard Scripts Active (Mock Centralization)
✅ CI/CD Green (5 Jobs)
✅ VPS Deployed & Healthy
✅ System Documentation Complete
✅ Production Ready Status
```

---

**ALAWAEL ERP System** - Enterprise-grade resource management for rehabilitation day-care centers
**Version**: v3.0.0 | **Status**: ✅ Production Ready
**Last Update**: March 22, 2026
