# Permissions Matrix — Rehabilitation Centers Platform (enterprise authorization specification)

> Companion to [ADR-035](decisions/035-enterprise-authorization-design.md),
> the [authorization design](ENTERPRISE_AUTHORIZATION_DESIGN.md), and the
> [risk-rule catalog](authz-risk-rules.json). The enforceable source of truth is
> [`role-permissions.seed.json`](role-permissions.seed.json) — this document is
> its human-readable rationale. **The seed wins on any disagreement.**
>
> This is not a flat grid: it is a **capability × scope × condition × assurance**
> model. A grant is `ALLOW iff role holds the permission AND the scope predicate
matches the row AND the lifecycle state permits AND no deny/SoD fires AND the
required assurance tier is satisfied`.

---

## 1. Roles (canonical, bilingual)

| Code  | Role               | الدور                | scope_level                  |
| ----- | ------------------ | -------------------- | ---------------------------- |
| `HQA` | HQ_ADMIN           | مسؤول النظام (المقر) | global (technical)           |
| `EXD` | EXECUTIVE_DIRECTOR | المدير التنفيذي      | global (business)            |
| `BRM` | BRANCH_MANAGER     | مدير الفرع           | branch                       |
| `UNS` | UNIT_SUPERVISOR    | مشرف الوحدة          | branch (unit-bound)          |
| `THR` | THERAPIST          | الأخصائي / المعالج   | service (caseload)           |
| `REC` | RECEPTIONIST       | موظف الاستقبال       | branch (front-desk)          |
| `HRO` | HR_OFFICER         | موظف الموارد البشرية | branch (HQ HR = global)      |
| `FIN` | FINANCE_OFFICER    | موظف المالية         | branch (HQ finance = global) |
| `AUD` | AUDITOR            | المدقّق              | global (read/export only)    |

## 2. Permission taxonomy

`module:resource:action` — lowercase, colon-delimited, **centralized** (no
string literals in routes; `permissions.registry.js` is generated from §2 +
the seed and drift-guarded against the DB).

- **action** ∈ `read · create · update · delete · approve · export · manage`
- **resource** is a sub-noun enabling **field-level** control — the reason
  `beneficiary:demographics:read` and `beneficiary:clinical:read` are different
  permissions (a receptionist gets the first, never the second).

## 3. Assurance tiers (sensitivity → step-up MFA — ties to ADR-019)

| Tier   | Meaning   | Re-auth freshness | Applies to                                                                                  |
| ------ | --------- | ----------------- | ------------------------------------------------------------------------------------------- |
| **T1** | normal    | session login     | reads, scheduling, own-record actions                                                       |
| **T2** | sensitive | step-up ≤ 15 min  | PHI write, finance/HR approve, exports of sensitive data, branch role-grant, deny overrides |
| **T3** | critical  | step-up ≤ 5 min   | user create/delete, `rbac:policy:manage`, cross-branch/HQ grant, branch delete, break-glass |

## 4. Condition (ABAC) predicates

Scope: `G` global · `B` actor.branch · `U` actor.unit · `S` actor.caseload ·
`●` self-record. Logic:

- `≤lim` — amount ≤ the actor's configured approval limit (else escalate)
- `≠req` — **maker ≠ checker** (the approver is not the requester)
- `[states]` — action allowed only while the record is in those lifecycle states
- `BG` — emergency **break-glass** path (auto-expiring, logged, post-hoc review)
- `⛔` — **explicit deny** (overrides any inherited allow)

---

## 5. The matrix (permission-centric, grouped by domain)

Format: **permission** → `ROLE·predicate` grants · **tier** · lifecycle/SoD note.

### 5.1 Organization & dashboard

