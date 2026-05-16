# CHANGELOG

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> Earlier entries (v4.0.0 → v4.0.113) are preserved in git history. The
> file was inadvertently truncated by a prettier hook during the v4.0.113
> deploy session and rebuilt fresh from this version onward.

---

## [Unreleased] — 2026-05-16 — ALAWAEL Command Center: 9-Wave Rollout

End-to-end transformation of the platform from "feature-complete but
disconnected" to "operator-facing Command Center" — closes the gap
between rich backend infrastructure (alerts engine, KPI registry,
Beneficiary-360, LLM services) and the daily UX of branch managers,
therapists, and guardians. Nine sequential waves; every change opt-in
via env flags or feature toggles so existing deploys stay untouched.

### Added — Backend (66666/) — 18 new files, +74 tests

- **Smart Alerts coverage** expanded from 5 to **19 active rules** across
  `backend/alerts/rules/`:

  - **Wave 3** (13 rules): `document-expiring-30d`, `document-expired`,
    `pdpl-dsar-approaching-sla`, `pdpl-dsar-sla-breach`,
    `care-plan-unsigned-14d`, `care-plan-review-overdue`,
    `goal-stalled-30d`, `vaccination-overdue`, `credential-expired`,
    `employment-contract-expiring-60d`, `employment-contract-expired`,
    `invoice-overdue-90d-critical`, `incident-critical-open-24h`.
    Covers compliance (PDPL Art.27), HR escalation, clinical safety, and
    write-off risk tiers. **+16 tests** in `alerts.rules.wave3.test.js`.
  - **Wave 5** (1 rule): `kpi-anomaly-detected` — bridges the dormant
    EWMA detector (`services/anomalyDetector.service.js`, Phase 18 C6)
    into the alerts engine via `ctx.kpiHistoryStore`. **+10 tests**.

- **Smart Alerts engine wiring** (Wave 7) — `backend/alerts/bootstrap.js`
  composes engine + dispatcher + scheduler in one call. App-level boot
  in `app.js` behind `ALERTS_ENGINE_ENABLED=true`; reuses the dashboard
  platform's `kpiHistoryStore` so the EWMA bridge sees the same series
  as the Phase-18 anomaly detector — single source of truth. **+9 tests**.

- **AI Briefing service** (Wave 4) — `backend/services/briefing.service.js`
  mirrors `hrCopilot.service.js`: Claude Haiku 4.5, prompt caching
  (`ephemeral`), PII redaction, LRU cache (12h morning / 30min NBA),
  rule-based fallback when no API key. Routes at
  `/api/v1/ai/briefing/{status,morning,next-best-action}` wired in
  `app.js` next to the HR Copilot block, sharing the same Anthropic
  client. Audit trail via `AuditLog` (PDPL Art.13). **+16 + 7 tests**.

- **Parent Nafath signing** (Wave 8) — `parent-portal-v2.routes.js` gains
  `POST /children/:id/care-plan/:planId/sign-request` and `/mark-signed`.
  Reuses the existing `nafathSigningService` with `signerRole='guardian'`.
  Triple-check on `mark-signed`: status=APPROVED, documentId matches,
  signerUserId matches. Idempotent. **+11 tests**.

- **Parent Home Programs** (Wave 6) — same router gets
  `GET /children/:id/home-programs` (with 14-day compliance window) and
  `POST .../log` (append-only, status DONE/PARTIAL/SKIPPED, 1000-char
  note cap, ACTIVE-only).

- **6 healthcare roles** added to `config/constants/roles.constants.js`:
  `nurse`, `nursing_supervisor`, `head_nurse`, `patient_relations_officer`,
  `crm_supervisor`, `dpo`. DPO added to `CROSS_BRANCH_ROLES` for PDPL
  Art.30 oversight. Levels: L2 (DPO), L4 (supervisors), L5 (line staff).

- **Integration test suite** (Wave 9) — `backend/__tests__/waves-integration.test.js`
  locks the data contract between Waves 4 + 5 + 7. Catches the
  "unit-tests-green-but-shape-mismatch" class of regressions that
  individual suites can't detect. **+5 tests**.

### Added — Frontend (alawael-rehab-platform/, web-admin)

- **RBAC primitives** (Wave 0):

  - `Session`/`JwtPayload` extended with optional `branchIds[]`,
    `roles[]`, `permissions[]`, `activeBranchId` (backward-compatible
    with pre-Wave-0 JWTs).
  - `useAuth().switchBranch(id)` + `switchRole(code)` with localStorage
    persistence validated against JWT claims (no privilege escalation
    via tampered storage).
  - `<PermissionGate>` HOC + `useHasPermission()` hook supporting
    `require` / `requireRole` / `requireLevel` (1=highest → 6=lowest).
  - `<BranchSwitcher>` + `<RoleSwitcher>` rendered in Topbar; self-hide
    for single-branch / single-role users.
  - `<DataFreshnessChip>` (live / recent / stale / outdated / unknown)
    integrated into `<KpiCard>`.

- **Sidebar V2** (Wave 1) — `nav-types.ts` + `nav-items.v1.tsx` (legacy
  175 hrefs verbatim) + `nav-items.v2.tsx` (7 IA sections, same 175
  hrefs reorganized, `authz` descriptors). `use-nav-items.ts` selector
  hook (precedence: `?sidebar=v1|v2` → localStorage → env default → V1).
  `check-nav-coverage.mjs` updated to scan both files.

- **Widget renderers** (Wave 2) — 4 zero-dependency, SVG-only components:

  - `<TrendChart>` — time-series with target line, optional band,
    direction-aware coloring, x/y axes
  - `<AlertCard>` — extracted from the dashboards/alerts page; reusable
    with `compact` mode for embedding in widget grids
  - `<DrillTable>` — generic typed table with per-column sort
    (3-state), free-text filter, client pagination
  - `<ParetoChart>` — bars + cumulative line with 80% reference
  - `<WidgetRenderer>` dispatcher; falls back to `<WidgetPlaceholder>`
    for shapes whose renderer hasn't shipped

- **AI Briefing drawer** (Wave 4) — `<BriefingDrawer>` slide-in panel
  with morning briefing (5 bullets + focus) + Next-Best-Action list.
  `<BriefingPill>` in Topbar gradient indigo→violet. Explicit `AI` vs
  `Rules` source badge for transparency.

- **Parent Home Program tab** (Wave 6) — new tab in
  `/parent/children/[id]` with per-card 14-day compliance bar, inline
  status logging (DONE/PARTIAL/SKIPPED + note), recent submissions
  list with therapist feedback.

