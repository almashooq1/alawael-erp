# Build Sequence Master Plan — current repository state mapped to phase doctrine

**Generated**: 2026-05-24 via `13-build-sequence-master-plan.prompt.md`
**Author**: agent test-run of the prompt against current `main` (HEAD `118af9343`)
**Status**: 📘 Living document — re-generate when sequence ambiguity surfaces

---

## ١. الإطار التنفيذي (Executive framing — Arabic)

منصة الألوائل للتأهيل وصلت إلى مرحلة متقدمة: 7 من أصل 10 مراحل في الـ Build Sequence
Master Plan قد تجاوزت Acceptance criteria الأولية. البنية الخلفية تعمل end-to-end
لمعظم المسارات الأساسية (المستفيد، التقييمات، الخطط، الجلسات، التقارير، الجودة،
العمليات). الفجوة الرئيسية لم تعد في "هل بُني?" بل في:

- **استقرار الـ schemas** (4 من Tier 1 duplicates لا تزال تحتاج قرارات stakeholder)
- **اكتمال الـ consumer side** لميزات حديثة (مثل CAPA — اكتمل في W349 أمس)
- **Pilot / hardening / UAT** (المرحلة 10 لم تبدأ رسمياً)
- **Cross-module dashboards** (المرحلة 9 جزئية)

التوصية: لا نبدأ ميزات جديدة. نُكمل الـ stabilization + ننتقل لـ Pilot.

---

## ٢. Current repository readiness — per phase

| Phase                                   | Status         | Evidence                                                                                                                                                                   | Gap                                                                                                                                             |
| --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** Foundation Readiness              | ✅ Done        | CLAUDE.md, 13 master prompts, 22 ADRs, MODULES.md, blueprint architecture, drift guards inventory                                                                          | None — re-affirm in PR template                                                                                                                 |
| **1** Core Platform + Canonical         | ✅ Mostly Done | Organization/Branch/User/Role/Permission models + RBAC at `backend/authorization/`; canonical entities at `backend/intelligence/canonical/`; W324–W347 drift guards locked | Tier 1 schema duplicates (ApprovalRequest, ReportTemplate, WorkflowInstance, AuditLog) need ADR-021/022 sign-off                                |
| **2** Beneficiary 360 Core              | ✅ Done        | Beneficiary model + canonical contract; Guardian/Consent/Episode infrastructure; 8 ref-bug fixes in W324+W329                                                              | Timeline projection optimization (W302–W319 telemetry layer landed)                                                                             |
| **3** Assessment & Measures             | ✅ Done        | MeasurementMaster + lifecycle lib (W325 P1-P3); discipline-aware workflow; ReAssessment due logic via schedulers                                                           | None production-blocking                                                                                                                        |
| **4** Goals & Care Plan                 | ✅ Done        | CarePlan + CarePlanVersion + Goal + SmartGoal + GAS scales; W41 + W332 registry integrity guard; PlanReviewAck family signature                                            | UI version-compare polish (deferred)                                                                                                            |
| **5** Programs, Sessions, Progress      | ✅ Done        | Session + GoalProgressEntry + Snapshot; care-plan-plateau-detector scheduler; rehab-program models                                                                         | 3-clinical-session-model fragmentation (TherapySession + ClinicalSession + DisabilitySession — reconfirmed in W325 P3, design decision pending) |
| **6** Reports, Approvals, Family        | ✅ Done        | ReportTemplate + ReportApprovalRequest + Family Portal (parent-portal-v1.routes.js); W276c messaging.service; W278b HyperPay default                                       | ReportTemplate duplicate (Tier 1 ADR pending — schemas DIVERGE between rehab-domain canonical + document service variant)                       |
| **7** Operations, Attendance, Transport | ✅ Done        | Hikvision + ZKTeco biometric attendance; transport + driver + route models; smart-attendance domain (W327 ratchet)                                                         | None production-blocking                                                                                                                        |
| **8** Quality, Risk, Governance         | ✅ Done        | 30 quality models (Audit/RCA/FMEA/A3/SPC/Checklist + Risk register); CAPA full stack W337–W349 (7 waves, 133 drift assertions); W283/W286 governance schedulers            | None — feature-complete after W349 subscriber                                                                                                   |
| **9** Cross-Module Dashboards           | 🟡 Partial     | CronStatusPage (W320); /api/ops/schedulers health (W321); CMS scheduler-registry (W319+W322); Beneficiary 360 dashboard                                                    | Executive dashboard NOT built; branch quality heatmaps NOT built; therapist workload dashboard NOT built                                        |
| **10** Pilot, Hardening, Rollout        | 🔴 Not Started | n/a                                                                                                                                                                        | Pilot branch + UAT + training materials + rollback plan ALL pending                                                                             |

