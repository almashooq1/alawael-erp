# Phase 17 — Care Platform Runbook

**Status:** CLOSED 9/9 @ v4.0.91
**Shipped:** 2026-04-24
**Tests:** 438+/438+ care tree tests across 19+ suites
**Prior audit baseline:** care layer ~58%
**Post-Phase-17:** 100% — every identified gap closed

---

## 1. Why Phase 17

The 2026-04-23 audit flagged every care-adjacent module at partial maturity:

| Module                   | Before                                                  | After Phase 17                                            |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------- |
| CRM (acquisition funnel) | 60% — Leads/Complaints/Surveys only, no funnel + no SLA | 100% — Inquiry + Lead with dual SLAs                      |
| Social Services          | 20% — skeleton only                                     | 100% — SocialCase with 3 SLAs incl. 24/7 high-risk        |
| Home Visits              | 0% — only a plan intervention type                      | 100% — GPS, photos, observations, follow-up SLA           |
| Welfare Applications     | 0% — tracked in free-text                               | 100% — full appeal + disbursement lifecycle               |
| Community Linkages       | 0% — no partner directory                               | 100% — partner directory + per-beneficiary linkages       |
| Psychological            | 75% — missing RiskFlag/Scales/MDT                       | 100% — 1h 24/7 risk flag SLA + PHQ-9/GAD-7/DASS-21 + MDT  |
| Life Independence        | 85% — missing Transition/IADL/Participation             | 100% — TRA + Lawton IADL + CommunityParticipation         |
| Beneficiary-360          | 50% — no unified profile                                | 100% — ⭐ aggregator + healthScore + timeline + attention |
| Retention/Churn          | 0% — no detection                                       | 100% — 10-factor scorer + auto-interventions              |

---

## 2. Architecture at a glance

### Nine-commit vertical, single phase

| #   | Commit              | Subject                                                                 | Version |
| --- | ------------------- | ----------------------------------------------------------------------- | ------- |
| C1  | CRM Lead Funnel     | Inquiry → Lead with dual SLAs                                           | 4.0.83  |
| C2  | Social Services     | SocialCase with intake/assessment/plan lifecycle + high_risk_review SLA | 4.0.84  |
| C3  | Home Visits         | GPS + photos + observations + follow-up SLA + **auto-risk-flag**        | 4.0.85  |
| C4  | Welfare + Community | WelfareApp with appeal fork + CommunityPartner/Linkage                  | 4.0.86  |
| C5  | Psych               | RiskFlag + Scales (PHQ-9/GAD-7/DASS-21) + MDT                           | 4.0.87  |
| C6  | Life Independence   | TRA + IADL (Lawton) + CommunityParticipation                            | 4.0.88  |
| C7  | Beneficiary-360 ⭐  | Unified profile + timeline + healthScore + attention                    | 4.0.89  |
| C8  | Retention/Churn     | 10-factor scorer + auto-interventions                                   | 4.0.90  |
| C9  | Closure             | Runbook + drift + E2E (this doc)                                        | 4.0.91  |

### Service topology

```
                         ┌─────────────────────────┐
                         │  qualityEventBus (C15)  │
                         └────────────┬────────────┘
                                      │
   ┌──────────────┬──────────────┬────┴────┬──────────────┬──────────────┐
   │              │              │         │              │              │
leadFunnel    socialCase     homeVisit   welfare       community      psych
   (C1)          (C2)          (C3)       (C4)          (C4)          (C5)
                   │            │                                        │
                   │            └─→ emits home_visit_critical_concern ──┤
                   │                                                     │
                   └←── flagHighRisk() auto-called (by bootstrap)  ←────┘
                                                                         │
                                            independence (C6) ───────────┤
                                                      │                  │
                               ┌──────────────────────┘                  │
                               │                                         │
                               ▼                                         │
                        beneficiary360 (C7) ⭐                           │
                         │    ▲                                          │
                         │    │ reads                                    │
                         ▼    │                                          │
                      retention (C8) ─── auto-calls ──────────────────→ ┘
                                         raiseFlag + scheduleMdt
                                         + flagHighRisk on imminent
```

