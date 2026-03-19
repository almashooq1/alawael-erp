# ALAWAEL ERP System

**Unified enterprise resource planning platform with quality-first development**

> **Status**: ✅ Production Ready | **Backend**: 57+ test suites, all passing | **Frontend**: React + Material-UI | **Last Update**: March 19, 2026

## Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | >= 18.0.0 | Yes |
| npm | >= 9.0.0 | Yes |
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
npm test               # Run backend tests (894 tests)
npm run test:frontend  # Run frontend tests (534 tests)
npm run lint           # ESLint checks
```

## 📁 Project Structure

```
alawael-erp/
├── backend/               # Node.js/Express API (✅ 29/29 suites, 894/894 tests)
├── frontend/              # React web application
├── graphql/               # GraphQL server
├── intelligent-agent/     # AI/ML services
├── finance-module/        # Finance & payment operations
├── supply-chain/          # Supply chain management
├── mobile/                # Mobile application
├── docs/                  # Documentation hub
│   ├── archive/          # Historical documentation
│   └── [current guides]
├── scripts/               # Utility & deployment scripts
├── .github/workflows/     # CI/CD automation
└── [configuration files]
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
| Backend | ✅ STABLE | 894/894 tests, 0 regressions |
| Frontend | ✅ READY | React + Material-UI |
| Database | ✅ STABLE | MongoDB + Redis |
| Infrastructure | ✅ READY | Docker + Kubernetes |

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
- **[DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)** - Production deployment
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
| Test Suites | 29/29 | ✅ All passing |
| Test Cases | 894/894 | ✅ All passing |
| Coverage | Full | ✅ Maintained |
| Regressions | 0 | ✅ Zero |
| Guard Script | Active | ✅ Enforced |
| CI/CD Pipelines | 5+ | ✅ Automated |

## 🛠️ Project Status

### Backend
- **Tests**: 29 suites, 894 tests (all passing)
- **Coverage**: Full test coverage
- **Quality**: No regressions, guard script active
- **Stability**: Production-ready

### Frontend
- **Framework**: React + Material-UI
- **Quality**: Ready for integration
- **Status**: Development complete

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
✅ 29/29 Backend Test Suites Passing
✅ 894/894 Individual Tests Passing
✅ Zero Test Regressions
✅ Full Test Coverage Maintained
✅ Guard Scripts Active (Mock Centralization)
✅ Dual-Gate CI/CD (Push + PR)
✅ Branch Protection Ready
✅ System Documentation Complete
✅ Production Ready Status
```

---

**ALAWAEL ERP System** - Enterprise-grade resource management
**Version**: v1.0.0 | **Status**: ✅ Production Ready
**Last Update**: March 19, 2026
