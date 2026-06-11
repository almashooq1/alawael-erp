'use strict';

/**
 * assessment-goal-provenance-wave1151.test.js — R-gap#3 static drift guard.
 *
 * Closes golden-thread gap #3 (assessment → goal) per
 * docs/blueprint/43-beneficiary-journey-operating-system.md §III.
 *
 * AUDIT FINDING (W1151): the only "derive a goal from an assessment" flow
 * (assessmentInsight.createGoalFromSuggestion, W568) created a TherapeuticGoal
 * from a MeasureApplication but DROPPED the applicationId — the provenance only
 * survived as a free-text tag/note, so "what assessment generated this goal?"
 * was unanswerable. This wave adds the additive `measureApplicationId` ref on
 * TherapeuticGoal and writes it in that flow.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `assessment-goal-provenance-behavioral-wave1151.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/assessment-goal-provenance-wave1151.test.js
 */

const fs = require('fs');
const path = require('path');

const GOAL = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'models', 'TherapeuticGoal.js'),
  'utf-8'
);
const SERVICE = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'assessmentInsight.service.js'),
  'utf-8'
);

describe('gap #3 (W1151) — TherapeuticGoal.measureApplicationId provenance field', () => {
  test('declares measureApplicationId refs MeasureApplication, indexed + sparse', () => {
    expect(GOAL).toMatch(
      /measureApplicationId:\s*\{[\s\S]*?ref:\s*'MeasureApplication'[\s\S]*?index:\s*true[\s\S]*?sparse:\s*true/
    );
  });

  test('it is additive — measureApplicationId is NOT required (no breaking change)', () => {
    const i = GOAL.indexOf('measureApplicationId:');
    const block = GOAL.slice(i, i + 250);
    expect(block).not.toMatch(/required:\s*true/);
  });
});

describe('gap #3 (W1151) — the derivation flow records provenance', () => {
  test('createGoalFromSuggestion sets measureApplicationId on the created goal', () => {
    // the create payload must carry measureApplicationId: applicationId
    expect(SERVICE).toMatch(/measureApplicationId:\s*applicationId/);
  });

  test('the provenance write lives inside createGoalFromSuggestion (the W568 flow)', () => {
    const start = SERVICE.indexOf('createGoalFromSuggestion');
    expect(start).toBeGreaterThan(-1);
    const block = SERVICE.slice(start, start + 2000);
    expect(block).toMatch(/TherapeuticGoal\.create\(/);
    expect(block).toMatch(/measureApplicationId:\s*applicationId/);
  });
});
