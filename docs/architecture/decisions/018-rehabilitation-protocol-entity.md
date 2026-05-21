# 18. Rehabilitation Protocol Entity — Bridge Between Templates and Plans

Date: 2026-05-21

## Status

🟡 **Proposed — needs clinical director + multi-disciplinary team lead sign-off before implementation.**

This ADR is intentionally a proposal rather than an accepted decision. Three
design approaches are presented; the choice depends on how the clinical team
currently uses protocols, and how much workflow change they'll accept. See
"Decision" for the recommended path forward.

## Context

A request landed today to "build a rehabilitation protocol" for the platform.
Investigation showed the platform is already rich with rehab-domain models —
the gap is narrower than the request implied. Surfacing it precisely here so
the stakeholder discussion can focus on the _real_ missing piece.

### What already exists (verified 2026-05-21)

**Plan models (per-beneficiary instances):**

- [`backend/models/CarePlan.js`](../../../backend/models/CarePlan.js) — general care plan, 3 statuses (DRAFT / ACTIVE / ARCHIVED), domain buckets (educational / therapeutic / lifeSkills).
- [`backend/models/rehab-center/individualized-plan.model.js`](../../../backend/models/rehab-center/individualized-plan.model.js) — multi-disciplinary IFSP/ITP with `team_members[]`, `long_term_goals[]`, `short_term_goals[]`.
- [`backend/models/rehab-advanced/BehaviorPlan.model.js`](../../../backend/models/rehab-advanced/BehaviorPlan.model.js) — FBA + intervention strategies.
- [`backend/models/rehab-advanced/NutritionPlan.model.js`](../../../backend/models/rehab-advanced/NutritionPlan.model.js), [`VocationalProfile.model.js`](../../../backend/models/rehab-advanced/VocationalProfile.model.js), [`DischargePlan.model.js`](../../../backend/models/rehab-advanced/DischargePlan.model.js).
- [`backend/models/SmartGoal.js`](../../../backend/models/SmartGoal.js) — SMART goal entity, 4 statuses (active/achieved/paused/cancelled).
- [`backend/models/AacProfile.js`](../../../backend/models/AacProfile.js) — AAC profile with PECS phase history (W263).
- ICF assessments via [`backend/models/icf/`](../../../backend/models/icf/).

**Template models (reusable across beneficiaries):**

- [`backend/models/rehab-program/RehabilitationProgram.model.js`](../../../backend/models/rehab-program/RehabilitationProgram.model.js) — reusable program templates, classified by disability / age / severity.
- [`backend/models/rehab-program/ProgramSession.model.js`](../../../backend/models/rehab-program/ProgramSession.model.js), [`ProgramProgress.model.js`](../../../backend/models/rehab-program/ProgramProgress.model.js).

**Inline protocol data (not a model):**

- [`backend/rehabilitation-services/advanced-therapy-protocols.js`](../../../backend/rehabilitation-services/advanced-therapy-protocols.js) — defines a `TherapyProtocol` schema internally and ships **20+ evidence-based protocols**: ABA/DTT, Speech Pathology, OT, PT, AAC, Cognitive Rehab, Early Intervention, etc. Each protocol carries `evidenceLevel` (I-IV + Expert_Opinion), `sessionsPerWeek`, `sessionDurationMinutes`, `totalWeeks`, `steps[]`. **But this data lives in code, not Mongo — it cannot be assigned to a beneficiary, cannot be edited by clinicians without a PR, and has no per-beneficiary instance.**

**Services and routes:**

- 70+ files under [`backend/rehabilitation-services/`](../../../backend/rehabilitation-services/), including `individualized-rehabilitation-plan-service.js`, `smart-iep-service.js`, `unified-assessment-service.js`, `rehab-program-templates.js`.
- [`backend/services/carePlanReviewService.js`](../../../backend/services/carePlanReviewService.js) + plateau-detection scheduler.
- [`backend/routes/care-plan.routes.js`](../../../backend/routes/care-plan.routes.js), [`rehab-templates.routes.js`](../../../backend/routes/rehab-templates.routes.js), [`rehab-measures.routes.js`](../../../backend/routes/rehab-measures.routes.js).

### The actual gap

After mapping the above, the missing concept is **not** "a rehabilitation protocol" in the abstract — that concept exists three different ways already. The missing concept is a **bridge entity** that:

