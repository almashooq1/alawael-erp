# 22 — ZATCA Phase 2 (e-Invoicing) Operational Runbook

> **What this is**
>
> The ZATCA Phase 2 integration was feature-complete inside `services/`
> long before this document existed (UBL 2.1, XAdES, QR/TLV, hash chain,
> CSID onboarding, clearance/reporting APIs — all 14 endpoints in
> `routes/zatca-phase2.routes.js`) but the routes were **not mounted** and
> the Invoice lifecycle had **no auto-submission hook**, so a perfectly
> good submission pipeline returned 404 and every invoice had to be
> hand-posted via the standalone service.
>
> This commit (2026-05-02) closes those gaps. The runbook below documents
> how the now-wired pipeline behaves and how to take it from mock to
> production.

## Architecture (post-wiring)

```text
Invoice.save()                           Invoice.save() with ZATCA_AUTOSUBMIT=true
       │                                          │
       ▼                                          ▼
   pre('save')          [feature flag]    post('save') ──┐
   patientShare calc    ─── OFF ────────► no-op          │ fire-and-forget
                                                          ▼
                                          services/invoiceZatcaHook.js
                                                          │
                                              submitInvoiceToZatca(invoice)
                                                          │ idempotent, best-effort
                                                          ▼
                                          services/zatca-phase2.service.js
                                                          │
                                                processInvoice()
                                                  │
                                                  ├── builds UBL XML
                                                  ├── computes invoice hash + PIH chain
                                                  ├── XAdES signs (mock or live)
                                                  ├── builds QR TLV
                                                  └── POSTs to fatoora.zatca.gov.sa
                                                          │
                                                          ▼
                                          Invoice.updateOne({_id}, {$set: zatca.*})
```

Routes (mounted via `_registry.js → dualMount` at `/api/zatca-phase2/`):

| Endpoint                            | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `POST /onboarding`                  | Send CSR → receive Compliance CSID               |
| `POST /production-csid`             | Compliance CSID → Production CSID                |
| `GET  /credential-status/:branchId` | Inspect per-branch onboarding state              |
| `POST /invoice/process`             | Manual trigger — UBL build + sign + submit       |
| `POST /invoice/build-xml`           | XML only (no submission)                         |
| `POST /invoice/qr`                  | TLV QR for an existing invoice                   |
| `POST /invoice/qr/decode`           | Decode an existing QR (verification)             |
| `POST /invoice/report`              | B2C reporting (إبلاغ — within 24h)               |
| `POST /invoice/clear`               | B2B clearance (تخليص — pre-customer)             |
| `POST /compliance/check`            | Run ZATCA's compliance lint                      |
| `POST /vat/calculate`               | KSA 15% VAT helper                               |
| `POST /vat/validate`                | Validate a VAT number                            |
| `GET  /cpt-codes`                   | List the rehab CPT codes the service knows about |
| `GET  /status`                      | Service self-report                              |

## Feature flag — `ZATCA_AUTOSUBMIT`

The post-save hook is **off by default**. Set
`ZATCA_AUTOSUBMIT=true` in the production `.env` to enable
automatic submission on every Invoice.save(). The flag is checked at
runtime, so `pm2 restart all --update-env` activates it without code
changes.

Why a flag and not always-on:

- Invoice creation latency stays low while the integration is being
  validated (the hook fires inside `setImmediate`, but a misconfigured
  ZATCA endpoint could still cascade into noisy logs).
- Mock-mode dev deployments don't accidentally start hitting
  `gw-fatoora.zatca.gov.sa`.
- Operators can flip it off in seconds during an outage without
  reverting code.

## Idempotency + safety

The hook (`backend/services/invoiceZatcaHook.js`) implements:

- **Skip ACCEPTED.** `submitInvoiceToZatca` returns
  `{ skipped: 'already_accepted' }` if the invoice's
  `zatca.zatcaStatus` is `ACCEPTED`. Re-running on flaky network is
  safe.
- **Skip when flag off.** `{ skipped: 'autosubmit_disabled' }` is
  returned when `ZATCA_AUTOSUBMIT` is anything other than `'true'`.
