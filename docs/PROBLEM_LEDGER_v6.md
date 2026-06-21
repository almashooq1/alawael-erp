# Problem Ledger v6 — Repair-All-Defects continuation

> Generated: 2026-06-20T22:45:00+03:00  
> Updated: 2026-06-21T08:00:00+03:00  
> Scope: 66666/backend (web-admin repo not present locally)  
> Charter: CLAUDE.md overrides defaults; invariants in force.

## Ledger format

| ID | Severity | Title | File(s) | Evidence | Root Cause | Class | Status |

---

## Round 1 — Initial discovery

### P0

| ID   | Severity | Title                                                             | File(s)                                | Evidence                                                                                                   | Root Cause                                                                 | Class           | Status          |
| ---- | -------- | ----------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | --------------- |
| P0-1 | P0       | Production MongoDB buffering timeouts on `advancedtickets.find()` | `backend/services/...` (SLA-Scheduler) | `error1.log`: `Operation advancedtickets.find() buffering timed out after 10000ms` recurring every ~10 min | Missing/exhausted Mongo connection pool or missing index on hot query path | prod-db-timeout | **OWNER-GATED** |
| P0-2 | P0       | Production MongoDB buffering timeouts on `nphiesclaims.find()`    | `backend/services/...` (nphies-recon)  | `error1.log`: `Operation nphiesclaims.find() buffering timed out after 10000ms` recurring every ~10 min    | Same as P0-1: connection pool or index issue on reconciliation query       | prod-db-timeout | **OWNER-GATED** |

### P1

| ID   | Severity | Title                                                          | File(s)                                                                                                                              | Evidence                                                                                                     | Root Cause                                                                | Class                            | Status          |
| ---- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------- | --------------- |
| P1-1 | P1       | Clinical fields reference auth `Session` model                 | `backend/models/SpeechSessionRecording.js`, `VitalSign.js`, `BeneficiaryVoiceLog.js`, `phase37.model.js`, `nphies/InsuranceClaim.js` | `ref: 'Session'` used for therapy sessions, but `mongoose.model('Session', ...)` is the auth session tracker | Name collision: clinical session fields reuse the auth-session model name | clinical-session-model-confusion | **FIXED W1424** |
| P1-2 | P1       | Duplicate IEP models: `IndividualEducationPlan` and `SmartIEP` | `backend/models/IndividualEducationPlan.js`, `backend/models/SmartIEP.js`                                                            | Both registered independently; both have live routes                                                         | Two separate IEP/IFSP verticals built without consolidation               | iep-model-confusion              | **OPEN**        |
| P1-3 | P1       | Duplicate eventType `plan.completed` in `dddEventContracts`    | `backend/events/contracts/dddEventContracts.js`                                                                                      | W374: `"plan.completed" appears in BOTH self-advocacy.PLAN_COMPLETED AND independent-living.PLAN_COMPLETED`  | Two domains declared identical eventType string                           | event-contract-drift             | **FIXED W1423** |

### P2

| ID   | Severity | Title                                                                | File(s)                                                                                                               | Evidence                                                                                                                                                                                | Root Cause                                                             | Class                            | Status                   |
| ---- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| P2-1 | P2       | Multiple coexisting clinical session-like models                     | `backend/domains/sessions/models/ClinicalSession.js`, `models/TherapySession.js`, `models/DisabilitySession.js`, etc. | Many `*Session` models registered (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, `GroupSession`, `TeleSession`, `ARVRSession`, ...)                            | No canonical clinical-session model; CQRS split + domain fragmentation | clinical-session-model-confusion | **OPEN — ADR candidate** |
| P2-2 | P2       | `dddEventContracts` has 8 domain groups not tracked by W374          | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374: Expected 112 groups, received 120; extra groups: authorization, care-coordination, cdss, clinical-assessment, clinical-safety, decision-rights, independent-living, self-advocacy | New groups added to registry without updating drift guard              | event-contract-drift             | **FIXED W1423**          |
| P2-3 | P2       | 18 eventType prefixes not allowlisted in W374                        | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374 naming-convention test lists 18 prefix violations                                                                                                                                  | New prefixes added without extending `ALLOWED_EVENT_PREFIXES`          | event-contract-drift             | **FIXED W1423**          |
| P2-4 | P2       | `[llm-anomaly-history] save failed` in production logs               | `backend/services/...` (LLM anomaly history)                                                                          | `error1.log`: `[llm-anomaly-history] save failed:` recurring every ~10 min                                                                                                              | Save path fails silently (need detail)                                 | prod-silent-failure              | **OWNER-GATED**          |
| P2-5 | P2       | Orchestration script references non-existent `check:phantom-imports` | `.kimi/tasks/repair-all-defects.js`                                                                                   | `npm error Missing script: "check:phantom-imports"`                                                                                                                                     | Script copied surface list with stale script name                      | task-definition-drift            | **FIXED W1424**          |

