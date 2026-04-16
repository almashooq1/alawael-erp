# ABAC — Attribute-Based Access Control

> Implements ABAC layer above RBAC. See [ADR-005](../../../docs/architecture/decisions/005-canonical-role-hierarchy.md) for role hierarchy, [blueprint/05-role-matrix.md](../../../docs/blueprint/05-role-matrix.md) for policy reference.

## Structure

```
authorization/abac/
├── README.md                  # this file
├── index.js                   # public API
├── policy-decision-point.js   # PDP — evaluates rules
├── policy-enforcement-point.js # PEP — Express middleware
├── policies/                  # policy rule files (composable)
│   ├── caseload-access.js
│   ├── cross-branch-access.js
│   ├── emergency-access.js
│   ├── sensitive-clinical.js
│   └── session-amendment-window.js
└── __tests__/                 # unit tests
```

## Concepts

- **Subject** — the authenticated user (roles, branchId, department, mfa, ...).
- **Resource** — the entity being acted on (type, id, branchId, owner, confidentiality, ...).
- **Action** — what is being attempted (read/write/delete/approve/export/...).
- **Environment** — contextual (time, ip, deviceTrust, ...).

## Decision Flow

```
  Request ──▶ PEP middleware ──▶ build { subject, action, resource, env }
                                          │
                                          ▼
                                   PDP.evaluate(...)
                                          │
                                  ┌───────┴────────┐
                               permit         deny
                                  │                │
                                  ▼                ▼
                               next()      403 + audit
```

## Policy Rule Contract

Each policy exports:

```js
module.exports = {
  id: 'caseload-access',
  description: 'Therapist may read beneficiary only if assigned',
  applies({ subject, action, resource }) {
    return (
      subject.roles.includes('therapist') && action === 'read' && resource.type === 'Beneficiary'
    );
  },
  evaluate({ subject, action, resource, env }) {
    if (resource.caseTeam?.includes(subject.userId)) return { effect: 'permit' };
    return { effect: 'deny', reason: 'not_in_case_team' };
  },
};
```

Multiple policies may apply; combination algorithm is **deny-overrides**:

- If any applicable policy returns `deny` → deny.
- Else if any returns `permit` → permit.
- Else → not applicable (falls back to RBAC).

## Usage in Routes

```js
const { enforce } = require('../authorization/abac');

router.get(
  '/beneficiaries/:id',
  authenticateToken,
  enforce({ action: 'read', resourceType: 'Beneficiary', resourceLoader: loadBeneficiary }),
  controller.getBeneficiary
);
```

## Extending

1. Add a policy file under `policies/`.
2. Register it in `policies/index.js`.
3. Add a test in `__tests__/`.

Do not add custom logic in controllers — express policy as a rule so it can be reviewed centrally.
