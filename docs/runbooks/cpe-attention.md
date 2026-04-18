# Runbook — SCFHS CPE therapists need attention

**Alert:** digest from `cpe:attention` cron (no Prometheus metric — this is a business workflow, not a platform alert)
**Trigger:** the CLI exits with status 1 (at least one licensed therapist is non-compliant AND ≤180 days from their cycle end).
**Frequency:** daily digest; optional weekly HR deep-review.

## What this means in plain Arabic

معالج مرخَّص لم يكمل ساعات التعليم الطبي المستمر المطلوبة من هيئة التخصصات الصحية قبل انتهاء دورته (100 ساعة كل 5 سنوات موزّعة 50/30/20). لم يعد لديه وقت كافٍ — يجب على إدارة الموارد البشرية التدخّل قبل انتهاء الترخيص (تجديد متأخر = إيقاف المعالج عن العمل).

## Who should respond

HR manager (not on-call). Escalate to the clinical director if ≥3
therapists are simultaneously in the attention window — indicates a
process failure, not individual negligence.

## Immediate actions (5 minutes)

1. Open `/admin/hr/cpe` — scan the "قائمة المتابعة" watchlist panel. Sort is already by days-to-deadline ascending.
2. For each therapist in the list:
   - Click **الملخّص** (Summary) — read the required/earned/deficit table. The deficit by category tells you what's missing.
   - Cross-check `/admin/hr/compliance` — if SCFHS license is already expired, this is no longer a CPE problem; follow the license-renewal SOP instead.
3. Run `npm run cpe:attention` from any backend host to get the text digest for the #hr-compliance Slack channel.

## Diagnosis path

### Case A: the therapist has records but they're unverified

Most common. The therapist submitted activity certificates; HR hasn't reviewed them.

- In `/admin/hr/cpe`, filter by `بانتظار التوثيق` (pending verification).
- Verify inline with the ✓ button if the proof is valid. The record becomes `verified=true` and immediately counts toward the cycle.
- Batch window: HR policy is to review pending records weekly; drift >2 weeks means HR is behind.

### Case B: the therapist has a deficit in a specific category

Check the summary dialog → look at the Per-category table:

- **Category 1 deficit** (مؤتمرات): suggest the therapist register for the nearest SCFHS-accredited conference. Budget per-head is in `docs/sprints/HR_CPE_POLICY.md` (TODO — write this).
- **Category 2 deficit** (نشاطات ذاتية): this is usually the easiest to fix — self-directed reading + journal clubs count. Unverified records staying unverified for >14 days = Case A.
- **Category 3 deficit** (تعليم ومشاركات): supervising interns, delivering in-house training, hospital committee work. Clinical director assigns.

### Case C: the cycle end date is wrong

If `scfhs_expiry` on the Employee record is stale, the attention CLI fires on a therapist who actually has plenty of time.

- Run a fresh SCFHS verification from `/admin/hr/compliance` — refreshes `scfhs_expiry`.
- If the verification itself is failing, escalate to the platform on-call (circuit breaker likely involved).

## Preventing recurrence

- Set the cron to fire daily. Weekly is too slow — a therapist can drop from "6 months out" to "1 month out" in 4 weeks and nobody notices.
- Env tunables exist (`SCFHS_CPE_MIN_CAT1/2/3/TOTAL`) — **do not lower them to make the alert go away.** The minimums come from SCFHS regulations, not our internal policy.
- The 180-day attention threshold is hardcoded in `cpeService.needsAttention`. Changing it is a policy decision — discuss with the clinical director first.

## Related

- [HR_COMPLIANCE_GUIDE.md](../HR_COMPLIANCE_GUIDE.md) — the HR manager's
  daily/weekly/monthly workflow (this runbook is the reactive cousin).
- Service: `backend/services/cpeService.js`
- Routes: `backend/routes/cpe-admin.routes.js`
- UI: `frontend/src/pages/Admin/AdminCpeCredits.jsx`
- CLI: `backend/scripts/cpe-attention.js` (`npm run cpe:attention[:json]`)
- Tests: `backend/__tests__/cpe-service.test.js`, `backend/__tests__/cpe-attention-script.test.js`
