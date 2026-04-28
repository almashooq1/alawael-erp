# Phase 16 — Ops Control Tower API Playbook

Curl examples across every Phase-16 ops surface. All endpoints require auth
(`Authorization: Bearer <token>`). Role requirements noted inline.

Base URL: `$API` (e.g., `https://api.alawael.com`). Mount is **dual** — every
endpoint is available at both `/api/ops/...` and `/api/v1/ops/...`.

Companion runbook: [`13-ops-control-tower-phase-16.md`](./13-ops-control-tower-phase-16.md).

---

## C1 — SLA Engine

Lifecycle clocks for every Ops subject (work orders, purchase requests,
inspections, meeting decisions, route stops). One SLA row per active clock;
breach engine sweeps on tick.

```bash
# Read the registry — every SLA policy + severity + module.
curl "$API/api/v1/ops/sla/reference" -H "Authorization: Bearer $TOKEN"

# Live SLA board (counts by state + at-risk subjects).
# Roles: any authenticated.
curl "$API/api/v1/ops/sla/status?module=work_orders&severity=critical&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Recent breaches (last 24h, all modules).
curl "$API/api/v1/ops/sla/breaches?sinceHours=24&limit=100" \
  -H "Authorization: Bearer $TOKEN"

# Manually start an SLA clock (used by services that don't auto-activate).
# Roles: ops_manager, admin.
curl -X POST "$API/api/v1/ops/sla/activate" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "policyId": "ops.work_order.response",
    "subjectType": "work_order",
    "subjectId": "<ObjectId>"
  }'

# Force a sweep now (skip the scheduler tick).
# Roles: ops_manager, admin.
curl -X POST "$API/api/v1/ops/sla/tick" -H "Authorization: Bearer $TOKEN"
```

---

## C2 — Work Orders

State machine: `draft → assigned → in_progress → on_hold → completed`
(or `cancelled`). Transitions are validated against the registry; an illegal
move returns 409 with the legal next-states for the current state.

```bash
# State graph + legal transitions (front-end uses this to gate buttons).
curl "$API/api/v1/ops/work-orders/reference" -H "Authorization: Bearer $TOKEN"

# List by branch + status.
curl "$API/api/v1/ops/work-orders?branchId=<id>&status=in_progress&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Detail.
curl "$API/api/v1/ops/work-orders/:id" -H "Authorization: Bearer $TOKEN"

# Transition through the state machine.
# Roles: maintenance_technician, maintenance_supervisor, ops_manager, admin.
curl -X POST "$API/api/v1/ops/work-orders/:id/transition" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "toState": "in_progress",
    "notes": "spare ordered, technician on site",
    "patch": { "assignedTechnicianId": "<userId>" }
  }'
```

---

## C3 — Facilities + Inspections

Branch ↔ Building separation. Inspections raise findings; findings can spawn
work orders automatically.

```bash
# Reference: facility types, inspection types, finding severities.
curl "$API/api/v1/ops/facilities/reference" -H "Authorization: Bearer $TOKEN"

# List facilities for a branch.
curl "$API/api/v1/ops/facilities?branchId=<id>&type=building&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Create a facility.
# Roles: facility_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/facilities" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "code": "RYD-B1",
    "nameAr": "مبنى الإدارة - الرياض",
    "nameEn": "Riyadh Admin Building",
    "branchId": "<id>",
    "type": "building"
  }'

# Refresh the compliance snapshot (re-aggregates inspection scores).
# Roles: facility_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/facilities/:id/recompute-compliance" \
  -H "Authorization: Bearer $TOKEN"

# ── Inspections ────────────────────────────────────────────────────

# List inspections.
curl "$API/api/v1/ops/facilities/inspections/list?facilityId=<id>&status=in_progress" \
  -H "Authorization: Bearer $TOKEN"

# Schedule an inspection (activates inspection.due SLA).
# Roles: inspector, facility_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/facilities/inspections" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "facilityId": "<id>",
    "type": "fire_safety",
    "scheduledFor": "2026-05-15T08:00:00Z",
    "inspectorId": "<userId>"
  }'

# Raise a finding (optionally spawn a work order).
# Roles: inspector, facility_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/facilities/inspections/:id/findings" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "description": "fire-extinguisher 2F-W3 expired 2026-03",
    "severity": "high",
    "assetId": "<assetId>",
    "spawnWorkOrder": true
  }'

# Complete + close (closure stops the SLA clock).
curl -X POST "$API/api/v1/ops/facilities/inspections/:id/complete" \
  -H "Authorization: Bearer $TOKEN"
curl -X POST "$API/api/v1/ops/facilities/inspections/:id/close" \
  -H "Authorization: Bearer $TOKEN"
```

---

## C4 — Purchase Requests → POs

Approval chain: `draft → submitted → under_review → approved → converted_to_po`
(or `rejected` / `cancelled` / `returned`). Approvals are recorded individually
so a multi-tier chain is auditable.

