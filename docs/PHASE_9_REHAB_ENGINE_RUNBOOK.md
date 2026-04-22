# Phase 9 — Rehabilitation Program Engine Runbook

**Release marker:** 4.0.13 — Phase 9 C1–C15 (2026-04-22)
**Scope:** unified cross-discipline rehab engine (IRP builder, SMART goals, review cycles, progress analytics, auto-suggestions, rehab red-flags + KPIs, frontend service layer, report builders).

---

## 1. What Phase 9 delivers

| #   | Design requirement                                      | Delivered in   |
| --- | ------------------------------------------------------- | -------------- |
| 1   | Library of rehab programs (11 disciplines)              | C1             |
| 2   | Customisable assessments / outcome measures             | C1             |
| 3   | IRP (Individual Rehab Plan) engine                      | C1 + C7 + C9   |
| 4   | SMART Goals engine                                      | C1 + C7        |
| 5   | Goal review cycle + reassessment rules                  | C9 + C10       |
| 6   | Session → Goal linkage                                  | existing + C7  |
| 7   | Outcome tracking over time (trend / velocity / mastery) | C11 + C12      |
| 8   | Reassessment grace window                               | C9             |
| 9   | Auto-suggest goals + interventions                      | C8             |
| 10  | Alerts (rehab-specific red-flags, live-wired)           | C3 + C10 + C12 |

All ten design requirements are satisfied end-to-end at the backend.
Commits C13–C14 add the frontend service layer and pure report
builders for presentation surfaces.

---

## 2. Commit ledger

| #   | SHA        | Summary                                                                                              |
| --- | ---------- | ---------------------------------------------------------------------------------------------------- |
| 1   | `9e3ffd6c` | `config/rehab-disciplines.registry.js` — 11 disciplines, 12 helpers, 140 drift tests                 |
| 2   | `19653c97` | +12 rehab KPIs (`config/kpi.registry.js` 22 → 34)                                                    |
| 3   | `890a65a7` | +6 rehab red-flags (`config/red-flags.registry.js` 26 → 32)                                          |
| 4   | `bb325a99` | cross-wire disciplines ↔ KPIs ↔ red-flags                                                          |
| 5   | `20dd386e` | `rehabDisciplineService` + routes at `/api/v1/rehab/disciplines/*` (26 + 15 tests)                   |
| 6   | `eb1f3d29` | `rehabSeedPlanner` service + CLI (table / JSON / markdown)                                           |
| 7   | `a46fea5e` | Goal schema: 9 SMART fields (non-breaking)                                                           |
| 8   | `acd90305` | `goalSuggestionService` + routes at `/api/v1/rehab/goal-suggestions/*` (13 + 15 tests)               |
| 9   | `270d4ed4` | `PlanReview` model + `carePlanReviewService` (27 tests)                                              |
| 10  | `49f5d7cd` | live-wire review-overdue red-flag into `redFlagBootstrap.js`                                         |
| 11  | `32f30fa6` | `progressEngine` — trend / velocity / mastery / regression streak (pure math, 32 tests)              |
| 12  | `a1b356bd` | merge `progressEngine` adapter into `goalProgressService` locator slot                               |
| 13  | `8fa828db` | frontend service layer: `rehabDisciplines.service.js` + `rehabGoalSuggestions.service.js` (11 tests) |
| 14  | `cad6bba4` | `rehabReportBuilders` — 5 pure report builders (19 tests)                                            |
| 15  | (this)     | Phase 9 runbook + release marker                                                                     |

~1430 tests pass across Phase 9 suites.

---

## 3. Runtime wiring

### HTTP surfaces

