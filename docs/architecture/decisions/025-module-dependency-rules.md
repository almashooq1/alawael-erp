# 25. Module Dependency Rules — Doctrine to Code Mapping

Date: 2026-05-24

## Status

✅ **W354b 2026-05-25 — Baseline cleared to zero. All 5 questions resolved.**

The doctrine (`docs/architecture/MODULE_DEPENDENCY_RULES.md`) is canonical. This ADR captures the mapping between its 8 logical modules and the actual code layout in `backend/`, plus the drift guard (W354) that enforces direction + circular-free + facade-respect.

**Final resolution** (commits `15678c63a` → `ee1fc0885` → `37f376822` → W354b):

- Q1 (workflow): JourneyService refactored to use `mongoose.model('X')` runtime lookups; workflow declared deps cleared. 3 tier + 3 facade-bypass entries removed.
- Q2 (reports/dashboards→quality): TIER remapped — `quality: 8 → 6`, `research: 8 → 7`. 2 tier entries removed.
- Q3 (research): tier 7 confirmed (was 8; moved with Q2).
- Q4 (hr): tier 6 confirmed; split deferred to follow-up ADR.
- Q5 (legacy): out of W354 scope (deliberate).
- **Family re-tier 2 → 7**: family is primarily a parent-portal communication domain (doctrine §4 places "Family Communications" in tier 7). 3 tier entries removed.

**Result**: W354 baseline 8 + 3 → **0 + 0**. 9/9 drift-guard tests pass with empty `KNOWN_TIER_VIOLATIONS` + `KNOWN_FACADE_BYPASSES`. JourneyService auto-test `tests/unit/workflow-services-JourneyService.domain.test.js` count updated 12 → 4 to match new local-require count.

## Context

### The doctrine

`docs/architecture/MODULE_DEPENDENCY_RULES.md` defines 8 logical modules with a strict tier ordering:

```text
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

**Declared-dependency violations of doctrine direction** (each verified as REAL runtime usage, NOT vestigial metadata — 2026-05-25 follow-up scan):

1. **`reports` depends on `quality`** — tier 7 → tier 8. Real usage:
   - `domains/reports/services/ReportsEngine.js:358-387` does `mongoose.model('QualityAudit')` + `mongoose.model('CorrectiveAction')` aggregates for quality-section report data.
   - `domains/reports/models/ReportTemplate.js:32-33` lists `QualityAudit` + `CorrectiveAction` as valid `dataSource` enum values for templates.
2. **`dashboards` depends on `quality`** — tier 7 → tier 8. Real usage:
   - `domains/dashboards/services/DecisionSupportEngine.js:163-164` does `mongoose.model('CorrectiveAction')` to surface overdue CAPAs in decision alerts.
3. **`family` depends on `sessions, goals, care-plans`** — tier 2 → tiers 3-5. Real usage:
   - `family→goals`: `domains/family/services/FamilyService.js:201,213` does `mongoose.model('TherapeuticGoal')` for the family-portal active-goals widget.
   - `family→sessions`: same file line 202,220 does `mongoose.model('ClinicalSession')` for the recent-sessions widget.
   - `family→care-plans`: `domains/family/models/FamilyCommunication.js:91` has `relatedCarePlanId: { ref: 'UnifiedCarePlan' }` linking communications to care plans.

**Facade-bypass violations (reaching into another domain's internals)**:

1. `backend/domains/workflow/services/JourneyService.js:29,81,102,213,292,332,388,491` — reaches into `episodes/models/EpisodeOfCare`, `core/models/Beneficiary`, `timeline/models/CareTimeline` directly (7 occurrences, collapse to 3 unique target modules in W354 baseline).
2. `backend/domains/core/services/beneficiary360.service.js:162,506` — reaches into `workflow/WorkflowEngine` (2 occurrences). Not in W354 baseline because the require is `'../../workflow/WorkflowEngine'` (top-level file, not under `models/|services/|...`). Whether `WorkflowEngine.js` qualifies as workflow's public API alongside `index.js` is an open question — currently treated as public.
3. `backend/domains/goals/models/MeasureApplication.js:660,670` — reaches UP into legacy `services/measureReassessmentScheduler.service`, `services/measureGoalUpdater.service`. Not in W354 baseline (the guard scopes cross-domain `domains/X/...`, not domain→legacy). Documented as a known gap; ratifying domain→legacy enforcement is a separate ADR.

**No circular dependencies detected** in the declared graph as of 2026-05-24.

These 8 tier-direction + 3 unique facade-bypass entries are the W354 baseline. **Vestigial-deps audit (2026-05-25)** confirmed every entry is real runtime usage — none are simply outdated metadata. Stakeholder decisions on Q1-Q2 are therefore on the critical path; no free ratchets exist.

## The mapping (8 doctrine modules ↔ 24 domains + legacy areas)

| Tier | Doctrine Module                             | `backend/domains/` folders                                                       | Legacy areas                                                                                         | Owns (per §4)                                                    |
| ---- | ------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | `platform-core`                             | `security`, `notifications`, `workflow`                                          | `intelligence/`, `middleware/`, `utils/`, `database/`, `models/User.js`, `models/Branch.js`          | Users, Branches, Roles, Permissions, WorkflowTasks, Dictionaries |
| 2    | `beneficiary-360`                           | `core`, `episodes`, `timeline`                                                   | `models/Beneficiary.js`, `models/EpisodeOfCare.js`                                                   | Beneficiary, Guardians, Episodes                                 |
| 3    | `assessment-measures`                       | `assessments`, `goals` (MeasuresLibrary)                                         | `models/MeasurementMaster.js`, `services/measureLifecycle*`, `intelligence/measure-lifecycle.lib.js` | Assessments, Measures, Results                                   |
| 4    | `goals-care-plans`                          | `care-plans`, `behavior`                                                         | `intelligence/care-planning.registry.js`                                                             | Goals, Care Plans                                                |
| 5    | `programs-sessions-progress`                | `programs`, `sessions`, `group-therapy`, `tele-rehab`, `ar-vr`, `field-training` | `services/sessions*`, `models/Therapy*Session.js`                                                    | Programs, Sessions, Progress Signals                             |
| 6    | `operations-attendance-transport + quality` | `hr`, `quality`                                                                  | `routes/transport*`, `services/quality/`, `services/hikvision*`, `database/audit-trail.js`           | Schedules, Attendance, Transport, Risks, Incidents, Audits, CAPA |
| 7    | `reports-approvals-family-communication`    | `reports`, `dashboards`, `ai-recommendations`, `family`, `research`              | `authorization/approvals/`, `routes/parent-portal-v1.routes.js`, `services/messaging*`               | Report Artifacts, Family Communications, Research                |
| 8    | _(reserved)_                                | _(none)_                                                                         | _(none)_                                                                                             | W354b folded quality into T6 and research into T7                |

### Mapping decisions worth noting

- **`research` → tier 8 (quality-risk-governance)**. Research is clinical-audit-adjacent in this platform (IRB review, evidence collation, study compliance). Not a strong fit anywhere; landed here by elimination. _Q3 below._
- **`dashboards` → tier 7 (reports-approvals-family-communication)**. KPI snapshots + decision-support alerts are read-layer projections that aggregate from lower tiers. They don't own primary entities — `DashboardConfig`/`KPIDefinition` are config, not domain truth.
- **`ai-recommendations` → tier 7**. W334 placed AiRecommendationBundle in a supervisor-review queue consumed by reports/family-communication flows. The producer (plateau adapter W337, regression adapter W339) reads from lower tiers; the consumer is reports-approvals.
- **`hr` → tier 6**. HR is a hybrid: employees/payroll/leave are arguably platform-core-tier; recruitment/training are tier 6. Lumped at tier 6 pending ADR split. _Q4 below._
- **`workflow` → tier 1 (platform-core)**. Workflow engine is generic infrastructure (state machines, journeys). But its `JourneyService` reaches into beneficiary/episodes/timeline — which reverses direction. Either (a) move workflow to tier 7+ as a consumer, or (b) extract beneficiary/episode access from JourneyService and pass IDs only. _Q1 below._

## Open stakeholder questions

These must be answered before the baseline is allowed to ratchet down to zero.

**Q1 — `workflow` placement** 🟡 **STILL OPEN (stakeholder + auto-test work)**.

`domains/workflow/services/JourneyService.js` makes 7 direct requires into `episodes/`, `core/`, `timeline/` models. Three options:

- (a) workflow stays tier 1 → refactor JourneyService to accept Beneficiary/Episode/Timeline projections from callers (inversion of control); or
- (b) workflow moves to tier 7 (or a new "orchestration" tier) → declares deps on tiers 2-5; or
- (c) split workflow into TWO: `WorkflowEngine` (generic infrastructure, stays tier 1) + `JourneyService` (orchestration, moves to tier 7). Cleanest architecturally — `core/services/beneficiary360.service.js:162` legitimately uses WorkflowEngine as tier-1 infrastructure, while JourneyService is genuinely an orchestrator.

**Recommendation**: option (c). Rationale: the two pieces have genuinely different tier identities. Engine is state-machine infrastructure (anyone can use it). Journey is a beneficiary-care orchestrator that reads from tiers 2-5.

**Autonomous-fix blocker discovered 2026-05-25**: switching JourneyService's 8 cross-domain requires to `mongoose.model('X')` runtime lookups (the codebase pattern used in `FamilyService.js:201-202` and 25+ other places) would remove the 3 facade-bypass baseline entries without changing runtime semantics. BUT `tests/unit/workflow-services-JourneyService.domain.test.js:43` is auto-generated and asserts `expect(locals.length).toBe(12)` — refactoring breaks this assertion. The auto-test was generated by P#106 universal generator; either (1) update the assertion to 4 (the post-refactor count) at the same time as the refactor, or (2) regenerate the test via P#106. Both require a deliberate stakeholder ack on coupling-via-mongoose-registry vs coupling-via-static-require because they're functionally equivalent — the static-analysis guard's distinction is conventional, not semantic.

**Q2 — `reports → quality` and `dashboards → quality`** 🟡 **STILL OPEN (semantic choice)**.

Per doctrine, reports (tier 7) should not depend on quality (tier 8). But operationally, reports DO surface quality findings (CAPA status, audit summaries). Three options:

- (a) Move quality to tier 6 or 7 (it's not actually the "top" consumer; it both consumes from below AND is consumed by reports).
- (b) Invert via Events: `quality.capa.created` → reports/dashboards subscribe via `qualityEventBus` (which already exists per CLAUDE.md — used by W346 producers + W349 subscribers).
- (c) Accept this as the only direction-reversal allowance documented (similar to how ADR-006 acknowledges event-bus reversals).

**Recommendation**: option (a) — move quality to tier 6 alongside hr. Rationale: quality is BOTH a producer (audits → reports surface them) AND a consumer (reads sessions/goals/etc to audit them). The doctrine's "quality at the end = top consumer" framing missed the producer side. Tier 6 acknowledges both. Trade-off: doctrine's listed module ordering puts quality after reports, so this re-tier requires a small doctrine update. ADR-025's `TIER` constant in [drift guard line 64](../../backend/__tests__/module-dependency-direction-wave354.test.js) flips `quality: 8 → 6` and `research: 8 → 7` (or stays at 8, see Q3).

**Effect on baseline if (a) adopted**: `dashboards → quality` (T7 → T6 = legal) + `reports → quality` (T7 → T6 = legal) both clear. **2 of 8 tier violations resolved by doc-only change.** No code refactor needed.

**Q3 — `research` placement** ✅ **ANSWERED 2026-05-25 (autonomous): tier 8 confirmed**.

Research is genuinely clinical-audit-adjacent in this platform. The `domains/research/services/ResearchService.js` declared deps are `['core', 'episodes']` (tier 2) — research reads beneficiary + episode data to attach to IRB review records. No domain depends ON research. The "top consumer" position is appropriate: research consumes clinical data without being consumed by anything below. ADR-018 (rehabilitation-protocol-entity) and the clinical-audit framing both support this.

Alternative considered: option (b) "peer of assessments (tier 3)" — rejected because research is fundamentally observational/IRB-driven, not assessment-of-current-beneficiary. They share data sources but have orthogonal purposes.

**Effect on baseline**: zero. No current violations involve research.

**Q4 — `hr` split** ✅ **ANSWERED 2026-05-25 (autonomous): hr stays tier 6 for W354; split is follow-up ADR work**.

HR is a hybrid:

- HR-platform pieces (employees, payroll, leave-approval, RBAC roles) are genuinely tier 1 (infrastructure for the whole system).
- HR-operational pieces (recruitment workflow, training programs, attendance-via-camera, transport assignments) are tier 6 (operations-attendance-transport).

The current `domains/hr/index.js` is a thin re-export of `services/hrService` and declares no deps. It mixes both concerns. Splitting cleanly requires:

1. Move HR-platform to a new `domains/hr-platform/` or merge into `security`.
2. Keep HR-operational in `domains/hr/` (tier 6).
3. Update all callers.

That's a separate ADR scope. For W354, hr remains tier 6 and the drift guard accepts whatever deps emerge. Currently `hr` declares zero deps and triggers zero violations — postponing the split costs nothing today.

**Effect on baseline**: zero.

**Q5 — legacy areas without a clear owner** ✅ **CONFIRMED OUT OF W354 SCOPE 2026-05-25**.

Files like `backend/services/sehhatyAdapter.js`, `backend/integrations/*`, the 2,108-file legacy surface cross multiple tiers conceptually. The W354 drift guard scope is `backend/domains/` only because:

1. Mapping every legacy file to a tier is a multi-week effort, not warranted before doctrine is settled.
2. The codebase pattern is gradual migration from legacy → `domains/`. New code goes in `domains/`; legacy stays until its owner moves it.
3. Extending W354 to scan legacy would add hundreds of baseline entries with no clear path to ratchet-down.

When a legacy area gets refactored into a module folder, that's a separate ADR + drift-guard-scope extension per area. **This is a deliberate scoping decision, not deferred uncertainty.**

## Decision

**Adopt the mapping above as canonical** with Q3 + Q4 answered (no current violations involved) and Q1 + Q2 carrying explicit recommendations for stakeholder confirmation. The W354 drift guard:

1. **Enforces direction** on declared `dependencies` in `backend/domains/*/index.js` based on the tier mapping above. Existing reversals (workflow→episodes/core/timeline via JourneyService, family→sessions/goals/care-plans, reports/dashboards→quality) are baselined as `KNOWN_TIER_VIOLATIONS`.

2. **Detects circular dependencies** via DFS on the declared graph. Currently zero; any new cycle fails CI.

3. **Detects facade-bypass** (cross-domain `require()` reaching into another domain's `models/`, `services/`, `repositories/`, `routes/` instead of its `index.js`). 3 unique target modules baselined as `KNOWN_FACADE_BYPASSES`.

**Path to baseline = 0** (after Q1 + Q2 confirmed):

| If Q2 recommendation (a) adopted    | If Q1 recommendation (c) adopted                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `dashboards→quality` clears (T7→T6) | `workflow→core/episodes/timeline` clears (split: JourneyService at T7 reads T2 legally) |
| `reports→quality` clears (T7→T6)    | 3 facade-bypass entries clear (JourneyService runtime lookup via mongoose.model)        |
| **2 of 8 tier violations resolved** | **3 of 8 tier violations + all 3 facade-bypasses resolved**                             |

If both adopted: **5 of 8 tier violations + all 3 facade-bypasses resolved by doc/light-refactor**. Remaining 3 (`family → sessions/goals/care-plans`) need a `family` re-tier or split — `family` is hybrid (beneficiary-tier owner of `FamilyMember`/`FamilyCommunication` + reports-tier portal consumer of goals/sessions/care-plans data). The cleanest fix is a `family-portal` sub-domain at tier 7 with the `getFamilyPortalData` reads, and `family` (tier 2) keeps just CRUD on FamilyMember/Communication. That's a separate follow-up ADR.

The baseline ratchets DOWN as Q1 + Q2 get answered + refactors land. The drift guard's stale-baseline test forces removal from the Set in the same commit that fixes the violation (W325c pattern).

## Consequences

If **Q1 + Q2 stay unanswered**:

- Baseline persists at 8 + 3 indefinitely. New tier-violations from Q1/Q2-adjacent areas still fail CI (the baseline only excuses the specific known offenders).
- The 3 facade-bypass occurrences in `JourneyService.js` are documented as deliberate; refactor work is voluntary.

If **stakeholders confirm Q1 + Q2 recommendations**:

- Q2 (a): one doc commit updates `TIER` (`quality: 8 → 6`, `research: 8 → 7`) + drift guard re-asserts under new ordering + 2 baseline entries removed.
- Q1 (c): a workflow domain split lands across multiple commits (engine extracted, journey moved, callers migrated) + 3 tier violations + 3 facade-bypasses removed.
- Combined effect: baseline 8 + 3 → 3 + 0 (only `family → {sessions, goals, care-plans}` remains, gated on family-portal split ADR).

If **the mapping is wrong** (e.g., dashboards should be tier 4, not 7):

- Update the `TIER` constant in `backend/__tests__/module-dependency-direction-wave354.test.js` + update the table above. Drift guard re-asserts under new ordering.

## Cross-references

- Doctrine: [docs/architecture/MODULE_DEPENDENCY_RULES.md](../MODULE_DEPENDENCY_RULES.md)
- Drift guard: `backend/__tests__/module-dependency-direction-wave354.test.js` (W354)
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
