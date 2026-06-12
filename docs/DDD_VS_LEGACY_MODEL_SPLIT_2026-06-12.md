# Systemic Finding — DDD-write vs legacy-read model split (launch blocker)

**Status:** 🔴 launch blocker · **Found:** 2026-06-11/12 (W1232/W1237/W1238) ·
**Method:** trace each `/api/v1/X` the web-admin writes → which model the handler
persists → vs which model the read surfaces (360 / analytics / workers) consume.

## The pattern (root cause)

The web-admin go-forward UI writes to the modern **`backend/domains/*` DDD models**.
The **Beneficiary-360** was migrated to read those same DDD models, so the core
"create → see on the 360" loop is consistent. **But the intelligence layer,
analytics dashboards, schedulers/workers, and many report surfaces were NOT
migrated** — they still read the **legacy models**. **There is no sync between the
DDD model and its legacy twin.**

Net effect: **clinical data entered through the UI lands in the DDD model, shows on
the 360, and is then invisible to every legacy-reading surface** — analytics,
review/retry workers, goal-progress linkage, claims, audit-trail/hash-chain
integrity. The 360 looking correct masks the gap.

## Confirmed splits

### 1. Care plans — `UnifiedCarePlan` (write/360) vs `CarePlanVersion` (intelligence) 🔴 most severe

| Path                                                                                                                                                                                                                                                                                                             | Model                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| UI create/submit/approve/reject (`POST /api/v1/care-plans`, `domains/care-plans`)                                                                                                                                                                                                                                | **`UnifiedCarePlan`**                                 |
| Beneficiary-360 care-plan widget                                                                                                                                                                                                                                                                                 | **`UnifiedCarePlan`** (consistent ✅)                 |
| **The ENTIRE care-plan intelligence** — `care-plan.service` (W50 review), `care-plan-bootstrap`, **`care-plan-family-retry.worker` (W45)**, `care-plan-side-effects.service`, `care-plan-audit-trail.service`, `evidence-snapshot.lib`, `hash-chain.lib`, `beneficiary-lifecycle.service`, `plan-recommendation` | **`CarePlanVersion`**                                 |
| `rehabPlanHealth.service` (W1201)                                                                                                                                                                                                                                                                                | **`CarePlanVersion`-first**, UnifiedCarePlan fallback |

**No bridge in either direction** (verified: `domains/care-plans` never references
`CarePlanVersion`, and the intelligence never references `UnifiedCarePlan`).

> ⚠️ **CRITICAL PROD IMPLICATION.** `ENABLE_CARE_PLAN_WORKERS` was flipped **ON in
> production** (W973: W50 overdue-review scanner + W45 family-retry worker). **Both
> read `CarePlanVersion`.** The UI writes `UnifiedCarePlan`. → **A care plan created
> through the UI at launch will never be seen by the running workers** — no overdue
> review, no family-retry, no plateau detection, no side-effect tracking, no
> audit-trail/hash-chain entry. The workers are live but blind to real UI data.

### 2. Clinical sessions — `ClinicalSession` (write/360) vs `TherapySession` (analytics) — ✅ **FIXED (W1240)**

UI writes `ClinicalSession` (`domains/sessions`); 360 reads it ✅; Session-Center KPIs

- episodes + goal-progress + NPHIES claims + ICF + pain (the 56 `TherapySession`
  consumers) read `TherapySession`. No sync → UI-logged sessions were invisible to all
  of them.

