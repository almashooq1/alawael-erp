'use strict';

/**
 * goal-linked-measures-wave1090.test.js — R1 static drift guard.
 *
 * Closes golden-thread gap #1 (Goal ↔ Measure) per
 * docs/blueprint/43-beneficiary-journey-operating-system.md §III + §XVI.1.
 *
 * Asserts the Goal model declares a `linkedMeasures` sub-schema that links a
 * goal to its standardized MeasurementMaster definition(s), with the canonical
 * refs, defaults, the three pre('save') invariants, and the lookup index.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `goal-linked-measures-behavioral-wave1090.test.js`, which proves
 * the invariants actually fire at runtime (the W385/W408 static-vs-behavioral
 * lesson: regex presence ≠ runtime correctness).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/goal-linked-measures-wave1090.test.js
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Goal.js'), 'utf-8');

describe('R1 (W1090) — Goal.linkedMeasures field shape', () => {
  test('declares a linkedMeasures array field', () => {
    expect(SRC).toMatch(/linkedMeasures:\s*\{/);
  });

  test('measureId refs MeasurementMaster and is required', () => {
    expect(SRC).toMatch(
      /measureId:\s*\{[\s\S]*?ref:\s*'MeasurementMaster'[\s\S]*?required:\s*true/
    );
  });

  test('role is an enum of primary|secondary defaulting to primary', () => {
    expect(SRC).toMatch(
      /role:\s*\{[\s\S]*?enum:\s*\['primary',\s*'secondary'\][\s\S]*?default:\s*'primary'/
    );
  });

  test('baselineResultId refs MeasurementResult (also serves gap #5)', () => {
    expect(SRC).toMatch(/baselineResultId:\s*\{[\s\S]*?ref:\s*'MeasurementResult'/);
  });

  test('carries targetScore (Number) + targetDirection enum', () => {
    expect(SRC).toMatch(/targetScore:\s*\{\s*type:\s*Number/);
    expect(SRC).toMatch(
      /targetDirection:\s*\{[\s\S]*?enum:\s*\['increase',\s*'decrease',\s*'maintain'\]/
    );
  });

  test('linked-row sub-schema disables _id (embedded link rows, like icfMapping)', () => {
    // Goal.js carries exactly two _id:false sub-schemas: icfMapping + linkedMeasures.
    const occurrences = (SRC.match(/\{\s*_id:\s*false\s*\}/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

describe('R1 (W1090) — linkedMeasures invariants present in pre(save)', () => {
  test('invariant 1: at most one primary measure', () => {
    expect(SRC).toMatch(/at most one entry may have role: primary/);
  });

  test('invariant 2: no duplicate measureId', () => {
    expect(SRC).toMatch(/duplicate measureId/);
  });

  test('invariant 3: targetScore requires targetDirection', () => {
    expect(SRC).toMatch(/targetScore set without targetDirection/);
  });

  test('invariants live in an async-style pre(save) (Mongoose-9 safe — no next callback)', () => {
    // Gate-4 (check:hook-style): all hooks on the same event must share a style.
    // The single pre('save') is async (throws on violation) — pure callback
    // style silently breaks under Mongoose 9 ("next is not a function").
    expect(SRC).toMatch(/goalSchema\.pre\(\s*'save',\s*async\s+function\s*\(\s*\)/);
  });
});

describe('R1 (W1090) — outcome-dashboard index', () => {
  test('indexes linkedMeasures.measureId', () => {
    expect(SRC).toMatch(/index\(\{\s*'linkedMeasures\.measureId':\s*1\s*\}\)/);
  });
});
