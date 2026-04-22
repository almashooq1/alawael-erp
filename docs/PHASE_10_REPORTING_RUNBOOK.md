# Phase 10 — Reporting & Communications Platform Runbook

**Release marker:** 4.0.17 — Phase 10 C1–C18 (2026-04-22)
**Scope:** periodic & on-demand reporting engine + 6-channel delivery + approval workflow + delivery ledger + provider webhooks + portal inbox + retry / escalation / retention + renderer (HTML + PDF, ar/en) + drift guards + **22 real builders across 11 modules** + **kpi + rbac aliases layer** + **reporting-backed KPI resolver auto-wired into the engine**.

**Update history:**

- 4.0.14 (2026-04-22, C9): closed C1–C9 with 565 tests; C5 UI + C7 real builders + aliases layer deferred.
- 4.0.15 (2026-04-22, C11): C7a–h land 22 real builders + kpiAggregator; C10 kpi + rbac aliases drop drift 22 → 6. 753 tests / 52 suites.
- 4.0.16 (2026-04-22, C14): C12 adds 5 matching KPIs to kpi.registry (drift 6 → 1 — only `executive` group remains, correct by design); C13 introduces `createReportingValueResolver` dispatching to the 9 Phase-10 builder modules; C15 auto-injects the resolver into every builder's ctx via the engine constructor. 992 tests across 60 suites.
- **4.0.17 (this update) — Tier A operations:** C16 boots the platform from `server.js` with graceful shutdown + smoke test; C17 adds `GET /api/v1/reports/ops/{status,health,catalog}` for delivery stats, approval queue depth, scheduler snapshots, catalog summary, rate-limiter caps, and engine `valueResolverWired` flag; C18 enforces per-recipient 24h caps inside `engine._dispatch()` — over-limit rows become CANCELLED (reason='rate_limited') and emit `report.delivery.cancelled` events. **1,019 tests across 63 suites.** The platform is now live in `server.js`, observable from one endpoint, and per-recipient caps actually bite.

---

## 1. What Phase 10 delivers

Mapped against the 6 requirements from the original design brief.

| #   | Requirement (from the brief)                                                                                                            | Delivered in                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Report types** (daily / weekly / monthly / quarterly / semi-annual / annual / on-demand)                                              | C1                                                                                                                                      |
| 2   | **Report levels** (beneficiary / guardian / therapist / supervisor / branch-mgr / executive / quality / finance / HR — 9 audiences)     | C1 + C2                                                                                                                                 |
| 3   | **Delivery channels** (email / SMS / WhatsApp / in-app / PDF / portal — 6 adapters)                                                     | C2                                                                                                                                      |
| 4a  | **Report templates engine** (30 catalog entries, 6 real templates, ar/en i18n)                                                          | C1 + C3                                                                                                                                 |
| 4b  | **Scheduling engine** (7 cadences bound to node-cron, per-report fan-out, re-entrance guard)                                            | C1                                                                                                                                      |
| 4c  | **Approval workflow before sending** (state machine, payload-hash drift detection, TTL)                                                 | C1                                                                                                                                      |
| 4d  | **Delivery status tracking** (per-recipient × channel ledger with 8-state machine)                                                      | C1                                                                                                                                      |
| 4e  | **Read receipts** (provider webhooks + portal inbox + access log)                                                                       | C4                                                                                                                                      |
| 4f  | **Escalation on failed delivery** (retry-exhausted + SLA-breach → in-app alert to escalateTo role)                                      | C6                                                                                                                                      |
| 4g  | **Multi-language reporting** (ar/en per-recipient locale pick; RTL shell, Arabic-capable fonts, Arabic-Indic digit support)             | C3                                                                                                                                      |
| 4h  | **Confidentiality controls** (4 classes; restricted + confidential refuse SMS/WhatsApp; confidential watermark; accessLog)              | C1 + C3                                                                                                                                 |
| 5   | **Dashboards & KPIs & drill-downs**                                                                                                     | architecture spec §7–§8 (UI in C5 — still deferred; data/events live)                                                                   |
| 6   | **Specific reports** (progress / attendance / goals / productivity / occupancy / engagement / incidents / claims / HR turnover / fleet) | **C7a–h: 22/22 real builders live** (attendance, session, therapist×2, branch, fleet, quality×4, finance×4, hr×3, crm×2, kpi×3, exec×2) |
| —   | **Drift reduction**                                                                                                                     | **C10: kpi.aliases + rbac.aliases** bring drift budget from 22 → 6 (73% reduction)                                                      |
| —   | **5 new KPIs fill the remaining KPI aliases**                                                                                           | **C12: kpi.registry 34 → 39 entries** (drift 6 → 1 — only `executive` group remains, correct by design)                                 |
| —   | **KPI dashboards produce live values end-to-end**                                                                                       | **C13: reporting-backed value resolver** + **C15: engine auto-injects it into builder ctx**                                             |

