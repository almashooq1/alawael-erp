# ADR-043 — Consolidate + branch-isolate the HR route surface (🟡 Proposed)

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
   filtering. Two employee-keyed files (`hr/hr-copilot.routes.js`,
   `hr-compliance.routes.js`) currently carry **no** branch signal (role-gated, but
   un-audited). `hr-route-branch-isolation-guard-wave1142` now baselines these and
   fails CI on any **new** un-gated HR route.

## Decision drivers

- A reader (and a security auditor) should answer "where do `/api/v1/hr/X` requests
  go?" and "is X branch-isolated?" from **one** place.
- The dormant `saudi-hr-routes.js` (22 endpoints) is dead weight that confuses the
  topology and the dead-route audits.
- The W269 isolation must be a **contract**, not a per-file accident — enforced by a
  guard, not re-derived each review.

## Decision (proposed — pending sign-off)

1. **Retire `hr/saudi-hr-routes.js` + `hr/index.js`** (dormant; superseded by
   `domains/hr` + `hr-modules`). Confirm no importer outside `hr/index.js` (Q1),
   then delete + add a dead-route sentinel. _Claude-executable once Q1 confirmed._
2. **Keep the `/api/v1/hr` split documented, not merged**: `domains/hr` = core
   personnel (employees/leaves/attendance); `hr-modules` = Round-10 modules. Add a
   one-line "owner map" comment at both mount sites so a new path's home is
   unambiguous. (Physically merging the two routers is **not** recommended — they
   have different factory shapes; the risk is in the _implicit_ split, which the
   comment fixes.)
3. **Branch-isolation is now a contract**: every HR route file taking an
   employee/record id MUST carry a branch signal (enforced by
   `hr-route-branch-isolation-guard-wave1142`; W269h-style). New HR routers inherit
   the requirement automatically.
4. **Audit + gate the 2 backlog routes** (`hr-copilot` summarize-by-employeeId,
   `hr-compliance` verify-by-employeeId): add `requireBranchAccess` +
   `enforceEmployeeBranch` (the W1137 helper) **iff** any branch-restricted role can
   reach them (Q2). Ratchet them out of the guard baseline in the same commit.

## Open questions (blockers)

- **Q1** — Does anything import `hr/index.js` / `hr/saudi-hr-routes.js` outside the
  HR module itself? (grep is clean so far; needs owner confirmation before delete.)
- **Q2** — Are `ADMIN_ROLES` on `hr-copilot` / the compliance roles on
  `hr-compliance` ever **branch-restricted** (e.g. a branch `hr_manager`)? If yes →
  they are live IDOR and must be gated; if strictly HQ/cross-branch → baseline note
  is sufficient.
- **Q3** — Is the `/api/hr` (non-v1) mount of `domains/hr` still consumed by any
  client (mobile / legacy), or can the surface collapse to `/api/v1/hr` only?

## Consequences

- ✅ One documented HR topology; dead-route audits stop tripping on `saudi-hr-routes`.
- ✅ Branch isolation is guard-enforced for all future HR routes.
- ⚠️ Until Q2 is answered, `hr-copilot` + `hr-compliance` remain baselined (tracked,
  bounded by role-gating) rather than fixed.
- ⚪ No behavior change ships from this ADR alone — it records the topology + the
  contract; the deletes/gates are follow-up once Q1–Q3 are signed off.
