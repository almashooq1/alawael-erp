# ADR-021 Decision Brief — Tier 1 Duplicate Registration Stakeholder Preparation

**Type**: Research output (Cycle 4 from OPEN_ISSUES_INVENTORY.md) — prepares ADR-021 framework for the Tier 1 stakeholder meetings
**Date**: 2026-05-25
**Audience**: Tech lead + per-entity domain owners (approvals / audit / reports / workflow / transitions)
**Purpose**: Apply ADR-021's decision tree to each of the 5 Tier 1 entries with live codebase data so each meeting decides quickly

This brief complements [021-duplicate-model-registration-consolidation-strategy.md](021-duplicate-model-registration-consolidation-strategy.md). The ADR itself describes the 4-pattern framework (A/B/C/D); this brief applies the framework to each Tier 1 entry with **actual schema-by-schema comparison** + **caller surface analysis** + **per-entity meeting agenda**.

**Key insight upfront**: resolving ADR-021 ALSO resolves ADRs 022, 023, 024, 028 — all 4 are Pattern D applications of ADR-021's framework. So a single Tier 1 sprint clears 5 ADRs from the stakeholder-blocked queue.

---

## 1. Tier 1 inventory (live codebase, this commit)

| Entity               | # active registrations | Canonical candidate                                                                                                                          | Recommended pattern |    Effort    |                                                                                            Risk                                                                                            |
| -------------------- | :--------------------: | -------------------------------------------------------------------------------------------------------------------------------------------- | :-----------------: | :----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| **ApprovalRequest**  |           3            | `authorization/approvals/approval-request.model.js` (richest schema: chainId + steps + decisions + slaDeadline + currentApproverRole method) |   **D (rename)**    |  M (1 wave)  |                                MED — 2 caller groups silently using legacy `models/ApprovalRequest` (HR-only requestType+requester+comments) need migration                                |
| **AuditLog**         | 3 active (+2 archived) | `models/auditLog.model.js` (60+ event types, full audit-chain integration)                                                                   |  **D + C hybrid**   |  M (1 wave)  | MED — `database/audit-trail.js` + `routes/audit-trail-enhanced.routes.js` are defensive lookups using local schemas with DIFFERENT field names (entityType vs auditableType per CLAUDE.md) |
| **ReportTemplate**   |           3            | `models/reports/ReportTemplate.js` (canonical location)                                                                                      |   **D (rename)**    |  S (1 wave)  |     LOW — `domains/reports/services/ReportsEngine.js` uses `mongoose.model('ReportTemplate')` lookup only; `services/documents/documentReporting.engine.js` defines a different shape      |
| **WorkflowInstance** |           3            | `workflow/intelligent-workflow-engine.js` (only direct registration; other 2 are document-workflow-specific)                                 |   **D (rename)**    |  S (1 wave)  |                                                              LOW — document-workflow engines are scope-isolated to documents/                                                              |
| **TransitionPlan**   |           2            | `models/TransitionPlan.js` (canonical W361 with full lifecycle + Wave-18 invariants)                                                         |   **D (rename)**    | S (0.5 wave) |                                             LOW — `rehabilitation-services/mdt-transition-quality.js` is older snake_case style; clean rename                                              |

**Total Tier 1 cost**: ~4-5 waves to clear all 5 entries. Mostly mechanical work after stakeholder picks the canonical for each.

---

## 2. Per-entity schema divergence (decision-critical data)

### 2.1 ApprovalRequest — 3 schemas

| Location                                                                    | Schema fingerprint                                                                                                                                           | Use case                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `authorization/approvals/approval-request.model.js` (RECOMMENDED CANONICAL) | `chainId` + `resourceType` + `steps[{role, branchScope, dueHours, canDelegate, condition}]` + `decisions[]` + `slaDeadline` + method `currentApproverRole()` | Generic approval state-machine for ANY resource (per `One ApprovalRequest per (resourceType, resourceId, chainId)`) |
| `models/ApprovalRequest.js` (legacy)                                        | `requestType` + `requester` + simple `steps[]` + `comments[]`                                                                                                | HR-specific: leaves, financial requests, data edits                                                                 |
| `services/documents/documentApprovalChains.service.js` (intermediate)       | `chainId` + `steps` + `slaDeadline` (no decisions, no method)                                                                                                | Document-workflow approval chains                                                                                   |

