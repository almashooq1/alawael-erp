# 26. IEP / IFSP vs Care-Plan-Version — Three-Way Fragmentation

Date: 2026-05-24

## Status

🟢 **DECIDED — Approach B (tier by use-case, formalize boundaries).** Decided 2026-06-11
under delegated owner authority, grounded in the live-prod audit + the goal-model
clinical-fit finding (below).

> **DECISION (2026-06-11) — Approach B: tier by use-case; do NOT force-merge.**
>
> **Rationale (evidence-backed):**
> 1. **Regulatory boundary is real, not fragmentation.** `IndividualEducationPlan`
>    is **Ministry-of-Education-mandated** (carries `signatures[].nafathRequestId`,
>    `planYear`, MoE-specific structure). It **cannot** be deprecated into a clinical
>    care-plan without losing legal-compliance structure — so Approach A/C are
>    rejected. `IFSP` is early-intervention-specific (its own lifecycle + natural-
>    environment fields). These serve **distinct regulatory/clinical purposes**.
> 2. **Empty prod data → no migration cost, pick the cleanest forward direction.**
>    The 2026-06-11 prod audit shows `CarePlan = 0`, `TherapeuticPlan = 0` — there is
>    **no data to migrate** under any approach, so the choice is purely about forward
>    architecture, and the regulation-respecting one wins.
> 3. **Consistency with ADR-040 (same session, same logic).** The goal models resolve
>    the same way: `TherapeuticGoal` = canonical finalized goal; `SmartGoal` = a
>    legitimate qualitative-suggestion tier (the assessment-engine templates are
>    SMART-*text*-shaped, NOT numeric-`target.value`-shaped — confirmed by reading
>    the templates). "Tier by use-case" is the coherent platform-wide answer.
>
> **What this means concretely:**
> - **Canonical therapeutic/rehab plan** = `UnifiedCarePlan` / `CarePlanVersion`
>   (the W41-51 workflow + the W44/W50 intelligence run on it).
> - **Keep `IndividualEducationPlan`** as the MoE education plan; **keep `IFSP`** as
>   the early-intervention plan — both **cross-linked by `beneficiaryId`**, both
>   surfaced on the Beneficiary-360, both brought under MFA-tier enforcement
>   (per ADR-019) as the next formalization step.
> - **No regulatory requirement is changed or removed** by this decision (IEP/IFSP
>   stay) → zero compliance risk; it only *formalizes* the existing boundaries.
>
> **Remaining (engineering, now unblocked):** MFA-enforce IEP/IFSP routes; add the
> `beneficiaryId` cross-link surfacing; fix the `IFSP.child` semantic-mismatch ref
> (W324/W329 class). These are safe, additive follow-ups — no model is merged.

_(Original proposal + the A/B/C analysis + ecosystem counts retained below for the record.)_

> **📋 Decision-ready brief**: see [026-DECISION-BRIEF.md](026-DECISION-BRIEF.md) for live codebase ecosystem counts (correcting some of the effort estimates below), stakeholder meeting agenda, and no-regrets pre-work items that ship value regardless of which approach wins.

This ADR is a proposal, not an accepted decision. The discovery was made during
a Wave 355 scoping pass that initially planned to add `IEP` / `IFSP` / `ITP` as
new `PLAN_TYPES` entries in
[`backend/intelligence/care-planning.registry.js`](../../../backend/intelligence/care-planning.registry.js).
File-system audit revealed that IEP and IFSP **already exist as two separate
models with their own routes** — adding a third Care-Plan-Version-based
representation would create a 4-way fragmentation. The path forward depends on
operational context (which structure is in active production use, what the
Ministry of Education actually requires, which fields are clinically vs
legally vs operationally distinct) that this agent cannot resolve alone.

## Context

The platform has **three parallel structures** for what is conceptually
"a written multi-disciplinary plan for a beneficiary":

### Structure 1 — `CarePlanVersion` (Wave 41, canonical)

