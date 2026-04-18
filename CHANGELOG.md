# Changelog — Al-Awael ERP

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [4.0.5] — 2026-04-18 — PDPL correlation + deploy gate + DX polish

Final polish on the 4.0.x arc. Focus: close the remaining compliance
gap (correlation of cascaded calls) and prevent the one class of
production incident that kept nagging at the runbooks — someone flips
`*_MODE=live` without the secrets.

### Added

- **Correlation IDs across the audit trail.** `AdapterAudit.correlationId`
  now carries `req.id` (set by the existing X-Request-Id middleware),
  so the 4 adapter calls from a single HR onboarding POST all share
  one ID. New `GET /admin/adapter-audit/by-correlation/:id` surfaces
  them in chronological order. `AdminAdapterAudit.jsx` grows a Hub
  icon column + dialog showing the full cascade on click. DPO DSAR
  becomes a 2-click flow.

- **Deploy gate**: `backend/scripts/preflight.js` + `preflight-script.test.js`
  (7 tests). Exits 1 with a per-provider missing-vars list if any
  `*_MODE=live` adapter is misconfigured. Three modes: TTY (colored),
  `--json` (machine), `CI_PREFLIGHT=1` (compact stderr-only). Wire
  as k8s initContainer / Dockerfile RUN / CI pre-promote gate.

- **Operator ergonomics**:
  - `scripts/gov-status.js` — colorized CLI snapshot of all 10
    adapters (exit 0/1/2 for cron consumption)
  - `OPERATIONS.md` — one-page front door: health hierarchy,
    6 incident-path one-liners, flip-to-live checklist, SLI PromQL
    recipes, emergency-reset curl
  - Root `Makefile` wrapping 14 npm targets with a `make help`
    menu auto-generated from `##` docstrings

### Tests

Sprint suite grows from 182 → **208 passing**:
• +3 correlation routing/lookup tests
• +9 Grafana JSON + Alertmanager YAML structural validation
• +7 preflight exit-code contract tests
• +7 DSAR hash-helper contract tests (CLI ↔ library parity)

`ops-artifacts.test.js` cross-checks every metric family referenced
by the dashboard/alerts exists in the Node source and vice-versa —
drift now fails the PR instead of failing at Grafana reload time.

### PDPL DSAR (added late in 4.0.5)

- `docs/runbooks/dsar-adapter-audit.md` — 4-step compliance workflow
  for Saudi Personal Data Protection Law Data Subject Access Requests.
  Includes the 30-day legal clock, 4 edge cases (no rows / hash
  mismatch after secret rotation / large cascade / erasure vs access).
- `backend/scripts/dsar-hash.js` — CLI helper that reproduces the
  `adapterAuditLogger.hashString()` output so compliance can query
  `/admin/adapter-audit?targetHash=...` without the raw ID ever
  reaching the server. Exposed via `npm run dsar:hash -- <id>` at
  root, `make dsar-hash ID=...` on Linux/macOS.

---

## [4.0.4] — 2026-04-18 — Docs, runbooks, CI widening

Closes the 4.0.x arc by packaging everything into a shape ops/on-call
can actually consume, and widens the CI gate to cover the new
subsystems.

### Added

- `frontend/components/IntegrationsHealthBadge.jsx` — 60s-poll status
  chip embedded in `/admin` landing page header. Green/amber/red with
  tooltip naming misbehaving providers, click-through to
  `/admin/integrations-ops`.
- `docs/runbooks/README.md` — alert→runbook mapping table.
- `docs/runbooks/gov-adapter-rate-limit.md` — 4 diagnosis cases for
  rate-limit saturation (runaway cron / legitimate spike / noisy
  actor / capacity misconfig).
- `docs/runbooks/gov-adapter-misconfigured.md` — 4 cases for missing
  env vars (rotated secret / config drift / manual unset / fresh env).
- 3 new SLI panels in `gov-integrations.grafana.json`: stacked request
  rate by status, 5m success rate with color bands, p50/p95/p99 latency
  overlay.