| Permission               | Granted to              | Tier   | Notes                                              |
| ------------------------ | ----------------------- | ------ | -------------------------------------------------- |
| `dashboard:view:read`    | all roles · own scope   | T1     | view only; no CUD                                  |
| `branch:org:read`        | HQA·G EXD·G AUD·G BRM·B | T1     |                                                    |
| `branch:org:create`      | HQA·G                   | **T3** | **HQ-only**                                        |
| `branch:org:update`      | HQA·G                   | T2     | structural                                         |
| `branch:org:delete`      | HQA·G                   | **T3** | **HQ-only**; soft-delete + approval                |
| `branch:settings:update` | HQA·G BRM·B             | T2     | manager limited to own-branch operational settings |

### 5.2 Beneficiary (field-level: demographics / clinical / billing)

| Permission                              | Granted to                                      | Tier   | Notes                                    |
| --------------------------------------- | ----------------------------------------------- | ------ | ---------------------------------------- |
| `beneficiary:demographics:read`         | HQA·G EXD·G AUD·G BRM·B UNS·U THR·S REC·B FIN·B | T1     |                                          |
| `beneficiary:demographics:create`       | REC·B BRM·B THR·S                               | T1     | intake                                   |
| `beneficiary:demographics:update`       | REC·B BRM·B THR·S                               | T1     |                                          |
| `beneficiary:clinical:read`             | THR·S UNS·U BRM·B EXD·G·BG AUD·G                | **T2** | PHI · ⛔ HQA REC HRO FIN                 |
| `beneficiary:billing:read`              | FIN·B BRM·B HQA·G AUD·G                         | T1     |                                          |
| `beneficiary:billing:create` / `update` | FIN·B                                           | T2     | invoices/charges; ⛔ clinical roles      |
| `beneficiary:billing:approve`           | BRM·B·≤lim EXD·G                                | T2     | `≠req`; threshold-escalated              |
| `beneficiary:record:deactivate`         | BRM·B·≠req HQA·G                                | T2     | **no hard delete** — deactivate + reason |

### 5.3 Clinical — assessments / treatment plans / session notes (PHI)

| Permission                      | Granted to                              | Tier | Lifecycle / SoD                                          |
| ------------------------------- | --------------------------------------- | ---- | -------------------------------------------------------- |
| `assessment:record:read`        | THR·S UNS·U BRM·B EXD·G AUD·G           | T2   | ⛔ REC HRO FIN HQA                                       |
| `assessment:record:create`      | THR·S UNS·U                             | T2   | → `draft`                                                |
| `assessment:record:update`      | THR·S UNS·U                             | T2   | `[draft, in_review]`                                     |
| `assessment:record:approve`     | UNS·U                                   | T2   | `[in_review → finalized]`; `≠author` preferred           |
| `treatment_plan:plan:read`      | THR·S UNS·U BRM·B EXD·G AUD·G           | T2   | ⛔ REC HRO FIN HQA                                       |
| `treatment_plan:plan:create`    | THR·S                                   | T2   | → `draft`                                                |
| `treatment_plan:plan:update`    | THR·S·`[draft]` UNS·U·`[draft,pending]` | T2   |                                                          |
| `treatment_plan:plan:approve`   | UNS·U                                   | T2   | `[pending → active]`; **`≠author` (block)**              |
| `treatment_plan:plan:supersede` | THR·S                                   | T2   | `[active]` → new version; **no edit-in-place of active** |
| `session:note:read`             | THR·S UNS·U BRM·B EXD·G AUD·G           | T2   | ⛔ REC(content) HRO FIN HQA                              |
| `session:note:create`           | THR·S                                   | T2   | → `draft`                                                |
| `session:note:update`           | THR·S·`[draft]` UNS·U                   | T2   |                                                          |
| `session:note:approve`          | UNS·U                                   | T2   | `[draft → signed]`; `≠author`                            |

> **Immutability rule**: no `delete` permission exists on any clinical resource.
> Finalized/signed records are corrected by a new version/addendum only.

### 5.4 Scheduling & attendance (non-PHI)