1. **Assigns a specific named protocol** (e.g. "ABA-DTT" from `advanced-therapy-protocols.js`) to a specific beneficiary with **clinical justification** ("CARS-2 score 42 → ABA-DTT indicated").
2. **Holds multi-therapist accountability** at the protocol level: each therapist's role, weekly hours, named success criteria — not just "team_members[]" with loose responsibilities.
3. **Carries formal time phases** (intake → intensive intervention → maintenance → discharge planning) as a first-class enum, distinct from the lifecycle status (draft/active/archived).
4. **Tracks adherence**: for each scheduled session, did it follow the assigned protocol? What were the deviations? What compliance percentage are we running at?
5. **Optionally links to activation rules**: "if M-CHAT-R positive AND age ≤ 36 months → recommend Early Start Denver protocol".

The risk this addresses: today the clinical team selects a protocol verbally or in a care-plan free-text field, and there is no record of which evidence-based protocol a beneficiary is on, who is accountable, or how closely sessions adhered to it. CARF and similar accreditation bodies expect this level of protocol-vs-execution tracking.

## Questions for stakeholders

Before picking an approach, the following need answers from the **clinical
director + multi-disciplinary team lead + (if accreditation-driven) the
quality officer**:

1. **Is "which protocol is this beneficiary on" tracked today, anywhere?** If yes (paper, free text in CarePlan, individual therapist notes), where exactly? This determines whether we're digitising an existing practice or introducing a new one.
2. **Who picks the protocol?** A single lead therapist, the multi-disciplinary team in a case conference, or an algorithmic recommender (e.g. from assessment scores)?
3. **Is adherence tracking a regulatory expectation (CARF / MOH / Tatmeen) or an internal quality goal?** This decides whether the adherence side is mandatory or optional.
4. **What's the cardinality?** One protocol per beneficiary at a time, or can a beneficiary be on multiple concurrent protocols (e.g. ABA for behaviour + Speech protocol for language) — and if multiple, how are session hours allocated across them?
5. **Phases — intake/intensive/maintenance/discharge — is this a clinical reality today, or an aspiration?** If clinicians don't actually work in these phases, baking them into the schema is premature.

**If we don't have answers to (1), (2), and (4), we should NOT ship any of B or C below.** A guess at cardinality or selection workflow that turns out wrong forces an expensive migration. (A) is safe regardless because it doesn't change the data model.

## Three approaches under consideration

### Approach A — Observability-first, no new model (low cost, recommended)

**What ships:**

- No new model.
- Add a small CLI report (or admin dashboard page) that, for each beneficiary with an active CarePlan, looks for any mention of one of the 20 protocol names from `advanced-therapy-protocols.js` in `CarePlan.therapeutic.domains`, session notes, IEP free-text, etc. — and reports "untracked protocol assignments".
- Expose `/admin/ops/protocol-coverage` showing: total active beneficiaries, how many have _any_ identifiable protocol mentioned, breakdown by protocol name.

**Cost:** 1-2 days. Pure read-side; no schema change, no migration.

**Pros:** Surfaces the _actual_ current state. Tells the clinical team "you have 312 active beneficiaries and we can find protocol names mentioned for 47 of them" — which is the data needed to answer questions 1, 2, and 4 above. Generates evidence that B or C is worth building, or evidence that current practice is informal-by-design and a structured model would be friction without value.

**Cons:** Doesn't enable any new clinical workflow. If the team _already knows_ they need structured protocol assignment + adherence tracking (e.g. for a pending CARF audit), this is too slow.

### Approach B — New `RehabilitationProtocol` bridge entity

**What ships:**

