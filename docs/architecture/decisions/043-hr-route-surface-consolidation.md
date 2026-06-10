# ADR-043 — Consolidate + branch-isolate the HR route surface (🟢 Partially executed — W1143)

> **Status**: isolation contract + owner-map + the 2 backlog-IDOR gates (W1143) +
> the dormant `backend/hr/` retire (Q1, W1151) are all DONE. Only Q3 remains — the
> `/api/hr` non-v1 mount fate, which needs mobile/legacy client knowledge. No live
> behavior depends on it.

**Date**: 2026-06-10
**Type**: ADR (route-topology / canonical-mount + cross-branch-isolation contract — same shadow class as ADR-038 / ADR-042)
**Mode**: 🤝 Claude can retire the dormant file + gate the two backlog routes once the canonical-mount choice is signed off; 👤 stakeholder owns the `/api/hr` vs `/api/v1/hr` canonicalization + confirming no client depends on a retired path
**Decider**: Backend owner (route canonicalization) + HR module owner
**Effort**: delete dormant file + gate 2 routes + alias decision ≈ 0.5–1 day once Q1–Q3 answered
**Related**: ADR-038 + ADR-042 (duplicate-route / first-match-wins class), `docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md` (the W269 arc that surfaced this), the W1133/W1137/W1141 HR branch-isolation waves + the `hr-route-branch-isolation-guard-wave1142` backstop

## Context

The HR API is served by **multiple overlapping route surfaces**, two of which
collide on the same base path, plus ~20 domain-specific HR routers. The W269
cross-branch-isolation sweep this session (W1133/W1137/W1141) hardened the live
leaking surfaces but also exposed the **topology fragmentation** that makes "is HR
branch-isolated?" hard to answer at a glance.

| Surface                                               | File                                                                                                  | Mount                                                                            | Live?          | Branch-isolated?                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| **Domain HR** (employees, leaves, attendance, health) | `domains/hr/routes/hr.routes.js`                                                                      | `dualMountAuth(app,'hr',…)` at `_registry.js:625` → **`/api/hr` + `/api/v1/hr`** | ✅             | ✅ **W1141** (this session)                    |
| **HR Round-10 modules** (loans, travel, visas, …)     | `routes/hr/hr-modules.routes.js`                                                                      | `app.js:959` `app.use('/api/v1/hr', authenticate, …)`                            | ✅             | ✅ **W1133** (this session)                    |
| **HR attendance** (manager check-in/records)          | `routes/hr-attendance.routes.js`                                                                      | registry → `/api/(v1/)?hr-attendance`                                            | ✅             | ✅ **W1137** (this session)                    |
| **Legacy Saudi HR** (employees/leave/payroll/EOS)     | `hr/saudi-hr-routes.js`                                                                               | required only by `hr/index.js:14` — **`hr/index.js` is not mounted**             | ⚪ **DORMANT** | n/a                                            |
| **Core transactional** (leave-requests/payroll/perf)  | `routes/leave-requests.routes.js` + `routes/payroll.routes.js` + `routes/hr/hr-performance.routes.js` | own registry mounts                                                              | ✅             | ✅ pre-existing (W836/W839 · W904 · W834/W837) |
| **~20 other HR routers**                              | `routes/hr/*.routes.js` + `routes/*hr*.routes.js`                                                     | `hr.registry.js` / `features.registry.js`                                        | mixed          | mixed — see backlog                            |

### Two problems

1. **`/api/v1/hr` is served by two files.** `domains/hr` (mounted first via
   `_registry.js:625`) owns `/employees`, `/leaves`, `/attendance`; `hr-modules`
   (`app.js:959`) owns `/loans`, `/travel`, `/visas`, … They coexist only because
   their subpaths don't overlap (Express first-match-wins). This is fragile: a new
   path added to one that collides with the other silently shadows.
2. **No single isolation contract.** HR routes use ≥3 valid scoping patterns — the
   W269 helpers (`requireBranchAccess`+`enforceEmployeeBranch`+`assertBranchMatch`),
   the payroll employee-FK filter, and `employee-admin`'s custom `req.user.branchId`
   filtering. `hr-route-branch-isolation-guard-wave1142` enforces "every employee-
   keyed HR route carries a branch signal" and fails CI on any **new** un-gated HR
   route. _(The two files originally baselined — `hr/hr-copilot.routes.js` +
   `hr-compliance.routes.js` — were audited and confirmed reachable by branch-
   restricted roles, so they were **gated in W1143**; the guard baseline is now empty.)_

