# Pilot Cycle 1 — operational readiness package

**Generated**: 2026-05-24 (W354 — pilot prep slice)
**Status**: 📋 Draft — needs sign-off from pilot branch manager + clinical lead before executing
**Owner**: pending (platform PM)
**Related**: BUILD_SEQUENCE_PLAN.md Phase 10 + W350-W353 backend dashboards + CAPA chain (W337-W349)

---

## ١. الهدف (Purpose)

تشغيل المنصة في فرع واحد مع مجموعة محدودة من المستخدمين لمدة 4 أسابيع كي:

- نكتشف الأعطال التي لا تكتشفها الـ test suites (real-data quirks، slow queries on real volumes، UX gaps)
- نتحقق أن الـ 7 طبقات الجاهزة (B360 + assessments + plans + sessions + reports + ops + quality) تعمل end-to-end على بيانات حقيقية
- نجمع feedback مباشر من مستخدمين فعليين قبل توسيع النطاق

**ليس الهدف**:

- شحن ميزات جديدة (kept frozen during pilot — see Risks)
- اختبار scale (نقاس فرع واحد، حجم متوقع <200 beneficiary)
- اتخاذ قرارات منتج عميقة (تُجمع كـ backlog لما بعد الـ pilot)

---

## ٢. معايير اختيار الفرع الـ Pilot

اختر فرعاً يتوفر فيه:

- [ ] حجم متوسط (50-200 beneficiary نشطين) — صغير جداً = data sparse، كبير = scope creep
- [ ] **مديرة فرع متعاونة** تقبل أن تكون نقطة الاتصال + تحضر retrospective أسبوعي
- [ ] **اتصال إنترنت موثوق** (الـ pilot يعتمد على cloud backend — لا offline-first بعد)
- [ ] **اتفاق مع مدير الـ HR** على توفير 2-3 ساعات تدريب لكل user قبل البدء
- [ ] **مستفيد فرع متطوع واحد** يقبل تجربة Family Portal (W276c messaging + plan-review signature)
- [ ] **يفضّل** فرع لا يستخدم نظاماً مماثلاً حالياً (لتقليل lock-in psychology)

**Anti-criteria** (تجنّب):

- فرع وسط transition (تغيير قيادة، تغيير موقع، فقدان موظفين مفتاحيين)
- فرع تحت ضغط audit جهة تنظيمية حالياً (الـ pilot سيُلهي)
- فرع به >5 شكاوى مفتوحة في آخر شهر (سيؤثر signal على noise)

---

## ٣. مجموعة المستخدمين (Pilot User Group)

**الحد الأدنى للـ Pilot Cycle 1** = **5 users**:

| Role               | Count | Why                                                                                  | Existing-role mapping in codebase             |
| ------------------ | ----- | ------------------------------------------------------------------------------------ | --------------------------------------------- |
| Supervisor / مشرف  | 1     | Approves plans + sees branch dashboards                                              | role = `supervisor` (RBAC; ADR-005 hierarchy) |
| Therapist / أخصائي | 2-3   | Daily session delivery + plan authoring + progress entries                           | role = `therapist`                            |
| Admin / إدارية     | 1     | Intake + scheduling + reports + CAPA owner                                           | role = `admin_branch`                         |
| Family / ولي أمر   | 1     | Family Portal (parent-portal-v1.routes.js): plan-review, messaging, home-program ack | Beneficiary.guardians[0]                      |

**Pre-pilot for each user**:

- Personal login created in pilot branch
- MFA tier 2 set up (required for CAPA verify-close, plan publish, payroll override)
- 2-hour training session (see Section 6)
- Read-access to retrospective notes Slack channel / Telegram group

---

## ٤. The 5 end-to-end pilot scenarios

Each scenario exercises one cross-module path. **مدة كل scenario = ~2-4 hours of real work spread over a few days**.

