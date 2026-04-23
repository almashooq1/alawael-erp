# Phase 13 — QMS & Compliance Platform · Operator Runbook

**Status:** Complete (C1 → C12, versions 4.0.55 → 4.0.62)
**Regulatory scope:** CBAHI · JCI · MOH · ISO 9001:2015 · ISO 27001 Annex A · PDPL · HRSD · GOSI · SOCPA · ZATCA · SFDA · Civil Defence · SCFHS

This runbook is the day-to-day operator's guide to the Phase 13 QMS & Compliance stack: what each piece does, how to verify it's working, how to respond when it alerts, and how to extend it safely.

## 1. What shipped

| #   | Commit                       | Version | Output                                                 |
| --- | ---------------------------- | ------- | ------------------------------------------------------ |
| C1  | ManagementReview             | 4.0.55  | ISO 9001 §9.3 state machine (16 tests)                 |
| C2  | EvidenceRepository           | 4.0.56  | Tamper-evident vault w/ retention policies (20 tests)  |
| C3  | ComplianceCalendar           | 4.0.57  | Unified calendar aggregator (20 tests)                 |
| C4  | Control Library              | 4.0.58  | 58 controls · 13 frameworks (25 tests)                 |
| C9  | Health Score                 | 4.0.59  | 10-pillar executive score (23 tests)                   |
| C11 | Bootstrap + Sweepers         | 4.0.60  | Boot wiring + retention + calendar sweepers (12 tests) |
| C10 | Web-admin UI                 | 4.0.61  | 5 pages in alawael-rehab-platform                      |
| C5  | QualityEventBus              | 4.0.62  | In-process pub/sub                                     |
| C6  | CAPA aging scheduler         | 4.0.62  | Overdue flip + effectiveness-check reminders           |
| C7  | NCR auto-link pipeline       | 4.0.62  | Incident → NCR → CAPA chain                            |
| C8  | Risk re-assessment scheduler | 4.0.62  | Quarterly review enforcement                           |
| C12 | Runbook (this document)      | 4.0.62  | Operator guide                                         |

**Total new tests:** 145 / 145 passing across 8 test suites.

## 2. Service map

```
┌─────────────────────────── QualityEventBus (C5) ───────────────────────────┐
│   Every service below publishes events here.                                │
│   Subscribe patterns: quality.*  ·  compliance.*  ·  <exact>                │
└──────┬──────────────────┬──────────────────┬──────────────────┬─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
  ManagementReview   EvidenceVault     Calendar          ControlLibrary
  (C1)               (C2)              (C3)              (C4)
  ─── route ────────────────────────────────────────────────────────────────
  /api/v1/management-review
  /api/v1/evidence
  /api/v1/compliance-calendar
  /api/v1/quality-controls
  /api/v1/quality/health-score   ←  HealthScoreAggregator (C9)

  Sweepers / listeners (hourly, boot-started)
  ───────────────────────────────────────────
  EvidenceRetentionSweeper       (C11) → compliance.evidence.{expired,expiring}
  ComplianceCalendarAlertSweeper (C11) → compliance.calendar.alert
  CapaAgingScheduler             (C6)  → quality.capa.{overdue,aging,effectiveness_check_due}
  RiskReassessmentScheduler      (C8)  → quality.risk.reassessment_due{,_soon}
  NcrAutoLinkPipeline            (C7)  → quality.ncr.auto_linked
                                         (triggered by quality.incident.reported)
```

## 3. Boot sequence

All wiring happens in `backend/startup/qualityComplianceBootstrap.js`, invoked from `backend/startup/schedulers.js` 45 seconds after Mongo connects.

Order:

1. Create the `QualityEventBus`. If the caller injected an external dispatcher (webhook sink), wrap it so both external + internal subscribers fire.
2. Build `ManagementReview`, `EvidenceVault`, `ControlLibrary` services with the combined dispatcher.
3. Build `ComplianceCalendar` with adapters for the vault + review service so the unified view auto-surfaces evidence expiry + scheduled reviews.
4. Re-seat the lazy singletons used by route handlers (`_replaceDefault`).
5. Build `HealthScoreAggregator` over all four services + any cross-module sources passed via `extraSources`.
6. Create sweepers (evidence retention, calendar alerts, CAPA aging, risk re-assessment).
7. Create NCR auto-link pipeline subscribed to `quality.incident.reported`.
8. If `startSweepers: true`, start all timers and the pipeline subscriber.
9. If `seedScope` provided, seed the 58-control library for that branch.
10. Log: `[QMS] Phase 13 bootstrap complete — services wired, sweepers running`.

Graceful shutdown stops every timer, unsubscribes the pipeline, and awaits `bus.flush()` so in-flight listeners finish before the process exits.

## 4. Daily checks

### 4.1 Executive health score

