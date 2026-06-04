# Session Log — Module Development & Hardening (2026-06-04)

> Theme: "تطوير الوحدات المتوفرة بالنظام" — a balanced, multi-batch pass across
> backend modules focused on **security (branch isolation)**, **code quality**,
> **P1 data-integrity (W340 duplicate-model collisions)**, and **behavioral test
> coverage**. No commits were created (per policy — only on explicit request).

Repo: `66666/backend` (Express + Mongo). All work is on the live canonical
backend API per the routing doctrine in `CLAUDE.md`.

---

## Scope chosen (user-confirmed)

- Repos: both (backend + web-admin) — work landed in `66666/backend`.
- Modules: documents, quality/CAPA, HR, clinical services, rights/voice.
- Dev types: new features, bug fixes, refactor, tests, performance.
- Priority: **balanced** (feature + tests).

---

## Batch 1 — CAPA (Quality) hardening

**Files**

- `backend/routes/quality/capa.routes.js`
- `backend/__tests__/capa-routes-wave345.test.js`

**Changes**

- Added `requireBranchAccess` to the whole CAPA router (branch isolation).
- `GET /` + `GET /overdue`: replaced `req.query.branchId || req.user.branchId`
  with `effectiveBranchScope(req)` (kills branch spoofing for restricted users).
- `GET /:id` + `GET /:id/audit`: `findById` → `findOne({_id, ...branchFilter(req),
deleted_at:null})` + `mongoose.isValidObjectId` guard → `INVALID_CAPA_ID` (400).
- `POST /`: removed `...req.body` (mass-assignment) → explicit DTO; branch pinned
  from scope.
- `POST /:id/transition`: added ObjectId validation.
- Extended the static drift guard with assertions for the above.

**Verify:** `capa-routes-wave345` 17/17 ✅ · `no-broken-req-branchid-wave269h` 3/3 ✅
· `check:routes-load` 546 files ✅.

---

## Batch 2 — Documents cleanup + HR branch isolation

**Files**

- `backend/routes/documentAdvanced.routes.js`
- `backend/routes/leave-requests.routes.js`
- `backend/routes/hr/hr-performance.routes.js`

**Changes**

- `documentAdvanced.routes.js`: removed the **doubled `requireBranchAccess`**
  middleware across **72** spots (was registered twice on ~every endpoint).
- `leave-requests.routes.js`: added `loadOwnedRequest` helper (ObjectId +
  `assertBranchMatch`); `GET /` uses `effectiveBranchScope`; `POST /` pins
  scoped branch; `GET/PUT/DELETE/:id` + `approve` + `reject` now enforce branch
  ownership (closes IDOR).
- `hr-performance.routes.js`: added `assertEvaluationBranch` helper; applied to
  `GET /evaluations/:id`, `submit`, `approve`, `delete` (submit previously had
  **no** guard — highest risk); `POST /evaluations` pins scoped branch.

**Verify:** affected route tests 34/34 ✅ · `check:routes-load` 546 files ✅
· no lint.

---

## Batch 3 — DocumentShare collision + Rights/Voice behavioral tests

**P1 data-integrity (W340 Pattern D rename)**

Two model names (`DocumentShare`, `DocumentAccessLog`) were registered with
DIFFERENT schemas AND collections in two files → first-loader-wins silent
collision.

- `backend/services/documents/documentSharing.service.js`:
  - in-app sharing model → registered as **`DocumentShareLink`** (collection
    `document_shares`).
  - access trail → registered as **`DocumentShareAccessLog`** (collection
    `document_access_logs`).
  - internal `ref` repointed; header documents the rename.
  - Canonical `DocumentShare` / `DocumentAccessLog` now resolve deterministically
    to `models/*.js`.
- `backend/__tests__/no-duplicate-model-registration-wave340.test.js`: removed
  both from `KNOWN_DUPLICATE_REGISTRATIONS` (ratchet-down) with rationale.

**Behavioral tests (new)**

