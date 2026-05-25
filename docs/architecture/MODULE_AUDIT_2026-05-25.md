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

| Module                                        | Files                                                                                                                                                                                 | Wave       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Restraint & Seclusion register**            | [`models/RestraintSeclusionEvent.js`](../../backend/models/RestraintSeclusionEvent.js) + [`routes/restraint-seclusion.routes.js`](../../backend/routes/restraint-seclusion.routes.js) | W193b      |
| **eMAR (Medication Administration)**          | [`models/MedicationAdministrationRecord.js`](../../backend/models/MedicationAdministrationRecord.js) + [`routes/mar.routes.js`](../../backend/routes/mar.routes.js)                   | W191b      |
| **NPHIES (claims / eligibility / preauth)**   | [`services/nphies.service.js`](../../backend/services/nphies.service.js) + `models/nphies/{EligibilityCheck,PriorAuthorization,InsuranceClaim}.js`                                    | unnumbered |
| **IndividualEducationPlan (IEP/IFSP)**        | [`models/IndividualEducationPlan.js`](../../backend/models/IndividualEducationPlan.js) + [`routes/iep.routes.js`](../../backend/routes/iep.routes.js)                                 | W200b      |
| **CarePlanVersion (canonical care plan)**     | [`models/CarePlanVersion.js`](../../backend/models/CarePlanVersion.js) + 30+ caller ecosystem                                                                                         | W41        |
| **CAPA + RCA + FMEA quality cycle**           | `services/quality/capa-*` + `models/quality/*` + 7 drift guards                                                                                                                       | W337–W349  |
| **Adaptive sports catalog (scaffolding)**     | see 🟡 below — service exists but scaffold-only                                                                                                                                       |
| **Transition planning service (scaffolding)** | see 🟡 below — service exists but scaffold-only                                                                                                                                       |

### 🟡 Scaffolding — exists but data not persisted

| Module                      | Files                                                                                                                                    | Reason it's scaffolding                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transition planning**     | [`rehabilitation-services/transition-planning-service.js`](../../backend/rehabilitation-services/transition-planning-service.js)         | Constructor: `this.plans = new Map(); this.assessments = new Map(); ...`. No Mongoose model. Data lost on restart. Covers 5 transition types (early-to-school, school-to-secondary, school-to-work, rehab-to-community, dependent-to-independent). |
| **Adaptive sports**         | [`rehabilitation-services/adaptive-sports-service.js`](../../backend/rehabilitation-services/adaptive-sports-service.js)                 | Same pattern — Maps in constructor. Has a sports catalog (wheelchair basketball, tennis, etc.) but no session/assessment persistence.                                                                                                              |
| **Advanced family support** | [`rehabilitation-services/advanced-family-support-service.js`](../../backend/rehabilitation-services/advanced-family-support-service.js) | Service exists but no booking model. Respite-adjacent.                                                                                                                                                                                             |

**These scaffolds need a model + routes + Wave-18 invariants pass to graduate
to 🟢 production-grade.** Schema design exists in service code — the lift is
~1 wave each.

### 🟠 Partial — surface exists but workflow incomplete

| Module                                | What exists                                                                                                                                                                                                                                                                                                                            | What's missing                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vocational / Supported employment** | [`models/SupportedHousing.js`](../../backend/models/SupportedHousing.js), [`models/clinical-assessment/transition-readiness-assessment.model.js`](../../backend/models/clinical-assessment/transition-readiness-assessment.model.js), [`students/student-config.js`](../../backend/students/student-config.js) (has vocational fields) | No sheltered-employment / job-matching workflow. No employer registry. No internship tracking.                                                                                                             |
| **Caregiver/sibling support**         | [`models/clinical-assessment/caregiver-burden-assessment.model.js`](../../backend/models/clinical-assessment/caregiver-burden-assessment.model.js) + [`models/CaregiverSupportProgram.js`](../../backend/models/CaregiverSupportProgram.js) (W384 — CLOSED)                                                                            | ~~Assessment exists but no support program~~ — **CLOSED W384**: 5 program types (counseling/training/parent/sibling/peer) + 5-state lifecycle + Zarit pre/post + 18 endpoints at `/api/caregiver-support`. |
| **Seizure / red-flag observations**   | [`services/redFlagObservations/incidentObservations.js`](../../backend/services/redFlagObservations/incidentObservations.js), [`models/quality/Incident.model.js`](../../backend/models/quality/Incident.model.js)                                                                                                                     | No dedicated longitudinal Seizure log (date / duration / type / triggers / medication response). Currently mixed into generic incident reporting.                                                          |

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

## Implications for prioritization

The original 10-item priority list reduces to:

**Top genuine gaps** (ordered by clinical/regulatory impact):

1. **AAC workflow** — significant population (non-verbal beneficiaries),
   currently nothing.
2. **Safeguarding workflow** — regulatory necessity (child protection +
   elder abuse). High blast radius if a real incident is mishandled.
3. **Dedicated Seizure log** — broad population (CP + autism + syndromes).
   Currently bleeds into generic incident reporting; longitudinal trending
   not possible.
4. **Assistive Device lifecycle** — core to disability rehab. Inventory
   tracking only, no loan/return/maintenance.
5. **CBAHI accreditation mapping** — unlocks government contracting; ~1
   wave of doctrine work, no code.

**Graduating scaffolds to production** (medium-effort, well-defined):

6. Transition planning persistence — schema exists in service code.
7. Adaptive sports persistence — sports catalog exists in service code.
8. Respite booking — family-support service exists as base.

**Defer until stakeholder decision** (no autonomous progress possible):

9. IEP/IFSP unification — see ADR-026.
10. Student/Beneficiary unification — see ADR-020.

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