- 2 new SLI alert rules (`GovAdapterSuccessRateLow`,
  `GovAdapterLatencyP95High`).
- Observability section in `GOV_INTEGRATIONS_GO_LIVE.md` with scrape
  config, metric catalog, and PromQL recipes.
- 8 new Postman requests in "Ops — Integrations" folder (rate limits
  snapshot/reset, circuits snapshot/reset, audit list/stats/by-entity/
  CSV export) + Prometheus endpoint in Health folder.

### Changed

- `sprint-tests.yml`: new `ops-subsystems-tests` job runs the 4 new
  suites (rate limiter / circuit breaker / live-path / metrics registry)
  as a hard CI gate. Path triggers widened to include the new test
  files + `utils/safeError.js`. Summary now reports 182 tests across
  5 jobs.
- `backend/package.json`: `test:sprint` covers all 7 sprint suites;
  new `test:ops-subsystems` script for the 4 ops-layer suites.
- `runbook_url` annotations added to rate-limit + misconfigured
  alert rules (circuit already had one).

Sprint suite: **182/182 passing** — all gated in CI.

---

## [4.0.3] — 2026-04-18 — Reliability + observability hardening

Every cost-critical adapter now has a circuit breaker, every subsystem
emits Prometheus metrics, and compliance can export the audit trail to
CSV. Grafana + Alertmanager artifacts ship in the repo so a real
monitoring stack is one import away.

### Added

- `backend/services/adapterCircuitBreaker.js` — shared factory with
  named registry. Wired into GOSI (refactored, byte-identical), Absher,
  NPHIES (both eligibility + claim paths), and Fatoora. 4xx answers
  count as successes (the provider responded; our input was wrong);
  only 5xx / timeout / network errors trip the breaker.
- `GET /api/admin/gov-integrations/circuits` — per-provider snapshot.
- `POST /api/admin/gov-integrations/circuits/:provider/reset` — force-
  close a circuit the operator knows is transient (UI button added).
- `GET /api/health/metrics/integrations` — unauth Prometheus text-
  format endpoint. 9 metric families × 10 providers: rate-limit
  (capacity/available/utilization/active-actors), circuit (open/
  failures/cooldown), configured, mode. Resilient: `safeGetConfig()`
  shields the metrics path from a broken adapter.
- `GET /api/admin/adapter-audit/export.csv` — UTF-8 BOM so Excel
  renders Arabic correctly. 10k-row cap with narrow-the-filter hint.
- `docs/alerts/gov-integrations.yml` — 5 Alertmanager rules (circuit-
  open → page, rate-limit >85/100 → warn/page, misconfigured → warn,
  flipped-to-live → info).
- `docs/dashboards/gov-integrations.grafana.json` — 9-panel dashboard
  with provider-variable filtering.
- `docs/runbooks/gov-adapter-circuit.md` — on-call playbook covering
  upstream-down / network-blip / misconfig / 401-storm paths.

### Changed

- GOSI: migrated its inline circuit to the shared factory. No behavior
  delta (74 e2e tests confirm).

### Tests

- `adapter-circuit-breaker.test.js` — 16 tests (defaults, env overrides,
  rolling window, cooldown auto-close, reset, isolation, snapshot
  contract + 4 adapter integration checks).
- `new-admin-routes.api.test.js` — +7 (circuits snapshot/reset/404,
  Prometheus metrics format/help-type, CSV content-type+BOM+header).

Sprint suite: **168/168 passing** (was 145 at 4.0.2 start).

---

## [4.0.2] — 2026-04-18 — Integrations Ops dashboard + PDPL audit UI

Glue layer over the 4.0 + 4.0.1 groundwork: operators now get one
morning-check dashboard that tells them whether anything needs
attention, plus a dedicated PDPL audit viewer for compliance queries.

### Added

- `frontend/pages/Admin/AdminIntegrationsOps.jsx` — unified ops page
  at `/admin/integrations-ops`. Fan-outs to `/health/integrations`,
  `/admin/gov-integrations/rate-limits`, and `/admin/adapter-audit/stats`,
  then renders a single traffic-light banner, 4 KPI cards, and a
  10-row provider matrix (mode · configured · circuit · util bar ·
  actors · 30-day volume · success rate · avg latency). 20s poll.
