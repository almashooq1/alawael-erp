# Module Audit — Ground Truth Correction

Date: 2026-05-25
Trigger: Conversation gap-analysis on 2026-05-24 listed 10 "🔴 critical missing"
modules as priority gaps. First-principles file-system audit revealed that
**6 of the 10 already exist** (some at production-grade, some as in-memory
scaffolds). This document records the ground truth so future "build X because
it's missing" requests can be checked against reality first.

## Status update (post W356–W370 session)

Of the genuine gaps + scaffolds catalogued below, **all 10 actionable items
have been built across waves W356–W370** (2026-05-25 single session,
19 commits, ~13,000 LOC). See
[PRODUCTION_CUTOVER_W356_W370.md](PRODUCTION_CUTOVER_W356_W370.md) for the
ops checklist and
[decisions/026-iep-ifsp-care-plan-fragmentation.md](decisions/026-iep-ifsp-care-plan-fragmentation.md)
for the one stakeholder-blocked decision (IEP/IFSP consolidation).

The "🔴 absent" set was further refined during the build: of the four
"secondary gaps" listed below (Catering/Diets, Facilities PPM, Laundry,
Wheelchair/Prosthetics maintenance), audit-first re-checks found that
`kitchen.model.js` + `laundry.model.js` already exist at production
grade — only the per-beneficiary CLINICAL DIET PRESCRIPTION (W368) and
FACILITY PPM (W369) were genuine gaps. The discipline of grep-first-audit
saved ~2 wasted waves' worth of duplicate-builds.

Pattern recap: this is the same lesson as
[ADR-026](decisions/026-iep-ifsp-care-plan-fragmentation.md) and the
`feedback_audit_doctrine_prompts_against_source` memory entry — prose
analyses drift from the file system; ls/Grep audit BEFORE first commit.

## Classification scheme

- **🟢 Production-grade** — Mongoose model + routes + Wave-18 invariants +
  test coverage. Persisted to MongoDB. Wired into bootstrap or registry.
- **🟡 Scaffolding** — code exists but uses in-memory `Map()` / no
  persistence layer / no routes wired. Data lost on restart.
- **🟠 Partial** — some surface exists (a model, a registry entry, or a
  service) but missing significant pieces (no routes, no workflow,
  no Wave-18 invariants).
- **🔴 Absent** — no matching file or registry entry found.
- **🔵 Stakeholder-blocked** — exists but with structural questions awaiting
  ADR resolution.

## Verified state (2026-05-25)

### 🟢 Production-grade — DO NOT rebuild

| Module                                      | Files                                                                                                                                                                                                              | Wave       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Restraint & Seclusion register**          | [`models/RestraintSeclusionEvent.js`](../../backend/models/RestraintSeclusionEvent.js) + [`routes/restraint-seclusion.routes.js`](../../backend/routes/restraint-seclusion.routes.js)                              | W193b      |
| **eMAR (Medication Administration)**        | [`models/MedicationAdministrationRecord.js`](../../backend/models/MedicationAdministrationRecord.js) + [`routes/mar.routes.js`](../../backend/routes/mar.routes.js)                                                | W191b      |
| **NPHIES (claims / eligibility / preauth)** | [`services/nphies.service.js`](../../backend/services/nphies.service.js) + `models/nphies/{EligibilityCheck,PriorAuthorization,InsuranceClaim}.js`                                                                 | unnumbered |
| **IndividualEducationPlan (IEP/IFSP)**      | [`models/IndividualEducationPlan.js`](../../backend/models/IndividualEducationPlan.js) + [`routes/iep.routes.js`](../../backend/routes/iep.routes.js)                                                              | W200b      |
| **CarePlanVersion (canonical care plan)**   | [`models/CarePlanVersion.js`](../../backend/models/CarePlanVersion.js) + 30+ caller ecosystem                                                                                                                      | W41        |
| **CAPA + RCA + FMEA quality cycle**         | `services/quality/capa-*` + `models/quality/*` + 7 drift guards                                                                                                                                                    | W337–W349  |
| **SeizureEvent (longitudinal seizure log)** | [`models/SeizureEvent.js`](../../backend/models/SeizureEvent.js) + [`routes/seizure-log.routes.js`](../../backend/routes/seizure-log.routes.js)                                                                    | W356       |
| **TransitionPlan (life-stage transitions)** | [`models/TransitionPlan.js`](../../backend/models/TransitionPlan.js) + [`routes/transition-plan.routes.js`](../../backend/routes/transition-plan.routes.js) — graduated W361                                       | W361       |
| **AdaptiveSportsProgram**                   | [`models/AdaptiveSportsProgram.js`](../../backend/models/AdaptiveSportsProgram.js) + [`routes/adaptive-sports.routes.js`](../../backend/routes/adaptive-sports.routes.js) — graduated W362                         | W362       |
| **CaregiverSupportProgram**                 | [`models/CaregiverSupportProgram.js`](../../backend/models/CaregiverSupportProgram.js) + [`routes/caregiver-support-program.routes.js`](../../backend/routes/caregiver-support-program.routes.js) — graduated W384 | W384       |

