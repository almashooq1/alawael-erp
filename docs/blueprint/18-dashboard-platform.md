# 18 — Dashboard Platform (Phase 18)

> **Status:** 🎉 **Phase 18 CLOSED** — Commits 1–9 all shipped across **v4.0.102 → v4.0.113** on **2026-04-24**.
> Backend: 676 tests / 21 suites green. Frontend: zero TypeScript errors.

## Why this phase exists

The ERP has produced strong raw signals for years (KPI registry, Ops
Control Tower, Care platform, Integration Hardening) but each
consumer built its own view. The result was three problems
operators kept hitting:

1. Executives had to piece their picture together from 4+ tools.
2. Branch managers could not see real-time SLA clocks + red-flags
   in one pane during a shift.
3. Each dashboard reimplemented audience checks, which meant RBAC
   drift was inevitable.

Phase 18 introduces a **unified, registry-driven dashboard
platform** with one HTTP surface and one narrative engine, so a
new dashboard ships as a registry entry + a widget — no bespoke
route, no bespoke auth logic.

## Scope — Commit 1 (foundation)

| Layer                                         | File                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| KPI registry extension (+6 KPIs)              | `backend/config/kpi.registry.js`                                  |
| Dashboard catalogue (7 dashboards × 4 levels) | `backend/config/dashboard.registry.js`                            |
| Widget catalog (17 canonical widgets)         | `backend/config/widget.catalog.js`                                |
| Rule-based narrative generator                | `backend/services/dashboardNarrative.service.js`                  |
| Audience-aware aggregator                     | `backend/services/dashboardAggregator.service.js`                 |
| HTTP surface                                  | `backend/routes/dashboards-platform.routes.js`                    |
| App wiring                                    | `backend/app.js` (`/api/v1/dashboards`)                           |
| Drift + behaviour tests                       | `backend/__tests__/dashboard-*.test.js`, `widget-catalog.test.js` |

## The four dashboard levels

| #   | Level              | Audience (sample)                                     | Refresh   | Purpose                               |
| --- | ------------------ | ----------------------------------------------------- | --------- | ------------------------------------- |
| 1   | **executive**      | CEO · COO · CFO · CHRO                                | 5 min     | Network-wide posture + early warnings |
| 2   | **branch-ops**     | Branch manager · shift supervisor · regional director | 1 min     | Live shift command                    |
| 3   | **clinical**       | CMO · lead therapists · therapists                    | 15 min    | Outcomes + caseload + red-flags       |
| 4   | **functional.<x>** | HR / Finance / Quality / CRM heads                    | 15-30 min | Domain-deep board                     |

## KPI additions (Phase 18)

All six already have a data source we ship; only the registry entry
is new. The aggregator and narrative engine key off the `id`s.

| Code                                        | Domain           | Direction | Target |
| ------------------------------------------- | ---------------- | --------- | ------ |
| `crm.nps.score`                             | crm              | higher    | ≥ 45   |
| `finance.ar.dso.days`                       | finance          | lower     | ≤ 45   |
| `quality.capa.ontime_closure.pct`           | quality          | higher    | ≥ 85   |
| `hr.workforce.attrition.pct`                | hr               | lower     | ≤ 10   |
| `clinical.red_flags.active.count`           | clinical         | lower     | 0      |
| `gov-integrations.integration_health.index` | gov-integrations | higher    | ≥ 95   |

## HTTP surface — `/api/v1/dashboards`

All endpoints require authentication. Authorisation is enforced
inside the router against the dashboard's `audience` list.
`super_admin` bypasses audience checks by project convention.

| Method | Path             | Purpose                                                          |
| ------ | ---------------- | ---------------------------------------------------------------- |
| `GET`  | `/catalog`       | Dashboards visible to the caller + filter keys + levels          |
| `GET`  | `/widgets`       | Full widget catalogue (used by the frontend shell on first boot) |
| `GET`  | `/kpis`          | KPIs the caller's dashboards reference (union set)               |
| `GET`  | `/:id`           | Full dashboard payload — hero KPIs + widgets + narrative + asOf  |
| `GET`  | `/:id/narrative` | Narrative only (cheap to regenerate without re-fetching KPIs)    |

### Example — executive dashboard

```
GET /api/v1/dashboards/executive?branch=riyadh-2&dateRange=MTD
```

