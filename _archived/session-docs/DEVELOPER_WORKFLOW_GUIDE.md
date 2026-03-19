# ALAWAEL Developer Workflow Guide

Complete step-by-step guide for developers working with the quality system.

## 🚀 Quick Start (5 Minutes)

### 1. Understand the Quality Levels

```bash
# Level 1: Ultra-Fast (syntax only, <1 min)
npm run quality:guard        # Check: imports, formatting

# Level 2: Light (lint + guard, ~5 min)
npm run quality:fast         # Check: guard + linting

# Level 3: Complete (full tests, ~35 min for backend)
npm run quality:ci           # Check: guard + full test suite + CI mode
```

### 2. Before Committing Changes

**In your feature branch:**

```bash
cd backend                   # (or graphql, finance-module/backend, etc.)
npm run quality:ci           # Run strict quality check
```

**Example output:**
```
✅ Maintenance mock centralization check passed
Test Suites: 29 passed, 29 total
Tests: 894 passed, 894 total
Time: 32.341 s
```

### 3. Before Pushing

**Get fast feedback:**
```bash
cd c:\path\to\alawael-erp
./quality quick              # Smoke tests (~20 min, non-blocking)
# Then push:
git push origin feature/my-feature
```

**Or run specific service:**
```bash
cd backend
npm run quality:push         # Fast phase2 tests only (~12 min)
git push origin feature/my-feature
```

### 4. Pull Request Submission

1. Push your branch (CI runs automatically)
2. Create PR on GitHub
3. Wait for checks:
   - ✅ Backend Quality Push (push gate, ~20 min)
   - ✅ Backend Quality Gate (PR gate, ~35 min)
   - ✅ [Service] Quality Gate (other services)
   - ✅ System Quality Summary

4. All checks pass → Ready for review!

---

## 📋 Step-by-Step Workflows

### Workflow 1: Bug Fix (Backend)

**Time estimate: ~50 minutes (parallel)**

```bash
# 1. Create branch
git checkout -b fix/bug-description
cd backend
code src/bug-location.js          # Make changes

# 2. Run unit tests for your module
npm test -- src/__tests__/my-test.test.js --watch=false

# 3. Run quality gate locally (while waiting)
npm run quality:fast              # Quick lint check (~1 min)

# 4. Before pushing, run full check
npm run quality:ci                # Full validation (~35 min)

# 5. If all green:
git add .
git commit -m "fix: resolve bug in XYZ"
git push origin fix/bug-description

# 6. Monitor CI on GitHub (20 + 35 min parallel = ~35 min)
# Create PR when ready

# 7. After PR review approval:
# Assign PR to yourself
# Wait for all checks
# Merge when all green
```

**When to use what:**
- `npm run quality:fast` - Quick feedback while coding (takes ~1 min)
- `npm run quality:push` - Before git push (takes ~12 min, phase2 only)
- `npm run quality:ci` - Before PR/before final push (takes ~35 min, all tests)

### Workflow 2: Feature Development (Multiple Services)

**Time estimate: First checkin ~60 min total**

```bash
# 1. Create feature branch
git checkout -b feature/new-capability
cd backend
# Make backend changes
npm run quality:push             # Fast validation

cd ../graphql
# Make GraphQL changes
npm run quality                  # GraphQL validation

cd ../finance-module/backend
# Make finance changes
npm run quality                  # Finance validation

# 2. Quick system check
cd c:\path\to\alawael-erp
./quality quick                  # Smoke tests across all services

# 3. Commit and push
git add .
git commit -m "feat: new capability"
git push origin feature/new-capability

# 4. Create PR
# All service workflows run in parallel:
# - backend-quality-push (~20 min)
# - graphql-quality (~5 min)
# - finance-quality (~5 min)
# - supply-chain-quality (~10 min)
# Total: ~20 min (parallel)

# 5. After all green:
# Request review, wait for approval, merge
```

### Workflow 3: Quick Hotfix (Urgent)

**Time estimate: ~15 minutes**

