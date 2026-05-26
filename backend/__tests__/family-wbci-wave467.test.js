'use strict';

/**
 * W467 drift guard — Family Wellbeing Composite Index (Phase C).
 *
 * Locks:
 *   • family-wbci.lib: 5-component weighted composite + helpers
 *     (inverseBurden / inverseFinancialStress / detectSustainedDecline /
 *     interpretWBCI)
 *   • FamilyWellbeingSnapshot model with 5-component subdoc + computed
 *     wbci/band/coverage/triggers + 6-band enum
 *   • Weights match v3 doc §6: 0.35 + 0.25 + 0.20 + 0.10 + 0.10 = 1.0
 *   • TRIGGER_THRESHOLD = 50, URGENT_THRESHOLD = 35
 *
 * Pure-lib + static analysis.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/family-wbci.lib');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'FamilyWellbeingSnapshot.js'),
  'utf8'
);

describe('W467 — family-wbci.lib surface', () => {
  it('exports public API', () => {
    expect(typeof lib.computeWBCI).toBe('function');
    expect(typeof lib.validateComponents).toBe('function');
    expect(typeof lib.inverseBurden).toBe('function');
    expect(typeof lib.inverseFinancialStress).toBe('function');
    expect(typeof lib.detectSustainedDecline).toBe('function');
    expect(typeof lib.interpretWBCI).toBe('function');
  });

  it('exposes COMPONENTS + thresholds', () => {
    expect(lib.COMPONENTS).toBeDefined();
    expect(Object.keys(lib.COMPONENTS)).toHaveLength(5);
    expect(lib.TRIGGER_THRESHOLD).toBe(50);
    expect(lib.URGENT_THRESHOLD).toBe(35);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('5 component weights sum to 1.0 (within float epsilon)', () => {
    const total = Object.values(lib.COMPONENTS).reduce((sum, c) => sum + c.weight, 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

  it('weights match v3 doc spec (0.35 + 0.25 + 0.20 + 0.10 + 0.10)', () => {
    expect(lib.COMPONENTS.caregiverBurdenInverse.weight).toBe(0.35);
    expect(lib.COMPONENTS.siblingAdjustment.weight).toBe(0.25);
    expect(lib.COMPONENTS.financialStressInverse.weight).toBe(0.2);
    expect(lib.COMPONENTS.extendedFamilyEngagement.weight).toBe(0.1);
    expect(lib.COMPONENTS.familyCommunicationHealth.weight).toBe(0.1);
  });

  it('every component has bilingual label (ar+en)', () => {
    for (const c of Object.values(lib.COMPONENTS)) {
      expect(typeof c.label.ar).toBe('string');
      expect(typeof c.label.en).toBe('string');
    }
  });
});

describe('W467 — inverseBurden (Zarit-22 → wellbeing)', () => {
  it('returns 100 for Zarit 0', () => {
    expect(lib.inverseBurden(0)).toBe(100);
  });
  it('returns ~0 for Zarit 88 (max)', () => {
    expect(lib.inverseBurden(88)).toBe(0);
  });
  it('returns ~50 for mid-Zarit 44', () => {
    expect(lib.inverseBurden(44)).toBe(50);
  });
  it('clamps Zarit out-of-range', () => {
    expect(lib.inverseBurden(-10)).toBe(100);
    expect(lib.inverseBurden(200)).toBe(0);
  });
  it('returns null for non-numeric', () => {
    expect(lib.inverseBurden('high')).toBeNull();
    expect(lib.inverseBurden(null)).toBeNull();
  });
});

describe('W467 — inverseFinancialStress (Likert 1-5 → wellbeing)', () => {
  it('returns 100 for stress 1 (no stress)', () => {
    expect(lib.inverseFinancialStress(1)).toBe(100);
  });
  it('returns 0 for stress 5 (max)', () => {
    expect(lib.inverseFinancialStress(5)).toBe(0);
  });
  it('returns 50 for stress 3 (mid)', () => {
    expect(lib.inverseFinancialStress(3)).toBe(50);
  });
});

describe('W467 — validateComponents', () => {
  it('accepts valid components', () => {
    const r = lib.validateComponents({
      caregiverBurdenInverse: 70,
      siblingAdjustment: 80,
      financialStressInverse: 60,
      extendedFamilyEngagement: 50,
      familyCommunicationHealth: 55,
    });
    expect(r.valid).toBe(true);
  });

  it('accepts partial (missing components as null)', () => {
    const r = lib.validateComponents({
      caregiverBurdenInverse: 70,
      siblingAdjustment: null,
    });
    expect(r.valid).toBe(true);
  });

  it('rejects out-of-range values', () => {
    const r = lib.validateComponents({ caregiverBurdenInverse: 150 });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.startsWith('OUT_OF_RANGE'))).toBe(true);
  });
});

describe('W467 — computeWBCI', () => {
  it('full coverage produces composite with 5 present components', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 70,
      siblingAdjustment: 80,
      financialStressInverse: 60,
      extendedFamilyEngagement: 50,
      familyCommunicationHealth: 55,
    });
    expect(r.wbci).toBeGreaterThan(0);
    expect(r.presentComponents).toBe(5);
    expect(r.coverage).toBe(100);
    expect(r.band).toMatch(/thriving|stable|monitor/);
  });

  it('partial coverage scales weights to present-only components', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 100,
      siblingAdjustment: 100,
    });
    // Only burden + sibling present. Both 100 → WBCI 100
    expect(r.wbci).toBe(100);
    expect(r.presentComponents).toBe(2);
    expect(r.coverage).toBe(40);
  });

  it('returns wbci=null on full empty input', () => {
    const r = lib.computeWBCI({});
    expect(r.wbci).toBeNull();
    expect(r.errors).toContain('NO_COMPONENTS');
  });

  it('returns wbci=null on invalid input', () => {
    const r = lib.computeWBCI({ caregiverBurdenInverse: 'high' });
    expect(r.wbci).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('produces "crisis" band for very low WBCI', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 10,
      siblingAdjustment: 10,
      financialStressInverse: 10,
      extendedFamilyEngagement: 10,
      familyCommunicationHealth: 10,
    });
    expect(r.band).toBe('crisis');
    expect(r.triggers.length).toBeGreaterThan(0);
    expect(r.triggers.some(t => t.priority === 'critical')).toBe(true);
  });

  it('produces "thriving" band for very high WBCI', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 95,
      siblingAdjustment: 95,
      financialStressInverse: 95,
      extendedFamilyEngagement: 95,
      familyCommunicationHealth: 95,
    });
    expect(r.band).toBe('thriving');
    expect(r.triggers).toEqual([]);
  });

  it('breakdown contains weight + contributed per component', () => {
    const r = lib.computeWBCI({ caregiverBurdenInverse: 60 });
    expect(r.breakdown.caregiverBurdenInverse).toMatchObject({
      score: 60,
      weight: 0.35,
      contributed: expect.any(Number),
    });
  });
});

describe('W467 — triggers logic', () => {
  it('triggers respite when caregiver burden < 40', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 20,
      siblingAdjustment: 80,
      financialStressInverse: 80,
      extendedFamilyEngagement: 80,
      familyCommunicationHealth: 80,
    });
    expect(r.triggers.some(t => t.action === 'respite_booking_offered')).toBe(true);
  });

  it('triggers financial review when financial stress score < 40', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 80,
      siblingAdjustment: 80,
      financialStressInverse: 20,
      extendedFamilyEngagement: 80,
      familyCommunicationHealth: 80,
    });
    expect(r.triggers.some(t => t.action === 'financial_navigation_review')).toBe(true);
  });

  it('triggers sibling referral when sibling adjustment < 40', () => {
    const r = lib.computeWBCI({
      caregiverBurdenInverse: 80,
      siblingAdjustment: 20,
      financialStressInverse: 80,
      extendedFamilyEngagement: 80,
      familyCommunicationHealth: 80,
    });
    expect(r.triggers.some(t => t.action === 'sibling_support_referral')).toBe(true);
  });
});

describe('W467 — detectSustainedDecline', () => {
  it('returns true when last 2 snapshots both < threshold', () => {
    const snaps = [
      { snapshotDate: new Date('2026-04-01'), wbci: 70 },
      { snapshotDate: new Date('2026-05-01'), wbci: 40 },
      { snapshotDate: new Date('2026-06-01'), wbci: 35 },
    ];
    expect(lib.detectSustainedDecline(snaps)).toBe(true);
  });

  it('returns false when only most-recent is low', () => {
    const snaps = [
      { snapshotDate: new Date('2026-04-01'), wbci: 70 },
      { snapshotDate: new Date('2026-05-01'), wbci: 65 },
      { snapshotDate: new Date('2026-06-01'), wbci: 30 },
    ];
    expect(lib.detectSustainedDecline(snaps)).toBe(false);
  });

  it('returns false with fewer than 2 snapshots', () => {
    expect(lib.detectSustainedDecline([])).toBe(false);
    expect(lib.detectSustainedDecline([{ snapshotDate: new Date(), wbci: 20 }])).toBe(false);
  });

  it('respects custom threshold', () => {
    const snaps = [
      { snapshotDate: new Date('2026-04-01'), wbci: 70 },
      { snapshotDate: new Date('2026-05-01'), wbci: 65 },
    ];
    expect(lib.detectSustainedDecline(snaps, 80)).toBe(true);
  });
});

describe('W467 — interpretWBCI', () => {
  it('returns bilingual narrative for thriving band', () => {
    const r = lib.interpretWBCI(85);
    expect(r.band).toBe('thriving');
    expect(r.ar).toMatch(/ممتازة|ازدهار/);
    expect(r.en).toMatch(/thriving/i);
  });

  it('returns crisis narrative for very low WBCI', () => {
    const r = lib.interpretWBCI(20);
    expect(r.band).toBe('crisis');
    expect(r.ar).toMatch(/أزمة|تواصل/);
    expect(r.en).toMatch(/Crisis|contact/i);
  });

  it('returns insufficient_data for null', () => {
    const r = lib.interpretWBCI(null);
    expect(r.band).toBe('insufficient_data');
  });
});

describe('W467 — FamilyWellbeingSnapshot model', () => {
  it('registers as model "FamilyWellbeingSnapshot"', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.FamilyWellbeingSnapshot\s*\|\|\s*mongoose\.model\(\s*['"]FamilyWellbeingSnapshot['"]/
    );
  });

  it('uses canonical collection family_wellbeing_snapshots', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]family_wellbeing_snapshots['"]/);
  });

  it('declares 4 snapshotType enum values', () => {
    expect(MODEL_SRC).toMatch(/'quarterly'/);
    expect(MODEL_SRC).toMatch(/'event_triggered'/);
    expect(MODEL_SRC).toMatch(/'manual'/);
    expect(MODEL_SRC).toMatch(/'intake'/);
  });

  it('declares 5-component subdoc with 0-100 bounds', () => {
    expect(MODEL_SRC).toMatch(/caregiverBurdenInverse\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
    expect(MODEL_SRC).toMatch(/siblingAdjustment\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
    expect(MODEL_SRC).toMatch(/financialStressInverse\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
    expect(MODEL_SRC).toMatch(/extendedFamilyEngagement\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
    expect(MODEL_SRC).toMatch(/familyCommunicationHealth\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares 6 band enum values', () => {
    expect(MODEL_SRC).toMatch(/'thriving'/);
    expect(MODEL_SRC).toMatch(/'stable'/);
    expect(MODEL_SRC).toMatch(/'monitor'/);
    expect(MODEL_SRC).toMatch(/'at_risk'/);
    expect(MODEL_SRC).toMatch(/'crisis'/);
    expect(MODEL_SRC).toMatch(/'insufficient_data'/);
  });

  it('declares triggeredActions subdoc with action + priority + reason', () => {
    expect(MODEL_SRC).toMatch(/triggeredActions\s*:\s*\[/);
    expect(MODEL_SRC).toMatch(/action\s*:[\s\S]+?priority\s*:[\s\S]+?reason/);
  });

  it('declares 3 sourceLinks (caregiverProgramId + siblingRecordId + financialPlanId)', () => {
    expect(MODEL_SRC).toMatch(/caregiverProgramId[\s\S]+?ref:\s*['"]CaregiverSupportProgram['"]/);
    expect(MODEL_SRC).toMatch(/siblingRecordId[\s\S]+?ref:\s*['"]SiblingAdjustmentRecord['"]/);
    expect(MODEL_SRC).toMatch(/financialPlanId[\s\S]+?ref:\s*['"]FinancialNavigationPlan['"]/);
  });

  it('declares 5 capturedByRole enum values including family_counsellor', () => {
    expect(MODEL_SRC).toMatch(/'family_counsellor'/);
    expect(MODEL_SRC).toMatch(/'social_worker'/);
    expect(MODEL_SRC).toMatch(/'case_manager'/);
    expect(MODEL_SRC).toMatch(/'system'/);
    expect(MODEL_SRC).toMatch(/'family_self_report'/);
  });

  it('pre-save recomputes wbci + band + triggers via family-wbci.lib', () => {
    expect(MODEL_SRC).toMatch(/require\(['"]\.\.\/intelligence\/family-wbci\.lib['"]\)/);
    expect(MODEL_SRC).toMatch(/lib\.computeWBCI/);
    expect(MODEL_SRC).toMatch(/this\.wbci\s*=\s*result\.wbci/);
    expect(MODEL_SRC).toMatch(/this\.band\s*=\s*result\.band/);
  });
});
