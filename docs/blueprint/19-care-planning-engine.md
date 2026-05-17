# Care Planning Engine — Blueprint Runbook

**Waves 41–51 | Production-ready as of v4.0.X**

The Care Planning Engine is the canonical chokepoint for creating, validating, approving, executing, monitoring, and amending individual + group care plans for beneficiaries in the Al-Awael rehabilitation platform. It serves Saudi rehab centers across multiple branches and enforces PDPL, ISO 9001, and CBAHI requirements.

This document is the **single source of truth**. If something looks contradictory between the code and this doc, the code wins — open a PR to update the doc.

---

## 1. Engine vision (one paragraph)

A draft-first, evidence-bound, human-in-the-loop planning engine. AI proposes (Wave 44) → validator gates (Wave 41) → supervisor reviews + scores (Wave 17 scoring + Wave 47 reports) → approval seals an `evidenceHash` + appends to a hash-linked `signatureChain` → side-effects file the plan into the beneficiary record + dispatch a redacted family version → workers monitor for plateau / overdue / family-send failures and emit Insights or escalations. No AI output is final. No clinical detail leaks to the family. No plan modification escapes the audit trail.

---

## 2. Module map

```
backend/intelligence/
  care-planning.registry.js                   Wave 41  — 8 plan types / 13 statuses / 13 transitions / 17 rules
  care-plan-validator.service.js              Wave 41  — readinessScore §4.2 + confidence §3.2
  care-plan.service.js                        Wave 41  — state-machine driver (chokepoint)
  arabic-readability.service.js               Wave 43  — DARI-style grade estimator + forbidden-term tripwire
  family-version-generator.service.js         Wave 43  — Markdown generator with PDPL redaction
  care-plan-recommendation-builder.service.js Wave 44  — Input bundle + prompt + 11-layer validator
  care-plan-progress-reviewer.service.js      Wave 44  — Trend analysis + per-goal verdicts
  care-plan-side-effects.service.js           Wave 45  — 6 named handlers + retry schedule
  care-plan-audit-trail.service.js            Wave 45  — Multi-source merger + integrity verifier
  care-plan-programs-library.registry.js      Wave 46  — 10 programs + 8 tests + match helpers
  group-plan.service.js                       Wave 46  — Cohort + ratios + safety-incompat pairs
  care-plan-report-generator.service.js       Wave 47  — 6 internal report formats
  care-plan-explanation-generator.service.js  Wave 48  — Per-goal explanation block
  care-plan-role-views.service.js             Wave 48  — 4 role-specific views with redactionHash
  care-plan-llm-caller.service.js             Wave 48  — Anthropic wrapper with caching + retry
  care-plan-bootstrap.js                      Wave 48  — Composition root
  care-plan-family-retry.worker.js            Wave 50  — Backoff-aware retry runner
  care-plan-overdue-review.scanner.js         Wave 50  — Severity-tiered notification scanner
  care-plan-plateau-detector.scheduler.js     Wave 50  — Periodic progress review + Insight emission
  care-plan-metrics.service.js                Wave 50  — Prom facade with noop fallback

backend/models/
  CarePlanVersion.js                          Wave 41  — 11 sub-schemas + 7 invariants + signatureChain

backend/routes/
  care-plan.routes.js                         Wave 42→ — 25 endpoints under /api/v1/care-plans

backend/app.js                                Wave 49  — bootstrap mount block (≈ line 1956)

docs/
  api/openapi-care-planning.yaml              Wave 51  — OpenAPI 3.1 spec
  asyncapi/care-planning-events.yaml          Wave 51  — Event catalog
  dashboards/care-planning.grafana.json       Wave 51  — 12-panel dashboard
  alerts/care-planning.rules.yml              Wave 51  — 12 Prom alerts
  blueprint/19-care-planning-engine.md        Wave 51  — this file
```

---

## 3. State machine

```
draft
  └─> validation_pending
        └─> ready_for_submission
              └─> submitted_to_supervisor
                    ├─> under_review
                    │     ├─> approved ────> saved_to_record ─> family_notification_sent
                    │     ├─> revision_requested ──> draft (v+1) ──> resubmitted
                    │     └─> rejected ──> archived
                    │
                    └─> escalated_to_branch_manager
                          ├─> approved
                          └─> rejected
```

13 statuses, 13 transitions. **Terminal statuses** (no outbound except `supersede`): `archived`, `superseded`, `family_notification_sent`.

### Guards per transition

