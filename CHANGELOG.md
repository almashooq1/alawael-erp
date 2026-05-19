# CHANGELOG

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> Earlier entries (v4.0.0 → v4.0.113) are preserved in git history. The
> file was inadvertently truncated by a prettier hook during the v4.0.113
> deploy session and rebuilt fresh from this version onward.

---

## [Unreleased] — 2026-05-19 — Test-infra hygiene + audit hooks activated

Multi-thread test-infrastructure session. Headline numbers:

- **561 silent test failures** rescued — 11 wave-intelligence test
  files (415 tests) + 5 care-plan wave files (146 tests) were all
  failing with "X is not a constructor" because they were missing
  `jest.unmock('mongoose')` but no one knew, because `test:sprint`
  runs an explicit file enumeration that didn't include them.
- **3 silent frontend failures** rescued — `kpiDashboard.service.js`
  had a UTF-8 BOM that broke the auto-generated meta-test's
  `^import` regex; `utils/dateUtils.getDayRange` was missing entirely
  but the test still imported it. Frontend now 11,094 / 11,094.
- **36 UTF-8 BOM-prefixed source files** purged + permanent guard
  test added (`__tests__/no-utf8-bom.test.js`).
- **5 dead integration stubs** deleted (~190 LOC) — Nafath / Yakeen /
  Wasel / Absher index.js files threw "not implemented (P1)" but
  were superseded by real services elsewhere; one even broke the
  scaffold smoke test it was meant to satisfy.
- **2 optional services activated** — `services/auditLog.service.js`
  - `services/anchorLedger.service.js` shipped as minimal-forwarder
    implementations. App.js try/catch hooks that previously degraded
    to null now emit structured `audit:` / `anchor:` log lines for
    5 callers (mfa challenge, access-review attestation, care-plan
    bootstrap, lifecycle high-sensitivity, access-review cosigner).
- **`test:sprint` expanded 87 → 103 files** and a new drift guard
  (`wave-tests-in-sprint.test.js`) catches future `*-waveNN.test.js`
  files that call `jest.unmock('mongoose')` but aren't enumerated.
- **CI gate gap closed** — frontend tests were only running on PR
  (`pr-checks.yml::frontend-tests`); ci.yml's push job did lint +
  build only. Added a mirror `frontend-tests` job to ci.yml so direct
  pushes to main/develop/feature branches also gate on the full
  ~11K-test suite.

### Architecture

The recurring pattern across all 6 threads was **silent test exclusion**:
infrastructure existed (mocks, guards, route mounts) but specific files
or call sites slipped through the seams. The fix template per thread:

1. **Discover the gap** by running a broader scope than CI does (full
   backend suite, all wave-\* files, all source-file extensions).
2. **Verify the root cause empirically** — never trust the existing
   skip comment; e.g. the eStamp test's "safeMount fails silently"
   comment was wrong (safeMount logs at `error` level — the real
   blocker was 503 from mocked-Mongoose queries).
3. **Fix the surface gap** plus **add a drift guard** that catches
   the same class of failure when it next tries to recur.

Three new drift guards: `no-utf8-bom`, `no-broken-requires` per-
(file, target) allow-list, and `wave-tests-in-sprint` (scoped to files
that `jest.unmock('mongoose')` — wave files passing under the global
mock are intentionally not gated to keep sprint runtime contained).

### Added