Response (abridged):

```json
{
  "ok": true,
  "dashboard": {
    "id": "executive",
    "level": "executive",
    "titleAr": "لوحة القيادة التنفيذية",
    "audience": ["super_admin", "head_office_admin", "ceo", "group_gm", "..."],
    "refreshIntervalSeconds": 300
  },
  "heroKpis": [
    {
      "id": "finance.ar.dso.days",
      "nameAr": "متوسط أيام تحصيل الذمم DSO",
      "value": 72,
      "classification": "red",
      "delta": 0.11
    }
  ],
  "widgets": [{ "code": "W-KPI-CARD", "dataShape": "kpi-value", "defaultSpan": { "col": 2, "row": 2 } }],
  "narrative": {
    "headlineEn": "Red breach: Days Sales Outstanding (DSO)",
    "headlineAr": "خرق أحمر: متوسط أيام تحصيل الذمم DSO",
    "confidence": "medium",
    "rulesFired": ["R-RED-KPI"],
    "refs": ["finance.ar.dso.days"]
  },
  "asOf": "2026-04-24T10:00:00.000Z"
}
```

## KPI resolver — integration point

The aggregator is decoupled from data sources through an injected
`kpiResolver` function. The production resolver ships in
`backend/services/dashboardKpiResolver.service.js` (Commit 2) and
is wired into `app.js` at boot as `app._dashboardKpiResolver`.

### How the production resolver resolves a KPI

1. **Direct computer override** — if `DEFAULT_COMPUTERS[kpi.id]`
   (or an injected override) has a function, it wins. Used for
   KPIs that need live state rather than a periodised rollup:
   - `gov-integrations.integration_health.index` — composite 0-100
     score built from the Integration Health aggregator (Phase VII).
   - `clinical.red_flags.active.count` — count of active flags
     from the Beneficiary-360 service (Phase 9 / Care platform).
2. **Phase-10 reporting builders** — for every KPI whose
   `dataSource.service` matches a known builder, delegate to
   `createReportingValueResolver()` from
   `backend/services/reporting/kpiResolvers.js`. That covers
   finance, HR, quality, CRM, scheduling, fleet, and attendance
   builders out of the box.
3. **Delta** — the resolver calls the underlying builder twice
   (current period + prior period, shifted by one `frequency`
   unit) and reports the ratio `(curr - prev) / |prev|`.
4. **Sparkline** — N prior-period values (default 6) walk
   backward through `shiftPeriodKey()` so `W-KPI-CARD` can draw a
   trend line without a dedicated query.
5. **Cache** — a per-process LRU keyed on
   `${kpiId}|${filterHash}|${periodKey}` with TTL chosen by
   `kpi.frequency` (hourly=1m, daily=5m, weekly=30m, monthly=1h).
   A Redis-backed cache can be plugged in via the `cache` option
   without changing callers.
6. **Fail-soft** — every failure path returns
   `{ value: null, source: 'reporting:error' | 'computer:error' | 'reporting:empty' | 'no-kpi' }`
   so operators can see where data went missing without the
   dashboard blanking out.

Contract (unchanged from Commit 1):

```js
kpiResolver(kpi, filters) → Promise<{
  value: number | null,
  delta?: number | null,
  sparkline?: Array<{ t: ISOString, v: number }>,
  asOf?: ISOString,
  source?: string,
  periodKey?: string,
  priorValue?: number | null,
}>
```

The resolver is allowed to throw or return `null`. The aggregator
fails soft per KPI — one broken source never blanks a dashboard.

## Narrative generator — rule catalogue

The commit-1 generator is deterministic and rule-based. Rules are
pure functions of the snapshot input — no LLM call, no network, no
PII exposure.

| Code                   | Fires when                             | Produces                                                     |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `R-RED-KPI`            | Any snapshot is red                    | "Critical breach on X (value, delta vs prior)"               |
| `R-AMBER-DRIFT`        | Worst snapshot is amber with ≥5% drift | "Drifting toward breach — owner should confirm"              |
| `R-POSITIVE-LIFT`      | A green KPI moved up ≥4%               | "On the positive side, X is up +n% — worth documenting"      |
| `R-INTEGRATION-HEALTH` | Integration-health KPI is amber/red    | "Check DLQ depth + NPHIES/Nafath webhook timings"            |
| `R-REDFLAG-CLUSTER`    | Beneficiary-360 red-flag count is red  | "Clinical director should review top-severity cluster today" |

