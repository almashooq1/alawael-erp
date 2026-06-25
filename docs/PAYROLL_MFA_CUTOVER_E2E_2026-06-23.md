# Payroll Step-up-MFA — Staging E2E + Production Cutover Runbook

**Date:** 2026-06-23 · **Owner action required** · Status: drafts ready, CI-green, awaiting the gates below.

This runbook covers the three coupled changes that close the deep-bug-hunt **F** finding
(payroll mutations had no step-up-MFA) plus the related numbering hardening. Each is a
**draft PR with a hard pre-merge gate** — skipping the gate breaks live functionality.

| PR       | Repo                                 | What it does                                                                                                                 | Hard gate before merge                                                                                                                                                                    |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#607** | `alawael-erp` (backend)              | `attachMfaActor` + `requireMfaTier(2)` on payroll `approve` / `process` / `transfer` / `confirm-payment` / `process-monthly` | The MFA-capable UI (#139) must be the live payroll surface, verified on staging — else the gate returns `403 MFA_TIER_REQUIRED` to any caller that can't step up                          |
| **#139** | `alawael-rehab-platform` (web-admin) | Payroll-processing UI with `MfaChallengeDialog` (tier 2): per-record lifecycle (W1465) + bulk `process-monthly` (W1466)      | Staging E2E of every payroll action                                                                                                                                                       |
| **#609** | `alawael-erp` (backend)              | Atomic numbering counters (`nextSequence`) + `seed-numbering-counters.js` migration                                          | The seed migration **must run** (so counters start at current max) before the code goes live — else new entity numbers collide with existing ones and creation throws on the unique index |

> **Why #607 and #139 must merge + deploy together:** before #139, the web-admin payroll
> UI was **read-only**, so payroll was processed in the legacy `66666/frontend`
> (`payrollService.js`), which has **no MFA step-up infra**. If #607 deploys while users
> still process payroll in the legacy UI, every approve/transfer/confirm call returns 403
> and **live payroll halts**. The fix is to make web-admin (which has `MfaChallengeDialog`)
> the payroll surface, verify it on staging, then land both PRs and deploy together.

---

## Part 1 — Staging E2E (the gate for #607 + #139)

**Prereqs on staging:** deploy the #139 branch (`feat/w1465-payroll-ui-mfa`) to the staging
web-admin, pointed at a staging backend running the #607 branch (`feat/...` for W1461).
Seed at least one payroll record in `draft` status for a staging branch you can access.

A payroll admin account that can reach tier-2 step-up (the same MFA mechanism used by
access-review attestations / W1464).

### Scenario A — happy path, full lifecycle (per-record)

Navigate to **HR → الرواتب الشهرية → (open a record) → التفاصيل**.

1. Record is `draft` → the **"اعتماد الراتب"** button shows.
2. Click it → **`MfaChallengeDialog` opens** (tier 2). Complete the step-up.
3. On verify → request fires; status becomes **`approved`**; the button now reads **"معالجة الراتب"**.
4. Repeat for **معالجة** (`approved → processed`).
5. `processed` → **"تحويل الراتب"** shows a **bank transaction-ref input**. The button stays
   **disabled until the ref is filled**. Enter a ref, step up via MFA → status **`transferred`**.
6. `transferred` → **"تأكيد الدفع"** → MFA → status **`paid`**. No further actions render.

**Pass criteria:** each transition prompts MFA _before_ the call; status badge advances
correctly (draft → معتمد → مُعالَج → مُحوّل → مدفوع); the page refetches after each step.

### Scenario B — no step-up / cancelled MFA