- **Parent Nafath signing** (Wave 8) — `<ParentCarePlanSignSection>`
  3-state component embedded in the care-plan tab: already-signed
  (green badge), requires-signature (amber CTA), in-flight (Nafath
  randomNumber + 15min countdown + 2.5s polling). Final APPROVED auto
  triggers `mark-signed` and refreshes the plan.

### Operational notes

- All changes are opt-in:
  - `ALERTS_ENGINE_ENABLED=true` — starts the 19-rule scheduler
  - `ANTHROPIC_API_KEY=sk-ant-...` — enables LLM briefing (rule-based fallback otherwise)
  - `NEXT_PUBLIC_SIDEBAR_V2_DEFAULT=true` — flips default sidebar to V2
  - `NAFATH_BASE_URL`/`NAFATH_CLIENT_ID`/`NAFATH_CLIENT_SECRET` — live
    Nafath signing (mock mode otherwise)
- `kpiHistoryStore` is shared with the Phase-18 dashboard platform —
  no double-recording, no extra cron jobs.
- Frontend nav-coverage script scans both V1 + V2 module sources; all
  175 admin + 7 parent hrefs resolve to real `page.tsx` files.

### Test summary

- 220/220 backend tests across 17 suites; 0 frontend lint regressions;
  `tsc --noEmit` clean; `pnpm validate` exit 0.

---

## [Unreleased] — 2026-05-15 — Phase 30: Intelligent HR Platform

Closed the gap between a feature-rich HR backend (Phase 11, 564 tests) and a
near-empty admin UI. Added the intelligent layer: predictive analytics
exposure, rule-driven workflow automation, and an LLM-backed copilot — all
PII-redacted and audit-logged.

### Added — Backend (66666/)

- **HR Workflow Automation Engine** (`services/hr/hrWorkflowEngine.js`) with 5 curated built-in rules:

  - `leave-pending-too-long` — escalate stale pending requests
  - `license-expiring-soon` — tiered severity at 14/30/60 days for SCFHS licenses
  - `contract-ending-soon` — 90-day window on fixed-term contracts
  - `excessive-late-arrivals` — flag patterns over `windowDays`
  - `grievance-unanswered` — escalate open grievances past threshold
    Routes at `/api/v1/hr/workflow/{rules,run,dry-run,rules/:id/run}` (admin-only). Notifications via `unifiedNotifier` fallback chain; audit trail via `AuditLog`. **9 unit tests**.

- **HR Copilot** (`services/hr/hrCopilot.service.js`) — Claude Haiku 4.5 backed assistant:

  - `summarizeEmployee` — bilingual 3-paragraph executive brief
  - `draftLetter` — bilingual drafts (warning/promotion/recommendation/appreciation/probation-extension/termination-offer)
  - `answerQuestion` — grounded Q&A bounded to supplied policy context
  - `suggestImprovements` — SMART coaching plan from a performance evaluation
    Routes at `/api/v1/hr/copilot/{status,summarize/:id,draft-letter,q-and-a,suggest/:id}`. SDK injected (`@anthropic-ai/sdk` optional). PII redaction mandatory, prompt caching on system prompt, LRU result cache (200 entries, 5 min TTL), audit trail on every call. **10 unit tests**.

- **Smoke probes** — 3 new entries in `post-deploy-smoke.js`:
  `phase30-hr-workflow-rules` · `phase30-hr-copilot-status` · `phase30-hr-smart-analytics`

### Added — Web-admin (alawael-rehab-platform/)

- **13 new admin pages** under `/hr/*` + ESS portal + intelligence center:
  - Attendance: dashboard (`/hr/attendance`), pending approvals with bulk actions, shifts CRUD
  - Leaves: admin queue + balances matrix
  - Payroll: monthly view + full payslip detail
  - Performance: evaluation queue + criteria detail + succession plans
  - ESS: `/me/hr` (snapshot + check-in/out)
  - Intelligence center: `/hr/intelligence` (workflow runner + last-run findings)
  - Copilot UI: `/hr/copilot` (3-tab: Q&A / Summarize / Letter)
- **New API client**: `lib/hr-api.ts` (attendance/leave/payroll/performance/ess/workflow/copilot/smart-analytics)
- **7 new sidebar entries** under "الموارد البشرية" group

### Runbook

`docs/blueprint/30-intelligent-hr-platform.md` documents the full surface, enable steps (`ANTHROPIC_API_KEY` to activate copilot), deferred items, and compliance notes (PII redaction + audit trail).

---

## [Unreleased] — 2026-05-15 — Phase 29: World-Class QMS + Executive Command Center

### Added — Phase 29 (17 vertical slices, 4 pillars)

**Pillar 1 — Analysis tooling**: FMEA/HFMEA (6 flavours, 2 scales, 15 tests), Structured RCA (Ishikawa + 5-Whys, 15 tests), SPC (7 chart types + Cp/Cpk + 8 Western Electric rules, 25 tests), Pareto + Toyota A3 (13 tests).

**Pillar 2 — International standards**: ISO 9001:2015 / JCI 7th ed. / CBAHI HC 4th ed. traceability matrix (21 tests). 21 CFR Part 11 controlled documents with cryptographic hash-chain e-signatures + `verifyIntegrity()` tamper detection (13 tests).

**Pillar 3 — Operations**: Supplier SCARs + 5-dim scorecard (11 tests), Calibration management ISO/IEC 17025 (10 tests), Change Control with CAB voting (8 tests), Internal Audit auto-scheduler ISO 19011 (8 tests), Cost of Quality ASQ PAF (9 tests).

**Pillar 4 — Analytical intelligence**: Predictive risk score from 10 signals (9 tests), Trend forecasting OLS + CUSUM (13 tests), Bilingual LLM narratives with mandatory PII redactor (14 tests), Mobile inspector backend offline-first (8 tests), 11-metric industry benchmarks (9 tests).

**Frontend**: 28 Next.js pages, 19 sidebar entries grouped under "الجودة".

### Added — Same-day follow-up (6 hardening additions)

- **Cross-module subscribers** auto-draft CAPA items for SPC special-cause / FMEA H-band / Audit NC / Calibration failure events. Severity-mapped. Opt-out via `PHASE29_SUBSCRIBERS_ENABLED=false`. 11 tests.
- **ISO 13485:2016 + ISO 14971:2019** plug-in registries (5 standards total now). 5 new tests.
- **Phase 29 demo seed** populates ~32 demo records across 12 modules. CLI: `node backend/scripts/seed-phase29-demo.js`. 3 tests.
- **Mobile Inspector PWA** at `/inspector` with IndexedDB offline queue, 3 checklist templates, auto-sync every 30s.
- **Executive QMS Command Center** — `/api/v1/quality/command-center` aggregator + `/quality` landing page. Prioritised "attention NOW" list across 10 kinds. 7 tests.
- **Post-deploy smoke probes** for all 17 Phase 29 endpoints. Same regression-class as the May 2026 ZATCA-bug. 17 tests (was 13).

