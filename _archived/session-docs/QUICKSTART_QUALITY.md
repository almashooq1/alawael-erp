# ALAWAEL ERP System - Quick Start

## 🚀 Getting Started

### 1. Project Structure
```
.
├── backend/              - Node.js/Express API (quality: 29/29 suites ✅)
├── frontend/             - React web application
├── graphql/              - GraphQL server
├── intelligent-agent/    - AI/ML module
├── finance-module/       - Finance operations
├── supply-chain/         - Supply chain management
└── mobile/               - Mobile application
```

### 2. Quick Start (5 minutes)
```bash
# Check system status
./quality status

# Run quality checks (all services)
./quality all

# Or fast feedback loop
./quality quick
```

### 3. Quality Levels
- **CLI**: `./quality` - Central command for all checks
- **Make**: `make -f Makefile.quality quality:all` - System-wide coordinated
- **GitHub**: Automated on PRs and push
- **Backend**: 29/29 test suites, 894/894 tests ✅
- **Frontend**: React tests with coverage

### 4. Development Workflow
```bash
# Backend development
cd backend
npm run quality:push              # Fast push checks (phase2)
npm run quality:ci               # Strict PR checks (all tests)
npm run quality:backend           # Full backend check

# Frontend development
cd frontend
npm test                         # Standard React tests
npm test -- --coverage          # With coverage report

# System-wide checks
./quality all                    # Everything
./quality quick                  # Smoke tests
```

### 5. Branch Protection
```bash
# Enable automatic branch protection
. scripts/github/enable-branch-protection.ps1 -DryRun
```

Requires: `GITHUB_TOKEN` environment variable

## 📊 Quality Metrics
- **Backend**: 894/894 tests passing, 0 regressions
- **Test suites**: 29 passing consistently
- **Guard script**: Maintenance mock centralization enforced
- **CI/CD**: Dual-gate (push fast + PR strict)

## 🔗 Key Commands
```bash
./quality help                   # Show all commands
./quality status                 # System status
./quality all                    # Full quality check
./quality quick                  # Fast smoke test
./quality backend                # Backend strict
./quality backend:push           # Backend fast
./quality frontend               # Frontend only
```

## 📚 Documentation
- [Backend Quality Guide](backend/tests/helpers/README.md)
- [Branch Protection](../.github/BRANCH_PROTECTION_QUICKSTART.md)
- [CI/CD Workflows](.github/workflows/)

## ✅ Current Status
- Backend: **STABLE** (894/894 tests)
- Frontend: **READY** for quality integration
- System: **PRODUCTION-READY**