| Permission                              | Granted to                          | Tier | Notes                             |
| --------------------------------------- | ----------------------------------- | ---- | --------------------------------- |
| `session:schedule:read`                 | THR·S UNS·U REC·B BRM·B AUD·G       | T1   | schedule status, not note content |
| `session:schedule:create` / `update`    | REC·B THR·S UNS·U                   | T1   |                                   |
| `appointment:booking:read`              | REC·B THR·S UNS·U BRM·B FIN·B AUD·G | T1   |                                   |
| `appointment:booking:create` / `update` | REC·B THR·S                         | T1   |                                   |
| `appointment:booking:delete`            | REC·B BRM·B                         | T1   | soft-cancel + reason              |
| `attendance:record:read`                | REC·B THR·S UNS·U HRO·B BRM·B AUD·G | T1   | HRO reads for payroll linkage     |
| `attendance:record:create`              | REC·B THR·S(own session)            | T1   | check-in                          |
| `attendance:record:update`              | REC·B UNS·U                         | T1   | correction logged                 |

### 5.5 Workforce — employees / HR

| Permission                | Granted to                                        | Tier   | Lifecycle / SoD                        |
| ------------------------- | ------------------------------------------------- | ------ | -------------------------------------- |
| `employee:profile:read`   | HRO·B BRM·B UNS·U HQA·G EXD·G AUD·G · THR·● REC·● | T1     | non-managers see self only             |
| `employee:profile:create` | HRO·B                                             | T2     |                                        |
| `employee:profile:update` | HRO·B                                             | T2     | salary/IBAN fields → T2 + `≠self`      |
| `employee:profile:delete` | HRO·B·≠req HQA·G                                  | **T3** | offboarding + approval                 |
| `hr:leave:read`           | HRO·B BRM·B UNS·U ●self AUD·G                     | T1     |                                        |
| `hr:leave:create`         | ●self (any employee)                              | T1     |                                        |
| `hr:leave:approve`        | UNS·U·≤3d BRM·B·≤14d EXD·G·>14d                   | T2     | **`≠req` (block)**; duration-escalated |
| `hr:payroll:read`         | HRO·B FIN·B EXD·G HQA·G AUD·G                     | T2     |                                        |
| `hr:payroll:process`      | HRO·B                                             | T2     | SoD vs approve                         |
| `hr:payroll:approve`      | BRM·B EXD·G                                       | T2     | **`≠processor`**                       |
| `hr:performance:read`     | HRO·B BRM·B UNS·U ●self AUD·G                     | T1     |                                        |
| `hr:performance:create`   | UNS·U BRM·B                                       | T2     |                                        |
| `hr:performance:approve`  | BRM·B EXD·G                                       | T2     | `≠author`                              |

### 5.6 Reporting (segmented by data domain)

| Permission                           | Granted to                          | Tier | Notes                                                   |
| ------------------------------------ | ----------------------------------- | ---- | ------------------------------------------------------- |
| `report:operational:read` / `export` | BRM·B UNS·U REC·B EXD·G HQA·G AUD·G | T1   |                                                         |
| `report:clinical:read` / `export`    | THR·S UNS·U BRM·B EXD·G AUD·G       | T2   | ⛔ REC HRO FIN HQA; exports de-identified unless `≥BRM` |
| `report:financial:read` / `export`   | FIN·B BRM·B EXD·G HQA·G AUD·G       | T2   |                                                         |
| `report:hr:read` / `export`          | HRO·B BRM·B EXD·G HQA·G AUD·G       | T2   |                                                         |
| `report:audit:read` / `export`       | AUD·G HQA·G EXD·G                   | T2   |                                                         |

### 5.7 Governance — approvals / users / RBAC / audit

