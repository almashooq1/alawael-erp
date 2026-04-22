# Reporting & Communications Platform — Architecture

**Version:** 1.0 · **Phase:** 10 Commit 1 · **Date:** 2026-04-22
**Owner:** Reporting Platform team · **Status:** Foundation (implemented)

---

## 0. Context

Al-Awael ERP already ships mature primitives we build **on top of**, not replace:

- `config/kpi.registry.js` — 22 canonical KPIs (Phase 8).
- `config/red-flags.registry.js` — 26 red flags + engine + state store (Phase 9).
- `services/rehabReportBuilders.js` — 5 pure rehab report builders.
- `services/parentReportService.js` — PDF assembly + pdfkit rendering.
- `communication/` — unified SMS / Email / WhatsApp channels (real providers: Twilio, SendGrid/Mailgun, WhatsApp Business).
- `models/Notification.js` + `NotificationTemplate.js` — in-app + push notifications (Firebase Admin).
- `alerts/dispatcher.js` + `alerts/scheduler.js` — the dispatch/tick pattern we extend here.
- `scheduler/*.scheduler.js` — node-cron jobs (already 7 domain schedulers).
- `locales/ar.json`, `locales/en.json` — i18n store.
- `templates/*.html` — 70+ Handlebars/HTML templates (parent dashboard, reports, portal).

What this phase adds is the **integration backbone**: a catalog that names every periodic & on-demand report, a unified engine that renders it once and fans it out to the right recipients on the right channels, a delivery ledger that proves it arrived, an approval workflow that gates confidential output, and a scheduler that binds all seven periodicities to the catalog.

---

## 1. Reporting Architecture

### 1.1 Layered view

```
┌────────────────────────────────────────────────────────────────────┐
│  PRESENTATION  │ web-admin dashboards · parent portal · PDF · email│
├────────────────────────────────────────────────────────────────────┤
│  DELIVERY      │ email · SMS · WhatsApp · in-app · push · portal   │  ← channels
├────────────────────────────────────────────────────────────────────┤
│  DISPATCH      │ reportingEngine · approval gate · delivery ledger │  ← this phase
├────────────────────────────────────────────────────────────────────┤
│  RENDER        │ templates (HBS) · pdfkit · exceljs · locales (ar/en)│
├────────────────────────────────────────────────────────────────────┤
│  BUILDERS      │ rehabReportBuilders · parentReportService · ...   │  ← pure functions
├────────────────────────────────────────────────────────────────────┤
│  DATA          │ Beneficiary · CarePlan · Session · Attendance ... │  ← Mongoose models
├────────────────────────────────────────────────────────────────────┤
│  CATALOG + KPI │ report.catalog.js · kpi.registry.js · red-flags    │  ← pure data
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key invariants

1. **Build once, deliver many.** A report is _built_ as a JSON document (pure function), _rendered_ into one or more formats (HTML / PDF / XLSX / plain text), then _dispatched_ to many recipients over many channels. The same JSON never gets re-queried.
2. **Catalog is the only source of truth.** What reports exist, who gets them, through which channel, at what cadence, under what confidentiality class — all declared once in `config/report.catalog.js`. Adding a report = adding an entry; no code outside the catalog should name a report type.
3. **Approvals gate PII.** Reports flagged `confidentiality: 'restricted'` or `'confidential'` cannot be dispatched without a persisted `ReportApprovalRequest` in state `APPROVED`. The gate is enforced by the engine, not by the scheduler.
4. **Delivery is always ledgered.** Every (report-instance, recipient, channel) tuple is persisted as a `ReportDelivery` row with a state machine: `QUEUED → SENT → DELIVERED → READ` on the happy path, `FAILED → RETRYING → ESCALATED` on the sad path.
5. **Idempotency by instance key.** An instance key is `<reportId>:<periodKey>:<scopeKey>` (e.g. `ben.progress.weekly:2026-W17:branch-A`). Re-running the same instance never duplicates deliveries — the engine upserts on that key.
6. **Locale per recipient, not per report.** The catalog declares which locales are _supported_; the engine picks the locale from the recipient profile at dispatch time.
7. **No hardcoded dispatch.** Existing schedulers (`kpi-attendance.scheduler.js`, `recruitment.scheduler.js`, etc.) keep running domain jobs; `reports.scheduler.js` only knows how to ask the engine to run catalog entries.

### 1.3 Request flow (periodic report)

```
┌────────────┐   ┌──────────────┐   ┌────────────────┐   ┌───────────┐
│ cron tick  │ → │ catalog      │ → │ builder (pure) │ → │ renderer  │
│ (weekly)   │   │ byPeriodicity│   │ JSON doc       │   │ HTML/PDF  │
└────────────┘   └──────────────┘   └────────────────┘   └─────┬─────┘
                                                               │
                                         ┌─────────────────────┴────────────────────┐
                                         │ approval gate (if confidential)          │
                                         │  PENDING → APPROVED → dispatch           │
                                         └─────────────────────┬────────────────────┘
                                                               │
                                         ┌─────────────────────┴────────────────────┐
                                         │ recipient resolver (by audience + scope) │
                                         └─────────────────────┬────────────────────┘
                                                               │
                 ┌─────────────────┬─────────────────┬─────────┴───────┬─────────────────┐
                 ▼                 ▼                 ▼                 ▼                 ▼
           email channel     SMS channel    WhatsApp channel    in-app push      portal inbox
                 │                 │                 │                 │                 │
                 └───────┬─────────┴─────────┬───────┘                 │                 │
                         ▼                   ▼                         ▼                 ▼
                 ┌─────────────────────────────────────────────────────────────────────┐
                 │  ReportDelivery ledger: QUEUED / SENT / DELIVERED / READ / FAILED /  │
                 │  RETRYING / ESCALATED                                                │
                 └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Report Catalog

