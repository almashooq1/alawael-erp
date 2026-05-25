# Pilot Scenario 6 — Caregiver Enrollment → Sessions → Zarit Pre/Post → Completion (W384 + W393 validation)

**Type**: Pilot operational walkthrough (added post-PILOT_CYCLE_1 §4 — Cycle 1.5 addition)
**Audience**: Pilot Counselor + Pilot Supervisor + Pilot Admin
**Duration**: ~2 hrs of active work spread over 4-8 weeks (programs are inherently long-running; the test exercises the full lifecycle in compressed time using a manually-shifted `targetCompletionDate`)
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 2 (after S1 establishes a beneficiary + after caregiver Guardian record exists)

This scenario validates the **W384 CaregiverSupportProgram** model + 18 routes + **W393 overdue sweeper** in a single end-to-end walkthrough. It complements S1 (intake) and S3 (CAPA) by exercising the family-support surface that closes the last 🟠 partial item from `MODULE_AUDIT_2026-05-25.md`.

If S6 completes successfully end-to-end, **W384 + W393 infrastructure is production-ready** for caregiver-burden tracking + program enrollment + Zarit pre/post outcome instrumentation.

---

## 0. Pre-test setup (10 min)

Before starting:

- [ ] **Pilot beneficiary exists** from S1 (use the same one — `<pilot-beneficiary-id>`)
- [ ] **Guardian record exists for that beneficiary** OR you have the caregiver's name + relationship + phone ready to pass as free-text fields
- [ ] **Counselor user has at least one of** `counselor` / `psychologist` / `social_worker` / `family_coordinator` role assigned
- [ ] **Optional**: `ENABLE_CAREGIVER_SUPPORT_OVERDUE_SWEEPER=true` in pilot env (step 6.9 verifies the sweeper output; if unset, skip step 6.9)
- [ ] **Optional**: `CaregiverBurdenAssessment` (Zarit-22) already scored for the caregiver — use that as the pre-program baseline. Otherwise, score it at step 6.8 retroactively.

---

## 1. The 9 steps

### Step 6.1 — Counselor enrolls a caregiver in a counseling program

**Actor**: Counselor (role=counselor or psychologist or social_worker)

**Action via UI**:

1. Navigate to "برامج دعم مقدمي الرعاية" (clinical nav section, after Respite, before Assistive Devices)
2. Click "+ برنامج جديد"
3. Pick the pilot beneficiary via BeneficiaryPicker
4. `programType = caregiver_counseling`
5. Caregiver name + relationship (e.g., "أم" / "أب") + phone
6. `targetCompletionDate` = 3 months from today
7. Assigned counselor name (yours)
8. Click "حفظ التسجيل" → redirect to detail page

**Action via API** (alternative):

```http
POST /api/v1/caregiver-support
Authorization: Bearer <counselor_token>
Content-Type: application/json

{
  "beneficiaryId": "<pilot-beneficiary-id>",
  "programType": "caregiver_counseling",
  "caregiverName": "أم المستفيد",
  "caregiverRelationship": "أم",
  "caregiverPhone": "+966500000000",
  "targetCompletionDate": "2026-08-25T00:00:00Z",
  "assignedCounselorName": "Counselor Name"
}
```

**Verify**:

- Response 201 with `data._id` + `status: 'enrolled'` + `enrolledAt` set to now
- Empty `sessions[]` + empty `modulesProgress[]` + empty `outcomes` (Zarit fields null)
- Wave-18 invariant: invalidates if caregiverName + caregiverRelationship both empty AND caregiverGuardianId null

**If it fails**:

- `400 caregiverGuardianId OR (caregiverName + caregiverRelationship) required` → invariant correctly enforced; fill both name + relationship
- `403` → role list mismatch; confirm counselor has one of the 5 WRITE_ROLES from the route file

---

### Step 6.2 — Counselor records the first session

**Actor**: Counselor

**Action via API** (UI exists at detail page → "+ Add session" — covered by the form):

```http
POST /api/v1/caregiver-support/<id>/sessions
Authorization: Bearer <counselor_token>
Content-Type: application/json

{
  "sessionDate": "2026-05-26T10:00:00Z",
  "durationMinutes": 60,
  "format": "individual",
  "topic": "Initial assessment + goal-setting",
  "attendanceStatus": "attended",
  "attendees": [
    { "name": "أم المستفيد", "relationship": "أم" }
  ],
  "progressNotes": "Caregiver presented as moderately distressed. Reported daily care load 8-10 hrs. Goals: respite access + sleep hygiene + sibling-support referral.",
  "nextSessionDate": "2026-06-02T10:00:00Z"
}
```

**Verify**:

- 201 with the new session entry
- **Auto-promotion**: `program.status` flips from `enrolled` → `in_progress` (the route's "first session recorded" auto-promotion)
- `program.history[]` gains a `{fromStatus: 'enrolled', toStatus: 'in_progress', reason: 'first session recorded'}` entry
- `program.sessionsCount` virtual returns 1

**If it fails**:

- `400 sessionDate مطلوب` → date field missing
- `400 format يجب أن يكون: individual | family | group | phone | video` → format enum violation
- Auto-promotion didn't trigger → check the route file's logic at the end of the POST /sessions handler; should set `row.status = 'in_progress'` when previously `enrolled`

---

### Step 6.3 — Counselor records 3 more sessions (compressed time)

Repeat the POST /sessions call 3 more times, with sessionDate shifted by 1 week each. Use a mix of formats (individual, family) and one with attendanceStatus='cancelled' to exercise that path.

**Verify**:

- `sessionsCount` virtual = 4
- `sessionsAttendedCount` virtual = 3 (the 'cancelled' one excluded)
- `program.status` stays `in_progress` throughout

---

### Step 6.4 — Counselor patches a session note (correction)

**Actor**: Counselor

**Action via API**:

```http
PATCH /api/v1/caregiver-support/<id>/sessions/<sId>
{
  "progressNotes": "Updated: caregiver reported sleep hygiene homework partial completion. New goal: 30-min nightly relaxation before bed.",
  "attendanceStatus": "attended"
}
```

**Verify**:

- 200 with the updated session sub-document
- Other sessions unchanged
- No history entry for session-level edit (only status transitions write to history)

---

### Step 6.5 — Counselor pauses the program (caregiver travels)

**Actor**: Counselor

**Action via API**:

```http
POST /api/v1/caregiver-support/<id>/pause
{
  "reason": "Caregiver travels abroad for 3 weeks"
}
```

**Verify**:

- 200 with `status: 'paused'` + `pausedAt: <now>`
- `history[]` gains entry with `fromStatus: 'in_progress', toStatus: 'paused', reason: 'Caregiver travels abroad for 3 weeks'`
- Wave-18 invariant: invalidates if status=paused + pausedAt null (verify by attempting a save without pausedAt — should fail with `pausedAt required when status=paused`)

**If it fails**:

- `409 لا يمكن إيقاف برنامج بحالة <status>` → can only pause from in_progress

---

### Step 6.6 — Counselor resumes after caregiver returns

**Actor**: Counselor

**Action via API**:

```http
POST /api/v1/caregiver-support/<id>/resume
{
  "reason": "Caregiver returned + ready to continue"
}
```

**Verify**:

- 200 with `status: 'in_progress'` + `pausedAt: null` (cleared)
- `history[]` gains entry with `fromStatus: 'paused', toStatus: 'in_progress'`

---

### Step 6.7 — Record Zarit pre/post + satisfaction outcomes

**Actor**: Counselor

This is the signature W384 outcome instrumentation. After ~8-12 sessions (compressed for pilot), the counselor records the post-program Zarit-22 score + satisfaction rating.

**Action via API**:

```http
POST /api/v1/caregiver-support/<id>/outcomes
{
  "preProgramBurdenScore": 48,
  "postProgramBurdenScore": 31,
  "satisfactionScore": 8,
  "selfReportedImpact": "أشعر بقدرة أكبر على التعامل مع متطلبات الرعاية اليومية. تحسّن النوم وقلّت نوبات الاكتئاب."
}
```

**Verify**:

- 200 with the outcomes sub-document
- `program.burdenScoreDelta` virtual = `31 - 48 = -17` (negative = positive clinical impact)
- Detail page UI surfaces a green "burden score delta: -17" badge

**Boundary checks** (each should return 400):

- `preProgramBurdenScore: 92` → fails Wave-18 invariant (max 88 per Zarit-22 range)
- `postProgramBurdenScore: -5` → fails (min 0)
- `satisfactionScore: 15` → fails (max 10)

**If it fails**:

- Boundary not enforced → check the model's outcomes sub-document schema for `min: 0, max: 88` on burden scores

---

### Step 6.8 — Counselor completes the program

**Actor**: Counselor

**Action via API**:

```http
POST /api/v1/caregiver-support/<id>/complete
{
  "reason": "12 sessions delivered + outcomes recorded + caregiver opted out of further sessions"
}
```

**Verify**:

- 200 with `status: 'completed'` + `completedAt: <now>`
- `history[]` gains entry with `fromStatus: 'in_progress', toStatus: 'completed'`
- Wave-18 invariant: invalidates if status=completed + completedAt null (try saving without it — should fail)
- Detail page UI: status badge turns green ("مكتمل"); contextual action buttons disappear (program is terminal)

**If it fails**:

- `409 لا يمكن إكمال برنامج ليس in_progress` → can only complete from in_progress (not from paused; resume first)

---

### Step 6.9 — Verify overdue sweeper output (read-only, W393)

**Actor**: Admin / DevOps reviewing log aggregator

**Pre-condition**: `ENABLE_CAREGIVER_SUPPORT_OVERDUE_SWEEPER=true` was set in pilot env.

**Setup** (to actually trigger the sweep): create a fresh program with `targetCompletionDate` set to yesterday (programs in `enrolled` or `in_progress` status get flagged). Wait for the next 10:30 Asia/Riyadh tick OR manually invoke the cron handler by restarting the app at 10:25.

**Verify**:

- App log emits `[caregiver-support] overdue sweep: N programs past targetCompletionDate` at 10:30
- For each overdue program: `[caregiver-support] overdue program=<id> type=<programType> caregiver=<caregiverName> target=<date>`
- **Zero state mutations** — the sweeper does NOT change program status (would have been visible as a history[] entry); verify the overdue programs still have their original status (`enrolled` or `in_progress`)
- The drift guard W364 asserts `.save()` count === 1 across the whole bootstrap (only respite no-show mutates) — this sweeper must stay read-only

**If it fails**:

- No log line at 10:30 → check `ENABLE_CAREGIVER_SUPPORT_OVERDUE_SWEEPER` env var spelling exactly
- Log shows count=0 but you created an overdue program → check `targetCompletionDate` was actually in the past + status was `enrolled` or `in_progress` (not `completed` / `paused` / `discontinued`)
- State got mutated → BUG — sweeper would need rollback; the read-only invariant must hold

---

## 2. Acceptance criteria

- [ ] 6.1 enrollment succeeded with caregiver identity invariant enforced
- [ ] 6.2 first session auto-promoted enrolled → in_progress
- [ ] 6.3 3 additional sessions + sessionsAttendedCount excludes cancelled
- [ ] 6.4 session patch did NOT write a history entry (only status transitions write history)
- [ ] 6.5 pause set pausedAt + history entry
- [ ] 6.6 resume cleared pausedAt + history entry
- [ ] 6.7 outcomes recorded with burdenScoreDelta surfaced as negative number; boundary checks rejected out-of-range Zarit/satisfaction
- [ ] 6.8 complete required + set completedAt; UI removes contextual action buttons
- [ ] 6.9 (if sweeper enabled) overdue log emitted at 10:30 Asia/Riyadh; zero state mutations

---

## 3. Cleanup

The pilot test data should be soft-deleted (not hard-deleted) so audit trails survive:

```http
DELETE /api/v1/caregiver-support/<id>
Authorization: Bearer <admin_token>
```

(Requires admin/superadmin role — the route is gated to DELETE_ROLES.)

**Or**: keep the test record indefinitely if it's representative pilot data + flag it with a `[PILOT TEST]` prefix in notes.

---

## 4. Sign-off

| Role       | Name | Date | Sign-off |
| ---------- | ---- | ---- | -------- |
| Counselor  |      |      |          |
| Supervisor |      |      |          |
| Admin      |      |      |          |

---

## 5. Likely issues (from W384 build experience)

- **403 on /sessions endpoint**: caregiver-support route uses 10 WRITE_ROLES — verify the counselor's role is in that list at `backend/routes/caregiver-support-program.routes.js:43-63`. If a new role name is needed (e.g., `family_therapist`), add it to the WRITE_ROLES array + restart.
- **Wave-18 burden-score validation never fires**: confirm the model loaded is `backend/models/CaregiverSupportProgram.js` and not a stale module cache. Use `mongoose.models.CaregiverSupportProgram.schema.path('outcomes.preProgramBurdenScore')` in a node REPL to verify min/max are 0/88.
- **Frontend pages 404**: nav entry registered at `components/layout/nav-items.v2.tsx` line ~213 (post-respite). The 3 pages live at `apps/web-admin/src/app/(dashboard)/caregiver-support/{page,[id]/page,new/page}.tsx` (W384 frontend trio).
- **Overdue sweeper drift-guard failure**: if you add a 14th sweeper, the W364 drift guard's `scheduledCount++` assertion (currently expects 13) will fail. Update `backend/__tests__/clinical-sweepers-wave364.test.js` envFlags + schedules together.
- **Cross-link to clinical-services aggregator**: W390 added caregiver-support as the 8th card on `/clinical-services/[id]`. After S6 completes, that card should show count=1 + most-recent enrolledAt. If it shows 0, check the API call `GET /api/v1/caregiver-support/by-beneficiary/:id` from the aggregator.

---

## 6. References

- W384 commit: `74e37c814` (backend) + `20921e8` (frontend trio).
- W390 commit: `4a3369de7` (docs collision audit) + `2c78c3b` (8th aggregator card).
- W393 commit: `cf849cc8f` (overdue sweeper added to clinicalSweepersBootstrap).
- Drift guard: `backend/__tests__/caregiver-support-program-wave384.test.js` (55 assertions).
- Cutover guide: [`PRODUCTION_CUTOVER_W356_W370.md`](../architecture/PRODUCTION_CUTOVER_W356_W370.md) (section 4 has the ENV flag for W393).
- Module audit closure: [`MODULE_AUDIT_2026-05-25.md`](../architecture/MODULE_AUDIT_2026-05-25.md) (🟠 Caregiver/sibling row marked CLOSED W384).
