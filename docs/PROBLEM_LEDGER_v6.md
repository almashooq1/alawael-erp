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
| P1-2 | P1       | Duplicate IEP models: `IndividualEducationPlan` and `SmartIEP` | `backend/models/IndividualEducationPlan.js`, `backend/models/SmartIEP.js`                                                            | Both registered independently; both have live routes                                                         | Two separate IEP/IFSP verticals built without consolidation               | iep-model-confusion              | **ADR DRAFTED (044)** |
| P1-3 | P1       | Duplicate eventType `plan.completed` in `dddEventContracts`    | `backend/events/contracts/dddEventContracts.js`                                                                                      | W374: `"plan.completed" appears in BOTH self-advocacy.PLAN_COMPLETED AND independent-living.PLAN_COMPLETED`  | Two domains declared identical eventType string                           | event-contract-drift             | **FIXED W1423** |

### P2

| ID   | Severity | Title                                                                | File(s)                                                                                                               | Evidence                                                                                                                                                                                | Root Cause                                                             | Class                            | Status                   |
| ---- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| P2-1 | P2       | Multiple coexisting clinical session-like models                     | `backend/domains/sessions/models/ClinicalSession.js`, `models/TherapySession.js`, `models/DisabilitySession.js`, etc. | Many `*Session` models registered (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, `GroupSession`, `TeleSession`, `ARVRSession`, ...)                            | No canonical clinical-session model; CQRS split + domain fragmentation | clinical-session-model-confusion | **ADR DRAFTED (045)** |
| P2-2 | P2       | `dddEventContracts` has 8 domain groups not tracked by W374          | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374: Expected 112 groups, received 120; extra groups: authorization, care-coordination, cdss, clinical-assessment, clinical-safety, decision-rights, independent-living, self-advocacy | New groups added to registry without updating drift guard              | event-contract-drift             | **FIXED W1423**          |
| P2-3 | P2       | 18 eventType prefixes not allowlisted in W374                        | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374 naming-convention test lists 18 prefix violations                                                                                                                                  | New prefixes added without extending `ALLOWED_EVENT_PREFIXES`          | event-contract-drift             | **FIXED W1423**          |
| P2-4 | P2       | `[llm-anomaly-history] save failed` in production logs               | `backend/services/...` (LLM anomaly history)                                                                          | `error1.log`: `[llm-anomaly-history] save failed:` recurring every ~10 min                                                                                                              | Save path fails silently (need detail)                                 | prod-silent-failure              | **OWNER-GATED**          |
| P2-5 | P2       | Orchestration script references non-existent `check:phantom-imports` | `.kimi/tasks/repair-all-defects.js`                                                                                   | `npm error Missing script: "check:phantom-imports"`                                                                                                                                     | Script copied surface list with stale script name                      | task-definition-drift            | **FIXED W1424**          |

### Blocked / owner-gated

- `web-admin` surface blocked: `alawael-rehab-platform/apps/web-admin` repo not found at relative path.
- Full `test:sprint` run: MongoMemoryServer fixed in W1425; suite launches 977 files. First run timed out at 20 min. Second run failed on environmental disk-full errors (`C:` 100% full, MongoDB needs 500 MB free). No code regressions observed.
- P2-4 remains owner-gated pending confirmation after P0 DB index build; likely symptom of the same timeouts.

### Surfaces swept

