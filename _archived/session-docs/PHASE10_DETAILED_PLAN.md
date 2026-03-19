# Phase 10 Planning & Strategy

**Date:** February 28, 2026  
**Current Pass Rate:** 75.85% (Phase 7 baseline)  
**Target Pass Rate:** 80%+  
**Gap to Target:** +4.15% (~155 tests)  

## Executive Summary

Based on Phases 6-9 investigation, we've identified that:
1. **MongoDB timeouts** are the primary blocker (~400-500 tests, 52% of failures)
2. **Route/module issues** are secondary (~100-150 tests, 15% of failures)
3. **Test code changes alone** cannot exceed ~76% pass rate
4. **Infrastructure optimization** is required for further progress

---

## Phase 10 Execution Plan

### Tier 1: Low-Risk Route Fixes (Est. +15-20 tests, 0.4-0.5%)

**1.1 Fix Vehicle Routes Missing Implementations**
- **File:** `__tests__/vehicle-routes.phase3.test.js`
- **Issue:** Route handlers incomplete or missing
- **Action:** Review route implementation in `routes/vehicleRoutes.js`
- **Effort:** 15 minutes
- **Risk:** LOW

**1.2 Fix Project Routes Missing Implementations**
- **File:** `__tests__/project-routes.comprehensive.test.js`
- **Issue:** Similar to vehicle routes
- **Action:** Check `routes/projectRoutes.js` or create stub
- **Effort:** 15 minutes
- **Risk:** LOW

**1.3 Verify Test Imports in Comprehensive Tests**
- **Files:** Multiple `*comprehensive.test.js` files
- **Action:** Ensure all route requires are correct
- **Effort:** 10 minutes
- **Risk:** LOW

### Tier 2: Test Database Isolation (Est. +20-30 tests, 0.5-0.8%)

**2.1 Optimize Document Management Tests**
- **Target:** `__tests__/documents.management.test.js`
- **Issue:** beforeEach hooks create cascading MongoDB timeouts
- **Strategy:**
  - Keep beforeAll for suite-level setup
  - Minimize concurrent DB operations
  - Stagger deletions in afterAll
- **Code Change:**
  ```javascript
  // Before:
  beforeEach(async () => {
    // Multiple User.create() calls
  });
  
  // After:
  beforeAll(async () => {
    // Create once, reuse across tests
  });
  ```
- **Effort:** 20-30 minutes
- **Risk:** MEDIUM (requires careful testing)

**2.2 Profile and Optimize Test Suite**
- **Target:** Tests with high MongoDB buffer usage
- **Action:** Reduce concurrent DB connections
- **Implementation:** Set `--maxWorkers=1` for problematic suites
- **Effort:** 5-10 minutes per suite
- **Risk:** LOW

### Tier 3: Infrastructure Improvements (Est. +30-50 tests, 0.8-1.3%)

**3.1 Increase MongoMemoryServer Capacity**
- **File:** `jest.config.js`
- **Current:** Default 10s timeout, standard buffer
- **Option A:** Increase timeout in MongoMemoryServer setup
  ```javascript
  mongoServer = await MongoMemoryServer.create({
    instance: {
      oplogSize: 512,
      storageEngine: 'wiredTiger',
    },
    binary: {
      version: '5.0.0' // Use newer version for better performance
    }
  });
  ```
- **Option B:** Connection pooling
  ```javascript
  // In test setup
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    waitQueueTimeoutMS: 10000
  });
  ```
- **Effort:** 15-20 minutes
- **Risk:** MEDIUM (affects all tests)

**3.2 Implement Selective Worker Configuration**
- **Current:** `--maxWorkers=2` for all tests
- **Proposed:**
  - Complex suites: `--maxWorkers=1`
  - Simple tests: `--maxWorkers=4`
- **Script changes** in `package.json`
- **Effort:** 10 minutes
- **Risk:** LOW

### Tier 4: Validate Framework (Phase 10 End)