- `backend/__tests__/phase-b-routes-behavioral-wave825.test.js` — first runtime
  (supertest + MongoMemoryServer) coverage for `voice-log` / `decision-rights` /
  `self-advocacy`: cross-branch 404 (no leak), invalid-ObjectId 400, lifecycle
  409s (self-supersede 400, action-on-superseded 409, invalid enum 400).
  Loads `config/mongoose.plugins` (Mongoose-9 legacy-hook shim).
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.
- Side-fix: enrolled two pre-existing **dark** tests
  (`spasticity-injection-{api,behavioral}-wave715`) the `wave-tests-in-sprint`
  guard flagged.

**Verify:** W825 15/15 ✅ · W340 guard ✅ · sprint meta-guards 230/230 ✅
· `check:routes-load` 546 ✅.

---

## Batch 4 — DocumentVersion collision + Clinical behavioral tests

**P1 data-integrity (W340 Pattern D rename)**

- `backend/services/documents/documentVersioning.service.js`: rich version-
  snapshot model → registered as **`DocumentVersionSnapshot`** (collection
  `document_versions`). Canonical `DocumentVersion` (`models/DocumentVersion.js`)
  now registers in exactly one file.
- `no-duplicate-model-registration-wave340.test.js`: `DocumentVersion` removed
  from baseline (ratchet-down) with rationale.

**Behavioral tests (new)**

- `backend/__tests__/clinical-routes-behavioral-wave826.test.js` — runtime
  coverage for `seizure-log` + `safeguarding` (highest-sensitivity surfaces):
  cross-branch 404 (emphasis on no child-protection leak), invalid-ObjectId 400,
  review-lock (PATCH after review → 409; re-review → 409), safeguarding triage
  transition (own 200, second triage 409).
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.

**Verify:** W826 10/10 ✅ · combined W340 + behavioral + meta-guards + service
tests 256/256 ✅ · `check:routes-load` 546 ✅ · no lint.

---

## Batch 5 — W340 cluster triage + more clinical behavioral tests

**W340 remaining single-file collisions — triaged**

Investigated `FormTemplate`, `FormSubmission`, `ImportExportJob`, `DigitalSignature`,
`GoalBank`. Unlike `DocumentShare`/`DocumentVersion` (canonical had zero
consumers), here the **canonical `models/*.js` are live** (consumed by routes:
`public-forms`, `forms-submission`, `visitor-auth`, `audit-reviews`,
`importExportPro`) while the **documents-pro services are also live**. A Pattern D
rename would switch a live service to its own schema/collection — a
data-location change. `GoalBank` service (`rehabilitation-services/`) is live with
a divergent schema; `DigitalSignature` is service-vs-service (no canonical).

**Decision:** DEFER this cluster to an ADR (matches the W340 doctrine note that
these need an "ADR-031-style" decision). Not an autonomous-safe edit — no change
made.

**Behavioral tests (new)**

- `backend/__tests__/clinical-routes-behavioral-wave827.test.js` — runtime
  coverage for `respite` (W363) + `diet-prescription` (W368): cross-branch 404,
  invalid-ObjectId 400, transition discipline (respite approve requested→approved
  then 409; reject-missing-reason 400; diet activate draft→active then 409;
  activate invalid-discipline 400).
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.

**Verify:** W827 12/12 ✅ · sprint meta-guards 229/229 ✅ · no lint.

---

## Batch 6 — more clinical behavioral tests + wave renumber

**Behavioral tests (new)**

- `backend/__tests__/clinical-routes-behavioral-wave828.test.js` — runtime
  coverage for `facility-asset` (W369), `assistive-device` (W359),
  `transition-plan` (W361): cross-branch 404, invalid-ObjectId 400, transition
  discipline (facility out-of-service requires reason → 400, then OOS → return;
  assistive retire requires reason → 400, then retired; transition start requires
  plannedTransitionDate → 400, then draft→in_progress, second start 409).

**Wave-number collision fix (mid-session)**

- A new commit `decec4903 — W825 (HR webhooks + sprint HR/clinical guards)` landed
  during the session, claiming **W825** and rewriting `sprint-tests.txt` (dropping
  my uncommitted entries). Committed max became W825.
- Renamed `phase-b-routes-behavioral-wave825` → **`...-wave829`** (W825 now
  belongs to `hr-webhooks-mount-wave825`). `clinical-...-wave826/827/828` are free.
