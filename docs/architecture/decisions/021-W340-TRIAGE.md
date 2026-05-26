# W340 Duplicate-Model-Registration Baseline — Triage

**Type**: Decision support document — paired with ADR-021
**Status**: 🟡 Triage complete; awaiting per-entry decisions
**Author**: agent (autonomous analysis, 2026-05-26)
**Audience**: tech lead + per-entity domain owners

## Summary

The W340 drift guard (`__tests__/no-duplicate-model-registration-wave340.test.js`) catches every Mongoose model name registered in more than one source file. **41 entries** sit in the `KNOWN_DUPLICATE_REGISTRATIONS` baseline today (down from the initial 52 at W340 discovery; W341/W342/W343/W347 cleared 11 via service-file → canonical re-exports).

This doc classifies each remaining entry by:

- **Files** — where the model is registered today
- **Class** — A (clear consolidation), B (Pattern D rename — divergent schemas), C (helper-wrapped duplicate, needs schema-compare), D (ADR-blocked — formally pending stakeholder)
- **Recommended action** — what to do once a decision is made
- **Risk** — Low / Med / High based on caller blast-radius
- **Blocker** — what's needed before the action can ship

The goal is to reduce the user-facing decision surface. Most Category A entries can ship as 1-line re-exports (per the W341/W342 precedent) without changing the wire/behavior. Categories B / C / D are the ones genuinely needing stakeholder input.

---

## ⚠️ Discovery during triage (2026-05-26)

Initial schema-compare on `Correspondence` (the first putative Class A entry) revealed **the service-file schema and canonical schema use DIFFERENT field names**: service file uses `type`, canonical uses `correspondenceType`. Renaming/re-exporting would silently break service-file callers that read `record.type` (and conversely callers of the canonical that read `record.correspondenceType`).

**Implication**: every entry initially classified as Class A needs a manual schema-compare before the 1-line re-export is safe. The W341/W342 success cases were genuinely-identical-schema duplicates (seeder files that just re-defined the same shape); the W340 baseline as it stands has at least one Class B entry hiding inside the "Class A" candidates.

**Revised guidance**:

- Class A is the _intended_ destination, but each entry needs a 5-minute schema-compare to confirm it belongs there
- The 13 entries listed below as "Class A" should be treated as **Class A-candidate** until schema-compare confirms; some will downgrade to Class B (Pattern D rename territory)
- Per-entry schema-compare is a small task each but still a domain-owner judgment call (which field name is canonical, which callers exist)

**Known schema-divergent (downgrade to Class B)**:

- `Correspondence` — service file uses `type`, canonical uses `correspondenceType`. Renaming would break callers. Domain owner: Communications team. Move to Class B.

---

## Class A-candidate — Likely consolidation candidates (per-entry schema-compare REQUIRED)

**Pattern**: `models/X.js` is canonical; the second registration is a service-helper file that defined a local schema for ease-of-development but should re-export the canonical. The W341 / W342 precedent — convert the service-file's `mongoose.model('X', localSchema)` to `module.exports = require('../models/X')` — drops one registration and the drift guard ratchets down by one.

| Entry                     | Canonical file                                                                                      | Second registration                                      | Risk | Action                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| `Correspondence`          | `models/Correspondence.js`                                                                          | `communication/administrative-communications-service.js` | LOW  | Re-export canonical from service file                                                            |
| `LifecyclePolicy`         | `database/ttl-lifecycle-manager.js` (canonical platform-level)                                      | `services/documents/documentLifecycle.service.js`        | LOW  | Re-export canonical from documents/ service                                                      |
| `FormSubmission`          | `models/FormSubmission.js`                                                                          | `services/documents/documentForms.service.js`            | LOW  | Re-export from documents/ service                                                                |
| `FormTemplate`            | `models/FormTemplate.js`                                                                            | `services/documents/documentForms.service.js`            | LOW  | Re-export from documents/ service                                                                |
| `ImportExportJob`         | `models/ImportExportJob.js`                                                                         | `services/documents/documentImportExport.service.js`     | LOW  | Re-export from documents/ service                                                                |
| `DocumentAccessLog`       | `models/DocumentAccessLog.js`                                                                       | `services/documents/documentSharing.service.js`          | LOW  | Re-export from documents/ service                                                                |
| `DocumentShare`           | `models/DocumentShare.js`                                                                           | `services/documents/documentSharing.service.js`          | LOW  | Re-export from documents/ service                                                                |
| `DocumentVersion`         | `models/DocumentVersion.js`                                                                         | `services/documents/documentVersioning.service.js`       | LOW  | Re-export from documents/ service                                                                |
| `GoalBank`                | `models/GoalBank.js`                                                                                | `rehabilitation-services/goals-bank-service.js`          | LOW  | Re-export from rehab service                                                                     |
| `NotificationLog`         | `models/communication/NotificationLog.js`                                                           | `services/unifiedNotifier.js`                            | LOW  | Re-export from unifiedNotifier                                                                   |
| `NotificationPreferences` | `models/operations/NotificationPreferences.model.js`                                                | `services/documents/documentNotification.service.js`     | LOW  | Re-export from documents/ service                                                                |
| `Payroll`                 | `hr/saudi-hr-service.js` (richer) **OR** `models/payroll.model.js`                                  | both register                                            | MED  | **Schema-compare first** — canonical location decision needed; once chosen, the loser re-exports |
| `MDTMeeting`              | `models/MDTCoordination.js` (canonical?) **OR** `rehabilitation-services/mdt-transition-quality.js` | both register                                            | MED  | Schema-compare; canonical decision; loser re-exports                                             |

