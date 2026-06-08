# Finding — BeneficiaryTransfer FK field-drift (broken feature + isolation gap)

**Discovered:** 2026-06-06 (W973 M-naming sweep). **Deepened + corrected** 2026-06-06.
**Resolved:** 2026-06-08 — **Direction A implemented as W990** (owner chose the
non-breaking schema→bare reconcile).
**Status:** ✅ FIXED (W990). Was: 🔴 real bug — the feature persisted **no FK data
at all** (beneficiary + both branches), so every transfer was unlinked AND branch
isolation was moot; the list route also leaked all branches via the never-populated
`req.user.branch` scope (W942 class).
**Severity (historical):** broken core feature + cross-branch read leak.

## The drift — THREE FK fields, not just branch

`models/BeneficiaryTransfer.js` declares its FKs with the **`*Id` suffix**
(`strict:true`): `beneficiaryId`, `fromBranchId`, `toBranchId` (all `required:true`,
indexed). The `requestedBy`/`approvedBy` FKs match the code (no drift). But the
**writers + most readers use the BARE names** `beneficiary` / `fromBranch` /
`toBranch` → strict mode **strips them on write** (doc saved with none of the three
FKs) and queries/populates hit non-existent paths.

| Site                                                                                                                               | Field style | Effect                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/BeneficiaryService.js` (`initiateTransfer` create + activity reads + history populate, ~248-256/282/285/390-401)         | **bare**    | create strips beneficiary/fromBranch/toBranch → doc has only requestedBy/transferDate/reason/status                                                                                                                                                                                    |
| `routes/beneficiary-transfers.routes.js` (list query/$or-scope/populate, /:id, /complete)                                          | **bare**    | query/populate non-existent fields; the `$or` branch scope reads the never-populated `req.user.branch` too (W942 class)                                                                                                                                                                |
| `routes/missing-models.routes.js:135-152` (GET /beneficiary-transfers)                                                             | **bare**    | same fields — **but its branch scope is CORRECT** (`req.branchScope.branchId`)                                                                                                                                                                                                         |
| `routes/branch-enhanced.routes.js:58-59` (`.populate('fromBranchId'/'toBranchId')`)                                                | **`*Id`**   | schema-aligned, but docs have no value (writer wrote the stripped bare names) → null                                                                                                                                                                                                   |
| `services/branches/branch-enhanced.service.js:175` (`requestTransfer` → `.create({...data})`)                                      | passthrough | **dormant** — no live route caller found                                                                                                                                                                                                                                               |
| `services/branches/branch-enhanced.service.js:198` (`completeTransfer` reads `transfer.beneficiaryId`/`toBranchId`/`fromBranchId`) | **`*Id`**   | **LIVE** via `branch-enhanced.routes.js:335` (mounted `features.registry.js:310`) — read `undefined` off bare docs → its Beneficiary branch-update + appointment-cancel were silent no-ops. Fixed to bare in W990 (the finding originally mislabelled this service as wholly dormant). |

So the CODE is internally consistent on **bare** names at 3 of the 4 live sites;
only `branch-enhanced.routes` + the schema use `*Id`. **NOT** a sibling-wide
pattern: `AssetTransfer` (twin model) is fully correct on `*Id`
(`routes/asset-management.routes.js`). `employee-affairs-phase3.routes.js:118` is a
DIFFERENT model (`models/HR/Transfer`, employee transfer) — **out of scope**.

## Two fix directions — each with a tradeoff (OWNER DECISION)

**Direction A — schema → bare names (RECOMMENDED: minimal + NON-breaking).**
Rename the schema FKs `beneficiaryId→beneficiary`, `fromBranchId→fromBranch`,
`toBranchId→toBranch` (+ the `fromBranchId`/`beneficiaryId` indexes). Then the
service writes persist, all list routes' query/populate work, and **the API
response shape is unchanged** (`.populate('beneficiary')` → `response.beneficiary`,
exactly as today). Cost: 1 schema file + the **1 outlier** `branch-enhanced.routes`
(2 populates `fromBranchId`→`fromBranch`) + an index recreation on deploy. Audit
first: grep `beneficiaryId|fromBranchId|toBranchId` for BeneficiaryTransfer readers
(found: only `branch-enhanced.routes` + the schema/indexes).

**Direction B — code → `*Id` (matches schema + AssetTransfer + the `branchId`
convention, but BREAKING).** Change the service write + both list routes to
`beneficiaryId/fromBranchId/toBranchId`. Cost: ~4 files / ~15 sites, AND the
populated key changes `response.beneficiary` → `response.beneficiaryId` — a
**cross-repo frontend (web-admin) change**. This is what W973 started and **reverted**
(it was incomplete — only branch fields, not `beneficiary` — and API-breaking).

Recommendation: **Direction A** — it preserves the API contract and the code is
already 4/5 bare. (The `*Id` convention argument applies to the single-branch
`branchId` doctrine; a from/to pair on a legacy model doesn't have to follow it.)

## Either way: also re-apply the branch-scope fix

`beneficiary-transfers.routes.js` GET `/` scopes via the never-populated
`req.user.branch` (W942 class). Re-apply the `transferBranchScope(req)` helper
(maps `branchFilter(req)` → the chosen field) for the `$or`. `missing-models.routes`
already scopes correctly via `req.branchScope.branchId`.

## Test (post-fix)

MongoMemoryServer cross-branch test (template:
`referral-routes-branch-isolation-wave973.test.js`): assert a created transfer
PERSISTS the beneficiary + both branch FKs, and the list is branch-scoped
(restricted → own only, HQ → all) across BOTH `beneficiary-transfers.routes` and
`missing-models.routes`. Watch the unique-index race → `await Model.init()`.

## Implemented — Direction A (W990, 2026-06-08)

Owner chose Direction A (non-breaking). Changes (5 files):

1. **`models/BeneficiaryTransfer.js`** — renamed the 3 FK fields `beneficiaryId→
beneficiary`, `fromBranchId→fromBranch`, `toBranchId→toBranch` (kept
   `ref:'Beneficiary'` so the W324 canonical-ref guard stays satisfied) + the 3
   matching indexes. Now the bare writes persist under `strict:true`.
2. **`routes/branch-enhanced.routes.js`** — the GET `/transfers` populate outlier:
   `beneficiaryId/fromBranchId/toBranchId` → bare (it was the only schema-aligned
   reader; now aligned to the renamed schema).
3. **`routes/beneficiary-transfers.routes.js`** — the W942 scope fix: GET `/` `$or`
   now uses `effectiveBranchScope(req)` instead of the never-populated
   `req.user.branch` (restricted → own from/to only; cross-branch → all). The rest
   of the file was already bare → now works end-to-end.
4. **`services/branches/branch-enhanced.service.js`** — `completeTransfer` (LIVE,
   not dormant) `*Id` reads → bare; its Beneficiary branch-update + appointment
   cancel now actually fire.
5. **`__tests__/beneficiary-transfer-field-drift-wave990.test.js`** — MongoMemoryServer:
   persistence round-trip (the discriminator — `.create` with bare names THREW
   pre-fix) + restricted/HQ list scope. 4 tests, all green. Enumerated in
   `sprint-tests.txt`.

`BeneficiaryService.js` + `routes/missing-models.routes.js` needed **no** change
(already bare + correctly scoped). The API response shape is unchanged
(`.populate('beneficiary')` → `response.beneficiary`, as before) → **no frontend
change**.

## Existing data

Every pre-fix transfer doc has NONE of the three FKs (all stripped) → no migration
is _required_ for correctness; a one-off backfill (from the beneficiary's branch /
history) would resurrect old transfers for restricted users. Decide per volume.
The old `*Id` indexes become unused after the rename (harmless; drop on a later
maintenance pass).
