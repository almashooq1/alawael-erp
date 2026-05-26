# 31. Beneficiary Lifecycle Architecture v3 — From Linear Process to Lifelong Intelligence

Date: 2026-05-26

## Status

🟡 **Proposed** — awaiting stakeholder decision on 8 questions (see §9).

This ADR proposes a fundamental restructure of how the platform conceptualizes the beneficiary's journey, moving from a 9-stage linear process model (v1) to a 6-phase × 7-dimension matrix model (v3) anchored in international frameworks.

**Full design**: see [`docs/blueprint/beneficiary-lifecycle-v3.md`](../../blueprint/beneficiary-lifecycle-v3.md).

## Context

### The trigger

User-initiated architecture review on 2026-05-26 asked: "can we develop the beneficiary lifecycle more smartly and professionally so the beneficiary truly benefits from the project?"

The existing 9-stage lifecycle document (likely the source the user reviewed) describes a competent operational process but treats the beneficiary's journey as **a sequence of administrative steps** rather than a **lifelong human journey**.

### What v1 does well

- Clear stage definitions
- RACI matrix for stage responsibilities
- Integration touch points across Phase 1-4 modules
- PDPL compliance baseline
- MDT (multi-disciplinary team) culture
- Family-as-partner stance

### What v1 misses (the gap analysis)

| Gap                                                          | Description                                                                                                                                    | Evidence in v1                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **1. No beneficiary voice channel**                          | The system is designed _around_ the beneficiary, but the beneficiary has no formal input mechanism — preferences, dreams, fears, daily ratings | v1's RACI shows beneficiary as "C" (consulted) or "I" (informed), never "R" or "A" |
| **2. "Discharge" mental model**                              | Treats end-of-active-care as graduation from the service                                                                                       | Phase 7 literally called "التخريج" (discharge); Phase 9 is "الأرشفة" (archiving)   |
| **3. No formal Cross-cutting Crisis Pathway**                | Crisis events (seizure, safeguarding, behavioral crisis) handled as exceptions, not as a designed pathway                                      | No mention despite W356 SeizureEvent + W357 SafeguardingConcern existing in code   |
| **4. Family wellbeing as footnote, not first-class outcome** | Family is "partner" but not measured/served as a unit                                                                                          | RACI lists "الأسرة" but no Family Wellbeing track                                  |
| **5. Community Integration unmeasured**                      | Rehabilitation success measured by goal attainment, not by community participation                                                             | No participation tracker despite IEP/Vocational/Sports modules existing            |
| **6. Cultural sensitivity as closing observation**           | Saudi-specific cultural needs (prayer, Ramadan, gender, family structure, dialect) mentioned only in final "نقاط حرجة" section                 | Not embedded as a system layer                                                     |
| **7. Outcomes as numbers, not narrative**                    | "Goal Achievement Rate %" presented as the outcome                                                                                             | Families need stories: "your child went from X to Y"                               |
| **8. No international framework anchor**                     | Conventions are local; no ICF/CRPD/CARF mapping                                                                                                | Not mentioned in v1                                                                |
| **9. No causal inference layer**                             | We have predictive (W339) and prescriptive (W334), but no proof that interventions CAUSE outcomes                                              | Required for Value-Based Care + research credibility                               |
| **10. No explicit rights framework**                         | CRPD ratified by Saudi Arabia 2008 — system has no CRPD compliance layer                                                                       | Not mentioned despite legal binding                                                |

### Why now

Three converging pressures:

1. **Saudi Vision 2030 — Quality of Life Program** has disability inclusion KPIs. The platform can become a reference implementation.
2. **CARF accreditation pursuit** is feasible — most building blocks exist; what's missing is rights framework + outcomes architecture.
3. **W356-W384 series (2026-05-25)** added significant clinical modules (Seizure, Safeguarding, AAC, Assistive Device, CBAHI, Transition, Sports, Respite, Diet, Facility Asset, Caregiver Support) — but these are not yet integrated into a coherent narrative. v3 provides that narrative.

### What v3 proposes

A **6-phase × 7-dimension matrix architecture** anchored in 4 international frameworks (ICF, CRPD, CARF, Quadruple Aim) with:

- 10 new innovations specified in detail
- 9-phase implementation roadmap (Phase A-I, W391+)
- Decision rights matrix (CRPD Article 12 supported decision-making)
- Ethics & safety architecture
- Cultural adaptation layer (Saudi-specific)
- 5-level intelligence stack with causal inference added at Level 5