### Aggregate

- **227 backend tests** (201 + 26 follow-up)
- **18 backend modules**, **20 HTTP routes**, **29 front-end pages**, **5 international standards**, **4 auto-CAPA triggers**, **17 smoke probes**

### Runbook

`docs/blueprint/29-world-class-qms.md` — canonical entry point with per-module API surface, capabilities, worked examples, test counts.

### Commits pushed to origin/main

```
055ce36c  Pillar 1 backend — analysis tooling
424b8efc  Pillar 2 backend — standards compliance
14c091a9  Pillar 3.1 backend — Supplier SCARs
cfa48fef  Pillars 3.2-4.5 backend — operations + intelligence
6dc00be7  chore(frontend): unblock pre-push lint
d4442864  Phase 29 follow-up — subscribers + ISO 13485/14971 + seed
04f56f3c  Allowlist 10 legacy registry partial-migration co-mounts
2a92bcd8  Executive QMS Command Center aggregator
20850372  Post-deploy smoke probes for Phase 29 (17 endpoints)
```

Frontend repo (no remote — bundle-backed): `2a81c8a`, `bf9b…`, `469fb32`, `931f08c`, `1b20b05`, `05ddacc`.

---

## [Unreleased] — 2026-05-15 — Phase 28 extended rollout (Supplier UI + RN + ops scripts)

### Added — UI rollout extension

- **Supplier edit page** (`apps/web-admin/src/app/(dashboard)/inventory/suppliers/[id]/edit/page.tsx`) — `<NationalAddressField/>` wired with client-side strict guard; `CreateSupplierPayload` extended with `nationalAddress`.
- **Employee form + Vehicle form** — both gain `<NationalAddressField/>` with `verification.verified` enforcement before submit. Payload types extended in `lib/api.ts`.
- **Legacy admin Branches** (`frontend/src/pages/Admin/AdminBranches.jsx`) — `<NationalAddressField/>` added inside the create/edit dialog; the field mirrors `shortCode` into the legacy `wasel_short_code` so the existing `/verify-balady` + `/verify-wasel` admin pipeline keeps working unchanged.
- **Mobile RN component** — `mobile/src/components/NationalAddressField.tsx` (real RN widget, not just typed client) + demo screen `mobile/src/screens/settings/NationalAddressScreen.tsx`. Drop into any stack navigator for parent/therapist/driver self-service.

### Added — Operational scripts

- `backend/scripts/backfill-branch-national-address.js` — projects legacy `Branch.wasel_short_code` + `Branch.wasel_verification` into the unified `nationalAddress` subdocument. Idempotent. Dry-run flag. 7-test pure-helper coverage at `__tests__/backfill-branch-national-address.test.js` (`projectLegacyToNationalAddress`, `isAddressMeaningful`).
- `backend/scripts/wasel-live-smoke.js` — pre-flight check before flipping `WASEL_MODE=live`. Exercises every adapter path against the real وَصِل endpoint and reports 5 checks (config / connection / verifyShortCode / verifyAndStamp pipeline / invalid-format handling) with exit codes 0/1/2.
- npm aliases: `npm run wasel:smoke`, `npm run wasel:backfill`, `npm run wasel:backfill:dry`.

### Updated

- Runbook `docs/blueprint/28-national-address-platform.md` — adds operational-scripts section, production-flip 6-step checklist.

### Tests

- All 6 existing national-address suites still green: **71/71 ✅**.
- web-admin TypeScript: **0 errors**.

---

## [Unreleased] — 2026-05-15 — Phase 28 Saudi National Address (وَصِل / SPL) — platform-wide rollout

### Added

- **Backend foundation** — single source of truth for the Saudi National Address embedded subdocument.
  - `backend/models/_shared/nationalAddress.subschema.js` — reusable Mongoose subdocument + `attachNationalAddressGuard(schema, opts)` strict `pre('validate')` hook.
  - `backend/services/nationalAddressService.js` — `coerceFromPayload`, `verifyAndStamp`, `requireVerified` (HTTP-mappable codes: `NATIONAL_ADDRESS_REQUIRED` 400, `NATIONAL_ADDRESS_INVALID_FORMAT` 400, `NATIONAL_ADDRESS_UNVERIFIED` 422).
- **Domain-model sweep** — 8 models now carry `nationalAddress` with the strict guard attached: Beneficiary, Customer, Vendor, Driver, Guardian, ContractParty, Employee (`HR/Employee.js`), Branch. Branch keeps its legacy `wasel_short_code` + `wasel_verification` fields for backward compatibility.
- **HTTP** — `POST /api/v1/wasel/address/verify-and-stamp` (in `routes/wasel-address.routes.js`) returns a UI-ready subdocument; idempotent via the existing middleware.
- **Next.js web-admin** (`alawael-rehab-platform/apps/web-admin`):
  - `src/lib/types/national-address.ts` — shared `NationalAddress` shape.
  - `nationalAddressApi.verifyAndStamp` / `searchByNationalId` added to `src/lib/api.ts`.
  - `<NationalAddressField />` drop-in form widget at `src/components/ui/national-address-field.tsx`.
  - Beneficiary form wired with strict client-side guard refusing submit when an address is present but unverified.
- **Legacy frontend** — `frontend/src/components/NationalAddressField.jsx` (drop-in for pages still under `frontend/src/pages/Admin`).
- **Mobile RN** — typed service client `mobile/src/services/modules/nationalAddress.ts` (`verifyAndStamp`, `searchByNationalId`).
- **Prisma** — `Branch.nationalAddress`, `Beneficiary.nationalAddress`, `Guardian.nationalAddress`, `Employee.nationalAddress` JSON columns + migration `20260515120000_add_national_address`.
- **Runbook** — `docs/blueprint/28-national-address-platform.md`.

### Tests

- `__tests__/national-address-subschema.test.js` — 12 ✅
- `__tests__/national-address-service.test.js` — 13 ✅
- `__tests__/beneficiary-national-address-guard.test.js` — 5 ✅
- `__tests__/national-address-models-sweep.test.js` — 24 ✅ (every model in the rollout)
- `__tests__/wasel-address-routes.test.js` — 9 ✅ (extended with `/verify-and-stamp` contract)
- **Total: 63 new tests** — all green.

### Why

Closes the gap where only Branch carried a verified national address and other entities used free-text or ad-hoc structured fields. PDPL, CBAHI, and Vision 2030 e-Government targets require a Wasel-verified address on beneficiary, employee, and payment-touching records. The wave applies the strict-verification policy: when an address is provided it must be Wasel-verified, but records without any address remain valid (preserves existing data).