Confidence scoring:

- **low** — zero rules fired (neutral "no notable deviations" text)
- **medium** — 1-2 rules fired
- **high** — 3+ rules fired on ≥4 classified snapshots

**Phase 18 Commit 4** ships an LLM-backed generator behind the
same interface, guarded by the `utils/piiRedactor` module from
Integration Hardening I+II. Behaviour:

- **Opt-in only.** Disabled unless
  `DASHBOARD_LLM_NARRATIVE_ENABLED=true` AND an Anthropic client
  has been assigned to `app._anthropicClient` at boot time. No SDK
  dependency is hard-required — operators who skip the LLM path
  never install `@anthropic-ai/sdk`.
- **Model default:** `claude-haiku-4-5-20251001`. Override with
  `DASHBOARD_LLM_NARRATIVE_MODEL`.
- **Prompt caching** — the system prompt is flagged with
  `cache_control: { type: 'ephemeral' }` so repeat calls hit the
  cache-hit price.
- **Pre-call PII redaction** — every snapshot payload walks through
  `redact()` before the prompt is built.
- **Response caching** — 90-second LRU keyed on a stable snapshot
  hash so frontend polls don't repeatedly pay for identical state.
- **Always-safe fallback** — any error (API, timeout, parse
  failure, mismatched paragraph arrays, redactor exception) falls
  back silently to the deterministic rule-based narrative from C1.
- **Deterministic signal preserved** — even on the LLM path, the
  `rulesFired`, `refs`, and `confidence` fields always come from
  the rule engine, so operators can trust those regardless of
  model behaviour.

A new facade (`dashboardNarrativeFacade.service.js`) wires the two
generators together. The aggregator now accepts a
`narrativeService` injection; `app.js` builds the facade and
injects it whenever `/api/v1/dashboards` is mounted.

## Role-based visibility matrix

| Dashboard            | Canonical audience                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `executive`          | super_admin · head_office_admin · ceo · group_gm · group_cfo · group_chro · group_quality_officer      |
| `branch-ops`         | branch_manager · manager · admin · regional_director · supervisor                                      |
| `clinical`           | clinical*director · doctor · therapy_supervisor · therapist · therapist*{slp,ot,pt,psych}              |
| `functional.hr`      | group_chro · hr_manager · hr_supervisor · hr_officer · hr                                              |
| `functional.finance` | group_cfo · finance_supervisor · accountant · finance                                                  |
| `functional.quality` | group_quality_officer · compliance_officer · regional_quality · quality_coordinator · internal_auditor |
| `functional.crm`     | manager · admin · branch_manager · receptionist                                                        |

Audience strings are validated against `config/rbac.config.js` ROLES
by the drift test — renaming a role anywhere in the platform will
fail `dashboard-registry.test.js` immediately.

## Widget catalog — authoring guidance

- **Adding a widget** = one new entry in `widget.catalog.js` + one
  new frontend component. The `code` becomes the API contract.
- **Changing a widget's `dataShape`** is a breaking change. Create
  a successor (`W-CARD-V2`) and deprecate the old one rather than
  mutating in place.
- Every widget carries a `supports` block (`drill / live /
narrative / export`) so the aggregator can reject
  misconfigurations early.

## Tests