---

## ٣. Recommended next phases (in priority order)

### Priority 1 — Stabilize before scaling (Phase 1 + 6 leftovers)

**Resolve the 4 Tier 1 baseline entries** before any new feature work. Each needs a
stakeholder decision per the ADR-021 / ADR-022 framework:

1. **ApprovalRequest** — ADR-022 ✅ written (this PR). 4 questions Q1-Q4 pending sign-off.
2. **ReportTemplate** — ADR equivalent NOT written. Same divergent-schema pattern (rehab-domain
   canonical `models/reports/ReportTemplate.js` vs document-service inline schema).
3. **WorkflowInstance** — 3 sites, NO canonical at `models/`. Pattern A (consolidate)
   not Pattern D (rename). Requires more design.
4. **AuditLog** — ALLOWLISTed in W347 as stopgap. Long-term: refactor 3 defensive sites
   to `require()` the canonical, then remove from ALLOWLIST.

**Why first**: load-order roulette can break in subtle ways in production. Each Tier 1
entry is a latent production bug.

### Priority 2 — Pilot readiness (Phase 10)

A real-world rehab center will surface what the test suite cannot. Recommended slice:

- **Pick one pilot branch** (small, friendly to feedback).
- **Define pilot user group**: 1 supervisor + 2-3 therapists + 1 admin + 1 family.
- **Map 5 end-to-end scenarios**:
  1. New beneficiary intake → episode → first assessment → first plan → first session
  2. Re-assessment cycle on existing beneficiary → plan revision → family approval
  3. Quality finding → CAPA creation → owner workflow → close (the W337-W349 chain end-to-end)
  4. Transport assignment + attendance via Hikvision camera → real-day reconciliation
  5. Monthly periodic report submission to disability authority (W286 cron with real creds)
- **Training materials**: 5 ar/en how-to documents matching the 5 scenarios.
- **Rollback plan**: which DB collections to truncate, which env flags to disable.
- **Feedback capture loop**: dedicated Slack/email channel; weekly retrospective for 4 weeks.

**Why second**: feature-complete code is not production-ready code. The next bugs come
from real users, not test runners.

### Priority 3 — Phase 9 dashboards (parallel with Pilot)

Pilot users will demand visibility. Recommended dashboards to build BEFORE the pilot
weekly retrospectives start surfacing requests:

- **Branch quality heatmap**: aggregate of overdue CAPA + plan-review backlog + audit
  findings count per branch (data already exists from W337-W349 + W332).
- **Therapist workload**: caseload count + average plan-review compliance + active goals
  per therapist (data exists from caseload tracker + care plan service).
- **Executive 1-page**: 8-12 KPIs across all 8 layers (already partially built via
  `services/quality/commandCenter.service`).

**Why parallel**: dashboards are read-only aggregations — low risk of breaking the
write-side. Building them during pilot lets pilots use them on day 1.

### NOT recommended next

- New AI features beyond what W283/W334/W337 plateau adapters provide. AI was the focus
  for 4-5 days; the platform now needs to BE USED before more AI is added.
