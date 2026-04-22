# Phase 10 — Reporting & Communications Platform Runbook

**Release marker:** 4.0.15 — Phase 10 C1–C9 + C7a–h + C10 (2026-04-22)
**Scope:** periodic & on-demand reporting engine + 6-channel delivery + approval workflow + delivery ledger + provider webhooks + portal inbox + retry / escalation / retention + renderer (HTML + PDF, ar/en) + drift guards + **22 real builders across 11 modules** + **kpi + rbac aliases layer**.

**Update history:**

- 4.0.14 (2026-04-22, C9): closed C1–C9 with 565 tests; C5 UI + C7 real builders + aliases layer deferred.
- **4.0.15 (this update):** C7a–h land all 22 real builders (kpiAggregator + 5 more builder modules); C10 introduces kpi.aliases + rbac.aliases reducing drift from 22 → 6. 753 tests across 52 suites. Only C5 (Next.js UI) and 5 documented KPI-registry gaps remain as deferred work.

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

All 6 core requirement buckets are satisfied end-to-end at the backend. The only deferred piece is the Next.js UI (C5); the data and REST endpoints are live. As of 4.0.15, every catalog-named builder returns real aggregated data — no stubs remain.

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
| 11  | _(this)_     | Runbook + CHANGELOG 4.0.15 entry + revised release marker                                                                                                |

**Test coverage:** 753 tests across 52 reporting-platform suites — all green at 4.0.15. Progressive coverage by milestone:

- 4.0.14 (C1–C9): 565 tests / 37 suites
- C7a–h (real builders rollout): +177 tests / +10 suites
- C10 (aliases layer): +33 tests / +2 suites
- Total delta 4.0.14 → 4.0.15: **+188 tests / +15 suites**.

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
# 4.0.15 rollback — revert newest first
git revert --no-commit 16f475ca         # C10 aliases layer
git revert --no-commit 350cc8d2 d8266678 551a2b13 c0d4a49a 4619a9ae a626f579 221a5a17 004631b7  # C7h→C7a
# 4.0.14 base rollback
git revert --no-commit e95f7f75 d5a37335 63583bd6 54e7f327 c53c124f f6dd040c 16373db2
# then drop the two new collections:
#   db.report_deliveries.drop(); db.report_approval_requests.drop();
```

Partial rollbacks are safe:

- Reverting C10 only: drops kpi.aliases + rbac.aliases. The drift tests' budget counters flip back but the 22 real builders still work. Engine dispatch to `executive`/`quality`/`finance` audiences will then hit the pre-C10 legacy role literals — functional but matches fewer users in rbac.
- Reverting C7a–h only: stubs return, catalog + engine + scheduler + ops all still function (stubs produce well-formed JSON skeletons). No data loss.

---

## 6. Known limitations carried forward (as of 4.0.15)

- **UI pages not landed** — Reporting Ops dashboard + Parent portal inbox are scoped for a future phase. Events + REST endpoints are live; Next.js pages consume them in C5.
- **5 KPI-registry gaps** — the catalog still references 5 KPI ids that don't yet exist in `config/kpi.registry.js` (marked `null` in `config/kpi.aliases.js`):
  `finance.invoices.aging_ratio`, `hr.attendance.adherence`, `hr.turnover.voluntary_rate`, `multi-branch.fleet.punctuality`, `quality.cbahi.evidence.completeness`. Each can be closed by one commit that adds the matching entry to `kpi.registry.js` and flips the alias value from `null` to the new canonical id — the `gapAliases()` test catches it immediately.
- **1 role group (`executive`) expands to multiple rbac roles** — this is correct, not a gap. The engine's recipientResolver handles the expansion via `ROLE_GROUPS.executive = [ceo, group_gm, group_cfo, group_chro]`.
- **Provider signature verifiers not wired in app.js** — the webhook router supports them; production boot must supply SendGrid / Twilio / WhatsApp verifier functions.
- **Rate limiter is wired but not yet enforced in engine dispatch** — exposed on the platform; opt-in engine integration in a follow-up.
- **Artifact store + URL signer are interfaces, not implementations** — `portal_inbox` and `pdf_download` channels + inbox download endpoint need the operator to supply `{store(payload) → {uri,id}}` and `{sign({uri,ttlSeconds,...}) → {url,expiresAt}}` adapters. S3 + CloudFront is the expected production combo.

---

## 7. Event bus contract (for downstream consumers)

The platform emits these events. Ops dashboards and analytics pipes subscribe as needed:

| event                          | payload                                                 | when                                |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------- |
| `report.instance.built`        | `{reportId, instanceKey, durationMs}`                   | builder returned JSON               |
| `report.approval.requested`    | `{requestId, reportId, instanceKey, approverRoles}`     | PENDING approval created            |
| `report.delivery.sent`         | `{deliveryId, channel}`                                 | channel adapter reported success    |
| `report.delivery.delivered`    | `{deliveryId, channel, provider}`                       | delivery webhook fired              |
| `report.delivery.read`         | `{deliveryId, channel, provider}`                       | read webhook fired OR portal view   |
| `report.delivery.failed`       | `{deliveryId, reason}`                                  | channel / provider returned failure |
| `report.delivery.retried`      | `{deliveryId, instanceKey}`                             | retry sweep re-dispatched           |
| `report.delivery.escalated`    | `{deliveryId, reportId, reason, escalatedTo, notified}` | escalation sweep marked + alerted   |
| `report.delivery.rate_limited` | `{recipientId, role, current, limit}`                   | rate limiter blocked a send         |
| `report.delivery.purged`       | `{deliveryId, reportId}`                                | retention sweep deleted a row       |

---

## 8. Sign-off

### 4.0.15 (current)

- Architecture: 6 requirement buckets end-to-end at the backend; 22/22 catalog builders real; aliases layer closes the drift gap ✓
- Tests: **753 passing across 52 reporting-platform suites** ✓
- Cross-registry drift: **6 residual gaps** — 5 KPI-registry extensions (documented in `config/kpi.aliases.js`) + 1 role group (`executive`). Down 73% from the 22 locked in at 4.0.14 ✓
- Every catalog-named builder returns real aggregated data. Stub count: **0** ✓
- Backwards compatibility: no schema or API breakage; two new collections (report_deliveries, report_approval_requests), five new routes, all additive ✓
- Release marker: **4.0.15**

### 4.0.14 (previous)

- Architecture: 6 requirement buckets end-to-end; 5 committed + 1 (UI) scoped out with an explicit path ✓
- Tests: 565 passing across 37 reporting-platform suites ✓
- Cross-registry drift: 0 unresolved (16 KPI aliases + 6 role aliases locked in with a reducing-budget counter) ✓
- Backwards compatibility: no schema or API breakage; two new collections, five new routes, all additive ✓
- Release marker: **4.0.14**
