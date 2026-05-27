# ADR-032 — Divergent-Schema Cluster Disposition (documents-pro + EnterprisePro + rehab-services + workflow-engine) (🟡 Proposed)

**Date**: 2026-05-27
**Type**: ADR (decision-required)
**Mode**: 👤 then 🤝 (stakeholder decides direction; agent executes)
**Decider**: Tech lead + per-domain owners (documents / facilities-HR / rehab-services / workflow)
**Effort**: A (consolidate-to-canonical) ~10-15 days · B (Pattern D rename) ~5-7 days per cluster · C (defer) 0 days
**Supersedes**: extends ADR-021 (4-pattern framework)

---

## Context

The W340 drift guard's `KNOWN_DUPLICATE_REGISTRATIONS` baseline (~34 entries
post-AF-3) holds three classes of duplicate Mongoose model registration:

1. **Defensive fallbacks** (safe) — moved to `REGISTRATION_ALLOWLIST` over W341–W347 + 2026-05-25 (Referral, Task, AuditLog, BranchSetting, GlobalSetting, LifecyclePolicy, Consent).
2. **Dormant-module duplicates** — covered by ADR-030 (vehicles/ + communication/ + permissions/).
3. **Divergent-schema duplicates** (P1, this ADR) — **two LIVE registrations for one model name, with DIFFERENT schemas, both wired through production routes**.

A 2026-05-27 full-baseline audit (memory note: `repo/w340-baseline-audit-2026-05-27.md`) verified that ~17 of the remaining ~34 baseline entries fall in class 3. They share a single root cause:

> **Canonical models were added at `backend/models/<X>.js` after the original
> service-layer schemas were written; the service-layer schemas were never
> deleted or re-pointed to canonical.**

This ADR proposes one disposition per affected cluster.

---

## Affected entries (4 sub-clusters)

### Sub-cluster 1: `documents-pro` (12 entries)

| Model name              | Canonical (winner candidate)                                  | Divergent duplicate                                 | Divergence sample                                            |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| DocumentAccessLog       | `models/DocumentAccessLog.js`                                 | `services/documents/documentSharing.service.js:121` | action enum 9 values vs 5 different values                   |
| DocumentShare           | `models/DocumentShare.js`                                     | `services/documents/documentSharing.service.js:95`  | shareToken/sharedWith/isActive vs shareLink/recipientId/status (entirely different field names) |
| DocumentVersion         | `models/DocumentVersion.js`                                   | `services/documents/document*.service.js`           | divergent (sample-confirmed pattern)                         |
| FormTemplate            | `models/FormTemplate.js:561`                                  | `services/documents/documentForms.service.js:156`   | confirmed divergent shape                                    |
| FormSubmission          | `models/FormSubmission.js:316`                                | `services/documents/documentForms.service.js:204`   | confirmed divergent shape                                    |
| ImportExportJob         | `models/ImportExportJob.js:351`                               | `services/documents/documentImportExport.service.js:91` | canonical ~30 fields + sub-schemas vs service ~10 fields, different collection (`'import_export_jobs'`) |
| DigitalSignature        | (canonical TBD)                                               | `services/documents/documentSignature.service.js:170` + `documentDigitalCert.service.js:158` | two service-side schemas                                     |
| NotificationPreferences | `models/operations/NotificationPreferences.model.js:100`      | `services/documents/documentNotification.service.js:311` | divergent                                                    |
| WorkflowInstance        | (covered also by sub-cluster 4)                               | `services/documents/documentWorkflow*.service.js`   | see sub-cluster 4                                            |
| WorkflowDefinition      | (covered also by sub-cluster 4)                               | `services/documents/documentWorkflowOrch.service.js:169` | see sub-cluster 4                                            |
| ComplianceAlert         | `models/ComplianceAlert.js` (assumed canonical)               | `models/EnterprisePro.js:~770` (also sub-cluster 2) | cross-cluster overlap                                        |
| CalendarEvent           | `models/CalendarEvent.js` (assumed canonical)                 | `models/EnterprisePro.js:~770` (also sub-cluster 2) | cross-cluster overlap                                        |

**Live wiring**: `routes/registries/documents.registry.js:37-42` mounts `api/routes/documents-pro-{phase3,phase5,phase7,extended}.routes.js` → service-side schemas are reached at runtime.

### Sub-cluster 2: EnterprisePro mega-file (~11 entries)

`models/EnterprisePro.js:~760` + `models/EnterpriseProPlus.js:986` use helper functions (`reg()` / `getOrCreate()`) to register a flat catalog of facility / HR / vendor / strategic-planning models inline:

- EnterprisePro: ComplianceAlert, ReportTemplate, ReportExecution, CalendarEvent, RoomBooking, CRM\*, Warehouse, WarehouseBin, StockLevel, StockAlert, StockTransferOrder
- EnterpriseProPlus: JobPosting, Candidate, JobApplication, InterviewSchedule, Facility, SpaceBooking, LeaseContract, UtilityReading, Vendor, RFQ, VendorEvaluation, ITIncident, ITAsset, ServiceCatalogItem, ChangeRequest, SafetyIncident, SafetyInspection, HazardRegister, PPERecord, StrategicObjective

**Live wiring**: `routes/enterprisePro.routes.js:41` + `routes/enterpriseProPlus.routes.js:41` destructure these models.

**Verified divergence sample (RoomBooking)**:

| Field                                                    | `models/RoomBooking.js` (canonical)   | `models/EnterprisePro.js:348` |
| -------------------------------------------------------- | ------------------------------------- | ----------------------------- |
| room                                                     | `ObjectId ref:'Room'`                 | `String`                      |
| time representation                                      | `bookingDate:Date + startTime:String` | `start:Date + end:Date`       |
| status enum                                              | confirmed/pending/cancelled/completed | reserved/confirmed/cancelled/in_use |
| event link                                               | (none)                                | `ref:'CalendarEvent'`         |

### Sub-cluster 3: rehab-services (3 entries)

| Model name      | Canonical                                                              | Divergent duplicate                                                                  | Divergence sample                                            |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| GoalBank        | `models/GoalBank.js`                                                   | `rehabilitation-services/goals-bank-service.js:68`                                   | 5 SHOUTING_CASE domain enum vs 17 snake_case + 14 extra fields |
| TherapyProtocol | `rehabilitation-services/advanced-therapy-protocols.js:74` (defensive) | `rehabilitation-services/aac-therapy-protocols.js:262` (**NON-defensive — OverwriteModelError risk**) | load-order-dependent crash                                   |
| MDTMeeting      | `models/MDTCoordination.js:449`                                        | `rehabilitation-services/mdt-transition-quality.js:138`                              | two-site dupe                                                |

### Sub-cluster 4: workflow-engine (2 entries)

| Model name         | Site A                                                  | Site B                                              | Notes                                                              |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| WorkflowDefinition | `workflow/intelligent-workflow-engine.js:370`           | `services/documents/documentWorkflowOrch.service.js:169` | both engines may legitimately need separate definition shapes      |
| WorkflowInstance   | `workflow/intelligent-workflow-engine.js:371`           | `services/documents/documentWorkflow.engine.js:274` + `documentWorkflowOrch.service.js:171` | three sites — possibly the most fragmented entry in the baseline   |

Workflow-engine sub-cluster overlaps with the ADR-024 ApprovalRequest/WorkflowInstance Pattern D proposal.

---

## Runtime risk (why this is P1)

`mongoose.models.X || mongoose.model('X', schema)` defensive guards ensure no
`OverwriteModelError` (most of the time — `aac-therapy-protocols.js:262` is a
naked `mongoose.model()` so it WILL crash if loaded after the defensive site).
But the defensive guard **does NOT** protect against schema divergence:

1. **Whichever registration site loads first wins** the `mongoose.models.X` cache.
2. **The losing site's queries** run against the winner's schema — fields the
   loser declares that the winner doesn't have are stripped by mongoose-strict
   on write, and queries with loser-only filters silently return zero results.
3. **Load order** depends on `require()` graph — refactors can flip the winner
   without any test detecting it.

Same hazard class as the NotificationLog P1 documented in W340 line ~155.

---

## Decision options

### Option A — Consolidate to canonical (recommended for sub-clusters 1 + 3)

For each affected model name:

1. Pick the canonical `models/<X>.js` schema (richer schema wins per ADR-021 §"Canonical file-location priority").
2. Migrate the service-side schema's unique fields INTO the canonical schema (additive — `required:false` on new fields to avoid breaking existing docs).
3. In each service file, replace the local `mongoose.model(...)` registration with `mongoose.model('X')` lookup.
4. Run a migration script to backfill renamed fields if naming diverges (e.g. DocumentShare `shareLink` → `shareToken`).
5. Drop the service-side schema definition + all its imports.
6. Remove the entry from W340 baseline.

**Effort per entry**: 0.5–2 days (mostly schema-merge + caller audit).
**Risk**: medium — backfill migration touches production data.
**Best for**: sub-cluster 1 (documents-pro) + sub-cluster 3 (rehab-services).

