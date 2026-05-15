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

- Backend tests: **19/19 green** (`hr-workflow-engine.test.js` + `hr-copilot-service.test.js`)
- Web-admin: TS-clean across the full Phase 30 surface
- Smoke probes: 3 new mount-guard entries
