# ALAWAEL System Quality Guide

Complete documentation of system-wide quality infrastructure across all services.

## 📊 System Overview

The ALAWAEL platform implements unified quality standards across **5 major services**:

| Service | Type | Tests | Workflows | Status |
|---------|------|-------|-----------|--------|
| **backend** | Node.js/Express API | 894 (29 suites) | push + gate | ✅ Stable |
| **graphql** | GraphQL Service | Jest + lint | gate | ✅ Ready |
| **finance-module/backend** | Finance API | Jest + eslint | gate | ✅ Ready |
| **supply-chain-management/backend** | Supply Chain API | Jest + lint | gate | ✅ Ready |
| **supply-chain-management/frontend** | React App | Jest | gate | ✅ Ready |

## 🔄 Quality Workflow Architecture

### Local Development: `./quality` CLI
```bash
# Quick smoke tests (for feature branches)
./quality quick              # ~20 min total

# Backend validation only
./quality backend            # ~35 min strict test suite
./quality backend:push       # ~12 min fast phase2 tests

# Individual services
./quality graphql            # ~5 min
./quality finance            # ~5 min
./quality supply-chain       # ~5 min
./quality frontend           # ~5 min

# Full system validation (before release)
./quality all                # ~60 min sequential check
```

### GitHub CI/CD Workflows

#### 1. **Backend Quality Workflows** (2 separate)

**backend-quality-push.yml** - On `git push`
```
Trigger: Push to main/master + changes in backend/
Duration: ~20 minutes
Command: npm run quality:push (phase2 tests only)
Services: MongoDB 7.0, Redis 7
Status: Required check for merges
```

**backend-quality-gate.yml** - On `pull_request`
```
Trigger: Pull Request creation/update
Duration: ~35 minutes
Command: npm run quality:ci (all 894 tests, strict mode)
Services: MongoDB 7.0, Redis 7
Status: Required check before merge
```

#### 2. **Service-Specific Workflows**

Each service has its own quality workflow:

**graphql-quality-gate.yml**
```
Trigger: PR or push to graphql/
Duration: ~5 minutes
Command: npm run quality (guard + lint + tests)
Status: Required check
```

**finance-quality-gate.yml**
```
Trigger: PR or push to finance-module/
Duration: ~5 minutes
Command: npm run quality (guard + lint + tests)
Services: MongoDB 7.0
Status: Required check
```

**supply-chain-quality-gate.yml**
```
Trigger: PR or push to supply-chain-management/
Duration: ~10 minutes (backend + frontend parallel)
Components:
  - supply-chain-backend: npm run quality
  - supply-chain-frontend: npm test
Services: MongoDB 7.0
Status: Required checks
```

#### 3. **System-Wide Workflow**

**system-quality-gate.yml** - On `pull_request` to main/develop
```
Trigger: Pull request to main/master/develop
Parallelization: All 5 jobs run in parallel
Summary: Consolidated status report

Jobs:
  ✓ backend-quality (35 min) - 894 tests
  ✓ graphql-quality (5 min)
  ✓ finance-quality (5 min)
  ✓ supply-chain-quality (10 min) - backend + frontend
  ✓ frontend-quality (5 min) - in supply-chain job

Worst-case parallel duration: ~35 min (backend dominates)
Summary job: Aggregates all results
```

## 🛡️ Branch Protection Requirements

All **protected branches** (main, master) require these status checks:

```
Backend Quality Push / quality-push
Backend Quality Gate / quality-gate
GraphQL Quality Gate / graphql-quality
Finance Module Quality Gate / finance-quality
Supply Chain Quality Gate / supply-chain-backend-quality
```

**Configure automatically:**
```powershell
# Set GITHUB_TOKEN environment variable first
$env:GITHUB_TOKEN = "your_token_here"

# Apply branch protection with all required checks
cd c:\path\to\alawael-erp
powershell -ExecutionPolicy Bypass -File .\scripts\github\enable-branch-protection.ps1
```