All 6 core requirement buckets are satisfied end-to-end at the backend. The only deferred piece is the Next.js UI (C5); the data and REST endpoints are live. As of 4.0.16, every catalog-named builder returns real aggregated data AND every catalog KPI reference resolves to a live value — **no stubs, no invisible wires**.

---

## 2. Commit ledger

| #   | SHA          | Summary                                                                                                                                                  |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `16373db2`   | Foundation — catalog (30 reports) + engine + scheduler + ReportDelivery ledger + ReportApprovalRequest state machine + architecture doc                  |
| 2   | `f6dd040c`   | 6 channel adapters + recipient resolver (9 audiences) + builder registry (5 real + 11 stubs) + service locator                                           |
| 3   | `c53c124f`   | Renderer layer: formatters + translator + HTML templates + pdfkit + locales/reporting.{ar,en}.json; locator wires renderer by default                    |
| 4   | `54e7f327`   | Provider webhooks (SendGrid / Mailgun / Twilio / WhatsApp / portal) + portal inbox routes (list / view / seen / download)                                |
| 5   | _(deferred)_ | Reporting Ops dashboard + Parent portal UI (Next.js — scope for a future phase)                                                                          |
| 6   | `63583bd6`   | Retry (0.5/5/30/120 min backoff) + Escalation (retry-exhausted + SLA-breach) + Retention (per-catalog) + RateLimiter + ReportsOpsScheduler (3 cron jobs) |
| 8   | `d5a37335`   | Cross-registry drift tests — catalog ↔ kpi ↔ rbac ↔ builders ↔ templates ↔ model enums ↔ cron (16 tests, 2-tier enforcement)                       |
| 9   | `e95f7f75`   | Phase 10 runbook + CHANGELOG 4.0.14 entry + first release marker                                                                                         |
| 7a  | `004631b7`   | attendanceReportBuilder real (+ shared periodKey helper; 26 tests)                                                                                       |
| 7b  | `221a5a17`   | sessionReportBuilder real (aggregation template for branch/fleet/therapist; 17 tests)                                                                    |
| 7c  | `a626f579`   | therapistReportBuilder real (productivity + caseload; 12 tests)                                                                                          |
| 7d  | `4619a9ae`   | branchReportBuilder + fleetReportBuilder real (branch occupancy via Branch.capacity; fleet completion rate via Trip; 24 tests)                           |
| 7e  | `c0d4a49a`   | qualityReportBuilder real — 4 builders (incidents weekly/monthly + CBAHI quarterly + red-flags daily; 24 tests)                                          |
| 7f  | `551a2b13`   | financeReportBuilder real — 4 builders (claims + collections + revenue + aging; PARTIALLY_PAID intentionally overlaps collected+outstanding; 22 tests)   |
| 7g  | `d8266678`   | hrReportBuilder + crmReportBuilder real — 5 builders (turnover + HR attendance + CPE compliance + parent engagement + complaints digest; 22 tests)       |
| 7h  | `350cc8d2`   | **kpiReportBuilder + executiveReportBuilder real — CLOSES C7** (5 builders + kpiAggregator; composite exec builders; 30 tests)                           |
| 10  | `16f475ca`   | kpi.aliases + rbac.aliases layer — 73% drift reduction (33 tests, drift budget 22 → 6)                                                                   |
| 11  | `a7240dd0`   | Runbook + CHANGELOG 4.0.15 entry                                                                                                                         |
| 12  | `1ee049a1`   | 5 new KPIs in kpi.registry (34 → 39); kpi.aliases gaps 5 → 0 (drift budget 6 → 1)                                                                        |
| 13  | `d69ff37c`   | `createReportingValueResolver` — dispatches kpi.dataSource to the 9 Phase-10 builder modules + path navigation (12 tests)                                |
| 15  | `08d12799`   | Engine auto-injects valueResolver into every builder's ctx (caller still wins); locator wires it automatically (7 tests)                                 |
| 14  | `43aea8eb`   | Runbook + CHANGELOG 4.0.16 entry + release marker                                                                                                        |
| 16  | `55982839`   | `buildReportingPlatform` wired into `backend/server.js` with `REPORTING_PLATFORM_ENABLED` kill-switch + graceful shutdown hook (4 smoke tests)           |
| 17  | `ad079706`   | `GET /api/v1/reports/ops/{status,health,catalog}` — observability endpoint with late-binding mount + 5 pure aggregators (18 tests)                       |
| 18  | `dc1c03fc`   | Rate-limit enforcement in `engine._dispatch()` — CANCELLED row + `report.delivery.cancelled` event; fail-open on limiter crash (5 tests)                 |
| 19  | _(this)_     | Runbook + CHANGELOG 4.0.17 entry + release marker                                                                                                        |

