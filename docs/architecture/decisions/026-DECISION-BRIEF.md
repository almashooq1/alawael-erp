# ADR-026 Decision Brief — Stakeholder Preparation

**Type**: Research output (Cycle 3 from OPEN_ISSUES_INVENTORY.md) — prepares ADR-026 for the stakeholder meeting
**Date**: 2026-05-25
**Audience**: Clinical director + Ministry-of-Education compliance lead + early-intervention domain owner (the 3 deciders named in ADR-026)
**Purpose**: Ground the A/B/C choice in current codebase reality so the meeting decides quickly

This brief complements [026-iep-ifsp-care-plan-fragmentation.md](026-iep-ifsp-care-plan-fragmentation.md). The ADR itself describes the 3 approaches; this brief adds **actual ecosystem counts** + **stakeholder meeting agenda** + a **no-regrets pre-work item** that ships value regardless of which approach wins.

---

## 1. Live ecosystem facts (the missing data from ADR §5)

| Dimension                     | Structure 1 — `CarePlanVersion`                                                                                                                                           | Structure 2 — `IndividualEducationPlan`                                                                                                                  | Structure 3 — `early-intervention/IFSP`                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend files referencing it  | **30+** (per ADR §1)                                                                                                                                                      | **4 files**: model + 1 route + features.registry mount + 3 cross-refs from W356-W370 modules (AssistiveDevice, CommunicationAidProfile, TransitionPlan)  | **11 files** within `backend/models/early-intervention/` + `services/earlyIntervention.service.js` + 3 test files                                |
| Backend service-method count  | Multiple intelligence services (~50+ methods across `care-plan.service`, validator, side-effects, audit-trail, reviewer, family-version-generator, scanner, worker, etc.) | **0** dedicated service — routes go straight to the model                                                                                                | **25+ public methods** in earlyIntervention.service.js (createChild, getChildren, createScreening, …, createIfsp, getIfsps, updateIfspStatus, …) |
| Drift guards                  | W332 (registry integrity) + W41 + 8 more wave suites                                                                                                                      | None (one test file references it)                                                                                                                       | Unit tests for service + model only                                                                                                              |
| Frontend pages consuming it   | `/care-plans/`, `/care-planning/` + cross-surface aggregator at `/clinical-services/[id]`                                                                                 | **TWO** paths: `/iep/` (older, list+detail+new) + `/iep-plan/` (newer, list+detail; **W200b MoE-aligned**) — pre-existing fragmentation in the UI itself | **None in main dashboard** (per Cycle 2 frontend audit). Backend routes exist but no Next.js page consumes them.                                 |
| Mount path                    | `/api/care-plans` + `/api/v1/care-plans`                                                                                                                                  | `/api/v1/iep-plan` (NOT `/iep` — explicit comment in `features.registry.js:142-143` warns of collision with `/smart-iep`)                                | `/api/early-intervention` + `/api/v1/early-intervention`                                                                                         |
| Canonical `beneficiaryId` ref | ✅ `ref: 'Beneficiary'`                                                                                                                                                   | ✅ `ref: 'Beneficiary'`                                                                                                                                  | ❌ `child: ref: 'EarlyInterventionChild'` (semantic-mismatch bug, W324+W329 class)                                                               |
| MFA tier gating               | ✅ Multiple transition gates                                                                                                                                              | ❌ RBAC only                                                                                                                                             | ❌ RBAC only                                                                                                                                     |
| Hash-chain audit              | ✅                                                                                                                                                                        | ❌                                                                                                                                                       | ❌                                                                                                                                               |
| PDPL TTL declared             | ✅                                                                                                                                                                        | ❌                                                                                                                                                       | ❌                                                                                                                                               |
| Nafath e-signature            | ❌ (planned via family-version-generator)                                                                                                                                 | ✅ `signatures[].nafathRequestId`                                                                                                                        | ❌                                                                                                                                               |

### Key surprises from the count

1. **Structure 2's ecosystem is genuinely TINY**: 4 files. Migrating (Approach A) would be cheap on the backend side. The ADR's "~3-5 waves" estimate may overstate Structure 2's cost; closer to **1-2 waves for Structure 2 alone**.

2. **Structure 3's ecosystem is the LARGEST OUTSIDE CarePlanVersion**: 25+ service methods + 5 models in early-intervention/ domain. The ADR's "~3-5 waves" understates Structure 3's cost; closer to **5-8 waves for Structure 3 alone**. This is the real cost-driver of Approach A.

3. **CarePlanVersion.planType:'individual_education' is essentially DEAD CODE**: only 4 files reference the literal string, none meaningfully use the plan-type. So Approach A's "add IEP/IFSP/ITP" isn't replacing live code — it's BUILDING IEP/IFSP support inside CarePlanVersion for the first time.

4. **Two frontend paths for IEP already exist**: `/iep/` (older) AND `/iep-plan/` (newer, MoE-aligned). This is pre-existing UI fragmentation that no approach addresses without explicit cleanup.