## Decision drivers

- A reader (and a security auditor) should answer "where do `/api/v1/hr/X` requests
  go?" and "is X branch-isolated?" from **one** place.
- The dormant `saudi-hr-routes.js` (22 endpoints) is dead weight that confuses the
  topology and the dead-route audits.
- The W269 isolation must be a **contract**, not a per-file accident — enforced by a
  guard, not re-derived each review.

## Decision (proposed — pending sign-off)

1. ✅ **DONE (2026-06-10)** — **Retired the dormant `backend/hr/` module**
   (`index.js` + `saudi-hr-routes.js` + `saudi-hr-service.js` + 2 unit tests),
   superseded by `domains/hr` + `hr-modules`. Verified no mount / no importer / no
   model consumer before deleting; all guards green post-delete (see Q1).
2. ✅ **DONE (W1143)** — **Keep the `/api/v1/hr` split documented, not merged**:
   `domains/hr` = core personnel (employees/leaves/attendance); `hr-modules` =
   Round-10 modules. An "owner map" comment was added at **both** mount sites
   (`app.js` hr-modules + `_registry.js` domains/hr) so a new path's home is
   unambiguous. (Physically merging the two routers is **not** recommended — they
   have different factory shapes; the risk is in the _implicit_ split, now fixed.)
3. **Branch-isolation is now a contract**: every HR route file taking an
   employee/record id MUST carry a branch signal (enforced by
   `hr-route-branch-isolation-guard-wave1142`; W269h-style). New HR routers inherit
   the requirement automatically.
4. ✅ **DONE (W1143)** — **Audited + gated the 2 backlog routes**: both
   `hr-copilot` (summarize/draft-letter/suggest) and `hr-compliance` (5 per-employee
   verify routes + `/overview` + `/verify-batch` aggregates) had role allow-lists
   including branch-restricted manager/hr/hr_manager → genuine cross-branch reads.
   Gated with `requireBranchAccess` + `enforceEmployeeBranch`/`assertBranchMatch` +
   `branchFilter` on the aggregates; ratcheted out of the guard baseline (now empty).

## Open questions (blockers)

- **Q1** — ✅ **DONE (executed 2026-06-10)**. Retired the whole dormant `backend/hr/`
  module: `index.js` + `saudi-hr-routes.js` (22 endpoints) + `saudi-hr-service.js`
  (28 KB) + the 2 auto-gen unit tests (`tests/unit/saudi-hr-{routes,service}.module.test.js`).
  Verified safe before deleting: **no HTTP mount, no external importer** (the only
  `require('./hr')` is `domains/index.js` → `domains/hr`, a different path), the only
  uniquely-registered model `SaudiHrPayroll` has **no consumer** and is **not in any
  active W340 baseline Set** (comments only), and the unit tests are not in
  `sprint-tests.txt`. Post-delete green: `no-broken-requires` + `W340` +
  `check:routes-load` (548, unchanged → confirms it was never a loaded route) +
  `check:gitignored-sources`. Fully git-reversible.
- **Q2** — ✅ RESOLVED: `hr-copilot` (`ADMIN_ROLES` includes `manager`) and
  `hr-compliance` (`READ/WRITE_ROLES` include `manager`/`hr`/`hr_manager`) ARE
  reachable by branch-restricted roles → were live cross-branch reads → **gated in
  W1143** (behavioral guard `hr-copilot-compliance-branch-isolation-behavioral-wave1143`).
- **Q3** — Is the `/api/hr` (non-v1) mount of `domains/hr` still consumed by any
  client (mobile / legacy), or can the surface collapse to `/api/v1/hr` only?

## Consequences

- ✅ One documented HR topology (owner-map comments at both mount sites); branch
  isolation is guard-enforced for all future HR routes; the 2 backlog IDORs are
  closed (W1143) and the guard baseline is empty.
- ✅ Dormant `backend/hr/` module retired (Q1, W1151). Only remaining: decide the
  `/api/hr` non-v1 mount fate (Q3 — needs mobile/legacy client knowledge). No live
  behavior depends on it — cleanup, not security.