1. From a `draft` record, click **اعتماد** → dialog opens → **cancel** the dialog.
2. **Pass:** no request is sent; status unchanged; no error toast (clean no-op).
3. (With #607 live) If a request somehow reaches the backend without tier 2, the API returns
   `403 MFA_TIER_REQUIRED`; the UI surfaces the inline error and does not advance.

### Scenario C — bulk process-monthly

Navigate to **HR → الرواتب الشهرية** (list).

1. Pick a month/year with no run yet → click **"تشغيل رواتب الشهر …"**.
2. **`MfaChallengeDialog` opens** (tier 2) → complete step-up.
3. On verify → `process-monthly` runs; the inline message shows **"تم تشغيل رواتب الشهر بنجاح."**;
   the list refetches and shows the generated records.
4. Trigger a backend error (e.g. re-run for an already-run month) → inline **red** error
   message; no crash.

### Scenario D — transfer-ref validation

1. On a `processed` record, the **تحويل** button is **disabled** with an empty ref field.
2. Type a ref → button enables. Clear it → button disables again.
3. **Pass:** `transfer` is never callable without a transaction ref.

### Scenario E — authorization

1. As a non-payroll role, the list returns **403** → "ليس لديك صلاحية لعرض الرواتب." (existing behavior).
2. Action buttons are only reachable by roles the backend permits (`hr` / `admin` / `payroll`).

---

## Part 2 — Production cutover sequence

Execute **in this exact order**. Do not merge #607 before Part 1 passes.

### Step 1 — Numbering counters (#609), seed first

```bash
# On the host with production MongoDB access (SSH), on the #609 branch checkout:
cd backend
# 1a. DRY RUN — prints the computed max for every counter; mutates nothing:
node scripts/seed-numbering-counters.js            # dry-run is the DEFAULT
# Review the output: each counter's "current max in collection" must look right.
# 1b. COMMIT — writes the counter docs so nextSequence() starts above existing numbers:
node scripts/seed-numbering-counters.js --commit
```

Then merge **#609** and deploy the backend. Verify by creating one numbered entity of each
kind (invoice, journal entry, helpdesk ticket, insurance claim, PO, stock count, item,
supplier) and confirming the number is **max+1**, not a duplicate.

**Rollback:** the counters are additive; if a number looks wrong, correct the specific
counter doc (`db.counters.updateOne({_id: '<name>'}, {$set: {seq: <correct>}})`). Reverting
the code is safe — old hook-based numbering resumes.

### Step 2 — Payroll MFA (#607 + #139), together

1. Confirm Part 1 (staging E2E) passed on both branches against each other.
2. Merge **#139** (web-admin) and **#607** (backend) close together.
3. Deploy backend (#607) and web-admin (#139). Communicate to payroll staff: **process
   payroll in web-admin** (`/hr/payroll`), not the legacy UI.
4. Smoke on production: open a real `draft` payroll → approve via the MFA dialog → confirm
   it advances. Do **not** push a real record all the way to `paid` unless that is a genuine
   payroll you intend to pay.

**Rollback:** revert #607 (the backend gate) — payroll mutations stop requiring tier 2 and
the legacy UI works again immediately. #139 (web-admin) can stay; without #607 it simply
prompts MFA pre-emptively and the call succeeds regardless.

### Step 3 — Close out

- Mark #607 / #139 / #609 ready-for-review → merged.
- Update `CLAUDE.md` "Open known issues" to record the F finding as closed end-to-end.

---

## Appendix — verification already done (so you can trust the drafts)

- **#139**: CI **green** — `unit` (Typecheck), `Static guards` (lint/nav), and `integration`
  all pass on the head commit. Type-clean across all 765 web-admin pages.
- **#607**: backend drift guard `payroll-mfa-tier-wave1461` (7 assertions) + the 7 pre-push
  gates pass.
- **#609**: `seed-numbering-counters.js` defaults to dry-run; `computeMaxima` is unit-covered;
  hooks in `JournalEntry` / `HelpDesk` / `InsuranceClaim` / `Invoice` and the inventory
  service were converted to `nextSequence`.

> The only reason these are not already merged is the two production gates above
> (staging E2E for payroll, seed-before-deploy for numbering) — both are owner/ops calls
> because they touch live data and outward-facing behavior.