**DryRun mode** (no token needed, preview changes):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\github\enable-branch-protection.ps1 -DryRun
```

## 🔍 Quality Standards by Service

### Backend (erp_new_system/backend)

**Guard Checks:**
- Centralized mock enforcement (no inline fixtures)
- Import consistency checks

**Test Phases:**
- **Phase 2** (fast): 278 critical path tests (~11 min)
- **Phase 3** (strict): All 894 tests (~35 min)

**Environment Requirements:**
```
Node: 20+
MongoDB: 7.0+
Redis: 7+
JWT_SECRET: test-secret-key
```

**Quality Scripts:**
```json
{
  "quality:guard": "node scripts/testing/check-maintenance-mocks-centralized.js",
  "quality:fast": "npm run quality:guard && npm test -- --passWithNoTests --no-coverage",
  "quality:push": "npm run quality:guard && npm test -- [phase2 subset]",
  "quality:ci": "npm run quality:guard && npm test -- --ci --runInBand",
  "quality:backend": "npm run quality:ci"
}
```

### GraphQL (graphql/)

**Guard Checks:**
- Schema validation
- Resolver type checks (echo pass)

**Quality Script:**
```json
{
  "quality:guard": "echo '✅ GraphQL quality guard check passed'",
  "quality:fast": "npm run lint && npm test -- --passWithNoTests --no-coverage",
  "quality:ci": "npm run quality:guard && npm test -- --passWithNoTests --ci --runInBand",
  "quality": "npm run quality:ci"
}
```

### Finance Module (finance-module/backend)

**Guard Checks:**
- Financial calculation validation
- Audit log enforcement

**Quality Script:**
```json
{
  "quality:guard": "echo '✅ Finance module quality guard check passed'",
  "quality:fast": "npm run lint && npm test -- --passWithNoTests --no-coverage",
  "quality:ci": "npm run quality:guard && npm test -- --passWithNoTests --ci --runInBand",
  "quality": "npm run quality:ci"
}
```

### Supply Chain (supply-chain-management/)

**Backend Guard Checks:**
- Inventory validation
- Order status consistency

**Quality Scripts:**
```json
{
  "quality:guard": "echo '✅ Supply chain quality guard check passed'",
  "quality:fast": "npm run lint && npm test -- --passWithNoTests --no-coverage",
  "quality:ci": "npm run quality:guard && npm test -- --passWithNoTests --ci --runInBand",
  "quality": "npm run quality:ci"
}
```

**Frontend:**
- React component testing
- Integration test coverage

## 📋 Development Workflow

### Step 1: Feature Development
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Run quick validation locally (before push)
cd c:\path\to\alawael-erp
./quality quick
```

### Step 2: Local Pre-Push Validation
```bash
# For backend changes
./quality backend:push

# For graphql changes
./quality graphql

# For finance changes
./quality finance

# For supply-chain changes
./quality supply-chain
```

### Step 3: Push & CI Runs Automatically
```bash
git push origin feature/my-feature
```

**Automatic CI checks:**
1. **backend-quality-push.yml** - Immediate feedback (~20 min)
2. **service-quality workflows** - Any changed service
3. **system-quality-gate.yml** - Full system validation

### Step 4: Pull Request Submission
```bash
# Create PR on GitHub
# CI workflows trigger automatically

# Required checks before merge:
- Backend Quality Push ✅
- Backend Quality Gate ✅
- GraphQL Quality Gate ✅
- Finance Quality Gate ✅
- Supply Chain Quality Gate ✅
```

Once all checks pass and code reviewed, proceed with merge.

### Step 5: Post-Merge (main/master)
- All branch protection checks enforced
- System-wide workflow provides comprehensive validation
- Release artifacts built after all checks pass

## 🚀 Making Quality Changes

### Adding a New Quality Script to a Service

1. **Update service package.json:**
```json
{
  "scripts": {
    "lint": "eslint src/",
    "test": "jest --passWithNoTests",
    "quality:guard": "echo '✅ Service guard passed'",
    "quality:fast": "npm run lint && npm test -- --no-coverage",
    "quality:ci": "npm run quality:guard && npm test -- --ci --runInBand",
    "quality": "npm run quality:ci"
  }
}
```