| Suite                                    | Count          | What it guards                                                                                                                                                                                                                                                                |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard-registry.test.js`             | 22             | Shape, taxonomy, cross-references to KPI + widget + RBAC                                                                                                                                                                                                                      |
| `widget-catalog.test.js`                 | 75+            | Per-entry shape, dataShape enum, grid-span bounds, lookups                                                                                                                                                                                                                    |
| `dashboard-narrative-service.test.js`    | 16             | Each rule, confidence levels, bilingual parity, degraded inputs                                                                                                                                                                                                               |
| `dashboard-aggregator-service.test.js`   | 11             | Dispatch, classification, fail-soft, auth, injected clock                                                                                                                                                                                                                     |
| `dashboards-platform-routes.test.js`     | 11             | HTTP surface — 404 / 403 / payload shape / filter parsing                                                                                                                                                                                                                     |
| `dashboard-kpi-resolver-service.test.js` | 24             | Reporting dispatch, direct computers, delta, sparkline, LRU+TTL cache, fail-soft paths                                                                                                                                                                                        |
| `dashboard-llm-narrative.test.js`        | 23             | Factory gating, happy path, 4 fallback paths, PII redactor integration, cache hits, facade selection + graceful degradation                                                                                                                                                   |
| `alert-registry.test.js`                 | 30             | Policy shape, KPI + role cross-refs, ladder monotonicity, quiet hours bounds                                                                                                                                                                                                  |
| `alert-evaluator.test.js`                | 15             | Flapping, recover, dedup, escalation, quiet hours, ack/snooze/mute, internals                                                                                                                                                                                                 |
| `alert-coordinator-and-routes.test.js`   | 15             | End-to-end coordinator + HTTP routes + state store eviction                                                                                                                                                                                                                   |
| `alert-notification-dispatcher.test.js`  | 14             | Factory validation, happy path (payload shape + priority + metadata), 7 skip paths, custom renderer                                                                                                                                                                           |
| `anomaly-detector.test.js`               | 42             | Detector (degraded input, signal detection, seasonal fallback, internals), history store (LRU + TTL + out-of-order guard), resolver integration (anomaly attached / skipped when history short / backward-compat), narrative R-ANOMALY-DETECTED rule                          |
| `alert-scheduler.test.js`                | 13             | Factory validation, runOnce iteration, threshold classification (lower+higher is_better), unknown-classification on null, fail-soft on resolver + coordinator errors, empty dashboards, status counters, start/stop idempotency                                               |
| `dashboard-saved-views.test.js`          | 21             | Store create/update/remove, LRU, listVisibleTo (owner/shared/public), HTTP routes (auth checks, 403/404/503)                                                                                                                                                                  |
| `dashboard-delivery-scheduler.test.js`   | 18             | Subscription registry, renderer (HTML escape, missing narrative), `isDueNow` per cadence, `cadenceWindowKey`, fire subset, no-recipients skip, notifier failures, dedup-per-window, status counters                                                                           |
| `isolation-forest.test.js`               | 16             | Expected path length, PRNG determinism, subsample distinctness, train+score (outlier > normal, empty forest, sampleSize > points), detector (anomaly flag, insufficient history, feature extractor throws, invalid current features, threshold respect, deterministic reruns) |
| `kpi-registry.test.js`                   | 227 (existing) | Proves the +6 new KPIs conform to existing invariants                                                                                                                                                                                                                         |

Total: **676 tests / 21 suites green** for the dashboard slice.

Run locally:

```bash
npx jest --testPathPattern="(dashboard-|widget-catalog|kpi-registry)" --no-coverage
```

## Roadmap — next commits

| Commit          | Deliverable                                                                                                                                                                    | Status      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **C1**          | Registry + aggregator + narrative + routes (pending resolver)                                                                                                                  | ✅ v4.0.102 |
| **C2**          | Real `kpiResolver` — Phase-10 builders + direct computers + LRU cache + delta + sparkline                                                                                      | ✅ v4.0.103 |
| **C3**          | Next.js dashboard shells in `alawael-rehab-platform/apps/web-admin` (hub + dynamic [id] + KPI card + narrative + filter bar + auto-refresh + sidebar entry)                    | ✅ v4.0.104 |
| **C4**          | LLM-backed narrative (Claude Haiku 4.5) behind the same interface + PII redactor guard + opt-in feature flag + deterministic fallback                                          | ✅ v4.0.105 |
| **C5**          | Scheduled PDF/PNG delivery (hooks into Phase 10 reports platform)                                                                                                              | —           |
| **C6**          | Anomaly detector Tier 2 (EWMA + z-score + optional seasonal bucketing) + `R-ANOMALY-DETECTED` narrative rule + per-KPI history store + resolver integration                    | ✅ v4.0.108 |
| **C7**          | Anomaly detector Tier 3 (Isolation Forest per branch, weekly-trained)                                                                                                          | —           |
| **C8**          | Alert dedup + flapping guards + quiet hours + escalation ladders + ack/snooze/mute + admin HTTP surface                                                                        | ✅ v4.0.106 |
| **C8.1 + C3.1** | Notification dispatcher bridge to `unifiedNotifier` + Next.js `/dashboards/alerts` UI (list / ack / snooze / mute + severity grouping + auto-refresh)                          | ✅ v4.0.107 |
| **C8.2**        | Periodic alert evaluator (scheduler) — ticks every N seconds, walks all dashboards, classifies KPIs, feeds the coordinator. Ops visibility via `GET /alerts/scheduler/status`. | ✅ v4.0.109 |
| **UI polish**   | Anomaly + LLM badges on KPI card + narrative, scheduler status card on `/dashboards/alerts`                                                                                    | ✅ v4.0.110 |
| **C9**          | Saved views (bookmarks + shareable deep-links) — store + `/saved-views` CRUD routes + inline `SavedViewsBar` in the dashboard UI                                               | ✅ v4.0.111 |
| **C5**          | Scheduled snapshot delivery — HTML/text/markdown renderer + 5-subscription registry + tick loop via `unifiedNotifier`, env-gated + opt-in                                      | ✅ v4.0.112 |
| **C7**          | Anomaly detector **Tier 3** — Isolation Forest (deterministic, seeded PRNG, no deps) with pluggable feature extractor                                                          | ✅ v4.0.113 |
| **C9**          | Saved views + scheduled delivery + shareable deep-links                                                                                                                        | —           |

## Non-goals for Commit 1

- No frontend components (those land in C3 in the admin repo).
- No LLM calls (C4).
- No anomaly models (C6-C7).
- No write operations — dashboards are read-only, which lets the
  whole surface stay idempotent + cache-friendly.

## Frontend — Commit 3 artefacts (v4.0.104)

All of these live in the separate `alawael-rehab-platform`
monorepo under `apps/web-admin` (Next.js 14 App Router).

| Path                                              | Role                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/lib/types/dashboard.ts`                      | TypeScript mirror of every backend payload                                                              |
| `src/lib/api.ts` (`dashboardsApi`)                | `catalog()`, `widgets()`, `get(id, filters)`, `narrative(id, filters)`                                  |
| `src/components/dashboard/kpi-card.tsx`           | Rich `W-KPI-CARD` renderer (value + delta + target + inline SVG sparkline + status bar)                 |
| `src/components/dashboard/narrative-block.tsx`    | Rich `W-NARRATIVE` renderer (headline EN+AR + paragraphs + confidence badge + rules-fired chips + asOf) |
| `src/components/dashboard/widget-placeholder.tsx` | Metadata card for the 15 widgets whose rich renderer lands in later commits                             |
| `src/app/(dashboard)/dashboards/page.tsx`         | Hub page — catalog grouped by the 4 blueprint levels with drill links                                   |
| `src/app/(dashboard)/dashboards/[id]/page.tsx`    | Dynamic page — hero KPIs + narrative + widget grid + filter bar + auto-refresh + 403/404 handling       |
| `src/components/layout/sidebar.tsx`               | Added "اللوحات الذكية" entry with the Gauge icon                                                        |

