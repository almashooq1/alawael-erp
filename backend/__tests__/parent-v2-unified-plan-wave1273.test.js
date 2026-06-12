'use strict';

/**
 * W1273 — the MOBILE app's parent surface sees canonical plans.
 *
 * Same split the W1272 fix closed in v1, found in parent-portal-v2 (the
 * /parent-v2 mount the mobile app consumes). Static wiring guard:
 *   1. The care-plan handler reads UnifiedCarePlan FIRST, fail-soft, with
 *      the legacy branch retained verbatim.
 *   2. The unified read sits strictly AFTER the assertChildAccess gate.
 *   3. Shape compatibility tokens the mobile client depends on are present
 *      in the unified branch (planNumber/sections/goals/totalGoals/
 *      achievedGoals) + the additive W1259 familyVersion.
 *   4. The overview's activeCarePlans counts BOTH models.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'parent-portal-v2.routes.js'),
  'utf8'
);

describe('W1273 parent-v2 unified-first care plan', () => {
  test('unified read present, fail-soft, legacy fallback retained', () => {
    expect(src).toContain("require('../domains/care-plans/models/UnifiedCarePlan')");
    expect(src).toContain("status: { $in: ['active', 'under_review'] }");
    expect(src).toContain("CarePlan.findOne({ beneficiary: req.params.id, status: 'ACTIVE' })");
  });

  test('unified read sits AFTER the child-access gate', () => {
    const handlerIdx = src.indexOf("'/children/:id/care-plan'");
    const gateIdx = src.indexOf('assertChildAccess', handlerIdx);
    const unifiedIdx = src.indexOf('UnifiedCarePlan.findOne', handlerIdx);
    expect(gateIdx).toBeGreaterThan(handlerIdx);
    expect(unifiedIdx).toBeGreaterThan(gateIdx);
  });

  test('mobile shape compatibility + additive familyVersion', () => {
    const handler = src.slice(src.indexOf("'/children/:id/care-plan'"));
    for (const token of [
      'planNumber:',
      'sections:',
      'totalGoals:',
      'achievedGoals:',
      'familyVersion: (uPlan.familyVersion && uPlan.familyVersion.body) || null',
      "source: 'unified'",
    ]) {
      expect(handler).toContain(token);
    }
  });

  test('overview activeCarePlans counts BOTH models', () => {
    expect(src).toContain('UnifiedCarePlan.countDocuments');
    expect(src).toContain('return legacy + unified');
  });
});