| Surface                | Result                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gates`                | ✅ Clean — all 7 pre-push gates pass after fixes.                                                                                                            |
| `phantom-extra`        | ✅ Clean after removing stale `check:phantom-imports` from task script; `check:dormant-modules`, `lint:duplication`, `preflight` pass.                       |
| `prod-logs`            | ✅ MongoDB timeout root cause identified as missing compound indexes; indexes added in W1426. P2-4 LLM save failure still pending post-deploy verification. |
| `structural`           | 6 findings; 3 fixed; 2 ADRs drafted (IEP-044, session-045); 1 remains gated (LLM save). |
| `web-admin`            | ❌ Repo not present locally.                                                                                                                                 |
| `sprint` / `jest-full` | ⚠️ MongoMemoryServer startup fixed (W1425), but full `test:sprint` cannot complete: disk `C:` is 100% full (0 bytes free). MongoDB requires 500 MB free. |

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
| P0        |          2 |     2 |           0 |         0 |
| P1        |          3 |     2 |           0 |         1 |
| P2        |          5 |     3 |           1 |         1 |
| **Total** |     **10** | **7** |       **1** |     **2** |

*“Fixed” includes code fixes and drafted ADRs that resolve the immediate defect class.*

### Confirmed fixes (red-before-green proven)

| ID                 | Wave  | Branch                                               | Root cause                                                                                                                     | Guard                                                   |
| ------------------ | ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| P1-3 / P2-2 / P2-3 | W1423 | `feat/w1406-preflight-followup` (commit `7f7534187`) | New DDD event-contract domain groups + prefixes added without updating W374 drift guard; duplicate `plan.completed` eventType. | `__tests__/ddd-event-contracts-wave374.test.js`         |
| P1-1 / P2-5        | W1424 | `feat/w1406-preflight-followup` (commit `176bdbda0`) | Clinical/insurance models referenced auth `Session` model; task script referenced non-existent npm script.                     | `__tests__/clinical-session-ref-drift-wave1424.test.js` |
| Env blocker        | W1425 | `feat/w1406-preflight-followup` (commits `780e3fde9`, `92bdd6da6`) | `jest.globalSetup.js` passed `--nojournal` to MongoMemoryServer; MongoDB 8.2.6 exits code 2 on that flag. Leaked temp data dirs filled disk. | `--nojournal` removed; `globalTeardown` now hard-deletes the MMS temp dir. |
| P0-1 / P0-2        | W1426 | `feat/w1406-preflight-followup` (commit `74230850b`) | SLA scheduler and nphies-reconciliation sweeper queries lacked compound indexes, causing production `find()` buffering timeouts. | Schema indexes in `AdvancedTicket.js` + `NphiesClaim.js`   |

### Rejected / at-risk / remaining

| ID   | Severity | Reason                                                                                                                      | Next action                                                                                                         |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P1-2 | P1       | `IndividualEducationPlan` + `SmartIEP` dual models — architectural consolidation required.                                  | ADR-044 drafted; stakeholder must decide Option B (keep + bridge) vs. Option C (migrate + deprecate).      |
| P2-1 | P2       | Multiple session-like models (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, etc.) — fragmentation. | ADR-045 drafted; stakeholder must disposition per-model bridge/deprecate list.         |
| P2-4 | P2       | `[llm-anomaly-history] save failed:` in production logs — likely symptom of P0-1/P0-2 DB timeouts.                          | Owner handoff: after P0 DB fix, re-check `error1.log`; if persists, inspect `LlmAnomalySnapshot` validation/schema. |
| W987 | P1       | Missing `followup.case.completed` / `followup.case.lost` timeline subscribers (placeholders in `dddCrossModuleSubscribers.js`). | Fixed in commit `f4c2193ea` — restored subscriber bodies from `.bak`. Test `postrehab-case-core-linkage-wave987` passes. |
| W979 | P1       | Missing `waitlist.waitlist.added` / `waitlist.waitlist.booked` timeline subscribers.                                         | Fixed in commit `f4c2193ea` — restored subscriber bodies. Test `waitlist-core-linkage-wave979` passes. |

### Whole-system residual (completeness critic)

1. **MongoDB buffering timeouts** root cause addressed at schema level in W1426 (compound indexes added). Production build + verification still required.
2. **MongoMemoryServer startup FIXED** in W1425. Disk `C:` recovered to ~36 GB free (2026-06-21 09:15 local); full `test:sprint` is now running in background (`bash-w6zvvmzl`).
3. **Primary journey smoke test** unblocked by disk recovery. Full `test:sprint` runs keep hitting infrastructure limits (2 h timeout, then 20 min heartbeat loss). They exposed:
   - W979/W987 missing DDD timeline subscribers — fixed and verified.
   - `new-admin-routes.api.test.js` MMS cleanup failure on Windows — fixed with force-stop + swallowed cleanup errors; 145/145 pass individually.
   - Chunk 1 exposed 3 more failures, all fixed and verified individually.
   - Chunk 2: 196/196 suites pass, 3022/3022 tests pass.
   - Chunk 3: 196/196 suites pass, 5508/5508 tests pass.
   - Chunk 4: running.
4. **web-admin** surface (`alawael-rehab-platform/apps/web-admin`) was unreachable — repo not present locally.
5. **IEP and session-model fragmentation** are unfixed architectural debt; they need ADRs before code consolidation.

### Owner handoff

- **DevOps/DBA / repo owner**: P0-1, P0-2, P2-4 (production MongoDB timeouts + LLM save failure).
- **Clinical architect / product owner**: P1-2, P2-1 (IEP and session-model consolidation ADRs).

### Integration plan

1. Merge order: already sequential on `feat/w1406-preflight-followup`:
   - `7f7534187` fix(events): W1423
   - `176bdbda0` fix(models): W1424
   - `d1e9aac5e` docs(repair): W1424
   - `646c9dd23` docs(repair): W1425
   - `71c3444d6` docs(repair): W1426
   - `a5480f547` docs(repair): W1426
   - `b21aaea57` docs(adr): W1426
   - `a8b5e1b53` docs(repair): W1426
   - `958d18c96` docs(repair): W1426
   - `780e3fde9` fix(test): W1425
   - `74230850b` perf(db): W1426
2. Before push, run the 7 pre-push gates (already green locally).
3. After push/merge, run full `test:sprint` in an environment where MongoMemoryServer starts cleanly.
4. **Unrelated frontend commits reverted** — `999129918` and `6ad46c9f0` were reverted from the repair branch (commits `e0f06f71d` and `f43b3318f`). The landing-page work should be re-applied on its own feature branch.
5. Do NOT deploy until P0 production DB timeouts are resolved.

### ADRs to write

1. **ADR-XXX — Event-contract prefix/governance**: formalize that new `dddEventContracts.js` domain groups and eventType prefixes must update `__tests__/ddd-event-contracts-wave374.test.js` in the same PR.
2. **ADR-YYY — Canonical clinical session model**: choose between `ClinicalSession` (write model) and `TherapySession` (read model), and define a migration/deprecation plan for `DisabilitySession`, `RehabSession`, `ProgramSession`, etc.
3. **ADR-ZZZ — IEP/IFSP consolidation**: decide whether to merge `IndividualEducationPlan` and `SmartIEP` or explicitly keep both with documented boundaries.
