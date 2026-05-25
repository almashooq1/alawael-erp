# Pilot Cycle 1 — Scenario Walkthroughs

This directory contains the **6 detailed end-to-end scenario walkthroughs** for executing Pilot Cycle 1. Each scenario validates one cross-module integration path against the production-ready platform.

**Start here**: [docs/PILOT_CYCLE_1.md](../PILOT_CYCLE_1.md) — the operational readiness package (branch selection, user groups, training plan, go/no-go criteria, rollback plan, open questions).

This directory is what pilot operators execute during weeks 1-4.

---

## The 6 scenarios

| #   | Scenario                                                 | Walkthrough                                                                            | Validates                                                                         | Duration            | Status   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------- | -------- |
| 1   | Beneficiary intake → first session                       | [SCENARIO_1_INTAKE_TO_FIRST_SESSION.md](SCENARIO_1_INTAKE_TO_FIRST_SESSION.md)         | B360 + Assessment + CarePlan + Session + Family Portal (W324-W332 + W352 + W276c) | ~2-4 hrs            | 📋 Draft |
| 2   | Re-assessment → CarePlanVersion v2                       | [SCENARIO_2_REASSESSMENT_REVISION.md](SCENARIO_2_REASSESSMENT_REVISION.md)             | Re-assessment + AI recommendation + plan revision (W325 P2 + W41 + W334 + W332)   | ~2-3 hrs            | 📋 Draft |
| 3   | Quality finding → CAPA → CLOSED                          | [SCENARIO_3_CAPA_END_TO_END.md](SCENARIO_3_CAPA_END_TO_END.md)                         | 8-layer CAPA stack end-to-end (W337-W349)                                         | ~3-4 hrs            | 📋 Draft |
| 4   | Transport + Hikvision camera attendance                  | [SCENARIO_4_TRANSPORT_HIKVISION.md](SCENARIO_4_TRANSPORT_HIKVISION.md)                 | Camera→Appointment auto-update + EOD reconcile (W96-W114 + W327 + W335)           | ~1-2 hrs            | 📋 Draft |
| 5   | Monthly Disability Authority report submission           | [SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md](SCENARIO_5_DISABILITY_AUTHORITY_REPORT.md) | Government reporting pipeline (W281 + W286 + W312 + W316)                         | ~1 hr active + cron | 📋 Draft |
| 6   | Caregiver enrollment → sessions → Zarit pre/post outcome | [SCENARIO_6_CAREGIVER_SUPPORT_PROGRAM.md](SCENARIO_6_CAREGIVER_SUPPORT_PROGRAM.md)     | W384 CaregiverSupportProgram + W393 overdue sweeper (18 endpoints + lifecycle)    | ~2 hrs              | 📋 Draft |

**Coverage**: The 6 walkthroughs exercise the 7 ready platform phases (B360 + assessments + plans + sessions + reports + ops + quality) + the family-support surface end-to-end on real data.

---

## How to run a scenario

Each walkthrough has the same structure:

1. **Pre-test setup** — env vars, seed data, gates (e.g. Scenario 4 requires Hikvision cameras; Scenario 5 has a mock-vs-live mode gate)
2. **Step-by-step** — UI/API actions + verify checkpoints + "if it fails" diagnostics per step
3. **Acceptance criteria** — checklist that must all be checked
4. **Cleanup script** — soft-delete pilot test data; never touches prod-grade records (e.g. live gov submissions)
5. **Sign-off table** — Admin + Supervisor + Therapist/Dev/PM as applicable
6. **Issues capture** — tag `SCENARIO:N + STEP:N.X` for filing to `#pilot-cycle-1` channel
7. **Likely issues** — failure modes to expect; saves diagnosis time

---

## Recommended execution order

**Week 1 (Foundation)**:

- ✅ Pilot kickoff + training (per `PILOT_CYCLE_1.md` §6)
- ✅ Run Scenario 1 (intake → first session) — the foundational happy path. Most other scenarios depend on Scenario 1's data
- ✅ Run Scenario 4 in mock-only mode if Hikvision not yet provisioned

**Week 2 (Quality + Operations + Family Support)**:

- ✅ Run Scenario 3 (CAPA end-to-end) once a real quality issue surfaces (or simulate)
- ✅ Run Scenario 5 in mock-mode (no live DA creds needed)
- ✅ Run Scenario 6 (Caregiver support program enrollment + sessions + Zarit outcomes)

**Week 3 (Live integrations)**:

- ✅ Run Scenario 2 (re-assessment ~90 days after Scenario 1's initial assessment — may overlap with prior pilot data)
- ✅ Switch Scenario 5 to live-mode if DA sandbox creds arrive (follow Scenario 5 §3 cutover checklist)
- ✅ Switch Scenario 4 to live Hikvision if cameras provisioned

**Week 4 (Retrospective)**:

- ✅ Re-run any scenarios that opened issues to verify fixes
- ✅ Final retrospective per `PILOT_CYCLE_1.md` §8 go/no-go criteria

---

## When something breaks

1. **Each scenario's "If it fails" sections** are the first stop — they encode known failure modes + diagnostic commands
2. **`PILOT_CYCLE_1.md` §7** has the bug-capture template + escalation flow
3. **Drift guards run locally** — `cd backend && npm run lint:duplication && npm run preflight` verify deploy-gates haven't regressed
4. **Architectural questions** — see `docs/architecture/decisions/` (ADRs 001-028) for design rationale

---

## After the pilot

- Sign-off captured per scenario → consolidated into pilot retrospective
- Mock-mode adapters graduate to live per each scenario's §3 cutover (Scenario 5 has the explicit template)
- New issues become a backlog for Cycle 2 (broader rollout)
- The 5 scenario docs themselves are **stable validation artifacts** — re-runnable for every new branch onboarding

**Pilot Scenario Suite — COMPLETE (6/6)** as of 2026-05-25.
