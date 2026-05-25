# Open Issues Inventory — Single Source of Truth

**Type**: Team-collaboration backlog (Claude + المستخدم)
**Updated**: 2026-05-25
**Purpose**: Every open item across the platform in one place, with **who decides** + **who implements** + **blockers** + **suggested order**

This is the doc we (Claude + user) work from during the systematic problem-solving cadence. Pick items, work them through, mark done. Don't let issues live only in CLAUDE.md / individual ADRs / scattered TODOs — pull them here.

## Status legend

- 📋 **backlog** — not started
- 🚧 **in-flight** — actively being worked
- ⏸ **blocked-on-user** — needs your decision before Claude can proceed
- ⏸ **blocked-on-vendor** — needs external party (sandbox creds, vendor spec, regulator response)
- ⏸ **blocked-on-stakeholder** — needs sign-off from named role (clinical lead, PM, etc.)
- ✅ **done** — closed (kept for audit trail; cite commit hash)

## Mode legend (per item, in "Collab" column)

- 🤖 **autonomous** — Claude ships PR for review
- 🤝 **decide-then-implement** — user picks approach, Claude builds
- 🔍 **research-then-decide** — Claude investigates + presents options, user decides
- 👤 **human-only** — Claude cannot help (vendor calls, stakeholder meetings, credential provisioning)

---

## 1. Stakeholder-blocked ADRs (7 open)

These cannot ship without a product/architecture decision. Each ADR has explicit questions inside; user needs to convene the named stakeholders and resolve.

| ID      | Title                                            | Decider role                                                  | Effort after decision                                      | Impact                                                                                                                             | Mode       | Status                    | Priority       |
| ------- | ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- | -------------- |
| ADR-020 | Student vs Beneficiary consolidation             | Clinical director + admissions lead + smart-attendance owner  | M (~3 days if consolidate, ~1 day if formalize separation) | 21 callers via `ref: 'Student'`; consolidation simplifies. Status quo works but maintains fragmentation.                           | 👤 then 🤝 | ⏸ blocked-on-stakeholder | LOW (cosmetic) |
| ADR-021 | Tier 1 duplicate-model registration framework    | Tech lead + domain owners                                     | M (1 wave per Tier 1 entity = 4 waves)                     | Until resolved, AuditLog + Referral + Task + TransitionPlan stay in REGISTRATION_ALLOWLIST stopgap. Silent schema divergence risk. | 👤 then 🤝 | ⏸ blocked-on-stakeholder | **MED**        |
| ADR-022 | ApprovalRequest Pattern D rename                 | Approvals domain owner                                        | S (~1 day rename + tests)                                  | Two divergent schemas under same name; first-loaded wins silently.                                                                 | 👤 then 🤖 | ⏸ blocked-on-stakeholder | MED            |
| ADR-023 | ReportTemplate Pattern D rename                  | Reports domain owner                                          | S                                                          | Same divergent-schema risk.                                                                                                        | 👤 then 🤖 | ⏸ blocked-on-stakeholder | LOW            |
| ADR-024 | WorkflowInstance Pattern D rename                | Workflow domain owner                                         | S                                                          | Same.                                                                                                                              | 👤 then 🤖 | ⏸ blocked-on-stakeholder | LOW            |
| ADR-026 | IEP / IFSP / CarePlanVersion 3-way fragmentation | Clinical director + MoE compliance + early-intervention owner | L (depends on approach A/B/C — could be 1-3 weeks)         | Education-team feature requests stalled. Cannot add IEP/IFSP to PLAN_TYPES without creating 4-way fragmentation.                   | 👤 then 🤝 | ⏸ blocked-on-stakeholder | **HIGH**       |
| ADR-028 | TransitionPlan Pattern D rename                  | Architecture owner                                            | S                                                          | Same Pattern D mechanics as 022/023/024.                                                                                           | 👤 then 🤖 | ⏸ blocked-on-stakeholder | LOW            |

**Recommended ADR sequence** (highest leverage first):