- **Force re-submission.** Pass `{ force: true }` to bypass both
  guards (use from the admin UI's "retry submit" button).
- **Best-effort.** Any thrown error is caught + logged and persisted as
  `zatca.zatcaStatus = 'REJECTED'` with the error message in
  `zatca.zatcaErrors`. The hook **never throws**, so Invoice.save()
  never fails because of ZATCA.
- **No save() recursion.** Results write back via `Invoice.updateOne()`,
  not `invoice.save()`, so the post-save hook does not re-fire.

## Going live (checklist)

1. **Generate the CSR + key pair** for each branch. Run
   `POST /api/zatca-phase2/onboarding` with the org info; store the
   returned Compliance CSID in `ZatcaCredential` (auto-handled by the
   service when `branchId` is supplied).
2. **Run the compliance check** via `POST /compliance/check` against a
   sample invoice. ZATCA enumerates all errors at once.
3. **Exchange Compliance → Production CSID** via
   `POST /production-csid`. Until this step the credential cannot send
   real invoices.
4. **Set env vars on the VPS:**
   ```text
   ZATCA_SIGNER_MODE=live
   FATOORA_MODE=live
   FATOORA_BASE_URL=https://gw-fatoora.zatca.gov.sa/e-invoicing/core
   ZATCA_AUTOSUBMIT=true
   # Per-branch keys live in ZatcaCredential — no env var needed.
   ```
5. **Restart pm2 with `--update-env`.**
6. **Smoke-test** by issuing one invoice and checking
   `zatca.zatcaStatus === 'ACCEPTED'` within ~30 seconds.

## Operating

- **Failed submissions** are visible in the Invoice list as
  `zatcaStatus: 'REJECTED'` rows with `zatcaErrors` populated. The UI
  should expose a "Retry submit" button that calls the manual
  `POST /api/zatca-phase2/invoice/process` endpoint, OR a future admin
  endpoint that calls the hook with `force: true`.
- **Alerting (two layers, both wired):**
  - **Real-time** — `services/invoiceZatcaHook.js` fires `ops-alerter`
    (whatsapp/sms/email) the moment a submission returns REJECTED, OR
    when `zatcaService.processInvoice()` throws. The alert never
    blocks the bridge — its dispatch failure is caught + logged.
  - **Sweep** — `alerts/rules/zatca-submission-rejected.js` runs from
    the dashboard alert evaluator and catches anything missed by the
    hook (pre-existing rejections, alerts that fired before
    `OPS_ALERT_*` recipients were configured). The rule now queries
    the canonical `zatca.zatcaStatus` path; the previous version
    queried `zatcaSubmission.status` which never matched any row.
- **PIH chain consistency** — `ZatcaCredential.lastInvoiceHash` is the
  source of truth. Don't reset it manually; doing so breaks the chain
  and forces a re-onboarding with ZATCA.
- **Rate limit** — `FATOORA_RL_CAPACITY=600` matches ZATCA's documented
  10/sec quota. Keep it conservative; short bursts use the bucket and
  the circuit breaker handles sustained overload.

## Tests

```text
backend/tests/unit/invoiceZatcaHook.test.js           # 21 tests (hook bridge + real-time alerting)
backend/tests/unit/zatca-submission-rejected.rule.test.js  #  6 tests (alert rule sweep)
backend/__tests__/zatca-xml-signer.e2e.test.js        # XML canonicalization + signing
backend/__tests__/zatca-envelope.test.js              # UBL envelope structure
backend/tests/unit/zatca-phase2.service.test.js       # service layer
backend/tests/unit/zatca-phase2.routes.test.js        # route registration
backend/tests/unit/zatcaCalculation.service.test.js   # VAT math
```

Run the hook tests in isolation:

```text
npx jest tests/unit/invoiceZatcaHook.test.js --no-coverage
```

Run the full ZATCA suite via the existing sprint shortcut:

```text
npm run test:zatca-signer
```

## 24-hour B2C SLA enforcement

ZATCA Phase 2 requires every simplified (B2C) invoice to be reported to
`/invoices/reporting/single` within **24 hours** of issuance. Missing
the deadline is a regulatory exposure — even if the invoice is reported
later. A periodic sweeper closes that risk.

### Service: `services/zatcaB2cSlaSweeper.js`

Two thresholds, both env-overridable:

| Threshold           | Default | Behavior                                                     |
| ------------------- | ------- | ------------------------------------------------------------ |
| `warnThresholdMs`   | 18h     | Retry submission via `submitInvoiceToZatca({ force: true })` |
| `breachThresholdMs` | 23h     | Aggregate ALL breaching invoices into ONE ops-alert per tick |

Why two: 18h gives a 6-hour recovery window during which retries fix the
issue silently. 23h fires the alarm with one hour to spare. The single
aggregated alert prevents on-call spam during a sustained outage that
might breach dozens of invoices in one tick.

Per-tick output:

```text
{ scanned, retried, retrySucceeded, retryFailed, breached, breachAlerted, breachIds }
```

### Scheduler: `startup/zatcaB2cSlaScheduler.js`

Same shape as `nphiesReconciliationScheduler` (start/stop/tick/getStats).
Cadence default 30 minutes. Env vars:

```text
ZATCA_SLA_INTERVAL_MS=1800000     # default 30 min
ZATCA_SLA_BATCH_SIZE=50
ZATCA_SLA_WARN_MS=64800000        # 18h
ZATCA_SLA_BREACH_MS=82800000      # 23h
```

Booted from `app.js` after the NPHIES reconciliation scheduler. Enable
with `ZATCA_SLA_SWEEPER_ENABLED=true` in the production `.env`. The
sweeper is paused in `NODE_ENV=test` so unit tests don't see ticks.

Tests:

- `backend/tests/unit/zatcaB2cSlaSweeper.test.js` (13 tests — selection,
  retries, breach alerting, alert-spam cap, threshold validation)
- `backend/tests/unit/zatcaB2cSlaScheduler.test.js` (7 tests — env
  handling, lastStats cache, overlap guard, thrown-sweep recovery)

## Per-branch credential admin UI

Every branch has one `ZatcaCredential` row holding its CSIDs, secrets,
keys, organisation info, and the PIH counter that anchors the invoice
hash chain. The admin route + UI let finance staff manage these
without touching the Mongo shell.

### Backend route — `/api/admin/zatca-credentials`

| Endpoint               | Purpose                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `GET /`                | List with filters (branchId, isActive, free-text q). Sensitive fields are redacted.    |
| `GET /:id`             | Single row, sensitive fields redacted.                                                 |
| `POST /`               | Create with org info only. Refuses bodies that try to set sensitive fields.            |
| `PATCH /:id`           | Update org info. **Returns 403** if the body contains any field in `SENSITIVE_FIELDS`. |
| `DELETE /:id`          | Soft-disable (`isActive: false`).                                                      |
| `POST /:id/restore`    | Re-enable.                                                                             |
| `POST /:id/onboard`    | Proxy to `zatca-phase2.service.performOnboarding({ branchId, otp })`.                  |
| `POST /:id/production` | Proxy to `obtainProductionCsid({ branchId })`.                                         |

**Sensitive-field redaction (defense in depth, two layers):**

1. The `redact()` helper rewrites `privateKey`, `publicKey`,
   `certificate`, `csr`, `complianceCsid`, `productionCsid`,
   `binarySecurityToken`, `secret`, `apiSecretHash`,
   `complianceRequestId`, `productionRequestId` to `'[REDACTED]'`
   (when present) or `null` (when unset) on every response.
2. The `PATCH` handler **explicitly rejects with 403** any body that
   mentions a sensitive field — even though `pickAllowed` would
   silently drop it. This makes the contract observable and protects
   against schema drift in `EDITABLE_FIELDS`.

The list-response also synthesizes an `isConfigured` boolean (true iff
the credential has both `binarySecurityToken` and `secret`) so the UI
can show a chip without accessing the values themselves.

RBAC: read = admin / superadmin / manager / finance / accountant;
write + onboard = admin / superadmin / finance.

### Frontend page — `/zatca-credentials`

`frontend/src/pages/finance/ZatcaCredentialsAdmin.jsx`. Wired into
`NphiesRoutes` and the sidebar under the admin group with a `ZATCA`
badge. Features:

- Filter row (free-text + active/inactive toggle)
- Table with status chips (configured | environment | active)
- Edit/create dialog with sectioned org-info form
- **Onboard sub-dialog** that prompts for the OTP from the ZATCA
  portal, then calls the backend onboarding proxy
- "Promote to Production" action (gated on `isConfigured`)
- Soft-disable / restore inline actions

Tests:

- `backend/tests/unit/zatca-credentials-admin.routes.test.js`
  (12 tests — redaction, allow-list, branch uniqueness, soft-delete,
  onboarding/production proxy delegation)
- `frontend/src/__tests__/a11y/zatca-credentials-admin.a11y.test.js`
  (1 a11y test — page renders cleanly under WCAG 2.1 AA)

## What's still TODO

- **Webhook receiver** for ZATCA async status updates (currently sync
  request/response only — works for clearance, less ideal for reporting).
