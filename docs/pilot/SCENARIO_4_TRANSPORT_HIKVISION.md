# Pilot Scenario 4 — Transport assignment + Hikvision camera attendance reconciliation

**Type**: Pilot operational walkthrough (PILOT_CYCLE_1.md §4 Scenario 4)
**Audience**: Pilot Admin + Pilot Therapist + Driver (real or simulated)
**Duration**: ~2 hours of real work on 1 pilot day (camera + transport are real-time events)
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 2 (CONDITIONAL on Hikvision env readiness — see §0)

This scenario validates the **operations + attendance** path:

- TransportAssignment + StudentTransport (W327 canonical refs)
- Hikvision camera attendance (W96-W114 vertical)
- AttendanceViaCamera → auto-Appointment status update (Classroom canonical per W335)
- End-of-day reconciliation: planned vs delivered

If S4 completes successfully, the **Hikvision-driven attendance pipeline is production-ready**.

---

## 0. Pre-test setup (30-60 min — env-dependent)

⚠️ **GATE — Hikvision environment readiness**

If Hikvision cameras + edge controllers are NOT physically configured at the pilot branch, this scenario CANNOT run in production mode. Two paths:

- **Path A — real cameras configured**: proceed below. Camera events flow naturally.
- **Path B — mock-mode** (recommended for Week 1-2): run the pilot with `HIKVISION_MODE=mock` so the integration emits synthetic attendance events on a manual trigger. Steps 4.3-4.4 are then via API only (no physical camera).

Path A vs B is a deployment decision; the pilot owner must answer per PILOT_CYCLE_1.md Q4 ("Hikvision env — is it ready for Scenario 4 week 1, or run mock-only for first 2 weeks?").

**Setup checklist (both paths)**:

- [ ] **S1 beneficiary exists** with an active Episode + the family pilot user linked (re-uses S1 state)
- [ ] **A TherapySession exists** today (re-use S1.7's session OR create a fresh one)
- [ ] **A Driver record exists** for the pilot branch (created via HR + Transport module)
- [ ] **A TransportRoute is configured** for the pilot branch (depot → branch → return)
- [ ] **An AttendanceViaCamera or SmartAttendanceRecord model is loaded** (smoke: `mongoose.model('SmartAttendanceRecord')` must not throw — verify via dev console)

**Path A only**:

- [ ] Cameras at branch entry are paired + streaming to Hikvision adapter
- [ ] `HIKVISION_API_KEY` + edge controller IP configured in env

**Path B only**:

- [ ] `HIKVISION_MODE=mock` set
- [ ] `npm run dev:hikvision:emit-arrival -- --beneficiary <bid> --camera <cam_id>` script is available

---

## 1. The 5 steps

### Step 4.1 — Admin assigns Beneficiary to a transport route

**Actor**: Admin (role=admin_branch)

**Action via UI**:

1. Navigate to Transport → Routes → Open the pilot route
2. "+ إضافة مستفيد للمسار"
3. Pick the S1 beneficiary
4. Set pickup time + pickup address
5. Save → TransportAssignment created

**Action via API**:

```http
POST /api/v1/transport/routes/<routeId>/assign
Authorization: Bearer <admin_token>

{
  "beneficiaryId": "<bid_from_S1>",
  "pickupTime": "07:30",
  "pickupAddress": { "lat": 24.7, "lng": 46.7, "label": "نقطة الانطلاق" },
  "branchId": "<pilot_branch_id>"
}
```

**Verify**:

- `TransportAssignment.status === 'scheduled'`
- Driver is notified (Slack / SMS / in-app per pilot env)
- StudentTransport record (W327 canonical) is created with `ref:'User'` for driver assignment (W327 fix — was `ref:'AdminUser'` before)
- Appears in Beneficiary 360 timeline

**If it fails**:

- `404 ROUTE_NOT_FOUND` → no pilot route exists. Create one + retry.
- `409 BENEFICIARY_ALREADY_ON_ROUTE` → re-using a route from a prior test run. Use cleanup script.

---

### Step 4.2 — Driver picks up beneficiary (real or simulated)

**Actor**: Driver (real or simulated via API)

**Action via UI** (driver mobile app):

1. Driver opens route on phone → tap "بدء الجولة"
2. At pickup location → tap "تم استلام" + beneficiary name
3. TransportAssignment status → `in_progress`

**Action via API** (for QA without real driver):

```http
POST /api/v1/transport/assignments/<assignmentId>/pickup
{ "pickupAt": "<ISO now>", "driverId": "<driver_user_id>" }
```

**Verify**:

- `TransportAssignment.status === 'in_progress'`
- `pickedUpAt` populated
- Beneficiary 360 timeline updates: "transport in progress"
- Family pilot user receives notification (per W276c)

---

### Step 4.3 — Camera detects arrival at branch (Hikvision integration)

**Actor**: Hikvision camera (Path A) OR API trigger (Path B)

**Path A — Real camera**:

1. Driver arrives at branch with beneficiary
2. Beneficiary walks past entry camera
3. Hikvision adapter detects face match (or RFID badge — depends on hardware) → emits arrival event
4. Backend ingests event → creates `AttendanceViaCamera` record + `SmartAttendanceRecord` (W327 canonical refs)

**Path B — Mock-mode trigger**:

```bash
npm run dev:hikvision:emit-arrival -- \
  --beneficiary <bid_from_S1> \
  --camera <cam_id_for_pilot_branch> \
  --at <ISO now>
```

OR direct API:

```http
POST /api/v1/hikvision/events/attendance
Authorization: Bearer <hikvision_adapter_token>

{
  "type": "arrival",
  "beneficiaryId": "<bid_from_S1>",
  "cameraId": "<cam_id>",
  "branchId": "<pilot_branch_id>",
  "timestamp": "<ISO now>"
}
```

**Verify** (validates W96-W114 + W327 canonical refs):

- New `AttendanceViaCamera` record exists with:
  - `beneficiaryId === <bid_from_S1>`
  - `branchId === <pilot_branch_id>`
  - `classId` (if set) refs canonical `'Classroom'` (NOT `'Class'` — W335 fix)
  - `cameraId` populated
  - `arrivalAt` populated
- Auto-link: today's Appointment (if scheduled) gets `status === 'CHECKED_IN'`
- Beneficiary 360 timeline updates: "Arrived at branch (camera #X)"

**If it fails**:

- No face match → check Hikvision face-enrollment for this beneficiary (W275c face-enrollment service should have a profile)
- `404 CAMERA_NOT_REGISTERED` → camera not in CameraDevice collection. Admin must register.
- `404 BENEFICIARY_NOT_ENROLLED` → run face-enrollment via HikvisionFaceEnrollmentService

---

### Step 4.4 — Therapist starts session; documents departure

**Actor**: Therapist

**Action via UI**:

1. Therapist sees on dashboard: beneficiary checked-in
2. Click "بدء الجلسة" → Appointment.status → `IN_PROGRESS`
3. Deliver session (real or simulated)
4. Click "إكمال الجلسة" → status → `COMPLETED`
5. Mark goal progress (per S1.8 pattern)

**Action via API** (same shape as S1.7 + S1.8):

```http
POST /api/v1/therapy-sessions/<sessionId>/start
POST /api/v1/therapy-sessions/<sessionId>/complete
POST /api/v1/goals/<goalId>/progress { ... }
```

**Departure** (post-session, optional camera detection or manual):

```http
POST /api/v1/hikvision/events/attendance
{ "type": "departure", "beneficiaryId": "<bid>", "cameraId": "<cam_id>", "branchId": "<pid>", "timestamp": "<ISO>" }
```

**Verify**:

- `TherapySession.status === 'COMPLETED'` (W352 dashboard increment for `sessions.weekCompleted` on next read)
- `AttendanceViaCamera` updated with departure if camera detected
- `TransportAssignment.status === 'completed'` (after driver marks return-leg done)

---

### Step 4.5 — EOD reconciliation: planned vs delivered

**Actor**: Admin OR Supervisor (read-only)

**Action via UI**:

1. Navigate to Reports → Daily Operations
2. View "Adherence Summary" for today
3. Per beneficiary: planned sessions vs delivered + no-show count

**Action via API**:

```http
GET /api/v1/reports/operations/daily?branchId=<pilot_branch_id>&date=<today>
Authorization: Bearer <admin_token>
```

**Expected shape**:

```json
{
  "success": true,
  "date": "2026-MM-DD",
  "branchId": "<pid>",
  "adherence": {
    "totalScheduled": N,
    "completed": M,
    "noShow": K,
    "rate": "M/N"
  },
  "transportSummary": {
    "totalAssignments": A,
    "delivered": B,
    "delayedByMinutes": ...
  }
}
```

**Verify**:

- Today's S4 beneficiary appears as `completed` (1 session)
- `transportSummary.delivered` increments by 1
- No "no-show" entries unless something genuinely failed
- W352 therapist workload dashboard reflects the COMPLETED session on next read
- W350 heatmap stays at `ok` (assuming no other branch issues)

**If it fails**:

- Numbers don't match → check that AttendanceViaCamera → Appointment auto-link wasn't broken (step 4.3 verify pass)
- Driver didn't mark return → no-show count may be falsely high; reconcile manually

---

## 2. Acceptance criteria

All 5 steps complete + verified:

- [ ] TransportAssignment created, scheduled → in_progress → completed lifecycle
- [ ] StudentTransport record has canonical `User` ref for driver (W327 fix in production)
- [ ] AttendanceViaCamera record exists with canonical `Classroom` ref (W335 fix in production)
- [ ] Appointment auto-promoted to CHECKED_IN by Hikvision event
- [ ] TherapySession COMPLETED + linked to today's attendance
- [ ] Family received pickup + arrival + completion notifications
- [ ] EOD adherence report matches reality (1 completed, 0 no-shows)
- [ ] W350 + W352 dashboards reflect the activity
- [ ] No support ticket opened

**This validates: W96-W114 Hikvision integration + W327 smart-attendance canonical refs + W335 Class→Classroom rename + transport scheduling chain.**

## 3. Mock-mode considerations (Path B)

If running in mock mode:

- Steps 4.3 + 4.4 (camera detection) use API triggers instead of real face match
- Mark all mock-injected events with `source:'mock-pilot'` so they can be excluded from prod analytics later
- Mock-mode is recommended for FIRST 2 WEEKS of pilot. Switch to Path A in Week 3 only if Hikvision env is ready + face-enrollment is done for the pilot beneficiary.

## 4. Cleanup

```bash
npm run pilot:reset-scenario4 -- --beneficiary <bid> --date <today>
```

Soft-deletes TransportAssignment + AttendanceViaCamera for the date. SmartAttendanceRecord audit-grade entries PRESERVED.

## 5. Sign-off

| Role             | Name | Date | Signature |
| ---------------- | ---- | ---- | --------- |
| Admin            |      |      |           |
| Therapist        |      |      |           |
| Driver (if real) |      |      |           |
| Pilot PM         |      |      |           |

## 6. Issues captured during this scenario

Tag SCENARIO:4 + STEP:4.X.

**Likely issues to watch for**:

- Face match fails (lighting / angle / enrollment quality) → Hikvision face-enrollment service may need re-enrollment (W275c)
- Camera not in CameraDevice collection → admin enrollment gap. BLOCKER for Path A.
- Auto-link from camera → Appointment doesn't fire → check W327 smart-attendance handler is wired
- Driver app sync issues (offline mode) → out of scope for backend pilot; document as known gap

---

## Key design decisions (for this walkthrough)

1. **Path A vs Path B gate** — pilot env may not have cameras Week 1. Documenting mock mode lets pilot start without blocking on hardware.
2. **W327 canonical-ref check in step 4.3** — pilot users won't normally check refs; documenting the verify gives QA a concrete check for the W324-W329 production correctness.
3. **EOD reconciliation as step 5** — this is the operational value the scenario delivers (not just "did camera fire" but "did the operational picture match"). Pilot supervisors care about this number most.

## Recommended next step

After Admin + Therapist + (Driver if real) sign off:

1. Capture issues in `#pilot-cycle-1`.
2. If running Path B (mock), schedule a Path A re-run for Week 3 to validate real Hikvision flow.
3. If Path A blockers found → file hardware/enrollment tickets to ops team, don't block S5 (DA report).

Sister docs:

- ✅ `SCENARIO_1_INTAKE_TO_FIRST_SESSION.md`
- ✅ `SCENARIO_2_REASSESSMENT_REVISION.md`
- ✅ `SCENARIO_3_CAPA_END_TO_END.md`
- ✅ `SCENARIO_4_TRANSPORT_HIKVISION.md` (this commit)
- 🟡 `SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md`
