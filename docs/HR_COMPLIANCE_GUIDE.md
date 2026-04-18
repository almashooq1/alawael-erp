# HR Compliance Guide — daily / weekly / monthly workflow

One-page reference for the HR manager running Al-Awael. Covers the
three compliance surfaces that determine whether a therapist can
legally see patients in Saudi Arabia:

| Surface               | What it proves                                      | Where                  |
| --------------------- | --------------------------------------------------- | ---------------------- |
| **GOSI**              | The employer/employee social-insurance tie is live. | `/admin/hr/compliance` |
| **SCFHS license**     | The therapist is legally allowed to practice.       | `/admin/hr/compliance` |
| **SCFHS CPE credits** | Renewal eligibility (100 hrs / 5-year cycle).       | `/admin/hr/cpe`        |

All three feed the same employee record. If any one fails at the
moment an auditor walks in, the therapist is not compliant — even if
the other two are green.

---

## Daily — 5 minutes (every morning)

**Goal:** catch anything that broke overnight before clinicians start seeing patients.

1. Run the CPE attention digest from any shell:

   ```bash
   make cpe-attention     # or: npm run cpe:attention
   ```

   - Exit **0** → nothing to do, close the terminal.
   - Exit **1** → one or more therapists are in the 180-day attention window. The digest lists them sorted by days-to-deadline. Open `/admin/hr/cpe` and follow the [CPE runbook](runbooks/cpe-attention.md).
   - Exit **2** → tooling problem (DB unreachable, bad data). Ping platform on-call, not something to debug from HR.

2. Scan `/admin/hr/compliance` for chips that flipped:

   - A **red GOSI chip** (`اشتراك موقوف`) means someone's employer-side payment lapsed — the therapist might be technically uninsured. Escalate to finance.
   - A **red SCFHS chip** (`منتهٍ` / `موقوف`) means the license itself is down. Therapist must not see patients until resolved. The [gov-adapter-misconfigured runbook](runbooks/gov-adapter-misconfigured.md) helps rule out "our integration is broken" before you chase the therapist.

3. If either chip is stale (>7 days since last verify), click the per-row verify button to refresh. Batch-verify is available in the top-right.

---

## Weekly — 15 minutes (Sunday morning)

**Goal:** process anything HR was supposed to review this week.

1. **CPE pending verification queue**

   - `/admin/hr/cpe` → filter by **بانتظار التوثيق** (pending verification).
   - Any record sitting there >14 days is HR drift. Review the proof, verify the record with the ✓ button, or delete if the proof is invalid.
   - This is the single biggest cause of a "non-compliant" verdict on the Daily digest — a therapist may have done the hours, you just haven't flipped the bit.

2. **SCFHS expiry watchlist**

   - Same page → "قائمة المتابعة" (watchlist) panel shows therapists in the 180-day window.
   - Click **الملخّص** (Summary) for each. The per-category deficit tells you which gap to close:
     - Category 1 short → register them for the nearest SCFHS-accredited conference.
     - Category 2 short → self-directed reading/journal clubs (easiest to fix).
     - Category 3 short → assign supervision/in-house training with the clinical director.

3. **Adapter-audit spot check**
   - `/admin/adapter-audit?op=verify` for the last 7 days. If any row has `success=false` with `errorMessage` pointing at GOSI/SCFHS, follow up the affected therapist's chip status.

---

## Monthly — 30 minutes (1st business day)

**Goal:** produce the compliance artifacts the business needs to defend itself to regulators.

1. **Download the CPE audit sheet**

   - `/admin/hr/cpe` → **تصدير CSV** (top-right).
   - Optionally filter by year with the date range before clicking.
   - File is UTF-8 with BOM so Excel renders Arabic correctly. Columns are hydrated with employee name + SCFHS number so the sheet stands alone — no DB needed to read it.
   - Archive in the HR SharePoint folder named for the month.

2. **Review the compliance counters**

   - `/admin/hr/cpe` overview cards should show ≥95% compliant for a healthy clinic.
   - A month-over-month drop in **ملتزمون** (compliant) is the earliest signal of systemic drift — usually means a new cohort of therapists hasn't been onboarded into the credit-tracking workflow. Reach out to the clinical director.

3. **Expiry forecast for next 12 months**
   - Pull the employee list filtered by SCFHS expiry date. Anyone expiring in the next 6–12 months should have a renewal plan in place now, not when they hit the 180-day attention window.

---

## Quarterly — 2 hours

1. **Policy review** — do the per-category minimums still match SCFHS regulation?

   - If SCFHS publishes a change, update `SCFHS_CPE_MIN_CAT1/2/3/TOTAL` env vars in production config. Do **not** hardcode — the env override exists for exactly this.
   - Update the runbook + this guide + the HR policy doc in the same PR.

2. **Onboarding audit** — does every new therapist hired this quarter have a complete SCFHS record + ≥1 CPE entry? New hires often slip through because the onboarding checklist predates the CPE surface.

---

## Escalation paths

| Symptom                                          | Who owns it                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Therapist's license expired and they're on shift | Clinical director (stop their sessions)                               |
| GOSI chip red for >48h                           | Finance (verify the subscription)                                     |
| SCFHS adapter returning errors                   | Platform on-call ([circuit runbook](runbooks/gov-adapter-circuit.md)) |
| CPE attention list keeps growing                 | Clinical director (systemic gap)                                      |
| Compliance counts wrong vs manual reconciliation | Platform on-call (data integrity bug)                                 |

---

## Related docs

- [cpe-attention.md](runbooks/cpe-attention.md) — operator runbook for the CPE cron
- [dsar-adapter-audit.md](runbooks/dsar-adapter-audit.md) — handling PDPL access requests
- [gov-adapter-misconfigured.md](runbooks/gov-adapter-misconfigured.md) — when an adapter silently stops working
- [OPERATIONS.md](OPERATIONS.md) — the platform-wide operator front door
