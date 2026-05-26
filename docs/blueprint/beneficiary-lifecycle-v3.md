# Beneficiary Lifecycle v3 — Lifelong Disability Intelligence Architecture

> **Status**: 🟡 Proposed (supersedes the previous 9-stage linear model). Awaiting stakeholder review per ADR-031.
> **Date**: 2026-05-26
> **Authors**: Architecture review session
> **Scope**: Defines the end-to-end journey of a person with disability through the platform — from first contact to lifelong follow-up — as a 6-phase × 7-dimension matrix anchored in international standards (ICF, CRPD, CARF, Quadruple Aim).

---

## 0. Executive Summary

### The Conceptual Shift

| Dimension              | v1 (current 9-stage linear)                       | v3 (proposed matrix)                                                                      |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Mental model**       | "نظام إدارة عمليات تأهيل" (Operations management) | "بنية ذكاء حياتي طويل المدى" (Lifelong intelligence architecture)                         |
| **Time horizon**       | Episode of Care (typically 1-3 years)             | Lifelong (birth → end-of-life)                                                            |
| **Primary measure**    | Goal Achievement % (binary)                       | GAS T-score + ICF-coded outcomes (continuous)                                             |
| **End state**          | "التخريج" (Discharge)                             | "الاتصال مدى الحياة" (Lifelong Connection) — never truly discharged                       |
| **Decision authority** | Family-as-proxy by default                        | CRPD-aligned: Beneficiary autonomy → Supported decision → Substituted only when necessary |
| **Outcome unit**       | The beneficiary                                   | The beneficiary + family + community (Family Systems)                                     |
| **Intelligence layer** | Predictive (W339) + Prescriptive (W334)           | + Causal (synthetic controls) + Generative (story architecture)                           |
| **Standardization**    | Internal conventions                              | ICF codes + CRPD principles + CARF/JCI ready                                              |
| **Equity**             | Implicit                                          | Explicit Equity Engine with disparity detection                                           |
| **Cultural fit**       | Footnote                                          | First-class Cultural Adaptation Layer                                                     |

### The Five Big Moves

1. **Anchor everything in ICF** — every assessment, goal, outcome carries WHO ICF codes. Universal language, international comparability.
2. **Replace "Discharge" with "Graduated Transition + Lifelong Connection"** — disability is lifelong; intensity changes, presence doesn't end.
3. **Give the beneficiary a voice channel** — not just family-as-proxy. CRPD Article 12 (supported decision-making).
4. **Build a Causal Intelligence layer** — synthetic controls + DiD prove that interventions cause outcomes, not just correlate.
5. **Make the family the unit of care, not just the beneficiary** — Family Wellbeing Composite Index alongside clinical outcomes.

---

## 1. Strategic Anchors — The 4 Frameworks

Every decision in the system must be traceable to one of these frameworks. This is what transforms the platform from "local practice" to "international caliber".

### 1.1 ICF — International Classification of Functioning, Disability and Health

**Owner**: World Health Organization (WHO), 2001 + ICF-CY 2007 (Children & Youth)
**Status in our system**: Currently absent. **Highest-priority addition (Phase A, W391-W400)**.

**Why it matters**: ICF is the universal language for describing functioning. Used in 60+ countries. Replaces narrow medical-model with biopsychosocial model.

**Five domains**:

- **b** — Body Functions (mental functions, sensory, voice, cardiovascular, etc.)
- **s** — Body Structures (nervous system, eye, ear, voice/speech structures, etc.)
- **d** — Activities & Participation (learning, communication, mobility, self-care, etc.)
- **e** — Environmental Factors (products, support, attitudes, services, policies)
- **p** — Personal Factors (age, gender, education, coping styles — culturally sensitive)

**Each code carries a qualifier** (0 = no impairment → 4 = complete impairment) producing standardized scores.

**Integration target**: Every `MeasureRecord`, `CarePlanGoal`, `Assessment` carries one or more ICF codes. Reports to MOH + Disability Authority emit ICF-coded summaries.

### 1.2 CRPD — UN Convention on the Rights of Persons with Disabilities

**Ratified by**: Saudi Arabia (2008). Legally binding.
**Status in our system**: Implicit. **Needs explicit Rights Module (Phase B, W401-W410)**.

**The 8 Principles** (must be embedded as constraints in every decision):

1. **Respect for inherent dignity** — UI language, imagery, addressing the person
2. **Non-discrimination** — equity engine + algorithmic fairness audits
3. **Full participation & inclusion** — community integration tracker
4. **Respect for difference** — cultural adaptation layer
5. **Equality of opportunity** — equity dashboard
6. **Accessibility** — accessibility-first UX (WCAG 2.2 AA minimum)
7. **Gender equality** — gender-disaggregated outcomes monitoring
8. **Respect for evolving capacities of children** — age-adapted UX + capacity assessment

**Critical Articles for our context**:

| Article                                      | What it requires                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| **Art. 9** Accessibility                     | Platform UX accessible; physical centers accessible                         |
| **Art. 12** Equal Recognition Before the Law | **Supported decision-making, NOT substituted**. Beneficiary's voice counts. |
| **Art. 16** Freedom from Exploitation        | Safeguarding workflows (W357 exists) tied to CRPD                           |
| **Art. 19** Living Independently             | Discharge to independent living, not institutional dependence               |
| **Art. 24** Education                        | School integration + IEP (W200b exists)                                     |
| **Art. 26** Habilitation & Rehabilitation    | Core mandate of the platform                                                |
| **Art. 27** Work & Employment                | Vocational profiles (exists)                                                |
| **Art. 30** Cultural Life, Recreation        | Adaptive sports (W362 exists), participation tracking                       |
| **Art. 31** Statistics & Data Collection     | Disaggregated data — exactly what our Equity Engine produces                |

### 1.3 CARF — Commission on Accreditation of Rehabilitation Facilities

**Why it matters**: CARF accreditation is the gold standard internationally for rehabilitation programs. Reaching CARF readiness positions the center for medical tourism + Saudi excellence awards.

**Status in our system**: Partially via CBAHI (W360+W367, 45 standards). **CARF mapping needed**.

**Five core domains**:

| Domain                          | What CARF requires                                                   | Where we are                                              |
| ------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| **Person-Centered Planning**    | Beneficiary involvement in goal-setting documented                   | CarePlan exists; beneficiary voice missing                |
| **Quality Outcomes Management** | Outcome measurement system + improvement actions                     | Outcomes measured; no formal QO system                    |
| **Continuous Improvement**      | PDCA cycles documented                                               | CAPA exists (W337-W349)                                   |
| **Stakeholder Input**           | Beneficiary, family, staff, community input collected systematically | Family feedback partial; beneficiary direct input missing |
| **Performance Measurement**     | KPIs published + acted upon                                          | Many KPIs exist; equity-adjusted ones missing             |

### 1.4 Quadruple Aim

**Source**: Institute for Healthcare Improvement (IHI), extended 2014.

**Status in our system**: Triple Aim implicit. **Provider Wellbeing (the 4th) explicitly missing**.

| Aim                           | KPI Category                                 | Current State           |
| ----------------------------- | -------------------------------------------- | ----------------------- |
| **1. Beneficiary Experience** | NPS, complaint rate, satisfaction surveys    | Partial (parent portal) |
| **2. Population Health**      | ICF-coded outcomes across cohorts            | Missing — no ICF        |
| **3. Cost per Capita**        | Value-based metrics, outcome-per-cost        | Implicit in finance     |
| **4. Provider Wellbeing**     | Therapist burnout, retention, autonomy index | **Missing entirely**    |

**Note**: ignoring the 4th aim is the leading cause of therapist turnover globally. Saudi rehab centers report 25-35% annual turnover. Adding this is high-leverage.

---

## 2. Architecture — 6 Temporal Phases × 7 Cross-Cutting Dimensions

The journey is a **matrix**, not a line. Each beneficiary has 6 phases × 7 dimensions = **42 active contracts** at any time, each with owner, KPI, decision point.

### 2.1 Temporal Phases

