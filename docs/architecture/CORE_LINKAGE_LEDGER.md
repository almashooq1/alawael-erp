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
| Domain | Model (exists) | Suggested event | Mechanism |
| --- | --- | --- | --- |
| Referrals | `Referral` / `medicalReferrals` | `referral.made/accepted` | B or C |
| Waitlist → admission | `Waitlist` | `admission.confirmed` | C |
| Safety events | `SeizureEvent` · `SafeguardingConcern` · `RestraintSeclusion` | `seizure_event` / `safeguarding_concern` (enum reserved in CareTimeline) | C native hook |
| Screenings | `VisionScreening` · `HearingScreening` | `screening.completed` | C native hook |
| Medication admin (MAR) | verify model name | `medication.administered` | B or C |
| Discharge / follow-up | `post-rehab-followup` · `transition-plan` | `discharge.followup_due` | C |

### Tier 2 — family / CRM visibility
Complaints (`Complaint`), family visits, guardian-portal engagement.

### Tier 3 — operational / governance
Inventory low-stock, maintenance overdue, contract/document expiry, insurance/
NPHIES claim lifecycle, transport incidents.

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

## 6. Coverage snapshot (2026-06-05)

- Real timeline/dashboard linkage: the **clinical spine** (≈ a dozen domains).
- + 21 LIVE-registry mappings, **wired but dormant behind the flag**.
- ≈ **470 route files** still operate as standalone CRUD with no core emission.
- The frozen V4 `services/core` is **not** consumed by the live UI and is out of
  scope here.

**Bottom line:** comprehensive linkage is a multi-wave program, not a single
task. The spine is solid, the bridge is alive, the bug classes are catalogued,
and the remaining work is now a list — not a discovery.

---

_See agent memory `project_core_linkage_silent_failures_2026-06-05` for the
full incident detail (PRs #276 W970, #283 W974)._