| Permission                        | Granted to                                                 | Tier                 | Lifecycle / SoD                                                             |
| --------------------------------- | ---------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `approval:request:read`           | all · own scope                                            | T1                   |                                                                             |
| `approval:request:create`         | THR REC HRO FIN UNS BRM (submit)                           | T1                   |                                                                             |
| `approval:decision:approve`       | UNS·U(clinical) BRM·B·≤lim EXD·G(cross/over-lim)           | T2                   | **`≠req` (block)**                                                          |
| `user:account:read`               | HQA·G EXD·G AUD·G BRM·B(own-branch view)                   | T1                   |                                                                             |
| `user:account:create`             | HQA·G                                                      | **T3**               | **HQ-only**                                                                 |
| `user:account:update`             | HQA·G                                                      | T2                   | HR _profile_ fields are `employee:profile`, not this                        |
| `user:account:disable` / `delete` | HQA·G                                                      | **T3**               | **HQ-only**                                                                 |
| `user:role_grant:assign`          | HQA·G(any) BRM·B(own-branch, existing roles, via approval) | T3 cross / T2 branch | **self-grant block**; cross-branch/HQ = T3 + approval                       |
| `user:role_grant:revoke`          | HQA·G BRM·B                                                | T2                   |                                                                             |
| `rbac:policy:manage`              | HQA·G                                                      | **T3**               | **HQ-only**; roles/perms/SoD/thresholds; maker-checker on the policy itself |
| `audit:log:read`                  | AUD·G HQA·G EXD·G BRM·B(own-branch slice)                  | T2                   |                                                                             |
| `audit:log:export`                | AUD·G HQA·G                                                | T2                   |                                                                             |
| `audit:log:update` / `delete`     | **NONE**                                                   | —                    | **⛔ hard deny for all, incl. HQA — append-only**                           |

---

## 6. Lifecycle-state gating (worked examples)

Permissions are not static — they depend on the record's state:

```
assessment.record:    draft ──update(THR/UNS)──► in_review ──approve(UNS)──► finalized [read-only]
treatment_plan.plan:  draft ──update(THR)──► pending ──approve(UNS,≠author)──► active ──supersede──► (new draft)
session.note:         draft ──update(THR)──► signed(UNS) [locked]
beneficiary.billing:  draft ──submit(FIN)──► pending ──approve(BRM≤lim|EXD)──► approved ──► paid | void(approval)
hr.leave:             requested(self) ──approve(UNS≤3d|BRM≤14d|EXD>14d, ≠req)──► approved | rejected
```

Editing a record outside its allowed states is denied **even if the role holds
the update permission** — state is part of the predicate.

## 7. Segregation-of-duties matrix (mutually exclusive — `sod_constraint`)

| #   | Constraint                                                                 | Severity   | Resolution                      |
| --- | -------------------------------------------------------------------------- | ---------- | ------------------------------- |
| S1  | `beneficiary:billing:create` ⊕ `beneficiary:billing:approve` (same entity) | block      | second approver                 |
| S2  | `treatment_plan:plan:create/author` ⊕ `:approve` (same plan)               | block      | supervisor signs                |
| S3  | `hr:leave:create(self)` ⊕ `hr:leave:approve(self)`                         | block      | manager approves                |
| S4  | `hr:payroll:process` ⊕ `hr:payroll:approve` (same run)                     | block      | manager/director approves       |
| S5  | `auditor` role ⊕ **any** create/update/delete/approve                      | block      | auditor stays read/export only  |
| S6  | `user:role_grant:assign` ⊕ being the grantee (self-grant)                  | block      | another admin grants            |
| S7  | `assessment/session:approve` ⊕ being the author                            | warn→block | route to a different supervisor |
| S8  | `approval:request:create` ⊕ `approval:decision:approve` (same request)     | block      | maker ≠ checker, universal      |

These rows are evaluated by the [risk-rule engine](authz-risk-rules.json) at
grant-time **and** re-checked at approve-time (TOCTOU closure).

## 8. Approval & escalation chains