| Transition                                   | Hard guard                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `draft → validation_pending`                 | readinessScore ≥ 0 (anything; just runs validator)                                                                      |
| `validation_pending → ready_for_submission`  | hardFailures == 0 AND readinessScore ≥ 85                                                                               |
| `submitted_to_supervisor → under_review`     | reviewer != author                                                                                                      |
| `under_review → approved`                    | reviewerId != authorId, validation passes, scorecard.overall ≥ 7.0, planType not in always-escalate, rejectionCount < 2 |
| `under_review → escalated`                   | always for `intensive` and `multidisciplinary` plan types; or rejectionCount ≥ 2                                        |
| `approved → saved_to_record`                 | system or supervisor                                                                                                    |
| `saved_to_record → family_notification_sent` | familyVersion.body present; readabilityGrade ≤ 6                                                                        |

---

## 4. Invariants (CarePlanVersion model)

Enforced via the Wave-18 virtual-path pattern in [models/CarePlanVersion.js](../../backend/models/CarePlanVersion.js):

1. `status ∈ {approved, saved_to_record, family_notification_sent}` ⇒ reviewerId + approverId + non-empty signatureChain.
2. `status ∈ {approved, …}` ⇒ reviewerId != authorId AND approverId != authorId.
3. `status === 'superseded'` ⇒ supersededBy set.
4. `status === 'family_notification_sent'` ⇒ familyVersion.body present AND readabilityGrade ≤ 6.
5. `status === 'approved'` ⇒ validation.readinessScore ≥ 85 AND hardFailures.length === 0.
6. signatureChain integrity: every entry's `prevHash === chain[i-1].hash`.
7. Each amendment timestamp ≥ approvedAt.

**These invariants run at `save()` time** — they're not optional service-level checks. Wave 49 E2E tests verify them against real Mongoose.

---

## 5. PDPL & family-version guarantees

The Wave-43 family-version generator strips, redacts, and validates BEFORE any output:

- **8 hard-stripped fields** (recursive): `icd10`, `icdCodes`, `rawBaselineValues`, `evidenceRefs`, `confidence`, `internalNotes`, `therapistNotes`, `assessmentRawScores`.
- **14 forbidden clinical terms** (tripwire): `ICD`, `F84.0`, `F90.0`, `VB-MAPP`, `GARS`, `ADOS`, `CARS`, `WPPSI`, `WISC`, `PEP-3`, `ABLLS`, `baseline`, `evidence`, `confidence`, `assessment`, `evidenceRef`.
- **Readability target**: Arabic grade ≤ 6 (DARI-style estimator).
- **Word cap**: 600.
- **Goal cap**: 5 (sorted by priorityScore descending).
- **5 required sections**: `goals`, `family_role`, `home_program`, `next_review`, `contact_pathway`.

If ANY guarantee fails → `requiresRewrite: true` → HTTP 412 from route → `notify_family` transition refuses to fire.

---

## 6. Permission matrix

44 `care-plan.*` permissions in `governance.registry.js`. Highlights:

| Capability                         | Allowed roles                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `care-plan.draft.create`           | therapist, teacher                                                            |
| `care-plan.validation.run`         | therapist, teacher, clinical_supervisor                                       |
| `care-plan.review.scorecard`       | clinical_supervisor, branch_manager                                           |
| `care-plan.approve`                | clinical_supervisor, branch_manager                                           |
| `care-plan.reject`                 | clinical_supervisor, branch_manager                                           |
| `care-plan.amendment.apply`        | **branch_manager only**                                                       |
| `care-plan.family-version.preview` | therapist, teacher, clinical_supervisor, branch_manager                       |
| `care-plan.notify-family`          | clinical_supervisor, branch_manager                                           |
| `care-plan.audit-trail.read`       | clinical_supervisor, branch_manager, quality_compliance, executive_leadership |
| `care-plan.programs-library.read`  | all-authenticated                                                             |

Each transition has its own permission; the `TRANSITION_TO_PERMISSION` map in [care-plan.routes.js](../../backend/routes/care-plan.routes.js) is the source of truth.

---

## 7. Endpoint catalog (25 endpoints)

Mounted under `/api/v1/care-plans/` behind `authenticate`. See [openapi-care-planning.yaml](../api/openapi-care-planning.yaml) for the full spec.

