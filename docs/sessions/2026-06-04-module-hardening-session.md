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
- ~~W854 decision-rights routes behavioral~~ — **done** (`9840b3b35`, pushed `main`): 18 tests — create/layer-routing
  (autonomy/supported/substituted), cross-branch 403, finalize invariant chain (Layer 2/3
  supportArrangement, advocate on restraint/substituted), re-finalize 409, record-outcome ordering,
  DELETE role gating.
- ~~W855 self-advocacy routes behavioral~~ — **done** (`9840b3b35`, pushed `main`): 14 tests — singleton 409,
  module start/complete/skip, auto-finalize at 100% (5/5 rights), partial %, hold/resume lifecycle,
  cross-branch read isolation, DELETE role gating.
- Phase B routes behavioral coverage **COMPLETE** (voice-log W853 + decision-rights W854 + self-advocacy W855).
- **Systematic IDOR audit (2026-06-04)**: grep `findById(req.params|findByIdAndUpdate(req.params|findByIdAndDelete(req.params`
  across `routes/` surfaced ~60 files; the high-signal subset is branch-aware files (import `branchFilter`, scope
  their lists/stats) whose INSTANCE endpoints still use bare `findById`. Confirmed leaks fixed: `complaints` (W866),
  `mdt-coordination` (W867+W868), `mar` (W869), `waitlist-admin` (W870), `telehealth` (W871),
  `controlledDocument` (W872), `calibration` (W873), `evidence` (W874), `laundry` (W875),
  `kitchen` (W876), `warehouse` (W877), `pharmacy` (W878), `toileting` (W879),
  `invoices-admin` (W880), `referrals-admin` (W881), `nps-admin` (W882),
  `beneficiary-day-attendance` (W883), `events-management` (W885),
  `contract-management` (W886), `therapy-sessions-admin` (W887), `cpe-admin` (W888),
  `guardians` (W889), `parent-portal-v1 ownership` (W890), `family-home-program` (W891),
  `waitlist-capacity-optimizer` (W892), `waitlist-offer-batch` (W893),
  `waitlist-schedule-suggestions` (W894), `claims-denial-precheck` (W895),
  `clinical-pathway-engine` (W896), `equity-outcome-benchmarking` (W897),
  `outcomes-admin-branch-isolation` (W898), `clinical-docs` (W899),
  `care-plans-admin` (W900), `emr-routes` (W901), `medical-referrals` (W902),
  `insurance-claims` (W903), `payroll-routes` (W904), `episodes-routes` (W905),
  `icf-assessments` (W906), `smart-assessment-routes` (W907).
  Still open / deferred: `crisis` (ambiguous — see below), `medicalEquipment`/`asset-management`
  (models lack branch/center — need schema + product intent), `meetings`/`strategicPlanning`
  (no branchId on model — org-wide or needs schema), `medication catalog` + `MenuItem` (org-wide
  by design). **`crisis.routes.js` deliberately NOT touched**: its create handlers don't stamp `branchId` and its list
  endpoints aren't branch-scoped (only the dashboard aggregations are), and EmergencyPlans may be org-wide safety
  infrastructure — applying branch isolation there is a design decision needing product input, not an autonomous fix.
- ~~W867 MDT-coordination cross-branch IDOR fix (meetings CRUD) + regression~~ — **done** (`d50841673`, pushed `main`): **security fix** —
  `mdt-coordination.routes.js` `GET /meetings/:id` (no authorize gate → any restricted user) + `PUT /meetings/:id`
  (authorize ['admin','manager'] — manager is branch-level) + `DELETE /meetings/:id` used bare findById/
  findByIdAndUpdate/findByIdAndDelete → cross-branch read/rewrite of MDT meetings (beneficiary names + MRNs + clinical
  case discussion). Added `branchFilter(req)` to the 3 primary MDTMeeting CRUD instance endpoints + 6-test regression
  guard. **Follow-up W868**: the same file's MDTMeeting sub-resource endpoints (attendees/cases/action-items) +
  ALL UnifiedRehabPlan + ReferralTicket instance endpoints carry the identical leak (~20 endpoints) — same one-line
  fix each, deferred to keep this change reviewable.
- ~~W869 MAR (medication record) IDOR fix + behavioral~~ — **done** (`698e2b832`, pushed `main`): **security fix** —
  `mar.routes.js` mounted `bodyScopedBeneficiaryGuard` (W441) but **NOT `requireBranchAccess`**, so `req.branchScope`
  was never set → the guard was INERT and the instance endpoints (administer/refuse/hold/patch/delete + GET /today +
  GET /by-beneficiary) used bare findById → a nurse in branch A could read/administer/refuse/hold/delete ANY branch's
  medication records by ObjectId guess (the worst of the lot — medication safety). Fix: mounted `requireBranchAccess`
  (activates the existing guard), stamped `branchId` from the caller scope on both create paths, and added
  `branchFilter(req)` to all instance lookups + the two list endpoints. + `mar-routes-branch-isolation-wave869.test.js`
  (9 tests) proves create branch-stamping, foreign-beneficiary 403 (guard now active), cross-branch 404 on every
  instance path, and the controlled-drug-witness + administer/refuse lifecycle. Existing W191b model test still green.
  **riskAssessment**: audited — org-wide by design (no `branchId`, no `branchFilter` anywhere, org-level risk types) →
  NOT a leak, no change.
