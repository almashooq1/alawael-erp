'use strict';

/**
 * assessment-measure-bridge-wave1153.test.js — gap #6 static drift guard.
 *
 * Golden-thread gap #6 (assessment ↔ measure). AUDIT FINDING (W1153): the
 * canonical assessment→measurement bridge ALREADY EXISTS as
 * `MeasureApplication.assessmentId` (ref ClinicalAssessment). MeasureApplication
 * is the canonical measurement model (205 refs); MeasurementResult is the legacy
 * parallel system (~19 refs) that ADR-041 fences — so this wave does NOT extend
 * the legacy model. It LOCKS the canonical bridge against drift (W325c discipline)
 * and indexes it so the backward query is efficient. The deeper "unify the two
 * parallel measurement systems" question is ADR-041's call (owner-gated), not a
 * code change here.
 *
 * Pure source-text analysis (no mongoose). Paired with the behavioral
 * counterpart `assessment-measure-bridge-behavioral-wave1153.test.js`.
 *
 * Per docs/blueprint/43-beneficiary-journey-operating-system.md §III gap #6.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/assessment-measure-bridge-wave1153.test.js
 */

const fs = require('fs');
const path = require('path');

const MEASURE_APPLICATION = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'models', 'MeasureApplication.js'),
  'utf-8'
);

describe('gap #6 (W1153) — canonical assessment→measure bridge', () => {
  test('MeasureApplication.assessmentId refs ClinicalAssessment', () => {
    expect(MEASURE_APPLICATION).toMatch(
      /assessmentId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*ref:\s*'ClinicalAssessment'\s*,?\s*\}/
    );
  });

  test('the bridge is indexed (sparse) for the backward "applications from this assessment" query', () => {
    expect(MEASURE_APPLICATION).toMatch(
      /index\(\{\s*assessmentId:\s*1\s*\},\s*\{\s*sparse:\s*true\s*\}\)/
    );
  });
});

describe('gap #6 (W1153) — anti-fragmentation: bridge stays on the CANONICAL model', () => {
  test('the index comment documents that the legacy MeasurementResult is deliberately NOT extended (ADR-041)', () => {
    // The decision to fence MeasurementResult rather than plumb golden-thread
    // links into it must be visible at the change site (R2 anti-fragmentation lesson).
    expect(MEASURE_APPLICATION).toMatch(/MeasurementResult deliberately NOT[\s\S]*?ADR-041/);
  });
});
