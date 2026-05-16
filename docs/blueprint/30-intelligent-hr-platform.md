# Phase 30 — Intelligent HR Platform

**Status:** Shipped (initial slice)
**Date:** 2026-05-15
**Repos touched:**

- `66666/` (backend) — workflow engine + copilot service + routes + smoke probes
- `alawael-rehab-platform/` (web-admin) — 11 admin pages + 2 intelligence pages + ESS portal

## Goal

Close the gap between a feature-rich HR backend (Phase 11, 564 tests) and a
nearly-empty admin UI. Add the "intelligent" layer the user actually asked for:
**predictive analytics**, **workflow automation**, and an **LLM-backed
copilot** — all PII-redacted and audit-logged.

## What shipped

### Wave 1 — Core Operations UI (4 modules, 8 pages)

| Module      | Pages                                                                 | Backend                    |
| ----------- | --------------------------------------------------------------------- | -------------------------- |
| Attendance  | `/hr/attendance` (dashboard) · `/approvals` (bulk) · `/shifts` (CRUD) | `/api/v1/hr-attendance/*`  |
| Leaves      | `/hr/leaves` · `/balances`                                            | `/api/v1/leave-requests/*` |
| Payroll     | `/hr/payroll` · `/[id]` (payslip)                                     | `/api/v1/payroll/*`        |
| Performance | `/hr/performance` · `/[id]` · `/succession`                           | `/api/v1/hr/performance/*` |

### Wave 2 — ESS

- `/me/hr` — full snapshot (profile + contract + leave balance + certifications + recent leaves + red-flags + last review) + check-in/out
- All views audit-logged (`hr.self_service_view`) per PDPL Art. 30

### Wave 4 — Smart Layer

**C11 Predictive** — already mounted in Phase 11:
`/api/v1/hr/smart-analytics/{overview,turnover-risk,recommendations,...}`
Surfaces existing `hrSmartAnalyticsService` (turnover risk scoring, compliance
funnel, performance distribution, smart recommendations).

**C12 Workflow Automation Engine** — `services/hr/hrWorkflowEngine.js`

- 5 built-in rules (curated, pure functions of `(models, now)`):
  - `leave-pending-too-long` — pending request >48h → notify HR + manager
  - `license-expiring-soon` — SCFHS license within 14/30/60 days → tiered severity
  - `contract-ending-soon` — fixed-term contract within 90 days → notify HR
  - `excessive-late-arrivals` — N+ lates/period → flag anomaly + notify
  - `grievance-unanswered` — open grievance >5 days → escalate
- Routes: `/api/v1/hr/workflow/{rules,run,dry-run,rules/:id/run}` (admin-only)
- Notifications via `unifiedNotifier` (WhatsApp/SMS/email fallback chain)
- Audit trail via `AuditLog` (`hr.workflow.rule_fired`)
- **Per-deployment config** overrides built-in defaults (`enabled`, `params`)
- **9 unit tests** (`hr-workflow-engine.test.js`)

**C13 HR Copilot** — `services/hr/hrCopilot.service.js`

- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) by default
- 4 capabilities:
  - `summarizeEmployee` — bilingual 3-paragraph brief
  - `draftLetter` — bilingual draft (warning/promotion/recommendation/etc.)
  - `answerQuestion` — grounded Q&A bounded to supplied policy context
  - `suggestImprovements` — coaching plan from a performance evaluation
- Routes: `/api/v1/hr/copilot/{status,summarize/:id,draft-letter,q-and-a,suggest/:id}`
- **SDK injected** (`@anthropic-ai/sdk` optional) → returns `{ available: false }` cleanly when not wired
- **PII redaction mandatory** before every model call (uses `utils/piiRedactor`)
- **Prompt caching** flagged on system prompt (`cache_control: ephemeral`)
- **LRU result cache** (200 entries, 5 min TTL) on identical inputs
- **Audit trail** — every call writes `hr.copilot.*` to `AuditLog`
- **10 unit tests** (`hr-copilot-service.test.js`)

### Wave 5 — Command Center UI + smoke + runbook

- `/hr/intelligence` — single page listing all workflow rules, dry-run vs real-run buttons, last-run findings table
- `/hr/copilot` — three-tab UI (Q&A / Summarize / Draft Letter) with status banner when SDK isn't wired
- 3 new entries in `post-deploy-smoke.js` to catch silent unmounts:
  `phase30-hr-workflow-rules` · `phase30-hr-copilot-status` · `phase30-hr-smart-analytics`

## How to enable

### 1. Workflow Engine — works out of the box

Just deploy. The engine reads built-in rules. Override behavior via env or
`config/hr-workflow-rules.json` (not required for first run).

To schedule periodic execution, add a node-cron tick:

```js
const cron = require('node-cron');
cron.schedule('0 */2 * * *', () => engine.run());
```

(Not wired by default — call from your existing scheduler module if you have one.)

### 2. Copilot — requires `ANTHROPIC_API_KEY`

```bash
# .env or systemd unit
ANTHROPIC_API_KEY=sk-ant-xxx
```

