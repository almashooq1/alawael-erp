# Production gaps before live cutover

**Type**: Operational matrix — what's stubbed/placeholder/blocked across the platform
**Audience**: Ops team + product PM + pilot owner (decides cutover sequence)
**Updated**: 2026-05-25 (post-W286-safety-guard `7fccd9531`)

This is the single source of truth for "what is NOT actually production-ready yet" across the platform. Use it when planning cutover sequence, prioritising stakeholder asks, or deciding what to ship for the pilot.

Each row answers 4 questions:

1. **What's the gap?** — Concrete code/data/integration still missing
2. **Who blocks?** — Vendor / stakeholder / internal dev work
3. **What happens if flipped to live now?** — The actual operational risk
4. **Mitigation in place** — Existing guard preventing the worst case

If a row says "Mitigation in place ✓" you can flip the flag and the system will refuse to run unsafely (fail-fast). If it says "Mitigation in place ✗" you need to fix the gap BEFORE flipping the flag.

---

## 1. Gov adapters (10 providers)

| Provider                                                             | Mode flag                                                                 | Current state                                                                                                                            | What's stubbed                                                                                                          | Risk if flipped to live                                                                                                                                                                                                                   | Mitigation                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Disability Authority**                                             | `DISABILITY_AUTHORITY_MODE=mock`                                          | live placeholders throw `DA_LIVE_NOT_CONFIGURED`                                                                                         | (1) `liveSubmitReport` / `liveVerifyCard` / `liveReferralInbox` impls / (2) W286 cron's monthly payload builder is stub | If both (1) + (2) implemented and operator misconfigures: stub payload could leak to live regulator                                                                                                                                       | ✓ **commit `7fccd9531`** adds STUB_PAYLOAD_MARKER guard — adapter refuses any submitPeriodicReport call carrying the stub note in live mode (`DA_STUB_PAYLOAD_REJECTED`). Plus drift guard on bootstrap source. Blocks the "flipped live with stub builder" failure mode entirely. |
| **Sehhaty / Tawakkalna**                                             | `SEHHATY_MODE=mock`                                                       | live placeholders throw `SEHHATY_LIVE_NOT_CONFIGURED`                                                                                    | live impls of importSummary / vaccinations / linkTawakkalna                                                             | Live mode throws on first call; no data leaks. Only blocks the feature from working.                                                                                                                                                      | ✓ Adapter-level throw — no data submitted, no risk of leak. Just an outage signal.                                                                                                                                                                                                 |
| **Mudad WPS**                                                        | `MUDAD_MODE=mock` (orchestrator uses optional `mudadAdapter.uploadBatch`) | Real payroll data assembled from `PayrollRun` model. Only the bank SFTP upload step is mocked (fallback returns synthetic submissionId). | `services/mudadAdapter.js` is `loadOptional()` — if absent, fallback runs. If implemented, real bank upload happens.    | **Different risk class**: data is REAL (built from finalised PayrollRun); only TRANSPORT is mocked. If mudadAdapter is wired with wrong creds: real salary file goes to wrong bank. Lower-likelihood than DA stub leak but high-severity. | ✗ No marker guard (data isn't stub). Mitigation pattern: caller-side review of mudadAdapter implementation + sandbox-first cutover (see PILOT_CYCLE_1.md scenario for the recipe).                                                                                                 |
| **NPHIES**                                                           | `NPHIES_MODE=mock`                                                        | Real `liveSubmitClaim` + `liveEligibility` exist (HTTP to `NPHIES_BASE_URL`). Mock fallback for dev.                                     | Sandbox creds for `NPHIES_BASE_URL` + `NPHIES_CLIENT_ID` + `NPHIES_PROVIDER_ID` not in pilot env.                       | User-triggered (clinician's "submit claim" button) — no cron risk. If creds wrong: 401/403 from NPHIES, breaker opens, claim stays in our system.                                                                                         | ✓ Circuit breaker pattern (`intelligence/circuit-breaker.lib.js`) opens on repeated failures; user sees the error. No silent data leak.                                                                                                                                            |
| **Nafath signing**                                                   | `NAFATH_MODE=mock`                                                        | `services/nafathSigningService.js` + `services/nafathAdapter.js` LIVE. 34/34 tests passing.                                              | Nothing — fully implemented.                                                                                            | If live creds wrong: signing fails per-request, user sees error.                                                                                                                                                                          | ✓ No stub-payload risk; real implementation.                                                                                                                                                                                                                                       |
| **GOSI / SCFHS / Absher / Qiwa / Fatoora / Muqeem / Wasel / Balady** | per-provider `<NAME>_MODE=mock`                                           | Each has live/mock split. None auto-submit via cron (all user-triggered or verify-only).                                                 | Sandbox creds; per-provider live impls (varying completeness)                                                           | If live creds wrong: per-request error, no silent leak. None have auto-submitting crons.                                                                                                                                                  | ✓ Verify-only / user-triggered semantics inherently safer than auto-submit. No marker guard needed.                                                                                                                                                                                |

---

## 2. AI / ML stubs

| Service                       | Current state                                | What's stubbed                                          | Risk                                                                                                                            | Mitigation                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RAG embedding provider**    | `EMBEDDING_PROVIDER=mock`                    | Random-vector mock                                      | Quality degradation in policy-chatbot answers (mock ~random similarity); **Arabic keyword fallback (W283e) catches most cases** | UX-only (policy answers less precise). Not safety-critical. No external data leak.                                                                                              | ✓ Keyword fallback + ingestion idempotent + ranks visible via `/api/rag/metrics`.                                                                                                                                                                                                                                                                                    |
| **Speech analysis provider**  | `SPEECH_ANALYSIS_PROVIDER` unset             | Whisper-API/etc. wrapper not wired                      | Speech features disabled (no transcription, no fluency scoring)                                                                 | UX-only (Speech tab shows empty). No safety risk.                                                                                                                               | ✓ Default-disabled until provider env set.                                                                                                                                                                                                                                                                                                                           |
| **Speech S3 retention purge** | log-only fallback ONLY if SDK absent (W284d) | `@aws-sdk/client-s3` not in `package.json` dependencies | If SDK absent: log-only fallback fires, audio not deleted. If SDK present + AWS_REGION set: real DeleteObjectCommand fires.     | ⚠ Partial — gap is now VISIBLE at boot (loud WARN if log-only fallback active) instead of silent. Full PDPL compliance still requires installing the SDK + setting AWS_REGION. | ⚠ **commit `ad20c03cc`** (W284d) added real S3 purger factory + bootstrap prefers it over log-only fallback. Boot WARN "PDPL retention non-compliant" if SDK missing. Boot INFO "PDPL retention enforced" if wired. Ops cannot miss the gap silently anymore. **Action needed for pilot Week 2**: `npm install @aws-sdk/client-s3` + set `AWS_REGION` in pilot env. |

---

## 3. Frontend gaps

| Surface                                             | Status                                            | Where it lives                                               | Notes                                                                                         |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Web-admin pages for W356–W370**                   | 30 of 10 modules built (Next.js 15)               | `alawael-rehab-platform/apps/web-admin/src/app/(dashboard)/` | Pattern: list / detail / new-form per module. seizure-log is the reference; others mirror it. |
| **Web-admin page for W384 CaregiverSupportProgram** | 3 pages built (W384) + 8th aggregator card (W390) | same repo                                                    | Complete.                                                                                     |
| **Web-admin Speech tab**                            | UI exists but provider not wired                  | same repo                                                    | Shows empty state until `SPEECH_ANALYSIS_PROVIDER` set.                                       |
| **Legacy frontend** (`frontend/`)                   | Superseded by web-admin; still gated in CI        | `frontend/src/`                                              | Both run concurrently during cutover. ~11K tests passing per pre-push gate.                   |
| **Mobile app** (`mobile/`)                          | Not in pilot scope                                | `mobile/src/`                                                | Phase 5+.                                                                                     |
| **Payment-gateway demo placeholder**                | Already FIXED (W278b commit `e86560f8e`)          | `routes/parent-portal-v1.routes.js`                          | HyperPay live by default + Saudi gateway override via env. No longer a gap.                   |

---

## 4. Stakeholder-blocked ADRs

These cannot ship without a product decision. Each ADR has 4 stakeholder questions.

| ADR                     | Subject                                                                                    | Why blocked                                                                                              | Impact if unresolved                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-026**             | IEP/IFSP/CarePlanVersion 3-way fragmentation                                               | Need product owner to pick approach A/B/C                                                                | New IEP/IFSP plan types CANNOT be added to `intelligence/care-planning.registry.PLAN_TYPES` without creating 4-way fragmentation. Education-team feature requests stalled. |
| **ADR-022/023/024/028** | Pattern D renames for ApprovalRequest / ReportTemplate / WorkflowInstance / TransitionPlan | Each entity has 2 divergent schemas registered under same Mongoose name; stakeholder must pick canonical | First-loaded schema wins silently; some callers operate on wrong schema. Currently ALLOWLISTed in W340 baseline (defensive stopgap).                                       |
| **ADR-021**             | Tier 1 duplicate-registration framework                                                    | Stakeholder framework decisions for 4 entities                                                           | Until resolved, AuditLog + Referral + Task + TransitionPlan stay in REGISTRATION_ALLOWLIST.                                                                                |
| **ADR-020**             | Student vs Beneficiary canonical                                                           | Stakeholder asked: are these the same entity?                                                            | 21 callers use `ref: 'Student'`; consolidating would simplify.                                                                                                             |

**None of these block pilot Cycle 1** — pilot uses the existing canonical (e.g. CarePlanVersion for the W41 path). They block FUTURE feature growth.

---

## 5. Operational deferred items

| Item                              | Status                                                                                             | Recommendation                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DA payload production builder** | Stub. Guarded by `7fccd9531` so leak is impossible.                                                | When DA spec arrives: replace bootstrap stub with aggregator over Beneficiary + Session + CarePlan models. Drop the `note: STUB_PAYLOAD_MARKER` line. 5 existing tests will continue to verify the guard still works for FUTURE stubs. |
| **DA live impl**                  | `liveSubmitReport` / `liveVerifyCard` / `liveReferralInbox` throw `DA_LIVE_NOT_CONFIGURED`         | Same as above — need DA sandbox + spec docs.                                                                                                                                                                                           |
| **Sehhaty live impls**            | throw `SEHHATY_LIVE_NOT_CONFIGURED`                                                                | Sehhaty sandbox creds + API spec from MoH.                                                                                                                                                                                             |
| **Mudad live SFTP**               | optional adapter not wired                                                                         | SAMA sandbox creds + `ssh2-sftp-client` integration.                                                                                                                                                                                   |
| **Madaa upload** (legacy)         | `uploadPayload` throws `not implemented (P1)`                                                      | Low priority — payroll runs primarily via Mudad WPS. Madaa is bank salary cards for non-Saudi workers.                                                                                                                                 |
| **Speech S3 deletion**            | ⚠ Partial (W284d `ad20c03cc`) — real purger factory shipped, falls back to log-only if SDK absent | `npm install @aws-sdk/client-s3` + set `AWS_REGION` in pilot env. Bootstrap emits "PDPL retention enforced" INFO instead of "non-compliant" WARN.                                                                                      |

---

## 6. Decision tree for "is this safe to flip to live?"

For each `*_MODE=live` env flag you're about to set:

```
Does the adapter have an auto-submitting cron?
├── No (user-triggered or verify-only) → safe to flip; user sees errors per-call
└── Yes
    ├── Is the cron payload built from REAL data?
    │   ├── Yes (e.g. Mudad from PayrollRun) → check the TRANSPORT layer is wired correctly to the right sandbox first
    │   └── No (e.g. DA from stub builder) → DO NOT flip until production builder lands
    └── Is there a STUB_PAYLOAD_MARKER safety guard in the adapter?
        ├── Yes (DA today) → safe — adapter will fail fast with explicit error
        └── No → fix one of: (a) implement real builder, OR (b) add safety guard per `feedback_stub_payload_safety_guard_pattern` recipe
```

---

## 7. Quick reference — env flags + their gate

| Env flag                            | When to flip                                 | What needs to be done first                                                                                                                       |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISABILITY_AUTHORITY_MODE=live`    | Week 3 of pilot per SCENARIO_5               | Build production payload + implement liveSubmitReport                                                                                             |
| `ENABLE_DA_PERIODIC_CRON=true`      | Same as above + `DA_REPORTING_BRANCH_IDS=b1` | Either fully implement live, OR keep mock mode (cron works in mock for telemetry)                                                                 |
| `SEHHATY_MODE=live`                 | When MoH provides Sehhaty creds              | Implement liveImportSummary + liveVaccinations                                                                                                    |
| `MUDAD_MODE=live`                   | When SAMA Mudad sandbox available            | Wire `mudadAdapter.uploadBatch` + sandbox-first cutover                                                                                           |
| `NPHIES_MODE=live`                  | When NPHIES sandbox creds provided           | Set NPHIES_CLIENT_ID + NPHIES_PROVIDER_ID + sandbox URL                                                                                           |
| `ENABLE_MUDAD_CRON=true`            | After MUDAD_MODE=live + sandbox tested       | Verify PayrollRun shape matches orchestrator query                                                                                                |
| `ENABLE_SPEECH_RETENTION_CRON=true` | Anytime — sweeper safe to enable (W284d)     | For full PDPL compliance: `npm install @aws-sdk/client-s3` + set `AWS_REGION`. Without these, sweeper falls back to log-only with boot-time WARN. |
| `ENABLE_CAPA_SWEEPER=true`          | Anytime (internal sweeper)                   | None — safe to enable in any env                                                                                                                  |
| `ENABLE_*_SWEEPER=true` (clinical)  | Anytime (internal sweepers)                  | None — see clinicalSweepersBootstrap.js for the 13                                                                                                |

---

## 8. Related docs

- [`PILOT_CYCLE_1.md`](PILOT_CYCLE_1.md) — operational readiness package for the 4-week pilot
- [`pilot/README.md`](pilot/README.md) — 5 detailed scenario walkthroughs
- [`architecture/PRODUCTION_CUTOVER_W356_W370.md`](architecture/PRODUCTION_CUTOVER_W356_W370.md) — W356-W370 + W384 module activation checklist
- [`architecture/decisions/`](architecture/decisions/) — ADR-020 through ADR-028
- [`runbooks/gov-adapter-circuit.md`](runbooks/gov-adapter-circuit.md) — circuit-breaker triage
- [`runbooks/gov-adapter-misconfigured.md`](runbooks/gov-adapter-misconfigured.md) — first-time live cutover troubleshooting

---

## 9. Maintaining this doc

When a gap closes, MOVE the row to a `### Closed` section at the bottom of the relevant section (don't delete — leaves the audit trail). When a new gap opens (e.g., new gov adapter added), add a row with the same 4 columns.

This doc is owned by **whoever ships a new auto-submitting adapter** — they must add their row before merging.