```bash
# Reference: statuses, approval tiers, purchase methods.
curl "$API/api/v1/ops/purchase-requests/reference" -H "Authorization: Bearer $TOKEN"

# List PRs.
curl "$API/api/v1/ops/purchase-requests?branchId=<id>&status=under_review" \
  -H "Authorization: Bearer $TOKEN"

# Create a draft.
# Roles: staff, department_head, procurement_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/purchase-requests" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "branchId": "<id>",
    "requiredDate": "2026-05-30",
    "priority": "normal",
    "purchaseMethod": "rfq",
    "items": [
      { "description": "أوراق طباعة A4", "qty": 50, "unit": "ream", "estUnitPrice": 18.5 }
    ]
  }'

# Submit (activates approval SLA).
curl -X POST "$API/api/v1/ops/purchase-requests/:id/submit" \
  -H "Authorization: Bearer $TOKEN"

# Approve (one tier at a time).
# Roles: ceo, cfo, department_head, procurement_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/purchase-requests/:id/approve" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "role": "department_head", "comments": "ok within FY budget" }'

# Convert to PO (terminal — locks the PR).
# Roles: procurement_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/purchase-requests/:id/convert-to-po" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "supplierId": "<supplierId>",
    "supplierName": "Tech Supplies Co.",
    "poOverrides": { "deliveryAddress": "...", "paymentTerms": "net_30" }
  }'
```

---

## C5 — Ops Control Tower Dashboards

Aggregated boards. Defensive — missing data renders as `null`, never 500.

```bash
# Single-branch real-time board (SLA counts + WO status + PR pipeline +
# inspections + decisions). Used by /admin/ops/branch-board UI.
# Roles: any authenticated user with read access to the branch.
curl "$API/api/v1/ops/dashboard/branch/:branchId" \
  -H "Authorization: Bearer $TOKEN"

# Cross-branch executive board. Default windowHours=24.
# Roles: coo, ceo, ops_manager, admin.
curl "$API/api/v1/ops/dashboard/coo?windowHours=72" \
  -H "Authorization: Bearer $TOKEN"
```

---

## C6 — Meeting Governance + Decisions

Decisions are first-class entities (not strings on the meeting doc) so a
follow-up board can aggregate them across meetings + show overdue ones.

```bash
# Reference: decision types, statuses, transitions, priorities.
curl "$API/api/v1/ops/meeting-governance/reference" \
  -H "Authorization: Bearer $TOKEN"

# End a meeting (flips to completed, starts the minutes-publication SLA).
# Roles: meeting_secretary, meeting_chair, ops_manager, admin.
curl -X POST "$API/api/v1/ops/meeting-governance/meetings/:id/end" \
  -H "Authorization: Bearer $TOKEN"

# Publish minutes (resolves the SLA).
curl -X POST "$API/api/v1/ops/meeting-governance/meetings/:id/publish-minutes" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "minutesContent": "## مناقشات\n..." }'

# Assign a decision out of the meeting.
curl -X POST "$API/api/v1/ops/meeting-governance/meetings/:id/decisions" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "title": "تحديث سياسة المشتريات",
    "ownerUserId": "<userId>",
    "type": "policy_change",
    "priority": "high",
    "dueDate": "2026-05-20"
  }'

# List + transition decisions.
curl "$API/api/v1/ops/meeting-governance/decisions?ownerUserId=<id>&status=open" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$API/api/v1/ops/meeting-governance/decisions/:id/transition" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "toStatus": "in_progress", "notes": "kicked off planning" }'

# Cross-meeting follow-up board (overdue + due-soon).
curl "$API/api/v1/ops/meeting-governance/follow-up?overdueOnly=true&limit=100" \
  -H "Authorization: Bearer $TOKEN"

# Manual overdue sweep (the scheduler runs daily; this is a force-tick).
# Roles: ops_manager, admin.
curl -X POST "$API/api/v1/ops/meeting-governance/sweep-overdue" \
  -H "Authorization: Bearer $TOKEN"
```

---

## C7 — Route Optimization

Daily transport plan. Lifecycle:
`planned → optimized → vehicle_assigned → driver_assigned → published → in_transit → completed`
(or `cancelled`). Each stop has its own SLA clock once the plan is published.