- `frontend/pages/Admin/AdminRateLimits.jsx` — live per-provider
  token-bucket cards with one-click reset.
- `frontend/pages/Admin/AdminAdapterAudit.jsx` — 2-tab PDPL viewer
  (30-day rollup + filterable paginated log). Rate-limited rows
  flagged, SHA-256 hashes tooltipped as "PDPL-safe".
- Mobile: `ApiService.ts` auto-retries 429 once using server's
  `retryAfterMs`, then shows Arabic toast naming the provider.

### Changed

- `utils/safeError.js` — pass through 4xx errors with their own
  `statusCode`/`code`/`retryAfterMs` instead of flattening to 500.
- `frontend/AuthenticatedShell.js` — fixed Chat/Telehealth case-
  mismatch imports that would 404 on Linux CI.

### Fixed

- 3 untracked sprint pages (ChatV2, TelehealthList, TelehealthRoom)
  committed — lazy-loaded routes now actually resolve.

### Tests

- `__tests__/adapter-rate-limiter.test.js` — 13 unit tests.
- `new-admin-routes.api.test.js` — 10 new smoke tests for rate-limits
  - adapter-audit endpoints. Sprint suite is now **145/145 passing**
    (was 122).

---

## [4.0.1] — 2026-04-17 — Per-adapter rate limiter (cost protection)

Adds a token-bucket rate limiter in front of every `audit.wrap()` call
to the 10 Saudi government adapters. The motivation is cost control:
Absher/NPHIES/Fatoora are billed per call, and a misconfigured cron or
runaway loop could burn thousands of SAR in an afternoon.

### Added

- `backend/services/adapterRateLimiter.js` — per-provider token bucket
  with per-actor sub-cap. Defaults tuned to real vendor tiers
  (GOSI 60/30/20, Absher 30/10/5, NPHIES 120/60/30, Fatoora 600/600/200).
  Override via `{PROVIDER}_RL_CAPACITY` / `_RL_REFILL_PER_MIN` /
  `_RL_ACTOR_CAP` env vars.
- `RateLimitError` (code `RATE_LIMITED`, statusCode 429) now thrown
  transparently from `adapterAuditLogger.wrap()` on quota breach.
- Admin endpoints: `GET /api/admin/gov-integrations/rate-limits`
  (snapshot of all 10 providers) and `POST
/api/admin/gov-integrations/rate-limits/:provider/reset` (operator
  escape hatch).
- 13 unit tests (`adapter-rate-limiter.test.js`) covering pool
  exhaustion, per-actor cap precedence, refill over time, env overrides,
  and the audit-wrap integration path.

### Changed

- `backend/utils/safeError.js` — passes through errors with a 4xx
  `statusCode` (e.g. `RateLimitError=429`) instead of flattening to 500. Response body carries `code`, `retryAfterMs`, `scope`, and
  `provider` so clients can implement intelligent backoff.

### Notes

- Pure in-memory bucket — fine for single-instance deployments.
  Multi-instance production should back this with Redis (swap the
  `Map` for a redis-backed store).
- Rejection path is audited as a `status: 'rate_limited'` row so ops
  can see cost attempts on the admin dashboard.

---

## [4.0.0] — 2026-04-17 / 2026-04-18 — Rehab Core + Saudi Gov Integrations

Two-day sprint shipping 20 backend modules, 10 Saudi government adapters,
6 mobile screens, and 122 deterministic tests — all protected by a CI
hard-gate. Everything defaults to mock mode so dev runs without any
credentials; production is an env-var flip away.

### Added — Backend modules (20)

