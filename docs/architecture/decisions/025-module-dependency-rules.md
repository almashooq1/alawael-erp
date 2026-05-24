# 25. Module Dependency Rules — Doctrine to Code Mapping

Date: 2026-05-24

## Status

🟡 **Proposed pending stakeholder sign-off on the open mapping questions (Q1-Q5 below).**

The doctrine (`docs/architecture/MODULE_DEPENDENCY_RULES.md`) is canonical. This ADR captures the mapping between its 8 logical modules and the actual code layout in `backend/`, plus the drift guard (W354) that enforces direction + circular-free + facade-respect.

## Context

### The doctrine

`docs/architecture/MODULE_DEPENDENCY_RULES.md` defines 8 logical modules with a strict tier ordering:

```
1. platform-core          (foundation — depends on nothing)
2. beneficiary-360
3. assessment-measures
4. goals-care-plans
5. programs-sessions-progress
6. operations-attendance-transport
7. reports-approvals-family
8. quality-risk-governance   (top consumer — reads from everything below)
```

Rules:

- **One-way dependency**: a tier-N module can only depend on tier ≤ N (i.e., earlier in the chain).
- **No circular dependencies**.
- **Facade only**: cross-module access goes through Public API (the module's `index.js`) or Domain Events. Never reach into another module's `models/`, `services/`, `repositories/`.
- **Single ownership**: each major entity has one owner module (System of Record).

### The reality

Two organizational layers coexist in `backend/`:

| Layer      | Path                                                | File count                       | Module-aware?                                                                        |
| ---------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| **DDD**    | `backend/domains/`                                  | 149 .js files, 24 domain folders | ✅ each has `index.js` facade + declared `dependencies: [...]` in `BaseDomainModule` |
| **Legacy** | `backend/{models, services, routes, intelligence}/` | ~2,108 .js files                 | ❌ flat; no module boundaries                                                        |

The doctrine names 8 modules. The DDD layer has 24 domains. Multiple domains map to the same doctrine module. Most legacy files are not yet aligned with any module.

### Initial scan findings (2026-05-24)

A static-analysis scan of `backend/domains/*/index.js` extracted declared `dependencies` for every domain, plus `require()` paths across services. Findings:

**Declared-dependency violations of doctrine direction**:

1. **`reports` depends on `quality`** — reports is tier 7, quality is tier 8. Reports → quality reverses the doctrine direction (a "lower" tier reading from a "higher" one).
2. **`dashboards` depends on `quality`** — dashboards is part of reports-approvals-family (tier 7), same violation.
3. **`family` depends on `sessions, goals, care-plans`** — family is part of beneficiary-360 (tier 2), but it pulls from tiers 3-5.

**Facade-bypass violations (reaching into another domain's internals)**:

1. `backend/domains/workflow/services/JourneyService.js:29,81,102,213,292,332,388,491` — reaches into `episodes/models/EpisodeOfCare`, `core/models/Beneficiary`, `timeline/models/CareTimeline` directly (7 occurrences).
2. `backend/domains/core/services/beneficiary360.service.js:162,506` — reaches into `workflow/WorkflowEngine` (2 occurrences). Workflow doesn't expose this via its `index.js`.
3. `backend/domains/goals/models/MeasureApplication.js:660,670` — reaches UP into legacy `services/measureReassessmentScheduler.service`, `services/measureGoalUpdater.service`.

**No circular dependencies detected** in the declared graph as of 2026-05-24.

These violations are the W354 baseline.

## The mapping (8 doctrine modules ↔ 24 domains + legacy areas)

| Tier | Doctrine Module                          | `backend/domains/` folders                                                       | Legacy areas                                                                                         | Owns (per §4)                                                    |
| ---- | ---------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | `platform-core`                          | `security`, `notifications`, `workflow`                                          | `intelligence/`, `middleware/`, `utils/`, `database/`, `models/User.js`, `models/Branch.js`          | Users, Branches, Roles, Permissions, WorkflowTasks, Dictionaries |
| 2    | `beneficiary-360`                        | `core`, `family`, `episodes`, `timeline`                                         | `models/Beneficiary.js`, `models/EpisodeOfCare.js`                                                   | Beneficiary, Guardians, Episodes                                 |
| 3    | `assessment-measures`                    | `assessments`, `goals` (MeasuresLibrary)                                         | `models/MeasurementMaster.js`, `services/measureLifecycle*`, `intelligence/measure-lifecycle.lib.js` | Assessments, Measures, Results                                   |
| 4    | `goals-care-plans`                       | `care-plans`, `behavior`                                                         | `intelligence/care-planning.registry.js`                                                             | Goals, Care Plans                                                |
| 5    | `programs-sessions-progress`             | `programs`, `sessions`, `group-therapy`, `tele-rehab`, `ar-vr`, `field-training` | `services/sessions*`, `models/Therapy*Session.js`                                                    | Programs, Sessions, Progress Signals                             |
| 6    | `operations-attendance-transport`        | `hr`                                                                             | `routes/transport*`, `routes/biometric-attendance*`, `services/hikvision*`, `services/zkteco*`       | Schedules, Attendance, Transport                                 |
| 7    | `reports-approvals-family-communication` | `reports`, `dashboards`, `ai-recommendations`                                    | `authorization/approvals/`, `routes/parent-portal-v1.routes.js`, `services/messaging*`               | Report Artifacts, Family Communications                          |
| 8    | `quality-risk-governance`                | `quality`, `research`                                                            | `services/quality/`, `routes/quality/`, `database/audit-trail.js`, `models/auditLog.model.js`        | Risks, Incidents, Audits, CAPA                                   |

### Mapping decisions worth noting

- **`research` → tier 8 (quality-risk-governance)**. Research is clinical-audit-adjacent in this platform (IRB review, evidence collation, study compliance). Not a strong fit anywhere; landed here by elimination. _Q3 below._
- **`dashboards` → tier 7 (reports-approvals-family-communication)**. KPI snapshots + decision-support alerts are read-layer projections that aggregate from lower tiers. They don't own primary entities — `DashboardConfig`/`KPIDefinition` are config, not domain truth.
- **`ai-recommendations` → tier 7**. W334 placed AiRecommendationBundle in a supervisor-review queue consumed by reports/family-communication flows. The producer (plateau adapter W337, regression adapter W339) reads from lower tiers; the consumer is reports-approvals.
- **`hr` → tier 6**. HR is a hybrid: employees/payroll/leave are arguably platform-core-tier; recruitment/training are tier 6. Lumped at tier 6 pending ADR split. _Q4 below._
- **`workflow` → tier 1 (platform-core)**. Workflow engine is generic infrastructure (state machines, journeys). But its `JourneyService` reaches into beneficiary/episodes/timeline — which reverses direction. Either (a) move workflow to tier 7+ as a consumer, or (b) extract beneficiary/episode access from JourneyService and pass IDs only. _Q1 below._

## Open stakeholder questions

These must be answered before the baseline is allowed to ratchet down to zero.

**Q1 — `workflow` placement.** `domains/workflow/services/JourneyService.js` makes 7 direct requires into `episodes/`, `core/`, `timeline/` models. Either:

- (a) workflow stays tier 1 → refactor JourneyService to accept Beneficiary/Episode/Timeline projections from callers (inversion of control); or
- (b) workflow moves to tier 7 (or a new "orchestration" tier) → declares deps on tiers 2-5.

What does the architecture team prefer?

**Q2 — `reports → quality` and `dashboards → quality`.** Per doctrine, reports (tier 7) should not depend on quality (tier 8). But operationally, reports DO want to surface quality findings (CAPA status, audit summaries). Options:

- (a) Move quality to tier 6 or 7 (it's not actually the "top" consumer; it consumes from everything but also is consumed by reports).
- (b) Invert via Events: `quality.capa.created` → reports/dashboards subscribe.
- (c) Accept this as the only direction-reversal allowance documented (similar to how ADR-006 acknowledges event-bus reversals).

**Q3 — `research` placement.** Tier 8 by elimination is unsatisfying. Is research:

- (a) Truly clinical-audit (stays tier 8)?
- (b) A peer of assessments (tier 3)?
- (c) A new tier of its own?

**Q4 — `hr` split.** Tier 1 vs tier 6. Likely needs a separate ADR similar to ADR-020 (Student/Beneficiary split). For W354 baseline, hr is tier 6.

**Q5 — legacy areas without a clear owner.** Files like `backend/services/sehhatyAdapter.js`, `backend/integrations/*` cross multiple tiers conceptually. The W354 drift guard scope is `backend/domains/` only. When the legacy area gets refactored into module folders, that's a separate ADR per area.

## Decision

For now, **adopt the mapping above as canonical** with the open Q1-Q5 noted. The W354 drift guard:

1. **Enforces direction** on declared `dependencies` in `backend/domains/*/index.js` based on the tier mapping above. Existing reversals (workflow→episodes/core/timeline via JourneyService, family→sessions/goals/care-plans, reports/dashboards→quality) are baselined as `KNOWN_TIER_VIOLATIONS`.

2. **Detects circular dependencies** via DFS on the declared graph. Currently zero; any new cycle fails CI.

3. **Detects facade-bypass** (cross-domain `require()` reaching into another domain's `models/`, `services/`, `repositories/`, `routes/` instead of its `index.js`). Existing 9 occurrences baselined as `KNOWN_FACADE_BYPASSES`.

The baseline ratchets DOWN as Q1-Q5 get answered + refactors land. The drift guard's stale-baseline test forces removal from the Set in the same commit that fixes the violation (W325c pattern).

## Consequences

If **Q1-Q5 stay unanswered**:

- Baseline persists indefinitely. New tier-violations from Q1-Q5-adjacent areas still fail CI (the baseline only excuses the specific known offenders).
- The 9 facade-bypass occurrences are documented as deliberate; refactor work is voluntary.

If **stakeholders answer Q1-Q5**:

- Refactor PRs land per question with `KNOWN_*` Set shrinking.
- Doctrine becomes truly enforced (zero baseline). Future violations always fail CI.

If **the mapping is wrong** (e.g., dashboards should be tier 4, not 7):

- Update the `TIER_ORDER` constant in `backend/__tests__/module-dependency-direction.test.js` + update the table above. Drift guard re-asserts under new ordering.

## Cross-references

- Doctrine: [docs/architecture/MODULE_DEPENDENCY_RULES.md](../MODULE_DEPENDENCY_RULES.md)
- Drift guard: `backend/__tests__/module-dependency-direction.test.js` (W354)
- Related ADRs:
  - ADR-006 (Domain Event Bus) — supplies the Events alternative to direct calls per doctrine §3.2
  - ADR-020 (Student/Beneficiary) — same "Proposed pending stakeholder input" pattern
  - ADR-021 (Duplicate Model Registration) — same baseline-ratchet template
  - ADR-024 (WorkflowInstance Pattern D) — touches workflow domain placement
- Existing infrastructure leveraged:
  - `backend/domains/_base/BaseDomainModule.js` — the `dependencies: [...]` constructor field that drift guard reads
  - `backend/services/quality/qualityEventBus.service.js` — operational event bus (per CLAUDE.md "CAPA producers/W346/W349")
  - `backend/database/event-bus.js` — MongoDB-Change-Streams event source

## Not in scope

- Refactoring any of the 9 facade-bypass occurrences (each is a follow-up PR).
- Extending W354 scanning to `backend/{models, services, routes}/` legacy (would require mapping each of 2,108 files to a tier — separate effort).
- Designing a `shared-kernel` module per doctrine §5.2 (no current need; `_base/` covers it for now).
- Frontend module dependency rules (parallel doctrine pending for `alawael-rehab-platform/apps/web-admin/`).