### Option B — Pattern D rename (recommended for sub-cluster 2 + 4)

For mega-file + multi-engine cases where consolidation is impractical:

1. Rename the EnterprisePro local model: `RoomBooking` → `EnterpriseRoomBooking`, `Vendor` → `EnterpriseVendor`, etc.
2. Rename collection accordingly (or keep collection name via `collection:` option).
3. Update routes/enterprisePro.routes.js destructure + all internal references.
4. For workflow-engine: `WorkflowInstance` → `DocWorkflowInstance` in documents.service, OR vice versa.
5. Remove entry from W340 baseline (the renames now register different names, no duplicate).

**Effort per entry**: 0.5–1 day.
**Risk**: low (additive — old data accessible via old model name preserved).
**Best for**: sub-cluster 2 (EnterprisePro mega-file) + sub-cluster 4 (workflow-engine).

### Option C — Defer (status quo)

Keep entries in `KNOWN_DUPLICATE_REGISTRATIONS` baseline; rely on the existing cluster-comment documentation in `__tests__/no-duplicate-model-registration-wave340.test.js` to warn future engineers.

**Risk**: continued silent schema-divergence bugs. NO net debt reduction. Aspirational rather than actionable.

### Option D — Hybrid (likely real path)

Apply Option A to sub-cluster 3 (rehab-services — smallest scope, highest urgency due to `aac-therapy-protocols.js` OverwriteModelError risk) FIRST. Then per-sub-cluster decision for the rest.

---

## Recommendation

**Option D (Hybrid)** sequenced as:

1. **Urgent** (next sprint): consolidate `TherapyProtocol` — fixes the OverwriteModelError landmine in `aac-therapy-protocols.js:262`.
2. **High** (next 1–2 sprints): consolidate sub-cluster 3 remainder (GoalBank, MDTMeeting) — small scope, immediate W340 ratchet-down win.
3. **Medium** (1 quarter): consolidate sub-cluster 1 (documents-pro) — 10 entries, biggest impact, needs documents-domain owner.
4. **Medium** (1 quarter): Pattern D rename sub-cluster 2 (EnterprisePro mega-file) — 11 entries, lower risk than consolidation since collections diverge anyway.
5. **Coordinate with ADR-024**: sub-cluster 4 (WorkflowInstance/Definition) — already in flight under ADR-024.

---

## Out of scope

- Restructuring `models/EnterprisePro.js` + `models/EnterpriseProPlus.js` themselves (mega-files >1500 LOC). Splitting them into proper domain modules is a separate decision — see future ADR.
- Migrating routes/documents-pro-\*.routes.js to canonical model imports without schema-consolidation first (would just move the divergence to the route layer).
- Auditing whether the canonical `models/<X>.js` shape is right; this ADR assumes canonical wins per ADR-021 priority order and accepts merge-from-service.

---

## Open questions

- **Q1** — For documents-pro sub-cluster: are the divergent service-side fields (`shareLink`, `recipientId` on DocumentShare; the slim ImportExportJob shape) intentionally simpler for documents-domain UX, or vestigial? If intentional, Pattern D rename is right; if vestigial, consolidate.
- **Q2** — For workflow-engine sub-cluster: is there a legitimate need for documents.service to have its own WorkflowInstance shape distinct from the platform-wide intelligent-workflow-engine? If yes → Pattern D; if no → consolidate via ADR-024.
- **Q3** — Are any of the EnterprisePro models (RoomBooking, Vendor, Facility, etc.) actually queried via the canonical `mongoose.model('X')` lookup from outside the EnterprisePro routes? Caller-audit needed to size Option A risk.

---

## References

- W340 drift guard + cluster comments: [backend/\_\_tests\_\_/no-duplicate-model-registration-wave340.test.js](../../../backend/__tests__/no-duplicate-model-registration-wave340.test.js)
- 2026-05-27 audit memory note: `repo/w340-baseline-audit-2026-05-27.md`
- ADR-021 (framework): [021-duplicate-model-registration-consolidation-strategy.md](021-duplicate-model-registration-consolidation-strategy.md)
- ADR-024 (WorkflowInstance Pattern D): [024-workflow-instance-pattern-d-rename-proposal.md](024-workflow-instance-pattern-d-rename-proposal.md)
- ADR-030 (dormant modules, related class): [030-dormant-module-disposition.md](030-dormant-module-disposition.md)
- Session commits: `2b8a019a0`, `9fccc8c2d` (cluster documentation)
