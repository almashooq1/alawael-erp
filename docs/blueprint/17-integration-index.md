# 17 — Integration Index | فهرس طبقة التكامل

> نقطة البداية الوحيدة لأي شخص يعمل على طبقة التكامل — للشركاء، للمشغّلين،
> للمطوّرين الجدد، وللـ on-call. كل شيء شُحِن في v4.0.93 → v4.0.101
> موثَّق هنا مع الروابط المباشرة.

---

## TL;DR — إذا كنت...

| أنت                                       | ابدأ هنا                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **شريك تكامل خارجي** يريد استهلاك الـ API | [`/api/docs/integration`](#3-api-specs) (Swagger UI) → [Postman collection](#3-api-specs)             |
| **مطوّر** يبني على الطبقة                 | [القسم 1 — البنية](#1-architecture) → [القسم 5 — الاختبار](#5-testing)                                |
| **مشغّل / on-call**                       | [القسم 4 — Observability](#4-observability) → [القسم 6 — Runbooks التشغيلية](#6-operational-runbooks) |
| **مدقّق / compliance**                    | [القسم 7 — PDPL + الأدلة](#7-pdpl--audit-evidence)                                                    |

---

## 1. Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                    المطلوبون للاستخدام                            │
│                                                                  │
│  Partners        Web-Admin UI         Mobile       Operators     │
│     │                │                   │             │         │
│     └─── HTTPS ──────┴─────── HTTPS ─────┴────── HTTPS┘         │
│                               │                                  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │                    API Gateway (Express)                      │
  │   ┌──────────────────────────────────────────────────────┐   │
  │   │  Idempotency MW → Webhook HMAC → Auth → RBAC        │   │
  │   └──────────────────────────────────────────────────────┘   │
  └─────────────────────────────┬────────────────────────────────┘
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │                  Service Layer                                │
  │  Nafath signing │ Yakeen │ Wasel │ NPHIES recon │ DLQ admin  │
  └─────────────────────────────┬────────────────────────────────┘
                                │
  ┌─────────────────────────────▼────────────────────────────────┐
  │              ACL Client (shared hardening)                    │
  │  retry + circuit breaker + PII redaction + DLQ auto-park      │
  └──────────────┬──────────────────────────────┬─────────────────┘
                 │                              │
      ┌──────────▼─────────┐         ┌──────────▼─────────┐
      │  External APIs     │         │  Event Bus         │
      │  Nafath / Yakeen   │         │  integrationBus +  │
      │  NPHIES / Wasel    │         │  qualityEventBus   │
      │  ZATCA / GOSI ...  │         │  HR webhook out    │
      └────────────────────┘         └────────────────────┘
                 │                              │
      ┌──────────▼─────────┐         ┌──────────▼─────────┐
      │  Prometheus metrics│         │  AsyncAPI contract │
      │  Grafana dashboard │         │  (events.yaml)     │
      │  Alertmanager      │         │                    │
      └────────────────────┘         └────────────────────┘
```

---

## 2. Phases shipped

| الإصدار    | المرحلة                                                                             | الوثيقة                                                        |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| v4.0.93    | Hardening I — DLQ + Idempotency + HMAC + PII                                        | [15-integration-hardening.md](15-integration-hardening.md)     |
| v4.0.94    | Hardening II — Mongo/Redis adapters + boot wiring                                   | [15-integration-hardening.md §6](15-integration-hardening.md)  |
| v4.0.95    | Nafath e-signature backend                                                          | [16-nafath-esignature.md](16-nafath-esignature.md)             |
| v4.0.96    | Yakeen + Wasel + NPHIES + Prometheus counters                                       | CHANGELOG                                                      |
| v4.0.97    | UI: Nafath signing + DLQ admin + Grafana                                            | CHANGELOG                                                      |
| v4.0.98    | OpenAPI 3.1 spec for REST surface                                                   | CHANGELOG                                                      |
| v4.0.99    | Integration Health Dashboard (mission control)                                      | CHANGELOG                                                      |
| v4.0.100   | AsyncAPI 3.0 + Prometheus alert rules                                               | CHANGELOG                                                      |
| v4.0.101   | Postman collection + Alertmanager sample + this index                               | CHANGELOG                                                      |
| v4.0.114   | Phase 19 — Forms catalog (32 templates)                                             | [19-forms-catalog.md](19-forms-catalog.md)                     |
| 2026-05-02 | a11y test gate widened (Cypress + Jest, axe-core)                                   | [20-accessibility.md](20-accessibility.md)                     |
| Unreleased | DR/encryption stack — daily restore drill + AES-256-GCM streaming + ops-alerter     | [19-dr-verification.md](19-dr-verification.md)                 |
| Unreleased | NPHIES session→claim bridge — `buildClaimFromSession()` + bulk endpoint             | [21-session-to-claim-bridge.md](21-session-to-claim-bridge.md) |
| Unreleased | ZATCA Phase 2 — wired in `_registry.js` + post-save hook + 24h SLA sweeper          | [22-zatca-phase2.md](22-zatca-phase2.md)                       |
| Unreleased | PDPL Article 13 — `piiAccess.middleware.js` writing `pii.access.read` AuditLog rows | CHANGELOG                                                      |
| Unreleased | Go-live checklist consolidating 11 runbooks                                         | [23-go-live-checklist.md](23-go-live-checklist.md)             |

---

## 3. API specs

**REST (OpenAPI 3.1) — 18 endpoints:**

- Spec (YAML): `GET /api/docs/integration.yaml` → [docs/api/openapi-integration.yaml](../api/openapi-integration.yaml)
- Spec (JSON): `GET /api/docs/integration.json`
- Interactive UI: `GET /api/docs/integration` (Swagger UI)
- Postman collection: `GET /api/docs/integration.postman.json` — download + File → Import in Postman

**Events (AsyncAPI 3.0) — 26 channels:**

- Spec (YAML): `GET /api/docs/events.yaml` → [docs/api/asyncapi-events.yaml](../api/asyncapi-events.yaml)
- Spec (JSON): `GET /api/docs/events.json`

---

## 4. Observability

### Prometheus scrape target

```yaml
scrape_configs:
  - job_name: alawael-integrations
    scrape_interval: 15s
    static_configs:
      - targets: ['api.alawael.sa:443']
    scheme: https
    metrics_path: /api/health/metrics/integrations
```

### Counters + gauges emitted

| Name                                         | Type      | Labels               |
| -------------------------------------------- | --------- | -------------------- |
| `gov_adapter_rate_limit_capacity`            | gauge     | provider             |
| `gov_adapter_rate_limit_utilization_percent` | gauge     | provider             |
| `gov_adapter_circuit_open`                   | gauge     | provider             |
| `gov_adapter_circuit_failures`               | gauge     | provider             |
| `gov_adapter_calls_total`                    | counter   | provider, status     |
| `gov_adapter_call_latency_ms`                | histogram | provider             |
| `gov_adapter_configured`                     | gauge     | provider             |
| `gov_adapter_mode`                           | gauge     | provider, mode       |
| **`integration_dlq_events_total`**           | counter   | integration, outcome |
| **`idempotency_events_total`**               | counter   | route, outcome       |

### Alert rules

- File: [docs/alerts/integration-hardening.rules.yml](../alerts/integration-hardening.rules.yml) — 8 rules (4 page, 4 warn)
- Alertmanager sample: [docs/alerts/alertmanager.sample.yml](../alerts/alertmanager.sample.yml)

### Grafana dashboard

- JSON: [docs/dashboards/integration-hardening.grafana.json](../dashboards/integration-hardening.grafana.json)
- Import: Grafana UI → Dashboards → Import → paste JSON.

### Live operator view

- URL: `/admin/ops/integration-health` (web-admin, admin role)
- Auto-refresh: every 10s
- Backend endpoint: `GET /api/v1/admin/ops/integration-health`

---

## 5. Testing

One command runs everything integration-related:

```bash
cd backend && npm run test:integration-hardening
```

Expected output (last verified 2026-05-03):

```text
Test Suites: 21 passed, 21 total
Tests:       209 passed, 209 total
```

Test files are listed in `backend/package.json` under `test:integration-hardening`. Add any new integration suite to that list when you ship it; the script is the single gatekeeper before merging integration changes.

Two recently-added suites worth knowing about:

- `__tests__/nafath-signing-routes.test.js` — covers the HTTP surface end-to-end (auth + idempotency + role boundaries on the `GET /` admin-vs-user view).
- `__tests__/mongoose-legacy-hook-shim.test.js` — guards the shim that protects models from a Mongoose plugin breakage observed in the 2026-05-02 session.

---

## 6. Operational Runbooks

### "A circuit is open"

1. Check `/admin/ops/integration-health` — which provider?
2. Hit `/api/health/metrics/integrations` for raw numbers.
3. If the provider is down → wait, circuit will close automatically on first success.
4. If credentials rotated → update env vars + restart the Node process (circuit resets).
5. DLQ will have parked every failed call — inspect at `/admin/ops/dlq?integration=<name>`. After the upstream recovers, either wait for the replay worker (15 min cadence) or click Replay.

### "Net parked DLQ is growing"

1. Sort `/admin/ops/dlq` by `integration` — is it one provider or several?
2. Inspect an entry — what's the `lastError`?
3. If a transient network error → click Replay.
4. If a permanent failure (401 / 403) → fix the credential → Replay.
5. If unrecoverable (e.g. an invalid payload from a bug) → Discard with a reason.

### "An NPHIES webhook didn't arrive"

1. The scheduled reconciliation sweeper runs every 10 min by default and will catch it.
2. Force an immediate sweep via backend shell: `app.locals.nphiesReconWorker.tick()`.
3. Check `/api/v1/admin/ops/integration-health` for `nphies` — any parked entries?

### "Nafath sign request stuck in PENDING"

1. 15-min TTL. Wait it out, it'll flip to EXPIRED.
2. User can cancel from the UI.
3. Verify JWS: `GET /api/v1/nafath/signing/:id/verify`.

### "Daily DR restore drill failed"

1. The 04:00 UTC GitHub Actions cron at `.github/workflows/dr-verify.yml`
   ran `backend/scripts/dr-verify.js` and it exited non-zero.
2. The script publishes via `ops-alerter` — the page should already be open.
3. Inspect the workflow run logs: was it the `pull-and-decrypt` step
   (encryption layer) or the `restore-and-verify` step (mongo restore)?
4. Encryption issues → check `backend/utils/backup-crypto.js` env vars
   (`BACKUP_KEY_HEX`); rotate if leaked.
5. Restore issues → fall back to the previous day's verified snapshot
   while you investigate. Runbook: [19-dr-verification.md](19-dr-verification.md).

### "ZATCA submission rejected"

1. The post-save Invoice hook fires `ops-alerter` in real time when ZATCA
   returns `REJECTED` (rule fixed in the 2026-05-02 session — was reading
   the wrong field for months).
2. 24-hour SLA sweeper (`backend/services/zatcaB2cSlaSweeper.js`)
   re-checks pending submissions; chronic failures show in the per-branch
   `ZatcaCredential` admin page.
3. Common cause: branch CSID rotated. Use the admin page's
   `onboarding/promote` flow to re-credential without restarting.
4. Runbook: [22-zatca-phase2.md](22-zatca-phase2.md).

### "Who viewed beneficiary X's record between dates A and B?"

1. PDPL Article 13 — every successful 2xx read on a PII-tagged GET
   endpoint writes a `pii.access.read` row via
   `backend/middleware/piiAccess.middleware.js`.
2. Two query modes at `/api/admin/pii-access-audit`:
   - **List**: filterable feed (actor / target / dateFrom / dateTo).
   - **By-target**: `/by-target?targetType=Beneficiary&targetId=...&from=...&to=...`
     returns distinct viewers + counts in one shot — what the DPO usually wants.
3. Window is capped at 365 days server-side. UI: `/quality/pdpl/access-audit`.

---

## 7. PDPL + audit evidence

### National IDs in logs

PII redactor wraps every `AclClient` call — national IDs and phones are masked automatically in integration logs + DLQ payloads. Confirm with a test call and `grep national` on the log output — you should never see a raw 10-digit ID.

### Signed document evidence

Every Nafath signing request produces an auditor-ready JSON package:

```text
GET /api/v1/nafath/signing/:id/evidence
```

The package contains the original request + signer attributes + JWS + re-verification proof. Hand this to CBAHI / PDPL / MoHRSD reviewers directly.

### Audit chain

Every external-call audit row is part of a hash chain (`backend/services/auditHashChainService.js`). A tamper on any row breaks the chain and fails verification.

### Article 13 — PII access audit (added in the 2026-05-02 session)

Every successful read of a PII record writes a `pii.access.read` AuditLog
entry. The middleware (`backend/middleware/piiAccess.middleware.js`) hooks
`res.on('finish')` so latency stays at zero, skips 4xx/5xx (denied access ≠
disclosure), skips anonymous / OPTIONS / HEAD, and never bubbles AuditLog
write failures into the request lifecycle.

Coverage already applied to high-PII endpoints:

- `GET /api/admin/beneficiaries/:id`
- `GET /api/admin/invoices/:id`
- `GET /api/admin/nphies-claims/:id`
- (full list in CHANGELOG / piiAccess test suite)

Query API: `/api/admin/pii-access-audit` (list + `/by-target` aggregator).
UI: `/quality/pdpl/access-audit`. See the runbook in §6 above.

### Article 4 / 6 / 20 / 32 admin tier

The QMS + PDPL admin pages added in the 2026-05-02 session live under
`/quality/pdpl/*` and tie back into the PDPL Compliance Dashboard. The
Article 20 breach-reporting page enforces the 72-hour SDAIA notification
timer; Article 4 surfaces a 30-day SLA chip per data-subject request.

---

## 8. Environment variables

Boot-time config for the hardening + integration layers:

```text
# Redis — optional; falls back to in-memory idempotency store
REDIS_URL=redis://localhost:6379

# Nafath e-signature
NAFATH_MODE=mock               # or 'live'
NAFATH_BASE_URL=https://api.nafath.sa
NAFATH_APP_ID=<from-nafath>
NAFATH_SERVICE_ID=<from-nafath>
NAFATH_PRIVATE_KEY_PEM=<RSA PEM>
NAFATH_PUBLIC_KEY_PEM=<RSA PEM>
NAFATH_MOCK_APPROVE_MS=5000    # only in mock mode
NAFATH_JWS_HS_SECRET=<dev>     # only in mock mode

# Yakeen / Absher
ABSHER_MODE=mock
ABSHER_BASE_URL=<from-absher>
ABSHER_CLIENT_ID=
ABSHER_CLIENT_SECRET=

# Wasel (SPL)
WASEL_MODE=mock
WASEL_BASE_URL=
WASEL_API_KEY=

# NPHIES webhook
NPHIES_WEBHOOK_SECRET=<from-CHI>
NPHIES_WEBHOOK_HEADER=X-NPHIES-Signature
NPHIES_WEBHOOK_PREFIX=sha256=
NPHIES_RECON_ENABLED=true
NPHIES_RECON_INTERVAL_MS=600000
```

---

## 9. Who to call

| Topic                        | Owner                         |
| ---------------------------- | ----------------------------- |
| Backend hardening layer      | Platform team                 |
| UI (web-admin)               | Frontend team                 |
| Prometheus + Alertmanager    | Platform / SRE                |
| On-call rotation             | (configure in your PagerDuty) |
| Partner onboarding questions | platform@alawael.sa           |

---

## 10. Downstream phases (built on this foundation)

These phases extend the integration layer documented above. Listed here so
operators can trace symptoms back to the right runbook without re-discovering
the architecture.

| Phase / Topic                   | What it adds                                                                      | Runbook                                                                |
| ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phase 18 — Dashboard Platform   | KPI registry + 17 widgets + alert evaluator + scheduled snapshot delivery         | [18-dashboard-platform.md](18-dashboard-platform.md)                   |
| Phase 19 — Forms Catalog        | 32 ready-to-use form templates (beneficiary / hr / management)                    | [19-forms-catalog.md](19-forms-catalog.md)                             |
| DR/encryption stack             | Daily restore drill + AES-256-GCM streaming + ops-alerter wiring                  | [19-dr-verification.md](19-dr-verification.md)                         |
| Accessibility (WCAG 2.1 AA)     | Cypress + Jest a11y gates with `axe-core`; widened from 14 a11y-only to 11K tests | [20-accessibility.md](20-accessibility.md)                             |
| Phase 21 — Session→Claim Bridge | `buildClaimFromSession()` mapping Arabic session types → CPT codes (NPHIES)       | [21-session-to-claim-bridge.md](21-session-to-claim-bridge.md)         |
| Phase 22 — ZATCA Phase 2        | Routes mounted in `_registry.js` + post-save hook + 24h SLA sweeper               | [22-zatca-phase2.md](22-zatca-phase2.md)                               |
| Go-live checklist               | One operator-friendly index consolidating 11 runbooks                             | [23-go-live-checklist.md](23-go-live-checklist.md)                     |
| Session manifest 2026-05-02     | What was touched in the operational-hardening session (audit trail)               | [24-session-2026-05-02-manifest.md](24-session-2026-05-02-manifest.md) |

The boundary: **anything that calls an external system or moves an event
across module boundaries belongs in the test:integration-hardening battery
in §5**. Anything that builds business logic on top of those primitives
goes in its own runbook above.
