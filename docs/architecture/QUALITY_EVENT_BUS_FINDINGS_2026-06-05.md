# Quality / Compliance event-bus disconnects — findings & holistic-fix plan

**Status:** 🟡 Findings (one targeted fix shipped as W941; the systemic fix is open)
**Date:** 2026-06-05
**Scope:** `backend/services/quality/**`, `backend/startup/qualityComplianceBootstrap.js`,
`backend/server.js` (phase29 wiring), `backend/config/notification-policies.registry.js`
**Owner of the broader event rework:** coordinate — overlaps the active core
event-wiring effort (CareTimeline / KPI subscribers / modelEventBridge).

> Consolidates three deep investigations done during the 2026-06-05 dormant-capability
> sweep. The quality event subsystem is **systemically fragmented**: events fire to
> buses that the intended consumers don't subscribe to, and one pipeline has a
> subscriber but no producer. Each was verified by reading the wiring, not by counting
> greps. Fix them **holistically**, not piecemeal — every isolated patch (W941 included)
> is a workaround for the same root cause.

---

## TL;DR

| # | Disconnect | Effect | Status |
|---|-----------|--------|--------|
| 1 | **Two buses** — emitters on `getDefault()` singleton, the email router on a fresh `createQualityEventBus()` | `quality.audit.*` / `fmea.*` / `coq.*` / `calibration.*` never reach the email/policy router → no policy emails | Audit events patched via a one-way bridge (**W941**); the rest still disconnected |
| 2 | **Missing producer** — `quality.incident.reported` has a subscriber (NCR auto-link → auto NCR+CAPA) but **nothing emits it** | Serious incidents never auto-create an NCR/CAPA — a CBAHI safety automation is dead | Open |
| 3 | **HR webhook cluster unwired** (adjacent, same class) | HR webhook subscriptions are configurable but no producer dispatches to them | Open — and **owner/product-gated** (external egress) |

---

## 1. Two quality event buses

`backend/services/quality/qualityEventBus.service.js`:

- `createQualityEventBus(opts)` → a **new** `QualityEventBus` instance every call.
- `getDefault()` → a **cached singleton**.
- Nothing reconciles them (`_replaceDefault` is called for service singletons in the
  bootstrap, but **never for the bus**).

Two buses therefore exist in production:

- **Bus A = `getDefault()` singleton.**
  - Emitters (lazy services whose own `getDefault()` sets
    `dispatcher = qualityEventBus.getDefault()`): `auditScheduler`, `fmea`, `coq`,
    `calibration`, `changeControl`, `controlledDocument`, `inspectionSubmission`,
    `paretoA3`, `capa-producers`, `blockchainCertService`.
  - Subscriber: `phase29-subscribers` — wired in **`server.js`** with
    `require('.../qualityEventBus.service').getDefault()` (auto-draft CAPA from
    SPC/FMEA/audit-NC/calibration; notifier for supplier/standards/inspection).
- **Bus B = `createQualityEventBus({logger})` fresh** — built in
  `startup/qualityComplianceBootstrap.js` (invoked via `startup/schedulers.js`).
  - Emitters (built with `combinedDispatcher` wrapping Bus B): `managementReview`,
    `evidenceVault`, `complianceCalendar`, `controlLibrary`, `evidenceSweeper`,
    `calendarSweeper`, `capaScheduler`, `riskScheduler`.
  - Subscribers: the **email/policy `notificationRouter`** + `ncrAutoLinkPipeline`.

**Consequence:** the email router is on Bus B; the lazy services emit on Bus A. So
`quality.audit.scheduled/nc_recorded/closed` (and `fmea.*`/`coq.*`/`calibration.*`)
never reach the router — no policy-based email fires for them **no matter what
policies exist**. Adding a notification policy alone is a **silent no-op** (the
W349 / W387 class). Management-review emails work only because those services sit on
Bus B. Auto-CAPA works only because phase29 is also on Bus A (coincidence).