- Model: [`backend/models/CarePlanVersion.js`](../../../backend/models/CarePlanVersion.js)
- Registry: [`backend/intelligence/care-planning.registry.js`](../../../backend/intelligence/care-planning.registry.js)
- W332 drift guard: [`backend/__tests__/care-plan-registry-integrity-wave332.test.js`](../../../backend/__tests__/care-plan-registry-integrity-wave332.test.js)
- **13-status canonical lifecycle**: DRAFT → VALIDATION_PENDING →
  READY_FOR_SUBMISSION → SUBMITTED_TO_SUPERVISOR → UNDER_REVIEW →
  REVISION_REQUESTED → ESCALATED_TO_BRANCH_MANAGER → APPROVED → REJECTED →
  ARCHIVED → SUPERSEDED → SAVED_TO_RECORD → FAMILY_NOTIFICATION_SENT
- **8 plan types**: individual_therapy, individual_education, behavioral,
  family_support, group, multidisciplinary, review, intensive
- `beneficiaryId: ref:'Beneficiary'` ✅ canonical (W324+W329 compliant)
- Hash-chain signature ledger + Wave-18 cross-field invariants + SoD enforcement
  (reviewer ≠ author ≠ approver) + evidence-hash immutability on approval
- **30+ caller ecosystem** in `backend/intelligence/`:
  `care-plan.service`, `care-plan-validator.service`,
  `care-plan-recommendation-builder.service`,
  `care-plan-side-effects.service`, `care-plan-audit-trail.service`,
  `care-plan-role-views.service`,
  `family-version-generator.service`,
  `care-plan-report-generator.service`,
  `care-plan-progress-reviewer.service`,
  `care-plan-explanation-generator.service`,
  `care-plan-overdue-review.scanner`,
  `care-plan-family-retry.worker`,
  `group-plan.service`,
  `startup/carePlanningBootstrap.js`,
  plus 9+ Wave test suites (`care-plan-wave41`, `…wave42`, `…wave43`, `…wave44`,
  `…wave45`, `…wave47`, `…wave48`, `…wave49`, `…wave50`, `…wave54`, `…wave60`)
- Mounted via `carePlanningBootstrap` and `care-plan.routes`
- **This is the canonical "Plan of Care" infrastructure** by every metric:
  ecosystem size, doctrine coverage, hash-chain integration, MFA gating.

### Structure 2 — `IndividualEducationPlan` (Wave 200b)

- Model: [`backend/models/IndividualEducationPlan.js`](../../../backend/models/IndividualEducationPlan.js)
- Routes: [`backend/routes/iep.routes.js`](../../../backend/routes/iep.routes.js)
  (mounted via [`routes/registries/features.registry.js:44`](../../../backend/routes/registries/features.registry.js))
- **6-status lifecycle**: `draft → team_review → signed → active → completed → archived`
- **2 plan types**: `IEP` (school-age) + `IFSP` (early-intervention, age ≤ 36 months)
- `beneficiaryId: ref:'Beneficiary'` ✅ canonical
- Nafath e-signature integration (`signatures[].nafathRequestId`)
- Domains enum (academic, communication, social_emotional, motor, self_care,
  behavior, cognitive, pre_vocational) embedded in goals
- **Caller surface**: just `iep.routes.js` + 1 test file
  (`tests/unit/beneficiary-management.routes.test.js`). No intelligence layer.
  No validator. No family-version generator. No hash-chain. No MFA gate.
- Built for **Ministry of Education** compliance ("required by وزارة التعليم
  السعودية for special education programs" per the model header).

### Structure 3 — `early-intervention/IFSP.model.js` (no wave number)

- Model: [`backend/models/early-intervention/IFSP.model.js`](../../../backend/models/early-intervention/IFSP.model.js)
- Aggregator: [`backend/models/early-intervention/index.js`](../../../backend/models/early-intervention/index.js)
- Backward-compat shim: [`backend/models/EarlyIntervention.js`](../../../backend/models/EarlyIntervention.js)
  (re-exports `./early-intervention/index`)
- Routes: [`backend/routes/early-intervention.routes.js`](../../../backend/routes/early-intervention.routes.js)
  (mounted via [`routes/registries/clinical-assessment.registry.js:29`](../../../backend/routes/registries/clinical-assessment.registry.js))
- **7-status lifecycle**: DRAFT → PENDING_APPROVAL → ACTIVE → IN_REVIEW →
  AMENDED → COMPLETED → CANCELLED
- **4 plan types**: INITIAL / ANNUAL_REVIEW / PERIODIC_REVIEW / AMENDMENT
- `child: ref:'EarlyInterventionChild'` ❌ **NOT Beneficiary** — this is the same
  bug class as the W324+W329 semantic-mismatch findings. The IFSP plan
  references a separate `EarlyInterventionChild` entity that lives in
  `models/early-intervention/EarlyInterventionChild.model.js` rather than
  the canonical `Beneficiary`.
- `organization: ref:'Organization'` ❌ NOT `Branch` (W326 canonical).
- `serviceCoordinator: ref:'User'` ✅
- Service coordinator workflow + transition plan (EI → preschool) + natural
  environments tracking + family assessment block — features the IndividualEducationPlan
  (Structure 2) IFSP does **not** have.
- **Caller surface**: `early-intervention/index.js` aggregator + 1 test file.

### The conflict

All three structures claim to model "a plan written for a beneficiary." But:

- Structure 1 (CarePlanVersion) does NOT recognize IEP / IFSP / ITP as plan
  types. Its `individual_education` plan type exists but is not the same
  shape as Structure 2's IEP (no signatures, no domain enum, no review history,
  no plan-year cardinality).