The catalog lives at `config/report.catalog.js` and is **pure data** (same discipline as KPI & red-flag registries). Each entry has this shape:

```js
{
  id: 'ben.progress.weekly',              // slash-delimited slug, never rename
  nameEn: 'Weekly Beneficiary Progress',
  nameAr: 'تقرير التقدم الأسبوعي للمستفيد',
  category: 'clinical',                   // one of CATEGORIES
  periodicity: 'weekly',                  // one of PERIODICITIES
  audiences: ['guardian', 'therapist'],   // one or more AUDIENCES
  channels: ['email', 'whatsapp', 'portal', 'in_app'],
  confidentiality: 'restricted',          // public | internal | restricted | confidential
  locales: ['ar', 'en'],                  // locales rendered per recipient
  builder: 'rehabReportBuilders.buildFamilyUpdate',  // dotted path — resolved at runtime
  template: 'parent-family-update',       // templates/<name>.html
  formats: ['pdf', 'html'],               // the renderer emits these
  approvalRequired: false,                // true → ReportApprovalRequest must be APPROVED
  retention: { days: 365 },               // how long delivery rows & PDF artefacts persist
  kpiLinks: ['rehab.goal.progress_velocity'],  // referenced KPI ids (drift-tested)
  owner: 'therapist_lead',                // canonical role from rbac.config.js
  compliance: ['CBAHI', 'MOH'],           // frameworks this report feeds
  slaHours: 24,                           // delivery SLA for escalation
  enabled: true,
}
```

### 2.1 Periodicities (7)

| id           | cron               | description                                    |
| ------------ | ------------------ | ---------------------------------------------- |
| `daily`      | `0 7 * * *`        | Daily operational digests                      |
| `weekly`     | `0 8 * * MON`      | Weekly parent/therapist/supervisor summaries   |
| `monthly`    | `0 9 1 * *`        | Monthly branch/finance/HR reports              |
| `quarterly`  | `0 9 1 1,4,7,10 *` | Quarterly board & compliance reports           |
| `semiannual` | `0 9 1 1,7 *`      | Semi-annual program reviews                    |
| `annual`     | `0 9 1 1 *`        | Annual reports                                 |
| `on_demand`  | `—`                | Triggered by user / event (not cron-scheduled) |

### 2.2 Audiences (9)

`beneficiary`, `guardian`, `therapist`, `supervisor`, `branch_manager`, `executive`, `quality`, `finance`, `hr`.

### 2.3 Channels (6)

`email`, `sms`, `whatsapp`, `in_app`, `pdf_download`, `portal_inbox`.

`sms` is reserved for short-form alerts (≤160 chars); long-form reports get a link instead.