Full text: [`docs/blueprint/beneficiary-lifecycle-v3.md`](../../blueprint/beneficiary-lifecycle-v3.md) (~960 lines)

## Decision Drivers

| #   | Driver                                 | Weight                          | What it pushes toward                                                                    |
| --- | -------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | **CRPD compliance**                    | High (legal)                    | Rights module + supported decision-making + Independent Advocate                         |
| 2   | **International benchmarking**         | High (strategic)                | ICF adoption + GAS T-score + standardized outcomes                                       |
| 3   | **Value-based care alignment**         | Medium-High (financial future)  | Causal inference engine + risk-adjusted outcomes                                         |
| 4   | **CARF accreditation readiness**       | Medium-High (positioning)       | Person-centered planning + quality outcomes + stakeholder input + performance management |
| 5   | **Beneficiary-as-protagonist ethics**  | High (mission)                  | Voice channel + rights education + self-advocacy                                         |
| 6   | **Family Systems Theory rigor**        | Medium-High (outcomes evidence) | Family Wellbeing Composite Index + sibling support + extended family engagement          |
| 7   | **Saudi cultural fit**                 | High (operational)              | Cultural Adaptation Layer + prayer/Ramadan/gender/family structure                       |
| 8   | **Equity & justice**                   | High (ethics + Vision 2030)     | Equity Engine + Disparity Detection + algorithmic fairness audits                        |
| 9   | **Therapist retention crisis**         | Medium-High (operational)       | Quadruple Aim 4th dimension (provider wellbeing)                                         |
| 10  | **Lifelong perspective on disability** | High (philosophical)            | Replace "discharge" with "graduated transition + lifelong connection"                    |

## Considered Options

### Option 1 — Status Quo (do nothing)

Keep v1's 9-stage linear lifecycle. Add new modules (Phase A-I innovations) as separate features without restructuring.

**Pros**:

- Zero disruption to existing workflows
- No retraining required
- No stakeholder politics
- Modules can still be built independently

**Cons**:

- Misses the integration value
- Family/beneficiary/community remain second-class
- No international benchmarking
- CARF/CRPD compliance harder
- Modules stay siloed
- Cannot tell a coherent story of "what the platform does" to families/regulators

### Option 2 — Incremental Restructure (v2)

Keep v1's structure but add the cross-cutting tracks (Crisis, Family Wellbeing, Community, Cultural) as supplementary documentation. Add ICF as a new measurement option (not mandatory). Add Independent Advocate as new role.

**Pros**:

- Lower disruption
- Allows opt-in adoption
- Preserves existing therapist mental model
- Modular implementation

**Cons**:

- Two parallel mental models (v1 stages + v2 tracks) creates confusion
- Optional ICF means it never reaches critical mass
- Independent Advocate without formal phase commitment is orphaned
- Half-measures dilute the message
- Outcomes still measured the old way

### Option 3 — Full v3 Restructure

The matrix model: 6 phases × 7 dimensions × intelligence stack × 4 frameworks. Big shift in mental model. Phased implementation over ~64 weeks.

**Pros**:

- Internally coherent
- International benchmarking achievable
- Beneficiary truly elevated
- Family as unit of care
- Cultural integration as system layer
- CRPD compliant
- CARF-ready
- Value-based-care defensible
- Saudi Vision 2030 contribution

**Cons**:

- Significant retraining required
- Stakeholder buy-in needed across multiple parties
- Some Saudi families may resist "no discharge" model
- Long roadmap (~64 weeks)
- Some innovations (causal engine, federated learning, digital twin) are research-grade complex
- Independent Advocate program requires NGO/government partnership

### Option 4 — v3 Lite (top 5 of 10 innovations)

Adopt the matrix structure but defer the 5 most ambitious innovations (Causal Engine, Federated Learning, Digital Twin, Adaptive RL, Story Architecture at scale). Focus on: ICF, Rights/Voice, Family Wellbeing, Cultural Layer, Equity Engine.

**Pros**:

- Lower complexity
- ~28 weeks vs 64 weeks
- Avoids highest-risk innovations
- Still achieves CRPD compliance + CARF readiness
- Defensible for the majority of stakeholder concerns

**Cons**:

- Misses Value-Based Care positioning (no causal engine)
- Misses Saudi national impact (no federated network)
- Misses world-class differentiation (no digital twin, no adaptive RL)
- Stories at smaller scale

## Decision Outcome

**Recommended: Option 4 (v3 Lite) for immediate execution, with Option 3 as North Star.**

