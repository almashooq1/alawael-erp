# ADR-035 — Enterprise Multi-Branch Authorization: the target layered design (schema → RLS → service → admin console) (🟡 Proposed)

**Date**: 2026-05-30
**Type**: ADR (cross-cutting target architecture / north-star design)
**Mode**: 🤝 Claude designs the full target + can persist the design artifacts; 👤 stakeholders fund/sequence any build (the LIVE stack is Mongo, not Postgres — this is a target, not a refactor)
**Decider**: Architecture owner + security owner + product owner (admin console)
**Effort**: design = done (this series) · build = multi-quarter, gateway-fronted Postgres backend — NOT a drop-in

## Context

The platform (1 HQ + 12 branches) needs authorization treated as a **system
layer**, not a UI feature: RBAC + branch/unit/service/shift scope + explicit
deny + temporary delegation + auditable, approval-gated changes. Plain RBAC
fails here — encoding scope into role names (`branch_manager_riyadh`) explodes
combinatorially across 12 branches × N units × M services, answers "can this
role do X?" but never "on _which_ rows?", and cannot express deny or
segregation-of-duties.

This ADR records the **target** design produced as a five-layer build (full
detail in [`docs/architecture/ENTERPRISE_AUTHORIZATION_DESIGN.md`](../ENTERPRISE_AUTHORIZATION_DESIGN.md),
rule catalog in [`docs/architecture/authz-risk-rules.json`](../authz-risk-rules.json)):

1. **Conceptual model** — RBAC for _capability_, ABAC/PBAC for _scope_; deny +
   SoD + time as first-class constraints.
2. **PostgreSQL schema** — ~20 normalized tables; each scope dimension its own
   junction; no JSON in the authorization structure itself.
3. **RLS** — branch isolation enforced _in the database_, transaction-scoped
   context, fail-closed.
4. **Node/Express service** — pure PDP + centralized permission registry + the
   RLS transaction wrapper; authN strictly separated from authZ.
5. **Admin console** — dimension-tabbed access profile + maker-checker +
   inline dangerous-combination guardrails (a risk-rule engine).

### The live-system reality (why this is 🟡 a target, not 🟢 in-flight)