### Operating note

Defaults to `WASEL_MODE=mock` (CI + local dev — `...00` short codes simulate `not_found`, `...99` simulates `invalid_format`). Flip to `WASEL_MODE=live` with `WASEL_BASE_URL` + `WASEL_API_KEY` for production.

---

## [Unreleased] — 2026-05-15 — Phase 27 CCTV Surveillance Platform (Hikvision) backend

A new vertical: central CCTV monitoring for all branches over Hikvision
ISAPI + RTSP, with an AI analytics layer on top of native smart events
and a PDPL-compliant access + audit model.

### Added — Backend

- **12 CCTV models** under `backend/models/cctv/`: `CctvCamera`,
  `CctvNvr`, `CctvEvent`, `CctvRecording`, `CctvAlert`, `CctvViewAudit`,
  `CctvAccessGrant`, `CctvFaceIdentity`, `CctvAnpr`, `CctvZone`,
  `CctvStreamSession`, `CctvHealthCheck`. All `Cctv*` prefixed to keep
  the model-collision baseline at 0.
- **Hikvision ISAPI adapter** at `backend/services/cctv/adapter/`:
  - `hikvisionISAPIAdapter.js` — real client (Digest auth RFC 7616,
    XML/JSON, deviceInfo, channels, snapshot, RTSP URL builder,
    playback search, PTZ continuous/preset, line/field detection,
    face library add/delete, event poll, ping).
  - `hikvisionMockAdapter.js` — deterministic mock for tests/dev.
  - `digestAuth.js` — pure helper.
  - `index.js` — selector by `HIKVISION_MODE`, wraps every call with
    `adapterCircuitBreaker` + rate limit + metrics + audit.
- **Core services**: `cameraService`, `nvrService`, `eventService`
  (normalises 23 Hikvision event codes into our internal type set,
  dedups by camera+type+second-bucket, emits `qualityEventBus`),
  `alertService` (10 default rules incl. fall/fight/fire/intrusion/
  tampering/disk_failure as single-shot critical), `streamService`
  (HLS session lifecycle, grant check, audit, idle reaper),
  `healthMonitor.service` (round-robin probe with online/offline
  state transitions).
- **AI analytics layer**: 8 detectors (face / intrusion / loitering /
  fall / ANPR / crowd / PPE / behavior) + orchestrator that fans an
  event out to applicable detectors and runs alert evaluation.
- **11 route modules** mounted under `/api/v1/cctv/` via the new
  `routes/registries/cctv.registry.js`: cameras, nvrs, events,
  alerts, streams, recordings, webhooks (HMAC-verified Hikvision push),
  ai (faces/anpr/zones), audit (+ grants), parent-portal, admin.
- **3 schedulers** auto-started from the registry on boot: health
  tick (60s), NVR tick (5m), idle stream reaper (30s). All can be
  disabled with `CCTV_DISABLE_SCHEDULERS=1`.

### Added — Tests

- 48 unit tests across 7 new suites under `backend/__tests__/cctv-*`:
  adapter, event normalisation, webhook HMAC, AI helpers, alert rules,
  grant time window, model registration (incl. TTL index check).

### Added — Docs

- `docs/blueprint/27-cctv-platform.md` — architecture, modules, env
  vars, PDPL compliance, smoke checks, next-commit roadmap.
- 18 new entries in `.env.example` covering the full CCTV config.

### Wired

- `routes/_registry.js` now imports `registries/cctv.registry.js` and
  invokes it in `mountAllRoutes` alongside Finance.

### Known gotcha

- Top-level `parseFloat(process.env.X)` reads can throw under Dynatrace
  OneAgent instrumentation depending on the module chain. All CCTV
  services use lazy env reads (`function _env() { return (typeof
process !== 'undefined' && process.env) || {}; }`) and getters on
  `module.exports` for the legacy names. Apply this pattern to any new
  service module that reads env at top level.

### Added — Web-admin UI (Phase 27 C8 — same session)

Lives in the `alawael-rehab-platform/` repo, mounted under
`/security/cctv/` in the Next.js admin app.

- `src/lib/types/cctv.ts` — 14 typed surfaces mirroring backend models
  (camera, NVR, event, alert, grant, audit, face, ANPR, zone…).
- `src/lib/cctvApi.ts` — typed fetch client. Standalone file (not
  appended to the already-4700-line `api.ts`).
- 9 admin pages under `src/app/(dashboard)/security/cctv/`:
  - **hub** — KPIs (online/offline/degraded/alerts), adapter-mode
    banner, branch grid, recent-alerts table, 8 quick-nav tiles
  - **cameras** — grouped-by-branch grid with live snapshot tiles +
    status badge + capability chips
  - **camera detail** — HLS player + PTZ 8-way d-pad + snapshot
    refresh + properties + recent-events feed + watermark overlay
  - **events** — filterable timeline (type / severity / branch),
    auto-refresh every 30s
  - **alerts** — queue with acknowledge / resolve / false-positive
    actions, auto-refresh every 15s
  - **AI / faces** — identity registry with add + disable
  - **AI / ANPR** — plate registry with allowlist / denylist /
    schedule / autoOpenGate
  - **audit** — PDPL view-audit log (filtered for DPO + admin)
  - **audit / grants** — access grants management with revoke
  - **ops** — health dashboard with manual probe trigger + adapter
    status + per-branch availability %
- Sidebar group "مراقبة CCTV" with 8 children (lucide icons:
  Video / Activity / AlertOctagon / ScanEye / Car / History / Gauge).
- `tsc --noEmit`: **0 errors** across 14,000+ TypeScript files in
  the workspace.

### Added — Parent portal (Phase 27 C10 — same session)

Lives in the `alawael-rehab-platform/` web-admin, mounted under the
existing `(parent)/parent/` route group (role-gated to GUARDIAN/PARENT).

- `(parent)/parent/cctv/page.tsx` — list of cameras the logged-in
  parent is **allowed to view right now** (calls
  `parentCctvApi.myCameras` → `/api/v1/cctv/parent-portal/my-cameras`).
  PDPL notice card always rendered.
- `(parent)/parent/cctv/[cameraId]/page.tsx` — live viewer with:
  - **consent gate** persisted in localStorage; viewer button is
    disabled until the parent explicitly accepts 5 PDPL clauses.
  - 4-overlay live watermark on the HLS `<video>`: user email +
    timestamp (top-start), "● مباشر — مسجَّل في سجل PDPL"
    (bottom-end), viewing-duration counter (bottom-start).
  - 10s heartbeat to central; automatic stop on unmount.
  - `controls={false}` + `playsInline` to discourage save-as.