5. **Structure 3 has NO frontend yet**: backend routes exist but Next.js doesn't have an `/early-intervention` dashboard page. So Approach A or C don't break any web-admin URL for IFSP — only Structure 2's two paths matter for frontend disruption.

---

## 2. Risk matrix per approach (against 5 dimensions)

| Risk dimension                     | Approach A (consolidate)                                                                                                | Approach B (formalize tiers)                 | Approach C (adapter + deprecate)                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| **MoE legal-PDF compliance**       | ⚠ Migration must preserve Structure-2 signed-PDF artifact equivalence. Legal sign-off required.                        | ✓ Structure-2 untouched; PDF flow unchanged. | ⚠ Adapter must round-trip exactly. Subtle drift risk.  |
| **Data migration scope**           | ⚠ Migration script needed for IndividualEducationPlan + IFSP collections → CarePlanVersion. Risk of subtle field-loss. | ✓ No data migration.                         | ✓ No data migration (adapter projects on read).         |
| **MFA + audit-trail uplift**       | ✓ Free for IEP/IFSP — inherits CarePlanVersion's stack.                                                                 | ⚠ Manual retrofit on Structures 2 + 3.      | ✓ Free for new code. ⚠ Legacy routes still bypass MFA. |
| **EarlyInterventionChild ref bug** | ✓ Fixed during migration (Structure 3 absorbed).                                                                        | ✓ Fixed by Structure-3 ref rename.           | ⚠ Persists in deprecated Structure 3 until sunset.     |
| **Stakeholder coordination**       | 3 stakeholders + legal + caller-migration                                                                               | 3 stakeholders + cross-FK design             | 3 stakeholders + ongoing sunset coordination            |
| **Total effort**                   | **~5-8 waves** (corrected from ADR estimate)                                                                            | **~1-2 waves**                               | **~3-5 waves** + sunset overhead                        |
| **Net long-term value**            | HIGHEST (true single source of truth)                                                                                   | MEDIUM (3 collections stay)                  | MEDIUM-HIGH (eventual consolidation)                    |

---

## 3. No-regrets pre-work (ships TODAY regardless of A/B/C)

Regardless of which approach the stakeholders pick, these items add value and don't predetermine the outcome:

| #   | Item                                                                                                                                                                   | Mode                      | Status                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **MFA tier retrofit on `iep.routes.js`** — wrap 3 sensitive endpoints (sign / transition / delete) with `requireMfaTier(2)` matching CarePlanVersion's analogous gates | 🤖 Claude-side autonomous | ✅ **SHIPPED** — 8-test drift guard at `__tests__/iep-mfa-tier-adr026-no-regrets.test.js`. Closes ADR-019 layer-2 gap on IEP regardless of A/B/C outcome.                                                                                                                                                                                                                 |
| 2   | ~~**PDPL 30-day TTL on IEP + IFSP collections**~~                                                                                                                      | n/a                       | ❌ **WITHDRAWN** — initial proposal was wrong. 30-day TTL would prematurely auto-delete legally-binding signed plans (MoE retention ≈ 7 years + school-year cadence). Right fix is explicit retention-policy field + LONG-retention TTL — but the policy duration is itself a stakeholder decision (legal + MoE). Reclassified as blocked-on-stakeholder; not autonomous. |
| 3   | **Cross-link FKs** (`CarePlanVersion.linkedIepId`, `IndividualEducationPlan.linkedCarePlanVersionId`)                                                                  | 🤝 small build            | ⏸ HOLD until meeting decides A/B/C (Approach A doesn't need this if migration is one-shot).                                                                                                                                                                                                                                                                              |
| 4   | **Document the 2 frontend IEP paths** (`/iep/` vs `/iep-plan/`)                                                                                                        | 🤖 Claude-side autonomous | ✅ **SHIPPED** — see [FRONTEND_AUDIT_W356_W384.md §3.5](../../FRONTEND_AUDIT_W356_W384.md). New convention: `/iep-plan/` canonical, `/iep/` legacy.                                                                                                                                                                                                                       |

**What this commit ships**: items 1 + 4. Item 2 withdrawn after deeper inspection; item 3 held until decision.

**Lesson recorded**: when shipping items proposed in earlier cycles, VERIFY each against deeper inspection before executing. Item 2 looked autonomous until reading the actual model — applying CarePlanVersion's telemetry-TTL pattern to legally-binding artifacts would have been wrong. Don't blindly execute prior plans.

---

## 4. Stakeholder meeting agenda (30 minutes)

### Goal

Resolve ADR-026 with one of A/B/C decisions. Defer field-level changes to follow-up waves.

### Attendees

- Clinical director
- Ministry-of-Education compliance lead
- Early-intervention domain owner
- Tech lead (note-taker / records decision)

### Agenda

**0:00-0:05 — Context recap** (tech lead presents)

- 3 parallel structures exist for "a written plan for a beneficiary"
- §1 ecosystem facts (use the table in this brief)
- This meeting's job: pick A/B/C (not field-level design)

**0:05-0:15 — 5 discovery questions** (ADR §"Recommended discovery"; each stakeholder answers their relevant ones)

1. **Clinical director**:

   - When a child has both an IEP and a therapy care plan, are they conceptually one plan or two?
   - Do you ever supersede an IEP with a newer therapy plan, or vice versa?

2. **MoE compliance lead**:

   - Does the ministry require Structure 2's exact PDF shape (8-domain enum, signatures with Nafath request IDs, year-bounded planYear)?
   - Would a CarePlanVersion with `planType:'iep'` and an export adapter satisfy the ministry?
   - For existing signed IEPs (legally binding), do they need to remain in their original storage, or can they be rewritten?

3. **Early-intervention domain owner**:
   - Why does IFSP ref `EarlyInterventionChild` instead of `Beneficiary`? Historical naming or meaningful difference?
   - Does ≤36-month population have data that can't fit on a `Beneficiary` doc? Could EI-specific fields move to `Beneficiary.earlyInterventionProfile` subdoc?

**0:15-0:25 — Approach selection** (decision moment)

Tech lead reads back stakeholder answers + maps to the §3 of ADR-026:

- "Sub-type + export adapter satisfies compliance" → **A** or **C**
- "Legally distinct document with own cadence" → **B**
- "EI children are tracked separately on purpose" → keep Structure 3 separate (Approach B or modified A)

**0:25-0:30 — Closure**

- Stakeholders agree on A/B/C
- Tech lead commits the decision back into ADR-026 (status: 🟡 Proposed → ✅ Accepted with [approach]) within 24h
- No-regrets pre-work items 1, 2, 4 proceed regardless (signal go/no-go to Claude)
- Item 3 (cross-FKs) proceeds if B or C wins

---

## 5. If the meeting can't be scheduled this week

The no-regrets items 1, 2, 4 from §3 above are **already actionable** without the meeting. They tighten security + compliance on the existing Structures regardless of long-term architecture. Recommend authorizing Claude to ship them as 3 small waves while the meeting is being scheduled.

The IFSP `child → EarlyInterventionChild` ref bug fix (the W324+W329-class issue) is also actionable IF Approach B or C wins (rename → `beneficiaryId: ref:'Beneficiary'`). Hold until decision.

---

## 6. Decision template (for the meeting note-taker)

```text
ADR-026 — RESOLVED 2026-MM-DD

Approach selected: [ ] A  [ ] B  [ ] C

Approver signatures (each stakeholder):
  Clinical director:                 __________________________
  Ministry-of-Education compliance:  __________________________
  Early-intervention domain owner:   __________________________
  Tech lead (note-taker):            __________________________

Key constraints recorded:
  - MoE PDF compliance: [Structure-2 PDF MUST be preserved | export adapter acceptable | new shape okay]
  - EarlyInterventionChild status: [keep separate | merge into Beneficiary | retire entity]
  - Legacy IEP storage: [in-place retention required | migration to new shape okay]
  - Sunset timeline (Approach C only): [3 months | 6 months | 12 months | not applicable]

Next agent action (after this meeting):
  - Update docs/architecture/decisions/026-iep-ifsp-care-plan-fragmentation.md
    Status: 🟡 Proposed → ✅ Accepted with Approach [A/B/C]
  - Ship no-regrets items 1, 2, 4 from DECISION-BRIEF §3
  - Open W4XX wave for approach implementation per §3 effort estimate
  - Coordinate with frontend team on /iep/ vs /iep-plan/ consolidation (Approach A or C only)
```

---

## 7. Updated effort estimates (correcting ADR's original)

| Approach                | ADR original estimate | Corrected (this brief)      | Reason                                                                  |
| ----------------------- | --------------------- | --------------------------- | ----------------------------------------------------------------------- |
| A — Consolidate         | ~3-5 waves            | **~5-8 waves**              | Structure 3 has 25+ service methods + 5 models, larger than ADR assumed |
| B — Formalize           | ~1-2 waves            | ~1-2 waves                  | Confirmed                                                               |
| C — Adapter + deprecate | ~2-3 waves            | ~3-5 waves + 6-month sunset | Adapter must precisely replicate MoE PDF; sunset coordination           |

**Approach B is genuinely the cheapest** if stakeholders agree the 3 structures are domain-distinct. The "true single source of truth" of A is real but expensive.

---

## 8. Related

- [ADR-026 itself](026-iep-ifsp-care-plan-fragmentation.md) — the proposal with full context
- [ADR-020](020-student-vs-beneficiary-consolidation.md) — sister fragmentation (Student vs Beneficiary), same A/B/C framework
- [ADR-019](019-mfa-tier-enforcement-three-layer.md) — MFA layer-2 gap on Structures 2+3
- [ADR-007](007-pdpl-compliance-baseline.md) — PDPL TTL standard
- [OPEN_ISSUES_INVENTORY.md](../../OPEN_ISSUES_INVENTORY.md) — this is Cycle 3 item from §1
- [PRODUCTION_GAPS_BEFORE_LIVE.md](../../PRODUCTION_GAPS_BEFORE_LIVE.md) — section 4 lists this ADR as blocker