**Total Class A**: 13 entries. 10 are ready-to-ship 1-line PRs. 3 (Payroll, MDTMeeting, LifecyclePolicy) need a "which is canonical" sanity check first but are straightforward once that's confirmed.

### Class A execution plan (autonomous-safe after canonical confirmed)

```js
// services/documents/documentForms.service.js
// PRE-W3XX:
const formTemplateSchema = new mongoose.Schema({...});
const FormTemplate = mongoose.models.FormTemplate
  || mongoose.model('FormTemplate', formTemplateSchema);

// POST-W3XX:
const FormTemplate = require('../../models/FormTemplate');
// (local schema definition deleted — it was unused after this line)
```

Each conversion ships as 1 commit with the W341 commit-message format. Drift guard ratchets from 41 → 28 entries.

---

## Class B — Pattern D rename candidates (divergent schemas — ADR territory)

**Pattern**: Both files define MEANINGFULLY DIFFERENT schemas for what coincidentally have the same `mongoose.model('X', ...)` name. Whichever registers first wins; the other's callers operate on the wrong shape silently. The fix is to rename one of them to a domain-prefixed name (e.g., `EmailTemplate` → `DocumentEmailTemplate`).

This is **ADR-022/023/024-style** decision — needs domain owner sign-off to pick the canonical name and re-route callers.

| Entry                  | Canonical (likely)                                                                          | Divergent variant                                                                                                             | Divergence                                                                                     | Blocker                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `EmailTemplate`        | `communication/email-models.js` (templateId/slug/htmlContent, `email_templates` collection) | `services/documents/documentEmailGateway.service.js` (key/body{html,text}/variables[], `document_email_templates` collection) | **High** — different fields, different collections                                             | Domain owner: pick canonical, rename other to `DocumentEmailTemplate`                                                                   |
| `WhatsAppConversation` | `communication/whatsapp-models.js` (multi-file ecosystem)                                   | `models/WhatsAppConversation.js` + route/service registrations                                                                | High                                                                                           | Comms domain owner                                                                                                                      |
| `WhatsAppTemplate`     | Same as above                                                                               | Same as above                                                                                                                 | High                                                                                           | Comms domain owner                                                                                                                      |
| `Consent`              | `models/Consent.js` (canonical PDPL)                                                        | `privacy/consent.model.js` (PDPL-specific subset?)                                                                            | **Likely identical** — schema-compare needed; one is the canonical, the other should re-export | Privacy team                                                                                                                            |
| `Event`                | `infrastructure/eventStore.js` (event-sourcing infrastructure)                              | `models/rehabilitation-specialized.model.js` (clinical "Event" entity — calendar/social events for beneficiaries?)            | **CRITICAL — different entities entirely**                                                     | **Pattern D rename required**: clinical "Event" → `BeneficiaryEvent` (or `WelfareEvent`) ASAP; the silent-loser race is the worst class |
| `Student`              | `students/student-schema.js` + `students/student-service.js` (canonical Student domain)     | `models/montessori.js` (Montessori-specific Student variant?)                                                                 | High                                                                                           | **ADR-020 territory** — Student vs Beneficiary unification                                                                              |
| `DigitalSignature`     | `services/documents/documentSignature.service.js` (canonical?)                              | `services/documents/documentDigitalCert.service.js` (cert-specific?)                                                          | Likely related but different concerns                                                          | Document domain owner                                                                                                                   |
| `TherapyProtocol`      | `rehabilitation-services/advanced-therapy-protocols.js`                                     | `rehabilitation-services/aac-therapy-protocols.js`                                                                            | Same file family, may be intentional split                                                     | Rehab domain owner — likely just need to rename one to `AACTherapyProtocol`                                                             |
| `GeneratedReport`      | `domains/reports/models/GeneratedReport.js` (canonical DDD)                                 | `domains/reports/services/ReportsEngine.js` + `services/documents/documentReporting.engine.js` (helper-wrapped)               | Reports domain owns canonical; service files should re-export                                  | Reports domain owner — likely Class A if confirmed                                                                                      |
| `DataSubjectRequest`   | `privacy/data-subject-request.model.js` (canonical PDPL)                                    | `services/pdpl.service.js` (helper-wrapped)                                                                                   | Likely the service has a defensive registration                                                | Privacy team — likely Class A                                                                                                           |

