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

| Mechanism                                                   | What it is                                                                                                                                                                                             | Status                                                                                                             | Consumed by                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **A. modelEventBridge** (`integration/modelEventBridge.js`) | A global mongoose plugin attaches generic post-save hooks to every schema; at save-time it dispatches by `modelName` against **21 MAPPINGS** (hr/finance/medical/beneficiary/attendance/notification). | **Resurrected (W974), env-gated `ENABLE_MODEL_EVENT_BRIDGE` (default OFF)**. Was runtime-dead for ~its whole life. | `crossModuleSubscribers.js` (23 patterns)    |
| **B. DDD service emits → serviceEventBridge** (W387)        | Domain services emit on a `BaseService` EventEmitter; `serviceEventBridge` forwards to the integration bus.                                                                                            | **Live.** Drives the `CareTimeline` "nervous system".                                                              | `dddCrossModuleSubscribers.js` (21 patterns) |
| **C. Route / model-hook direct publish**                    | A route (or a native pre-compile model hook) calls `integrationBus.publish(...)` directly.                                                                                                             | **Live.** Used where there is no clean service seam.                                                               | the same DDD subscribers                     |

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
- **Consent (PDPL/CRPD)** — obtained / revoked (W1002)
- **Home programs** — assigned / completed across FamilyHomeProgram + HomeAssignment (W1003)
- **Acute crises** — reported / resolved (W1004)
- **Care team** — member added / removed + lead changed (W1005)
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

1. **Dead post-compile hooks.** `schema.post('save')` added _after_
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

| Domain                 | Model (exists)                                                                         | Event                                                                                                                                    | Status                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Waitlist → admission   | `Waitlist`                                                                             | `waitlist.*` → `waitlisted` / `waitlist_booked`                                                                                          | ✅ **W979**                                                                                                                                                                                                                                  |
| Safety events          | `SeizureEvent` · `SafeguardingConcern` · `RestraintSeclusion`                          | `safety.*` → `seizure_event` / `safeguarding_concern` / `restraint_applied`                                                              | ✅ **W977**                                                                                                                                                                                                                                  |
| Acute crises           | `CrisisIncident`                                                                       | `crisis.reported` / `.resolved` → `crisis_reported` / `crisis_resolved`                                                                  | ✅ **W1004**                                                                                                                                                                                                                                 |
| Screenings             | `VisionScreening` · `HearingScreening`                                                 | `screening.completed`                                                                                                                    | ✅ **W980**                                                                                                                                                                                                                                  |
| Medication admin (MAR) | `MedicationAdministrationRecord`                                                       | `medication.administered` / `.not_given`                                                                                                 | ✅ **W981**                                                                                                                                                                                                                                  |
| Discharge / transition | `TransitionPlan`                                                                       | `lifecycle.transition.completed` / `.cancelled` → `care_transition`                                                                      | ✅ **W986**                                                                                                                                                                                                                                  |
| Referrals              | `TherapyReferral` · `CommunityReferral` · `MedicalReferral` · `Referral` (FHIR portal) | `referral.accepted` / `.completed` / `.rejected` → `referral` (shared domain, `referralType` discriminator)                              | ✅ **W997** — wired all 4 subsystems to ONE shared `referral` vocabulary instead of forcing a consolidation. `ReferralTracking` left out (orthogonal CRM analytics, not beneficiary-keyed). A future ADR may still consolidate the 4 models. |
| Follow-up cases        | `PostRehabCase`                                                                        | `followup.case.completed` / `.lost` → `followup_completed` / `followup_lost`                                                             | ✅ **W987**                                                                                                                                                                                                                                  |
| Follow-up visits       | `FollowUpVisit`                                                                        | `followup.visit.attended` / `.missed` → `followup_visit`                                                                                 | ✅ **W992**                                                                                                                                                                                                                                  |
| Home programs          | `FamilyHomeProgram` · `HomeAssignment`                                                 | `home_program.assigned` / `.completed` → `home_program_assigned` / `home_program_completed` (shared domain, `programType` discriminator) | ✅ **W1003** — filled the long-declared but producerless `home_program_assigned` enum                                                                                                                                                        |
| Care team              | `EpisodeOfCare.careTeam[]` (embedded)                                                  | `careteam.member_added` / `.member_removed` / `.lead_changed` → `team_member_added` / `team_member_removed` / `lead_changed`             | ✅ **W1005** — embedded-array DIFF (post-init snapshot vs save); filled 3 producerless enum values                                                                                                                                           |

### Tier 2 — family / CRM visibility

| Domain                       | Model                | Event                                                                    | Status                                                                           |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Beneficiary status lifecycle | `Beneficiary`        | `beneficiary.status_changed` → `status_changed`                          | ✅ **W982**                                                                      |
| Complaints (CRM)             | `Complaint`          | `complaint.filed` → `complaint_filed`                                    | ✅ **W984**                                                                      |
| Family visits                | `FamilyVisitRequest` | `family.visit.completed` / `.no_show` → `family_meeting`                 | ✅ **W985**                                                                      |
| Consent (PDPL/CRPD)          | `Consent`            | `consent.obtained` / `.revoked` → `consent_obtained` / `consent_revoked` | ✅ **W1002** — filled the long-declared but producerless `consent_obtained` enum |
| Guardian-portal engagement   | —                    | —                                                                        | Open                                                                             |

### Tier 3 — operational / governance

