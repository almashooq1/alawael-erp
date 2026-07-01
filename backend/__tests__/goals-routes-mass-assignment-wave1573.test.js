'use strict';

/**
 * W1573 — goals.routes.js (the LIVE /api/v1/goals path via unifiedRouteRegistry →
 * index.routes.js) mass-assignment on create/update.
 *
 * The route is branch-isolated (router.param goalId/beneficiaryId ownership hooks +
 * effectiveBranchScope on the list), but the validate() validators only check
 * presence/enum — they don't whitelist — so `new TherapeuticGoal({ ...req.body })`
 * and the PUT `...safeUpdate` (which stripped only branchId/beneficiaryId) let a caller
 * forge schema-defined server-owned fields: currentProgress / achievedDate / status /
 * goalNumber / isDeleted / createdBy (e.g. fake goal achievement, or soft-delete via PUT).
 * Now both go through stripGoalWriteFields, and the progress entry stamps recordedBy.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'goals', 'routes', 'goals.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1573 goals.routes mass-assignment', () => {
  test('create + update strip server-owned fields (no raw body reaches the model)', () => {
    expect(CODE).toMatch(/\.\.\.stripGoalWriteFields\(req\.body\)/);
    expect(CODE).toMatch(/stripGoalWriteFields\(req\.body, \{ update: true \}\)/);
    expect(CODE).not.toMatch(/new TherapeuticGoal\(\{\s*\.\.\.req\.body/);
    expect(CODE).not.toMatch(/const \{ branchId: _branchId, beneficiaryId: _beneficiaryId/);
  });

  test('the protected set covers the forge-able clinical/identity fields', () => {
    for (const f of ['currentProgress', 'achievedDate', 'goalNumber', 'isDeleted', 'createdBy', 'branchId']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });

  test('update also drops beneficiaryId (identity immutable)', () => {
    expect(CODE).toMatch(/update \? \[\.\.\.GOAL_SERVER_FIELDS, 'beneficiaryId'\]/);
  });

  test('progress entry stamps recordedBy server-side (not client-supplied)', () => {
    expect(CODE).toMatch(/recordedBy: req\.user\?\._id/);
  });
});
