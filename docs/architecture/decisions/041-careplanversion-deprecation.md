# ADR-041 — CarePlanVersion deprecation (UnifiedCarePlan canonical)

**Status:** ✅ Accepted (owner-approved 2026-06-12) · **Wave:** W1260 ·
**Supersedes context:** ADR-040 (goal consolidation), the W1238-W1244
DDD-vs-legacy split audit, and the W1252-W1259 re-point series.

## Decision

`UnifiedCarePlan` (`domains/care-plans`) is the **single canonical care-plan
model**. `CarePlanVersion` (W41-51) is **deprecated**: no new functional
consumers may be added. Enforced by the W1260 ratchet guard
(`__tests__/careplanversion-deprecation-ratchet-wave1260.test.js`).

## Why option (b) won (recorded from W1244, owner-approved)

1. **ADR-040 alignment** — `TherapeuticGoal` is the canonical goal;
   `UnifiedCarePlan` references it, while `CarePlanVersion` embeds a second
   copy of goal detail (the duplication ADR-040 removed).
2. **Zero data cost** — both collections were empty in prod (W1235).
3. **The UI + 360 already author/read `UnifiedCarePlan`** — no rework of the
   live data-entry spine.

## What was lifted/re-pointed (all merged to main 2026-06-12)

| Wave  | What                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| W1252 | Integrity layer: hash-chained `signatureChain` + `evidenceHash` (immutable once set); `activatePlan` records the activate signature |
| W1253 | W50 overdue-review scanner dual-scans (legacy + unified, source-tagged, fail-soft)                                                  |
| W1254 | W45 family-retry worker dual-scans + `familyNotifications[]` lifted + the `.lean()` persistence root-fix                            |
| W1255 | Plateau detector dual-reviews; `lastPlateauReviewAt` cadence stamp                                                                  |
| W1257 | Audit trail: `buildUnifiedAuditTrail` + `GET /care-plans/:id/audit-trail` (PDPL Art.13, role redaction)                             |
| W1258 | Side-effects audit label source-faithful (`entityTypeOf`); plan-recommendation audited PURE → reclassified, not a split             |
| W1259 | W43 family-version generator: unified adapter + `familyVersion` storage at activation behind the deterministic safety floor         |

## Functional-consumer baseline at deprecation (W1260)

`models/CarePlanVersion.js` (the model itself) ·
`intelligence/care-plan-bootstrap.js` ·
`startup/carePlanningBootstrap.js` ·
`startup/parentChatbotBootstrap.js`

`ref: 'CarePlanVersion'` cross-links (e.g. `TransitionPlan`'s deliberate
dual-link) are populate-only and out of ratchet scope.

## Retirement plan (phases — each is its own wave, ratchet enforces order)

1. **DONE** — dual-read everywhere the prod-ON intelligence consumes plans.
2. **Freeze** (this ADR) — no new consumers; baseline ratchets DOWN only.
3. **Retire the legacy authoring engine** — once confirmed the legacy
   `/api/care-plan` W42 surface has no callers in prod telemetry, unwire
   `care-plan-bootstrap` (the workers already read unified) and prune the
   two startup consumers from the baseline.
4. **Drop the model** — verify `care_plan_versions` is empty in prod, archive
   the collection, delete `models/CarePlanVersion.js`, prune the final
   baseline entry, and delete this guard's baseline (guard then asserts
   zero consumers forever).

## Rollback

Phases 2-3 are reversible (re-add baseline entries with a justifying commit).
Phase 4 requires the archived collection dump.