> **📋 Detailed walkthroughs (step-by-step + acceptance + sign-off + cleanup) live in [docs/pilot/](pilot/README.md)**. The tables below are summaries; run the per-scenario doc for the actual execution.

### Scenario 1: Beneficiary intake → first session (الأساسي)

📖 **Full walkthrough**: [docs/pilot/SCENARIO_1_INTAKE_TO_FIRST_SESSION.md](pilot/SCENARIO_1_INTAKE_TO_FIRST_SESSION.md)

**Touchpoints**: B360 + Assessment + Care Plan + Session + Family Portal.

| Step | UI / API                                                       | Verify                                                                                |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1.1  | Admin creates Beneficiary in B360                              | Status='pending'; guardians[] populated; canonical refs (W324-W329) all 'Beneficiary' |
| 1.2  | Admin links guardian; sends portal invite                      | Guardian receives invite email/SMS                                                    |
| 1.3  | Admin opens BeneficiaryEpisode                                 | Status='active'; branchId matches pilot branch                                        |
| 1.4  | Therapist runs initial Assessment (MeasurementMaster + result) | Score recorded; status='ACTIVE' per W325 P2 lifecycle                                 |
| 1.5  | Therapist drafts CarePlan + 3 SmartGoals from assessment       | CarePlan.status='DRAFT'; goals linked to assessment evidence                          |
| 1.6  | Supervisor reviews + approves CarePlan (MFA tier 2)            | CarePlan.status='ACTIVE'; PlanReviewAck record created                                |
| 1.7  | Therapist schedules first TherapySession                       | Appointment created; visible in Therapist Workload dashboard (W352)                   |
| 1.8  | Therapist documents session + goal progress                    | GoalProgressEntry created; Beneficiary 360 timeline updated                           |
| 1.9  | Family logs in to portal, signs PlanReviewAck                  | PlanReviewAck.familySigned=true; audit-chain entry created (W303-W308)                |

**Acceptance**: All 9 steps complete without manual workaround; no support ticket opened.

---

### Scenario 2: Re-assessment cycle → plan revision

📖 **Full walkthrough**: [docs/pilot/SCENARIO_2_REASSESSMENT_REVISION.md](pilot/SCENARIO_2_REASSESSMENT_REVISION.md)

**Touchpoints**: Assessment re-run + CarePlanVersion + family re-approval.

| Step | UI / API                                                         | Verify                                                  |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| 2.1  | Therapist runs periodic Assessment (90d after Scenario 1.4)      | New MeasureResult; baseline comparison populated        |
| 2.2  | Care-plan-plateau-detector cron fires (W41) → flags low progress | AiRecommendationBundle created in PENDING_REVIEW (W334) |
| 2.3  | Supervisor reviews recommendation + decides revision needed      | Approves bundle (MFA tier 2 — verified by W340 hook)    |
| 2.4  | Supervisor opens revision; modifies 2 goals; creates new version | CarePlanVersion v2 created; v1 status='SUPERSEDED'      |
| 2.5  | Supervisor approves v2                                           | v2.status='ACTIVE'; new PlanReviewAck row required      |
| 2.6  | Family receives revision notification + signs                    | familySigned=true; B360 timeline shows revision         |

**Acceptance**: All steps without backend errors; AiRecommendationBundle approval flow works.

---

### Scenario 3: Quality finding → CAPA → close (the W337-W349 chain end-to-end)

📖 **Full walkthrough**: [docs/pilot/SCENARIO_3_CAPA_END_TO_END.md](pilot/SCENARIO_3_CAPA_END_TO_END.md)

**Touchpoints**: AuditOccurrence → producer → CapaItem → workflow → CLOSED.