```bash
# Reference (job statuses, stop statuses, default optimizer params).
curl "$API/api/v1/ops/route-optimization/reference" \
  -H "Authorization: Bearer $TOKEN"

# Create a job (one shift per branch per day).
# Roles: dispatcher, fleet_manager, ops_manager, admin.
curl -X POST "$API/api/v1/ops/route-optimization" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "branchId": "<id>",
    "runDate": "2026-05-01",
    "departureTime": "07:30",
    "shift": "morning"
  }'

# Add pickup requests.
curl -X POST "$API/api/v1/ops/route-optimization/:id/requests" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "pickupAddress": "حي النخيل، الرياض",
    "beneficiaryId": "<id>",
    "priority": "normal"
  }'

# Run the optimizer (defaults: 8 min/stop, base speed 30 km/h, max 12 stops).
curl -X POST "$API/api/v1/ops/route-optimization/:id/optimize" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "minutesPerStop": 8, "maxStopsPerVehicle": 12 }'

# Assign vehicle + driver (separate steps so each can be reassigned).
curl -X POST "$API/api/v1/ops/route-optimization/:id/assign-vehicle" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "vehicleId": "<id>",
    "registration": "ABC-1234",
    "capabilities": ["wheelchair_lift", "ac"]
  }'

curl -X POST "$API/api/v1/ops/route-optimization/:id/assign-driver" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "driverId": "<userId>", "nameSnapshot": "خالد العتيبي" }'

# Publish (locks the plan, activates per-stop SLAs).
curl -X POST "$API/api/v1/ops/route-optimization/:id/publish" \
  -H "Authorization: Bearer $TOKEN"

# Driver lifecycle.
curl -X POST "$API/api/v1/ops/route-optimization/:id/start" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "tripId": "<tripId>" }'

curl -X POST "$API/api/v1/ops/route-optimization/:id/stops/:stopId/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "toStatus": "completed",
    "when": "2026-05-01T08:14:30Z",
    "notes": "passenger boarded on time"
  }'

curl -X POST "$API/api/v1/ops/route-optimization/:id/complete" \
  -H "Authorization: Bearer $TOKEN"
```

---

## C8 — Notification Dispatch

Priority-aware fanout. SMS-at-3-AM no longer happens because every send walks
through the user's quiet hours, channel preferences, bypass rules, and digest
settings before hitting the channel.

```bash
# Reference: priority×channel matrix, bypass rules, default digest hour.
curl "$API/api/v1/ops/notification-dispatch/reference" \
  -H "Authorization: Bearer $TOKEN"

# My current preferences.
curl "$API/api/v1/ops/notification-dispatch/preferences/me" \
  -H "Authorization: Bearer $TOKEN"

# Update my preferences (any subset of fields is fine).
curl -X PATCH "$API/api/v1/ops/notification-dispatch/preferences/me" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "quietHours": { "from": "22:00", "to": "07:00" },
    "channels": { "low": ["email"], "normal": ["email","push"], "critical": ["sms","push","email"] },
    "bypassPriorities": ["critical"]
  }'

# Manual Do-Not-Disturb (overrides quiet hours until <until>).
curl -X POST "$API/api/v1/ops/notification-dispatch/dnd" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "until": "2026-05-01T17:00:00Z", "reason": "in surgery" }'

curl -X DELETE "$API/api/v1/ops/notification-dispatch/dnd" \
  -H "Authorization: Bearer $TOKEN"

# Admin: read / set another user's prefs.
# Roles: ops_manager, admin.
curl "$API/api/v1/ops/notification-dispatch/preferences/:userId" \
  -H "Authorization: Bearer $TOKEN"

# Admin: pending digest queue + force flush.
curl "$API/api/v1/ops/notification-dispatch/digest/pending?limit=100" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$API/api/v1/ops/notification-dispatch/digest/flush" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common patterns

**Envelope.** Every endpoint returns
`{ "success": true, "data": ... }` on success and
`{ "success": false, "error": "...", ...optional }` on failure (HTTP status
mirrors the failure mode: 400 validation, 401 unauthenticated, 403 forbidden,
404 not_found, 409 illegal_transition, 422 missing_field, 500 server_error).

**Branch scoping.** Endpoints that take an explicit `branchId` query param
respect the caller's branch RBAC; the param is intersected with what the
caller's role allows. `coo`-tier roles see all branches.

**Rate limits.** All write endpoints share the global rate limiter. Bulk
mutation endpoints (e.g., `/sweep-overdue`, `/optimize`) are additionally
rate-limited per service to prevent ops-loop hammering.

**Auditing.** Every transition / approval / SLA observation writes an
`AuditLog` row with `eventCategory: "operations"`, `actorUserId`, before/after
status, and the request body (PII-redacted). Use the `/api/v1/admin/audit`
feed to read it back.

**Events.** Every service emits `ops.<service>.<event>` to the
qualityEventBus. The Phase-15 notification router subscribes; Phase-16 added
the `notificationDispatch` consumer that turns events into channeled messages.

---

## Deeper reads

- Architecture + design rationale: [`13-ops-control-tower-phase-16.md`](./13-ops-control-tower-phase-16.md)
- Cross-bus event contracts: [`07-integrations.md`](./07-integrations.md) +
  the AsyncAPI spec at [`docs/api/asyncapi-events.yaml`](../api/asyncapi-events.yaml)
- Frontend pages consuming these endpoints: see
  `apps/web-admin/src/app/(dashboard)/admin/ops/*` in
  the `alawael-rehab-platform` repo.