```
POST   /recommendations/build-prompt           # build LLM prompt (no LLM call)
POST   /recommendations/validate               # validate LLM proposal
POST   /                                       # createDraft
POST   /:id/validate                           # runValidation
POST   /:id/transitions                        # state-machine driver
POST   /:id/reject                             # structured rejection
POST   /:id/scorecard                          # supervisor scorecard
POST   /:id/versions                           # createNewVersion
POST   /:id/amendments                         # controlled amendment
POST   /:id/family-version                     # manual set
POST   /:id/family-version/generate            # auto-generate
POST   /:id/progress-review                    # deterministic reviewer
POST   /:id/reports/:kind                      # 6 kinds: clinician_draft, supervisor_review, final_approved_plan, rejection, monthly_progress, end_of_cycle_closure
GET    /library/programs                       # 10-program registry
GET    /library/tests                          # 8-test registry
POST   /library/recommend-programs             # ranked + eligibility-aware
POST   /library/interpret-score                # band lookup
POST   /group-plans/build                      # cohort + adaptations + ratios
POST   /group-plans/validate                   # validate existing
POST   /group-plans/cohort-suggest             # candidate filtering
GET    /:id/audit-trail                        # role-redacted timeline
GET    /plan/:planId/versions                  # version history
GET    /:id/allowed-transitions                # UI helper
GET    /:id                                    # fetch
GET    /_health                                # ops probe
```

---

## 8. Event catalog

12 named events emitted via `unifiedNotifier`. HIGH-sensitivity events (`approve`, `reject`, `escalate`, `supersede`) also commit to AnchorLedger when wired.

See [asyncapi/care-planning-events.yaml](../asyncapi/care-planning-events.yaml) for full payload schemas. Highlights:

| Event                                        | Payload extras                                | Sensitivity     |
| -------------------------------------------- | --------------------------------------------- | --------------- |
| `care-plan.approve`                          | evidenceHash (sha256), anchorTxId             | **HIGH**        |
| `care-plan.reject`                           | primaryReason, rejectionCount, urgency        | HIGH            |
| `care-plan.rejected.repeated`                | rejectionCount ≥ 3 → branch_manager           | informational   |
| `care-plan.escalate`                         | escalationReason (4 reasons)                  | HIGH            |
| `care-plan.notify-family`                    | channel, outcome, attempt, retries            | per-attempt     |
| `care-plan.review.overdue`                   | severity (info/warning/critical), daysOverdue | severity-tiered |
| `care-plan.plateau-detector.action_required` | holisticVerdict, atRiskGoalCount              | per-outcome     |

Every event carries `dedupeKey: "{event}.{planVersionId}"` — the notifier MUST drop duplicates.

---

## 9. Metrics

20 Prometheus metrics, scraped at `/metrics` (when prom-client wired). See [care-planning.grafana.json](../dashboards/care-planning.grafana.json) for the 12-panel dashboard and [care-planning.rules.yml](../alerts/care-planning.rules.yml) for the 12 alert rules.

| Counter                           | Labels                             |
| --------------------------------- | ---------------------------------- |
| `care_plan_transitions_total`     | transition, from_status, to_status |
| `care_plan_rejections_total`      | primary_reason                     |
| `care_plan_approvals_total`       | plan_type                          |
| `care_plan_escalations_total`     | trigger_kind                       |
| `care_plan_family_send_total`     | outcome, channel                   |
| `care_plan_family_retry_total`    | outcome                            |
| `care_plan_overdue_review_total`  | severity                           |
| `care_plan_plateau_outcome_total` | holistic_verdict                   |

| Histogram                       | Buckets                    |
| ------------------------------- | -------------------------- |
| `care_plan_readiness_score`     | 0, 50, 70, 85, 90, 95, 100 |
| `care_plan_review_overall`      | 0, 4, 6, 7, 8, 9, 10       |
| `care_plan_days_to_approval`    | 0, 1, 2, 3, 7, 14, 30      |
| `care_plan_days_overdue_review` | 1, 3, 7, 14, 30, 60        |
| `care_plan_goals_at_risk`       | 0, 1, 2, 3, 5, 10          |

| Gauge                                   | Labels |
| --------------------------------------- | ------ |
| `care_plan_active_plans`                | status |
| `care_plan_family_send_pending_retries` | —      |

---

## 10. Workers + scheduling

Three pure workers, each invoked by an external scheduler (cron / job queue / setInterval). The engine does NOT spawn its own intervals.

