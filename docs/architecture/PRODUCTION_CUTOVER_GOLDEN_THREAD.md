# Production Cutover — Golden Thread arc (W1090 → W1165)

> **Status:** built + verified (119/119 across 22 suites, run together 2026-06-10),
> awaiting deploy. **Scope:** the beneficiary "golden thread"
> (assessment → goal → measure → session → baseline → outcome) data layer + its
> deterministic intelligence layer (traversal, next-best-action, caseload triage)
>
> - the web-admin clinician view.
>
> **Single source of truth** for activating this arc in production. Companion to
> [`docs/blueprint/43-beneficiary-journey-operating-system.md`](../blueprint/43-beneficiary-journey-operating-system.md).

## 0. TL;DR deploy order

1. **Deploy `66666` backend** (branch `feat/w928-core-linkage`) — additive, no env flags, no destructive migration. New indexes build in the background on first model load.
2. **Merge + deploy web-admin PR #57** (`feat/golden-thread-ui` → master) — it calls the new backend endpoint; deploy backend FIRST or the page shows an error state (graceful).
3. **(Optional, post-deploy)** run the read-only audit CLIs to baseline thread health.
4. **(Owner-gated, later)** the model-convergence migrations — NOT part of this cutover.

Nothing here mutates data. Every change is additive (optional fields + indexes + read-only services). Existing documents are unaffected; legacy rows simply have the new optional fields unset.

## 1. Commits in this arc (all on `feat/w928-core-linkage`)

| Wave                  | Change                                                                                                 | Kind                               |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| W1090                 | `Goal.linkedMeasures[]` (+ fixed a latent Mongoose-9 callback save-hook)                               | additive field + invariants        |
| W1133                 | `Goal.therapeuticGoalId` bridge (ADR-040 Option-C) + `@deprecated` markers                             | additive field (field-level index) |
| W1145                 | `MeasurementResult.isBaseline` + `baselineResultId` + 2 invariants                                     | additive fields + 1 index          |
| W1149                 | `ClinicalSession.goalProgress.goalId` reverse index **+ fixed callback `pre('save')` → sync no-next**  | additive index + hook fix          |
| W1151                 | `TherapeuticGoal.measureApplicationId` (assessment provenance) + writes it in W568 flow                | additive field + 1 index           |
| W1153                 | `MeasureApplication.assessmentId` reverse index (canonical assessment↔measure bridge)                 | additive index                     |
| W1154 (+ `8a1d92bd4`) | `TherapeuticGoal.carePlanId` index; confirmed `Goal.therapeuticGoalId` field-index (removed duplicate) | additive index                     |
| W1156                 | `services/goldenThread.service.js` `traceByBeneficiary()` + `goldenThread` 360 widget                  | read-only service                  |
| W1158                 | Smart Attention Queue `deriveNextActions()` (next-best-action per break-stage)                         | read-only logic                    |
| W1165                 | Caseload triage `summarizeCaseloadAttention()` + `audit:golden-thread-attention` CLI                   | read-only logic + CLI              |

web-admin: **PR #57** (`feat/golden-thread-ui`) — clinician Golden Thread view + Smart Attention Queue.

## 2. New indexes that build at deploy (background)

On first load of each model against prod, Mongoose builds these. All are additive; `sparse` ones only index documents that set the field (most legacy rows won't, so the index stays small). On large collections, index builds run in the background — no downtime, but monitor for build completion before relying on the reverse queries.

| Collection             | Index                                           | Purpose                                                    |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `measurement_results`  | `{ baselineResultId: 1 }`                       | progress → baseline lookup (W1145)                         |
| `measurement_results`  | `{ beneficiaryId, typeId, isBaseline }`         | find a series' baseline (W1145)                            |
| `clinical_sessions`    | `{ 'goalProgress.goalId': 1 }`                  | "which sessions targeted this goal?" (W1149)               |
| `therapeutic_goals`    | `{ measureApplicationId: 1 }` (sparse)          | "which goals did this assessment generate?" (W1151)        |
| `therapeutic_goals`    | `{ carePlanId: 1 }` (sparse)                    | "which goals belong to this care plan?" (W1154)            |
| `measure_applications` | `{ assessmentId: 1 }` (sparse)                  | "which administrations came from this assessment?" (W1153) |
| `goals`                | `therapeuticGoalId` (field-level `index: true`) | "which IEP goals bridge to this canonical goal?" (W1133)   |

## 3. New read endpoint

- **`GET /api/v2/core/beneficiaries/:beneficiaryId/360/widget/goldenThread`** (+ legacy `/api/core/...`).
  Returns `{ beneficiaryId, threads:[…], summary:{…, attentionCount}, nextActions:[…] }`.
  Access is enforced server-side by `branchScopedBeneficiaryParam` (W1160 branch-ownership on the `:beneficiaryId` param) — a restricted caller cannot read another branch's beneficiary.
- Also reachable as a widget on the full dashboard: `GET …/360?widgets=goldenThread`.
- This is the **domains/core** 360 (distinct from the `/api/v1/care/360` service — do not confuse them).

## 4. Operational audit CLIs (read-only, admin-run; no flags needed beyond `MONGODB_URI`)

| Command                                                                    | Answers                                                                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run audit:golden-thread [--branch=<id>] [--json]`                     | thread-completeness health: % of goals with a complete thread (HEALTHY/PARTIAL/FRAGMENTED) + where threads break |
| `npm run audit:golden-thread-attention --branch=<id> [--limit=N] [--json]` | caseload triage — which beneficiaries need attention, ranked, with the single next-best-action                   |
| `npm run audit:goal-consolidation [--json]`                                | which goal/measure/plan models hold production data — **gates** the owner's model-convergence decision           |

Run `audit:golden-thread` post-deploy to baseline thread health, and `audit:golden-thread-attention` as a clinician morning-triage report.

## 5. Verification (post-deploy)

- Backend: `cd backend && npm run check:duplicate-schema-index` (✓), and the arc suite stays green:
  `npx jest --config=jest.config.js --runInBand __tests__/{goal-linked-measures-wave1090,measurement-result-baseline-linkage-wave1145,session-goal-linkage-wave1149,assessment-goal-provenance-wave1151,assessment-measure-bridge-wave1153,plan-goal-linkage-wave1154,golden-thread-service-wave1156,golden-thread-next-actions-wave1158,golden-thread-attention-wave1165}.test.js` (+ their `-behavioral-` counterparts) → 119/119.
- Endpoint smoke: `curl -H "Authorization: Bearer <jwt>" $API/api/v2/core/beneficiaries/<id>/360/widget/goldenThread` → `{ success:true, data:{ threads, summary, nextActions } }`.
- web-admin: `cd apps/web-admin && npm run typecheck && npm run lint` (✓), then open `/golden-thread/<beneficiaryId>`.

## 6. Owner-gated remainder (NOT part of this cutover)

The arc deliberately stops at additive/lock work. The following are **decisions, not code**, and require owner sign-off before any destructive migration:

- **Model convergence** — ADR-040 (3 goal models → `TherapeuticGoal` canonical), ADR-041 (`Measure` vs `MeasurementMaster`), ADR-026/042 (CarePlan/IEP/IFSP). Run `audit:goal-consolidation` first; its counts tell you whether each retire is trivial (empty) or needs a data migration.
- **Legacy free-text → ref migration** for the residual gap #2/#3 cases (old sessions/goals whose source survived only as text/tags).

When the owner signs off a convergence, the migration ships as a SEPARATE, dry-run-default script with its own `--execute` gate — never bundled into this additive cutover.