**Auto-refresh cadence** is driven by `dashboard.refreshIntervalSeconds`
from the backend — the page polls at exactly that cadence so a
branch-ops dashboard stays at 60s while executive stays at 300s
without any client-side constant.

**Zero TypeScript errors** (`npx tsc --noEmit` exits 0).

## Alert platform — Commit 8 artefacts (v4.0.106)

### Architecture

```
heroKpis ── evaluateSnapshot ──► evaluator (pure) ──► decision
                                      │
                                      ▼
                                state store ◄── ack / snooze / mute
                                      │
                                      ▼
                                 dispatcher ──► Phase 15 router (future)
```

- **Evaluator is pure.** Given `{policy, snapshot, state, clock,
scope}`, returns a `decision` object with `action` ∈ {fire,
  escalate, recover, suppress, noop} and an explicit `reason`.
- **Coordinator owns the side effects** — state upserts + the
  dispatcher call.
- **Dispatcher defaults to noop.** The commit ships with a
  no-operation dispatcher so operators can observe decisions in
  the admin UI before alerts start paging anyone. The Phase 15
  `unifiedNotifier` bridge is a small follow-up.

### Policy schema

```js
{
  id: 'exec.dso.breach',
  kpiId: 'finance.ar.dso.days',
  severity: 'critical',               // info | warning | critical | emergency
  trigger: {
    on: 'red',                        // which classification makes it eligible
    minConsecutiveTicks: 2,           // flapping guard
  },
  dedupWindowMs: 60 * 60 * 1000,
  quietHours: null,                   // { start: 22, end: 6 } — ignored for critical+
  escalationLadderId: 'critical.oncall',
  headlineAr, headlineEn,
}
```

