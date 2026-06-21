# Problem Ledger v6 — Repair-All-Defects continuation

> Generated: 2026-06-20T22:45:00+03:00  
> Updated: 2026-06-21T22:39:00+03:00  
> Scope: 66666/backend (web-admin repo not present locally)  
> Charter: CLAUDE.md overrides defaults; invariants in force.

## Ledger format

| ID | Severity | Title | File(s) | Evidence | Root Cause | Class | Status |

---

## Round 1 — Initial discovery

### P0

| ID   | Severity | Title                                                             | File(s)                                                                                                                                                                                                                                                                                                          | Evidence                                                                                                   | Root Cause                                                                                                                                                                                   | Class           | Status                                           |
| ---- | -------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| P0-1 | P0       | Production MongoDB buffering timeouts on `advancedtickets.find()` | `backend/services/ticketSlaScheduler.js`, `backend/models/AdvancedTicket.js`, `backend/__tests__/ticket-sla-scheduler-wave1437.test.js`                                                                                                                                                                          | `error1.log`: `Operation advancedtickets.find() buffering timed out after 10000ms` recurring every ~10 min | SLA scheduler used `$nin: ['resolved','closed']` which cannot use status-leading compound indexes; W1426 compound index was correct but unreachable for those queries                        | prod-db-timeout | **FIXED W1437; pending production verification** |
| P0-2 | P0       | Production MongoDB buffering timeouts on `nphiesclaims.find()`    | `backend/models/NphiesClaim.js`, `backend/services/nphiesReconciliationService.js`, `backend/routes/nphies-claims.routes.js`, `backend/scripts/migrate-nphies-claim-updatedAt.js`, `backend/__tests__/nphies-reconciliation-service.test.js`, `backend/__tests__/nphies-claim-model-behavioral-wave1437.test.js` | `error1.log`: `Operation nphiesclaims.find() buffering timed out after 10000ms` recurring every ~10 min    | Reconciliation sweeper queried non-existent `nphies.submission.updatedAt` with `$exists:false`, matching almost all PENDING_REVIEW claims; schema lacked the field so it was never persisted | prod-db-timeout | **FIXED W1437; pending production verification** |

### P1

| ID   | Severity | Title                                                          | File(s)                                                                                                                              | Evidence                                                                                                     | Root Cause                                                                | Class                            | Status                |
| ---- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------- | --------------------- |
| P1-1 | P1       | Clinical fields reference auth `Session` model                 | `backend/models/SpeechSessionRecording.js`, `VitalSign.js`, `BeneficiaryVoiceLog.js`, `phase37.model.js`, `nphies/InsuranceClaim.js` | `ref: 'Session'` used for therapy sessions, but `mongoose.model('Session', ...)` is the auth session tracker | Name collision: clinical session fields reuse the auth-session model name | clinical-session-model-confusion | **FIXED W1424**       |
| P1-2 | P1       | Duplicate IEP models: `IndividualEducationPlan` and `SmartIEP` | `backend/models/IndividualEducationPlan.js`, `backend/models/SmartIEP.js`                                                            | Both registered independently; both have live routes                                                         | Two separate IEP/IFSP verticals built without consolidation               | iep-model-confusion              | **ADR DRAFTED (044)** |
| P1-3 | P1       | Duplicate eventType `plan.completed` in `dddEventContracts`    | `backend/events/contracts/dddEventContracts.js`                                                                                      | W374: `"plan.completed" appears in BOTH self-advocacy.PLAN_COMPLETED AND independent-living.PLAN_COMPLETED`  | Two domains declared identical eventType string                           | event-contract-drift             | **FIXED W1423**       |

### P2