- **`services/auditLog.service.js`** + 6 unit tests — minimal log-forwarder
  with stable shape: `{action, actorUserId, actorRole, entityType,
entityId, resource, ipAddress, metadata}`. NOT DB-backed (the
  existing AuditLog Mongoose model has a fixed eventType enum that
  doesn't fit the freeform action strings 13+ callers pass). P1 to
  swap to DB persistence after schema discussion.
- **`services/anchorLedger.service.js`** + 9 unit tests — minimal
  no-op forwarder that returns `{txId: null, anchored: false, …}`.
  **Critical invariant test**: txId must always be null until a real
  blockchain client is wired (a forged sha256 would silently masquerade
  as an on-chain reference — audit/compliance hazard).
- **`backend/__tests__/no-utf8-bom.test.js`** — walks the backend tree
  and fails CI with a precise file list if any `.js/.cjs/.mjs/.ts/.tsx/.jsx`
  starts with EF BB BF.
- **`backend/__tests__/wave-tests-in-sprint.test.js`** — drift guard
  that auto-discovers any `__tests__/*-waveNN*.test.js` calling
  `jest.unmock('mongoose')` and asserts it's in `scripts.test:sprint`
  (ALLOWLIST mechanism for documented exceptions).
- **Per-(file, target) allow-list mechanism** in `no-broken-requires.test.js` —
  for the legitimate case where a single try/catch require should be
  exempted without disabling the whole file's drift check.
- **`CLAUDE.md` at project root** — agent onboarding doc covering the
  two-repo layout, test surface map, 6 active drift guards, critical
  conventions (wave numbering, atomic commit, Wave-18 invariants),
  6 open known issues with precise diagnoses + remediation hints.
- **`.github/workflows/ci.yml` frontend-tests job** — mirrors
  pr-checks.yml so push events also gate on full frontend suite.

### Fixed

- **`frontend/src/utils/dateUtils.js`**: added missing `getDayRange(date)`
  export (returns `{start, end}` for the day in local time). The test
  imported the name but the function didn't exist — `undefined()` threw
  on every test run.
- **`frontend/src/services/kpiDashboard.service.js`**: stripped UTF-8
  BOM that pushed the literal `import` keyword off column 0 of line 1
  and broke the auto-generated meta-test's `/^import\s+/gm` regex.
- **36 backend + 7 frontend source files**: BOM bytes stripped with
  `sed -i '1s/^\xEF\xBB\xBF//'`. Behaviour unchanged; Node and bundlers
  accept files with or without BOM.
- **`backend/services/documents/documentWorkflow.engine.js`** +
  **`documentTemplates.engine.js`**: 4 `new X(...)` sites switched to
  `new (mongoose.model('X'))(...)` so jest tests can intercept the
  constructor via `mongoose.model.mockImplementation`. Re-enabled 4
  previously-skipped tests (escalateOverdue + createWorkflow +
  createTemplate + duplicateTemplate).
- **16 wave test files**: added `jest.unmock('mongoose');` so the
  global mongoose mock from jest.setup.js:19 stops returning a stubbed
  constructor. 561 silently-failing tests now actively gated.
- **`backend/jest.env.js`**: added defaults for
  `CCTV_QUEUE_DISABLE=1`, `HIKVISION_STREAM_MODE=off`,
  `LLM_ANOMALY_SCAN_DISABLED=1`. Stops the "you are trying to require
  a file after the Jest environment has been torn down" post-teardown
  ReferenceError that fired on every test importing server.js (a
  CCTV `setInterval` survived Jest's lifecycle).

### Changed

- **`backend/package.json` scripts.test:sprint**: 87 → 103 enumerated
  files. Added 11 wave-intelligence + 5 care-plan tests that
  `jest.unmock('mongoose')` and therefore need real gating.
- **`MEMORY.md`** (agent memory index): 91KB → 26KB (-71%). Each
  per-wave entry compressed from a paragraph to a one-line link;
  detail preserved in the individual topic files.

### Removed

- **`backend/integrations/nafath/index.js`** (-63 LOC) — 3 stub
  functions threw "not implemented (P1)" but were already implemented
  in `services/nafathSigningService.js` + `services/nafathAdapter.js`
  (34/34 tests passing). Zero importers.
- **`backend/integrations/yakeen/index.js`** (-38 LOC) — superseded by
  `services/yakeenVerificationService.js` + `routes/yakeen-verification.routes.js`.
- **`backend/integrations/wasel/index.js`** (-45 LOC) — superseded by
  `services/waselAdapter.js` + `routes/wasel-address.routes.js`.
- **`backend/integrations/absher/index.js`** (-29 LOC) — superseded
  by `services/absherAdapter.js`.

### Verification

- **CI sprint gate**: 1,569 / 1,569 tests across 87 suites pass in 712s
  (was passing before; the +16 sprint additions add ~9s ≈ 1.3% runtime).
- **Full frontend Jest**: 11,094 / 11,094 passing across 1,304 suites
  (was 11,091 / 3 failing).
- **`lint:duplication`** (Wave 93 G1 guard): 2,101 source files
  scanned, no violations.
- **`preflight`**: pass — safe to deploy.
- **`gov:status`**: 10 / 10 Saudi gov providers all-green (mock mode).
- **`web-admin typecheck`**: clean (`tsc --noEmit`, exit 0).
- **`web-admin lint`**: 5 pre-existing warnings (3× `<img>` on CCTV
  pages, 1× root-layout font load, 1× Next workspace-root notice) —
  unchanged. The 6 page-level font-link duplicates flagged previously
  were removed in companion commits to alawael-rehab-platform/master.

### Audit corrections to CLAUDE.md

Six false alarms from the initial repo audit were verified and
documented as such, so future agents don't re-investigate the same
dead ends:

1. ".env files committed" → all actually gitignored; tracked ones
   contain only public `REACT_APP_*` config.
2. "386 skipped tests = 12% disabled" → actually 19 (0.6%), 18 with
   documented rationale + 1 stale skip removed.
3. "Nafath endpoint not wired" → e-signature flow has been live since
   v4.0.95; only SSO `exchangeAuthCode` is a genuine gap.
4. "migration-runner rollback is TODO" → fully implemented + 8/8 unit
   tests pass. The TODOs the audit picked up live inside the
   _generated migration template_ (placeholder for new migrations),
   not in the runner.
5. "5 monolithic 100KB+ route files" → 4 confirmed
   (app.js, importExportPro.service, students/student-service,
   workflowEnhanced.routes); the 5th (`rehabilitation-routes.js`)
   does not exist on disk.
6. "safeMount fails silently" (eStamp test skip comment) → wrong;
   safeMount logs at error level. Real blocker is 503 from mocked-
   Mongoose queries in the test env, not the mount layer.

---

## [Unreleased] — 2026-05-19 — Wave 117: Schedule Optimizer V2 (closes P3.5)

Closes **P3.5** from `docs/blueprint/09-roadmap.md §5`. V1 schedule
optimizer already existed; V2 enriches the v1 output with Wave-115
no-show risk scoring so the optimizer no longer treats every slot as
equally likely to be attended. Brings P3 closure from 4/6 to **5/6**.

### Architecture

V2 composes over v1's existing greedy + constraint-satisfaction
algorithm rather than replacing it — small blast radius, easy to
revert. Reuses Wave-115 `extractFeatures` + `scoreFromFeatures` so
risk scores are calibrated against the same model operators see
elsewhere. Soft penalties: risk costs up to 30 of 100 base points,
time-of-day stability adds up to 8; v1 base score still dominates.
Graceful: when the no-show service isn't wired, V2 returns the v1
schedule with `no_show_band: 'unknown'` per slot.

### Added — Backend (2 new + 1 mod, +23 tests)

- **`services/ai/scheduleOptimizerV2.service.js`** (339 lines) —
  composes over `scheduleOptimizer.service.js`. Public API:

  - `enrichScheduleWithRisk({v1Result, historyByBeneficiary,
noShowService, maxSuggestions?, now?})` — pure; returns
    `{ok, v2Result, comparison, swapSuggestions}`.
  - `optimizeWeeklyScheduleV2({...v1 params, historyByBeneficiary,
noShowService})` — convenience wrapper that runs v1 + enrichment.
  - Internal helpers exported for tests: `_scoreSlotRisk`,
    `_computeComparison`, `_findSwapSuggestions`, `_riskPenalty`,
    `_slotStabilityBonus`.

  Swap suggestion logic identifies (high|critical)-risk appointments
  sitting in stable mid-morning slots (9-12) where a same-day low-risk
  appointment is in an unstable slot (<9 or ≥14). Up to 5 swaps per
  call (configurable).

- **`__tests__/wave117-schedule-optimizer-v2.test.js`** (329 lines) —
  23 tests covering: penalty/bonus curves, `_scoreSlotRisk` happy +
  degradation paths, `_computeComparison` aggregate metrics,
  `_findSwapSuggestions` matching logic + same-beneficiary exclusion +
  cross-day exclusion, `enrichScheduleWithRisk` end-to-end including
  graceful unknown-band when the service is absent,
  `optimizeWeeklyScheduleV2` integration. **23/23 pass in 0.42s.**

### Modified — Backend

- **`routes/ai-analytics.routes.js`** — new endpoint:
  `POST /api/ai-analytics/schedule/optimize/v2` (+120 lines). Loads
  active beneficiaries + existing appointments + specialists + the
  90-day appointment history map needed for risk scoring, instantiates
  the Wave-115 no-show service, runs `optimizeWeeklyScheduleV2`, and
  returns the enriched result + comparison + swap suggestions.

### Verification

- **Tests: 392/392 pass across 16 suites** in 9.4s (Hikvision 309 +
  Wave 115 43 + Wave 116 17 + Wave 117 23; 0 regressions).
- **Lint: clean** across all 3 touched/added files.
- **Anti-duplication (Wave 93 / G1): clean** across 2039 files.

### Phase 3 progress

P3.1 ✅ · P3.2 ✅ · P3.3 ⚠️ · **P3.4 ✅** · **P3.5 ✅ (Wave 117)** ·
P3.6 ❌. **5 of 6 deliverables closed.** Only P3.6 (Parent Chatbot)
remains — a bigger greenfield wave (LLM + KB + portal UI).

---

## [Unreleased] — 2026-05-19 — Wave 116: No-Show Operationalization (P3.4 cycle complete)

Closes the operational loop on Wave 115 — predictions now run on a
daily cron, get validated against actual outcomes once the appointment
reaches a terminal state, and feed accuracy back into the summary
endpoint. P3.4 is no longer just "the model exists" — it's a running
feedback cycle.

### Added — Backend (2 new + 2 mod, +17 tests)

- **`scripts/no-show-scan.js`** — daily-cron entry point. Runs
  `dailyScanAllBranches` (which delegates to `predictBatch` with no
  branchId), emits AiPrediction documents for every PENDING/CONFIRMED
  appointment in the look-ahead window. Supports `--json`, `--quiet`,
  `--dry-run`, `--horizon=H`, `--branch=ID`, `--help`. Exit 0 on
  success, 1 on failure. Mirrors `attendance-digest.js` shape so it
  drops cleanly into the same cron harness.

- **`scripts/no-show-validate.js`** — end-of-day sweeper. Runs
  `validatePending`, which scans active attendance predictions with
  past `target_date` + null `actual_value`, looks up the appointment,
  and writes `actual_value` if the appointment reached a terminal
  state. Supports `--json`, `--quiet`, `--since=ISO`, `--limit=N`,
  `--help`. Same exit-code contract.

- **`intelligence/no-show-prediction.service.js`** — 3 new methods:

  - `validateActualOutcome({appointmentId, finalStatus, actualValue?})`
    — finds latest active attendance prediction for the appointment,
    sets `actual_value` (from `STATUS_TO_ACTUAL_VALUE` map or explicit
    override, clamped to [0,1]), writes `deviation` + `validated_at` +
    `status='expired'`. Uses the model's `validatePrediction()` method
    when available, falls back to direct save / `updateOne` for lean
    documents. **Idempotent**: returns `alreadyValidated:true` without
    re-writing if `actual_value` already populated.
  - `validatePending({since?, limit?})` — sweeper called by the CLI.
    Returns `{ok, generatedAt, since, stats: {total, validated,
accurate, skippedNotTerminal, skippedAppointmentMissing, failed},
accuracy, results[]}`.
  - `dailyScanAllBranches({horizonHours?, dryRun?})` — thin wrapper
    around `predictBatch({branchId:null, ...})`.

- **`intelligence/no-show-prediction.registry.js`** — additions:

  - `TERMINAL_STATUSES` — `COMPLETED / CHECKED_IN / IN_PROGRESS /
NO_SHOW / CANCELLED` (RESCHEDULED intentionally excluded — the
    outcome moved to a new appointment row).
  - `STATUS_TO_ACTUAL_VALUE` — `COMPLETED|CHECKED_IN|IN_PROGRESS → 0`,
    `NO_SHOW → 1`, `CANCELLED → 0.5` (soft no-show: appointment didn't
    happen but the patient gave notice; the 0.15 accuracy tolerance
    keeps medium-band predictions accurate against this).
  - `REASON.NO_SHOW_NO_ACTIVE_PREDICTION` (validateActualOutcome
    couldn't find a matching prediction) +
    `REASON.NO_SHOW_NOT_TERMINAL_STATUS` (caller passed a status that
    isn't in `TERMINAL_STATUSES`).

- **`__tests__/no-show-prediction-wave116.test.js`** — 17 tests across
  5 sections. **17/17 pass in 0.68s.**

### Modified — Backend

- **`package.json` (backend)** — 4 new npm scripts:
  `no-show:scan(:json)` + `no-show:validate(:json)`.
- **`package.json` (root)** — matching 4 proxy scripts that cd into
  `backend/`.

### Verification

- **Tests: 369/369 pass across 15 suites** in 6.7s (Hikvision 309 +
  Wave 115 43 + Wave 116 17; 0 regressions).
- **Lint: clean** across all 5 touched/added JS files.
- **Anti-duplication (Wave 93 / G1): clean** across 2038 files.
- **`--help` smoke-test**: both CLI scripts print usage and exit 0
  without touching the DB.
- One drift test (`no-broken-requires.test.js`) fails on 6 unrelated
  paths in app.js (auditLog.service / anchorLedger.service /
  BeneficiaryFile) — **pre-existing failure verified by stash + re-run
  on pre-Wave-116 state**. Not introduced by this wave.

### Operational cycle (now fully closed for P3.4)

1. Morning cron: `npm run no-show:scan` → predictions for next 48h.
2. UI reads `/api/v1/ai/no-show/summary` (Wave 115) for per-branch
   risk view; reception can request fresh predictions via
   `/predict/appointment/:id`.
3. Evening cron: `npm run no-show:validate` → writes `actual_value`
   for any prediction whose appointment hit a terminal state.
4. Next morning: `summarizeByBranch` returns an `accuracy` metric
   based on yesterday's validations — feeds the decision on whether
   to keep the heuristic v1 or upgrade to ML (future wave).

### Phase 3 progress

P3.1 ✅ · P3.2 ✅ · P3.3 ⚠️ · **P3.4 ✅ (Wave 115) + fully operational
(Wave 116)** · P3.5 ⚠️ · P3.6 ❌. Still 4 of 6 deliverables closed but
P3.4 now has a running feedback cycle, not just code on disk.

---

## [Unreleased] — 2026-05-18 — Wave 115: No-Show Prediction (P3.4 ✅)

Closes **P3.4** from `docs/blueprint/09-roadmap.md §5` — the cleanest
remaining gap in Phase 3 (Intelligence & Automation). Heuristic risk
scorer over the existing `Appointment` + `AiPrediction` models — no
schema migration, no external ML dependency. Brings P3 closure from
3/6 to 4/6.

### Architecture

- **Heuristic over ML for v1.** Rule-based weighted score over 9
  features (beneficiary 90-day history + appointment metadata +
  branch baseline). Pure functions for `extractFeatures` /
  `scoreFromFeatures` / `deriveContributions` — trivially unit-testable
  and tunable without redeploy. ML model can swap in via the same
  service interface in a future wave (Prompt-20-style).
- **AiPrediction reuse.** `prediction_type` enum already includes
  `'attendance'`. No model change. `prediction_details.{band,
contributions, interventions, appointment_id}` carries the diagnostic
  payload.
- **Status-gated.** Only `PENDING` + `CONFIRMED` appointments are
  predictable — `COMPLETED` / `CANCELLED` / `NO_SHOW` return
  `NO_SHOW_APPOINTMENT_INVALID_STATUS` (outcome already known).

### Added — Backend (4 new files, +43 tests)

- **`intelligence/no-show-prediction.registry.js`** — frozen catalogue
  of 4 `RISK_BAND`s with monotone `BAND_THRESHOLDS` (0.30 / 0.55 / 0.75),
  9-entry `FEATURE_WEIGHTS` (noShowRate90d strongest at 0.45,
  cancellation at 0.15, recent-streak / days-since-attended at 0.10
  each, reschedule / first-appointment at 0.05, hour-of-day at 0.03,
  no-insurance at 0.02, branch-baseline at 0.05), 6-tier `INTERVENTION`
  catalogue with `INTERVENTIONS_BY_BAND` mapping, 6 `REASON` codes,
  `MODEL_VERSION='no-show-rule-based-v1'`, and pure helpers
  `bandForScore(score)` / `interventionsForBand(band)`.

- **`intelligence/no-show-prediction.service.js`** — factory
  `createNoShowPredictionService({appointmentModel, predictionModel,
logger, now})`. Public API:

  - `extractFeatures(appointment, history, branchStats)` — pure;
    filters history to past + 90-day window, computes 13 raw fields
    - normalized derivatives. Tolerates missing `startTime`,
      out-of-range `branchStats.noShowRate90d`, and unfiltered history.
  - `scoreFromFeatures(features)` — pure; weighted sum → clamp [0,1] →
    4 decimal places. Monotonic in every signal.
  - `deriveContributions(features)` — pure; per-feature contribution
    map for explainability (sums to score within rounding tolerance).
  - `predictForAppointment(appointmentId, {dryRun?})` — loads
    appointment + 90-day beneficiary history + 90-day branch stats,
    extracts features, scores, bands, derives intervention list,
    persists `AiPrediction` (skipped when `dryRun`).
  - `predictBatch({branchId?, horizonHours?, dryRun?})` — fans out
    over upcoming `PENDING`/`CONFIRMED` appointments in the window,
    returns `byBand` counts + per-appointment results.
  - `summarizeByBranch({branchId?, since?})` — aggregates persisted
    predictions, computes accuracy from `actual_value` when populated
    (within `±0.15` tolerance).

- **`routes/no-show-prediction.routes.js`** — `createNoShowPredictionRouter`
  factory. 3 endpoints mounted at `/api/v1/ai/no-show`:

  - `POST /predict/appointment/:id` — perm `ai.no-show.predict`; `?dryRun=1` supported.
  - `POST /predict/batch` — perm `ai.no-show.batch`; body or query `{branchId, horizonHours, dryRun}`.
  - `GET /summary` — perm `ai.no-show.read`; `?branchId=&since=ISO`.

  `REASON_TO_STATUS` mirrors the Hikvision routes convention
  (404 / 409 / 400 / 500 / 503 / 422).

- **`__tests__/no-show-prediction.test.js`** — 43 tests across 8
  sections: registry boundaries (5), `extractFeatures` (12 — empty
  history, all-no-show, mixed, day-clamp, future-filter, status-history
  reschedules, early/late hour edges, missing `startTime`, branch
  baseline clamping), `scoreFromFeatures` (6 — zero / monotonicity ×2 /
  extreme clamp / insurance flip / null), `deriveContributions` (1 —
  sums to score), `predictForAppointment` failures (6), happy path
  (4 — persistence, dryRun, CRITICAL with phone-call interventions,
  LOW with clean history), `predictBatch` (4 — horizon + branchId
  filters + non-predictable exclusion + dryRun), `summarizeByBranch`
  (2 — band aggregation + accuracy + null when unvalidated), factory
  guards (2). **43/43 pass in 0.62s.**

### Modified — Backend (2 files)

- **`intelligence/governance.registry.js`** — 3 new perms:
  - `ai.no-show.read` — broad (operations + clinical leads + reception
    supervisor + compliance/audit/exec).
  - `ai.no-show.predict` — handler-tier (adds reception + therapist
    for per-appointment requests).
  - `ai.no-show.batch` — supervisor-and-above (writes ~10-100 records
    per call).
- **`app.js`** — graceful wiring block right after the Hikvision block.
  Skips silently when `Appointment` or `AiPrediction` model isn't
  loaded, or when governance isn't available.

### Verification

- **Tests: 352/352 pass across 14 suites** in 6.4s (Hikvision 309 +
  no-show 43; 0 regressions vs Wave 114).
- **Lint: clean** across all 6 touched files (`--max-warnings=0`).
- **Anti-duplication (Wave 93 / G1): clean** across 2038 scanned files.

### Phase 3 progress

- P3.1 ✅ (Smart Alerts) · P3.2 ✅ (AI Assessment) · P3.3 ⚠️ (Progress
  Prediction — exists, needs validation) · **P3.4 ✅ (Wave 115 — closed)**
  · P3.5 ⚠️ (Schedule Optimizer v2 — needs CP-SAT check) · P3.6 ❌
  (Parent Chatbot — open). **4 of 6 deliverables closed.**

See [`docs/PHASE3_PLAN.md`](docs/PHASE3_PLAN.md) for the live tracker.

---

## [Unreleased] — 2026-05-18 — Wave 114: Hikvision Anomaly History

Continuation of Wave 113 (anomaly detector). Persists each detector run
as a compact snapshot (kind + severity + id only) so operators can answer
"did the situation improve after we acted?" without re-running detect()
across long windows. Time-series trend chart + a scheduled scan keep the
collection populated automatically.

### Added — Backend (3 new files, +14 tests)

- **`models/HikvisionAnomalySnapshot.js`** — append-only snapshot model.
  Schema: `recordedAt` (indexed), `source` (`scheduler|manual|startup`),
  `items[]` (compact `{id, kind, severity}` — diagnostic payload dropped
  to keep collection bounded), `summary` (cached counts), `durationMs`,
  `meta`. **Wave-18 invariants**: `summary.total === items.length` +
  severity-sum invariant + every `items[].id` non-empty (deterministic
  dedup key from Wave 113). **TTL: 30 days** via Mongo TTL index. Sized
  for ~10-min scan cadence ≈ 4.3MB/month uncompressed.

- **`intelligence/hikvision-anomaly-history.service.js`** — three-call
  service: `recordSnapshot({detectionResult, source, meta, durationMs})`
  (only writer; refuses to persist failed detector results — surfaces
  `ANOMALY_SCAN_FAILED` instead), `listRecent({limit, since, source?})`
  (recent-first with optional source filter), `getTrend({hours,
bucketMinutes})` (JS bucketing with gauge semantics — empty buckets
  carry-forward, range > 7 days auto-coarsens bucket).

- **`__tests__/hikvision-wave114-anomaly-history.test.js`** — 14 tests
  across 7 sections: happy-path persist + summary derivation, validation
  rejection, failed-detector handling, recent listing with filters,
  trend bucketing + empty buckets, scheduler `ANOMALY_SCAN` wiring +
  graceful degradation when either service is absent. **14/14 pass.**

### Modified — Backend (6 files)

- **`intelligence/hikvision.registry.js`** — 2 new `REASON` codes
  (`ANOMALY_HISTORY_NOT_FOUND`, `ANOMALY_SCAN_FAILED`) + new
  `JOB_ID.ANOMALY_SCAN` with default cron `*/10 * * * *` (10-min cadence
  matches the 30-min trend bucket nicely).
- **`intelligence/governance.registry.js`** — 1 new perm
  `hikvision.anomalies.history.read`. Same readers as `anomalies.read`
  (operators who see current anomalies should see recurrence trends).
- **`intelligence/hikvision-scheduler.service.js`** — `ANOMALY_SCAN`
  handler wired in. Pulls `detect()` → `recordSnapshot(source:
'scheduler')`. Skips gracefully when either dependency is absent
  (continues Wave 108's "available iff source service wired" pattern).
- **`routes/hikvision.routes.js`** — 3 new routes:
  `GET /anomalies/history`, `GET /anomalies/trend` (both gated on the
  new perm), `POST /anomalies/scan` (manual scan + persist; gated on
  `anomalies.read` since it's read-shaped — the persisted side-effect
  is intentional + benign). `REASON_TO_STATUS` extended for the 2 new
  reasons (404 / 502).
- **`app.js`** — wires `HikvisionAnomalySnapshot` model + history
  service + passes `anomalyHistory` into the Hikvision router + scheduler.
- **`__tests__/hikvision-wave108-scheduler.test.js`** — extended to
  cover the new `ANOMALY_SCAN` job registration + degradation paths.

### Verification

- **Tests: 309/309 pass across 13 Hikvision suites in 6.4s** (was 295 in
  12 suites after Wave 113; +14 new tests, 0 regressions).
- **Lint: clean** across all 8 touched files (`--max-warnings=0`).
- **Anti-duplication (Wave 93 / G1): clean** across 2035 scanned files
  — no canonical-pattern regressions.

### Phase 3 mapping

This wave belongs to the **Hikvision vertical (de-facto P3.7)**, not to
one of the original P3.1–P3.6 deliverables. See `docs/PHASE3_PLAN.md`
for the live Phase-3 tracker — Wave 115 will be **P3.4 No-Show Prediction**,
the cleanest remaining P3 gap.

### Added — Docs

- **`docs/PHASE3_PLAN.md`** — new tracker mapping `blueprint/09-roadmap.md`
  P3 deliverables (P3.1–P3.6) to actual wave deliveries. Documents what's
  shipped (P3.1+P3.2+P3.3), what's missing (P3.4+P3.6), and recommends
  Wave 115 = P3.4 No-Show Prediction.

---

## [Unreleased] — 2026-05-17 — Care Planning Engine: Waves 41–60

End-to-end build of the **Care Planning Intelligence & Governance Engine**
— canonical chokepoint for creating, validating, approving, executing,
monitoring, and amending individual + group care plans across Saudi
rehab centers. **20 waves; 490/490 tests across 14 suites**; backend +
frontend + docs + workers + metrics + alerts + seed all delivered.

### Architecture

Draft-first, evidence-bound, human-in-the-loop: AI proposes → validator
gates → supervisor reviews + scores → approval seals `evidenceHash` +
appends to hash-linked `signatureChain` → side-effects file the plan +
dispatch a redacted family version → workers monitor for plateau /
overdue / family-send failures + emit Insights or escalations. No AI
output is final. No clinical detail leaks to the family. No plan
modification escapes the audit trail.

### Added — Backend (20 new files, +490 tests)

| Wave | Surface                                                                      | Tests |
| ---- | ---------------------------------------------------------------------------- | ----- |
| 41   | Foundations — registry + model + validator + service + 44 governance codes   | 62    |
| 42   | HTTP — 15 endpoints + REASON_TO_STATUS + TRANSITION_TO_PERMISSION            | 43    |
| 43   | Family Communication — Arabic readability + PDPL-redacted generator          | 30    |
| 44   | Recommendations + Progress — 11-layer LLM validator + deterministic reviewer | 53    |
| 45   | Side Effects + Audit — 6 handlers + signature-chain integrity verifier       | 36    |
| 46   | Programs Library + Group Plans — 10 programs + 8 tests + cohort builder      | 53    |
| 47   | Report Generation — 6 internal report kinds                                  | 38    |
| 48   | Explanation + Role Views + LLM Caller + Bootstrap composition root           | 31    |
| 49   | Production Integration + 9 E2E tests against real Mongoose                   | 9     |
| 50   | Workers + Metrics — family-retry / overdue / plateau + 15 Prom metrics       | 28    |
| 51   | Documentation — OpenAPI 3.1 + AsyncAPI 3.0 + Grafana + alerts + runbook      | 26    |
| 54   | List endpoint + branch-scope safety + 5-plan demo seed                       | 23    |
| 60   | Edit drafts — `updateDraft` + 4 editable states + field whitelist            | 16    |

### Added — Frontend (alawael-rehab-platform/apps/web-admin)

| Wave | Page / component                                                               |
| ---- | ------------------------------------------------------------------------------ |
| 52   | Types + API client + list + new + detail (4-tab) pages                         |
| 53   | BeneficiaryPicker component + library browser + reports viewer + sidebar entry |
| 60   | Editable goals/programs/measures `/care-planning/[id]/edit`                    |

Frontend: TypeScript `--noEmit` clean across all 7 pages.

### Anti-patterns blocked at engine level

- Self-approval (reviewer === author) — Wave 41 invariant + service guard
- Approve below scorecard 7.0 — service `REVIEW_SCORE_TOO_LOW`
- Approve with readinessScore < 85 — model invariant + service guard
- Mutate approved version `goals` — amendment whitelist (non-structural only)
- Notify family with grade > 6 — route guard + invariant
- Notify family with ICD code in body — forbidden-term tripwire
- Approve `intensive` without escalation — ALWAYS_ESCALATE_TYPES
- Approve after 2 rejections — ESCALATE_AFTER_REJECTIONS
- LLM proposal with unresolvable evidenceRef — Wave 44 post-validator
- Bypass signatureChain integrity — Mongoose validator + audit-trail verifier
- Family receives non-approved version — status-gated send
- Plan with group program age-mismatch — `lib.matchEligibility()` in builder
- Branch A user reading Branch B plans — service `listPlans` safety belt

### Configuration

Engine activates when `CarePlanVersion` model + governance load. Optional
deps degrade gracefully — missing `ANTHROPIC_API_KEY` disables LLM caller
without crashing boot. Workers scheduled by host (cron / queue / interval).

See `docs/blueprint/19-care-planning-engine.md` for the canonical reference.

---

## [Unreleased] — 2026-05-16 — ALAWAEL Command Center: 9-Wave Rollout

End-to-end transformation of the platform from "feature-complete but
disconnected" to "operator-facing Command Center" — closes the gap
between rich backend infrastructure (alerts engine, KPI registry,
Beneficiary-360, LLM services) and the daily UX of branch managers,
therapists, and guardians. Nine sequential waves; every change opt-in
via env flags or feature toggles so existing deploys stay untouched.

### Added — Backend (66666/) — 18 new files, +74 tests

- **Smart Alerts coverage** expanded from 5 to **19 active rules** across
  `backend/alerts/rules/`:

  - **Wave 3** (13 rules): `document-expiring-30d`, `document-expired`,
    `pdpl-dsar-approaching-sla`, `pdpl-dsar-sla-breach`,
    `care-plan-unsigned-14d`, `care-plan-review-overdue`,
    `goal-stalled-30d`, `vaccination-overdue`, `credential-expired`,
    `employment-contract-expiring-60d`, `employment-contract-expired`,
    `invoice-overdue-90d-critical`, `incident-critical-open-24h`.
    Covers compliance (PDPL Art.27), HR escalation, clinical safety, and
    write-off risk tiers. **+16 tests** in `alerts.rules.wave3.test.js`.
  - **Wave 5** (1 rule): `kpi-anomaly-detected` — bridges the dormant
    EWMA detector (`services/anomalyDetector.service.js`, Phase 18 C6)
    into the alerts engine via `ctx.kpiHistoryStore`. **+10 tests**.

- **Smart Alerts engine wiring** (Wave 7) — `backend/alerts/bootstrap.js`
  composes engine + dispatcher + scheduler in one call. App-level boot
  in `app.js` behind `ALERTS_ENGINE_ENABLED=true`; reuses the dashboard
  platform's `kpiHistoryStore` so the EWMA bridge sees the same series
  as the Phase-18 anomaly detector — single source of truth. **+9 tests**.

- **AI Briefing service** (Wave 4) — `backend/services/briefing.service.js`
  mirrors `hrCopilot.service.js`: Claude Haiku 4.5, prompt caching
  (`ephemeral`), PII redaction, LRU cache (12h morning / 30min NBA),
  rule-based fallback when no API key. Routes at
  `/api/v1/ai/briefing/{status,morning,next-best-action}` wired in
  `app.js` next to the HR Copilot block, sharing the same Anthropic
  client. Audit trail via `AuditLog` (PDPL Art.13). **+16 + 7 tests**.

- **Parent Nafath signing** (Wave 8) — `parent-portal-v2.routes.js` gains
  `POST /children/:id/care-plan/:planId/sign-request` and `/mark-signed`.
  Reuses the existing `nafathSigningService` with `signerRole='guardian'`.
  Triple-check on `mark-signed`: status=APPROVED, documentId matches,
  signerUserId matches. Idempotent. **+11 tests**.

- **Parent Home Programs** (Wave 6) — same router gets
  `GET /children/:id/home-programs` (with 14-day compliance window) and
  `POST .../log` (append-only, status DONE/PARTIAL/SKIPPED, 1000-char
  note cap, ACTIVE-only).

- **6 healthcare roles** added to `config/constants/roles.constants.js`:
  `nurse`, `nursing_supervisor`, `head_nurse`, `patient_relations_officer`,
  `crm_supervisor`, `dpo`. DPO added to `CROSS_BRANCH_ROLES` for PDPL
  Art.30 oversight. Levels: L2 (DPO), L4 (supervisors), L5 (line staff).

- **Integration test suite** (Wave 9) — `backend/__tests__/waves-integration.test.js`
  locks the data contract between Waves 4 + 5 + 7. Catches the
  "unit-tests-green-but-shape-mismatch" class of regressions that
  individual suites can't detect. **+5 tests**.

### Added — Frontend (alawael-rehab-platform/, web-admin)

- **RBAC primitives** (Wave 0):

  - `Session`/`JwtPayload` extended with optional `branchIds[]`,
    `roles[]`, `permissions[]`, `activeBranchId` (backward-compatible
    with pre-Wave-0 JWTs).
  - `useAuth().switchBranch(id)` + `switchRole(code)` with localStorage
    persistence validated against JWT claims (no privilege escalation
    via tampered storage).
  - `<PermissionGate>` HOC + `useHasPermission()` hook supporting
    `require` / `requireRole` / `requireLevel` (1=highest → 6=lowest).
  - `<BranchSwitcher>` + `<RoleSwitcher>` rendered in Topbar; self-hide
    for single-branch / single-role users.
  - `<DataFreshnessChip>` (live / recent / stale / outdated / unknown)
    integrated into `<KpiCard>`.

- **Sidebar V2** (Wave 1) — `nav-types.ts` + `nav-items.v1.tsx` (legacy
  175 hrefs verbatim) + `nav-items.v2.tsx` (7 IA sections, same 175
  hrefs reorganized, `authz` descriptors). `use-nav-items.ts` selector
  hook (precedence: `?sidebar=v1|v2` → localStorage → env default → V1).
  `check-nav-coverage.mjs` updated to scan both files.

- **Widget renderers** (Wave 2) — 4 zero-dependency, SVG-only components:

  - `<TrendChart>` — time-series with target line, optional band,
    direction-aware coloring, x/y axes
  - `<AlertCard>` — extracted from the dashboards/alerts page; reusable
    with `compact` mode for embedding in widget grids
  - `<DrillTable>` — generic typed table with per-column sort
    (3-state), free-text filter, client pagination
  - `<ParetoChart>` — bars + cumulative line with 80% reference
  - `<WidgetRenderer>` dispatcher; falls back to `<WidgetPlaceholder>`
    for shapes whose renderer hasn't shipped

- **AI Briefing drawer** (Wave 4) — `<BriefingDrawer>` slide-in panel
  with morning briefing (5 bullets + focus) + Next-Best-Action list.
  `<BriefingPill>` in Topbar gradient indigo→violet. Explicit `AI` vs
  `Rules` source badge for transparency.

- **Parent Home Program tab** (Wave 6) — new tab in
  `/parent/children/[id]` with per-card 14-day compliance bar, inline
  status logging (DONE/PARTIAL/SKIPPED + note), recent submissions
  list with therapist feedback.

- **Parent Nafath signing** (Wave 8) — `<ParentCarePlanSignSection>`
  3-state component embedded in the care-plan tab: already-signed
  (green badge), requires-signature (amber CTA), in-flight (Nafath
  randomNumber + 15min countdown + 2.5s polling). Final APPROVED auto
  triggers `mark-signed` and refreshes the plan.

### Operational notes

- All changes are opt-in:
  - `ALERTS_ENGINE_ENABLED=true` — starts the 19-rule scheduler
  - `ANTHROPIC_API_KEY=sk-ant-...` — enables LLM briefing (rule-based fallback otherwise)
  - `NEXT_PUBLIC_SIDEBAR_V2_DEFAULT=true` — flips default sidebar to V2
  - `NAFATH_BASE_URL`/`NAFATH_CLIENT_ID`/`NAFATH_CLIENT_SECRET` — live
    Nafath signing (mock mode otherwise)
- `kpiHistoryStore` is shared with the Phase-18 dashboard platform —
  no double-recording, no extra cron jobs.
- Frontend nav-coverage script scans both V1 + V2 module sources; all
  175 admin + 7 parent hrefs resolve to real `page.tsx` files.

### Test summary

- 220/220 backend tests across 17 suites; 0 frontend lint regressions;
  `tsc --noEmit` clean; `pnpm validate` exit 0.

---

## [Unreleased] — 2026-05-15 — Phase 30: Intelligent HR Platform

Closed the gap between a feature-rich HR backend (Phase 11, 564 tests) and a
near-empty admin UI. Added the intelligent layer: predictive analytics
exposure, rule-driven workflow automation, and an LLM-backed copilot — all
PII-redacted and audit-logged.

### Added — Backend (66666/)

- **HR Workflow Automation Engine** (`services/hr/hrWorkflowEngine.js`) with 5 curated built-in rules:

  - `leave-pending-too-long` — escalate stale pending requests
  - `license-expiring-soon` — tiered severity at 14/30/60 days for SCFHS licenses
  - `contract-ending-soon` — 90-day window on fixed-term contracts
  - `excessive-late-arrivals` — flag patterns over `windowDays`
  - `grievance-unanswered` — escalate open grievances past threshold
    Routes at `/api/v1/hr/workflow/{rules,run,dry-run,rules/:id/run}` (admin-only). Notifications via `unifiedNotifier` fallback chain; audit trail via `AuditLog`. **9 unit tests**.

- **HR Copilot** (`services/hr/hrCopilot.service.js`) — Claude Haiku 4.5 backed assistant:

  - `summarizeEmployee` — bilingual 3-paragraph executive brief
  - `draftLetter` — bilingual drafts (warning/promotion/recommendation/appreciation/probation-extension/termination-offer)
  - `answerQuestion` — grounded Q&A bounded to supplied policy context
  - `suggestImprovements` — SMART coaching plan from a performance evaluation
    Routes at `/api/v1/hr/copilot/{status,summarize/:id,draft-letter,q-and-a,suggest/:id}`. SDK injected (`@anthropic-ai/sdk` optional). PII redaction mandatory, prompt caching on system prompt, LRU result cache (200 entries, 5 min TTL), audit trail on every call. **10 unit tests**.

- **Smoke probes** — 3 new entries in `post-deploy-smoke.js`:
  `phase30-hr-workflow-rules` · `phase30-hr-copilot-status` · `phase30-hr-smart-analytics`

### Added — Web-admin (alawael-rehab-platform/)

- **13 new admin pages** under `/hr/*` + ESS portal + intelligence center:
  - Attendance: dashboard (`/hr/attendance`), pending approvals with bulk actions, shifts CRUD
  - Leaves: admin queue + balances matrix
  - Payroll: monthly view + full payslip detail
  - Performance: evaluation queue + criteria detail + succession plans
  - ESS: `/me/hr` (snapshot + check-in/out)
  - Intelligence center: `/hr/intelligence` (workflow runner + last-run findings)
  - Copilot UI: `/hr/copilot` (3-tab: Q&A / Summarize / Letter)
- **New API client**: `lib/hr-api.ts` (attendance/leave/payroll/performance/ess/workflow/copilot/smart-analytics)
- **7 new sidebar entries** under "الموارد البشرية" group

### Runbook

`docs/blueprint/30-intelligent-hr-platform.md` documents the full surface, enable steps (`ANTHROPIC_API_KEY` to activate copilot), deferred items, and compliance notes (PII redaction + audit trail).

---

## [Unreleased] — 2026-05-15 — Phase 29: World-Class QMS + Executive Command Center

### Added — Phase 29 (17 vertical slices, 4 pillars)

**Pillar 1 — Analysis tooling**: FMEA/HFMEA (6 flavours, 2 scales, 15 tests), Structured RCA (Ishikawa + 5-Whys, 15 tests), SPC (7 chart types + Cp/Cpk + 8 Western Electric rules, 25 tests), Pareto + Toyota A3 (13 tests).

**Pillar 2 — International standards**: ISO 9001:2015 / JCI 7th ed. / CBAHI HC 4th ed. traceability matrix (21 tests). 21 CFR Part 11 controlled documents with cryptographic hash-chain e-signatures + `verifyIntegrity()` tamper detection (13 tests).

**Pillar 3 — Operations**: Supplier SCARs + 5-dim scorecard (11 tests), Calibration management ISO/IEC 17025 (10 tests), Change Control with CAB voting (8 tests), Internal Audit auto-scheduler ISO 19011 (8 tests), Cost of Quality ASQ PAF (9 tests).

**Pillar 4 — Analytical intelligence**: Predictive risk score from 10 signals (9 tests), Trend forecasting OLS + CUSUM (13 tests), Bilingual LLM narratives with mandatory PII redactor (14 tests), Mobile inspector backend offline-first (8 tests), 11-metric industry benchmarks (9 tests).

**Frontend**: 28 Next.js pages, 19 sidebar entries grouped under "الجودة".

### Added — Same-day follow-up (6 hardening additions)

- **Cross-module subscribers** auto-draft CAPA items for SPC special-cause / FMEA H-band / Audit NC / Calibration failure events. Severity-mapped. Opt-out via `PHASE29_SUBSCRIBERS_ENABLED=false`. 11 tests.
- **ISO 13485:2016 + ISO 14971:2019** plug-in registries (5 standards total now). 5 new tests.
- **Phase 29 demo seed** populates ~32 demo records across 12 modules. CLI: `node backend/scripts/seed-phase29-demo.js`. 3 tests.
- **Mobile Inspector PWA** at `/inspector` with IndexedDB offline queue, 3 checklist templates, auto-sync every 30s.
- **Executive QMS Command Center** — `/api/v1/quality/command-center` aggregator + `/quality` landing page. Prioritised "attention NOW" list across 10 kinds. 7 tests.
- **Post-deploy smoke probes** for all 17 Phase 29 endpoints. Same regression-class as the May 2026 ZATCA-bug. 17 tests (was 13).

### Aggregate

- **227 backend tests** (201 + 26 follow-up)
- **18 backend modules**, **20 HTTP routes**, **29 front-end pages**, **5 international standards**, **4 auto-CAPA triggers**, **17 smoke probes**

### Runbook

`docs/blueprint/29-world-class-qms.md` — canonical entry point with per-module API surface, capabilities, worked examples, test counts.

### Commits pushed to origin/main

```
055ce36c  Pillar 1 backend — analysis tooling
424b8efc  Pillar 2 backend — standards compliance
14c091a9  Pillar 3.1 backend — Supplier SCARs
cfa48fef  Pillars 3.2-4.5 backend — operations + intelligence
6dc00be7  chore(frontend): unblock pre-push lint
d4442864  Phase 29 follow-up — subscribers + ISO 13485/14971 + seed
04f56f3c  Allowlist 10 legacy registry partial-migration co-mounts
2a92bcd8  Executive QMS Command Center aggregator
20850372  Post-deploy smoke probes for Phase 29 (17 endpoints)
```

Frontend repo (no remote — bundle-backed): `2a81c8a`, `bf9b…`, `469fb32`, `931f08c`, `1b20b05`, `05ddacc`.

---

## [Unreleased] — 2026-05-15 — Phase 28 extended rollout (Supplier UI + RN + ops scripts)

### Added — UI rollout extension

- **Supplier edit page** (`apps/web-admin/src/app/(dashboard)/inventory/suppliers/[id]/edit/page.tsx`) — `<NationalAddressField/>` wired with client-side strict guard; `CreateSupplierPayload` extended with `nationalAddress`.
- **Employee form + Vehicle form** — both gain `<NationalAddressField/>` with `verification.verified` enforcement before submit. Payload types extended in `lib/api.ts`.
- **Legacy admin Branches** (`frontend/src/pages/Admin/AdminBranches.jsx`) — `<NationalAddressField/>` added inside the create/edit dialog; the field mirrors `shortCode` into the legacy `wasel_short_code` so the existing `/verify-balady` + `/verify-wasel` admin pipeline keeps working unchanged.
- **Mobile RN component** — `mobile/src/components/NationalAddressField.tsx` (real RN widget, not just typed client) + demo screen `mobile/src/screens/settings/NationalAddressScreen.tsx`. Drop into any stack navigator for parent/therapist/driver self-service.

### Added — Operational scripts

- `backend/scripts/backfill-branch-national-address.js` — projects legacy `Branch.wasel_short_code` + `Branch.wasel_verification` into the unified `nationalAddress` subdocument. Idempotent. Dry-run flag. 7-test pure-helper coverage at `__tests__/backfill-branch-national-address.test.js` (`projectLegacyToNationalAddress`, `isAddressMeaningful`).
- `backend/scripts/wasel-live-smoke.js` — pre-flight check before flipping `WASEL_MODE=live`. Exercises every adapter path against the real وَصِل endpoint and reports 5 checks (config / connection / verifyShortCode / verifyAndStamp pipeline / invalid-format handling) with exit codes 0/1/2.
- npm aliases: `npm run wasel:smoke`, `npm run wasel:backfill`, `npm run wasel:backfill:dry`.

### Updated

- Runbook `docs/blueprint/28-national-address-platform.md` — adds operational-scripts section, production-flip 6-step checklist.

### Tests

- All 6 existing national-address suites still green: **71/71 ✅**.
- web-admin TypeScript: **0 errors**.

---

## [Unreleased] — 2026-05-15 — Phase 28 Saudi National Address (وَصِل / SPL) — platform-wide rollout

### Added

- **Backend foundation** — single source of truth for the Saudi National Address embedded subdocument.
  - `backend/models/_shared/nationalAddress.subschema.js` — reusable Mongoose subdocument + `attachNationalAddressGuard(schema, opts)` strict `pre('validate')` hook.
  - `backend/services/nationalAddressService.js` — `coerceFromPayload`, `verifyAndStamp`, `requireVerified` (HTTP-mappable codes: `NATIONAL_ADDRESS_REQUIRED` 400, `NATIONAL_ADDRESS_INVALID_FORMAT` 400, `NATIONAL_ADDRESS_UNVERIFIED` 422).
- **Domain-model sweep** — 8 models now carry `nationalAddress` with the strict guard attached: Beneficiary, Customer, Vendor, Driver, Guardian, ContractParty, Employee (`HR/Employee.js`), Branch. Branch keeps its legacy `wasel_short_code` + `wasel_verification` fields for backward compatibility.
- **HTTP** — `POST /api/v1/wasel/address/verify-and-stamp` (in `routes/wasel-address.routes.js`) returns a UI-ready subdocument; idempotent via the existing middleware.
- **Next.js web-admin** (`alawael-rehab-platform/apps/web-admin`):
  - `src/lib/types/national-address.ts` — shared `NationalAddress` shape.
  - `nationalAddressApi.verifyAndStamp` / `searchByNationalId` added to `src/lib/api.ts`.
  - `<NationalAddressField />` drop-in form widget at `src/components/ui/national-address-field.tsx`.
  - Beneficiary form wired with strict client-side guard refusing submit when an address is present but unverified.
- **Legacy frontend** — `frontend/src/components/NationalAddressField.jsx` (drop-in for pages still under `frontend/src/pages/Admin`).
- **Mobile RN** — typed service client `mobile/src/services/modules/nationalAddress.ts` (`verifyAndStamp`, `searchByNationalId`).
- **Prisma** — `Branch.nationalAddress`, `Beneficiary.nationalAddress`, `Guardian.nationalAddress`, `Employee.nationalAddress` JSON columns + migration `20260515120000_add_national_address`.
- **Runbook** — `docs/blueprint/28-national-address-platform.md`.

### Tests

- `__tests__/national-address-subschema.test.js` — 12 ✅
- `__tests__/national-address-service.test.js` — 13 ✅
- `__tests__/beneficiary-national-address-guard.test.js` — 5 ✅
- `__tests__/national-address-models-sweep.test.js` — 24 ✅ (every model in the rollout)
- `__tests__/wasel-address-routes.test.js` — 9 ✅ (extended with `/verify-and-stamp` contract)
- **Total: 63 new tests** — all green.

### Why

Closes the gap where only Branch carried a verified national address and other entities used free-text or ad-hoc structured fields. PDPL, CBAHI, and Vision 2030 e-Government targets require a Wasel-verified address on beneficiary, employee, and payment-touching records. The wave applies the strict-verification policy: when an address is provided it must be Wasel-verified, but records without any address remain valid (preserves existing data).

### Operating note

Defaults to `WASEL_MODE=mock` (CI + local dev — `...00` short codes simulate `not_found`, `...99` simulates `invalid_format`). Flip to `WASEL_MODE=live` with `WASEL_BASE_URL` + `WASEL_API_KEY` for production.

---

## [Unreleased] — 2026-05-15 — Phase 27 CCTV Surveillance Platform (Hikvision) backend

A new vertical: central CCTV monitoring for all branches over Hikvision
ISAPI + RTSP, with an AI analytics layer on top of native smart events
and a PDPL-compliant access + audit model.

### Added — Backend

- **12 CCTV models** under `backend/models/cctv/`: `CctvCamera`,
  `CctvNvr`, `CctvEvent`, `CctvRecording`, `CctvAlert`, `CctvViewAudit`,
  `CctvAccessGrant`, `CctvFaceIdentity`, `CctvAnpr`, `CctvZone`,
  `CctvStreamSession`, `CctvHealthCheck`. All `Cctv*` prefixed to keep
  the model-collision baseline at 0.
- **Hikvision ISAPI adapter** at `backend/services/cctv/adapter/`:
  - `hikvisionISAPIAdapter.js` — real client (Digest auth RFC 7616,
    XML/JSON, deviceInfo, channels, snapshot, RTSP URL builder,
    playback search, PTZ continuous/preset, line/field detection,
    face library add/delete, event poll, ping).
  - `hikvisionMockAdapter.js` — deterministic mock for tests/dev.
  - `digestAuth.js` — pure helper.
  - `index.js` — selector by `HIKVISION_MODE`, wraps every call with
    `adapterCircuitBreaker` + rate limit + metrics + audit.
- **Core services**: `cameraService`, `nvrService`, `eventService`
  (normalises 23 Hikvision event codes into our internal type set,
  dedups by camera+type+second-bucket, emits `qualityEventBus`),
  `alertService` (10 default rules incl. fall/fight/fire/intrusion/
  tampering/disk_failure as single-shot critical), `streamService`
  (HLS session lifecycle, grant check, audit, idle reaper),
  `healthMonitor.service` (round-robin probe with online/offline
  state transitions).
- **AI analytics layer**: 8 detectors (face / intrusion / loitering /
  fall / ANPR / crowd / PPE / behavior) + orchestrator that fans an
  event out to applicable detectors and runs alert evaluation.
- **11 route modules** mounted under `/api/v1/cctv/` via the new
  `routes/registries/cctv.registry.js`: cameras, nvrs, events,
  alerts, streams, recordings, webhooks (HMAC-verified Hikvision push),
  ai (faces/anpr/zones), audit (+ grants), parent-portal, admin.
- **3 schedulers** auto-started from the registry on boot: health
  tick (60s), NVR tick (5m), idle stream reaper (30s). All can be
  disabled with `CCTV_DISABLE_SCHEDULERS=1`.

### Added — Tests

- 48 unit tests across 7 new suites under `backend/__tests__/cctv-*`:
  adapter, event normalisation, webhook HMAC, AI helpers, alert rules,
  grant time window, model registration (incl. TTL index check).

### Added — Docs

- `docs/blueprint/27-cctv-platform.md` — architecture, modules, env
  vars, PDPL compliance, smoke checks, next-commit roadmap.
- 18 new entries in `.env.example` covering the full CCTV config.

### Wired

- `routes/_registry.js` now imports `registries/cctv.registry.js` and
  invokes it in `mountAllRoutes` alongside Finance.

### Known gotcha

- Top-level `parseFloat(process.env.X)` reads can throw under Dynatrace
  OneAgent instrumentation depending on the module chain. All CCTV
  services use lazy env reads (`function _env() { return (typeof
process !== 'undefined' && process.env) || {}; }`) and getters on
  `module.exports` for the legacy names. Apply this pattern to any new
  service module that reads env at top level.

### Added — Web-admin UI (Phase 27 C8 — same session)

Lives in the `alawael-rehab-platform/` repo, mounted under
`/security/cctv/` in the Next.js admin app.

- `src/lib/types/cctv.ts` — 14 typed surfaces mirroring backend models
  (camera, NVR, event, alert, grant, audit, face, ANPR, zone…).
- `src/lib/cctvApi.ts` — typed fetch client. Standalone file (not
  appended to the already-4700-line `api.ts`).
- 9 admin pages under `src/app/(dashboard)/security/cctv/`:
  - **hub** — KPIs (online/offline/degraded/alerts), adapter-mode
    banner, branch grid, recent-alerts table, 8 quick-nav tiles
  - **cameras** — grouped-by-branch grid with live snapshot tiles +
    status badge + capability chips
  - **camera detail** — HLS player + PTZ 8-way d-pad + snapshot
    refresh + properties + recent-events feed + watermark overlay
  - **events** — filterable timeline (type / severity / branch),
    auto-refresh every 30s
  - **alerts** — queue with acknowledge / resolve / false-positive
    actions, auto-refresh every 15s
  - **AI / faces** — identity registry with add + disable
  - **AI / ANPR** — plate registry with allowlist / denylist /
    schedule / autoOpenGate
  - **audit** — PDPL view-audit log (filtered for DPO + admin)
  - **audit / grants** — access grants management with revoke
  - **ops** — health dashboard with manual probe trigger + adapter
    status + per-branch availability %
- Sidebar group "مراقبة CCTV" with 8 children (lucide icons:
  Video / Activity / AlertOctagon / ScanEye / Car / History / Gauge).
- `tsc --noEmit`: **0 errors** across 14,000+ TypeScript files in
  the workspace.

### Added — Parent portal (Phase 27 C10 — same session)

Lives in the `alawael-rehab-platform/` web-admin, mounted under the
existing `(parent)/parent/` route group (role-gated to GUARDIAN/PARENT).

- `(parent)/parent/cctv/page.tsx` — list of cameras the logged-in
  parent is **allowed to view right now** (calls
  `parentCctvApi.myCameras` → `/api/v1/cctv/parent-portal/my-cameras`).
  PDPL notice card always rendered.
- `(parent)/parent/cctv/[cameraId]/page.tsx` — live viewer with:
  - **consent gate** persisted in localStorage; viewer button is
    disabled until the parent explicitly accepts 5 PDPL clauses.
  - 4-overlay live watermark on the HLS `<video>`: user email +
    timestamp (top-start), "● مباشر — مسجَّل في سجل PDPL"
    (bottom-end), viewing-duration counter (bottom-start).
  - 10s heartbeat to central; automatic stop on unmount.
  - `controls={false}` + `playsInline` to discourage save-as.
- `parent-sidebar.tsx` gets a new "مشاهدة طفلي" nav entry (Video icon).
- `parentCctvApi` added to `src/lib/cctvApi.ts` (myCameras / startLive /
  heartbeat / stop).

### Added — Edge gateway service (Phase 27 C11 — same session)

New Node.js service at `services/cctv-edge-gateway/` designed to run
**one per branch**. Bridges the local Hikvision NVR to central:

- `eventPoller.js` — long-polls
  `/ISAPI/Event/notification/alertStream` with RFC 7616 Digest auth,
  parses each multipart XML chunk, forwards to central via
  HMAC-signed webhook.
- `centralClient.js` — `sha256=…` HMAC over raw body + exponential
  backoff retry (5 attempts).
- `queue.js` — Redis FIFO (`cctv:edge:events`) with in-memory ring
  fallback when Redis is unreachable.
- `replayWorker.js` — drains the queue once `centralClient.ping`
  succeeds; re-queues anything that still fails.
- `healthProber.js` — TCP-ping every camera (30s) and the NVR (60s),
  ships reachability + latency to central.
- `hlsManager.js` — spawns one ffmpeg per live session for RTSP → HLS,
  serves manifest + segments, idle reaper at 60s.
- `server.js` — Express on `:3291` (configurable) with `/health`,
  `/sessions`, `/hls/start|heartbeat|stop`, plus static manifest +
  segment routes.
- `config.local.example.json` — per-branch config template (NVR
  password is `passwordRef` → `process.env[X]`, never on disk).
- 6 unit tests covering ISAPI chunk parsing, Digest header build, and
  HMAC signing (`node --test`, all pass).
- Runbook in `services/cctv-edge-gateway/README.md`.

### Added — Mobile screens (Phase 27 C9 — same session)

React Native + Expo, in the `mobile/` workspace.

- `src/services/modules/cctv.ts` — typed CCTV client mirroring the web
  `cctvApi`. `snapshotUrl()` reads `EXPO_PUBLIC_API_URL` because
  `ApiService` keeps its axios instance private.
- Four screens under `src/screens/cctv/`:
  - **CctvBranchesScreen** — KPI row (total / online / offline) +
    alerts banner + scrollable branch cards with availability %.
  - **CctvCamerasScreen** — per-branch FlatList with status chip and
    capability chips (PTZ / Face / ANPR).
  - **CctvCameraDetailScreen** — auto-refreshing snapshot (every 5s)
    on `Image`, PTZ 8-way d-pad, 10s heartbeat once a live session
    starts, recent-events feed. Carries a comment for the future
    `expo-av Video` upgrade for real HLS playback.
  - **CctvAlertsScreen** — alert queue with severity-colored
    border-left, one-tap detail sheet (Alert.alert) offering
    استلام / إنذار كاذب / تم الحل, 15s auto-refresh.
- `SprintAppNavigator` gets a new **SecurityTabs** (red theme,
  Branches + Alerts) routed for roles `security_officer`, `security`,
  `admin`, `manager`. Plus root-stack `CctvCameras`,
  `CctvCameraDetail`, `CctvAlerts` so other roles can navigate by id.
- `services/modules/index.ts` re-exports the new cctv module.

TypeScript: 0 errors. ESLint: clean.

### Phase 27 status

All 11 slices shipped: backend (C1–C7) + admin web UI (C8) +
mobile (C9) + parent portal (C10) + edge gateway (C11).

---

## [Unreleased] — 2026-05-15 — Phase 27 scale-up to 50K cameras

Same-day follow-up: the platform was already complete end-to-end, but
hot-path bottlenecks limited it to ~5K cameras. These four levers
raise the ceiling to ~50K cameras and isolate per-NVR failures.

### Added — Scale infrastructure

- **`backend/services/cctv/eventQueue.service.js`** — batched ingestion
  buffer with `insertMany` bulk write + capped AI fan-out. Webhook now
  pushes in microseconds; flusher does the Mongo write in batches of
  500 every 250ms. Backpressure: returns `{ok:false, code:'QUEUE_FULL'}`
  at 95% capacity so the webhook returns `429 + Retry-After: 1`.
- **`backend/services/cctv/adapter/perTargetBreaker.js`** — multi-tenant
  circuit-breaker wrapper. Each NVR/IP gets its own breaker. Failing
  one NVR can no longer cascade-open a global "hikvision" breaker and
  knock out the other 99. Idle breakers GC'd after 10 min.
- **`backend/services/cctv/adapter/httpAgentPool.js`** — lazy
  keep-alive Node http.Agent per `(host:port:scheme)`. The ISAPI
  adapter now reuses sockets instead of doing TCP+TLS handshake per
  call. Per-origin socket cap prevents a misbehaving NVR from
  starving the pool.

### Changed — Hot path

- **`webhooks.routes.js`** — both `/nvr/:nvrCode` and `/camera/:code`
  now check backpressure first and return 429 when saturated. AI
  dispatch removed from the inline path (queue handles it).
- **`eventService.ingestFromHikvision`** — default path is now
  enqueue + return. Synchronous insert path retained for
  `CCTV_QUEUE_DISABLE=1` (tests).
- **`healthMonitor.tick`** — now shards by branch (each branch has its
  own cursor + fair share) and probes with `CCTV_PROBE_CONCURRENCY`
  parallel workers. One sluggish branch can no longer starve probing
  on the others.
- **`hikvisionISAPIAdapter.rawRequest`** — every HTTP call now goes
  through `httpAgentPool.for(host, port, secure)`. Lazy timeout
  resolution so env var changes apply immediately.
- **`adapter/index.js`** — the global breaker was replaced with
  `perTargetBreaker.get(opts.ip)`. `getConfig()` now reports
  per-target breaker snapshots + agent pool stats.

### Added — Ops endpoints

- `GET  /api/v1/cctv/admin/queue` — depth, high-water-mark, drops, errors
- `POST /api/v1/cctv/admin/queue/flush` — force-flush (debug)
- `POST /api/v1/cctv/admin/breakers/reset/:target?` — reset one or all

### Added — Tests

- `cctv-event-queue.test.js` (5 tests) — push/depth/capacity/dropped/
  drain
- `cctv-per-target-breaker.test.js` (5 tests) — isolation between
  targets + reset
- `cctv-http-agent-pool.test.js` (5 tests) — same-origin reuse,
  scheme/port separation, keep-alive flag

Total CCTV test count: **63 passing** across 10 suites.

### Added — Docs

- `docs/blueprint/27-cctv-scale-guide.md` — tier matrix (S/M/L/XL),
  per-tier deploy checklist, env knob reference, ops endpoints,
  load-test recipe, symptom → fix table.
- 14 new entries in `.env.example` covering the scale knobs.

---

## [Unreleased] — 2026-05-12 — 17-commit cleanup + verified manual deploy + 11 real bugs caught

A long session combining a Quality module expansion, frontend admin pages refresh,
two repos (`66666` + `alawael-rehab-platform`), an end-to-end verified VPS deploy
recipe, and 11 concrete bugs surfaced by re-enabling lint/typecheck/test gates that
had been silently bypassed.

### Added — Backend

- **Management-Review service** rewrite — analytics + dashboard helpers,
  action-status tracking, minutes, idempotent close/cancel, auto-schedule
  next periodic review. 55 new unit tests using an in-memory fake model
  (no DB required). `services/quality/managementReview.service.js` grew
  from 489 → 675 lines.
- **3 new Quality admin endpoints** — `managementReview.routes.js`
  (analytics + action-status surfaces), `capa-admin.routes.js`,
  `evidence.routes.js` (per-bucket distribution), `qualityHealthScore.routes.js`.
- **eSignature template hardening** — return 400 on ValidationError
  (not generic 500), surface 11000 dup-key with Arabic message,
  fall back to `req.user.userId || req.user.id` for JWT payload variants.

### Added — Frontend (66666)

- **8 Quality admin pages expanded** (~3,500 lines) — ManagementReviewAdmin
  (full vertical: agenda, attendees, inputs/outputs, decisions, actions,
  minutes, approval, analytics), QualityDashboard (KPI tiles, charts,
  branch health), QualityPage (hub with subject cards), CapaAdmin,
  EvidenceVaultAdmin, ComplianceCalendarAdmin, PdplComplianceDashboard,
  PolicyLibraryAdmin.
- **Tele-Rehab + Equipment-Lifecycle routes** mounted in
  `routes/index.js` + `AuthenticatedShell.js`.

### Added — Platform repo (alawael-rehab-platform)

- **Landing-config section types**: `branches` + `vision` body shapes +
  renderers in `apps/web-admin/src/app/landing-preview/page.tsx`.
  `ICON_GLYPH_MAP` turns common lucide icon names into unicode glyphs.
- **Next.js ESLint config** (`apps/web-admin/.eslintrc.json` with
  `next/core-web-vitals`) — was missing, so `next lint` blocked on
  interactive prompt in CI.

### Fixed — 11 real bugs surfaced

1. **`react-hooks/rules-of-hooks` violation** in `appointments/[id]/page.tsx`:`StatusActions`
   — 5 `useState` calls sat after an early-return. Would crash with
   "Rendered fewer hooks than expected" once `transitions.length === 0`.
2. **`useTemplate` callback** in `therapist-templates/page.tsx` tripped
   rules-of-hooks. Plain clipboard-copy callback, not a hook. Renamed to `applyTemplate`.
3. **`a11y/aria-progressbar-name`** — 8 MUI `<LinearProgress>` across 5 Quality pages
   missing `aria-label`. Caught by axe-core in `management-review-admin.a11y.test.js`.
4. **Jest config conflict** — both `jest.config.js` and `package.json[jest]` existed;
   `npx jest <file>` failed with "Multiple configurations found".
5. **`hr-app/Dashboard.js` duplicate declaration** — two `const Dashboard = () => ...`
   blocks. Hard parse error. Collapsed to a single re-export.
6. **6 unescaped JSX entity errors** in `landing-preview/page.tsx`,
   `push-subscriptions/page.tsx`, `dynamic-form-renderer.tsx`.
7. **`@alawael/core/intake.service.ts` — 2 TS errors** (`Intake | undefined`
   under `noUncheckedIndexedAccess`). Unwrapped the transaction return.
8. **`@alawael/core/lint` script referred to eslint** not in workspace.
   Only 1/18 services had this stale script.
9. **5 service packages with `"test": "jest"` + zero test files** —
   added `--passWithNoTests` to unblock `pnpm turbo test`.
10. **Stale `@typescript-eslint/no-unused-vars` eslint-disable** in `lib/api.ts`.
11. **Critical deploy bug**: `chown -R www:www` after backend rsync clobbers
    `.env` ownership; pm2 runs as `alawael` and can't read → env-validation
    crash loop. Recovery: `chown alawael:alawael .env && chmod 600 .env`.
    Documented in `memory/project_session_2026-05-12_full_deploy.md`.

### Removed

- `frontend/src/pages/Quality/_QualityPage_backup.jsx` (1-line deprecated stub).
- `services/core/package.json` stale `lint` script.

### Test totals

- **Backend**: 25,115 passing (was 20,179 four weeks ago)
- **Frontend**: 11,094 active + 19 skipped (DocumentList orchestrator; describe.skip
  with TODO replaces a hidden regex in jest config)
- **Mobile**: 113 passing
- **Platform-core**: 295 passing (was 7 + 21 suites failing to compile because
  Prisma client wasn't generated — `pnpm db:generate` is now part of the deploy recipe)
- **Total**: 36,617 passing across 4 surfaces

### Deployed manually (auto-deploy workflow stopped firing — root cause TBD)

- alaweal.org:5000 (backend + CRA) — `/api/v1/management-review/dashboard` returns
  401 (route mounted + auth-gated) — proves new code is live.
- alaweal.org:3100 (web-admin Next.js) — `/admin/landing-preview` serves with
  the new `branches` + `vision` renderers.
- `build-info.commit` still reports stale `c48e304a` because GIT_SHA isn't
  updated on rsync deploys (known issue from 2026-05-11 — trust file mtimes).

### Incident

- `/api` was 502 for ~3 minutes during backend deploy recovery when `.env`
  ownership caused a pm2 crash loop. Restored by copying `.env` from
  `.FAILED-` dir + `chown alawael:alawael` + `chmod 600`. No data loss.

---

## [Unreleased] — 2026-05-02 — Operational hardening + 9 silent-failure fixes

A 30-step session that closed three production-readiness gaps end-to-end
(NPHIES claims, ZATCA Phase 2, DR/encryption) and surfaced + fixed nine
silently-broken pieces of test/CI infrastructure that had been hiding
real regressions for months. **238 new tests** ship under guard. The
frontend test gate widened from ~14 a11y-only tests to **all 11,068**
in one workflow change.

### Added — End-to-end pipelines

- **DR/encryption stack** — daily restore drill (`backend/scripts/dr-verify.js`,
  GitHub Actions cron 04:00 UTC) + AES-256-GCM streaming encryption
  (`backend/utils/backup-crypto.js`) + ops-alerter wiring
  (`backend/services/ops-alerter.js`). 30 tests. Runbook
  `docs/blueprint/19-dr-verification.md`.
- **NPHIES session→claim bridge** — `buildClaimFromSession()` mapping
  Arabic session types to CPT codes, errors-vs-warnings split,
  insurance gating. Per-session `POST /api/admin/therapy-sessions/:id/create-claim`
  - bulk `/bulk-create-claims` (atomic, idempotent, partition-honest:
    `created`/`skipped`/`failed`). Frontend dialogs with WCAG 2.1 AA
    audits. 41 tests. Runbook `docs/blueprint/21-session-to-claim-bridge.md`.
- **InsuranceTariff resolver + admin** — `services/insuranceTariffs.js`
  with deterministic `(provider, providerId, cptCode, date)` lookup
  rules. Admin CRUD route + page with double redaction layer for
  sensitive fields. 25-row Saudi insurer seed (Bupa/Tawuniya/MedGulf/
  AlRajhi/Walaa × 5 rehab CPTs). Wired into deploy as idempotent
  post-restart step. 41 tests.
- **ZATCA Phase 2 wiring** — routes mounted in `_registry.js` (was
  silently 404), Invoice post-save hook behind `ZATCA_AUTOSUBMIT`
  flag, real-time ops-alerts on REJECTED, 24-hour SLA sweeper
  (`zatcaB2cSlaSweeper.js` + scheduler), per-branch `ZatcaCredential`
  admin page with onboarding/promote actions, sensitive-field
  redaction. 47 tests. Runbook `docs/blueprint/22-zatca-phase2.md`.
- **Lifecycle isBilled lock** — `nphiesReconciliationService.applyClaimUpdate`
  now sets `session.isBilled=true` on transition into APPROVED,
  preventing double-billing through any of the create-claim paths.
  Best-effort, idempotent, race-safe. 8 tests.

### Added — CI/Deploy hardening

- **Post-deploy smoke probes** (`backend/scripts/post-deploy-smoke.js`)
  — 10 critical endpoints checked after every deploy. Catches the
  "registered in code but unmounted" bug class that hid ZATCA routes.
  Fires `ops-alerter` on critical failures. 16 tests.
- **Frontend test gate widened** — was a 14-test a11y-only slice, now
  the whole 11,068-test suite runs as a hard gate on every PR.
- **Daily DR drill** workflow (`.github/workflows/dr-verify.yml`).
- **Idempotent tariff seed** wired into deploy.
- **Go-live checklist** at `docs/blueprint/23-go-live-checklist.md`
  consolidating 11 runbooks into one operator-friendly index.

### Added — Drift guards (7 ratchets/strict gates protecting future work)

- `frontend/src/__tests__/drift/no-brittle-count-assertions.test.js`
  — bans `expect(matches.length).toBe(N)` for source-text counts
- `frontend/src/__tests__/drift/react-app-env-vars-documented.test.js`
  — every `process.env.REACT_APP_*` must be in `frontend/.env.example`
  (strict) + dead-var ratchet at 14 (drive down)
- `backend/tests/unit/env-vars-documented.test.js` — same as above for
  backend, ratchet at 260 undocumented + 166 dead
- `backend/tests/unit/admin-routes-have-probes.test.js` — every
  `MUST_HAVE_PROBE` admin route in `_registry.js` has a smoke probe
- a11y hard gate via `frontend-tests` job in `pr-checks.yml`

### Fixed — Nine silent failures

1. **`cypress/support/commands.js` empty `cy.checkA11y` stub** —
   shadowed `cypress-axe`'s real implementation, making every cypress
   a11y assertion trivially pass. Removed.
2. **Frontend tests never ran in CI** — the entire 11K suite was
   uncovered. Now gated.
3. **`continue-on-error: true` on backend tests in deploy** —
   removed. Failures now block.
4. **`|| echo "⚠️"` after `npm test` in deploy** — masked exit codes.
   Removed.
5. **`deploy.if:` block ignored `needs.test.result`** — even with the
   above fixed, deploy could still proceed on failure. Fixed.
6. **`alerts/rules/zatca-submission-rejected.js` queried wrong
   field** (`zatcaSubmission.status` instead of `zatca.zatcaStatus`)
   — every ZATCA REJECTED row was invisible to the alert evaluator.
   Fixed and now also fires real-time alerts from the hook.
7. **63 brittle `toBe(N)` count assertions** auto-generated across
   `services-*.test.js` files — bulk-migrated to
   `toBeGreaterThanOrEqual(N)`. Guard test prevents reintroduction.
8. **23 backend env vars** referenced in code but missing from
   `.env.example` (this session's flags + 7 pre-existing ZATCA names).
   Added.
9. **3 frontend `REACT_APP_*` vars** missing from `frontend/.env.example`.
   Added.

### Memory entries

12 new project memories under `~/.claude/.../memory/` carrying the
_why_ + the gotchas (e.g. mongoose `isValidObjectId` mocked in
test env → use 24-hex regex; `\s` includes `\n` so use `[ \t]` for
single-line whitespace).

### Added — Regulatory admin tier (continued, same session)

After the 30-step operational push, the same session continued into
QMS + PDPL UI gaps surfaced by the QMS audit memo. Each gap closed
with a real admin page (not a stub) wired into the navigation tree
under explicit CBAHI / PDPL / NPHIES / ZATCA badges.

- **QMS — ISO 9001 §9.3 Management Review** admin page — was missing
  the UI tier (backend existed). Closes the CBAHI accreditation gap.
- **QMS — Evidence Vault** admin page — repository view for the
  audit trail of decisions, signed forms, and policy approvals.
- **QMS — Compliance Calendar** admin page — recurring deadlines
  - escalation visibility for the QMR / DPO.
- **PDPL Article 4 — Data-Subject Requests** admin page with 30-day
  SLA countdown chip and export/erase actions for the DPO.
- **PDPL Article 6 — Consent Records** admin page.
- **PDPL Article 20 — Breach Reporting** admin page with 72-hour
  SDAIA notification timer.
- **PDPL Article 32 — Processing Records** admin page (RoPA).
- **PDPL Compliance Dashboard** — single DPO entry-point that ties
  the four PDPL pages above together with badge counters.

### Added — PII access audit (PDPL Article 13)

- **`backend/middleware/piiAccess.middleware.js`** — wraps any route
  and writes a `pii.access.read` AuditLog entry on every successful
  2xx read of a PII record. Hooks into `res.on('finish')` so latency
  stays at zero. Skips 4xx/5xx (denied access ≠ disclosure), skips
  anonymous (no actor), skips OPTIONS/HEAD. Best-effort: AuditLog
  write failure NEVER bubbles into the request lifecycle. **10 tests**.
- **`backend/routes/pii-access-audit-admin.routes.js`** — admin
  query API at `/api/admin/pii-access-audit` with two modes:
  filterable list + aggregator `/by-target` (distinct viewers + counts
  for "who viewed user X between date A and B"). Window capped at
  365 days. **5 tests**.
- **`frontend/src/pages/Quality/PiiAccessAuditAdmin.jsx`** — dual-tab
  UI (list + by-target query) wired at `/quality/pdpl/access-audit`.
  Sidebar entry under PDPL with red-badge surface.
- **Coverage applied to 7 high-PII GET /:id endpoints**:
  - `/api/admin/beneficiaries/:id` (Beneficiary)
  - `/api/admin/invoices/:id` (Invoice)
  - `/api/admin/nphies-claims/:id` (NphiesClaim)
  - `/api/admin/care-plans/:id` (CarePlan — clinical)
  - `/api/admin/assessments/:id` (ClinicalAssessment — health data)
  - `/api/admin/therapy-sessions/:id` (TherapySession — clinical notes)
  - `/api/v1/hr/employees/:id` (Employee — salary/contract PII)
- **Structural guard updated** — `MUST_HAVE_PROBE` extended to 9
  entries; smoke probe added for `/api/admin/pii-access-audit`.
  Any PR that unmounts the audit log API fails the build at PR
  time AND fails the deploy smoke after merge.

**PDPL Article 13 accountability story COMPLETE — SDAIA-ready.**

---

## [Unreleased] — 2026-04-28 — Test-harness + auth-gate consolidation

Sprint suite: **1553 passing**.

### Fixed

- **Mongoose 9 hook compat shim** — patches `Schema.prototype.pre/post`
  in `backend/config/mongoose.plugins.js` so legacy
  `function(next) { ...; next(); }` document hooks keep working under
  mongoose 9 (which dropped `next` for document hooks). Single-file
  fix that protects 90+ models without touching them individually.
- **`Invoice.pre('save')`** rewritten to the modern no-arg shape.
- **`models/VitalSign.js`** populated — was a 0-byte placeholder
  from the v4.0.74 mass push, blocking the
  `clinical.pediatric.weight.drop_5pct` red-flag adapter.
- **`__tests__/acl-client-dlq.test.js`** populated with seven specs
  covering the AclClient → DLQ handoff (success no-park, retry
  exhaustion, parkOnFailure=false, PII redaction, DLQ-failure
  isolation, circuit-breaker short-circuit).
- **31 integration tests** (QMS + Red-Flag observations + admin
  API) add `jest.unmock('mongoose'); jest.resetModules();` so they
  exercise real mongoose instead of the global mock. Pass-rate
  uplift across these files: roughly +250 newly green.
- **Red-Flag admin RBAC gap** — `/api/v1/admin/red-flags/dashboard`
  was authenticate-only; any logged-in user could read it. Auth +
  role gate now baked into the factory (defense in depth).
- **`admin-routes-auth-wiring.test.js`** drift test recognizes
  `authorize` (the canonical role-checker in `middleware/auth.js`)
  and a global `router.use(...)` role gate.

### Added

- **`backend/__tests__/no-broken-requires.test.js`** — drift guard
  that walks every backend `.js` file and resolves every relative
  `require(...)` against the filesystem, failing the sprint gate
  if any new typo'd or stale require lands. Wired into both
  `npm run test:sprint` and `test:drift`. Allowlist for documented
  false positives (the migration script's string templates + a
  legacy auto-generated test stub).
- **`docs/blueprint/13-ops-control-tower-api-playbook.md`** —
  420-line curl-driven reference for all eight Phase-16 ops
  surfaces (was a 0-byte placeholder).
- **Phase 17 Care Platform UI** in
  `alawael-rehab-platform/apps/web-admin`: 7 subject pages live
  (`/care/{crm,social,home-visits,welfare,community,psych,independence}`)
  with cross-navigation back to `/care/360/[beneficiaryId]`.
- **Phase-13 QMS runbook** linked from `docs/runbooks/README.md`
  index.

---

## [4.0.114] — 2026-04-25 — Phase 19 Commit 1: Forms Catalog

Adds 32 ready-to-use form templates across three audiences so admins can
turn on a working form with one API call instead of building it from
scratch in `FormDesigner`.

### Added

- **`backend/config/forms-catalog.registry.js`** — frozen catalog of 32
  form templates: 12 beneficiary (intake, consent ×3, complaints,
  satisfaction, welfare, transfer, home-visit, info-update, cessation),
  12 HR (annual / sick / maternity leave, overtime, salary advance,
  salary / position / branch change, resignation, performance review,
  employee complaint, training request), 8 management (purchase, vendor
  onboarding, budget approval, capex approval, policy change, strategic
  decision memo, audit-finding response, risk acceptance).
- **`backend/services/formsCatalogService.js`** — DI-friendly service:
  `listAll({ audience, category })`, `getById(id)`, `summary()`,
  `instantiate(id, ctx)`, `instantiateAll(ctx, { audience })`.
  Idempotent on `(catalogId, tenantId, branchId)`.
- **`backend/routes/forms-catalog.routes.js`** — REST surface mounted at
  `/api/v1/forms/catalog` (read endpoints any-authed; instantiate gated
  to admin / forms_admin).
- **`backend/scripts/seed-forms-catalog.js`** — CLI runner with
  `--audience`, `--tenant`, `--branch`, `--dry-run`, `--reset`, `--json`,
  `--help`. Three new npm scripts: `seed:forms-catalog`,
  `seed:forms-catalog:dry`, `seed:forms-catalog:reset`.

### Tests

- `backend/__tests__/forms-catalog-registry.test.js` — 14 tests:
  unique IDs, audience/id alignment, valid field types, no duplicate
  field names, options for select/radio, section references resolve,
  approval workflow shape, summary correctness, minimum coverage per
  audience.
- `backend/__tests__/forms-catalog-service.test.js` — 15 tests: pure
  reads, idempotent instantiate, audience filter on `instantiateAll`,
  `CATALOG_NOT_FOUND` error code, `buildTemplateDoc` metadata stamp.
- New `npm run test:forms-catalog` runs both: 29 tests / 2 suites in ~1s.

### Documentation

- **`docs/blueprint/19-forms-catalog.md`** — full runbook listing every
  form, REST surface, CLI usage, idempotency semantics, extension
  guidelines.

### Non-goals

- No FormDesigner UI changes — catalog is consumed via REST; existing
  designer edits any FormTemplate (including catalog-instantiated ones).
- No FormSubmission changes — submissions use the same flow.
- No auto-seed on tenant create — onboarding policy decision per tenant.