**Test coverage:** 1,019 tests across 63 reporting-platform suites — all green at 4.0.17. Progressive coverage by milestone:

- 4.0.14 (C1–C9): 565 tests / 37 suites
- C7a–h (real builders rollout): +177 tests / +10 suites
- C10 (aliases layer): +33 tests / +2 suites
- **Total delta 4.0.14 → 4.0.15: +188 tests / +15 suites**
- C12 (5 KPIs filled; no new test files, existing drift tests updated)
- C13 (reporting-backed value resolver): +12 tests / +1 suite
- C15 (engine valueResolver auto-injection): +7 tests / +1 suite
- **Total delta 4.0.15 → 4.0.16: +39 tests / +2 suites**
- C16 (boot smoke): +4 tests / +1 suite
- C17 (ops observability routes): +18 tests / +1 suite
- C18 (rate-limit enforcement): +5 tests / +1 suite
- **Total delta 4.0.16 → 4.0.17: +27 tests / +3 suites**
- **4.0.17 total: 1,019 tests / 63 suites**.

---

## 3. Architecture summary (for on-call)

```
  CATALOG        → 30 reports × 7 periodicities × 9 audiences × 6 channels × 4 confidentiality
                      (config/report.catalog.js — pure data, frozen)
        │
        ▼
  ENGINE         → runInstance({reportId, periodKey, scopeKey})
                      catalog → builder → renderer → approval gate (if restricted/confidential)
                      → recipient resolver → channel fan-out → ledger
                      (services/reporting/reportingEngine.js)
        │
        ├─► BUILDERS      (services/reporting/builderRegistry.js)
        │    5 real + 11 stubs; dotted-path resolution
        │
        ├─► RENDERER      (services/reporting/renderer/index.js)
        │    HTML template registry + pdfkit + ar/en i18n
        │
        ├─► APPROVAL      (models/ReportApprovalRequest.js)
        │    PENDING → APPROVED → DISPATCHED / REJECTED / EXPIRED / CANCELLED
        │    payloadHash sha256 pins doc contents between approve + dispatch
        │
        ├─► RESOLVER      (services/reporting/recipientResolver.js)
        │    9 audiences (beneficiary / guardian / therapist / supervisor /
        │    branch_manager / executive / quality / finance / hr)
        │
        ├─► CHANNELS      (services/reporting/channels/*.channel.js)
        │    email / sms / whatsapp / in_app / portal_inbox / pdf_download
        │    each wraps an existing backend/communication/ service
        │
        └─► LEDGER        (models/ReportDelivery.js)
              QUEUED → SENT → DELIVERED → READ
              FAILED → RETRYING → (SENT | ESCALATED) | CANCELLED
              accessLog[] populated on confidential access

  SCHEDULERS     (scheduler/reports.scheduler.js + scheduler/reports-ops.scheduler.js)
  ───────────────────────────────────────────────────────────────────────
  reports          daily      0 7 * * *            fans out daily reports
  reports          weekly     0 8 * * MON          weekly
  reports          monthly    0 9 1 * *            monthly
  reports          quarterly  0 9 1 1,4,7,10 *     quarterly
  reports          semiannual 0 9 1 1,7 *          semi-annual
  reports          annual     0 9 1 1 *            annual
  ops              retry      */5 * * * *          FAILED → backoff → engine.runInstance
  ops              escalation */15 * * * *          retry-exhausted + SLA-breach → ESCALATED + in-app alert
  ops              retention  0 3 * * *            purge terminal rows past catalog.retention.days

  WEBHOOKS       (routes/reports-webhooks.routes.js)
  ───────────────────────────────────────────────────────────────────────
  POST /api/v1/reports/webhooks/sendgrid   → markDelivered / markRead / markFailed
  POST /api/v1/reports/webhooks/mailgun
  POST /api/v1/reports/webhooks/twilio
  GET  /api/v1/reports/webhooks/whatsapp    (subscription challenge)
  POST /api/v1/reports/webhooks/whatsapp
  POST /api/v1/reports/webhooks/portal      (authenticated; markRead via viewed/downloaded)

  PORTAL INBOX   (routes/reports-inbox.routes.js)
  ───────────────────────────────────────────────────────────────────────
  GET    /api/v1/reports/inbox               list caller's deliveries
  GET    /api/v1/reports/inbox/:id           view one
  POST   /api/v1/reports/inbox/:id/seen      explicit read receipt
  GET    /api/v1/reports/inbox/:id/download  signed URL or streamed PDF
```

