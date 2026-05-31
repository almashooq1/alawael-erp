# Authorization Modernization Plan — from fragmented-live to ADR-035 target

> Modernization of the EXISTING live authorization implementation (Express +
> MongoDB) toward the [ADR-035](decisions/035-enterprise-authorization-design.md)
> target (branch-scoped RBAC + unit/service scope + explicit deny + audit +
> RLS-ready + clean middleware + centralized registry). Target role model =
> [ADR-036](decisions/036-role-archetype-reconciliation.md) archetypes; target
> matrix = [`role-permissions.seed.json`](role-permissions.seed.json).
>
> **Headline finding (from a 4-facet code inspection): the live system is not
> under-built — it is _over-fragmented_.** It already has RBAC + an ABAC PDP
> (deny-overrides) + tenantScope + break-glass + SoD + approvals + delegations +
> access-review. The work is **consolidation, boundary discipline, and closing a
> fail-open default** — not building from scratch. This makes a low-disruption,
> backward-compatible refactor realistic.

---

## 1. Current-state analysis

### 1.1 What exists (more than expected)

Three enforcement layers already ship:

- **RBAC** — `config/rbac.config.js` (~972 LOC): `RESOURCES` (47) × `ACTIONS` (8)
  → `resource:action` perms; `ROLE_PERMISSIONS` per-role maps; `ROLE_HIERARCHY`
  inheritance resolved at runtime by `resolvePermissions()` with a 5-min cache;
  `hasPermission(role, resource, action, custom[], denied[])` — **deny checked
  first**.
- **ABAC** — `authorization/abac/policy-decision-point.js` with a **deny-overrides**
  combinator + 11 policies (caseload, confidentiality, cross-branch, regional,
  break-glass-active, domain-sod, guardian-own-child, record-ownership, …).
- **Tenant scope** — `authorization/tenantScope.plugin.js` (Mongoose plugin,
  auto-filters by `branchScope.branchId`, **opt-in per schema**) +
  `requestContext.js` (AsyncLocalStorage — the GUC analogue).
- **Governance primitives already present**: `break-glass/engine.js` (co-sign,
  4h, monthly cap), `sod/{registry,checker,domain-rules}.js`,
  `approvals/engine.js`, `delegations/delegation.model.js`,
  `intelligence/authz.registry.js` (Wave-31 “constitution”),
  `access-review.service.js`.

### 1.2 The real problems (fragmentation, leakage, fail-open)

| #      | Problem                                                                                    | Evidence                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | **4 incompatible `hasPermission()` implementations**                                       | `config/rbac.config.js:908` (role,res,action) · `intelligence/governance.service.js:37` (role,code) · `permissions/permission-service.js:393` (async) · `services/branchPermission.service.js:271` (user,branch,module,action)                 |
| **P2** | **3 competing ROLES registries, desynchronized**                                           | `config/constants/roles.constants.js:17` (~40, canonical) · `config/rbac.config.js:17` (~77 superset, Phase-7) · `services/branchPermission.service.js:7` (7, legacy kebab `HQ_SUPER_ADMIN`)                                                   |
| **P3** | **≥5 coexisting gate middleware**                                                          | `middleware/rbac.js` · `middleware/rbac.v2.middleware.js` · `middleware/auth.js` · `middleware/branchAuth.middleware.js` · `permissions/permission-middleware.js`                                                                              |
| **P4** | **Authz leaks into business/UI logic** — role drives the _query/response_, not just access | `parent-portal-v2.routes.js:111-119` (role → Mongo filter) · `branches.routes.js:42-44` · `subscription.routes.js:128` · `montessoriAuth.js:88` · `services/branchPermission.service.js:271` · `services/finance/expenseApprovalService.js:88` |
| **P5** | **Hardcoded role literals, no registry**                                                   | `requireRole([...])` ≈ **1006** occurrences vs `requirePermission()` ≈ **88**; literal `super_admin` vs `superadmin` typo-class uncatchable                                                                                                    |
| **P6** | **Branch scope defaults FAIL-OPEN**                                                        | `branchScope.middleware.js:157` → `{restricted:false, allBranches:true}` when `!branchId`; only closed by `BRANCH_SCOPE_FAIL_CLOSED=true` (**default off**)                                                                                    |
| **P7** | **710+ inline `{branchId:…}` filters bypass the canonical helpers**                        | scattered services + `controllers/phase37.controller.js:130` passes `req.query.branchId` directly (W269h-class user-supplied scope)                                                                                                            |
| **P8** | **Explicit deny is runtime-only, not declarative**                                         | deny works via `deniedPermissions[]` param + PDP, but no role/user deny is a first-class stored field                                                                                                                                          |
| **P9** | **Naming drift**                                                                           | `role` vs `roles[]`; `branchId` vs `branch_id` vs `branch` vs `branch_code`; `permission` vs `perm`; `super_admin` vs `superadmin`                                                                                                             |

