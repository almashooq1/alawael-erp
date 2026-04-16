# 5. Canonical Role Hierarchy (6 Levels)

Date: 2026-04-16

## Status

✅ Accepted

## Context

The platform had accumulated 19+ ad-hoc roles (in `config/constants/roles.constants.js`) from different subsystems (RBAC, rehab-roles, multi-tenant-isolator) using inconsistent casing. We needed a coherent hierarchy the business can reason about, while keeping the flat list for backward compatibility.

## Decision

We define a **6-level role hierarchy** aligned to organizational reality. Each concrete role belongs to exactly one level and inherits a semantic scope from that level.

| Level             | Scope                    | Sample Roles                                                                                                        |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| L1 — Platform     | Full platform            | `super_admin`                                                                                                       |
| L2 — Group (HQ)   | All branches             | `head_office_admin`, `head_office_ceo`, `head_office_cfo`, `head_office_cqo`, `head_office_chro`, `head_office_cmo` |
| L3 — Branch       | Single branch            | `manager` (branch manager), `admin` (branch admin), `accountant`, `hr_manager`                                      |
| L4 — Department   | Dept within branch       | `supervisor` (clinical supervisor), `finance`                                                                       |
| L5 — Professional | Caseload / role-specific | `therapist`, `doctor`, `teacher`, `nurse`, `receptionist`, `data_entry`, `hr`, `social_worker`, `psychologist`      |
| L6 — Self-Service | Self / ward only         | `parent`, `student`, `viewer`, `user`, `guest`                                                                      |

Rules:

1. **Single source of truth:** role names remain defined in `backend/config/constants/roles.constants.js`; this ADR adds _level metadata_, not new names.
2. **Monotonic scope:** higher levels can do anything lower levels can (within the same functional area), plus more.
3. **No L1 default writes to clinical data:** L1 is a technical role. Clinical writes by L1 require break-glass.
4. **L2 reads cross-branch, writes require justification:** every L2 write is audited; L3+ writes are scoped to branch automatically.
5. **ABAC supplements RBAC:** level is a baseline; additional attribute rules (caseload, department, environment) narrow access further. See [blueprint/05-role-matrix.md](../../blueprint/05-role-matrix.md).
6. **Legacy role aliases preserved:** `ROLE_ALIASES` map in `roles.constants.js` translates older names (kebab-case, camelCase) to canonical snake_case. This layer stays until legacy subsystems are migrated.

## Consequences

### Positive

- Business can describe access in terms the organization understands.
- Clear escalation path (L5 → L4 → L3 → L2).
- Every approval workflow maps to levels (e.g., invoice >10k SAR requires L2 approval).
- Audit analytics meaningful by level (e.g., "L2 cross-branch reads per week").

### Negative

- Adds a layer of abstraction on top of the flat role list.
- Requires a small `level(role)` helper and tests.

### Risks

- Mis-classification of a role (wrong level) silently over- or under-grants access. Mitigation: level is declared in one place (constants), with tests verifying each role's level.

## Implementation

Add to `backend/config/constants/roles.constants.js`:

```js
const ROLE_LEVELS = {
  super_admin: 1,
  head_office_admin: 2,
  head_office_ceo: 2,
  head_office_cfo: 2,
  head_office_cqo: 2,
  head_office_chro: 2,
  head_office_cmo: 2,
  admin: 3,
  manager: 3,
  accountant: 3,
  hr_manager: 3,
  supervisor: 4,
  finance: 4,
  therapist: 5,
  doctor: 5,
  teacher: 5,
  nurse: 5,
  receptionist: 5,
  data_entry: 5,
  hr: 5,
  social_worker: 5,
  psychologist: 5,
  parent: 6,
  student: 6,
  viewer: 6,
  user: 6,
  guest: 6,
};
function levelOf(role) {
  return ROLE_LEVELS[resolveRole(role)] ?? 6;
}
```

## References

- [docs/blueprint/05-role-matrix.md](../../blueprint/05-role-matrix.md)
- [backend/config/constants/roles.constants.js](../../../backend/config/constants/roles.constants.js)
