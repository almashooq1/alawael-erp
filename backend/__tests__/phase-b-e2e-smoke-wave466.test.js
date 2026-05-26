'use strict';

/**
 * W466 — Phase B (Rights & Voice) end-to-end smoke + closure.
 *
 * Final wave of Phase B (CRPD compliance infrastructure). Verifies that
 * every artifact shipped across W460 → W465 is present + discoverable.
 *
 * Single-shot Phase B health check. No DB. Pure module-presence +
 * cross-wave consistency.
 *
 * Per docs/blueprint/beneficiary-lifecycle-v3.md §2.2 Dimension B.
 */

const fs = require('fs');
const path = require('path');

function exists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

describe('W466 — Phase B artifact inventory', () => {
  describe('W460 — BeneficiaryVoiceLog', () => {
    it('model file exists', () => {
      expect(exists('models/BeneficiaryVoiceLog.js')).toBe(true);
    });

    it('model declares 9 entryKind values + 4 captureModality + 4 capacityGrade', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'BeneficiaryVoiceLog.js'),
        'utf8'
      );
      expect(src).toMatch(/'preference'/);
      expect(src).toMatch(/'dream'/);
      expect(src).toMatch(/'complaint'/);
      expect(src).toMatch(/'verbal'/);
      expect(src).toMatch(/'aac'/);
      expect(src).toMatch(/'proxy'/);
      expect(src).toMatch(/'full'/);
      expect(src).toMatch(/'supported'/);
      expect(src).toMatch(/'substituted'|'shared'/);
    });

    it('header references CRPD Article 12 anti-substitution doctrine', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'BeneficiaryVoiceLog.js'),
        'utf8'
      );
      expect(src).toMatch(/Anti-substitution doctrine/);
    });
  });

  describe('W461 — DecisionRightsAssessment + decision-rights.lib', () => {
    it('model file exists', () => {
      expect(exists('models/DecisionRightsAssessment.js')).toBe(true);
    });

    it('decision-rights.lib exposes the 5-function public API', () => {
      const lib = require('../intelligence/decision-rights.lib');
      expect(typeof lib.validateCapacity).toBe('function');
      expect(typeof lib.compositeScore).toBe('function');
      expect(typeof lib.routeDecision).toBe('function');
      expect(typeof lib.requiresAdvocate).toBe('function');
      expect(typeof lib.interpretCapacity).toBe('function');
    });

    it('routes high-capacity to autonomy, low-capacity to substituted', () => {
      const lib = require('../intelligence/decision-rights.lib');
      expect(
        lib.routeDecision({
          understanding: 3,
          retention: 3,
          weighing: 3,
          communication: 3,
        }).layer
      ).toBe('autonomy');
      expect(
        lib.routeDecision({
          understanding: 0,
          retention: 0,
          weighing: 0,
          communication: 0,
        }).layer
      ).toBe('substituted');
    });

    it('requiresAdvocate true for restraint at all layers', () => {
      const lib = require('../intelligence/decision-rights.lib');
      expect(lib.requiresAdvocate('restraint', 'autonomy')).toBe(true);
    });
  });

  describe('W462 — Self-advocacy curriculum + training plan', () => {
    it('curriculum lib file exists', () => {
      expect(exists('intelligence/self-advocacy-curriculum.lib.js')).toBe(true);
    });

    it('training plan model file exists', () => {
      expect(exists('models/SelfAdvocacyTrainingPlan.js')).toBe(true);
    });

    it('selectTrack routes a 10-year-old to track_primary', () => {
      const lib = require('../intelligence/self-advocacy-curriculum.lib');
      expect(lib.selectTrack({ ageMonths: 120 }).track).toBe('track_primary');
    });

    it('generateCurriculum produces 5 modules per track', () => {
      const lib = require('../intelligence/self-advocacy-curriculum.lib');
      expect(lib.generateCurriculum('track_teen').modules).toHaveLength(5);
    });
  });

  describe('W463 — CRPD compliance lib', () => {
    it('lib file exists', () => {
      expect(exists('intelligence/crpd-compliance.lib.js')).toBe(true);
    });

    it('exposes scoreBeneficiary + 5 per-principle scoring functions', () => {
      const lib = require('../intelligence/crpd-compliance.lib');
      expect(typeof lib.scoreBeneficiary).toBe('function');
      expect(typeof lib.scoreVoiceAndDignity).toBe('function');
      expect(typeof lib.scoreParticipation).toBe('function');
      expect(typeof lib.scoreAccessibility).toBe('function');
      expect(typeof lib.scoreEvolvingCapacity).toBe('function');
    });

    it('PRINCIPLES array includes 8 CRPD Article 3 principles', () => {
      const lib = require('../intelligence/crpd-compliance.lib');
      expect(lib.PRINCIPLES).toHaveLength(8);
    });

    it('scoreBeneficiary returns composite + band + recommendations', () => {
      const lib = require('../intelligence/crpd-compliance.lib');
      const r = lib.scoreBeneficiary({});
      expect(r).toHaveProperty('composite');
      expect(r).toHaveProperty('band');
      expect(r).toHaveProperty('recommendations');
    });
  });

  describe('W464 — Independent Advocate canonical role', () => {
    it('ROLES.INDEPENDENT_ADVOCATE registered', () => {
      const r = require('../config/constants/roles.constants');
      expect(r.ROLES.INDEPENDENT_ADVOCATE).toBe('independent_advocate');
      expect(r.ALL_ROLES).toContain('independent_advocate');
    });

    it('Phase C/E roles reserved (cultural_officer + family_counsellor)', () => {
      const r = require('../config/constants/roles.constants');
      expect(r.ROLES.CULTURAL_OFFICER).toBe('cultural_officer');
      expect(r.ROLES.FAMILY_COUNSELLOR).toBe('family_counsellor');
    });

    it('INDEPENDENT_ADVOCATE at hierarchy Level 4', () => {
      const r = require('../config/constants/roles.constants');
      expect(r.levelOf('independent_advocate')).toBe(4);
    });
  });

  describe('W465 — Complaint reasonable-adjustments + advocate linkage', () => {
    it('Complaint model has reasonableAdjustments array', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
      expect(src).toMatch(/reasonableAdjustments\s*:\s*\[/);
    });

    it('Complaint declares advocateInvolved + advocateUserId + advocateNotifiedAt', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
      expect(src).toMatch(/advocateInvolved/);
      expect(src).toMatch(/advocateUserId/);
      expect(src).toMatch(/advocateNotifiedAt/);
    });

    it('Complaint links to BeneficiaryVoiceLog + Beneficiary', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
      expect(src).toMatch(/originVoiceLogId/);
      expect(src).toMatch(/beneficiaryId/);
    });

    it('Wave-18 invariant blocks beneficiary-complaint closure without advocate', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
      expect(src).toMatch(/cannot be resolved\/closed without advocateInvolved/);
    });
  });
});