- `parent-sidebar.tsx` gets a new "مشاهدة طفلي" nav entry (Video icon).
- `parentCctvApi` added to `src/lib/cctvApi.ts` (myCameras / startLive /
  heartbeat / stop).

### Added — Edge gateway service (Phase 27 C11 — same session)

New Node.js service at `services/cctv-edge-gateway/` designed to run
**one per branch**. Bridges the local Hikvision NVR to central:

- `eventPoller.js` — long-polls
  `/ISAPI/Event/notification/alertStream` with RFC 7616 Digest auth,
  parses each multipart XML chunk, forwards to central via
  HMAC-signed webhook.
- `centralClient.js` — `sha256=…` HMAC over raw body + exponential
  backoff retry (5 attempts).
- `queue.js` — Redis FIFO (`cctv:edge:events`) with in-memory ring
  fallback when Redis is unreachable.
- `replayWorker.js` — drains the queue once `centralClient.ping`
  succeeds; re-queues anything that still fails.
- `healthProber.js` — TCP-ping every camera (30s) and the NVR (60s),
  ships reachability + latency to central.
- `hlsManager.js` — spawns one ffmpeg per live session for RTSP → HLS,
  serves manifest + segments, idle reaper at 60s.
- `server.js` — Express on `:3291` (configurable) with `/health`,
  `/sessions`, `/hls/start|heartbeat|stop`, plus static manifest +
  segment routes.
- `config.local.example.json` — per-branch config template (NVR
  password is `passwordRef` → `process.env[X]`, never on disk).
- 6 unit tests covering ISAPI chunk parsing, Digest header build, and
  HMAC signing (`node --test`, all pass).
- Runbook in `services/cctv-edge-gateway/README.md`.

### Added — Mobile screens (Phase 27 C9 — same session)

React Native + Expo, in the `mobile/` workspace.

- `src/services/modules/cctv.ts` — typed CCTV client mirroring the web
  `cctvApi`. `snapshotUrl()` reads `EXPO_PUBLIC_API_URL` because
  `ApiService` keeps its axios instance private.
- Four screens under `src/screens/cctv/`:
  - **CctvBranchesScreen** — KPI row (total / online / offline) +
    alerts banner + scrollable branch cards with availability %.
  - **CctvCamerasScreen** — per-branch FlatList with status chip and
    capability chips (PTZ / Face / ANPR).
  - **CctvCameraDetailScreen** — auto-refreshing snapshot (every 5s)
    on `Image`, PTZ 8-way d-pad, 10s heartbeat once a live session
    starts, recent-events feed. Carries a comment for the future
    `expo-av Video` upgrade for real HLS playback.
  - **CctvAlertsScreen** — alert queue with severity-colored
    border-left, one-tap detail sheet (Alert.alert) offering
    استلام / إنذار كاذب / تم الحل, 15s auto-refresh.
- `SprintAppNavigator` gets a new **SecurityTabs** (red theme,
  Branches + Alerts) routed for roles `security_officer`, `security`,
  `admin`, `manager`. Plus root-stack `CctvCameras`,
  `CctvCameraDetail`, `CctvAlerts` so other roles can navigate by id.
- `services/modules/index.ts` re-exports the new cctv module.

TypeScript: 0 errors. ESLint: clean.

### Phase 27 status

All 11 slices shipped: backend (C1–C7) + admin web UI (C8) +
mobile (C9) + parent portal (C10) + edge gateway (C11).

---

## [Unreleased] — 2026-05-15 — Phase 27 scale-up to 50K cameras

Same-day follow-up: the platform was already complete end-to-end, but
hot-path bottlenecks limited it to ~5K cameras. These four levers
raise the ceiling to ~50K cameras and isolate per-NVR failures.

### Added — Scale infrastructure

- **`backend/services/cctv/eventQueue.service.js`** — batched ingestion
  buffer with `insertMany` bulk write + capped AI fan-out. Webhook now
  pushes in microseconds; flusher does the Mongo write in batches of
  500 every 250ms. Backpressure: returns `{ok:false, code:'QUEUE_FULL'}`
  at 95% capacity so the webhook returns `429 + Retry-After: 1`.
- **`backend/services/cctv/adapter/perTargetBreaker.js`** — multi-tenant
  circuit-breaker wrapper. Each NVR/IP gets its own breaker. Failing
  one NVR can no longer cascade-open a global "hikvision" breaker and
  knock out the other 99. Idle breakers GC'd after 10 min.
- **`backend/services/cctv/adapter/httpAgentPool.js`** — lazy
  keep-alive Node http.Agent per `(host:port:scheme)`. The ISAPI
  adapter now reuses sockets instead of doing TCP+TLS handshake per
  call. Per-origin socket cap prevents a misbehaving NVR from
  starving the pool.

### Changed — Hot path

- **`webhooks.routes.js`** — both `/nvr/:nvrCode` and `/camera/:code`
  now check backpressure first and return 429 when saturated. AI
  dispatch removed from the inline path (queue handles it).
- **`eventService.ingestFromHikvision`** — default path is now
  enqueue + return. Synchronous insert path retained for
  `CCTV_QUEUE_DISABLE=1` (tests).
- **`healthMonitor.tick`** — now shards by branch (each branch has its
  own cursor + fair share) and probes with `CCTV_PROBE_CONCURRENCY`
  parallel workers. One sluggish branch can no longer starve probing
  on the others.
- **`hikvisionISAPIAdapter.rawRequest`** — every HTTP call now goes
  through `httpAgentPool.for(host, port, secure)`. Lazy timeout
  resolution so env var changes apply immediately.
- **`adapter/index.js`** — the global breaker was replaced with
  `perTargetBreaker.get(opts.ip)`. `getConfig()` now reports
  per-target breaker snapshots + agent pool stats.

### Added — Ops endpoints

- `GET  /api/v1/cctv/admin/queue` — depth, high-water-mark, drops, errors
- `POST /api/v1/cctv/admin/queue/flush` — force-flush (debug)
- `POST /api/v1/cctv/admin/breakers/reset/:target?` — reset one or all

### Added — Tests

- `cctv-event-queue.test.js` (5 tests) — push/depth/capacity/dropped/
  drain
- `cctv-per-target-breaker.test.js` (5 tests) — isolation between
  targets + reset
- `cctv-http-agent-pool.test.js` (5 tests) — same-origin reuse,
  scheme/port separation, keep-alive flag

Total CCTV test count: **63 passing** across 10 suites.

### Added — Docs

- `docs/blueprint/27-cctv-scale-guide.md` — tier matrix (S/M/L/XL),
  per-tier deploy checklist, env knob reference, ops endpoints,
  load-test recipe, symptom → fix table.
