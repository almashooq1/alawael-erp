# Go-Live / Launch Enablement Runbook — 2026-06-11

**Purpose.** The platform is **feature-complete but pre-adoption** (see
[PRODUCTION_DATA_REALITY_2026-06-11.md](PRODUCTION_DATA_REALITY_2026-06-11.md):
1,486 collections, only 27 non-empty; operational core = 7 beneficiaries / 3 users
/ 1 therapy session). Crucially, **those 7 beneficiaries are the demo seed**
(`npm run seed:demo` → `scripts/seed-demo-showcase.js` creates ~60 such records).
So "production" today holds **demo data + seed/reference data, not real operations.**

This runbook is the single ordered path from that state to a real launch. It
addresses the four pivot directions from the reality snapshot
(**A** launch readiness · **B** data-entry UX · **C** resolve free fragmentations ·
**D** breadth) and grounds every step in scripts/flows that **already exist** —
nothing here is to be reinvented.

> **The one hard infrastructure blocker (owner-gated):** prod has **no SMTP
> credentials** (`SMTP_USER` / `SMTP_PASS` unset) → **all email silently no-ops**
> (password resets, notifications, OPS alerts). Provision a Gmail app-password or
> SES before launch; nothing else below unblocks until mail works. See
> [[project_ops_alert_recipient_set_prod_2026-06-01]].

---

## Phase C — lock the zero-cost fragmentation decisions FIRST (do before seeding real data)

Every consolidation is **free right now** because the target collections are empty
(prod counts: all 0). Deciding now means real launch data lands on one canonical
model instead of fragmenting across two. Three decisions; two already recorded:

| Domain | Canonical (go-forward) | Secondary → disposition | Status |
| --- | --- | --- | --- |
| **Care plan** | `UnifiedCarePlan` / `CarePlanVersion` | IEP/IFSP kept + cross-linked (regulatory) | ✅ ADR-026 DECIDED (Approach B) |
| **Goal** | `TherapeuticGoal` | `SmartGoal` = qualitative-suggestion tier | ✅ ADR-040 DECIDED (Approach B) |
| **IEP** | `SmartIEP` (`/api/v1/smart-iep`) | `IndividualEducationPlan` (`/api/v1/iep`) = deprecation candidate, gated on the MoE-Nafath-signature capability question | ✅ ADR-026 addendum (W1232–W1234) |
| **Clinical session** | ⚠️ **UNRESOLVED — write/read split (see below)** | not a simple pick — `ClinicalSession` (UI+360) vs `TherapySession` (analytics+56) | 🔴 **LAUNCH BLOCKER — resolve before sessions are logged at scale** |

### Clinical-session — CORRECTION + launch-blocker (W1237)

> **Retraction:** an earlier draft of this runbook called `TherapySession`
> "canonical" from consumer-count alone (56 vs 8 vs 3). Tracing the **actual data
> flow** (the W1231→W1232 lesson — consumer-count ≠ canonical) shows that was
> **wrong**. There is a genuine **write/read split**, not a simple winner.

What the trace actually shows:

| Path | Model | Collection (prod) |
| --- | --- | --- |
| **UI writes** a session (`POST /api/v1/sessions`, `domains/sessions`) | **`ClinicalSession`** | `clinical_sessions` = **0** |
| **Beneficiary-360** "sessions" widget (`beneficiary360.service.js:391`) | **`ClinicalSession`** | (same — consistent ✅) |
| **Session-Center KPIs** (`sessionCenter.service.js` — _"facade فوق TherapySession"_) | **`TherapySession`** | `therapysessions` = **1** (demo) |
| **Episodes, goal-progress, appointments, NPHIES claims, ICF, pain** (the 56 consumers) | **`TherapySession`** | (same) |

**There is NO sync between `ClinicalSession` and `TherapySession`.** Consequence at
launch: a session logged through the UI lands in `ClinicalSession` → **shows on the
360 ✅ but is INVISIBLE** to Session-Center KPIs, episode session-lists,
goal-progress linkage, claims, and outcome reporting (all read `TherapySession`).
That is a **day-1 data-integrity failure** for the session spine, not a cosmetic
fragmentation.

**This is now a 🔴 launch blocker, not a "decide later."** Resolution options
(decide before real sessions are logged):

1. **Bridge on write** — `domains/sessions` also upserts/forwards to
   `TherapySession` (or emits an event the analytics side consumes). Lowest-risk;
   keeps both surfaces working.
2. **Re-point reads** — move Session-Center + episodes + goal-progress to read
   `ClinicalSession` (the UI/360 model). Larger blast radius (56 consumers).
3. **Consolidate** to one model (free today — both effectively empty).

⚠️ **Coordination — do NOT fix this in isolation.** Session core-linkage
(`DttSession`/`CareTimeline`/cross-module subscribers) is the **active domain of
`feat/w928-core-linkage`** (the parallel effort). Its event-bridge work may already
address (1). This runbook records the blocker + options as a **docs finding only**
— the fix must be coordinated with that branch, not raced. `DttSession` itself is a
specialized DTT/ABA sub-type and is out of scope of the 3-general-session question.