**4.1 Run Full Test Suite**
- **Command:** `npx jest --maxWorkers=2 --no-coverage --testTimeout=30000`
- **Expected Time:** 2-3 minutes
- **Success Criteria:** 
  - ✅ No regressions (≥75.85%)
  - ✅ Improvement measured (+0.4% minimum)
  - ✅ All commits documented

**4.2 Document Phase 10 Results**
- **Output:** Create PHASE10_RESULTS.md
- **Include:** Metrics, blockers, next steps

---

## Implementation Priority

### High Priority (Do first in Phase 10)
1. **Tier 1.1-1.3:** Fix vehicle/project routes (+0.4-0.5%)
2. **Tier 2.1:** Optimize documents.management.test.js (+0.5-0.8%)

**Estimated combined:** +0.9-1.3% gain, 20-40 tests recovered

### Medium Priority (If time allows)
3. **Tier 2.2:** Test suite profiling
4. **Tier 3.1:** MongoMemoryServer optimization

**Estimated additional:** +0.8-1.3% gain, 30-50 tests recovered

### Lower Priority (For Phase 11)
5. **Tier 3.2:** Selective worker configuration (if still helpful)

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Regression from changes | Medium | High | Test immediately, git rollback |
| MongoDB timeout persists | High | Low | Accept as baseline, document |
| Hook optimization breaks tests | Medium | Medium | Only modify 1-2 suites per run |
| Infrastructure change breaks setup | Low | High | Create backup jest.config.js |

---

## Go/No-Go Decision Points

**Go → Tier 2** if:
- ✅ Tier 1 completes without regression
- ✅ Pass rate increases by ≥0.2%

**Go → Tier 3** if:
- ✅ Tier 2 completes without regression
- ✅ Tier 1+2 combined achieves ≥0.9% improvement

**Stop & Document** if:
- ❌ Any change causes >0.5% regression
- ❌ MongoDB timeouts remain ≥400 tests after Tier 2

---

## Success Criteria

**Minimum Success (Phase 10):**
- [ ] Achieve 75.95%+ pass rate (+0.1% gain, ~4 tests)
- [ ] Maintain no regressions
- [ ] Document all changes

**Target Success (Phase 10):**
- [ ] Achieve 76.50%+ pass rate (+0.65% gain, ~25 tests)
- [ ] Identify clear next steps for 77%+
- [ ] Confirm MongoDB timeout is primary blocker

**Stretch Success (Phase 10):**
- [ ] Achieve 77.00%+ pass rate (+1.15% gain, ~45 tests)
- [ ] Implement Tier 3 infrastructure improvements
- [ ] Validate path to 80%

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Tier 1 (routes) | 30-40 min | 30-40 min |
| Tier 2 (optimization) | 30-40 min | 60-80 min |
| Test validation | 5-10 min | 65-90 min |
| Documentation | 10 min | 75-100 min |

**Total Phase 10:** ~75-100 minutes (1.5 hours)

---

## Resources & Documentation

**Key Files to Review:**
- `jest.config.js` - Test configuration
- `package.json` - Test scripts
- `__tests__/documents.management.test.js` - Example optimization target
- `backend/routes/` - Route implementations to verify

**Logs to Monitor:**
- Test output for MongoDB timeout patterns
- Hook execution timing
- Worker utilization metrics

**Git Strategy:**
- Create feature branch: `phase-10/optimization`
- Small commits for each fix
- Test after each commit

---

## Notes for Phase 10 Session

✅ **What we know:**
- MongoDB timeouts are ~52% of failures (estimated 400-500 tests)
- Query/import path fixes are ~15% of failures
- Current plateau is hard ceiling with test-only changes
- Database infrastructure changes are required for 77%+

⚠️ **What we need to validate:**
- Exact impact of each hook optimization
- MongoMemoryServer buffer behavior
- Connection pool impact on concurrent tests

🎯 **The goal:**
- Move from 75.85% to 77%+ by Phase 10 end
- Identify whether 80% is achievable without complete database refactor

---

**Next session: Execute Phase 10 according to this plan.**