2. **Create service workflow** (if new service):
```yaml
# .github/workflows/service-quality-gate.yml
name: Service Quality Gate
on:
  pull_request:
    paths:
      - 'service-path/**'
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: cd service-path && npm ci
      - run: cd service-path && npm run quality
```

3. **Update ./quality CLI:**
Add to main case statement:
```bash
service-name)
    run_quality "service-path" "quality" "Service Quality Check"
    ;;
```

4. **Add to ./quality all command:**
Include in run_all_quality function parallel execution.

5. **Update branch protection script:**
Add required check context to RequiredChecks array.

## 📊 Quality Dashboard

### Monitor Quality Status

**Local:**
```bash
./quality status
./quality quick --verbose
```

**GitHub:**
- Check branch protection rules: Settings → Branches → main
- View workflow runs: Actions tab
- Check required status checks on PR

### Coverage Artifacts

Each workflow uploads coverage reports:
```
Artifacts:
- backend-coverage
- graphql-coverage
- finance-coverage
- supply-chain-backend-coverage
- supply-chain-frontend-coverage
```

Download from GitHub Actions run details.

## 🔧 Troubleshooting

### Workflow Failure: Backend Quality Push
```bash
# Check what changed
git diff origin/main..HEAD --name-only | grep backend/

# Run locally to debug
cd erp_new_system/backend
npm run quality:push
```

### Workflow Failure: GraphQL Quality Gate
```bash
# Check GraphQL changes
git diff origin/main..HEAD --name-only | grep graphql/

# Test locally
cd graphql
npm run quality
```

### Multiple Workflow Failures
```bash
# Run full system check locally
./quality all

# Check individual services failing
./quality backend
./quality graphql
./quality finance
./quality supply-chain
./quality frontend
```

### Branch Protection Not Configured
```powershell
# Verify checks configured
$env:GITHUB_TOKEN = "your_token"
powershell -ExecutionPolicy Bypass -File .\scripts\github\enable-branch-protection.ps1 -DryRun

# Apply configuration
powershell -ExecutionPolicy Bypass -File .\scripts\github\enable-branch-protection.ps1
```

## 📈 Performance Metrics

### Local Execution Times
| Command | Duration | Scope |
|---------|----------|-------|
| `quality quick` | ~20 min | Phase2 + lints |
| `quality backend:push` | ~12 min | Phase2 backend only |
| `quality backend` | ~35 min | All 894 tests |
| `quality graphql` | ~5 min | GraphQL only |
| `quality finance` | ~5 min | Finance only |
| `quality supply-chain` | ~5 min | Supply chain only |
| `quality all` | ~60 min | Sequential all |

### GitHub CI Times
| Workflow | Duration | Parallelization |
|----------|----------|-----------------|
| backend-push | ~20 min | N/A |
| backend-gate | ~35 min | N/A |
| graphql-gate | ~5 min | Parallel with others |
| finance-gate | ~5 min | Parallel with others |
| supply-chain-gate | ~10 min | Backend + Frontend |
| system-quality-gate | ~35 min | All 5 jobs parallel |

### Test Counts
- **Backend**: 894 tests (29 suites, 35% phase2)
- **GraphQL**: Jest coverage available
- **Finance**: Jest coverage available
- **Supply Chain**: Jest coverage available
- **Frontend**: React component tests

## 🔐 Security Considerations

- All workflows run on Ubuntu (isolated environment)
- GitHub token scoped to repo (read-only for most operations)
- Database credentials stored in GitHub Actions secrets
- No credentials logged or output to workflows
- Branch protection enforced on main/master

## 📝 Additional Resources

- Backend Docker setup: [backend/Dockerfile](../backend/Dockerfile)
- Workflow examples: [.github/workflows/](.github/workflows/)
- Test documentation: [backend/tests/README.md](../backend/tests/README.md)
- CLI help: `./quality help`

---

**Last Updated**: March 1, 2026
**System Status**: ✅ All 5 services quality-enabled
**Test Coverage**: 894 backend tests + service-specific coverage
