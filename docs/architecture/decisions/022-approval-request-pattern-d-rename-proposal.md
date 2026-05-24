# ADR-022 — ApprovalRequest Pattern D rename proposal (Tier 1 consolidation candidate)

**Status**: 🟡 Proposed — needs stakeholder sign-off
**Date**: 2026-05-24
**Supersedes**: extends ADR-021 (duplicate Mongoose model registration framework)
**Owner**: pending (suggest: platform architecture lead)

---

## Context

ADR-021 framed the W340 baseline duplicate-registration findings and laid out the
4-pattern decision tree (A consolidate / B re-export / C ALLOWLIST / D rename).
For Tier 1 entries it deferred per-entry decisions to per-entry analysis.

This ADR is that per-entry analysis for `ApprovalRequest` (3 registration sites,
schemas DIVERGE significantly per W340 commit).

W341–W347 cleared most Tier 2 entries mechanically. Tier 1 remains:
`ApprovalRequest` (3×) / `ReportTemplate` (3×) / `WorkflowInstance` (3×) /
`AuditLog` (4× — already ALLOWLISTed in W347 as a stopgap).

---

## The 3 ApprovalRequest schemas

### Schema A: `backend/authorization/approvals/approval-request.model.js` (~95 lines)

**Domain**: Platform-wide generic approval-chain engine.
**Shape**:

```js
{
  chainId: String (required, indexed),
  resourceType: String (required, indexed),
  resourceId: Mixed (required, indexed),
  initiatorId: ObjectId → 'User' (required),
  branchId: ObjectId → 'Branch' (via TENANT_FIELD constant, indexed),
  status: enum STATUSES (from ./engine — generic approval-engine states),
  currentStep: Number,
  steps: [StepSchema{role, branchScope, dueHours, canDelegate, condition}],
  decisions: [DecisionSchema{step, role, actorId, decision, note, at}],
  openedAt, slaDeadline, finalizedAt: Date,
  metadata: Mixed,
}
```

**Indexes**: unique partial on `{resourceType+resourceId+status:'pending_approval'}`
to prevent duplicate open requests per resource.

**Methods**: `currentApproverRole()`, `isBreached(now)`.

**Caller pattern**: Exported via a getter `get model()` so consumers receive
a model reference via DI:

```js
const { model } = require('.../approval-request.model');
// later: ApprovalRequestModel.model.find(...)
```

This is the **engine source-of-truth** — used by `backend/authorization/approvals/approvals.routes.js`.

---

### Schema B: `backend/models/ApprovalRequest.js` (~35 lines)

**Domain**: Legacy simpler HR-style internal request workflow.
**Shape**:

```js
{
  requestType: String (required), // examples: 'إجازة', 'صرف مالي', 'تعديل بيانات'
  requestRefId: ObjectId,         // free reference to the originating record
  requester: ObjectId → 'User' (required),
  status: enum ['pending','approved','rejected','cancelled'],
  steps: [{approver:ObjectId→'User', action, actedAt, comment}],
  currentStep: Number,
  comments: [{user, text, createdAt}],
  createdAt, updatedAt: Date,
}
```

**Caller pattern**: classic `module.exports = mongoose.models.ApprovalRequest || mongoose.model(...)`.
The author intended this as the canonical model for the project (judging from the
file path under `models/`), pre-dating the authorization engine.

**Fields-side identity**: `requester` (Schema A uses `initiatorId`), no chainId,
no branch-awareness, no SLA.

---

### Schema C: `backend/services/documents/documentApprovalChains.service.js` (~95 lines inline)

**Domain**: Document-workflow approval (one CAPA-like instance per document approval chain).
**Shape**:

```js
{
  chainId: ObjectId → 'ApprovalChain' (required), // references doc-chain definition
  documentId: ObjectId → 'Document',
  referenceId, referenceType: String,
  status: enum ['pending','in_progress','approved','rejected','cancelled','returned','escalated','expired','info_requested'],
  currentStep: Number,
  stepResults: [{
    stepNumber, stepName,
    status: enum [...7 values],
    approvedBy, delegatedTo, delegatedBy, escalatedTo: ObjectId → 'User',
    approvedAt, slaDeadline: Date,
    slaBreached: Boolean,
    comment: String,
  }],
}
```