### 1.3 Security-relevant (rank-ordered)

1. **P6 fail-open** — a restricted user with a missing/deleted `branchId` reads
   **all branches**. Highest severity; one env-flag + audit away from closed.
2. **P7 user-supplied scope** — `req.query.branchId` reaching a Mongo filter is a
   cross-tenant read if the route doesn’t also `assertBranchMatch`.
3. **P4 leakage** — authz embedded in handlers/services means no single place to
   audit “who can see what”, and field-by-role filtering is easy to get wrong.

---

## 2. Target-state architecture (= ADR-035, summarized)

- **One registry** — `permissions.registry.js` generated from
  `role-permissions.seed.json`; `P.X` constants, no string literals in routes.
- **One resolver** — a pure `can(actor, permissionKey, ctx)` (deny-biased);
  RBAC + inheritance − deny + scope + SoD evaluated in one place (the PDP that
  already exists, fed by the unified registry).
- **One scope path** — `effectiveBranchScope()` / `branchFilter()` /
  `assertBranchMatch()` are canonical; unit/service scope added as the matrix
  defines; **fail-closed** by default.
- **Explicit deny first-class** — `role_denied_permissions` +
  `user_denied_permissions` + scope-override deny (the three layers of ADR-035 D3).
- **Clean middleware** — `authenticate` (who) ⟂ `requirePermission(P.X)` (what)
  ⟂ `requireBranchAccess`/scope ⟂ `requireMfaTier` (assurance); services contain
  **zero** role checks.
- **RLS-ready** — for the PG target, the ADR-035 schema + RLS; for the live Mongo
  interim, `tenantScope` becomes **default-on** + aggregate-scoped + drift-guarded.
- **Audit + governance** — hash-chained audit, maker-checker, access-review,
  break-glass (the governance layer — see the companion governance design).

The live system already has the _organs_; modernization **wires them to one
spine** and removes the duplicates.

---

## 3. Gap analysis

| Dimension            | Current (live)                       | Target (ADR-035)                        | Gap          | Disruption to close                                |
| -------------------- | ------------------------------------ | --------------------------------------- | ------------ | -------------------------------------------------- |
| Permission resolver  | 4 impls (P1)                         | 1 `can()` facade                        | **High**     | Low — facade + re-export shims                     |
| Role source          | 3 registries (P2)                    | 1 canonical + aliases                   | **High**     | Low — merge + shim                                 |
| Gate middleware      | ≥5 (P3)                              | 1 stack (`requirePermission`)           | **High**     | Medium — codemod `requireRole`→`requirePermission` |
| Authz location       | leaks into services/handlers (P4/P5) | middleware boundary only                | **High**     | Medium — per-domain ratchet                        |
| Branch scope default | fail-open (P6)                       | fail-closed                             | **Critical** | Low — flip flag after audit                        |
| Scope helper usage   | 710+ inline (P7)                     | canonical helpers                       | **High**     | Medium — W269i guard + ratchet                     |
| Explicit deny        | runtime param (P8)                   | declarative 3-layer                     | Medium       | Low — additive fields                              |
| Unit/service scope   | partial (caseload ABAC)              | first-class                             | Medium       | Medium — matrix-driven                             |
| RLS                  | none (Mongo)                         | RLS (PG) / hardened tenantScope (Mongo) | Medium       | High (PG cutover) / Low (Mongo)                    |
| Audit                | partial (`piiAccess`, AuditLog)      | hash-chained, complete taxonomy         | Medium       | Medium (governance layer)                          |
| Naming               | drift (P9)                           | canonical                               | Low          | Low — lint + aliases                               |