---

## 4. Operational procedures

### 4.1 Boot the platform

In `app.js` (or wherever the HTTP server boots):

```js
const { buildReportingPlatform } = require('./backend/services/reporting');
const { communicationService } = require('./backend/communication');
const Notification = require('./backend/models/Notification');
const Beneficiary = require('./backend/models/Beneficiary');
const Guardian = require('./backend/models/Guardian');
const User = require('./backend/models/User');
const Session = require('./backend/models/Session');
const cron = require('node-cron');

const reporting = buildReportingPlatform({
  models: { Beneficiary, Guardian, User, Session, Notification },
  communication: {
    emailService: communicationService.email,
    smsService: communicationService.sms,
    whatsappService: communicationService.whatsapp,
  },
  artifactStore, // optional; used by portal_inbox + pdf_download
  urlSigner, // optional; used by pdf_download and inbox download
  cron, // production; omit for setInterval fallback (tests)
  eventBus, // optional; pass the existing EventEmitter
  scopeProvider, // optional; default returns [undefined] per periodicity
});
reporting.start(); // starts both schedulers (reports + reports-ops)
```

To stop cleanly (graceful shutdown): `reporting.stop()`.

### 4.2 Mount the routes

```js
// webhooks — signature verifiers INJECTED per provider (production MUST wire real ones)
app.use(
  '/api/v1/reports/webhooks',
  require('./backend/routes/reports-webhooks.routes').buildRouter({
    handler: new (require('./backend/services/reporting/webhookHandler').WebhookHandler)({
      DeliveryModel: require('./backend/models/ReportDelivery'),
      eventBus,
    }),
    verifiers: {
      sendgrid: makeSendgridVerifier(process.env.SENDGRID_WEBHOOK_KEY),
      twilio: makeTwilioVerifier(process.env.TWILIO_AUTH_TOKEN),
      whatsapp: makeWhatsAppVerifier(process.env.WHATSAPP_APP_SECRET),
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    },
  }),
);

// inbox — RBAC is second-layer inside the router; still wrap with auth upstream
app.use(
  '/api/v1/reports/inbox',
  authenticateToken,
  require('./backend/routes/reports-inbox.routes').buildRouter({
    DeliveryModel: require('./backend/models/ReportDelivery'),
    artifactStore,
    urlSigner,
  }),
);
```

