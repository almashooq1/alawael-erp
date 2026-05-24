# ADR-024 — WorkflowInstance Pattern D rename proposal (final Tier 1 candidate)

**Status**: 🟡 Proposed — needs stakeholder sign-off
**Date**: 2026-05-24
**Supersedes**: extends [ADR-021](021-duplicate-model-registration-consolidation-strategy.md); follows [ADR-022](022-approval-request-pattern-d-rename-proposal.md) and [ADR-023](023-report-template-pattern-d-rename-proposal.md) (the per-entry Pattern D series)
**Owner**: pending (suggest: workflow engine owner + document-workflow owner)

---

## Context

This is the third (and last) Tier 1 entry needing per-entry decision per the
ADR-021 framework. `WorkflowInstance` has 3 registration sites — but unlike
`ApprovalRequest` and `ReportTemplate`, **none of them lives at the canonical
directory `models/`**. All 3 are service-layer or workflow-layer inline schemas.

This makes the rename framing slightly different: there is no "incumbent canonical"
to defend; the question is **which of the 3 (if any) should become the new
canonical** and where it should live.

---

## The 3 WorkflowInstance schemas

### Schema A: `backend/services/documents/documentWorkflow.engine.js` (inline)

**Domain**: Document-workflow engine (simpler, template-driven).
**Discriminating fields**:

```js
{
  documentId: ObjectId → 'Document' (required, indexed),
  templateId: enum Object.keys(WORKFLOW_TEMPLATES) (required),
  currentStatus: enum Object.keys(WORKFLOW_STATUSES) (default 'draft'),
  previousStatus: String,
  // assignees + ...
}
```

- Tightly coupled to document workflow templates (WORKFLOW_TEMPLATES enum)
- String templateId, not a ref → templates are code-defined, not DB-defined
- previousStatus tracking but no full history[] array

### Schema B: `backend/services/documents/documentWorkflowOrch.service.js` (inline)

**Domain**: BPMN-style orchestrator for document workflows.
**Discriminating fields**:

```js
{
  definitionId: ObjectId → 'WorkflowDefinition' (required),
  documentId: ObjectId → 'Document',
  status: enum ['running','completed','failed','suspended','cancelled','waiting'],
  currentNodes: [{ nodeId, enteredAt, status }],
  variables: Map<String, Mixed>,
  history: [{ nodeId, nodeName, action, enteredAt, ... }],
}
```