- ~~W870 waitlist-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — W451 closed PATCH /:id
  but offer/enroll/withdraw/DELETE still used bare `findByIdAndUpdate`/`findByIdAndDelete` and list/overview/prioritized
  ignored `branchFilter` → a receptionist in branch A could transition or delete branch-B waitlist rows (prospect PII +
  service-line priority). Fix: branch-scoped `statusTransition` + DELETE, `buildFilter(q, req)` merges `branchFilter`,
  overview/prioritized scoped, POST stamps `branchId` from caller scope. + `waitlist-admin-branch-isolation-wave870.test.js`
  (10 tests) + W451 drift guard extended.
- ~~W871 telehealth IDOR closure~~ — **done** (local, not yet pushed): **security fix** — telehealth models use legacy
  `branch` field; instance endpoints (`GET/PATCH/DELETE consultations`, prescriptions, availability slots, device readings,
  virtual-session whiteboard) used bare `findById` despite `requireBranchAccess` → any authenticated user could read/update
  foreign-branch teleconsultations (beneficiary PHI + clinical notes) by ObjectId guess. Fix: `telehealthBranchFilter(req)`
  maps canonical `branchFilter` → `{ branch }`, applied via `scopedById` on every instance lookup (zero bare `findById`
  remain in file). + `telehealth-routes-branch-isolation-wave871.test.js` (5 tests).
- ~~W872 controlled-document IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `ControlledDocument`
  carries `branchId` but GET /:id + every mutation path (`draftNewVersion`, `signVersion`, `revokeSignature`,
  `transitionVersion`, `acknowledgeRead`) used bare `_load(id)` with NO branch filter; list/dashboard passed raw
  `?branchId` without merging `branchFilter(req)` for restricted callers. Any authenticated user could read/draft/sign
  foreign-branch QMS documents (policy/SOP content + Part 11 signature chain) by ObjectId guess. Fix: optional
  `scopeFilter` threaded through service `_load` + all route-facing methods; `listScope(req)` on list/dashboard; POST /
  stamps `branchId` from caller scope; `requireBranchAccess` on every `/:id` route. + `controlled-document-branch-
isolation-wave872.test.js` (5 tests). Existing W277f MFA + service tests still green.
- ~~W873 calibration IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `CalibrationAsset` carries
  `branchId` but GET /:id lacked `requireBranchAccess` and every mutation (`recordCalibration`, `setStatus`) used bare
  `_load(id)` → a facility manager in branch A could read/record-calibration/retire branch-B JCI/MOH register assets by
  ObjectId guess. Fix: optional `scopeFilter` threaded through service `_load` + all route-facing methods; `listScope(req)`
  on list/dashboard; POST stamps `branchId` from caller scope; `requireBranchAccess` on every instance route. +
  `calibration-routes-branch-isolation-wave873.test.js` (5 tests). Existing `calibration.test.js` + W277g MFA tier test
  still green.
- ~~W874 evidence-vault IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `EvidenceItem` carries
  `branchId`; GET /:id had `requireBranchAccess` but `findById`/`_load` ignored `branchFilter`, and list/stats/expiring/
  by-control/by-regulation passed raw `?branchId` without merging caller scope → verify/revoke/sign/supersede/legal-hold
  shared the same leak. Any branch-restricted quality manager could read or mutate foreign-branch compliance evidence by
  ObjectId guess. Fix: optional `scopeFilter` threaded through vault service `_load` + all mutation/list/stats methods;
  `listScope(req)` on list/stats; every instance route passes `branchFilter(req)`; POST ingest + upload stamp `branchId`
  from `req.branchScope` (upload no longer trusts `req.user.branchId`). + `evidence-routes-branch-isolation-wave874.test.js`
  (5 tests; uses `quality_manager` not `compliance_officer` — latter is CROSS_BRANCH). Existing `evidence-vault-service.test.js`
  still green.
- ~~W875 laundry IDOR closure~~ — **done** (local, not yet pushed): **security fix** — laundry models use legacy
  `center` (ref Branch); instance endpoints + dashboard used bare `findById`/`countDocuments()` with no center filter
  despite `requireBranchAccess` → a branch manager could read/update foreign-center laundry orders (beneficiary linen
  tracking) by ObjectId guess. Fix: `laundryCenterFilter(req)` maps `branchFilter` → `{ center }`, applied via
  `scopedById`/`mergeListFilter` on every instance lookup + list + dashboard; POST stamps `center` from caller scope. +
  `laundry-routes-branch-isolation-wave875.test.js` (4 tests). Existing `laundry.routes` unit test still green.