### 🟡 Scaffolding — exists but data not persisted (HISTORICAL — all 3 graduated)

> **STATUS POST 2026-05-25 SESSION**: every scaffold below has been graduated
> to 🟢 production-grade with a Mongoose model + routes + canonical schema +
> Wave-18 invariants + drift guard. The in-memory scaffold files remain as
> archival reference but are no longer the data layer.

| Module                      | Original scaffold                                                                                                                        | Graduated to                                                                                                                          | Wave |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **Transition planning**     | [`rehabilitation-services/transition-planning-service.js`](../../backend/rehabilitation-services/transition-planning-service.js)         | [`models/TransitionPlan.js`](../../backend/models/TransitionPlan.js) + `routes/transition-plan.routes.js`                             | W361 |
| **Adaptive sports**         | [`rehabilitation-services/adaptive-sports-service.js`](../../backend/rehabilitation-services/adaptive-sports-service.js)                 | [`models/AdaptiveSportsProgram.js`](../../backend/models/AdaptiveSportsProgram.js) + `routes/adaptive-sports.routes.js`               | W362 |
| **Advanced family support** | [`rehabilitation-services/advanced-family-support-service.js`](../../backend/rehabilitation-services/advanced-family-support-service.js) | [`models/CaregiverSupportProgram.js`](../../backend/models/CaregiverSupportProgram.js) + `routes/caregiver-support-program.routes.js` | W384 |

**Why the scaffold files still exist**: removing them would be a separate
ADR-grade decision because some downstream services may still reference
the old in-memory APIs. Future cleanup: audit `grep -r "require.*advanced-family-support-service"` etc. and migrate / delete the
scaffolds. Not blocking for cutover.

### 🟠 Partial — surface exists but workflow incomplete (2 of 3 CLOSED post-session)

> Post-2026-05-25 status: 2 of 3 partials closed (Caregiver/sibling W384,
> Seizure W356). The remaining open partial is Vocational / Supported
> employment — has profile model but lacks job-matching workflow.

| Module                                | What exists                                                                                                                                                                                                                                                                                                                                                                                                                                           | What's missing                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vocational / Supported employment** | [`models/SupportedHousing.js`](../../backend/models/SupportedHousing.js), [`models/clinical-assessment/transition-readiness-assessment.model.js`](../../backend/models/clinical-assessment/transition-readiness-assessment.model.js), [`students/student-config.js`](../../backend/students/student-config.js) (has vocational fields)                                                                                                                | No sheltered-employment / job-matching workflow. No employer registry. No internship tracking.                                                                                                                                                                                         |
| **Caregiver/sibling support**         | [`models/clinical-assessment/caregiver-burden-assessment.model.js`](../../backend/models/clinical-assessment/caregiver-burden-assessment.model.js) + [`models/CaregiverSupportProgram.js`](../../backend/models/CaregiverSupportProgram.js) (W384 — CLOSED)                                                                                                                                                                                           | ~~Assessment exists but no support program~~ — **CLOSED W384**: 5 program types (counseling/training/parent/sibling/peer) + 5-state lifecycle + Zarit pre/post + 18 endpoints at `/api/caregiver-support`.                                                                             |
| **Seizure / red-flag observations**   | [`models/SeizureEvent.js`](../../backend/models/SeizureEvent.js) + [`routes/seizure-log.routes.js`](../../backend/routes/seizure-log.routes.js) (W356 — CLOSED). Generic incident reporting at [`services/redFlagObservations/incidentObservations.js`](../../backend/services/redFlagObservations/incidentObservations.js) + [`models/quality/Incident.model.js`](../../backend/models/quality/Incident.model.js) remains for non-seizure red flags. | ~~No dedicated longitudinal Seizure log~~ — **CLOSED W356**: ILAE 2017 classification + status-epilepticus virtual (≥300s) + 11 endpoints at `/api/seizure-log`. Triggers, medication response, and EEG-correlate fields captured. Longitudinal trending now possible per beneficiary. |

