# 21. Duplicate Mongoose Model Registration — Consolidation Strategy

Date: 2026-05-24

## Status

🟡 **Proposed — needs technical-lead + domain-owner sign-off before Tier 1 consolidation begins.**

This ADR captures the W340 bug-class discovery and the patterns proven by W341–W343 cleanups. Tier 2 entries (39 names registered in 2 files each) follow mechanical patterns and can proceed without ADR; Tier 1 entries (4 names registered in 3–4 files with divergent schemas) need this ADR's framework before consolidation.

## Context

### Discovery (W340, commit `d73fded6b`)

Test-run of `.github/prompts/05-reports-approvals-family-communication.prompt.md` surfaced that the model name `'ApprovalRequest'` is registered as a Mongoose model via `mongoose.model('ApprovalRequest', schema)` in THREE different source files. Mongoose silently keeps the FIRST schema loaded; subsequent registrations (via the standard `mongoose.models.X || mongoose.model(X, schema)` idiom) return the already-cached model, dropping the second/third schema.

If schemas differ in field shape, callers using `mongoose.model('ApprovalRequest')` operate on whichever was loaded first by require-order. Half the codebase silently uses the wrong shape.

Full scan: **52 model names registered in multiple source files** as of W340. Snapshot:

- **Tier 1 (registered in 3-4 files)** — highest risk of silent schema drift:
  - `AuditLog` (4×) — critical audit infrastructure
  - `ApprovalRequest` (3×) — discovery trigger, schemas DIVERGENT
  - `ReportTemplate` (3×)
  - `WorkflowInstance` (3×)
- **Tier 2 (registered in 2 files each)** — 48 entries, lower drift risk but still violation

### This is a NEW bug class

Not caught by prior drift guards:

- **W324+W329** (canonical-beneficiary-ref): catches `ref:` mismatches; this is a registration-side bug.
- **W325c** (universal-phantom-ref): catches refs to unregistered models; here the model IS registered, just multiply.
- **W332** (care-planning.registry integrity): scoped to one specific lib.

W340 adds a 4th drift-guard bug class: silent-schema-drift via duplicate registration.

## Four consolidation patterns observed

W341–W343 cleanup work surfaced four distinct patterns. Each remaining baseline entry fits one of these:

### Pattern A — Seeder-side duplicate (W341 — 6 entries cleaned)

**Symptom**: a seeder file (e.g., `backend/database/seeders/database-seeder.js`) defines local schemas + registers them via `mongoose.models.X || mongoose.model('X', localSchema)`, racing with `backend/models/X.js`.

**Cause**: seeder authors wanted self-contained test data without coupling to the model layer. In single-process apps the canonical loads first via `app.js` boot, so the seeder schema silently loses. Standalone `node seed.js` flips the race.

**Fix**: change the seeder to `require('../../models/X')` instead of registering locally. Local schema definitions can stay (eslint-disable no-unused-vars) for diff/audit purposes.

**Examples consolidated in W341**: Beneficiary, User, Branch, Department, Session, Vehicle.

### Pattern B — Service-side duplicate with identical/similar schema (W342 — 3 entries cleaned)

**Symptom**: a service file (e.g., `backend/hr/saudi-hr-service.js`) defines schemas similar to the canonical, registers them inline. Slight differences (extra field, missing field) but operationally the same entity.

**Cause**: service was written before the canonical existed, or written by a parallel team that didn't know.

**Fix**: re-export canonical (`require('../models/X')`). Sometimes the canonical path itself has been moved (e.g., `models/Employee` → `models/HR/Employee` shim found during W342); use the non-shim canonical to avoid deprecation warnings.

**Examples consolidated in W342**: Employee, LeaveRequest, Attendance.

### Pattern C — Defensive lookup-with-fallback (W343 — 2 entries ALLOWLISTed)

**Symptom**: routes/services use a pattern like:

```javascript
function Referral() {
  try {
    return mongoose.model('Referral');
  } catch {
    return mongoose.model('Referral', fallbackSchema);
  }
}
```

The scanner sees the literal `mongoose.model('X', schema)` call inside the catch branch and counts it as a duplicate, even though it's dead code under normal app startup (canonical loads first → try succeeds → catch never executes).

**Cause**: intentional graceful degradation in test/dev environments where the canonical might not be loaded.

**Fix**: ALLOWLIST in `REGISTRATION_ALLOWLIST` with a reasoning comment. This is the only pattern where ALLOWLIST is the right answer (the others are real duplicate registrations).

**Examples ALLOWLISTed in W343**: Referral, Task.

### Pattern D — Divergent-schema duplicate (Tier 1 — NOT yet consolidated)

**Symptom**: 2-3 files register the same model name with SIGNIFICANTLY DIFFERENT schemas that represent different operational concepts.

**Cause**: parallel teams designed parallel features that happened to land on the same model name. The "duplicate" is actually a name collision between distinct entities.

**Fix**: RENAME, don't consolidate. Pick one to keep the bare name, rename the others to discriminate. May require updating callers.