- ~~W876 kitchen IDOR closure~~ — **done** (local, not yet pushed): **security fix** — DailyMenu /
  MealService / KitchenInventory use `center` (ref Branch); instance + list + dashboard ignored center
  filter despite `requireBranchAccess`. MenuItem catalog intentionally org-wide (no center field).
  Fix: `kitchenCenterFilter(req)` + `scopedById` on center-bearing entities; POST stamps `center`.
  - `kitchen-routes-branch-isolation-wave876.test.js` (3 tests).
- ~~W877 warehouse IDOR closure~~ — **done** (local, not yet pushed): **security fix** — Warehouse
  carries `branchId` but CRUD + items/transactions/dashboard used bare `findById` and list passed raw
  `?branch=` (wrong field). Fix: `branchFilter` on warehouse CRUD; `assertWarehouseInScope` on
  nested items/transactions; dashboard aggregations scoped. + `warehouse-routes-branch-isolation-wave877.test.js`
  (3 tests).
- ~~W878 pharmacy IDOR closure~~ — **done** (local, not yet pushed): **security fix** — Prescriptions
  and dispensing tie to `beneficiary` (no branchId on RX row). Pre-W878 instance endpoints used bare
  `findById` → cross-branch read/verify/cancel/dispense of medication orders. Medication catalog org-wide.
  Fix: `beneficiaryScopeFilter(req)` on list + `scopedPrescriptionById` / `scopedDispensingById`; POST
  paths call `enforceBeneficiaryBranch`. + `pharmacy-routes-branch-isolation-wave878.test.js` (3 tests).
- ~~W879 toileting IDOR closure~~ — **done** (local, not yet pushed): **security fix** — same class as
  pre-W869 MAR: `bodyScopedBeneficiaryGuard` mounted but NOT `requireBranchAccess` → guard inert;
  PATCH/DELETE used bare `findByIdAndUpdate`/`findByIdAndDelete`. Fix: mount `requireBranchAccess`,
  `branchFilter` on today/summary/by-beneficiary, `scopedById` on PATCH/DELETE, stamp `branchId` from
  caller scope on POST. + `toileting-routes-branch-isolation-wave879.test.js` (3 tests).
- ~~W880 invoices-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — W651 scoped
  `/stats` aggregates only; list + instance paths (`GET /`, `GET /:id`, PATCH, issue/pay/cancel/submit-to-zatca)
  still used bare `findById`. Fix: `listScope(req)` + `scopedById(req, id)` on every path; POST stamps `branchId`
  from `req.branchScope`; ZATCA prev-hash chain scoped to caller branch when restricted. +
  `invoices-admin-branch-isolation-wave880.test.js` (4 tests; seeds via `insertOne` — UniversalCode post-save
  hangs in test env without mock).
- ~~W881 referrals-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `ReferralTracking`
  carries `branchId` but file lacked `requireBranchAccess`; overview/trend/top-referrers/close-loop-gaps used
  `find({})`; PATCH/DELETE bare `findById`. Fix: mount `requireBranchAccess`, `listScope`/`scopedById`, POST
  stamps `branchId`. + `referrals-admin-branch-isolation-wave881.test.js` (5 tests).
- ~~W882 nps-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `NpsResponse` carries
  `branchId` but overview/trend/campaigns unscoped; PATCH/DELETE bare `findById`. Fix: same pattern as W881. +
  `nps-admin-branch-isolation-wave882.test.js` (5 tests).
- ~~W883 beneficiary-day-attendance IDOR closure~~ — **done** (local, not yet pushed): **security fix** — same
  class as pre-W869 MAR: `bodyScopedBeneficiaryGuard` without `requireBranchAccess`; list/today/summary allowed
  `?branchId` spoof; PATCH/DELETE bare `findById`; check-in trusted body `branchId`. Fix: mount
  `requireBranchAccess`, `listScope`/`scopedById`, stamp `branchId` from caller scope on check-in/mark/bulk. +
  `beneficiary-day-attendance-branch-isolation-wave883.test.js` (4 tests).
- ~~W885 events-management IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `EventManagement`
  model (in `_archived/dead-models/`) lacked `branchId`; list/dashboard/registrations used bare `findById` despite
  `requireBranchAccess`. Fix: added `branchId` to schema; `listScope`/`scopedById`/`assertEventInScope` on every
  instance path; POST stamps `branchId`; `safeModel()` fallback loads archived model when primary missing. +
  `events-management-branch-isolation-wave885.test.js` (3 tests).