### 2.4 Confidentiality classes (4)

| class          | approval     | recipients              | channels                         |
| -------------- | ------------ | ----------------------- | -------------------------------- |
| `public`       | none         | anyone                  | all                              |
| `internal`     | none         | employees only          | all except sms                   |
| `restricted`   | optional     | named audience          | email + portal + in_app (no sms) |
| `confidential` | **required** | named audience, audited | portal only; PDFs watermarked    |

---

## 3. Report Catalog — Full List (30 reports)

### 3.1 Clinical — Beneficiary-facing

| id                      | periodicity | audience                        | channels                        | confidentiality | builder                                           |
| ----------------------- | ----------- | ------------------------------- | ------------------------------- | --------------- | ------------------------------------------------- |
| `ben.progress.weekly`   | weekly      | guardian, therapist             | email, whatsapp, portal, in_app | restricted      | `rehabReportBuilders.buildFamilyUpdate`           |
| `ben.progress.monthly`  | monthly     | guardian, supervisor            | email, portal, pdf              | restricted      | `rehabReportBuilders.buildFamilyUpdate`           |
| `ben.attendance.weekly` | weekly      | guardian                        | whatsapp, sms, in_app           | restricted      | `attendanceReportBuilder.buildAdherence`          |
| `ben.goal.achievement`  | monthly     | guardian, therapist, supervisor | email, portal                   | restricted      | `rehabReportBuilders.buildDisciplineReportCard`   |
| `ben.irp.snapshot`      | on_demand   | supervisor, quality             | portal, pdf                     | restricted      | `rehabReportBuilders.buildIrpSnapshot`            |
| `ben.discharge.summary` | on_demand   | guardian, supervisor, quality   | portal, pdf                     | confidential    | `rehabReportBuilders.buildDischargeSummary`       |
| `ben.review.compliance` | weekly      | supervisor, quality             | email, portal                   | internal        | `rehabReportBuilders.buildReviewComplianceReport` |

### 3.2 Therapist & Operations

| id                              | periodicity | audience                   | channels              | confidentiality | builder                                    |
| ------------------------------- | ----------- | -------------------------- | --------------------- | --------------- | ------------------------------------------ |
| `therapist.productivity.weekly` | weekly      | supervisor, branch_manager | email, in_app, portal | internal        | `therapistReportBuilder.buildProductivity` |
| `therapist.caseload.monthly`    | monthly     | supervisor                 | portal, pdf           | internal        | `therapistReportBuilder.buildCaseload`     |
| `session.volume.daily`          | daily       | branch_manager             | email, in_app         | internal        | `sessionReportBuilder.buildVolume`         |
| `branch.occupancy.weekly`       | weekly      | branch_manager, executive  | email, portal         | internal        | `branchReportBuilder.buildOccupancy`       |
| `branch.kpi.monthly`            | monthly     | branch_manager, executive  | portal, pdf           | internal        | `kpiReportBuilder.buildBranchKpiPack`      |
| `fleet.punctuality.weekly`      | weekly      | branch_manager, supervisor | email, in_app         | internal        | `fleetReportBuilder.buildPunctuality`      |

### 3.3 Executive

| id                         | periodicity | audience           | channels      | confidentiality | builder                                      |
| -------------------------- | ----------- | ------------------ | ------------- | --------------- | -------------------------------------------- |
| `exec.kpi.digest.daily`    | daily       | executive          | email, in_app | internal        | `kpiReportBuilder.buildExecDigest`           |
| `exec.kpi.board.quarterly` | quarterly   | executive          | portal, pdf   | confidential    | `kpiReportBuilder.buildBoardPack`            |
| `exec.programs.semiannual` | semiannual  | executive, quality | portal, pdf   | confidential    | `executiveReportBuilder.buildProgramsReview` |
| `exec.annual.report`       | annual      | executive          | portal, pdf   | confidential    | `executiveReportBuilder.buildAnnualReport`   |

### 3.4 Quality