**Decision**: Pattern D rename. Canonical = authorization (richest). Rename legacy:

- `mongoose.model('ApprovalRequest', …)` in `models/ApprovalRequest.js` → `'HrApprovalRequest'` (matches HR-specific use)
- `mongoose.model('ApprovalRequest', …)` in `documentApprovalChains.service.js` → `'DocumentApprovalRequest'`

**Risk**: HR routes querying `mongoose.model('ApprovalRequest')` are silently getting whichever schema loaded first. Need caller-audit before rename to ensure HR callers move to `HrApprovalRequest` model.

### 2.2 AuditLog — 3 active schemas

| Location                                           | Schema fingerprint                            | Use case                            |
| -------------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| `models/auditLog.model.js` (RECOMMENDED CANONICAL) | 60+ event types enum + full chain integration | Primary audit trail across platform |
| `database/audit-trail.js`                          | Local schema with `entityType` field name     | Database-layer fallback (defensive) |
| `routes/audit-trail-enhanced.routes.js`            | Local schema with `auditableType` field name  | Route-layer fallback (defensive)    |

**Decision**: Pattern D for `models/` canonical + Pattern C ALLOWLIST for the 2 defensive lookups (already in REGISTRATION_ALLOWLIST per CLAUDE.md W347). The defensive ones have DIFFERENT field names from canonical (entityType vs auditableType) — they're emergency-fallback paths that should never fire in practice. Document why, don't try to consolidate.

**Risk**: LOW. Already ALLOWLISTed as stopgap. Stakeholder decision = "formalize the ALLOWLIST decision in ADR text" rather than active code work.

### 2.3 ReportTemplate — 3 schemas

| Location                                                   | Schema fingerprint                                                                                       | Use case                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `models/reports/ReportTemplate.js` (RECOMMENDED CANONICAL) | Canonical location pattern (per ADR-021 §"typically the richest schema in the most-canonical directory") | Generic report-template registry              |
| `services/documents/documentReporting.engine.js`           | Local schema with document-specific fields                                                               | Document-workflow reporting only              |
| `domains/reports/services/ReportsEngine.js`                | NOT a registration — uses `mongoose.model('ReportTemplate')` to LOOK UP                                  | Reads from canonical; not a divergence source |

**Decision**: Pattern D rename. Canonical = `models/reports/ReportTemplate.js`. Rename `documentReporting.engine.js` registration to `'DocumentReportTemplate'`. `domains/reports/services/ReportsEngine.js` already reads from canonical — no change.

**Risk**: LOW. Document-workflow scope is isolated.

### 2.4 WorkflowInstance — 3 schemas

| Location                                                          | Schema fingerprint                             | Use case                        |
| ----------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| `workflow/intelligent-workflow-engine.js` (RECOMMENDED CANONICAL) | Generic workflow-instance                      | Platform-wide workflows         |
| `services/documents/documentWorkflow.engine.js`                   | Document-workflow-specific                     | Document approval chains        |
| `services/documents/documentWorkflowOrch.service.js`              | Orchestrator schema (likely similar to engine) | Document workflow orchestration |

**Decision**: Pattern D rename. Canonical = `workflow/intelligent-workflow-engine.js`. Rename the 2 document-specific registrations to `'DocumentWorkflowInstance'`. Verify they don't accidentally share field names that callers cross-query.

**Risk**: LOW. Document-workflow scope is isolated.

### 2.5 TransitionPlan — 2 schemas

| Location                                                 | Schema fingerprint                                   | Use case                                                 |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `models/TransitionPlan.js` (RECOMMENDED CANONICAL, W361) | Full lifecycle + Wave-18 invariants + canonical refs | W356-W370 clinical-services TransitionPlan               |
| `rehabilitation-services/mdt-transition-quality.js`      | Older snake_case style                               | MDT (multi-disciplinary team) transition-quality scoring |