- ~~W886 contract-management IDOR closure~~ — **done** (local, not yet pushed): **security fix** — `Contract` +
  `ContractTemplate` carry `branchId` but templates/contracts stats/list/dashboard/expiring-soon + every contract
  sub-route (parties, amendments, negotiations, sign, approve, …) used bare `findById`. Fix: `listScope`/`scopedById`/
  `loadContractOr404` on all instance paths; POST stamps `branchId` from `req.branchScope`. +
  `contract-management-branch-isolation-wave886.test.js` (4 tests; POST includes `liabilityInsurance` string — model
  nested `type: String` shorthand makes subdoc a String path). DELETE is admin-only (CROSS_BRANCH) → PUT used for
  instance isolation regression instead.
- ~~W887 therapy-sessions-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — admin therapy
  session CRUD filtered beneficiaries via manual `HQ_ROLES` + `req.user.branchId` (never set by middleware); POST
  create had no beneficiary scope check. Fix: mount `requireBranchAccess`; refactor `getScopedBeneficiaryIds` to
  `branchFilter(req)`; `assertBeneficiaryInScope` on POST create (instance paths already gated). +
  `therapy-sessions-admin-branch-isolation-wave887.test.js` (3 tests). **Note**: route comment says
  `/api/admin/therapy-sessions` but no explicit registry mount found — smoke tests expect full `app.js` wiring.
- ~~W888 cpe-admin IDOR closure~~ — **done** (local, not yet pushed): **security fix** — CPE records tie to
  `employeeId` (Employee uses `branch_id`); list/overview/export + PATCH/DELETE/verify used bare `findById`. Fix:
  mount `requireBranchAccess`; `employeeBranchFilter`/`scopedEmployeeIds`/`assertEmployeeInScope`/`cpeInstanceFilter`;
  scoped list, overview, export, mutations, employee sub-routes; POST create gated by employee scope. +
  `cpe-admin-branch-isolation-wave888.test.js` (4 tests).
- ~~W889 guardians IDOR closure~~ — **done** (local, not yet pushed): **security fix** — guardians surface had
  unrestricted instance reads/mutations (`GET/PUT/DELETE /:id`) plus global list/search despite branch-aware middleware.
  Guardian model has no `branchId`, so scope is derived from in-scope beneficiary links. Fix: added
  `guardianListScope` (via beneficiary `branchFilter`), `loadGuardianOr404` for instance ownership checks, scoped
  beneficiary fetch on details, scoped active-beneficiary count before soft-delete, and guardian-scope precheck in
  link/unlink paths; `guardianBeneficiaryClause` `$or` matches both ObjectId[] and
  `{ guardian }[]` stored shapes (Mongoose schema vs production docs). +
  `guardians-branch-isolation-wave889.test.js` (5 tests: list, get, put, delete, link).
- ~~W890 parent-portal-v1 ownership hardening~~ — **done** (local, not yet pushed): **security fix** — `guardianOwnsBeneficiary`
  relied on `Guardian.beneficiaries` only; if that array drifted stale, a guardian could still read foreign beneficiary
  endpoints (`/beneficiaries/:id/*`) despite missing reciprocal link on `Beneficiary.guardians`. Fix: rewired ownership
  check to authoritative beneficiary-side relation (`guardians.guardian` OR `primaryGuardian`) after resolving guardian
  by `userId`. + `parent-portal-v1-guardian-ownership-wave890.test.js` (2 tests) proves reciprocal-link allow and
  stale one-sided relation deny (404).
- ~~W891 family-home-program MVP (new module)~~ — **done** (local, not yet pushed): **feature + security hardening** —
  added `models/FamilyHomeProgram.js` and `routes/family-home-program.routes.js`, mounted via
  `features.registry.js` on `/api/(v1/)?family-home-program` using `dualMountAuth`. Surface includes create/list/details,
  task add, task completion log, progress summary. Branch isolation is first-class: route-level `requireBranchAccess`,
  beneficiary gate via `assertBeneficiaryInScope`, and instance gate via `findOne({ _id, ...branchFilter(req) })`.
  Create stamps `branchId` from the beneficiary record (not caller input). +
  `family-home-program-routes-wave891.test.js` (4 tests: create in-scope, create cross-branch 404, foreign instance 404,
  list scoped by beneficiary branch).
- ~~W892 waitlist-capacity-optimizer MVP~~ — **done** (local, not yet pushed): **feature + branch-safe ops intelligence** —
  extended `waitlist-admin.routes.js` with `GET /optimizer/recommendations` that fuses branch-scoped waiters
  (`WaitingListEntry`) with branch-scoped appointment throughput (`Appointment`) to compute offer recommendations
  per service line. Algorithm factors historical completed/no-show rates + upcoming load and returns:
  `summary`, `byServiceType`, and queue-ordered `recommendations` (priority + wait-age aware). +
  `waitlist-capacity-optimizer-wave892.test.js` (2 tests): restricted branch sees only local recommendations;
  cross-branch admin sees union across branches.
