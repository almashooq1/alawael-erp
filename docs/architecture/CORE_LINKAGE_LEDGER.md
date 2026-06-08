# Core Linkage Ledger — ربط النظام بالنواة الموحّدة

**Status:** living document · created 2026-06-05 · scope: `66666/backend` event-driven "unified core"

This ledger answers one recurring question definitively: **is the whole platform
linked to the unified core, comprehensively?** Short answer: **no — but the
spine is, and the mechanism that links the rest is now alive.** Below is the
exact state, the mechanisms, the bug classes that made "linked" an illusion, and
the prioritized path to comprehensive coverage.

> The "unified core" here is the in-process **event nervous system**
> (`integration/systemIntegrationBus`): domains publish events; cross-module
> subscribers build a per-beneficiary `CareTimeline`, dashboards, tasks,
> notifications, and AI signals. It is **not** the frozen V4 `services/core`
> NestJS skeleton (see `docs/MIGRATION_LEDGER.md`).

---

## 1. The three linkage mechanisms

| Mechanism | What it is | Status | Consumed by |
| --- | --- | --- | --- |
| **A. modelEventBridge** (`integration/modelEventBridge.js`) | A global mongoose plugin attaches generic post-save hooks to every schema; at save-time it dispatches by `modelName` against **21 MAPPINGS** (hr/finance/medical/beneficiary/attendance/notification). | **Resurrected (W974), env-gated `ENABLE_MODEL_EVENT_BRIDGE` (default OFF)**. Was runtime-dead for ~its whole life. | `crossModuleSubscribers.js` (23 patterns) |
| **B. DDD service emits → serviceEventBridge** (W387) | Domain services emit on a `BaseService` EventEmitter; `serviceEventBridge` forwards to the integration bus. | **Live.** Drives the `CareTimeline` "nervous system". | `dddCrossModuleSubscribers.js` (21 patterns) |
| **C. Route / model-hook direct publish** | A route (or a native pre-compile model hook) calls `integrationBus.publish(...)` directly. | **Live.** Used where there is no clean service seam. | the same DDD subscribers |

Examples of **C**: student registration → `core.beneficiary.registered` (W927);
appointment lifecycle → `appointments.appointment.{booked,cancelled,no_show}` via
**native post-save hooks in `models/Appointment.js`** (W970 — chosen over the
bridge precisely because the bridge was dead).

---

## 2. What IS linked (the spine)

Per-beneficiary timeline + dashboards react in real time to:

- **Beneficiary lifecycle** — registered / status_changed (core + bridge)
- **Episodes** — created / phase_transitioned / closed
- **Sessions** — completed
- **Assessments** — completed
- **Goals** — created / achieved
- **Care plans** — created / updated / activated / completed
- **Behavior** — incident_recorded
- **Appointments** — booked / cancelled / no-show (W970)
- **Quality** — corrective_action_required
- **Safety** — seizure / safeguarding / restraint (W977)
- **Waitlist → admission** — added / booked (W979)
- **Screenings** — vision / hearing finalized (W980)
- **Medication (MAR)** — administered / not-given (W981)
- **Beneficiary status lifecycle** — graduated / transferred / deceased / … (W982)
- **Complaints (CRM)** — filed about a beneficiary (W984)
- **Family visits** — completed / no-show (W985)
- **Life-stage transitions** — transition plan completed / cancelled (W986)
- **Post-rehab follow-up** — case completed / lost-to-follow-up (W987) + visit attended / missed (W992)
- **Insurance claims** — approved / rejected (W994)
- **Referrals** — accepted / completed / rejected across all 4 referral subsystems (W997)
- **(env-gated, W974)** HR (hire/terminate/leave/salary/transfer), Finance
  (invoice/payment/expense/payroll), Medical (record/therapy/prescription/risk),
  Attendance (check-in/out), Notification (delivery_failed)

Everything in the last row produces **nothing today** until an owner flips
`ENABLE_MODEL_EVENT_BRIDGE=true` — but the producers are now wired and verified.

---

## 3. Bug classes that made "linked" an illusion (avoid these)

These are why static drift guards (W374/W382/W389/W392) were all green while the
system persisted nothing. **Static guards read source text; only running a save
catches these.**

1. **Dead post-compile hooks.** `schema.post('save')` added *after*
   `mongoose.model()` never fires. The whole modelEventBridge was inert.
   _Fix pattern:_ register hooks via a **global `mongoose.plugin()` before any
   model compiles** (W974), or put native hooks **in the model file**
   (pre-compile, W970).
2. **Subscriber↔model shape drift.** The `CareTimeline` subscribers wrote
   `beneficiary` (model needs `beneficiaryId`), hyphenated `eventType`s outside
   the enum, and no required `category` → every `.create()` threw
   `ValidationError`, swallowed by the handler `try/catch` → **0 rows persisted**.
   Same class on `KPISnapshot` (`kpiId` string vs required ObjectId ref).
   _Fix pattern:_ a behavioral round-trip test that asserts a row actually lands.
   _Now also guarded statically (W998):_
   `core-timeline-subscriber-shape-wave998.test.js` asserts every
   `eventType`/`category`/`severity` literal any subscriber writes is a member of
   the `CareTimeline` enum, and that no subscriber writes a bare `beneficiary:`
   key — turning the silent no-op into a build error for every future subscriber.