The boot code in `app.js` constructs an `Anthropic` client only when both the
SDK is installed **and** the key is set. Otherwise:

- `/api/v1/hr/copilot/status` → `{ available: false }`
- All copilot routes return `{ available: false }` (no errors, clean degrade)

To install the SDK:

```bash
npm install @anthropic-ai/sdk --save
```

### 3. Smoke probes — automatic

Once deployed, the daily smoke run reports under `phase30-hr-*`. A 404 there
means a route silently unmounted.

## Files

### Backend (66666/)

- `backend/services/hr/hrWorkflowEngine.js` (380 lines)
- `backend/services/hr/hrCopilot.service.js` (280 lines)
- `backend/routes/hr/hr-workflow.routes.js` (90 lines)
- `backend/routes/hr/hr-copilot.routes.js` (175 lines)
- `backend/__tests__/hr-workflow-engine.test.js` (9 tests)
- `backend/__tests__/hr-copilot-service.test.js` (10 tests)
- `backend/app.js` (+ 2 boot blocks)
- `backend/scripts/post-deploy-smoke.js` (+ 3 probes)

### Web-admin (alawael-rehab-platform/)

- `apps/web-admin/src/lib/types/hr.ts` (extended)
- `apps/web-admin/src/lib/hr-api.ts` (new — 460 lines)
- `apps/web-admin/src/app/(dashboard)/hr/attendance/{page,approvals/page,shifts/page}.tsx`
- `apps/web-admin/src/app/(dashboard)/hr/leaves/{page,balances/page}.tsx`
- `apps/web-admin/src/app/(dashboard)/hr/payroll/{page,[id]/page}.tsx`
- `apps/web-admin/src/app/(dashboard)/hr/performance/{page,[id]/page,succession/page}.tsx`
- `apps/web-admin/src/app/(dashboard)/me/hr/page.tsx`
- `apps/web-admin/src/app/(dashboard)/hr/intelligence/page.tsx`
- `apps/web-admin/src/app/(dashboard)/hr/copilot/page.tsx`
- `apps/web-admin/src/components/layout/sidebar.tsx` (+ 7 HR entries)

## What was deliberately deferred

- **Wave 2 C6 Manager portal** — most use-cases already covered by the
  admin queues (Attendance Approvals, Leaves admin). A dedicated `/me/team`
  view can land later as a thin filter over existing pages.
- **Wave 3 (Training/Contracts/Disciplinary/Benefits CRUD)** — backend
  exists, UIs not yet built. Lower priority than the intelligence layer.
- **Scheduler wiring** — engine has `run()`/`dryRun()`/`runRule()` but
  isn't on a cron yet. Add one when needed; the dry-run lets ops verify
  rules first.

## Compliance notes

- PII redaction happens **inside** the copilot service before any
  external call. Test `'parse failure returns error + raw'` exercises the
  failure path; `summarizeEmployee` test covers the happy path.
- Every copilot + workflow call writes a row to `AuditLog`. Filter by
  `action: /^hr\.(copilot|workflow)\./`.
- The workflow engine never mutates business records — it only emits
  notifications and audit entries. State changes (e.g. auto-approving a
  leave) stay in the route layer where RBAC applies.

## Health snapshot

- Backend tests: **26/26 green** (hr-workflow-engine + hr-workflow-scheduler + hr-copilot-service)
- Web-admin: TS-clean across the full Phase 30 surface
- Smoke probes: **6 new mount-guard entries** (rules/config/audit/scheduler-status + copilot-status + smart-analytics)

## Rounds 2–5 follow-ups (shipped 2026-05-16)

After the initial Phase 30 launch, five hardening + capability rounds
landed on top of the original scope. Each round shipped to production
verified.

### Round 2 — Operations & Activation

- **Cron scheduler wired** (`backend/services/hr/hrWorkflowScheduler.js`)
  ticks every 2 hours by default (`HR_WORKFLOW_CRON`, opt-out via
  `HR_WORKFLOW_DISABLED=true`). 7 unit tests cover lifecycle + concurrency
  suppression + failure paths.
- **Anthropic SDK installed** (`@anthropic-ai/sdk@0.96.0`) + app.js boot
  block fixed to handle the SDK's module shape
  (`mod.Anthropic || mod.default || mod`). Copilot activates the moment
  an operator adds `ANTHROPIC_API_KEY` to `backend/.env` + `pm2 restart
--update-env`.
- **Smart Analytics UI** at `/hr/smart-analytics` surfaces the existing
  Phase 11 service: turnover risk scoring + compliance dashboard +
  workforce KPIs + smart recommendations.

### Round 3 — Manager workflow

- **Manager Portal** at `/me/team` — hub page that aggregates pending
  leave approvals + pending attendance corrections + today's team
  attendance into one view. Zero new backend; relies on the auth-context
  scoping that existing endpoints already perform.

### Round 4 — Audit + Editor

- **Audit-write bug fix** — every workflow + copilot audit write had
  been failing mongoose validation silently. Fixed three audit wrappers
  (startup/schedulers.js scheduler boot, app.js workflow router boot,
  app.js copilot router boot) to translate the engine's natural
  `{action, entityType, ...}` shape into the canonical AuditLog schema
  (`{eventType, eventCategory, ...}`). Added 5 HR event types +
  `'hr'` event category to the AuditLog model.