- ~~W893 waitlist auto-offer batch (safe apply mode)~~ — **done** (local, not yet pushed): **feature + controlled mutation** —
  added `POST /optimizer/offer-batch` to `waitlist-admin.routes.js`. Default behavior is `dryRun` (preview only);
  applying requires explicit `{ apply: true }`. The endpoint reuses optimizer recommendations, selects top N, and
  transitions scoped rows `waiting → offered` with `offerExpiresAt` from `WAITLIST_OFFER_DAYS`. Scope is enforced in
  the mutation query itself (`findOneAndUpdate({ _id, status:'waiting', ...branchFilter(req) })`) so foreign-branch
  rows are never touched. + `waitlist-offer-batch-wave893.test.js` (2 tests: dry-run no mutation; apply mutates only
  caller branch rows).
- ~~W894 waitlist schedule-suggestions optimizer~~ — **done** (local, not yet pushed): **feature + capacity UX layer** —
  added `GET /optimizer/schedule-suggestions` to `waitlist-admin.routes.js`. Endpoint builds on optimizer context and
  returns per-recommendation `suggestedWindows` (date/time slots) for the next horizon, excluding occupied slots from
  upcoming appointments (`PENDING|CONFIRMED|CHECKED_IN`) per service line. Branch isolation is inherited from optimizer
  scope, so restricted callers only receive their branch's entries while cross-branch admins get the union. +
  `waitlist-schedule-suggestions-wave894.test.js` (2 tests: scoped IDs + occupied-slot avoidance; cross-branch union
  for admin).
- ~~W895 claims denial-precheck MVP~~ — **done** (local, not yet pushed): **feature + submit safety gate** —
  enhanced `insuranceClaims.routes.js` with `GET /claims/:id/denial-precheck` and wired the same precheck into
  `PATCH /claims/:id/submit`. New checks flag critical blockers before submission (missing principal diagnosis,
  missing service codes, inactive/out-of-range contract, required pre-auth missing/unapproved/expired) plus warnings
  (totals mismatch, missing membership number). Submit now returns `409` with `{ precheck }` when blockers exist, and
  keeps claim status in `draft`. Also added beneficiary branch-scope enforcement on claim read + submit paths via
  `assertBeneficiaryInScope` to prevent cross-branch probing. +
  `insurance-claims-denial-precheck-wave895.test.js` (4 tests: precheck blockers, submit blocked, submit success after
  fixing blockers + approved pre-auth, foreign-branch 404).
- ~~W896 clinical-pathway engine MVP~~ — **done** (local, not yet pushed): **feature + pathway lifecycle** —
  added `models/ClinicalPathwayPlan.js` and `routes/clinical-pathway.routes.js`, mounted via
  `features.registry.js` on `/api/(v1/)?clinical-pathway` using `dualMountAuth`. Surface includes create/list/details,
  stage start, stage complete, and pathway progress summary. Branch isolation mirrors the hardened pattern:
  `requireBranchAccess` + beneficiary ownership gate (`assertBeneficiaryInScope`) + instance scope
  (`findOne({ _id, ...branchFilter(req) })`). Create stamps `branchId` from beneficiary record; stage completion updates
  current stage and auto-closes pathway when completion reaches 100%. +
  `clinical-pathway-routes-wave896.test.js` (4 tests: in-scope create, cross-branch create 404, foreign instance 404,
  progress 50% after first stage completion).
- ~~W897 outcome benchmarking MVP~~ — **done** (local, not yet pushed): **feature + branch-safe analytics** —
  expanded `equity.routes.js` with `GET /benchmarks/compare` and hardened `GET /benchmarks` branch filtering. New compare
  endpoint computes observed branch mean from real `ClinicalAssessment` scores (90-day default window) and compares it
  to the best published benchmark (branch benchmark preferred over national), returning `gap`, `targetValue`,
  `meetsTarget`, and `gapBand`. Hardened list endpoint now prevents restricted users from seeing other branches'
  `scope='branch'` benchmarks while still exposing non-branch scopes (national/regional/carf/da_publication). +
  `equity-outcome-benchmarking-wave897.test.js` (4 tests: restricted list isolation, cross-branch admin visibility,
  compare computation, foreign-branch compare denial).
- ~~W898 outcomes-admin branch isolation + explicit mount~~ — **done** (local, not yet pushed): **security hardening** —
  hardened `outcomes-admin.routes.js` by activating `requireBranchAccess`, applying `branchFilter(req)` to list/overview/
  export/beneficiary queries, and enforcing beneficiary ownership gates via `assertBeneficiaryInScope` on beneficiary-keyed
  reads. This closes cross-branch trajectory/export probing for restricted roles. Also added explicit app mounts in
  `app.js` at `/api/admin/outcomes` + `/api/v1/admin/outcomes` and excluded `outcomes-admin.routes` from generic
  auto-mount dedupe list to keep path contracts stable. +
  `outcomes-admin-branch-isolation-wave898.test.js` (4 tests: list isolation, foreign beneficiary 404, overview isolation,
  export excludes foreign branch rows).
