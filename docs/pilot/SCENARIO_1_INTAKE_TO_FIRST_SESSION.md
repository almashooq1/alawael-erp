# Pilot Scenario 1 — Beneficiary Intake → First Session

**Type**: Pilot operational walkthrough (PILOT_CYCLE_1.md §4 Scenario 1)
**Audience**: Pilot Admin + Pilot Therapist + Pilot Supervisor + Pilot Family member
**Duration**: ~3-4 hours of real work spread over 2-3 days
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 1

This is the FOUNDATIONAL scenario — every subsequent scenario assumes a beneficiary exists
that came through this path. Run this on day 1 of the pilot.

---

## 0. Pre-test setup (15 min, one-time per pilot)

Before the 5 pilot users start, the admin must verify:

- [ ] **Pilot branch is registered** with the correct branchId. Note it down.
- [ ] **5 pilot users created**: supervisor, 2 therapists, admin, family (= beneficiary's guardian).
- [ ] **All staff users have MFA tier 2 set up** (required for plan approval in step 1.6).
- [ ] **Pilot family user is linked as a Beneficiary.guardians[0]** for the new beneficiary they'll see.
- [ ] **The pilot branch has at least 1 MeasurementMaster available** in DRAFT status that the therapist will use in step 1.4 (or an ACTIVE measure can be reused).
- [ ] **ENABLE_AUDIT_CHAIN_ARCHIVE=false** in the pilot environment (so the day-1 audit chain stays inspectable).
- [ ] **ENABLE_CAPA_SWEEPER=true** (so Scenario 3 can exercise the W349 alerts subscriber).

Branch contact info pinned in the pilot Slack/Telegram channel for issue escalation.

---

## 1. The 9 steps (with API surface + verify + troubleshoot per step)

### Step 1.1 — Admin creates a Beneficiary

**Actor**: Admin (role=admin_branch)

**Action via UI**:

1. Navigate to Beneficiary list → "+ إضافة مستفيد جديد"
2. Fill required fields: firstName, lastName, dateOfBirth, gender, branchId (pre-populated from user's branch)
3. Add guardian: phone + name (will be linked in step 1.2 to the family pilot user)
4. Save

**Action via API** (equivalent for QA):

```http
POST /api/v1/beneficiaries
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "firstName": "أحمد",
  "firstNameAr": "أحمد",
  "lastName": "الاختبار",
  "lastNameAr": "الاختبار",
  "dateOfBirth": "2017-03-15",
  "gender": "male",
  "branchId": "<pilot_branch_id>",
  "status": "pending",
  "guardians": [
    { "name": "والد الاختبار", "relationship": "father", "phone": "+9665XXXXXXXX" }
  ]
}
```

**Expected response**: `201 Created` with `{ "success": true, "beneficiary": { "_id": "<bid>", "beneficiaryNumber": "B-2026-NNNN", ... } }`

**Verify**:

- `status === 'pending'`
- `branchId` matches pilot branch
- `guardians[0]` populated
- **Canonical ref check**: in DB, `beneficiary.branchId` is an ObjectId to a Branch (NOT a string or phantom Center). W324+W329 enforced this.

**If it fails**:

- `400 VALIDATION_ERROR` on `dateOfBirth` — check date format (must be YYYY-MM-DD ISO)
- `403 BRANCH_ACCESS_DENIED` — admin's branchId doesn't match. Re-check role assignment.
- `500 INTERNAL_ERROR` — capture request ID from response header, send to dev channel.

---

### Step 1.2 — Admin links guardian + sends portal invite

**Actor**: Admin

**Action via UI**:

1. Open the new Beneficiary 360 page
2. Guardians section → "اربط حساب ولي الأمر"
3. Search by email → select the pilot family pilot user
4. Click "إرسال دعوة"

**Action via API**:

```http
POST /api/v1/beneficiaries/<bid>/guardians/<guardian_index>/link-portal
Authorization: Bearer <admin_token>
Content-Type: application/json
{ "userId": "<family_pilot_user_id>" }
```

**Verify**:

- Guardian record now has `userId` linked
- Portal invitation email/SMS dispatched (check via parent-portal-v1 endpoints or admin's notification log)
- **Family pilot user can log in to portal** and see the new beneficiary

**If it fails**:

- Email not received → check SMTP setup OR test with SMS by adding `notificationPreference:'sms'`
- "Guardian not found" → verify the guardian sub-doc index from step 1.1's response

---

### Step 1.3 — Admin opens BeneficiaryEpisode

**Actor**: Admin

**Action via UI**:

1. Beneficiary 360 → "حلقات الرعاية" tab → "+ حلقة جديدة"
2. Type: 'admission' (initial intake)
3. Start date: today
4. Branch: pilot branch (pre-populated)
5. Save → episode status auto-set to `active`

**Action via API**:

```http
POST /api/v1/beneficiaries/<bid>/episodes
{ "type": "admission", "startDate": "<today_ISO>", "branchId": "<pilot_branch_id>" }
```

**Verify**:

- Episode `status === 'active'`
- Episode appears in Beneficiary 360 timeline
- Beneficiary's overall status auto-promotes from `pending` → `active`

---

### Step 1.4 — Therapist runs initial Assessment

**Actor**: Therapist (role=therapist)

**Action via UI**:

1. Login as therapist → "تقييماتي" → "+ تقييم جديد"
2. Beneficiary picker → select the new beneficiary
3. Measure picker → pick the pre-seeded ACTIVE MeasurementMaster
4. Fill the score fields per the measure's columns
5. Add narrative summary
6. Submit

**Action via API**:

```http
POST /api/v1/assessments
{
  "beneficiaryId": "<bid>",
  "episodeId": "<eid>",
  "measureId": "<mid>",
  "score": 72,
  "scoreUnits": "percent",
  "narrative": "Initial baseline. Strong communication; needs work on fine motor.",
  "performedBy": "<therapist_user_id>",
  "branchId": "<pilot_branch_id>"
}
```

**Verify**:

- Assessment status starts as `ACTIVE` per W325 P2 lifecycle
- MeasureResult is created and linked
- Score is within the measure's defined `scoreDirection` range
- Appears in Beneficiary 360 timeline as an "Assessment recorded" event
- **W332 + W325 P2 drift guard implication**: status enum comes from measure-lifecycle.lib.js — if status missing, the registry guard would have caught at app boot

**If it fails**:

- `400 MEASURE_NOT_ACTIVE` — selected MeasurementMaster is DRAFT or DEPRECATED. Pick a different measure.
- `400 BENEFICIARY_NO_ACTIVE_EPISODE` — step 1.3 didn't complete or episode was closed.

---

### Step 1.5 — Therapist drafts CarePlan + 3 SmartGoals

**Actor**: Therapist

**Action via UI**:

1. From the Assessment → "إنشاء خطة رعاية"
2. CarePlan form pre-populates beneficiary/episode/assessment evidence link
3. Add 3 SMART goals (each: title, baseline, target, measurable criteria, target date)
4. Set plan type (individual_therapy default), discipline, planned duration
5. Save as DRAFT

**Action via API**:

```http
POST /api/v1/care-plans
{
  "beneficiaryId": "<bid>",
  "episodeId": "<eid>",
  "specialist": "<therapist_user_id>",
  "planType": "individual_therapy",
  "assessmentEvidenceIds": ["<assessment_id>"],
  "status": "DRAFT",
  "branchId": "<pilot_branch_id>",
  "goals": [
    { "title": "Improve fine motor", "baseline": "Cannot button shirt", "target": "Buttons 5/5", "criteria": "Observed 3/3 sessions", "targetDate": "<today+90d>" },
    { /* goal 2 */ }, { /* goal 3 */ }
  ]
}
```

**Verify**:

- `careplan.status === 'DRAFT'`
- 3 goals linked, each with `assessmentEvidenceIds` populated
- W332 care-planning.registry validates: status is in canonical 13-state list
- Goals appear in Beneficiary 360 timeline as "Goals proposed"
- No PlanReviewAck yet (only created on approval, not draft)

---

### Step 1.6 — Supervisor reviews + approves CarePlan (MFA tier 2 required)

**Actor**: Supervisor (role=supervisor)

**Action via UI**:

1. Login as supervisor → "خطط للمراجعة" queue
2. Open the DRAFT plan from step 1.5
3. Review goals + intervention strategy
4. Click "اعتماد" → MFA tier 2 step-up prompt appears
5. Enter OTP / approve via authenticator
6. Plan transitions to ACTIVE

**Action via API**:

```http
POST /api/v1/care-plans/<plan_id>/approve
X-MFA-Tier: 2
Authorization: Bearer <supervisor_token>

{ "approverNotes": "Goals well-formed, baseline solid", "approverDecision": "approved" }
```

**Verify**:

- `careplan.status === 'ACTIVE'`
- `careplan.approvedBy === <supervisor_id>`, `approvedAt` set
- New `PlanReviewAck` record created (W303-W308 audit chain hash-linked)
- `versionNumber` increments (CarePlanVersion v1 created)
- Beneficiary 360 timeline shows "Plan approved"
- Family pilot user receives notification (per W276c parent-portal-v1 messaging)

**If it fails**:

- `403 MFA_TIER_INSUFFICIENT` — supervisor didn't complete MFA tier 2 step-up. Re-prompt and retry.
- `409 SOD_VIOLATION` — supervisor is also the plan author (self-approval blocked by Wave-18 separation-of-duties). Different supervisor must approve.
- `422 INVALID_TRANSITION` — plan isn't in DRAFT (maybe SUBMITTED_TO_SUPERVISOR is required first). Check W332 registry for the correct transition.

---

### Step 1.7 — Therapist schedules first TherapySession

**Actor**: Therapist

**Action via UI**:

1. From CarePlan ACTIVE → "جدولة الجلسة الأولى"
2. Pick date/time, room, duration (default 45 min)
3. Save

**Action via API**:

```http
POST /api/v1/therapy-sessions
{
  "beneficiary": "<bid>",
  "therapist": "<therapist_employee_id>",
  "carePlanId": "<plan_id>",
  "date": "<today_ISO>",
  "startTime": "14:00",
  "duration": 45,
  "branchId": "<pilot_branch_id>",
  "status": "SCHEDULED"
}
```

**Verify**:

- Session appears in **Therapist Workload dashboard** (W352): `sessions.todayPending` increments by 1
- Session appears in Beneficiary 360 schedule
- No conflict (room + therapist + date+time uniqueness — see W327 smart-attendance indexes)
- An Appointment may be auto-created depending on the route; if so, `appointments.todayPending` (W352) also increments

**If it fails**:

- `409 ROOM_CONFLICT` — same room/time taken. Pick different slot.
- `409 THERAPIST_CONFLICT` — therapist double-booked. Reschedule.

---

### Step 1.8 — Therapist documents session + goal progress

**Actor**: Therapist (after session physically delivered)

**Action via UI**:

1. From session card → "إكمال الجلسة"
2. Status → COMPLETED
3. Add session note (objective observations)
4. Per-goal progress entry: for each linked goal, record a numeric score + observation

**Action via API** (after status COMPLETED):

```http
POST /api/v1/goals/<goal_id>/progress
{
  "sessionId": "<session_id>",
  "beneficiaryId": "<bid>",
  "value": 2,
  "scale": "0-5",
  "observation": "Tried 5 buttons, completed 2 independently",
  "recordedBy": "<therapist_user_id>"
}
```

**Verify**:

- `TherapySession.status === 'COMPLETED'` (W352 metric `sessions.weekCompleted` will increment on next dashboard read)
- `GoalProgressEntry` created and linked to session + goal
- Beneficiary 360 timeline shows session + 3 progress entries
- Care-plan-plateau-detector cron (W41) will pick this up on next run (only if multiple sessions with no progress; not triggered yet on session #1)

---

### Step 1.9 — Family signs PlanReviewAck

**Actor**: Family pilot user (the guardian linked in step 1.2)

**Action via UI**:

1. Login to Family Portal (parent-portal-v1)
2. "الخطط" → see the ACTIVE plan from step 1.6
3. Open plan summary (family-safe view) → "أوافق على الخطة"
4. Sign

**Action via API**:

```http
POST /api/v1/parent-portal/plan-reviews/<plan_review_ack_id>/sign
Authorization: Bearer <family_token>

{ "signatureMethod": "in_app", "signature": "<base64_signature_or_attestation>" }
```

**Verify**:

- `PlanReviewAck.familySigned === true`
- `PlanReviewAck.familySignedAt` populated
- W303-W308 audit chain extends: new hash-linked entry added
- Beneficiary 360 timeline shows "Family approved plan"
- Supervisor receives notification

**If it fails**:

- `403 NOT_LINKED_GUARDIAN` — family user wasn't linked to this beneficiary in step 1.2. Re-link.
- `409 ALREADY_SIGNED` — duplicate sign attempt. Confirm previous sign worked.

---

## 2. Acceptance criteria

All 9 steps complete and verified. Specifically:

- [ ] Beneficiary status: pending → active
- [ ] Episode: active
- [ ] Assessment: 1 recorded with score in valid range
- [ ] CarePlan: ACTIVE with 3 SMART goals linked to assessment evidence
- [ ] CarePlanVersion: v1 created on approval
- [ ] PlanReviewAck: exists + familySigned=true
- [ ] TherapySession: 1 completed
- [ ] GoalProgressEntry: 3 created (one per goal)
- [ ] Family received + acted on notification in <24h
- [ ] No support ticket opened during the scenario
- [ ] Branch Quality Heatmap (W350-W378) doesn't elevate this branch above 'ok' status

## 3. Cleanup (optional, for re-running the scenario)

If the pilot needs to re-run Scenario 1 with the same user accounts:

```bash
# Per the pilot env's seed-rollback procedure (NOT a destructive ops command):
npm run pilot:reset-scenario1 -- --beneficiary <bid>
```

This soft-deletes the created Beneficiary + cascades through Assessment/CarePlan/Session.
Audit-chain entries are PRESERVED (W303-W308 contract).

## 4. Sign-off

| Role       | Name | Date | Signature |
| ---------- | ---- | ---- | --------- |
| Admin      |      |      |           |
| Therapist  |      |      |           |
| Supervisor |      |      |           |
| Family     |      |      |           |

Pilot PM countersigns once all 4 sign:

| Role     | Name | Date | Signature |
| -------- | ---- | ---- | --------- |
| Pilot PM |      |      |           |

## 5. Issues captured during this scenario

Use the PILOT_CYCLE_1.md §7 template:

```text
ISSUE: <one-line description>
SCENARIO: 1
STEP: 1.X
WHAT HAPPENED: <expected vs actual>
SCREENSHOT: <attached>
SEVERITY: blocker / major / minor / cosmetic
```

Track in `#pilot-cycle-1` channel. Hotfix only if BLOCKER per the PILOT_CYCLE_1.md definition;
all else → backlog.

---

## Key design decisions (for this walkthrough)

1. **One scenario, one document** — keeps the walkthrough focused. 4 more scenario docs follow the same pattern.
2. **API examples alongside UI** — gives QA + dev a clear contract beyond what the UI demos.
3. **Verify + If-it-fails per step** — pilot users hit issues; pre-documenting the common errors keeps them from getting stuck waiting for dev support.
4. **Acceptance + cleanup + sign-off sections** — turn this into a runnable test script, not just narrative.
5. **No screenshots committed** — UI may change; the step structure (action+verify+troubleshoot) survives UI refactors better than pixel-captures.

## Recommended next step

After the first pilot user completes Scenario 1:

1. Capture any new issues in the channel.
2. Walk the weekly retrospective (PILOT_CYCLE_1.md §7).
3. Pilot PM gives green light to start Scenario 2 (re-assessment cycle).
4. If a step needed support 3+ times across users, file a follow-up ticket to refine that step's verify guidance in this doc.

Sister docs (one per scenario; same structure):

- `SCENARIO_2_REASSESSMENT_REVISION.md` (PILOT_CYCLE_1.md §4 S2) — not yet written
- `SCENARIO_3_CAPA_END_TO_END.md` (S3 — validates W337-W349 chain)
- `SCENARIO_4_TRANSPORT_HIKVISION.md` (S4)
- `SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md` (S5)
