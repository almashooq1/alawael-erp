# ADR-021 Caller Audit — ApprovalRequest + WorkflowInstance

**Type**: Pre-meeting research (No-regrets items #1 + #2 from [021-DECISION-BRIEF.md §5](021-DECISION-BRIEF.md))
**Date**: 2026-05-25
**Audience**: Approvals + Workflow domain owners (ADR-022 + ADR-024 stakeholder meetings)
**Purpose**: Eliminate the "MED risk — silent legacy caller migration" concern flagged in the decision brief by enumerating every caller of the duplicate-registered models with classification.

This audit complements [021-DECISION-BRIEF.md](021-DECISION-BRIEF.md). The brief estimated ApprovalRequest at MED risk and WorkflowInstance at LOW. The audit confirms WorkflowInstance LOW and **downgrades ApprovalRequest to LOW** based on actual caller surface (only one test file imports legacy by path; no production code uses bare `mongoose.model('ApprovalRequest')` lookup).

---

## 1. ApprovalRequest — caller classification (definitive)

### 1.1 Registrations (3 — matches decision brief §2.1)

| #   | File:line                                                  | Registration pattern                                                                            | Schema fingerprint                                                                                                                                                                   |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `authorization/approvals/approval-request.model.js:91`     | `mongoose.models.ApprovalRequest \|\| mongoose.model('ApprovalRequest', ApprovalRequestSchema)` | **CANONICAL** — chainId + resourceType + steps[{role, branchScope, dueHours, canDelegate, condition}] + decisions[] + slaDeadline + methods `currentApproverRole()` + `isBreached()` |
| 2   | `models/ApprovalRequest.js:41`                             | Same idiom                                                                                      | Legacy HR — requestType + requester + simple steps[] + comments[]                                                                                                                    |
| 3   | `services/documents/documentApprovalChains.service.js:191` | Same idiom                                                                                      | Document-workflow — chainId + steps + slaDeadline (no decisions, no methods)                                                                                                         |

### 1.2 External callers (every caller in the codebase, classified)

| File:line                                                         | How it accesses the model                                                                                                                   | Schema it expects                    | Action needed for Pattern D rename                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `tests/unit/ApprovalRequest.model.test.js:86`                     | `require('../../models/ApprovalRequest')` (path-based)                                                                                      | Legacy HR                            | **NONE** — require path stays; only the model NAME registered inside `models/ApprovalRequest.js` changes |
| `routes/approvalRequests.routes.js`                               | (no model lookup — STUB)                                                                                                                    | n/a                                  | **NONE** — this route file returns hardcoded `{ success: true, data: [] }`; doesn't query any model      |
| `authorization/approvals/approvals.routes.js:17,39,60,70,109,135` | Dependency-injected: `buildRouter({ ApprovalRequestModel, engine, audit })`                                                                 | Whichever model the caller passes in | **NONE** — DI pattern; agnostic to the model's registered name                                           |
| `services/documentApprovalService.js:144,419,471,530`             | (no model lookup — uses local `createApprovalRequest`/`getApprovalRequest`/`getApprovalRequests`/`cancelApprovalRequest` method names only) | n/a                                  | **NONE** — only the method names contain the string "ApprovalRequest"; no Mongoose lookup                |
| `authorization/approvals/engine.js`                               | (no registration, no lookup — operates on injected `ApprovalRequest` object)                                                                | Caller-provided                      | **NONE** — operates on the parameter, not on a Mongoose lookup                                           |

**Note**: `app.js:1195` + `services/reporting/*` + `__tests__/report-*` all reference `ReportApprovalRequest` — a **different** model entirely (per `models/ReportApprovalRequest.js`). Not in this audit's scope.

### 1.3 Verdict for ApprovalRequest

- **Risk reclassification**: MED → **LOW**
- **Reason**: Zero production code paths perform bare `mongoose.model('ApprovalRequest')` lookup. The 3 registrations are entirely file-local (each uses `mongoose.models.X || mongoose.model('X', ...)` and consumes the result via a local const in the same file).
- **Pre-rename caller migration needed**: ZERO files. The test file (`tests/unit/ApprovalRequest.model.test.js`) imports by file path (`require('../../models/ApprovalRequest')`), so it stays correct after the rename since the rename only changes the string passed to `mongoose.model(...)`, not the file path.
- **Pattern D rename steps** (when approved):
  1. `models/ApprovalRequest.js:41` — change string `'ApprovalRequest'` → `'HrApprovalRequest'`
  2. `services/documents/documentApprovalChains.service.js:191` — change string `'ApprovalRequest'` → `'DocumentApprovalRequest'`
  3. Update W340 baseline — remove `ApprovalRequest` from `KNOWN_DUPLICATE_REGISTRATIONS`
  4. Update the brief's §2.1 risk rating
- **Meeting time saved**: 30 min → 10 min. The ApprovalRequest meeting becomes a confirmation, not a discussion of caller-migration scope.

---

## 2. WorkflowInstance — caller classification (definitive)

### 2.1 Registrations (**4 found** — decision brief stated 3)

| #   | File:line                                                                              | Registration pattern                                                                      | Notes                                                                                                                  |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | `workflow/intelligent-workflow-engine.js:371`                                          | `mongoose.model('WorkflowInstance', WorkflowInstanceSchema)`                              | **CANONICAL** — 11 importers across `routes/workflow*.routes.js` + `workflow/workflow-routes.js` + `workflow/index.js` |
| 2   | `workflow/workflow-engine.js:185`                                                      | `connection.model('WorkflowInstance', WorkflowInstanceSchema)` (**NOT** `mongoose.model`) | **DEAD CODE** — 0 importers across entire codebase (verified via `require('workflow/workflow-engine')` grep)           |
| 3   | `services/documents/documentWorkflowOrch.service.js:171`                               | `mongoose.models.WorkflowInstance \|\| mongoose.model(...)` idiom                         | Document-workflow orchestrator scope                                                                                   |
| 4   | `services/documents/documentWorkflow.engine.js:274` (plus internal lookup at line 316) | Same idiom                                                                                | Document-workflow engine scope                                                                                         |

### 2.2 NEW FINDING — W340 drift-guard blind spot

Registration #2 above (`workflow/workflow-engine.js:185`) uses `connection.model('WorkflowInstance', ...)` — the per-connection registration pattern. The W340 drift guard at `backend/__tests__/no-duplicate-model-registration-wave340.test.js` scans only:

- `mongoose.model(...)` direct registrations
- Helper-wrapped registrations through `reg/getOrCreate/registerModel/ensureModel/defineModel`

It does NOT scan `connection.model(...)` or `conn.model(...)` or `db.model(...)`. There are **16 other files** in the codebase using the `connection|conn|db.model(` pattern:

```text
backend/students/student-service.js
backend/students/report-scheduler-service.js
backend/workflow/workflow-engine.js
backend/vehicles/vehicle-service.js
backend/vehicles/student-transport-service.js
backend/vehicles/saudi-vehicle-service.js
backend/vehicles/saudi-traffic-service.js
backend/vehicles/rehabilitation-transport-service.js
backend/communication/whatsapp-service.js
backend/communication/sms-service.js
backend/communication/electronic-directives-service.js
backend/communication/email-service.js
backend/communication/administrative-communications-service.js
backend/permissions/permission-service.js
backend/auth/otp-service.js
backend/infrastructure/migrationRunner.js
```

Some of these may register models that ALSO exist in `models/*` — hidden duplicates not in the W340 baseline.

**Recommended drift-guard extension** (separate W4XX wave):

1. Extend W340 regex to also match `\w+\.model\(\s*['\"]\w+['\"]` (catches `connection.model`, `conn.model`, `db.model`, plus any other variable-named connection)
2. Re-run the duplicate scan; expect the baseline to grow (likely +5 to +15 entries)
3. Each new entry follows the same Pattern A/B/C/D framework from ADR-021

### 2.3 External callers (every caller of `'WorkflowInstance'` in the codebase)

| File:line                                           | How it accesses the model                                                   | Action needed                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `routes/workflow.routes.js:19`                      | `require('../workflow/intelligent-workflow-engine')` destructure            | **NONE** — already on canonical                                                           |
| `routes/workflowBatch.routes.js:20`                 | Same                                                                        | **NONE**                                                                                  |
| `routes/workflowCalendar.routes.js:14`              | Same                                                                        | **NONE**                                                                                  |
| `routes/workflowFavorites.routes.js:16`             | Same                                                                        | **NONE**                                                                                  |
| `routes/workflowSavedReports.routes.js:23`          | Same                                                                        | **NONE**                                                                                  |
| `routes/workflowStats.routes.js:19`                 | Same                                                                        | **NONE**                                                                                  |
| `routes/workflowTags.routes.js:18`                  | Same                                                                        | **NONE**                                                                                  |
| `workflow/workflow-routes.js:16`                    | Same                                                                        | **NONE**                                                                                  |
| `workflow/index.js:12`                              | Same                                                                        | **NONE**                                                                                  |
| `services/documents/documentWorkflow.engine.js:316` | `mongoose.model('WorkflowInstance')` lookup in same file as registration #4 | UPDATE: change string to match the renamed registration                                   |
| `tests/unit/documentWorkflow.engine.test.js:65,101` | `mongoose.model('WorkflowInstance')` lookup                                 | UPDATE: change string to `'DocumentWorkflowInstance'` after rename (2 sites in same file) |

### 2.4 Verdict for WorkflowInstance

- **Risk reclassification**: LOW → **LOW** (confirmed, but with new dead-code finding)
- **Pattern D rename steps** (when approved):
  1. **DELETE** `workflow/workflow-engine.js` entirely (701 LOC, 0 importers) — closes registration #2 and removes the W340 blind spot for this entity
  2. `services/documents/documentWorkflowOrch.service.js:171` — change string `'WorkflowInstance'` → `'DocumentWorkflowInstance'`
  3. `services/documents/documentWorkflow.engine.js:274,316` — same rename in both sites
  4. `tests/unit/documentWorkflow.engine.test.js:65,101` — update mock target to `'DocumentWorkflowInstance'`
  5. Update W340 baseline — remove `WorkflowInstance` from `KNOWN_DUPLICATE_REGISTRATIONS`
- **Recommended follow-up** (separate wave): Extend W340 regex to scan `connection.model` pattern across all 16 affected files.

---

## 3. Combined meeting recommendation

The decision brief's recommended sequence (TransitionPlan → ReportTemplate → WorkflowInstance → ApprovalRequest → AuditLog) stands, but with risk adjustments from this audit:

| Order | Entity           | Brief's risk              | Audit-confirmed risk                              | Notes                                                                              |
| ----- | ---------------- | ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | TransitionPlan   | LOW                       | LOW (not audited; brief's analysis still applies) |                                                                                    |
| 2     | ReportTemplate   | LOW                       | LOW (not audited)                                 |                                                                                    |
| 3     | WorkflowInstance | LOW                       | **LOW + DEAD-CODE WIN**                           | Delete `workflow/workflow-engine.js` as part of the rename — bonus 701 LOC cleanup |
| 4     | ApprovalRequest  | MED                       | **LOW (downgraded)**                              | Zero caller migration needed; meeting becomes a confirmation                       |
| 5     | AuditLog         | n/a (ALLOWLIST formalize) | n/a                                               |                                                                                    |

**Stakeholder meeting time estimate**: was ~95 min total (5 + 10 + 10 + 30 + 10 = 65 min discussion + 30 min Q&A); now ~50 min total (5 + 10 + 10 + **10** + 10 + 5 dead-code-Q). Significant time saved.

---

## 4. New autonomous follow-ups discovered

These were NOT in the decision brief but emerged from the audit:

| #    | Item                                                                                                  | Effort                      | Impact                                                                               | Mode       |
| ---- | ----------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| AF-1 | Delete `workflow/workflow-engine.js` (701 LOC, 0 importers, has dead duplicate registration)          | XS                          | -701 LOC + closes W340 blind spot                                                    | 🤖         |
| AF-2 | Extend W340 drift guard regex to match `\w+\.model\(` pattern (catches `connection.model` + variants) | S (~30 min)                 | Closes drift-guard blind spot across 16 files; expect baseline to grow ~5-15 entries | 🤖         |
| AF-3 | Audit `routes/approvalRequests.routes.js` — currently a stub returning hardcoded JSON                 | S (decide: build or delete) | Currently misleading — endpoint exists but does nothing real                         | 🔍 then 🤝 |

Each can ship before any stakeholder meeting fires.

---

## 5. Related

- [021-DECISION-BRIEF.md](021-DECISION-BRIEF.md) — the parent decision brief whose §5 commissioned this audit
- [021-duplicate-model-registration-consolidation-strategy.md](021-duplicate-model-registration-consolidation-strategy.md) — the ADR framework
- [022-approval-request-pattern-d-rename-proposal.md](022-approval-request-pattern-d-rename-proposal.md) — Pattern D application this audit informs
- [024-workflow-instance-pattern-d-rename-proposal.md](024-workflow-instance-pattern-d-rename-proposal.md) — Pattern D application this audit informs
- `backend/__tests__/no-duplicate-model-registration-wave340.test.js` — the drift guard with the `connection.model` blind spot
- [OPEN_ISSUES_INVENTORY.md](../../OPEN_ISSUES_INVENTORY.md) §3 — adds AF-1, AF-2, AF-3 to the autonomous backlog
