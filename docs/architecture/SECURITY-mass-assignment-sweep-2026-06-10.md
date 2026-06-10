# Security finding — mass-assignment sweep of backend UPDATE routes (2026-06-10)

**Type**: Security finding (read-only audit) + partial fix
**Class**: Mass-assignment / over-posting on DB writes (W506/W507 doctrine)
**Trigger**: W1091 found a live mass-assignment hole in `care-plans-admin` goal-create; this sweep hunts the same class.
**Status**: 🟢 2 verified-live clinical surfaces FIXED (W1112) · 🟡 remainder DOCUMENTED, pending per-route mount verification before fix.

## Doctrine (what "correct" looks like here)

This codebase already has an anti-mass-assignment doctrine: **wrap any `req.body`
written to the DB in `stripUpdateMeta()`** (from [`utils/sanitize.js`](../../backend/utils/sanitize.js)),
which drops meta/auth/prototype-pollution keys (`_id`, `__v`, `createdBy/At`,
`role`, `isAdmin`, `password`, `__proto__`, `constructor`). It is applied at
~18 `Object.assign` sites and the `care-plans-admin` PATCH + (W1091) POST. The
findings below are routes that **skip** this doctrine.

## De-overclaim note (important — avoids the recorded "7 false-positive" trap)

The `Model.create({ ...req.body, createdBy: req.user._id, … })` pattern is
**pervasive convention (~40+ route sites)** and is **NOT** a finding: Mongoose
`strict` mode drops non-schema fields on create, and the explicit server fields
(`createdBy`/`status`/…) come **after** the spread so they override any attacker
value. The genuine deviation is the **UPDATE** paths that write raw
`$set: req.body` — these overwrite _existing_ sensitive schema fields
(status/ownership) with no `stripUpdateMeta` and no server override.

## Findings (tiered)

### 🔴 Tier 1 — raw `req.body` → top-level DB update

| Route file:line                    | Path                              | Model               | Auth                                    | Branch-scope         | Status                                                                                                               |
| ---------------------------------- | --------------------------------- | ------------------- | --------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `tasks.routes.js:141`              | `PUT /:id`                        | Task                | ✅ dualMountAuth                        | ❌ none              | ✅ **FIXED (W1112)**                                                                                                 |
| `therapist-extended.routes.js:170` | `PUT /treatment-plans/:planId`    | CarePlan (clinical) | ✅ dualMountAuth                        | ❌ none              | ✅ **FIXED (W1112)**                                                                                                 |
| `therapist-extended.routes.js:185` | `PATCH …/goals/:goalId`           | CarePlan goal       | ✅                                      | ❌                   | ✅ **FIXED (W1112)**                                                                                                 |
| `therapist-extended.routes.js:288` | `PUT /prescriptions/:id`          | Prescription        | ✅                                      | ❌                   | ✅ **FIXED (W1112)**                                                                                                 |
| `therapist-extended.routes.js:338` | `PUT /professional-dev/:id`       | ProfessionalDev     | ✅                                      | (therapistId-scoped) | ✅ **FIXED (W1112)**                                                                                                 |
| `hr/hr-modules.routes.js:106`      | generic `attachCrud` `PATCH /:id` | **11 HR models**    | ✅ authorize(writeRoles)                | ❌                   | 🟡 pending mount-verify (high value — covers 11 modules)                                                             |
| `workflow.routes.js:207`           | `PUT /definitions/:id`            | WorkflowDefinition  | ✅ authMiddleware + requireBranchAccess | ✅                   | 🟡 pending — `backend/routes/` copy vs the `domains/workflow/` one the registry mounts (resolve which is live first) |

### 🟠 Tier 2 — raw `req.body` pushed into an array subdoc

`enterpriseUltra.routes.js:867` (escalationPath) · `fleetFuelCards.js:95` (transactions) · `fleetTires.js:105` (pressureLogs) · `groupPrograms.routes.js:173` (sessions) · `internalAudit.js:273` (observations). Same fix (`stripUpdateMeta` the pushed element); severity bounded by each subdoc's schema.

### 🟡 Tier 3 — raw `req.body` nested under a single key (lower — cannot set sibling top-level fields)

`referrals.routes.js:515` (assessment) · `student-events.routes.js:189` (data) · `student-elearning.routes.js:136` (data) · `student-rewards-store.routes.js:195` (data) · `therapy-sessions.routes.js:289` (soapNotes). The nested object is still fully attacker-controlled — sanitize if the subdoc carries any privileged field.

## Fix applied (W1112)

`{ $set: req.body }` → `{ $set: stripUpdateMeta(req.body) }` (and the goals-subdoc
spread → `{ ...stripUpdateMeta(req.body) }`) on the two verified-live clinical
surfaces. Locked by drift guard
[`__tests__/mass-assignment-update-routes-wave1112.test.js`](../../backend/__tests__/mass-assignment-update-routes-wave1112.test.js)
(forbids raw `$set: req.body` regression).

## Secondary findings (separate from mass-assignment — for follow-up)

1. **Missing branch scope (W269 IDOR)** — Tier-1 update paths use
   `findByIdAndUpdate(req.params.id, …)` with **no `branchFilter`/scope**, so an
   authed user in branch A can edit a Task / treatment-plan in branch B. The
   `stripUpdateMeta` fix does NOT close this; add `branchFilter(req)` /
   `effectiveBranchScope(req)` to the query. **Higher impact than the
   mass-assignment for the clinical surfaces.**
2. **Possible auth-bypass mount** — `therapist-extended` is mounted **both** via
   `dualMountAuth` (`_registry.js:661`) **and** plain `dualMount`
   (`clinical-therapy.registry.js:44`). Per the codebase's "never plain
   dualMount" rule, confirm first-match-wins doesn't expose an unauthenticated
   path.

## Recommended next steps

1. Verify mount + auth for `hr/hr-modules.routes.js` and the live `workflow`
   route, then apply the same `stripUpdateMeta` fix (Tier 1 remainder).
2. Sweep + fix Tier 2 (`stripUpdateMeta` the pushed element).
3. Open a **branch-scope (W269) remediation** for the Tier-1 update paths — this
   is the larger risk for the clinical surfaces.
4. Follow-on grep classes not covered here: `findByIdAndUpdate(req.params.id, req.body)`
   (no `$set` wrapper) and direct `.updateOne(filter, req.body)`.
