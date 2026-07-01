'use strict';

/**
 * W1557 — beneficiary360.service field-drift fix (clinical-safety).
 *
 * The 360 aggregation widgets queried/read phantom field shapes that don't exist
 * on the canonical source schemas, so they returned EMPTY/zeroed clinical data
 * that LOOKED real (a clinician could think a beneficiary has no assessments,
 * progress, or goals when they do):
 *   - ClinicalAssessment keys on `beneficiary` (not beneficiaryId), flat `score`
 *     + `scoreBreakdown[].domain/score` + `tool`/`therapist`/`category`
 *     (NOT scoring.totalScore/domainScores/measureId/assessorId/type).
 *   - TherapeuticGoal progress is `currentProgress` (not progressPercentage).
 *   - CareTimeline's date is `occurredAt` (not eventDate).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'core', 'services', 'beneficiary360.service.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1557 beneficiary360 field-drift', () => {
  test('assessments query the REAL `beneficiary` key (not phantom beneficiaryId)', () => {
    // _buildAssessments + _buildProgress both
    const hits = (CODE.match(/beneficiary: new mongoose\.Types\.ObjectId\(beneficiaryId\)/g) || [])
      .length;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  test('no phantom scoring.* / progressPercentage / eventDate-sort reads remain in code', () => {
    expect(CODE).not.toMatch(/scoring\.totalScore/);
    expect(CODE).not.toMatch(/scoring\.domainScores/);
    expect(CODE).not.toMatch(/progressPercentage/);
    expect(CODE).not.toMatch(/\.sort\(\{\s*eventDate/);
  });

  test('uses the real schema fields: scoreBreakdown / currentProgress / occurredAt', () => {
    expect(CODE).toMatch(/scoreBreakdown/);
    expect(CODE).toMatch(/currentProgress/);
    expect(CODE).toMatch(/occurredAt/);
  });
});