1. **ADR-026** (HIGH) — unblocks education-team work
2. **ADR-021** (MED, framework) — unblocks 022/023/024/028 as one batch
3. **ADR-020** (LOW) — cosmetic; doesn't block anyone

---

## 2. Vendor/external dependencies (7 open)

These require external parties. Claude cannot move them forward; user owns the relationship.

| Item                          | Vendor                               | What's needed                                                                          | Blocks                                           | Mode                                         | Status               | Priority                                |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | -------------------- | --------------------------------------- |
| DA sandbox creds              | Saudi Disability Authority           | BASE_URL + API_KEY + CENTER_ID + API spec docs                                         | W286 cron live cutover + SCENARIO_5 pilot Week 3 | 👤                                           | ⏸ blocked-on-vendor | **HIGH**                                |
| DA production payload builder | Vendor spec + internal dev           | Real metrics aggregator from Beneficiary + Session + CarePlan models (per DA contract) | Same as above                                    | 🤝 (you get spec → Claude builds aggregator) | ⏸ blocked-on-vendor | **HIGH**                                |
| Sehhaty sandbox creds         | Ministry of Health                   | BASE_URL + CLIENT_ID + CLIENT_SECRET + CENTER_ID                                       | health-summary-import feature live               | 👤                                           | ⏸ blocked-on-vendor | MED                                     |
| Sehhaty live impls            | Vendor spec + dev                    | liveImportSummary / liveVaccinations / liveLinkTawakkalna                              | Same                                             | 🤝                                           | ⏸ blocked-on-vendor | MED                                     |
| Mudad SAMA sandbox            | SAMA Mudad                           | SFTP host + credentials + IBAN test data                                               | W282b cron live cutover (payroll to banks)       | 👤                                           | ⏸ blocked-on-vendor | MED                                     |
| `mudadAdapter.js` real impl   | Sandbox creds + dev                  | `ssh2-sftp-client` upload + acceptance polling                                         | Same                                             | 🤝                                           | ⏸ blocked-on-vendor | MED                                     |
| NPHIES sandbox creds          | NPHIES (Council of Health Insurance) | NPHIES_BASE_URL + NPHIES_CLIENT_ID + NPHIES_PROVIDER_ID                                | Claims submission live                           | 👤                                           | ⏸ blocked-on-vendor | LOW (claims = user-triggered, not cron) |

**Recommended vendor outreach sequence**:

1. **DA + Mudad** (HIGH, both gated for pilot Week 3) — start the procurement conversation now
2. **Sehhaty** (MED) — useful but not pilot-gating
3. **NPHIES** (LOW) — claims work fine without if clinicians defer

---

## 3. Internal dev work (autonomous-actionable backlog)

Claude CAN ship these without external dependencies. Each is decision-then-implement OR pure autonomous.