- `branches-admin` · `beneficiaries-admin` · `therapy-sessions-admin`
- `assessments-admin` (CARS/VB-MAPP/Vineland/Denver) · `care-plans-admin` (IEP 3-tier)
- `unified notifications` (WhatsApp+SMS+Email+Push fallback chain)
- `parent-portal-v2` · `therapist-workbench` · `bi-analytics` (11 KPIs)
- `invoices-admin` (ZATCA envelope) · `chat-v2` (role-aware directory)
- `clinical-docs` (multer + SHA-256 e-sign) · `telehealth-v2` (Jitsi)
- `auth/nafath` (SSO with 2-digit random number)
- `hr-compliance` · `gov-integrations` control panel · `nphies-claims`
- `branch-compliance` · `adapter-audit` (PDPL trail, 730-day TTL)
- `integrations-health` (public aggregator for K8s/Grafana)

### Added — 10 Saudi government adapters (uniform interface)

GOSI · SCFHS · Absher/Yakeen · Qiwa · Nafath · Fatoora (ZATCA) · Muqeem
· NPHIES (CCHI) · Wasel (SPL) · Balady. All expose `verify` /
`testConnection` / `getConfig`. Mock mode is deterministic (keyed off
ID suffixes); live flipped via `{PROVIDER}_MODE=live` + creds.

GOSI ships with production-grade hardening: token caching, 5-failure
circuit breaker with 120s cooldown, AbortController timeout, auto-retry
on 401/network errors.

### Added — ZATCA Phase-2 XAdES-BES signer

`backend/services/zatcaXmlSigner.js` — pure-Node UBL 2.1 XML generation,
C14N 1.1 canonicalization, SHA-256 digest, RSA-SHA256 signing over
canonical SignedInfo, XAdES `ds:Signature` block injection. Live mode
requires `ZATCA_PRIVATE_KEY` (PEM RSA-2048) + `ZATCA_CSID_CERT`
(base64 DER). In-test RSA signature verification proves the pipeline
cryptographically without real ZATCA creds.

### Added — Frontend admin (15+ pages) + portals

Dedicated pages for every backend module with branch-scoped RBAC.
Parent portal at `/my-children` · therapist workbench at `/workbench`
· Nafath SSO at `/login/nafath` with CTA on main login.

### Added — Mobile (React Native + Expo)

- 6 typed TypeScript API clients in `mobile/src/services/modules/`
- 6 production screens: NafathLogin · MyChildren · TherapistWorkbench
  (3 tabs + SOAP bottom sheet) · Telehealth (Jitsi one-tap) · ChatList
  (unread badges) · ChatThread (bubbles + 5s polling)
- Role-aware `SprintAppNavigator` with SecureStore auth guard and
  role-based tab routing

### Added — Testing (122 tests, CI-gated)

- `gov-adapters.e2e.test.js` — 74 state-machine tests (no DB/network)
- `new-admin-routes.api.test.js` — 31 supertest + mongodb-memory-server
  tests for route mounting, auth, lifecycle, health endpoints
- `zatca-xml-signer.e2e.test.js` — 17 tests including real RSA-SHA256
  signature verification
- `.github/workflows/sprint-tests.yml` — hard gate on PR (~10s total)

### Added — Demo + ops

- `demo-showcase.seed.js` — one-command ~60-record seed hitting every
  mock state (`npm run seed:demo:reset`)
- Postman collection with 70 requests across 15 folders
- `/api/health/integrations/*` — public aggregator with 60s cache,
  K8s-ready readiness probe (503 on misconfigured)

### Added — PDPL audit trail

`AdapterAudit` model + `adapterAuditLogger.wrap()` records every gov
adapter call with SHA-256 hashed PII targets (never raw IDs), actor,
operation, latency, IP hash. 730-day TTL matches PDPL retention rules.
Admin/compliance/dpo query at `/api/admin/adapter-audit`.

### Fixed

- `routes/_registry.js` — 2 silent mount bugs (destructured `{ router }`
  from `safeRequire`'s fallback → undefined handler → 15 admin routes
  silently never mounted in prod). Caught by API smoke tests.

### Docs

- `docs/sprints/SPRINT_2026_04_17-18.md` · `GOV_INTEGRATIONS_GO_LIVE.md`
- `mobile/src/services/modules/README.md`

---

## [3.1.0] — 2026-03-29

### Added — نظام خطط التأهيل الفردية (Rehabilitation Plans System)

