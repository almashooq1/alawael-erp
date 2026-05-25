# Pilot Scenario 5 — Monthly Disability Authority periodic report submission

**Type**: Pilot operational walkthrough (PILOT_CYCLE_1.md §4 Scenario 5)
**Audience**: Pilot Admin + Pilot Supervisor + Dev (for first live run)
**Duration**: ~1 hour active work; cron fires automatically once enabled
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 3 (after live credentials available; mock-mode for Week 1-2)

This scenario validates the **government reporting pipeline**:

- DisabilityAuthorityAdapter (W281 — mock-first scaffold)
- Monthly periodic-report cron (W286 — day 5 @ 04:00 Asia/Riyadh)
- Adapter mock vs live mode + W312 GOV lifecycle telemetry

If S5 completes successfully, the **Disability Authority reporting pipeline is production-ready**.

---

## 0. Pre-test setup (15 min in mock mode; 60-90 min for live mode)

⚠️ **GATE — Live credentials availability**

If `DISABILITY_AUTHORITY_BASE_URL` + `DISABILITY_AUTHORITY_API_KEY` + `DISABILITY_AUTHORITY_CENTER_ID` are NOT yet provisioned for the pilot, run in mock mode for the first 2 weeks. Switch to live in Week 3 if creds arrive.

Pilot owner must answer per PILOT_CYCLE_1.md Q5 ("DA sandbox creds — available now or week 3?").

**Setup checklist (both modes)**:

- [ ] **At least 5 active beneficiaries** registered at the pilot branch (so the periodic report has content)
- [ ] **`ENABLE_DA_PERIODIC_CRON=true`** in pilot env
- [ ] **`DA_REPORTING_BRANCH_IDS=<pilot_branch_id>`** (limits cron scope to pilot branch only)
- [ ] **W316 scheduler-registry wired** (verify: GET `/api/ops/schedulers` shows `disability-authority-monthly` entry)
- [ ] **Admin user has read access** to gov reports module

**Mock mode only**:

- [ ] `DA_ADAPTER_MODE=mock` (default if not set)
- [ ] No real network calls fire; adapter returns synthetic acknowledgement IDs (e.g. ending `-MOCK-99` for "expired" sim, `-MOCK-88` for "not found")

**Live mode only**:

- [ ] `DA_ADAPTER_MODE=live`
- [ ] All 3 env vars above set with sandbox creds
- [ ] Tested via 1 manual `/api/disability-authority/adapter/verify-card` call BEFORE letting the cron run for real

---

## 1. The 3 steps

### Step 5.1 — Cron fires on day 5 @ 04:00 Asia/Riyadh (or manual trigger)

**Actor**: System cron OR Admin manual trigger

**Background**: W286 schedules the periodic-report cron at day-5-of-month @ 04:00 Asia/Riyadh. For pilot Week 3, you don't need to wait — the cron can be manually triggered.

**Path A — wait for the cron** (realistic):

- Set up pilot mid-month (say day 1) and let day 5 fire naturally
- Observe overnight; verify run in the morning via scheduler-registry telemetry

**Path B — manual trigger** (recommended for Week 1-2):

```bash
# Run the same job that the cron triggers, scoped to pilot branch:
npm run dev:disability-authority:run-monthly -- --branchId <pilot_branch_id>
```

OR via API (if exposed):

```http
POST /api/v1/disability-authority/monthly-report/trigger
Authorization: Bearer <admin_token>
X-MFA-Tier: 2

{ "branchId": "<pilot_branch_id>", "period": "2026-05" }
```

**Verify**:

- `schedulerRegistry.recordRun('disability-authority-monthly')` entry appears in registry — confirm via `GET /api/ops/schedulers` → `disability-authority-monthly.lastRun` updated
- W312 `gov.report.submission` counter increments — confirm via Prometheus scrape OR via `/api/v1/metrics/gov` if exposed:

  ```text
  gov_report_submission{provider="disability_authority",result="ok"} 1
  ```

  (mock mode returns `ok` deterministically; live mode depends on the real response)