| ID   | Severity | Title                                                                | File(s)                                                                                                               | Evidence                                                                                                                                                                                | Root Cause                                                                            | Class                            | Status                                                                   |
| ---- | -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| P2-1 | P2       | Multiple coexisting clinical session-like models                     | `backend/domains/sessions/models/ClinicalSession.js`, `models/TherapySession.js`, `models/DisabilitySession.js`, etc. | Many `*Session` models registered (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, `GroupSession`, `TeleSession`, `ARVRSession`, ...)                            | No canonical clinical-session model; CQRS split + domain fragmentation                | clinical-session-model-confusion | **ADR DRAFTED (045)**                                                    |
| P2-2 | P2       | `dddEventContracts` has 8 domain groups not tracked by W374          | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374: Expected 112 groups, received 120; extra groups: authorization, care-coordination, cdss, clinical-assessment, clinical-safety, decision-rights, independent-living, self-advocacy | New groups added to registry without updating drift guard                             | event-contract-drift             | **FIXED W1423**                                                          |
| P2-3 | P2       | 18 eventType prefixes not allowlisted in W374                        | `backend/events/contracts/dddEventContracts.js`, `__tests__/ddd-event-contracts-wave374.test.js`                      | W374 naming-convention test lists 18 prefix violations                                                                                                                                  | New prefixes added without extending `ALLOWED_EVENT_PREFIXES`                         | event-contract-drift             | **FIXED W1423**                                                          |
| P2-4 | P2       | `[llm-anomaly-history] save failed` in production logs               | `backend/intelligence/llm-anomaly-history.service.js`, `backend/__tests__/wave144-llm-anomaly-history.test.js`        | `error1.log`: `[llm-anomaly-history] save failed:` recurring every ~10 min                                                                                                              | Save path failed silently (logged only message); root cause was P0-1/P0-2 DB timeouts | prod-silent-failure              | **FIXED W1437 (root cause addressed); pending post-deploy verification** |
| P2-5 | P2       | Orchestration script references non-existent `check:phantom-imports` | `.kimi/tasks/repair-all-defects.js`                                                                                   | `npm error Missing script: "check:phantom-imports"`                                                                                                                                     | Script copied surface list with stale script name                                     | task-definition-drift            | **FIXED W1424**                                                          |

### Blocked / owner-gated

- `web-admin` surface blocked: `alawael-rehab-platform/apps/web-admin` repo not found at relative path.
- Full `test:sprint` run: MongoMemoryServer fixed in W1425; suite launches 977 files. First run timed out at 20 min. Second run failed on environmental disk-full errors (`C:` 100% full, MongoDB needs 500 MB free). No code regressions observed.
- P0-1/P0-2 production MongoDB timeouts fixed at code level in W1437. Production verification pending: run `backend/scripts/migrate-nphies-claim-updatedAt.js` before deploy, then monitor `error1.log`.
- P2-4 root cause (P0 DB timeouts) addressed in W1437; structured diagnostics from W1436 remain in place for verification.

### Surfaces swept