| Item                                                                                | Effort                                   | Impact                                                                                                                                                                                        | Mode                                               | Status                                                                                                                                                                                                                                              | Priority                                    |
| ----------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **W340 duplicate-model baseline cleanup** (41 entries → 0)                          | L (many small waves)                     | Each entry consolidates 2-3 source files; eliminates schema-divergence risk class entirely. Verified 2026-05-25: 41 active entries (down from initial 52 after W341/W342/W343/W347 ratchets). | 🤖 per Tier 2 entry; 🤝 per Tier 1 (after ADR-021) | 📋 backlog (41 remaining)                                                                                                                                                                                                                           | MED (drift guards baselined; safe to defer) |
| **AWS SDK install for pilot env** (`npm install @aws-sdk/client-s3`)                | XS (one command)                         | Closes PDPL retention gap fully (W284d boot-WARN → INFO)                                                                                                                                      | 👤 + 🤖 verify                                     | ⏸ blocked-on-user — Claude side ✅ done (verification script ships in pending commit); user side: run `npm install @aws-sdk/client-s3` in pilot env + set `AWS_REGION`. Verify with `npm run check:speech-s3-ready` (exits 0 when both gates pass) | **HIGH** (PDPL compliance)                  |
| **`AWS_REGION` env var** in pilot deployment                                        | XS                                       | Same gate                                                                                                                                                                                     | 👤                                                 | ⏸ blocked-on-user — paired with above                                                                                                                                                                                                              | **HIGH**                                    |
| **Speech analysis provider wiring** (`SPEECH_ANALYSIS_PROVIDER=openai-whisper-api`) | M (~2 days)                              | Unblocks Speech tab in UI — transcription + fluency scoring                                                                                                                                   | 🤝 (you pick provider → Claude wires)              | ⏸ blocked-on-user (provider choice)                                                                                                                                                                                                                | LOW (speech-tab nice-to-have for pilot)     |
| **Frontend pages for W356-W370 modules**                                            | L (10 modules × 3 pages each = 30 pages) | Pilot Week 2-3 needs UI for these clinical modules. **W372-W376 already shipped some**; need re-audit for what's still missing                                                                | 🤖 per page (W279 e2e suite is the template)       | 📋 backlog (count unknown — needs audit)                                                                                                                                                                                                            | **MED** (pilot UX)                          |
| **Madaa.uploadPayload** SFTP impl                                                   | M                                        | Bank salary cards for non-Saudi workers. **LOW priority — Mudad WPS is primary**. Adapter currently throws "not implemented (P1)"                                                             | 🤝                                                 | ⏸ blocked-on-vendor + low-priority                                                                                                                                                                                                                 | LOW                                         |
| **Backup verification** procedure                                                   | M                                        | "Are Mongo backups actually restorable?" — no current test. Could be one runbook + monthly restore-drill script.                                                                              | 🤝 (you decide backup tool first)                  | 📋 backlog                                                                                                                                                                                                                                          | MED                                         |
| **Mock auto-reset hour** for pilot mock-mode envs                                   | XS                                       | One env var to auto-rotate mock data daily so pilot doesn't accumulate stale fake records                                                                                                     | 🤖                                                 | 📋 backlog                                                                                                                                                                                                                                          | LOW                                         |

---

## 4. Frontend gaps (different repo — `alawael-rehab-platform/apps/web-admin`)

| Item                                           | Status                                             | Mode                                                                | Priority           |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ------------------ |
| W356-W370 module pages — re-audit + close gaps | unknown count                                      | 🤖 per page (template = W279 e2e suite + W372-W376 reference pages) | **MED** (pilot UX) |
| Speech tab UI                                  | "empty state until provider set" — partially built | 🤖 once provider chosen                                             | LOW                |
| Mobile app pages                               | Phase 5+ — out of pilot scope                      | 👤 (decide if Phase 5 starts)                                       | LOW                |
| Payment-gateway demo                           | ✅ DONE (W278b `e86560f8e`)                        | n/a                                                                 | ✅ done            |

---

## 5. Ops/infrastructure (mostly human-only)