- `backend/models/RehabilitationPlan.js` — نموذج Mongoose كامل بمعايير WHO-ICF + APTA + ICD-11
  - Sub-schemas: SmartGoalSchema, SessionRecordSchema, PlanServiceSchema, AIAssessmentSchema, PlanReviewSchema, TeleSessionSchema
  - Virtual fields: goalAchievementRate, completedSessionsCount, weeksRemaining, latestAIAssessment
  - Pre-save hooks: توليد planCode فريد، تحديث overallProgress تلقائيًا
  - Static methods: getTherapistStats, getPlansNeedingReview
- `backend/routes/rehabilitationPlan.routes.js` — 16 endpoint REST API (CRUD + AI + Tele-Rehab)
- `backend/controllers/rehabilitationPlan.controller.js` — متحكم كامل يربط 8 خدمات (AI، جدولة، تقارير، جودة...)
- `frontend/src/pages/RehabDashboard.jsx` — لوحة تحكم React متكاملة (5 تبويبات، CRUD كامل، AI assessment)
- `frontend/src/pages/SpecializedRehab/` — 6 صفحات تأهيل متخصصة:
  - BehaviorManagement.jsx, ProgramEnrollment.jsx, RehabProgramsLibrary.jsx
  - RehabProgressTracking.jsx, ScaleAdministration.jsx, SpecializedScalesLibrary.jsx
- `docs/rehabilitation-dashboard.html` — توثيق تفاعلي للوحة التأهيل
- `docs/rehabilitation-plan-template.html` — قالب خطة التأهيل الموحد
- `backend/seeds/branches.seed.js` — بيانات أولية للفروع الـ 12 + المقر الرئيسي

### Fixed — إصلاحات أمنية وتقنية حرجة

#### 🔐 أمان (Security)

- **CRITICAL**: استبدال `authGuard` الوهمي في `rehabilitationPlan.routes.js` الذي كان يُعيّن `req.user = { id: 'dev-user', role: 'therapist' }` بـ JWT حقيقي من `middleware/auth.js`

#### 🗄️ نماذج Mongoose (Model Fixes)

- `backend/models/advanced.models.js`: إصلاح 8 حقول enum بدون `type: String` (invoices.status، costs.category، payments.method، customReports.type/format، charts.type، systemSettings.language، backups.status)
- `backend/models/Camera.js`: إصلاح جدول تسجيل الأسبوع — كل يوم من 7 أيام كان `{ from: '00:00' }` بدلًا من `{ from: { type: String, default: '00:00' }, to: { type: String, default: '23:59' } }`
- `backend/models/comprehensive.models.js`: إصلاح 9 حقول enum بدون `type: String` (sessionType، status، goals.status، messages.type، preferredContactMethod، contactFrequency، allergies.severity، dailyRecords.status، leaves.type)
- `backend/models/Zakat.model.js`: إزالة `timestamps: true` من داخل جسم 3 schemas (كانت تُعامَل كحقل وليس كـ option)
- `backend/models/Branch.js`: إزالة duplicate index على حقل `code` (كان محددًا مرتين)
- `backend/models/Camera.js`: إزالة duplicate index على `hikvision.ipAddress` (كان يحمل `unique: true` ثم index مستقل)

#### ⚙️ Redis Configuration

- `backend/config/cache.config.js`: إضافة فحص `DISABLE_REDIS=true` في `createRedisClient()` لمنع رسائل NOAUTH المتكررة
- `backend/config/cache.advanced.js`: إضافة فحص `DISABLE_REDIS=true` في `initializeRedis()`
- `backend/config/redis.config.js`: إضافة فحص `DISABLE_REDIS=true` في `connectRedis()`

#### 🔍 تحقق من المدخلات (Validation)

- `backend/controllers/rehabilitationPlan.controller.js`:
  - `validatePlanData()`: يدعم حقول الفرونت (`beneficiary`, `primaryDiagnosis`) والخدمة (`beneficiaryId`, `disabilityType`) معًا — يمنع 400 Bad Request الصامت
  - `validateGoalData()`: يدعم `goalText` (فرونت) و `description` (خدمة) معًا
  - إضافة field normalization في `createPlan` و `addGoal` — توحيد أسماء الحقول قبل الإرسال
  - حذف `const path = require('path')` غير المستخدم