- **Workflow audit viewer** at `/hr/intelligence/history` —
  paginated table with filters (kind: workflow|copilot, severity).
  Surfaces `GET /api/v1/hr/workflow/audit`.
- **Workflow rule editor** at `/hr/intelligence/rules` — admins can
  enable/disable rules + edit JSON params + add audit notes from the
  UI. Backed by new model
  `models/HR/HrWorkflowRuleConfig` (one doc per ruleId) and three
  endpoints (`GET /config`, `PATCH /config/:ruleId`, `DELETE
/config/:ruleId`). Engine is rebuilt in-memory on every override so
  the next /run uses fresh config — no pm2 restart needed.

### Round 5 — Observability + rule expansion

- **Scheduler heartbeat** — `GET /api/v1/hr/workflow/scheduler/status`
  returns the cron expression + last-run summary + per-rule details
  (rulesEvaluated, totalFindings, totalFired, skipped/error breakdown).
  Surfaces `getLastRunSummary()` from the scheduler instance, stashed
  in a tiny singleton (`hrSchedulerRegistry`) at boot.
- **Scheduler widget on `/hr/intelligence`** — shows running badge +
  cron expression + last-run timestamp + duration + per-rule expandable
  detail.
- **3 new built-in rules** (curated set grew 5 → 8):
  - `performance-review-overdue` — no finalized review in 13+ months
    (skips employees with < 6 months tenure)
  - `probation-ending-soon` — probation period ending in ≤ warnDays
    (defaults: 3 months total, 14-day warning)
  - `iqama-expiring-soon` — non-Saudi staff iqama expires inside
    warnDays (default 90); severity escalates: critical ≤ 30d,
    high ≤ 60d, medium ≤ 90d

## Endpoint reference (full Phase 30 surface)

```
# Workflow Automation
GET    /api/v1/hr/workflow/rules                — list rules + readiness
POST   /api/v1/hr/workflow/run                  — execute every enabled rule
POST   /api/v1/hr/workflow/dry-run              — evaluate without side effects
POST   /api/v1/hr/workflow/rules/:id/run        — execute one rule
GET    /api/v1/hr/workflow/audit                — paginated AuditLog filter
GET    /api/v1/hr/workflow/scheduler/status     — heartbeat + last-run summary
GET    /api/v1/hr/workflow/config               — current overrides
PATCH  /api/v1/hr/workflow/config/:ruleId       — upsert override
DELETE /api/v1/hr/workflow/config/:ruleId       — revert to defaults

# HR Copilot (LLM)
GET    /api/v1/hr/copilot/status                — { available, model }
POST   /api/v1/hr/copilot/summarize/:id         — executive brief
POST   /api/v1/hr/copilot/draft-letter          — bilingual letter draft
POST   /api/v1/hr/copilot/q-and-a               — policy Q&A
POST   /api/v1/hr/copilot/suggest/:id           — coaching plan

# Smart Analytics (existing Phase 11, surfaced)
GET    /api/v1/hr/smart-analytics/dashboard     — full executive bundle
GET    /api/v1/hr/smart-analytics/intelligence  — workforce KPIs
GET    /api/v1/hr/smart-analytics/compliance    — GOSI/SCFHS/iqama/contracts
GET    /api/v1/hr/smart-analytics/risk-scores   — top turnover risks
GET    /api/v1/hr/smart-analytics/recommendations — smart actions

# ESS / Manager
GET    /api/v1/hr/me                            — self-service snapshot
PATCH  /api/v1/hr/me                            — self-update whitelisted fields
GET    /api/v1/hr/me/access-log                 — PDPL Art. 18 DSAR
```

## UI surface (23 pages under /hr/_ + /me/_)

```
/hr/employees                     — list + new + [id]
/hr/departments                   — read-only registry
/hr/attendance                    — daily dashboard
/hr/attendance/approvals          — pending bulk approval
/hr/attendance/shifts             — shift CRUD
/hr/leaves                        — admin queue
/hr/leaves/balances               — matrix per-employee × type
/hr/payroll                       — monthly run
/hr/payroll/[id]                  — payslip detail
/hr/performance                   — evaluation queue
/hr/performance/[id]              — criteria + approve
/hr/performance/succession        — succession plans
/hr/training                      — courses + sessions + plans
/hr/contracts                     — contract queue + expiry warnings
/hr/disciplinary                  — disciplinary actions + resolve
/hr/grievances                    — grievance queue + respond
/hr/career                        — promotions + transfers
/hr/benefits                      — benefits packages
/hr/smart-analytics               — turnover risk + compliance + recs
/hr/intelligence                  — workflow runner + KPIs + heartbeat
/hr/intelligence/history          — audit trail viewer
/hr/intelligence/rules            — rule editor
/hr/copilot                       — LLM 3-tab (Q&A / Summarize / Letter)

/me/hr                            — ESS snapshot + check-in/out
/me/team                          — Manager Portal hub
```
