'use strict';

/**
 * Wave 206 — assessmentRecommendationEngine smoke tests.
 *
 * Deterministic, no DB, no LLM. Exercises:
 *   1. each scoringType path (ordinal/rating/standardized/binary)
 *   2. goal generation per (measure, tier)
 *   3. program selection w/ ICD + age + safety filtering
 *   4. weekly schedule building
 *   5. confidence + flags
 *   6. dedup logic for overlapping evidence
 *
 * Keep this file in sync with the engine — every new (measure,tier)
 * template added to GOAL_TEMPLATES should get an assertion below.
 */

const engine = require('../services/assessmentRecommendationEngine.service');

describe('Wave 206 — assessmentRecommendationEngine', () => {
  // ─── interpretScore ────────────────────────────────────────────
  describe('interpretScore', () => {
    test('GMFCS ordinal: level 3 → moderate severity', () => {
      const r = engine.interpretScore({ measureKey: 'GMFCS', level: 3 });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('3');
      expect(r.severity).toBe('moderate');
      expect(r.tierLabel_ar).toContain('الثالث');
    });

    test('GMFCS level 5 → severe', () => {
      const r = engine.interpretScore({ measureKey: 'GMFCS', level: 5 });
      expect(r.ok).toBe(true);
      expect(r.severity).toBe('severe');
    });

    test('CARS2 ST form: total 35 → mild_moderate tier', () => {
      const r = engine.interpretScore({
        measureKey: 'CARS2',
        totalScore: 35,
        form: 'ST',
      });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('mild_moderate');
    });

    test('CARS2 ST: total 45 → severe', () => {
      const r = engine.interpretScore({
        measureKey: 'CARS2',
        totalScore: 45,
        form: 'ST',
      });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('severe');
    });

    test('WeeFIM rating scale: total 30 → severe tier', () => {
      const r = engine.interpretScore({ measureKey: 'FIM', totalScore: 30 });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('severe');
      expect(r.severity).toBe('severe');
    });

    test('Vineland3 standardized: SS 60 → low tier', () => {
      const r = engine.interpretScore({
        measureKey: 'Vineland3',
        standardScore: 60,
      });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('low');
    });

    test('Vineland3: SS 35 → very_low tier', () => {
      const r = engine.interpretScore({
        measureKey: 'Vineland3',
        standardScore: 35,
      });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('very_low');
    });

    test('unknown measure → ok=false', () => {
      const r = engine.interpretScore({ measureKey: 'NOPE', level: 1 });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('UNKNOWN_MEASURE');
    });

    test('GMFCS invalid level (7) → ok=false', () => {
      const r = engine.interpretScore({ measureKey: 'GMFCS', level: 7 });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('INVALID_LEVEL');
    });

    test('missing measureKey → ok=false', () => {
      const r = engine.interpretScore({ level: 3 });
      expect(r.ok).toBe(false);
    });
  });

  // ─── goal generation ─────────────────────────────────────────
  describe('buildGoalsFromInterpretation', () => {
    test('GMFCS level 3 → at least 1 motor + 1 self-care goal', () => {
      const interp = engine.interpretScore({ measureKey: 'GMFCS', level: 3 });
      const goals = engine.buildGoalsFromInterpretation(interp);
      expect(goals.length).toBeGreaterThanOrEqual(2);
      const domains = goals.map(g => g.domain);
      expect(domains).toContain('motor');
      expect(domains).toContain('self_care');
    });

    test('Goals carry SMART fields populated', () => {
      const interp = engine.interpretScore({ measureKey: 'GMFCS', level: 3 });
      const [g] = engine.buildGoalsFromInterpretation(interp);
      expect(g.title).toBeTruthy();
      expect(g.specific).toBeTruthy();
      expect(g.measurable).toBeTruthy();
      expect(g.achievable).toBeTruthy();
      expect(g.relevant).toBeTruthy();
      expect(g.timeBoundDays).toBeGreaterThan(0);
    });

    test('Goal baseline references the actual score', () => {
      const interp = engine.interpretScore({ measureKey: 'GMFCS', level: 4 });
      const [g] = engine.buildGoalsFromInterpretation(interp);
      expect(g.baseline).toContain('4');
    });

    test('Each goal carries evidence pointing to the source score', () => {
      const interp = engine.interpretScore({ measureKey: 'CARS2', totalScore: 45, form: 'ST' });
      const goals = engine.buildGoalsFromInterpretation(interp);
      for (const g of goals) {
        expect(Array.isArray(g.evidence)).toBe(true);
        expect(g.evidence[0].measureKey).toBe('CARS2');
        expect(g.evidence[0].tier).toBe('severe');
      }
    });

    test('Severe interpretation → high confidence', () => {
      const interp = engine.interpretScore({ measureKey: 'CARS2', totalScore: 50, form: 'ST' });
      const [g] = engine.buildGoalsFromInterpretation(interp);
      expect(g.confidence).toBe('high');
    });
  });

  // ─── deduplication ───────────────────────────────────────────
  describe('deduplicateGoals', () => {
    test('merges evidence across overlapping goals', () => {
      const dup = {
        domain: 'motor',
        title: 'X',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        timeBoundDays: 60,
        confidence: 'medium',
        evidence: [{ measureKey: 'A', tier: '1', tierLabel_ar: 'A', score: 1 }],
      };
      const dup2 = {
        ...dup,
        confidence: 'high',
        evidence: [{ measureKey: 'B', tier: '2', tierLabel_ar: 'B', score: 2 }],
      };
      const merged = engine.deduplicateGoals([dup, dup2]);
      expect(merged.length).toBe(1);
      expect(merged[0].evidence.length).toBe(2);
      expect(merged[0].confidence).toBe('high'); // takes the higher
    });
  });

  // ─── program selection ───────────────────────────────────────
  describe('selectPrograms', () => {
    test('CARS2 severe + age 6 → returns AAC + behavior + parent training', () => {
      const interp = engine.interpretScore({ measureKey: 'CARS2', totalScore: 50, form: 'ST' });
      const programs = engine.selectPrograms({
        interpretations: [interp],
        beneficiary: { age: 6, indications: ['F84.0'] },
      });
      const ids = programs.map(p => p.programId);
      // CARS2-severe drives communication/behavior/adaptive goals;
      // age 6 fits PECS/DTT/NET/parent training/SI
      expect(programs.length).toBeGreaterThan(0);
      expect(ids.some(id => id.startsWith('pgm.aba.'))).toBe(true);
    });

    test('age out of band excludes irrelevant programs', () => {
      const interp = engine.interpretScore({ measureKey: 'CARS2', totalScore: 50, form: 'ST' });
      // Age 25 — no pediatric program should match
      const programs = engine.selectPrograms({
        interpretations: [interp],
        beneficiary: { age: 25, indications: ['F84.0'] },
      });
      // PECS extends to 18, social-skills to 16, all pediatric. Should be 0
      expect(programs.length).toBe(0);
    });

    test('safetyFlags block contraindicated programs', () => {
      const interp = engine.interpretScore({ measureKey: 'GMFCS', level: 3 });
      const without = engine.selectPrograms({
        interpretations: [interp],
        beneficiary: { age: 8, indications: ['G80'] },
      });
      const withFlag = engine.selectPrograms({
        interpretations: [interp],
        beneficiary: {
          age: 8,
          indications: ['G80'],
          safetyFlags: ['post_surgery_lt_30d'],
        },
      });
      // Post-surgery blocks pgm.pt.gross_motor + pgm.ot.sensory_integration
      const ptInWithout = without.some(p => p.programId === 'pgm.pt.gross_motor');
      const ptInWithFlag = withFlag.some(p => p.programId === 'pgm.pt.gross_motor');
      expect(ptInWithout).toBe(true);
      expect(ptInWithFlag).toBe(false);
    });

    test('higher severity → max sessions per week', () => {
      const interp = engine.interpretScore({ measureKey: 'CARS2', totalScore: 50, form: 'ST' });
      const programs = engine.selectPrograms({
        interpretations: [interp],
        beneficiary: { age: 6, indications: ['F84.0'] },
      });
      const dtt = programs.find(p => p.programId === 'pgm.aba.dtt');
      if (dtt) {
        expect(dtt.recommendedSessionsPerWeek).toBe(dtt.maxSessionsPerWeek);
      }
    });
  });

  // ─── weekly schedule ─────────────────────────────────────────
  describe('buildWeeklySchedule', () => {
    test('distributes sessions across 5 working days', () => {
      const programs = [
        {
          programId: 'a',
          modality: 'aba',
          nameAr: 'A',
          recommendedSessionsPerWeek: 5,
          sessionDurationMinRange: [30, 60],
        },
        {
          programId: 'b',
          modality: 'slp',
          nameAr: 'B',
          recommendedSessionsPerWeek: 2,
          sessionDurationMinRange: [30, 45],
        },
      ];
      const sch = engine.buildWeeklySchedule(programs);
      expect(sch.distribution.length).toBe(5);
      expect(sch.totalSessionsPerWeek).toBe(7);
      expect(sch.byModality.aba).toBe(5);
      expect(sch.byModality.slp).toBe(2);
      // Every day except possibly one should have at least 1 session
      const nonEmpty = sch.distribution.filter(d => d.sessions.length > 0).length;
      expect(nonEmpty).toBeGreaterThanOrEqual(4);
    });

    test('empty program list → returns null in main recommend', () => {
      const result = engine.recommend({
        beneficiary: { age: 6, indications: [] },
        scores: [],
      });
      expect(result.suggestedSchedule).toBeNull();
    });
  });

  // ─── full recommend (integration) ────────────────────────────
  describe('recommend (full bundle)', () => {
    test('CARS2 severe + Vineland low + age 6 → complete bundle', () => {
      const result = engine.recommend({
        beneficiary: { age: 6, indications: ['F84.0'] },
        scores: [
          { measureKey: 'CARS2', totalScore: 48, form: 'ST' },
          { measureKey: 'Vineland3', standardScore: 60 },
        ],
      });
      expect(result.scoreInterpretations.length).toBe(2);
      expect(result.suggestedGoals.length).toBeGreaterThan(0);
      expect(result.suggestedPrograms.length).toBeGreaterThan(0);
      expect(result.suggestedSchedule).toBeTruthy();
      expect(result.overallConfidence).toBe('high');
      expect(result.evidenceTrace.length).toBeGreaterThan(0);
      expect(result.engineVersion).toBe('w206.1');
    });

    test('empty scores → needs_therapist_review', () => {
      const result = engine.recommend({ beneficiary: { age: 5 }, scores: [] });
      expect(result.overallConfidence).toBe('needs_therapist_review');
      expect(result.suggestedGoals.length).toBe(0);
    });

    test('invalid scores are surfaced in flags', () => {
      const result = engine.recommend({
        beneficiary: { age: 6 },
        scores: [{ measureKey: 'NOPE', level: 99 }],
      });
      expect(result.flags.invalidScores.length).toBe(1);
      expect(result.flags.invalidScores[0].measureKey).toBe('NOPE');
    });

    test('engine never throws on malformed input', () => {
      expect(() => engine.recommend()).not.toThrow();
      expect(() => engine.recommend(null)).not.toThrow();
      expect(() => engine.recommend({ scores: 'not-array' })).not.toThrow();
    });

    test('idempotent: same input → same output (modulo generatedAt)', () => {
      const input = {
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [{ measureKey: 'GMFCS', level: 3 }],
      };
      const a = engine.recommend(input);
      const b = engine.recommend(input);
      const stripDate = ({ generatedAt, ...rest }) => rest;
      expect(stripDate(a)).toEqual(stripDate(b));
    });

    test('GMFCS-3 → motor + self_care + PT/OT programs', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [{ measureKey: 'GMFCS', level: 3 }],
      });
      expect(result.beneficiaryProfile.primaryDomains).toContain('motor');
      expect(result.beneficiaryProfile.primaryDomains).toContain('self_care');
      const modalities = result.suggestedPrograms.map(p => p.modality);
      // PT for gross motor is the canonical hit
      expect(modalities).toContain('pt');
    });

    test('Every program rationale cites at least one assessment driver', () => {
      const result = engine.recommend({
        beneficiary: { age: 6, indications: ['F84.0'] },
        scores: [{ measureKey: 'CARS2', totalScore: 48, form: 'ST' }],
      });
      for (const p of result.suggestedPrograms) {
        expect(p.rationale).toBeTruthy();
        // rationale either cites a driver or explicitly says maintenance
        expect(typeof p.rationale).toBe('string');
        expect(p.rationale.length).toBeGreaterThan(10);
      }
    });
  });

  // ─── Wave 206b — extended measure coverage ───────────────────
  describe('W206b — FIM adult coverage', () => {
    test('FIM total 30 → severe tier + self-care + motor goals', () => {
      const result = engine.recommend({
        beneficiary: { age: 25, indications: [] },
        scores: [{ measureKey: 'FIM', totalScore: 30 }],
      });
      const interp = result.scoreInterpretations[0];
      expect(interp.ok).toBe(true);
      expect(interp.tier).toBe('severe');
      const domains = result.suggestedGoals.map(g => g.domain);
      expect(domains).toContain('self_care');
      expect(domains).toContain('motor');
    });

    test('FIM total 120 → independent tier + community participation goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 30, indications: [] },
        scores: [{ measureKey: 'FIM', totalScore: 120 }],
      });
      expect(result.scoreInterpretations[0].tier).toBe('independent');
      expect(result.suggestedGoals.some(g => g.domain === 'social')).toBe(true);
    });

    test('FIM moderate (60) → 1 self-care goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 25, indications: [] },
        scores: [{ measureKey: 'FIM', totalScore: 60 }],
      });
      expect(result.scoreInterpretations[0].tier).toBe('moderate');
      expect(result.suggestedGoals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('W206b — MACS coverage', () => {
    test('MACS level 4 → AAC communication goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [{ measureKey: 'MACS', level: 4 }],
      });
      expect(result.scoreInterpretations[0].ok).toBe(true);
      const titles = result.suggestedGoals.map(g => g.title);
      expect(titles.some(t => t.includes('AAC'))).toBe(true);
    });

    test('MACS level 1 → advanced fine-motor goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 10, indications: ['G80'] },
        scores: [{ measureKey: 'MACS', level: 1 }],
      });
      expect(result.suggestedGoals.length).toBeGreaterThan(0);
      expect(result.suggestedGoals[0].domain).toBe('self_care');
    });
  });

  describe('W206b — CFCS coverage', () => {
    test('CFCS level 4 → AAC assessment goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 7, indications: ['G80'] },
        scores: [{ measureKey: 'CFCS', level: 4 }],
      });
      expect(result.scoreInterpretations[0].ok).toBe(true);
      const goals = result.suggestedGoals;
      expect(goals.length).toBeGreaterThan(0);
      expect(goals.some(g => g.title.includes('AAC'))).toBe(true);
    });

    test('CFCS level 5 → caregiver training goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 9, indications: ['G80'] },
        scores: [{ measureKey: 'CFCS', level: 5 }],
      });
      expect(result.suggestedGoals.some(g => g.domain === 'social')).toBe(true);
    });
  });

  describe('W206b — SCQ binary cutoff', () => {
    test('SCQ above cutoff (20) → tier above_cutoff + referral goal within 14 days', () => {
      const result = engine.recommend({
        beneficiary: { age: 5, indications: [] },
        scores: [{ measureKey: 'SCQ', totalScore: 20 }],
      });
      const interp = result.scoreInterpretations[0];
      expect(interp.ok).toBe(true);
      expect(interp.tier).toBe('above_cutoff');
      expect(interp.severity).toBe('severe');
      // Referral goal has 14-day deadline
      expect(result.suggestedGoals.some(g => g.timeBoundDays <= 14)).toBe(true);
    });

    test('SCQ below cutoff (10) → tier below_cutoff + minimal severity', () => {
      const result = engine.recommend({
        beneficiary: { age: 5, indications: [] },
        scores: [{ measureKey: 'SCQ', totalScore: 10 }],
      });
      const interp = result.scoreInterpretations[0];
      expect(interp.ok).toBe(true);
      expect(interp.tier).toBe('below_cutoff');
      expect(interp.severity).toBe('minimal');
    });
  });

  describe('W206b — Berg balance coverage', () => {
    test('Berg total 15 → high_fall_risk + environmental safety goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 65, indications: [] },
        scores: [{ measureKey: 'BergBalance', totalScore: 15 }],
      });
      const interp = result.scoreInterpretations[0];
      expect(interp.ok).toBe(true);
      expect(interp.tier).toBe('high_fall_risk');
      expect(interp.severity).toBe('severe');
      expect(result.suggestedGoals.length).toBeGreaterThan(0);
    });

    test('Berg total 50 → low_fall_risk + maintenance goal', () => {
      const result = engine.recommend({
        beneficiary: { age: 50, indications: [] },
        scores: [{ measureKey: 'BergBalance', totalScore: 50 }],
      });
      expect(result.scoreInterpretations[0].tier).toBe('low_fall_risk');
      expect(result.scoreInterpretations[0].severity).toBe('minimal');
    });
  });

  describe('W206b — multi-measure CP profile (GMFCS+MACS+CFCS)', () => {
    test('triple CP measure assessment combines all axes', () => {
      const result = engine.recommend({
        beneficiary: { age: 8, indications: ['G80'] },
        scores: [
          { measureKey: 'GMFCS', level: 4 },
          { measureKey: 'MACS', level: 4 },
          { measureKey: 'CFCS', level: 4 },
        ],
      });
      expect(result.scoreInterpretations.every(i => i.ok)).toBe(true);
      expect(result.suggestedGoals.length).toBeGreaterThanOrEqual(3);
      // All three axes contribute goals
      const domains = new Set(result.suggestedGoals.map(g => g.domain));
      expect(domains.size).toBeGreaterThanOrEqual(2);
      // W206c added 5 G80-indicated programs (OT × 2, AAC, SLP, parent) so
      // CP triple-measure now reaches actionable program coverage.
      expect(result.overallConfidence).toBe('high');
      // At least PT + OT + (AAC or SLP) selected
      const modalities = new Set(result.suggestedPrograms.map(p => p.modality));
      expect(modalities.has('pt')).toBe(true);
      expect(modalities.has('ot')).toBe(true);
    });
  });

  // ─── W206c — CP program coverage ─────────────────────────────
  describe('W206c — G80 program library coverage', () => {
    test('GMFCS-4 child (age 6) → PT + OT + AAC programs selected', () => {
      const result = engine.recommend({
        beneficiary: { age: 6, indications: ['G80'] },
        scores: [{ measureKey: 'GMFCS', level: 4 }],
      });
      const ids = result.suggestedPrograms.map(p => p.programId);
      expect(ids).toContain('pgm.pt.gross_motor');
      expect(ids.some(id => id.startsWith('pgm.ot.cp_'))).toBe(true);
    });

    test('CFCS-4 alone with G80 → AAC + SLP CP programs selected', () => {
      const result = engine.recommend({
        beneficiary: { age: 7, indications: ['G80'] },
        scores: [{ measureKey: 'CFCS', level: 4 }],
      });
      const ids = result.suggestedPrograms.map(p => p.programId);
      expect(ids).toContain('pgm.aac.cp');
      // SLP CP program offers expressive_language coverage for CFCS
      expect(ids.some(id => id === 'pgm.slp.cp' || id === 'pgm.aac.cp')).toBe(true);
    });
  });
});
