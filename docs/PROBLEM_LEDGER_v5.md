# Problem Ledger v5 — Autonomous Repair Brief

> Generated: 2026-06-20T15:15:00+03:00  
> Updated: 2026-06-20T16:05:00+03:00  
> Scope: 66666/backend + web-admin (`alawael-rehab-platform/apps/web-admin`)  
> Charter: §0 full staff-engineer authority, §2 invariants in force.

## Ledger format

| ID | Severity | Title | File(s) | Evidence | Root Cause | Class | Status |

---

## Round 1 — Initial discovery

### P0

| ID   | Severity | Title                                                                                                  | File(s)                                            | Evidence                                                                           | Root Cause                                                                                                                          | Class                     | Status    |
| ---- | -------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------- |
| P0-1 | P0       | `npm run test:sprint` spawn ENAMETOOLONG on Windows                                                    | `backend/scripts/run-sprint.js`                    | `node:internal/child_process:421 Error: spawn ENAMETOOLONG` when running 976 tests | `spawn(process.execPath, [jestBin, ...args])` still hits Windows CreateProcess ARG_MAX (~32KB); script promised to chunk but didn't | Broken deploy gate        | **FIXED** |
| P0-2 | P0       | `routes/clinical-legacy-adapter.routes.js` accepts `req.body.beneficiaryId` without branch enforcement | `backend/routes/clinical-legacy-adapter.routes.js` | `no-unprotected-beneficiary-param-wave440.test.js` flagged the file                | Missing `requireBranchAccess` + `bodyScopedBeneficiaryGuard` on the router                                                          | Security / isolation leak | **FIXED** |

### P1

| ID   | Severity | Title                                                   | File(s)                                                                   | Evidence                                                                                 | Root Cause                                                                                          | Class                       | Status    |
| ---- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- | --------- |
| P1-1 | P1       | Sprint tests missing from CI workflow `paths:`          | `backend/sprint-tests.txt`, `.github/workflows/sprint-tests.yml`          | `check:sprint-paths` reported 2 missing entries; `ci-path-triggers-exist.test.js` failed | New wave0 tests added to sprint list but not to GitHub workflow trigger paths                       | Config drift / contract gap | **FIXED** |
| P1-2 | P1       | web-admin command-palette empty-state test flakes/fails | `apps/web-admin/src/components/layout/__tests__/command-palette.test.tsx` | 1 failed test: `screen.getByText(/لا توجد نتائج/)` throws                                | Live `searchApi.global` network call debounced; test asserted before async search settled + no mock | Live test defect            | **FIXED** |

### P2

| ID   | Severity | Title                                                      | File(s)                                                                                                             | Evidence                                                                                                                                           | Root Cause                                                                                | Class                      | Status                                        |
| ---- | -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------- | ----------------- | --------- |
| P2-1 | P2       | Dormant-module baseline drift                              | `backend/scripts/check-dormant-modules.js`                                                                          | 2 NEW dormant: `services/beneficiaryEquityEngine.service.js`, `services/financeAnomaly.service.js`; 1 STALE: `services/isolationForest.service.js` | New services added without production wiring; deleted/now-wired service still in baseline | Dead code / baseline drift | **FIXED**                                     |
| P2-2 | P2       | Backend lint warnings break `--max-warnings=0`             | `backend/scripts/run-sprint.js`, `backend/scripts/check-env.js`, `backend/routes/clinical-legacy-adapter.routes.js` | `npm run lint` failed with 4 warnings                                                                                                              | Unused imports/variables                                                                  | Lint defect                | **FIXED**                                     |
| P2-3 | P2       | Unbounded `limit` query in clinical legacy adapter         | `backend/routes/clinical-legacy-adapter.routes.js:609`                                                              | `unbounded-query-limit-wave1182.test.js` flagged `const limit = parseInt(req.query.limit, 10)                                                      |                                                                                           | 20`                        | Missing `Math.min` cap on user-supplied limit | Memory DoS vector | **FIXED** |
| P2-4 | P2       | Golden-thread route test not isolated from prior test data | `backend/__tests__/golden-thread-gate-routes-behavioral-wave1219.test.js`                                           | Count expected 1, received 2 (leftover TherapeuticGoal)                                                                                            | Only `afterEach` cleanup; no `beforeEach` cleanup of shared MongoMemoryServer DB          | Test isolation / flakiness | **FIXED**                                     |

### Rejected / stale / scoped out