**Net**: most gaps are **High-impact / Low-or-Medium disruption** because the
behaviour mostly exists — it’s duplicated and inconsistently invoked.

---

## 4. Phased migration plan (backward-compatible, minimal disruption)

Each phase is independently shippable, additive-first, and reversible. Follows
the repo’s proven **ratchet-down** doctrine (baseline → guard → fix one group per
wave → prune baseline).

### Phase 0 — Stop the bleeding (guards + the one urgent flip). No behaviour change.

- **Drift guards** (pure-source, CI, exit 0/1) — fail on any NEW:
  (a) `hasPermission`/`can` implementation outside the canonical file;
  (b) `ROLES`/role-enum definition outside `roles.constants.js`;
  (c) inline `{ branchId: … }` query filter not using `branchFilter()` (extend
  W269h → **W269i**); (d) `requireRole([literal])` whose literal isn’t in the
  registry. Baseline the existing counts; ratchet down later.
- **P6 fix readiness** — run `audit:no-branch-users`; once clean, set
  `BRANCH_SCOPE_FAIL_CLOSED=true`. This is the single highest-value change.
- **P7 quick win** — grep `req.query.branchId|req.body.branchId` reaching a
  filter; wrap each in `effectiveBranchScope(req)` (ignores spoofing).

### Phase 1 — Single sources of truth (additive shims, zero call-site churn).

- **Roles** — make `config/constants/roles.constants.js` THE source; merge the
  Phase-7 superset into it; `rbac.config.js` `ROLES` becomes
  `module.exports.ROLES = require('./constants/roles.constants').ROLES` (+ alias
  map for `HQ_SUPER_ADMIN`→`super_admin`). No caller changes.
- **Resolver** — introduce `authorization/can.js` exporting one
  `can(actor, permissionKey, ctx)`; re-point the 4 `hasPermission` impls to
  delegate to it (keep their signatures as thin adapters). Behaviour preserved,
  one brain.
- **Registry** — generate `permissions.registry.js` from
  `role-permissions.seed.json` via the existing
  `docs/architecture/gen-permissions-artifacts.js` pattern; add the
  registry↔`rbac.config` drift guard (every live `resource:action` resolves;
  every seed key exists).

### Phase 2 — Boundary discipline (per-domain ratchet).

- **`requireRole([literal])` → `requirePermission(P.X)`** — codemod one domain at
  a time (start with finance + HR + user-management, the SoD-sensitive ones).
  Keep `requireRole` as a **shim** that maps the role set to the union of its
  registry permissions (backward-compatible during migration).
- **De-leak services** — move the ~104 inline role checks (P4) out of
  services/handlers into middleware + **scoped query builders**
  (`scopedFind(req, Model, extra)` = `Model.find({ ...branchFilter(req), ...extra })`).
  A service receives pre-authorized, pre-scoped queries; it performs **no** role
  checks. One domain per wave; W269i guard prevents regressions.
- **Collapse middleware (P3)** — deprecate `rbac.js` + `branchAuth.middleware.js`
  in favour of `rbac.v2.middleware.js` (cleanest) + the scope helpers; re-export
  old names as shims; drift-guard against new imports of the deprecated ones.

### Phase 3 — Explicit deny + governance (additive).