| id                                 | periodicity | audience                | channels      | confidentiality | builder                                     |
| ---------------------------------- | ----------- | ----------------------- | ------------- | --------------- | ------------------------------------------- |
| `quality.incidents.weekly`         | weekly      | quality, branch_manager | email, portal | restricted      | `qualityReportBuilder.buildIncidentsDigest` |
| `quality.incidents.monthly`        | monthly     | quality, executive      | portal, pdf   | restricted      | `qualityReportBuilder.buildIncidentsPack`   |
| `quality.cbahi.evidence.quarterly` | quarterly   | quality, executive      | portal, pdf   | confidential    | `qualityReportBuilder.buildCbahiEvidence`   |
| `quality.red_flags.daily`          | daily       | quality, supervisor     | in_app, email | internal        | `qualityReportBuilder.buildRedFlagsDigest`  |

### 3.5 Finance

| id                              | periodicity | audience           | channels      | confidentiality | builder                                     |
| ------------------------------- | ----------- | ------------------ | ------------- | --------------- | ------------------------------------------- |
| `finance.claims.weekly`         | weekly      | finance            | email, portal | restricted      | `financeReportBuilder.buildClaimsPack`      |
| `finance.collections.monthly`   | monthly     | finance, executive | portal, pdf   | confidential    | `financeReportBuilder.buildCollectionsPack` |
| `finance.revenue.quarterly`     | quarterly   | finance, executive | portal, pdf   | confidential    | `financeReportBuilder.buildRevenueReview`   |
| `finance.invoices.aging.weekly` | weekly      | finance            | email, portal | internal        | `financeReportBuilder.buildAgingReport`     |

### 3.6 HR

| id                          | periodicity | audience       | channels      | confidentiality | builder                                    |
| --------------------------- | ----------- | -------------- | ------------- | --------------- | ------------------------------------------ |
| `hr.turnover.monthly`       | monthly     | hr, executive  | portal, pdf   | confidential    | `hrReportBuilder.buildTurnover`            |
| `hr.attendance.weekly`      | weekly      | hr, supervisor | email, in_app | internal        | `hrReportBuilder.buildAttendanceAdherence` |
| `hr.cpe.compliance.monthly` | monthly     | hr, quality    | portal, pdf   | restricted      | `hrReportBuilder.buildCpeCompliance`       |

### 3.7 CRM / Parent Engagement

| id                              | periodicity | audience                   | channels      | confidentiality | builder                                  |
| ------------------------------- | ----------- | -------------------------- | ------------- | --------------- | ---------------------------------------- |
| `crm.parent.engagement.monthly` | monthly     | branch_manager, supervisor | email, portal | internal        | `crmReportBuilder.buildParentEngagement` |
| `crm.complaints.weekly`         | weekly      | quality, branch_manager    | email, in_app | restricted      | `crmReportBuilder.buildComplaintsDigest` |

---

## 4. Distribution Workflows

### 4.1 Scheduled run (periodic)

1. `scheduler/reports.scheduler.js` fires at the periodicity's cron expression.
2. For each catalog entry matching that periodicity and `enabled: true`, scheduler calls `reportingEngine.runInstance({ reportId, periodKey, scopeKey? })`.
3. Engine loads catalog entry, computes instance key, checks `ReportDelivery` for idempotency (returns early if already `SENT`/`DELIVERED` for all recipients).
4. Engine resolves the builder, calls it with `{ period, scope, models }` context, receives a JSON document.
5. Engine resolves recipients via audience → role/relationship resolver (e.g. `guardian` of beneficiary in scope, `branch_manager` of branch in scope).
6. If `confidentiality ∈ {restricted, confidential}` and `approvalRequired === true`: engine creates `ReportApprovalRequest` in `PENDING`, emits `report.approval.requested`, **stops**. The approver uses the portal to advance to `APPROVED`/`REJECTED`; on approval, a hook calls `reportingEngine.dispatchApproved(requestId)` to resume.
7. Engine renders the document per-recipient (locale picked from recipient profile).
8. Engine iterates channels declared on the catalog entry; for each recipient × channel, engine creates `ReportDelivery` row in `QUEUED`, calls the channel adapter, updates to `SENT` on success or `FAILED` on error.
9. Webhooks from providers (SendGrid, Twilio, WhatsApp) push `delivered`/`read` callbacks to `/api/v1/reports/webhooks/:provider`, which advances the ledger.
10. Hourly `reports.escalation.scheduler` job scans `ReportDelivery` rows in `FAILED` past retry budget and escalates to the escalation role defined on the catalog entry.

### 4.2 On-demand run