- **Endpoint:** `GET /api/v1/quality/health-score?branchId=…`
- **Expected:** `score ≥ 80` (grade B or better) for operational branches.
- **If below threshold:**
  - Open `hotspots[]` — listed critical→info.
  - Each hotspot carries `pillar`, `kind`, `detail`, optional `ref`.
  - Drill into the pillar's page from `summary.pillarsAvailable` (if less than 10, `warnings[]` names the missing sources — usually a cross-module integration offline).

### 4.2 Compliance calendar

- **Endpoint:** `GET /api/v1/compliance-calendar?withinDays=30`
- **Expected:** `stats.byStatus.overdue = 0` for an up-to-date branch.
- **If overdue > 0:** Each overdue event links to its source (adapter + docId). Resolve, snooze, or cancel with reason via the page `/quality/calendar`.

### 4.3 Evidence vault freshness

- **Endpoint:** `GET /api/v1/evidence/stats`
- **Expected:** `expired = 0` for branches passing compliance.
- **If `expired > 0`:** Uploads needed. The retention sweeper fires `compliance.evidence.expiring` 30/14/7/1 days before expiry so downstream email/SMS should have alerted responsible owners.

### 4.4 Control library coverage

- **Endpoint:** `GET /api/v1/quality-controls/coverage`
- **Expected:** `byCriticality.critical.fail = 0`. Every failed critical control = 15-point deduction on the health score.
- **Per-framework view** at `/quality/controls` shows pass-rate bars — any bar below 80% is a CBAHI/JCI audit risk.

## 5. Incident response workflow

Operators don't need to touch anything — the platform automates the chain:

```
1. Incident reported (severity ≥ major)
     │  quality.incident.reported event fires
     │
2.   NCR auto-created                       (C7 pipeline)
     │  ncr.reportInfo.title = "Auto-NCR: <incident title>"
     │  quality.ncr.auto_linked event fires
     │
3.   CAPA skeleton created                  (C7 pipeline)
     │  capa.linkedNcr.ncrId = <ncr>
     │  targetCompletionDate = now + 30d
     │
4.   CAPA scheduler watches                 (C6)
     │  ├─ daily: targetCompletionDate crosses → flip to 'delayed'
     │  │         emit quality.capa.overdue
     │  │
     │  └─ 30d after actualCompletionDate    → emit
     │            quality.capa.effectiveness_check_due
     │
5.   Calendar surfaces the chain            (C3 adapters)
     │  NCR + CAPA both appear on `/quality/calendar`
     │
6.   Health score reflects changes          (C9)
        ├─ CAPA closure rate pillar drops if delayed
        └─ Controls pillar drops if linked control fails a test
```

Idempotency is guaranteed at every step: re-emitting `quality.incident.reported` for an already-processed incident does nothing.

## 6. Event catalogue

Subscribe patterns (register via `bus.on(pattern, fn)`):

| Event                   | Emitter                  | Pattern to subscribe           |
| ----------------------- | ------------------------ | ------------------------------ |
| `quality.review.*`      | ManagementReview service | `quality.review.*` (10 events) |
| `compliance.evidence.*` | EvidenceVault + sweeper  | `compliance.evidence.*` (7)    |
| `compliance.calendar.*` | Calendar + sweeper       | `compliance.calendar.*` (5)    |
| `compliance.control.*`  | ControlLibrary service   | `compliance.control.*` (5)     |
| `quality.capa.*`        | CAPA scheduler           | `quality.capa.*` (3)           |
| `quality.risk.*`        | Risk scheduler           | `quality.risk.*` (2)           |
| `quality.ncr.*`         | NCR pipeline             | `quality.ncr.*` (1)            |

Diagnostic: call `bus.recent(100)` for the last 100 events (ring buffer), `bus.subscribers()` for pattern→count snapshot.

## 7. When something alerts

### 7.1 Health score < 80

**Cause:** one or more pillars below their target.
**Action:** open `/quality/health-score`, scan pillar cards. Each shows `details` (e.g. `criticalFails: 2`). Drill into that pillar's page. Hotspots list is the shortcut.

### 7.2 `compliance.evidence.expired` event