### Rationale

- Option 4 is achievable in ~28 weeks and delivers 80% of the strategic value
- The 5 deferred innovations (Causal, Federated, Twin, RL, full Story) require data accumulation + research-grade engineering — Option 4 builds the foundation
- Option 4 achieves CRPD compliance, CARF readiness, Vision 2030 alignment — the high-impact strategic gains
- The 5 deferred items can be added Phase D, F (partial), H, I as data and engineering capacity allow

### Concrete first commitment

If Option 4 approved:

1. **Phase A starts immediately** (W391-W400, 6 weeks) — see [`docs/architecture/PHASE_A_WAVES_W391_W400.md`](../PHASE_A_WAVES_W391_W400.md)
2. **ADR-031 status moves to ✅ Accepted**
3. **Stakeholder questions (§9) answered** in stakeholder review session
4. **v1 lifecycle document** marked as superseded; v3 becomes canonical
5. **Communications plan**: therapist orientation, family announcement, regulator notification

### What we are NOT deciding here

This ADR proposes the **architecture**. Implementation details, specific module designs, and technical schemas are in supporting documents:

- ICF Foundation specifics → `docs/architecture/PHASE_A_ICF_FOUNDATION.md`
- Causal Engine design → `docs/architecture/CAUSAL_INFERENCE_ENGINE.md` (Phase D — deferred)
- Wave-by-wave plan → `docs/architecture/PHASE_A_WAVES_W391_W400.md`

## Consequences

### Positive

- **Internationally benchmarked outcomes** via ICF + GAS T-score (Phase A)
- **Legal CRPD compliance** evidenced via Rights Module + Independent Advocate (Phase B)
- **Family as unit of care** with measurable wellbeing outcomes (Phase C)
- **Equity baked in** with statistical disparity detection (Phase G — after data accumulation)
- **Cultural fit deepened** beyond current implicit handling (Phase E)
- **CARF accreditation pathway** opened (a 2-year arc)
- **Value-Based Care future-readied** when Causal Engine builds (Phase D, deferred)
- **Saudi Vision 2030 contribution** quantifiable
- **Story-driven family engagement** transforms perceived value (Phase F)

### Negative

- **Significant therapist retraining** required for ICF coding + GAS scale construction
- **Stakeholder politics** — Director, MOH, Disability Authority, families, therapists all have stakes
- **Some families may prefer cultural "closure" model** vs "lifelong connection" — needs careful framing
- **Independent Advocate program needs external partnership** (NGO or government)
- **Outcome measurement complexity increases** before it simplifies (transition period)
- **AI explainability requirements** add development overhead
- **Cultural Officer role** requires new hiring or role redefinition
- **Sibling Hub** is a substantial UX investment for an underserved population

### Risks (also see §14 of v3 doc)

| #   | Risk                                                      | Mitigation                                                                           |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| R1  | ICF adoption fatigue                                      | Phased rollout per discipline; pair with existing measure workflows                  |
| R2  | "No discharge" model culturally rejected by some families | Reframe as "graduation level"; closure ceremonies preserved                          |
| R3  | Cost of Independent Advocate                              | NGO partnership; volunteer initially; scale with funding                             |
| R4  | Therapist resistance to AI                                | AI as assistant not replacement; outcome data builds trust                           |
| R5  | Causal engine produces uncomfortable findings             | Transparent process; reframe as learning opportunity                                 |
| R6  | Federated learning regulatory unclear                     | Defer Phase H until clarity                                                          |
| R7  | Stakeholder review takes too long                         | Pre-decision technical preparation; parallel preparation of all 4 framework mappings |

## Reversibility Audit

Per the pattern established in ADR-027, each major decision is reversibility-rated:

| Decision                                               | Reversibility                                                     | Risk if wrong                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Adopt ICF coding mandatory                             | **Hard reverse**: trained workforce + data has codes. Cost: high. | Low risk — ICF is international standard, not vendor-specific |
| Add Independent Advocate role                          | **Soft reverse**: deactivate role, retain history. Cost: low      | Low risk — role can be repurposed                             |
| Replace "Discharge" with "Lifelong Connection" framing | **Soft reverse**: rename phase, restore terminology. Cost: low    | Medium risk — workflow changes may need rollback              |
| GAS T-score as primary outcome                         | **Medium reverse**: parallel-run with goal % until trust built    | Low risk — measurement methodology change                     |
| Family WBCI tracking                                   | **Soft reverse**: collect but de-prioritize                       | Low risk — additional data is not harmful                     |
| Decision Rights Matrix (CRPD layers)                   | **Hard reverse**: legally complicated to retract once promised    | Low risk — CRPD is binding regardless                         |
| Cultural Adaptation Layer                              | **Soft reverse**: roll back features individually                 | Very low risk — only adds capability                          |
| Equity Engine                                          | **Soft reverse**: pause monitoring                                | Low risk — collecting equity data is best practice            |
| Causal Engine (when built)                             | **Soft reverse**: not yet building (Phase D deferred)             | N/A yet                                                       |
| Federated Network (when built)                         | **Hard reverse**: inter-center agreements                         | N/A yet                                                       |