This is the hardest pattern and needs stakeholder input. Examples below.

## Comparative analysis: ApprovalRequest (Tier 1)

Three schemas all sharing `collection: 'approval_requests'`. Same Mongo collection, three different lenses.

| Aspect                | `authorization/approvals/approval-request.model.js`                                  | `models/ApprovalRequest.js`                                    | `services/documents/documentApprovalChains.service.js`                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lines**             | 95                                                                                   | 42                                                             | ~50 (extracted)                                                                                                                                 |
| **Domain**            | Generic approval engine                                                              | Simple legacy                                                  | Document-specific approval chains                                                                                                               |
| **Identifier fields** | `chainId`, `resourceType`, `resourceId`                                              | `requestType`, `requestRefId`                                  | `chainId`, `documentId`                                                                                                                         |
| **Initiator**         | `initiatorId`                                                                        | `requester`                                                    | `requestedBy`                                                                                                                                   |
| **Steps shape**       | `[{role, branchScope, dueHours, canDelegate, condition}]` (declarative routing)      | `[{approver, action, actedAt, comment}]` (instance state only) | `[{stepNumber, stepName, status, approvedBy, slaDeadline, slaBreached, escalatedTo, duration, responses[]}]` (rich tracking + SLA + delegation) |
| **Decisions**         | Separate `decisions[]` array (audit trail)                                           | Inline in steps via `action`                                   | Inline in steps via `responses[]` array                                                                                                         |
| **Status enum**       | From `engine.js` `STATUSES` (state machine)                                          | `pending/approved/rejected/cancelled` (4)                      | 6+ values via stepResults inner enum                                                                                                            |
| **SLA**               | `slaDeadline` + `isBreached()` method                                                | None                                                           | `slaStatus`, per-step `slaBreached`, `totalDuration`                                                                                            |
| **Methods**           | `currentApproverRole()`, `isBreached()`                                              | None                                                           | None (logic in service)                                                                                                                         |
| **Tenancy**           | `[TENANT_FIELD]: ref:'Branch'` (multi-tenant)                                        | None                                                           | None visible                                                                                                                                    |
| **Unique index**      | `(resourceType, resourceId, status='pending_approval')` — prevents double-submission | None                                                           | `(chainId, status)`, `(documentId)`, `(requestedBy)`                                                                                            |

**Verdict**: these are **THREE DIFFERENT ENTITIES that accidentally collided on a name.**

- The authorization-domain one is a generic state-machine approval engine intended to be reusable.
- The models/ one is legacy simple state (probably pre-dates the authorization engine).
- The documents-service one has rich document-workflow-specific tracking (SLA breaches, escalation, delegation, retry count).

**Recommended consolidation**:

1. **Keep `authorization/approvals/approval-request.model.js` registered as `'ApprovalRequest'`** (canonical generic).
2. **Rename `services/documents/documentApprovalChains.service.js` registration to `'DocumentApprovalRequest'`**. Its schema is specific to document workflows and deserves a distinct name. Update callers.
3. **Investigate `models/ApprovalRequest.js`** — is it actually used by anything still? If yes, migrate callers to the canonical state machine (#1) and delete. If no, delete outright.

**Stakeholder questions**:

- Q1: Are there active callers of the simple `models/ApprovalRequest.js` schema (using fields like `requestType` directly)?
- Q2: Does the documents team accept renaming their model to `DocumentApprovalRequest`?
- Q3: Is the rich generic state-machine in `authorization/approvals/` actually the team's preferred approval engine going forward, or is there a different vision?

## Comparative analysis: AuditLog (Tier 1, 3 actual registrations)

Three schemas all named `'AuditLog'`:

| Aspect              | `backend/models/auditLog.model.js` (canonical, 589 lines) | `backend/database/audit-trail.js` (~110 lines) | `backend/routes/audit-trail-enhanced.routes.js` (~95 lines, inline) |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Domain**          | Generic application audit (60+ event types per CLAUDE.md) | Database-layer audit trail                     | Routes-layer audit (per-request)                                    |
| **Subject naming**  | (likely entity-typed, needs verification)                 | `entityType` + `entityId`                      | `auditableType` + `auditableId`                                     |
| **Timestamp field** | `timestamp`                                               | `createdAt`                                    | `createdAt`                                                         |
| **Action field**    | yes                                                       | yes                                            | yes                                                                 |
| **Module field**    | no?                                                       | no                                             | `module: String`                                                    |
| **Tags**            | yes                                                       | yes                                            | yes                                                                 |
| **Severity**        | yes                                                       | yes (different enum?)                          | (not visible in extract)                                            |
| **User ref**        | `userId`                                                  | `userId`                                       | `userId`                                                            |
| **Branch ref**      | likely                                                    | `branchId`                                     | `branchId`                                                          |

**Verdict**: **THREE DIFFERENT AUDIT LENSES** — generic / DB-layer / routes-layer. Probably written by different waves/teams who each wanted their own audit pipeline without coordinating field names.

The naming collision (`entityType` vs `auditableType`) means callers expecting one shape get errors querying by the other.

**Recommended consolidation**:

1. **Keep `backend/models/auditLog.model.js` registered as `'AuditLog'`** (canonical, richest, longest-lived).
2. **`backend/database/audit-trail.js`** has try/catch defensive pattern (`mongoose.model('AuditLog')` first, register fallback only in catch). This is actually Pattern C — move to REGISTRATION_ALLOWLIST? OR refactor to `require('../models/auditLog.model')` directly.
3. **`backend/routes/audit-trail-enhanced.routes.js`** has the same defensive pattern. Same options.

**Stakeholder questions**:

- Q1: Are there callers querying audit records by `entityType` (canonical-side) vs `auditableType` (routes-side)? If both, we have data fragmentation across what is supposed to be one collection.
- Q2: Should `module` and any other route-specific fields be added to the canonical schema?
- Q3: Can the two defensive patterns (database/audit-trail + routes/audit-trail-enhanced) safely switch to canonical re-export?

## Decision framework for stakeholders

For each Tier 1 entry, walk this decision tree:

```text
1. Compare the N schemas side-by-side.
   ├─ If they're operationally the SAME entity (similar fields, same intent):
   │     → Pattern A or B: consolidate via canonical re-export. Pick richest.
   │
   ├─ If they're operationally DIFFERENT entities (different fields, different intent):
   │     → Pattern D: rename N-1 of them to discriminate. Update callers.
   │
   └─ If one is a defensive lookup-with-fallback:
         → Pattern C: ALLOWLIST that one with reasoning. Consolidate the rest.

2. For Pattern D (rename):
   a. Identify the CANONICAL — typically the richest schema in the most-canonical directory
      (authorization/, intelligence/canonical/, models/ root in that order).
   b. Rename the others' Mongoose registrations to discriminating names.
   c. grep all callers of `mongoose.model('OriginalName')` — they get the canonical now.
      Are they correct for that? Some may have been silently relying on the loser schema.
   d. Migrate or rename caller-side as needed.
   e. Drop the renamed registration from KNOWN_DUPLICATE_REGISTRATIONS in the same commit.
```

## Decision

**Tier 2 (39 entries)**: continue mechanical cleanup via patterns A/B/C without ADR per group. The drift guard's stale-baseline test will catch regressions, and W341/W342/W343 demonstrate the pattern is safe.

**Tier 1 (4 entries)**: **NOT YET DECIDED**. Each needs:

1. Stakeholder reading the comparative analysis above.
2. Answer to that entry's specific questions.
3. PR per entry, ratchet-DOWN from baseline.

Recommended Tier 1 order (lowest risk first):

1. `WorkflowInstance` — investigate the 3 files; pattern likely C (defensive) or B (similar schemas).
2. `ReportTemplate` — investigate.
3. `ApprovalRequest` — Pattern D rename (analysis above).
4. `AuditLog` — Pattern D rename or Pattern C ALLOWLIST (analysis above).

## Consequences

If **Tier 1 consolidation is deferred indefinitely**:

- The drift guard's baseline includes 4 known-divergent registrations forever.
- Callers continue to risk silent failure (caller-A uses field-from-schema-1, caller-B uses field-from-schema-2 → whichever schema loads first determines who wins).
- Production behavior depends on require-order, which can change with future imports.

If **Tier 1 is consolidated per this ADR's framework**:

- Drift guard baseline drops to ~32 entries (mostly Tier 2 mechanical cleanups remaining).
- Caller behavior becomes deterministic.
- Future model authors get a clear "rename, don't collide" signal from the codified pattern.

## Cross-references

- W340 drift guard: `backend/__tests__/no-duplicate-model-registration-wave340.test.js` (commit `d73fded6b`).
- W340b scanner comment-stripping fix: commit `70d1bc1cf`.
- W341 seeder consolidation (Pattern A, 6 entries): commit `ea8143ac8`.
- W342 HR service consolidation (Pattern B, 3 entries): commit `cd473817a`.
- W343 Referral/Task ALLOWLIST (Pattern C, 2 entries): commit pending in current session.
- W325 series doctrine: this ADR is a sibling of ADR-018 (rehabilitation-protocol-entity) + ADR-020 (Student/Beneficiary consolidation) — all three follow the "Proposed pending stakeholder input + concrete approaches" template.
- `.github/prompts/05-reports-approvals-family-communication.prompt.md` — the test-run that discovered the bug class.

## Not in scope

- Code-level consolidation of any specific Tier 1 entry (each is a follow-up PR).
- Renaming caller-side `ref: 'ApprovalRequest'` to `ref: 'DocumentApprovalRequest'` (caller migration work follows the rename decision).
- Designing a new generic approval engine to replace all three ApprovalRequest variants (out of scope; the rich one in `authorization/approvals/` already exists).
- Frontend impact (no UI surfaces touch model registrations directly).