### Escalation ladders

Each entry in `ESCALATION_LADDERS` is an ordered array of steps:

```js
{ afterMs: 0,              roles: [...], channels: ['in-app', 'email'] },
{ afterMs: 30 * 60 * 1000, roles: [...], channels: ['sms', 'email'] },
{ afterMs: 6  * ONE_HOUR,  roles: [...], channels: ['email'] },
```

`afterMs: 0` is the initial page. The evaluator walks the ladder
from the end back — if `ts - firstFiredAt >= step.afterMs`, that's
the step to fire. `ackedAt` short-circuits the ladder.

### Suppression precedence (top wins)

1. `mutedUntil > now` → `suppress:muted`
2. `snoozeUntil > now` → `suppress:snoozed`
3. `classification !== trigger.on` → `noop:classification_mismatch` or `recover` if previously firing and now green
4. `consecutiveTicks < minConsecutiveTicks` → `noop:flapping_guard`
5. quiet hours (for non-critical) → `suppress:quiet_hours`
6. dedup window not elapsed → `suppress:dedup_window`
7. otherwise → `fire` or `escalate`

### HTTP surface — `/api/v1/dashboards/alerts`

| Method | Path           | Purpose                                                           |
| ------ | -------------- | ----------------------------------------------------------------- |
| `GET`  | `/`            | Active alerts (`?includeSuppressed=true` reveals snoozed + muted) |
| `GET`  | `/policies`    | Full policy catalogue + all escalation ladders                    |
| `POST` | `/:key/ack`    | Acknowledge (`userId` captured from `req.user`)                   |
| `POST` | `/:key/snooze` | `{ minutes: 60 }` default                                         |
| `POST` | `/:key/mute`   | `{ hours: 24, reason: 'capa-linked' }` default                    |

Returns `503 alert_coordinator_not_ready` when the coordinator
hasn't been built yet — protects early-boot fetches from
crashing.

Mounted BEFORE the main `/api/v1/dashboards/:id` router so the
`/alerts` prefix is not captured as an `id`.

### Seed policy catalogue

10 policies cover the core network dashboards out of the box:

- `exec.dso.breach` / `exec.nps.drift` — executive finance + VoC
- `clinical.red_flags.surge` / `clinical.goal.slip` — clinical outcomes
- `quality.incidents.critical.open` / `quality.capa.ontime.drop` — quality
- `ops.fleet.otp.drop` / `ops.noshow.spike` — branch-ops
- `platform.integration.critical` — integration health
- `hr.license.expiring` — HR compliance

Each policy maps to one of 4 escalation ladders
(`info.digest`, `warning.standard`, `critical.oncall`,
`emergency.life-safety`).

## Anomaly detection — Commit 6 artefacts (v4.0.108)

Tier 2 statistical anomaly detection runs silently on every
successful KPI resolve. It does NOT replace the threshold
classification — the two signals are independent and complementary.

### Detector (pure)

`backend/services/anomalyDetector.service.js` exports
`detectAnomaly({ kpiId, series, currentValue, options, clock })`.

Algorithm:

1. Drop malformed points (`v` non-numeric, `t` unparseable).
2. Require `minPoints` of history (default 8). Skip with reason
   `insufficient_history:n/m` otherwise.
3. Compute **EWMA** with `alpha=0.3` (configurable) and the
   unbiased sample stdev of the step-wise residuals.
4. Primary signal: `z = (current - ewma) / stdev`.
5. Optional **seasonal fallback** (hour-of-day or day-of-week
   bucketing) kicks in when EWMA variance is zero but the
   seasonal bucket has enough same-period points.
6. Severity banding: `|z| < warnZ` → not anomalous; `warnZ ≤ |z|
< critZ` → warning; `|z| ≥ critZ` → critical. Defaults
   `warnZ=2.5`, `critZ=3.5`.