- Promote deny to declarative: `role_denied_permissions` + per-user
  `deniedPermissions` already partially exist — make them first-class stored +
  surfaced in `can()` (deny-overrides, already the PDP behaviour).
- Wire the **governance layer** (hash-chained audit completeness, maker-checker
  on sensitive grants, access-review teeth, break-glass post-hoc review) — see
  the companion governance design.

### Phase 4 — RLS-ready / scope completion.

- **Mongo interim**: flip `tenantScope` from opt-in to **default-on** for tenant
  models (`branch-scoped-models.registry.js` becomes the allow-list of
  exemptions, not the opt-in list); scope every `.aggregate()` with
  `branchFilter` (the audit tools from the prior session already find the gaps).
- **PG target**: the ADR-035 schema + RLS (`set_app_context`, `FORCE ROW LEVEL
SECURITY`, `NOSUPERUSER NOBYPASSRLS`) — only on the funded cutover.
- **Unit/service scope**: add `user_unit_access` / `user_service_access`
  resolution to `can()` per the matrix (the caseload ABAC policy is the seed).

---

## 5. Code & SQL changes required

### 5.1 The one resolver (`backend/authorization/can.js`) — Phase 1

```js
'use strict';
// Single permission decision. The 4 legacy hasPermission()s become adapters to this.
const reg = require('./permissions.registry'); // generated from the seed
const { resolvePermissions } = require('../config/rbac.config'); // inheritance walk (kept)

/**
 * @returns {{allow:boolean, reason:string, tier:(number|null)}}
 */
function can(actor, permissionKey, ctx = {}) {
  const meta = reg.META[permissionKey];
  if (!meta) return { allow: false, reason: 'unknown-permission', tier: null };
  // 1) explicit deny wins (role + user) — ADR-035 D3
  if ((actor.deniedPermissions || []).includes(permissionKey) || (reg.ROLE_DENY[actor.role] || []).includes(permissionKey))
    return { allow: false, reason: 'explicit-deny', tier: meta.tier };
  // 2) grant (inheritance-resolved) — reuse the live engine
  const granted = resolvePermissions(actor.role); // {resource:[actions]} incl. inherited
  const [res, act] =
    permissionKey
      .split(':')
      .slice(0, 3)
      .reduce((a, p, i) => (i < 2 ? a : a), null) && permissionKey.split(':');
  const ok = grantedHas(granted, permissionKey);
  if (!ok) return { allow: false, reason: 'ungranted', tier: meta.tier };
  // 3) scope predicate is evaluated by branchFilter/assertBranchMatch at the call site
  return { allow: true, reason: 'granted', tier: meta.tier };
}
module.exports = { can };
```

Then the legacy entry points become one-liners:

```js
// config/rbac.config.js — keep signature, delegate
function hasPermission(role, resource, action, custom = [], denied = []) {
  return require('../authorization/can').can({ role, customPermissions: custom, deniedPermissions: denied }, `${resource}:${action}`).allow;
}
```

### 5.2 `requireRole` → `requirePermission` shim — Phase 2

```js
// middleware/rbac.v2.middleware.js — make requireRole a registry-backed shim
const reg = require('../authorization/permissions.registry');
function requireRole(...roles) {
  // backward-compatible
  // a role gate = "holds ANY permission these roles hold" is wrong; instead:
  return (req, res, next) => {
    // keep role semantics during migration
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (roles.flat().includes(req.user.role)) return next();
    return res.status(403).json({ error: 'FORBIDDEN', code: 'ROLE_REQUIRED' });
  };
}
// NEW canonical gate — used by migrated routes:
function requirePermission(permissionKey, opts = {}) {
  return (req, res, next) => {
    const v = require('../authorization/can').can(req.user, permissionKey, { req });
    if (!v.allow) return res.status(req.user ? 403 : 401).json({ error: v.reason });
    if (reg.META[permissionKey]?.tier >= 2) return requireMfaTier(reg.META[permissionKey].tier)(req, res, next);
    return next();
  };
}
```

