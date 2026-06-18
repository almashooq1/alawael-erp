# Org-fail-open scoping audit — W1407 class sweep (2026-06-18)

Triage of the **W1407 bug class** across the `66666/backend` codebase: routes/
services that scope data by `req.user.organizationId` (or `req.user.organization`)
— fields **no middleware in this platform ever sets** — so the scope is always
`undefined`, and a `if (orgId) filter.organizationId = orgId` guard silently
falls through to an **unscoped (fail-open)** query.

## Premise (verified platform-wide)

- **No middleware/auth code sets `req.user.organizationId` or `req.user.organization`.**
  (`grep` over `middleware/`, `services/auth*` → zero assignments.)
- **No code creates `Organization` documents** (only the model registration + one
  read in `riskAssessment.routes.js`). The platform is a **single organization
  with branches** — isolation is by `branchId`, not `organizationId`. So
  `organization*`-scoping is **vestigial / single-tenant**.
- The canonical tenant key is `branchId`, enforced via `effectiveBranchScope(req)`
  / `branchFilter(req)` (W269 doctrine).

## Findings

| # | Surface | `organizationId` use | Verdict |
|---|---------|----------------------|---------|
| 1 | `routes/whatsapp.routes.js` — `/conversations` (+pending-review, byId read/resolve/assign/mark-read, insights, analytics) | filter on `WhatsAppConversation` (branch-scoped beneficiary **message PII**), open to **any authed user** | 🔴 **REAL LEAK — FIXED** (W1411 #536, live on prod) — now `branchId` via `effectiveBranchScope` |
| 2 | `routes/whatsapp.routes.js` — contact groups (list/get/create/members/merge) | filter on `WhatsAppContactGroup` (phone-number lists), open to **any authed user** | 🔴 **REAL LEAK — FIXED** (W1412 #537, live on prod) — added `branchId` field + scoping |
| 3 | `routes/gosi-full.routes.js` → `gosi-full.service.js` `getDashboardSummary`/`getPeriodReport` | `organizationId ? {organization} : {}` on `GOSIContribution` etc. | 🟢 **Not exploitable** — data is **org-partitioned (no `branchId`)**, org-scoping vestigial (single-tenant); routes **role-gated** `admin/hr_manager/hr/finance`. An org-level role seeing the one org's GOSI data is intended. |
| 4 | `routes/muqeem-full.routes.js` → `muqeem-full.service.js` `getDashboardStats` | `organizationId ? {organization} : {}` on Muqeem models | 🟢 **Not exploitable** — same as GOSI: org-level data, no `branchId`, role-gated. |
| 5 | `routes/mudad.routes.js` → `mudad.service.js` `getConfig` | `MudadConfig.findOne({organizationId})` | 🟢 **Not exploitable** — single config lookup, single-tenant, role-gated. Returns the one org config. |
| 6 | `routes/noor.routes.js` → `noorService.getConfig` | `req.user.organizationId \|\| req.user.id` | 🟢 **Not fail-open** — falls back to `req.user.id` (a value that **is** set); never undefined. |
| 7 | `routes/digital-assessment.routes.js:186` | `organizationId: req.user?.organizationId \|\| undefined` in a **create** payload | 🟢 **Benign** — write-side; the doc also stores the real `branchId: req.user?.branchId`. Reads scope by `branchId`. |

## Conclusion

**WhatsApp (#1, #2) was the only _exploitable_ instance of this class** — it
exposed branch-scoped beneficiary PII to any authenticated user via fail-open.
Both are **fixed and live on prod** (W1411 + W1412; prod build-info `087c44a6`).

The remaining five are **not exploitable** in this platform's context: they touch
**org-level data that is not branch-partitioned** (GOSI/Muqeem/Mudad have no
`branchId` field), behind **org-level role gates** (`admin/hr/finance`), in a
**single-org** deployment — or they fall back to a set value / are write-side.

### Latent risk (revisit triggers)

These are **acceptable today** but scope by a never-set field, so they are
fragile. Revisit GOSI/Muqeem/Mudad **if either becomes true**:

1. The deployment goes **multi-organization** (real `Organization` docs created
   + `req.user.organization*` populated) — then the `{}` fallback would leak
   across orgs.
2. A requirement emerges to **branch-isolate** gov-integration data — then those
   models need a `branchId` field + `effectiveBranchScope` scoping (the W1411
   pattern), not org-scoping.

No code change is warranted now: requiring `organizationId` would break the
dashboards (it is never set), and adding `branchId` scoping is premature for
org-level data that is not branch-partitioned.

## Method (for re-running this audit)

```bash
# 1. Confirm the premise still holds (no setter appears):
grep -rnE "user\.organization(Id)?\s*=" backend/middleware backend/services/auth*

# 2. Enumerate the class:
grep -rlE "req\.user\??\.organizationId" backend/{routes,services,controllers}

# 3. For each hit, classify the SERVICE use: a Mongo filter that falls through to
#    {} on undefined = candidate leak; external-API payload / set-fallback /
#    write-side = benign. Then check the model for branchId + the route role gate.
```
