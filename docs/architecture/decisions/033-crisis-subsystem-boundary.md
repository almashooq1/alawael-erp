# ADR-033 — Crisis Subsystem Boundary: facility-emergency vs beneficiary-clinical (🟢 Accepted — narrow scope)

**Date**: 2026-05-28
**Type**: ADR (boundary clarification + wire-up)
**Mode**: 🤝 Claude proposes + executes the non-destructive part; 👤 stakeholder owns any later consolidation
**Decider**: Architecture owner (boundary) + clinical-ops owner (if the two are ever merged)
**Effort**: wire-W458-at-distinct-path ~0.5 day (this ADR) / full-consolidation N/A (explicitly NOT recommended)

## Context

The W522/W523 dormant-modules audit
([docs/audits/dormant-modules-triage-2026-05-28.md](../../audits/dormant-modules-triage-2026-05-28.md))
flagged `services/crisisOrchestrator.service.js` (W458) as the #1 "build
landed, wire-up missed" dormant module. On attempting to wire it, a
pre-existing **second** crisis subsystem was discovered occupying the
`/api/crisis` namespace. The two are NOT redundant — they model different
domains that happen to share the generic names "CrisisIncident" and
"EmergencyPlan".

### The two subsystems

| Axis         | Legacy (WIRED)                                                                                                         | W458 (was DORMANT)                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Route        | `routes/crisis.routes.js` @ `/api/crisis` (+`/api/v1`), mounted via `phases.registry.js:220`, W466 role-gated          | none until this ADR                                                                                              |
| Domain       | **Facility emergency management** — evacuation plans, fire drills, emergency-contact tree, org-wide incidents          | **Beneficiary clinical crisis** — a specific child's seizure / safeguarding event                                |
| Models       | `crisis.model.js` → `CrisisEmergencyPlan` + `CrisisCrisisIncident` + `CrisisEmergencyDrill` + `CrisisEmergencyContact` | `CrisisIncident.js` + `EmergencyPlan.js` (canonical names)                                                       |
| Key          | facility/center-keyed                                                                                                  | beneficiary-keyed (`reportCrisis({beneficiaryId})`, `EmergencyPlan.findOne({beneficiaryId})`)                    |
| Integrations | standalone                                                                                                             | links W356 `SeizureEvent` + W357 `SafeguardingConcern`; invokes the beneficiary's EmergencyPlan escalation chain |
| Surface      | ~23 endpoints (plans/incidents/drills/contacts/dashboard)                                                              | 5 orchestration methods (report/escalate/close/link/getActive)                                                   |

The model-name collision was already neutralized in W458-followup
`bd51e9931`, which renamed the legacy models with a `Crisis*` prefix so
both can register. The comment at `crisis.model.js:329` documents this:
_"EmergencyPlan collides with models/EmergencyPlan.js (W458 canonical)"_.

## Decision

1. **Keep both subsystems.** They serve genuinely distinct domains
   (building-level emergency ops vs individual-beneficiary clinical
   crisis). Neither is redundant; neither is a migration target of the
   other.
2. **Wire the W458 orchestrator at a distinct, domain-accurate path:
   `/api/clinical-crisis` (+ `/api/v1/clinical-crisis`)**, mounted next
   to the other W356/W357 clinical-event routes in
   `features.registry.js`. This closes the dormancy without touching the
   live W466 facility route and without creating a misleading
   `/api/crisis/v2` overlap.
3. **Do NOT consolidate the two** without an explicit clinical-ops +
   architecture decision. A future merge (if desired) would fold the
   facility-incident concept and the beneficiary-clinical-crisis concept
   into one taxonomy — that is a product decision, not a refactor, and is
   out of scope here.

## Why not the alternatives

- **Delete W458 (dormant-triage option B)** — rejected. The orchestrator
  carries unique clinical value (W356/W357 integration + per-beneficiary
  EmergencyPlan invocation) that the facility system has no concept of.
- **Migrate `/api/crisis` onto W458 (option A)** — rejected. Different
  domain + a live W466 life-safety surface; high blast radius for zero
  domain gain.
- **Parallel `/api/crisis-v2` (option C as originally framed)** —
  rejected as worded. A version-suffixed twin implies the legacy is
  deprecated, which is false. The chosen `/api/clinical-crisis` name
  encodes the domain boundary instead of a false version relationship.

## Consequences

- `crisisOrchestrator.service.js` leaves the dormant baseline (29 → 28 in
  `check-dormant-modules.js` `KNOWN_DORMANT_BASELINE`).
- New public surface: 7 endpoints under `/api/clinical-crisis`
  (`GET /health`, `GET /active`, `GET /:id`, `POST /`,
  `POST /:id/escalate`, `POST /:id/close`, `POST /:id/link`), tier-2 MFA
  on report + close per the service's own doc contract, W269 branch
  isolation throughout.
- Future readers must not "reconcile" the two crisis models as
  duplicates — this ADR is the canonical statement that they are
  intentionally separate. If a `ref:'CrisisIncident'` or
  `ref:'EmergencyPlan'` ever appears, it points at the **W458 canonical**
  models, never the `Crisis*`-prefixed legacy ones.

## Follow-ups (not blocking)

- A `/clinical-crisis` admin UI in web-admin (deferred).
- If clinical-ops later wants a single crisis cockpit spanning both
  domains, open a successor ADR for the consolidation taxonomy.
