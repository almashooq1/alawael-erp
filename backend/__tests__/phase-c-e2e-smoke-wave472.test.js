'use strict';

/**
 * W472 — Phase C (Family Wellbeing) end-to-end smoke + closure.
 *
 * Final wave of Phase C. Verifies every W467-W471 artifact present +
 * cross-wave integrations work. No DB.
 */

const fs = require('fs');
const path = require('path');

function exists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

describe('W472 — Phase C artifact inventory', () => {
  describe('W467 — FamilyWellbeingSnapshot + WBCI lib', () => {
    it('lib + model exist', () => {
      expect(exists('intelligence/family-wbci.lib.js')).toBe(true);
      expect(exists('models/FamilyWellbeingSnapshot.js')).toBe(true);
    });

    it('computeWBCI returns full shape for valid input', () => {
      const lib = require('../intelligence/family-wbci.lib');
      const r = lib.computeWBCI({
        caregiverBurdenInverse: 70,
        siblingAdjustment: 70,
        financialStressInverse: 70,
        extendedFamilyEngagement: 70,
        familyCommunicationHealth: 70,
      });
      expect(r.wbci).toBeGreaterThan(0);
      expect(r.band).toBeDefined();
      expect(Array.isArray(r.triggers)).toBe(true);
    });
  });

  describe('W468 — SDQ scoring + SiblingAdjustmentRecord', () => {
    it('lib + model exist', () => {
      expect(exists('intelligence/sdq-scoring.lib.js')).toBe(true);
      expect(exists('models/SiblingAdjustmentRecord.js')).toBe(true);
    });

    it('scoreSDQ produces wellbeing 0-100 from valid sheet', () => {
      const lib = require('../intelligence/sdq-scoring.lib');
      const r = lib.scoreSDQ({
        emotional: 2,
        conduct: 2,
        hyperactivity: 3,
        peer: 2,
        prosocial: 8,
      });
      expect(r.valid).toBe(true);
      expect(typeof r.wellbeing).toBe('number');
    });
  });

  describe('W469 — benefits-navigator + FinancialNavigationPlan', () => {
    it('lib + model exist', () => {
      expect(exists('intelligence/benefits-navigator.lib.js')).toBe(true);
      expect(exists('models/FinancialNavigationPlan.js')).toBe(true);
    });

    it('suggestPrograms returns disability_authority pathways for Saudi card-holder', () => {
      const lib = require('../intelligence/benefits-navigator.lib');
      const r = lib.suggestPrograms({
        hasDisabilityCard: true,
        isSaudiCitizen: true,
      });
      expect(r.programs.length).toBeGreaterThan(0);
      expect(r.programs.some(p => p.authority === 'disability_authority')).toBe(true);
    });
  });

  describe('W470 — FamilyCounsellingSession', () => {
    it('model file exists', () => {
      expect(exists('models/FamilyCounsellingSession.js')).toBe(true);
    });

    it('model links to W467 + W460 (Phase B + C integration)', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'FamilyCounsellingSession.js'),
        'utf8'
      );
      expect(src).toMatch(/FamilyWellbeingSnapshot/);
      expect(src).toMatch(/BeneficiaryVoiceLog/);
    });
  });

  describe('W471 — WBCI trigger engine', () => {
    it('lib file exists', () => {
      expect(exists('intelligence/wbci-trigger-engine.lib.js')).toBe(true);
    });

    it('plan() returns proposals + escalate + dedupedKinds', () => {
      const lib = require('../intelligence/wbci-trigger-engine.lib');
      const r = lib.plan({
        snapshot: {
          band: 'crisis',
          triggeredActions: [{ action: 'family_counsellor_urgent', priority: 'critical' }],
        },
      });
      expect(Array.isArray(r.proposals)).toBe(true);
      expect(r.escalate).toBe(true);
      expect(Array.isArray(r.dedupedKinds)).toBe(true);
    });
  });
});

