'use strict';

const PA = require('../../services/progress-analytics');

describe('ProgressAnalytics', () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. Cohen's d — Effect Size
  // ═══════════════════════════════════════════════════════════════
  describe('cohenD', () => {
    it('returns negligible for d < 0.2', () => {
      const r = PA.cohenD(50, 52, 15);
      expect(r.d).toBeCloseTo(0.13, 1);
      expect(r.interpretation).toBe('negligible');
      expect(r.direction).toBe('improvement');
    });

    it('returns small for 0.2 ≤ d < 0.5', () => {
      const r = PA.cohenD(50, 56, 15);
      expect(r.d).toBe(0.4);
      expect(r.interpretation).toBe('small');
    });

    it('returns medium for 0.5 ≤ d < 0.8', () => {
      const r = PA.cohenD(50, 60, 15);
      expect(r.d).toBeCloseTo(0.67, 1);
      expect(r.interpretation).toBe('medium');
    });

    it('returns large for 0.8 ≤ d < 1.2', () => {
      const r = PA.cohenD(50, 65, 15);
      expect(r.d).toBe(1);
      expect(r.interpretation).toBe('large');
    });

    it('returns very_large for d ≥ 1.2', () => {
      const r = PA.cohenD(50, 70, 15);
      expect(r.d).toBeCloseTo(1.33, 1);
      expect(r.interpretation).toBe('very_large');
    });

    it('handles sd=0 → no_effect', () => {
      const r = PA.cohenD(50, 60, 0);
      expect(r.d).toBe(0);
      expect(r.interpretation).toBe('no_effect');
    });

    it('detects decline (negative d)', () => {
      const r = PA.cohenD(70, 60, 15);
      expect(r.d).toBeCloseTo(-0.67, 1);
      expect(r.direction).toBe('decline');
    });

    it('no change → d=0, no_change', () => {
      const r = PA.cohenD(50, 50, 15);
      expect(r.d).toBe(0);
      expect(r.direction).toBe('no_change');
    });

    it('provides confidence interval', () => {
      const r = PA.cohenD(50, 65, 15);
      expect(r.confidence_interval_95.lower).toBeLessThan(r.d);
      expect(r.confidence_interval_95.upper).toBeGreaterThan(r.d);
    });

    it('provides Arabic clinical summary with تحسن', () => {
      const r = PA.cohenD(50, 65, 15);
      expect(r.clinical_summary_ar).toContain('تحسن');
    });

    it('provides Arabic clinical summary with تراجع for decline', () => {
      const r = PA.cohenD(70, 55, 15);
      expect(r.clinical_summary_ar).toContain('تراجع');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Reliable Change Index (RCI)
  // ═══════════════════════════════════════════════════════════════
  describe('reliableChangeIndex', () => {
    it('detects reliable improvement (rci ≥ 1.96)', () => {
      const r = PA.reliableChangeIndex(50, 70, 15, 0.9);
      expect(r.rci).toBeGreaterThanOrEqual(1.96);
      expect(r.reliable).toBe(true);
      expect(r.interpretation).toBe('reliable_improvement');
    });

    it('detects reliable deterioration (rci ≤ -1.96)', () => {
      const r = PA.reliableChangeIndex(70, 50, 15, 0.9);
      expect(r.rci).toBeLessThanOrEqual(-1.96);
      expect(r.reliable).toBe(true);
      expect(r.interpretation).toBe('reliable_deterioration');
    });

    it('detects no reliable change', () => {
      const r = PA.reliableChangeIndex(50, 52, 15, 0.9);
      expect(Math.abs(r.rci)).toBeLessThan(1.96);
      expect(r.reliable).toBe(false);
      expect(r.interpretation).toBe('no_reliable_change');
    });

    it('handles sdiff=0 (perfect reliability)', () => {
      const r = PA.reliableChangeIndex(50, 60, 15, 1);
      expect(r.rci).toBe(0);
      expect(r.reliable).toBe(false);
    });

    it('returns minimum_detectable_change', () => {
      const r = PA.reliableChangeIndex(50, 70, 15, 0.9);
      expect(r.minimum_detectable_change).toBeGreaterThan(0);
    });

    it('returns sem and sdiff', () => {
      const r = PA.reliableChangeIndex(50, 70, 15, 0.9);
      expect(r.sem).toBeGreaterThan(0);
      expect(r.sdiff).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Clinical Significance
  // ═══════════════════════════════════════════════════════════════
  describe('clinicalSignificance', () => {
    it('classifies as recovered (crossed cutoff + reliable improvement)', () => {
      const r = PA.clinicalSignificance(50, 95, {
        clinicalMean: 60,
        clinicalSD: 10,
        normativeMean: 100,
        normativeSD: 15,
        reliability: 0.9,
      });
      expect(r.category).toBe('recovered');
      expect(r.crossed_cutoff).toBe(true);
    });

    it('classifies as improved (reliable, no cutoff cross)', () => {
      const r = PA.clinicalSignificance(50, 70, {
        clinicalMean: 60,
        clinicalSD: 10,
        normativeMean: 100,
        normativeSD: 15,
        reliability: 0.9,
      });
      expect(r.category).toBe('improved');
    });

    it('classifies as unchanged', () => {
      const r = PA.clinicalSignificance(50, 52);
      expect(r.category).toBe('unchanged');
    });

    it('classifies as deteriorated', () => {
      const r = PA.clinicalSignificance(70, 40, { reliability: 0.9 });
      expect(r.category).toBe('deteriorated');
    });

    it('provides cutoff_c and zone info', () => {
      const r = PA.clinicalSignificance(50, 80);
      expect(r.cutoff_c).toBeGreaterThan(0);
      expect(r.pre_zone).toBeDefined();
      expect(r.post_zone).toBeDefined();
    });

    it('includes embedded rci result', () => {
      const r = PA.clinicalSignificance(50, 80);
      expect(r.rci).toBeDefined();
      expect(r.rci.rci).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Trend Analysis
  // ═══════════════════════════════════════════════════════════════
  describe('trendAnalysis', () => {
    it('returns insufficient_data for null', () => {
      expect(PA.trendAnalysis(null).trend).toBe('insufficient_data');
    });

    it('returns insufficient_data for < 2 points', () => {
      expect(PA.trendAnalysis([{ date: '2025-01-01', score: 50 }]).trend).toBe('insufficient_data');
    });

    it('detects strong improvement with high r²', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 60 },
        { date: '2025-03-01', score: 70 },
        { date: '2025-04-01', score: 80 },
      ];
      const r = PA.trendAnalysis(data);
      expect(r.trend).toMatch(/improvement/);
      expect(r.regression.slope).toBeGreaterThan(0);
      expect(r.total_change).toBe(30);
    });

    it('detects decline', () => {
      const data = [
        { date: '2025-01-01', score: 80 },
        { date: '2025-02-01', score: 70 },
        { date: '2025-03-01', score: 60 },
        { date: '2025-04-01', score: 50 },
      ];
      const r = PA.trendAnalysis(data);
      expect(r.trend).toMatch(/decline/);
      expect(r.regression.slope).toBeLessThan(0);
    });

    it('detects stable trend', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 50.01 },
        { date: '2025-03-01', score: 49.99 },
        { date: '2025-04-01', score: 50 },
      ];
      expect(PA.trendAnalysis(data).trend).toBe('stable');
    });

    it('includes regression stats', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-03-01', score: 70 },
      ];
      const r = PA.trendAnalysis(data);
      expect(r.regression).toHaveProperty('slope');
      expect(r.regression).toHaveProperty('intercept');
      expect(r.regression).toHaveProperty('r_squared');
      expect(r.regression).toHaveProperty('rate_per_month');
    });

    it('includes statistics', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 60 },
        { date: '2025-03-01', score: 55 },
      ];
      const r = PA.trendAnalysis(data);
      expect(r.statistics.n).toBe(3);
      expect(r.statistics.min).toBe(50);
      expect(r.statistics.max).toBe(60);
    });

    it('includes variability classification', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 60 },
      ];
      const r = PA.trendAnalysis(data);
      expect(r.variability).toBeDefined();
      expect(r.variability_ar).toBeDefined();
    });

    it('includes moving_average', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 60 },
        { date: '2025-03-01', score: 55 },
        { date: '2025-04-01', score: 65 },
      ];
      expect(PA.trendAnalysis(data).moving_average.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Predict Goal Attainment
  // ═══════════════════════════════════════════════════════════════
  describe('predictGoalAttainment', () => {
    it('already_achieved when current ≥ target', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-03-01', score: 80 },
      ];
      expect(PA.predictGoalAttainment(data, 75).prediction).toBe('already_achieved');
    });

    it('achievable with positive slope', () => {
      const data = [
        { date: '2025-01-01', score: 50 },
        { date: '2025-02-01', score: 60 },
        { date: '2025-03-01', score: 70 },
      ];
      const r = PA.predictGoalAttainment(data, 90);
      expect(r.prediction).toBe('achievable');
      expect(r.days_to_target).toBeGreaterThan(0);
      expect(r.predicted_date).toBeDefined();
      expect(r.confidence_percentage).toBeGreaterThanOrEqual(0);
    });

    it('not_achievable_current_rate for negative slope', () => {
      const data = [
        { date: '2025-01-01', score: 70 },
        { date: '2025-02-01', score: 65 },
        { date: '2025-03-01', score: 60 },
      ];
      expect(PA.predictGoalAttainment(data, 90).prediction).toBe('not_achievable_current_rate');
    });

    it('insufficient_data for single point', () => {
      expect(PA.predictGoalAttainment([{ date: '2025-01-01', score: 50 }], 90).prediction).toBe(
        'insufficient_data'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Benchmark
  // ═══════════════════════════════════════════════════════════════
  describe('benchmark', () => {
    it('compares vs normative and clinical groups', () => {
      const r = PA.benchmark(75, {
        normMean: 100,
        normSD: 15,
        clinicalGroupMean: 68,
        clinicalGroupSD: 12,
      });
      expect(r.vs_normative.z_score).toBeLessThan(0);
      expect(r.vs_clinical_group.z_score).toBeGreaterThan(0);
      expect(r.vs_normative.percentile).toBeDefined();
      expect(r.vs_clinical_group.percentile).toBeDefined();
    });

    it('includes age_group when provided', () => {
      const r = PA.benchmark(75, { ageGroupMean: 80 });
      expect(r.vs_age_group).toBeDefined();
      expect(r.vs_age_group.z_score).toBeDefined();
    });

    it('includes diagnosis_group when provided', () => {
      const r = PA.benchmark(75, { diagnosisGroupMean: 70 });
      expect(r.vs_diagnosis_group).toBeDefined();
    });

    it('uses defaults when no options', () => {
      const r = PA.benchmark(85);
      expect(r.current_score).toBe(85);
      expect(r.vs_normative).toBeDefined();
      expect(r.vs_clinical_group).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Generate Progress Report
  // ═══════════════════════════════════════════════════════════════
  describe('generateProgressReport', () => {
    it('generates comprehensive report with all sections', () => {
      const r = PA.generateProgressReport({
        beneficiaryName: 'أحمد',
        diagnosis: 'ASD',
        enrollmentDate: '2024-01-01',
        assessments: [
          { date: '2024-01-15', scores: { motor: 50, cognitive: 45 } },
          { date: '2024-04-15', scores: { motor: 65, cognitive: 55 } },
          { date: '2024-07-15', scores: { motor: 75, cognitive: 60 } },
        ],
        goals: [
          { name: 'Walking', baseline: 30, target: 80, current: 75 },
          { name: 'Speech', baseline: 20, target: 60, current: 62 },
        ],
        attendance: { attended: 40, total: 45 },
        behaviorData: [
          { date: '2024-01-15', frequency: 10 },
          { date: '2024-04-15', frequency: 7 },
          { date: '2024-07-15', frequency: 4 },
        ],
      });

      expect(r.beneficiary_name).toBe('أحمد');
      expect(r.domain_progress).toBeDefined();
      expect(r.domain_progress.motor).toBeDefined();
      expect(r.domain_progress.motor.effect_size.d).toBeGreaterThan(0);
      expect(r.goal_attainment.total_goals).toBe(2);
      expect(r.goal_attainment.achieved).toBe(1); // Speech 62 >= 60
      expect(r.attendance.rate).toBeCloseTo(89, 0);
      expect(r.behavior_trend).toBeDefined();
      expect(r.overall_summary).toBeDefined();
    });

    it('handles minimal data', () => {
      const r = PA.generateProgressReport({
        beneficiaryName: 'سارة',
        diagnosis: 'CP',
        enrollmentDate: '2025-01-01',
      });
      expect(r.beneficiary_name).toBe('سارة');
      expect(r.domain_progress).toBeUndefined();
      expect(r.goal_attainment).toBeUndefined();
    });

    it('handles single assessment → no domain_progress', () => {
      const r = PA.generateProgressReport({
        beneficiaryName: 'X',
        diagnosis: 'ASD',
        enrollmentDate: '2025-01-01',
        assessments: [{ date: '2025-01-15', scores: { motor: 50 } }],
      });
      expect(r.domain_progress).toBeUndefined();
    });

    it('goals all not-started', () => {
      const r = PA.generateProgressReport({
        beneficiaryName: 'X',
        diagnosis: 'ASD',
        enrollmentDate: '2025-01-01',
        goals: [
          { name: 'G1', baseline: 30, target: 80, current: 30 },
          { name: 'G2', baseline: 20, target: 60, current: 15 },
        ],
      });
      expect(r.goal_attainment.achieved).toBe(0);
      expect(r.goal_attainment.not_started).toBe(2);
    });

    it('behavior trend with increasing frequency shows مراجعة', () => {
      const r = PA.generateProgressReport({
        beneficiaryName: 'X',
        diagnosis: 'ASD',
        enrollmentDate: '2025-01-01',
        behaviorData: [
          { date: '2025-01-01', frequency: 4 },
          { date: '2025-02-01', frequency: 7 },
          { date: '2025-03-01', frequency: 10 },
        ],
      });
      expect(r.behavior_trend.behavior_interpretation_ar).toContain('مراجعة');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Therapeutic ROI
  // ═══════════════════════════════════════════════════════════════
  describe('therapeuticROI', () => {
    it('calculates excellent ROI for large effect', () => {
      const r = PA.therapeuticROI({
        totalCost: 10000,
        totalSessions: 20,
        preScore: 50,
        postScore: 65,
      });
      expect(r.cost_per_session).toBe(500);
      expect(r.improvement_points).toBe(15);
      expect(r.cost_per_point).toBe(667);
      expect(r.effect_size.d).toBe(1);
      expect(r.cost_effectiveness.rating).toBe('excellent');
    });

    it('needs_review for zero improvement', () => {
      const r = PA.therapeuticROI({
        totalCost: 5000,
        totalSessions: 10,
        preScore: 50,
        postScore: 50,
      });
      expect(r.improvement_points).toBe(0);
      expect(r.cost_per_point).toBeNull();
      expect(r.cost_effectiveness.rating).toBe('needs_review');
    });

    it('handles zero sessions', () => {
      const r = PA.therapeuticROI({
        totalCost: 0,
        totalSessions: 0,
        preScore: 50,
        postScore: 65,
      });
      expect(r.cost_per_session).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. Helpers
  // ═══════════════════════════════════════════════════════════════
  describe('_zToPercentile', () => {
    it('z=0 ≈ 50th', () => {
      expect(PA._zToPercentile(0)).toBeCloseTo(50, 0);
    });

    it('z=1.96 ≈ 97.5th', () => {
      expect(PA._zToPercentile(1.96)).toBeCloseTo(97.5, 0);
    });

    it('z=-1.96 ≈ 2.5th', () => {
      expect(PA._zToPercentile(-1.96)).toBeCloseTo(2.5, 0);
    });
  });

  describe('_monthsBetween', () => {
    it('calculates months between two dates', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-07-01');
      expect(PA._monthsBetween(d1, d2)).toBeCloseTo(6, 0);
    });
  });
});
