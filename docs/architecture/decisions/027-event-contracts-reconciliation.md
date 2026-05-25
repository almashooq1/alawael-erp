# 27. Event Contracts Reconciliation — Aspirational Registry vs Actual Emissions

Date: 2026-05-25

## Status

✅ **FULLY EXECUTED (W377 + W379 + W380 + W381 + W383, 2026-05-25). Baseline 31 → 0 (100% cleared).**

**Progression**:

| Wave | Action                                                              | Baseline after |
| ---- | ------------------------------------------------------------------- | -------------- |
| W377 | Deleted 16 contracts (4 in-group + 8 whole-group)                   | 15             |
| W379 | Wired 3 episodes events (rename ad-hoc)                             | 12             |
| W380 | Wired 8 events across 5 BaseService-extending services              | 4              |
| W381 | Wired 3 events (ai-recommendations + 2 quality via qualityEventBus) | 1              |
| W383 | Wired assessments.OVERDUE via daily cron sweeper                    | **0**          |

**BASELINE NOW EMPTY** ✅. ADR-027 fully resolved.

**W383 details**: 12th env-gated stanza in `backend/startup/clinicalSweepersBootstrap.js`. Daily 04:00 Asia/Riyadh, opt-in via `ENABLE_ASSESSMENT_OVERDUE_SWEEPER=true`. Uses `ClinicalAssessment.getOverdueAssessments()` (existing model static) to find overdue items, emits `assessment.overdue` per item via lazy-loaded qualityEventBus (W346/W349 pattern). Envelope: `{beneficiaryId, episodeId, dueDate, daysPastDue (computed)}`. Logs first 20 for ops visibility (matches sibling sweepers' pattern).

**W381 wiring details** (commit pending):

- `ai.recommendation_generated` — `services/aiRecommendation.service.js` createDraft. Function-only service got a module-level `EventEmitter` (`bus`) exported alongside the API. Field mapping: `ruleId` ← bundle `type`; `action` ← `draftAction`. Emitted for DRAFT (tuning band) + PENDING_REVIEW (supervisor queue); silenced for DISCARDED (low-confidence noise).
- `quality.audit_completed` — `services/quality/quality-enhanced.service.js` submitAuditChecklist (after Audit.findByIdAndUpdate to status:'completed'). Uses lazy-loaded qualityEventBus (W349 pattern). Payload: `{auditId, score (from complianceRate), findingsCount (total), criticalFindings (majorNc)}`.
- `quality.corrective_action_required` — `services/quality/capa-producers.service.js` createCapaFromAuditFinding (after capaService.createCapaItem resolves). Only fires from audit producer (contract specifies `auditId`); RCA + FMEA producers don't fire this event. Payload: `{auditId, finding, severity (from finding.type), assigneeId (from ownerUserId)}`.

### Dual-registry finding (W375 follow-up, 2026-05-25)

Discovered during W377 prep: `backend/events/contracts/dddEventContracts.js` is NOT the only event-contracts file. The LIVE registry used by `startup/integrationBus.js:19` is `backend/events/contracts/domainEventContracts.js` (671 LOC, 7 domains, 30 events: hr/finance/beneficiary/medical/attendance/notification/system). The two files cover **nearly-disjoint domain sets** — `domainEventContracts` covers cross-cutting infrastructure (HR/finance/medical/attendance); `dddEventContracts` covers DDD bounded contexts (episodes/care-plans/sessions/etc).

This means:

- `dddEventContracts.js` was even MORE orphaned than W375 reported. Not even `startup/integrationBus.js` loads it.
- A separate (and likely needed) drift guard could lock `domainEventContracts.js` structural integrity — W374/W375 currently cover only `dddEventContracts`. **Tracked as follow-up after W378+ wirings complete.**
- The two registries should likely be **consolidated** under one file. Out of scope for W377; needs another ADR.

## Context

### Discovery (W375 scan, 2026-05-25)

`backend/events/contracts/dddEventContracts.js` (716 LOC, 17 domain groups, 34 contracts) was built as a formal event-contract registry per the doctrine §3.2 vision. Each contract carries `{ domain, eventType, version, description, payload, delivery, priority, consumers }`.

A literal-reference scan of every `.js` file under `backend/` (excluding `events/` itself + tests + archived) for each contract's `eventType` string found:

**31 of 34 contracts (91%) have ZERO references anywhere outside the contracts file**. The 3 with any reference:

| eventType                | Referenced in                                                                 | Real producer?                         |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------- |
| `beneficiary.registered` | `infrastructure/messageQueue.js` + `integration/dddCrossModuleSubscribers.js` | Yes (subscriber side)                  |
| `session.completed`      | `seeds/notification-templates.seed.js`                                        | No (notification template config only) |
| `ai.risk_elevated`       | `integration/dddCrossModuleSubscribers.js`                                    | No (subscriber side only)              |

Additionally, the 17 named exports (`BENEFICIARY_DDD_EVENTS`, `EPISODE_EVENTS`, etc.) are imported NOWHERE in the codebase. Only the aggregator `DDD_CONTRACTS` is loaded — at `startup/integrationBus.js` (presumably for bus-registration purposes; not producer wiring).

### What actually fires in the codebase

A spot-check of `domains/*/services/*.js` shows the actual emission pattern is **ad-hoc EventEmitter names**, NOT contract eventTypes:

- `domains/episodes/index.js`: `this.emit('episodeCreated', ...)` — camelCase, no dot. Doctrine contract is `episode.created`.
- `domains/episodes/index.js`: `this.emit('phaseAdvanced', ...)` — no contract equivalent.
- `domains/episodes/index.js`: `this.emit('teamMemberAdded', ...)` — no contract equivalent.
- `domains/episodes/index.js`: `this.emit('episodeSuspended', ...)` — no contract equivalent.
- `domains/episodes/index.js`: `this.emit('episodeDischarged', ...)` — closest contract is `episode.closed`.

Same pattern across other domain services. The contracts file represents the WAY events SHOULD be named; the code uses what was easiest at the time.

### Why this matters

1. **Doctrine §3.2 is unenforced**: the doctrine prescribes formal events with envelope shapes, but the codebase doesn't comply. Anyone reading the doctrine + grepping for events sees the gap immediately.

2. **Subscribers are stuck**: `integration/dddCrossModuleSubscribers.js` references contract names, not ad-hoc names. If those subscribers fire on contract eventTypes, they receive NOTHING (because no producer emits the contract eventType). This is silent data loss / silent missing-notification.

3. **W374 protects 91% fiction**: the W374 structural drift guard locks the integrity of contracts that are essentially aspirational. Useful (prevents accidental schema rot of the aspiration) but doesn't move the codebase toward emission compliance.

4. **The contracts file is a 716-LOC TODO**: each contract specifies `consumers: [...]` arrays declaring downstream domains that "should" receive the event. None of those wirings exist.

## Decision

**Two paths per contract — picked per stakeholder per group**:

### Path (a) — Wire the producer (preserve contract)

Find where the event should fire (e.g., when `EpisodeService.dischargeEpisode` completes, emit `episode.closed`). Rename the existing ad-hoc `service.emit('episodeDischarged', ...)` to use the contract eventType + envelope. Add consumer-side handlers per the contract's `consumers` array.

**Effort per event**: medium (1 producer wiring + N consumer wirings + tests). Surface area: domain service + 1-3 subscribers.

### Path (b) — Delete the contract (admit aspirational)

If the team never intended to emit this event (or the ad-hoc emission is sufficient), delete the contract from `dddEventContracts.js`. The W374 drift guard catches the structural change (DDD_CONTRACTS shrinks → update MIN_TOTAL_EVENTS). The W375 baseline shrinks too.

**Effort per event**: trivial (~3-line delete + 2 set-membership updates).

### Per-group recommendations (initial proposal)

| Group                | Dead count | Recommendation                                                                                                                                                | Rationale                                                              |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `core`               | 2          | **(a) Wire** — `beneficiary.status_changed`, `beneficiary.profile_updated` are common operational signals worth standardizing.                                | Frequently-needed by family/dashboards/reports per declared consumers. |
| `episodes`           | 3          | **(a) Wire** — `episode.created/phase_transitioned/closed` are critical lifecycle events. JourneyService already orchestrates these (just uses ad-hoc names). | Renaming the existing emissions is one-line each.                      |
| `assessments`        | 2          | **(a) Wire** — `assessment.completed/overdue` drive plan/report flows.                                                                                        | Aligns with W325/W334 lifecycle work.                                  |
| `care-plans`         | 2          | **(a) Wire** — `careplan.activated/completed` align with W332 registry transitions.                                                                           | Already W332-aware.                                                    |
| `sessions`           | 2          | **(b) Delete** — `session.cancelled/no_show` exist as service-local fields, not events. Or (a) wire if dashboards needs aggregate counts.                     | Stakeholder call.                                                      |
| `goals`              | 3          | **Mixed** — `goal.achieved` (a) wire; `goal.stalled/measure_applied` (b) delete (W337/W339 adapters already handle plateau/regression).                       | Avoid duplicate event sources.                                         |
| `workflow`           | 2          | **(b) Delete** — `workflow.task_assigned/overdue` redundant with database event-bus on `WorkflowTask:insert/update`.                                          | Already have MongoDB Change Streams.                                   |
| `quality`            | 2          | **(a) Wire** — `quality.audit_completed/corrective_action_required` already partially handled by qualityEventBus + W346/W349 CAPA chain.                      | Tighten the existing pattern.                                          |
| `family`             | 2          | **(b) Delete** — family-portal CRUD doesn't currently fire events.                                                                                            | Low ROI to wire now.                                                   |
| `dashboards`         | 2          | **(b) Delete** — dashboard alerts use the database event-bus + KPI cron.                                                                                      | Redundant abstraction.                                                 |
| `tele-rehab`         | 1          | **(b) Delete**                                                                                                                                                | Telerehab not currently event-driven.                                  |
| `ar-vr`              | 2          | **(b) Delete**                                                                                                                                                | AR/VR is mock-mode in current build.                                   |
| `behavior`           | 2          | **(a) Wire** — `behavior.incident_recorded` ties into W193b RestraintSeclusionEvent + W357 safeguarding.                                                      | Cross-domain consumers exist.                                          |
| `group-therapy`      | 1          | **(b) Delete**                                                                                                                                                | Low ROI.                                                               |
| `research`           | 1          | **(b) Delete**                                                                                                                                                | Research operates in batch mode.                                       |
| `field-training`     | 1          | **(b) Delete**                                                                                                                                                | Field training has dedicated routes/notifications.                     |
| `ai-recommendations` | 1          | **(a) Wire** — `ai.recommendation_generated` aligns with W334 PendingReview flow.                                                                             | Closes the producer side of W334 supervisor queue.                     |

**Net recommendation**: ~14 wires + 17 deletes → final registry has ~17 live contracts. Each cleanup is a small PR that ratchets `KNOWN_DEAD_CONTRACTS` down by 1-3 entries.

## Consequences

**If Path (a) chosen everywhere**: 31 producer wirings + ~70 subscriber wirings land across many PRs. The doctrine §3.2 vision is fully realized. Codebase shifts from EventEmitter ad-hoc to integration-bus contract-driven. **Risk**: large coordinated refactor; may break callers that listen for ad-hoc names.

**If Path (b) chosen everywhere**: contracts file shrinks to 3 live entries. Doctrine §3.2 is acknowledged as aspirational-but-deprecated; events should be added on-demand to the actual emitter. **Risk**: loss of architectural intent (the contract authors thought through payload + consumers); future events are added ad-hoc.

**If mixed (per-group recommendations above)**: balanced approach. High-value lifecycle events (episode, careplan, capa) get wired. Low-ROI aspirational entries get deleted. The contract file stays as a curated set of "events the team commits to."

**If unanswered indefinitely (status quo)**: W375 baseline stays at 31 entries. W374 protects 91% fiction. Doctrine §3.2 stays aspirational. Cross-module subscribers continue silently receiving nothing.

## Cross-references

- Doctrine: [docs/architecture/MODULE_DEPENDENCY_RULES.md](../MODULE_DEPENDENCY_RULES.md) §3.2
- Drift guard W374 (structural integrity): `backend/__tests__/ddd-event-contracts-wave374.test.js`
- Drift guard W375 (this ADR's enforcement): `backend/__tests__/ddd-event-contracts-dead-contracts-wave375.test.js`
- Related: ADR-006 (Domain Event Bus original design), ADR-025 (Module Dependency Rules — §3.2 acknowledgment), W346/W348/W349 quality.capa.\* event chain (the only fully-wired group)
- Pattern lineage: W325c (universal phantom-ref ratchet) + W340 (duplicate-registration ratchet) — same baseline-ratchet template; per-entry decisions need stakeholder input similar to ADR-018/020/021/022/023/024.

## Not in scope

- Implementing the per-group reconciliations (each is a separate PR).
- Designing a new event bus (the existing `qualityEventBus`, `database/event-bus.js`, `integration/systemIntegrationBus` cover the infrastructure).
- Replacing `service.emit('camelCaseName', ...)` calls everywhere (those are intra-domain signals; only cross-domain ones need contracts).
