'use strict';

/**
 * goal-therapeutic-bridge-wave1133.test.js — ADR-040 additive-phase drift guard.
 *
 * Locks the SAFE, non-destructive first step of the goal-model consolidation
 * (ADR-040 Option C, executed under owner delegation): the IEP `Goal` model
 * gains an optional `therapeuticGoalId` bridge to the canonical `TherapeuticGoal`
 * (the model that anchors the goal↔measure↔outcome golden thread), and the
 * superseded paths (`Goal.linkedMeasures`, `SmartGoal`) carry `@deprecated`
 * markers so new code stops piling onto them.
 *
 * The DESTRUCTIVE phase (data migration + retiring SmartGoal / re-pointing
 * callers) stays owner-gated — this guard only locks the additive scaffolding +
 * the deprecation signals. Pure source-text (no DB).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/goal-therapeutic-bridge-wave1133.test.js
 */

const fs = require('fs');
const path = require('path');

const GOAL = fs.readFileSync(path.join(__dirname, '..', 'models', 'Goal.js'), 'utf-8');
const SMART = fs.readFileSync(path.join(__dirname, '..', 'models', 'SmartGoal.js'), 'utf-8');

describe('ADR-040 (W1133) — additive goal-model consolidation bridge', () => {
  test('Goal declares the therapeuticGoalId bridge (ref TherapeuticGoal, optional)', () => {
    expect(GOAL).toMatch(
      /therapeuticGoalId:\s*\{[\s\S]*?ref:\s*'TherapeuticGoal'[\s\S]*?default:\s*null/
    );
  });

  test('Goal.linkedMeasures is marked @deprecated (superseded by the bridge)', () => {
    expect(GOAL).toMatch(/@deprecated \(ADR-040/);
  });

  test('SmartGoal is marked @deprecated (canonical = TherapeuticGoal)', () => {
    expect(SMART).toMatch(/@deprecated \(ADR-040/);
  });

  test('the bridge is additive — Goal still registers as model "Goal" (no rename)', () => {
    expect(GOAL).toMatch(/mongoose\.model\(\s*'Goal'/);
  });
});