```text
┌──────────────────────────────────────────────────────────────────┐
│ Phase 1: Discovery & Onboarding         (Days 1-7)               │
│   ↓                                                                │
│ Phase 2: Multi-Dimensional Assessment   (Days 8-21)              │
│   ↓                                                                │
│ Phase 3: Co-Design                       (Days 22-28)             │
│   ↓                                                                │
│ Phase 4: Active Care                     (Months → Years)         │
│   ↓                                                                │
│ Phase 5: Graduated Transition            (Variable)               │
│   ↓                                                                │
│ Phase 6: Lifelong Connection             (Lifelong)               │
└──────────────────────────────────────────────────────────────────┘
                                ↑
                    Phase 4 can loop ← any phase can escalate to Crisis Pathway
```

### Phase 1 — Discovery & Onboarding

**Core question**: من أنت؟ ومن هي أسرتك؟ من سيتحدث باسمك؟

**Sub-phases**:

1. **Pre-Contact Awareness** (NEW) — how families discover us; track sources for marketing + accessibility
2. **First Contact** — phone, walk-in, referral, parent portal, school referral, RTI escalation, hospital discharge
3. **Triage** — urgency classification (5-tier: emergency, urgent, routine, follow-up, info-only)
4. **Identity Verification** — Absher (citizen), iqama validation (resident), guardian verification for minors
5. **Initial Consent** — graduated: minimum for assessment → full for treatment → optional for research/AI
6. **Case Manager Assignment** — based on disability type + Arabic dialect + therapist availability
7. **Welcome Pack** — physical (Arabic + English) + digital (Family Portal + Beneficiary App)

**Data products emitted**:

- `IntakeRequest` (with sourceChannel, urgencyTier, triageNotes)
- `Beneficiary` (with consent flags + ICF preliminary scoring)
- `Guardian` (with Absher verification + decision-rights tier)
- `EpisodeOfCare` (new — opened)
- `ConsentRecord` (with granular per-modality flags)
- **NEW**: `DecisionRightsAssessment` — captures capacity + advocate assignment

**Quality gates** (no advance to Phase 2 without):

- ✅ All required consents signed via Nafath
- ✅ Identity verified
- ✅ Case Manager assigned
- ✅ Welcome contact made within SLA (24h for routine, 4h for urgent)
- ✅ Initial cultural preferences captured (language, gender, religious accommodations)

**KPIs**:

- Time-to-first-contact (target: <4h urgent, <24h routine)
- Triage accuracy (audit sample weekly)
- Welcome pack delivery completion rate
- Consent comprehension score (parents self-report understanding)

**Saudi-specific**:

- Hijri date support throughout
- Guardian hierarchy (father → mother → grandfather → uncle — culturally accurate)
- Prayer time consideration in welcome call scheduling

### Phase 2 — Multi-Dimensional Assessment

**Core question**: ما الوضع الكامل؟ (طبي + وظيفي + بيئي + اجتماعي + روحي + اقتصادي)

**Six assessment streams** (parallel, MDT-orchestrated):

| Stream                         | Owner                         | Tools                                                                        | Output                                       |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| **Medical**                    | Physician                     | History, exam, labs, imaging                                                 | Diagnosis (ICD-11) + ICF body function codes |
| **Functional**                 | PT/OT/SLP                     | Standardized scales (PEDI-CAT, WeeFIM, FIM, GMFCS, MACS, CFCS)               | ICF activity/participation codes             |
| **Environmental**              | Social Worker                 | Home visit (optional), school visit (optional)                               | ICF environmental codes                      |
| **Psychological & Social**     | Psychologist + Social Worker  | Family Systems assessment, child wellbeing                                   | Family WBCI baseline                         |
| **Spiritual & Cultural** (NEW) | Cultural Officer              | Family values, religious needs, dietary, gender preferences                  | Cultural Fit Profile                         |
| **Economic & Legal** (NEW)     | Social Worker + Legal Liaison | Insurance status, government benefits eligibility, legal guardianship status | Financial Navigation Profile                 |

**Advanced computerized assessments** (Phase 3 modules):

- **Motion Analysis** — gait, ROM, posture via Computer Vision (existing W283-adjacent)
- **Voice Analysis** — speech intelligibility, prosody via librosa + Whisper (existing W284)
- **Behavioral Observation** — structured video coding (NEW — Phase D)

**MDT Meeting** — within 14 days of Phase 1 close. Outputs:

- Consolidated ICF profile (all 5 ICF domains coded)
- Risk stratification (intensity tier 1-5)
- Baseline measures library entries
- Cultural & family context summary

**Quality gates**:

- ✅ All 6 streams complete OR documented exclusion with rationale
- ✅ ICF profile coded for all 5 domains
- ✅ MDT meeting held with all required disciplines
- ✅ Family present at MDT summary (or proxy with documented consent)
- ✅ Beneficiary voice captured (age/ability-appropriate)

**KPIs**:

- Assessment completion rate within 14 days
- ICF code coverage (% of assessments with all 5 domains coded)
- MDT attendance completeness
- Beneficiary voice capture rate (target: >85% even for non-verbal via AAC)

### Phase 3 — Co-Design

**Core question**: ما الذي **يريده** المستفيد + الأسرة + **يحتاجه** clinically؟

This is the most underdeveloped phase in v1. v3 elevates it to its own phase with explicit decision-rights framework.

**Three-party design**:

```text
        Beneficiary's Voice
        (preferences, dreams, fears, dislikes)
                  ↓
    ┌──────────────────────────┐
    │   What the family wants  │ ←→ │   What clinicians need   │
    └──────────────────────────┘
                  ↓
            Negotiated Plan
                  ↓
         Goals (ICF-mapped + GAS-scaled)
                  ↓
        Signed by all 3 parties via Nafath
```

**Co-design tools**:

- **Dream Board** (NEW) — beneficiary identifies aspirations (visual, AAC-supported)
- **Family Priority Card** — family ranks goals
- **Clinical Necessity Brief** — clinicians state evidence-based priorities
- **Negotiation Facilitation** — Case Manager-led session reconciling all three
- **GAS Scale Construction** — each goal gets a -2 to +2 scale before Active Care starts

**Output: The Living Care Plan**

- 3-month short-term goals (ICF-coded, GAS-scaled)
- 12-month medium-term goals
- 3-year vision (where do we want to be)
- Programs allocated (PT, OT, SLP, behavioral, social)
- Session frequency per discipline
- Home program for family
- Community integration targets
- Re-design trigger conditions (when to renegotiate)

**Quality gates**:

- ✅ Beneficiary voice documented (signed/recorded confirmation of participation)
- ✅ Plan signed by 3 parties via Nafath (beneficiary if capable, family, clinician lead)
- ✅ GAS scales constructed for every goal
- ✅ ICF codes attached
- ✅ Re-design triggers documented
- ✅ Cultural accommodations explicit

### Phase 4 — Active Care

**Core question**: هل ننفّذ ما اتفقنا عليه؟ هل التقدم متوقع؟ هل نتعلم؟

**Session Lifecycle** (per session):

```javascript
   Schedule (with culture-aware constraints)
       ↓
   Reminder (multi-channel)
       ↓
   Pre-session Check-in (mood, energy, parent observation)
       ↓
   Session Execution
       ↓
   Real-time Data Capture (IoT optional, video optional, observations always)
       ↓
   Documentation (SOAP + AI draft narrative)
       ↓
   GAS Progress Update (per goal)
       ↓
   ICF Code Updates (if qualifiers changed)
       ↓
   Family Summary (Beneficiary-facing + Family-facing variants)
       ↓
   Next Session Prep
```

**Continuous Intelligence Layer** (running in parallel):

- Plateau detection (W339 existing) → trigger replan
- Regression detection (W339 existing) → trigger MDT review + safeguarding scan
- Dropout risk scoring → trigger family wellbeing check
- Adaptive protocol adjustments (Phase I — future) → micro-adaptations between sessions
- Causal outcome attribution (Phase D — future) → confirms intervention is the cause

**Review Cadences**:

| Type                       | Frequency    | Trigger                                  | Owner              | Output                            |
| -------------------------- | ------------ | ---------------------------------------- | ------------------ | --------------------------------- |
| Per-session note           | Each session | Always                                   | Therapist          | SOAP + GAS update                 |
| Weekly clinical huddle     | Weekly       | Always                                   | Supervisor         | Caseload risk review              |
| Monthly MDT                | Monthly      | Always                                   | Case Manager       | Cross-discipline alignment        |
| Quarterly Co-Design Review | 3 months     | Always                                   | All 3 parties      | Plan refresh + Story Book release |
| Annual Strategic Review    | 12 months    | Always                                   | All + Director     | 3-year vision update              |
| Triggered Replan           | Event-based  | Plateau/regression/family request/crisis | Case Manager + MDT | Targeted plan adjustment          |

**Quality gates** (continuous):

- ✅ Session attendance rate above family-set threshold
- ✅ Documentation completion within 24h of session
- ✅ GAS progress recorded for every active goal
- ✅ No active safeguarding flags
- ✅ Family wellbeing index within safe band

### Phase 5 — Graduated Transition

**Core question**: إلى أي مستوى من الكثافة ننتقل؟ (ليس: هل ننهي العلاقة؟)

**Five intensity levels** (Beneficiary can move up or down):

| Level                              | Description                                         | Session frequency | Reassessment cadence |
| ---------------------------------- | --------------------------------------------------- | ----------------- | -------------------- |
| **L1 — Intensive Active Care**     | Multiple disciplines, high frequency                | 4-10/week         | Monthly              |
| **L2 — Standard Active Care**      | Multiple disciplines, standard frequency            | 2-4/week          | Quarterly            |
| **L3 — Maintenance Care**          | Reduced frequency, goal preservation                | 1-2/week          | Semi-annual          |
| **L4 — Community-Integrated Care** | Mostly home/community-based, periodic center visits | 1-2/month         | Annual               |
| **L5 — Lifelong Connection**       | Annual check-in + on-demand re-entry                | 1-2/year          | Annual               |

**Transition Triggers** (NOT just "all goals met"):

- ≥70% of current-tier goals achieved at GAS T-score >55 AND
- MDT consensus on readiness AND
- Family/beneficiary alignment AND
- Community support structure verified

**Anti-Discharge Doctrine**: Even L5 is not "discharge". The beneficiary remains in our system. Their data stays. Their re-entry channel stays open.

**Transition Plan Document** (new entity — extends W361 TransitionPlan):

- Current level → target level + reason
- Continuation programs (home + community)
- Re-entry criteria (what would trigger return to higher intensity)
- Annual check-in schedule
- Family-facing roadmap

**Quality gates**:

- ✅ Transition justified by data (not just clinician judgment)
- ✅ Re-entry pathway documented
- ✅ Family understands the change (signed acknowledgment)
- ✅ Beneficiary involved in decision (age/ability-appropriate)
- ✅ Community handoff complete (school, employer, family physician notified)

### Phase 6 — Lifelong Connection

**Core question**: هل المستفيد ما زال على المسار؟ هل تغيّر شيء يستدعي إعادة التفعيل؟

**Lifelong touchpoints**:

- **Annual Wellbeing Survey** — beneficiary + family
- **Annual Functional Snapshot** — light ICF recoding (no full assessment unless triggered)
- **Annual Story Book** — visual life chronicle
- **Life Transition Check-ins** — pre-school → school → adolescence → adulthood → employment → senior years → end-of-life
- **Predictive Outreach** — system predicts deterioration risk, triggers proactive contact
- **Crisis Channel** — always-open re-entry (no triage delay for known beneficiaries)

**Special considerations**:

- **Bereavement Support** — when a beneficiary or primary caregiver dies, the family enters a bereavement track
- **Adult Transitions** — when minor reaches 18, decision-rights transfer (CRPD Art. 12 — supported, not stripped)
- **Inter-Center Portability** — if family relocates, data follows (PDPL Right to Portability)
- **End-of-Life Care** — for life-limiting conditions, dignified palliative pathway

**Quality gates**:

- ✅ Annual contact maintained (target: >90% of L5 beneficiaries)
- ✅ Story Book delivered annually
- ✅ Re-entry response time <48h
- ✅ Inter-center transfer protocol activated within 7 days of request

---

### 2.2 Cross-Cutting Dimensions — The 7 Tracks

Every phase is executed across all 7 dimensions in parallel:

#### Dimension A — Clinical Care

**Owner**: MDT, led by Clinical Lead per discipline
**Core artifacts**: Assessments, CarePlan, Sessions, Outcomes
**KPIs**: GAS T-score progression, ICF qualifier improvements, session completion rate, evidence-based protocol adherence
**Existing modules**: All Phase 1-2 of current architecture

#### Dimension B — Beneficiary Voice & Rights

**Owner**: Independent Advocate (NEW ROLE) + Case Manager
**Core artifacts**:

- `BeneficiaryVoiceLog` (NEW) — preferences, dreams, fears, daily ratings, complaints
- `DecisionRightsAssessment` (NEW) — capacity + supports
- `SelfAdvocacyTrainingPlan` (NEW) — age-appropriate rights education
- `Complaint` (existing, extended with reasonable adjustments support)

**KPIs**:

- Beneficiary Voice Capture Rate (target: >85%)
- Self-Advocacy Index progression
- Complaint resolution time with reasonable adjustments
- CRPD Compliance Score (auto-calculated from 8 principles)

**Tools**:

- AAC-supported voice channel for non-verbal
- Picture-based preference cards (for young children or cognitive disability)
- Voice recording with consent (for verbal beneficiaries)
- Anonymous channel (older children/adults)

#### Dimension C — Family Wellbeing

**Owner**: Family Counsellor (NEW ROLE) + Social Worker
**Core artifacts**:

- `FamilyWellbeingComposite` (NEW) — composite index
- `CaregiverBurnoutScore` (extends W384)
- `SiblingAdjustmentRecord` (NEW)
- `FinancialNavigationPlan` (NEW)
- `FamilyCounsellingSession` (NEW)

**KPIs**:

- Family Wellbeing Composite Index (WBCI) — target: stable or improving
- Caregiver burnout — target: low
- Sibling adjustment — target: healthy
- Financial stress — target: managed
- Bereavement support coverage when needed

**Sub-modules**:

- **Sibling Hub** — separate UX for healthy siblings (often invisible victims)
- **Extended Family Engagement** — grandparents, uncles, aunts (Saudi context: they often hold real decision power)
- **Financial Navigator** — government benefits, insurance, employment law for parents of disabled children

#### Dimension D — Community Integration

**Owner**: Community Liaison Officer (NEW ROLE)
**Core artifacts**:

- `CommunityParticipationLog` (NEW) — school attendance, work hours, mosque visits, recreation, social events
- `EnvironmentalAccommodation` (NEW) — what adjustments enable participation
- `CommunityPartnerNetwork` (NEW) — schools, employers, mosques, sports clubs

**KPIs**:

- Community Participation Score
- Environmental Accommodation Coverage
- School/Work Inclusion Rate
- Social Network Size (anonymized)

**Integrations** (some exist, need integration):

- IEP (W200b) for school
- Vocational Profiles for work
- Adaptive Sports (W362) for recreation

#### Dimension E — Cultural & Religious Adaptation

**Owner**: Cultural Officer (NEW ROLE — could be combined with Social Worker initially)
**Core artifacts**:

- `CulturalProfile` (NEW) — gender preferences, dialect, religious observance level, family decision structure
- `RamadanProtocol` (NEW) — adjusted session intensity, timing, fasting accommodations
- `PrayerScheduleIntegration` (NEW) — sessions scheduled around prayer times
- `GenderRoutingPolicy` (NEW) — therapist gender matching where requested
- `ModestyAccommodation` (NEW) — hijab during PT/OT, female-only sessions, etc.

**KPIs**:

- Cultural Fit Score
- Accommodation Coverage
- Cultural-related no-show rate (target: declining)
- Family satisfaction with cultural sensitivity

**Saudi-specific examples**:

- Hijri-aware scheduling
- Eid holiday protocols
- Hajj/Umrah accommodation (family travel)
- Extended family multi-stakeholder decisions
- Tribal/regional dialect variations in SLP

#### Dimension F — Crisis Readiness

**Owner**: Risk Manager + Safeguarding Lead
**Core artifacts**:

- `CrisisIncident` (extends W357 SafeguardingConcern + W356 SeizureEvent)
- `EmergencyPlan` (NEW) — per-beneficiary crisis protocol
- `EscalationChain` (NEW) — who calls whom in what order
- `PostIncidentReview` (extends W193e RCA + FMEA)