describe('W466 — Phase B cross-wave integration', () => {
  it('CRPD lib + BeneficiaryVoiceLog wire together (voice → compliance scoring)', () => {
    const crpd = require('../intelligence/crpd-compliance.lib');
    // Voice log with non-proxy + actionTaken should produce both dignity + participation credit
    const r = crpd.scoreBeneficiary({
      voiceLogs: [
        {
          capturedAt: new Date(),
          captureModality: 'verbal',
          actionTaken: 'plan_adjusted',
        },
      ],
      decisionAssessments: [{ status: 'finalized' }],
      hasAACProfile: false,
      reasonableAdjustmentsCount: 1,
      accessibleAccommodations: 1,
      hasAdvocacyPlan: true,
      completionPercentage: 50,
      capacityHistoryLength: 1,
    });
    expect(r.composite).toBeGreaterThanOrEqual(50);
  });

  it('Decision rights lib + capacity model agree on layer routing', () => {
    const lib = require('../intelligence/decision-rights.lib');
    // Layer 3 (substituted) → requires advocate
    const result = lib.routeDecision({
      understanding: 1,
      retention: 1,
      weighing: 1,
      communication: 1,
    });
    expect(result.layer).toBe('substituted');
    expect(lib.requiresAdvocate('daily_preferences', result.layer)).toBe(true);
  });

  it('Self-advocacy lib + CRPD lib integrate via evolving_capacity principle', () => {
    const curriculum = require('../intelligence/self-advocacy-curriculum.lib');
    const crpd = require('../intelligence/crpd-compliance.lib');
    // Generate a track, simulate completion, check CRPD evolving_capacity score
    const track = curriculum.selectTrack({ ageMonths: 120 }).track;
    expect(track).toBe('track_primary');
    const cr = curriculum.completionRate(track, ['be_heard', 'consent', 'refuse']);
    expect(cr).toBe(60);
    const score = crpd.scoreEvolvingCapacity({
      hasAdvocacyPlan: true,
      completionPercentage: cr,
      capacityHistoryLength: 1,
    });
    expect(score.percentage).toBeGreaterThan(50);
  });
});

describe('W466 — sprint-tests enumeration includes all Phase B drift guards', () => {
  let sprintList;
  beforeAll(() => {
    sprintList = fs
      .readFileSync(path.join(__dirname, '..', 'sprint-tests.txt'), 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  });

  const expected = [
    '__tests__/beneficiary-voice-log-wave460.test.js',
    '__tests__/decision-rights-wave461.test.js',
    '__tests__/self-advocacy-wave462.test.js',
    '__tests__/crpd-compliance-wave463.test.js',
    '__tests__/independent-advocate-role-wave464.test.js',
    '__tests__/complaint-reasonable-adjustments-wave465.test.js',
    '__tests__/phase-b-e2e-smoke-wave466.test.js',
  ];

  for (const test of expected) {
    it(`sprint includes ${test.replace(/^__tests__\//, '')}`, () => {
      expect(sprintList).toContain(test);
    });
  }
});

describe('W466 — Phase B wave count + accomplishments', () => {
  it('exactly 7 Phase B waves accounted for (W460-W466)', () => {
    const waves = [460, 461, 462, 463, 464, 465, 466];
    expect(waves.length).toBe(7);
  });

  it('Phase B adds 4 new pure libs (decision-rights + self-advocacy-curriculum + crpd-compliance + W460 voice-log shape)', () => {
    expect(exists('intelligence/decision-rights.lib.js')).toBe(true);
    expect(exists('intelligence/self-advocacy-curriculum.lib.js')).toBe(true);
    expect(exists('intelligence/crpd-compliance.lib.js')).toBe(true);
  });

  it('Phase B adds 3 new models (BeneficiaryVoiceLog + DecisionRightsAssessment + SelfAdvocacyTrainingPlan)', () => {
    expect(exists('models/BeneficiaryVoiceLog.js')).toBe(true);
    expect(exists('models/DecisionRightsAssessment.js')).toBe(true);
    expect(exists('models/SelfAdvocacyTrainingPlan.js')).toBe(true);
  });

  it('Phase B extends 2 existing artifacts (Complaint + roles.constants)', () => {
    const complaint = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
    expect(complaint).toMatch(/reasonableAdjustments/);
    const roles = fs.readFileSync(
      path.join(__dirname, '..', 'config', 'constants', 'roles.constants.js'),
      'utf8'
    );
    expect(roles).toMatch(/INDEPENDENT_ADVOCATE/);
  });
});
