# Security Audit W1408 — "dead scope axis" class (backend-wide)

- **Date:** 2026-06-17
- **Trigger:** W1407 found a CRITICAL cross-tenant PII leak on the WhatsApp surface (`docs/security/FINDING_W1407_WHATSAPP_CROSS_TENANT_LEAK.md`). This audit answers: *is that an isolated bug, or one instance of a systemic class?*
- **Verdict:** Systemic in *source* (28 files reference a never-populated tenancy field), but the **live exploitable blast radius is exactly one surface — WhatsApp**. Everything else is benign, dormant, or vestigial.
- **Durable control shipped:** `backend/__tests__/dead-scope-axis-read-filter-wave1408.test.js` — a ratchet-down drift guard that fails CI on any new reliance on a dead scope axis and forces the baseline to shrink as sites are fixed.

---

## The class

This platform is **branch-scoped**. The canonical tenant axis is `branchId`, populated by the W930 enrichment middleware (`ENABLE_USER_BRANCH_ENRICH=true`, live in prod since 2026-06-09) and enforced via the W269 helpers (`effectiveBranchScope`, `branchFilter`, `assertBranchMatch`).

The JWT payload is `{ id, email, role, permissions }` (`middleware/auth.js::generateToken`). The auth middleware's `aliasUserId` adds only `_id`. **No middleware ever sets `organizationId`, `orgId`, `tenantId`, or `companyId` on `req.user`.** Any code that scopes by one of these is relying on `undefined`.

Two failure modes follow:

1. **Read-isolation keyed on a dead axis → fail OPEN.** `filter.<deadAxis> = req.user.<deadAxis>` collapses to `{}`, so `Model.find({})` returns every tenant's rows. This is the W1407 leak.
2. **Write-stamp / arg of a dead axis → fail SILENT.** `{ tenantId: req.user.tenantId }` persists `undefined`; a `service(x, req.user.tenantId)` arg the callee ignores. Harmless to confidentiality, but a latent trap if a future read ever filters by the stamped field.

Why existing guards missed it: **W269h** (`no-broken-req-branchid-wave269h`) matches `req.branchId` — a *different* never-set spelling — not these axes. Static guards check source shape, not runtime effect (the W385 lesson): a predicate that *looks* like scoping passes every static check while being a runtime no-op. Only running the route as an unprivileged user reveals the open door.

---

## Classification of all 28 sites

| Tier | Meaning | Files |
| ---- | ------- | ----- |
| 🔴 **LIVE-LEAK** | Mounted + dead axis is the **sole** read-isolation predicate (no `branchId` co-filter) | `routes/whatsapp.routes.js` (30) — **W1407** |
| 🟠 **DORMANT** | Read-filters on a dead axis, but `vehicles/index.js` is **never required from `app.js`** (three in-code "dead code at runtime" comments confirm). Latent — must be fixed **before** any ADR-030 decision wires `vehicles/` live | `vehicles/saudi-traffic-routes.js` (10), `vehicles/vehicle-routes.js` (5), `vehicles/saudi-vehicle-routes.js` (4), `vehicles/student-transport-routes.js` (4), `vehicles/rehabilitation-transport-routes.js` (2) |
| 🟢 **BENIGN — write-stamp** | Stamps a vestigial field (value is `null`/`undefined`/body echo); reads are isolated by the **real** `branchId` via `effectiveBranchScope` (W1166) | `communication/email-routes.js` (7, into `metadata`), `domains/family` (2), `domains/programs` (2), `routes/forms-catalog` (2), `routes/noor` (2), `domains/goals/measures` (1), `domains/reports` (1), `domains/workflow` (1), `routes/digital-assessment` (1), `routes/evidence` (1), `routes/invoices-admin` (1), `students/student-routes` (1) |
| 🟢 **BENIGN — dropped arg** | Dead axis passed as a service arg the callee never reads (`getExpiringPolicies(days)` ignores the 2nd param) | `controllers/insurance.controller.js` (2) |
| 🟢 **BENIGN — rate-limit key / audit scope** | `scope: req => req.user.tenantId \|\| req.user.branchId \|\| req.user.id \|\| 'global'` — a bucket key with a fallback chain, not a data predicate; or a gov adapter audit-context object | `permissions/permission-middleware.js` (8, with `x-tenant-id` header fallback), `routes/gosi-full` (1), `routes/muqeem-full` (1), `routes/mudad` (2), `routes/nafath-signing` (1), `routes/nphies-claims` (1), `routes/payment-gateway` (1), `routes/wasel-address` (1), `routes/yakeen-verification` (1) |

**Live exploitable surfaces: 1** (WhatsApp). **Latent-on-wiring: 5** (vehicles, dormant). **Benign: 22.**

---

## Why the benign tiers are genuinely benign (not hand-waving)

- **Write-stamps:** the stamped value is dead (`null`/`undefined`), and the corresponding **reads** in those routes scope by `branchId` through `effectiveBranchScope(req)` (the W1166/W269 hardening), not by the stamped axis. The org/tenant field is cosmetic residue from an earlier multi-org design intent. It does not gate any query.
- **Rate-limit keys:** these feed a rate-limiter's bucket identity, not a DB query. The `|| 'global'` tail means a missing axis degrades to a shared bucket — a fairness/quota nuance, never a data-confidentiality boundary.
- **Dropped arg:** `EmployeeInsurance.getExpiringPolicies` is declared `(days = 30)`; the controller's `, req.user?.tenantId` 2nd argument is silently discarded by JS. No scoping ever happened via it (employee-insurance is org-global HR data by design).

---

## Recommendations

1. **WhatsApp (🔴):** apply the coordinated branch-scoping fix per `FINDING_W1407_*` (webhook `branchId` backfill **first**, then `effectiveBranchScope`-based read scoping at all sites, then `requireBranchAccess` middleware). Owner: the WhatsApp workstream. Treat as a **launch blocker for any external WhatsApp exposure**.
2. **Vehicles (🟠):** the dead-axis read-filters are inert today. If ADR-030 ever wires `vehicles/index.js` into `app.js`, the `tenantId` filters **must** be converted to `branchId` scoping in the same change — otherwise wiring the module ships five new fail-open leaks. The W1408 guard keeps these on the radar.
3. **Benign (🟢):** no action required for confidentiality. Opportunistic cleanup — drop the vestigial `organizationId`/`tenantId` stamps when those files are next touched — would shrink the guard baseline and remove the trap.
4. **Regression control:** the W1408 guard (below) makes the class non-recurring.

---

## The guard (`__tests__/dead-scope-axis-read-filter-wave1408.test.js`)

W340 ratchet-down pattern, static-source only:

- Scans the route-layer dirs (`routes`, `domains`, `controllers`, `vehicles`, `communication`, `permissions`, `students`) for every `req.user(?.).<deadAxis>`.
- Asserts the per-file occurrence map **exactly equals** a frozen baseline (28 files / 96 occurrences as of W1408).
- A **new** occurrence or file fails CI → author must scope by `branchId` (W269 helpers) or consciously baseline a provably-benign use with a one-line reason.
- A **removed** occurrence fails CI → when a site is fixed (e.g. WhatsApp), the baseline must ratchet **down** in the same commit, keeping it equal to source-truth and driving the leak surface toward zero.
- A root-cause anchor test asserts `middleware/auth.js` mentions none of the dead axes — if the token ever gains a tenant field, the guard self-signals for review.

This complements W269h: W269h owns the `req.branchId` spelling; W1408 owns the dead-axis spellings (`organizationId`/`orgId`/`tenantId`/`companyId`) that W269h does not match.
