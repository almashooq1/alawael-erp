'use strict';

const CDS = require('../../services/clinical-decision-support');

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('ClinicalDecisionSupport', () => {
  /* ─── getProtocol ──────────────────────────────────────────────────────── */
  describe('getProtocol', () => {
    test('returns found:true for known diagnosis (autism)', () => {
      const r = CDS.getProtocol('autism', 48);
      expect(r.found).toBe(true);
      expect(r.recommended_services).toBeDefined();
      expect(r.recommended_services.length).toBeGreaterThan(0);
      expect(r.review_schedule).toBeDefined();
    });

    test('returns found:false for unknown diagnosis', () => {
      const r = CDS.getProtocol('unknown_diagnosis', 48);
      expect(r.found).toBe(false);
      expect(r.message_ar).toBeDefined();
      expect(r.suggested_services).toBeDefined();
    });

    test('returns protocol for all 7 supported diagnoses', () => {
      const diagnoses = [
        'autism',
        'intellectual_disability',
        'cerebral_palsy',
        'down_syndrome',
        'adhd',
        'hearing_impairment',
        'learning_disability',
      ];
      for (const d of diagnoses) {
        const r = CDS.getProtocol(d, 48);
        expect(r.found).toBe(true);
      }
    });

    test('includes estimated_weekly_hours and review_dates', () => {
      const r = CDS.getProtocol('autism', 48);
      expect(typeof r.estimated_weekly_hours).toBe('number');
      expect(Array.isArray(r.review_dates)).toBe(true);
    });

    test('includes assessment_battery array', () => {
      const r = CDS.getProtocol('cerebral_palsy', 36);
      expect(Array.isArray(r.assessment_battery)).toBe(true);
      expect(r.assessment_battery.length).toBeGreaterThan(0);
    });

    test('severe severity may increase service intensity', () => {
      const moderate = CDS.getProtocol('autism', 48, 'moderate');
      const severe = CDS.getProtocol('autism', 48, 'severe');
      expect(severe.estimated_weekly_hours).toBeGreaterThanOrEqual(moderate.estimated_weekly_hours);
    });
  });

  /* ─── getRecommendedAssessments ────────────────────────────────────────── */
  describe('getRecommendedAssessments', () => {
    test('returns assessments for infant with autism', () => {
      const r = CDS.getRecommendedAssessments(12, 'autism');
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThan(0);
    });

    test('returns assessments for preschool age', () => {
      const r = CDS.getRecommendedAssessments(48, 'intellectual_disability');
      expect(r.length).toBeGreaterThan(0);
    });

    test('returns assessments for school age', () => {
      const r = CDS.getRecommendedAssessments(96, 'adhd');
      expect(r.length).toBeGreaterThan(0);
    });

    test('returns assessments for adolescent (12+)', () => {
      const r = CDS.getRecommendedAssessments(156, 'autism');
      expect(r.length).toBeGreaterThan(0);
      expect(r).toContain('Transition Readiness');
    });

    test('always includes Family Needs Survey and Caregiver Burden Scale', () => {
      const r = CDS.getRecommendedAssessments(48, 'default');
      expect(r).toContain('Family Needs Survey');
      expect(r).toContain('Caregiver Burden Scale');
    });

    test('returns default when diagnosis not in age band', () => {
      const r = CDS.getRecommendedAssessments(48, 'nonexistent_diagnosis');
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThan(0);
    });
  });

  /* ─── generateGoalRecommendations ──────────────────────────────────────── */
  describe('generateGoalRecommendations', () => {
    test('returns empty array for empty input', () => {
      expect(CDS.generateGoalRecommendations({})).toEqual([]);
    });

    test('generates goals from Vineland-3 low domains', () => {
      const r = CDS.generateGoalRecommendations({
        vineland3: {
          standard_scores: {
            communication: 60,
            daily_living: 90,
            socialization: 55,
            motor: 95,
          },
        },
      });
      expect(r.length).toBeGreaterThan(0);
      const domains = r.map(g => g.domain);
      expect(domains).toContain('communication');
      expect(domains).toContain('socialization');
    });

    test('generates goals from CARS-2 severe classification', () => {
      const r = CDS.generateGoalRecommendations({
        cars2: {
          classification: 'severe',
          pattern_analysis: {
            highest_concern_items: [{ item_name_ar: 'التواصل', score: 3.5 }],
          },
        },
      });
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].domain).toBe('autism_specific');
    });

    test('generates goals from SRS-2 with severe classification', () => {
      const r = CDS.generateGoalRecommendations({
        srs2: {
          severity_classification: 'severe',
          auto_recommendations: { priority_areas: ['تحسين التفاعل الاجتماعي'] },
        },
      });
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].domain).toBe('social');
      expect(r[0].priority).toBe('critical');
    });

    test('generates goals from BRIEF-2 primary concerns', () => {
      const r = CDS.generateGoalRecommendations({
        brief2: {
          clinical_interpretation: { primary_concerns: ['الذاكرة العاملة', 'التخطيط'] },
        },
      });
      expect(r).toHaveLength(2);
      expect(r[0].domain).toBe('executive_function');
    });

    test('generates goal from Sensory Profile', () => {
      const r = CDS.generateGoalRecommendations({
        sensoryProfile: {
          sensory_profile_summary: {
            therapy_recommendations: ['تكامل حسي'],
            dominant_quadrant_ar: 'مقاوم',
          },
        },
      });
      expect(r).toHaveLength(1);
      expect(r[0].domain).toBe('sensory');
    });

    test('sorts recommendations by priority order', () => {
      const r = CDS.generateGoalRecommendations({
        vineland3: {
          standard_scores: {
            communication: 50,
            daily_living: 50,
            socialization: 50,
            motor: 50,
          },
        },
        srs2: {
          severity_classification: 'severe',
          auto_recommendations: { priority_areas: ['area1'] },
        },
      });
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < r.length; i++) {
        expect(order[r[i].priority] ?? 3).toBeGreaterThanOrEqual(order[r[i - 1].priority] ?? 3);
      }
    });
  });

  /* ─── checkRisks ───────────────────────────────────────────────────────── */
  describe('checkRisks', () => {
    test('detects REGRESSION_DETECTED (>15% decline)', () => {
      const alerts = CDS.checkRisks({
        currentAssessment: { total_score: 70 },
        previousAssessment: { total_score: 85 },
      });
      const reg = alerts.find(a => a.rule_id === 'REGRESSION_DETECTED');
      expect(reg).toBeDefined();
      expect(reg.severity).toBe('high');
    });

    test('detects MISSED_SESSIONS (<75% attendance)', () => {
      const alerts = CDS.checkRisks({
        attendance: { attended: 5, total: 10 },
      });
      const missed = alerts.find(a => a.rule_id === 'MISSED_SESSIONS');
      expect(missed).toBeDefined();
    });

    test('detects BEHAVIOR_ESCALATION (>50% increase)', () => {
      const older = Array.from({ length: 7 }, () => ({ frequency: 2 }));
      const recent = Array.from({ length: 7 }, () => ({ frequency: 5 }));
      const alerts = CDS.checkRisks({
        behaviorData: [...older, ...recent],
      });
      const esc = alerts.find(a => a.rule_id === 'BEHAVIOR_ESCALATION');
      expect(esc).toBeDefined();
      expect(esc.severity).toBe('high');
    });

    test('detects DROPOUT_RISK (missedLastWeek >= 3)', () => {
      const alerts = CDS.checkRisks({
        missedLastWeek: 4,
        parentSatisfaction: 4,
        progressPercentage: 50,
        monthsEnrolled: 2,
      });
      const dropout = alerts.find(a => a.rule_id === 'DROPOUT_RISK');
      expect(dropout).toBeDefined();
    });

    test('detects MEDICATION_REVIEW (>= 3 months since last review)', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 4);
      const alerts = CDS.checkRisks({
        medication: { lastReviewDate: oldDate.toISOString() },
      });
      const med = alerts.find(a => a.rule_id === 'MEDICATION_REVIEW');
      expect(med).toBeDefined();
      expect(med.severity).toBe('low');
    });

    test('returns empty array when no risks triggered', () => {
      const alerts = CDS.checkRisks({
        currentAssessment: { total_score: 85 },
        previousAssessment: { total_score: 80 },
        attendance: { attended: 9, total: 10 },
      });
      // Only regression/missed checked — neither triggered
      const regression = alerts.find(a => a.rule_id === 'REGRESSION_DETECTED');
      const missed = alerts.find(a => a.rule_id === 'MISSED_SESSIONS');
      expect(regression).toBeUndefined();
      expect(missed).toBeUndefined();
    });

    test('handles missing data gracefully (empty object)', () => {
      const alerts = CDS.checkRisks({});
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('returns multiple alerts for multiple risks', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 4);
      const alerts = CDS.checkRisks({
        currentAssessment: { total_score: 60 },
        previousAssessment: { total_score: 85 },
        attendance: { attended: 5, total: 10 },
        medication: { lastReviewDate: oldDate.toISOString() },
      });
      expect(alerts.length).toBeGreaterThanOrEqual(2);
      const ruleIds = alerts.map(a => a.rule_id);
      expect(ruleIds).toContain('REGRESSION_DETECTED');
      expect(ruleIds).toContain('MISSED_SESSIONS');
    });
  });

  /* ─── evaluateDischargeReadiness ───────────────────────────────────────── */
  describe('evaluateDischargeReadiness', () => {
    test('returns ready for high scores', () => {
      const r = CDS.evaluateDischargeReadiness({
        goals_met_percentage: 95,
        functional_independence: 90,
        family_training_completion: 100,
        behavior_stability: 95,
        community_integration_readiness: 85,
        transition_plan_completed: 100,
      });
      expect(r.readiness).toBe('ready');
      expect(r.overall_score).toBeGreaterThanOrEqual(85);
      expect(r.unmet_criteria_ar).toHaveLength(0);
      expect(r.recommendations_ar.length).toBeGreaterThan(0);
    });

    test('returns not_ready for zero/missing data', () => {
      const r = CDS.evaluateDischargeReadiness({});
      expect(r.readiness).toBe('not_ready');
      expect(r.overall_score).toBe(0);
    });

    test('returns not_ready for very low scores', () => {
      const r = CDS.evaluateDischargeReadiness({
        goals_met_percentage: 10,
        functional_independence: 10,
        family_training_completion: 5,
        behavior_stability: 10,
        community_integration_readiness: 5,
        transition_plan_completed: 0,
      });
      expect(r.readiness).toBe('not_ready');
      expect(r.overall_score).toBeLessThan(50);
    });

    test('details include actual/threshold/met/score/weight per criterion', () => {
      const r = CDS.evaluateDischargeReadiness({
        goals_met_percentage: 50,
        functional_independence: 40,
      });
      const d = r.details.goals_met_percentage;
      expect(d.actual).toBe(50);
      expect(d.threshold).toBe(80);
      expect(d.met).toBe(false);
      expect(d).toHaveProperty('score');
      expect(d).toHaveProperty('weight');
      expect(d).toHaveProperty('weighted_contribution');
    });

    test('unmet_criteria_ar lists Arabic names for unmet criteria', () => {
      const r = CDS.evaluateDischargeReadiness({
        goals_met_percentage: 50,
        functional_independence: 40,
        family_training_completion: 30,
        behavior_stability: 30,
        community_integration_readiness: 30,
        transition_plan_completed: 0,
      });
      expect(r.unmet_criteria_ar.length).toBeGreaterThan(0);
    });

    test('recommendations_ar is non-empty Arabic array', () => {
      const r = CDS.evaluateDischargeReadiness({
        goals_met_percentage: 80,
        functional_independence: 75,
        family_training_completion: 80,
        behavior_stability: 80,
        community_integration_readiness: 70,
        transition_plan_completed: 80,
      });
      expect(Array.isArray(r.recommendations_ar)).toBe(true);
      expect(r.recommendations_ar.length).toBeGreaterThan(0);
    });
  });

  /* ─── Helper methods ───────────────────────────────────────────────────── */
  describe('Helper methods', () => {
    test('_getAgeBand returns correct bands', () => {
      expect(CDS._getAgeBand(12)).toBe('0-3');
      expect(CDS._getAgeBand(35)).toBe('0-3');
      expect(CDS._getAgeBand(36)).toBe('3-6');
      expect(CDS._getAgeBand(71)).toBe('3-6');
      expect(CDS._getAgeBand(72)).toBe('6-12');
      expect(CDS._getAgeBand(143)).toBe('6-12');
      expect(CDS._getAgeBand(144)).toBe('12+');
      expect(CDS._getAgeBand(200)).toBe('12+');
    });

    test('_calculateWeeklyHours sums hours_per_week', () => {
      expect(
        CDS._calculateWeeklyHours([
          { intensity: { hours_per_week: 5 } },
          { intensity: { hours_per_week: 3 } },
        ])
      ).toBe(8);
    });

    test('_calculateWeeklyHours computes from sessions_per_week × duration', () => {
      expect(
        CDS._calculateWeeklyHours([
          { intensity: { sessions_per_week: 3 }, session_duration_minutes: 60 },
        ])
      ).toBe(3);
    });

    test('_domainNameAr returns Arabic names', () => {
      expect(CDS._domainNameAr('communication')).toBe('التواصل');
      expect(CDS._domainNameAr('daily_living')).toBe('الحياة اليومية');
      expect(CDS._domainNameAr('socialization')).toBe('التنشئة الاجتماعية');
      expect(CDS._domainNameAr('motor')).toBe('المهارات الحركية');
      expect(CDS._domainNameAr('xyz')).toBe('xyz');
    });

    test('_generateReviewDates produces dates from months array', () => {
      const dates = CDS._generateReviewDates({ months: [3, 6, 12] });
      expect(dates).toHaveLength(3);
      expect(dates[0].month).toBe(3);
      expect(dates[0]).toHaveProperty('date');
      expect(dates[0].label_ar).toContain('3');
    });

    test('_generateReviewDates returns empty for null/missing schedule', () => {
      expect(CDS._generateReviewDates(null)).toEqual([]);
      expect(CDS._generateReviewDates({})).toEqual([]);
    });
  });
});
