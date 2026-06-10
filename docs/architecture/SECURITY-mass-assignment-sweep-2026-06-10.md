# Security finding — mass-assignment sweep of backend UPDATE routes (2026-06-10)

**Type**: Security finding (read-only audit) + partial fix
**Class**: Mass-assignment / over-posting on DB writes (W506/W507 doctrine)
**Trigger**: W1091 found a live mass-assignment hole in `care-plans-admin` goal-create; this sweep hunts the same class.
**Status**: 🟢 Mass-assignment Tier 1 (W1091/W1112) + Tier 2 (W1130) FIXED · 🟢 W269 cross-branch IDOR fixed across every beneficiary-scoped surface (W1119/W1125) + professional-dev therapist-ownership · 🟡 Tier 3 assessed low-risk (no fix — see below) · 🟡 remaining = owner product/schema decisions (hr-modules `branchId`, tasks list scope + ownership).

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

| Route file:line                    | Path                              | Model               | Auth                                    | Branch-scope         | Status                                                                                                                                    |
| ---------------------------------- | --------------------------------- | ------------------- | --------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks.routes.js:141`              | `PUT /:id`                        | Task                | ✅ dualMountAuth                        | ❌ none              | ✅ **FIXED (W1112)**                                                                                                                      |
| `therapist-extended.routes.js:170` | `PUT /treatment-plans/:planId`    | CarePlan (clinical) | ✅ dualMountAuth                        | ❌ none              | ✅ **FIXED (W1112)**                                                                                                                      |
| `therapist-extended.routes.js:185` | `PATCH …/goals/:goalId`           | CarePlan goal       | ✅                                      | ❌                   | ✅ **FIXED (W1112)**                                                                                                                      |
| `therapist-extended.routes.js:288` | `PUT /prescriptions/:id`          | Prescription        | ✅                                      | ❌                   | ✅ **FIXED (W1112)**                                                                                                                      |
| `therapist-extended.routes.js:338` | `PUT /professional-dev/:id`       | ProfessionalDev     | ✅                                      | (therapistId-scoped) | ✅ **FIXED (W1112)**                                                                                                                      |
| `hr/hr-modules.routes.js:106`      | generic `attachCrud` `PATCH /:id` | **11 HR models**    | ✅ authorize(writeRoles)                | ❌                   | ✅ **FIXED** (extends W1112) — secures all 11 HR modules via the shared attachCrud helper                                                 |
| `workflow.routes.js:207`           | `PUT /definitions/:id`            | WorkflowDefinition  | ✅ authMiddleware + requireBranchAccess | ✅                   | ⚪ N/A — `backend/routes/workflow.routes.js` is DORMANT (unmounted); the LIVE `domains/workflow` route has no raw-body pattern (verified) |

### 🟠 Tier 2 — raw `req.body` pushed into an array subdoc — ✅ **FIXED (W1130)**

`enterpriseUltra.routes.js` (escalationPath) · `fleetFuelCards.js` (transactions) · `fleetTires.js` (pressureLogs) · `groupPrograms.routes.js` (sessions) · `internalAudit.js` (observations) — all 5 now wrap the pushed element in `stripUpdateMeta(req.body)` (added the import to enterpriseUltra + internalAudit). Severity was bounded by each subdoc's schema; this is the consistent defense-in-depth. Guard `mass-assignment-array-push-tier2-wave1130` (15 assertions); `check:routes-load` passes.

### 🟡 Tier 3 — raw `req.body` nested under a single key (lower — cannot set sibling top-level fields)

`referrals.routes.js:515` (assessment) · `student-events.routes.js:189` (data) · `student-elearning.routes.js:136` (data) · `student-rewards-store.routes.js:195` (data) · `therapy-sessions.routes.js:289` (soapNotes).

**Assessed — no fix warranted.** The body is namespaced under a single key, so there is **no sibling-top-level-field escalation** and **no prototype pollution** (a `$set` of a field _value_ does not merge into the doc / `Object.prototype`). The `data` / `assessment` / `soapNotes` containers are deliberately **freeform**, so a blanket `stripUpdateMeta` could strip legitimate content. Revisit only if a specific container later gains a privileged field that must be server-controlled.

## Fix applied (W1112)

`{ $set: req.body }` → `{ $set: stripUpdateMeta(req.body) }` (and the goals-subdoc
spread → `{ ...stripUpdateMeta(req.body) }`) on the two verified-live clinical
surfaces. Locked by drift guard
[`__tests__/mass-assignment-update-routes-wave1112.test.js`](../../backend/__tests__/mass-assignment-update-routes-wave1112.test.js)
(forbids raw `$set: req.body` regression).

## Secondary findings (separate from mass-assignment — for follow-up)

1. **Branch scope (W269 IDOR)** — clinical paths used
   `findByIdAndUpdate(req.params.id, …)` with **no scope**, so an authed user in
   branch A could read/edit a clinical record in branch B. **FIXED — the entire
   `therapist-extended` beneficiary-scoped surface (W1119):** treatment-plan `PUT`
   - goals `PATCH` writes, the `GET /treatment-plans/:id` read-leak (gated _before_
     loading PHI via `fetchScopedByBeneficiary`), and `prescriptions` `PUT` + `DELETE`
     — all gated via route-level `requireBranchAccess` + `assertBeneficiaryInScope`
     (the proven `care-plans-admin` pattern; drift guard
     `branch-isolation-treatment-plans-wave1119`, 8 assertions). **Also FIXED:**
     `professional-dev` `PUT` + `DELETE` now enforce therapist-ownership via
     `denyIfNotOwnTherapistRecord` (a therapist may only mutate their own CPD
     records; admins/cross-role pass through). **`tasks` ID routes PARTIALLY FIXED
     (W1125):** `GET`/`PUT`/`DELETE` `/tasks/:id` now gate the _clinical-task
     subset_ (beneficiaryId-linked) by the beneficiary's branch; general tasks
     (no beneficiary) are intentionally untouched — their ownership model
     (assignedTo/assignedBy vs manager override) is a separate product decision.
     Guard `branch-isolation-tasks-wave1125`. **`hr-modules` — BLOCKED on a
     schema/data-model decision (not a route fix):** verified that **10 of the 11**
     `attachCrud` HR models carry **no `branchId`** (only `WorkforcePosition` does),
     so a route-level branch gate would either fail-closed (break the 10) or no-op.
     Branch-scoping HR needs denormalizing `branchId` onto the models OR gating via
     each record's employee FK (field name varies per model) — a data-model effort
     for the owner. **Other open (product decisions):** the `tasks` list `GET /`
     (returns all tasks, no scope) + the general-task ownership model
     (assignedTo/assignedBy owner vs manager override).
2. **Possible auth-bypass mount** — `therapist-extended` is mounted **both** via
   `dualMountAuth` (`_registry.js:661`) **and** plain `dualMount`
   (`clinical-therapy.registry.js:44`). Per the codebase's "never plain
   dualMount" rule, confirm first-match-wins doesn't expose an unauthenticated
   path.

## Recommended next steps

1. ✅ **Tier 1 DONE** — `hr/hr-modules.routes.js` fixed (live, 11 modules); the
   `workflow.routes.js:207` finding was the DORMANT `backend/routes/` copy (the
   live `domains/workflow` route is clean), so no live Tier-1 holes remain.
2. Sweep + fix Tier 2 (`stripUpdateMeta` the pushed element).
3. Open a **branch-scope (W269) remediation** for the Tier-1 update paths — this
   is the larger risk for the clinical surfaces.
4. Follow-on grep classes not covered here: `findByIdAndUpdate(req.params.id, req.body)`
   (no `$set` wrapper) and direct `.updateOne(filter, req.body)`.
