# Changelog — Al-Awael ERP

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 5: break-glass review digest

Ninth Phase-7 commit. BreakGlassEngine + session model + routes
were already shipped pre-Phase-7; what was missing is the
**operational digest** for cron to detect abuse + overdue review
states. This commit adds that monitor.

### Added

- `scripts/break-glass-digest.js` — cron-friendly digest that
  classifies recent sessions into 5 buckets: live /
  awaitingCoSign / coSignOverdue / unreviewed / abuseRisk. Exit
  codes 0/1/2.
- `buildReviewPlan()` — exported pure classifier, 0 I/O, with
  per-user abuse detection (≥3 sessions in window). Entry
  summaries truncate long purpose strings to ≤80 chars.
- `__tests__/break-glass-digest-script.test.js` — 15 tests
  covering every classification bucket, abuse detection with
  custom threshold, summary-entry shape, and stats block.
- npm scripts `break-glass:digest[:json]` + root proxies.

### Tests

Sprint suite: **1282 passing** (was 1267; +15).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 9: UserBranchRole (secondment)

Eighth Phase-7 commit. Adds the secondment / multi-branch / acting-
role persistence model. User.branchIds[] (commit a2936c4c) was the
convenience field; this is the authoritative audited record of
WHO-CAN-WORK-WHERE with window boundaries and a granter.

### Added

- `models/UserBranchRole.js`:
  • userId + branchId + role (required; role lowercased, may
  differ from User.role for acting-role scenarios)
  • validFrom / validUntil (both null allowed for open-ended
  secondments; convention is half-open [from, until))
  • status enum (active / revoked / expired)
  • grantedBy + grantedAt + reason (10–500 chars for audit)
  • revokedAt / revokedBy / revokeReason for full lifecycle
  • Indexes: (userId, status, validUntil) + (branchId, status,
  validUntil) for both "my branches now" and "who's at this
  branch now" queries
  • `filterActive(rows, now)` — pure function, half-open window
  filter; also attached as schema static
  • `findActiveForUser(userId, now)` — indexed DB query followed
  by the in-JS filter
  • `revoke({assignmentId, revokedBy, reason})` — atomic flip

- `__tests__/user-branch-role-window.test.js` — 15 pure tests for
  `filterActive`:
  • 3 status gates (active/revoked/expired)
  • 3 validFrom boundary cases (future/past/exactly-now)
  • 3 validUntil boundary cases (future/past/exactly-now)
  • 3 both-bound windows (inside/before/after)
  • mixed batch returning only active+in-window
  • empty input + default-now behavior

- `scripts/_user-branch-role-smoke.js` — 10-assertion standalone
  smoke covering schema validators, defaults, findActiveForUser
  window semantics (including hidden future-dated + past-expired
  rows), and the revoke lifecycle. Same pattern as RecordGrant and
  tenantScope smokes (Jest+Mongoose 9 sandbox limitation).

### Not yet wired (follow-up)

- branchScope middleware doesn't yet call `findActiveForUser()` to
  union the user's home branch with their secondment set. That's a
  ~10-line addition once a real route consumes it. Model + tests
  land first so the glue commit is small.

### Tests