| Step | UI / API                                                                                            | Verify                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Admin runs scheduled AuditOccurrence (per AuditScope)                                               | Status='in_progress'; findings[] empty initially                                                                              |
| 3.2  | Admin adds finding (type='minor_nc', description, owner)                                            | finding.\_id populated; capaCreated=false                                                                                     |
| 3.3  | Admin clicks "Create CAPA" → calls W348 POST /api/v1/quality/capa-producers/audit/:id/findings/:fid | CapaItem created with priority=medium (per W346 mapping minor_nc→medium); finding.linkedCapaId set + finding.capaCreated=true |
| 3.4  | Therapist (CAPA owner) starts work → PATCH transition OPEN→IN_PROGRESS                              | Status='IN_PROGRESS'; lifecycleHistory[] has 1 entry                                                                          |
| 3.5  | Therapist marks IMPLEMENTED                                                                         | implementedAt populated                                                                                                       |
| 3.6  | Supervisor verifies → IMPLEMENTED→VERIFIED                                                          | verifiedAt populated                                                                                                          |
| 3.7  | Supervisor signs off → VERIFIED→CLOSED (MFA tier 2 required by W344)                                | closedAt + closedBy populated; quality.capa.closed event emitted                                                              |
| 3.8  | Admin checks Branch Quality Heatmap (W350-W353) — should show this branch in OK                     | Heatmap reflects updated state                                                                                                |
| 3.9  | quality.capa.overdue cron (daily 06:00 if enabled) — confirm doesn't fire on this CAPA              | No alert for closed item                                                                                                      |

**Acceptance**: Full 9-step CAPA chain executes without sysadmin intervention. **This scenario validates 8 layers of CAPA work (W337-W349).**

---

### Scenario 4: Transport + camera attendance reconciliation

📖 **Full walkthrough**: [docs/pilot/SCENARIO_4_TRANSPORT_HIKVISION.md](pilot/SCENARIO_4_TRANSPORT_HIKVISION.md)

**Touchpoints**: TransportAssignment + Hikvision attendance + reconciliation.

| Step | UI / API                                              | Verify                                                                                       |
| ---- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 4.1  | Admin assigns Beneficiary to a transport route        | TransportAssignment created; driver notified                                                 |
| 4.2  | Pilot day morning — driver picks up beneficiary       | Transport status='in_progress'                                                               |
| 4.3  | Hikvision camera detects arrival at branch (W96-W114) | AttendanceViaCamera record (W327 canonical refs); auto-marks Appointment.status='CHECKED_IN' |
| 4.4  | Therapist starts session; documents departure         | TherapySession.status='COMPLETED'                                                            |
| 4.5  | EOD reconciliation — match planned vs delivered       | adherenceSummary correct; no-shows captured if any                                           |

**Acceptance**: Camera→Appointment auto-update works; no manual re-entry needed.

**Risk**: Requires Hikvision cameras configured + connected. Skip this scenario for week 1 if env not ready.

---

### Scenario 5: Monthly disability-authority report submission

📖 **Full walkthrough**: [docs/pilot/SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md](pilot/SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md)

**Touchpoints**: DisabilityAuthorityAdapter (W281) + monthly cron (W286).

| Step | UI / API                                                                                   | Verify                                                           |
| ---- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 5.1  | Day 5 of month @ 04:00 — W286 cron fires (if ENABLE_DA_PERIODIC_CRON=true)                 | Schedulr-registry recordRun() entry; report attempted            |
| 5.2  | Adapter calls live API (if DISABILITY_AUTHORITY_BASE_URL set) OR mock-mode returns success | gov.report.submission counter increments per branch              |
| 5.3  | Admin reviews report acknowledgement                                                       | Submission ID stored; report visible in beneficiary 360 timeline |

**Acceptance**: Cron fires; idempotency works (re-run produces no duplicate).

**Risk**: Requires DA sandbox credentials. Run in MOCK MODE for week 1, switch to live in week 3 if creds available.

---

## ٥. الـ Test Data setup

Pre-pilot data prep (1 day before training):