### 🔴 Verified absent — genuine gaps (HISTORICAL — all built post-session)

> **STATUS POST 2026-05-25 SESSION**: every row below has been built.
> Mapping: AAC → W358 / Safeguarding → W357 / CBAHI mapping → W360+W367 /
> Assistive Devices → W359 / Catering-as-clinical-prescription → W368 /
> Facilities PPM → W369. Laundry + Wheelchair-only were reclassified as
> ALREADY-EXISTING (laundry.model) or SUBSUMED (wheelchair → W359 category).
> See "Operational extensions" section below + PRODUCTION_CUTOVER_W356_W370.md.

| Module                                                  | Search confirmation                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AAC (Augmentative & Alternative Communication)**      | 0 matches for `AAC`, `augmentative`, `PECS`, `boardmaker` across `backend/`.                                                                            |
| **Safeguarding workflow / abuse reporting**             | Only `models/Guardian.js` (walī profile) — no abuse-report intake, no protective-action workflow, no escalation chain.                                  |
| **CBAHI accreditation mapping**                         | No CBAHI-specific standards-mapping file. CAPA + audit + RCA exist (`services/quality/`) but no CBAHI-mandated-standard checklist or evidence registry. |
| **Assistive Devices loan/return/maintenance lifecycle** | Generic `InventoryItem.js` exists, no dedicated AssistiveDeviceLoan model with check-out / return / repair / cost tracking.                             |
| **Catering / Special Diets (NPO, dysphagia)**           | No matches for diet workflow.                                                                                                                           |
| **Facilities Management (PPM elevators/ramps)**         | No PPM scheduling for accessibility-critical infrastructure.                                                                                            |
| **Laundry / Housekeeping** (for residential centers)    | No matches.                                                                                                                                             |
| **Wheelchair / Prosthetics registry + maintenance**     | Same as Assistive Devices — generic inventory only.                                                                                                     |

### ✅ Operational extensions built (W364 + W370)

| Wave               | Artifact                                                  | Coverage                                                                                                                        |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| W364 / `199c5f7d4` | `startup/clinicalSweepersBootstrap.js` initial 7 sweepers | safeguarding SLA, device loan/maintenance, respite no-show (mutating), transition overdue, CBAHI reassessment, AAC reassessment |
| W370 / `e1c0788bc` | Extension to 11 sweepers                                  | + diet review, facility inspection/maintenance/certificate                                                                      |
| W365 + W370        | Sprint enumeration                                        | 12 new entries in `sprint-tests.txt`                                                                                            |
| W366 + W370        | Canonical schemas catalog                                 | 11 → 21 entries; every W356-W369 module has a registered Zod schema                                                             |

### 🔵 Stakeholder-blocked

| Module                                     | Status                                                                                                              | Doc                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **IEP/IFSP/CarePlanVersion fragmentation** | 3 parallel structures (W41 / W200b / `early-intervention/IFSP`) need stakeholder decision on consolidation approach | [ADR-026](decisions/026-iep-ifsp-care-plan-fragmentation.md)           |
| **Student vs Beneficiary fragmentation**   | 21 callers of `ref:'Student'` need direction A/B/C                                                                  | [ADR-020](decisions/020-student-vs-beneficiary-consolidation.md)       |
| **ApprovalRequest schema divergence**      | Rich vs simple schemas at 3 source files; ADR-021 + 022 pending                                                     | [ADR-022](decisions/022-approval-request-pattern-d-rename-proposal.md) |
| **AuditLog 3× registration**               | Different field names (entityType vs auditableType) across 4 source files                                           | ADR-021 ALLOWLIST stopgap applied W347                                 |