**Crisis types**:

- Medical (seizure, choking, fall, allergic reaction)
- Behavioral (aggression, self-injury, elopement)
- Safeguarding (abuse, neglect, exploitation)
- Family (caregiver death, custody change, sudden poverty)
- Environmental (sandstorm school closure, transportation failure)
- System (data breach, service outage)

**KPIs**:

- Time-to-response by crisis type
- Recurrence rate
- Post-incident review completion within 72h
- Family confidence in crisis preparedness

#### Dimension G — Equity & Outcomes Research

**Owner**: Quality Director + Research Coordinator (NEW ROLE)
**Core artifacts**:

- `EquityDisparityAlert` (NEW) — when statistically significant disparity detected
- `OutcomeBenchmark` (NEW) — comparison vs anonymized cohort
- `ResearchConsent` (extends Consent with research-specific flags)
- `FederatedLearningContribution` (NEW — Phase H)

**KPIs**:

- Disparity Index (smaller = better) across: income proxy, geography, gender, severity, disability type
- Outcome Variance (controlled for severity)
- Research Participation Rate (with consent)
- Publication output (anonymized)

**Sub-modules**:

- **Equity Dashboard** — real-time monitoring of disparities
- **Outcome Variance Detector** — alerts when one demographic underperforms
- **Anonymized Research Cohort** — opt-in pool for studies
- **Federated Outcome Network** — connect to other Saudi centers without sharing PHI

---

## 3. The Intelligence Stack — 5 Levels

Not "AI gimmicks". 5 ascending levels of analytical capability, each with concrete output and decision impact.

### Level 1 — Descriptive ("What happened?")

**Status**: ✅ Exists
**Tools**: Dashboards, aggregations
**Example**: "73% of scheduled sessions completed this month"

### Level 2 — Diagnostic ("Why did it happen?")

**Status**: ⚠️ Partial
**Tools**: Drill-down analytics, correlation analysis
**Example**: "Dropout in Branch X is 8% higher because median wait time is 45 minutes vs 22 minutes elsewhere"

### Level 3 — Predictive ("What will happen?")

**Status**: ✅ Exists for plateau (W339) and dropout
**Tools**: Time-series models, classifiers, survival analysis
**Example**: "78% probability of plateau within 30 days for this beneficiary in PT goals"

### Level 4 — Prescriptive ("What should we do?")

**Status**: ✅ Exists (W334 AI Recommendations)
**Tools**: Recommendation engines, optimization
**Example**: "Based on 200 similar cases, intervention X produces best GAS T-score by 0.4 SD margin"

### Level 5 — Causal ("Did our intervention CAUSE the change?")

**Status**: ❌ **Missing — highest priority gap (Phase D)**
**Tools**:

- **Synthetic Control Groups** — construct counterfactual from historical data
- **Difference-in-Differences (DiD)** — compare before/after vs control cohort
- **Propensity Score Matching** — match similar beneficiaries who received different interventions
- **Instrumental Variables** — where natural experiments exist (e.g., therapist availability variation)

**Why this matters**:
Without causal inference:

- We pay for interventions that look effective but coincide with natural development
- We discontinue interventions that look weak but actually stabilize the beneficiary
- We cannot prove value to insurers (Value-Based Care requires causal evidence)
- We cannot publish credible research

**Example**: A child receiving intensive PT shows GAS T-score improvement from 45 to 62 over 6 months. Predictive model alone says "good outcome". Causal engine builds a synthetic control from 50 similar children who didn't receive intensive PT and predicts they would have reached T-score 51 due to natural maturation. **Therefore, the intensive PT caused 11 T-score points of improvement (95% CI: 7-14)**. THAT is a publishable, billable, defensible outcome.

### Level 6 (Future) — Generative ("Synthesize new insights and artifacts")

**Status**: ⚠️ Partial (RAG W283 exists, narrative generation incomplete)
**Tools**: LLMs with clinical grounding + structured output
**Example outputs**:

- Quarterly Story Books (visual + text)
- Annual Life Chronicles
- Clinical narrative drafts (W334-adjacent)
- Family-facing summaries in plain Arabic
- Beneficiary-facing pride moments
- Research protocols drafted from data patterns

---

## 4. The Outcomes Architecture — 6-Tier Pyramid

```text
                       ╱╲
                      ╱  ╲    Tier 6: Societal Impact
                     ╱────╲   (Vision 2030 disability inclusion contribution)
                    ╱      ╲
                   ╱────────╲ Tier 5: Life Quality
                  ╱          ╲ (WHO-QoL-BREF, PROMIS, beneficiary self-report)
                 ╱────────────╲
                ╱              ╲ Tier 4: Participation
               ╱────────────────╲ (school, work, worship, recreation, social ties)
              ╱                  ╲
             ╱────────────────────╲ Tier 3: Activity & Function
            ╱                      ╲ (ADL, IADL, FIM/FAM, WeeFIM)
           ╱────────────────────────╲
          ╱                          ╲ Tier 2: Body Function & Structure
         ╱────────────────────────────╲ (ROM, strength, speech intelligibility)
        ╱                              ╲
       ╱────────────────────────────────╲ Tier 1: Goal Attainment
      ╱                                  ╲ (GAS T-score, NOT binary)
     ╱____________________________________╲
```

**Critical shift from v1**: Goal Attainment alone is fool's gold. A center can achieve 100% goal-attainment rate by setting trivial goals. The pyramid forces us to measure higher tiers.

### GAS T-Score — The Tier 1 Replacement

**Goal Attainment Scaling** is more sensitive to change than binary metrics by 2-3x (well-documented in rehab literature).

**Per goal**:

- **+2** = much better than expected
- **+1** = better than expected
- **0** = expected level (the goal as written)
- **-1** = less than expected
- **-2** = much less than expected

**T-Score Formula**:

```text
T = 50 + (10 × Σ(w_i × x_i)) / √(0.7 × Σ(w_i²) + 0.3 × (Σw_i)²)
```

Where:

- `x_i` = GAS score for goal i (-2 to +2)
- `w_i` = weight assigned to goal i (typically 1-3)

**Interpretation**:

- T = 50 → all goals met as expected
- T > 50 → exceeded expectations
- T < 50 → below expectations
- Standard deviation = 10

**Why T-score**:

- Standardized across cases
- Aggregable to branch/center/region levels
- Internationally comparable
- Sensitive to small but meaningful changes

---

## 5. Engagement Architecture — 7 Surfaces

Each stakeholder needs their own UX. Same data, different lens.

| #   | Surface                        | Audience                              | Optimization                                    | Unique content                                                              |
| --- | ------------------------------ | ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | **Beneficiary App**            | المستفيد نفسه                         | Age + ability adapted, AAC support, voice input | Daily mood, "my voice", dreams board, pride moments                         |
| 2   | **Family Portal**              | Primary caregivers (parents)          | Story-rich, accessible                          | Story Books, progress timeline, home programs, mentorship network           |
| 3   | **Sibling Hub** (NEW)          | Healthy siblings                      | Game-like, age-appropriate                      | Disability literacy, feelings corner, story versions without stigma         |
| 4   | **Extended Family View** (NEW) | Grandparents, uncles                  | Very simple, respects decision role             | Summaries, pride moments, how to support                                    |
| 5   | **Therapist Workspace**        | Clinical staff                        | Productivity-first, AI-assisted                 | Session canvas, AI narrative draft, GAS scales, caseload view               |
| 6   | **Supervisor Cockpit**         | Clinical supervisors, branch managers | Governance, risk-focused                        | Drift alerts, outlier sessions, caseload health, equity warnings            |
| 7   | **Governance Bridge**          | Director, MOH, Disability Authority   | Regulatory, benchmarking                        | ICF reports, equity dashboard, CBAHI/CARF compliance, regulator submissions |

**Cross-cutting accessibility requirement**: All 7 surfaces meet WCAG 2.2 AA minimum. Surfaces 1-4 additionally meet WCAG 2.2 AAA for cognitive accessibility where feasible.

---

## 6. The 10 Innovations — Detailed Specifications

### Innovation 1 — ICF-Mapped Goal Architecture + GAS T-Score