#### 🛣️ مسارات (Routes)

- `backend/routes/_registry.js`: حذف مسار مكرر `/api/rehabilitation` الذي كان يشير لنفس وحدة `/api/disability-rehabilitation` (الفرونت يستخدم `/api/rehab-plans`)

### Improved — تحسينات UX وموثوقية الفرونت

- `frontend/src/pages/RehabDashboard.jsx`:
  - إضافة `RehabErrorBoundary` (React Error Boundary) — يلتقط أخطاء React غير المتوقعة ويعرض رسالة عربية مع زر "إعادة المحاولة"
  - إضافة client-side validation قبل الإرسال:
    - `handleCreatePlan()`: تحقق من المستفيد، التشخيص، تاريخ البدء، وترتيب التواريخ
    - `handleAddGoal()`: تحقق من نص الهدف
    - `handleRecordSession()`: تحقق من تاريخ الجلسة
- `frontend/src/pages/Sessions/index.jsx`:
  - إضافة `SessionsErrorBoundary` — يلتقط أخطاء غير متوقعة ويسجّلها في console

---

## [3.0.0] — 2026-01-15

### Added

- Branch Management System — 12 فرع + HQ الرياض
  - RBAC متقدم: hq_super_admin / hq_admin / branch_manager / therapist / driver / receptionist
  - 25 endpoint: HQ dashboard، مقارنة الفروع، الموارد البشرية، الجداول، التقارير، KPIs
  - Phase 2: Analytics، Forecasting، AI Recommendations

---

## [Unreleased]

---

## [3.2.0] — 2026-04-01

### Added

- Backend ESLint configuration (`backend/.eslintrc.json`) for consistent code quality.
- Pagination middleware — caps `?limit` to a maximum of 100 to prevent full-collection dumps.
- Magic-byte validation for file uploads — rejects files whose content doesn't match their declared MIME/extension.
- Rate limiter on payment write operations (`POST`/`PUT`/`PATCH`/`DELETE`).
- Redis health check with actual `PING` in `/api/v1/health/system`.
- `security.txt` at `/.well-known/security.txt`.
- `CONTRIBUTING.md` — contribution guide for developers.
- Server request timeouts (`timeout`, `keepAliveTimeout`, `headersTimeout`).

### Fixed

- `setInterval` leaks in `performanceOptimization.js` (WebSocket batcher + memory monitor) and `advanced-logger.js` (log rotation) — all intervals now store IDs and expose cleanup methods.
- File upload filter changed from OR (MIME **or** extension) to AND (MIME **and** extension) — prevents MIME spoofing bypass.
- ESLint flat config (`frontend/eslint.config.js`) — removed incompatible plugins (`unused-imports`, `react-hooks`) that used deprecated ESLint v8 APIs (`context.getFilename`, `context.getSourceCode`) causing push failures with ESLint v10.
- Syntax error in `frontend/src/__tests__/apiEndpoints.test.js` — fixed `it.each` arrow function syntax.
- `no-undef` error in `backend/rehabilitation-ai/recommendation-engine.js` — fixed `vabs_adaptive_composite` undefined variable.

### Changed

- CI pipeline: added frontend Jest tests step.
- Diagnostic utility scripts (`check_*.js`, `fix_*.js`, `trace_*.js`) added to `.gitignore` to keep repository clean.

---

## [1.0.0] — 2025-06-01

### Added

- Initial release: 200+ API route modules, 350+ Mongoose models, 400+ services.
- React 18 frontend with MUI 5, RTL support, 90+ routes.
- JWT authentication, RBAC, audit trail, rate limiting.
- Docker Compose dev / production / professional profiles.
- Jest test suite — 288 suites, 8,930 tests.
- Kubernetes & Helm deployment manifests.
- GitHub Actions CI (lint → test → build → security audit → summary).