**Decision**: Pattern D rename per ADR-028 already drafted. Canonical = W361. Rename legacy to `'MdtTransitionQuality'` (matches the file's actual semantic).

**Risk**: LOW. The 2 use-cases are operationally distinct (clinical transition planning vs MDT quality scoring); the same name is incidental.

---

## 3. Recommended execution sequence (lowest risk first per ADR-021 §"Decision")

| Order | Entity                         | Pattern                          | Why first                                                                                            |
| ----- | ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1     | **TransitionPlan** (ADR-028)   | D rename                         | Smallest blast radius (2 registrations, both well-scoped); proves the pattern on a contained surface |
| 2     | **ReportTemplate** (ADR-023)   | D rename                         | Document-scope isolated; canonical already reads from canonical location                             |
| 3     | **WorkflowInstance** (ADR-024) | D rename                         | Document-scope isolated; same shape as ReportTemplate cleanup                                        |
| 4     | **ApprovalRequest** (ADR-022)  | D rename                         | Needs caller-audit first (HR-specific callers silently use legacy schema); MED risk                  |
| 5     | **AuditLog**                   | C ALLOWLIST formalize + ADR text | Stakeholder formalizes the existing ALLOWLIST decision; minimal code work                            |

**After all 5**: W340 drift-guard baseline drops from 47 → ~42 entries (the 5 Tier 1 are removed; Tier 2's ~38 entries continue mechanical cleanup waves).

---

## 4. Per-entity stakeholder meeting agenda (5 × 15-30 min)

### Agenda template

Each meeting follows the same shape:

**0:00-0:05 — Brief recap** (tech lead)

- Schema divergence per §2 row
- Recommended pattern (D rename in 4 cases / C ALLOWLIST in AuditLog case)
- Caller surface — who silently uses which schema

**0:05-0:15 — Decision question(s) for this entity**

**0:15-0:20 — Close**

- Decider records: "canonical = X; renames = Y, Z; ALLOWLIST entries = none / [list]"
- Tech lead opens W4XX wave; ratchet baseline DOWN in same commit

### Per-entity decision questions

**TransitionPlan meeting** (5 min total — almost decided):

- Confirm: `models/TransitionPlan.js` (W361) is the canonical going forward, `rehabilitation-services/mdt-transition-quality.js` renames to `MdtTransitionQuality`. Y/N?

**ReportTemplate meeting** (10 min):

- Confirm canonical = `models/reports/ReportTemplate.js`
- Confirm document-engine schema becomes `DocumentReportTemplate` (separate concept; isolated callers)
- Any callers of `mongoose.model('ReportTemplate')` that EXPECT the document-engine shape? (Recommend grep before commit.)

**WorkflowInstance meeting** (10 min):

- Same shape as ReportTemplate
- Document-workflow engines isolated to `services/documents/`
- Decision: rename both document-specific registrations to `DocumentWorkflowInstance`

**ApprovalRequest meeting** (30 min — highest risk):

- Decision questions:
  - Confirm canonical = `authorization/approvals/approval-request.model.js` (richest)
  - Legacy `models/ApprovalRequest.js` HR-specific. Rename to `HrApprovalRequest`. Need to verify HR routes (likely in `routes/hr.routes.js` + `routes/leaves.routes.js` + similar) work after rename. **Caller audit BEFORE the meeting**.
  - Document-workflow `documentApprovalChains.service.js` rename to `DocumentApprovalRequest`. Confirm document-workflow callers updated.

**AuditLog meeting** (10 min):

- Confirm: `models/auditLog.model.js` is canonical, `database/audit-trail.js` + `routes/audit-trail-enhanced.routes.js` are defensive fallbacks intentionally separate
- Decision: formalize REGISTRATION_ALLOWLIST entry as PERMANENT (not stopgap) with this ADR text
- OR (alternative): rewrite the 2 defensive lookups to import canonical (closes ALLOWLIST entry, requires testing fallback paths)

---

## 5. No-regrets pre-work (autonomous-actionable today)

| #   | Item                                                                                                                                                                                                     | Mode                      | Status                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------- |
| 1   | **Caller audit for ApprovalRequest** — grep all `mongoose.model('ApprovalRequest')` lookups, classify into "expects authorization schema" vs "expects legacy HR schema". Outputs the rename-impact list. | 🔍 Claude-side autonomous | 📋 Cycle 5 candidate (Claude can ship before any meeting) |
| 2   | **Caller audit for WorkflowInstance** — same grep + classification                                                                                                                                       | 🔍 Claude-side autonomous | 📋 Cycle 5 candidate                                      |
| 3   | **Document the canonical location pattern** in CLAUDE.md ("when there are duplicate registrations, canonical = richest schema in authorization/ > intelligence/canonical/ > models/ root in that order") | 🤖 Claude-side autonomous | 📋 small commit, anytime                                  |

These ALL ship value regardless of which decision the meeting makes. If user authorizes, I can execute #1+#2 in Cycle 5.

---

## 6. Updated effort estimates (correcting ADR's "M (1 wave per Tier 1 entity = 4 waves)")

| ADR-021 original             | Corrected (this brief)                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 waves for 4 Tier 1 entries | **5 waves for 5 entries**: TransitionPlan (added by ADR-028) makes 5                                                                                          |
| Effort per entry: M          | TransitionPlan: S (0.5 wave) / ReportTemplate: S (1) / WorkflowInstance: S (1) / ApprovalRequest: M (1) / AuditLog: S (0.5, mostly ADR text) — total ~4 waves |

**Approach**: ship as 5 sequential waves over ~1 sprint. Each wave closes 1 entry + ratchets W340 baseline + closes 1 ADR (022/023/024/028 for Pattern D entries).

---

## 7. Decision template (for each per-entity meeting note-taker)

```
TIER 1 ENTITY: [ApprovalRequest | AuditLog | ReportTemplate | WorkflowInstance | TransitionPlan]
Date: 2026-MM-DD

Approver signature (domain owner):  __________________________
Tech lead (note-taker):              __________________________

Decision:
  Pattern: [ ] A consolidate  [ ] B re-export  [ ] C ALLOWLIST  [ ] D rename

Canonical location:           ____________________________
Renames (if Pattern D):
  - mongoose.model('OriginalName', …) in [file] → 'NewName'
  - mongoose.model('OriginalName', …) in [file] → 'NewName'

Caller updates needed:        ____________________________
Closes ADR (if applicable):   [ ] 022  [ ] 023  [ ] 024  [ ] 028  [ ] n/a

Next agent action (post-meeting):
  - Update docs/architecture/decisions/0XX-…md: 🟡 Proposed → ✅ Accepted with Pattern D
  - Open W4XX wave: rename + caller migration + drift-guard baseline ratchet
  - Verify all callers grep-clean of the OLD model name post-rename
```

---

## 8. Cycle 5+ candidate work

After ADR-021 Tier 1 is cleared (5 waves), the W340 drift-guard baseline drops from 47 → ~42 entries. The remaining ~42 are Tier 2 (2-file duplicates, mechanical). Each can be cleared in ~1 hour via Pattern A or B without ADR text. **Recommended**: batch 4-5 Tier 2 entries per wave, ship 10 waves over a few sessions.

---

## 9. Related

- [ADR-021 itself](021-duplicate-model-registration-consolidation-strategy.md) — the framework + Tier 1/Tier 2 distinction
- [ADR-022 ApprovalRequest](022-approval-request-pattern-d-rename-proposal.md) — Pattern D application for this entity
- [ADR-023 ReportTemplate](023-report-template-pattern-d-rename-proposal.md)
- [ADR-024 WorkflowInstance](024-workflow-instance-pattern-d-rename-proposal.md)
- [ADR-028 TransitionPlan](028-transition-plan-pattern-d-rename-proposal.md)
- W340 drift guard: `backend/__tests__/no-duplicate-model-registration-wave340.test.js` (47-entry baseline)
- [OPEN_ISSUES_INVENTORY.md](../../OPEN_ISSUES_INVENTORY.md) — this is Cycle 4 from §1