**Owner**: Phase A (W391-W400)
**Effort**: 6 weeks
**Dependencies**: Existing Measures Library

**What changes**:

- Every `CarePlanGoal` carries one or more ICF codes (validated against ICF browser API)
- Every goal has a constructed GAS scale (-2 to +2 anchors documented at time of writing)
- Reports emit ICF-coded summaries
- Outcomes aggregate to GAS T-scores

**Schema additions**:

```javascript
// CarePlanGoal extensions
{
  icfCodes: [{ code: 'd450', qualifier: 2, domain: 'd' }], // multiple allowed
  gasScale: {
    minus2: 'Cannot walk 5 meters even with support',
    minus1: 'Walks 5-10m with handhold support',
    zero:   'Walks 10-20m with cane (the goal)',
    plus1:  'Walks 20-30m with cane',
    plus2:  'Walks >30m independently'
  },
  gasWeight: 2  // 1-3 scale
}
```

**Database**:

- New collection: `IcfCode` — canonical ICF codes catalog (Arabic + English, qualifiers, domain)
- New collection: `IcfMapping` — links between MeasurementMaster and ICF codes
- Extension to `MeasureRecord`: `icfQualifierBefore`, `icfQualifierAfter`

**APIs**:

- `POST /api/icf/lookup` — search ICF codes
- `GET /api/icf/code/:code` — code details (Arabic + English)
- `GET /api/beneficiaries/:id/icf-profile` — current ICF profile
- `POST /api/care-plan-goals/:id/gas-scale` — construct GAS scale
- `GET /api/care-plan-goals/:id/gas-progression` — T-score over time

### Innovation 2 — Causal Outcome Engine

**Owner**: Phase D (W421-W435)
**Effort**: 8 weeks
**Dependencies**: ICF foundation (Phase A) + sufficient historical data (~6 months operational)

**Three methods, layered**:

**Method 1 — Synthetic Control Groups**:

```javascript
// Pseudo-algorithm
async function buildSyntheticControl(beneficiary, intervention) {
  // Find historical beneficiaries who:
  // - Had similar baseline ICF profile (within 0.5 SD on key codes)
  // - Did NOT receive the intervention
  // - Had similar age, disability type, severity
  const candidates = await findSimilarBeneficiaries(beneficiary);

  // Construct weighted synthetic match
  const synthetic = constructWeightedSynthetic(candidates, {
    matchOn: ['icfBaseline', 'age', 'severity', 'duration'],
    targetCovariates: beneficiary.baseline,
  });

  // Predict counterfactual outcome
  const counterfactual = await predictOutcome(synthetic);

  // Calculate effect size
  const observed = await getActualOutcome(beneficiary);
  return {
    causalEffect: observed - counterfactual,
    confidenceInterval: calculateCI(synthetic, observed),
    sampleSize: candidates.length,
    matchQuality: synthetic.matchQuality,
  };
}
```

**Method 2 — Difference-in-Differences (DiD)**:

- Compare pre/post change in beneficiary vs pre/post change in matched cohort
- Controls for time-trends + natural maturation

**Method 3 — Propensity Score Matching**:

- For interventions assigned non-randomly
- Match treated vs untreated on probability of treatment given covariates

**Output**:

- Per-beneficiary causal effect estimate (point + CI)
- Per-intervention causal effect across cohort
- Per-program causal effect (e.g., does our SLP program work?)
- Risk-adjusted comparative effectiveness

**Ethical guardrails**:

- All comparisons use anonymized cohorts
- No beneficiary is denied care to serve as control (use historical/natural controls)
- Causal claims require minimum sample size (50+ matched controls)
- Confidence intervals always reported (never point estimates alone)
- Clinician review before causal claim affects treatment decision

### Innovation 3 — Adaptive Therapy Protocol Engine (RL with guardrails)

**Owner**: Phase I (W491+)
**Effort**: 16+ weeks
**Dependencies**: ICF + Causal + sufficient data + safety framework

**Concept**: Reinforcement Learning agent adapts therapy parameters session-by-session within clinician-defined guardrails.

**What it adapts**:

- Session duration (within ± 25% of standard)
- Activity sequencing
- Difficulty progression
- Frequency adjustments (recommendation, not auto-applied)
- Modality selection from approved set

**What it CANNOT do**:

- Add new modalities not in clinician's approved set
- Exceed safety thresholds (heart rate, fatigue, etc.)
- Override clinician decision
- Continue if beneficiary distress detected

**Safety architecture**:

- Every RL decision is logged with rationale
- Clinician reviews adaptations weekly
- Distress detection (via IoT or video) triggers immediate rollback
- "Big red button" — clinician can disable RL for any beneficiary at any time

**Evidence base**: DeepMind + Mayo Clinic 2023 papers on RL in medication dosing; ETH Zurich 2024 on adaptive stroke rehab protocols.

### Innovation 4 — Family Wellbeing Composite Index (WBCI)

**Owner**: Phase C (W411-W420)
**Effort**: 5 weeks
**Dependencies**: W384 caregiver-support module

**Composite formula** (initial — to be calibrated):

```text
WBCI = 0.35 × CaregiverBurnoutInverse
     + 0.25 × SiblingAdjustment
     + 0.20 × FinancialStressInverse
     + 0.10 × ExtendedFamilyEngagement
     + 0.10 × FamilyCommunicationHealth

Scale: 0-100, higher = healthier
```

**Components**:

**Caregiver Burnout**:

- Maslach Burnout Inventory (validated Arabic translation)
- Caregiver Burden Scale
- Quarterly assessment + monthly micro-check (3 questions)

**Sibling Adjustment**:

- Strengths and Difficulties Questionnaire (SDQ)
- Sibling-specific scales (Sibling Interaction Behavior Scale)
- Age-appropriate

**Financial Stress**:

- Income vs expense self-report
- Government benefits utilization
- Insurance navigation status

**Extended Family Engagement**:

- Frequency of grandparent/uncle visits
- Decision involvement
- Support provided

**Family Communication**:

- Family Communication Patterns Revised (FCP-R)
- Conflict frequency

**Predictive use**: WBCI dropping below threshold for 2 consecutive months → automatic trigger of:

- Respite booking (W363 exists)
- Family counselling session
- Peer mentorship match
- Financial review
- Sibling check-in

### Innovation 5 — Federated Outcome Network

**Owner**: Phase H (W466-W490)
**Effort**: 12 weeks
**Dependencies**: All foundational layers + inter-center agreements

**Concept**: Multi-center learning without sharing PHI.

**Architecture**:

- Each center trains models on local data
- Only model updates (gradients) shared, never raw data
- Central aggregator combines updates
- Updated global model distributed back

**Benefits**:

- Saudi national disability outcome benchmarks
- Best practice diffusion
- Population-level research
- PDPL-compliant (no PHI sharing)

**Privacy techniques**:

- Differential privacy on gradient updates
- Secure multi-party computation for sensitive aggregations
- K-anonymity on any released benchmarks

### Innovation 6 — Beneficiary Digital Twin

**Owner**: Phase I (W491+)
**Effort**: 16+ weeks
**Dependencies**: Causal engine + multi-modal data

**Concept**: A simulation model of each beneficiary that can predict outcomes of different interventions before applying them.

**Components**:

- Functional model (ICF profile + trajectory)
- Behavioral model (sensitivity, triggers, preferences)
- Physiological model (where IoT data available)
- Environmental model (home, school, community)

**Use cases**:

- "What if we increase PT to 4x/week?" → simulate 3-month outcome
- "What if we add aquatic therapy?" → simulate
- "What if we change therapist?" → simulate (carefully — this is sensitive)

**Ethical guardrails**:

- Simulations are decision-support, not decision-making
- Clinician interprets results
- Family informed when simulation drives a recommendation
- Beneficiary consent for simulation modeling

### Innovation 7 — Story Architecture (Generative AI)

**Owner**: Phase F (W446-W455)
**Effort**: 5 weeks
**Dependencies**: W283 RAG + W284 voice + visual generation

**Outputs** (one engine, multiple audiences):

**Quarterly Story Book** (Family-facing):

- 8-12 page visual document
- Timeline of the 3 months
- Before/after photos (with consent)
- GAS T-score progression
- 3-5 "pride moments"
- Next quarter goals
- Family role highlights

