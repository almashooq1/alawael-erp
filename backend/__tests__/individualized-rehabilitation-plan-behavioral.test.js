'use strict';

const {
  IndividualizedRehabilitationPlanService,
} = require('../rehabilitation-services/individualized-rehabilitation-plan-service');

describe('IndividualizedRehabilitationPlanService — behavioral', () => {
  let service;

  beforeEach(() => {
    service = new IndividualizedRehabilitationPlanService();
  });

  const basePlan = () => ({
    beneficiaryId: 'B-001',
    beneficiaryName: 'أحمد',
    dateOfBirth: new Date('2010-01-01'),
    disabilityType: 'physical',
    disabilitySeverity: 'moderate',
    currentStatus: 'active',
    templateType: 'comprehensive',
    assessmentSummary: 'ملخص التقييم',
  });

  describe('plan lifecycle', () => {
    it('creates a comprehensive plan with generated id and dates', async () => {
      const result = await service.createPlan(basePlan());
      expect(result.success).toBe(true);
      expect(result.planId).toMatch(/^IRP-\d+-[a-f0-9]{8}$/);
      expect(result.plan.status).toBe('draft');
      expect(result.plan.template).toBe('خطة التأهيل الشاملة');
    });

    it('creates a vocational plan when templateType is vocational', async () => {
      const data = { ...basePlan(), templateType: 'vocational' };
      const result = await service.createPlan(data);
      expect(result.plan.template).toBe('خطة التأهيل المهني');
    });

    it('falls back to comprehensive for unknown template', async () => {
      const data = { ...basePlan(), templateType: 'unknown' };
      const result = await service.createPlan(data);
      expect(result.plan.type).toBe('unknown');
      expect(result.plan.template).toBe('خطة التأهيل الشاملة');
    });

    it('retrieves a created plan by id', async () => {
      const created = await service.createPlan(basePlan());
      const found = service.getPlan(created.planId);
      expect(found).toBeDefined();
      expect(found.beneficiary.id).toBe('B-001');
    });

    it('returns undefined for a non-existent plan', () => {
      expect(service.getPlan('IRP-NOT-EXIST')).toBeUndefined();
    });

    it('lists beneficiary plans', async () => {
      await service.createPlan(basePlan());
      await service.createPlan({ ...basePlan(), beneficiaryId: 'B-001' });
      await service.createPlan({ ...basePlan(), beneficiaryId: 'B-002' });
      const plans = service.getBeneficiaryPlans('B-001');
      expect(plans.length).toBe(2);
    });

    it('returns empty array when beneficiary has no plans', () => {
      expect(service.getBeneficiaryPlans('B-NONE')).toEqual([]);
    });

    it('deletes a plan by removing it from the map', async () => {
      const created = await service.createPlan(basePlan());
      service.plans.delete(created.planId);
      expect(service.getPlan(created.planId)).toBeUndefined();
    });
  });

  describe('goals and objectives', () => {
    it('adds a short-term goal to a plan', async () => {
      const created = await service.createPlan(basePlan());
      const result = service.addGoal(created.planId, {
        domain: 'motor',
        area: 'gross_motor',
        description: 'المشي 10 أمتار بمساعدة',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      expect(result.success).toBe(true);
      expect(result.goal.id).toMatch(/^G-/);
      expect(service.getPlan(created.planId).goals.shortTerm.length).toBe(1);
    });

    it('adds a long-term goal when type is long-term', async () => {
      const created = await service.createPlan(basePlan());
      service.addGoal(created.planId, {
        domain: 'motor',
        description: 'هدف بعيد',
        type: 'long-term',
      });
      expect(service.getPlan(created.planId).goals.longTerm.length).toBe(1);
    });

    it('throws when adding a goal to a missing plan', () => {
      expect(() => service.addGoal('IRP-X', { domain: 'motor' })).toThrow('الخطة غير موجودة');
    });

    it('processes initial goals from plan data', async () => {
      const result = await service.createPlan({
        ...basePlan(),
        initialGoals: {
          longTerm: [{ domain: 'cognitive', description: 'هدف بعيد' }],
          shortTerm: [{ domain: 'motor', description: 'هدف قصير' }],
          objectives: [{ domain: 'social', description: 'هدف تفصيلي' }],
        },
      });
      expect(result.plan.goals.shortTerm.length).toBe(1);
      expect(result.plan.goals.longTerm.length).toBe(1);
      expect(result.plan.goals.objectives.length).toBe(1);
    });

    it('updates goal progress using value field', async () => {
      const created = await service.createPlan(basePlan());
      const goalResult = service.addGoal(created.planId, {
        domain: 'motor',
        area: 'gross_motor',
        description: 'المشي بمساعدة',
        baseline: 0,
        target: 100,
      });
      const updated = service.updateGoalProgress(created.planId, goalResult.goal.id, { value: 75 });
      expect(updated.success).toBe(true);
      expect(updated.goal.progress.current).toBe(75);
    });

    it('throws when updating progress for missing goal', async () => {
      const created = await service.createPlan(basePlan());
      expect(() => service.updateGoalProgress(created.planId, 'G-NOPE', { value: 50 })).toThrow(
        'الهدف غير موجود'
      );
    });

    it('customizes a goal from the goal bank', async () => {
      const created = await service.createPlan(basePlan());
      const bankResult = service.getGoalsFromBank('motorSkills', 'grossMotor');
      expect(bankResult.success).toBe(true);
      expect(bankResult.goals.length).toBeGreaterThan(0);
      const goalCode = bankResult.goals[0].code;
      const result = service.customizeGoalFromBank(created.planId, goalCode, { accuracy: 90 });
      expect(result.success).toBe(true);
    });

    it('returns error for unknown goal bank domain', () => {
      const result = service.getGoalsFromBank('nonexistent');
      expect(result.success).toBe(false);
    });

    it('retrieves goals from goal bank by area', () => {
      const result = service.getGoalsFromBank('communication', 'receptive');
      expect(result.success).toBe(true);
      expect(result.area).toBe('receptive');
      expect(result.goals.length).toBeGreaterThan(0);
    });
  });

  describe('services and schedule', () => {
    it('adds a physical therapy service to a plan', async () => {
      const created = await service.createPlan(basePlan());
      const result = service.addService(created.planId, {
        type: 'physicalTherapy',
        category: 'primary',
        sessionsPerWeek: 3,
        sessionDuration: 45,
      });
      expect(result.success).toBe(true);
      expect(result.service.code).toBe('PT');
      expect(service.getPlan(created.planId).services.primary.length).toBe(1);
    });

    it('throws for unknown service type', async () => {
      const created = await service.createPlan(basePlan());
      expect(() => service.addService(created.planId, { type: 'unknown' })).toThrow(
        'نوع الخدمة غير معروف'
      );
    });

    it('processes initial services from plan data', async () => {
      const result = await service.createPlan({
        ...basePlan(),
        initialServices: {
          primary: [{ type: 'physicalTherapy' }],
          supplementary: [{ type: 'psychologicalSupport' }],
        },
      });
      expect(result.plan.services.primary.length).toBe(1);
      expect(result.plan.services.supplementary.length).toBe(1);
    });

    it('records a service session and increments totalSessions', async () => {
      const created = await service.createPlan(basePlan());
      const svc = service.addService(created.planId, { type: 'physicalTherapy' });
      const result = service.recordServiceSession(created.planId, svc.service.id, {
        date: new Date(),
        status: 'attended',
      });
      expect(result.success).toBe(true);
      expect(result.totalSessions).toBe(1);
      expect(result.session.id).toMatch(/^SESSION-/);
    });
  });

  describe('progress reports and reviews', () => {
    it('generates a progress report', async () => {
      const created = await service.createPlan(basePlan());
      service.addGoal(created.planId, { domain: 'motor', description: 'g1' });
      service.addService(created.planId, { type: 'physicalTherapy' });
      const report = service.generateProgressReport(created.planId);
      expect(report.reportInfo).toBeDefined();
      expect(report.goalsProgress).toBeDefined();
      expect(report.servicesSummary).toBeDefined();
    });

    it('throws when generating report for missing plan', () => {
      expect(() => service.generateProgressReport('IRP-X')).toThrow('الخطة غير موجودة');
    });

    it('reviews a plan and increments version', async () => {
      const created = await service.createPlan(basePlan());
      const result = service.reviewPlan(created.planId, { notes: 'review' });
      expect(result.success).toBe(true);
      const plan = service.getPlan(created.planId);
      expect(plan.version).toBe(2);
      expect(plan.progress.adjustments.length).toBe(1);
    });

    it('returns available templates', () => {
      const templates = service.getAvailableTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.map(t => t.id)).toContain('comprehensive');
      expect(templates.map(t => t.id)).toContain('vocational');
    });
  });

  describe('internal helpers', () => {
    it('calculates review date based on frequency', () => {
      const start = new Date('2024-01-01');
      const review = service._calculateReviewDate(start, 'quarterly');
      expect(review.getMonth()).toBe(3);
    });

    it('calculates expiration date based on duration', () => {
      const start = new Date('2024-01-01');
      const expiration = service._calculateExpirationDate(start, { default: 12, unit: 'months' });
      expect(expiration.getFullYear()).toBe(2025);
    });

    it('generates goal codes with domain prefix', () => {
      const code = service._generateGoalCode('motor');
      expect(code.startsWith('MO-')).toBe(true);
    });

    it('calculates duration between dates', () => {
      const duration = service._calculateDuration(new Date('2024-01-01'), new Date('2024-01-11'));
      expect(duration.days).toBe(10);
      expect(duration.months).toBe(0);
    });
  });
});
