# Ops Control Tower — Phase 16 Runbook

**Version:** 4.0.74 (closed 2026-04-24)
**Scope:** Operations layer — SLA engine, work-order state machine,
facility + inspections, PR→PO, ops dashboards, meeting governance,
route optimization, notification dispatch.
**Test coverage:** 333+ Phase-16 tests across 15 suites, all green.

---

## 1. What Phase 16 solves

Before Phase 16, the ops layer was a collection of CRUD endpoints
with no shared contract for SLAs, state transitions, or cross-
service notifications. Symptoms:

- No central answer to "is any ticket / WO / PR about to breach?"
- Work orders moved through ad-hoc statuses; state rules lived in
  route handlers.
- Purchase Request was literally in `_archived/` — no approval
  chain, no PO conversion.
- Branch conflated with Building: a multi-building branch had no
  way to target maintenance at the right physical location.
- Meeting decisions were inline `decisions[]` strings with no
  follow-up tracking.
- Transport had runtime trips but no planning layer; dispatchers
  planned on paper.
- Notifications fired on every channel at every hour — SMS at
  3 AM, no digest, no quiet-hours, no channel fallback.

Phase 16 ships **eight cooperating services** that turn the ops
layer into a proper control tower.

---

## 2. Architecture at a glance

```
                         ┌─────────────────────────┐
                         │   Ops Control Tower     │
                         │  (opsDashboard.service) │
                         └──────────┬──────────────┘
                                    │ reads from ↓
      ┌──────────────┬──────────────┼──────────────┬──────────────┐
      ▼              ▼              ▼              ▼              ▼
┌───────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ SLA Engine│  │ Work Orders │  │ Facility │  │  PR→PO   │  │ Meetings │
│ (+ breach │  │ state machine│  │ + inspec-│  │ workflow │  │ +decisions│
│  engine)  │  │             │  │  tions   │  │          │  │          │
└─────┬─────┘  └──────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
      │               │              │             │             │
      └───────────────┴──────┬───────┴─────────────┴─────────────┘
                             │ all services emit ops.* events
                             ▼
                   ┌───────────────────────┐
                   │  Quality Event Bus    │ ← Phase-15 notification router
                   │  (qualityEventBus)    │    subscribes here
                   └─────────┬─────────────┘
                             │ notifications
                             ▼
                   ┌───────────────────────┐
                   │ Notification Dispatch │
                   │ (priority + quiet hrs │
                   │  + fallback + digest) │
                   └───────────────────────┘

              ┌─────────────────────────────────┐
              │ Route Optimization (transport)  │
              │ — its own subject tree, per-stop│
              │   SLA clocks, variance reconcil.│
              └─────────────────────────────────┘
```

All eight services are wired in
`backend/startup/operationsBootstrap.js`. They share:

- the **SLA engine** (one instance, injected everywhere) for
  lifecycle clocks;
- the **qualityEventBus** (Phase-15 singleton) for cross-service
  event emission;
- the **Phase-15 notification router** which subscribes to the
  bus and matches `ops.*` events to recipient policies.

---

## 3. Module map

| Module                | Registry                           | Model(s)                                             | Service                         | Routes (`/api/ops/…`)    |
| --------------------- | ---------------------------------- | ---------------------------------------------------- | ------------------------------- | ------------------------ |
| SLA engine            | `sla.registry.js`                  | `SLA` + `SLABreach`                                  | `slaEngine.service`             | `/sla`                   |
| Work orders           | `workOrder.registry.js`            | `MaintenanceWorkOrder` (extended)                    | `workOrderStateMachine.service` | `/work-orders`           |
| Facility              | `facility.registry.js`             | `Facility` + `FacilityInspection`                    | `facility.service`              | `/facilities`            |
| Purchase req.         | `purchaseRequest.registry.js`      | `PurchaseRequest` (+ legacy `PurchaseOrder`)         | `purchaseRequest.service`       | `/purchase-requests`     |
| Dashboards            | — (read-only)                      | reads all Phase-16 models                            | `opsDashboard.service`          | `/dashboard`             |
| Meeting gov.          | `meetingGovernance.registry.js`    | `MeetingDecision` (+ legacy `Meeting`)               | `meetingGovernance.service`     | `/meeting-governance`    |
| Route opt.            | `routeOptimization.registry.js`    | `RouteOptimizationJob`                               | `routeOptimization.service`     | `/route-optimization`    |
| Notification dispatch | `notificationDispatch.registry.js` | `NotificationPreferences` + `NotificationDigestItem` | `notificationDispatch.service`  | `/notification-dispatch` |

