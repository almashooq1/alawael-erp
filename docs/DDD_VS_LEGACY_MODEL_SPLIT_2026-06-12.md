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

### 2. Clinical sessions — `ClinicalSession` (write/360) vs `TherapySession` (analytics) 🔴

(Full detail in the go-live runbook, Phase C.) UI writes `ClinicalSession`
(`domains/sessions`); 360 reads it ✅; **Session-Center KPIs + episodes +
goal-progress + NPHIES claims + ICF + pain (the 56 `TherapySession` consumers) read
`TherapySession`**. No sync. UI-logged sessions are invisible to analytics/episodes/
goal-progress.

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

A mismatch between (1) and (3) is a split. Still to check with this method:
**assessments** (`ClinicalAssessment` DDD vs the several legacy `Assessment*`
models), **goals** (`TherapeuticGoal` DDD vs `SmartGoal`/`Goal` — ADR-040 picked
TherapeuticGoal; verify the analytics read it), **episodes**, **behavior**.

---

_Recorded as a launch-readiness decision input under delegated authority. Changes no
code or config. Linked from [GO_LIVE_RUNBOOK_2026-06-11.md](GO_LIVE_RUNBOOK_2026-06-11.md)._
