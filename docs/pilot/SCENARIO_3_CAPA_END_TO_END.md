# Pilot Scenario 3 — Quality Finding → CAPA → Close (W337-W349 chain validation)

**Type**: Pilot operational walkthrough (PILOT_CYCLE_1.md §4 Scenario 3)
**Audience**: Pilot Admin + Pilot Therapist (CAPA owner) + Pilot Supervisor
**Duration**: ~3 hours of real work spread over 3-5 days (CAPA lifecycle needs realistic work-time between states)
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 2 (after S1 establishes a beneficiary + after Audit infrastructure has at least 1 ACTIVE scope)

This scenario validates the entire **CAPA 8-layer stack** shipped in W337-W349:

- W337 lib + model + drift guard
- W340 pre('save') hook enforcing lifecycle transitions
- W344 service + bootstrap + cron sweeper
- W345 REST CRUD (8 endpoints)
- W346 producer service (audit/RCA/FMEA → CAPA)
- W348 producer REST routes
- W349 quality.capa.overdue subscriber + bus-wiring bug fix

If S3 completes successfully end-to-end, **the entire CAPA infrastructure is production-ready**.

---

## 0. Pre-test setup (20 min)

Before starting:

- [ ] **At least 1 AuditOccurrence in 'in_progress' status** exists for the pilot branch (seed via `npm run seed:audit-pilot` or admin manually creates one via Audit module)
- [ ] **Therapist user has MFA tier 2 set up** (required for CAPA verify-close in step 3.7)
- [ ] **Supervisor user has MFA tier 2 set up** (required for VERIFIED→CLOSED + ANY→REJECTED per W344 service-layer defense)
- [ ] **Quality event bus is wired** (verify by hitting GET `/api/quality/branch-heatmap/health` — if it returns 200, the bus is initialized)
- [ ] **ENABLE_CAPA_SWEEPER=true** in pilot env (so step 3.9 can observe the cron behavior)
- [ ] **`app._capaService` is wired** (smoke-test: GET `/api/quality/capa/health` returns 200 with the lib's LIFECYCLE_STATES)

---

## 1. The 9 steps

### Step 3.1 — Admin runs scheduled AuditOccurrence

**Actor**: Admin (role=admin_branch)

**Action via UI**:

1. Navigate to Quality → Audit → Open the pre-seeded scope
2. Click "بدء التدقيق" → status auto-transitions to `in_progress`
3. (Sub-step) Walk the audit checklist — but DON'T add findings yet (step 3.2)

**Action via API** (smoke):

```http
GET /api/v1/quality/audit/occurrences/<oid>
Authorization: Bearer <admin_token>
```

**Verify**:

- `status === 'in_progress'`
- `findings[]` is empty initially
- `auditNumber` follows the AUD-YYYY-NNNN pattern (per AuditOccurrence pre('validate') hook)

**If it fails**:

- `404 NOT_FOUND` → no pilot AuditScope exists. Seed one or create via Quality module.

---

### Step 3.2 — Admin adds an audit finding

**Actor**: Admin

**Action via UI**:

1. From the open occurrence → "+ إضافة ملاحظة"
2. Fill: type='minor_nc', description='Process X not following SOP', owner (will be Therapist for this scenario)
3. Click "حفظ" → finding gets added to the occurrence's findings[] array
4. **Do NOT** click "Create CAPA" yet — that's step 3.3 to be done deliberately via the W348 endpoint

**Action via API**:

```http
PATCH /api/v1/quality/audit/occurrences/<oid>/findings
{
  "type": "minor_nc",
  "description": "Process X not following SOP",
  "ownerUserId": "<therapist_user_id>",
  "clauseRef": "ISO 9001:8.5",
  "evidence": "audit log #234"
}
```

**Expected response**: `201 Created` with the new finding's `_id` (this is the `findingId` used in step 3.3).

**Verify**:

- `findings.length === 1`
- `findings[0]._id` is populated (note this — needed for step 3.3)
- `findings[0].capaCreated === false` (no CAPA spawned yet — strict state, validates the W348 contract that creation is explicit)

---

### Step 3.3 — Admin creates CAPA from finding (W348 producer route)

**Actor**: Admin

**Action via UI**:

1. From the finding card → click "إنشاء إجراء تصحيحي"
2. Optionally override dueDate (default = +30 days per W346 \_defaultDueDate)
3. Confirm

**Action via API** (validates W348 endpoint):

```http
POST /api/v1/quality/capa-producers/audit/<occurrenceId>/findings/<findingId>
Authorization: Bearer <admin_token>
Content-Type: application/json

{ }    // optional body: ownerUserId / dueDate overrides
```

**Expected response**: `201 Created` with `{ "success": true, "capa": { "_id": "<capaId>", "capaNumber": "CAPA-2026-NNNN", ... }, "parent": { "id": "<occurrenceId>", "type": "AuditOccurrence" } }`

**Verify** (this step validates W346 producer + W348 route + W337 model + W340 hook):

- `capa.capaNumber` follows the CAPA-YYYY-NNNN pattern (W337 pre('validate'))
- `capa.priority === 'medium'` (W346 mapping: minor_nc → medium)
- `capa.type === 'corrective'` (W346 audit producer always uses corrective)
- `capa.source === { module: 'audit', refId: <occurrenceId>, collection: 'audit_occurrences' }` (W346 source routing)
- `capa.status === 'OPEN'` (default, per W337 schema)
- `capa.dueDate` is +30 days from now (W346 default)
- **W348 side-effect** — re-read the AuditOccurrence: `findings[0].linkedCapaId === <capaId>` and `findings[0].capaCreated === true`
- **W349 event emitted**: check logs for `[quality-eventbus] emit quality.capa.created` (the W349 subscriber logs every CAPA event)

**If it fails**:

- `400 INVALID_INPUT` — missing required fields. Check the W346 contract.
- `404 MISSING_SUB_DOC` — finding.\_id from step 3.2 is wrong. Re-fetch occurrence.
- `404 PARENT_NOT_FOUND` — occurrenceId wrong.
- `503 SERVICE_NOT_WIRED` — capaBootstrap.wireCapa wasn't called at app startup. **This is a deployment bug — escalate to dev team**.

---

### Step 3.4 — Therapist starts work (OPEN → IN_PROGRESS)

**Actor**: Therapist (the CAPA owner from step 3.3)

**Action via UI**:

1. Login as therapist → "إجراءاتي التصحيحية" queue → open the new CAPA
2. Read the finding context (rootCause field shows the audit clauseRef)
3. Click "بدء العمل"

**Action via API** (validates W345 REST + W340 hook):

```http
POST /api/v1/quality/capa/<capaId>/transition
Authorization: Bearer <therapist_token>

{ "to": "IN_PROGRESS", "notes": "Starting work on SOP gap" }
```

**Expected response**: `200 OK` with updated CAPA. `mfaTier` is NOT required here per W337 lib (OPEN→IN_PROGRESS is a routine transition).

**Verify**:

- `capa.status === 'IN_PROGRESS'`
- `capa.lifecycleHistory.length === 1` — new entry: `{fromStatus:'OPEN', toStatus:'IN_PROGRESS', actor:<therapistId>, at:<now>}`
- W340 pre('save') hook validated the transition: invalid skip (OPEN→IMPLEMENTED) would have been rejected

**If it fails**:

- `422 INVALID_TRANSITION` — wrong target status. OPEN can go to IN_PROGRESS / REJECTED / CANCELLED only.
- `403 MFA_TIER_INSUFFICIENT` — service-layer defense fired even though lib doesn't require tier for this transition. Bug — escalate.

---

### Step 3.5 — Therapist marks IMPLEMENTED (after doing the actual work)

**Actor**: Therapist (AFTER 1-3 days of doing the actual work in real life)

**Action via UI**:

1. Open the CAPA → "تم التنفيذ"
2. Fill `verificationEvidence` field: "Updated SOP. Trained team. Posted in break room."
3. Submit

**Action via API**:

```http
POST /api/v1/quality/capa/<capaId>/transition
{
  "to": "IMPLEMENTED",
  "notes": "SOP updated + team trained. Evidence in #pilot-evidence channel."
}
```

**Verify**:

- `capa.status === 'IMPLEMENTED'`
- `capa.implementedAt` is set to now (W344 service layer auto-populates)
- `lifecycleHistory.length === 2`
- The previous (IN_PROGRESS) entry was NOT modified — append-only audit trail

---

### Step 3.6 — Supervisor verifies (IMPLEMENTED → VERIFIED)

**Actor**: Supervisor

**Action via UI**:

1. Login as supervisor → "للمراجعة" queue → open this CAPA
2. Review the verificationEvidence + ask therapist questions if needed
3. Click "تحقق + قبول"

**Action via API**:

```http
POST /api/v1/quality/capa/<capaId>/transition
Authorization: Bearer <supervisor_token>

{ "to": "VERIFIED", "notes": "Walked the break room — SOP visible. Team can recite the new procedure." }
```

**Verify**:

- `capa.status === 'VERIFIED'`
- `capa.verifiedAt` is set
- `lifecycleHistory.length === 3`

**If supervisor rejects the verification** (FAILED → IN_PROGRESS variant):

```http
POST /api/v1/quality/capa/<capaId>/transition
{
  "to": "IN_PROGRESS",
  "reasonCode": "VERIFICATION_FAILED",
  "notes": "SOP not posted in break room as claimed. Re-verify after fix."
}
```

W337 lib REQUIRES `reasonCode` on IMPLEMENTED→IN_PROGRESS. Without it, route returns `400 REASON_CODE_REQUIRED`.

---

### Step 3.7 — Supervisor signs off (VERIFIED → CLOSED, MFA tier 2 required)

**Actor**: Supervisor

**Action via UI**:

1. From the VERIFIED CAPA → "إغلاق نهائي"
2. **MFA tier 2 step-up prompt appears** (because W337 lib + W344 service both require tier 2 on VERIFIED→CLOSED)
3. Enter OTP / approve via authenticator
4. Final sign-off submitted

**Action via API**:

```http
POST /api/v1/quality/capa/<capaId>/transition
Authorization: Bearer <supervisor_token>
X-MFA-Tier: 2

{ "to": "CLOSED", "notes": "Effective. Closing." }
```

**Verify**:

- `capa.status === 'CLOSED'`
- `capa.closedAt` is set
- `capa.closedBy === <supervisor_id>`
- `lifecycleHistory.length === 4` (final entry)
- Status is now TERMINAL — further transitions rejected by W337 lib + W344 service

**If MFA tier 2 not provided**:

- `403 MFA_TIER_INSUFFICIENT` — service-layer defense (W344) fires BEFORE the hook. Re-submit with the X-MFA-Tier:2 header.

**W349 event emitted**: log shows `[quality-eventbus] emit quality.capa.closed`. The W349 subscriber logs this event (closed CAPAs are NOT alerts but the subscriber tracks them).

---

### Step 3.8 — Admin checks Branch Quality Heatmap

**Actor**: Admin OR Supervisor (read-only)

**Action via UI**:

1. Navigate to Quality → Dashboards → Branch Quality Heatmap
2. Filter to pilot branch
3. Verify the heatmap reflects the CLOSED CAPA

**Action via API** (validates W350+W378 + W355 cache):

```http
GET /api/v1/quality/branch-heatmap?branchIds=<pilot_branch_id>
Authorization: Bearer <supervisor_token>
```

**Verify**:

- `branches[0].cells['capa.open'].value` decreased by 1 (because this CAPA moved from OPEN to CLOSED)
- `branches[0].cells['capa.overdue'].value` did NOT increase (we closed it BEFORE dueDate)
- `branches[0].cells['capa.critical'].value` is unchanged (this CAPA was priority=medium)
- `branches[0].severity` is `ok` or `warning` depending on other branch state
- **Cache observation**: hit the endpoint TWICE within 60s. The 2nd response should be served from W355 LRU cache. Check `/cache/stats` → `hits` increments.

---

### Step 3.9 — Confirm cron sweeper doesn't fire on closed item

**Actor**: Anyone with read access (verify next-day or trigger sweep manually)

**Action via API** (manual sweep — requires MFA tier 2 per W345):

```http
POST /api/v1/quality/capa/sweep
Authorization: Bearer <supervisor_token>
X-MFA-Tier: 2
```

**Expected response**: `200 OK` with `{ "success": true, "scanned": N, "emitted": M }` where the CAPA from this scenario is NOT in the M count (because it's CLOSED, NOT overdue).

**Verify**:

- Log does NOT show `[capa-alerts] OVERDUE capa=CAPA-2026-NNNN` for our CAPA (CLOSED items are excluded from sweeper output per W344 contract)
- W349 subscriber tracks the closed CAPA correctly

---

## 2. Acceptance criteria

All 9 steps complete end-to-end. Specifically:

- [ ] CAPA created via W348 producer route (audit finding → CAPA)
- [ ] CAPA transitioned OPEN → IN_PROGRESS → IMPLEMENTED → VERIFIED → CLOSED (5 states)
- [ ] All transitions enforced by W340 pre('save') hook (no skips like OPEN→IMPLEMENTED)
- [ ] MFA tier 2 challenged on VERIFIED→CLOSED (W344 service-layer defense)
- [ ] `lifecycleHistory` has 4 entries (one per transition), append-only
- [ ] AuditOccurrence finding back-linked via `linkedCapaId` + `capaCreated:true`
- [ ] Branch Quality Heatmap (W350-W378) reflects the closed CAPA in `capa.open` count
- [ ] Cron sweeper does NOT emit overdue alert for this closed CAPA
- [ ] W349 subscriber log shows the event chain (created → transitioned×4 → no overdue)
- [ ] No support ticket opened during the scenario

**This scenario VALIDATES the entire CAPA 8-layer stack (W337+W340+W344+W345+W346+W348+W349). If all 10 acceptance items pass, the CAPA infrastructure is production-ready.**

## 3. Variants to also test (optional, ~30 min each)

### 3a. REJECTION path (Admin filed in error)

After step 3.3 (CAPA in OPEN), admin or supervisor rejects:

```http
POST /api/v1/quality/capa/<capaId>/transition
X-MFA-Tier: 2
{ "to": "REJECTED", "reasonCode": "DUPLICATE_FINDING", "notes": "Already tracked in CAPA-2026-0042" }
```

**Verify**:

- `capa.status === 'REJECTED'` (terminal)
- W337 lib requires both `reasonCode` AND MFA tier 2 — try without each to confirm errors
- AuditOccurrence finding.linkedCapaId is preserved (we don't unlink on rejection)

### 3b. CANCELLATION path (CAPA superseded)

From IMPLEMENTED:

```http
POST /api/v1/quality/capa/<capaId>/transition
{ "to": "CANCELLED", "reasonCode": "SUPERSEDED_BY_CAPA-2026-0043", "notes": "Merged into broader CAPA" }
```

**Verify**:

- W337 lib requires reasonCode on CANCELLED transitions
- Status is terminal — no further moves allowed

### 3c. RCA → CAPA producer (different source module)

Pre-requisite: have an RcaInvestigation with at least 1 rootCause. Then:

```http
POST /api/v1/quality/capa-producers/rca/<rcaId>/root-causes/<rootCauseId>
{ }
```

**Verify**:

- `capa.source.module === 'rca'`
- `capa.priority` derived from rootCause severity (W346 mapping: 1-2→low, 3-4→medium, 5→high, both root+rca ≥6→critical)
- `rcaDoc.rootCauses[X].linkedCapaId` + `addressed:true` set

### 3d. FMEA → CAPA producer

Pre-requisite: have an FmeaWorksheet with at least 1 row.actions. Then:

```http
POST /api/v1/quality/capa-producers/fmea/<fmeaId>/rows/<rowId>/actions/<actionId>
{ }
```

**Verify**:

- `capa.source.module === 'fmea'`
- `capa.type === 'preventive'` (FMEA is forward-looking — W346 contract)
- `capa.priority === row.actionPriority` (verbatim)
- `fmeaDoc.relatedCapaIds[]` has the new CAPA pushed to it

---

## 4. Cleanup (for re-running)

```bash
npm run pilot:reset-scenario3 -- --capa <capaId>
```

Soft-deletes the CAPA + un-back-links from AuditOccurrence.findings[].linkedCapaId.
`lifecycleHistory` is PRESERVED (audit trail), the `deleted_at` field is set.

## 5. Sign-off

| Role                   | Name | Date | Signature |
| ---------------------- | ---- | ---- | --------- |
| Admin                  |      |      |           |
| Therapist (CAPA owner) |      |      |           |
| Supervisor             |      |      |           |

Pilot PM countersigns once all 3 sign:

| Role     | Name | Date | Signature |
| -------- | ---- | ---- | --------- |
| Pilot PM |      |      |           |

## 6. Issues captured during this scenario

Use the PILOT_CYCLE_1.md §7 template; tag SCENARIO:3 + STEP:3.X.

**Likely issues to watch for** (based on the W337-W349 implementation history):

- W349 silent-no-op regression (if quality.capa.\* events don't emit, the bus wiring bug is back — escalate immediately as BLOCKER)
- Missing app.\_capaService (capaBootstrap.wireCapa not called) → all CAPA endpoints 503 — BLOCKER deployment fix
- W345 producer routes 404 → bootstrap mount typo — BLOCKER deployment fix
- Cache TTL longer than expected → check `/cache/stats` hit rate; tune the 60s default if needed

---

## Key design decisions (for this walkthrough)

1. **Realistic CAPA cycle time** — 3-5 days, NOT 30-minute click-through. The lifecycle states model real work being done; squeezing them all into 30 min defeats the validation point.
2. **Variants 3a-d as OPTIONAL** — happy path is mandatory; rejection / cancellation / RCA-producer / FMEA-producer can wait for Week 3.
3. **MFA tier 2 emphasized explicitly** — pilot users will hit this and need to know it's expected, not a bug.
4. **Heatmap consequence in step 3.8** — connects CAPA work to dashboard observability. Pilot supervisors should see that their actions ripple to the daily dashboard view.
5. **No screenshots committed** — UI may evolve.

## Recommended next step

After all 3 staff users sign off:

1. Capture issues in `#pilot-cycle-1`.
2. If 0 BLOCKERs, the CAPA 8-layer stack is **production-ready** — green-light any pilot rollout planning.
3. If ≥1 BLOCKER, hot-fix per PILOT_CYCLE_1.md §7 hotfix definition + re-run from the failing step.

Sister docs:

- ✅ `SCENARIO_1_INTAKE_TO_FIRST_SESSION.md` (shipped earlier)
- ✅ `SCENARIO_3_CAPA_END_TO_END.md` (this commit)
- 🟡 `SCENARIO_2_REASSESSMENT_REVISION.md` (PILOT_CYCLE_1.md §4 S2)
- 🟡 `SCENARIO_4_TRANSPORT_HIKVISION.md` (S4)
- 🟡 `SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md` (S5)