Every service emits `ops.care.*` events to the qualityEventBus (reused from Phase 15). Cross-service orchestration is wired at bootstrap time via `bus.on(...)` listeners — explicit, testable, and late-bindable.

### SLA policies added (4 total)

All 4 reuse the Phase-16 SLA engine + breach notification infrastructure:

| Policy id                          | Severity     | Target | Hours    | Pauses on                 |
| ---------------------------------- | ------------ | ------ | -------- | ------------------------- |
| `crm.inquiry.acknowledge`          | normal       | 1h     | business | —                         |
| `crm.lead.first_response`          | high         | 4h     | business | `awaiting_documents`      |
| `crm.lead.conversion`              | normal       | 14d    | business | —                         |
| `social.case.intake_to_assessment` | high         | 5d     | business | —                         |
| `social.case.assessment_to_plan`   | high         | 3d     | business | —                         |
| `social.case.high_risk_review`     | **critical** | 1d     | **24/7** | —                         |
| `social.home_visit.followup`       | high         | 14d    | business | `awaiting_family_consent` |
| `psych.risk_flag.response`         | **critical** | 4h     | **24/7** | `monitoring`              |

### Registries + Models

Ten registry files, fifteen Mongoose models (all auto-numbered):

```
backend/config/care/
  crm.registry.js            │ Inquiry + Lead state machines
  social.registry.js         │ SocialCase + assessment + plan
  homeVisit.registry.js      │ Visit types + concern levels + observation domains
  welfare.registry.js        │ Application types + agencies + appeal fork
  community.registry.js      │ Partner categories + linkage types/purposes
  psych.registry.js          │ Flags + scales + MDT
  independence.registry.js   │ Transition + IADL (Lawton) + Participation
  retention.registry.js      │ Risk factors + bands + intervention matrix

backend/models/care/
  Inquiry.model.js                    INQ-YYYY-NNNNN
  Lead.model.js                       LEAD-YYYY-NNNNN
  SocialCase.model.js                 SC-YYYY-NNNNN
  HomeVisit.model.js                  HV-YYYY-NNNNN
  WelfareApplication.model.js         WA-YYYY-NNNNN
  CommunityPartner.model.js           CP-YYYY-NNNNN
  CommunityLinkage.model.js           CL-YYYY-NNNNN
  PsychRiskFlag.model.js              RF-YYYY-NNNNN
  PsychScaleAssessment.model.js       PSA-YYYY-NNNNN
  MdtMeeting.model.js                 MDT-YYYY-NNNNN
  TransitionReadinessAssessment.model.js    TRA-YYYY-NNNNN
  IadlAssessment.model.js             IADL-YYYY-NNNNN
  CommunityParticipationLog.model.js  CPL-YYYY-NNNNN
  RetentionAssessment.model.js        RET-YYYY-NNNNN
```

---

## 3. Key design patterns

### 3.1 Vertical-slice per commit

Every commit from C1-C8 ships: **registry → model → service → routes → bootstrap accessor → tests → CHANGELOG entry**. No commit skips a layer. The bootstrap accessor pattern (`_getXxxService()` with late binding) lets routes resolve against either the booted singleton or a fallback constructor, so `/api/care/*` endpoints work even before bootstrap completes.

### 3.2 Cross-service orchestration via bus subscriptions

Direct service-to-service calls would couple the care platform tightly. Instead, services emit `ops.care.*` events, and `careBootstrap.js` subscribes one service to another's events. Two established examples:

**C3 home-visit → C2 social-case:**

```js
bus.on('ops.care.social.home_visit_critical_concern', async payload => {
  if (!payload?.caseId) return;
  await socialCaseService.flagHighRisk(payload.caseId, {
    riskLevel: 'high',
    reason: `home_visit_critical_concern (${payload.visitNumber})`,
  });
});
```

**C5 psych → C2 social-case:**

```js
bus.on('ops.care.psych.risk_flag_raised', async payload => {
  if (payload?.severity !== 'critical' || !payload?.caseId) return;
  await socialCaseService.flagHighRisk(payload.caseId, { ... });
});
```

C8 retention takes a different tack — direct service calls (not events) because auto-interventions need to record the returned flag/MDT `_id` in the assessment's `interventions[]` with ref backlinks. Both patterns coexist.

