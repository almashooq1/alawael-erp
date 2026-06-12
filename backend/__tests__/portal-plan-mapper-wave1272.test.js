'use strict';

/**
 * W1272 — parents see canonical plans + the family version in their portal.
 *
 *   1. PURE MAPPER — UnifiedCarePlan → the portal's public payload: goals
 *      flattened across all section groups + globalGoals, lowercase statuses
 *      mapped to the portal vocabulary, family-only fields exposed and
 *      clinician-internal fields NEVER leaked.
 *   2. ROUTE GUARD — the portal endpoint reads UnifiedCarePlan FIRST
 *      (fail-soft) and keeps the legacy branch as fallback.
 */

const {
  mapUnifiedPlanToPortalPayload,
  GOAL_STATUS_PUBLIC,
} = require('../intelligence/portal-plan-mapper.lib');

const fs = require('fs');
const path = require('path');
const routeSrc = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'parent-portal-v1.routes.js'),
  'utf8'
);

function fixturePlan() {
  return {
    _id: 'p1',
    planNumber: 'CP-20260612-AB',
    title_ar: 'خطة محمد الشاملة',
    status: 'active',
    startDate: new Date('2026-06-01'),
    nextReviewDate: new Date('2026-07-15'),
    therapeutic: {
      domains: {
        speech: {
          goals: [
            {
              _id: 'g1',
              title: 'ينطق الأصوات الأولى',
              status: 'in_progress',
              notes: 'ملاحظة سريرية داخلية',
            },
          ],
        },
      },
    },
    lifeSkills: {
      domains: {
        selfCare: { goals: [{ _id: 'g2', title: 'يغسل يديه', status: 'achieved' }] },
      },
    },
    globalGoals: [{ _id: 'g3', title: 'يطلب حاجته', status: 'pending' }],
    familyVersion: {
      body: '‫# خطة محمد\\n\\nمرحبًا بكم…',
      readabilityGrade: 6,
      generatedAt: new Date(),
    },
  };
}

describe('W1272 pure mapper', () => {
  const out = mapUnifiedPlanToPortalPayload(fixturePlan());

  test('goals flattened across sections + globals with public statuses', () => {
    expect(out.goals).toHaveLength(3);
    const byId = Object.fromEntries(out.goals.map(g => [g.id, g]));
    expect(byId.g1.status).toBe('IN_PROGRESS');
    expect(byId.g1.priority).toBe('HIGH'); // speech section
    expect(byId.g2.status).toBe('ACHIEVED'); // lifeSkills now visible to parents
    expect(byId.g3.status).toBe('NOT_STARTED');
  });

  test('family version rides along; payload shape matches the legacy branch', () => {
    expect(out.familyVersion).toContain('خطة محمد');
    expect(out.summary).toBe('خطة محمد الشاملة');
    expect(out.status).toBe('ACTIVE');
    expect(out.startDate).toBe('2026-06-01');
    expect(out.endDate).toBe('2026-07-15');
    expect(out.source).toBe('unified');
  });

  test('clinician-internal fields never leak to families', () => {
    const json = JSON.stringify(out);
    expect(json).not.toContain('ملاحظة سريرية'); // goal notes stripped
    expect(json).not.toContain('signatureChain');
    expect(json).not.toContain('evidence');
  });

  test('every mapped status value is a known public token', () => {
    for (const v of Object.values(GOAL_STATUS_PUBLIC)) {
      expect(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'ON_HOLD']).toContain(v);
    }
  });

  test('invalid input → null (route falls through to legacy)', () => {
    expect(mapUnifiedPlanToPortalPayload(null)).toBeNull();
  });
});

describe('W1272 route wiring guard', () => {
  test('portal endpoint reads UnifiedCarePlan FIRST, fail-soft, legacy kept', () => {
    expect(routeSrc).toContain('mapUnifiedPlanToPortalPayload');
    expect(routeSrc).toContain("status: { $in: ['active', 'under_review'] }");
    // legacy fallback retained verbatim
    expect(routeSrc).toContain(
      "CarePlan.findOne({ beneficiary: req.params.id, status: 'ACTIVE' })"
    );
    // the unified read sits INSIDE the ownership-checked handler (after the
    // guardianOwnsBeneficiary 404), never before it
    const ownershipIdx = routeSrc.indexOf('guardianOwnsBeneficiary(userId, req.params.id)');
    const unifiedIdx = routeSrc.indexOf('mapUnifiedPlanToPortalPayload');
    expect(ownershipIdx).toBeGreaterThan(-1);
    expect(unifiedIdx).toBeGreaterThan(ownershipIdx);
  });
});