- 14 new entries in `.env.example` covering the scale knobs.

---

## [Unreleased] — 2026-05-12 — 17-commit cleanup + verified manual deploy + 11 real bugs caught

A long session combining a Quality module expansion, frontend admin pages refresh,
two repos (`66666` + `alawael-rehab-platform`), an end-to-end verified VPS deploy
recipe, and 11 concrete bugs surfaced by re-enabling lint/typecheck/test gates that
had been silently bypassed.

### Added — Backend

- **Management-Review service** rewrite — analytics + dashboard helpers,
  action-status tracking, minutes, idempotent close/cancel, auto-schedule
  next periodic review. 55 new unit tests using an in-memory fake model
  (no DB required). `services/quality/managementReview.service.js` grew
  from 489 → 675 lines.
- **3 new Quality admin endpoints** — `managementReview.routes.js`
  (analytics + action-status surfaces), `capa-admin.routes.js`,
  `evidence.routes.js` (per-bucket distribution), `qualityHealthScore.routes.js`.
- **eSignature template hardening** — return 400 on ValidationError
  (not generic 500), surface 11000 dup-key with Arabic message,
  fall back to `req.user.userId || req.user.id` for JWT payload variants.

### Added — Frontend (66666)

- **8 Quality admin pages expanded** (~3,500 lines) — ManagementReviewAdmin
  (full vertical: agenda, attendees, inputs/outputs, decisions, actions,
  minutes, approval, analytics), QualityDashboard (KPI tiles, charts,
  branch health), QualityPage (hub with subject cards), CapaAdmin,
  EvidenceVaultAdmin, ComplianceCalendarAdmin, PdplComplianceDashboard,
  PolicyLibraryAdmin.
- **Tele-Rehab + Equipment-Lifecycle routes** mounted in
  `routes/index.js` + `AuthenticatedShell.js`.

### Added — Platform repo (alawael-rehab-platform)

- **Landing-config section types**: `branches` + `vision` body shapes +
  renderers in `apps/web-admin/src/app/landing-preview/page.tsx`.
  `ICON_GLYPH_MAP` turns common lucide icon names into unicode glyphs.
- **Next.js ESLint config** (`apps/web-admin/.eslintrc.json` with
  `next/core-web-vitals`) — was missing, so `next lint` blocked on
  interactive prompt in CI.

### Fixed — 11 real bugs surfaced

1. **`react-hooks/rules-of-hooks` violation** in `appointments/[id]/page.tsx`:`StatusActions`
   — 5 `useState` calls sat after an early-return. Would crash with
   "Rendered fewer hooks than expected" once `transitions.length === 0`.
2. **`useTemplate` callback** in `therapist-templates/page.tsx` tripped
   rules-of-hooks. Plain clipboard-copy callback, not a hook. Renamed to `applyTemplate`.
3. **`a11y/aria-progressbar-name`** — 8 MUI `<LinearProgress>` across 5 Quality pages
   missing `aria-label`. Caught by axe-core in `management-review-admin.a11y.test.js`.
4. **Jest config conflict** — both `jest.config.js` and `package.json[jest]` existed;
   `npx jest <file>` failed with "Multiple configurations found".
5. **`hr-app/Dashboard.js` duplicate declaration** — two `const Dashboard = () => ...`
   blocks. Hard parse error. Collapsed to a single re-export.
6. **6 unescaped JSX entity errors** in `landing-preview/page.tsx`,
   `push-subscriptions/page.tsx`, `dynamic-form-renderer.tsx`.
7. **`@alawael/core/intake.service.ts` — 2 TS errors** (`Intake | undefined`
   under `noUncheckedIndexedAccess`). Unwrapped the transaction return.
8. **`@alawael/core/lint` script referred to eslint** not in workspace.
   Only 1/18 services had this stale script.
9. **5 service packages with `"test": "jest"` + zero test files** —
   added `--passWithNoTests` to unblock `pnpm turbo test`.
10. **Stale `@typescript-eslint/no-unused-vars` eslint-disable** in `lib/api.ts`.
11. **Critical deploy bug**: `chown -R www:www` after backend rsync clobbers
    `.env` ownership; pm2 runs as `alawael` and can't read → env-validation
    crash loop. Recovery: `chown alawael:alawael .env && chmod 600 .env`.
    Documented in `memory/project_session_2026-05-12_full_deploy.md`.

### Removed

- `frontend/src/pages/Quality/_QualityPage_backup.jsx` (1-line deprecated stub).
- `services/core/package.json` stale `lint` script.

### Test totals

- **Backend**: 25,115 passing (was 20,179 four weeks ago)
- **Frontend**: 11,094 active + 19 skipped (DocumentList orchestrator; describe.skip
  with TODO replaces a hidden regex in jest config)