| Worker                      | Suggested cadence | Limit/run |
| --------------------------- | ----------------- | --------- |
| `familyRetry.runOnce()`     | every 5 min       | 50        |
| `overdueReview.runOnce()`   | every 1 hour      | 200       |
| `plateauDetector.runOnce()` | nightly 02:00     | 100       |

Each returns a structured summary the host can log + emit as metrics.

---

## 11. Bootstrap

Single composition root: [care-plan-bootstrap.js](../../backend/intelligence/care-plan-bootstrap.js).

```js
const { bootstrapCarePlanning } = require('./intelligence/care-plan-bootstrap');

const careplan = bootstrapCarePlanning({
  CarePlanVersion: require('./models/CarePlanVersion'), // required
  governance: governanceService, // required
  BeneficiaryFile: require('./models/BeneficiaryFile'), // optional
  notifier: unifiedNotifier, // optional
  familyChannelClient: smsClient, // optional
  auditLogger: auditLogService, // optional
  anchorLedger: anchorLedgerService, // optional
  resolveAudienceForRole: app._resolveUsersForRole, // optional
  anthropicClient: anthropicClient, // optional
  collectProgressSignals: app._collectGoalSignals, // optional (plateau worker)
  promClient: require('prom-client'), // optional
  insightEmitter: insightsService, // optional
  logger,
});

app.use('/api/v1/care-plans', authenticate, careplan.router);
app._carePlan = careplan; // expose for cross-feature integration
```

The bootstrap is **idempotent** and **non-throwing on missing optional deps** — degraded mode logs but doesn't crash boot.

---

## 12. Wiring matrix — what each optional dep gives you

| Without               | With                | Capability gained                                                           |
| --------------------- | ------------------- | --------------------------------------------------------------------------- |
| `notifier`            | unifiedNotifier     | Real inbox/email/push for all 12 events                                     |
| `familyChannelClient` | SMS/WhatsApp client | Actual family dispatch (else manual_override)                               |
| `BeneficiaryFile`     | model wired         | `save_to_record` files in `BeneficiaryFile.plans[]` with `lockState=locked` |
| `auditLogger`         | Wave-26 service     | Every transition writes to AuditLog                                         |
| `anchorLedger`        | Wave-17 service     | HIGH-sensitivity transitions get tamper-evident commits                     |
| `anthropicClient`     | Anthropic SDK       | Live LLM recommendation via `/recommendations` flow                         |
| `promClient`          | prom-client         | Real metrics at `/metrics`; else noop facade                                |
| `insightEmitter`      | Wave-18 platform    | Plateau verdicts become Insights                                            |

---

## 13. Anti-patterns blocked at engine level

| Attempt                                    | Blocked by                                      |
| ------------------------------------------ | ----------------------------------------------- |
| Self-approval (reviewer == author)         | Wave-41 invariant + service guard               |
| Approve below scorecard 7.0                | Service `REVIEW_SCORE_TOO_LOW`                  |
| Approve with readinessScore < 85           | Model invariant + service guard                 |
| Mutate approved version's `goals`          | Amendment whitelist (non-structural only)       |
| Notify family with grade > 6               | Route guard + invariant                         |
| Notify family with ICD code in body        | Forbidden-term tripwire                         |
| Approve `intensive` without escalation     | `ALWAYS_ESCALATE_TYPES`                         |
| Approve after 2 rejections                 | `ESCALATE_AFTER_REJECTIONS`                     |
| LLM proposal with unresolvable evidenceRef | `validateProposal` post-validator (Wave 44)     |
| Replay LLM proposal                        | rawText surfaced in PROPOSAL_REJECTED for audit |
| Bypass signatureChain integrity            | Mongoose validator + audit-trail verifier       |
| Family receives non-approved version       | Status-gated send                               |
| Plan with group program age-mismatch       | `lib.matchEligibility()` in builder             |

---

## 14. Test gates

10 test suites with 425/425 tests passing as of Wave 50. Run with:

```bash
npx jest __tests__/care-plan-*.test.js __tests__/governance-wave26.test.js --no-coverage
```

| Suite                                 | Tests | Wave               |
| ------------------------------------- | ----- | ------------------ |
| `care-plan-wave41`                    | 62    | 41                 |
| `care-plan-routes-wave42`             | 43    | 42                 |
| `care-plan-family-version-wave43`     | 30    | 43                 |
| `care-plan-rec-progress-wave44`       | 53    | 44                 |
| `care-plan-side-effects-audit-wave45` | 36    | 45                 |
| `care-plan-library-group-wave46`      | 53    | 46                 |
| `care-plan-reports-wave47`            | 38    | 47                 |
| `care-plan-explain-views-llm-wave48`  | 31    | 48                 |
| `care-plan-e2e-wave49`                | 9     | 49 — real Mongoose |
| `care-plan-workers-metrics-wave50`    | 28    | 50                 |

