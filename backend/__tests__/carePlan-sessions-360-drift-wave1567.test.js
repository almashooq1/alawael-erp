'use strict';

/**
 * W1567 — 360 _buildCarePlan + _buildSessions field-drift (P0-B follow-up).
 *
 * Both widgets rendered but read phantom field shapes → empty/blank clinical data that
 * LOOKED real (the most dangerous drift class — clinicians act on it). Verified against
 * domains/care-plans/models/UnifiedCarePlan.js + domains/sessions/models/ClinicalSession.js:
 *  - carePlan sections nest as plan.<group>.domains.<name> (sectionSchema), NOT plan.<key>.goals
 *    → old loop counted 0 for every plan; 'behavioral'/'multidisciplinary' weren't top-level keys.
 *  - sub-section field is specialistId (not specialist); approvalStatus is not a field
 *    (derive from approvals[]); globalGoals/globalInterventions were never counted.
 *  - session has scheduledDurationMinutes/actualDurationMinutes (no `duration` field);
 *    'documented' is not a status enum value (completion is 'completed').
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'core', 'services', 'beneficiary360.service.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1567 360 carePlan + sessions field-drift', () => {
  test('_buildCarePlan traverses domain sub-sections (not the wrapper)', () => {
    expect(CODE).toMatch(/plan\[group\]\?\.domains/);
    expect(CODE).toMatch(/for \(const group of \['educational', 'therapeutic', 'lifeSkills'\]\)/);
    expect(CODE).not.toMatch(/'behavioral',\s*'multidisciplinary',/); // old sectionKeys gone
  });

  test('_buildCarePlan uses specialistId + counts global goals', () => {
    expect(CODE).toMatch(/specialistId: section\.specialistId/);
    expect(CODE).toMatch(/\(plan\.globalGoals \|\| \[\]\)\.length/);
    expect(CODE).toMatch(/\(plan\.globalInterventions \|\| \[\]\)\.length/);
  });

  test('_buildCarePlan derives approvalStatus from approvals[] (not a phantom field)', () => {
    expect(CODE).toMatch(/const approvals = plan\.approvals \|\| \[\]/);
    expect(CODE).not.toMatch(/approvalStatus: plan\.approvalStatus/);
  });

  test('_buildSessions maps a real duration field (no phantom s.duration)', () => {
    expect(CODE).not.toMatch(/duration: s\.duration,/);
    expect(CODE).toMatch(/s\.actualDurationMinutes \?\? s\.scheduledDurationMinutes/);
  });

  test('_buildSessions recent query drops the phantom documented status', () => {
    expect(CODE).not.toMatch(/\$in: \['completed', 'documented'\]/);
    expect(CODE).toMatch(/\$in: \['completed'\]/);
  });
});
