/**
 * Behavioral tests for UnifiedAssessmentService.
 *
 * Replaces the auto-generated syntax check with real logic tests for
 * scale scoring, interpretation, batch assessment, and reporting.
 */

'use strict';

const {
  UnifiedAssessmentService,
} = require('../rehabilitation-services/unified-assessment-service');

describe('UnifiedAssessmentService', () => {
  let service;

  beforeEach(() => {
    service = new UnifiedAssessmentService();
  });

  describe('scale catalog', () => {
    it('initializes the canonical scales', () => {
      expect(service.scales.motorFunction).toBeDefined();
      expect(service.scales.functionalIndependence).toBeDefined();
    });

    it('FIM scale has correct max score and domains', () => {
      const fim = service.scales.functionalIndependence;
      expect(fim.maxScore).toBe(126);
      expect(fim.domains).toContain('العناية الذاتية');
      expect(fim.domains).toHaveLength(6);
    });

    it('dailyLiving scale exists but has no interpretation map', () => {
      expect(service.scales.dailyLiving).toBeDefined();
      expect(service.scales.dailyLiving.interpretation).toBeUndefined();
    });
  });

  describe('performScaleAssessment', () => {
    it('scores a motor assessment and returns interpretation', async () => {
      const result = await service.performScaleAssessment('BEN-1', 'motorFunction', {
        grossMotor: 15,
        fineMotor: 10,
        balance: 12,
        coordination: 8,
      });
      expect(result.beneficiaryId).toBe('BEN-1');
      expect(result.scaleKey).toBe('motorFunction');
      expect(result.totalScore).toBe(45);
      expect(result.percentage).toBe(45);
      expect(result.level).toBe('متوسط');
    });

    it('throws for an unknown scale key', async () => {
      await expect(
        service.performScaleAssessment('BEN-1', 'unknownScale', { a: 1 })
      ).rejects.toThrow(/unknownScale/);
    });

    it('returns empty level when scale has no interpretation', async () => {
      const result = await service.performScaleAssessment('BEN-1', 'dailyLiving', {
        eating: 20,
        bathing: 20,
        dressing: 20,
        mobility: 20,
        hygiene: 20,
      });
      expect(result.totalScore).toBe(100);
      expect(result.percentage).toBe(100);
      expect(result.level).toBe('');
    });

    it('defaults missing domain scores to zero', async () => {
      const result = await service.performScaleAssessment('BEN-1', 'motorFunction', {
        grossMotor: 10,
      });
      expect(result.totalScore).toBe(10);
    });
  });

  describe('performBatchAssessment', () => {
    it('runs multiple scales in one call', async () => {
      const result = await service.performBatchAssessment('BEN-2', [
        {
          scaleKey: 'motorFunction',
          domainScores: { grossMotor: 25, fineMotor: 25, balance: 25, coordination: 25 },
        },
        {
          scaleKey: 'emotionalWellbeing',
          domainScores: {
            anxiety: 20,
            depression: 20,
            emotionalRegulation: 20,
            selfConcept: 20,
            copingStrategies: 20,
          },
        },
      ]);
      expect(result.beneficiaryId).toBe('BEN-2');
      expect(result.assessments).toHaveLength(2);
      expect(result.summary.totalScales).toBe(2);
    });

    it('stops on first invalid scale and propagates the error', async () => {
      await expect(
        service.performBatchAssessment('BEN-2', [
          { scaleKey: 'motorFunction', domainScores: { grossMotor: 20 } },
          { scaleKey: 'nonexistent', domainScores: {} },
        ])
      ).rejects.toThrow(/nonexistent/);
    });
  });

  describe('getAssessmentReport', () => {
    it('returns a stored initial assessment report', async () => {
      const assessment = await service.performInitialAssessment('BEN-3', {
        disabilityType: 'autism_spectrum',
        severity: 'moderate',
        functionalAbilities: {
          mobility: { level: 3 },
          selfCare: { level: 4 },
          communication: { level: 2 },
          cognitive: { level: 3 },
          socialEmotional: { level: 3 },
        },
        riskFactors: [{ factor: 'تواصل', severity: 'medium' }],
        strengths: [{ factor: 'دعم أسري', level: 'strong' }],
      });
      const report = await service.getAssessmentReport(assessment.id);
      expect(report.summary).toMatchObject({
        id: assessment.id,
        type: 'initial',
      });
      expect(report.disabilityProfile).toMatchObject({
        type: 'autism_spectrum',
        severity: 'moderate',
      });
      expect(report.nextSteps.length).toBeGreaterThan(0);
    });

    it('throws when assessment id is not found', async () => {
      await expect(service.getAssessmentReport('NO-SUCH-ID')).rejects.toThrow(/غير موجود/);
    });
  });

  describe('initial assessment', () => {
    it('generates a multi-domain initial assessment payload', async () => {
      const result = await service.performInitialAssessment('BEN-4', {
        disabilityType: 'autism_spectrum',
        severity: 'moderate',
        functionalAbilities: {
          mobility: { level: 3 },
          selfCare: { level: 4 },
          communication: { level: 2 },
          cognitive: { level: 3 },
          socialEmotional: { level: 3 },
        },
        riskFactors: [{ factor: 'تواصل', severity: 'medium' }],
        strengths: [{ factor: 'دعم أسري', level: 'strong' }],
      });
      expect(result.beneficiaryId).toBe('BEN-4');
      expect(result.type).toBe('initial');
      expect(result.functionalAssessment).toBeDefined();
      expect(result.needsAssessment).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(result.priority).toBeDefined();
    });
  });

  describe('getBeneficiaryAssessmentProfile', () => {
    it('summarizes assessments by beneficiary', async () => {
      await service.performScaleAssessment('BEN-5', 'motorFunction', {
        grossMotor: 25,
        fineMotor: 25,
        balance: 25,
        coordination: 25,
      });
      const profile = service.getBeneficiaryAssessmentProfile('BEN-5');
      expect(profile.beneficiaryId).toBe('BEN-5');
      expect(profile.totalAssessments).toBe(1);
      expect(profile.uniqueScales).toBe(1);
      expect(profile.areasOfStrength).toContain('مقياس الوظائف الحركية');
    });
  });
});
