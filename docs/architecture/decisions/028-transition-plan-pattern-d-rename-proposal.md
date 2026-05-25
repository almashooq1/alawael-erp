# ADR-028 — TransitionPlan Pattern D rename proposal (resolves W370 ALLOWLIST stopgap)

**Status**: 🟡 Proposed — needs MDT module owner + transition-planning clinical lead sign-off
**Date**: 2026-05-25
**Supersedes**: extends [ADR-021](021-duplicate-model-registration-consolidation-strategy.md); follows [ADR-022](022-approval-request-pattern-d-rename-proposal.md) / [ADR-023](023-report-template-pattern-d-rename-proposal.md) / [ADR-024](024-workflow-instance-pattern-d-rename-proposal.md) (the per-entry Pattern D series)
**Owner**: pending (suggest: MDT module owner + clinical director)
**Related**: W370 ALLOWLIST stopgap (no-duplicate-model-registration-wave340.test.js)

---

## Context

ADR-022/023/024 cleared the original 4 W340-discovery Tier 1 entries (ApprovalRequest / ReportTemplate / WorkflowInstance / AuditLog). On 2026-05-25 the W340 baseline scanner caught a **NEW** Tier 1 duplicate introduced by the W361 canonical-model expansion:

`TransitionPlan` is now registered in TWO files with DIVERGENT schemas:

1. **`backend/models/TransitionPlan.js`** (W361 canonical, camelCase, ~150 lines)
2. **`backend/rehabilitation-services/mdt-transition-quality.js`** (pre-existing legacy, snake_case, ~30 lines inline)

W370 (commit `0634a02a4`) ALLOWLISTed `TransitionPlan` as a stopgap to keep the W340 drift guard green while a decision was reached. This ADR is that decision.

---

## The 2 TransitionPlan schemas

### Schema A: `backend/models/TransitionPlan.js` (W361 canonical)

**Domain**: Life-stage transition planning (kindergarten→school, child→adolescent, etc.)
**Naming**: camelCase + canonical refs (W324+W329 compliant)
**Discriminating fields**:

```js
{
  beneficiaryId: ObjectId → 'Beneficiary' (required, indexed),
  branchId: ObjectId → 'Branch' (required, indexed),
  status: enum STATUSES = ['draft', 'readiness_assessed', 'in_progress', 'completed', 'paused', 'cancelled'],
  // 6-domain readiness scoring (W361):
  domainScores: [{ domain: enum DOMAINS, score: 1-5, notes }],
  // Milestone tracking with status enum:
  milestones: [{ status: enum MILESTONE_STATUSES, ... }],
  nextReviewDate: Date (queryable for W376 overdue-review metric),
  reviewerId, primaryOwnerId, ... (canonical User refs),
}
```

- Registered in W366 canonical catalog (`canonical/schemas/transition-plan.canonical.js`)
- Mongoose schema at top-level `backend/models/`
- W361+W362+W376 cron sweepers + heatmap metric depend on this schema
- **Tier-1 risk**: load-order roulette means W376 dashboard metric may silently aggregate over the legacy schema if it loads first → wrong counts

### Schema B: `backend/rehabilitation-services/mdt-transition-quality.js` (pre-existing legacy)

**Domain**: Multi-disciplinary team (MDT) transition workflow with CARF quality KPIs
**Naming**: snake_case
**Discriminating fields**:

```js
{
  beneficiary_id: ObjectId → 'Beneficiary' (required, indexed),
  branch_id: ObjectId → 'Branch',
  transition_type: enum [
    'center_to_kindergarten',
    'kindergarten_to_school',
    'child_to_adolescent',
    'adolescent_to_adult',
    'center_to_community',
    'between_programs',
    'discharge',
  ] (required),
  // ... (further fields not yet enumerated — recommend a deeper schema read before execution)
}
```

