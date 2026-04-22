# Runbook — Phase 7 IAM stack (architecture reference)

**Purpose:** one-page reference for operators, auditors, and new
engineers landing on the Al-Awael IAM code. Explains how the
2026-04-22 hardening pieces fit together and where each
responsibility lives.

**Not an alert runbook** — the individual digests have their own
entries (`approval-escalate`, `audit-chain-verify`,
`break-glass-digest`). This one explains the _system_.

---

## 1. Layered enforcement

```
Request → [1] authenticateToken       → JWT verify, user load
        → [2] rate limit               → per-user, per-IP
        → [3] CSRF                     → mutation requests
        → [4] requireRole / requirePermission
        → [5] requireBranchAccess      → populates req.branchScope
                                         (cross-branch / regional /
                                          restricted / unscoped)
        → [6] bindRequestContext       → binds branchScope into
                                         AsyncLocalStorage
        → [7] domain-sod ABAC policy   → blocks HR↔Finance,
                                         Clinical↔Finance, Quality
                                         independence, auditor
                                         read-only, ops↔PHI
        → [8] other ABAC policies      → caseload, confidentiality,
                                         session-amendment-window,
                                         cross-branch-access, etc.
        → [9] handler                  → business logic
        → [10] Mongoose tenantScope    → auto-stamps branchId on
              plugin (opt-in)            writes; auto-filters reads;
                                         fail-closed on unscoped
        → [11] Audit log write         → pre-save hook computes
                                         chainHash = SHA-256(prev ||
                                         canonical(entry))
```

Any layer alone would be sufficient to deny. All must permit for
the action to complete. This is the "defense-in-depth" property:
if an engineer forgets branchScope on a new route, the mongoose
plugin still blocks cross-tenant reads.

---

## 2. Where each concept lives

| Concern                          | Files                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Role catalog (46 roles)          | [`config/rbac.config.js`](../../backend/config/rbac.config.js)                                         |
| Role drift invariants            | [`__tests__/rbac-roles-consistency.test.js`](../../backend/__tests__/rbac-roles-consistency.test.js)   |
| Region model                     | [`models/Region.js`](../../backend/models/Region.js)                                                   |
| User ↔ Branch (primary + multi) | [`models/User.js`](../../backend/models/User.js)                                                       |
| User secondments (windowed)      | [`models/UserBranchRole.js`](../../backend/models/UserBranchRole.js)                                   |
| Record-level grants (delegation) | [`models/RecordGrant.js`](../../backend/models/RecordGrant.js)                                         |
| Cross-branch / region middleware | [`middleware/branchScope.middleware.js`](../../backend/middleware/branchScope.middleware.js)           |
| AsyncLocalStorage request ctx    | [`authorization/requestContext.js`](../../backend/authorization/requestContext.js)                     |
| Mongoose auto-filter plugin      | [`authorization/tenantScope.plugin.js`](../../backend/authorization/tenantScope.plugin.js)             |
| Domain SoD rules                 | [`authorization/sod/domain-rules.js`](../../backend/authorization/sod/domain-rules.js)                 |
| Domain SoD ABAC adapter          | [`authorization/abac/policies/domain-sod.js`](../../backend/authorization/abac/policies/domain-sod.js) |
| Approval chain catalog           | [`authorization/approvals/chains.js`](../../backend/authorization/approvals/chains.js)                 |
| Break-glass engine               | [`authorization/break-glass/engine.js`](../../backend/authorization/break-glass/engine.js)             |
| Audit hash-chain crypto          | [`services/auditHashChainService.js`](../../backend/services/auditHashChainService.js)                 |
| Audit log schema + pre-save hook | [`models/auditLog.model.js`](../../backend/models/auditLog.model.js)                                   |

---

## 3. Scheduled digests (operational monitors)

All exit 0 on clean, 1 on alarm, 2 on internal error. Wire into cron

- a Slack/PagerDuty hook on non-zero.

| Digest                     | Window           | Alarm condition                                     | Source                                                                                   |
| -------------------------- | ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `approval-escalate:digest` | all open         | ≥1 SLA breach or near-breach                        | [scripts/approval-escalate-digest.js](../../backend/scripts/approval-escalate-digest.js) |
| `audit-chain:verify`       | last 10k entries | ≥1 hash break                                       | [scripts/audit-chain-verify.js](../../backend/scripts/audit-chain-verify.js)             |
| `break-glass:digest`       | last 30 days     | co-sign overdue / unreviewed / ≥3 sessions per user | [scripts/break-glass-digest.js](../../backend/scripts/break-glass-digest.js)             |