### Blocked / owner-gated

- `web-admin` surface blocked: `alawael-rehab-platform/apps/web-admin` repo not found at relative path.
- Full `test:sprint` run blocked: MongoMemoryServer fails to start in this environment (`Instance closed unexpectedly with code 2`).
- P0-1 / P0-2 / P2-4 are production operational issues requiring prod DB/logs access to root-cause (connection pool, indexes, LLM anomaly history save path).

### Surfaces swept

| Surface                | Result                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gates`                | ✅ Clean — all 7 pre-push gates pass after fixes.                                                                                                            |
| `phantom-extra`        | ✅ Clean after removing stale `check:phantom-imports` from task script; `check:dormant-modules`, `lint:duplication`, `preflight` pass.                       |
| `prod-logs`            | ⚠️ Live MongoDB timeouts + LLM save failures detected in `error1.log` — operational, owner-gated.                                                            |
| `structural`           | 6 findings; 3 fixed (event-contract drift + clinical-session auth-ref confusion); 3 remain (IEP duplication, session-model proliferation, operational logs). |
| `web-admin`            | ❌ Repo not present locally.                                                                                                                                 |
| `sprint` / `jest-full` | ⏳ Blocked by MongoMemoryServer startup failure in this environment.                                                                                         |

---

## Fix evidence

### W1423 — DDD event-contract drift guard

**Red (pre-fix):**

```
W374 DDD event-contracts drift guard
  ● DDD_CONTRACTS includes exactly the expected domain groups — Expected: 112, Received: 120
  ● every eventType matches <allowed_prefix>.<snake_case> shape — 18 prefix violations
  ● no duplicate eventType strings — "plan.completed" appears in BOTH self-advocacy.PLAN_COMPLETED AND independent-living.PLAN_COMPLETED
Test Suites: 1 failed, 4 failed tests
```

**Green (post-fix):**

```
PASS __tests__/ddd-event-contracts-wave374.test.js
  W374 DDD event-contracts drift guard
    ✓ exports DDD_CONTRACTS aggregator + getDDDContractStats helper
    ✓ DDD_CONTRACTS includes exactly the expected domain groups
    ✓ every named event group is also exported as a named export
    ✓ every contract has the canonical envelope fields
    ✓ every contract.version is a positive integer
    ✓ every contract.consumers is a non-empty array of strings
    ✓ every eventType matches <allowed_prefix>.<snake_case> shape
    ✓ no duplicate eventType strings across the entire registry
    ✓ contract.domain matches the DDD_CONTRACTS group key (or known alias)
    ✓ getDDDContractStats() returns totals within stable bounds
Test Suites: 1 passed, 10 passed
```

**Files changed:**

- `backend/events/contracts/dddEventContracts.js`
- `backend/__tests__/ddd-event-contracts-wave374.test.js`

**Guard:** `__tests__/ddd-event-contracts-wave374.test.js` (W374) is the regression guard.

### W1424 — Clinical session auth-ref confusion

**Red (pre-fix):**

```
grep -R "ref: 'Session'" backend/models --include="*.js"
models\VitalSign.js:58:      ref: 'Session',
models\SpeechSessionRecording.js:46:    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
models\BeneficiaryVoiceLog.js:119:    relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
models\phase37.model.js:620:    linkedTherapySession: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
models\nphies\InsuranceClaim.js:13:    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
```

`models/Session.js` is the user auth-session tracker (`userId`, `token`, `expiresAt`). Clinical fields were populating login sessions.

**Green (post-fix):**

```
PASS __tests__/clinical-session-ref-drift-wave1424.test.js
  W1424 clinical session ref drift guard
    ✓ no model outside the auth Session model references ref: 'Session' (483 ms)