1. **Seed pilot branch**: 30 active beneficiaries (mix of disability types + age ranges)
2. **Seed historical data** (last 6 months): assessments, care plans (some active some superseded), sessions
3. **Seed staff**: 5 user accounts (1 supervisor + 2 therapists + 1 admin + 1 family) with role + branch assigned
4. **Seed quality data** (low volume so KPIs are interpretable):
   - 2 open AuditOccurrences (one with 1 finding, one with 2)
   - 1 active RcaInvestigation (intermediate severity)
   - 1 published FmeaWorksheet
   - 1 active Risk register entry (medium)
5. **DO NOT seed CAPA items** — let pilot users CREATE them via Scenario 3 (validates W348 producer routes)
6. **Disable destructive cron jobs** for the pilot duration (or scope them to non-pilot branches):
   - ENABLE_AUDIT_CHAIN_ARCHIVE=false (don't archive pilot's own audit chains)
   - ENABLE_CAPA_SWEEPER=true (DO let overdue alerts fire — exercises W349)

---

## ٦. Training plan (2 hours per user)

**Format**: 1-on-1 or small-group walkthrough; record for replay.

**Per-role agenda**:

### Supervisor (90 min)

- 30 min — Beneficiary 360 + Care Plan approval flow (Scenarios 1.6, 2.3, 2.5)
- 20 min — Branch Quality Heatmap dashboard (W350-W353) interpretation
- 20 min — CAPA verify+close (Scenario 3.6-3.7) including MFA tier 2 step-up
- 20 min — AiRecommendationBundle queue review (W334)

### Therapist (90 min)

- 30 min — Daily workload dashboard (W352) — appointments + sessions + caseload
- 20 min — Assessment + Care Plan authoring (Scenarios 1.4-1.5, 2.1, 2.4)
- 20 min — Session documentation + goal progress entries (Scenario 1.8)
- 20 min — CAPA owner workflow (Scenario 3.4-3.5)

### Admin (90 min)

- 25 min — Intake (Scenario 1.1-1.3) + transport assignment (Scenario 4.1)
- 25 min — Scheduling + appointment management
- 25 min — Audit + finding entry + CAPA creation (Scenario 3.1-3.3)
- 15 min — Report generation + family communication

### Family (30 min — shorter, simpler portal)

- 15 min — Login, view plans + sessions, sign PlanReviewAck
- 10 min — Send messages, ack home-program assignments
- 5 min — Where to ask for help

---

## ٧. Issue capture loop

**Channel**: Dedicated Slack/Teams channel `#pilot-cycle-1` OR WhatsApp group (whichever pilot users use).

**Daily** (5 min, anyone with an issue):

```text
ISSUE: <one-line description>
SCENARIO: <1/2/3/4/5>
STEP: <e.g. 3.4>
WHAT HAPPENED: <expected vs actual>
SCREENSHOT: <if applicable>
SEVERITY: blocker / major / minor / cosmetic
```

**Weekly retrospective** (45 min, all pilot users + PM):

- Walk daily issues categorized by severity
- Decide: hotfix / backlog / known-issue-accept
- Adjust scope for next week
- Capture "should the platform do X" requests → backlog (NOT in-pilot scope changes)

**Hotfix definition** (the only mid-pilot code changes allowed):