- Structure 2 (IndividualEducationPlan) is the only one with Nafath signature
  integration + Ministry of Education domain coverage. But it lives outside
  the W41 ecosystem — no validator, no hash-chain, no MFA, no readiness scoring,
  no family-version generator.
- Structure 3 (early-intervention/IFSP) refs the wrong entity
  (`EarlyInterventionChild` instead of `Beneficiary`) and the wrong org node
  (`Organization` instead of `Branch`). It has the richest IFSP-specific
  feature set (service coordinator, transition plan, natural environments)
  but is the most isolated from canonical infrastructure.

Risks:

1. **Beneficiary 360 doctrine is incomplete.** The
   [`01-beneficiary-360-master.prompt.md`](../../../.github/prompts/01-beneficiary-360-master.prompt.md)
   treats Beneficiary as the longitudinal anchor for all plans. But for a
   child with both an IEP (Structure 2) AND an active CarePlanVersion
   (Structure 1) AND an IFSP record (Structure 3), surfacing the "complete plan
   timeline" requires querying THREE collections with no shared lifecycle vocabulary.

2. **Lifecycle semantics conflict.** Structure 1's `approved` ≠ Structure 2's
   `active` ≠ Structure 3's `ACTIVE`. A plan being "approved" in CarePlanVersion
   means the supervisor signed off (reviewer ≠ author SoD). "Active" in
   IndividualEducationPlan means the parent signed via Nafath and the plan is
   in effect. "ACTIVE" in IFSP means service-coordinator approval. These are
   different gates, even if the surface English word is similar.

3. **Audit-log fragmentation.** Per [ADR-009](009-audit-trail-standard.md),
   the platform aspires to a single audit trail per beneficiary. Three plan
   collections means three distinct audit paths.

4. **MFA tier enforcement gap.** Structure 1 has `enforceMfa:true` at multiple
   transition gates (per [ADR-019](019-mfa-tier-enforcement-three-layer.md)).
   Structures 2 + 3 have role-based RBAC but no MFA tier gate — meaning a
   stolen session cookie + parent role could sign an IEP via Nafath replay
   without step-up MFA, but the same actor could NOT approve a CarePlanVersion.

5. **PDPL retention drift.** CarePlanVersion is governed by the canonical
   TTL + retention rules. Structures 2 + 3 do not declare TTLs — risk of
   indefinite retention of PHI on the IEP / IFSP collections.

6. **Drift guard scope ambiguity.** The W332 drift guard locks Structure 1's
   shape at "exactly 8 PLAN_TYPES". Adding IEP / IFSP / ITP requires either:
   (a) updating W332's baseline (the trivial-but-fragmenting path), or
   (b) deciding which Structure is canonical and migrating callers.

## The actual question

**Which structure should be canonical for written plans, and what happens to
the other two?**

Possibilities:

- **A.** Structure 1 (`CarePlanVersion`) is canonical. Structures 2 + 3 are
  legacy parallel implementations from before the Wave 41 build-out and need
  to be migrated into Structure 1's plan-type system (with IEP / IFSP / ITP as
  new PLAN_TYPES + the goal/service/signature subdocs absorbed).
- **B.** Structures co-exist with explicit roles: CarePlanVersion for clinical
  / therapeutic plans, IndividualEducationPlan for Ministry-of-Education legal
  artifacts, IFSP (early-intervention) for the ≤36-month population. Each has
  its domain.