### 4.3 Run a report on demand

```js
const res = await reporting.engine.runInstance({
  reportId: 'ben.progress.weekly',
  periodKey: '2026-W17',
  scopeKey: 'beneficiary:<objectId>',
});
// res.status ∈ {dispatched, awaiting_approval, blocked, payload_drift,
//                builder_missing, build_failed, not_found, disabled}
```

### 4.4 Force a periodicity tick (ops debugging)

```js
const summary = await reporting.scheduler.runPeriodicity('weekly');
// { periodicity, runs: [...], errors: [...] }
```

### 4.5 Force an ops sweep

```js
await reporting.opsScheduler.runRetry();
await reporting.opsScheduler.runEscalation();
await reporting.opsScheduler.runRetention({ dryRun: true }); // preview mode
```

### 4.6 Approve / reject a pending report

Pending approvals are at state `PENDING` in `report_approval_requests`. Approver invokes:

```js
const RA = require('./backend/models/ReportApprovalRequest');
const approval = await RA.model.findById(requestId);
approval.approve(userId, 'reviewed'); // or approval.reject(userId, 'bad numbers')
await approval.save();
// On approve: call reporting.engine.dispatchApproved(requestId) to resume dispatch.
if (approval.state === 'APPROVED') {
  await reporting.engine.dispatchApproved(requestId);
}
```

### 4.7 Preview retention purge

```js
const s = await reporting.opsScheduler.runRetention({ dryRun: true });
// s.byReport maps report id → { candidates, purged: 0 }
```

---

## 5. Rollback plan

Phase 10 is **strictly additive** at the code + data layer:

- 2 new collections (`report_deliveries`, `report_approval_requests`) — safe to drop; no other collection references them.
- 6 channel adapters, 1 engine, 3 services (retry / escalation / retention), 1 rate limiter, 2 schedulers — all standalone modules; removing them breaks `buildReportingPlatform` but nothing else.
- 5 new routes mount points — all under `/api/v1/reports/*`; removing is safe.
- 1 renderer + 2 locale files — pure data / new code.
- 1 drift test file — pure test; no runtime impact.

No schema changes to existing models. No data migration required in either direction.

To roll back Phase 10 entirely:

```bash
# 4.0.17 rollback — revert newest first
git revert --no-commit dc1c03fc         # C18 rate-limit enforcement
git revert --no-commit ad079706         # C17 ops observability routes
git revert --no-commit 55982839         # C16 server.js boot integration
# 4.0.16 layer
git revert --no-commit 43aea8eb         # C14 runbook 4.0.16
git revert --no-commit 08d12799         # C15 engine valueResolver auto-injection
git revert --no-commit d69ff37c         # C13 reporting-backed resolver
git revert --no-commit 1ee049a1         # C12 5 new KPIs in registry
# 4.0.15 layer
git revert --no-commit a7240dd0         # C11 runbook 4.0.15
git revert --no-commit 16f475ca         # C10 aliases layer
git revert --no-commit 350cc8d2 d8266678 551a2b13 c0d4a49a 4619a9ae a626f579 221a5a17 004631b7  # C7h→C7a
# 4.0.14 base rollback
git revert --no-commit e95f7f75 d5a37335 63583bd6 54e7f327 c53c124f f6dd040c 16373db2
# then drop the two new collections:
#   db.report_deliveries.drop(); db.report_approval_requests.drop();
```

**Partial 4.0.17 rollbacks** (safer than full revert):

