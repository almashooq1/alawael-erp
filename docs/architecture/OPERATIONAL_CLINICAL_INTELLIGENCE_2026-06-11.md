# Operational & Clinical Intelligence — Maturity Synthesis (2026-06-11)

**Type**: Maturity assessment + roadmap (synthesis of the 2026-06-10/11 build arc)
**Scope**: The operational-workflow + clinical-intelligence layers shipped end-to-end across both repos
**Audience**: Product owner + tech lead — answers "where is the platform now, and what genuine value remains?"

---

## 1. What shipped (end-to-end, live in prod)

The center's operational cycle — **distribute → execute → document → complete → monitor** — now has a live interface at every step, plus the clinical-intelligence layer that makes outcomes visible.

| Layer | Capability | Backend | Web-admin | Status |
| --- | --- | --- | --- | --- |
| **Data** | Golden thread (assessment→goal→measure→baseline→outcome) | `goldenThread.service` + `/goals/golden-thread/*` | `goldenThreadApi` + 360 widget | LIVE |
| **Branch exec** | Operations Health (4-signal fused grade) | `operationsHealth.service` + `/goals/supervisor-ops/operations-health` | `/supervisor-ops` tile | LIVE |
| **Per-beneficiary** | Rehab Plan Health (goal-progress + thread + review cadence + safety → grade) | `rehabPlanHealth.service` + `/goals/rehab-plan-health/:id` | `/rehab-plan-health` + **360 card** | LIVE |
| **Supervisor** | Documentation backlog · productivity · overdue-reports · **review-worklist** | `supervisorOps` + `/goals/supervisor-ops/*` | `/supervisor-ops` + `/review-worklist` | LIVE |
| **Specialist** | "My Day" board (own In-Process vs Complete) | `/goals/supervisor-ops/my-day` (reuses `dailyBoardForTherapist`) | `/my-day` | LIVE |
| **Document step** | Session documentation (attendance + per-goal rating → complete) | `PUT /sessions/:id/complete` (pre-existing + R3 gate) | `/my-day/document/[sessionId]` | LIVE |
| **Team** | MDT meetings (cases / decisions / attendees) | `MDTCoordination` + `/mdt-coordination/*` (pre-existing) | `/mdt-meetings` (+ detail) | LIVE |
| **Rigor** | Behavioral hardening of the new services | `rehab-plan-health-behavioral-wave1205` (MMS, 6 assertions) | — | LIVE |

Waves: **W1195/W1196** (operations-health) · **W1201/W1202** (plan-health + review-worklist) · **W1204** (my-day) · **W1205** (behavioral) + the golden-thread arc (W1156–W1196) landed earlier. Web-admin PRs #72/#73/#77/#91/#92.

## 2. Maturity position

The platform moved from **"unified memory"** (data is recorded) to **"outcome-aware operations"**: the system now answers, per branch and per beneficiary and per specialist, *"is the work actually happening, documented, and producing outcomes?"* — and surfaces the single highest-leverage next action at each level. The operational loop is **closed**: a specialist can document a session from their own board, which moves it out of the awaiting-documentation tail, which the supervisor's compliance view reflects.

## 3. The audit-first finding that defined this arc

**Every candidate gap was checked against source before building. Four turned out to already exist** — and were therefore *not* rebuilt:

1. Outcome trends → `outcomeService` (trajectory/trend/MCID) + `/outcomes*` pages.
2. Session documentation → `PUT /sessions/:id/complete` (the missing piece was only the UI).
3. Task distribution → session scheduling (`POST /sessions`).
4. MDT coordination → `MDTCoordination` + 13-endpoint route (the missing piece was only the UI).

**Lesson**: in a mature platform, the bottleneck is rarely a missing backend — it is the **missing interface** or **missing connection** to where the user works. The highest-value builds this arc were UI surfacing (documentation flow, MDT UI) + integration (plan-health on the 360), not new engines.

## 4. The feature surface is saturated — what genuine value remains

| Category | Item | Autonomy | Effort / Risk |
| --- | --- | --- | --- |
| **Quality** | Behavioral/integration tests for the thin route wrappers (my-day, doc flow) | Autonomous | Low value — the engines (`dailyBoardForTherapist` W1169, `completeSession`) are already tested; W1205 covered the new service logic |
| **Owner-gated** | **ADR-026** — CarePlan / IEP / IFSP convergence | **Stakeholder** (clinical + MoE + EI owner) | See [026-DECISION-BRIEF.md](decisions/026-DECISION-BRIEF.md) — comprehensive, waiting on a decision meeting, not on more analysis |
| **Owner-gated** | SmartGoal → TherapeuticGoal consolidation | **Owner** (needs prod DB access) | Dev shows `SmartGoal=0`; tool ready (`consolidate:smartgoal`); run `audit:goal-consolidation` against prod first |
| **Product** | Write-flow expansions (supervisor nudge on backlog, bulk reassessment trigger) | **Product decision** | New mutation surfaces — need permission + notification design, not autonomous |

## 5. No-regrets property (re: ADR-026)

The rehab-plan-health + golden-thread layer shipped this arc is **deliberately model-robust**: `rehabPlanHealth.service.resolveActivePlan` prefers the live `CarePlanVersion` for review cadence, falls back to `UnifiedCarePlan`, and takes goal signals from the canonical `TherapeuticGoal`. **It therefore keeps working regardless of which ADR-026 approach wins** — it is the "no-regrets pre-work" the decision brief calls for, already in production. Whichever way the plan-model convergence is decided, the operational/clinical intelligence layer does not need to be rebuilt.

## 6. Recommendation

The autonomous, non-redundant build surface is **exhausted**. The next genuine value is **owner-gated**: (a) the ADR-026 convergence decision, and (b) the SmartGoal consolidation against prod. Both are decisions/access, not engineering. Until then, the operational-clinical intelligence layer is complete, deployed, verified, and behaviorally hardened.