7. A **seasonal_agreement** tag is set when both EWMA and
   seasonal signals agree on direction + magnitude — raises
   operator confidence without changing severity.

### History store (pluggable)

`backend/services/kpiHistoryStore.service.js` exports
`createInMemoryHistoryStore({ maxPointsPerSeries, maxSeries,
ttlMs, clock })`. The store:

- Rejects non-numeric values + out-of-order writes (keeps `t`
  strictly increasing per series).
- Caps per-series length with LRU eviction.
- Enforces a total series cap.
- Expires entire series after `ttlMs` (default 30 days).
- Shape is Redis-compatible — a drop-in replacement lands later
  without changing callers.

### Resolver integration

`buildDashboardKpiResolver` now accepts `historyStore` +
`anomalyDetector`. On every resolve, when both are injected:

1. The detector runs against the **existing** series (before the
   current value is recorded) so the reading is compared to its
   own history, not to itself.
2. The resolver appends an `anomaly` block to the payload:

   ```js
   {
     detected: boolean,
     severity: 'warning' | 'critical' | null,
     zScore: number | null,
     direction: 'above' | 'below' | null,
     reason: string,
     baseline: { ewma, stdev, n },
   }
   ```

3. The value is then recorded in the store for the next tick.

### Narrative rule `R-ANOMALY-DETECTED`

When the aggregator builds the narrative input, each
`kpiSnapshot` carries its `anomaly` block. The narrative engine
surfaces the highest-|z| anomaly as a bilingual paragraph:

> Statistical anomaly on DSO: spike above the EWMA baseline
> (z=4.2). Worth cross-checking upstream drivers.
>
> شذوذ إحصائي في متوسط أيام تحصيل الذمم DSO: ارتفاع عن خط
> الأساس المتحرك (z=4.2). يُستحسن فحص المسببات المصدرية.

This complements (never replaces) the existing threshold rules
— a KPI can be "green on thresholds" but still flagged as an
anomaly worth investigating.

### Boot wiring

`backend/app.js` wires both components automatically:

```js
const { createInMemoryHistoryStore } = require('./services/kpiHistoryStore.service');
const anomalyDetector = require('./services/anomalyDetector.service');
app._dashboardHistoryStore = createInMemoryHistoryStore();
app._dashboardKpiResolver = buildDashboardKpiResolver({
  logger,
  historyStore: app._dashboardHistoryStore,
  anomalyDetector,
});
```

Operators who want to share the store across workers assign a
Redis-backed equivalent to `app._dashboardHistoryStore` before
`/api/v1/dashboards` is mounted.

## Alert evaluation scheduler — Commit 8.2 artefacts (v4.0.109)

### Why it exists

The coordinator only evaluates alerts when a caller invokes
`evaluateSnapshot()`. Before C8.2 that meant: no dashboard hit →
no evaluation → no alert → nobody paged. The scheduler closes
that gap: it walks every dashboard on a cadence, resolves each
heroKpi through the shared resolver, classifies against KPI
registry thresholds, and pushes the snapshot to the coordinator.

### Contract

```js
const sched = buildAlertScheduler({
  coordinator,                                       // from C8
  kpiResolver,                                       // from C2
  intervalMs = 60_000,
  dashboards = DASHBOARDS,                           // from dashboard.registry
  logger,
  clock,
});
sched.start();        // idempotent
sched.stop();         // idempotent
sched.runOnce();      // manual tick — tests use this
sched.status();       // { running, ticks, lastTickAt, lastTickFired, ... }
```

### Boot wiring

Automatic at app boot after the coordinator + resolver are built.
Respects:

- `NODE_ENV=test` — scheduler is not started (tests fire
  `runOnce()` themselves)
- `DASHBOARD_ALERT_SCHEDULER=off` — disables the scheduler in
  production (useful for multi-worker deployments where only the
  leader should page)
- `DASHBOARD_ALERT_SCHEDULER_INTERVAL_MS` — override the tick
  cadence (default 60 000 ms)

### HTTP — `GET /api/v1/dashboards/alerts/scheduler/status`

```json
{
  "ok": true,
  "scheduler": {
    "running": true,
    "startedAt": 1714042800000,
    "intervalMs": 60000,
    "ticks": 42,
    "lastTickAt": 1714045380000,
    "lastTickDurationMs": 184,
    "lastTickEvaluated": 35,
    "lastTickFired": 2,
    "lastTickErrors": [],
    "totalEvaluated": 1470,
    "totalFired": 17,
    "dashboardsWatched": 7
  }
}
```

