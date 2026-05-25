# Pilot Scenario 2 — Re-assessment cycle → plan revision → family re-approval

**Type**: Pilot operational walkthrough (PILOT_CYCLE_1.md §4 Scenario 2)
**Audience**: Pilot Therapist + Pilot Supervisor + Pilot Family member
**Duration**: ~2 hours of real work spread over 1-2 days (less than S1 because the beneficiary already exists)
**Status**: 📋 Draft — execute during Pilot Cycle 1 Week 1-2 (AFTER S1 establishes the beneficiary + active plan)

This scenario validates the **re-assessment → AI recommendation → revision** path:

- Periodic Assessment (W325 P2 measure lifecycle)
- Care-plan plateau detection cron (W41)
- AiRecommendationBundle approval flow (W334 Pass 1-2: lib + model + hook + service)
- CarePlanVersion v2 creation + supersedes v1
- PlanReviewAck v2 (new family signature row)

If S2 completes successfully, the **re-assessment → revision pipeline is production-ready**.

---

## 0. Pre-test setup (5 min — assumes S1 completed)

- [ ] **S1 completed** — beneficiary exists, active episode, ACTIVE CarePlan v1, family signed v1
- [ ] **Therapist + Supervisor MFA tier 2 still active** (re-used from S1)
- [ ] **`app._aiRecommendationService` is wired** (smoke: GET `/api/v1/ai-recommendations/health` returns 200 with confidenceThresholds)
- [ ] **`ENABLE_AI_RECOMMENDATION_CRON=true`** in pilot env (so step 2.2 plateau detector can fire OR manually trigger)
- [ ] **For step 2.2 simulation**: the W41 plateau detector needs ≥2 prior sessions with low/no goal progress. If S1 only delivered 1 session, EITHER deliver 2 more low-progress sessions FIRST (real-world data) OR use the API admin-trigger to inject a plateau signal.

**Real-world flow assumption**: this scenario typically runs 90+ days after S1 (matching the periodic assessment cadence per W325 P2 reassessment due logic). For a 4-week pilot, we COMPRESS this by manually triggering the cron + accepting that some realistic-cycle observations get abbreviated.

---

## 1. The 6 steps

### Step 2.1 — Therapist runs periodic Assessment (90d after S1.4)

**Actor**: Therapist

**Action via UI**:

1. Login as therapist → Beneficiary 360 → "تقييمات" tab → "+ تقييم جديد"
2. Beneficiary picker → select the S1 beneficiary (still active)
3. Measure picker → pick the SAME ACTIVE MeasurementMaster used in S1.4 (for baseline comparison)
4. Fill score fields (this time with FOLLOW-UP score — show some progress or plateau)
5. Add narrative summary highlighting any plateau
6. Submit

**Action via API**:

```http
POST /api/v1/assessments
Authorization: Bearer <therapist_token>

{
  "beneficiaryId": "<bid_from_S1>",
  "episodeId": "<eid_from_S1>",
  "measureId": "<same_mid_as_S1.4>",
  "score": 74,
  "scoreUnits": "percent",
  "narrative": "Follow-up. Some progress on social interaction; fine motor unchanged after 90 days — plateau signal.",
  "performedBy": "<therapist_user_id>",
  "branchId": "<pilot_branch_id>",
  "assessmentType": "periodic"
}
```

**Verify**:

- New `MeasureResult` created (NOT replacing S1.4's — it's append-only)
- `assessmentType === 'periodic'` (the field that lets the cron differentiate from initial)
- Baseline comparison: the response (or the Beneficiary 360 timeline) shows the DELTA from S1.4 score (here: +2 = modest progress, but the narrative flags plateau on fine motor)
- **W325 P2 invariant**: status starts as `ACTIVE` (registered via dynamic enum from measure-lifecycle.lib.js)

**If it fails**:

- Same potential errors as S1.4. If the same measure isn't available, use a discipline-equivalent measure and document the swap.

---

### Step 2.2 — Care-plan-plateau-detector cron fires + creates AiRecommendationBundle

**Actor**: System (scheduled cron, OR manual admin trigger)

**Background**: W41 care-plan-plateau-detector runs daily (typically @ 02:00 Asia/Riyadh). It scans active care plans + goal progress entries; when a goal shows <5% progress over the last 30 days AND there are ≥3 sessions in that window, it emits a plateau signal → AiRecommendationBundle (W334).

**Two paths to trigger**:

**Path A — wait for the cron** (real-world realistic):

- Run the assessment in 2.1 + a few low-progress sessions over 2-3 days
- Cron fires next 02:00 Asia/Riyadh
- Check W352 therapist workload + W350 heatmap to see plateau-flagged goal

**Path B — manual admin trigger** (recommended for pilot Week 1-2 time constraints):

```http
POST /api/v1/ai-recommendations/sweep
Authorization: Bearer <admin_token>
X-MFA-Tier: 2
```

**Expected response**: `200 OK` with `{ "success": true, "scanned": N, "created": M }` where M ≥ 1 if the test data simulates a plateau.

**Verify** (validates W334 Pass 1+2):