- Re-enrolled all four behavioral tests + the two dark `spasticity-injection-*-
wave715` tests in `sprint-tests.txt` + re-synced `sprint-tests.yml`.
- `check:wave-collision` ✅ "No wave-number collisions detected."

**Verify:** W828 15/15 ✅ · W829 + W826 + W827 + W828 + sprint meta-guards
267/267 ✅ · `check:wave-collision` ✅ · no lint.

---

## Batch 7 — AAC / adaptive-sports / CBAHI behavioral tests

**Behavioral tests (new)**

- `backend/__tests__/clinical-routes-behavioral-wave830.test.js` — runtime
  coverage for `communication-aid`/AAC (W358), `adaptive-sports` (W362), and
  `cbahi` (W360/W367): cross-branch 404, invalid-ObjectId 400, plus
  transition/validation discipline — AAC activate requires primaryModality (400)
  then draft→active; adaptive-sports activate draft→active then second 409 and
  high-demand sport requires medical clearance (400); CBAHI `/standards` registry
  endpoint (200), attestation isolation, and attest invalid-status 400 / valid 200.
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.

**Verify:** W830 16/16 ✅ · W830 + sprint meta-guards 232/232 ✅ ·
`check:wave-collision` ✅ · no lint.

---

## Batch 8 — Rights/Voice deeper lifecycle behavioral tests

**Behavioral tests (new)**

- `backend/__tests__/rights-voice-lifecycle-behavioral-wave831.test.js` —
  exercises the actual STATE MACHINES + Wave-18 invariants (W829 only covered
  isolation):
  - decision-rights: finalize draft→finalized (autonomy layer, 200);
    record-outcome blocked before finalize (409) / allowed after (200);
    supported-layer finalize requires supportArrangement (400 → 200);
    re-finalize when finalized (409).
  - self-advocacy: module start invalid rightCode (400); module op on
    foreign-branch plan (404); start→in_progress; completing all 5 rights
    auto-finalizes the plan to `completed` (pre-save hook) then module ops 409;
    hold (active→on_hold) + resume.
  - Uses the decision-rights.lib thresholds (≥10 autonomy / ≥6 supported / <6
    substituted) to deterministically drive the layer-dependent invariant.
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.

**Verify:** W831 9/9 ✅ · W831 + sprint meta-guards 226/226 ✅ ·
`check:wave-collision` ✅ · no lint.

---

## Batch 9 — IQ-assessments IDOR fix (dead branch checks activated)

**Security fix (real IDOR, clinical PII)**

- **Finding:** `routes/iq-assessments.routes.js` (W714) imports and CALLS
  `assertBranchMatch` / `branchFilter` / `enforceBeneficiaryBranch`, but the
  router was mounted in `app.js` WITHOUT `requireBranchAccess`, and there is no
  global `requireBranchAccess` (verified in `app.js` + `server.js`). Those
  helpers all short-circuit to a no-op when `req.branchScope` is absent — so
  every branch check was **silently dead**: a restricted examiner in branch A
  could read any branch's IQ scores (FSIQ, indices) by guessing an ObjectId.
  Secondary bug: the `:id` catch blocks returned `500` instead of the helper's
  `err.status` (403), masking the denial.
- **Fix (`routes/iq-assessments.routes.js`):** mount `router.use(requireBranchAccess)`
  (activates the existing intended checks) + map `res.status(err.status || 500)`
  in all four handlers so cross-branch access returns a clean 403.
- **Guard:** added W832 regression assertions to `iq-assessments-routes-wave714.test.js`
  ([22b] requireBranchAccess mounted; [22c] err.status honored).

**Behavioral test (new)**

- `backend/__tests__/iq-assessments-branch-isolation-behavioral-wave832.test.js` —
  boots the real router with a restricted therapist on branch A (+ satisfied MFA
  actor so real `requireMfaTier` passes); proves own-branch 200, foreign-branch
  GET `:id` + `:id/report` → 403 (no PII leak), invalid ObjectId → 400.
- Enrolled in `sprint-tests.txt` + synced to `sprint-tests.yml`.