| Request type                            | Ladder (threshold)                                         |
| --------------------------------------- | ---------------------------------------------------------- |
| Clinical sign-off                       | THR submits → **UNS** approves (unit) → [dispute] BRM      |
| Leave                                   | employee → **UNS** (≤3d) → **BRM** (≤14d) → **EXD** (>14d) |
| Beneficiary billing / refund            | FIN → **BRM** (≤ SAR limit) → **EXD** (> limit)            |
| Payroll run                             | HRO processes → **BRM/EXD** approves (≠processor)          |
| Branch role-grant                       | BRM requests (own-branch) → **HQA / security** approves    |
| Cross-branch / HQ grant · policy change | requester → **HQA + EXD** (dual)                           |
| Beneficiary discharge / plan closure    | THR → **UNS** → BRM (clinical governance)                  |

Thresholds are **data** (per-actor `approval_limit`, per-type SAR ceilings), not
hard-coded into roles — a manager's limit can change without a code release.

## 9. Delegation (acting-as) & break-glass

- **Delegation** — a user may temporarily act for another (vacation cover). The
  acting grant is **a subset** of the delegator's permissions, **always
  time-boxed**, and **never** includes `user:role_grant:*` or
  `rbac:policy:manage` (you cannot delegate the power to grant or to change
  policy). Every acting-as action is audited with both identities.
- **Break-glass (`BG`)** — emergency clinical read for a non-clinical senior
  (e.g., on-call director during an incident). **T3**, mandatory justification,
  auto-expires (minutes), and triggers a **post-hoc review** workflow. It is the
  _only_ path by which `EXD` reads individual `beneficiary:clinical` /
  `assessment` content; `HQA` has **no** break-glass to PHI.

## 10. HQ-only & explicit-deny (consolidated)

**HQ-only** (`global` scope_level only; unreachable by a branch user even by
accumulation): `branch:org:create/delete`, `user:account:create/disable/delete`,
`user:role_grant:assign` (cross-branch / `branch_id IS NULL`),
`rbac:policy:manage`, consolidated cross-branch reports & exports, global
audit-log read/export.

**Explicit deny** (hard, overrides inheritance):

- `AUDITOR` → every mutating action everywhere (S5).
- **All roles** → `audit:log:update/delete` (append-only, incl. HQA).
- `REC / HRO / FIN / HQA` → `beneficiary:clinical`, `assessment`,
  `treatment_plan`, `session:note` content (PHI minimisation).
- `HQA` → operational approvals + clinical PHI (technical ≠ clinical/transactional).
- `THR` → approve own clinical records; delete any clinical record.
- `HRO / BRM` → approve their own submitted leave/finance (maker ≠ checker).
- Non-HQ roles → `user:*` and `rbac:policy:manage` (HRO's employee-profile edit
  is a _different_ permission and does not imply account/role control).
- Any role → cross-scope read/write outside its branch/unit/caseload
  (engine-enforced; asserted as deny so a misconfig can't leak).

## 11. Governance, versioning & review

- **Versioned** — this matrix + seed carry a semver `version`; changes go through
  the **same maker-checker** as a sensitive grant (an `rbac:policy:manage`
  change request), never an ad-hoc edit.
- **Drift guard** — `permissions.registry.js` is asserted equal to
  `role-permissions.seed.json`; CI fails on divergence (the live-Mongo twin of
  the reason-codes registry guard).
- **Quarterly access review** — a re-attestation campaign: every grant outside a
  role's default set must be re-justified by the owning manager or it expires.
- **Least-privilege default** — a new role starts with `dashboard:view:read`
  only; capabilities are added deliberately, each with a tier + scope.

---

## 12. Enforceable artifact

The machine-readable source is
[`role-permissions.seed.json`](role-permissions.seed.json): every permission with
its grants (role + predicate + tier + lifecycle), the SoD rows, the HQ-only set,
and the deny rules. Consumers: the permission registry + drift guard (build), the
PDP `can()` (request-time), and the admin console's risk evaluator (grant-time).