The running backend is **Express + MongoDB with no RLS**. The 2026-05-30
authorization audit (agent memory `project_user_branch_role_dormant_2026-05-30`)
found — and partly closed — the Mongo-native _approximation_ of this design:
a `tenantScope` plugin (blind to `.aggregate()`), `branchId` denormalization
across ~11 models (W613/W661/W665 series), two permanent audit tools
(`audit:untenanted-aggregations`, `audit:unauthenticated-routes`), and the
wiring of the dormant `UserBranchRole` secondment primitive (ADR-034 / W597).
That work is the interim substitute for the one principle Mongo can't give for
free: an inescapable, DB-enforced tenant boundary. This ADR is therefore a
**north-star**, realizable in full only via a deliberate, gateway-fronted
Postgres backend — consistent with the repo-topology doctrine ("unify the
direction, not the files"; V4 services frozen).

## Decision

Adopt the layered hybrid model. The load-bearing decisions:

- **D1 — Role ≠ scope ≠ branch.** Roles carry only a _tier_ (`scope_level`);
  `user_branch_roles` binds the branch; `user_{unit,service,shift}_access` bind
  finer dimensions; `user_scope_overrides` handles exceptions. None are merged.
- **D2 — HQ is `branch_id IS NULL`, not a 13th branch.** `branches.is_headquarters`
  is the _place_; cross-branch _scope_ is the absence of a branch predicate.
  Modeling HQ as a sentinel branch is forbidden (it leaks into joins).
- **D3 — Deny overrides allow, at three layers** (`role_denied_permissions` →
  `user_denied_permissions` → `user_scope_overrides effect='deny'`). Allow-only
  RBAC cannot express SoD or targeted lockouts.
- **D4 — The database is the inescapable boundary.** RLS with `ENABLE`+`FORCE`,
  a `NOSUPERUSER NOBYPASSRLS` app role, and **transaction-scoped** context
  (`set_config(...,is_local=true)` / `current_setting(...,true)`). An un-stamped
  pooled connection sees **nothing** (fail-closed). App-side filtering is
  defense-in-depth, never the boundary. _(Mongo realization: denormalized
  `branchId` + `branchFilter(req)` on every aggregate + drift guards.)_
- **D5 — Scope context is DB-derived, not app-claimed.** Hardened
  `set_app_context(user_id)` looks up `is_hq`/`branch_scope` from
  `user_branch_roles` itself — the app cannot forge scope even under injection.
- **D6 — Sensitive changes are proposals, not writes.** Cross-branch/HQ grants,
  sensitive permissions, and SoD-touching edits create a
  `permission_change_request` (maker-checker, `reviewer ≠ requester`), not an
  immediate mutation. Returns `202 + change_request_id`, never a fake `200`.
- **D7 — Dangerous combinations are gated inline** by a data-driven risk-rule
  engine (`sod_constraint` rows + engine invariants), severity-coded to
  block / justify / approve, **re-evaluated at approve-time** to close the
  TOCTOU window. Pure evaluator runs identically on the client preview and the
  server gate.
- **D8 — Permission names are centralized and drift-guarded** against the DB;
  no literals in routes; authN strictly separated from authZ.
- **D9 — Audit is append-only + tamper-evident** (hash-chained `audit_log`,
  computed by a DB trigger; the row exempt from branch-RLS), capturing every
  deny, sensitive permit, and grant change with the triggering rule `code`.

## Open questions (gate any _build_; the design + docs land now regardless)

- **Q1** — Is the funded Postgres cutover on the roadmap, or does the live
  system stay Mongo indefinitely? (Decides target-vs-interim-only.)
- **Q2** — If Mongo stays: do we formalize the risk-rule engine as data over the
  existing `authorization/sod/domain-rules.js` (severity-graded), or leave SoD
  as code? (D7 realization choice.)
- **Q3** — Does the admin console get built on web-admin (Next.js 15) against
  the live Mongo API now, or wait for the Postgres service? (UX layer can ship
  on either backend; the API contracts are store-agnostic.)
- **Q4** — Who owns the permission-registry ↔ DB drift guard if/when the
  Postgres `permission` table becomes the source of truth?

## Consequences

- **Positive**: few reusable roles; scope combinatorics live in _rows_ not role
  names; the tenant boundary is enforced by the engine, not by remembering a
  `WHERE`; SoD/escalation are expressible **and** reviewed; time-bounded grants
  self-expire; tamper-evident audit answers "why was this allowed?"; an admin
  console where the dangerous path is deliberately slow, justified, and recorded.
- **Negative / risk**: RLS adds context-management discipline (pooled-connection
  pitfalls; migration sequencing — enforce RLS _last_); `set_app_context` is
  `SECURITY DEFINER` (pin `search_path`, grant narrowly); maker-checker adds
  latency to sensitive changes (intended). **Largest risk: the design is not the
  running system** — full realization needs the funded cutover; until then the
  Mongo approximation is the weaker interim.
- **Neutral**: Mongo and Postgres coexist; this ADR sets _direction_, not an
  immediate migration. `Delegation` (authority governance) and
  `WorkflowDelegation` (workflow routing) are out of scope — see ADR-034.

## Status

🟡 **Proposed.** The design is complete and internally consistent across all
five layers; persisting the artifacts is non-destructive and lands now. Building
it is gated on Q1 (the funded backend cutover) — **revisit only when that is on
the table.** Until then: continue hardening the live Mongo path (branch
denormalization, the two audit tools, the unauthenticated-route closures) as the
interim realization of D3/D4/D6/D7/D9.

Cross-refs: ADR-004 (multi-tenant isolation strategy), ADR-005 (canonical role
hierarchy), ADR-009 (audit-trail standard — D9 lineage), ADR-017 (measure-alert
dismiss SoD policy — D7 precedent), ADR-019 (MFA tier enforcement — D5/step-up
lineage), ADR-021 (model-consolidation discipline), ADR-034 (`UserBranchRole` as
the canonical live access-grant primitive — the Mongo realization of D1), and
this session's `audit:untenanted-aggregations` + `audit:unauthenticated-routes`
as the Mongo-native enforcement of D4.