3. **Orphan subscribers.** A timeline subscriber lands with a real producer but
   no contract in `dddEventContracts.js` → W389 red (careplan.created/updated,
   goal.created — fixed W970). _Fix pattern:_ ship the contract in the same PR.
4. **Mismatched producer/subscriber buses.** Service-local emits never reached
   integration-bus subscribers until the W387 bridge linked them.

**Rule (proven 11×, see [[feedback-pair-static-with-behavioral-tests]]):** every
new event needs THREE artifacts in one PR — contract entry, producer-side
envelope test, integration test through the real delivery path.

---

## 4. What is NOT linked — prioritized roadmap

Out of **498 route files**, only ~a dozen feed the core. The bridge (once
enabled) covers the 21 LIVE-registry mappings. The rest, by priority:

### Tier 1 — clinical, belongs on the timeline
| Domain | Model (exists) | Event | Status |
| --- | --- | --- | --- |
| Waitlist → admission | `Waitlist` | `waitlist.*` → `waitlisted` / `waitlist_booked` | ✅ **W979** |
| Safety events | `SeizureEvent` · `SafeguardingConcern` · `RestraintSeclusion` | `safety.*` → `seizure_event` / `safeguarding_concern` / `restraint_applied` | ✅ **W977** |
| Screenings | `VisionScreening` · `HearingScreening` | `screening.completed` | ✅ **W980** |
| Medication admin (MAR) | `MedicationAdministrationRecord` | `medication.administered` / `.not_given` | ✅ **W981** |
| Discharge / transition | `TransitionPlan` | `lifecycle.transition.completed` / `.cancelled` → `care_transition` | ✅ **W986** |
| Referrals | `TherapyReferral` · `CommunityReferral` · `MedicalReferral` · `Referral` (FHIR portal) | `referral.accepted` / `.completed` / `.rejected` → `referral` (shared domain, `referralType` discriminator) | ✅ **W997** — wired all 4 subsystems to ONE shared `referral` vocabulary instead of forcing a consolidation. `ReferralTracking` left out (orthogonal CRM analytics, not beneficiary-keyed). A future ADR may still consolidate the 4 models. |
| Follow-up cases | `PostRehabCase` | `followup.case.completed` / `.lost` → `followup_completed` / `followup_lost` | ✅ **W987** |
| Follow-up visits | `FollowUpVisit` | `followup.visit.attended` / `.missed` → `followup_visit` | ✅ **W992** |

### Tier 2 — family / CRM visibility
| Domain | Model | Event | Status |
| --- | --- | --- | --- |
| Beneficiary status lifecycle | `Beneficiary` | `beneficiary.status_changed` → `status_changed` | ✅ **W982** |
| Complaints (CRM) | `Complaint` | `complaint.filed` → `complaint_filed` | ✅ **W984** |
| Family visits | `FamilyVisitRequest` | `family.visit.completed` / `.no_show` → `family_meeting` | ✅ **W985** |
| Guardian-portal engagement | — | — | Open |

### Tier 3 — operational / governance
| Domain | Model | Event | Status |
| --- | --- | --- | --- |
| Insurance / NPHIES claims | `NphiesInsuranceClaim` | `insurance.claim.approved` / `.rejected` → `insurance_claim` | ✅ **W994** |
| Inventory low-stock · maintenance overdue · contract/document expiry · transport incidents | — | — | Open — mostly **not** beneficiary-keyed, so they belong on dashboards/KPIs, not the per-beneficiary `CareTimeline` |

**Mechanism guidance:** prefer **native pre-compile model hooks (C)** for models
created via many routes (path-agnostic, reliable). Use a **bridge MAPPING (A)**
only for models with a clean status field _and_ once `ENABLE_MODEL_EVENT_BRIDGE`
is on. Every new subscriber needs a matching contract (avoid bug class #3).

---

## 5. Activation gate

`ENABLE_MODEL_EVENT_BRIDGE=true` activates the 21 bridge producers.
**Audited safe (2026-06-05):** the 16/21 events feed `crossModuleSubscribers.js`
handlers that call `notification.send` via a `moduleConnector.hasService()` guard
or re-publish KPI/audit/sync events — and those re-published events have **no
persisting subscriber** (terminal). No bug-class-#2 persistence in that path.
The only live effect of flipping it is that notifications start firing + events
persist to the EventStore — intended behaviour. It is a **prod behaviour change
→ owner-gated flip** (like the other prod env flags).

---

## 6. Coverage snapshot (updated 2026-06-08)

- Real timeline/dashboard linkage: the **clinical spine** + 14 leaf domains wired
  since 2026-06-05 via native pre-compile hooks (W977 safety · W979 waitlist ·
  W980 screenings · W981 MAR · W982 beneficiary-status · W984 complaints ·
  W985 family-visits · W986 transitions · W987 post-rehab follow-up cases ·
  W992 follow-up visits · W994 insurance claims · W997 referrals (4 subsystems) —
  all merged to main).
- + 21 LIVE-registry mappings, **wired but dormant behind the flag**.
- ≈ **460 route files** still operate as standalone CRUD with no core emission.
- The frozen V4 `services/core` is **not** consumed by the live UI and is out of
  scope here.

**Bottom line:** comprehensive linkage is a multi-wave program, not a single
task. The spine is solid, the bridge is alive, the bug classes are catalogued,
and the remaining work is now a list — not a discovery.

---

_See agent memory `project_core_linkage_silent_failures_2026-06-05` for the
full incident detail + the per-wave PR list (PRs #276 W970 … #316 W985, + W986)._