```bash
# 1. Checkout hotfix branch
git checkout -b hotfix/urgent-issue

# 2. Make minimal change
cd backend
# ... fix code ...

# 3. Quick validation (skip full tests if urgent)
npm run quality:guard            # Guard checks only (~30 sec)
npm run lint                     # Linting (~1 min)

# 4. Push and create PR
git add .
git commit -m "hotfix: urgent issue"
git push origin hotfix/urgent-issue

# 5. On GitHub PR:
# - Describe urgency in PR description
# - Most critical check will run first
# - Can be merged once critical checks pass
```

### Workflow 4: Performance Optimization

**Time estimate: ~60 minutes (with profiling)**

```bash
# 1. Create optimization branch
git checkout -b perf/optimize-xyz
cd backend

# 2. Check baseline
npm test -- --testNamePattern="performance" --watch=false

# 3. Make changes and measure
npm run quality:push             # Phase2 tests only

# 4. Compare metrics
# Look at Test Output → Duration
# Expected improvement should be visible

# 5. Full validation
npm run quality:ci               # Full suite to confirm no regressions

# 6. Document improvement
git add .
git commit -m "perf: improve xyz performance by X%"

# Document:
# - Baseline metrics
# - New metrics
# - Improvement percentage
# - Any trade-offs
```

---

## 🔄 Common Scenarios & Solutions

### Scenario 1: Test Failing Locally but Passing on CI

**Possible causes:**
- Environment variables missing
- Database not running
- Cache issue

**Solutions:**
```bash
# Clean and restart
npm cache clean --force
rm -rf node_modules
npm install

# Set environment variables
source .env.test              # Load test env vars
npm test                      # Run tests again

# Or completely isolate:
npm test -- --forceExit --runInBand
```

### Scenario 2: Multiple Service Changes

**When you modify both Backend and GraphQL:**

```bash
# Run BOTH quality checks
cd backend && npm run quality:push &
cd graphql && npm run quality &
wait

# Then commit all
git add .
git commit -m "feat: backend and graphql changes"
git push origin feature/multi-service
```

### Scenario 3: Merge Conflicts in Tests

**When test files conflict:**

```bash
# 1. Check conflict markers
git diff
code src/__tests__/conflict-file.test.js

# 2. Resolve markers manually
# 3. Run tests to verify resolve
npm test -- src/__tests__/conflict-file.test.js

# 4. Mark resolved
git add src/__tests__/conflict-file.test.js
git commit -m "resolve: merge conflict in test file"
```

### Scenario 4: Performance Regression Detected

**If CI shows tests taking longer:**

```bash
# 1. Check baseline
git log --oneline -n 5
git checkout <previous-good-commit>
npm run quality:push          # Measure baseline

git checkout -
npm run quality:push          # Measure new version

# 2. Compare times
# If regression found, investigate:
npm test -- --detectOpenHandles  # Find resource leaks
npm test -- --verbose            # See test details

# 3. Optimize or document
# If acceptable, commit with explanation
git commit -m "perf: acceptable regression due to X
Baseline: 10s → Now: 12s
Reason: Added comprehensive coverage"
```

---

## 📊 Local Command Reference

### Quick Commands

```bash
# All-in-one commands
./quality quick              # Fast smoke tests (~20 min)
./quality all                # Full system check (~60 min)

# By service
./quality backend            # Backend strict (~35 min)
./quality backend:push       # Backend fast (~12 min)
./quality graphql            # GraphQL only (~5 min)
./quality finance            # Finance only (~5 min)
./quality supply-chain       # Supply chain (~5 min)
./quality frontend           # Frontend only (~5 min)
```

### Makefile Targets

```bash
make quality:backend         # Backend strict
make quality:backend:push    # Backend fast
make quality:all             # All services

# These run from root directory
make -C backend quality:ci    # Run backend CI from anywhere
```

### Service-Specific Commands

**Backend:**
```bash
cd backend
npm run quality:ci           # Full validation
npm run quality:push         # Fast validation
npm run quality:fast         # Light validation
npm run quality:guard        # Guard only
```

**Other services (same pattern):**
```bash
cd graphql
npm run quality              # Primary command (runs quality:ci)
npm run quality:fast         # Light validation
npm run quality:guard        # Guard only
```

---

## ⚡ Performance Tips

### Speed Up Development

