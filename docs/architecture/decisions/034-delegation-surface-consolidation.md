# ADR-034 — Delegation / Acting-Role Surface: consolidate the access-grant pair on `UserBranchRole`; keep `Delegation` + `WorkflowDelegation` as distinct bounded contexts (🟡 Proposed)

**Date**: 2026-05-30
**Type**: ADR (boundary clarification + deprecation/migration plan)
**Mode**: 🤝 Claude proposes + can execute the non-destructive part (canonical pick, drift guard, doc boundary); 👤 stakeholder owns any data migration / model deletion
**Decider**: Architecture owner (boundary) + security owner (access-grant primitive) + HR/admin owner (authority governance)
**Effort**: drift guard + doc boundary ~0.5 day (non-destructive) / `DelegationGrant` retirement + data migration N/A until Q1–Q2 answered

## Context

The 2026-05-30 authorization-layer audit (recorded in agent memory
`project_user_branch_role_dormant_2026-05-30`) found four entities whose names
all read as "delegation," and an initial pass called them "4 overlapping
models." That was an over-simplification. Reading the schemas, **they model
three distinct concerns** — only one pair genuinely overlaps:

| #   | Concern                                                                                                                                                                                                                                           | Model(s)                                                                                                                               | Wired?                                                                                                                                                                                                          | Verdict                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | **Access-scope grant** — who-can-work-where + role-at-branch + time window                                                                                                                                                                        | `models/UserBranchRole.js` **and** `authorization/delegations/delegation.model.js` (`DelegationGrant`, collection `delegation_grants`) | `UserBranchRole` ✅ wired into `requireBranchAccess` as of **W597** (`cf0ccaff9`); `DelegationGrant` ❌ CRUD routes only, **no request-time enforcement consumer** (`findActiveFor` is called by no middleware) | **GENUINE OVERLAP → consolidate** |
| 2   | **Administrative authority delegation** — signing / financial authority governance (DLG-YYYY-NNNN number, `delegationType` full/partial/financial/signature, `scope[]` with `maxTransactionAmount`, approval workflow, `usageLogs`, `auditTrail`) | `models/Delegation.js` (consumed by `routes/administration.routes.js`)                                                                 | live, governance document                                                                                                                                                                                       | **DISTINCT — keep separate**      |
| 3   | **Workflow task / out-of-office routing** — who handles approval steps while I'm away                                                                                                                                                             | `WorkflowDelegation` in `models/WorkflowEnhanced.js` (consumed by `routes/workflowDelegations.routes.js`)                              | live, workflow-engine concern                                                                                                                                                                                   | **DISTINCT — keep separate**      |

Concern #2 is a **business/governance record** (a manager delegates signing
authority up to SAR X), not a request-time RBAC primitive. Concern #3 is a
**workflow-engine** routing record. Neither is an access-control grant. Only
the concern-#1 pair (`UserBranchRole` ∪ `DelegationGrant`) belongs to the same
bounded context and should be unified.

### Why `UserBranchRole` is the canonical access-grant primitive

Per the CLAUDE.md canonical-file-location priority + "richer schema wins" tie-break:

- It is the **only one wired into a live access decision** (W597). `DelegationGrant.findActiveFor` has zero enforcement consumers.
- Richer, audited window semantics: half-open `[validFrom, validUntil)`, `grantedBy` + `reason` (min 10) + `revoke()` static with provenance, hot indexes for both "branches for this user" and "who can access this branch."
- Its header doctrine already names it _"the authoritative audited record of who-can-work-where."_

`DelegationGrant` adds exactly one capability `UserBranchRole` lacks today:
`roles[]` (multiple inherited roles) vs `UserBranchRole.role` (single
role-at-branch). For the secondment / acting-role use case, single role-at-branch
is the norm; the multi-role grant is marginal and may have no production users.

## Decision

- **D1 — Canonical.** `UserBranchRole` is THE access-scope / acting-role grant
  primitive. All new request-time branch/role grants go through it.
- **D2 — Deprecate `DelegationGrant`.** Mark `authorization/delegations/delegation.model.js`
  deprecated. Migrate any production rows into `UserBranchRole`; re-point or
  retire `delegations.routes.js`. If the `roles[]` multi-role capability is
  genuinely needed, add an optional `roles: [String]` to `UserBranchRole`
  **before** migrating (additive, non-breaking) — do NOT keep a second model
  just for it. Follow the **W340 ratchet-down** pattern (baseline current state,
  fix one group per wave, prune from baseline in the same commit).
- **D3 — Keep #2 and #3 separate.** `Delegation` (authority governance) and
  `WorkflowDelegation` (workflow routing) stay as distinct bounded contexts.
  Document the three-way boundary in code headers so the next developer doesn't
  confuse them or add a 5th. Optional clarity rename (Q3).
- **D4 — Drift guard.** Add a guard asserting no NEW model registers an
  access-grant-shaped schema (`{toUserId|userId} + branch* + effective*/valid* +
status:active/revoked/expired`) outside `UserBranchRole` — so a 5th "delegation"
  access primitive can't silently appear. Pair static + behavioral per project
  doctrine.

## Open questions (stakeholder sign-off required before D2 executes)

- **Q1** — Does `delegation_grants` hold any production rows? (Decides migrate-vs-drop.
  Read-only: `db.delegation_grants.countDocuments({})`.)
- **Q2** — Is the `roles[]` multi-role inheritance actually used / needed, or is
  single role-at-branch sufficient? (Decides whether `UserBranchRole` gains an
  optional `roles[]`.)
- **Q3** — Rename for clarity to kill the name collision? Proposed:
  `Delegation` → `AuthorityDelegation`, `WorkflowDelegation` → `WorkflowTaskDelegation`,
  `DelegationGrant` retired. (Pattern-D rename per ADR-021; touches
  `administration.routes.js` + `workflowDelegations.routes.js`.)
- **Q4** — Who owns the `delegation_grants` → `user_branch_roles` data migration
  (security vs platform)?

## Consequences

- **Positive**: one wired, audited access-grant primitive instead of two
  (one dormant); the "delegation" name no longer spans three unrelated concerns;
  a drift guard prevents regression; secondment/acting-role is end-to-end real
  after W597.
- **Negative / risk**: D2 is **destructive** (model deletion + data migration) —
  blocked on Q1–Q2, hence 🟡 Proposed not Accepted. The non-destructive parts
  (canonical declaration, drift guard, doc boundary, optional `roles[]` add) can
  land immediately.
- **Neutral**: `Delegation` and `WorkflowDelegation` are unaffected by D1/D2.

## Status

🟡 **Proposed.** Non-destructive D1/D3/D4 are agent-executable now; D2 awaits
Q1–Q4. Cross-refs: ADR-021 (duplicate-model framework + Pattern-D rename),
ADR-030 (dormant-module wire-up-vs-delete), W597 (`cf0ccaff9`, the wiring that
made `UserBranchRole` the live one).