- Refs `WorkflowDefinition` (DB-defined, more flexible than A's templateId)
- BPMN-style: currentNodes[] (multi-node parallel execution support), variables Map, history audit
- Document-coupled (`documentId` field) but designed for arbitrary workflow definitions

### Schema C: `backend/workflow/intelligent-workflow-engine.js` (inline)

**Domain**: Generic platform-wide workflow engine (NOT document-coupled).
**Discriminating fields**:

```js
{
  definition: ObjectId → 'WorkflowDefinition' (required),
  definitionVersion: Number (required),
  title, description: String,
  businessKey: String, // generic reference to any business entity
  status: enum ['running','completed','cancelled','error','suspended'],
  requester: ObjectId → 'User' (required),
  // current state + ...
}
```

- Refs `WorkflowDefinition` AND `definitionVersion` → versioned definitions
- `businessKey` (generic) instead of `documentId` (specific) — supports ANY workflow
- `requester` field (Schema A and B don't capture initiator explicitly)
- Lives at `workflow/` (separate top-level dir, not `services/documents/`)

---

## Verdict

| Aspect               | A doc engine                     | B doc orchestrator           | C generic engine                      |
| -------------------- | -------------------------------- | ---------------------------- | ------------------------------------- |
| **Purpose**          | Template-driven doc workflow     | BPMN-style doc orchestrator  | Generic platform workflow             |
| **Workflow def**     | Code enum (`WORKFLOW_TEMPLATES`) | DB ref `WorkflowDefinition`  | DB ref `WorkflowDefinition` + version |
| **Subject coupling** | `documentId` only                | `documentId` only            | `businessKey` (generic)               |
| **Status enum**      | `Object.keys(WORKFLOW_STATUSES)` | 6 values incl. 'waiting'     | 5 values incl. 'error'                |
| **History tracking** | `previousStatus` String only     | Full `history[]` audit array | Implicit via state field              |
| **Multi-node?**      | No (single currentStatus)        | Yes (`currentNodes[]`)       | (verify — likely single)              |
| **Variables**        | (absent)                         | `Map<String,Mixed>`          | (verify)                              |
| **Requester field**  | (absent)                         | (absent)                     | `requester: ObjectId→User`            |
| **File location**    | service                          | service                      | workflow/ (more generic)              |

A and B are BOTH document-workflow but at different abstraction levels (A simpler,
B BPMN-style). C is a separate concern.

---

## Caller analysis (preliminary — verify before execution)

- Schema A: consumed by `documentWorkflow.engine.js` itself (closure-scoped). Likely
  exposed via the engine's exports to whichever caller wires the engine into routes.
- Schema B: same pattern — closure-scoped to `documentWorkflowOrch.service.js`.
- Schema C: consumed by `intelligent-workflow-engine.js` and (likely) any platform-wide
  workflow consumer.

Like ADR-022/023, there are NO callers using the generic `mongoose.model('WorkflowInstance')`
lookup across schema boundaries (verify with grep before execution).

---

## The two reasonable options

### Option D-pure: three distinct names (matches ADR-023's recommendation pattern)

| Current name (collision)    | Proposed name                         |
| --------------------------- | ------------------------------------- |
| Schema A `WorkflowInstance` | `DocumentWorkflowInstance`            |
| Schema B `WorkflowInstance` | `DocumentWorkflowOrchInstance`        |
| Schema C `WorkflowInstance` | `WorkflowInstance` (KEEP — canonical) |

- ✅ Cleanest naming
- ✅ Each schema's intent is explicit
- ✅ C "wins" the canonical name because it's generic
- ❌ A and B are conceptually similar (both document-workflow) — having TWO doc-workflow
  schemas is technical debt; this proposal doesn't fix that

### Option A+D-hybrid: consolidate A+B, rename C

| Current name (collision)    | Proposed name                         | Action                                              |
| --------------------------- | ------------------------------------- | --------------------------------------------------- |
| Schema A `WorkflowInstance` | `DocumentWorkflowInstance`            | **MERGE** A's fields into B's richer schema         |
| Schema B `WorkflowInstance` | `DocumentWorkflowInstance`            | Becomes the consolidated doc-workflow schema        |
| Schema C `WorkflowInstance` | `WorkflowInstance` (KEEP — canonical) | Rename C's `mongoose.model()` call to keep the name |

- ✅ Eliminates A vs B duplication too (Pattern A applied inside D)
- ✅ One doc-workflow schema; one generic-workflow schema
- ❌ Requires field reconciliation between A (templateId enum) and B (definitionId ref)
- ❌ DB migration: existing A-shape records get migrated to B's richer shape
- ❌ Higher effort, higher risk

**Recommended**: **Option D-pure** first (eliminates the name collision), then file a
follow-up ADR to evaluate Option A+D-hybrid as a deeper refactor when the document-workflow
owner can dedicate cycles to it.

---

## Migration steps (Option D-pure)

1. **Rename Mongoose registrations**:
   - A: `mongoose.model('WorkflowInstance', WorkflowInstanceSchema)` → `'DocumentWorkflowInstance'`
   - B: `mongoose.model('WorkflowInstance', workflowInstanceSchema)` → `'DocumentWorkflowOrchInstance'`
   - C: keep `'WorkflowInstance'` (no change — wins the canonical name)
2. **Grep callers** of `mongoose.model('WorkflowInstance')` AND `ref: 'WorkflowInstance'`. Update
   each to the intended new name.
3. **Update any exports/factory return types** in A and B's service modules.
4. **Remove `'WorkflowInstance'` from `KNOWN_DUPLICATE_REGISTRATIONS`** in the W340 baseline
   in the same commit.
5. **Sprint smoke**: `npm run test:sprint`.

### Database-side migration

- Each schema's default collection: `workflow_instances`. After rename:
  - A → `document_workflow_instances`
  - B → `document_workflow_orch_instances`
  - C → `workflow_instances` (unchanged)
- Existing docs in `workflow_instances` need to be split. Field-detection migration
  (templateId presence → A; definitionId + currentNodes → B; businessKey → C).
- Approx 1-day data-migration job.

---

## Open stakeholder questions

- **Q1**: Confirm Option D-pure over the A+D-hybrid consolidation. The workflow engine owner
  has final say — they know whether A and B are truly different abstractions or just
  legacy duplication.
- **Q2**: Is Schema C (generic engine) actively used? Or is it dead code from a previous
  workflow initiative that was superseded by A or B?
- **Q3**: Should `WorkflowDefinition` get the same Pattern D treatment? It's already in
  `KNOWN_DUPLICATE_REGISTRATIONS` (Tier 2) and may face the same divergence problem.
- **Q4**: Database migration — can we afford 1 day of partial write-unavailability on
  `workflow_instances`, or do we need a phased migration script?

---

## Decision

**Status: 🟡 PROPOSED.** Execution requires sign-off from:

1. Workflow engine owner — Option choice + Q2.
2. Document-workflow owner — confirms A and B both stay (or one is deleted).
3. Operations team — Q4 (migration window).

Until signed off, `WorkflowInstance` stays in `KNOWN_DUPLICATE_REGISTRATIONS`.

## Consequences

If executed (Option D-pure):

- W340 baseline drops by 1 entry (WorkflowInstance cleared).
- 3 explicit names → load-order roulette eliminated.
- All 3 ADR-022/023/024 Tier 1 fixes complete → baseline becomes Tier 2 only.
- `AuditLog` remains ALLOWLISTed (W347) pending its own ADR or eventual refactor.

If deferred:

- Same risks as ADR-022/023 deferral.
- The workflow domain stays a known landmine for new engine work.

## Recommended next step

1. Walk Q1–Q4 with the workflow + document-workflow owners.
2. Prod-data audit on `workflow_instances`:
   ```js
   db.workflow_instances.aggregate([
     {
       $project: {
         schemaType: {
           $cond: [
             { $ifNull: ['$businessKey', false] },
             'C-generic',
             { $cond: [{ $ifNull: ['$currentNodes', false] }, 'B-orch', 'A-engine'] },
           ],
         },
       },
     },
     { $group: { _id: '$schemaType', count: { $sum: 1 } } },
   ]);
   ```
   to see if any schema is effectively dead.
3. Atomic PR per the migration steps above, ratchet-down W340 baseline same commit.
4. If all 3 Tier 1 ADRs (022/023/024) execute, the baseline drops by 3 entries; remaining
   baseline is Tier 2 + AuditLog. Re-evaluate AuditLog stopgap ALLOWLIST at that point.