**Fields-side identity**: `chainId` is an ObjectId ref (in Schema A `chainId` is
a String, in Schema B there's no chainId). Step model is `stepResults` (vs Schema
A's `steps` + `decisions`, vs Schema B's `steps`). Status enum has 9 values (vs 4
in B, vs `STATUSES` from engine in A).

---

## Verdict: 3 different entities, same name

| Aspect              | A authorization              | B models/ legacy           | C doc service                |
| ------------------- | ---------------------------- | -------------------------- | ---------------------------- |
| **Purpose**         | Generic engine               | HR-style internal requests | Document workflow            |
| **chainId type**    | String                       | (absent)                   | ObjectId → ApprovalChain     |
| **Initiator field** | `initiatorId`                | `requester`                | (absent — chainId-bound)     |
| **Branch-aware**    | Yes (TENANT_FIELD)           | No                         | No                           |
| **Status enum**     | `STATUSES` from engine       | 4 values                   | 9 values                     |
| **Step shape**      | `steps[]` + `decisions[]`    | `steps[]` only             | `stepResults[]`              |
| **Has SLA**         | Yes (slaDeadline)            | No                         | Yes (per-step slaDeadline)   |
| **Has metadata**    | Yes                          | No                         | No                           |
| **Has delegation**  | Yes (`canDelegate` per step) | No                         | Yes (`delegatedTo` per step) |

Mongoose silently keeps the FIRST registered schema; subsequent registrations
return the cached model. Whichever require chain wins → callers of the other
two schemas operate on the wrong shape silently.

---

## Caller analysis (as of 2026-05-24)

Files that call `mongoose.model('ApprovalRequest')` directly: **none**.
Files that reference `[Aa]pproval[Rr]equest` in any form: **5**, and 3 of those
are the schema files themselves + this test file. The remaining 2:

- `backend/app.js:1186` — passes `require('./models/ReportApprovalRequest')` (different model).
- `backend/services/reporting/index.js:37,122` — same `ReportApprovalRequest`.

**Finding**: No production caller of the 3 ApprovalRequest schemas via the generic
name lookup pattern. All consumers operate via DI:

- Schema A is consumed via `ApprovalRequestModel` injected into `approvals.routes.js`.
- Schema B has NO active callers via the registration cache — likely dead code or
  only reachable through Mongoose's auto-load via `require('./models/ApprovalRequest')`
  if it appears in a model-index file (verification needed).
- Schema C is used inline within `documentApprovalChains.service.js` — the service
  uses its own closure-scoped `ApprovalRequest` variable.

**Implication**: the silent-fragmentation risk is LOWER than W340's
worst-case framing for this entry, BUT load-order is still architectural roulette
that should not survive long-term.

---

## Recommended Pattern D rename

| Current name (collision)   | Proposed name             | New file path (if rename)                                   | Rationale                                                 |
| -------------------------- | ------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| Schema A `ApprovalRequest` | `ApprovalRequest` (KEEP)  | `backend/authorization/approvals/approval-request.model.js` | Richest schema, engine source-of-truth, branch-aware      |
| Schema B `ApprovalRequest` | `InternalApprovalRequest` | `backend/models/InternalApprovalRequest.js`                 | HR-style; semantic discrimination via name                |
| Schema C `ApprovalRequest` | `DocumentApprovalRequest` | inline in `documentApprovalChains.service.js`               | Document-workflow scope; new name makes contract explicit |

### Migration steps (per the ADR-021 Pattern D playbook)

For each of B + C:

1. **Rename the Mongoose registration**:
   - Schema B: `mongoose.model('ApprovalRequest', schema)` → `mongoose.model('InternalApprovalRequest', schema)`
   - Schema C: `mongoose.model('ApprovalRequest', schema)` → `mongoose.model('DocumentApprovalRequest', schema)`