**Verify:** W832 5/5 ✅ · W714 static guard (now 39 assertions) ✅ ·
`no-broken-req-branchid-wave269h` ✅ · sprint meta-guards 221/221 ✅ ·
`check:routes-load` 546 ✅ · `check:wave-collision` ✅ · no lint.

---

## Batch 10 — systematic IDOR-class sweep + drift guard

Generalised the W832 finding. A node scan found **6** route files that call
`branchFilter(req)` / `assertBranchMatch(req,…)` / `enforceBeneficiaryBranch(req,…)`
(all no-ops without `req.branchScope`) but never mount `requireBranchAccess`.

**Fix (confirmed + sensitive)**

- `routes/beneficiary-lifecycle.routes.js`: mounted `router.use(requireBranchAccess)`
  in the factory. Its bootstrap (`startup/beneficiaryLifecycleBootstrap.js`)
  mounts `authenticate → loadMfaActor → router` with NO branch guard, so
  `branchScopedBeneficiaryParam` + `assertBranchMatch` + `effectiveBranchScope`
  were ALL dead — beneficiary state-transition data was cross-branch readable.
  authenticate runs first at mount, so `req.user` is present for requireBranchAccess.

**Drift guard (institutional prevention)**

- `backend/__tests__/branch-scope-mount-drift-wave833.test.js` — static guard:
  any route file using a scope-dependent helper without `requireBranchAccess`
  fails CI. Ratchet-down baseline (`KNOWN_UNGUARDED_ROUTES`) holds the **5**
  remaining pre-existing gaps (assessmentRecommendation, equity, purchasing,
  rehab-licenses, stories) — each needs intent confirmation (branch-scoped vs
  org-wide) before remediation, so they are baselined rather than swept blindly.
  Also asserts iq-assessments + beneficiary-lifecycle stay fixed.
- Enrolled in `sprint-tests.txt` + synced.

**Note:** the parallel session's commit reverted my Batch-2 `hr-performance`
`assertBranchMatch` hardening (now only `effectiveBranchScope`) — visible proof
the uncommitted work is being overwritten; recommend committing.

**Verify:** W833 6/6 ✅ · `no-broken-req-branchid-wave269h` ✅ · sprint
meta-guards 221/221 ✅ · `check:routes-load` 546 ✅ · `check:wave-collision` ✅
· no lint.

---

## Cumulative results

| Area                            | Outcome                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch isolation (security)     | CAPA, leave-requests, hr-performance hardened (IDOR + spoofing closed); iq-assessments dead-branch-check IDOR activated (W832)                                               |
| Code cleanup                    | documentAdvanced duplicate middleware removed (×72)                                                                                                                          |
| W340 data-integrity (Pattern D) | `DocumentShare` + `DocumentAccessLog` + `DocumentVersion` collisions closed                                                                                                  |
| New behavioral tests            | Rights/Voice (W829, 15) + Clinical (W826, 10) + Clinical-2 (W827, 12) + Clinical-3 (W828, 15) + Clinical-4 (W830, 16) + Rights/Voice lifecycle (W831, 9) = **77 live tests** |
| Gates                           | `check:routes-load` 546 ✅, W340 ✅, sprint meta-guards ✅, `check:wave-collision` ✅                                                                                        |

## Wave numbers used

- **W829** — `phase-b-routes-behavioral-wave829.test.js` (Rights/Voice behavioral; renumbered from W825 after a committed W825 collision).
- **W826** — `clinical-routes-behavioral-wave826.test.js` (seizure-log + safeguarding behavioral).
- **W827** — `clinical-routes-behavioral-wave827.test.js` (respite + diet-prescription behavioral).
- **W828** — `clinical-routes-behavioral-wave828.test.js` (facility-asset + assistive-device + transition-plan behavioral).
- **W830** — `clinical-routes-behavioral-wave830.test.js` (communication-aid/AAC + adaptive-sports + cbahi behavioral).
- **W831** — `rights-voice-lifecycle-behavioral-wave831.test.js` (decision-rights + self-advocacy deeper state-machine behavioral).
- **W832** — iq-assessments IDOR fix (`routes/iq-assessments.routes.js` + `iq-assessments-branch-isolation-behavioral-wave832.test.js`); mounts requireBranchAccess to activate dead branch checks + maps err.status.
- **W833** — beneficiary-lifecycle IDOR fix (`routes/beneficiary-lifecycle.routes.js`) + `branch-scope-mount-drift-wave833.test.js` drift guard (baselines 5 remaining unguarded routes, ratchet-down).