### Failure modes (all recoverable)

- **One dashboard throws** → recorded in `lastTickErrors`, next
  dashboard is still evaluated.
- **One KPI resolver throws** → that KPI becomes
  `{ classification: 'unknown', value: null }` and the coordinator
  still sees it (and emits a `noop` decision with
  `reason: classification_mismatch`).
- **Coordinator itself throws on a dashboard** → the tick logs
  the error and continues to the next dashboard.

### Classification responsibility

The scheduler classifies values against
`kpi.warningThreshold` / `kpi.criticalThreshold` using the same
logic as `kpi.registry.classify()`. This duplicates that classifier
intentionally — the scheduler must produce snapshot classifications
without depending on the aggregator (which does the same thing
during HTTP resolution). If the classifier ever diverges, the
`alert-scheduler.test.js` suite will catch it via the per-direction
classification tests.

## Alert notification dispatcher — Commit 8.1 artefacts (v4.0.107)

### What it does

Bridges the coordinator's `fire` / `escalate` decisions to
`services/unifiedNotifier.notify()`. Given an escalation ladder
step, the dispatcher:

1. Resolves the step's `roles` into `{userId, email, phone}`
   recipients through an injected `resolveRecipients(roles, { scope })`.
2. Renders a bilingual subject + body from the policy headline,
   KPI value, and delta.
3. Fans out one `notify()` call per recipient, each tagged with a
   `templateKey: alert.${severity}.${policyId}` and a rich
   `metadata: { correlationKey, escalationStep, policyId, kpiId, action }`
   block. These flow into `NotificationLog` so incident
   responders can audit every page.

### Opt-in wiring

The dispatcher is **only enabled** when operators set
`app._resolveAlertRecipients` before the dashboard routes are
mounted:

```js
// Somewhere in boot, after models are wired:
app._resolveAlertRecipients = async (roles, { scope } = {}) => {
  // Implement: look up users in the given roles + branch scope
  // and return [{ userId, email, phone }, ...]
};
```

Without a resolver the coordinator stays in noop dispatcher mode
(safe default — decisions are still recorded and visible in the
admin UI; nobody gets paged).

### Severity → priority mapping

| severity  | notify() priority |
| --------- | ----------------- |
| emergency | urgent            |
| critical  | high              |
| warning   | normal            |
| info      | low               |

### Failure modes (all observable, none fatal)

| Reason                       | Behaviour                                  |
| ---------------------------- | ------------------------------------------ |
| `missing-context`            | dispatch called without decision or policy |
| `no-ladder-step`             | escalationStep beyond the ladder           |
| `resolver-error`             | resolveRecipients threw → logged + skipped |
| `no-recipients`              | resolver returned empty array → skipped    |
| Single `notify()` throws     | logged, counts as failed, loop continues   |
| Recipient has no email/phone | counts as failed, `notify` not called      |

## Frontend — Commits 3 + 3.1 artefacts

| Path                                                                         | Role                                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/dashboard.ts`                                                 | Dashboard response types                                                                                                    |
| `src/lib/types/dashboard-alert.ts`                                           | **New in C3.1** — alert response types                                                                                      |
| `src/lib/api.ts`                                                             | `dashboardsApi` + **new `dashboardAlertsApi`** (`list / policies / ack / snooze / mute`)                                    |
| `src/components/dashboard/{kpi-card,narrative-block,widget-placeholder}.tsx` | Dashboard widgets                                                                                                           |
| `src/app/(dashboard)/dashboards/page.tsx`                                    | Hub — 4-level grouped card grid + link to alerts                                                                            |
| `src/app/(dashboard)/dashboards/[id]/page.tsx`                               | Dynamic dashboard page                                                                                                      |
| `src/app/(dashboard)/dashboards/alerts/page.tsx`                             | **New in C3.1** — alert centre (list + ack/snooze/mute + severity grouping + 30s auto-refresh + `includeSuppressed` toggle) |
| `src/components/layout/sidebar.tsx`                                          | Sidebar entry                                                                                                               |

**Zero TypeScript errors** (`npx tsc --noEmit` exits 0).
