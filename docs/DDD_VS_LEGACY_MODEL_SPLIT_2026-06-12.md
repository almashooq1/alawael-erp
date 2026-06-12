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

| Path | Model |
| --- | --- |
| UI create/submit/approve/reject (`POST /api/v1/care-plans`, `domains/care-plans`) | **`UnifiedCarePlan`** |
| Beneficiary-360 care-plan widget | **`UnifiedCarePlan`** (consistent ✅) |
| **The ENTIRE care-plan intelligence** — `care-plan.service` (W50 review), `care-plan-bootstrap`, **`care-plan-family-retry.worker` (W45)**, `care-plan-side-effects.service`, `care-plan-audit-trail.service`, `evidence-snapshot.lib`, `hash-chain.lib`, `beneficiary-lifecycle.service`, `plan-recommendation` | **`CarePlanVersion`** |
| `rehabPlanHealth.service` (W1201) | **`CarePlanVersion`-first**, UnifiedCarePlan fallback |

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
+ episodes + goal-progress + NPHIES claims + ICF + pain (the 56 `TherapySession`
consumers) read `TherapySession`. No sync → UI-logged sessions were invisible to all
of them.

**Resolved by a CQRS read-model projection** (`domains/sessions/services/
therapySessionProjection.js`, PR #426). Every `ClinicalSession` write
(schedule/update/complete/cancel via `SessionsService`) faithfully projects a
`TherapySession` keyed by `sourceClinicalSessionId` (sparse+unique, idempotent).
**FAIL-SAFE** (never throws → can't break the session write); **faithful-or-null**
(`therapistId`→`therapist` via `Employee.user_id`, null when unlinked — never wrong).
8 behavioral tests; no regression. This worked because `TherapySession` is a faithful
*analytics mirror* — every field it needs can be mapped or safely left null.

### 2a. Why care-plans CANNOT use the same projection (W1241) — ⛔ patient-safety boundary

The session fix does **not** generalize to care-plans. `CarePlanVersion` is not an
analytics mirror — it is a **rich, hash-chained clinical-legal document** whose `body`
**requires** structured fields the UI's `UnifiedCarePlan` does not carry:

| `CarePlanVersion` requires | `UnifiedCarePlan` (UI) has |
| --- | --- |
| `body.goals[].icfCode` (regex `/^[bsde]\d+$/`), `priorityScore` (0-1), `statement`, `domain`, `status` | only a goal **reference** (`goalId → TherapeuticGoal`) in section groups |
| `body.programs[]` / `measures[]` / `tests[]` with `goalRefs` | — (not modeled) |
| `signatureChain` (append-only, **hash-chained**) + `evidenceHash` (sha256 body lock) | — |

A projection would therefore have to **fabricate ICF codes, priority scores, and goal
statements the clinician never entered, and forge hash-chain/evidence integrity
records.** That crosses two hard lines — **no fabricated clinical data** and **no
forged audit integrity** — so a care-plan projection is **rejected**, not deferred.

**The care-plan split is a genuine consolidation, not a projection.** It needs the
care-plan domain owner to decide a canonical model and a staged migration:

- **CarePlanVersion is the value-bearing model** (W41-51 workflow + W44/W50 intelligence
  + hash-chain + the prod-ON W973 workers + ~10 intelligence files). The thin
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
   `priorityScore`/target). `UnifiedCarePlan` *references* `TherapeuticGoal` —
   aligned. `CarePlanVersion` *embeds* a second copy of goal detail (its own
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

### 3. IEP — `SmartIEP` (UI) vs `IndividualEducationPlan` (W200b) — related instance

Not a DDD/legacy split but the same "two models, UI uses one" family. Resolved
direction recorded in ADR-026 addendum (W1232–W1234): SmartIEP go-forward.

## Why this is the top launch risk

At 7 demo beneficiaries the split is invisible (no real UI data exists yet). **The
moment real care plans and sessions are entered through the UI, half the platform's
value — the intelligence, the schedulers, the analytics, the compliance trail —
silently stops seeing them.** This is precisely the class of bug that only surfaces
*after* go-live, when it is most expensive.

## Resolution options (decide before real data is entered)

1. **Bridge on write (lowest risk).** Each `domains/*` write also upserts/forwards
   to the legacy twin (or emits an event the legacy side consumes). Keeps every
   existing read surface working with no blast radius. The `feat/w928-core-linkage`
   event-bridge work may already provide the rails for this.
2. **Re-point reads.** Migrate the intelligence/analytics/workers to read the DDD
   models. Correct long-term, but large blast radius (care-plan intelligence alone
   is ~10 files; sessions ~56 consumers).
3. **Consolidate** to one model per concept. Free *today* (legacy twins are
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

| Entity | UI writes / 360 reads | Analytics/intelligence reads | Verdict |
| --- | --- | --- | --- |
| **Care plans** | `UnifiedCarePlan` | `CarePlanVersion` (≈10 intelligence files + the **prod-ON workers**) | 🔴 **SPLIT — severe** |
| **Sessions** | `ClinicalSession` | `TherapySession` (session-center + **episodes** + goal-progress + claims + ICF + pain; 56 consumers) | 🔴 **SPLIT — severe** |
| **IEP** | `SmartIEP` | (UI-less twin `IndividualEducationPlan`) | 🟠 related family (ADR-026 addendum) |
| **Behavior** | `BehaviorRecord` / `BehaviorPlan` | **`BehaviorIncident`** — read by the risk/escalation engine (`escalation-predictor.lib`, `risk/sources/behavioral-escalation.source`, `risk/registry`) | 🟠 **divergence — classify** (is a UI "behavior record" the same as a risk "incident"? if yes → split feeding the risk engine blind; if a distinct concept → fine) |
| **Goals** | `TherapeuticGoal` | **`SmartGoal`** read by 5 surfaces (`care-gap.loader`, `assessmentRecommendationEngine`, `therapistPortal.service`, `assessmentReassessmentSweeper`, `orchestrator-loaders`) | 🟠 **divergence — classify** per ADR-040 (SmartGoal is the legitimate qualitative-*suggestion* tier; but `therapistPortal`/`care-gap` reading it instead of `TherapeuticGoal` may be a real split, not tier-separation) |
| **Assessments** | `ClinicalAssessment` | only `services/ai/smartReport.service` reads a legacy `Assessment*` | 🟢 **mostly consistent** (one AI-report surface to re-point) |
| **Episodes** | `EpisodeOfCare` (consistent) | — but the episode **session-list reads `TherapySession`** (`episodes.routes.js:289`) | 🟡 **inherits the session split** — episode detail shows TherapySession, not the UI's ClinicalSession |

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