---

## 4. What to do when

| Situation                                      | First move                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New role needed                                | Add to `rbac.config.js` ROLES + ROLE_HIERARCHY + ROLE_PERMISSIONS + User.role enum. Drift test locks it.                                                     |
| A user moves branches permanently              | Change `User.branchId`. `branchIds[]` can stay as a transition list.                                                                                         |
| A user is seconded 2 weeks                     | Create a `UserBranchRole` with `validFrom` / `validUntil`. Revoke at end with reason.                                                                        |
| External auditor needs one-off CarePlan access | Create a `RecordGrant` (resourceType, resourceId, actions, expiresAt, reason). PDP allows read when active.                                                  |
| New tenant-scoped collection                   | `Schema.plugin(tenantScopePlugin)` + ensure routes call `requireBranchAccess + bindRequestContext`. Plugin fails-closed on unscoped.                         |
| New approval workflow                          | Add to `chains.js` + `selectChain()`. Drift test verifies every step role exists in rbac config.                                                             |
| SoD violation blocks a legitimate action       | Confirm it's a rule-design issue, not a role-typo. Edit `authorization/sod/domain-rules.js` + rerun `sod-domain-rules.test.js`.                              |
| Audit chain break alert                        | **Do not clear.** Investigate: compare break entryId's body to canonical form, check recent migrations, check if a new field slipped out of EXCLUDED_FIELDS. |
| Break-glass abuse alert (≥3/user/30d)          | HR conversation + consider suspending platform access. Do NOT just raise the monthlyLimit.                                                                   |

---

## 5. Compliance mapping

| Regulation                                    | Satisfied by                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **CBAHI 4.3** (finance segregation)           | domain-sod `sod-hr-cannot-touch-finance` + `sod-finance-cannot-edit-employee-pii`                                                           |
| **CBAHI 8.7** (clinical billing independence) | domain-sod `sod-clinical-cannot-bill`                                                                                                       |
| **Saudi Labor Law §6** (payroll dual-control) | Approval chain `A-14-payroll` — hr_officer → group_chro → group_cfo, three distinct actors; engine rejects the same user signing twice      |
| **SAMA pre-pay**                              | Approval chain `A-12-expense-*` — band thresholds 5k/50k/200k with escalating approvers                                                     |
| **PDPL data minimization**                    | domain-sod `sod-finance-cannot-read-clinical`; guardian-own-child ABAC policy; record-level grants required for cross-branch clinical reads |
| **PDPL audit-trail immutability**             | Audit hash chain + scheduled verify digest                                                                                                  |
| **MOH clinical review independence**          | domain-sod `sod-quality-cannot-approve-care` (quality_coordinator / regional_quality blocked from approving plans they audit)               |

---

## 6. Known limitations

- **Jest + Mongoose 9 sandbox** drops schema defaults on top-level
  model imports. Affected models (RecordGrant, UserBranchRole) have
  both Jest tests for the pure logic AND standalone smoke scripts
  (`scripts/_*-smoke.js`) that verify the schema path.
- **Audit hash backfill** — entries predating commit `ca61b882`
  have empty `chainHash` and will fail the verifier until a
  one-time backfill job runs. Accept the expected-break window.
- **tenantScope plugin opt-in** — currently not yet applied to
  production models. Landing as opt-in means safe to roll out
  model-by-model with smoke-verification at each step.

---

## 7. The 9 Phase-7 commits

| #   | Commit SHA    | Subject                                  |
| --- | ------------- | ---------------------------------------- |
| 1   | `a2936c4c`    | Region + 27 new roles + drift invariants |
| 2   | `026f42d0`    | tenantScope plugin + requestContext      |
| 3   | `dbab4b91`    | RecordGrant + domain-sod ABAC policy     |
| 4   | `64772039`    | Regional branchScope wiring              |
| 5   | `dba7a21b`    | Break-glass review digest                |
| 6   | `e192813b`    | Domain SoD rules                         |
| 7   | `ca61b882`    | Tamper-evident audit hash chain          |
| 8   | `4d115934`    | Approval chains + escalate digest        |
| 9   | `5373d58a`    | UserBranchRole secondment persistence    |
| 10  | _this commit_ | Runbook + matrix CSV export              |
