# ADR-037 — Reconcile the two role registries into one canonical union (close the 26+9 bidirectional divergence) (🟢 Mostly implemented — D2/D3/D5 done; D4 blocked on the `ceo` decision Q5)

**Date**: 2026-05-30
**Type**: ADR (consolidation / reconciliation — unblocks authz modernization Phase 1)
**Mode**: 🤝 Claude can execute the additive union + re-export shim once the dispositions are signed off; 👤 stakeholder owns the per-role keep/retire/alias calls
**Decider**: Security owner (role catalog) + HR/admin owner (which roles are real) + clinical lead (nursing/specialty roles)
**Effort**: additive merge + shim + guard ratchet ~0.5–1 day once Q1–Q3 answered; **blocked** until then

## Context

The authz modernization ([AUTHZ_MODERNIZATION_PLAN.md](../AUTHZ_MODERNIZATION_PLAN.md))
P2 names "3 desynchronized ROLES registries." Probing the _safe_ Phase-1
roles-shim (make one registry re-export the other) revealed the two canonical
registries have **diverged in BOTH directions** — neither is a superset:

|                                                                | count  |                                                                          |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `config/rbac.config.js` ROLES                                  | 46     | the resolver's role set (Phase-7 org + clinical specialties)             |
| `config/constants/roles.constants.js` ROLES (+ `ROLE_ALIASES`) | 28     | the "canonical" set per CLAUDE.md                                        |
| **only in rbac.config**                                        | **26** | a naive re-export would **DROP** these → mass authz breakage             |
| **only in roles.constants**                                    | **9**  | the resolver can't resolve these → they have **no permission map** today |

This is a **latent bug now**, not just tidiness: a role defined in one registry
but checked through the other's resolver simply won't resolve. The 9 const-only
roles (incl. the W464 CRPD roles `independent_advocate` + `cultural_officer`, and
`dpo`) are declared but the RBAC engine grants them nothing.

Two drift guards now **freeze** this so it can't worsen while we decide:
`check:authz-consolidation` (no new resolver/ROLES _definitions_) and
`check:role-divergence` (the 26+9 gap may not widen; ratchets to 0 as roles are
reconciled into both). This ADR is the plan to drive that gap to zero.

## The divergence, by cluster (proposed disposition)

### 26 roles only in `rbac.config` → **ADD to `roles.constants`** (they are real; they carry `ROLE_HIERARCHY` + permission maps)

| Cluster                | Roles                                                                                                                | Verdict                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Org / branch (Phase-7) | `branch_manager`, `regional_director`, `regional_quality`, `quality_coordinator`, `clinical_director`                | ADD — live org structure                               |
| HQ exec / governance   | `group_gm`, `group_cfo`, `group_chro`, `group_quality_officer`, `compliance_officer`, `internal_auditor`, `it_admin` | ADD — map to ADR-036 archetypes (EXEC/FIN/HR/AUDIT/HQ) |
| Dept supervisors       | `hr_officer`, `hr_supervisor`, `finance_supervisor`, `therapy_supervisor`, `special_ed_supervisor`                   | ADD                                                    |
| Clinical specialties   | `therapist_slp`, `therapist_ot`, `therapist_pt`, `therapist_psych`, `special_ed_teacher`, `therapy_assistant`        | ADD (note `therapy_assistant` narrowing — ADR-036 Q1)  |
| Support / external     | `driver`, `bus_assistant`, `guardian`                                                                                | ADD — `NON_MATRIX` archetype (ADR-036 D5)              |

### 9 roles only in `roles.constants` → **give a permission map in `rbac.config`** OR alias (they resolve to nothing today)

| Role                                          | Likely disposition                                          | Note                                     |
| --------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `independent_advocate`, `cultural_officer`    | MAP — W464 CRPD roles; in `WRITE_ROLES` already             | need explicit `ROLE_PERMISSIONS` entries |
| `dpo`                                         | MAP — Data Protection Officer; AUDITOR-like + PDPL surfaces | read/export + DPIA                       |
| `nurse`, `head_nurse`, `nursing_supervisor`   | MAP — clinical nursing ladder                               | THERAPIST/UNIT_SUPERVISOR archetypes     |
| `family_counsellor`                           | MAP — THERAPIST-archetype                                   |                                          |
| `patient_relations_officer`, `crm_supervisor` | MAP or ALIAS — verify vs existing CRM roles                 | possible alias of an existing role       |

## Decision

- **D1 — One canonical union.** `roles.constants.js` becomes the single source
  and holds the **union** (current 28 + the 26 = ~54 after de-alias). It already
  has `ROLE_ALIASES` for legacy↔canonical bridging — extend it, don't fork.
- **D2 — Add the 26** (additive; existing `rbac.config` callers unaffected since
  the values are identical).
- **D3 — Map or alias the 9.** Each const-only role gets a real
  `ROLE_PERMISSIONS` entry in `rbac.config` (mapped to its ADR-036 archetype) or
  an explicit `ROLE_ALIASES` bridge. No role may exist without a resolvable
  permission set.