- **C.** Structures 2 + 3 are tech debt that arose during rapid Saudi
  integrations (W200b shipped IEP standalone; early-intervention/IFSP shipped
  even earlier without a wave tag). The right call is to deprecate them in
  favour of Structure 1 plus a thin "Ministry-of-Education export adapter."

The discovery agent cannot determine which is correct without input from:

1. Clinical director — "do you treat IEPs as separate documents from
   therapeutic care plans, or as a view of the same plan?"
2. Ministry-of-Education compliance lead — "does the ministry require the
   exact Structure-2 IEP shape (e.g. the 8-domain enum, the signed-PDF flow),
   or would a Structure-1 CarePlanVersion with IEP type satisfy them?"
3. Early-intervention domain owner — "is `EarlyInterventionChild` a
   meaningfully different entity from `Beneficiary`, or just a domain projection
   of beneficiaries aged ≤ 36 months? If the latter, why does IFSP not ref
   Beneficiary?"

## Three approaches under consideration

### Approach A — Consolidate everything into `CarePlanVersion`

**What ships (multi-wave initiative, ~3-5 waves):**

- Add 3 new entries to `PLAN_TYPES` in
  `backend/intelligence/care-planning.registry.js`:
  `INDIVIDUAL_EDUCATION_PROGRAM: 'iep'`, `INDIVIDUAL_FAMILY_SERVICE_PLAN: 'ifsp'`,
  `INDIVIDUAL_TRANSITION_PLAN: 'itp'`. Total grows from 8 → 11.
- Update W332 drift guard baseline to expect 11 plan types (must happen in the
  same commit per the W325c ratchet-down pattern).
- Add IEP-specific subdoc schemas (Goal with domain enum, Signature with
  Nafath integration, Service with frequency + provider) as **optional embedded
  blocks** on `CarePlanVersion.body` — only populated when planType ∈ {iep, ifsp}.
- Extend `care-planning.registry.TRANSITIONS` to include the IEP-specific
  Nafath signature gate (`team_review → signed → active` becomes a sub-flow
  of `submit_to_supervisor → approve → save_to_record → family_notification_sent`
  with an additional `parent_nafath_sign` transition).
- Migrate documents: existing `IndividualEducationPlan` and `IFSP` collections
  → new `CarePlanVersion` documents with the appropriate `planType` and the
  rich subdoc body. One-shot migration script in `scripts/migrations/`.
- Deprecate models 2 + 3 + drop their routes (`iep.routes.js`,
  `early-intervention.routes.js`). API consumers redirect to
  `/api/care-plans?planType=iep`.
- Fix the `EarlyInterventionChild` → `Beneficiary` ref mismatch in the
  process (same bug class as W324+W329, currently uncaught because
  `EarlyInterventionChild` IS registered, just semantically wrong).

**Cost:** ~3-5 waves. Migration script complexity. Subdoc-schema additions to
CarePlanVersion. Coordinate with Ministry-of-Education compliance to verify the
absorbed shape still meets their requirements.

**Pros:** True single-source-of-truth. Beneficiary 360 trivially aggregates
all plan types. Hash-chain + MFA + family-version-generator + audit-trail +
PDPL TTL all extend naturally to IEP / IFSP. Closes the
`EarlyInterventionChild → Beneficiary` semantic-mismatch latent bug.

**Cons:** Big migration. Risk of breaking existing IEP signed-PDF flows if
ministry inspections rely on the current Structure-2 shape. Inflates
`CarePlanVersion` schema with domain-specific subdocs for IEP / IFSP that
don't apply to therapeutic plans.

### Approach B — Tier by use-case, formalize boundaries

**What ships (~1-2 waves):**

- ADR-026 accepted with rationale: "CarePlanVersion is for clinical care plans
  drafted by therapists/supervisors. IndividualEducationPlan is the
  Ministry-of-Education legal artifact (signed PDF, school-year cadence,
  Nafath e-signature). IFSP (early-intervention) is the ≤36-month variant
  that includes service coordinator + transition plan + natural environments."
- Add `CarePlanVersion.linkedIepId: ref:'IndividualEducationPlan'` optional FK
  for cross-referencing.
- Add `IndividualEducationPlan.linkedCarePlanVersionId: ref:'CarePlanVersion'`
  for the reverse link.