- Trigger via `POST /api/v1/reports/run` with `{ reportId, scope, recipientsOverride? }`.
- `requireRole` middleware enforces that the caller holds a role that owns the report (per `catalog.owner`).
- Same pipeline as periodic from step 3 onward.

### 4.3 Approval workflow (state machine)

```
   (create)
      │
      ▼
  ┌─────────┐  reject   ┌──────────┐
  │ PENDING │──────────▶│ REJECTED │
  └────┬────┘           └──────────┘
       │ approve
       ▼
  ┌──────────┐  dispatch ┌──────────┐
  │ APPROVED │──────────▶│DISPATCHED│
  └──────────┘           └──────────┘
```

Rules:

- Only roles listed in `catalog.approverRoles` (default: `['quality_manager', 'branch_manager']` for restricted, `['ceo', 'medical_director']` for confidential) may approve.
- Every state transition writes an audit-log entry (`reportApproval.*`) with actor, timestamp, reason.
- `REJECTED` terminates the run; all queued deliveries for that instance are marked `CANCELLED`.
- `APPROVED` has a TTL (default 24h); if not dispatched in time, the engine requires re-approval.

### 4.4 Escalation ladder

1. **Send failure** (HTTP 5xx / provider down): retry with exponential backoff (30s, 5m, 30m, 2h; max 4 attempts).
2. **All retries exhausted**: mark `ESCALATED`, notify the catalog entry's `escalateTo` role in-app + email.
3. **Read receipt missing** past `slaHours`: notify the recipient a second time via next-priority channel (if in catalog); after that, escalate to the beneficiary's case manager.
4. **Channel-wide outage detected** (>20% failure rate in last 15 min for a single channel): circuit-break that channel at the dispatcher; queue deliveries for next tick.

### 4.5 Multi-language

- Catalog declares `locales`; per-recipient the engine picks `User.preferredLocale || Guardian.preferredLocale || 'ar'`.
- Templates follow the convention `templates/<name>.<locale>.html`; renderer falls back to `<name>.html` with locale-aware Handlebars helpers (`{{t 'key'}}`).
- Numbers / dates formatted through `utils/locale.js` (Arabic-Indic digits for `ar`, ISO 8601 for logs).
- PDF rendering uses an Arabic-capable font (Noto Naskh Arabic) registered at pdfkit boot.

### 4.6 Confidentiality controls

