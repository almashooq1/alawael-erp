# ADR-036 — Reconcile the live 46-role model with the 9 authorization archetypes via an additive archetype tag (do NOT flatten) (🟡 Proposed)

**Date**: 2026-05-30
**Type**: ADR (reconciliation / classification — bridges design to live config)
**Mode**: 🤝 Claude proposes + can execute the non-destructive part (the map + drift guard + additive tag); 👤 stakeholder owns any role retirement/merge
**Decider**: Security owner (archetype assignment) + product owner (role UX) + HR/admin owner (role catalog)
**Effort**: map + drift guard ~0.5 day (non-destructive, additive) / any role consolidation N/A until separately funded

## Context

[ADR-035](035-enterprise-authorization-design.md) + the
[permissions matrix](../PERMISSIONS_MATRIX.md) define authorization over **9
canonical roles** (HQ_ADMIN, EXECUTIVE_DIRECTOR, BRANCH_MANAGER, UNIT_SUPERVISOR,
THERAPIST, RECEPTIONIST, HR_OFFICER, FINANCE_OFFICER, AUDITOR). The **live**
system (`backend/config/rbac.config.js`) defines **46 granular roles** across 6
levels (HQ / region / branch / dept-supervisor / specialty / support + external).

A naïve "make the registry match the design" step would FAIL — the role sets are
different sizes. Reading both, the relationship is not a conflict, it is **two
axes that the live model has fused and the design has separated**:

- **Function axis** = which permission family applies → the 9 archetypes.
- **Scope/seniority axis** = where + maker-vs-checker → the 6 live levels.

A live role is `(function archetype × scope/seniority)`. Worked examples:

| Live cluster                                                                        | Archetype (function) | Scope/seniority differentiator                                         |
| ----------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `hr` · `hr_officer` · `hr_supervisor` · `hr_manager` · `group_chro`                 | **HR_OFFICER**       | officer = maker; supervisor/manager/chro = checker, rising scope (B→G) |
| `accountant` · `finance` · `finance_supervisor` · `group_cfo`                       | **FINANCE_OFFICER**  | accountant = maker; cfo = global approver                              |
| `therapist{,_slp,_ot,_pt,_psych}` · `doctor` · `teacher` · `therapy_assistant`      | **THERAPIST**        | specialty variants; assistant is narrower                              |
| `supervisor` · `therapy_supervisor` · `special_ed_supervisor` · `clinical_director` | **UNIT_SUPERVISOR**  | unit-scoped; clinical_director = branch-wide clinical                  |
| `admin` · `manager` · `branch_manager` · `regional_director`                        | **BRANCH_MANAGER**   | regional_director spans a branch set                                   |
| `internal_auditor` · `compliance_officer` · `*quality*`                             | **AUDITOR**          | read/export only (S5)                                                  |
| `parent` · `guardian` · `student` · `viewer` · `driver` · `bus_assistant` …         | **NON_MATRIX**       | external / transport-ops — separate policy                             |

The full bijection is data:
[`role-archetype-map.json`](../role-archetype-map.json) — **all 46 live roles
mapped, validated** (no missing, no phantom, no duplicate; per-archetype counts
HQ_ADMIN 3 / EXEC 2 / BRM 4 / UNS 4 / THR 9 / REC 2 / HR 5 / FIN 4 / AUD 5 /
NON_MATRIX 8).

## Decision

- **D1 — Add an archetype tag, don't flatten.** Each live role gains an additive
  `archetype` + `scope` + `approver` classification (the map). The 46 roles
  **remain** — they carry real specialty (SLP/OT/PT), seniority (officer vs
  manager), and reporting/scheduling identity that the 9-role design doesn't
  capture and shouldn't erase. Flattening 46→9 would be a destructive
  information loss for no benefit.
- **D2 — Author permissions per archetype; resolve per live role.** The matrix
  ([seed](../role-permissions.seed.json)) is authored once per archetype.
  A live role's effective grants = `archetype grants ∩ map.scope`, with
  `*:approve` unlocked only when `map.approver = true`. This means the 46 roles
  are governed by **9 maintained permission sets**, not 46 hand-authored ones.
- **D3 — `approver` is the maker-checker axis.** Within one archetype, the
  `approver:true` seniority is the _checker_ (e.g. `hr_manager` approves what
  `hr_officer` submits); the matrix `≠req` SoD (S3/S4/S8) still fires.
- **D4 — Drift guard.** Add a guard asserting **every** value in `rbac.config.js
ROLES` appears exactly once in `role-archetype-map.json` — a new live role
  with no archetype fails CI (the live-Mongo twin of the seed integrity check
  already run). Pair static (presence) + behavioral (resolve a sample role
  through archetype → expected grants).
- **D5 — `NON_MATRIX` is explicit, not a dumping ground.** External (parent/
  guardian/student) and transport-ops (driver/bus_assistant) roles are marked
  `NON_MATRIX` with a pointer to their governing policy (parent-portal /
  transport module), so "not in the staff matrix" is a recorded decision, not an
  oversight.

## Open questions (gate any consolidation; the map + tag land now)

- **Q1** — Should `therapy_assistant` get a _narrower-than-THERAPIST_ sub-profile
  (read + assist, no create on finalizable records)? The map notes it; the
  registry build must encode it.
- **Q2** — Are `admin` and `manager` (generic, pre-Phase-7) candidates for
  retirement now that `branch_manager` exists? (Pattern-D-style, separate ADR.)
- **Q3** — Is `group_quality_officer` purely assurance (AUDITOR, read-only), or
  does it also own quality-CAPA _write_? If the latter, it needs a QUALITY
  archetype distinct from AUDITOR (the matrix currently has no QUALITY function).
- **Q4** — Who owns keeping the map current as HR adds roles (security vs platform)?

## Consequences

- **Positive**: the design and the live config are reconciled without a risky
  flatten; 46 roles governed by 9 maintained permission sets; a drift guard makes
  "every live role has an archetype" a CI invariant; `NON_MATRIX` is explicit;
  the map is the precise input a future registry-build needs.
- **Negative / risk**: the archetype tag must be **kept in sync** as roles are
  added (mitigated by D4's guard); a few mappings embed judgment (clinical_director
  scope, therapy_assistant narrowing, quality_officer function — the Open
  Questions) that need owner sign-off before a registry is generated from them.
- **Neutral**: purely additive — no live role behavior changes until a registry
  is actually generated from the archetype grants (a separate, funded step).

## Status

🟡 **Proposed.** The map + this ADR are non-destructive and land now. D2 (generate
a real registry that resolves the 46 roles through the 9 archetypes) and any
consolidation (Q2) await owner sign-off on Q1–Q4. Cross-refs:
[ADR-035](035-enterprise-authorization-design.md) (the 9-archetype matrix this
maps onto), ADR-005 (canonical role hierarchy — the live model this reconciles),
ADR-021 (consolidation discipline / Pattern-D for Q2), and the validated
[`role-archetype-map.json`](../role-archetype-map.json).