## Implications for prioritization (HISTORICAL — see closed/open status below)

The original 10-item priority list and what happened to each:

**Top genuine gaps** — all closed in W356-W360 session:

1. ✅ **AAC workflow** — closed W358 `CommunicationAidProfile` (singleton per beneficiary, ASHA modality tiers, 12 endpoints at `/api/communication-aid`).
2. ✅ **Safeguarding workflow** — closed W357 `SafeguardingConcern` (13 endpoints + CBAHI + Saudi child-protection authority).
3. ✅ **Dedicated Seizure log** — closed W356 `SeizureEvent` (ILAE 2017 + status-epilepticus ≥300s + 11 endpoints).
4. ✅ **Assistive Device lifecycle** — closed W359 `AssistiveDevice` (loan + maintenance, 20 endpoints).
5. ✅ **CBAHI accreditation mapping** — closed W360 + W367 (45 standards / 8 chapters + per-branch attestation, 16 endpoints).

**Graduating scaffolds to production** — all 3 closed:

6. ✅ Transition planning — closed W361 `TransitionPlan` (5 life-stage transitions + 15 endpoints).
7. ✅ Adaptive sports — closed W362 `AdaptiveSportsProgram` (19 sports + sessions + achievements, 17 endpoints).
8. ✅ Family support (was titled "respite booking" in original list) — closed W363 `RespiteBooking` (17 endpoints) + W384 `CaregiverSupportProgram` (5 program types + Zarit pre/post + 18 endpoints).

**Defer until stakeholder decision** — still open:

9. 🔵 IEP/IFSP unification — see [ADR-026](decisions/026-iep-ifsp-care-plan-fragmentation.md).
10. 🔵 Student/Beneficiary unification — see [ADR-020](decisions/020-student-vs-beneficiary-consolidation.md).

**Items NOT in the original list but built in the same series**:

- W368 `BeneficiaryDietPrescription` (IDDSI + NPO + enteral, 17 endpoints).
- W369 `FacilityAsset` (26-category PPM + regulatory certificates, 19 endpoints).

**Items NOT in the original list and still open as 🟠 partial**:

- **Vocational / Supported employment** — `models/rehab-advanced/VocationalProfile.model.js` exists (snake_case, no Wave-18 invariants, no canonical schema). Has work-skills/training/employment-applications fields but no employer registry, no job-matching workflow, no internship tracking. Would need a refactor (camelCase + canonical schema) AND additive build (employer registry + job-placement workflow) to graduate to 🟢. Estimated ~2-3 waves of work.

## Session totals (W356-W393 closed state, 2026-05-25)

- **11 production-grade modules** built (W356-W370 ten + W384 caregiver-support).
- **175 endpoints** under `/api/(v1/)?...`.
- **13 cron sweepers** wired (1 mutating: respite no-show; 12 read-only).
- **22 canonical Zod schemas** registered in `intelligence/canonical/`.
- **33 frontend pages** at `apps/web-admin/src/app/(dashboard)/` (10 list + 10 detail + 10 new-event + 1 aggregator + 1 deep-link).
- **~564 drift assertions** across 13 sprint-gated tests (verified end-to-end 2026-05-25).
- **Cutover guide**: [PRODUCTION_CUTOVER_W356_W370.md](PRODUCTION_CUTOVER_W356_W370.md).

## Recipe for next session

Before any future "build X" request is taken at face value:

1. **Grep first.** Search backend/ for the module name + 2-3 Arabic
   synonyms + 2-3 English variants. (CBAHI / cbahi / اعتماد / accreditation
   would have surfaced 0 matches — confirming a gap.)
2. **Read the top match.** Distinguish 🟢 (Mongoose model + routes) from
   🟡 (in-memory Map service) from 🟠 (one assessment model with no
   workflow). The first is "already exists, don't rebuild." The second is
   "schema exists in service code, add persistence." The third is "more
   to build than the name suggests."
3. **Cite file:line.** When responding, link to specific files so the
   user can verify in 10 seconds rather than 10 minutes.

This recipe is the operational version of the
`feedback_audit_doctrine_prompts_against_source` memory rule — applied to
gap-analysis prose instead of doctrine prompts.