| Item                            | Mode       | Status                                                                                                     | Priority                                       |
| ------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Pilot branch selection          | 👤         | ⏸ blocked-on-user (Q1 from PILOT_CYCLE_1.md unanswered)                                                   | **CRITICAL** — blocks everything pilot-related |
| Pilot stakeholder sign-off      | 👤         | ⏸ blocked-on-user (Q2-Q5 from PILOT_CYCLE_1.md)                                                           | **CRITICAL** — same                            |
| K8s deployment manifests review | 🔍 then 👤 | 📋 backlog (Claude can audit, you decide deploy approach)                                                  | MED                                            |
| Monitoring dashboards (Grafana) | 🔍 then 👤 | 📋 backlog (referenced in CLAUDE.md `grafana.internal/d/api-latency` per memory but Claude hasn't audited) | LOW                                            |
| PagerDuty / alert routing       | 👤         | 📋 backlog (no docs found)                                                                                 | LOW                                            |
| Credential rotation procedure   | 🔍 then 👤 | 📋 backlog (no docs found)                                                                                 | LOW (no live integrations yet)                 |

---

## 6. Tech-debt parking lot (low priority, no urgency)

| Item                                                                                | Why parked                                                                  | Mode | Status                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| Legacy frontend (`frontend/`) end-of-life                                           | Superseded by web-admin; both run during cutover. Decide when to deprecate. | 👤   | 📋 backlog (deferred until pilot retrospective) |
| W354 module-dependency baseline (currently EMPTY ✅)                                | Maintained — no action                                                      | n/a  | ✅ done                                         |
| W325c phantom-ref baseline (currently EMPTY ✅)                                     | Maintained — no action                                                      | n/a  | ✅ done                                         |
| W382 LIVE-registry dead-contracts baseline (currently EMPTY ✅, post W400-W404)     | Maintained — adding any new dead contract now fails CI                      | n/a  | ✅ done                                         |
| W392 LIVE-registry orphan-subscribers baseline (currently EMPTY ✅, post W400-W404) | Maintained — adding any new unwired subscriber now fails CI                 | n/a  | ✅ done                                         |
| W407 dddNotificationTriggers dead-triggers baseline (currently EMPTY ✅, post W407) | Maintained — third subscriber file now guarded; 3 dead handlers cleaned     | n/a  | ✅ done                                         |
| Legacy `documentWorkflow` skips                                                     | All resolved (CLAUDE.md "Open known issues")                                | n/a  | ✅ done                                         |

---

## 7. Recently closed (this session — audit trail)

| Date       | Commit                | Item                                                                                                                                          | Wave            |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 2026-05-25 | `275adec68`           | SCENARIO_5 pilot walkthrough (5/5 complete)                                                                                                   | —               |
| 2026-05-25 | `a367ba915`           | W364 12-sweeper count + no-broken-requires false positive                                                                                     | drift           |
| 2026-05-25 | `aba7fe9cb`           | pilot/README.md index + PILOT_CYCLE_1 cross-refs                                                                                              | —               |
| 2026-05-25 | `445e9d301`           | capa-overdue-sweeper orphan + 16 CI paths                                                                                                     | sprint gate     |
| 2026-05-25 | `f47dde1` (web-admin) | W279 V4 master-file e2e suite                                                                                                                 | —               |
| 2026-05-25 | `59f7475` (web-admin) | safeUrl XSS guard + 23 tests                                                                                                                  | security        |
| 2026-05-25 | `7fccd9531`           | **DA stub-payload safety guard**                                                                                                              | W286 follow-up  |
| 2026-05-25 | `bf5d71895`           | PRODUCTION_GAPS_BEFORE_LIVE.md cutover matrix                                                                                                 | —               |
| 2026-05-25 | `ad20c03cc`           | **Speech S3 real purger + PDPL boot WARN** (W284d)                                                                                            | W284c follow-up |
| 2026-05-25 | `7f412f760`           | Gaps matrix update post-S3 fix                                                                                                                | docs            |
| 2026-05-25 | `2f245f576`           | **Preflight extension — 12 adapters + Phase 3 cron gates**                                                                                    | preflight       |
| 2026-05-25 | `9e325b3ef`           | OPERATIONS.md cutover checklist updated                                                                                                       | docs            |
| 2026-05-25 | `d3cc0806f`           | OPEN_ISSUES_INVENTORY.md created — team-collaboration backlog (this doc)                                                                      | —               |
| 2026-05-25 | _pending_             | **Cycle 1 item #2 Claude-side**: `check:speech-s3-ready` script + 5 tests + docs cross-ref. User-side: install SDK + AWS_REGION in pilot env. | Cycle 1         |
| 2026-05-25 | `01be56a9b`           | **W400** errorHandler `system.error.occurred` 5xx publish                                                                                     | W400            |
| 2026-05-25 | `d6a867d4a`           | **W401** budgetThresholdSweeper + env-gated daily cron                                                                                        | W401            |
| 2026-05-25 | `3a774373b`           | **W402** absenceDetectionSweeper + new bootstrap                                                                                              | W402            |
| 2026-05-25 | `df2e01073`           | **W403** cachingService cache-invalidation hook                                                                                               | W403            |
| 2026-05-25 | `62abf8897`           | **W404** modelEventBridge 3 new mappings + predicate feature; W382 baseline 3→0 ✅, W392 1→0 ✅                                               | W404            |
| 2026-05-25 | `4897f9d97`           | W405 CLAUDE.md + PRODUCTION_GAPS catch up to W400-W404                                                                                        | W405            |
| 2026-05-25 | `cac86637b`           | W406 OPEN_ISSUES_INVENTORY catchup post W400-W405                                                                                             | W406            |
| 2026-05-25 | `55a9617e2`           | **W407** dddNotificationTriggers drift guard + 3 dead handler deletions (sessions.no_show / dashboards.alert_triggered / ar-vr.safety_alert)  | W407            |
| 2026-05-25 | `0430849e3`           | **W408** strict envelope-shape verification for W400-W404 producers (W385 pattern applied to LIVE registry); 7 envelope-shape assertions      | W408            |
| 2026-05-25 | `20b8e8056`           | W408 follow-up — CLAUDE.md assertion-count correction (was 97/12, actual 93/13)                                                               | W408            |

**Combined session totals (both agents, 2026-05-25)**: 21 commits across 2 repos. 3-layer safety stack complete (deploy + boot + runtime). All three subscriber-file baselines now empty (W389 dddCrossModuleSubscribers, W392 crossModuleSubscribers, W407 dddNotificationTriggers). Both LIVE-registry event-contract baselines now empty (W382 + W392). **13 event-architecture drift guards (93 assertions)**; ~1856 platform-wide assertions; test:sprint 237/237 suites green.

---

## 8. Suggested "Cycle 1" picks (3-5 items, my recommendation)

Pick 3-5 from above for the first collaborative cycle. My recommended starting set:

| #   | Item                                               | Why first                                                                   | Mode                        | Estimated cycle time                |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
| 1   | **Pilot branch selection** (§5)                    | CRITICAL — blocks every other pilot-related work. Pick a branch this week.  | 👤                          | 1 stakeholder call                  |
| 2   | **AWS SDK install + AWS_REGION in pilot env** (§3) | XS effort, closes PDPL gap, unblocks Speech retention cron                  | 👤 (decision) → 🤖 (verify) | 1 deploy cycle                      |
| 3   | **Resolve ADR-026** (§1)                           | HIGH impact, unblocks education-team work that's been stalled               | 👤 (stakeholders) then 🤝   | 1-2 weeks for meeting + decision    |
| 4   | **Frontend pages audit for W356-W370** (§4)        | Pilot Week 2 UX. Claude can map "what exists vs what's needed" in 1 session | 🔍 then 🤖                  | 1 session + N implementation cycles |
| 5   | **DA + Mudad vendor outreach kickoff** (§2)        | Long lead time; start now even if you don't act on results until Week 2-3   | 👤                          | initial contact only                |

Once Cycle 1 closes, we pick Cycle 2 from what's left.

---

## 9. Maintenance contract

This doc is **owned by Claude** (this session). User can edit freely. Each entry has a deterministic structure so the next session can pick up without re-discovering everything.

**When an item moves status**: update the row in-place (don't archive immediately). Move to §7 ("recently closed") only when fully done with commit hash.

**When a new item is discovered**: add a row in the right section. If unsure, default to §3 with `📋 backlog`.

**When a cycle closes**: rotate §8 to show the NEXT recommended picks.

---

## 10. Related docs

- [`PRODUCTION_GAPS_BEFORE_LIVE.md`](PRODUCTION_GAPS_BEFORE_LIVE.md) — per-adapter cutover matrix
- [`PILOT_CYCLE_1.md`](PILOT_CYCLE_1.md) — pilot operational package (has Q1-Q5 the user must answer)
- [`pilot/README.md`](pilot/README.md) — 5 detailed scenario walkthroughs
- [`OPERATIONS.md`](OPERATIONS.md) — ops cutover checklist
- [`architecture/decisions/`](architecture/decisions/) — all 28 ADRs (7 open, 21 closed)
- [`architecture/MODULE_AUDIT_2026-05-25.md`](architecture/MODULE_AUDIT_2026-05-25.md) — module coverage
- [`architecture/PRODUCTION_CUTOVER_W356_W370.md`](architecture/PRODUCTION_CUTOVER_W356_W370.md) — clinical-services activation
