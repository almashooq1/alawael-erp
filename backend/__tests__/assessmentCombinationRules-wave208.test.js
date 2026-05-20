'use strict';

/**
 * Wave 208 — combination-rule unit tests + integration via engine.
 */

const rules = require('../services/assessmentCombinationRules.service');
const engine = require('../services/assessmentRecommendationEngine.service');

function interp(measureKey, tier, extras = {}) {
  return {
    ok: true,
    measureKey,
    tier,
    tierLabel_ar: `${measureKey}-${tier}`,
    severity: 'severe',
    score: 0,
    measureNameAr: measureKey,
    ...extras,
  };
}

describe('Wave 208 — assessmentCombinationRules', () => {
  describe('applyCombinationRules — predicate logic', () => {
    test('no interpretations → no rules fire', () => {
      const r = rules.applyCombinationRules([]);
      expect(r.matchedRules).toHaveLength(0);
      expect(r.goals).toHaveLength(0);
    });

    test('R1 fires for GMFCS-4 + CFCS-5', () => {
      const r = rules.applyCombinationRules([interp('GMFCS', '4'), interp('CFCS', '5')]);
      const matched = r.matchedRules.find(m => m.ruleId === 'R1_CP_NONAMB_NONCOMM');
      expect(matched).toBeTruthy();
      expect(matched.severity).toBe('CRITICAL');
      expect(r.goals.some(g => g.combinationRule === 'R1_CP_NONAMB_NONCOMM')).toBe(true);
    });

    test('R1 does NOT fire for GMFCS-3 + CFCS-5', () => {
      const r = rules.applyCombinationRules([interp('GMFCS', '3'), interp('CFCS', '5')]);
      expect(r.matchedRules.find(m => m.ruleId === 'R1_CP_NONAMB_NONCOMM')).toBeFalsy();
    });

    test('R2 fires for SCQ above_cutoff + Vineland very_low', () => {
      const r = rules.applyCombinationRules([
        interp('SCQ', 'above_cutoff'),
        interp('Vineland3', 'very_low'),
      ]);
      const matched = r.matchedRules.find(m => m.ruleId === 'R2_EARLY_INTENSIVE_AUTISM');
      expect(matched).toBeTruthy();
      expect(r.goals.some(g => g.title.includes('ABA'))).toBe(true);
    });

    test('R2 fires for CARS2 severe + Vineland low', () => {
      const r = rules.applyCombinationRules([
        interp('CARS2', 'severe'),
        interp('Vineland3', 'low'),
      ]);
      expect(r.matchedRules.find(m => m.ruleId === 'R2_EARLY_INTENSIVE_AUTISM')).toBeTruthy();
    });

    test('R3 fires for MACS-3 + CFCS-4', () => {
      const r = rules.applyCombinationRules([interp('MACS', '3'), interp('CFCS', '4')]);
      expect(r.matchedRules.find(m => m.ruleId === 'R3_MACS_CFCS_DUAL')).toBeTruthy();
    });

    test('R4 fires for FIM moderate + CSI high', () => {
      const r = rules.applyCombinationRules([interp('FIM', 'moderate'), interp('CSI', 'high')]);
      expect(r.matchedRules.find(m => m.ruleId === 'R4_FIM_MOD_CSI_HIGH')).toBeTruthy();
    });

    test('R5 fires for Berg high_fall_risk + CFCS-3', () => {
      const r = rules.applyCombinationRules([
        interp('BergBalance', 'high_fall_risk'),
        interp('CFCS', '3'),
      ]);
      expect(r.matchedRules.find(m => m.ruleId === 'R5_BERG_HIGH_COGNITIVE')).toBeTruthy();
    });

    test('multiple rules can fire on one assessment', () => {
      const r = rules.applyCombinationRules([
        interp('GMFCS', '5'),
        interp('CFCS', '5'),
        interp('MACS', '4'),
      ]);
      // Both R1 (GMFCS+CFCS) and R3 (MACS+CFCS) should fire
      expect(r.matchedRules.find(m => m.ruleId === 'R1_CP_NONAMB_NONCOMM')).toBeTruthy();
      expect(r.matchedRules.find(m => m.ruleId === 'R3_MACS_CFCS_DUAL')).toBeTruthy();
    });

    test('predicate exception is swallowed (no rule fires, no crash)', () => {
      // Inject a malformed interpretation that has tier=null
      const r = rules.applyCombinationRules([
        { ok: true, measureKey: 'GMFCS', tier: null },
        { ok: false, measureKey: 'CFCS', reason: 'INVALID_LEVEL' },
      ]);
      // tierNum returns null → R1 predicate returns false cleanly
      expect(r.matchedRules).toHaveLength(0);
    });

    test('all combination goals carry evidence trace from interpretations', () => {
      const r = rules.applyCombinationRules([interp('GMFCS', '5'), interp('CFCS', '5')]);
      for (const g of r.goals) {
        expect(Array.isArray(g.evidence)).toBe(true);
        expect(g.evidence.length).toBeGreaterThan(0);
      }
    });
  });

  describe('engine integration', () => {
    test('engine.recommend includes matchedCombinationRules in output', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [
          { measureKey: 'GMFCS', level: 5 },
          { measureKey: 'CFCS', level: 5 },
        ],
      });
      expect(result.engineVersion).toBe('w208.1');
      expect(Array.isArray(result.matchedCombinationRules)).toBe(true);
      expect(result.matchedCombinationRules.length).toBeGreaterThan(0);
      expect(result.matchedCombinationRules[0].ruleId).toBe('R1_CP_NONAMB_NONCOMM');
    });

    test('combination goals appear in suggestedGoals with combinationRule field', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [
          { measureKey: 'GMFCS', level: 5 },
          { measureKey: 'CFCS', level: 5 },
        ],
      });
      const combo = result.suggestedGoals.filter(g => g.combinationRule);
      expect(combo.length).toBeGreaterThan(0);
      expect(combo[0].combinationRule).toBe('R1_CP_NONAMB_NONCOMM');
    });

    test('engine still works when zero combination rules fire', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [{ measureKey: 'GMFCS', level: 1 }], // only one measure, no combos
      });
      expect(result.matchedCombinationRules).toEqual([]);
      // Regular GMFCS-1 template still fires
      expect(result.suggestedGoals.length).toBeGreaterThan(0);
    });

    test('engine empty scores → empty matchedCombinationRules', () => {
      const result = engine.recommend({ beneficiary: { age: 5 }, scores: [] });
      expect(result.matchedCombinationRules).toEqual([]);
    });
  });
});