**Shipped mitigation (W941, `e85967242`):** the bootstrap installs a one-way,
`quality.audit.*`-only bridge `getDefault().on('quality.audit.*', (p,n)=>bus.emit(n,p))`
(guarded `singleton !== bus`, detached on shutdown) + the 3 audit policies + Arabic
templates + an integration test. This delivers **audit** notifications without
disturbing phase29. It does **not** fix `fmea.*`/`coq.*`/`calibration.*` (those have no
policies anyway → only the console catch-all).

## 2. `quality.incident.reported` — subscriber with no producer

`services/quality/ncrAutoLinkPipeline.service.js` is **started** (bootstrap line ~297,
on Bus B) and subscribes to `quality.incident.reported` to auto-create an NCR + CAPA
from a serious incident. But **no code anywhere emits `quality.incident.reported`** —
the incident-creation paths (`routes/incidentRoutes.js`, `routes/clinical-crisis.routes.js`,
`models/quality/Incident.model.js` / `IncidentReport.js`) emit nothing. So the pipeline
listens forever and the CBAHI "serious incident → NCR/CAPA" automation never fires.

Wiring this is **not** a clean mechanical fix: the producer lives in a **different
subsystem** (clinical incident routes), would have to emit on the bus the pipeline
listens to (Bus B — see #1), and it is **state-mutating** (creates NCR+CAPA). Turning
it on is a product decision (is auto-NCR creation intended on? from which incident
severities?) and should ship **env-gated, default OFF** with an integration test.

## 3. HR webhook / anomaly / change-request cluster (adjacent, same class)

`routes/hr/hr-webhooks.routes.js` (admin CRUD over `HrWebhookSubscription`) **is**
mounted (`hr.registry.js`, `createHrWebhooksRouter` factory) — subscriptions are
configurable. But `services/hr/hrWebhookDispatcher.js` is **never constructed/injected**,
and `hrAnomalyDetectorService` + `hrChangeRequestService` (which call
`deps.webhookDispatcher.dispatch(...)` only when injected) are **not wired into startup
or any route**. Net: you can configure HR webhook receivers but nothing dispatches to
them. **Distinct from #1/#2:** activating this turns on **external egress of sensitive
HR data to operator-supplied URLs** → owner/product sign-off + SSRF/allow-list
hardening required. Not autonomously fixable.

---

## Recommended holistic fix

**A. Unify the quality bus (root cause of #1 and #2).** Make the schedulers bootstrap
re-seat the singleton to its configured instance —
`require('.../qualityEventBus.service')._replaceDefault(bus)` — so `getDefault()` and
the bootstrap bus are one object, **before** `server.js` captures `getDefault()` to
wire phase29.

> **Startup-ordering hazard (must resolve first):** `server.js` wires phase29 on
> `getDefault()`. If the re-seat happens *after* that capture, phase29 subscribes to the
> orphaned old singleton while emitters move to the new bus → **auto-CAPA from audit
> findings silently breaks** (a clinical flow). Guarantee the bootstrap re-seat runs
> before the phase29 wiring (or have both call `getDefault()` so order is irrelevant).
> Once unified, the W941 bridge becomes redundant and can be removed (its
> `singleton !== bus` guard already makes it inert under unification).

**B. Add the missing producer (#2).** Emit `quality.incident.reported` at the incident-
creation site on the unified bus; ship **env-gated default OFF**; integration-test it.

**C. HR cluster (#3).** Defer pending product sign-off on external HR-data egress +
SSRF hardening of `target_url`.

**Test discipline (repo doctrine — W385/W387):** every event wire needs **three**
artifacts in the same PR — (1) a static drift guard, (2) a producer-side behavioral
envelope test, (3) an **integration test through the real delivery mechanism** the
subscriber uses. Static guards pass while the bus is disconnected; only the integration
test catches "wired but never delivered." W941's integration test (emit on bus A → assert
dispatched on bus B router) is the reference shape.

---

## Cross-references

- Shipped targeted fix: W941 (PR #278, `e85967242`) — `quality.audit.*` bridge + policies.
- Same delivery-disconnect class, consumer side: W933 (PR #275) reports-webhooks handler.
- Memory: `project_quality_two_bus_disconnect_2026-06-05`,
  `project_hr_webhook_cluster_dormant_2026-06-05`.