### 5.3 Scoped query builder (de-leak services) — Phase 2

```js
// authorization/scopedQuery.js — services stop doing role checks
const { branchFilter } = require('../middleware/branchScope.middleware');
const scopedFind = (req, Model, extra = {}) => Model.find({ ...branchFilter(req), isDeleted: { $ne: true }, ...extra });
// replaces e.g. parent-portal-v2.routes.js:111-119 role->filter branching
module.exports = { scopedFind };
```

### 5.4 Fail-closed flip — Phase 0 (the urgent one)

```diff
- // branchScope.middleware.js:157  legacy fail-open default
- req.branchScope = { restricted: false, branchId: null, allBranches: true };
+ // fail-closed: a restricted user with no branchId sees NOTHING
+ if (process.env.BRANCH_SCOPE_FAIL_CLOSED !== 'false')   // default ON after audit
+   return res.status(403).json({ error: 'NO_BRANCH_SCOPE' });
```

Gate the flip on `npm run audit:no-branch-users` returning zero legitimate
branch-less restricted accounts.

### 5.5 RLS-ready SQL (PG target — Phase 4, from ADR-035)

```sql
ALTER TABLE clinical_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_note FORCE ROW LEVEL SECURITY;
CREATE POLICY branch_isolation ON clinical_note USING (
  app.current_app_is_hq() OR branch_id = ANY (app.current_app_branch_ids()));
-- + role_denied_permissions / user_denied_permissions tables for declarative deny (D3)
-- + the governance tables (audit_log hash-chain, permission_change_request, …)
```

Until the cutover, the Mongo equivalent is: `tenantScope` default-on +
`branchFilter` on every aggregate + the `audit:untenanted-aggregations` guard.

---

## 6. What NOT to rewrite (preserve)

- The ABAC PDP + 11 policies, break-glass engine, SoD checker, approvals engine,
  delegations, access-review — **keep**; they’re the governance organs. Feed them
  the unified registry; don’t replace them.
- `requireMfaTier` (clean, fail-closed), `assertBranchMatch` (clean,
  fail-closed), `requestContext` (the GUC analogue) — **keep**.
- Role _values_ and route URLs — unchanged (backward compatibility); only the
  _definitions_ are consolidated behind shims.

## 7. Open questions / owner sign-off

- **Q1** — Flip `BRANCH_SCOPE_FAIL_CLOSED` now (after `audit:no-branch-users`), or
  stage per environment? (Recommend: now, in non-prod; prod after one audit cycle.)
- **Q2** — Canonical resolver home: extend `intelligence/authz.service.js`
  (Wave-31) or new `authorization/can.js`? (Recommend the latter — colocated with
  the PDP it feeds.)
- **Q3** — `requireRole` retirement: shim-forever, or hard-deprecate after the
  codemod reaches 100%? (Recommend deprecate + drift-guard once <50 call sites.)
- **Q4** — Unit/service scope: build now on Mongo, or defer to the PG cutover?

## 8. Realization map (live-now vs target)

| Phase                                  | Lands on                            | Risk                              |
| -------------------------------------- | ----------------------------------- | --------------------------------- |
| 0 guards + fail-closed flip + P7 wraps | Mongo, now                          | Low (additive + one audited flip) |
| 1 single sources (shims)               | Mongo, now                          | Low (backward-compatible)         |
| 2 boundary discipline (ratchet)        | Mongo, per-domain                   | Medium                            |
| 3 explicit deny + governance           | Mongo, now / governance design      | Medium                            |
| 4 RLS / scope completion               | Mongo hardening now · PG on cutover | Low (Mongo) / High (PG)           |

The first two phases are pure consolidation and the fail-closed flip — **high
security value, near-zero disruption** — and can ship this quarter. Cross-refs:
ADR-035 (target), ADR-036 (role archetypes), the permissions matrix + seed, and
the W269 branch-isolation series already in flight.
