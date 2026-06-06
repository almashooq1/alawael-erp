# Quality / Compliance event-bus disconnects — findings & holistic-fix plan

**Status:** 🟢 Disconnect #1 RESOLVED at the root (W974 bus unification; W941 was the
audit-only stopgap, now self-disabled). #2 (incident producer) unblocked by W974 but
unshipped — state-mutating, needs an env-gate + product intent. #3 (HR egress) product-gated.
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
| 1 | **Two buses** — emitters on `getDefault()` singleton, the email router on a fresh `createQualityEventBus()` | `quality.audit.*` / `fmea.*` / `coq.*` / `calibration.*` never reach the email/policy router → no policy emails | ✅ **RESOLVED — W974**: bootstrap binds `bus` to `getDefault()` (one bus for all). W941 audit-bridge self-disabled. |
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

**✅ RESOLVED at the root (W974, `2f8e88316`):** `qualityComplianceBootstrap` now binds
`const bus = getQualityBusDefault()` (the singleton) instead of a fresh
`createQualityEventBus()`, so every lazy producer + phase29 + the router + ncrPipeline
share ONE bus. Order-independent (no `_replaceDefault` re-seat → no startup-ordering
hazard → phase29 auto-CAPA safe). Blast radius verified: the newly-connected
`fmea.*`/`coq.*`/`calibration.*`/`doc.*`/`change.*`/`inspection.*` events match no email
policy → console catch-all only (no surprise emails, no state mutation). 5 tests + a
45/45 regression sweep.

> The earlier **stopgap (W941, `e85967242`)** installed a one-way `quality.audit.*`-only
> bridge + the 3 audit policies + Arabic templates. Under W974 unification it
> self-disables via its `singleton !== bus` guard (now `singleton === bus`); the audit
> policies it added remain live and fire via the unified bus directly.

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

**A. Unify the quality bus (root cause of #1 and #2). ✅ DONE — W974.** Shipped the
**order-independent** variant: the bootstrap simply binds its `bus` to `getDefault()`
(rather than `_replaceDefault`-ing a fresh instance). Because `getDefault()` always
returns the same singleton no matter who calls first, there is **no re-seat and thus no
startup-ordering hazard** — phase29's `getDefault()` capture in `server.js` and the
bootstrap's `getDefault()` resolve to the same object regardless of order, so auto-CAPA
is never orphaned. The W941 bridge self-disables (its `singleton !== bus` guard is now
false); left in place inert (removing it is optional cleanup).

> Historical note: the originally-recommended approach here was
> `_replaceDefault(bus)` **before** the phase29 wiring — which carried a real
> startup-ordering hazard (re-seat after phase29's capture → orphaned auto-CAPA).
> W974 sidestepped that entirely by using `getDefault()` on both sides.

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