- `restricted`: recipients must have role ACL matching the resource (e.g. guardian for _their_ beneficiary only).
- `confidential`: PDF watermarking (recipient name + timestamp) + portal-only delivery + audit trail of every download + `ReportDelivery.accessLog[]` on each open.
- PDPL-aware redaction: builders must mark fields with `__pdpl` metadata; renderer redacts based on recipient role (parent sees own child's name; executive sees anonymised cohort counts only).

---

## 5. Data Model

### 5.1 New collections

#### `report_deliveries`

One row per **(report-instance × recipient × channel)**. The ledger of truth.

```
reportId            string (catalog id)
instanceKey         string (reportId:periodKey:scopeKey) — indexed
periodKey           string (e.g. '2026-W17', '2026-04', '2026-Q2', '2026')
scopeKey            string | null (e.g. 'beneficiary:<oid>', 'branch:<oid>')
recipientId         ObjectId ref User | Guardian | Employee
recipientRole       string (audience label)
channel             enum (email|sms|whatsapp|in_app|pdf_download|portal_inbox)
locale              enum (ar|en)
status              enum (QUEUED|SENT|DELIVERED|READ|FAILED|RETRYING|ESCALATED|CANCELLED)
attempts            number (default 0)
sentAt              Date | null
deliveredAt         Date | null
readAt              Date | null
failedAt            Date | null
escalatedAt         Date | null
providerMessageId   string | null
providerError       string | null
accessLog           [{ at, actor, action }]   // for confidential reports
artifactUri         string | null              // S3/filesystem location of PDF
confidentiality     enum (public|internal|restricted|confidential)
approvalRequestId   ObjectId ref ReportApprovalRequest | null
branchId            ObjectId ref Branch (tenant field)
metadata            Mixed
createdAt / updatedAt
```

Indexes:

- `{ instanceKey, recipientId, channel }` **unique** — idempotency.
- `{ status, failedAt }` — escalation sweep.
- `{ recipientId, readAt }` — per-user inbox queries.
- `{ reportId, periodKey }` — per-report analytics.
- `{ branchId, status }` — branch-manager dashboards.

#### `report_approval_requests`

```
reportId            string (catalog id)
instanceKey         string — indexed
scopeKey            string | null
requestedBy         ObjectId ref User
state               enum (PENDING|APPROVED|REJECTED|DISPATCHED|EXPIRED|CANCELLED)
stateHistory        [{ state, at, actor, reason }]
approvers           [ObjectId ref User]
approvedBy          ObjectId ref User | null
approvedAt          Date | null
rejectedBy          ObjectId ref User | null
rejectedAt          Date | null
rejectionReason     string | null
expiresAt           Date
confidentiality     enum
payloadHash         string (SHA-256 of the built JSON — detects tampering)
branchId            ObjectId ref Branch
createdAt / updatedAt
```

Indexes:

- `{ instanceKey }` **unique** — one approval per instance.
- `{ state, expiresAt }` — expiry sweep.

### 5.2 Existing collections read by the engine

- `Beneficiary`, `CarePlan`, `Session`, `SessionAttendance`, `Goal`, `GoalProgressEntry`, `Incident`, `Invoice`, `Employee`, `Guardian`, `Vehicle`, `Appointment` — data sources for builders.
- `User`, `Role` — recipient resolution.
- `AuditLog` — written on approval state changes, dispatch, and confidential-report opens.

### 5.3 Event contracts

Published on the existing `eventBus`:

| event                       | payload                                 | consumers                     |
| --------------------------- | --------------------------------------- | ----------------------------- |
| `report.instance.built`     | `{ reportId, instanceKey, durationMs }` | observability                 |
| `report.approval.requested` | `{ requestId, reportId, approvers }`    | in-app, approvers' dashboards |
| `report.approval.decided`   | `{ requestId, decision, actor }`        | audit, engine resume          |
| `report.delivery.queued`    | `{ deliveryId, channel }`               | channel adapters              |
| `report.delivery.sent`      | `{ deliveryId }`                        | ledger, analytics             |
| `report.delivery.delivered` | `{ deliveryId }`                        | ledger                        |
| `report.delivery.read`      | `{ deliveryId }`                        | ledger, engagement KPI        |
| `report.delivery.failed`    | `{ deliveryId, reason }`                | escalation                    |
| `report.delivery.escalated` | `{ deliveryId, escalatedTo }`           | alerts dispatcher             |

---

## 6. Notification Logic

### 6.1 Channel adapter contract

Every channel exposes an adapter with this signature, matching the existing alerts dispatcher convention:

```js
{
  name: 'email',  // 'sms' | 'whatsapp' | 'in_app' | 'pdf_download' | 'portal_inbox'
  async send(payload, recipients) {
    // payload: { subject, bodyHtml, bodyText, attachments, locale, reportId, instanceKey, confidentiality }
    // recipients: [{ id, role, email, phone, userId, locale }]
    // returns: { success, providerMessageId?, error? }
  }
}
```

Adapters live at `services/reporting/channels/<name>.channel.js` and wrap the existing `communication/email-service`, `communication/sms-service`, `communication/whatsapp-service`, `services/notifications/notification-enhanced.service.js`, `services/pdfService.js`, and `services/portalInboxService.js`.

### 6.2 Recipient resolution

For each `audience` on the catalog entry:

| audience         | resolver                                                           | scope-dependency                      |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------- |
| `beneficiary`    | `Beneficiary.find({ _id: scopeId, isActive: true })`               | requires `scopeKey: beneficiary:<id>` |
| `guardian`       | `Guardian.find({ beneficiaryId: scopeId, primary: true })`         | requires beneficiary scope            |
| `therapist`      | `Session.distinct('therapistId', { beneficiaryId: scopeId, ... })` | requires beneficiary scope            |
| `supervisor`     | `User.find({ role: 'supervisor', branchId })`                      | branch scope                          |
| `branch_manager` | `User.findOne({ role: 'branch_manager', branchId })`               | branch scope                          |
| `executive`      | `User.find({ role: { $in: ['ceo', 'coo', 'cmo', 'cfo'] } })`       | tenant-wide                           |
| `quality`        | `User.find({ role: 'quality_manager' })`                           | tenant-wide                           |
| `finance`        | `User.find({ role: { $in: ['finance_manager', 'accountant'] } })`  | tenant-wide                           |
| `hr`             | `User.find({ role: { $in: ['hr_manager', 'hr_specialist'] } })`    | tenant-wide                           |

Resolver picks `locale`, `email`, `phone`, and `preferredChannels` from the user/guardian profile.

### 6.3 Channel selection per recipient

1. Intersect `catalog.channels` with `recipient.preferredChannels`. Skip the intersection step and use catalog set if the recipient has none declared.
2. For `confidentiality === 'confidential'`: strip everything except `portal_inbox` (and optionally a notification-only `in_app` "your report is ready").
3. For `sms`: truncate to a notification + secure link only (reports never go in SMS body).

### 6.4 Rate limiting

- Per-recipient: max 20 report notifications / day (guardian), 50/day (employees). Excess goes to a digest.
- Per-channel: hard provider limits enforced via existing `adapterRateLimiter.js`.

### 6.5 Read receipts

| channel        | signal                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `email`        | SendGrid/Mailgun open webhook → `DELIVERED`; link click → `READ`       |
| `sms`          | Twilio `delivered` status → `DELIVERED`; link click on portal → `READ` |
| `whatsapp`     | WhatsApp Business read status → `READ` (stronger than email)           |
| `in_app`       | Frontend marks `readAt` when notification opened                       |
| `portal_inbox` | Portal marks `readAt` on download/view                                 |
| `pdf_download` | PDF download endpoint writes `accessLog` + flips `readAt`              |

---

## 7. KPI Dictionary (Reporting-specific)

These KPIs measure the **reporting platform itself**; they are additive to the 22 KPIs in `config/kpi.registry.js`.

| id                                      | nameEn                          | unit         | direction        | target | warning | critical | owner                   |
| --------------------------------------- | ------------------------------- | ------------ | ---------------- | ------ | ------- | -------- | ----------------------- |
| `reporting.delivery.success_rate`       | Delivery success rate           | percent      | higher_is_better | 99     | 97      | 95       | reporting_platform_lead |
| `reporting.delivery.sla_adherence`      | Deliveries meeting SLA          | percent      | higher_is_better | 98     | 95      | 90       | reporting_platform_lead |
| `reporting.read.rate_parent_weekly`     | Weekly parent report read rate  | percent      | higher_is_better | 70     | 55      | 40       | crm_lead                |
| `reporting.read.latency_median_hours`   | Median time-to-read (hours)     | hours        | lower_is_better  | 12     | 24      | 48       | crm_lead                |
| `reporting.failure.rate_by_channel`     | Channel failure rate            | percent      | lower_is_better  | 1      | 3       | 5        | reporting_platform_lead |
| `reporting.escalation.count_daily`      | Deliveries escalated / day      | count        | lower_is_better  | 2      | 5       | 10       | quality_manager         |
| `reporting.approval.cycle_median_hours` | Approval cycle (median hours)   | hours        | lower_is_better  | 4      | 12      | 24       | quality_manager         |
| `reporting.approval.rejection_rate`     | Approval rejection rate         | percent      | lower_is_better  | 2      | 5       | 10       | quality_manager         |
| `reporting.catalog.coverage`            | Catalog entries enabled / total | percent      | higher_is_better | 100    | 95      | 90       | reporting_platform_lead |
| `reporting.cost.per_delivery_sar`       | Cost per delivery (SAR)         | currency_sar | lower_is_better  | 0.10   | 0.20    | 0.50     | cfo                     |

### 7.1 Domain KPIs the reports roll up (already in `kpi.registry.js`)

Reference only — these are the KPIs the reports **surface**, not measure themselves:

- Quality: `quality.incidents.mttr.critical_hours`, `quality.cbahi.evidence.completeness`
- Clinical: `clinical.assessments.completion_rate`, `clinical.care_plan.review_adherence`
- Rehab: `rehab.goal.progress_velocity`, `rehab.goal.mastery_rate`
- Scheduling: `scheduling.session.punctuality`, `scheduling.session.cancellation_rate`
- Finance: `finance.claims.denial_rate`, `finance.collections.dso_days`, `finance.invoices.aging_ratio`
- HR: `hr.turnover.voluntary_rate`, `hr.cpe.compliance_rate`, `hr.attendance.adherence`
- CRM: `crm.parent.engagement_score`, `crm.complaints.resolution_time`
- Communications: `communications.notification.delivery_rate`
- Multi-branch: `multi-branch.occupancy.rate`, `multi-branch.fleet.punctuality`

---

## 8. Dashboards & Drill-down Views

### 8.1 Reporting Ops dashboard (`/dashboard/reporting-ops`, role: reporting_platform_lead)

Cards:

- Delivery success rate (today vs 7-day avg) with sparkline
- Deliveries by channel (stacked bar, last 7 days)
- Failed deliveries list (drill-down → delivery detail → retry)
- Pending approvals queue (drill-down → approval detail)
- Channel health matrix (email/SMS/WhatsApp/in-app status lights)

Drill-down: click any metric → time-range picker → per-report breakdown → per-recipient list.

### 8.2 Branch Manager dashboard (`/dashboard/branch/:branchId`)

- Attendance adherence (today, weekly trend)
- Session volume vs target (daily bar)
- Fleet punctuality (weekly)
- Occupancy rate (live)
- Top 5 overdue care-plan reviews
- Open red flags by severity
- Complaints inbox (last 14 days)

### 8.3 Parent portal (`/portal/guardian`)

- "Your weekly update" card (latest `ben.progress.weekly`, read indicator)
- Goal achievement ring (% of active goals at ≥ target)
- Session attendance calendar (last 30 days)
- Upcoming appointments (next 14 days)
- Inbox (`report_deliveries` filtered by guardian)

### 8.4 Executive dashboard (`/dashboard/executive`)

- 22 KPIs in gauge grid (colour-coded vs threshold)
- Quarterly pack teaser (link to latest `exec.kpi.board.quarterly` if approved)
- Branch league table (occupancy, revenue, complaints)
- Red-flag aggregate counters
- Cost per delivery trend

---

## 9. Security & Compliance

- **PDPL**: every `restricted`/`confidential` delivery has a persisted access log; recipient consent snapshot captured at dispatch time.
- **CBAHI evidence**: reports tagged `compliance: ['CBAHI']` feed the evidence pack; drift test asserts `kpiLinks` all resolve.
- **Audit trail**: approvals, dispatches, confidential opens, and escalations all write to the append-only audit log (`auditHashChainService`).
- **Tenant isolation**: every ledger row carries `branchId`; queries without branch scope rejected at middleware.
- **Retention**: delivery rows kept 365 days by default; confidential artefacts kept 7 years (regulatory). Sweep job at `reports.retention.scheduler`.

---

## 10. Rollout phases

1. **P10-C1 (this commit, DONE)**: catalog, models, engine, scheduler, tests.
2. **P10-C2**: channel adapters wired to existing communication services (email/SMS/WhatsApp/in-app/portal).
3. **P10-C3**: render layer (Handlebars templates + pdfkit + exceljs) with Arabic-capable fonts.
4. **P10-C4**: provider webhooks for delivery/read receipts (SendGrid, Twilio, WhatsApp).
5. **P10-C5**: Reporting Ops dashboard + parent portal inbox UI.
6. **P10-C6**: escalation scheduler + rate limiter + retention sweep.
7. **P10-C7**: 10 additional report builders (one per gap listed in §3).
8. **P10-C8**: drift tests for catalog ↔ KPI registry ↔ RBAC roles ↔ template files.
9. **P10-C9**: runbook + release marker (4.0.14).

---

## 11. Related docs

- `docs/PHASE_9_REHAB_ENGINE_RUNBOOK.md` — upstream Phase 9 engine (source of signals).
- `docs/MONITORING_GUIDE.md` — observability for scheduler jobs.
- `docs/HR_COMPLIANCE_GUIDE.md` — HR report compliance requirements.
- `backend/alerts/README.md` — the alerts dispatcher pattern this engine extends.

---

_End of architecture. Code: `backend/config/report.catalog.js`, `backend/models/ReportDelivery.js`, `backend/models/ReportApprovalRequest.js`, `backend/services/reporting/reportingEngine.js`, `backend/scheduler/reports.scheduler.js`._