- **Mobile**: 113 passing
- **Platform-core**: 295 passing (was 7 + 21 suites failing to compile because
  Prisma client wasn't generated — `pnpm db:generate` is now part of the deploy recipe)
- **Total**: 36,617 passing across 4 surfaces

### Deployed manually (auto-deploy workflow stopped firing — root cause TBD)

- alaweal.org:5000 (backend + CRA) — `/api/v1/management-review/dashboard` returns
  401 (route mounted + auth-gated) — proves new code is live.
- alaweal.org:3100 (web-admin Next.js) — `/admin/landing-preview` serves with
  the new `branches` + `vision` renderers.
- `build-info.commit` still reports stale `c48e304a` because GIT_SHA isn't
  updated on rsync deploys (known issue from 2026-05-11 — trust file mtimes).

### Incident

- `/api` was 502 for ~3 minutes during backend deploy recovery when `.env`
  ownership caused a pm2 crash loop. Restored by copying `.env` from
  `.FAILED-` dir + `chown alawael:alawael` + `chmod 600`. No data loss.

---

## [Unreleased] — 2026-05-02 — Operational hardening + 9 silent-failure fixes

A 30-step session that closed three production-readiness gaps end-to-end
(NPHIES claims, ZATCA Phase 2, DR/encryption) and surfaced + fixed nine
silently-broken pieces of test/CI infrastructure that had been hiding
real regressions for months. **238 new tests** ship under guard. The
frontend test gate widened from ~14 a11y-only tests to **all 11,068**
in one workflow change.

### Added — End-to-end pipelines

- **DR/encryption stack** — daily restore drill (`backend/scripts/dr-verify.js`,
  GitHub Actions cron 04:00 UTC) + AES-256-GCM streaming encryption
  (`backend/utils/backup-crypto.js`) + ops-alerter wiring
  (`backend/services/ops-alerter.js`). 30 tests. Runbook
  `docs/blueprint/19-dr-verification.md`.
- **NPHIES session→claim bridge** — `buildClaimFromSession()` mapping
  Arabic session types to CPT codes, errors-vs-warnings split,
  insurance gating. Per-session `POST /api/admin/therapy-sessions/:id/create-claim`
  - bulk `/bulk-create-claims` (atomic, idempotent, partition-honest:
    `created`/`skipped`/`failed`). Frontend dialogs with WCAG 2.1 AA
    audits. 41 tests. Runbook `docs/blueprint/21-session-to-claim-bridge.md`.
- **InsuranceTariff resolver + admin** — `services/insuranceTariffs.js`
  with deterministic `(provider, providerId, cptCode, date)` lookup
  rules. Admin CRUD route + page with double redaction layer for
  sensitive fields. 25-row Saudi insurer seed (Bupa/Tawuniya/MedGulf/
  AlRajhi/Walaa × 5 rehab CPTs). Wired into deploy as idempotent
  post-restart step. 41 tests.
- **ZATCA Phase 2 wiring** — routes mounted in `_registry.js` (was
  silently 404), Invoice post-save hook behind `ZATCA_AUTOSUBMIT`
  flag, real-time ops-alerts on REJECTED, 24-hour SLA sweeper
  (`zatcaB2cSlaSweeper.js` + scheduler), per-branch `ZatcaCredential`
  admin page with onboarding/promote actions, sensitive-field
  redaction. 47 tests. Runbook `docs/blueprint/22-zatca-phase2.md`.
- **Lifecycle isBilled lock** — `nphiesReconciliationService.applyClaimUpdate`
  now sets `session.isBilled=true` on transition into APPROVED,
  preventing double-billing through any of the create-claim paths.
  Best-effort, idempotent, race-safe. 8 tests.

### Added — CI/Deploy hardening

- **Post-deploy smoke probes** (`backend/scripts/post-deploy-smoke.js`)
  — 10 critical endpoints checked after every deploy. Catches the
  "registered in code but unmounted" bug class that hid ZATCA routes.
  Fires `ops-alerter` on critical failures. 16 tests.
- **Frontend test gate widened** — was a 14-test a11y-only slice, now
  the whole 11,068-test suite runs as a hard gate on every PR.
- **Daily DR drill** workflow (`.github/workflows/dr-verify.yml`).
- **Idempotent tariff seed** wired into deploy.
- **Go-live checklist** at `docs/blueprint/23-go-live-checklist.md`
  consolidating 11 runbooks into one operator-friendly index.

### Added — Drift guards (7 ratchets/strict gates protecting future work)

- `frontend/src/__tests__/drift/no-brittle-count-assertions.test.js`
  — bans `expect(matches.length).toBe(N)` for source-text counts
- `frontend/src/__tests__/drift/react-app-env-vars-documented.test.js`
  — every `process.env.REACT_APP_*` must be in `frontend/.env.example`
  (strict) + dead-var ratchet at 14 (drive down)
- `backend/tests/unit/env-vars-documented.test.js` — same as above for
  backend, ratchet at 260 undocumented + 166 dead
- `backend/tests/unit/admin-routes-have-probes.test.js` — every
  `MUST_HAVE_PROBE` admin route in `_registry.js` has a smoke probe
- a11y hard gate via `frontend-tests` job in `pr-checks.yml`

### Fixed — Nine silent failures

1. **`cypress/support/commands.js` empty `cy.checkA11y` stub** —
   shadowed `cypress-axe`'s real implementation, making every cypress
   a11y assertion trivially pass. Removed.
2. **Frontend tests never ran in CI** — the entire 11K suite was
   uncovered. Now gated.
3. **`continue-on-error: true` on backend tests in deploy** —
   removed. Failures now block.
4. **`|| echo "⚠️"` after `npm test` in deploy** — masked exit codes.
   Removed.
5. **`deploy.if:` block ignored `needs.test.result`** — even with the
   above fixed, deploy could still proceed on failure. Fixed.
6. **`alerts/rules/zatca-submission-rejected.js` queried wrong
   field** (`zatcaSubmission.status` instead of `zatca.zatcaStatus`)
   — every ZATCA REJECTED row was invisible to the alert evaluator.
   Fixed and now also fires real-time alerts from the hook.
7. **63 brittle `toBe(N)` count assertions** auto-generated across
   `services-*.test.js` files — bulk-migrated to
   `toBeGreaterThanOrEqual(N)`. Guard test prevents reintroduction.
8. **23 backend env vars** referenced in code but missing from
   `.env.example` (this session's flags + 7 pre-existing ZATCA names).
   Added.
9. **3 frontend `REACT_APP_*` vars** missing from `frontend/.env.example`.
   Added.

### Memory entries

12 new project memories under `~/.claude/.../memory/` carrying the
_why_ + the gotchas (e.g. mongoose `isValidObjectId` mocked in
test env → use 24-hex regex; `\s` includes `\n` so use `[ \t]` for
single-line whitespace).

### Added — Regulatory admin tier (continued, same session)

After the 30-step operational push, the same session continued into
QMS + PDPL UI gaps surfaced by the QMS audit memo. Each gap closed
with a real admin page (not a stub) wired into the navigation tree
under explicit CBAHI / PDPL / NPHIES / ZATCA badges.

- **QMS — ISO 9001 §9.3 Management Review** admin page — was missing
  the UI tier (backend existed). Closes the CBAHI accreditation gap.
- **QMS — Evidence Vault** admin page — repository view for the
  audit trail of decisions, signed forms, and policy approvals.
- **QMS — Compliance Calendar** admin page — recurring deadlines
  - escalation visibility for the QMR / DPO.
- **PDPL Article 4 — Data-Subject Requests** admin page with 30-day
  SLA countdown chip and export/erase actions for the DPO.
- **PDPL Article 6 — Consent Records** admin page.
- **PDPL Article 20 — Breach Reporting** admin page with 72-hour
  SDAIA notification timer.
- **PDPL Article 32 — Processing Records** admin page (RoPA).
- **PDPL Compliance Dashboard** — single DPO entry-point that ties
  the four PDPL pages above together with badge counters.

### Added — PII access audit (PDPL Article 13)

- **`backend/middleware/piiAccess.middleware.js`** — wraps any route
  and writes a `pii.access.read` AuditLog entry on every successful
  2xx read of a PII record. Hooks into `res.on('finish')` so latency
  stays at zero. Skips 4xx/5xx (denied access ≠ disclosure), skips
  anonymous (no actor), skips OPTIONS/HEAD. Best-effort: AuditLog
  write failure NEVER bubbles into the request lifecycle. **10 tests**.
- **`backend/routes/pii-access-audit-admin.routes.js`** — admin
  query API at `/api/admin/pii-access-audit` with two modes:
  filterable list + aggregator `/by-target` (distinct viewers + counts
  for "who viewed user X between date A and B"). Window capped at
  365 days. **5 tests**.
- **`frontend/src/pages/Quality/PiiAccessAuditAdmin.jsx`** — dual-tab
  UI (list + by-target query) wired at `/quality/pdpl/access-audit`.
  Sidebar entry under PDPL with red-badge surface.
- **Coverage applied to 7 high-PII GET /:id endpoints**:
  - `/api/admin/beneficiaries/:id` (Beneficiary)
  - `/api/admin/invoices/:id` (Invoice)
  - `/api/admin/nphies-claims/:id` (NphiesClaim)
  - `/api/admin/care-plans/:id` (CarePlan — clinical)
  - `/api/admin/assessments/:id` (ClinicalAssessment — health data)
  - `/api/admin/therapy-sessions/:id` (TherapySession — clinical notes)
  - `/api/v1/hr/employees/:id` (Employee — salary/contract PII)
- **Structural guard updated** — `MUST_HAVE_PROBE` extended to 9
  entries; smoke probe added for `/api/admin/pii-access-audit`.
  Any PR that unmounts the audit log API fails the build at PR
  time AND fails the deploy smoke after merge.

**PDPL Article 13 accountability story COMPLETE — SDAIA-ready.**

---

## [Unreleased] — 2026-04-28 — Test-harness + auth-gate consolidation

Sprint suite: **1553 passing**.

### Fixed

- **Mongoose 9 hook compat shim** — patches `Schema.prototype.pre/post`
  in `backend/config/mongoose.plugins.js` so legacy
  `function(next) { ...; next(); }` document hooks keep working under
  mongoose 9 (which dropped `next` for document hooks). Single-file
  fix that protects 90+ models without touching them individually.
- **`Invoice.pre('save')`** rewritten to the modern no-arg shape.
- **`models/VitalSign.js`** populated — was a 0-byte placeholder
  from the v4.0.74 mass push, blocking the
  `clinical.pediatric.weight.drop_5pct` red-flag adapter.
- **`__tests__/acl-client-dlq.test.js`** populated with seven specs
  covering the AclClient → DLQ handoff (success no-park, retry
  exhaustion, parkOnFailure=false, PII redaction, DLQ-failure
  isolation, circuit-breaker short-circuit).
- **31 integration tests** (QMS + Red-Flag observations + admin
  API) add `jest.unmock('mongoose'); jest.resetModules();` so they
  exercise real mongoose instead of the global mock. Pass-rate
  uplift across these files: roughly +250 newly green.
- **Red-Flag admin RBAC gap** — `/api/v1/admin/red-flags/dashboard`
  was authenticate-only; any logged-in user could read it. Auth +
  role gate now baked into the factory (defense in depth).
- **`admin-routes-auth-wiring.test.js`** drift test recognizes
  `authorize` (the canonical role-checker in `middleware/auth.js`)
  and a global `router.use(...)` role gate.

### Added

- **`backend/__tests__/no-broken-requires.test.js`** — drift guard
  that walks every backend `.js` file and resolves every relative
  `require(...)` against the filesystem, failing the sprint gate
  if any new typo'd or stale require lands. Wired into both
  `npm run test:sprint` and `test:drift`. Allowlist for documented
  false positives (the migration script's string templates + a
  legacy auto-generated test stub).
- **`docs/blueprint/13-ops-control-tower-api-playbook.md`** —
  420-line curl-driven reference for all eight Phase-16 ops
  surfaces (was a 0-byte placeholder).
- **Phase 17 Care Platform UI** in
  `alawael-rehab-platform/apps/web-admin`: 7 subject pages live
  (`/care/{crm,social,home-visits,welfare,community,psych,independence}`)
  with cross-navigation back to `/care/360/[beneficiaryId]`.
- **Phase-13 QMS runbook** linked from `docs/runbooks/README.md`
  index.

---

## [4.0.114] — 2026-04-25 — Phase 19 Commit 1: Forms Catalog

Adds 32 ready-to-use form templates across three audiences so admins can
turn on a working form with one API call instead of building it from
scratch in `FormDesigner`.

### Added

- **`backend/config/forms-catalog.registry.js`** — frozen catalog of 32
  form templates: 12 beneficiary (intake, consent ×3, complaints,
  satisfaction, welfare, transfer, home-visit, info-update, cessation),
  12 HR (annual / sick / maternity leave, overtime, salary advance,
  salary / position / branch change, resignation, performance review,
  employee complaint, training request), 8 management (purchase, vendor
  onboarding, budget approval, capex approval, policy change, strategic
  decision memo, audit-finding response, risk acceptance).
- **`backend/services/formsCatalogService.js`** — DI-friendly service:
  `listAll({ audience, category })`, `getById(id)`, `summary()`,
  `instantiate(id, ctx)`, `instantiateAll(ctx, { audience })`.
  Idempotent on `(catalogId, tenantId, branchId)`.
- **`backend/routes/forms-catalog.routes.js`** — REST surface mounted at
  `/api/v1/forms/catalog` (read endpoints any-authed; instantiate gated
  to admin / forms_admin).
- **`backend/scripts/seed-forms-catalog.js`** — CLI runner with
  `--audience`, `--tenant`, `--branch`, `--dry-run`, `--reset`, `--json`,
  `--help`. Three new npm scripts: `seed:forms-catalog`,
  `seed:forms-catalog:dry`, `seed:forms-catalog:reset`.

### Tests

- `backend/__tests__/forms-catalog-registry.test.js` — 14 tests:
  unique IDs, audience/id alignment, valid field types, no duplicate
  field names, options for select/radio, section references resolve,
  approval workflow shape, summary correctness, minimum coverage per
  audience.
- `backend/__tests__/forms-catalog-service.test.js` — 15 tests: pure
  reads, idempotent instantiate, audience filter on `instantiateAll`,
  `CATALOG_NOT_FOUND` error code, `buildTemplateDoc` metadata stamp.
- New `npm run test:forms-catalog` runs both: 29 tests / 2 suites in ~1s.

### Documentation

- **`docs/blueprint/19-forms-catalog.md`** — full runbook listing every
  form, REST surface, CLI usage, idempotency semantics, extension
  guidelines.

### Non-goals

- No FormDesigner UI changes — catalog is consumed via REST; existing
  designer edits any FormTemplate (including catalog-instantiated ones).
- No FormSubmission changes — submissions use the same flow.
- No auto-seed on tenant create — onboarding policy decision per tenant.