- Inline in a SERVICE/router file (not a `models/` file)
- Mounted live via `routes/registries/clinical-assessment.registry.js`
- Snake_case + `transition_type` enum is the discriminating identity — the LEGACY MDT workflow shape
- Has CARF quality KPIs (per the file's prologue) — sibling QualityKPISchema in the same file

---

## Verdict: SAME ENTITY, DIFFERENT VINTAGE

Unlike ADR-022 (3 different entities sharing a name) or ADR-024 (no incumbent canonical), this is the cleanest Pattern D case:

| Aspect                 | A — W361 canonical                             | B — legacy MDT inline                                         |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| **Conceptually**       | Beneficiary's life-stage transition plan       | Same — beneficiary's MDT transition workflow                  |
| **Naming**             | camelCase, canonical refs                      | snake_case, canonical refs                                    |
| **Type field**         | (none top-level; status enum drives lifecycle) | `transition_type` enum (7 transition types)                   |
| **Domain scoring**     | 6-domain readiness scoring                     | Likely none (legacy)                                          |
| **Milestone tracking** | Structured + tracked status                    | Likely free-text or absent                                    |
| **CARF KPIs**          | Not in scope of the model                      | Inline QualityKPISchema in same file                          |
| **File location**      | `models/TransitionPlan.js` (canonical dir)     | `rehabilitation-services/mdt-transition-quality.js` (service) |
| **Caller pattern**     | New (W361+W362+W376) services                  | Legacy router (`router.post('/transition/plans/...')`)        |
| **Schema richness**    | Rich (domain scores, milestones, lifecycle)    | Simpler (legacy workflow)                                     |

The new W361 schema is RICHER + better-located. The legacy module was the previous-generation MDT workflow that should have been retired but kept being mounted because it had no replacement until W361 shipped.

---

## Recommended Pattern D rename

| Current name (collision)  | Proposed name           | New file path (if rename)                                                                           | Rationale                                                              |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Schema A `TransitionPlan` | `TransitionPlan` (KEEP) | `backend/models/TransitionPlan.js`                                                                  | Richer, canonical location, W366-registered, W376 metric depends on it |
| Schema B `TransitionPlan` | `MdtTransitionPlan`     | inline in `rehabilitation-services/mdt-transition-quality.js` (rename `mongoose.model()` call only) | Discriminate from canonical; preserve legacy MDT-workflow contract     |

### Why Pattern D + NOT Pattern A consolidation

The natural temptation: migrate the legacy router to use Schema A and delete the inline schema.

But:

1. Snake_case field names (`beneficiary_id`, `transition_type`) in legacy = the API contract that existing callers (likely AdminUI, possibly other routers) expect. Consolidating breaks the contract.
2. `transition_type` enum (7 transition types) doesn't map 1:1 to W361's `status` enum (6 lifecycle states). Migration requires a translator + DB rewrite of existing records.
3. Sibling QualityKPISchema in the same file uses the snake_case shape — depends on legacy schema being readable.

**Pattern D** (rename legacy → `MdtTransitionPlan`) is lower-risk: legacy callers keep working with same field shape; new W361+ services keep using canonical; load-order roulette eliminated.

**Pattern A consolidation** is a deeper refactor that should follow Pattern D after this is signed off, NOT replace it.

---

## Migration steps (Pattern D)

1. **Rename Mongoose registration in `mdt-transition-quality.js`**:
   - `mongoose.model('TransitionPlan', TransitionPlanSchema)` → `'MdtTransitionPlan'`
   - Update the `const TransitionPlan = ...` variable assignment in the same file to consume the new name (file-internal reference, no external callers).
2. **Grep external callers** (defensive — initial audit found none beyond the file itself):
   - `grep -rn "mongoose\.model\s*(\s*['\"]TransitionPlan['\"]" backend/` → any non-models hits get audited
   - `grep -rn "ref:\s*['\"]TransitionPlan['\"]"` → any model-side refs pointing at the LEGACY shape get audited (none expected per initial audit, but verify)
3. **Update the `clinical-assessment.registry.js` mount comment** if it documents the model name.
4. **Remove `'TransitionPlan'` from `KNOWN_DUPLICATE_REGISTRATIONS` / REGISTRATION_ALLOWLIST** in `backend/__tests__/no-duplicate-model-registration-wave340.test.js` (W370 stopgap → final fix).
5. **Sprint smoke**: `npm run test:sprint`.

### Database-side migration

- Default collection: `transition_plans` (Mongoose-derived).
  - After rename, Schema B writes to `mdt_transition_plans` (Mongoose default).
  - Existing records: stay in `transition_plans` collection under whatever shape they were written.
- Migration: identify which records came from legacy MDT route (snake_case fields) vs new W361 services (camelCase fields), move legacy records to `mdt_transition_plans`. Approx 4-hour job.
- Alternative for short-term: pin both schemas to `{ collection: 'transition_plans' }` — same collection, different schemas. NOT recommended (defeats the purpose; consumers still need to know which shape they're reading).

---

## Open stakeholder questions

- **Q1**: Confirm the legacy MDT module + its 7-type transition_type enum is STILL ACTIVELY USED in production today (vs being a deprecated module nobody calls anymore). If unused, just DELETE rather than rename.
- **Q2**: Is there a deeper Pattern A consolidation plan? If yes, this ADR is the first phase (de-collision), and a separate ADR-029-style plan documents the consolidation timeline + field mapping (transition_type → status + new typeOfTransition field).
- **Q3**: Database — should existing legacy-shape records be migrated to the new collection AT rename time, or stay in `transition_plans` indefinitely?

---

## Decision

**Status: 🟡 PROPOSED.** Execution requires sign-off from:

1. MDT module owner — confirms Q1 (is legacy still used?) + Q2 (consolidation plan?)
2. Clinical director — confirms the canonical W361 schema correctly captures all transition-planning needs

Until signed off, `TransitionPlan` stays in REGISTRATION_ALLOWLIST per the W370 stopgap.

## Consequences

If executed (Pattern D rename):

- W340 ALLOWLIST drops `TransitionPlan` (4 entries → 3: Referral + Task + AuditLog remain)
- Load-order roulette eliminated for this entity
- W376 heatmap metric (transitionPlan.overdueReviews) becomes deterministic — always reads canonical schema
- Legacy MDT API contract preserved (snake_case fields still work)
- 4-hour DB migration job needed for existing legacy records

If deferred:

- W370 ALLOWLIST stopgap continues indefinitely (acceptable but accumulates technical debt)
- New W361+ services keep getting the canonical schema (correct by load-order luck)
- Legacy MDT route keeps getting the canonical schema (silent shape mismatch — but only if anyone calls it with the new shape's fields, which is unlikely since callers expect snake_case)

## Recommended next step

1. Walk Q1-Q3 with the MDT module owner (30-min meeting).
2. If Q1 = "deprecated, nobody calls it" → DELETE Schema B + remove from ALLOWLIST. ~1 hour total.
3. If Q1 = "still used" → execute Pattern D rename per migration steps. ~4-6 hours including DB migration script.
4. Either way, document the outcome and remove `'TransitionPlan'` from the W340 ALLOWLIST in the same commit.