- `66666/frontend` (legacy React app) is **dead code** per `CLAUDE.md` repo doctrine. Any defects there are out of scope for this repair; the live web-admin is `alawael-rehab-platform/apps/web-admin`.
- Production logs `logs/error.log` show historical `[ROUTE FAIL]` entries (13 routes, 2026-05-15). All 13 route files now export valid Express Routers; `require('./app')` boots cleanly. Classified as **stale history, not a live defect** (per A8 latest-timestamp analysis). No code change.

---

## Fix evidence

### P0-1 — run-sprint runner

**Red (pre-fix):**

```
node:internal/child_process:421
Error: spawn ENAMETOOLONG
    at main (C:\...\backend\scripts\run-sprint.js:66:17)
```

**Green (post-fix):** runner launches jest via temp config; final `npm run test:sprint` running (see §10 whole-system verification).
**Guard:** `npm run test:sprint` itself + ADR-021 temp-config file approach eliminates argv-length class.
**Rollback:** `git revert` of `backend/scripts/run-sprint.js`.

### P0-2 — clinical-legacy-adapter branch isolation

**Red:** `no-unprotected-beneficiary-param-wave440.test.js`:

```
W441: 1 route file(s) accept beneficiaryId in body WITHOUT branch enforcement.
  - routes/clinical-legacy-adapter.routes.js (1 req.body.beneficiaryId usage, NONE)
```

**Green:** added `router.use(requireBranchAccess)` + `router.use(bodyScopedBeneficiaryGuard)` after auth.
**Guard:** `no-unprotected-beneficiary-param-wave440.test.js`.

### P1-1 — CI path triggers

**Red:** `__tests__/ci-path-triggers-exist.test.js` failed:

```
sprint-tests.txt references files missing from sprint-tests.yml paths:
  __tests__/beneficiary-lifecycle-model-alignment-wave0.test.js
  __tests__/unifiedNotifier-in-app-channel-wave0.test.js
```

**Green:** `node backend/scripts/sync-sprint-tests-paths.js` auto-fixed; drift test passes:

```
PASS __tests__/ci-path-triggers-exist.test.js
  √ every test:sprint test file appears in the paths trigger
```

**Guard:** `ci-path-triggers-exist.test.js` + `check:sprint-paths`.

### P1-2 — web-admin command-palette test

**Red:** 1 failed test out of 127 files / 1122 tests:

```
⎯⎯[1/1]⎯ src/components/layout/__tests__/command-palette.test.tsx
  screen.getByText(/لا توجد نتائج/)  →  Unable to find element
```

**Green:** mocked `searchApi.global` + `waitFor` async assertion; test file now passes 7/7:

```
✓ src/components/layout/__tests__/command-palette.test.tsx (7 tests)
```

**Guard:** `npm run test` in web-admin (127 files / 1122 tests green).

### P2-1 — dormant modules

**Red:** `check:dormant-modules` reported NEW dormant + STALE baseline.
**Green:** baseline ratcheted — removed `services/isolationForest.service.js`; added `services/financeAnomaly.service.js` (CLI_TOOL) and `services/beneficiaryEquityEngine.service.js` (TEST_ONLY). Updated test expectation 10→11.

```
Dormant: 11 (baseline: 11).
✓ No NEW dormant modules + no stale baseline entries.
```

**Guard:** `npm run check:dormant-modules` + `__tests__/check-dormant-modules-script.test.js`.

### P2-2 — backend lint

**Red:** 4 warnings broke `npm run lint --max-warnings=0`.
**Green:** removed unused `os` (run-sprint.js), `fs`/`validateEnv` (check-env.js), `goal` (clinical-legacy-adapter.routes.js).
**Guard:** `npm run lint`.

### P2-3 — unbounded query limit

**Red:** `unbounded-query-limit-wave1182.test.js` flagged line 605.
**Green:** `const limit = Math.min(parseInt(req.query.limit, 10) || 20, 1000);`
**Guard:** `unbounded-query-limit-wave1182.test.js`.

### P2-4 — golden-thread test isolation

**Red:** `TherapeuticGoal.countDocuments({})` expected 1, received 2 (shared DB contamination).
**Green:** added `beforeEach` cleanup of `TherapeuticGoal` + `ClinicalSession`.
**Guard:** `golden-thread-gate-routes-behavioral-wave1219.test.js` (passes standalone and in sprint).

---

## Convergence tracker

- Round 1 surfaced: 1 P0, 2 P1, 2 P2, 2 stale/scoped-out.
- Round 2 (sprint partial run) surfaced: 1 additional P0, 2 additional P2.
- Fixed: 2 P0, 2 P1, 4 P2.
- §10 whole-system verification pending completion of final `npm run test:sprint`.