- ~~W899 clinical-docs instance isolation~~ — **done** (local, not yet pushed): **security fix** —
  hardened `clinical-docs.routes.js` record-level read path by enforcing beneficiary-ownership branch checks on
  `GET /api/admin/clinical-docs/:id`, preventing cross-branch document retrieval by guessed ObjectId. +
  `clinical-docs-branch-isolation-wave899.test.js` (2 tests: in-scope 200, foreign-branch 404).
- ~~W900 care-plans-admin branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  applied branch scoping to both list and instance retrieval in `care-plans-admin.routes.js` so restricted users only
  enumerate/read care plans in their own branch. +
  `care-plans-admin-branch-isolation-wave900.test.js` (2 tests: list scoped to branch, foreign plan 404).
- ~~W901 EMR routes branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  tightened `emr.routes.js` medical-record read surfaces to enforce tenant scope on list + id-keyed access, closing
  cross-branch PHI exposure via direct record IDs. +
  `emr-routes-branch-isolation-wave901.test.js` (2 tests: scoped list, foreign record 404).
- ~~W902 medical referrals branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  hardened `medicalReferrals.routes.js` instance endpoints (`GET /:id`, `PATCH /:id/approve`) with branch ownership checks
  to block cross-branch referral disclosure and actioning. +
  `medical-referrals-branch-isolation-wave902.test.js` (2 tests: foreign referral read/action both 404).
- ~~W903 insurance claims branch isolation (instance + list)~~ — **done** (local, not yet pushed): **security fix** —
  completed tenant isolation in `insuranceClaims.routes.js` beyond W895 precheck by enforcing branch scope on list and
  instance update/read mutation paths (`GET/PUT /claims/:id`), preventing cross-branch claim probing/modification. +
  `insurance-claims-branch-isolation-wave903.test.js` (3 tests: scoped list, foreign GET 404, foreign PUT 404).
- ~~W904 payroll routes branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  hardened employee-scoped payroll reads in `payroll.routes.js` by resolving branch ownership through `Employee.branch_id`
  before exposing monthly payroll aggregates and id-keyed payroll rows. This closes cross-branch salary disclosure by
  guessed payroll ids under restricted HR roles. +
  `payroll-routes-branch-isolation-wave904.test.js` (2 tests: monthly list scoped, foreign payroll id 404).
- ~~W905 episodes routes branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  enforced branch scope in `episodes.routes.js` list and instance reads through tenant-filtered lookups
  (`findOne({ _id, ...branchFilter(req) })`) with `requireBranchAccess` active at router level. +
  `episodes-routes-branch-isolation-wave905.test.js` (2 tests: scoped list, foreign episode 404).
- ~~W906 icf-assessments routes branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  activated branch-aware filtering for `icf-assessments.routes.js` using beneficiary-derived scope + guarded
  id-keyed reads, preventing cross-branch access to ICF functional assessment payloads. +
  `icf-assessments-branch-isolation-wave906.test.js` (2 tests: scoped list, foreign assessment 404).
- ~~W907 smart-assessment routes branch isolation~~ — **done** (local, not yet pushed): **security fix** —
  tightened `smart-assessment-engine.routes.js` list/detail read surfaces (M-CHAT and shared `/detail/:type/:id`)
  through beneficiary-scope gating so restricted clinicians cannot enumerate or fetch assessments from foreign branches. +
  `smart-assessment-routes-branch-isolation-wave907.test.js` (2 tests: scoped list, foreign detail 404).
- ~~W909 crisis routes center-scoped isolation~~ — **done** (local, not yet pushed): **security fix** —
  legacy `crisis.model.js` stores tenant on `center` (ref Branch), not `branchId`. Mapped `branchFilter` →
  `{ center }` on plans/incidents/drills/contacts lists + all instance mutations + dashboard aggregates (fixes W608
  mismatch where aggregates used `branchId` on a `center` field). Create paths stamp `center` from `req.branchScope`. +
  `crisis-routes-branch-isolation-wave909.test.js` (2 tests: scoped incident list, foreign incident 404).
- ~~W912 asset-management branch-scoped sub-resources~~ — **done** (local, not yet pushed): **security fix** —
  `Asset` root model has no `branchId` (org-wide catalog — unchanged). Hardened branch-bearing children in
  `asset-management.routes.js`: work orders, transfers, bookings, inventories (`mergeTenantFilter` + `scopedById`,
  stamp `branchId` on create). +
  `asset-management-work-orders-branch-isolation-wave912.test.js` (2 tests: scoped WO list, foreign WO 404).