- BLOCKER severity AND scenario is now untestable
- Pilot user is data-stuck (can't proceed)
- Security / data-loss risk

Everything else → backlog → addressed POST-pilot.

---

## ٨. Go/no-go decision (end of week 4)

**GO criteria for second branch rollout**:

- [ ] All 5 scenarios completed with ≤1 blocker each (≤5 total blockers)
- [ ] Average user "would recommend" score ≥7/10
- [ ] No data-integrity issues found (no orphaned records, no silent schema-drift)
- [ ] CAPA chain (Scenario 3) demonstrated full lifecycle on ≥3 real CAPAs
- [ ] At least 1 family successfully signed a PlanReviewAck

**NO-GO criteria** (delay rollout, run Cycle 2):

- ≥3 blockers per scenario
- Critical incident requiring rollback
- Pilot users reported they would "rather use the old system"

---

## ٩. Rollback plan

If pilot needs to be aborted:

1. **Stop the pilot cron jobs**: set `ENABLE_*=false` for all pilot-scope schedulers
2. **Preserve data**: do NOT truncate collections. Snapshot the pilot branch's data to `_pilot_cycle_1_snapshot` collection (separate DB) for post-mortem.
3. **Communicate**: send "pilot paused" message to all 5 users + branch manager within 24h.
4. **Open RCA**: file an RcaInvestigation per the W325 P2 lifecycle. The pilot itself is a finding source — eat your own dog food.
5. **Backlog**: convert each blocker to a JIRA-style ticket. Schedule fix sprint before Cycle 2.

---

## ١٠. Open questions for pilot owner

- **Q1**: Which branch? Recommend top 3 candidates by Section 2 criteria.
- **Q2**: Who is the pilot PM (single accountable owner)?
- **Q3**: Start date? Recommend 1 week after stakeholder sign-off on the 4 Tier 1 ADRs (so schema layer is deterministic before pilot).
- **Q4**: Hikvision env — is it ready for Scenario 4 week 1, or run mock-only for first 2 weeks?
- **Q5**: DA sandbox creds — available now (Scenario 5 week 1) or week 3?

---

## Key design decisions (for this artifact)

1. **5 scenarios, not 50** — small enough to actually execute in 4 weeks, big enough to exercise the 7 ready layers.
2. **Scenario 3 = CAPA chain** is deliberate — validates the most-recently-shipped + most-tested feature (W337-W349) under real-data conditions.
3. **Family included from day 1** — Family Portal (W276c + parent-portal-v1) is a recent feature and pilots need to confirm it works without backend-team handholding.
4. **No new features during pilot** — scope creep is the #1 pilot killer. Backlog everything that isn't a blocker.

## Assumptions

- Pilot branch + user group can be picked + trained in ≤2 weeks.
- Backend production environment is ready (or can be deployed in a controlled way).
- The 4 Tier 1 ADRs (ApprovalRequest / ReportTemplate / WorkflowInstance / AuditLog) are signed-off OR ALLOWLISTed before pilot starts (to avoid load-order roulette surprises).

## Risks / edge cases

- **Pilot user attrition**: if the supervisor leaves mid-pilot → blocker. Mitigation: secondary supervisor identified upfront.
- **Network outage on pilot day**: blocker for ALL scenarios. Mitigation: pilot users have direct backend-team contact for fast escalation.
- **Family disengagement**: family may not log in. Mitigation: 1 follow-up call after invite; if no engagement, document but don't block other scenarios.
- **Scope creep**: stakeholders see pilot working → demand new features. Mitigation: this doc's "no-features-during-pilot" rule + dedicated backlog channel.

## ١١. Optional — supply chain + facility maintenance (Scenario 7)

Does **not** block Section 8 go/no-go. Run in **week 3–4** if procurement + facilities are in pilot scope.

📖 [docs/pilot/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS.md](pilot/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS.md)

| Track | Validates | Ops doc |
| ----- | --------- | ------- |
| Legacy purchasing (Tier B) | PR→PO→partial receive + ADR-039 banner | `PRODUCTION_CUTOVER_W780_W792_PURCHASING.md` |
| Maintenance hub | snapshot + bulk spawn + branch PPM tile | `PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md` |
| Policy | Approach B sign-off | `039-SIGNOFF-PACKET.md` |
| Staging smoke | `npm run verify:supply-chain-staging` (W819) | `SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md` §5 |

---

## Recommended next step

1. Walk Q1-Q5 with the pilot owner (1 hour meeting).
2. Pick the branch + lock the user group.
3. Schedule the 4 training sessions (Section 6).
4. Run pre-pilot data seeding (Section 5) one week before kickoff.
5. Day 0: kickoff meeting; daily standups for 4 weeks; weekly retros; week-4 go/no-go.
