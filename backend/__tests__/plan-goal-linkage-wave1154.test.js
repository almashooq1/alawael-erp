'use strict';

/**
 * plan-goal-linkage-wave1154.test.js — gap #4 static drift guard.
 *
 * Golden-thread gap #4 (plan ↔ goals). AUDIT FINDING (W1154): the CANONICAL
 * plan↔goal edges already exist —
 *   • TherapeuticGoal.carePlanId → UnifiedCarePlan  (canonical goal → canonical plan)
 *   • Goal(IEP).therapeuticGoalId → TherapeuticGoal (W1133 ADR-040 Option-C bridge)
 * — but NEITHER was indexed, so the backward traversals were collection scans.
 * The blueprint's "convert embedded goals[] subdocs to refs" is the LEGACY
 * CarePlan/IEP structure, converged separately under ADR-026/040 (owner-gated).
 *
 * So — same discipline as R2/gap#3/gap#6 — this wave LOCKS the canonical edges
 * against drift and indexes them; it does NOT add a parallel ref array to
 * CarePlan (that would be the fragmentation anti-pattern) nor restructure plans.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `plan-goal-linkage-behavioral-wave1154.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #4.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/plan-goal-linkage-wave1154.test.js
 */

const fs = require('fs');
const path = require('path');

const THERAPEUTIC_GOAL = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'models', 'TherapeuticGoal.js'),
  'utf-8'
);
const GOAL = fs.readFileSync(path.join(__dirname, '..', 'models', 'Goal.js'), 'utf-8');

describe('gap #4 (W1154) — canonical goal → plan edge', () => {
  test('TherapeuticGoal.carePlanId refs UnifiedCarePlan', () => {
    expect(THERAPEUTIC_GOAL).toMatch(
      /carePlanId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*ref:\s*'UnifiedCarePlan'\s*,?\s*\}/
    );
  });

  test('TherapeuticGoal.carePlanId is indexed (sparse) for "goals of this plan"', () => {
    expect(THERAPEUTIC_GOAL).toMatch(
      /index\(\{\s*carePlanId:\s*1\s*\},\s*\{\s*sparse:\s*true\s*\}\)/
    );
  });
});

describe('gap #4 (W1154) — IEP goal → canonical goal bridge (W1133)', () => {
  test('Goal.therapeuticGoalId refs TherapeuticGoal (the ADR-040 bridge)', () => {
    expect(GOAL).toMatch(/therapeuticGoalId:\s*\{[\s\S]*?ref:\s*'TherapeuticGoal'/);
  });

  test('Goal.therapeuticGoalId is indexed for "IEP goals bridging to this canonical goal"', () => {
    expect(GOAL).toMatch(/index\(\{\s*therapeuticGoalId:\s*1\s*\}\)/);
  });
});

describe('gap #4 (W1154) — anti-fragmentation: no parallel goal-ref array on the plan', () => {
  test('the index comment records that legacy embedded subdocs are converged via ADR-026/040, not a parallel array', () => {
    expect(THERAPEUTIC_GOAL).toMatch(/ADR-026\/040/);
  });
});