- New `AiRecommendationBundle` exists with:
  - `beneficiaryId === <bid_from_S1>`
  - `type === 'REVISE_GOAL'` or similar plateau-driven type
  - `confidence` ≥ 0.7 → `status === 'PENDING_REVIEW'` (per W334 lib confidence thresholds)
  - `confidence` ∈ [0.5, 0.7) → `status === 'DRAFT'` (tuning band, not surfaced)
  - `confidence` < 0.5 → `status === 'DISCARDED'` (auto)
- `expiresAt === createdAt + 7 days` (per W334 lib computeExpiry)
- Appears in Beneficiary 360 timeline as "AI recommendation pending review"

**If it fails**:

- `M === 0` → not enough plateau signal in test data. Add 2-3 more low-progress sessions OR temporarily lower the plateau threshold (env override, dev-only).
- `503 SERVICE_NOT_WIRED` → app.\_aiRecommendationService not initialized. Check aiRecommendationBootstrap was called.

---

### Step 2.3 — Supervisor reviews recommendation + APPROVES (MFA tier 2)

**Actor**: Supervisor

**Action via UI**:

1. Login as supervisor → "توصيات الذكاء الاصطناعي" queue → open the PENDING_REVIEW bundle
2. Read the recommendation: `type` + `signals[]` (each shows name + weight + evidence — the explainability)
3. Read the `draftAction` (the proposed change)
4. Click "اعتماد" → **MFA tier 2 step-up prompt** (W340 hook + W344 service-layer enforce)
5. Enter OTP / approve

**Action via API**:

```http
POST /api/v1/ai-recommendations/<bundleId>/approve
Authorization: Bearer <supervisor_token>
X-MFA-Tier: 2

{ "notes": "Plateau confirmed on fine motor goal. Approving revision proposal." }
```

**Verify** (validates W334 lib + W340 hook chain):

- `bundle.status === 'APPROVED'` (terminal per W334 lib)
- `bundle.reviewedBy === <supervisor_id>`, `reviewedAt` set
- `bundle.lifecycleHistory[]` extended with new entry
- W340 hook validated: VERIFIED→CLOSED-style transition required tier 2 OR rejected via `403 MFA_TIER_INSUFFICIENT`

**If supervisor REJECTS instead** (valid alternate path):

```http
POST /api/v1/ai-recommendations/<bundleId>/reject
{ "reasonCode": "INSUFFICIENT_EVIDENCE", "notes": "Plateau may be seasonal — wait 30d more." }
```

`reasonCode` REQUIRED per W334 lib REQUIRED_REASON_TRANSITIONS (PENDING_REVIEW→REJECTED).
MFA tier 1 sufficient for rejection (less significant than approval).

---

### Step 2.4 — Supervisor opens revision; creates CarePlan v2

**Actor**: Supervisor (continues from 2.3)

**Action via UI**:

1. From the APPROVED bundle → click "إنشاء نسخة معدّلة من الخطة"
2. CarePlan editor opens pre-populated with v1's content + bundle's draftAction applied
3. Modify the flagged goal (e.g. add intermediate sub-goal, change intervention frequency)
4. Verify other goals unchanged or update as needed
5. Save as DRAFT v2

**Action via API**:

```http
POST /api/v1/care-plans/<plan_id>/revisions
Authorization: Bearer <supervisor_token>

{
  "basedOnBundleId": "<bundleId>",
  "changes": [
    {
      "goalId": "<flagged_goal_id>",
      "action": "modify",
      "newCriteria": "Observed in 5/5 sessions, with intermediate buttoning task added"
    }
  ],
  "revisionReason": "AI-recommended; plateau on fine motor"
}
```

**Expected response**: `201 Created` with new `CarePlanVersion` v2.

**Verify**:

- `CarePlanVersion.versionNumber === 2`
- `CarePlanVersion.status === 'DRAFT'`
- v1 status changes to `SUPERSEDED` (the plan-version state machine in W332 registry handles this transition)
- `revisionReason` populated + links back to bundleId for audit

---

### Step 2.5 — Supervisor approves v2 (MFA tier 2 again, same as S1.6)

**Actor**: Supervisor

Same action + API as S1.6 but on the v2 plan:

```http
POST /api/v1/care-plans/<plan_id>/versions/2/approve
X-MFA-Tier: 2

{ "approverNotes": "Revision is sound — approving" }
```

**Verify**:

- `CarePlanVersion v2.status === 'ACTIVE'`
- v1 fully `SUPERSEDED` + not editable
- New `PlanReviewAck` v2 row created (different from S1's v1)
- W303-W308 audit chain extends with the v2 entries
- Beneficiary 360 timeline shows the v1→v2 transition with the bundle link as the cause

---

### Step 2.6 — Family receives revision notification + signs v2

**Actor**: Family pilot user (same guardian from S1.9)

**Action via UI**:

1. Family receives notification ("Your plan has been updated")
2. Family logs in to portal
3. Opens v2 plan summary — sees v1→v2 diff (per W41 + W332 family-safe view)
4. Click "أوافق على التحديث"
5. Sign

**Action via API**:

```http
POST /api/v1/parent-portal/plan-reviews/<v2_plan_review_ack_id>/sign
Authorization: Bearer <family_token>

{ "signatureMethod": "in_app", "signature": "<base64_or_attestation>" }
```

**Verify**:

- `PlanReviewAck v2.familySigned === true`
- `PlanReviewAck v2.familySignedAt` populated
- v1's PlanReviewAck is UNCHANGED (it stays signed; v2 is a NEW row, append-only)
- W303-W308 audit chain has BOTH v1 and v2 acks visible + verifiable
- Beneficiary 360 timeline shows "Family approved revision"

---

## 2. Acceptance criteria

All 6 steps complete + verified:

- [ ] Periodic Assessment created with score + narrative + assessmentType='periodic'
- [ ] AiRecommendationBundle created (via cron or manual trigger) — status PENDING_REVIEW with confidence ≥ 0.7
- [ ] Bundle APPROVED by supervisor with MFA tier 2 (W340 hook validated)
- [ ] CarePlan v2 created with revision linked to the approved bundle
- [ ] v2 APPROVED + v1 SUPERSEDED (W332 registry enforced the transition)
- [ ] PlanReviewAck v2 created + family signed
- [ ] W303-W308 audit chain extended for v2 (both v1 + v2 entries verifiable)
- [ ] Beneficiary 360 timeline shows full chain: assessment → bundle → revision → re-approval → family signature
- [ ] No support ticket opened

**This validates: W325 P2 measure lifecycle + W41 plateau detection + W334 AiRecommendationBundle chain + W332 CarePlan registry + W303-W308 audit chain + W276c family portal.**

## 3. Variants (optional)

### 2a. Bundle REJECTED instead of approved

After step 2.2 (bundle in PENDING_REVIEW), supervisor decides the AI signal is premature and REJECTS with reasonCode. No revision created. v1 remains ACTIVE.

**Verify**:

- `bundle.status === 'REJECTED'` (terminal)
- No CarePlanVersion v2
- v1 still ACTIVE — no disruption
- Supervisor's reasonCode visible in lifecycleHistory (audit-grade reason)

### 2b. Bundle EXPIRED (no action taken)

If supervisor doesn't act on the bundle within 7 days, the sweeper (W334 Pass 3 cron) auto-expires it:

```http
POST /api/v1/ai-recommendations/sweep   # or wait for cron
```

**Verify**:

- `bundle.status === 'EXPIRED'`
- No revision created
- v1 still ACTIVE
- Next plateau detection may re-create a fresh bundle (no permanent suppression)

---

## 4. Cleanup

```bash
npm run pilot:reset-scenario2 -- --plan <plan_id>
```

Soft-deletes CarePlanVersion v2 + AiRecommendationBundle. v1 + S1 data PRESERVED.
Audit chain entries PRESERVED (W303-W308 contract).

## 5. Sign-off

| Role       | Name | Date | Signature |
| ---------- | ---- | ---- | --------- |
| Therapist  |      |      |           |
| Supervisor |      |      |           |
| Family     |      |      |           |
| Pilot PM   |      |      |           |

## 6. Issues captured during this scenario

Use the PILOT_CYCLE_1.md §7 template; tag SCENARIO:2 + STEP:2.X.

**Likely issues to watch for**:

- AiRecommendationBundle never appears → W41 plateau detector cron not running OR threshold too strict. Try manual sweep first.
- v1→v2 transition fails → W332 registry validation error. Check the registry's transition map for SUPERSEDED.
- Family doesn't receive notification → W276c parent-portal notification config issue.
- MFA tier 2 challenged unexpectedly on RC rejection → service-layer regression. Per W334 lib, REJECTED needs only tier 1.

---

## Key design decisions (for this walkthrough)

1. **Compressed 90-day cycle** — real-world this scenario spans months; pilot compresses via manual cron trigger. Documented honestly so pilot users understand the gap.
2. **Both happy + reject + expire paths** — pilot supervisors will face all 3 in production. Documenting now reduces "is this a bug?" tickets.
3. **MFA tier 2 explicit at step 2.3** — same emphasis as S1.6 and S3.7. Pattern reinforces the "significant action" mental model.
4. **CarePlanVersion v1 SUPERSEDED handling** — explicit so pilot users don't worry about "where did my old plan go" (it's preserved, just no longer ACTIVE).

## Recommended next step

After supervisor + therapist + family sign off:

1. Capture issues in `#pilot-cycle-1`.
2. Walk weekly retrospective.
3. Move to SCENARIO_3 (if not already running in parallel) — that's the CAPA validation.
4. If 0 BLOCKERs across S1+S2+S3 → backend infrastructure validated; green-light S4 (transport) + S5 (DA report).

Sister docs:

- ✅ `SCENARIO_1_INTAKE_TO_FIRST_SESSION.md`
- ✅ `SCENARIO_2_REASSESSMENT_REVISION.md` (this commit)
- ✅ `SCENARIO_3_CAPA_END_TO_END.md`
- 🟡 `SCENARIO_4_TRANSPORT_HIKVISION.md`
- 🟡 `SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md`