(Latest committed wave at session start was ~W824; numbers chosen to avoid
collision. Not committed — re-verify free numbers at commit time per the
`check:wave-collision` gate.)

## Reusable harness pattern (for future behavioral route tests)

```js
jest.unmock('mongoose');
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));
// beforeAll: MongoMemoryServer → connect → require('../config/mongoose.plugins')
//   → require models → mockAuthState.user = restricted therapist on branch A.
// requireBranchAccess + branchFilter run REAL → genuine cross-branch isolation.
```

## Open follow-ups (next batches)

- ~~Reapply lost Batches 1–4~~ — **done W834** (committed `8aa3e7102`).
- ~~Fix `purchasing.routes.js` W833 baseline~~ — **done W834**.
- ~~W340 Pattern D (GoalBank, ImportExportJob, FormTemplate/Submission, TherapyProtocol, DigitalSignature)~~ — **done W835**.
- ~~Behavioral tests for CAPA + leave-requests~~ — **done W835/W836**.
- ~~hr-performance behavioral + branchId schema~~ — **done W837** (`hr-performance-branch-isolation-behavioral-wave837` + `PerformanceEvaluation.branchId`).
- ~~WorkflowDefinition/WorkflowInstance document-service collisions~~ — **done W837** Pattern D (`DocumentOrch*` + `DocumentEngineWorkflowInstance`).
- ~~CAPA POST /:id/transition behavioral~~ — **done W838** (`capa-transition-behavioral-wave838`).
- ~~leave-requests approve/reject cross-branch 403~~ — **done W839** (`leave-requests-mutations-behavioral-wave839`).
- ~~ApprovalRequest W340 Tier 1 Pattern D (legacy + document chains)~~ — **done W839** (`LegacyHrApprovalRequest`, `DocumentChainApprovalRequest`; canonical stays in `authorization/approvals/`).
- ~~ReportTemplate W340 Tier 1 Pattern D~~ — **done W840** (`DocumentReportTemplate`, `EnterpriseProReportTemplate`; canonical stays in `models/reports/ReportTemplate.js`).
- ~~CAPA OPEN→IN_PROGRESS→IMPLEMENTED chain~~ — **done W840** (`capa-lifecycle-behavioral-wave840`).
- ~~CAPA IMPLEMENTED→VERIFIED→CLOSED + MFA tier 2 gate~~ — **done W841** (`capa-close-behavioral-wave841`).
- ~~IQAssessment phantom ref Episode~~ — **done W841** (`ref: 'EpisodeOfCare'` per W325c).
- ~~W340 Tier 2 comm/doc/whatsapp Pattern D~~ — **done W842** (`AdminCommCorrespondence`, `DocumentEmailTemplate`, `CommWhatsApp*`, `WhatsAppSyncTemplate`).
- ~~CAPA behavioral enforceMfa parity~~ — **done W842** (W835/W838/W840 wired `enforceMfa: true`).
- ~~GeneratedReport + Event W340 Tier 2~~ — **done W843** (`DocumentGeneratedReport`, `RehabSpecializedEvent`, `EventStoreEntry`).
- ~~CAPA OPEN→REJECTED behavioral + service-layer validateTransition~~ — **done W843** (reasonCode + MFA tier 2; fixes hook priorDoc blind spot).
- ~~CAPA OPEN→CANCELLED behavioral~~ — **done W844** (`capa-cancel-behavioral-wave844`).
- ~~Payroll + EnterprisePro/doc cluster Pattern D~~ — **done W844** (`SaudiHrPayroll`, `DocumentComplianceAlert`, `DocumentCalendarEvent`, `EnterprisePro*` renames).
- ~~EnterpriseProPlus talent/facility + Warehouse Pattern D~~ — **done W845** (`EnterpriseProWarehouse`, `EnterpriseProPlusJobPosting/JobApplication/Facility`).
- ~~EnterpriseProPlus vendor/ITSM/strategic Pattern D~~ — **done W846** (`EnterpriseProPlusVendor`, `VendorEvaluation`, `ChangeRequest`, `StrategicInitiative`).
- ~~NotificationLog collision (ADR-031)~~ — **done W847** (`UserNotification` inbox + `NotificationDeliveryLog` delivery audit).
- Remaining W340 cluster: documents-pro `WorkflowDefinition` umbrella, `LifecyclePolicy`, `Student`, …
- ~~W848 CAPA IN_PROGRESS→REJECTED + trio Pattern D~~ — **done** (`da1ad9a8d`, pushed `main`).
- ~~W849 duplicate-model baseline closure~~ — **done** (`a46f1f6fe`, pushed `main`):
  - `DocumentLifecyclePolicy` (`documentLifecycle.service.js`; TTL `LifecyclePolicy` ALLOWLIST-only).
  - `MontessoriStudent` + `TransportStudent`; canonical `Student` in `student-service.js`.
  - EnterpriseProPlus: 15 unprefixed models → `EnterpriseProPlus*` (Candidate, RFQ, Safety*, IT*, …).
  - `KNOWN_DUPLICATE_REGISTRATIONS` baseline **EMPTY**.