---

## Phase A — go-live sequence (grounded in existing scripts)

| # | Step | Command / action | Notes |
| --- | --- | --- | --- |
| 0 | **Decide demo-data fate** | (owner) keep or clear the ~60 demo records | `seed-demo-showcase.js --reset` clears them. **Destructive — owner-gated.** Clearing avoids polluting real reports/KPIs; keeping is fine for a soft launch. Do NOT run blind. |
| 1 | **DB structure** | `node backend/scripts/setup-database.js --env production --check` then without `--check` | master setup: indexes + step ordering; `--check` previews first |
| 2 | **Seed reference/config** (real, keep) | `npm run seed:forms-catalog` · `seed:cbahi` · `seed:icf-codes`* · `seed:measures-catalog`* · `seed:finance-coa`* · `seed:insurance-tariffs`* | reference data is legitimately seeded (not demo); idempotent. *verify exact npm alias in `backend/package.json` |
| 3 | **Create REAL org + staff** | (owner, via UI/admin) real branches → real users → role assignment | **Real PII — not seeded.** This is the actual launch act. Roles list: `docs/architecture/PRODUCTION_CUTOVER_W356_W370.md`. |
| 4 | **Verify critical paths** | see Phase B | login → register beneficiary → log session → submit form |
| 5 | **Enable crons in order** | read-only sweepers first, mutating last | already flipped this session: care-plan workers, alerts engine, model-event bridge, clinical sweepers (14/15). Respite-no-show (mutating/outward) stays OFF pending sign-off. |
| 6 | **Mail** | provision `SMTP_USER`/`SMTP_PASS` + restart pm2 `--update-env` | THE blocker (top of doc). Until done, all mail no-ops. |

Prod topology for steps 1/5/6: `ssh -i ~/.ssh/alawael_deploy root@72.60.84.56`,
app at `/home/alawael/app/backend` (pm2 `alawael-api` as user `alawael`),
`.env` dotenv-loaded; **`pm2 restart --update-env` (reload does NOT re-read .env).**

---

## Phase B — data-entry spine to harden (what first users actually touch)

Polish these four flows end-to-end before any new breadth — they are the entire
"can a real user do real work" surface. Each already has known fixes; **verify they
hold**, then smooth the rough edges:

1. **Login + MFA** — Mongoose-9 pipeline bug fixed (W1221, `incLoginAttempts`).
   Verify a fresh real user can log in (owner had zero successful logins 05-29→06-11
   in demo-fallback). Check Winston for caller 401s first on any "can't log in".
2. **Register → `Beneficiary`** — Arabic disability labels must pass the English
   `category`/`disability.type` enum via the W926 normalizer bridge. Verify a real
   Arabic-form registration persists (not 500). [[project_beneficiary_registration_enum_mismatch_2026-06-05]]
3. **Log a session** — the UI writes **`ClinicalSession`** (`POST /api/v1/sessions`),
   which the 360 reads ✅ but Session-Center/episodes/goal-progress/claims do **not**
   (they read `TherapySession`). **Resolve the Phase-C session split FIRST** (it is a
   launch blocker) — otherwise verifying "create" passes while the session silently
   never reaches analytics/goal-progress.
4. **Forms** — catalog is seeded (83 `formtemplates`); W1179 (catalog visibility) +
   W1186 (approval-chain persistence) fixed. Verify submit → `formsubmissions`.

Hardening here = the highest-leverage **B** work; it is narrow and concrete, unlike
broad module-building.

---

## Phase D — new breadth: deliberately deprioritized

Per the reality snapshot, adding clinical/admin modules has **diminishing marginal
value** at 7 beneficiaries / 3 users — the ~190 surfaces already built are empty.
**Recommendation:** build new breadth only for a *specific, named, near-term launch
need*; otherwise the leverage is in A + B + C above. The breadth is not the
constraint; adoption is.

---

## Definition of "launched"

- [ ] SMTP provisioned; a password-reset email actually arrives.
- [ ] ≥1 real branch + real admin/clinician users created (demo users removed or clearly tagged).
- [ ] A real beneficiary registered via the Arabic form (persists, no 500).
- [ ] A real therapy session logged against that beneficiary with goal progress.
- [ ] The four Phase-B paths pass for a non-demo account.
- [ ] **Session write/read split RESOLVED** (UI-logged `ClinicalSession` reaches Session-Center/episodes/goal-progress, not only the 360) — coordinated with `feat/w928-core-linkage`.
- [ ] Other canonical models confirmed (no new writes to deprecated IEP/goal models).
- [ ] Demo-showcase data decision made (kept-and-tagged or cleared).

---

_Authored as a launch-enablement decision input. Changes no code or config; it
sequences existing scripts + already-made decisions into one path. Re-derive the
data state with the reality-snapshot method before executing destructive Step 0._