- **Deferred (product/schema)**: `meetings.routes.js` (Meeting has no branch field), `strategicPlanning.routes.js`
  (org-wide KPIs), `medicalEquipment.routes.js` (department ref only), bare `Asset` CRUD (no branchId on schema).
- ~~W884 Mongoose duplicate schema.index drift guard + 25-index cleanup~~ — **done** (local, not yet pushed; renumbered from W880 — W880 taken by invoices-admin isolation):
  - **Cleanup**: removed redundant `schema.index({field:1})` where the field already declares `unique:true`
    (or a duplicate compound unique) across 19 models — 25 warnings → 0 (AssetTransfer, Volunteer×3,
    document-pro services×8, InventoryStock×2, DailyAttendance compound, …).
  - **Guard**: `scripts/check-duplicate-schema-index.js` + `npm run check:duplicate-schema-index` +
    `__tests__/no-duplicate-schema-index-wave884.test.js` (empty baseline, ratchet-down).
  - **Pharmacy follow-up**: fixed production 500 on `GET /prescriptions` — `populate('prescriber','name')`
    → `fullName` (User schema); hardened W878 test seeds.
  - **Lifecycle tests**: W597/W601 updated to drive scope via `req.user.branchId` (W833 `requireBranchAccess`
    overwrites injected `req.branchScope`); W601 foreign `?branchId=` now expects 403 at middleware.
  - **ESLint**: 5 unused-var warnings cleared (maintenanceHub, purchasing, rehabLicenses).
  - **Verify**: W870–907 isolation+capacity+claims+pathway+benchmarking+outcomes-admin+clinical-docs+care-plans+emr+referrals+payroll+episodes+icf+smart-assessment batch — 37 suites / 126 tests ✅; + W884 + W597/W601 in full local gate; all 5 pre-push gates + lint ✅.
- ~~W868 MDT-coordination IDOR closure (remaining endpoints)~~ — **done** (`b7b337f9c`, pushed `main`): converted ALL 26 remaining
  bare instance lookups in `mdt-coordination.routes.js` to branch-scoped `findOne`/`findOneAndDelete` — 12 MDTMeeting
  sub-resource reads + 10 UnifiedRehabPlan (GET/:id + 7 sub-resource + DELETE) + 4 ReferralTicket (GET/:id + sub-resource
  - DELETE). The plan + referral GET /:id had NO authorize gate (any restricted user could read a foreign branch's rehab
    plan / referral: beneficiary names, MRNs, clinical reasons, specialist correspondence). + `mdt-coordination-branch-
isolation-wave868.test.js` (6 tests) proves plan + ticket reads are branch-scoped + admin-only delete. The whole file's
    instance surface is now branch-scoped (zero bare `findById(req.params)` remain). **Pre-existing unrelated bug noted**:
    several sub-resource POSTs do `Model.findOne(...).lean()` then `.save()` (lean POJO has no `.save()`) → 500; out of
    scope for this security wave (behavior preserved, not introduced).