---

## 4. The SLA engine — the spine

Every Phase-16 subject gets an SLA clock. Policies live in
`backend/config/sla.registry.js`, 17 canonical policies across 10
ops modules. Each policy defines:

- response target (optional) + resolution target (required)
- pause-on-states list (SLA clock freezes on these states)
- escalation matrix `[{ afterMinutes, notifyRoles }, …]`
- warning threshold (`warnAtPct`, default 80)
- breach event names for the notification router

### Core verbs

```js
slaEngine.activate({
  policyId, subjectType, subjectId, subjectRef,
  branchId, startedAt, metadata
});

slaEngine.observe({
  slaId,
  eventType: 'first_response' | 'resolved' | 'cancelled' | 'state_changed',
  state,  // only for state_changed
  when,
});

slaEngine.observeBySubject({
  policyId, subjectType, subjectId, eventType, state, when,
});

slaEngine.tick();             // periodic sweep, fires warning/breach/escalation
slaEngine.getStatus({ … });   // dashboards query
slaEngine.listBreaches({ … });
```

### Events emitted

| Event                | When                      |
| -------------------- | ------------------------- |
| `ops.sla.activated`  | On `activate()` success   |
| `ops.sla.pre_breach` | Warning threshold crossed |
| `ops.sla.breached`   | Resolution target crossed |
| `ops.sla.met`        | Resolved within target    |
| `ops.sla.cancelled`  | Subject cancelled         |
| `ops.sla.escalated`  | Escalation step fired     |

---

## 5. Work-order state machine

**14 canonical states** with a formal transition graph:

```
draft → submitted → triaged → approved → scheduled → in_progress
                       ↓                    ↓            ↓
                    rejected             on_hold       blocked
                                          ↓ ↑          ↓ ↑
                                       in_progress ← back
                                             ↓
                                          completed → verified → closed
                                             ↓                    ↓
                                          reopened              reopened
                                             ↓
                                       (back to in_progress)
```

Legacy `pending` is aliased to `submitted`. Required-field gates
enforce:

- `resolution` before `completed`
- `scheduledDate` before `scheduled`

The service auto-drives the SLA engine on every transition:
`triaged`/`scheduled` → `first_response`; `completed`/`verified`/
`closed` → `resolved`; `cancelled`/`rejected` → `cancelled`;
`on_hold`/`blocked` → `state_changed` (pauses the clock).

Priority → policy mapping:

| Priority   | Type       | SLA policy                       |
| ---------- | ---------- | -------------------------------- |
| critical   | any        | `maintenance.wo.critical` (4h)   |
| high       | any        | `maintenance.wo.high` (1d)       |
| —          | preventive | `maintenance.wo.preventive` (7d) |
| normal/low | corrective | — (untracked by default)         |

---

## 6. Facility + Inspection lifecycle

Facility is now a first-class entity separate from Branch:

- A branch owns 1..N facilities (buildings).
- A facility can be shared with other branches (`sharedWithBranchIds`).
- Inspections target a facility, not a branch.

**Inspection lifecycle:** `scheduled → in_progress → completed → closed`
(with `cancelled` escape). Cannot close while findings remain open.

**Finding severities:** critical / major / minor / observation.