- **Fix the IFSP ref mismatch**: rename `IFSP.child` → `IFSP.beneficiaryId`
  with `ref:'Beneficiary'`. Drop the `EarlyInterventionChild` indirection or
  reposition it as a contextual sub-view (per ADR-020 Approach B).
- **Extend MFA tier enforcement** to IEP + IFSP routes (per ADR-019). Status
  transitions on Structure 2 + 3 must require `loadMfaActor` + the same tier
  gates as CarePlanVersion's analogous transitions.
- **Add PDPL TTL** to Structures 2 + 3 (30-day minimum, per W14 PDPL baseline).
- Document the 3-way relationship in the Beneficiary 360 prompt's READ FIRST.
- W332 stays at 8 plan types (no fragmentation in registry).

**Cost:** ~1-2 waves. Cross-collection ref additions. MFA + TTL retrofit on
Structures 2 + 3.

**Pros:** Preserves existing IEP signed-PDF workflow exactly. Each structure
keeps its domain-specific schema validation. Smaller blast radius. Closes the
IFSP ref-mismatch bug.

**Cons:** Three parallel collections to maintain. Cross-collection joins
required for "complete plan timeline." Three audit-log paths (mitigated by
forced linkage). Risk of future drift between the three lifecycles
(approved/active/ACTIVE).

### Approach C — Deprecate Structures 2 + 3 in favour of Structure 1 + adapter

**What ships (~2-3 waves):**

- Structure 1's `CarePlanVersion` absorbs IEP + IFSP as new `PLAN_TYPES` (same
  as Approach A's registry change).
- A new thin adapter `services/iep-export.adapter.js` produces the
  Ministry-of-Education-compliant signed-PDF artifact from a CarePlanVersion
  with `planType:'iep'`. Same for an IFSP-export adapter.
- Structure 2 and Structure 3 routes are marked `lifecycleStatus:'DEPRECATED'`
  (mirror of W325 P1 measure deprecation pattern). New code uses
  `/api/care-plans?planType=iep` exclusively. Existing IEP / IFSP routes
  continue to serve until callers migrate.
- Drift guard W333+ prevents new code from importing
  `models/IndividualEducationPlan` or `models/early-intervention/IFSP.model`.
- Optional sunset: after all callers migrate, drop Structures 2 + 3.

**Cost:** ~2-3 waves. Adapter complexity. Coordinate sunset timeline with
callers.

**Pros:** No big-bang migration risk. Existing IEP / IFSP HTTP endpoints keep
working during transition. Adapter pattern means new code gets the canonical
single-source-of-truth without disrupting integrations.

**Cons:** Carries the divergence as long as any caller hasn't migrated.
Adapter must precisely reproduce the Ministry-of-Education signed-PDF artifact
that Structure 2 currently emits — risk of subtle compliance gaps if the
adapter is incomplete. The `EarlyInterventionChild` ref mismatch persists in
the deprecated Structure 3 until sunset.

## Decision

**No decision yet. This ADR proposes the question.**

Recommended discovery before picking an approach:

1. **Interview clinical director**:

   - "When a child has both an IEP and a therapy care plan, are they
     conceptually one plan or two? Are the goals tracked separately?"
   - "Do you ever supersede an IEP with a newer therapy plan, or vice versa?"
     This answers whether IEP/IFSP are a sub-type or a separate domain.

2. **Interview Ministry-of-Education compliance lead**:

   - "Does the ministry require Structure 2's specific PDF shape (8-domain
     enum, signatures with Nafath request IDs, year-bounded planYear) — or
     would a CarePlanVersion with `planType:'iep'` and an export adapter
     satisfy them?"
   - "If we migrate, do existing signed IEPs need to remain in their original
     storage for legal continuity, or can they be rewritten into a new shape?"
     This answers the compliance constraint that drives Approach A vs Approach C.

3. **Interview early-intervention domain owner**:

   - "Why does IFSP ref `EarlyInterventionChild` instead of `Beneficiary`?
     Is `EarlyInterventionChild` a meaningfully different entity, or a
     historical naming choice?"
   - "Does the ≤36-month IFSP population have data that wouldn't fit on a
     `Beneficiary` document? Or could the EI-specific fields move to a
     `Beneficiary.earlyInterventionProfile` subdoc?"
     This answers whether Approach B's IFSP ref-rename is safe.