- ~~W866 complaints cross-branch IDOR fix + behavioral~~ — **done** (`572b6013d`, pushed `main`): **security fix** —
  `complaints.routes.js` instance endpoints (GET/PUT/respond/escalate/resolve/rate/DELETE `/:id`) used bare
  `findById`/`findByIdAndUpdate` with NO branch filter (IDOR: restricted branch-A user could read/modify/resolve/
  delete a branch-B complaint's PII + grievance content by ObjectId guess). Added `branchFilter(req)` to all 7
  instance lookups (same W269/W447 pattern). + `complaints-routes-behavioral-wave866.test.js` (12 tests): create
  branch-stamping, cross-branch 404 regression guard on every instance path, lifecycle (respond/escalate/resolve/
  rate), write-role gating. Note: DELETE is admin-only (cross-branch by design) so its branch check is a no-op for
  admins — documented in the test.
- ~~W865 restraint-seclusion route behavioral~~ — **done** (`84d714323`, pushed `main`): 18 supertest tests — highest-stakes
  physical-intervention ledger. start→end→notify-parent→complete→review state machine with completion gates
  (endTime + parent notification + debrief notes all required), type-specific intake (chemical→medication,
  seclusion→location), review immutability + role gating (therapist review 403), foreign-branchId-in-body
  rejected at branch-scope layer (403), cross-branch isolation, DELETE gating.
- ~~W864 cbahi route behavioral~~ — **done** (`c1432473f`, pushed `main`): 15 supertest tests — standards registry (catalog/by-key/chapters),
  per-(branch,standard) attestation singleton 409, attest met/score, evidence add/remove, dashboard compliance %
  computation (met + not_applicable), role gating (therapist 403), cross-branch isolation, DELETE gating.
  **Closes W356-W370 clinical-series route behavioral coverage (13 surfaces).**
- ~~W863 adaptive-sports + facility-asset route behavioral~~ — **done** (`359da53eb`, pushed `main`): 28 supertest tests.
  `adaptive-sports-routes-behavioral-wave863` (15): **medical-clearance activation gate** for high-demand
  sports (high+no-clearance → 400, clearance → activate 200), lifecycle, session/achievement subdocs,
  cross-branch. `facility-asset-routes-behavioral-wave863b` (13): PPM inspection flow (fail→inspection_failed
  - defects required, pass→restore), certificate mgmt, availability machine (OOS/return/maintenance),
    retire role gating, life-safety stats, cross-branch isolation.
- ~~W862 communication-aid + transition-plan route behavioral~~ — **done** (`0a92459f2`, pushed `main`): 27 supertest tests.
  `communication-aid-routes-behavioral-wave862` (12): AAC singleton 409, activation gate (primaryModality),
  activeTools[] add/remove subdocs + snapshot, role gating, cross-branch. `transition-plan-routes-behavioral-wave862b`
  (15): create/validation, readiness→start→complete lifecycle + composite scoring, milestone subdocs
  (add/update-achieved/delete), out-of-order 409s, cross-branch isolation, DELETE role gating.
- ~~W860 assistive-device route behavioral~~ — **done** (`dd326cc36`, pushed `main`): 17 supertest tests — catalog create+validation,
  full loan lifecycle (request→approve→check-out→return / cancel / mark-damaged) + device availability state machine,
  approve-vs-write role split, maintenance start/end + log, retire role gating + reason, cross-branch isolation,
  DELETE role gating.
- ~~W861 diet-prescription route behavioral~~ — **done** (`dd326cc36`, pushed `main`): 12 supertest tests — singleton 409,
  draft→active activation gate (prescriber discipline), NPO start/end + IDDSI-clear invariant, enteral start/stop,
  review (active-only) + discontinue (reason + PATCH-block), prescribe-role gating, cross-branch isolation, DELETE.
- ~~W858 seizure-log route behavioral~~ — **done** (`00c175d0f`, pushed `main`): 16 supertest tests — record+validation
  (type/beneficiary/endTime), cross-branch isolation (W445), parent/supervisor notify, review immutability
  (therapist 403 / supervisor 200 / re-review 409 / post-review PATCH+notify 409), status-epilepticus ≥300s
  analytics, DELETE role gating.
- ~~W859 respite route behavioral~~ — **done** (`00c175d0f`, pushed `main`): 16 supertest tests — request+validation
  (type/dates/emergency-contact), cross-branch 403/404, approve-vs-ops role split, full 8-state lifecycle
  (requested→approved→confirmed→checked_in→completed), out-of-order 409s, cancel/no-show terminals,
  DELETE role gating.
- ~~W857 safeguarding route behavioral coverage~~ — **done** (`f026ffe4c`, pushed `main`): 20 supertest tests
  (real Express + branchScope W444 + MongoMemoryServer; model + route distinct from the existing
  model-level W357 behavioral). Covers intake+validation, critical 1h-SLA invariant, 3-tier role
  gating (read/intake/investigate), full intake→triage→investigate→substantiate→authority→close
  state machine + out-of-order 409s, cross-branch isolation (GET/:id 404, list filter, foreign
  transition 404), DELETE role gating. Highest-stakes child-protection surface now route-tested.
- ~~W856 W340 scanner `safeModel` blind spot~~ — **done** (`70bbcc4e5`, pushed `main`): added `safeModel` to
  `HELPER_REGISTRATION_RE`; the `, <ident>Schema` guard means single-arg lookups (`safeModel('Document')`
  in routes/_) are ignored while genuine two-arg registrations (`HSE.js` SafetyIncident/SafetyInspection)
  are now counted. No new duplicates surfaced (EnterpriseProPlus Safety_ renamed in W850). Closes the
  last known scanner blind spot.
- ~~W851 ADR-032 case variants (4 of 5)~~ — **done** (`9bbdcbeba`, pushed `main`):
  - `DashboardKPIDefinition`, `OrganizationAIPrediction`, `LegacyELearningCourseShell`, `HrUnifiedPolicy` + `HrModulePolicy`.
  - Case-variant baseline: only `zktecodevice` remains.
- ~~W850 case-variant + EnterprisePro closure~~ — **done** (`b4563066b`, pushed `main`):
  - ICF route → canonical `ICFAssessment` + nested flatten helper; fixed async pre-save hook.
  - `RehabLegacyAacProfile` (aac-therapy-protocols); `CarePsychMdtMeeting` (psych care).
  - EnterprisePro: 12 unprefixed `reg()` names → `EnterprisePro*` scoped registrations.
  - Case-variant baseline ratchet: cleared `icfassessment`, `aacprofile`, `mdtmeeting`.