**Wave 49 uses real mongodb-memory-server** — it's the integration gate. If a model invariant breaks, Wave 49 catches it where Waves 41–48 (using mongoose mocks) would not.

---

## 15. Operations — common workflows

### Onboarding a new branch

1. Permissions: every role group in the branch needs `care-plan.*` codes — already in governance.registry, no change.
2. Programs library: review domains used at the branch; extend `PROGRAMS` and `TESTS` if needed (append-only, never delete).
3. Audience resolution: wire `app._resolveUsersForRole(role, branchId)` to return the branch's user list for that role.
4. Notifier channels: ensure `whatsapp` / `sms` / `email` are configured for the branch's region.

### Tuning approval throughput

If `care_plan_days_to_approval` p90 climbs:

- Check `care_plan_overdue_review_total{severity="critical"}` — supervisors backlogged?
- Check escalation rate — too many `intensive` plans?
- Consider raising `APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS` (default 2) if branch managers are inundated.

### Handling a stuck plan

```bash
# 1. Inspect current status
GET /api/v1/care-plans/:id

# 2. See what transitions are legal now
GET /api/v1/care-plans/:id/allowed-transitions

# 3. Read full timeline
GET /api/v1/care-plans/:id/audit-trail
```

### Investigating high rejection rate

```bash
# Dashboard panel #3 → see which primary_reason dominates
# Most common in practice:
#   missing_program_logic → train authors on lib.recommendPrograms
#   evidence_gap          → require assessments before recommendation flow
#   safety_concern        → run a safety-screening compliance audit
```

---

## 16. Go-live checklist

```
☐ MongoDB connected (Wave 49 E2E requires real Mongo)
☐ CarePlanVersion model loaded
☐ Governance service initialised (`care-plan.*` permissions present)
☐ App.js mount block (line ~1956) logs "[CarePlan] ✓ Engine mounted"
☐ /api/v1/care-plans/_health returns 200 + 13 transitions + 8 plan types
☐ Family channel client (SMS/WhatsApp) wired OR manual_override accepted
☐ Notifier carries dedupeKey through (verify with a duplicate test send)
☐ AuditLogger wired (every transition writes an event)
☐ AnchorLedger wired for HIGH-sensitivity (optional but recommended)
☐ Workers scheduled:
   ☐ familyRetry — every 5 min
   ☐ overdueReview — every 1 hour
   ☐ plateauDetector — nightly (only if collectProgressSignals wired)
☐ Prom metrics endpoint exposes /metrics
☐ Grafana dashboard imported (care-plan-engine UID)
☐ Alertmanager loaded with care-planning.rules.yml
☐ ANTHROPIC_API_KEY set (optional — LLM caller only)
☐ Programs library reviewed for branch-specific additions
☐ Smoke test: full path draft → approve → family-notify on a real DB
☐ Family-version preview tested in target Arabic (grade ≤ 6 confirmed)
```

---

## 17. Known limits & future work

| Item                                 | Notes                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| LLM caller batched calls             | Wave 48 supports single proposal per call. Batch mode for cohort planning is future.                    |
| Programs library hot-reload          | Currently registry is import-time. Live updates require redeploy. Future: DB-backed registry.           |
| Group plan supervisor-review variant | Wave 47 reports cover individual plans. Group versions of `monthly_progress` / `end_of_cycle` are open. |
| Family version other languages       | AR-first. EN support is a translation pass — same redaction rules apply.                                |
| UI screens (spec §23)                | Backend complete. Frontend in `alawael-rehab-platform/` repo.                                           |

---

## 18. Owners + escalation

```
Code owner:           Care Planning Engineering
Clinical owner:       Clinical Supervisor (per branch)
DPO owner:            Quality & Compliance (governance.registry holders)
On-call rotation:     Integration team (workers + family channel)
```

For incidents tagged `care-plan-engine`:

- **P1** (engine down / data corruption): page Integration team + Clinical Supervisor.
- **P2** (degraded — family sends failing / metrics gap): file ticket + watch dashboards.
- **P3** (single plan stuck): supervisor handles via audit-trail + manual transition.
