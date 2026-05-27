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

### Sub-cluster 5: case-mismatch silent duplicates (newly discovered 2026-05-27)

A separate hazard class found while sweeping naked `mongoose.model()` registrations after the initial ADR draft. Same divergent-schema pattern as sub-clusters 1+3, but **invisible to the W340 drift guard** because the two registration sites use different *capitalizations* of the same logical name — Mongoose treats them as two unrelated models, so no duplicate-name violation fires.

| Logical entity | Canonical name + site                                                                                                                    | Variant name + site                                                                  | Hazard                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAC profile    | `'AacProfile'` — `models/AacProfile.js:201` (W263 canonical; live via `services/aacProfile.service.js` + `routes/aac.routes.js` + W263 tests) | `'AACProfile'` — `rehabilitation-services/aac-therapy-protocols.js:127` (live via `routes/registries/clinical-assessment.registry.js:159`) | Two completely different schemas (W263 camelCase + Rowland Communication Matrix + Wave-18 invariants vs legacy snake_case + embedded vocabulary_bank/communication_boards/progress_log). Zero `ref:'AACProfile'` callers in codebase; legacy variant CRUD'd only by its in-file router (~13 endpoints). |

**Why W340 missed it**: the guard scans for case-sensitive collisions on `mongoose.model('X', schema)` registrations. `'AacProfile'` and `'AACProfile'` are two distinct cache keys → no W340 violation, but the same architectural class as sub-cluster 3 (canonical + divergent legacy service-side schema, both live).

**PowerShell audit caveat**: PowerShell regex matching is case-insensitive by default. Initial sweep showed `AACProfile` and `AacProfile` as a 2-site duplicate; only single-file grep on the canonical confirmed the casing actually differs. **Lesson**: any "X is registered in 2+ sites" finding from PowerShell needs case-sensitive re-verification before triage.

**Drift-guard recommendation**: extend W340 with a case-insensitive cross-check pass — collect `mongoose.model(name, ...)` calls grouped by `name.toLowerCase()`, flag any group with >1 distinct casing. Likely catches typos elsewhere (audit-only, separate wave).

**UPDATE 2026-05-27 (after this ADR)**: the recommendation above was implemented in the same commit that landed this section. The new W340 case-variant guard immediately discovered **7 additional case-mismatch silent duplicates** on first run, all baselined in `KNOWN_CASE_VARIANTS`:

| Logical entity      | Casing A (site)                                              | Casing B (site)                                                                                          | Shared collection   | Notes                                                                                  |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| KPI definition      | `KPIDefinition` — `domains/dashboards/models/KPIDefinition.js` | `KpiDefinition` — `models/KpiDefinition.js`                                                              | `kpidefinitions`    | Two separate model files. Likely duplicate dashboard infrastructure.                   |
| AI prediction       | `AiPrediction` — `models/AiPrediction.js`                    | `AIPrediction` — `models/organization.model.js` mega-file                                                | `aipredictions`     | The mega-file pattern again (same family as EnterprisePro.js in sub-cluster 2).        |
| MDT meeting         | `MdtMeeting` — `models/care/MdtMeeting.model.js`             | `MDTMeeting` — `models/MDTCoordination.js` + `rehabilitation-services/mdt-transition-quality.js`         | `mdtmeetings`       | **Triple collision**: 3 files, 2 casings. `MDTMeeting` was already in baseline (Tier 2). |
| e-learning course   | `ELearningCourse` — `models/ELearning/Course.js`             | `ElearningCourse` — `models/ElearningCourse.js`                                                          | `elearningcourses`  | Two model files for one entity.                                                        |
| HR policy           | `HRPolicy` — `models/HR/HRPolicy.js`                         | `HrPolicy` — `models/HR/Policy.js`                                                                       | `hrpolicies`        | Adjacent files in `models/HR/`. Likely a rename-in-progress that left both behind.     |
| ICF assessment      | `ICFAssessment` — `models/icf/ICFAssessment.model.js` (canonical) | `IcfAssessment` — `routes/icf-assessments.routes.js` (route inlines a local schema)                  | `icfassessments`    | Route-side inline schema = strong Pattern D rename or delete candidate.                |
| ZKTeco device       | `ZktecoDevice` — `models/ZktecoDevice.js`                    | `ZKTecoDevice` — `models/zktecoDevice.model.js`                                                          | `zktecodevices`     | Filename casing ALSO differs (`ZktecoDevice.js` vs `zktecoDevice.model.js`).           |

Each entry is the same P1 hazard class as the AAC entry above. **All require per-entry stakeholder disposition** — none can be autonomously consolidated without knowing which casing is the production canonical + whether the dormant variant has data in its collection.

**Pattern recap**: the case-variant guard ratchet-down baseline now stands at **8 entries** (1 AAC + 7 newly discovered). Future ratchet waves consolidate group-by-group following the same recipe as the `KNOWN_DUPLICATE_REGISTRATIONS` ratchet (W325c/W340 lineage): pick a canonical, re-export the variant's file from the canonical OR delete + un-mount the dormant variant, prune from `KNOWN_CASE_VARIANTS`. The ratchet-down assertion already added in the same commit will fail CI on any stale entry, forcing baseline shrinkage.

**Disposition** (deferred to stakeholder per same logic as sub-clusters 1+3): legacy `'AACProfile'` has zero external `ref:` callers and its routes overlap functionally with the W263 canonical surface. Strong candidate for deletion (the embedded router can be removed wholesale and `clinical-assessment.registry.js:159` un-mounted) once a behavior-equivalence check confirms W263's `/api/aac` surface covers the 13 legacy endpoints. Alternative: Pattern D rename to `'LegacyAACVocabularyBank'` to preserve the orphaned vocabulary_bank data shape.

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
- **Q4** — For sub-cluster 5 (`'AACProfile'` legacy variant): is the embedded vocabulary_bank/communication_boards/progress_log data shape still in production use anywhere (data persisted with `aacprofiles` collection vs W263's `aacprofiles` — same collection name, schema collision risk on writes), or can the legacy router be deleted and its route un-mounted from `clinical-assessment.registry.js:159`? Behavior-equivalence audit against W263's `/api/aac` surface needed.

---

## References

- W340 drift guard + cluster comments: [backend/\_\_tests\_\_/no-duplicate-model-registration-wave340.test.js](../../../backend/__tests__/no-duplicate-model-registration-wave340.test.js)
- 2026-05-27 audit memory note: `repo/w340-baseline-audit-2026-05-27.md`
- ADR-021 (framework): [021-duplicate-model-registration-consolidation-strategy.md](021-duplicate-model-registration-consolidation-strategy.md)
- ADR-024 (WorkflowInstance Pattern D): [024-workflow-instance-pattern-d-rename-proposal.md](024-workflow-instance-pattern-d-rename-proposal.md)
- ADR-030 (dormant modules, related class): [030-dormant-module-disposition.md](030-dormant-module-disposition.md)
- Session commits: `2b8a019a0`, `9fccc8c2d` (cluster documentation)