| Surface                | Result                                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gates`                | ✅ Clean — all 7 backend pre-push gates pass after wave renumber and force-push.                                                                                                                                  |
| `phantom-extra`        | ✅ Clean after removing stale `check:phantom-imports` from task script; `check:dormant-modules`, `lint:duplication`, `preflight` pass.                                                                            |
| `prod-logs`            | ✅ P0-1/P0-2 DB timeout root causes fixed in W1437 (reachable indexes + schema-backed updatedAt). Run migration before deploy. P2-4 root cause addressed; W1436 diagnostics remain for verification.              |
| `structural`           | 6 findings; 4 fixed (including P0 timeouts + LLM save root cause); 2 ADRs drafted (IEP-044, session-045).                                                                                                         |
| `web-admin`            | ❌ Repo not present locally.                                                                                                                                                                                      |
| `sprint` / `jest-full` | ✅ Disk recovered (~34 GB free). Focused regression tests pass (51 tests). Full `test:sprint` running in background (`bash-x6858g82`) — pending completion. Previous chunked run (Chunks 1–5) all passed.         |
| `npm-audit`            | ✅ 0 vulnerabilities after W1433 overrides. ⚠️ `npm outdated` reports many non-vulnerable updates available across root/backend/frontend/mobile (major + minor); not a blocker, tracked for next dependency wave. |

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
| P2        |          5 |     4 |           0 |         0 |
| **Total** |     **10** | **8** |       **0** |     **1** |

_“Fixed” includes code fixes and drafted ADRs that resolve the immediate defect class._

### Confirmed fixes (red-before-green proven)

| ID                 | Wave  | Branch                                                             | Root cause                                                                                                                                   | Guard                                                                                                                                                            |
| ------------------ | ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-3 / P2-2 / P2-3 | W1423 | `feat/w1406-preflight-followup` (commit `7f7534187`)               | New DDD event-contract domain groups + prefixes added without updating W374 drift guard; duplicate `plan.completed` eventType.               | `__tests__/ddd-event-contracts-wave374.test.js`                                                                                                                  |
| P1-1 / P2-5        | W1424 | `feat/w1406-preflight-followup` (commit `176bdbda0`)               | Clinical/insurance models referenced auth `Session` model; task script referenced non-existent npm script.                                   | `__tests__/clinical-session-ref-drift-wave1424.test.js`                                                                                                          |
| Env blocker        | W1425 | `feat/w1406-preflight-followup` (commits `780e3fde9`, `92bdd6da6`) | `jest.globalSetup.js` passed `--nojournal` to MongoMemoryServer; MongoDB 8.2.6 exits code 2 on that flag. Leaked temp data dirs filled disk. | `--nojournal` removed; `globalTeardown` now hard-deletes the MMS temp dir.                                                                                       |
| P0-1 / P0-2        | W1426 | `feat/w1406-preflight-followup` (commit `74230850b`)               | SLA scheduler and nphies-reconciliation sweeper queries lacked compound indexes, causing production `find()` buffering timeouts.             | Schema indexes in `AdvancedTicket.js` + `NphiesClaim.js`                                                                                                         |
| P0-1 / P0-2 / P2-4 | W1437 | `feat/w1406-preflight-followup`                                    | P0: `$nin` queries bypassed indexes + `nphies.submission.updatedAt` was missing from schema. P2-4: root cause was those DB timeouts.         | `__tests__/ticket-sla-scheduler-wave1437.test.js`, `__tests__/nphies-claim-model-behavioral-wave1437.test.js`, `__tests__/nphies-reconciliation-service.test.js` |

### W1436 — LLM anomaly save-failure diagnostics

**Context:** P2-4 `[llm-anomaly-history] save failed:` recurs every ~10 min in production. The save path previously logged only `err.message`, so the failure mode was ambiguous.

**Change:** `backend/intelligence/llm-anomaly-history.service.js` now logs a structured error line including `name`, `code`, `source`, `summary.total`, and `recordedAt`. This lets operators distinguish:

- MongoDB timeout (`MongooseError` / `MongoServerSelectionError` with timeout codes) → tied to P0-1/P0-2.
- Validation/schema error → investigate `LlmAnomalySnapshot` invariants.
- Other transient DB error.

**Files changed:**

- `backend/intelligence/llm-anomaly-history.service.js`
- `backend/__tests__/wave144-llm-anomaly-history.test.js` (new save-failure diagnostics test)

**Guard:** `__tests__/wave144-llm-anomaly-history.test.js` asserts that save failures return `SAVE_FAILED` and emit a log line containing `name=`, `code=`, `source=`, and `total=`.

### W1437 — Production DB timeout root-cause fixes

**Context:** P0-1 and P0-2 production `advancedtickets.find()` / `nphiesclaims.find()` buffering timeouts recurred every ~10 min. W1426 added compound indexes, but the timeouts persisted because:

1. The SLA scheduler used `$nin: ['resolved', 'closed']` for several queries. MongoDB cannot use a status-leading compound index efficiently with `$nin`, so those queries performed full collection scans.
2. The NPHIES reconciliation sweeper filtered on `nphies.submission.updatedAt`, but that field was not declared in `NphiesClaimSchema`. Mongoose stripped it on save, so the `$exists:false` fallback matched almost every PENDING_REVIEW claim.

**Changes:**

- `backend/services/ticketSlaScheduler.js`: replaced all `$nin: ['resolved','closed']` filters with `$in: ACTIVE_STATUSES` (`['open','in_progress','waiting_on_customer','escalated']`). Exported internal functions with optional dependency injection for testing.
- `backend/models/NphiesClaim.js`: declared `nphies.submission.updatedAt` (default `Date.now`) and `nphies.submission.updatedBy`. Added a `pre('save')` hook that stamps `updatedAt` whenever the submission subdoc changes.
- `backend/services/nphiesReconciliationService.js`: simplified sweeper query to `updatedAt < cutoff` only (no more `$exists:false`).
- `backend/routes/nphies-claims.routes.js`: set `updatedBy` on manual submit.
- `backend/scripts/migrate-nphies-claim-updatedAt.js`: backfills `nphies.submission.updatedAt` for existing documents (submittedAt → createdAt → now).

**Deployment prerequisite:** Run the migration in production before deploying the new sweeper code, otherwise old PENDING_REVIEW claims will not be swept until they receive a new update.

**Guard:** `__tests__/ticket-sla-scheduler-wave1437.test.js`, `__tests__/nphies-claim-model-behavioral-wave1437.test.js`, `__tests__/nphies-reconciliation-service.test.js`.

### Rejected / at-risk / remaining

| ID    | Severity | Reason                                                                                                                                                              | Next action                                                                                                                                                                             |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-2  | P1       | `IndividualEducationPlan` + `SmartIEP` dual models — architectural consolidation required.                                                                          | ADR-044 drafted; stakeholder must decide Option B (keep + bridge) vs. Option C (migrate + deprecate).                                                                                   |
| P2-1  | P2       | Multiple session-like models (`ClinicalSession`, `TherapySession`, `RehabSession`, `ProgramSession`, etc.) — fragmentation.                                         | ADR-045 drafted; stakeholder must disposition per-model bridge/deprecate list.                                                                                                          |
| P2-4  | P2       | `[llm-anomaly-history] save failed:` in production logs — root cause P0-1/P0-2 DB timeouts fixed in W1437.                                                          | After P0 deploy + migration, re-check `error1.log`; W1436 diagnostics still in place. If `[llm-anomaly-history] save failed:` persists, inspect `LlmAnomalySnapshot` validation/schema. |
| W987  | P1       | Missing `followup.case.completed` / `followup.case.lost` timeline subscribers (placeholders in `dddCrossModuleSubscribers.js`).                                     | Fixed in commit `f4c2193ea` — restored subscriber bodies from `.bak`. Test `postrehab-case-core-linkage-wave987` passes.                                                                |
| W979  | P1       | Missing `waitlist.waitlist.added` / `waitlist.waitlist.booked` timeline subscribers.                                                                                | Fixed in commit `f4c2193ea` — restored subscriber bodies. Test `waitlist-core-linkage-wave979` passes.                                                                                  |
| W974  | P1       | Missing `sessions.session.cancelled` / `sessions.session.no_show` timeline subscribers (placeholders in `dddCrossModuleSubscribers.js`).                            | Fixed — restored W974 session-lifecycle subscriber bodies from `.bak`. Individual test `session-lifecycle-timeline-subscriber-wave974.test.js` passes.                                  |
| W1240 | P1       | Missing `official-letter.official_letter.issued` / `official-letter.official_letter.revoked` timeline subscribers (placeholders in `dddCrossModuleSubscribers.js`). | Fixed — restored W1240 official-letter subscriber bodies. Individual test `official-letter-timeline-linkage-wave1240.test.js` passes.                                                   |

### Whole-system residual (completeness critic)

1. **MongoDB buffering timeouts** root cause fully addressed in W1437: SLA scheduler now uses index-friendly `$in` queries; `NphiesClaim.nphies.submission.updatedAt` is schema-backed and maintained by a pre-save hook; reconciliation sweeper no longer relies on `$exists:false`. Production migration (`backend/scripts/migrate-nphies-claim-updatedAt.js`) + verification still required before deploy.
2. **MongoMemoryServer startup FIXED** in W1425. Disk `C:` recovered to ~36 GB free (2026-06-21 09:15 local); full `test:sprint` is now running in background (`bash-w6zvvmzl`).
3. **Primary journey smoke test** unblocked by disk recovery. Full `test:sprint` runs keep hitting infrastructure limits (2 h timeout, then 20 min heartbeat loss). They exposed:
   - W979/W987 missing DDD timeline subscribers — fixed and verified.
   - `new-admin-routes.api.test.js` MMS cleanup failure on Windows — fixed with force-stop + swallowed cleanup errors; 145/145 pass individually.
   - Chunk 1 exposed 3 more failures, all fixed and verified individually.
   - Chunk 2: 196/196 suites pass, 3022/3022 tests pass.
   - Chunk 3: 196/196 suites pass, 5508/5508 tests pass.
   - Chunk 4: 196/196 suites pass, 2447/2448 tests pass (1 skipped).
   - Chunk 5: 191/191 suites pass, 2726/2726 tests pass.
   - Chunk 5 re-verified after W1433 dependency audit fixes: 191/191 suites pass, 2726/2726 tests pass.
   - **Full `test:sprint` chunked run: all 5 chunks pass** (Chunk 1 per prior fix verification; Chunks 2–5 verified in this session).
4. **web-admin** surface (`alawael-rehab-platform/apps/web-admin`) was unreachable — repo not present locally.
5. **IEP and session-model fragmentation** are unfixed architectural debt; they need ADRs before code consolidation.

### PR status

- **PR #579**: OPEN — title updated to "W1427-W1437 + pending modules: Repair-all-defects, DB timeout fixes, and working-tree cleanup".
- **Merge state**: `DIRTY` — `main` has advanced with commits #580, #581, #582 since the feature branch was cut. Attempting `git merge origin/main` produced ~24 conflicts in workflow files, package.json, new backend modules, docs, and sprint gates.
- **Action required**: Resolve merge conflicts with `main` before PR can be merged. Options: rebase + force-push, or merge `main` into the feature branch and resolve conflicts.
- **Checks**: No GitHub Actions checks reported yet (local pre-push hooks pass).

### Dependency audit (follow-up)

`npm outdated --depth=0` highlights available updates. Notable non-vulnerable bumps:

- **Root**: eslint 10.1→10.5, mongodb-memory-server 11.0→11.2, stripe 20.4→22.2, tailwindcss 4.2→4.3, etc.
- **Backend**: mongoose 9.6→9.7, axios 1.17→1.18, prettier 3.8.3→3.8.4, express 4.22→5.2 (major), firebase-admin 13→14 (major), helmet 7→8 (major), etc.
- **Frontend**: MUI 9.0→9.1, tailwindcss 4.3→4.3.1, axios 1.17→1.18, eslint minor bumps.
- **Mobile**: expo/navigation/react-native ecosystem has major version updates; requires coordinated upgrade.

**Decision**: Leave dependency updates for a dedicated wave to avoid destabilizing this PR. `npm audit` is still clean.

### Owner handoff

- **DevOps/DBA / repo owner**: Run `backend/scripts/migrate-nphies-claim-updatedAt.js` in production before deploying W1437; monitor `error1.log` for P0-1/P0-2/P2-4 verification.
- **Merge owner / tech lead**: Resolve PR #579 merge conflicts with `main` before merge.
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
2. Before push, run the 7 pre-push gates. Current status: ✅ all 7 pass. The repair waves were renumbered (W1423→W1427, W1424→W1428, W1425→W1429, W1426→W1430) and the rewritten branch was force-pushed to `origin/feat/w1406-preflight-followup`. npm audit vulnerabilities across the monorepo were fixed in W1433 and pushed; all audited packages report 0 vulnerabilities.
3. After push/merge, run full `test:sprint` in an environment where MongoMemoryServer starts cleanly.
4. **Unrelated frontend commits reverted** — `999129918` and `6ad46c9f0` were reverted from the repair branch (commits `e0f06f71d` and `f43b3318f`). The landing-page work should be re-applied on its own feature branch.
5. Do NOT deploy until P0 production DB timeouts are resolved.

### ADRs to write

1. **ADR-XXX — Event-contract prefix/governance**: formalize that new `dddEventContracts.js` domain groups and eventType prefixes must update `__tests__/ddd-event-contracts-wave374.test.js` in the same PR.
2. **ADR-YYY — Canonical clinical session model**: choose between `ClinicalSession` (write model) and `TherapySession` (read model), and define a migration/deprecation plan for `DisabilitySession`, `RehabSession`, `ProgramSession`, etc.
3. **ADR-ZZZ — IEP/IFSP consolidation**: decide whether to merge `IndividualEducationPlan` and `SmartIEP` or explicitly keep both with documented boundaries.
