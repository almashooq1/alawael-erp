# Finding — BeneficiaryTransfer branch field-drift (broken feature + isolation gap)

**Discovered:** 2026-06-06, during the W973 M-naming branch-isolation sweep.
**Status:** 🔴 Real bug, **DEFERRED** from the autonomous M-naming pass — needs a
coordinated multi-file fix + a data decision (behavior-changing). NOT shippable as
a one-file change.
**Severity:** the beneficiary-transfer feature persists **no branch data at all**,
so branch isolation on it is moot and one list route over-restricts to empty.

## The drift (one model, three disagreeing field names)

`models/BeneficiaryTransfer.js` schema declares the branch FKs as
**`fromBranchId` / `toBranchId`** (`ref:'Branch'`, `required:true`, indexed),
under default `strict:true`. But its writers and most readers use
**`fromBranch` / `toBranch`**:

| Site                                                                                                | Uses                              | Effect                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `services/BeneficiaryService.js:250-251` (`initiateTransfer` → `.create({ fromBranch, toBranch })`) | `fromBranch`/`toBranch`           | **stripped** by strict mode → doc saved with NO branch field                                                              |
| `services/BeneficiaryService.js:158/223/279/458` (activity log, completion)                         | `transfer.fromBranch`/`.toBranch` | read `undefined`                                                                                                          |
| `routes/beneficiary-transfers.routes.js` (GET / list, $or scope, populate, GET /:id)                | `fromBranch`/`toBranch`           | query/populate a non-existent field                                                                                       |
| `routes/missing-models.routes.js:138-152` (GET /beneficiary-transfers)                              | `fromBranch`/`toBranch`           | same — **but its branch scope is CORRECT** (`req.branchScope.branchId`, line 142-143)                                     |
| `routes/employee-affairs-phase3.routes.js:118`                                                      | `transfer.toBranch`               | reads `undefined`                                                                                                         |
| `routes/branch-enhanced.routes.js:58-59` (`.populate('fromBranchId')`)                              | **`fromBranchId`**                | schema-aligned, but the docs have no `fromBranchId` value (writer wrote the stripped `fromBranch`) → populate yields null |
| `services/branches/branch-enhanced.service.js:176` (`.create({ ...data })`)                         | depends on caller `data`          | inherits the caller's field name                                                                                          |

Net: **every transfer document is created with no branch field**, and the readers
are split `fromBranch` (5 sites) vs `fromBranchId` (1 site). My W942 `req.user.branch`
fix for this route was **reverted** — scoping a field that doesn't persist would
have matched nothing (over-restrict), not fixed the leak.

## NOT a sibling-wide pattern

`AssetTransfer` (the structural twin, also `fromBranchId`/`toBranchId`) is **correct**
— `routes/asset-management.routes.js` uses `fromBranchId`/`toBranchId` consistently
(query, body, create). The drift is isolated to **BeneficiaryTransfer**.

## Canonical target = `fromBranchId` / `toBranchId`

Reasons: the schema already declares it (ref + indexes); `AssetTransfer` (sibling)
uses it; `branch-enhanced.routes.js` already uses it; it matches the codebase
`branchId` camelCase FK convention (W269 / M-naming doctrine).

## Fix plan (coordinated, one PR, reviewed)

1. **Service write** `services/BeneficiaryService.js:250-251` →
   `.create({ fromBranchId: beneficiary.branch, toBranchId })`; update the
   `transfer.fromBranch`/`.toBranch` reads at 158/223/279/458 → `…BranchId`.
2. **`routes/beneficiary-transfers.routes.js`** → switch the explicit query filters
   (80-82), the branch `$or` scope (85-87 — re-apply the W973 helper but on
   `fromBranchId`/`toBranchId`), and every `.populate('fromBranch'|'toBranch')`
   (96-97, 124-125) to `fromBranchId`/`toBranchId`. Then prune from the W942 baseline.
3. **`routes/missing-models.routes.js:138-152`** → same field swap (its scope is
   already correct).
4. **`routes/employee-affairs-phase3.routes.js:118`** → `transfer.toBranchId`.
5. **`services/branches/branch-enhanced.service.js`** → ensure callers pass
   `fromBranchId`/`toBranchId`.
6. **Data**: existing BeneficiaryTransfer docs have NEITHER field (all stripped) →
   they stay branch-less; no migration _required_ for correctness, but a one-off
   backfill (from the beneficiary's branch / transfer history) would make old
   transfers visible to restricted users again. Decide per data volume.
7. **Test**: a MongoMemoryServer cross-branch test (like
   `referral-routes-branch-isolation-wave973.test.js`) proving a created transfer
   PERSISTS `fromBranchId`/`toBranchId` and the list is branch-scoped (restricted →
   own only, HQ → all) — across BOTH `beneficiary-transfers.routes` and
   `missing-models.routes`.

## Why deferred (not done autonomously)

~5 files / ~15 sites, behavior-changing, touches a shared service, on a fast-moving
shared branch with no integration coverage for all transfer paths — exactly the
"reviewed, coordinated" class. Characterized here so the fix is mechanical.