Test Suites: 1 passed, 1 passed
```

**Files changed:**

- `backend/models/VitalSign.js`
- `backend/models/SpeechSessionRecording.js`
- `backend/models/BeneficiaryVoiceLog.js`
- `backend/models/nphies/InsuranceClaim.js`
- `backend/models/phase37.model.js`
- `backend/__tests__/clinical-session-ref-drift-wave1424.test.js` (new guard)
- `backend/sprint-tests.txt`
- `.github/workflows/sprint-tests.yml`
- `.kimi/tasks/repair-all-defects.js`

**Guard:** `__tests__/clinical-session-ref-drift-wave1424.test.js` scans `backend/models/` and fails on any `ref: 'Session'` outside the auth Session model.

---

## Synthesis — Repair-All-Defects run summary

### Burn-down

| Severity  | Discovered | Fixed | Owner-gated | Remaining |
| --------- | ---------: | ----: | ----------: | --------: |
| P0        |          2 |     0 |           2 |         0 |
| —         | —          | —     | —           | —         |
| P1        |          3 |     2 |           0 |         1 |
| P2        |          5 |     3 |           1 |         1 |
| **Total** |     **10** | **5** |       **3** |     **2** |

### Confirmed fixes (red-before-green proven)

| ID                 | Wave  | Branch                                               | Root cause                                                                                                                     | Guard                                                   |
| ------------------ | ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| P1-3 / P2-2 / P2-3 | W1423 | `feat/w1406-preflight-followup` (commit `7f7534187`) | New DDD event-contract domain groups + prefixes added without updating W374 drift guard; duplicate `plan.completed` eventType. | `__tests__/ddd-event-contracts-wave374.test.js`         |
| P1-1 / P2-5        | W1424 | `feat/w1406-preflight-followup` (commit `176bdbda0`) | Clinical/insurance models referenced auth `Session` model; task script referenced non-existent npm script.                     | `__tests__/clinical-session-ref-drift-wave1424.test.js` |
| Env blocker        | W1425 | `feat/w1406-preflight-followup` (commit `780e3fde9`) | `jest.globalSetup.js` passed `--nojournal` to MongoMemoryServer; MongoDB 8.2.6 exits code 2 on that flag, blocking all integration tests. | `npm run test:sprint` now launches (977 suites)           |

### Rejected / at-risk / remaining

| ID   | Severity | Reason                                                                                                                      | Next action                                                                                                         |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P0-1 | P0       | Production MongoDB `advancedtickets.find()` buffering timeouts — needs prod DB/index/connection-pool investigation.         | Owner handoff: DevOps/DBA — check `MONGODB_URI` pool size, slow-query log, indexes on `advancedtickets`.            |
| P0-2 | P0       | Production MongoDB `nphiesclaims.find()` buffering timeouts — same operational class.                                       | Owner handoff: DevOps/DBA — check indexes/pool on `nphiesclaims`.                                                   |
| P1-2 | P1       | `IndividualEducationPlan` + `SmartIEP` dual models — architectural consolidation required.                                  | ADR needed; do NOT merge without stakeholder sign-off. Risk: breaking existing `/iep` and `/smart-iep` routes.      |
| P2-1 | P2       | Multiple session-like models (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, etc.) — fragmentation. | ADR candidate: define canonical clinical-session model and deprecate duplicates. Out of scope for this run.         |
| P2-4 | P2       | `[llm-anomaly-history] save failed:` in production logs — likely symptom of P0-1/P0-2 DB timeouts.                          | Owner handoff: after P0 DB fix, re-check `error1.log`; if persists, inspect `LlmAnomalySnapshot` validation/schema. |

### Whole-system residual (completeness critic)

1. **MongoDB buffering timeouts** are the only live production defect class; they block a green production posture.
2. **MongoMemoryServer environment blocker FIXED** in W1425; `test:sprint` now launches 977 suites. Full suite run exceeded 20 min in this environment before finishing; partial run showed zero failures in sampled suites.
3. **Primary journey smoke test** still pending a full sprint run in an environment with adequate time/resources.
4. **web-admin** surface (`alawael-rehab-platform/apps/web-admin`) was unreachable — repo not present locally.
5. **IEP and session-model fragmentation** are unfixed architectural debt; they need ADRs before code consolidation.

### Owner handoff

- **DevOps/DBA / repo owner**: P0-1, P0-2, P2-4 (production MongoDB timeouts + LLM save failure).
- **Clinical architect / product owner**: P1-2, P2-1 (IEP and session-model consolidation ADRs).

### Integration plan

1. Merge order: already sequential on `feat/w1406-preflight-followup`:
   - `7f7534187` fix(events): W1423
   - `176bdbda0` fix(models): W1424
   - `e08938728` docs(repair): W1424
   - `780e3fde9` fix(test): W1425
2. Before push, run the 7 pre-push gates (already green locally).
3. After push/merge, run full `test:sprint` in an environment where MongoMemoryServer starts cleanly.
4. Do NOT deploy until P0 production DB timeouts are resolved.

### ADRs to write

1. **ADR-XXX — Event-contract prefix/governance**: formalize that new `dddEventContracts.js` domain groups and eventType prefixes must update `__tests__/ddd-event-contracts-wave374.test.js` in the same PR.
2. **ADR-YYY — Canonical clinical session model**: choose between `ClinicalSession` (write model) and `TherapySession` (read model), and define a migration/deprecation plan for `DisabilitySession`, `RehabSession`, `ProgramSession`, etc.
3. **ADR-ZZZ — IEP/IFSP consolidation**: decide whether to merge `IndividualEducationPlan` and `SmartIEP` or explicitly keep both with documented boundaries.