**Annual Life Chronicle** (Beneficiary-facing):

- Beneficiary's own story, in their voice
- Photos, drawings (with consent)
- "Things I learned"
- "Things I'm proud of"
- "My dreams"

**Clinical Narrative** (Therapist-facing):

- AI draft of progress notes
- Suggested narrative summary for handoff
- Citations to GAS + ICF data

**Sibling Story** (Sibling-facing):

- Age-appropriate version
- No stigma
- "Things my sibling can do" focus
- Pride sharing

**Regulatory Summary** (Authority-facing):

- ICF-coded, GAS-normalized
- Outcomes by ICF domain
- Equity slices

### Innovation 8 — Independent Advocate Role + Rights Module

**Owner**: Phase B (W401-W410)
**Effort**: 4 weeks (role + workflow + module)
**Dependencies**: Existing user/role system

**The Independent Advocate**:

- Externally appointed (NGO partnership or government program)
- Not employed by the center
- Conflict-of-interest free
- Accessible by beneficiary/family without intermediary
- Can challenge clinical decisions on rights grounds

**Workflow**:

- Auto-assigned advocate at intake (opt-out option)
- Quarterly check-in with beneficiary (private channel)
- Triggered involvement on:
  - Restraint/seclusion (W193b exists)
  - Substituted decisions (CRPD Art. 12)
  - Complaints
  - Transition decisions

**Rights Module**:

- Age-appropriate rights education curriculum
- Self-advocacy training (capacity-building)
- Complaint mechanism with reasonable adjustments
- CRPD compliance dashboard

### Innovation 9 — Cultural Intelligence Layer

**Owner**: Phase E (W436-W445)
**Effort**: 4 weeks
**Dependencies**: Existing i18n + scheduler

**Components**:

**Time-aware**:

- Hijri calendar integration
- Prayer time API (5 daily, location-aware)
- Ramadan protocol activation
- Eid holiday calendar
- Hajj/Umrah accommodation requests

**Gender-aware**:

- Therapist gender preference per family
- Single-gender session options
- Modesty accommodations during exam/therapy
- Mahram (chaperone) requirements

**Family-structure-aware**:

- Multi-stakeholder decision modeling (father + grandfather + mother)
- Tribal/family elder consultation when relevant
- Extended family communication preferences

**Dialect-aware**:

- Regional Arabic dialects in SLP (Najdi, Hejazi, Eastern, Southern)
- Speech models tuned per dialect

**Consent-granular**:

- Photo/video consent: separate from text
- AI processing consent: separate from data storage
- Research consent: opt-in, never bundled

### Innovation 10 — Equity Engine + Disparity Detection

**Owner**: Phase G (W456-W465)
**Effort**: 4 weeks
**Dependencies**: Sufficient data + ICF foundation

**What it monitors** (all disaggregated):

| Dimension       | Disaggregation                                |
| --------------- | --------------------------------------------- |
| Income          | Insurance type as proxy + benefit utilization |
| Geography       | City/rural, region                            |
| Gender          | Male/female                                   |
| Severity        | Mild/moderate/severe/profound                 |
| Disability type | Per major categories                          |
| Age             | Age bands                                     |
| Nationality     | Citizen / resident                            |

**What it detects**:

- Statistically significant outcome gaps (chi-square, t-tests, regression)
- Access disparities (referral → intake conversion)
- Quality disparities (session frequency, therapist quality matching)
- Engagement disparities (attendance, family engagement)
- Outcome variance unexplained by clinical factors

**What it does**:

- Real-time alerts to Quality Director
- Quarterly equity report (anonymized, public-facing)
- Resource reallocation recommendations
- Bias detection in AI models (algorithmic fairness audits)

**Saudi-specific equity concerns**:

- Urban vs rural access
- Saudi vs resident outcomes
- Government-funded vs private-pay outcomes
- Male vs female access to certain therapies
- Disability type stigma effects

---

## 7. Decision Rights Matrix — Beyond RACI

v1's RACI matrix treats family as proxy for the beneficiary by default. v3 implements CRPD-compliant **supported decision-making**.

```text
Decision Layer Hierarchy:

┌────────────────────────────────────────────────────────────────┐
│ Layer 1: BENEFICIARY AUTONOMY                                  │
│  - Default for all decisions where capacity exists              │
│  - Capacity assessed per-decision, not blanket                  │
│  - Reasonable adjustments to support understanding              │
│  - Decision: beneficiary decides; others advise                 │
├────────────────────────────────────────────────────────────────┤
│ Layer 2: SUPPORTED DECISION-MAKING (CRPD Art. 12)              │
│  - When capacity is limited but not absent                      │
│  - Beneficiary + Independent Advocate + Family + Clinician     │
│  - Decision: beneficiary chooses with support                   │
│  - NEVER substituted                                            │
├────────────────────────────────────────────────────────────────┤
│ Layer 3: SUBSTITUTED DECISION-MAKING (last resort)             │
│  - Only when capacity clearly absent                            │
│  - Time-limited                                                 │
│  - Reviewed regularly                                           │
│  - Best-interest standard + beneficiary's known preferences     │
│  - Decision: guardian decides with advocate oversight           │
├────────────────────────────────────────────────────────────────┤
│ Layer 4: EMERGENCY OVERRIDE                                    │
│  - Medical emergency / safeguarding only                        │
│  - Documented after-the-fact                                    │
│  - Reviewed within 72h                                          │
│  - Decision: clinician acts, reviews later                      │
└────────────────────────────────────────────────────────────────┘
```

**Capacity Assessment Framework** (NEW):

- Per-decision, not blanket
- Considers: understanding, retaining, weighing, communicating
- Age-adapted instruments
- Disability-adapted instruments
- Re-assessed at major decision points
- Documented + audit-trailed

**Examples of layer routing**:

| Decision                                  | Verbal teen with mild ID    | Non-verbal child with profound ID | Adult with TBI              |
| ----------------------------------------- | --------------------------- | --------------------------------- | --------------------------- |
| Daily preferences (food, activity choice) | Layer 1                     | Layer 2 (via AAC + advocate)      | Layer 1                     |
| Therapy participation                     | Layer 1                     | Layer 2                           | Layer 1                     |
| Major care plan changes                   | Layer 2                     | Layer 2                           | Layer 2                     |
| Medication changes                        | Layer 2                     | Layer 3 + advocate                | Layer 2                     |
| Restraint/seclusion                       | Layer 4 emergency, reviewed | Layer 4 emergency, reviewed       | Layer 4 emergency, reviewed |
| Research participation                    | Layer 1                     | Layer 3 with advocate veto        | Layer 1 or 2 depending      |

---

## 8. Ethics & Safety Architecture

A system of this scope without explicit ethics is irresponsible. Four mandatory pillars:

### 8.1 Algorithmic Fairness Audits

**Cadence**: Quarterly
**Auditor**: Independent third party (different from system vendor)
**Scope**:

- All AI/ML models in active use
- Outcome disparities across demographic groups
- Recommendation pattern disparities
- Algorithmic bias detection

**Output**:

- Public-facing audit report (anonymized)
- Remediation plan if disparities found
- Re-audit after remediation

### 8.2 Explainability Requirement

**Rule**: No AI decision affects care without explanation in plain Arabic understandable to family.

**Implementation**:

- Every AI recommendation carries:
  - What the model saw (features)
  - Why it recommends (top contributing factors)
  - Confidence level
  - What would change the recommendation (sensitivity analysis)
- LLM-generated narratives carry citations to source data

### 8.3 Clinician Override Always Wins

**Rule**: AI recommends, human disposes. Always.

**Implementation**:

- Every AI decision has an "override" button
- Override reason captured (for model improvement)
- Override frequency tracked per clinician (training opportunity if extreme)
- Override frequency tracked per model (model quality signal)

### 8.4 Opt-Out Without Penalty

**Rule**: Family/beneficiary can decline AI involvement without affecting care quality.

**Implementation**:

- Granular consent per AI modality
- Opt-out tracked separately
- Service standards apply equally to AI-out beneficiaries
- No outcome differential allowed (audit annually)

### 8.5 Dignity Preservation

**Rule**: Every UX surface respects dignity.

**Implementation**:

- Language guidelines: person-first ("person with disability", not "disabled person") — though in Arabic this is more nuanced
- Imagery: realistic, dignified, capable-portrayed
- No infantilization of adults
- No tragedy framing
- Celebration of capability + accommodation

---

## 9. Cultural Adaptation Layer — Saudi-Specific Deep Dive

This deserves its own section because international frameworks alone are insufficient.

### 9.1 Religious Accommodations (Islamic Context)

**Daily prayer**:

- Schedule respects 5 daily prayer times
- Prayer breaks in long sessions
- Wudu (ablution) facility availability
- Prayer direction in therapy rooms
- Modest scheduling around Friday Khutbah

**Ramadan**:

- Adjusted session intensity (fasting affects energy)
- Possible session timing shifts (evening sessions for older beneficiaries)
- Iftar timing respected
- Suhoor consideration for morning appointments
- Reduced fasting expectations for those medically exempted
- Spiritual care recognition

**Hajj/Umrah**:

- Long-absence accommodation
- Family pilgrimage planning support
- Spiritual milestone recognition

**Hijri calendar**:

- All dates support Hijri view
- Eid holidays calendar
- Ramadan kickoff/end events

### 9.2 Family Structure (Saudi Context)

**Multi-generational decision-making**:

- Father often legally responsible but consultation includes grandfather, uncles
- Mother often primary care provider but may not be primary decision-maker
- Older brothers may have significant say in disabled sibling's care
- Tribal context: family elder consultation valued

**Workflow implications**:

- Notifications can route to multiple family members
- Major decisions document multi-stakeholder consultation
- Family meeting accommodation (larger conference rooms)
- Respect for father's authority while ensuring beneficiary voice

### 9.3 Gender Considerations

**Therapist gender preference**:

- Family may prefer same-gender therapist
- Especially for older beneficiaries (puberty+)
- Especially for physically intimate therapies (PT, certain OT, SLP with oral motor)
- Female-only sessions may be requested
- Male therapist with mahram (chaperone) accommodation

**Implementation**:

- Therapist gender as schedulable preference (not as rigid rule)
- Mahram booking workflow
- Female-only times in facility design

### 9.4 Modesty & Privacy

**Physical examination**:

- Hijab accommodation during PT
- Same-gender exam preferred
- Modesty drapes available
- Photo/video consent extra-granular

**Communication**:

- WhatsApp not preferred for some families (privacy concerns) — alternative channels
- Phone calls to female caregivers may need to route through male family member

### 9.5 Stigma Sensitivity

**Disability stigma in Saudi context**:

- Hidden disabilities sometimes preferred (autism not always disclosed)
- "Evil eye" concerns affect photo sharing
- Marriage prospect concerns for siblings
- Employment disclosure complexities

**Implementation**:

- Default privacy settings: maximum restrictive
- Opt-in (not opt-out) for any sharing
- Anonymous research participation default
- No public photos without explicit per-photo consent

### 9.6 Language & Dialect

**Arabic dialects in Saudi Arabia**:

- Najdi (central)
- Hejazi (western)
- Eastern (Gulf-adjacent)
- Southern (Aseer/Jazan)
- Bedouin variations

**SLP implications**:

- Speech models tuned per dialect
- Voice analysis (W284) needs dialect awareness
- Therapist matching considers dialect

**MSA vs colloquial**:

- Education in MSA, daily life in dialect
- Therapy mixes both appropriately

---

## 10. Stakeholder Value Matrix

What does each stakeholder gain from v3?

| Stakeholder              | Top 3 Gains                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Beneficiary**          | 1) Voice channel respected. 2) Lifelong connection, not abandonment at "discharge". 3) Rights protected by independent advocate.        |
| **Family**               | 1) Wellbeing tracked as outcomes, not collateral. 2) Story-rich engagement. 3) Mentorship network from peers.                           |
| **Sibling**              | 1) Own UX hub. 2) Recognized in care plan. 3) Support without stigma.                                                                   |
| **Therapist**            | 1) AI assist for documentation. 2) Burnout tracked & supported. 3) Adaptive protocols reduce trial-and-error.                           |
| **Case Manager**         | 1) Predictive alerts before problems. 2) Causal evidence for plan decisions. 3) Cross-cutting view of all 42 contracts per beneficiary. |
| **Clinical Supervisor**  | 1) Outlier detection. 2) Drift guards. 3) Equity warnings.                                                                              |
| **Director**             | 1) CARF/JCI-ready outcomes. 2) Value-based-care defensible data. 3) Vision 2030 KPI contribution.                                       |
| **MOH**                  | 1) ICF-coded national outcomes. 2) Equity data for policy. 3) Standardized reporting.                                                   |
| **Disability Authority** | 1) CRPD compliance evidence. 2) Population-level statistics. 3) Disability registry contribution.                                       |
| **Insurers**             | 1) Outcome-based contracting evidence. 2) Risk-adjusted comparisons. 3) Causal proof of value.                                          |
| **Researchers**          | 1) Federated learning network. 2) Anonymized research cohorts. 3) Publication-grade data.                                               |
| **Saudi Vision 2030**    | 1) Quality of Life Program contribution. 2) Disability inclusion KPI. 3) Healthcare excellence positioning.                             |

---

## 11. Implementation Roadmap

| Phase | Letter                     | Waves     | Duration  | Output                                                             | Cumulative Value                             |
| ----- | -------------------------- | --------- | --------- | ------------------------------------------------------------------ | -------------------------------------------- |
| **A** | ICF Foundation             | W391-W400 | 6 weeks   | ICF mapping + GAS T-score lib                                      | International language for outcomes          |
| **B** | Rights & Voice             | W401-W410 | 4 weeks   | Beneficiary Voice Module + Independent Advocate + Rights education | CRPD compliance + beneficiary agency         |
| **C** | Family Wellbeing           | W411-W420 | 5 weeks   | WBCI + Sibling Hub + Family Counsellor + Financial Navigator       | Family as unit of care                       |
| **D** | Causal Intelligence        | W421-W435 | 8 weeks   | causal-inference.lib.js + synthetic controls + DiD                 | Value-based care defensible + research-grade |
| **E** | Cultural Layer             | W436-W445 | 4 weeks   | Cultural Intelligence (prayer, Ramadan, gender, family structure)  | Saudi-fit excellence                         |
| **F** | Story Architecture         | W446-W455 | 5 weeks   | Quarterly Story Books + variants per surface                       | Engagement transformation                    |
| **G** | Equity Engine              | W456-W465 | 4 weeks   | Disparity Detection + Equity Dashboard + Action Triggers           | Justice + Vision 2030 alignment              |
| **H** | Federated Network          | W466-W490 | 12 weeks  | Multi-center learning + Saudi disability registry contribution     | National impact                              |
| **I** | Digital Twin & Adaptive RL | W491+     | 16+ weeks | Simulation engine + RL therapy adaptation                          | World-class differentiation                  |

**Total**: ~64 weeks for full v3. But **value accrues incrementally** — Phase A alone elevates the platform from "excellent locally" to "internationally benchmarked".

**Critical path**:

- Phase A (ICF) is prerequisite for D (Causal), G (Equity), H (Federated)
- Phase B (Rights) is prerequisite for CARF accreditation
- Phase C (Family) is prerequisite for predictive dropout interventions
- Phase D (Causal) is prerequisite for outcome-based contracting

**Parallel-runnable** (lower dependencies):

- Phase E (Cultural) can start anytime
- Phase F (Story) can start after Phase A
- Phase G (Equity) needs A + 6 months of data

---

## 12. KPIs — System-Level Health Indicators

### 12.1 Clinical Excellence

- GAS T-score median across beneficiaries (target: >55, sustained)
- ICF qualifier improvement rate (target: average -1 across 12 months)
- Plateau detection-to-replan time (target: <14 days)
- Causal effect magnitude per intervention (target: documentable per intervention)

### 12.2 Rights & Voice

- Beneficiary Voice Capture Rate (target: >85%)
- Independent Advocate engagement rate (target: 100% offered, >60% accept)
- CRPD Compliance Score (target: >90%)
- Complaint resolution time with reasonable adjustments (target: <30 days)

### 12.3 Family Wellbeing