**Resolved by a CQRS read-model projection** (`domains/sessions/services/
therapySessionProjection.js`, PR #426). Every `ClinicalSession` write
(schedule/update/complete/cancel via `SessionsService`) faithfully projects a
`TherapySession` keyed by `sourceClinicalSessionId` (sparse+unique, idempotent).
**FAIL-SAFE** (never throws → can't break the session write); **faithful-or-null**
(`therapistId`→`therapist` via `Employee.user_id`, null when unlinked — never wrong).
8 behavioral tests; no regression. This worked because `TherapySession` is a faithful
_analytics mirror_ — every field it needs can be mapped or safely left null.

### 2a. Why care-plans CANNOT use the same projection (W1241) — ⛔ patient-safety boundary

The session fix does **not** generalize to care-plans. `CarePlanVersion` is not an
analytics mirror — it is a **rich, hash-chained clinical-legal document** whose `body`
**requires** structured fields the UI's `UnifiedCarePlan` does not carry:

| `CarePlanVersion` requires                                                                             | `UnifiedCarePlan` (UI) has                                               |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `body.goals[].icfCode` (regex `/^[bsde]\d+$/`), `priorityScore` (0-1), `statement`, `domain`, `status` | only a goal **reference** (`goalId → TherapeuticGoal`) in section groups |
| `body.programs[]` / `measures[]` / `tests[]` with `goalRefs`                                           | — (not modeled)                                                          |
| `signatureChain` (append-only, **hash-chained**) + `evidenceHash` (sha256 body lock)                   | —                                                                        |

A projection would therefore have to **fabricate ICF codes, priority scores, and goal
statements the clinician never entered, and forge hash-chain/evidence integrity
records.** That crosses two hard lines — **no fabricated clinical data** and **no
forged audit integrity** — so a care-plan projection is **rejected**, not deferred.

**The care-plan split is a genuine consolidation, not a projection.** It needs the
care-plan domain owner to decide a canonical model and a staged migration:

- **CarePlanVersion is the value-bearing model** (W41-51 workflow + W44/W50 intelligence
  - hash-chain + the prod-ON W973 workers + ~10 intelligence files). The thin
    `UnifiedCarePlan` references `TherapeuticGoal` instead of embedding clinical detail.
- The honest options are **(a) re-point the UI/360 to author `CarePlanVersion`** (the UI
  form must capture the rich clinical fields — a frontend+backend effort), or
  **(b) re-point the intelligence/workers to read `UnifiedCarePlan` + `TherapeuticGoal`**
  (port W50/W45/hash-chain logic to the reference-based schema). Both are migrations,
  not one-shot bridges. Until decided, **UI-authored care plans will not reach the
  prod-ON review/retry workers** — this remains a 🔴 launch blocker for care plans.

#### Recommended direction (W1244 — recommendation, owner decides)

**Recommend option (b): `UnifiedCarePlan` becomes the canonical care plan; port
`CarePlanVersion`'s workflow/intelligence onto it; goals stay as `TherapeuticGoal`
references.** Rationale, evidence-backed:

1. **It is the only direction consistent with ADR-040.** ADR-040 already made
   `TherapeuticGoal` the canonical goal (referenced, with its own `icfCode`/
   `priorityScore`/target). `UnifiedCarePlan` _references_ `TherapeuticGoal` —
   aligned. `CarePlanVersion` _embeds_ a second copy of goal detail (its own
   `body.goals[].icfCode/priorityScore/statement`) — that embedded copy is the very
   goal-duplication ADR-040 set out to remove. Choosing option (a) would re-entrench
   it. Choosing (b) retires it.
2. **Zero data cost** — both care-plan collections are empty in prod (W1235), so this
   is pure forward-architecture; no migration of live plans.
3. **The UI + 360 already author/read `UnifiedCarePlan`** — keeping the write side
   put means no frontend rework and no risk to the live data-entry spine.

What option (b) actually requires (a real, staged migration — **not** a one-shot):

- Lift the **review lifecycle** (W41-51 statuses + transitions + `reviewSchedule`)
  onto `UnifiedCarePlan` (it already has `reviewDate`/`reviewCycle` — extend to the
  full cadence the W50/W45 workers expect).
- Lift the **integrity layer** (`signatureChain` + `evidenceHash`) onto
  `UnifiedCarePlan` so the compliance/audit guarantees survive — this is the only
  genuinely hard part and should ship first, behind tests, as its own PR.
- **Re-point the ~10 `intelligence/care-plan*` consumers + the prod-ON W973 workers**
  from `CarePlanVersion` to `UnifiedCarePlan`, one file per PR, each with a behavioral
  test (the W1240/W1242 template), so the review/retry/plateau/side-effect engines
  read the model the UI writes.
- Resolve goal detail through the `TherapeuticGoal` references (not an embedded copy)
  wherever the intelligence needs `icfCode`/`priorityScore`/progress.
- Finally retire `CarePlanVersion` (empty, no consumers left) + its embedded-goal body.

This is the biggest item left in the audit and the one place a projection is unsafe
(W1241 — would fabricate clinical data). It needs the care-plan domain owner to
approve the direction; the per-file re-point work is then mechanical and testable.

> ✅ **DIRECTION APPROVED + STEP 1 SHIPPED (W1252, 2026-06-12).** The domain owner
> approved option (b) (UnifiedCarePlan canonical). Step 1 — the integrity layer —
> is done: `signatureChain` (append-only, hash-chained; signature-hash payload
> format IDENTICAL to `CarePlanVersion.computeSignatureHash` for cross-model
> verifiability) + `evidenceHash` (sha256 over a deterministic canonicalization of
> the clinical body via `extractClinicalBody`) lifted onto `UnifiedCarePlan`, with
> `appendSignature`/`verifySignatureChain`/`sealEvidence`/`verifyEvidence` methods
>
> - a pre-save immutability invariant (evidenceHash cannot change once set).
>   `CarePlansService.activatePlan` now records the 'activate' signature + seals
>   evidence when the route passes the actor (fail-safe otherwise — enforcement
>   flips once all callers pass actors). 8 tests incl. cross-model hash-compat +
>   tamper detection. **Next steps (per-file re-points of the ~10
>   `intelligence/care-plan*` consumers + the W973 workers, one PR each with a
>   behavioral test) remain OPEN.**
>
> ✅ **W1253 (2026-06-12): first prod-ON worker re-pointed.** The W50
> overdue-review scanner now dual-scans: legacy `CarePlanVersion` (unchanged) +
> `UnifiedCarePlan` (UI-authored; statuses active/under_review, due at
> `nextReviewDate`, author/approver via createdBy/approvedBy) normalized into
> the same severity/dedupe/notify pipeline with `payload.source` tagging.
> Optional dep + fail-soft (unified query errors never block the legacy scan).
> Wired through `care-plan-bootstrap` ← `startup/carePlanningBootstrap` (lazy,
> degrades to legacy-only). 5 new MMS tests + the original W50 suite green.
> **Remaining re-points: family-retry worker (W45), plateau detector,
> side-effects/audit-trail/hash-chain consumers, plan-recommendation.**
>
> ✅ **W1254 (2026-06-12): second prod-ON worker re-pointed + a latent
> persistence bug root-fixed.** `familyNotifications[]` lifted field-for-field
> onto `UnifiedCarePlan`; the W45 family-retry worker dual-scans (legacy
> statuses unchanged; unified = active/under_review with a failed attempt),
> `details[].source` tagging, fail-soft. **Root-fix:** the worker's real-model
> path fetched candidates `.lean()`, so every retry mutation (retries++,
> status flips, manual_override) hit a missing `.save()` and was silently
> dropped — backoff/exhaustion state reset on every cron run (potential
> notification spam). Candidates are now hydrated against real models while
> legacy mock shapes are honored unchanged. 5 MMS tests (incl. persistence
> proofs) + the original W50 suite green (38/38 across the worker suites).
> **Remaining: plateau detector, side-effects/audit-trail/hash-chain
> consumers, plan-recommendation.**
>
> ✅ **W1255 (2026-06-12): plateau detector re-pointed.** Dual-review with
> normalized unified rows (reviewCycle → cadenceWeeks map; nextReviewDate;
> createdBy/approvedBy as author/reviewer), `payload.source` tagging,
> fail-soft. Cadence stamp: `lastPlateauReviewAt` declared top-level on
> `UnifiedCarePlan` (so the `$set` survives strict mode) while
> CarePlanVersion keeps `metadata.*`. 4 MMS tests through the REAL W44
> progress reviewer (overdue-review trigger fires for a UI plan; stamp
> persists + half-cadence gate honored) + W50 suite green (32/32).
> **Remaining: side-effects/audit-trail/hash-chain consumers,
> plan-recommendation.**
>
> ✅ **W1257 (2026-06-12): audit trail serves UnifiedCarePlan.** The W45
> aggregator is pure, and the W1252/W1254 lifts used identical shapes, so
> the adapter is a field-name normalization (`buildUnifiedAuditTrail`:
> planNumber→planId, version→versionNumber, createdBy/approvedBy as
> author/approver). Legacy-only structures (validation/rejection/
> amendments) emit NO events — faithful-or-absent. Exposed at
> `GET /api/v1/care-plans/:planId/audit-trail` with the same role-based
> redaction (clinical/family/executive). 5 tests incl. tamper flagging +
> family redaction. **Remaining: side-effects consumers,
> plan-recommendation.**
>
> ✅ **W1258 (2026-06-12): consumer map CLOSED.** Final audit findings:
> **(a) side-effects** — the W45 handlers are doc-agnostic (no model reads;
> they operate on the passed doc), so they have served UnifiedCarePlan since
> W1254; the only inaccuracy was the audit label hard-coded to
> 'CarePlanVersion' — now source-faithful via `entityTypeOf()` (legacy
> carries versionNumber; unified carries planNumber/version; ambiguous →
> legacy, conservative). **(b) plan-recommendation** — the builder is PURE
> (reads only care-planning.registry, no model reads): **reclassified — not
> a split.** Its UnifiedCarePlan integration is a future product feature.
> **(c) family-version gap recorded:** UnifiedCarePlan has no
> `familyVersion.body` (the W43 generator was never ported), so
> notify_family faithfully SKIPS for unified plans (no fabricated family
> content). Porting the W43 family-version generator to UnifiedCarePlan is
> the one remaining **product feature** needed for end-to-end family
> notifications on UI plans — a feature gap, not a data-visibility split.
> 4 tests. **ADR-040 (b) consumer re-point map: COMPLETE** (integrity W1252,
> scanner W1253, family-retry W1254, plateau W1255, audit-trail W1257,
> side-effects W1258, plan-recommendation reclassified).
>
> ✅ **W1259 (2026-06-12): the family-version product gap CLOSED.** The W43
> generator gained a pure unified adapter (`generateForUnifiedPlan`:
> goals gathered across global + all section groups with type→domain +
> priority→score maps; string homeProgram → activity list; reviewCycle →
> cadence — faithful-or-absent). `UnifiedCarePlan.familyVersion` lifted
> (same 3-field shape). `activatePlan` generates + stores it ONLY when the
> deterministic safety floor passes (readability ≤ grade cap, zero
> forbidden clinical terms, all required sections) — a requiresRewrite
> result is never sent to a family. End-to-end MMS proof: the
> `notify_family` handler that skipped (`no_family_body`) pre-W1259 now
> SENDS for a UI-authored plan with the correct audit label. 12 tests.
> **The full family chain now works for UI plans: activate → generate →
> notify → W45 retry → audit trail.**

### 2c. CORRECTION (W1245) — the behavior row was mis-analysed; W1242 fixed an unused path

A web-admin write-path verification pass (always check what the UI **actually** POSTs,
the W1231 lesson) corrected the behavior row. The earlier premise — "UI writes
`BehaviorRecord` (domains/behavior)" — was **wrong**. Behavior is a **3–4-way model
fragmentation**:

| Model                                                                       | Who writes/reads it                                                                                              | Shape / collection                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `RehabAdvancedBehaviorIncident` (`models/rehabilitation-advanced.model.js`) | **the web-admin behavior UI WRITES it** (`POST /api/v1/rehabilitation-advanced/behavior-incidents`, `buildCrud`) | **snake** — `beneficiary_id`, `behavior_type.category`, `incident_info`                    |
| `BehaviorIncident` (`models/BehaviorIncident.js`)                           | **the risk/escalation engine READS it** (`behavioral.aggression.frequency.spike_200`)                            | **camel** — `beneficiaryId`, `behaviorType`, `observedAt`; collection `behavior_incidents` |
| `BehaviorRecord` (`domains/behavior`)                                       | **no UI writer** (mounted at `/api/v1/behavior`, but the web-admin never calls it)                               | DDD; my W1242 projection SOURCE                                                            |
| `AggregatedBehaviorIncident`                                                | analytics aggregation                                                                                            | —                                                                                          |

**Consequences:**

1. **W1242 (`BehaviorRecord → BehaviorIncident`) addresses a path the UI does not
   use.** It is harmless (additive, fail-safe, fires only when `BehaviorRecord` is
   written — which the web-admin never does) and forward-looking (ready if a future UI
   migrates to `domains/behavior`), but it did **not** close the active gap. The earlier
   "patient-safety: aggression reaches escalation" framing was incorrect for the live UI.
2. **The REAL behavior gap is `RehabAdvancedBehaviorIncident` (snake, UI-written) →
   `BehaviorIncident` (camel, risk-engine-read).** Different models, different
   collections, snake-vs-camel field shapes → **UI-logged behavior never reaches the
   escalation predictor.** This is the genuine patient-safety gap and it remains OPEN.
3. **Sessions (W1240) and care-plans (W1238) were RE-VERIFIED correct** by the same
   pass: `sessionApi.create/complete` (session-form + my-day) genuinely writes
   `ClinicalSession`; `carePlanApi` genuinely writes `UnifiedCarePlan`. Those fixes/
   findings stand.

**The real behavior fix** is a faithful snake→camel projection
(`RehabAdvancedBehaviorIncident → BehaviorIncident`: `behavior_type.category →
behaviorType`, `beneficiary_id → beneficiaryId`, `incident_info.intensity/date →
severity/observedAt`) — same W1240 template, but from the **correct** source. It is
deferred for a **carefully-verified** follow-up (behavior was mis-analysed twice;
a third change should be built only after confirming the snake model's exact registered
name + collection + that no `'BehaviorIncident'` model-name collision exists).

> ✅ **FIXED (W1251, 2026-06-12).** The mandated verification was performed first and
> corrected one more detail: the UI write model is registered as
> **`AggregatedBehaviorIncident`** (models/rehabilitation-advanced.model.js:1686 —
> exported under the local name `BehaviorIncident`, which is the naming trap that
> caused the earlier mis-analyses); `RehabAdvancedBehaviorIncident` is a THIRD,
> route-unused registration (models/rehab-advanced/BehaviorIncident.model.js). No
> model-name collision with the camel target. The write path (`buildCrud` →
> `Model.create`) fires save hooks. Fix shipped as
> `services/rehabAdvancedBehaviorProjection.js` (W1240/W1242 template: fail-safe,
> faithful-or-null, idempotent upsert keyed by new sparse+unique
> `BehaviorIncident.sourceRehabAdvancedIncidentId`) + post-save/post-findOneAndUpdate
> hooks on the snake schema. 9 tests incl. an MMS behavioral proof that the
> spike-rule aggregation now counts UI-logged (physical + verbal) aggression.

**Lesson reinforced:** for every split, verify the UI's ACTUAL write endpoint + the
model that endpoint persists — never assume "the UI writes the `domains/*` model."
Sessions/care-plans matched the assumption; behavior did not.

### 3. IEP — `SmartIEP` (UI) vs `IndividualEducationPlan` (W200b) — related instance

Not a DDD/legacy split but the same "two models, UI uses one" family. Resolved
direction recorded in ADR-026 addendum (W1232–W1234): SmartIEP go-forward.

## Why this is the top launch risk

At 7 demo beneficiaries the split is invisible (no real UI data exists yet). **The
moment real care plans and sessions are entered through the UI, half the platform's
value — the intelligence, the schedulers, the analytics, the compliance trail —
silently stops seeing them.** This is precisely the class of bug that only surfaces
_after_ go-live, when it is most expensive.

## Resolution options (decide before real data is entered)

1. **Bridge on write (lowest risk).** Each `domains/*` write also upserts/forwards
   to the legacy twin (or emits an event the legacy side consumes). Keeps every
   existing read surface working with no blast radius. The `feat/w928-core-linkage`
   event-bridge work may already provide the rails for this.
2. **Re-point reads.** Migrate the intelligence/analytics/workers to read the DDD
   models. Correct long-term, but large blast radius (care-plan intelligence alone
   is ~10 files; sessions ~56 consumers).
3. **Consolidate** to one model per concept. Free _today_ (legacy twins are
   effectively empty in prod) but the heaviest change.

## ⚠️ Coordination — do not race the parallel effort

Session/care-plan **core-linkage** (event bridges across `CareTimeline` +
cross-module subscribers) is the **active domain of `feat/w928-core-linkage`**.
Option 1 likely belongs there. This document is a **finding to coordinate**, not a
change to make in isolation. No code is changed by recording it.

## To complete the audit (per-entity method)

For each core data-entry entity, run the three-way trace:

1. **Write:** which model does the `/api/v1/X` POST/PUT handler persist? (usually a
   `domains/*` DDD model)
2. **360 read:** which model does `beneficiary360.service.js` read? (usually the
   same DDD model — consistent)
3. **Analytics/worker read:** which model do `intelligence/*`, the schedulers, the
   `reports`/`session-center`/`episodes` surfaces read? (often the legacy twin)

A mismatch between (1) and (3) is a split.

## Audit completed (W1239, 2026-06-12)

The remaining core entities were traced. Full result table (severity = blast radius
× whether the read side is a worker/compliance surface):

| Entity          | UI writes / 360 reads             | Analytics/intelligence reads                                                                                                                                                 | Verdict                                                                                                                                                                                                                 |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Care plans**  | `UnifiedCarePlan`                 | `CarePlanVersion` (≈10 intelligence files + the **prod-ON workers**)                                                                                                         | 🔴 **SPLIT — severe**                                                                                                                                                                                                   |
| **Sessions**    | `ClinicalSession`                 | `TherapySession` (session-center + **episodes** + goal-progress + claims + ICF + pain; 56 consumers)                                                                         | 🔴 **SPLIT — severe**                                                                                                                                                                                                   |
| **IEP**         | `SmartIEP`                        | (UI-less twin `IndividualEducationPlan`)                                                                                                                                     | 🟠 related family (ADR-026 addendum)                                                                                                                                                                                    |
| **Behavior**    | `BehaviorRecord` / `BehaviorPlan` | **`BehaviorIncident`** — read by the risk/escalation engine (`escalation-predictor.lib`, `risk/sources/behavioral-escalation.source`, `risk/registry`)                       | 🟠 **divergence — classify** (is a UI "behavior record" the same as a risk "incident"? if yes → split feeding the risk engine blind; if a distinct concept → fine)                                                      |
| **Goals**       | `TherapeuticGoal`                 | **`SmartGoal`** read by 5 surfaces (`care-gap.loader`, `assessmentRecommendationEngine`, `therapistPortal.service`, `assessmentReassessmentSweeper`, `orchestrator-loaders`) | 🟠 **divergence — classify** per ADR-040 (SmartGoal is the legitimate qualitative-_suggestion_ tier; but `therapistPortal`/`care-gap` reading it instead of `TherapeuticGoal` may be a real split, not tier-separation) |
| **Assessments** | `ClinicalAssessment`              | only `services/ai/smartReport.service` reads a legacy `Assessment*`                                                                                                          | 🟢 **mostly consistent** (one AI-report surface to re-point)                                                                                                                                                            |
| **Episodes**    | `EpisodeOfCare` (consistent)      | — but the episode **session-list reads `TherapySession`** (`episodes.routes.js:289`)                                                                                         | 🟡 **inherits the session split** — episode detail shows TherapySession, not the UI's ClinicalSession                                                                                                                   |

**Conclusion.** The pattern is real and broad: **2 severe splits (care-plans,
sessions), 2 needing concept-classification (goals, behavior), 1 minor
(assessments), and episodes inheriting the session split.** Care-plans + sessions
are the launch blockers; goals + behavior need a domain owner to decide
split-vs-legitimate-tier; assessments is a one-file re-point.

**Resolution priority for launch:** fix care-plans + sessions first (option 1
bridge-on-write, coordinated with `feat/w928`). Classify goals + behavior next.
Re-point the one assessment AI-report surface last.

---

_Recorded as a launch-readiness decision input under delegated authority. Changes no
code or config. Linked from [GO_LIVE_RUNBOOK_2026-06-11.md](GO_LIVE_RUNBOOK_2026-06-11.md)._