**Net assessment**: Phase A (ICF) is the highest-commitment decision in Option 4. Once therapists are trained and data accumulates, reversing ICF would be expensive but not impossible. The other Option 4 commitments are softer.

## Questions for Stakeholders

The following 8 questions need answers before Option 4 can move from 🟡 Proposed to ✅ Accepted:

### Q1 — Which option?

- [ ] Option 1 (Status Quo)
- [ ] Option 2 (Incremental)
- [ ] Option 3 (Full v3)
- [x] Option 4 (v3 Lite — **recommended**)
- [ ] Different choice / hybrid

### Q2 — Independent Advocate sourcing

- [ ] NGO partnership (recommended for true independence)
- [ ] Government (Disability Authority)
- [ ] Internal but organizationally independent
- [ ] Hybrid

### Q3 — Cultural Officer role

- [ ] Standalone position
- [ ] Combined with Social Worker
- [ ] Combined with Case Manager
- [ ] Shared with cultural champion (recommended for pilot)

### Q4 — Sibling Hub age range

- [ ] 5-18
- [ ] 8-18
- [ ] 5-25
- [ ] All siblings, age-adapted (recommended)

### Q5 — Phase ordering preference

- [ ] A→B→C→D→E→F→G→H→I (sequential, recommended)
- [ ] Run E (Cultural) in parallel with A
- [ ] Run F (Stories) in parallel with B
- [ ] Other ordering

### Q6 — Quarterly Story Book curation

- [ ] Fully automated
- [ ] AI-drafted, therapist-reviewed (recommended quarterly)
- [ ] AI-drafted, Case Manager + Family co-curated (recommended annual)

### Q7 — Provider Wellbeing (4th Aim) transparency

- [ ] Internal-only metrics
- [ ] Individual feedback only
- [ ] Branch-level dashboard (recommended)
- [ ] Open organization dashboard

### Q8 — Public Equity Reporting cadence

- [ ] Annual
- [ ] Semi-annual (recommended)
- [ ] Quarterly
- [ ] On-demand only

## Linked Documents

- **Full design**: [`docs/blueprint/beneficiary-lifecycle-v3.md`](../../blueprint/beneficiary-lifecycle-v3.md)
- **Phase A details**: [`docs/architecture/PHASE_A_ICF_FOUNDATION.md`](../PHASE_A_ICF_FOUNDATION.md)
- **Causal engine** (deferred under Option 4): [`docs/architecture/CAUSAL_INFERENCE_ENGINE.md`](../CAUSAL_INFERENCE_ENGINE.md)
- **Gap analysis**: [`docs/architecture/GAP_ANALYSIS_LIFECYCLE_V3.md`](../GAP_ANALYSIS_LIFECYCLE_V3.md)
- **Wave plan**: [`docs/architecture/PHASE_A_WAVES_W391_W400.md`](../PHASE_A_WAVES_W391_W400.md)

## Related ADRs

- **ADR-007** PDPL Compliance Baseline — v3 builds on PDPL but extends with CRPD
- **ADR-011** Heuristic-First, ML Optional — v3 Phase D Causal Engine respects this (synthetic controls before RL)
- **ADR-018** Rehabilitation Protocol Entity — v3 ICF mapping extends Protocol entities
- **ADR-019** MFA Tier Enforcement — v3 Decision Rights Matrix uses tier enforcement
- **ADR-025** Module Dependency Rules — v3 phases respect the tier ordering
- **ADR-026** IEP/IFSP/CarePlanVersion Fragmentation — v3 surfaces this as Phase A risk; needs ADR-026 resolution first

## Document History

- **2026-05-26**: Initial draft (this ADR) — 🟡 Proposed
- **Pending**: Stakeholder review session
- **Pending**: Decision recorded + status update