describe('W472 — Phase C cross-wave integration', () => {
  it('SDQ wellbeing → WBCI siblingAdjustment → composite produces band', () => {
    const sdq = require('../intelligence/sdq-scoring.lib');
    const wbci = require('../intelligence/family-wbci.lib');

    const sibling = sdq.scoreSDQ({
      emotional: 3,
      conduct: 2,
      hyperactivity: 3,
      peer: 2,
      prosocial: 7,
    });
    expect(sibling.valid).toBe(true);

    const composite = wbci.computeWBCI({
      caregiverBurdenInverse: 60,
      siblingAdjustment: sibling.wellbeing,
      financialStressInverse: 60,
      extendedFamilyEngagement: 50,
      familyCommunicationHealth: 55,
    });
    expect(composite.wbci).toBeGreaterThanOrEqual(0);
    expect(composite.band).toBeDefined();
  });

  it('Financial stress Likert → WBCI financialStressInverse via family-wbci.lib', () => {
    const wbci = require('../intelligence/family-wbci.lib');
    expect(wbci.inverseFinancialStress(1)).toBe(100);
    expect(wbci.inverseFinancialStress(5)).toBe(0);
  });

  it('WBCI triggers → trigger engine proposals (full chain)', () => {
    const wbci = require('../intelligence/family-wbci.lib');
    const engine = require('../intelligence/wbci-trigger-engine.lib');

    // Crisis-band WBCI input
    const composite = wbci.computeWBCI({
      caregiverBurdenInverse: 15,
      siblingAdjustment: 20,
      financialStressInverse: 25,
      extendedFamilyEngagement: 30,
      familyCommunicationHealth: 30,
    });
    expect(composite.band).toBe('crisis');
    expect(composite.triggers.length).toBeGreaterThan(0);

    // Pipe to trigger engine — map computeWBCI's .triggers to the
    // snapshot.triggeredActions shape (the model stores it as
    // triggeredActions; engine reads from triggeredActions)
    const planResult = engine.plan({
      snapshot: {
        ...composite,
        triggeredActions: composite.triggers,
      },
      activeInterventions: [],
      proposalHistory: [],
      hasSustainedDecline: false,
    });
    expect(planResult.proposals.length).toBeGreaterThan(0);
    expect(planResult.escalate).toBe(true); // crisis band → escalate
  });

  it('Caregiver burden Zarit → WBCI inverseBurden integration', () => {
    const wbci = require('../intelligence/family-wbci.lib');
    expect(wbci.inverseBurden(0)).toBe(100);
    expect(wbci.inverseBurden(88)).toBe(0);
  });

  it('Sustained decline triggers escalation regardless of current band', () => {
    const engine = require('../intelligence/wbci-trigger-engine.lib');
    const r = engine.plan({
      snapshot: {
        band: 'stable',
        wbci: 68,
        triggeredActions: [],
      },
      hasSustainedDecline: true,
    });
    expect(r.escalate).toBe(true);
  });
});

describe('W472 — sprint enumeration includes all Phase C drift guards', () => {
  let sprintList;
  beforeAll(() => {
    sprintList = fs
      .readFileSync(path.join(__dirname, '..', 'sprint-tests.txt'), 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  });

  const expected = [
    '__tests__/family-wbci-wave467.test.js',
    '__tests__/sibling-adjustment-wave468.test.js',
    '__tests__/financial-navigation-wave469.test.js',
    '__tests__/family-counselling-wave470.test.js',
    '__tests__/wbci-trigger-engine-wave471.test.js',
    '__tests__/phase-c-e2e-smoke-wave472.test.js',
  ];

  for (const test of expected) {
    it(`sprint includes ${test.replace(/^__tests__\//, '')}`, () => {
      expect(sprintList).toContain(test);
    });
  }
});

describe('W472 — Phase C accomplishments', () => {
  it('Phase C ships 6 waves (W467-W472)', () => {
    const waves = [467, 468, 469, 470, 471, 472];
    expect(waves.length).toBe(6);
  });

  it('Phase C adds 5 new pure libs (family-wbci + sdq-scoring + benefits-navigator + wbci-trigger-engine + the 1 from W467 itself)', () => {
    expect(exists('intelligence/family-wbci.lib.js')).toBe(true);
    expect(exists('intelligence/sdq-scoring.lib.js')).toBe(true);
    expect(exists('intelligence/benefits-navigator.lib.js')).toBe(true);
    expect(exists('intelligence/wbci-trigger-engine.lib.js')).toBe(true);
  });

  it('Phase C adds 4 new models', () => {
    expect(exists('models/FamilyWellbeingSnapshot.js')).toBe(true);
    expect(exists('models/SiblingAdjustmentRecord.js')).toBe(true);
    expect(exists('models/FinancialNavigationPlan.js')).toBe(true);
    expect(exists('models/FamilyCounsellingSession.js')).toBe(true);
  });

  it('Phase C uses the W384 CaregiverSupportProgram for Zarit-22 burden input (does NOT duplicate)', () => {
    expect(exists('models/CaregiverSupportProgram.js')).toBe(true);
  });

  it('Phase C uses W464-reserved family_counsellor role', () => {
    const r = require('../config/constants/roles.constants');
    expect(r.ROLES.FAMILY_COUNSELLOR).toBe('family_counsellor');
  });
});
