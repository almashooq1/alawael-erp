# Runbook — Session attendance risk digest

**Alert:** `attendance-digest` cron exits 1.
**Trigger:** at least one beneficiary has ≥3 no-shows in the rolling 30-day window.
**Frequency:** daily (recommend 08:00 Riyadh before clinic opens).

## What this means in plain Arabic

مستفيد واحد أو أكثر لديه سلسلة غيابات بدون إشعار (no_show). نحتاج قرار إداري: هل نعيد جدولة؟ نصعّد للمشرف الإكلينيكي؟ نلغي الباقة؟ ترك الأمر دون متابعة = فقد إيرادات + فقد تحسّن إكلينيكي للمستفيد.

## Who should respond

Front-desk receptionist + clinical supervisor. Escalate to parent-liaison if language barrier or repeated no-contact.

## Immediate actions (5 minutes)

1. Open `/admin/attendance`. The **Critical** panel (red) shows beneficiaries with ≥5 no-shows. **Attention** (yellow) shows 3-4.
2. For each critical entry:
   - Call the registered guardian from `/admin/beneficiaries/:id` (phone is in the 360 profile).
   - Ask if care-plan is still needed. If yes → reschedule. If no → flag for discharge review with clinical supervisor.
3. For each attention entry:
   - Send the WhatsApp reminder (bulk send from `/admin/notifications`).

## Diagnosis paths

### Case A: one beneficiary, many no-shows

Usually a family circumstances change — transportation, caregiver illness, school conflict. Contact + reschedule. If pattern repeats after 2 contact attempts, escalate to clinical supervisor for discharge review (SCFHS ethics: can't bill for care that isn't being received).

### Case B: cluster across one therapist

If several beneficiaries on the same therapist's caseload are no-showing, check:

- Therapist schedule changed without parent notification
- Room/branch move
- Therapist-family rapport issue

Check `/admin/therapy-sessions?therapist=<id>&status=CANCELLED` for cancellation patterns.

### Case C: cluster on a specific day/time

Traffic, school-calendar conflict, cultural event. Front desk should propose alternate slots in the next week.

## Preventing recurrence

- Env tunables: `ATTENDANCE_NOSHOW_ATTENTION` (default 3), `ATTENDANCE_NOSHOW_CRITICAL` (default 5), `ATTENDANCE_WINDOW_DAYS` (default 30). **Don't raise these to silence the alert** — the thresholds encode clinical policy (3 no-shows triggers check-in, 5 = mandatory escalation).
- Send reminder 24h before every scheduled session via the existing notifications pipeline.
- Confirm slot at end of each session for the next week (front-desk hand-off).

## Related

- Service: `backend/services/sessionAttendanceService.js`
- Routes: `backend/routes/attendance-admin.routes.js`
- UI: `frontend/src/pages/Admin/AdminAttendance.jsx`
- CLI: `backend/scripts/attendance-digest.js` (`npm run attendance:digest[:json]`)
- Model: `backend/models/SessionAttendance.js`