**Auto-orchestration** (the ops team's biggest win):

```
raiseFinding(inspectionId, { severity: 'critical', ... })
  ↓
  1. activates facility.inspection.closeout SLA clock
  2. IF severity ∈ {critical, major}:
       spawns a corrective-maintenance Work Order with priority
       derived from severity (critical→critical; major→high)
       → which in turn activates its own maintenance.wo.* SLA
  3. emits ops.facility.finding_raised → notification router pages
     the right roles
```

Zero manual handoffs. A fire inspector taps "save" on a critical
finding, and the maintenance team's board already has a critical
WO open before the inspector leaves the building.

---

## 7. PR → PO workflow

**8 canonical PR statuses.** Approval tier snapshot at submit-time
so a later threshold change never rewrites a live cycle:

| Tier     | Value (SAR) | Signatures                            |
| -------- | ----------- | ------------------------------------- |
| simple   | ≤ 5,000     | department_head                       |
| standard | ≤ 50,000    | dept_head + procurement_manager       |
| complex  | ≤ 500,000   | dept_head + procurement_manager + cfo |
| special  | > 500,000   | all three + ceo                       |

**Dual SLA orchestration:**

1. `procurement.pr.approval` — starts on submit, resolved on final approval
2. `procurement.po.issuance` — starts on convert-to-PO, resolved when PO sent

`returned_for_clarification` pauses the approval SLA via
`state_changed`; `resubmit` resumes it.

---

## 8. Meeting decisions

**Decision lifecycle:** `open → in_progress → completed` (with
`blocked` pause, `deferred` and `cancelled` escapes, and
`overdue` auto-flag via scheduler).

**Required-field gates:**

- `executionNotes` before `completed`
- `deferReason` before `deferred`

**Priority-based default due dates:** critical=3d, high=7d,
medium=14d, low=30d.

**Dual SLA orchestration:**

1. `meeting.minutes.publish` — starts on `endMeeting`, resolved
   on `publishMinutes` (via `observeBySubject` since legacy
   Meeting has no slaId field)
2. `meeting.decision.execution` — starts on `assignDecision`,
   resolved on terminal status

**Follow-up board** (`/meeting-governance/follow-up`) — cross-
meeting rollup for owners / branches with due_today / due_this_week
/ overdue buckets. Powers the "what do I owe today?" view.

---

## 9. Route optimization

**6-state job lifecycle:** `planning → optimized → published →
in_transit → completed` (with `cancelled` escape).

**Deterministic optimizer** (`geo-bucket-nn-v1`):

1. Group pickup requests by bucket (postal-code prefix, else
   lat/lng rounded to 2 decimals).
2. Inside each bucket, sort by priority-rank (medical → standard
   → optional).
3. Order buckets: medical-first, then size desc, then key asc.
4. Coalesce same-bucket requests into one stop.
5. Plan arrival times with `minutesPerStop` offset.

**Per-stop SLA clocks** — one `transport.trip.pickup` clock per
planned stop so a late pickup at stop #12 fires a specific alert
without paging about the trip as a whole.

**Variance summary** on completion: onTime (≤5 min) / late /
missed / avg / max.

**Cancel** preserves already-resolved stops; only unresolved
stops get a cancelled SLA.

---

## 10. Notification dispatch

Sits on top of Phase-15 notification router as a planner.

### Priority → channel matrix

| Priority | Channels (primary first)   |
| -------- | -------------------------- |
| critical | push → sms → email → slack |
| high     | push → email → slack       |
| normal   | email → push               |
| low      | email                      |

### Bypasses (critical only)

- Quiet hours
- Manual DND
- In-meeting / in-session
- Digest queue

### Deferral reasons (non-critical)

- `quiet_hours` — inside user's quiet-hours window (default 22:00–06:00 Asia/Riyadh, wrap-aware)
- `dnd_active` — user set `dndUntil`
- `in_meeting` — calendar integration populated `inMeetingUntil`
- `digest_queued` — user opted into digest for this priority

### Fallback loop

`sendWithFallback` walks the plan's channels in order, first
success wins. `no_adapter` errors are recorded but don't block
fallback to the next channel.

### Digest flush

Periodic sweeper groups pending items by user, checks each
user's `sendHour` against current local hour, bundles into
single email. `lastDigestSentAt` provides idempotency.

---

## 11. Ops Control Tower dashboards

### `GET /api/ops/dashboard/branch/:branchId`

Single-branch real-time view. Returns four sections (any may be
`null` if the corresponding model is offline):

- **sla**: active / atRisk / breached counts + topNearBreach[10]
  - recentBreaches[20] from the last 24h
- **workOrders**: counts by status (14 states) + priority (4
  levels) + overdue + todayScheduled
- **purchaseRequests**: pendingApproval + submittedToday + byTier
- **facility**: openFindings + criticalFindings + inspectionsDue

### `GET /api/ops/dashboard/coo?windowHours=N`

Cross-branch executive rollup (gated to `admin|coo|ceo|ops_manager`):

- **slaCompliance**: overall % + per-module breakdown + worst-5 branches
- **workOrderBacklog**: totalOpen + top-10 branches
- **procurement**: pendingValue + avgCycleHours + convertedLast7d
- **inspections**: openCritical + by-branch top-10
- **recentEscalations**: last 20 escalation events

**Defensive:** any source that throws returns `null` for its
section; the envelope + remaining sections still render. Safe to
poll every 15–30 seconds.

---

## 12. Operational runbook

### Daily health check

1. `GET /api/ops/dashboard/coo` — overall SLA compliance should
   be ≥ 85% within the last 24h window.
2. `GET /api/ops/sla/status` — `breached` count should be ≤ 5%
   of `active`.
3. `GET /api/ops/sla/breaches?sinceHours=24&kind=escalation_fired`
   — any escalation to L3+ (COO) should already have an owner
   assigned.
4. `GET /api/ops/notification-dispatch/digest/pending?limit=50`
   — pending items should be either scheduled for today's
   sendHour or flagged for investigation.

### Incident: SLA engine not ticking

Symptoms: warningsFired / resolutionBreaches stays at 0 over
hours despite active SLAs aging.

1. Check the bootstrap log for `[SLA-Engine] started` — if
   missing, mongoose wasn't ready at +50s.
2. Call `POST /api/ops/sla/tick` manually — if it succeeds,
   `slaEngine.start()` failed silently.
3. Inspect `backend/startup/schedulers.js` — verify the `+50s`
   setTimeout for `bootstrapOperations` didn't get swallowed.

### Incident: WO transition returns 409

The state machine rejected a caller's move. Response carries
`{ from, to, allowed }` — the `allowed` list is what's legal
from the current state. Two common causes:

- Caller skipped a step (e.g. `draft → completed` without
  going through submitted/approved/in_progress).
- Required field missing (response then has code=422 + fields[]).

### Incident: Finding raised but no WO spawned

1. Confirm severity ≥ `major`. Observation/minor don't spawn by
   default — pass `spawnWorkOrder: true` to override.
2. Check bootstrap log — if the WO state-machine injection
   failed, the service falls back to `workOrderModel.create`
   with status='submitted' but the downstream SLA activation
   won't fire.

### Incident: Notification not delivered

Walk the chain:

1. `POST /api/ops/notification-dispatch/preferences/me` — is the
   channel enabled? Is `dndUntil` set?
2. Check `lastDigestSentAt` — was this routed to digest instead?
3. `GET /api/ops/notification-dispatch/digest/pending?userId=X`
   — is there a pending item waiting for the next sendHour?
4. Check Phase-15 `NotificationLog` — if the router fired, the
   log has the attempt; if it didn't, the upstream bus event
   never reached the router.

### Incident: Route job stuck in `published`

Driver never called `/start` on the runtime trip. Two remedies:

- `POST /api/ops/route-optimization/:id/start { tripId }` to
  manually flip.
- Or cancel the job (`/cancel`) — this cancels outstanding stop
  SLAs and preserves already-picked-up stops.

---

## 13. Drift tests

`backend/__tests__/ops-phase16-drift.test.js` enforces cross-
commit invariants that must hold for the Phase-16 contract:

- every OPS_MODULES member has ≥ 1 SLA policy
- every SLA pause-state matches some service's pause bucket
- every WO canonical state is reachable from `draft`
- every ops route file exports an express Router
- every service's bootstrap accessor (`_get*Service`) is present
- every priority in the notification matrix uses only supported
  channels

Run: `npm test -- __tests__/ops-phase16-drift.test.js`

---

## 14. E2E scenarios

`backend/__tests__/ops-phase16-e2e.test.js` threads multiple
services together:

- **Scenario A**: Facility inspection → critical finding →
  auto-spawned WO → WO transitions through the full lifecycle
  → SLA activated + resolved.
- **Scenario B**: PR draft → submit → multi-tier approval →
  convert to PO → both SLAs activated / resolved correctly.
- **Scenario C**: Meeting ended → minutes SLA active → decision
  assigned → decision SLA active → completed with notes → both
  SLAs resolved.
- **Scenario D**: Route job → optimize → publish → stops arrive
  with variance → complete computes summary correctly.
- **Scenario E**: Notification dispatch planning across priority
  × preference combinations + fallback across failing channels.

Run: `npm test -- __tests__/ops-phase16-e2e.test.js`

---

## 15. Version + release marker

**Release:** `4.0.74` — Phase 16 CLOSED (9/9 commits).

| Commit | Version | Delivery                                               |
| ------ | ------- | ------------------------------------------------------ |
| C1     | 4.0.66  | SLA engine (17 policies, 10 modules)                   |
| C2     | 4.0.67  | WO state machine (14 states, SLA hooks)                |
| C3     | 4.0.68  | Facility split + inspections + auto-WO                 |
| C4     | 4.0.69  | PR → PO workflow + 4-tier approval + dual SLA          |
| C5     | 4.0.70  | Ops Control Tower dashboards (Branch + COO)            |
| C6     | 4.0.71  | Meeting decisions lifecycle + follow-up board          |
| C7     | 4.0.72  | Route optimization + per-stop SLA + variance           |
| C8     | 4.0.73  | Notification dispatch (priority/quiet/fallback/digest) |
| C9     | 4.0.74  | Runbook + drift tests + E2E + release marker           |

**Test coverage:** 333+ Phase-16 tests, all green. Zero regression
on pre-existing suites.
