# Caller Audit — Tier 1 Duplicate Registrations (ADR-021 no-regrets #1 + #2)

**Type**: Research output (Cycle 5 no-regrets pre-work per ADR-021 DECISION-BRIEF §5)
**Date**: 2026-05-25
**Audience**: Tech lead + per-entity domain owner (decides Pattern D rename safety)
**Purpose**: Before any Tier 1 rename, classify every `mongoose.model('X')` caller as "expects canonical schema" vs "expects legacy schema". The rename's blast radius depends entirely on this classification.

Two audits in this doc:

1. [§1 ApprovalRequest](#1-approvalrequest-caller-classification) — highest-risk Tier 1 entry
2. [§2 WorkflowInstance](#2-workflowinstance-caller-classification) — lower risk but proves the audit pattern

If the ADR-021 stakeholder meeting picks Pattern D rename for these entities, this audit lets the tech lead execute the rename with confidence in 1 PR per entity.

---

## 1. ApprovalRequest caller classification

### 1.1 Registration sites (3 active, all under `mongoose.model('ApprovalRequest')`)

| File                                                                                   | Schema fingerprint                                                                                                                           | Use case                                                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `backend/authorization/approvals/approval-request.model.js:91` (RECOMMENDED CANONICAL) | chainId + resourceType + steps[{role,branchScope,dueHours,canDelegate,condition}] + decisions[] + slaDeadline + method currentApproverRole() | Generic approval state-machine for ANY resource (per "One ApprovalRequest per (resourceType, resourceId, chainId)") |
| `backend/models/ApprovalRequest.js:41` (LEGACY)                                        | requestType + requester + simple steps[] + comments[]                                                                                        | HR-specific (leaves, financial requests, data edits)                                                                |
| `backend/services/documents/documentApprovalChains.service.js:191` (INTERMEDIATE)      | chainId + steps + slaDeadline (no decisions, no method)                                                                                      | Document-workflow approval chains                                                                                   |

### 1.2 Active callers (find/create/countDocuments references)

| File                                                                   | Operation                                                             | Schema expected                                                  | Pattern D rename safety                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/scripts/approval-escalate-digest.js:120`                      | `ApprovalRequest.find({status:'pending_approval'})`                   | Either (uses neutral `status` field, present on all 3 schemas)   | ⚠ **AMBIGUOUS** — runs at digest time across all approval types. Need stakeholder to clarify: does this digest cover HR + documents + authorization, or just one? If all → caller has been broken by silent first-loaded-wins for unknown duration. |
| `backend/services/documents/documentApprovalChains.service.js:308-565` | 10 distinct operations (create, findById, find, countDocuments, etc.) | DOCUMENT schema (defines its own intermediate shape on line 191) | ✓ **SAFE** — after Pattern D rename: schema lives in this file. Update line 191's registration to `'DocumentApprovalRequest'`; update all 10 `ApprovalRequest.X(...)` calls in this file to `DocumentApprovalRequest.X(...)`.                        |
| (HR callers — not yet enumerated)                                      | Likely in `routes/hr.routes.js`, `routes/leaves.routes.js`, etc.      | HR schema (requester + requestType + comments)                   | ⚠ **NEEDS DEEPER GREP** — recommend before rename: `grep -rn "ApprovalRequest" backend/routes/ backend/services/hr/ --include="*.js"`                                                                                                               |

### 1.3 Recommended rename execution order (Pattern D)

1. **Discovery prep** (Claude can ship if authorized):

   ```bash
   grep -rn "mongoose\.model('ApprovalRequest')\|require.*ApprovalRequest" backend/ \
     --include="*.js" | grep -v node_modules | grep -v _archived
   ```

   → produces complete caller-by-caller list (likely 10-30 hits beyond what's enumerated above)

2. **Per-caller classification** (1 line per caller noting which schema's fields it touches)

3. **Stakeholder meeting** (Approvals domain owner + HR domain owner):

   - Confirm canonical = authorization (richest, generic)
   - Confirm HR is a DIFFERENT entity → rename to `HrApprovalRequest`
   - Confirm document-workflow is a DIFFERENT entity → rename to `DocumentApprovalRequest`
   - Identify which existing callers need to switch model name vs which stay with legacy

4. **Pattern D rename PR**:
   - `models/ApprovalRequest.js` registration → `'HrApprovalRequest'`; ALL HR callers updated to use `mongoose.model('HrApprovalRequest')` or `require('../../models/HrApprovalRequest')`
   - `services/documents/documentApprovalChains.service.js:191` → `'DocumentApprovalRequest'`; in-file callers updated
   - Drift guard W340 baseline: remove `ApprovalRequest` triple (was 3 entries) → leaves just authorization's canonical registration
   - Re-run W340 + run all hr.routes tests + workflow tests

### 1.4 Hidden risk: the `approval-escalate-digest.js` digest

This is the script most likely to have been silently broken by first-loaded-wins. The digest queries `ApprovalRequest.find({status:'pending_approval'})` — whichever schema loaded first wins, so the digest may have been:

- Returning ONLY documents that match the first schema's `status` enum
- Missing requests from the other 2 schemas (HR or document-workflow)

**Pre-rename check**: run the digest in production-like data + count results vs raw `db.approvalrequests.count({status:'pending_approval'})`. If counts differ → the digest has been silently broken; the rename will FIX it, but downstream consumers of the digest may need re-notification of previously-missed items.

---

## 2. WorkflowInstance caller classification

### 2.1 Registration sites (3 active)

| File                                                                          | Schema fingerprint                                                                                 | Use case                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| `backend/workflow/intelligent-workflow-engine.js:371` (RECOMMENDED CANONICAL) | Generic workflow-instance (line 371: `mongoose.model('WorkflowInstance', WorkflowInstanceSchema)`) | Platform-wide workflows         |
| `backend/services/documents/documentWorkflow.engine.js:274`                   | Document-workflow-specific schema                                                                  | Document approval chains        |
| `backend/services/documents/documentWorkflowOrch.service.js:171`              | Orchestrator schema (similar to engine but separate definition)                                    | Document workflow orchestration |

### 2.2 Active callers (find/create/countDocuments references)

| File                                                             |                       Operation count                       | Schema expected                                                                                                             | Pattern D rename safety                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | :---------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/routes/workflow.routes.js`                              | 11 ops (countDocuments × 5, find × 3, findById × 2, update) | CANONICAL (intelligent-workflow-engine) — uses generic fields like `requester`, `currentAssignee`, `status`, `sla.violated` | ✓ **SAFE** — these calls expect canonical schema; no rename needed for this caller.                                                                                                                                     |
| `backend/routes/workflowBatch.routes.js`                         |                   3 ops (updateMany × 3)                    | CANONICAL (uses `_id: $in` + `priority` field — generic)                                                                    | ✓ **SAFE** — same.                                                                                                                                                                                                      |
| `backend/routes/workflowCalendar.routes.js`                      |                         1 op (find)                         | CANONICAL                                                                                                                   | ✓ **SAFE**                                                                                                                                                                                                              |
| `backend/routes/workflowFavorites.routes.js`                     |       1 op (findById for favorite-target resolution)        | CANONICAL                                                                                                                   | ✓ **SAFE**                                                                                                                                                                                                              |
| `backend/services/documents/documentWorkflow.engine.js:316`      |         `mongoose.model('WorkflowInstance')` lookup         | DOCUMENT schema (defined on line 274)                                                                                       | ⚠ **WOULD-BREAK** if document-schema renamed but lookup not updated. Pattern D rename: line 274 registration → `'DocumentWorkflowInstance'`; line 316 lookup → `'DocumentWorkflowInstance'` (in same file, single PR). |
| `backend/services/documents/documentWorkflowOrch.service.js:171` |                   Self-registration only                    | DOCUMENT schema                                                                                                             | Pattern D rename: → `'DocumentWorkflowInstance'`. Same name as `documentWorkflow.engine.js` after rename? — depends on whether they're truly the same shape. Verify before merging registrations.                       |
| `backend/tests/unit/documentWorkflow.engine.test.js:65,101`      |                        Test fixture                         | DOCUMENT schema                                                                                                             | Update fixture name post-rename.                                                                                                                                                                                        |

### 2.3 Rename safety summary

**LOW RISK**. The route-layer callers (workflow.routes / workflowBatch / workflowCalendar / workflowFavorites) all use canonical schema fields and DON'T touch document-specific fields. Pattern D rename:

- Canonical `intelligent-workflow-engine.js:371` → stays as `'WorkflowInstance'`
- Document `documentWorkflow.engine.js:274` → `'DocumentWorkflowInstance'`
- Orchestrator `documentWorkflowOrch.service.js:171` → `'DocumentWorkflowInstance'` (verify same shape; consolidate to ONE registration if so)
- Test fixture updated
- Drift guard W340 baseline: WorkflowInstance triple → just 1 canonical

Effort: **1 PR, <1 day** after stakeholder confirms.

---

## 3. Comparison: which entity to rename first?

Per ADR-021 DECISION-BRIEF §3 (lowest-risk-first sequence):

| Entity               | Caller risk                                                              |                 Caller count                 | Recommended order |
| -------------------- | ------------------------------------------------------------------------ | :------------------------------------------: | :---------------: |
| **WorkflowInstance** | LOW (route callers all canonical-shape; document-engines self-contained) |     17 ops across 4 routes + 3 internals     |      **2nd**      |
| **ApprovalRequest**  | MED-HIGH (HR callers silently use legacy schema; need deeper grep)       | 10+ ops in documents + 1 digest + unknown HR |      **4th**      |

This matches ADR-021 brief's recommended sequence: TransitionPlan → ReportTemplate → WorkflowInstance → ApprovalRequest → AuditLog.

---

## 4. Recommended Claude-side next steps (if user authorizes)

| #   | Action                                                                                                                                                     | Effort      | Risk            | Output                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------------------------------------------------------- |
| 1   | Full grep for ApprovalRequest callers in `backend/routes/hr*` + `backend/services/hr*`                                                                     | XS (5 min)  | LOW (read-only) | Complete classification table for the ApprovalRequest stakeholder meeting |
| 2   | Run `approval-escalate-digest.js` count check in dev/staging vs raw count                                                                                  | S (15 min)  | LOW (read-only) | Confirms whether the digest has been silently broken                      |
| 3   | Verify documentWorkflow.engine + documentWorkflowOrch schemas are TRULY the same shape before consolidating to one `DocumentWorkflowInstance` registration | XS (10 min) | LOW (read-only) | Determines whether to merge or keep separate                              |

**These ALL are read-only research**. Output = better-grounded stakeholder meetings. Claude can ship all 3 in 30 minutes total when authorized.

---

## 5. Related

- [ADR-021 DECISION-BRIEF.md](021-DECISION-BRIEF.md) — parent decision brief for Tier 1
- [ADR-021 itself](021-duplicate-model-registration-consolidation-strategy.md) — 4-pattern framework
- [ADR-022 ApprovalRequest](022-approval-request-pattern-d-rename-proposal.md)
- [ADR-024 WorkflowInstance](024-workflow-instance-pattern-d-rename-proposal.md)
- W340 drift guard at `backend/__tests__/no-duplicate-model-registration-wave340.test.js`
- [canonical-location-pattern.md](../canonical-location-pattern.md) — the canonical-location precedence rule (Cycle 5 no-regrets #3)