1. **Use phase-based testing for backend:**
   ```bash
   npm test -- --testPathPattern="phase2"  # Critical tests only
   ```

2. **Watch mode for development:**
   ```bash
   npm test -- --watch                     # Auto-rerun on changes
   npm test -- --watch --onlyChanged       # Changed files only
   ```

3. **Parallel execution (if available):**
   ```bash
   npm test -- --maxWorkers=4              # Multi-core testing
   ```

4. **Run checks asynchronously:**
   ```bash
   cd backend && npm run quality:push &    # Background
   cd graphql && npm run quality &         # Background
   wait                                     # Wait for both
   ```

### CI Performance Optimization

The system already uses:
- ✅ Parallel workflow jobs (runs all services at once)
- ✅ Service-specific triggers (only runs affected services)
- ✅ Phase-based testing (push gate uses phase2 subset)
- ✅ Concurrent run cancellation (prevents duplicate charges)
- ✅ Timeout protection (35 min max per job)

---

## 🔐 Best Practices

### Before Every Push

- [ ] Run appropriate quality script locally
- [ ] All tests pass locally
- [ ] No linting issues
- [ ] Code follows project conventions
- [ ] Commit message is clear

### In PR Description

```markdown
## Description
Brief description of changes

## Testing
- [x] Backend tests pass (894/894)
- [x] GraphQL tests pass
- [x] No regressions detected

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Checklist
- [x] Self-reviewed code
- [x] Added/updated tests
- [x] No console.log() left
- [x] Code compiles without warnings
```

### Commit Message Conventions

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "fix(backend): resolve race condition in Order service"
git commit -m "feat(graphql): add new mutation for invoice generation"
git commit -m "perf(backend): optimize complex query by 40%"
git commit -m "test(finance): add comprehensive audit log tests"
git commit -m "docs: update deployment guide"
git commit -m "refactor(supply-chain): simplify inventory validation"
```

---

## 📞 Getting Help

### When Quality Checks Fail

1. **Read the error message carefully**
   ```bash
   # Local error will show exact line and fix
   npm run quality:ci
   # Look for: Error at line X, column Y
   ```

2. **Check recent changes**
   ```bash
   git diff HEAD~1
   git log --oneline -n 5
   ```

3. **Run in isolation**
   ```bash
   # For backend
   npm test -- src/__tests__/my-failing-test.test.js --verbose

   # For other services
   npm run quality:guard    # Guard checks first
   npm run lint             # Then linting
   npm test                 # Then full tests
   ```

4. **Check system health**
   ```bash
   ./scripts/health-check.sh  # Full system diagnosis
   ```

### Performance Analysis

```bash
# Analyze quality check times
./scripts/quality-performance-monitor.sh

# Check coverage
./scripts/coverage-analyzer.sh
```

### Access Documentation

```bash
./quality help                           # CLI help
cat QUICKSTART_QUALITY.md               # Quick reference
cat SYSTEM_QUALITY_GUIDE.md             # Deep dive
cat PHASE2_QUALITY_EXPANSION_COMPLETE.md # Implementation details
```

---

## 🎯 Key Takeaways

### Quality System Summary

| Aspect | Details |
|--------|---------|
| **Guard** | Fast syntax/lint checks (<1 min) |
| **Fast** | Phase2 critical tests (~12 min) |
| **CI** | All tests in strict mode (~35 min) |
| **Parallel** | System runs all services in parallel (~35 min) |
| **Local** | Use `./quality` CLI for all operations |
| **GitHub** | Automatically runs on push and PR |
| **Protection** | All required checks must pass before merge |

### Development Workflow Summary

```
Code → Run Quality Checks → Commit → Push → CI Runs → PR Review → Merge
       (5-35 min)               (0)      (0)  (35 min)   (variable)  (instant)
```

### Time Investment

- **Per commit**: 5-35 min (depends on check type)
- **Per PR**: Already invested in checks (runs in parallel)
- **Per release**: Full system validation (~60 min if sequential)

---

**Version**: 2.0.0
**Last Updated**: March 1, 2026
**Status**: ✅ Ready for Team Use

For questions or improvements, contact the development team.