| Domain                                   | Model                              | Event                                                                                | Status                                                                                                                                                                                                 |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Insurance / NPHIES claims                | `NphiesInsuranceClaim`             | `insurance.claim.approved` / `.rejected` → `insurance_claim`                         | ✅ **W994** (per-beneficiary timeline)                                                                                                                                                                 |
| Facilities — PPM / inspection overdue    | `FacilityAsset`                    | smart-alert **rule** `facility-asset-ppm-overdue` (category `operational`) → `Alert` | ✅ **W1006** — first operational rule; org-scoped, NOT the beneficiary timeline                                                                                                                        |
| Maintenance — work order overdue         | `MaintenanceWorkOrder`             | rule `maintenance-work-order-overdue` → `Alert`                                      | ✅ **W1007** — open WO past `scheduledDate`; critical-priority → critical                                                                                                                              |
| Fleet — vehicle document expiry          | `Vehicle`                          | rule `vehicle-document-expiry` → `Alert` (platform-scoped)                           | ✅ **W1008** — active vehicle, expired registration/insurance/inspection; registration\|insurance → critical                                                                                           |
| Contracts — service/vendor expired       | `Contract`                         | rule `contract-expired` → `Alert`                                                    | ✅ **W1009** — ACTIVE contract past `endDate` (lapsed without renewal/close)                                                                                                                           |
| Inventory — low stock                    | `InventoryStock` × `InventoryItem` | rule `inventory-low-stock` → `Alert`                                                 | ✅ **W1070** — first TWO-model join (stock qty vs item reorder point); out-of-stock → critical; both models are object-exports, resolved defensively                                                   |
| Procurement — PO delivery overdue        | `InventoryModulePurchaseOrder`     | rule `purchase-order-delivery-overdue` → `Alert`                                     | ✅ **W1132** — committed PO (approved/sent/partial) past `expected_delivery_date`, not received; catches late _incoming_ supply before it becomes a low-stock shortfall; self-loading (no app.js edit) |
| Compliance — mandatory training overdue  | `TrainingCompliance`               | rule `training-compliance-overdue` (category `compliance`) → `Alert`                 | ✅ **W1135** — pending/overdue staff training past `dueDate` (fire-safety/infection-control/CPR); distinct from `credential-*` (professional licences); self-loading                                   |
| Quality — supplier SCAR response overdue | `SupplierScar`                     | rule `supplier-scar-response-overdue` (category `quality`) → `Alert`                 | ✅ **W1138** — SCAR awaiting supplier response (open/acknowledged/in_progress/rejected) past `responseDueBy` (ISO 9001 §8.4); critical → critical; self-loading                                        |
| Financial — budget overrun               | `Budget`                           | rule `budget-overrun` (category `financial`) → `Alert`                               | ✅ **W1141** — active budget ≥90% consumed (≥100% → critical); a trackable dashboard Alert (distinct from the W401 budget sweeper's transient notification); platform-scoped; self-loading             |

**Operational sweep (growing): facilities · maintenance · fleet · contracts ·
inventory · procurement (W1006–W1009 / W1070 / W1132), plus quality (CAPA +
calibration, W1121), waste (W1124) and occupational-health surveillance (W1126)
rules added by the clinical-systems work — the main org-operational signals are
now on the `/api/v1/dashboards/alerts` dashboard.** Newer rules use the
**self-loading pattern** (`ctx.models.X || require('../../models/.../X')`) to avoid
editing the app.js model loader (a parallel-work hot zone).

> ⚠️ **The whole engine is env-gated `ALERTS_ENGINE_ENABLED` (default OFF).** The
> `AlertsScheduler` 5-min tick only runs the 32 rules when that flag is set; the
> read-only triage routes work regardless, so the dashboard shows _existing_ alerts
> but **no new ones are generated until an operator flips it.** Activation steps are
> in `DORMANT_CAPABILITY_ACTIVATION_RUNBOOK_2026-06.md` (low blast radius — it only
> creates `Alert` rows + category-routed notifications).

> **Two sinks, by scope (the W1006 lesson):** beneficiary-keyed events feed the
> per-beneficiary **`CareTimeline`** (native model hook → `integrationBus` →
> `dddCrossModuleSubscribers`). **Org/operational** events (facilities, inventory,
> finance thresholds, expiry) feed the org-scoped **`Alert`** model via the
> **smart-alerts rule engine** (`alerts/rules/*` → `AlertDispatcher` tick →
> `/api/v1/dashboards/alerts`). To add an operational signal: drop a
> `{ id, severity, category:'operational', description, evaluate(ctx) }` rule in
> `alerts/rules/`, `require` it in `alerts/rules/index.js`, and add its model to
> the `modelNames` loader in `app.js` — no `CareTimeline` enum or DDD contract
> needed. A finding may override the rule's `severity` (e.g. life-safety → critical).

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

- Real timeline/dashboard linkage: the **clinical spine** + 18 leaf domains wired
  since 2026-06-05 via native pre-compile hooks (W977 safety · W979 waitlist ·
  W980 screenings · W981 MAR · W982 beneficiary-status · W984 complaints ·
  W985 family-visits · W986 transitions · W987 post-rehab follow-up cases ·
  W992 follow-up visits · W994 insurance claims · W997 referrals (4 subsystems) ·
  W1002 consent (PDPL/CRPD) · W1003 home programs · W1004 acute crises ·
  W1005 care-team — all merged to main). All shape-guarded by W998.
- - 21 LIVE-registry mappings, **wired but dormant behind the flag**.
- ≈ **460 route files** still operate as standalone CRUD with no core emission.
- The frozen V4 `services/core` is **not** consumed by the live UI and is out of
  scope here.

**Bottom line:** comprehensive linkage is a multi-wave program, not a single
task. The spine is solid, the bridge is alive, the bug classes are catalogued,
and the remaining work is now a list — not a discovery.

---

_See agent memory `project_core_linkage_silent_failures_2026-06-05` for the
full incident detail + the per-wave PR list (PRs #276 W970 … #316 W985, + W986)._