Sprint suite: **1267 passing** (was 1252; +15 window tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 7: tamper-evident audit trail

Seventh Phase-7 commit. Wires a SHA-256 hash chain through the audit
log so any historical-record tamper (or the storage layer corrupting
a row) is detectable. CBAHI / PDPL / MOH require audit logs to be
immutable; the existing append-only write path satisfied "we don't
overwrite", but didn't satisfy "we can prove nobody else did
either". This commit closes that gap.

### Added

- `services/auditHashChainService.js` — pure crypto, three exports:
  • `canonicalJSON(value)` — deterministic JSON with sorted keys,
  excluding storage-layer fields (`_id`, `__v`, `chainHash`,
  `prevHash`, `createdAt`, `updatedAt`, `expiresAt`).
  • `computeEntryHash(entry, prevHash)` — `SHA-256(prevHash ||
canonicalJSON(entry))`. Throws on non-string prevHash.
  Handles mongoose docs via `.toObject()` automatically.
  • `verifyChain(entries)` — walks an oldest→newest array,
  recomputes each entry's hash, reports breaks. Detects: - modification (chain_hash_mismatch) - insertion (prev_hash_mismatch) - deletion (downstream prev_hash_mismatch)

- `models/auditLog.model.js`:
  • New fields `prevHash` + `chainHash` (both indexed).
  • `pre('save')` hook augmented to fetch the most recent
  chainHash, compute the new entry's hash via
  `computeEntryHash`, and stamp both fields on the new doc.
  Wrapped in try/catch so the hash never blocks a write — verify
  job catches drops.

- `scripts/audit-chain-verify.js` — cron-friendly integrity check:
  • Walks the most recent N audit entries (default 10,000) in
  append order.
  • Seeds with the `chainHash` of the entry just before the window
  so window-boundary tampering is detected.
  • Exit 0 (intact) / 1 (≥1 break, alert) / 2 (internal error).
  • `--window=N` / `--json` / `--quiet` flags.

- `__tests__/audit-hash-chain-service.test.js` — 20 unit tests:
  • canonicalJSON: 6 tests (key order, nested, exclusion, null,
  Date, Set introspection)
  • computeEntryHash: 7 tests (format, determinism, prevHash
  sensitivity, content sensitivity, exclusion, type guard,
  mongoose-doc compat)
  • verifyChain happy path: 3 tests
  • verifyChain tamper detection: 4 tests (modification, forged
  hash, INSERTION, DELETION)

### Wired

- `package.json`: `audit-chain:verify[:json]` npm scripts.
- Root `package.json`: proxy scripts.
- Sprint test glob + CI paths trigger.

### Out of scope (future)

- Wiring the verifier into the on-call alert system (Slack /
  PagerDuty webhook). Today it exits 1 and prints; an ops
  alertmanager rule flips that into a page.
- Backfilling chainHash for historical entries written before this
  commit. They'll fail the verifier with `chain_hash_mismatch`
  until backfilled — accept this expected break for the migration
  window, document in the alert response runbook.

### Tests

Sprint suite: **1252 passing** (was 1232; +20 hash-chain tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 8: approval chains + escalate digest

Sixth Phase-7 commit. Closes the approval/governance side of the IAM
hardening roadmap — Phase-7 Commits 1–3, 4, 6 addressed identity,
scope, and segregation of duties; this one addresses the workflows
that route approvals through the right roles and escalate when they
blow past their SLA.

### Added

- `authorization/approvals/chains.js` — 7 new chain definitions
  (expense × 4 bands, payroll dual sign-off, care plan × 2
  variants):
  • **A-12-expense-small** (≤ 5k) — accountant → finance_supervisor
  • **A-12-expense-mid** (5k–50k) — + branch_manager
  • **A-12-expense-large** (50k–200k) — + group_cfo
  • **A-12-expense-huge** (> 200k) — + ceo
  • **A-14-payroll** — dual sign-off. 3 distinct roles (hr_officer
  → group_chro → group_cfo) so the existing engine's SoD prevents
  the same actor from approving twice AND finance/HR leadership
  each sign independently (Saudi Labor Law § 6 dual-control).
  • **A-16-careplan** — therapy_supervisor → clinical_director
  • **A-16-careplan-complex** — + group_quality_officer for
  multidisciplinary plans

- `selectChain()` — extended to route A-12 (expense) by amount
  (reusing the A-07/A-08 threshold pattern) and A-16 (care plan) by
  the `complexMultidisciplinary` flag on the resource.

- `scripts/approval-escalate-digest.js` — cron-friendly SLA monitor:
  • Scans all open ApprovalRequests and classifies into breaches /
  nearBreach / healthy buckets.
  • Exit 0 when healthy, 1 when ≥1 breach or near-breach, 2 on
  internal error (same contract as other digests).
  • `--json` for pipelines; `--quiet` for cron.
  • Env `APPROVAL_ESCALATE_WARN_HOURS` tunable (default 4).

- `buildEscalationPlan()` — exported pure function, takes requests

  - now + warn-hours, returns classified plan. Covered by 10 unit
    tests (empty input, each bucket, all-three mix, entry shape,
    boundary behavior at the warn threshold).

- `__tests__/approval-chains-phase7.test.js` — 25 tests:
  • All 7 new chain IDs registered with ≥1 step
  • selectChain band thresholds (0–500k expense matrix, 11 cases)
  • Care-plan complexity flag
  • Payroll SoD property (3 distinct roles, initiator ≠ signatories)
  • Drift invariants — every Phase-7 chain role resolves to an
  rbac.config ROLES value; every dueHours in [1, 336]; every
  branchScope is one of the 6 valid values.

### Wired

- `backend/package.json`: `test:sprint` / `test:ops-subsystems`
  include both new test files; `approval-escalate:digest[:json]`
  npm scripts.
- Root `package.json`: proxy scripts matching the digest convention.
- `.github/workflows/sprint-tests.yml`: paths triggers for the new
  source files + tests.

### Tests

Sprint suite: **1232 passing** (was 1197; +35 = 25 chain tests + 10
digest tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 3: RecordGrant + domain-sod policy

Fifth Phase-7 commit (and last in the P0 sprint). Lands the
record-level grant model + the ABAC adapter that wires Commit 6's
domain SoD rules into the live PDP request flow.

### Added

- `models/RecordGrant.js` — record-level permission grant. Lets a
  privileged user grant another user explicit access to a single
  resource (delegation, secondment, external reviewer scenarios)
  outside their normal RBAC scope. Schema:
  • resourceType + resourceId (target) — indexed
  • granteeId + granteeType (currently only 'user', forward-compat
  for 'role' / 'group') — indexed
  • actions[] — non-empty, validated; `${resource}:${action}` form
  • grantedBy + grantedAt + expiresAt (TTL-indexed for auto-purge)
  • reason (10–500 chars, required for audit trail)
  • status: active / revoked / expired
  • revokedAt / revokedBy / revokeReason for full lifecycle
  • Static helpers: findActiveGrant({granteeId, resourceType,
  resourceId, action}) and revoke({grantId, revokedBy, reason})
  • Compound index on (granteeId, resourceType, resourceId, status)
  so the PDP's grant-lookup is one indexed query.

- `authorization/abac/policies/domain-sod.js` — ABAC policy adapter
  that calls `checkDomainSoD()` (Commit 6's pure function) from
  inside the PDP. Returns `{ effect: 'deny', reason, meta: { ruleId,
severity, description } }` so audit logs can show the human-
  readable explanation without re-loading the rule catalog. Subject
  role is lowercased for case-insensitive matching.

- `__tests__/domain-sod-policy.test.js` — 9 tests covering the
  policy's `applies()` and `evaluate()` decision shapes (both
  positive denies and negative not_applicable for adjacent role/
  action combinations).

- `scripts/_record-grant-smoke.js` — standalone live verification
  script for the RecordGrant model (11 assertions: schema defaults,
  validators, findActiveGrant happy/sad paths, revoke lifecycle).
  Not in sprint gate (live mongo) — same pattern as
  `_tenant-scope-smoke.js`. Run during deploy.

### Why no Jest model test

A jest+Mongoose 9 sandbox interaction (the same one documented in
Commit 2's tenantScope test file) makes top-level RecordGrant
imports lose their schema defaults inside Jest. Multiple workarounds
attempted (lazy-require in beforeAll, beforeEach re-require with
require-cache clear, mongoose.deleteModel) — none reliable across
both single-test and multi-test runs in this sandbox. The model
itself works perfectly outside Jest (smoke script: 11/11 green) and
the schema validators / lifecycle are stable. Documented as a known
limitation; the smoke script is the verification of record.

### Out of scope (for future Phase-7 commits)

- PDP integration of RecordGrant (the OR-clause check that allows
  an action when an active grant exists). The model and policy are
  in place; the PDP adapter is a 10-line wrapper around
  `RecordGrant.findActiveGrant` that lands when grants get used by
  a real route.
- Admin UI for granting / revoking / listing grants.
- Daily reconcile job for grants nearing expiry.

### Tests

Sprint suite: **1197 passing** (was 1188; +9 domain-sod policy
tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 6: domain SoD

Fourth Phase-7 commit. Adds the high-priority domain-level
Segregation-of-Duties policies the IAM blueprint rated P0.

The existing `authorization/sod/registry.js` covered TRANSACTIONAL
SoD (same actor cannot create+approve the same record). This commit
adds DOMAIN SoD: certain roles must NEVER perform certain actions
regardless of whether they touched the record before — Saudi
healthcare regulators (CBAHI 4.3 / 8.7, SAMA pre-pay rule, MOH
labor-law dual-control, PDPL data minimization) all require these
separations and audits flag them on inspection.

### Added

- `authorization/sod/domain-rules.js` — 7 high-severity rules:

  1. **HR ↔ Finance** — HR roles (hr/hr_manager/hr_officer/
     hr_supervisor/group_chro) cannot create/approve invoices,
     expenses, POs, finance records (CBAHI 4.3).
  2. **Finance ↔ Employee PII** — finance roles (accountant/
     finance/finance_supervisor/group_cfo) cannot create/edit/
     delete employee records (Saudi Labor Law § 6, GOSI dual-
     control).
  3. **Clinical cannot bill** — therapists (all specialties),
     therapy_assistant, special_ed_teacher, doctor,
     clinical_director, therapy_supervisor, special_ed_supervisor
     blocked from invoices/finance write actions (CBAHI 8.7).
  4. **Finance cannot read clinical** — accountant/finance/
     finance_supervisor blocked from clinical_assessments and
     care_plans (PDPL data minimization).
  5. **Quality independence** — quality_coordinator and
     regional_quality cannot APPROVE care plans they audit.
     group_quality_officer (HQ) deliberately exempt — sits
     outside the audited unit.
  6. **IT Admin ↔ Audit** — it_admin can configure system but
     cannot mutate audit_logs (only read).
  7. **Internal Auditor read-only** — wildcard rule blocking
     create/update/delete/approve on every resource.
  8. **Operations ↔ PHI** — driver/bus_assistant cannot read
     clinical or write beneficiary/session records.

  Helpers: `checkDomainSoD(role, permission) → null | { rule }`
  with wildcard support (`*:create`, `audit_logs:*`, etc.).
  `rulesForRole(role)` for UI/admin listing.

### Tests

- `__tests__/sod-domain-rules.test.js` — 51 tests across 9
  describe blocks:
  • permMatches helper (5 tests)
  • each of the 8 rule families (4-6 tests each)
  • drift invariants: every blockedRole exists in rbac config,
  every rule has description+severity+actions, ids unique
  • helper smoke (rulesForRole, allDomainRules clone-safety)

### Wire-up note

The domain-rules check is intentionally exposed as a pure function.
The next commit (Phase 7 #3 — RecordGrant + PDP integration) will
call it from the existing ABAC `sod-conflict.policy.js` so denial
is enforced at request time. Landing the rules + tests first means
the integration commit is a 5-line PEP wire-up, not a 200-line
rules-and-tests bundle.

### Tests

Sprint suite: **1188 passing** (was 1137; +51 SoD tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 4: regional branchScope

Third Phase-7 commit. Wires the region-scoped roles
(`regional_director`, `regional_quality`) added in Commit 1 into the
existing branchScope middleware so they get an authoritative
"branches in my region(s)" filter rather than either nothing
(restricted to a single branch they don't have) or everything.

### Added

- `config/constants/roles.constants.js`:
  • `CROSS_BRANCH_ROLES` expanded to 11 entries (added: ceo,
  group_gm, group_cfo, group_chro, group_quality_officer,
  compliance_officer, internal_auditor, it_admin) so HQ-level
  roles automatically see all branches without needing
  per-route gates.
  • `REGION_SCOPED_ROLES` — new export listing the two regional
  roles. Used by branchScope middleware to take the regional
  code path.
- `middleware/branchScope.middleware.js`:
  • Regional-role branch: when a user has a region-scoped role,
  sets `req.branchScope = { restricted: true, regional: true,
regionIds, allBranches: false }`. If `regionIds` is empty,
  rejects with 403 (config error — a regional_director must
  have at least one region assigned).
  • `branchFilter()` now emits a sentinel
  `{ __pending_region_expand__: regionIds }` for regional scope
  so callers don't accidentally use a null branchId in their
  Mongo query.
  • `resolveRegionalBranchFilter()` — async helper that resolves
  `regionIds[]` to `{ branchId: { $in: [...branches in regions] } }`
  via the Branch collection. Result is cached on
  `req.branchScope._resolvedBranchIds` so repeated calls within
  the same request are free.

### Tests

- `__tests__/branch-scope-region.test.js` — 23 unit tests:
  • 11 cross-branch roles all map to `allBranches: true`
  • 2 region-scoped roles with valid regionIds → regional scope
  • 2 region-scoped roles with empty regionIds → 403
  • therapist with branchId → restricted; cross-branch query → 403
  • branchFilter() emits expected shapes for all 3 scope variants
  • resolveRegionalBranchFilter() caches and expands correctly

### Out of scope

- Wiring `resolveRegionalBranchFilter` into individual admin routes
  is incremental — each route owner picks it up when they touch
  that handler. The branchFilter() sentinel forces a hard error if
  someone accidentally hands the regional pre-expand result to
  Mongo, so failure mode is loud, not silent.

### Tests

Sprint suite: **1137 passing** (was 1114; +23 region tests).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM Commit 2: tenantScope plugin

Second foundation commit for the multi-branch IAM hardening roadmap.
Ships the defense-in-depth layer the remaining Phase-7 commits build on.

### Added

- `backend/authorization/requestContext.js` — AsyncLocalStorage-backed
  wrapper exposing `run(ctx, fn)`, `bypass(fn)`, `get()`. Express
  middleware `bindRequestContext` binds the authenticated request's
  branchScope into the store for the duration of the request. Callers
  anywhere in the call chain — services, helpers, Mongoose hooks —
  can read the current user's scope without threading `req` through.
  Includes a Symbol-keyed globalThis fallback for code paths where
  Mongoose 9's internal scheduler drops AsyncLocalStorage context.
- `backend/authorization/tenantScope.plugin.js` — Mongoose plugin.
  Applied opt-in per schema with `Schema.plugin(tenantScopePlugin)`.
  On every find/findOne/count/update/delete/aggregate, reads the
  request context and auto-adds a `{ branchId: <user's branch> }`
  filter. On save / insertMany, stamps the branch onto new docs
  missing one. Semantics:
  • no context (CLI, boot) → no-op
  • bypassTenantScope → no-op (explicit escape hatch)
  • allBranches → no-op (HQ roles see everything)
  • restricted → auto-filter / auto-stamp
  • **unscoped** (token valid but route misconfigured) → fail CLOSED
  (empty result + error log). Prevents auth-bypass-by-omission.
- `backend/__tests__/tenant-scope-plugin.test.js` — 17 unit tests
  covering requestContext propagation through awaits + bypass +
  nested run, then the plugin's decision logic via direct hook
  invocation with a mock schema shim. Avoids the known Jest+Mongoose 9
  AsyncLocalStorage interaction bug (docs/runbooks/ gap analysis
  recorded). End-to-end integration is verified by a standalone
  smoke script — see below.
- `backend/scripts/_tenant-scope-smoke.js` — live verification
  script. Runs outside Jest against mongodb-memory-server and
  checks 9 behaviors (scoped find, allBranches, no-ctx, fail-closed
  unscoped, bypass, save-stamp, insertMany-stamp, aggregate-$match).
  Not in sprint gate (depends on live mongo) — run manually via
  `node scripts/_tenant-scope-smoke.js` during deploy verification.

### Out of scope for this commit

- **Applying** the plugin to production models (Beneficiary,
  TherapySession, CarePlan, Invoice, Employee, etc.) is deferred
  to Phase-7 Commits 3–5 so each application can be paired with
  route-level testing. Landing the plugin without applying it is
  safe (zero-impact opt-in).
- `bindRequestContext` Express middleware wire-up into `app.js` is
  ALSO deferred to the same follow-up commits. The middleware
  function exists and is exported; the commit that first applies
  the plugin will mount it.

### Known limitation — Jest

Jest's module sandbox + Mongoose 9's internal query scheduler break
AsyncLocalStorage propagation into pre-find hooks, making full
end-to-end Jest integration tests unreliable. The unit tests in this
commit cover hook logic in isolation (with a mock schema); the
standalone smoke script covers the live path. When Mongoose or Jest
fix the upstream interaction, the placeholder comments in the test
file explain how to re-enable the integration tests.

### Tests

Sprint suite: **1114 passing** (was 1097; +17 unit tests for
requestContext + plugin hook logic).

---

## [Unreleased] — 2026-04-22 — Phase 7 IAM: regions, 22 new roles, drift invariants

Foundation commit for the multi-branch IAM hardening roadmap. Sets up
the data shapes + RBAC config + drift test that subsequent commits
(tenantScope plugin, RecordGrant model, SoD expansions, break-glass
workflow) will build on without reshuffling these primitives.

### Added

- `backend/models/Region.js` — new Region model (code, name_ar/en,
  primaryBranchId, directorId, status). Authoritative parent for
  region-level approvals and regional_director scope.
- `backend/models/Branch.js` — `regionId` (ref Region, indexed).
  Optional and non-breaking; legacy `location.region` string enum
  stays as a display fallback.
- `backend/models/User.js`:
  • `regionIds: [ObjectId]` — multi-region support for regional_director
  who may cover 2+ regions.
  • `branchIds: [ObjectId]` — secondment / multi-branch assignment.
  `branchId` (primary) stays backwards-compatible.
  • `department: String` — first-class department label for ABAC
  policies (HR ↔ Finance separation relies on it).
  • **Role enum expanded from 19 → 46 values** (added 27 Phase-7
  roles: ceo, group_gm, group_cfo, group_chro, group_quality_officer,
  compliance_officer, internal_auditor, it_admin, regional_director,
  regional_quality, branch_manager, clinical_director,
  quality_coordinator, hr_supervisor, finance_supervisor,
  therapy_supervisor, special_ed_supervisor, therapist_slp/ot/pt/psych,
  special_ed_teacher, therapy_assistant, hr_officer, driver,
  bus_assistant, guardian).
- `backend/config/rbac.config.js`:
  • ROLES map: 27 new entries.
  • ROLE_HIERARCHY: 27 new entries with levels, inheritance chains,
  Arabic + English labels.
  • ROLE_PERMISSIONS: 27 new permission maps. Specialty therapists
  (slp/ot/pt/psych) deliberately inherit from `therapist` without
  extra perms — differentiation happens at the ABAC layer
  (confidentiality-level, caseload-access policies).
- `backend/__tests__/rbac-roles-consistency.test.js` — 8 drift
  invariants:
  • User.role enum ↔ ROLES map (both directions).
  • Every role has a ROLE_HIERARCHY entry with a level in [0, 100].
  • Every role has a ROLE_PERMISSIONS entry (even `{}` counts).
  • Every `inherits[]` reference resolves to a known role.
  • 27-role Phase-7 "spec lock" — explicit spelling of each required
  role so a later refactor that drops one trips CI.

### Why this order

Expanding the role enum + RBAC config FIRST (without touching routes
or middleware) means: every subsequent IAM commit can reference
`ROLES.CLINICAL_DIRECTOR` or `regional_director` without also landing
the config. Drift test pins the invariants so nobody breaks them in
passing.

### Out of scope for this commit (queued for Phase 7 Commits 2-10)

- `tenantScope` mongoose plugin (defense-in-depth auto-filter)
- `RecordGrant` model + PDP integration (delegation + secondment grants)
- `regional` branchScope in branchScope.middleware.js
- Break-glass workflow (model + UI + review dashboard)
- Domain SoD (HR↔Finance, Clinical↔Finance, Quality independence)
- Audit integrity hash chain
- Expense/payroll/contract approval chains in chains.js
- Runbook + tenancy contract doc

### Tests

Sprint suite: **1097 passing** (was 1089 at commit 88e1be86; +8 =
new rbac-roles-consistency.test.js).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

---

## [Unreleased] — 2026-04-21 — Parent portal: multi-child + PDF + complaints

Parent-facing vertical. Parents can now switch between their children
from the portal header (selection survives refresh via localStorage),
and download a monthly progress PDF that bundles attendance, care-plan
goal progress, and latest assessments into one shareable archive. The
same PDF is produced server-side and can be emailed to guardians in
bulk via a new cron-friendly digest CLI.

### Added

- `backend/services/parentReportService.js` — pure `assembleReport`
  tree-builder + pdfkit `renderPdf` (falls back to Helvetica if the
  NotoSansArabic font isn't present, so stock installs don't fail).
- `backend/routes/parent-portal-v2.routes.js` — `GET
/children/:id/report/download` streams the PDF, re-using the same
  access-assertion path as the other parent-v2 endpoints.
- `frontend/src/pages/ParentPortal/MyChildrenPortal.jsx` — header
  `<Select>` dropdown (appears only when `children.length > 1`), a
  "تنزيل تقرير التقدّم (PDF)" button that fetches as a Blob (so the
  Bearer token travels with it, unlike `window.open`), and
  localStorage persistence under the `parent-portal.activeChildId` key.
- `backend/scripts/parent-report-digest.js` — cron-friendly monthly
  digest. Default dry-run; `--execute --confirm=SEND-MONTHLY-REPORTS`
  required to actually send. Exit codes 0 / 1 / 2 match the other
  digests.
- `frontend/src/theme/palette.js` — `chartColors.category` alias
  (fixes a `DEMO_BY_TYPE` TDZ crash on SessionsDashboard).
- `backend/routes/parent-portal-v2.routes.js` — `GET/POST
/api/parent-v2/complaints` so parents can submit complaints /
  suggestions / feedback from the portal (CBAHI-compliant feedback
  channel). Server validates subject/description length + type /
  priority enums, force-sets `source: 'parent'`, auto-fills
  submitter fields from the Guardian profile, and gates optional
  `childId` through `assertChildAccess`.
- `frontend/src/pages/ParentPortal/ParentComplaintsPanel.jsx` —
  dialog form + history table, mounted below the child-detail tabs.
- `backend/__tests__/parent-portal-v2.api.test.js` — 9 HTTP smoke
  tests for mount + body validation + happy-path create/list.

### Tests

Sprint suite: **1089 passing** (was 1043 at 4.0.10 headline; net
+46 = 16 parentReportService unit + 7 parent-report-digest unit + 13
parent-portal-v2 API smoke (complaints + notifications) + 10 drift-count
deltas from late 4.0.10 additions and organic growth that weren't
re-counted in that release).
• 16 unit tests for `parentReportService` (`attendanceRate`,
`goalProgress`, `latestAssessments`, `displayName`, `assembleReport`)
• 7 unit tests for the digest planner's `buildPlan` (empty paths,
missing guardians, email-less guardians, limit clamp, fallback names)
• 9 HTTP smoke tests for `/api/parent-v2/complaints` (mount,
body validation for missing/too-short subject/description, invalid
type/priority enums, happy-path POST+GET for both complaint and
suggestion types)

---

## [4.0.10] — 2026-04-19 — SCFHS CPE credit tracking + CI/auth hardening

Closes a known gap in the HR-compliance surface. Previously GOSI +
SCFHS license status was tracked; the CPE credit hours (100 per
5-year cycle split 50/30/20 across three SCFHS categories) were not.
Bundled together with this feature: an HR ops playbook, a CI
concurrency fix that was costing minutes, and two new auth-wiring
drift tests that lock the admin route security surface statically.

### Added — CPE feature (end-to-end)

- `backend/models/CpeRecord.js` — credit record schema with verified/
  verifiedBy/verifiedAt audit fields and compound indexes for the
  per-employee lookups the summary + overview routes use. Schema-level
  `min: 0.5` on creditHours so non-HTTP writers (migrations, seeders,
  imports) can't slip a 0-hour record past the 0.5-hour SCFHS floor.
- `backend/services/cpeService.js` — pure summary math (5-year window,
  verified-only toward renewal, per-category deficit, compliant verdict).
  Env-tunable minimums (`SCFHS_CPE_MIN_CAT1/2/3/TOTAL`).
- `backend/routes/cpe-admin.routes.js` — 9 admin endpoints mounted at
  `/api/admin/hr/cpe`: list/filter, by-employee, per-employee summary,
  create, patch, verify, delete, overview (dashboard counters +
  soon-expiring watchlist), and `export.csv` (UTF-8-BOM CSV with
  hydrated employee names for SCFHS audit sheets).
- `frontend/src/pages/Admin/AdminCpeCredits.jsx` — dashboard at
  `/admin/hr/cpe`: stat cards, watchlist, filterable records table,
  add/edit dialogs (closes the create + patch UI gaps the routes have
  always had), CSV download button respecting current filters,
  per-therapist summary dialog (required/earned/deficit per category).
- `backend/scripts/cpe-attention.js` — cron-friendly CLI with the
  same exit-code contract as `gov-status.js` (0=clean, 1=needs
  attention, 2=error). `--json` and `--quiet` for ops pipelines.
- `backend/seeds/demo-showcase.seed.js` — CPE records spread across the
  three compliance verdicts (compliant / attention / non-compliant /
  partial / empty) so the dashboard shows realistic state on a fresh
  clone instead of empty counters.
- `docs/runbooks/cpe-attention.md` — HR-facing runbook for the CPE
  cron digest (immediate actions · diagnosis A/B/C · prevention).
- `docs/HR_COMPLIANCE_GUIDE.md` — daily/weekly/monthly playbook tying
  GOSI + SCFHS license + CPE credits into one HR workflow.
- `Makefile` + root `package.json` — `make cpe-attention[-json]` and
  root `npm run cpe:attention[:json]` proxies match the existing
  ops-command surface (gov:status, preflight, dsar:hash).

### Added — auth wiring drift tests

- `backend/__tests__/admin-routes-auth-wiring.test.js` (13 tests) —
  static check that every `routes/*-admin.routes.js` (a) wires
  `authenticateToken` before any handler and (b) every individual
  `router.METHOD()` includes a role-restricting middleware
  (`requireRole`/`authorizeRoles`/`requireAdmin`/`adminOnly`). Catches
  the copy-paste regression where a new endpoint slips out without a
  role gate and an authenticated parent can hit admin data.
- `backend/__tests__/cpe-minimums-consistency.test.js` (5 tests) —
  pulls canonical 50/30/20 + 100 from `cpeService.MIN_PER_CYCLE` and
  asserts every other touchpoint (test assertions, UI subtitle, HR
  guide, runbook) mentions the same numbers in its native language.

### CI

- `concurrency:` blocks added to `ci.yml`, `sprint-tests.yml`,
  `pr-checks.yml` so superseded runs on the same ref are cancelled.
  Saves CI minutes on rapid push cycles and keeps the status check
  attached to the latest commit (not a stale in-flight run).
- `sprint-tests.yml` paths trigger updated to include the new CPE
  service / script / drift tests so CPE-touching commits still run
  the full 1043-test gate.

### Tests

Sprint suite: **1043 passing** (was 484 at 4.0.9).
• 13 unit tests for `cpeService.summarize` / `daysUntilDeadline` /
`needsAttention` (5-year window filter, env overrides, verified-vs-
unverified split, per-category deficit math, attention threshold)
• 4 CPE route smoke tests (list, overview, summary-by-invalid-id,
CSV header contract)
• 3 mount checks (`/api/admin/hr/cpe` + `/overview` + `/export.csv`)
• 5 exit-code contract tests for the cpe-attention CLI (DB-unreachable
path, `--json`/`--quiet` behavior, shebang + header documentation)
• 5 minimums-consistency drift checks (50/30/20+100 across 5 files)
• 13 admin-routes-auth-wiring static checks (auth + role-gate per file)

---

## [4.0.9] — 2026-04-18 — Invariant / drift-detection tests

Round of tests that catch real cross-component bugs (not unit-level
polish). Found + fixed a variant-regex bug in 4.0.8 the same way —
writing a real end-to-end test exposed the flaw.

### Added

- `__tests__/rate-limit-to-429.test.js` (3 tests) — proves
  adapterRateLimiter → RateLimitError → safeError → HTTP 429 +
  Retry-After header chain works end-to-end. Before this, nothing
  verified the mobile client's auto-backoff (which depends on the
  standard HTTP header) actually receives that header.
- `__tests__/request-id-contract.test.js` (4 tests) — locks the
  mobile ↔ backend X-Request-Id alphabet intersection. If either
  side drifts, correlation IDs silently stop flowing end-to-end.
- `__tests__/provider-registry-consistency.test.js` (7 tests) —
  asserts the 10 gov providers are consistent across six touchpoints
  (rate-limiter DEFAULTS · adapter files · 2 route ADAPTERS maps ·
  2 CLI scripts). Adding an 11th provider now fails CI until every
  wiring is updated.
- `__tests__/doc-test-count-consistency.test.js` (6 tests) — grep-
  and-assert that CHANGELOG + SPRINT doc + DELIVERY.md + CI summary
  all claim the same test count. Catches the "looks done but isn't"
  class of stale-number.

### Fixed

- `backend/utils/arabicSearch.js buildOrClause` — regex was built from
  the normalized query, but the DB holds un-normalized data. Rewrote
  to expand each char into a variant character-class at regex-build
  time (`ا` → `[اأإآٱ]`), so query "احمد" actually matches stored
  "أحمد". Caught by writing an end-to-end seed-and-find test, which
  the USE_MOCK_DB test-env couldn't stably run — unit-test proof
  locked the fix instead.
- `routes/beneficiaries-admin.routes.js GET /search` — flattened a
  nested `$or` that some Mongo versions silently skip.

### Tests

Sprint suite: **484 passing** (was 274 at 4.0.8).
• +3 rate-limit e2e + 4 request-id contract + 10 provider-registry
consistency (9 touchpoints) + 6 doc-count consistency + 3
variant-match assertions

---

## [4.0.8] — 2026-04-18 — Arabic-aware beneficiary search (end-to-end)

A real user-visible fix, not more ops polish. Previously a receptionist
searching "احمد" would miss every record stored as "أحمد" (hamza form),
and the picker was a fixed `limit=100/200` eager load that silently
truncated at medium-sized branches.

### Added

- **Backend**: `backend/utils/arabicSearch.js` — deterministic
  normalizer that folds alef variants (أ إ آ ٱ → ا), ta marbuta
  (ة → ه), alef maksura (ى → ي), hamza-on-waw/ya (ؤ ئ → و ي),
  Arabic-Indic digits (٠-٩ → 0-9), strips tashkeel + tatweel,
  collapses whitespace. Plus `escapeRegex` + `buildOrClause` helpers.
  23 unit tests.
- **Backend**: `GET /api/admin/beneficiaries/search?q=<>` — branch-
  scoped, min-2-chars, prefix match across 5 name fields, exact
  match priority for beneficiaryNumber + nationalId, phone-substring
  match for call-ins. Capped at 20 rows. 4 API smoke tests.
- **Frontend**: `BeneficiaryTypeahead.jsx` — debounced MUI Autocomplete
  (250 ms), status chip per row, graceful "min 2 chars" empty state,
  keeps pre-populated value reachable when editing.

### Changed — wired through every create/edit path

All 6 admin pages that picked a beneficiary migrated off the eager
load:

| Page                 | Before                          | After                        |
| -------------------- | ------------------------------- | ---------------------------- |
| AdminInvoices        | `limit=200` eager load          | BeneficiaryTypeahead         |
| AdminTherapySessions | `limit=100` eager load          | BeneficiaryTypeahead         |
| AdminCarePlans       | `limit=200` (kept for name map) | BeneficiaryTypeahead in form |
| AdminAssessments     | `limit=100` eager load          | BeneficiaryTypeahead         |
| AdminNphiesClaims    | `limit=200` eager load          | BeneficiaryTypeahead         |
| AdminClinicalDocs    | `limit=200` × 2 (duplicate bug) | BeneficiaryTypeahead × 2     |

Also dropped a dead-code duplicate `/admin/beneficiaries?limit=200`
call in AdminClinicalDocs — assigned to an unused `guardianOpts`
state.

### Tests

Sprint suite: **274 passing** (was 247 at 4.0.7):
• +23 arabic-search unit tests
• +4 beneficiary-search API smoke tests

---

## [4.0.7] — 2026-04-18 — Retry-After header + safeError tests

- `utils/safeError.js` sets standard HTTP `Retry-After` (integer
  seconds, per RFC 9110 §10.2.3) on 429 responses. Axios / Retrofit /
  browsers auto-backoff without parsing JSON.
- 7 unit tests for `safeError` covering pass-through, Retry-After
  set/not-set, 500 fallback, 500-boundary.
- Sprint suite: **247 passing** (was 240).

---

## [4.0.6] — 2026-04-18 — Runtime build identity + ship-check

Small additions on top of 4.0.5 that close the 'which commit is
actually serving this?' gap and give operators an opt-in pre-push
guardrail for ops-sensitive changes.

### Added

- `GET /api/build-info` — unauth endpoint returning commit SHA
  (full + 8-char), buildTime, startedAt, uptime, node version,
  platform, pid, env. Resolution order: `GIT_SHA` env → `git rev-parse
HEAD` → `"unknown"`. All fields cached at module-load; restart is
  the correct way to refresh.
- `frontend/components/BuildInfoChip.jsx` — small footer chip showing
  the 8-char SHA in the admin shell header. Tooltip carries the full
  commit + startedAt + uptime + node/pid/env. Silently hides if the
  endpoint 404s (backward-compat with older deploys).
- `docker-compose.professional.yml` + both Dockerfiles accept
  `GIT_SHA` + `BUILD_TIME` as build args, promoted to env so the
  build-info endpoint reports real values in production. Root
  `npm run docker:build` auto-resolves them via `git rev-parse HEAD`
  - UTC timestamp.
- `npm run ship-check` / `make ship-check` — opt-in pre-push gate
  running `preflight` + `test:ops-subsystems` (~90s, 65 tests).
  OPERATIONS.md gains a section naming the file-touch triggers where
  running this is recommended.

### Tests

Sprint suite: **240 passing** (was 208).
• +2 build-info smoke tests (shape + SHA/short agreement)
• +17 build-info internals unit tests (4 resolveX helpers + 8-case
humanizeUptime table)
• +13 zatcaEnvelope unit tests (TLV round-trip, UUID v4 format,
canonical hash determinism, SIMPLIFIED/STANDARD split, UTF-8
Arabic in seller-name QR tag)

---

## [4.0.5] — 2026-04-18 — PDPL correlation + deploy gate + DX polish

Final polish on the 4.0.x arc. Focus: close the remaining compliance
gap (correlation of cascaded calls) and prevent the one class of
production incident that kept nagging at the runbooks — someone flips
`*_MODE=live` without the secrets.

### Added

- **Correlation IDs across the audit trail.** `AdapterAudit.correlationId`
  now carries `req.id` (set by the existing X-Request-Id middleware),
  so the 4 adapter calls from a single HR onboarding POST all share
  one ID. New `GET /admin/adapter-audit/by-correlation/:id` surfaces
  them in chronological order. `AdminAdapterAudit.jsx` grows a Hub
  icon column + dialog showing the full cascade on click. DPO DSAR
  becomes a 2-click flow. The mobile client (`ApiService.ts`) generates
  its own 22-char X-Request-Id per request so mobile-originated
  cascades are traceable end-to-end through the backend fan-out.

- **Deploy gate**: `backend/scripts/preflight.js` + `preflight-script.test.js`
  (7 tests). Exits 1 with a per-provider missing-vars list if any
  `*_MODE=live` adapter is misconfigured. Three modes: TTY (colored),
  `--json` (machine), `CI_PREFLIGHT=1` (compact stderr-only). Wire
  as k8s initContainer / Dockerfile RUN / CI pre-promote gate.

- **Operator ergonomics**:
  - `scripts/gov-status.js` — colorized CLI snapshot of all 10
    adapters (exit 0/1/2 for cron consumption)
  - `OPERATIONS.md` — one-page front door: health hierarchy,
    6 incident-path one-liners, flip-to-live checklist, SLI PromQL
    recipes, emergency-reset curl
  - Root `Makefile` wrapping 14 npm targets with a `make help`
    menu auto-generated from `##` docstrings

### Tests

Sprint suite grows from 182 → **208 passing**:
• +3 correlation routing/lookup tests
• +9 Grafana JSON + Alertmanager YAML structural validation
• +7 preflight exit-code contract tests
• +7 DSAR hash-helper contract tests (CLI ↔ library parity)

`ops-artifacts.test.js` cross-checks every metric family referenced
by the dashboard/alerts exists in the Node source and vice-versa —
drift now fails the PR instead of failing at Grafana reload time.

### PDPL DSAR (added late in 4.0.5)

- `docs/runbooks/dsar-adapter-audit.md` — 4-step compliance workflow
  for Saudi Personal Data Protection Law Data Subject Access Requests.
  Includes the 30-day legal clock, 4 edge cases (no rows / hash
  mismatch after secret rotation / large cascade / erasure vs access).
- `backend/scripts/dsar-hash.js` — CLI helper that reproduces the
  `adapterAuditLogger.hashString()` output so compliance can query
  `/admin/adapter-audit?targetHash=...` without the raw ID ever
  reaching the server. Exposed via `npm run dsar:hash -- <id>` at
  root, `make dsar-hash ID=...` on Linux/macOS.

---

## [4.0.4] — 2026-04-18 — Docs, runbooks, CI widening

Closes the 4.0.x arc by packaging everything into a shape ops/on-call
can actually consume, and widens the CI gate to cover the new
subsystems.

### Added

- `frontend/components/IntegrationsHealthBadge.jsx` — 60s-poll status
  chip embedded in `/admin` landing page header. Green/amber/red with
  tooltip naming misbehaving providers, click-through to
  `/admin/integrations-ops`.
- `docs/runbooks/README.md` — alert→runbook mapping table.
- `docs/runbooks/gov-adapter-rate-limit.md` — 4 diagnosis cases for
  rate-limit saturation (runaway cron / legitimate spike / noisy
  actor / capacity misconfig).
- `docs/runbooks/gov-adapter-misconfigured.md` — 4 cases for missing
  env vars (rotated secret / config drift / manual unset / fresh env).
- 3 new SLI panels in `gov-integrations.grafana.json`: stacked request
  rate by status, 5m success rate with color bands, p50/p95/p99 latency
  overlay.
- 2 new SLI alert rules (`GovAdapterSuccessRateLow`,
  `GovAdapterLatencyP95High`).
- Observability section in `GOV_INTEGRATIONS_GO_LIVE.md` with scrape
  config, metric catalog, and PromQL recipes.
- 8 new Postman requests in "Ops — Integrations" folder (rate limits
  snapshot/reset, circuits snapshot/reset, audit list/stats/by-entity/
  CSV export) + Prometheus endpoint in Health folder.

### Changed

- `sprint-tests.yml`: new `ops-subsystems-tests` job runs the 4 new
  suites (rate limiter / circuit breaker / live-path / metrics registry)
  as a hard CI gate. Path triggers widened to include the new test
  files + `utils/safeError.js`. Summary now reports 182 tests across
  5 jobs.
- `backend/package.json`: `test:sprint` covers all 7 sprint suites;
  new `test:ops-subsystems` script for the 4 ops-layer suites.
- `runbook_url` annotations added to rate-limit + misconfigured
  alert rules (circuit already had one).

Sprint suite: **182/182 passing** — all gated in CI.

---

## [4.0.3] — 2026-04-18 — Reliability + observability hardening

Every cost-critical adapter now has a circuit breaker, every subsystem
emits Prometheus metrics, and compliance can export the audit trail to
CSV. Grafana + Alertmanager artifacts ship in the repo so a real
monitoring stack is one import away.

### Added

- `backend/services/adapterCircuitBreaker.js` — shared factory with
  named registry. Wired into GOSI (refactored, byte-identical), Absher,
  NPHIES (both eligibility + claim paths), and Fatoora. 4xx answers
  count as successes (the provider responded; our input was wrong);
  only 5xx / timeout / network errors trip the breaker.
- `GET /api/admin/gov-integrations/circuits` — per-provider snapshot.
- `POST /api/admin/gov-integrations/circuits/:provider/reset` — force-
  close a circuit the operator knows is transient (UI button added).
- `GET /api/health/metrics/integrations` — unauth Prometheus text-
  format endpoint. 9 metric families × 10 providers: rate-limit
  (capacity/available/utilization/active-actors), circuit (open/
  failures/cooldown), configured, mode. Resilient: `safeGetConfig()`
  shields the metrics path from a broken adapter.
- `GET /api/admin/adapter-audit/export.csv` — UTF-8 BOM so Excel
  renders Arabic correctly. 10k-row cap with narrow-the-filter hint.
- `docs/alerts/gov-integrations.yml` — 5 Alertmanager rules (circuit-
  open → page, rate-limit >85/100 → warn/page, misconfigured → warn,
  flipped-to-live → info).
- `docs/dashboards/gov-integrations.grafana.json` — 9-panel dashboard
  with provider-variable filtering.
- `docs/runbooks/gov-adapter-circuit.md` — on-call playbook covering
  upstream-down / network-blip / misconfig / 401-storm paths.

### Changed

- GOSI: migrated its inline circuit to the shared factory. No behavior
  delta (74 e2e tests confirm).

### Tests

- `adapter-circuit-breaker.test.js` — 16 tests (defaults, env overrides,
  rolling window, cooldown auto-close, reset, isolation, snapshot
  contract + 4 adapter integration checks).
- `new-admin-routes.api.test.js` — +7 (circuits snapshot/reset/404,
  Prometheus metrics format/help-type, CSV content-type+BOM+header).

Sprint suite: **168/168 passing** (was 145 at 4.0.2 start).

---

## [4.0.2] — 2026-04-18 — Integrations Ops dashboard + PDPL audit UI

Glue layer over the 4.0 + 4.0.1 groundwork: operators now get one
morning-check dashboard that tells them whether anything needs
attention, plus a dedicated PDPL audit viewer for compliance queries.

### Added

- `frontend/pages/Admin/AdminIntegrationsOps.jsx` — unified ops page
  at `/admin/integrations-ops`. Fan-outs to `/health/integrations`,
  `/admin/gov-integrations/rate-limits`, and `/admin/adapter-audit/stats`,
  then renders a single traffic-light banner, 4 KPI cards, and a
  10-row provider matrix (mode · configured · circuit · util bar ·
  actors · 30-day volume · success rate · avg latency). 20s poll.
- `frontend/pages/Admin/AdminRateLimits.jsx` — live per-provider
  token-bucket cards with one-click reset.
- `frontend/pages/Admin/AdminAdapterAudit.jsx` — 2-tab PDPL viewer
  (30-day rollup + filterable paginated log). Rate-limited rows
  flagged, SHA-256 hashes tooltipped as "PDPL-safe".
- Mobile: `ApiService.ts` auto-retries 429 once using server's
  `retryAfterMs`, then shows Arabic toast naming the provider.

### Changed

- `utils/safeError.js` — pass through 4xx errors with their own
  `statusCode`/`code`/`retryAfterMs` instead of flattening to 500.
- `frontend/AuthenticatedShell.js` — fixed Chat/Telehealth case-
  mismatch imports that would 404 on Linux CI.

### Fixed

- 3 untracked sprint pages (ChatV2, TelehealthList, TelehealthRoom)
  committed — lazy-loaded routes now actually resolve.

### Tests

- `__tests__/adapter-rate-limiter.test.js` — 13 unit tests.
- `new-admin-routes.api.test.js` — 10 new smoke tests for rate-limits
  - adapter-audit endpoints. Sprint suite is now **145/145 passing**
    (was 122).

---

## [4.0.1] — 2026-04-17 — Per-adapter rate limiter (cost protection)

Adds a token-bucket rate limiter in front of every `audit.wrap()` call
to the 10 Saudi government adapters. The motivation is cost control:
Absher/NPHIES/Fatoora are billed per call, and a misconfigured cron or
runaway loop could burn thousands of SAR in an afternoon.

### Added

- `backend/services/adapterRateLimiter.js` — per-provider token bucket
  with per-actor sub-cap. Defaults tuned to real vendor tiers
  (GOSI 60/30/20, Absher 30/10/5, NPHIES 120/60/30, Fatoora 600/600/200).
  Override via `{PROVIDER}_RL_CAPACITY` / `_RL_REFILL_PER_MIN` /
  `_RL_ACTOR_CAP` env vars.
- `RateLimitError` (code `RATE_LIMITED`, statusCode 429) now thrown
  transparently from `adapterAuditLogger.wrap()` on quota breach.
- Admin endpoints: `GET /api/admin/gov-integrations/rate-limits`
  (snapshot of all 10 providers) and `POST
/api/admin/gov-integrations/rate-limits/:provider/reset` (operator
  escape hatch).
- 13 unit tests (`adapter-rate-limiter.test.js`) covering pool
  exhaustion, per-actor cap precedence, refill over time, env overrides,
  and the audit-wrap integration path.

### Changed

- `backend/utils/safeError.js` — passes through errors with a 4xx
  `statusCode` (e.g. `RateLimitError=429`) instead of flattening to 500. Response body carries `code`, `retryAfterMs`, `scope`, and
  `provider` so clients can implement intelligent backoff.

### Notes

- Pure in-memory bucket — fine for single-instance deployments.
  Multi-instance production should back this with Redis (swap the
  `Map` for a redis-backed store).
- Rejection path is audited as a `status: 'rate_limited'` row so ops
  can see cost attempts on the admin dashboard.

---

## [4.0.0] — 2026-04-17 / 2026-04-18 — Rehab Core + Saudi Gov Integrations

Two-day sprint shipping 20 backend modules, 10 Saudi government adapters,
6 mobile screens, and 122 deterministic tests — all protected by a CI
hard-gate. Everything defaults to mock mode so dev runs without any
credentials; production is an env-var flip away.

### Added — Backend modules (20)

- `branches-admin` · `beneficiaries-admin` · `therapy-sessions-admin`
- `assessments-admin` (CARS/VB-MAPP/Vineland/Denver) · `care-plans-admin` (IEP 3-tier)
- `unified notifications` (WhatsApp+SMS+Email+Push fallback chain)
- `parent-portal-v2` · `therapist-workbench` · `bi-analytics` (11 KPIs)
- `invoices-admin` (ZATCA envelope) · `chat-v2` (role-aware directory)
- `clinical-docs` (multer + SHA-256 e-sign) · `telehealth-v2` (Jitsi)
- `auth/nafath` (SSO with 2-digit random number)
- `hr-compliance` · `gov-integrations` control panel · `nphies-claims`
- `branch-compliance` · `adapter-audit` (PDPL trail, 730-day TTL)
- `integrations-health` (public aggregator for K8s/Grafana)

### Added — 10 Saudi government adapters (uniform interface)

GOSI · SCFHS · Absher/Yakeen · Qiwa · Nafath · Fatoora (ZATCA) · Muqeem
· NPHIES (CCHI) · Wasel (SPL) · Balady. All expose `verify` /
`testConnection` / `getConfig`. Mock mode is deterministic (keyed off
ID suffixes); live flipped via `{PROVIDER}_MODE=live` + creds.

GOSI ships with production-grade hardening: token caching, 5-failure
circuit breaker with 120s cooldown, AbortController timeout, auto-retry
on 401/network errors.

### Added — ZATCA Phase-2 XAdES-BES signer

`backend/services/zatcaXmlSigner.js` — pure-Node UBL 2.1 XML generation,
C14N 1.1 canonicalization, SHA-256 digest, RSA-SHA256 signing over
canonical SignedInfo, XAdES `ds:Signature` block injection. Live mode
requires `ZATCA_PRIVATE_KEY` (PEM RSA-2048) + `ZATCA_CSID_CERT`
(base64 DER). In-test RSA signature verification proves the pipeline
cryptographically without real ZATCA creds.

### Added — Frontend admin (15+ pages) + portals

Dedicated pages for every backend module with branch-scoped RBAC.
Parent portal at `/my-children` · therapist workbench at `/workbench`
· Nafath SSO at `/login/nafath` with CTA on main login.

### Added — Mobile (React Native + Expo)

- 6 typed TypeScript API clients in `mobile/src/services/modules/`
- 6 production screens: NafathLogin · MyChildren · TherapistWorkbench
  (3 tabs + SOAP bottom sheet) · Telehealth (Jitsi one-tap) · ChatList
  (unread badges) · ChatThread (bubbles + 5s polling)
- Role-aware `SprintAppNavigator` with SecureStore auth guard and
  role-based tab routing

### Added — Testing (122 tests, CI-gated)

- `gov-adapters.e2e.test.js` — 74 state-machine tests (no DB/network)
- `new-admin-routes.api.test.js` — 31 supertest + mongodb-memory-server
  tests for route mounting, auth, lifecycle, health endpoints
- `zatca-xml-signer.e2e.test.js` — 17 tests including real RSA-SHA256
  signature verification
- `.github/workflows/sprint-tests.yml` — hard gate on PR (~10s total)

### Added — Demo + ops

- `demo-showcase.seed.js` — one-command ~60-record seed hitting every
  mock state (`npm run seed:demo:reset`)
- Postman collection with 70 requests across 15 folders
- `/api/health/integrations/*` — public aggregator with 60s cache,
  K8s-ready readiness probe (503 on misconfigured)

### Added — PDPL audit trail

`AdapterAudit` model + `adapterAuditLogger.wrap()` records every gov
adapter call with SHA-256 hashed PII targets (never raw IDs), actor,
operation, latency, IP hash. 730-day TTL matches PDPL retention rules.
Admin/compliance/dpo query at `/api/admin/adapter-audit`.

### Fixed

- `routes/_registry.js` — 2 silent mount bugs (destructured `{ router }`
  from `safeRequire`'s fallback → undefined handler → 15 admin routes
  silently never mounted in prod). Caught by API smoke tests.

### Docs

- `docs/sprints/SPRINT_2026_04_17-18.md` · `GOV_INTEGRATIONS_GO_LIVE.md`
- `mobile/src/services/modules/README.md`

---

## [3.1.0] — 2026-03-29

### Added — نظام خطط التأهيل الفردية (Rehabilitation Plans System)

- `backend/models/RehabilitationPlan.js` — نموذج Mongoose كامل بمعايير WHO-ICF + APTA + ICD-11
  - Sub-schemas: SmartGoalSchema, SessionRecordSchema, PlanServiceSchema, AIAssessmentSchema, PlanReviewSchema, TeleSessionSchema
  - Virtual fields: goalAchievementRate, completedSessionsCount, weeksRemaining, latestAIAssessment
  - Pre-save hooks: توليد planCode فريد، تحديث overallProgress تلقائيًا
  - Static methods: getTherapistStats, getPlansNeedingReview
- `backend/routes/rehabilitationPlan.routes.js` — 16 endpoint REST API (CRUD + AI + Tele-Rehab)
- `backend/controllers/rehabilitationPlan.controller.js` — متحكم كامل يربط 8 خدمات (AI، جدولة، تقارير، جودة...)
- `frontend/src/pages/RehabDashboard.jsx` — لوحة تحكم React متكاملة (5 تبويبات، CRUD كامل، AI assessment)
- `frontend/src/pages/SpecializedRehab/` — 6 صفحات تأهيل متخصصة:
  - BehaviorManagement.jsx, ProgramEnrollment.jsx, RehabProgramsLibrary.jsx
  - RehabProgressTracking.jsx, ScaleAdministration.jsx, SpecializedScalesLibrary.jsx
- `docs/rehabilitation-dashboard.html` — توثيق تفاعلي للوحة التأهيل
- `docs/rehabilitation-plan-template.html` — قالب خطة التأهيل الموحد
- `backend/seeds/branches.seed.js` — بيانات أولية للفروع الـ 12 + المقر الرئيسي

### Fixed — إصلاحات أمنية وتقنية حرجة

#### 🔐 أمان (Security)

- **CRITICAL**: استبدال `authGuard` الوهمي في `rehabilitationPlan.routes.js` الذي كان يُعيّن `req.user = { id: 'dev-user', role: 'therapist' }` بـ JWT حقيقي من `middleware/auth.js`

#### 🗄️ نماذج Mongoose (Model Fixes)

- `backend/models/advanced.models.js`: إصلاح 8 حقول enum بدون `type: String` (invoices.status، costs.category، payments.method، customReports.type/format، charts.type، systemSettings.language، backups.status)
- `backend/models/Camera.js`: إصلاح جدول تسجيل الأسبوع — كل يوم من 7 أيام كان `{ from: '00:00' }` بدلًا من `{ from: { type: String, default: '00:00' }, to: { type: String, default: '23:59' } }`
- `backend/models/comprehensive.models.js`: إصلاح 9 حقول enum بدون `type: String` (sessionType، status، goals.status، messages.type، preferredContactMethod، contactFrequency، allergies.severity، dailyRecords.status، leaves.type)
- `backend/models/Zakat.model.js`: إزالة `timestamps: true` من داخل جسم 3 schemas (كانت تُعامَل كحقل وليس كـ option)
- `backend/models/Branch.js`: إزالة duplicate index على حقل `code` (كان محددًا مرتين)
- `backend/models/Camera.js`: إزالة duplicate index على `hikvision.ipAddress` (كان يحمل `unique: true` ثم index مستقل)

#### ⚙️ Redis Configuration

- `backend/config/cache.config.js`: إضافة فحص `DISABLE_REDIS=true` في `createRedisClient()` لمنع رسائل NOAUTH المتكررة
- `backend/config/cache.advanced.js`: إضافة فحص `DISABLE_REDIS=true` في `initializeRedis()`
- `backend/config/redis.config.js`: إضافة فحص `DISABLE_REDIS=true` في `connectRedis()`

#### 🔍 تحقق من المدخلات (Validation)

- `backend/controllers/rehabilitationPlan.controller.js`:
  - `validatePlanData()`: يدعم حقول الفرونت (`beneficiary`, `primaryDiagnosis`) والخدمة (`beneficiaryId`, `disabilityType`) معًا — يمنع 400 Bad Request الصامت
  - `validateGoalData()`: يدعم `goalText` (فرونت) و `description` (خدمة) معًا
  - إضافة field normalization في `createPlan` و `addGoal` — توحيد أسماء الحقول قبل الإرسال
  - حذف `const path = require('path')` غير المستخدم

#### 🛣️ مسارات (Routes)

- `backend/routes/_registry.js`: حذف مسار مكرر `/api/rehabilitation` الذي كان يشير لنفس وحدة `/api/disability-rehabilitation` (الفرونت يستخدم `/api/rehab-plans`)

### Improved — تحسينات UX وموثوقية الفرونت

- `frontend/src/pages/RehabDashboard.jsx`:
  - إضافة `RehabErrorBoundary` (React Error Boundary) — يلتقط أخطاء React غير المتوقعة ويعرض رسالة عربية مع زر "إعادة المحاولة"
  - إضافة client-side validation قبل الإرسال:
    - `handleCreatePlan()`: تحقق من المستفيد، التشخيص، تاريخ البدء، وترتيب التواريخ
    - `handleAddGoal()`: تحقق من نص الهدف
    - `handleRecordSession()`: تحقق من تاريخ الجلسة
- `frontend/src/pages/Sessions/index.jsx`:
  - إضافة `SessionsErrorBoundary` — يلتقط أخطاء غير متوقعة ويسجّلها في console

---

## [3.0.0] — 2026-01-15

### Added

- Branch Management System — 12 فرع + HQ الرياض
  - RBAC متقدم: hq_super_admin / hq_admin / branch_manager / therapist / driver / receptionist
  - 25 endpoint: HQ dashboard، مقارنة الفروع، الموارد البشرية، الجداول، التقارير، KPIs
  - Phase 2: Analytics، Forecasting، AI Recommendations

---

## [Unreleased]

---

## [3.2.0] — 2026-04-01

### Added

- Backend ESLint configuration (`backend/.eslintrc.json`) for consistent code quality.
- Pagination middleware — caps `?limit` to a maximum of 100 to prevent full-collection dumps.
- Magic-byte validation for file uploads — rejects files whose content doesn't match their declared MIME/extension.
- Rate limiter on payment write operations (`POST`/`PUT`/`PATCH`/`DELETE`).
- Redis health check with actual `PING` in `/api/v1/health/system`.
- `security.txt` at `/.well-known/security.txt`.
- `CONTRIBUTING.md` — contribution guide for developers.
- Server request timeouts (`timeout`, `keepAliveTimeout`, `headersTimeout`).

### Fixed

- `setInterval` leaks in `performanceOptimization.js` (WebSocket batcher + memory monitor) and `advanced-logger.js` (log rotation) — all intervals now store IDs and expose cleanup methods.
- File upload filter changed from OR (MIME **or** extension) to AND (MIME **and** extension) — prevents MIME spoofing bypass.
- ESLint flat config (`frontend/eslint.config.js`) — removed incompatible plugins (`unused-imports`, `react-hooks`) that used deprecated ESLint v8 APIs (`context.getFilename`, `context.getSourceCode`) causing push failures with ESLint v10.
- Syntax error in `frontend/src/__tests__/apiEndpoints.test.js` — fixed `it.each` arrow function syntax.
- `no-undef` error in `backend/rehabilitation-ai/recommendation-engine.js` — fixed `vabs_adaptive_composite` undefined variable.

### Changed

- CI pipeline: added frontend Jest tests step.
- Diagnostic utility scripts (`check_*.js`, `fix_*.js`, `trace_*.js`) added to `.gitignore` to keep repository clean.

---

## [1.0.0] — 2025-06-01

### Added

- Initial release: 200+ API route modules, 350+ Mongoose models, 400+ services.
- React 18 frontend with MUI 5, RTL support, 90+ routes.
- JWT authentication, RBAC, audit trail, rate limiting.
- Docker Compose dev / production / professional profiles.
- Jest test suite — 288 suites, 8,930 tests.
- Kubernetes & Helm deployment manifests.
- GitHub Actions CI (lint → test → build → security audit → summary).