- New canonical models beyond what already exists. Most "missing" models in W325c
  baseline turned out to be either already-built or deferred-by-design.
- More Tier 2 ratchet-downs on W340 baseline. The remaining ~35 are mostly
  divergent-schema cases that need ADR-022-style per-entry decisions.

---

## ٤. Vertical slices per next phase

### Slice: Resolve Tier 1 schema duplicates (Priority 1, ~2-3 days)

Per Tier 1 entry:

| Step | Output                                                                                  | Owner             |
| ---- | --------------------------------------------------------------------------------------- | ----------------- |
| 1    | Write per-entry ADR if not exists (ApprovalRequest done = ADR-022)                      | architect         |
| 2    | Walk Q1–Qn with named stakeholders                                                      | architect + owner |
| 3    | Run prod-data audit per the ADR's recommended-next-step                                 | data team         |
| 4    | Atomic PR: rename Mongoose registration + file + ref updates + prune from W340 baseline | implementer       |
| 5    | Sprint smoke + manual smoke against real DB                                             | QA                |

### Slice: Pilot Cycle 1 (Priority 2, ~1 month)

| Step | Output                                              |
| ---- | --------------------------------------------------- |
| 1    | Pilot branch + user group locked (1 week)           |
| 2    | 5 scenario documents written ar/en (3 days)         |
| 3    | Training session #1 (1 day)                         |
| 4    | Pilot week 1 — supervisor + 1 therapist (1 week)    |
| 5    | Weekly retrospective + defect log + workflow tweaks |
| 6    | Pilot week 2 — full team (1 week)                   |
| 7    | Pilot week 3-4 — stress test + real beneficiaries   |
| 8    | Go/no-go decision for rollout to second branch      |

### Slice: Phase 9 dashboard suite (Priority 3, ~1-2 weeks)

| Step | Output                                                                 |
| ---- | ---------------------------------------------------------------------- |
| 1    | Wireframes for the 3 dashboards (1 day)                                |
| 2    | Backend aggregation endpoints per dashboard (3-4 days, reuse existing) |
| 3    | Frontend pages in web-admin (4-5 days)                                 |
| 4    | RBAC scoping (1 day)                                                   |
| 5    | Drift guards on backend aggregations (1 day)                           |
| 6    | UAT with pilot users (concurrent with Slice 2)                         |

---

## ٥. Milestones

| Milestone                                    | Target date | Acceptance                                                          |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| M-23 Tier 1 ADRs sign-off complete           | 2026-06-07  | 4 ADRs (021/022/+2) signed; W340 baseline drops to 0 Tier 1 entries |
| M-24 First pilot week complete               | 2026-06-21  | 1 branch using platform for 5 scenarios; retrospective held         |
| M-25 Phase 9 dashboard MVP shipped           | 2026-07-05  | 3 dashboards live in web-admin, behind RBAC, drift guards green     |
| M-26 Pilot Cycle 1 closed → rollout decision | 2026-07-19  | Go/no-go meeting with documented defect rate + workflow tweaks      |

---

## ٦. Prerequisites / blockers

For each priority:

**P1 Tier 1 stabilization** depends on:

- Stakeholder availability (4 named roles per ADR-022)
- Production data audit (someone with prod read access)

**P2 Pilot** depends on:

- P1 stabilization done (don't pilot on load-order-roulette schemas)
- Pilot branch selection (business decision)
- Training material authoring capacity
- A real network path from pilot branch to backend (deployment dependency)

**P3 Phase 9 dashboards** depends on:

- web-admin (sister repo `alawael-rehab-platform/`) RBAC + i18n stable
- Aggregation endpoint shape decided per dashboard

---

## ٧. Testing / QA expectations

Carry forward from the prompt's testing strategy section:

- Every Tier 1 ADR execution PR must run `npm run test:sprint` (full backend test
  gate) + add per-entry rename test if applicable.
- Pilot Cycle 1 must define test scenarios as actual `__tests__/pilot-*-cycle1.test.js`
  files so regression is automatable post-pilot.
- Phase 9 dashboards must have backend aggregation tests + frontend snapshot tests +
  RBAC tests (verify a therapist cannot see another therapist's caseload data).

---

## ٨. Risks / edge cases

| Risk                                                                                  | Prevention                                                                           | Detection                        | Response                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------- |
| Tier 1 rename breaks a silent caller                                                  | Audit `mongoose.model('X')` callers before each rename PR                            | Sprint test + manual smoke       | Revert + add the missing caller to ADR          |
| Pilot users hit performance issues we don't see in test                               | Load-test 1 representative endpoint per layer pre-pilot                              | Prod monitoring (W319+W322)      | Hotfix or rollback per documented plan          |
| Pilot users demand features outside the 5 scenarios                                   | Document scope upfront; weekly retro de-prioritizes scope creep                      | Retrospective feedback log       | Add to backlog, do NOT mid-pilot                |
| Phase 9 dashboards become brittle as backend aggregations evolve                      | Drift guards on aggregation shape, contract tests on dashboard data shape            | CI fails on shape change         | Coordinate aggregation PRs with dashboard owner |
| W349 alerts subscriber's downstream `notification.capa.overdue.alert` has no consumer | Add no-op consumer at first to prove the event flows; replace with Slack/email later | Bus ring buffer (`bus.recent()`) | Add real consumer in a follow-up slice          |

---

## ٩. Recommended next build step

**Single most-impactful action**: schedule the 4 Tier 1 ADR sign-off meetings.

Each meeting needs 4 attendees (per ADR-022 stakeholder list) and produces 1 ADR
decision. Once all 4 ADRs are signed, the W340 baseline can drop to ZERO Tier 1
entries — the platform's schema layer becomes deterministic instead of load-order-dependent.

After that's locked, **Slice: Pilot Cycle 1 Step 1** (pick the branch, lock the user
group) is the highest-value concrete next step.

---

## ١٠. Key design decisions (for this artifact)

1. **No new ranking or scoring system** — the prompt's "WHEN ASKED TO PRIORITIZE" rules
   were applied directly (blockers > daily value > ambiguity reduction > workaround
   burden > auditability) without inventing a numerical scoring system.
2. **Concrete next-action over theoretical roadmap** — the prompt was test-run against
   the current `main` commit, not an idealized state. References real waves (W324-W349)
   - real ADR numbers + real file paths.
3. **Three priorities not ten** — most of the prompt's 10 phases are already done; this
   doc focuses on what's genuinely OPEN (P1 stabilization, P2 pilot, P3 dashboards).
4. **Pilot before Phase 9 NOT after** — defying the prompt's strict numerical order
   because dashboards built without real-user feedback ship to the wrong KPIs.

## Assumptions

- The CLAUDE.md inventory + recent ADRs (021, 022) accurately reflect the codebase.
- Pilot capacity exists in calendar / budget for the proposed M-24 / M-25 / M-26 dates
  (no project-management constraints checked).
- The 5 pilot scenarios are buildable end-to-end on the current backend — verified
  for #3 (CAPA chain) and #5 (DA cron) in recent ADRs/waves; #1, #2, #4 are inferred
  from MODULES.md.

## Risks / edge cases for this artifact

- This is a generated snapshot — the underlying state changes hourly during active
  development. Regenerate when sequence ambiguity surfaces.
- The "Recommended next build step" assumes Tier 1 ADR work is non-zero-effort. If
  stakeholders unavailable, fall back to Slice P3 (dashboards) as parallel work.

## Recommended next build step

1. Open meeting requests for the 4 Tier 1 ADR sign-offs (ApprovalRequest / ReportTemplate / WorkflowInstance / AuditLog).
2. While waiting: pick the pilot branch + 5 users + write the first 2 of 5 scenario documents.