4. **Audit production data (if accessible)**:

   - "How many `IndividualEducationPlan` documents exist? How many are in
     `signed` or `active` status (i.e. legally binding)?"
   - "How many `EarlyInterventionChild` documents are NOT linked to a
     `Beneficiary` via name + DOB + national ID match? Are they orphans
     or legitimate non-Beneficiary records?"
   - "How many `CarePlanVersion.planType:'individual_education'` documents
     exist? Are they being used as a parallel-to-IEP record, or for something
     else?"
     This answers the migration scope for Approach A or C.

5. **Inspect frontend dependencies** (this agent did not):
   - "Which web-admin or mobile pages call `/api/iep` vs `/api/care-plans`?
     Are there pages that assume the Structure-2 shape that would break under
     Approach A or C?"

Once those questions are answered:

- If clinical director + ministry both say "IEPs are a sub-type of care plans;
  the export adapter would satisfy compliance" → **Approach A** (consolidate)
  or **Approach C** (deprecate via adapter).
- If clinical director or ministry says "IEPs are a legally distinct document
  with cadence/signature requirements that don't map onto CarePlanVersion"
  → **Approach B** (formalize the link).
- If early-intervention owner says "EI children are tracked separately from
  Beneficiaries on purpose" → keep Structure 3 separate; otherwise Structure
  3's `EarlyInterventionChild` ref is just a phantom-mismatch bug to fix.

## Consequences

If **A is accepted**:

- W355+ multi-wave migration. New CarePlanVersion subdoc schemas (Goal with
  domains, Service with frequency, Signature with Nafath). W332 drift guard
  baseline updated from 8 → 11 PLAN_TYPES.
- Migration script for existing `IndividualEducationPlan` and `IFSP`
  collections → `CarePlanVersion` documents.
- Routes deprecated: `iep.routes.js`, `early-intervention.routes.js` →
  redirect to `/api/care-plans?planType=iep|ifsp`.
- IFSP `EarlyInterventionChild` → `Beneficiary` semantic fix included in
  migration (closes a latent W324+W329-class bug).
- Ministry-of-Education PDF artifact regenerated from the new shape; legal
  team verifies equivalence.

If **B is accepted**:

- W355+ (~1-2 waves): cross-FK additions (`linkedIepId` /
  `linkedCarePlanVersionId`). IFSP ref-rename. MFA + TTL retrofit.
- W332 stays at 8 PLAN_TYPES.
- Beneficiary 360 doctrine updated to document the 3-structure relationship.
- Drift guard for cross-FK link integrity (every IEP must link to a
  CarePlanVersion if one exists; or vice versa — depending on direction).

If **C is accepted**:

- W355+ (~2-3 waves): same registry additions as Approach A, plus IEP-export
  adapter + IFSP-export adapter. Routes deprecated with sunset banner. Drift
  guard prevents new imports of legacy models.
- Ministry-of-Education PDF artifact must round-trip cleanly through the
  adapter; legal team verifies.
- Sunset timeline tied to caller migration.

## Not in scope

- The W355 originally proposed (`add IEP/IFSP/ITP as new PLAN_TYPES`) — that
  proposal is **superseded by this ADR**. No code change should land that
  expands PLAN_TYPES without first resolving the question above.
- Renaming `studentAgeMonths`, `planYear`, or other Structure-2-specific
  fields. Field-name churn is a separate downstream decision.
- Frontend impact analysis. The web-admin and mobile clients' assumptions
  about `/api/iep` and `/api/care-plans` need a separate inventory.
- The `EarlyInterventionChild` model itself — whether it should be deleted,
  renamed, or repositioned is a knock-on decision from Structure 3's fate.
- Sibling fragmentation: the platform also has 3 clinical-session models
  (TherapySession + ClinicalSession + DisabilitySession, see
  `04-programs-sessions-progress-engine.prompt.md` READ FIRST). That belongs
  in its own ADR.

## Addendum (2026-06-11, W1232/W1233) — a FOURTH structure: `SmartIEP`

The original three-structure analysis **missed a fourth IEP-family model**,
surfaced while building the Beneficiary-360 IEP cross-link (the Approach-B
"surface IEP on the 360" follow-up). The "IEP" tier this ADR decided to keep is
**itself internally duplicated**:

| | Structure 2 — `IndividualEducationPlan` | **Structure 4 — `SmartIEP`** |
| --- | --- | --- |
| Model | [`backend/models/IndividualEducationPlan.js`](../../../backend/models/IndividualEducationPlan.js) | [`backend/models/SmartIEP.js`](../../../backend/models/SmartIEP.js) |
| Route | `/api/v1/iep` ([`routes/iep.routes.js`](../../../backend/routes/iep.routes.js)) | `/api/v1/smart-iep` ([`rehabilitation-services/smart-iep-routes.js`](../../../backend/rehabilitation-services/smart-iep-routes.js)) |
| Status enum | `draft/team_review/signed/active/completed/archived` | `draft/pending_review/active/under_review/completed/discontinued` |
| Distinctive | Nafath `signatures[].nafathRequestId`, MoE `planYear` shape, W324/W329/W332 drift guards | parent-consent flow, goal-bank, meetings, `overall_progress`, transition/behavior-support plan types |
| **web-admin UI** | **none** | **full** — `/iep` list+detail+new (2026-05-27) via `@/lib/iep-api` |
| Canonical sense | **doc/legal**-canonical (this ADR named it "the MoE IEP") | **UI/product**-canonical (what clinicians actually use) |

**The trap:** this ADR's DECIDED text named `IndividualEducationPlan` as "the
MoE-mandated IEP … surfaced on the Beneficiary-360." But the only IEP a clinician
can open in the go-forward UI is `SmartIEP`. Surfacing `IndividualEducationPlan`
on the 360 (as **W1231** first did) produced a **dead-end card** (no detail page)
pointing at a likely-empty model. **W1232** re-pointed the 360 card to `SmartIEP`
(via the existing `@/lib/iep-api`, deep-linking the live `/iep/[id]`) — the
pragmatic, UI-true choice — and reverted the W1231 `IndividualEducationPlan`
client/types so the API layer is not fragmented too.

**This does NOT overturn Approach B.** "Tier by use-case; IEP stays separate from
`CarePlanVersion`" still holds. It only reveals that **the IEP tier has its own
2→1 consolidation question** that Approach B must eventually answer:

- **Open sub-question:** is `SmartIEP` or `IndividualEducationPlan` THE canonical
  IEP? They have **complementary** strengths — `SmartIEP` owns the UI + richer
  workflow; `IndividualEducationPlan` owns the **Nafath e-signature / MoE legal
  shape**. A real consolidation would likely fold the Nafath-signature block into
  `SmartIEP` (UI-canonical) and retire `/api/v1/iep`, OR formally scope them
  (SmartIEP = working plan, IndividualEducationPlan = signed legal record). This
  needs the **same stakeholder input** (MoE compliance lead) the parent ADR awaits
  — do NOT auto-merge.
- **Until then:** the 360 surfaces `SmartIEP` (W1232). Do **not** add a second
  web-admin client for `IndividualEducationPlan` — that would deepen, not resolve,
  the fragmentation.
- **MFA sequencing (unchanged):** enforcing `requireMfaTier` on either IEP's
  mutation routes is correctly **sequenced behind a step-up-aware editing UI** —
  `requireMfaTier` hard-403s a no-MFA actor, so enforcing before the UI can render
  a step-up prompt would dead-end clinicians on a legally-mandated document.

## References

- [ADR-018 — rehabilitation-protocol-entity](018-rehabilitation-protocol-entity.md):
  Same "Proposed pending stakeholder input" pattern.
- [ADR-020 — student-vs-beneficiary-consolidation](020-student-vs-beneficiary-consolidation.md):
  Sibling fragmentation; same 3-approach framework.
- [ADR-021 — duplicate-model-registration-consolidation-strategy](021-duplicate-model-registration-consolidation-strategy.md):
  4-pattern decision tree (A/B/C/D) for duplicate model names.
- [ADR-009 — audit-trail-standard](009-audit-trail-standard.md): Single-audit-trail
  invariant that motivates Approach A.
- [ADR-019 — mfa-tier-enforcement-three-layer](019-mfa-tier-enforcement-three-layer.md):
  5-layer MFA stack. Structures 2 + 3 currently bypass layers 2 + 5.
- W324 + W329 canonical Beneficiary ref enforcement:
  `backend/__tests__/canonical-beneficiary-ref-wave324.test.js`.
- W325c universal phantom-ref drift guard:
  `backend/__tests__/universal-model-ref-drift-wave325c.test.js`.
- W332 care-plan registry integrity:
  `backend/__tests__/care-plan-registry-integrity-wave332.test.js`.