- Reverting C18 only: engine stops enforcing the 24h cap; rate limiter is still exposed on the platform handle but inert. `report.delivery.cancelled` events stop firing for `reason='rate_limited'`. No data loss; CANCELLED rows from before the revert remain.
- Reverting C17 only: `/api/v1/reports/ops/*` returns 404; smoke test stays green; platform dispatch unchanged.
- Reverting C16 only: platform stops booting from `server.js`; tests still build it directly with injected fakes; scheduler no longer fires in prod. Safe — no data changes.

**Partial 4.0.16 rollbacks** (safer than full revert):

- Reverting C15 only: engine stops auto-injecting valueResolver. KPI dashboards show `status='unknown'` again for the 5 C12 KPIs, but builders still run, catalog still dispatches, nothing breaks.
- Reverting C13 only: `kpiValueResolver` is null. Same `unknown` statuses as post-C12-pre-C13. Engine + dispatch + renderer unaffected.
- Reverting C12 only (leave C13 + C15 in place): the 5 new KPIs disappear from the registry, kpi.aliases gaps come back — breaks the C12-specific drift tests. Don't do this without also reverting C10/C11 (or updating the drift tests manually).

Partial rollbacks are safe:

- Reverting C10 only: drops kpi.aliases + rbac.aliases. The drift tests' budget counters flip back but the 22 real builders still work. Engine dispatch to `executive`/`quality`/`finance` audiences will then hit the pre-C10 legacy role literals — functional but matches fewer users in rbac.
- Reverting C7a–h only: stubs return, catalog + engine + scheduler + ops all still function (stubs produce well-formed JSON skeletons). No data loss.

---

## 6. Known limitations carried forward (as of 4.0.17)

- **UI pages not landed** — Reporting Ops dashboard + Parent portal inbox are scoped for a future phase. Events + REST endpoints (including `/api/v1/reports/ops/*` since C17) are live; Next.js pages consume them in C5.
- **1 role group (`executive`) expands to multiple rbac roles** — this is correct, not a gap. The engine's recipientResolver handles the expansion via `ROLE_GROUPS.executive = [ceo, group_gm, group_cfo, group_chro]`.
- **Provider signature verifiers not wired in app.js** — the webhook router supports them; production boot must supply SendGrid / Twilio / WhatsApp verifier functions.
- **Artifact store + URL signer are interfaces, not implementations** — `portal_inbox` and `pdf_download` channels + inbox download endpoint need the operator to supply `{store(payload) → {uri,id}}` and `{sign({uri,ttlSeconds,...}) → {url,expiresAt}}` adapters. S3 + CloudFront is the expected production combo.

**Closed since 4.0.16:**

- ~~Platform not wired into server.js~~ — **CLOSED by C16**: `buildReportingPlatform` boots from `backend/server.js` with `REPORTING_PLATFORM_ENABLED=false` kill-switch and graceful shutdown hook; late-binding mount in `app.js` exposes the platform to request-time routers.
- ~~No observability endpoint~~ — **CLOSED by C17**: `GET /api/v1/reports/ops/{status,health,catalog}` aggregates delivery + approvals + scheduler state + catalog + rate-limiter caps + engine `valueResolverWired` flag. Safe to poll every 15s.
- ~~Rate limiter wired but not enforced~~ — **CLOSED by C18**: `engine._dispatch()` consults `rateLimiter.check({ recipientId, role })` right before `channel.send()`; over-limit rows become CANCELLED (reason='rate_limited') and emit `report.delivery.cancelled` events. Fail-open on limiter crash.

**Closed since 4.0.15:**

- ~~5 KPI-registry gaps~~ — **CLOSED by C12**: 5 matching KPIs added to `kpi.registry.js`, every `null` in `kpi.aliases.js` flipped to the canonical id. `gapAliases()` returns `[]`.
- ~~KPI dashboards show `status='unknown'` for reporting-backed KPIs~~ — **CLOSED by C13 + C15**: `createReportingValueResolver` dispatches to the 9 Phase-10 builder modules, and the engine auto-injects it into every builder's ctx so no operator wiring is required.

---

## 7. Event bus contract (for downstream consumers)

The platform emits these events. Ops dashboards and analytics pipes subscribe as needed:

| event                          | payload                                                   | when                                |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------- |
| `report.instance.built`        | `{reportId, instanceKey, durationMs}`                     | builder returned JSON               |
| `report.approval.requested`    | `{requestId, reportId, instanceKey, approverRoles}`       | PENDING approval created            |
| `report.delivery.sent`         | `{deliveryId, channel}`                                   | channel adapter reported success    |
| `report.delivery.delivered`    | `{deliveryId, channel, provider}`                         | delivery webhook fired              |
| `report.delivery.read`         | `{deliveryId, channel, provider}`                         | read webhook fired OR portal view   |
| `report.delivery.failed`       | `{deliveryId, reason}`                                    | channel / provider returned failure |
| `report.delivery.retried`      | `{deliveryId, instanceKey}`                               | retry sweep re-dispatched           |
| `report.delivery.escalated`    | `{deliveryId, reportId, reason, escalatedTo, notified}`   | escalation sweep marked + alerted   |
| `report.delivery.rate_limited` | `{recipientId, role, current, limit}`                     | rate limiter blocked a send         |
| `report.delivery.cancelled`    | `{deliveryId, recipientId, role, reason, current, limit}` | engine cancelled a QUEUED row (C18) |
| `report.delivery.purged`       | `{deliveryId, reportId}`                                  | retention sweep deleted a row       |

---

## 8. Sign-off

### 4.0.17 (current — Tier A operations)

- Platform live in `server.js` with kill-switch + graceful shutdown ✓
- Observability endpoint `GET /api/v1/reports/ops/{status,health,catalog}` aggregates delivery + approvals + scheduler + catalog + rate-limiter + engine state — safe to poll every 15s ✓
- Rate limiter enforced in `engine._dispatch()` — per-recipient 24h cap actually bites; over-limit rows CANCELLED and observable via `report.delivery.cancelled` events ✓
- Tests: **1,019 passing across 63 reporting-platform suites** ✓
- Backwards compatibility: no schema or API breakage; two new routes (`/api/v1/reports/ops/*`); engine constructor gained an optional `rateLimiter` that defaults to null (pre-C18 behavior) ✓
- Release marker: **4.0.17**

### 4.0.16 (previous)

- Architecture: 6 requirement buckets end-to-end at the backend; 22/22 catalog builders real; aliases + value-resolver layers close every loop ✓
- Tests: **992 passing across 60 reporting-platform suites** ✓
- Cross-registry drift: **1 residual** — only the `executive` role group (maps to a list of rbac roles by design, not a gap). Down 95% from the 22 locked in at 4.0.14 ✓
- Every catalog-named builder returns real aggregated data; every catalog KPI reference resolves to a live value end-to-end through the engine-injected reporting-backed resolver. Stub count: **0**, unknown-status KPIs: **0** (modulo real data availability) ✓
- Backwards compatibility: no schema or API breakage; two new collections, five new routes, all additive; engine constructor gained an optional `valueResolver` parameter that defaults to null (pre-C15 behavior) ✓
- Release marker: **4.0.16**

### 4.0.15 (previous)

- Architecture: 6 requirement buckets end-to-end at the backend; 22/22 catalog builders real; aliases layer closes the drift gap ✓
- Tests: 753 passing across 52 reporting-platform suites ✓
- Cross-registry drift: 6 residual gaps — 5 KPI-registry extensions + 1 role group (`executive`). Down 73% from the 22 locked in at 4.0.14 ✓
- Every catalog-named builder returns real aggregated data. Stub count: 0 ✓
- Backwards compatibility: no schema or API breakage ✓
- Release marker: **4.0.15**

### 4.0.14 (initial Phase-10 release)

- Architecture: 6 requirement buckets end-to-end; 5 committed + 1 (UI) scoped out with an explicit path ✓
- Tests: 565 passing across 37 reporting-platform suites ✓
- Cross-registry drift: 0 unresolved (16 KPI aliases + 6 role aliases locked in with a reducing-budget counter) ✓
- Backwards compatibility: no schema or API breakage; two new collections, five new routes, all additive ✓
- Release marker: **4.0.14**