### 3.3 Required-field gates on state transitions

Every state machine defines `required: [...]` for transitions that need specific fields populated. Services validate these on transition; 422 response with `fields` array if missing. Examples:

- `social_case.active → closed` requires `resolution`
- `welfare.submitted → approved` requires `approvedAt`
- `psych_flag.active → monitoring` requires `safetyPlan`
- `mdt.scheduled → completed` requires `summary`

Drift tests enforce every transition has required fields declared (even if empty array).

### 3.4 Immutable snapshot vs. mutable state

Most care models have state machines (SocialCase, HomeVisit, etc.) — mutable with statusHistory. Two exceptions are immutable snapshots: `PsychScaleAssessment` (one per administration) and `RetentionAssessment` (one per run). Snapshots let us build longitudinal trend views without retroactively rewriting history.

### 3.5 Auto-numbered sequence

Every care model implements `schema.pre('validate')` that generates `PREFIX-YYYY-NNNNN` via countDocuments query. Year rolls at UTC midnight January 1. Prefixes are stable identifiers that appear in UI, notifications, and logs.

### 3.6 Partner name snapshot pattern

`CommunityLinkage.partnerNameSnapshot` + `CommunityParticipationLog.partnerNameSnapshot` freeze the partner's name at creation time. Partner rename or deactivation does NOT rewrite history — logs remain readable. Established in C4, reused in C6.

---

## 4. Operational playbook

### 4.1 Day-to-day flows

**Inquiry → active beneficiary:**

1. Walk-in / phone inquiry → `POST /api/care/crm/inquiries` creates `INQ-...` with `crm.inquiry.acknowledge` SLA (1h)
2. Staff acknowledges → transitions inquiry to `in_progress` → SLA stopped
3. `POST /api/care/crm/inquiries/:id/promote` creates `LEAD-...` with dual SLAs (first_response 4h + conversion 14d)
4. Lead qualifies → marked `converted` → beneficiary record created (out of scope for care)
5. Caseworker opens `POST /api/care/social/cases` → creates `SC-...`

**Risk escalation (the critical chain):**

1. Home visit closes with `critical` concern observation + linked caseId → `homeVisit.completeVisit()` emits `ops.care.social.home_visit_critical_concern`
2. `careBootstrap` subscriber auto-calls `socialCase.flagHighRisk(caseId)` → starts `social.case.high_risk_review` SLA (24/7, 2h response)
3. Psychologist administers PHQ-9 with item 9 non-zero → scoring triggers auto-flag, flag emits `ops.care.psych.risk_flag_raised` with `severity: critical`
4. Second subscriber auto-flags the case (defensive — may be redundant but idempotent)
5. Next retention sweep identifies `stale_critical_flag` factor if unresolved after 7 days → band escalates to `imminent` → auto-raises neglect_risk flag + schedules MDT +3d + re-flags case

### 4.2 Common queries

```
# Find all beneficiaries at imminent churn risk
GET /api/care/retention/high-risk?band=imminent&acknowledged=false

# Full 360 for a beneficiary
GET /api/care/360/:beneficiaryId

# What needs attention today?
GET /api/care/360/:beneficiaryId/attention

# High-risk social cases
GET /api/care/social/cases?riskLevel=high&status=active

# Open critical psych flags
GET /api/care/psych/flags?severity=critical&status=active

# Welfare apps stuck waiting on agency
GET /api/care/welfare?status=info_requested
```

### 4.3 Manager dashboards

- **Retention Manager:** `/api/care/retention/high-risk` — unacknowledged imminent + high assessments
- **Social Manager:** `/api/care/social/cases?status=active&riskLevel=high`
- **Psych Director:** `/api/care/psych/flags?status=active` + `/api/care/psych/mdt?status=scheduled`
- **Care Manager:** `/api/care/360/:beneficiaryId/summary` per case, in a list view
- **CRM Manager:** `/api/care/crm/leads?status=lost` to find reopen candidates

### 4.4 Scheduled jobs (Phase 17 doesn't schedule; consumer does)