2. **Rename the file** (Schema B only): `models/ApprovalRequest.js` → `models/InternalApprovalRequest.js`.
3. **Grep callers** of both old + new names. Update any direct `mongoose.model('ApprovalRequest')`
   lookups that expected the renamed schema. (Audit found ZERO production callers via
   this pattern, so this step is precautionary — re-verify before shipping.)
4. **Update any ref fields** in OTHER schemas that point at the old name:
   - `grep -rn "ref:\s*['\"]ApprovalRequest['\"]"` → assess intent. If a ref intended
     B or C, change it to the new name.
   - (Currently none found; this is also precautionary.)
5. **Remove `'ApprovalRequest'` from `KNOWN_DUPLICATE_REGISTRATIONS`** in the W340 baseline
   in the same commit. The ratchet-down test will pass once 2 of 3 sites are renamed.
6. **Sprint smoke**: run `npm run test:sprint` to confirm no breakage.

### Database-side migration

NONE required if both renamed schemas were dead (no production writes from them).
If any writes did happen → existing documents stay in `approval_requests` collection
under the old shape. Two options:

- **Co-exist**: leave old docs in `approval_requests`, new docs go to renamed
  collections (`internal_approval_requests` + `document_approval_requests`).
  Run a separate migration to move old records.
- **In-place**: keep `collection: 'approval_requests'` on the renamed schemas
  (same collection, different schemas) → relies on schemas being read-only-compatible
  with the historical shape.

Recommended: **co-exist**, schedule the migration separately.

---

## Open stakeholder questions

Before executing this rename, the following must be answered:

- **Q1**: Are there callers that explicitly expect the legacy Schema B shape?
  Specifically, anything reading `requestType` or `requester` fields on what they
  believe is "ApprovalRequest"? If yes, those callers need updating to use the new
  `InternalApprovalRequest` name.

- **Q2**: Is Schema B truly intended to be a separate entity, or is it stale code
  that should just be deleted? If it's stale → delete it instead of renaming. This
  reduces the rename to a single site (Schema C).

- **Q3**: Should Schema C be folded into Schema A (the generic engine) by adapting
  the document-approval flow to use the platform engine? This is the Pattern A path
  and would eliminate the collision entirely. Higher ambition, more risk.

- **Q4**: Is there a downstream pipeline (admin dashboard, reporting) that aggregates
  across all ApprovalRequest documents and would break if records split into 3
  different collections? Probable but unverified.

---

## Decision

**Status: 🟡 PROPOSED.** This ADR is a concrete migration plan, not an active
decision. Execution requires sign-off from:

1. Platform architecture lead — confirms canonical (Schema A) is the right canonical.
2. HR module owner — answers Q1 + Q2 for Schema B.
3. Document workflow owner — confirms or rejects Schema C → Schema A folding (Q3).
4. Operations / reporting owner — answers Q4 (downstream dashboards).

Until signed off, ApprovalRequest remains in `KNOWN_DUPLICATE_REGISTRATIONS`
(W340 baseline) and the drift guard documents the risk without acting on it.

## Consequences

If executed:

- W340 baseline drops by 1 entry (ApprovalRequest cleared).
- 3 dictinct names make schema intent explicit; load-order roulette eliminated for
  this entity.
- Pattern is reusable for the 2 remaining Tier 1 entries
  (`ReportTemplate`, `WorkflowInstance`).
- Database-side migration may be needed if historical data exists.

If deferred indefinitely:

- The bug class remains active for this entity — production behaviour depends on
  require-order, which can change with future imports.
- New developers shipping code that touches `mongoose.model('ApprovalRequest')`
  may silently get the wrong schema.

## Recommended next step

1. Run a quick prod-data audit: `db.approval_requests.countDocuments()` per
   `_schema_marker` or proxy field (`requestType` exists → Schema B record;
   `chainId` is String → A; `chainId` is ObjectId → C). This tells us if dead
   schemas have dead data.
2. Walk Q1–Q4 with the four named stakeholders.
3. PR the rename in a single atomic commit, prune from baseline same-commit
   (W348+ ratchet-down convention).