**Cause:** an evidence item's `validUntil` passed. Status flipped to `expired`.
**Action:** the dispatcher fans out to email/Slack. Responsible role (named on the evidence `signatures[]` or the associated control's `ownerRole`) should upload a renewed item via `/quality/evidence/[id]/supersede` (endpoint lands in next phase — use API directly today).

### 7.3 `quality.capa.overdue` event

**Cause:** CAPA past its `targetCompletionDate` without completion.
**Action:** the implementation owner is named in the event payload (`ownerName`). Management-review dashboard will list under "open actions". Re-assign or extend via internal-audit admin UI.

### 7.4 `quality.capa.effectiveness_check_due` event

**Cause:** 30 days since CAPA completion.
**Action:** Quality Manager verifies the CAPA actually prevented recurrence. Record evidence via `/api/v1/quality-controls/<id>/test-runs` with `outcome=pass`. If ineffective, reopen the CAPA and re-emit the chain.

### 7.5 `quality.risk.reassessment_due` event

**Cause:** a risk has not been reviewed in > cadence days (30 critical / 60 high / 90 medium / 180 low).
**Action:** risk owner re-evaluates likelihood × impact, updates `reviewDate` on the Risk document. Dedup window = 24h so one risk won't spam the same owner.

## 8. Adding a new subscriber

Listen to events from your module:

```js
const { getDefault: getBus } = require('../services/quality/qualityEventBus.service');
const bus = getBus();

const off = bus.on('quality.review.closed', async (payload, eventName) => {
  // payload = { reviewId, reviewNumber, branchId, closedBy, ... }
  await sendEmail(payload);
});

// Later, to detach:
off();
```

Guidance:

- Listeners fire **concurrently** per event — don't assume ordering.
- Don't throw; if you must, it's caught and logged but your work won't retry.
- Keep listeners **small + idempotent** — the bus has no at-least-once guarantee; treat it as at-most-once with manual retry at a higher layer.

## 9. Adding a new control

Edit `backend/config/control-library.registry.js`. Follow the existing shape:

```js
{
  id: 'cbahi.xx.01',            // <framework>.<category>.<seq>
  nameAr: '…', nameEn: '…',
  category: 'patient_safety',   // from CONTROL_CATEGORIES
  type: 'preventive',           // preventive/detective/corrective/directive
  frequency: 'monthly',         // continuous → annual / on_event
  criticality: 'high',          // low/medium/high/critical
  testMethod: 'evidenced',      // automatic/evidenced/manual
  regulationRefs: [{ standard: 'cbahi', clause: 'XX.1' }],
  assertion: 'short testable sentence.',
  // if testMethod === 'automatic':
  //   autoTestHint: { check: 'your_runner_token' }
}
```

Then run `POST /api/v1/quality-controls/seed { branchId: ... }` — idempotent; existing control rows refresh in place, test history preserved.

If `testMethod: 'automatic'`, register a runner at bootstrap:

```js
bootstrapQualityCompliance({
  logger,
  autoCheckRunners: {
    your_runner_token: async ({ control, ...ctx }) => {
      // return { outcome, score?, details?, gaps?, narrative? }
      return { outcome: 'pass', score: 100 };
    },
  },
});
```

## 10. Testing

Phase-13 test commands from `66666/` root:

```
# All Phase 13 suites
npx jest backend/__tests__/management-review-service.test.js \
         backend/__tests__/evidence-vault-service.test.js \
         backend/__tests__/compliance-calendar-service.test.js \
         backend/__tests__/control-library-service.test.js \
         backend/__tests__/health-score-aggregator.test.js \
         backend/__tests__/quality-sweepers.test.js \
         backend/__tests__/quality-event-bus.test.js \
         backend/__tests__/quality-wrap-up-schedulers.test.js \
         --runInBand

# Expected: 145 passed, 0 failed
```

## 11. Known limitations & scope boundaries

- **No batch upload endpoint** for evidence. Use `/api/v1/documents` pipeline + pass the storage key + SHA-256 to `POST /api/v1/evidence`.
- **CAPA + Risk models are pre-Phase-13 legacy** (located in `backend/models/internal-audit/` and `backend/models/quality/Risk.model.js`). Phase 13 sweepers read them without modifying; the existing admin UI still owns writes.
- **Cross-module health-score pillars** (incidents, complaints, CAPA pillar, satisfaction, training, documents) are best-effort. When unavailable, the pillar reports `null`, a warning is recorded, and remaining weights renormalise. Wire adapters at bootstrap via `extraSources`.
- **External regulator API submissions** (MOH, SFDA inspection portals) are out of scope.
- **Binary file integrity beyond upload-time hash** is not re-verified on every read; verification is triggered explicitly via `POST /api/v1/evidence/:id/verify`.

## 12. Rollback

If a Phase 13 release needs to be rolled back:

1. Revert the backend commits (`git revert bb4e4229 <others>`).
2. No schema migrations were destructive — all Phase 13 models use new collections (`managementreviews`, `evidenceitems`, `compliancecalendarevents`, `qualitycontrols`). Pre-existing collections are untouched.
3. `EvidenceItem.retention.alertsFired[]` is the only new field added to a Phase-13-owned model; it's additive and safe to leave.
4. Re-seat singletons unnecessary — `getDefault()` lazily reconstructs on next use.

## 13. Contacts

- **Architectural owner:** Quality Director (CBAHI/JCI compliance)
- **Technical owner:** Platform engineering
- **Regulatory consultants:** MOH accreditation liaison
- **Escalation:** Critical control failure → CTO; critical incident chain failure → Medical Director

---

**End of runbook.** For the per-commit implementation detail, see `CHANGELOG.md` entries 4.0.55 → 4.0.62.
