/**
 * W1542 — ICFAssessment W340 collision-break guard.
 *
 * Two LIVE files registered the model name 'ICFAssessment' with INCOMPATIBLE
 * schemas: models/icf/ICFAssessment.model.js (canonical, `beneficiaryId`) and
 * models/assessment/ICFAssessment.js (`beneficiary` + findByPatient/… statics).
 * Because models/index.js loads icf/ first, any top-level require() of the
 * assessment/ file then threw `Cannot overwrite 'ICFAssessment' model once
 * compiled`, silently unmounting smart-assessment-engine (12 clinical scales) and
 * breaking the ICF service cluster.
 *
 * Fix (ADR-021 Pattern D): the assessment/ file now registers the distinct name
 * 'ICFAssessmentLegacy' on the SAME `icfassessments` collection. This guard locks
 * that so the collision can't silently return. Static source read (no mongoose).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('W1542 — ICFAssessment dual-registration collision stays broken-by-design', () => {
  test('canonical icf/ still owns the model name "ICFAssessment"', () => {
    const src = read('models/icf/ICFAssessment.model.js');
    expect(src).toMatch(/mongoose\.model\(\s*'ICFAssessment'/);
  });

  test('assessment/ registers the DISTINCT name "ICFAssessmentLegacy", not "ICFAssessment"', () => {
    const src = read('models/assessment/ICFAssessment.js');
    expect(src).toMatch(/mongoose\.model\(\s*'ICFAssessmentLegacy'/);
    // The bare `mongoose.model('ICFAssessment', schema)` registration that caused
    // the OverwriteModelError must NOT come back.
    expect(src).not.toMatch(/mongoose\.model\(\s*'ICFAssessment'\s*,/);
  });

  test('assessment/ pins the same `icfassessments` collection (no data move)', () => {
    const src = read('models/assessment/ICFAssessment.js');
    expect(src).toMatch(/'ICFAssessmentLegacy'\s*,\s*ICFAssessmentSchema\s*,\s*'icfassessments'/);
  });
});