- Family WBCI median (target: >65, stable)
- Caregiver burnout < threshold (target: <20% in high-burnout zone)
- Sibling support coverage (target: 100% offered, >70% engaged)
- Bereavement support utilization when needed

### 12.4 Community Integration

- Participation Score median (target: increasing trend)
- School inclusion rate (for school-age beneficiaries) (target: >85%)
- Work inclusion rate (for working-age) (target: based on capability profile)

### 12.5 Cultural Fit

- Cultural-related no-show rate (target: declining)
- Family satisfaction with cultural sensitivity (target: >90%)
- Accommodation coverage rate (target: 100% requested accommodations granted)

### 12.6 Crisis Readiness

- Time-to-response by severity tier (target: <30 min critical, <4h urgent)
- Post-incident review within 72h (target: 100%)
- Recurrence rate (target: declining)

### 12.7 Equity

- Disparity Index across all monitored dimensions (target: closing gaps)
- Equity-adjusted outcome variance (target: minimizing)
- Public equity report quality

### 12.8 Provider Wellbeing (4th Aim)

- Therapist burnout score (target: <20% high-burnout)
- Therapist retention rate (target: >85% annual)
- Therapist autonomy index (target: >70%)
- Continuity score (same therapist over time) (target: >75%)

### 12.9 Operational Excellence

- Phase 1→2 transition within 14 days (target: >90%)
- Documentation within 24h (target: >95%)
- AI override frequency (signal — investigate extremes)
- System uptime (target: 99.9%)

### 12.10 Societal Impact

- Contribution to Saudi disability registry (target: 100% consenting beneficiaries)
- Research publications (target: ≥2/year)
- Best practice diffusion (target: documented exchanges)
- CARF accreditation status (target: achieve within 2 years)

---

## 13. Open Questions for Stakeholders

These require decisions before full v3 implementation:

### Q1 — Independent Advocate sourcing

Who provides the Independent Advocate?

- (a) NGO partnership (e.g., disability rights NGO)
- (b) Government program (Disability Authority)
- (c) Internal but organizationally independent
- (d) Hybrid

**Recommendation**: (a) for true independence, with (b) as funding/oversight partner.

### Q2 — Sibling Hub age range

For whom?

- (a) 5-18
- (b) 8-18
- (c) 5-25 (includes adult siblings)
- (d) All siblings regardless of age, age-adapted UX

**Recommendation**: (d) — adult siblings often become caregivers.

### Q3 — Causal evidence threshold

What confidence interval / sample size is required before causal claim affects:

- (a) Individual beneficiary's plan
- (b) Program-level decisions
- (c) Public claims / publications

**Recommendation**: 95% CI minimum, sample size ≥50 matched controls for (a), ≥200 for (b), ≥500 for (c).

### Q4 — Story Book delivery

Quarterly story books at scale: who curates/reviews/approves?

- (a) Fully automated
- (b) AI-drafted, therapist-reviewed
- (c) AI-drafted, Case Manager + Family co-curated

**Recommendation**: (b) for quarterly, (c) for annual chronicles.

### Q5 — Equity engine alerting

When disparity detected:

- (a) Internal-only escalation
- (b) Director-level + remediation plan
- (c) Public reporting (anonymized)

**Recommendation**: (b) immediately, (c) in quarterly equity report.

### Q6 — Federated learning participation

What inter-center governance structure for federated learning?

- (a) Disability Authority orchestrated
- (b) MOH-coordinated
- (c) Industry consortium
- (d) Pilot bilateral first, expand

**Recommendation**: (d) start with 2-3 trusted partner centers, build governance, expand.

### Q7 — Cultural Officer role

Standalone role or combined?

- (a) Standalone (dedicated position)
- (b) Combined with Social Worker
- (c) Combined with Case Manager
- (d) Shared across team with cultural champion

**Recommendation**: (d) for pilots, (a) at scale (>500 beneficiaries).

### Q8 — Provider Wellbeing (4th Aim)

Measure but don't report? Or full transparency?

- (a) Internal-only metrics
- (b) Anonymized to therapists individually
- (c) Open dashboard
- (d) Anonymized branch-level

**Recommendation**: (b) individual + (d) branch-level. Open dashboard premature without trust.

---

## 14. Risk Register

| #   | Risk                                                      | Probability | Impact | Mitigation                                                             |
| --- | --------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------- |
| 1   | Stakeholder pushback on CRPD-level changes                | Medium      | High   | Phased rollout; start with non-controversial Phases A, F               |
| 2   | ICF adoption requires therapist retraining                | High        | Medium | Embed in onboarding; pair with existing measurement workflows          |
| 3   | Causal engine produces uncomfortable findings             | Medium      | Medium | Transparent process; reframe as learning opportunity                   |
| 4   | Cultural adaptations conflict with clinical best practice | Low         | Medium | Cultural Officer mediation; clinical override possible                 |
| 5   | Federated learning legal/data residency complications     | High        | Medium | Defer Phase H until regulatory clarity                                 |
| 6   | Therapist resistance to AI assistance                     | Medium      | Medium | AI as assistant not replacement; outcome data to demonstrate value     |
| 7   | Family preference for "discharge" closure (cultural)      | Medium      | Low    | Reframe as "graduation level"; maintain closure ceremonies             |
| 8   | Cost of Independent Advocate program                      | High        | Medium | NGO/government partnership; volunteer advocates initially              |
| 9   | Sibling Hub uptake low                                    | Medium      | Low    | Marketing + age-appropriate gamification; integrate with family portal |
| 10  | Data overload paralysis                                   | Medium      | Medium | Tiered dashboards; supervisor cockpit highlights what needs attention  |

---

## 15. References

### International Standards

- World Health Organization. (2001). _International Classification of Functioning, Disability and Health (ICF)_.
- World Health Organization. (2007). _ICF for Children and Youth (ICF-CY)_.
- United Nations. (2006). _Convention on the Rights of Persons with Disabilities (CRPD)_. (Saudi Arabia ratification 2008).
- Commission on Accreditation of Rehabilitation Facilities. (Current). _CARF Standards Manual_.
- Institute for Healthcare Improvement. (2014). _The Quadruple Aim_.

### Outcome Measurement

- Kiresuk, T. & Sherman, R. (1968). Goal Attainment Scaling: A general method for evaluating community mental health programs. _Community Mental Health Journal_.
- Haley, S. M., et al. (2010). _Pediatric Evaluation of Disability Inventory — Computer Adaptive Test (PEDI-CAT)_.

### AI / ML in Healthcare

- Athey, S., & Imbens, G. (2017). The state of applied econometrics: Causality and policy evaluation. _Journal of Economic Perspectives_.
- McMahan, B., et al. (2017). Communication-efficient learning of deep networks from decentralized data (Federated Learning). _AISTATS_.
- DeepMind & Mayo Clinic. (2023). Reinforcement learning for personalized medication dosing.

### Family Systems

- Bronfenbrenner, U. (1979). _The Ecology of Human Development_.
- Maslach, C., & Jackson, S. E. (1981). _Maslach Burnout Inventory_.

### Saudi Context

- Saudi Vision 2030 — Quality of Life Program (disability inclusion KPIs).
- Personal Data Protection Law (PDPL) — 2021, in force 2024.

---

## 16. Document Lifecycle

- **v1**: Original 9-stage linear lifecycle (current state)
- **v2**: Conceptual proposal (chat — superseded by this v3)
- **v3** (this document): Comprehensive architecture proposal
- **Next**: ADR-031 for formal decision; per-phase deep-dives (Phase A first); gap analysis; wave-level execution plan

**Maintenance**: This document is canonical for lifecycle architecture. Updates require:

- Architecture review
- Stakeholder consultation for major shifts
- ADR for binding decisions
- Versioning (v3.1, v3.2, etc.)

**See also**:

- ADR-031 — Lifecycle Architecture v3 Decision Brief
- `docs/architecture/PHASE_A_ICF_FOUNDATION.md` — ICF Foundation deep dive
- `docs/architecture/CAUSAL_INFERENCE_ENGINE.md` — Causal engine deep dive
- `docs/architecture/GAP_ANALYSIS_LIFECYCLE_V3.md` — Code vs design gap analysis
- `docs/architecture/PHASE_A_WAVES_W391_W400.md` — Wave-level execution plan