Phase 17 exposes `POST /api/care/retention/sweep` but does NOT schedule it. Operators should run it nightly (or hourly for a subset branch) via their preferred cron/job scheduler. Recommended cadence:

- **Nightly full sweep** over all active beneficiaries (`limit=all`) — catches drift
- **Hourly sweep** over yesterday's changed beneficiaries — catches fast-moving risk
- **Event-driven** sweep on `ops.care.social.case_flagged_high_risk` — reassess immediately after case escalation

---

## 5. Known coexistences

### 5.1 Legacy models untouched

- `CrmLead` (old) coexists with `Lead` (C1). Different collections. Teams migrate at their own pace.
- `Complaint` + `CrmSurvey` untouched.
- `CommunityIntegration` route (older) kept separately; C4 `CommunityLinkage` is the new canonical.

### 5.2 Beneficiary model ownership

Care platform **reads** from the Beneficiary model but never writes to it. Beneficiary lifecycle (registration, demographic edits, discharge) is owned by the beneficiary subsystem outside of Phase 17.

### 5.3 Ops vs Care SLA engines

Care services reuse the Phase-16 SLA engine (`backend/services/operations/slaEngine.service.js`). No second engine. Breach notifications flow through the same Phase-15 notification router. If a care SLA breaches, the same pager goes off as if a work order breaches.

---

## 6. Verification + drift

Run these before shipping anything touching care:

```bash
# All care tests
npx jest --testPathPatterns="backend/__tests__/care-" --silent

# SLA registry drift (new care SLAs must be listed in OPS_MODULES)
npx jest --testPathPatterns="sla-registry"

# Specific commit suites
npx jest --testPathPatterns="care-crm"
npx jest --testPathPatterns="care-social"
npx jest --testPathPatterns="care-home-visit"
npx jest --testPathPatterns="care-welfare"
npx jest --testPathPatterns="care-community"
npx jest --testPathPatterns="care-psych"
npx jest --testPathPatterns="care-independence"
npx jest --testPathPatterns="care-beneficiary360"
npx jest --testPathPatterns="care-retention"
```

C9 adds:

- `care-drift.test.js` — cross-commit invariants (registry consistency, route registration, bootstrap accessor coverage)
- `care-e2e-integration.test.js` — full orchestration chain with fake models (registration → case → home visit → critical concern → flag propagation → retention reassessment)

---

## 7. Future follow-ups (outside Phase 17)

1. **UI layer** — Next.js pages for all care surfaces in `alawael-rehab-platform/apps/web-admin/` (pattern established by Phase 16 UI)
2. **Scheduled retention sweep** — cron job wiring in platform's scheduler
3. **Psych scale library expansion** — add AUDIT (substance), PCL-5 (trauma), SDQ (children)
4. **CrmLead → Lead migration** — batch job to fold legacy records into C1 schema
5. **Community partner agreement tracking** — upload/renewal workflow on partner docs
6. **Participation auto-synthesis from CommunityLinkages** — when a linkage is "active ongoing", auto-create monthly participation placeholder entries
7. **Trend-based retention alerting** — fire notifications when trend flips worsening three consecutive assessments

---

## 8. Contact points / accessors

Every service is accessed via the care bootstrap module:

```js
const careBootstrap = require('./backend/startup/careBootstrap');

careBootstrap._getLeadFunnelService();
careBootstrap._getSocialCaseService();
careBootstrap._getHomeVisitService();
careBootstrap._getWelfareService();
careBootstrap._getCommunityService();
careBootstrap._getPsychService();
careBootstrap._getIndependenceService();
careBootstrap._getBeneficiary360Service();
careBootstrap._getRetentionService();
```

All return `null` if bootstrap hasn't run — routes fall back to constructing a local service from the models + registries directly.

---

## 9. Phase 17 closure

**Phase 17 is CLOSED.** 9 commits shipped across 4.0.83 → 4.0.91. 438+ tests green. Every audit gap closed. Architecture mirrors Phase 16 (Ops Control Tower) — same SLA engine, same event bus, same notification router, same bootstrap/accessor/routes pattern. Phase 18 may extend with UI (Next.js) + retention scheduler or jump to a new bounded context entirely.