- Open: ADR-020 Student↔Beneficiary; ZKTeco DATA merge (`zkteco-device-merge.js --execute`, operator + DB).
- ~~W852 zktecodevice case-variant~~ — **done (pending push)**:
  - `ZktecoDevice` model renamed → `ZktecoLegacyDevice`, collection pinned `zktecodevices` (no data move).
  - `AttendanceLog.deviceId` ref + migration-script comment updated.
  - `KNOWN_CASE_VARIANTS` baseline now **EMPTY**. Both W340 baselines (duplicate + case-variant) cleared.
- ~~W853 Phase B routes behavioral coverage (voice-log)~~ — **done** (`b91c1d7e3`, pushed `main`):
  - `voice-log-routes-behavioral-wave853.test.js` (11 tests): real Express + branchScope + MongoMemoryServer, auth mocked only.
  - Covers create/enum-400/anti-substitution invariant, cross-branch 403 + list isolation, CRPD directPct, action→supersede→409 state machine, DELETE role gating (therapist 403 / admin 200).
  - Next Phase-B behavioral targets: `decision-rights-routes` (W515), `self-advocacy-routes` (W518).
- ~~W854 decision-rights routes behavioral~~ — **done (pending push)**: 18 tests — create/layer-routing
  (autonomy/supported/substituted), cross-branch 403, finalize invariant chain (Layer 2/3
  supportArrangement, advocate on restraint/substituted), re-finalize 409, record-outcome ordering,
  DELETE role gating.
- ~~W855 self-advocacy routes behavioral~~ — **done (pending push)**: 14 tests — singleton 409,
  module start/complete/skip, auto-finalize at 100% (5/5 rights), partial %, hold/resume lifecycle,
  cross-branch read isolation, DELETE role gating.
- Phase B routes behavioral coverage **COMPLETE** (voice-log W853 + decision-rights W854 + self-advocacy W855).
- ~~W851 ADR-032 case variants (4 of 5)~~ — **done** (`9bbdcbeba`, pushed `main`):
  - `DashboardKPIDefinition`, `OrganizationAIPrediction`, `LegacyELearningCourseShell`, `HrUnifiedPolicy` + `HrModulePolicy`.
  - Case-variant baseline: only `zktecodevice` remains.
- ~~W850 case-variant + EnterprisePro closure~~ — **done** (`b4563066b`, pushed `main`):
  - ICF route → canonical `ICFAssessment` + nested flatten helper; fixed async pre-save hook.
  - `RehabLegacyAacProfile` (aac-therapy-protocols); `CarePsychMdtMeeting` (psych care).
  - EnterprisePro: 12 unprefixed `reg()` names → `EnterprisePro*` scoped registrations.
  - Case-variant baseline ratchet: cleared `icfassessment`, `aacprofile`, `mdtmeeting`.