```javascript
// backend/models/RehabilitationProtocol.js (proposed shape)
{
  beneficiary: { type: ObjectId, ref: 'Beneficiary', required: true, index: true },
  protocolTemplateKey: { type: String, required: true },  // e.g. "ABA-DTT", references advanced-therapy-protocols.js
  assignmentReason: { type: String, required: true, minlength: 10 },
  assignedBy: { type: ObjectId, ref: 'User', required: true },
  assignmentDate: { type: Date, default: Date.now },
  status: { enum: ['draft', 'active', 'paused', 'completed', 'discontinued'], default: 'draft' },
  currentPhase: { enum: ['intake_assessment', 'intensive_intervention', 'maintenance', 'discharge_planning'], required: true },
  phaseHistory: [{ phase, startDate, endDate, transitionedBy, transitionReason }],  // append-only, mirrors AacProfile PECS pattern
  therapistAssignments: [{
    therapist: { type: ObjectId, ref: 'Employee' },
    discipline: { enum: ['SLP', 'OT', 'PT', 'Psychologist', 'BCBA', 'Special_Educator', 'Social_Worker'] },
    role: String,
    hoursPerWeek: Number,
    successCriteria: [String],
  }],
  adherence: {
    scheduledSessions: { type: Number, default: 0 },
    completedSessions: { type: Number, default: 0 },
    protocolCompliantSessions: { type: Number, default: 0 },
    deviations: [{ sessionId, date, reason, adjustmentMade, approvedBy }],
  },
  outcomes: {
    baselineMeasurements: [{ measureId, value, recordedAt }],
    interimMeasurements: [{ measureId, value, recordedAt, phase }],
    finalMeasurements: [{ measureId, value, recordedAt }],
  },
  reviewSchedule: { cadenceDays: Number, lastReviewDate: Date, nextReviewDate: Date },
  // ... hash-chain envelope (per Wave-18 invariant), TTL not applicable (clinical record)
}
```

Plus: service module, REST routes, validators, audit-log hooks, ~25-30 Jest tests, registration in `clinical-therapy.registry.js`, plateau-detection scheduler integration.

**Cost:** ~3-4 hours of focused coding for model+service+routes+tests; ~1 day of follow-up (UI surface in web-admin, end-to-end smoke).

**Pros:** Clean separation — `CarePlan` stays a general plan, `RehabilitationProtocol` is the structured execution layer. Mirrors successful patterns already in this codebase (AacProfile PECS history; W226 measure workflow). Allows phased rollout: ship draft-only first, then enable active assignments.

**Cons:** Adds a model the clinical team didn't explicitly ask for. If they currently work informally and resist structured protocol assignment, this becomes a feature nobody uses. Also: 20-protocol enum-by-string is fragile — protocols in `advanced-therapy-protocols.js` could be renamed and break references. Mitigation: ship a `protocolTemplateKey` registry validator.

### Approach C — Promote `advanced-therapy-protocols.js` to a Mongo collection AND ship the bridge entity

**What ships:**

- New `ProtocolTemplate` Mongo collection seeded from the 20 inline protocols.
- New admin page `/admin/clinical/protocol-templates` where senior clinicians can add / edit / version protocols without a code change.
- The bridge entity from Approach B, with `protocolTemplateKey` → `protocolTemplateId` (ObjectId ref to `ProtocolTemplate`).

**Cost:** ~1-2 weeks. Needs:

- New `ProtocolTemplate` schema + seed migration from inline data
- Admin CRUD UI (web-admin)
- Versioning logic (a protocol assignment must lock to a specific version of the template so future template edits don't retroactively change history)
- Approval workflow for template edits (who can publish a new version)
- All of Approach B
- Migration story for existing `advanced-therapy-protocols.js` consumers (smart-iep-service, smart-assessment-engine, etc.)

**Pros:** Long-term correct. Clinicians become authors of protocols, not consumers of developer-maintained code. Enables evidence-based protocol customisation per branch / per disability cohort. Aligns with how `RehabilitationProgram` already works.

**Cons:** Heaviest scope. Versioning + approval workflow adds complexity. If the 20 inline protocols are _currently_ the "right" set and edits are rare, the migration cost outweighs the value. Also introduces a governance question (who approves protocol edits?) that's its own design discussion.

## Decision

**Recommended: ship Approach A first.** Use it to surface answers to stakeholder questions 1, 2, and 4 from real usage data. If the data shows clinical teams _are_ informally tracking protocols (mentioned in care-plan text, session notes, etc.) and adherence _is_ a real concern, proceed to B. If it also shows protocol definitions need to change quarterly or per-branch, proceed to C.

**Do not ship B yet.** It's the right model _if_ the cardinality, selection workflow, and adherence-mandatory question are settled. Without those answers, we'd ship a schema that probably needs migration within 3 months. Migrations on `Beneficiary`-keyed collections in this codebase are expensive (each migration has had ≥1 prod surprise; see ADR-008).

**Do not ship C yet.** Versioning + approval workflow is a significant governance surface. We should only commit to it after B has been in production long enough to show that the 20 inline protocols are insufficient — which we won't know for at least one quarter post-B-launch.

## Consequences

If **A is accepted**:

- New `scripts/protocol-coverage-report.js` CLI (or web-admin page) — ~1-2 days.
- One new read endpoint `GET /admin/ops/protocol-coverage` on backend.
- No model changes, no migration, no role changes.
- Existing clinical workflow unchanged.
- After 4-6 weeks of running, revisit this ADR with usage data.

If **B is accepted later** (after A surfaces a need):

- New `backend/models/RehabilitationProtocol.js` (Wave-18 invariants: hash-chain envelope; cross-field validation in pre-save hook).
- New `backend/services/rehabilitationProtocol.service.js`.
- New `backend/routes/rehabilitation-protocol.routes.js` mounted via clinical-therapy registry.
- `protocolTemplateKey` validator imports the 20 keys from `advanced-therapy-protocols.js` at module load — code-change there continues to be the source of truth.
- Phase transition history follows AacProfile pattern: append-only, never mutate prior entries, transitions require reason.
- Integration with W221 measure-alert engine: closing a `REGRESSION_DETECTED` alert on a beneficiary with an active `RehabilitationProtocol` could prompt "transition to maintenance phase" — but this coupling should ship in a separate wave.
- ~25-30 new Jest tests; added to `test:sprint`.
- Frontend: new `/clinical/protocols` list page and `/clinical/protocols/[id]` detail page in alawael-rehab-platform.

If **C is accepted later** (after B has run long enough to show edit-friction):

- All of B's consequences, PLUS:
- New `ProtocolTemplate` collection with versioning (`version: Number`, `previousVersion: ObjectId`, `publishedBy`, `publishedAt`).
- Seed migration converting the 20 inline protocols to documents (one-shot, idempotent, includes content hash for drift detection).
- All consumers of `advanced-therapy-protocols.js` (smart-iep-service, smart-assessment-engine, smart-assessment-engine.routes) updated to fetch from Mongo with a 5-minute in-process cache.
- New admin UI for template authoring with WYSIWYG protocol-step editor.
- Approval workflow: senior clinician proposes edit → clinical director approves → version published.
- All existing `RehabilitationProtocol` rows reference the seeded version of their template by ObjectId; future template edits don't retroactively change them.

## Not in scope

- **AAC / PECS protocols.** Already modelled in [`AacProfile.js`](../../../backend/models/AacProfile.js) (W263). This ADR doesn't change that. If AAC ends up needing protocol-level adherence tracking, the AacProfile gains its own `adherence` sub-doc rather than being absorbed into RehabilitationProtocol.
- **Behaviour intervention plans.** Already modelled in [`BehaviorPlan.model.js`](../../../backend/models/rehab-advanced/BehaviorPlan.model.js). A future link from RehabilitationProtocol → BehaviorPlan (one-to-zero-or-one) is possible but not required by the bridge-entity concept.
- **Discharge planning.** Already modelled in [`DischargePlan.model.js`](../../../backend/models/rehab-advanced/DischargePlan.model.js). RehabilitationProtocol's `discharge_planning` phase would _trigger_ DischargePlan creation; the two models stay separate.
- **Multi-protocol cardinality decision.** Listed as stakeholder question 4. Until answered, we don't commit to one-protocol-per-beneficiary vs many.
- **Activation rules (assessment → protocol recommendation).** Mentioned in the gap analysis as an _optional_ future layer. If shipped, it's a separate `ProtocolRecommendationRule` collection and a separate ADR — not part of the bridge entity itself.

## References

- Audit performed 2026-05-21 (this session) — full model + service + route map in the audit subagent output.
- AacProfile PECS history pattern: [`backend/models/AacProfile.js`](../../../backend/models/AacProfile.js) (Wave 263).
- Multi-disciplinary team pattern: [`backend/models/rehab-center/individualized-plan.model.js`](../../../backend/models/rehab-center/individualized-plan.model.js).
- Inline protocol data (proposed promotion target in Approach C): [`backend/rehabilitation-services/advanced-therapy-protocols.js`](../../../backend/rehabilitation-services/advanced-therapy-protocols.js).
- Wave-18 invariants (hash-chain): `backend/intelligence/hash-chain.lib.js`.
- Atomic-commit pattern for any future implementation wave: ADR-016.
- Related stakeholder-call ADR with similar shape: ADR-017 (measure-alert dismiss SoD).
- Validation interview kit (use to prep stakeholder conversation): `docs/blueprint/37-validation-interview-kit.md`.