- A `DisabilityAuthorityReport` record (or equivalent submission-log entry) is created with `status='submitted'` (mock) or whatever the live adapter returned

**If it fails**:

- `cron didn't fire` → env vars not set; check `ENABLE_DA_PERIODIC_CRON=true` + `DA_REPORTING_BRANCH_IDS` present
- `503 SERVICE_NOT_WIRED` → disabilityAuthorityBootstrap.wireDisabilityAuthority not called
- `DA_NETWORK` failure code (live mode) → adapter retry; the W282b mudad pattern has 1 retry, DA may differ
- `DA_INVALID_INPUT` (live mode) → payload builder produced a malformed request; this would be a dev escalation BLOCKER for live cutover

---

### Step 5.2 — Adapter sends report (mock OR live)

**Actor**: Adapter (auto-invoked from cron handler)

**Mock mode behavior**:

- Returns synthetic `acknowledgementId` like `DA-ACK-2026-05-MOCK-0001`
- No external network call
- W286 cron records it as `ok` for telemetry consistency
- Useful for: confirming the entire chain wires + flows without depending on a live sandbox

**Live mode behavior**:

- Adapter calls `DISABILITY_AUTHORITY_BASE_URL` with the periodic payload (currently a STUB — production payload builder is deferred per W286 commit message)
- Gets back real `acknowledgementId` or error
- Records actual result code in `gov.report.submission` counter with `reason` label

**Verify**:

- `DisabilityAuthorityReport` (or equivalent log) entry has:
  - `mode` = 'mock' or 'live' (per adapter config at the time)
  - `acknowledgementId` populated (synthetic in mock, real in live)
  - `submittedAt` = ~02:30 Asia/Riyadh (if cron) or now (if manual)
  - `branchId` = pilot branch
- Idempotency: trigger twice within 5 min → second call should NOT create duplicate. Verify by counting `DisabilityAuthorityReport.find({period:'2026-05', branchId:<pid>})` → exactly 1

**If it fails**:

- Duplicate created → idempotency hash broken; the W286 commit mentioned `sha256(immutable inputs)` should prevent this. Investigate.
- Mock mode returns synthetic but with WRONG branchId → adapter config mismatch
- Live mode 5xx → real network/auth issue; investigate via the adapter's retry log

---

### Step 5.3 — Admin reviews report acknowledgement + downstream effects

**Actor**: Admin

**Action via UI**:

1. Navigate to Government → Disability Authority → Submission History
2. Find this month's entry → verify `status='submitted'` + `acknowledgementId` shown
3. Drill into the submitted payload → confirm beneficiary list matches the pilot branch's active beneficiaries

**Action via API**:

```http
GET /api/v1/disability-authority/reports?branchId=<pid>&period=2026-05
Authorization: Bearer <admin_token>
```

**Verify**:

- Report appears in Beneficiary 360 timeline for each beneficiary that was included in the report (if your config does timeline projection — verify per pilot env's setting)
- W316 scheduler-registry `disability-authority-monthly.lastStatus` = 'ok'
- The `gov.report.submission` Prometheus metric increments matching expectation

**If it fails**:

- Submission history empty → step 5.2's report was never persisted; check the cron handler completes synchronously
- `lastStatus` shows 'failed' → expand for the error reason; mock mode should never fail

---

## 2. Acceptance criteria

All 3 steps complete + verified:

- [ ] Cron fires (or manual trigger succeeds) without 503/auth errors
- [ ] W316 scheduler-registry telemetry updated (`lastRun`, `lastStatus`)
- [ ] W312 `gov.report.submission` counter increments with correct labels
- [ ] DisabilityAuthorityReport entry created (mock OR live)
- [ ] Idempotency holds: re-trigger does NOT duplicate
- [ ] Mock-mode and live-mode both demonstrated (in their respective weeks)
- [ ] Beneficiary 360 timeline projection works (if configured)
- [ ] No support ticket opened during the scenario

**This validates: W281 adapter + W286 monthly cron + W312 GOV lifecycle telemetry + W316 scheduler-registry observability.**

## 3. Live-cutover checklist (graduate from mock to live)

When live creds arrive, the pilot owner can graduate:

1. Pilot dev verifies `DA_ADAPTER_MODE=live` works against the SANDBOX env first (not production DA endpoint).
2. Run 1 manual `verify-card` call → success.
3. Run 1 manual monthly-report trigger → success + real acknowledgementId.
4. Compare the live `acknowledgementId` shape against the documented DA contract (length, prefix, etc.).
5. If 1-4 all pass, switch the pilot env to `DA_ADAPTER_MODE=live` permanently. Document the cutover date in the pilot retrospective.

## 4. Cleanup

```bash
npm run pilot:reset-scenario5 -- --period 2026-05 --branch <pid>
```

Soft-deletes the synthetic mock submission entries. **DOES NOT** touch live-mode submissions (those are gov-side official records — never delete).

## 5. Sign-off

| Role                      | Name | Date | Signature |
| ------------------------- | ---- | ---- | --------- |
| Admin                     |      |      |           |
| Supervisor                |      |      |           |
| Dev (mock + live cutover) |      |      |           |
| Pilot PM                  |      |      |           |

## 6. Issues captured during this scenario

Tag SCENARIO:5 + STEP:5.X.

**Likely issues to watch for**:

- Cron firing in wrong timezone → check `Asia/Riyadh` config in node-cron schedule
- Idempotency broken → 2 entries for same month + branch → fix the sha256 hash logic in the bootstrap
- Live mode 401/403 → sandbox creds wrong or expired
- Periodic payload missing fields → live DA rejects with `DA_INVALID_INPUT`; the stub builder may need real-data work before live cutover

---

## Key design decisions (for this walkthrough)

1. **Mock-mode default, live opt-in** — pilot doesn't depend on external sandbox creds; can validate the entire chain locally Week 1-2 then switch in Week 3.
2. **Idempotency check in step 5.2** — duplicate submissions to a gov authority are problematic; the W286 cron uses sha256-of-immutable-inputs to prevent. Test this explicitly.
3. **Live-cutover checklist as §3** — separate from the happy path. Pilot dev follows this when live creds arrive.
4. **NEVER delete live submissions in cleanup** — gov submissions are immutable official records.

## Recommended next step

After Admin + Supervisor + Dev sign off:

1. Capture issues in `#pilot-cycle-1`.
2. If running mock-only → schedule live-cutover meeting for Week 3.
3. If live cutover successful → mark the W281+W286 chain production-ready for gov reporting.

---

## Pilot Scenario Suite — COMPLETE (5/5)

This commit ships the last of the 5 detailed scenario walkthroughs:

- ✅ `SCENARIO_1_INTAKE_TO_FIRST_SESSION.md` — foundational intake chain (W324-W332 + W352 + W276c)
- ✅ `SCENARIO_2_REASSESSMENT_REVISION.md` — re-assessment → AI recommendation → CarePlanVersion v2 (W325 P2 + W41 + W334 + W332)
- ✅ `SCENARIO_3_CAPA_END_TO_END.md` — quality finding → CAPA full lifecycle (W337-W349, 8-layer stack)
- ✅ `SCENARIO_4_TRANSPORT_HIKVISION.md` — operations + attendance (W96-W114 + W327 + W335)
- ✅ `SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md` — government reporting (W281 + W286 + W312 + W316) ← this commit

5 walkthroughs cover the 7 ready phases of the platform end-to-end. Pilot Cycle 1 has everything documented to start as soon as a pilot branch + stakeholder sign-off are in place.
