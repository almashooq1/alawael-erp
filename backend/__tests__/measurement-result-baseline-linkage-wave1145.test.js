'use strict';

/**
 * measurement-result-baseline-linkage-wave1145.test.js — R5 static drift guard.
 *
 * Closes golden-thread gap #5 (baseline ↔ progress) per
 * docs/blueprint/43-beneficiary-journey-operating-system.md §III + §XVII (R5).
 *
 * Asserts MeasurementResult declares the additive baseline-linkage fields
 * (`isBaseline` + `baselineResultId` refs MeasurementResult), the two Wave-18
 * invariants (no self-baseline; a baseline has no baselineResultId), and the
 * series-lookup index — so change-from-baseline / MCID is computable directly.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `measurement-result-baseline-linkage-behavioral-wave1145.test.js`
 * (the W385/W408 lesson: regex presence ≠ runtime correctness).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/measurement-result-baseline-linkage-wave1145.test.js
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'measurement', 'MeasurementResult.model.js'),
  'utf-8'
);

describe('R5 (W1145) — MeasurementResult baseline linkage field shape', () => {
  test('declares an isBaseline boolean defaulting to false', () => {
    expect(SRC).toMatch(/isBaseline:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/);
  });

  test('declares baselineResultId refs MeasurementResult, default null, indexed', () => {
    expect(SRC).toMatch(
      /baselineResultId:\s*\{[\s\S]*?ref:\s*'MeasurementResult'[\s\S]*?default:\s*null[\s\S]*?index:\s*true/
    );
  });

  test('it is additive — does NOT make either field required (no breaking change)', () => {
    // neither baseline-linkage field may carry `required: true`
    const block = SRC.slice(SRC.indexOf('isBaseline:'), SRC.indexOf('isBaseline:') + 400);
    expect(block).not.toMatch(/required:\s*true/);
  });

  test('keeps previousResultId distinct (prior-result chain ≠ baseline anchor)', () => {
    expect(SRC).toMatch(/previousResultId:/);
    expect(SRC).toMatch(/baselineResultId:/);
  });
});

describe('R5 (W1145) — baseline-linkage invariants present in source', () => {
  test('invariant 1: a result cannot be its own baseline', () => {
    expect(SRC).toMatch(
      /String\(this\.baselineResultId\)\s*===\s*String\(this\._id\)[\s\S]*?invalidate\(\s*'baselineResultId'/
    );
  });

  test('invariant 2: a baseline result must not set baselineResultId', () => {
    expect(SRC).toMatch(
      /this\.isBaseline\s*&&\s*this\.baselineResultId[\s\S]*?invalidate\(\s*'baselineResultId'/
    );
  });

  test('invariants run on the `validate` event (not `save`) to avoid hook-style mixing', () => {
    expect(SRC).toMatch(/pre\(\s*'validate'\s*,\s*function enforceBaselineLinkage/);
  });
});

describe('R5 (W1145) — series-lookup index', () => {
  test('adds a { beneficiaryId, typeId, isBaseline } index', () => {
    expect(SRC).toMatch(/index\(\{\s*beneficiaryId:\s*1,\s*typeId:\s*1,\s*isBaseline:\s*1\s*\}\)/);
  });
});