- **D4 — Then the shim is safe.** `rbac.config.ROLES` becomes
  `require('./constants/roles.constants').ROLES` (the Phase-1 re-export) — only
  AFTER D2/D3, so nothing is dropped. `branchPermission.service.js` legacy kebab
  set migrates to constants + aliases.
- **D5 — Ratchet the guard to zero.** Each reconciled role is removed from
  `check-role-registry-divergence.js`'s baseline in the same commit (the guard
  fails if you forget). Target: `0 rbac-only + 0 const-only`.

## Open questions (sign-off gates D2/D3)

- **Q1** — Are all 9 const-only roles real, or are some (`crm_supervisor`,
  `patient_relations_officer`) aliases of existing roles? (Decides MAP vs ALIAS.)
- **Q2** — Permission map for `dpo` / nursing ladder: which ADR-036 archetype +
  scope each maps to (drives the seed grants).
- **Q3** — Carry ADR-036 Q1/Q2 here: `therapy_assistant` narrower-than-THERAPIST
  profile; retire generic `admin`/`manager` now that `branch_manager` exists?
- **Q4** — Owner of the merged catalog going forward (security vs platform) — the
  guard enforces "both registries agree," but someone owns adding new roles to
  both.

## Consequences

- **Positive**: closes a latent auth bug (declared-but-unresolvable roles);
  makes the Phase-1 roles-shim genuinely safe; one role catalog; the divergence
  guard ratchets to zero and then enforces parity forever.
- **Negative / risk**: D3 requires assigning real permissions to the 9 roles —
  a security decision, not mechanical; mis-mapping `dpo`/`independent_advocate`
  would over- or under-grant. Hence 🟡 Proposed, gated on Q1–Q2.
- **Neutral**: purely additive until D4; no caller changes, no behavior change,
  until the re-export lands (and that only removes duplication).

## Status

🟢 **Mostly implemented (verified 2026-06-01)** — D2, D3, D5 are DONE; only D4
remains, and it is blocked on a single concrete role decision (not the original
Q1–Q4 sign-off, which D3 resolved by mapping all 9):

- **D2 ✅ done** — `config/constants/roles.constants.js` now declares **54 roles**
  (was 28); the 26 rbac-only roles were added.
- **D3 ✅ done** — all 9 formerly-const-only roles (`dpo`, `nurse`, `head_nurse`,
  `nursing_supervisor`, `independent_advocate`, `cultural_officer`,
  `family_counsellor`, `patient_relations_officer`, `crm_supervisor`) now carry a
  real `ROLE_PERMISSIONS` entry in `rbac.config.js`.
- **D5 ✅ done** — `check:role-divergence` reads **0 rbac-only + 0 const-only**;
  the guard now enforces parity.
- **D4 ⚠️ BLOCKED — one role decision.** The re-export
  `rbac.config.ROLES = require('./constants/roles.constants').ROLES` would still
  **drop `'ceo'`**: `ceo` is a value in `rbac.config.ROLES` but NOT in
  `roles.constants.ROLES`. It is a GENUINELY DISTINCT live role — it has its own
  `ROLE_PERMISSIONS` (≠ `head_office_admin`), its own `ROLE_HIERARCHY` entry, and
  is gated on directly in live routes (`authorize(['ceo', …])` in
  `auditScheduler.routes.js`, `alerts-dashboard.routes.js`, …). Complication:
  `roles.constants.ROLE_ALIASES.ceo → head_office_admin`, so `resolveRole('ceo')`
  currently COLLAPSES ceo into head-office-admin permissions — inconsistent with
  rbac.config giving ceo a distinct set. **Resolving this changes CEO
  authorization behavior**, so it is an owner decision, not a mechanical add:

  - **Q5 (new, gates D4)** — Is `ceo` a distinct role (→ add `CEO:'ceo'` to
    `roles.constants.ROLES` AND remove the `ROLE_ALIASES.ceo` entry; CEO keeps its
    own permission set) OR a true alias of `head_office_admin` (→ delete the
    distinct `ROLES.CEO` + `ROLE_PERMISSIONS.ceo` + `ROLE_HIERARCHY.ceo` from
    `rbac.config`, migrate the `authorize(['ceo'])` call-sites)? The first is the
    likely answer (distinct perms + distinct hierarchy + live gates), but it
    over/under-grants real CEO users if wrong — hence owner sign-off.

  Once Q5 is answered and `ceo` is reconciled, D4 (the re-export shim) becomes a
  safe, mechanical one-liner and D5's guard already protects it.

Cross-refs: [ADR-036](036-role-archetype-reconciliation.md) (archetypes the
merged roles map to), ADR-005 (canonical role hierarchy), ADR-020
(Student/Beneficiary consolidation pattern),
[AUTHZ_MODERNIZATION_PLAN.md](../AUTHZ_MODERNIZATION_PLAN.md) (Phase 1), and the
`check:role-divergence` guard (now enforcing parity at zero).