**Total Class B**: 10 entries. 5 are clearly Pattern D (different entities); 5 may downgrade to Class A after schema-compare. The `Event` collision is the highest-priority — it's a critical-class bug that should ship a rename soon regardless of other ADR-021 progress.

---

## Class C — EnterprisePro / EnterpriseProPlus collisions

**Pattern**: Two big "kitchen-sink" service files (`models/EnterprisePro.js` 796 LOC + `models/EnterpriseProPlus.js` 1055 LOC) register 11 model names that ALSO exist as canonical `models/X.js` files. The Enterprise files use helper-wrapped registrations (`reg('X', schema)`).

| Entry                 | Canonical                                                 | Enterprise variant            | Notes                                                             |
| --------------------- | --------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `ComplianceAlert`     | `services/documents/documentComplianceMonitor.service.js` | `models/EnterprisePro.js`     | Both might be helper-wrapped                                      |
| `CalendarEvent`       | `services/documents/documentCalendar.service.js`          | `models/EnterprisePro.js`     | Same                                                              |
| `RoomBooking`         | `models/RoomBooking.js`                                   | `models/EnterprisePro.js`     |                                                                   |
| `Warehouse`           | `models/Warehouse.js`                                     | `models/EnterprisePro.js`     | Likely DIFFERENT — inventory vs enterprise warehouse-intelligence |
| `JobPosting`          | `models/JobPosting.js`                                    | `models/EnterpriseProPlus.js` |                                                                   |
| `JobApplication`      | `models/JobApplication.js`                                | `models/EnterpriseProPlus.js` |                                                                   |
| `Facility`            | `models/operations/Facility.model.js`                     | `models/EnterpriseProPlus.js` |                                                                   |
| `Vendor`              | `models/Vendor.js`                                        | `models/EnterpriseProPlus.js` |                                                                   |
| `VendorEvaluation`    | `models/VendorEvaluation.js`                              | `models/EnterpriseProPlus.js` |                                                                   |
| `ChangeRequest`       | `models/quality/ChangeRequest.model.js`                   | `models/EnterpriseProPlus.js` |                                                                   |
| `StrategicInitiative` | `models/StrategicInitiative.js`                           | `models/EnterpriseProPlus.js` |                                                                   |

**Treatment**: each of the 11 needs a schema-compare. If the Enterprise variant matches the canonical, the Enterprise file can re-export. If it diverges, it's a Pattern D rename (e.g., `Warehouse` → `EnterpriseWarehouse`, `JobPosting` → `EnterpriseJobPosting`, etc.).

The EnterprisePro routes (`routes/enterprisePro.routes.js`, `routes/enterpriseProPlus.routes.js`) are LIVE so the Enterprise files can't be deleted — but they can be slimmed by re-exporting where appropriate. A separate ADR may decide whether to merge the Enterprise module surface into the canonical models longer-term.

**Total Class C**: 11 entries. All need schema-compare before any action.

---

## Class D — ADR-blocked (formally pending stakeholder)

These have ADRs already drafted with decision-briefs:

| Entry                            | ADR                    | Status                                                    |
| -------------------------------- | ---------------------- | --------------------------------------------------------- |
| `ApprovalRequest`                | ADR-022                | Pattern D rename pending Approvals domain owner           |
| `ReportTemplate`                 | ADR-023                | Pattern D rename pending Reports domain owner             |
| `WorkflowInstance`               | ADR-024                | Pattern D rename pending Workflow domain owner            |
| `TransitionPlan`                 | ADR-028                | Already ALLOWLISTed (per W370) — stakeholder rename later |
| `BranchSetting`, `GlobalSetting` | (W340 follow-up notes) | Two-file pattern; investigation pending                   |
| `Referral`, `Task`               | ALLOWLIST (W343)       | Defensive lookup-with-fallback pattern; no action needed  |
| `AuditLog`                       | ALLOWLIST (W347)       | 4-file defensive pattern; ADR-021 Tier 1                  |

