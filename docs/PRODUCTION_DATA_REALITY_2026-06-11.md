# Production Data Reality Snapshot — 2026-06-11

**Read-only count taken against the live prod DB** (`/home/alawael/app/backend`
`MONGODB_URI`, the same DB that serves login + `alaweal.org`). Method:
`db.listCollections()` + `estimatedDocumentCount()` per collection. No writes.

> **One-line takeaway:** the platform is **feature-complete but pre-adoption** —
> 1,486 collections exist, **only 27 hold any data**, and the operational core is
> **7 beneficiaries · 3 users · 1 therapy session · 1 employee**. The binding
> constraint is **launch/adoption, not missing features.**

## The numbers

| Metric | Value |
| --- | --- |
| Total collections | **1,486** |
| Non-empty | **27** (1.8%) |
| Empty | **1,459** (98.2%) |

### What actually holds data (top populated)

| Count | Collection | Nature |
| ---: | --- | --- |
| 40,490 | `integrationtrendsamples` | **system telemetry** (monitoring) |
| 3,187 | `llm_anomaly_snapshots` | **system telemetry** (LLM ops) |
| 83 | `formtemplates` | seed / reference (forms catalog) |
| 39 | `chartofaccounts` | seed / reference (finance) |
| 37 | `goalbanks` | seed / reference (goal library) |
| 27 | `measures_library` | seed / reference (instruments) |
| 22 | `globalsettings` | configuration |
| 17 | `accounts` | seed / reference (finance) |
| 9 | `universal_codes`, `notificationlogs` | reference / logs |
| 8 | `measure_revisions`, `sessions` | reference / **express-auth store** |
| **7** | **`beneficiaries`** | **operational — real** |
| 7 | `red_flag_states` | operational (derived) |
| 5 | `branches`, `formsubmissions` | config / operational |
| **3** | **`users`** | **operational — staff accounts** |
| 1 | `therapysessions`, `employees`, `facilities` | operational (single record each) |

Everything else — the ~190 web-admin surfaces' backing collections, all the
clinical modules built across W356–W1234 (seizure-log, IEP, care-plans, sessions,
assessments, CAPA, etc.) — is **empty**.

## What this means (interpretation, not a directive)

1. **The bottleneck is adoption, not features.** A system this broad with 7
   beneficiaries / 3 users is **pre-launch**. Building additional clinical modules
   has **diminishing marginal value** until real users + real beneficiary data are
   flowing. The highest-leverage work shifts from _"build the next module"_ to
   _"get the first cohort of real users and beneficiaries onboarded and entering
   data."_

2. **Every fragmentation consolidation is zero-cost right now.** The IEP
   (`smart_ieps`=0, `individual_education_plans`=0), goal (`SmartGoal`=0), and
   care-plan (`CarePlan`=0) consolidations carry **no data-migration cost** — the
   collections are empty. The same applies to the **3 clinical-session models**:
   `therapysessions`=1 is the only one with data; `clinicalsessions` and
   `disabilitysessions` are empty → **TherapySession is the de-facto canonical
   session** and the "do NOT add a 4th" warning can resolve toward it cheaply.
   These are pure forward-architecture choices, decidable today, no risk.

3. **"I don't see X" reports are expected.** With near-empty collections, most
   list surfaces legitimately render empty — that is **not a bug**. Before
   investigating a "data missing" report, check whether the collection simply has
   no rows yet (cf. the W1221 login-500 incident: the owner had browsed in
   demo-fallback mode and concluded "templates invisible").

## Suggested pivot options (owner decides)

| Direction | Why it moves the needle now |
| --- | --- |
| **A. Launch readiness** | Seed real branches/users/roles, run an onboarding pass, get the first real beneficiary cohort + their clinical data entered. Turns 1.8%-utilized into a living system. |
| **B. Data-entry UX hardening** | The few real flows (registration, sessions, forms) are what early users touch first — polish those end-to-end before breadth. |
| **C. Resolve the zero-cost fragmentations** | Decide IEP→SmartIEP, goals→TherapeuticGoal, sessions→TherapySession **now** while migration is free, so launch starts on a clean canonical model. |
| **D. Keep building breadth** | Valid only if deliberately building ahead of a known future launch; otherwise lowest marginal value per the data above. |

## Caveats

- Counts are `estimatedDocumentCount` (fast metadata; exact for idle collections).
- Single default-connection DB assumed (the app's primary `MONGODB_URI`). If a
  separate clinical DB exists on another connection it is not reflected here — but
  login, beneficiaries, and users all live in this DB, so it is the system of record.
- This is a **point-in-time** snapshot; re-run the count to refresh.

_Recorded under delegated owner authority as a factual decision input. It changes
no code and no configuration — it exists so feature-prioritization is grounded in
what production actually holds._