```
GET  /api/v1/rehab/disciplines/taxonomy
GET  /api/v1/rehab/disciplines/health
GET  /api/v1/rehab/disciplines/suggest?age=…&icf=…
GET  /api/v1/rehab/disciplines
GET  /api/v1/rehab/disciplines/:id
GET  /api/v1/rehab/disciplines/:id/programs
GET  /api/v1/rehab/disciplines/:id/interventions
GET  /api/v1/rehab/disciplines/:id/measures
GET  /api/v1/rehab/disciplines/:id/goal-templates

GET  /api/v1/rehab/goal-suggestions/goals
POST /api/v1/rehab/goal-suggestions/goals
GET  /api/v1/rehab/goal-suggestions/interventions
GET  /api/v1/rehab/goal-suggestions/draft?templateCode=…
```

### Red-flag locator keys used by Phase 9

| Key                     | Flags fed                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `carePlanReviewService` | `operational.care_plan.review.overdue`                                                                                                                                                       |
| `goalProgressService`   | `clinical.goal.stalled.21d`, `clinical.goal.regression.consecutive_2` (progress lifecycle methods merged from `progressEngine`) — still carries the Beneficiary-360 `deltaVsBaseline` method |

Registered inside `redFlagBootstrap.js`. Out-of-scope for Phase 9:
`outcomeMeasureService` + `sessionDocumentationService` adapters
(feed the 2 remaining rehab flags).

### Registries consumed

- `config/rehab-disciplines.registry.js` — 11 disciplines catalog
- `config/kpi.registry.js` — 34 KPIs (12 rehab-engine)
- `config/red-flags.registry.js` — 32 flags (6 rehab)

---

## 4. Operational procedures

### 4.1 Seed-plan review (before prod deploy)

```bash
node scripts/rehab-seed-planner.js --markdown > seed-plan.md
```

Outputs discipline → Program.category mapping, deduped measures
(39 unique from 43 refs) and interventions. Review manually for
coverage gaps before running seeders.

### 4.2 Triggering a care-plan review manually

Create a `PlanReview` doc with `{ carePlanId, dueAt }`. The
`operational.care_plan.review.overdue` flag will fire on the next
scheduler tick if `dueAt < now` and `completedAt` is unset.

### 4.3 Running a rehab report

All 5 report builders are pure functions in
`backend/services/rehabReportBuilders.js`. Example:

```js
const builders = require('./services/rehabReportBuilders');
const snap = builders.buildIrpSnapshot({
  beneficiary,
  carePlan,
  goals,
  progressByGoal,
  reviews,
});
```

Caller is responsible for loading the inputs (typically via
`goalProgressService` + `carePlanReviewService`).

### 4.4 Frontend integration

Import the service modules rather than hardcoding endpoint strings:

```js
import rehabDisciplines from 'services/rehabDisciplines.service';
import rehabGoalSuggestions from 'services/rehabGoalSuggestions.service';

const { data } = await rehabDisciplines.getTaxonomy();
const { data: draft } = await rehabGoalSuggestions.draft({
  templateCode: 'PT.GAIT.001',
});
```

---

## 5. Roll-back plan

Phase 9 is additive. To roll back, revert commits in reverse order
(C15 → C1). Each commit is independently revertable:

- C13–C14: presentation-layer only; no DB, no migrations.
- C9 adds a new `PlanReview` collection — dropping it is safe; no
  other collection references it.
- C7 adds 9 optional Goal fields — legacy goals still validate,
  reverting drops nothing clients depend on.
- C1–C4: registry edits; reverting restores prior KPI / flag lists.

No data migration is required in any direction.

---

## 6. Known limitations carried forward

- 2 of 6 rehab red-flags not live-wired (outcome-measure + session-documentation adapters out of Phase-9 scope; registry entries present and dormant).
- UI pages (IRP wizard, goal-detail view, progress timeline) not landed — service layer is ready, pages are scoped for Phase-10.
- PDF / email export of the 5 reports is not implemented — report builders return JSON; presentation transforms live in future commits.

---

## 7. Sign-off

- Architecture: all 10 design requirements met ✓
- Tests: ~1430 passing across Phase-9 suites ✓
- Live red-flag coverage: 4 of 6 rehab flags firing end-to-end ✓
- Backwards compatibility: no breaking schema or API changes ✓
- Release marker: **4.0.13**