**Total Class D**: 9 entries (already in formal queue, no triage needed).

---

## Recommended execution sequence

**Phase 1 — Class A-candidate schema-compare + ship (per entry: ~15 min compare + 1 commit)**

⚠️ Per the discovery note above, each entry needs schema-compare BEFORE the re-export PR. The discovery on `Correspondence` (which became Class B) means we should expect 30-50% of Class A-candidates to downgrade after compare.

Recommended cadence: pick 2-3 entries per session, schema-compare each, ship the re-exports that pass, defer the rest to Class B. Phase 1 thus takes 2-3 sessions across days (waiting on domain-owner schema-compare per entry), not the originally-estimated 2-3 hours.

Per-entry compare checklist:

1. Read both files' `Schema(...)` blocks
2. Walk each field — does both sides have the same field NAME and TYPE?
3. If yes → re-export the service-file version to the canonical (drift -1)
4. If no → downgrade to Class B (Pattern D rename); document the divergence in this triage doc

**Phase 2 — Class A schema-compare (3 entries, ~1-2 hours analysis + ~3 commits)**

1. `Payroll` — compare `hr/saudi-hr-service.js` vs `models/payroll.model.js`; pick canonical
2. `MDTMeeting` — compare `models/MDTCoordination.js` vs `rehabilitation-services/mdt-transition-quality.js`
3. `LifecyclePolicy` — compare `database/ttl-lifecycle-manager.js` vs `services/documents/documentLifecycle.service.js`

Each ships as a re-export PR after canonical confirmed. Drift 31→28.

**Phase 3 — Class B / C critical PD renames (5-7 entries, ~1 week stakeholder calendar)**

1. `Event` (CRITICAL) — rename clinical `Event` → `BeneficiaryEvent` immediately. Single source-of-truth confusion is too dangerous for ADR-021 wait.
2. `EmailTemplate` (Pattern D) — rename `services/documents/documentEmailGateway.service.js` → `DocumentEmailTemplate`. Domain owner: documents team
3. `Warehouse`, `JobPosting`, `JobApplication`, etc. (Class C subset) — each needs domain owner approval to slim EnterprisePro to re-exports

**Phase 4 — Class D ADR resolution (per ADR-021/022/023/024/028 timelines)**

User-led: stakeholder meetings per the existing decision-briefs (`020-DECISION-BRIEF.md`, `021-DECISION-BRIEF.md`, `026-DECISION-BRIEF.md`).

---

## Risk note on Class A autonomous execution

The 10 Phase-1 ready-to-ship entries are **claimed to be Class A** based on file-naming heuristics (`models/X.js` = canonical). The W341 / W342 precedent has worked for ~11 prior entries without regression. BUT — for each entry, the agent should:

1. Read both schemas before the re-export PR
2. Confirm they're substantially identical OR the service-file version is a strict subset
3. Run the relevant test suite after the change

If any entry surfaces meaningful schema divergence during step 1, **stop the automation and downgrade to Class B**. The W347 AuditLog precedent shows that even ALLOWLISTED defensive patterns can mask schema drift.

---

## Why this triage matters

Without per-entry classification, the 41 W340 baseline entries are a faceless tech-debt count that lives in `KNOWN_DUPLICATE_REGISTRATIONS` indefinitely. ADR-021 framed the **pattern** (A/B/C/D) but didn't classify each entry. This doc closes that gap.

With this triage:

- The user has a clear action menu (10 Class A entries ship today autonomously; 3 need a quick schema-compare; the rest need their respective ADRs)
- Future agents reading this doc skip re-discovering the same classifications
- The W340 baseline becomes ratchet-down-able instead of frozen

---

## Cross-references

- ADR-021 — Tier 1 duplicate-model framework (the doctrine)
- `__tests__/no-duplicate-model-registration-wave340.test.js` — the drift guard
- W341 commit (seeder consolidation precedent)
- W342 commit (HR service consolidation precedent)
- W343 commit (REGISTRATION_ALLOWLIST precedent for Referral/Task)
- W347 commit (AuditLog ALLOWLIST precedent)
- `docs/architecture/decisions/021-DECISION-BRIEF.md` — Tier 1 stakeholder questions
