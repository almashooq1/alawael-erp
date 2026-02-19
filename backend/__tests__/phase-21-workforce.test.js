/**
 * ALAWAEL ERP - PHASE 21: WORKFORCE ANALYTICS & PLANNING TEST SUITE
 * Comprehensive testing of HR planning, forecasting, succession planning, compensation analysis
 */

const WorkforceAnalyticsService = require('../services/workforce-analytics.service');

describe('Workforce Analytics & Planning System', () => {
  let service;

  beforeEach(() => {
    service = new WorkforceAnalyticsService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE PLANNING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Headcount Planning', () => {
    test('should create headcount plan with required fields', () => {
      const planData = {
        departmentId: 'DEPT-001',
        planYear: 2025,
        targetHeadcount: 100,
        currentHeadcount: 80,
        budgetedCost: 5000000,
      };

      const plan = service.createHeadcountPlan(planData);

      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^HCP-/);
      expect(plan.departmentId).toBe('DEPT-001');
      expect(plan.targetHeadcount).toBe(100);
      expect(plan.status).toBe('draft');
      expect(plan.approvalStatus).toBe('pending');
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.createHeadcountPlan({ departmentId: 'DEPT-001' })).toThrow(
        'Missing required fields'
      );
    });

    test('should generate quarterly breakdown', () => {
      const plan = service.createHeadcountPlan({
        departmentId: 'DEPT-001',
        planYear: 2025,
        targetHeadcount: 100,
      });

      expect(plan.quarterlyBreakdown).toBeDefined();
      expect(plan.quarterlyBreakdown.Q1).toBeDefined();
      expect(plan.quarterlyBreakdown.Q2).toBeDefined();
      expect(plan.quarterlyBreakdown.Q3).toBeDefined();
      expect(plan.quarterlyBreakdown.Q4).toBeDefined();
    });

    test('should approve headcount plan', () => {
      const plan = service.createHeadcountPlan({
        departmentId: 'DEPT-001',
        planYear: 2025,
        targetHeadcount: 100,
      });

      const approved = service.approveHeadcountPlan(plan.id, {
        status: 'approved',
        approver: 'CFO',
        comments: 'Budget available',
      });

      expect(approved.approvalStatus).toBe('approved');
      expect(approved.status).toBe('approved');
      expect(approved.approvedDate).toBeDefined();
    });

    test('should reject headcount plan', () => {
      const plan = service.createHeadcountPlan({
        departmentId: 'DEPT-001',
        planYear: 2025,
        targetHeadcount: 100,
      });

      const rejected = service.approveHeadcountPlan(plan.id, {
        status: 'rejected',
        approver: 'CFO',
        comments: 'Budget not available',
      });

      expect(rejected.approvalStatus).toBe('rejected');
      expect(rejected.status).toBe('draft');
    });

    test('should throw error for non-existent plan', () => {
      expect(() => service.approveHeadcountPlan('NON-EXISTENT', { status: 'approved' })).toThrow(
        'Plan not found'
      );
    });
  });

  describe('Workforce Forecasting', () => {
    test('should create forecast with required fields', () => {
      const forecast = service.createForecast({
        metric: 'headcount',
        department: 'IT',
        period: 'Q1 2025',
        historicalData: [80, 85, 90],
        predictedValue: 95,
        confidence: 85,
      });

      expect(forecast).toBeDefined();
      expect(forecast.id).toMatch(/^FC-/);
      expect(forecast.metric).toBe('headcount');
      expect(forecast.predictedValue).toBe(95);
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.createForecast({ metric: 'headcount' })).toThrow(
        'Missing required fields'
      );
    });

    test('should support different forecast metrics', () => {
      const metrics = ['headcount', 'cost', 'attrition', 'revenue'];

      metrics.forEach(metric => {
        const forecast = service.createForecast({
          metric,
          department: 'Sales',
          period: 'Q1 2025',
        });

        expect(forecast.metric).toBe(metric);
      });
    });

    test('should update forecast accuracy', () => {
      const forecast = service.createForecast({
        metric: 'headcount',
        department: 'IT',
        period: 'Q1 2025',
        predictedValue: 95,
      });

      const updated = service.updateForecastAccuracy(forecast.id, {
        actualValue: 97,
      });

      expect(updated.accuracy).toBeDefined();
      expect(updated.accuracy.actualValue).toBe(97);
      expect(updated.accuracy.error).toBe(2);
    });

    test('should calculate MAPE (Mean Absolute Percentage Error)', () => {
      const forecast = service.createForecast({
        metric: 'cost',
        department: 'Operations',
        period: 'Q1 2025',
        predictedValue: 1000000,
      });

      service.updateForecastAccuracy(forecast.id, { actualValue: 1100000 });

      const result = service.forecasts[0].accuracy;
      expect(result.MAPE).toBeDefined();
      expect(parseFloat(result.MAPE)).toBeCloseTo(9.09, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESSION PLANNING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Succession Planning', () => {
    test('should create succession plan', () => {
      const plan = service.createSuccessionPlan({
        positionId: 'POS-CEO',
        positionTitle: 'Chief Executive Officer',
        currentHolder: 'John Doe',
        criticalityLevel: 'critical',
        timelineToVacancy: 24,
      });

      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^SUC-/);
      expect(plan.positionId).toBe('POS-CEO');
      expect(plan.criticalityLevel).toBe('critical');
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.createSuccessionPlan({ positionId: 'POS-CEO' })).toThrow(
        'Missing required fields'
      );
    });

    test('should calculate replacement readiness', () => {
      const plan = service.createSuccessionPlan({
        positionId: 'POS-CTO',
        currentHolder: 'Jane Smith',
        criticalityLevel: 'critical',
        successors: [],
      });

      expect(plan.replacementReadiness).toBe('high-risk');
    });

    test('should add successor to plan', () => {
      const plan = service.createSuccessionPlan({
        positionId: 'POS-CTO',
        currentHolder: 'Current CTO',
        criticalityLevel: 'critical',
      });

      const successor = service.addSuccessor(plan.id, {
        employeeId: 'EMP-123',
        name: 'Future CTO',
        readinessLevel: 'ready',
        priority: 'primary',
      });

      expect(successor).toBeDefined();
      expect(successor.employeeId).toBe('EMP-123');
      expect(successor.readinessLevel).toBe('ready');
      expect(plan.successors).toContain(successor);
    });

    test('should update replacement readiness when successor added', () => {
      const plan = service.createSuccessionPlan({
        positionId: 'POS-CFO',
        currentHolder: 'Current CFO',
        criticalityLevel: 'critical',
      });

      service.addSuccessor(plan.id, {
        employeeId: 'EMP-456',
        readinessLevel: 'ready',
      });

      expect(plan.replacementReadiness).toBe('ready');
    });

    test('should handle multiple successors with different readiness levels', () => {
      const plan = service.createSuccessionPlan({
        positionId: 'POS-VP',
        currentHolder: 'Current VP',
        criticalityLevel: 'high',
      });

      service.addSuccessor(plan.id, {
        employeeId: 'EMP-001',
        readinessLevel: 'developing',
      });
      service.addSuccessor(plan.id, {
        employeeId: 'EMP-002',
        readinessLevel: 'not-ready',
      });

      expect(plan.successors.length).toBe(2);
      expect(plan.replacementReadiness).toBe('developing');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILLS & COMPETENCY TRACKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Skills & Competency Tracking', () => {
    test('should create skill mapping', () => {
      const mapping = service.createSkillMapping({
        employeeId: 'EMP-789',
        employeeName: 'John Developer',
        department: 'IT',
        skills: [
          { skillName: 'JavaScript', proficiency: 5, yearsOfExperience: 10 },
          { skillName: 'Python', proficiency: 4, yearsOfExperience: 5 },
        ],
      });

      expect(mapping).toBeDefined();
      expect(mapping.id).toMatch(/^SKL-/);
      expect(mapping.employeeId).toBe('EMP-789');
      expect(mapping.skills.length).toBe(2);
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.createSkillMapping({ employeeId: 'EMP-001' })).toThrow(
        'Missing required fields'
      );
    });

    test('should identify skill gaps', () => {
      const mapping = service.createSkillMapping({
        employeeId: 'EMP-001',
        department: 'IT',
        skills: [
          { skillName: 'Java', proficiency: 2, yearsOfExperience: 1 },
          { skillName: 'Kubernetes', proficiency: 1, yearsOfExperience: 0 },
        ],
      });

      expect(mapping.skillGaps.length).toBeGreaterThan(0);
      expect(mapping.skillGaps[0].skillName).toMatch(/Java|Kubernetes/);
    });

    test('should update skill proficiency', () => {
      const mapping = service.createSkillMapping({
        employeeId: 'EMP-001',
        department: 'IT',
        skills: [{ skillName: 'Python', proficiency: 2, yearsOfExperience: 1 }],
      });

      const updated = service.updateSkillProficiency(mapping.id, {
        skillName: 'Python',
        proficiency: 4,
        yearsOfExperience: 3,
      });

      expect(updated.skills[0].proficiency).toBe(4);
      expect(updated.skills[0].yearsOfExperience).toBe(3);
    });

    test('should add new skill to existing mapping', () => {
      const mapping = service.createSkillMapping({
        employeeId: 'EMP-001',
        department: 'IT',
        skills: [{ skillName: 'Java', proficiency: 3, yearsOfExperience: 5 }],
      });

      service.updateSkillProficiency(mapping.id, {
        skillName: 'Go',
        proficiency: 2,
        yearsOfExperience: 0.5,
      });

      expect(mapping.skills.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RETENTION & ATTRITION ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Retention & Attrition Analysis', () => {
    test('should analyze retention', () => {
      const analysis = service.analyzeRetention({
        department: 'Sales',
        period: 'Q4 2024',
        startHeadcount: 100,
        endHeadcount: 95,
        separations: 5,
      });

      expect(analysis).toBeDefined();
      expect(analysis.id).toMatch(/^RET-/);
      expect(analysis.department).toBe('Sales');
    });

    test('should throw error for missing required fields', () => {
      expect(() => service.analyzeRetention({ department: 'Sales' })).toThrow(
        'Missing required fields'
      );
    });

    test('should calculate retention rate', () => {
      const analysis = service.analyzeRetention({
        department: 'IT',
        period: 'Q1 2025',
        startHeadcount: 100,
        separations: 5,
      });

      expect(analysis.retentionRate).toBe('95.00');
    });

    test('should calculate attrition rate', () => {
      const analysis = service.analyzeRetention({
        department: 'Operations',
        period: 'Q1 2025',
        startHeadcount: 80,
        separations: 8,
      });

      expect(analysis.attritionRate).toBe('10.00');
    });

    test('should predict attrition risk for employee', () => {
      const risk = service.predictAttritionRisk({
        employeeId: 'EMP-001',
        yearsWithCompany: 1,
        performanceRating: 4.5,
        marketableSkills: ['Cloud', 'AI', 'DevOps', 'Security'],
        promotionsInTenure: 0,
      });

      expect(risk).toBeDefined();
      expect(risk.employeeId).toBe('EMP-001');
      expect(risk.riskScore).toBeDefined();
      expect(risk.riskLevel).toMatch(/high|medium|low/);
    });

    test('should suggest retention actions based on risk', () => {
      const highRisk = service.predictAttritionRisk({
        employeeId: 'EMP-002',
        yearsWithCompany: 1,
        performanceRating: 4.8,
        marketableSkills: ['AI', 'ML', 'Analytics'],
        promotionsInTenure: 0,
      });

      expect(highRisk.retentionActions.length).toBeGreaterThan(0);
      expect(Array.isArray(highRisk.retentionActions)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPENSATION & BENEFITS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Compensation & Benefits Analysis', () => {
    test('should create salary band', () => {
      const band = service.createSalaryBand({
        bandName: 'Senior Manager',
        level: 5,
        minSalary: 100000,
        maxSalary: 150000,
        currency: 'USD',
      });

      expect(band).toBeDefined();
      expect(band.id).toMatch(/^SB-/);
      expect(band.bandName).toBe('Senior Manager');
      expect(band.midPoint).toBe(125000);
      expect(band.range).toBe(50000);
    });

    test('should throw error for missing salary band fields', () => {
      expect(() => service.createSalaryBand({ bandName: 'Manager' })).toThrow(
        'Missing required fields'
      );
    });

    test('should analyze compensation for department', () => {
      const analysis = service.analyzeCompensation({
        department: 'Engineering',
        totalPayroll: 5000000,
        headcount: 50,
        benefitsCosts: 500000,
        medianSalary: 95000,
      });

      expect(analysis).toBeDefined();
      expect(analysis.id).toMatch(/^COMP-/);
      expect(analysis.averageSalary).toBe('100000.00');
      expect(analysis.totalCompensation).toBe(5500000);
    });

    test('should throw error for missing compensation analysis field', () => {
      expect(() => service.analyzeCompensation({})).toThrow('Missing required field');
    });

    test('should identify compensation adjustments', () => {
      const adjustment = service.identifyCompensationAdjustments('EMP-001', {
        currentSalary: 80000,
        marketRate: 95000,
        effectiveDate: new Date(),
      });

      expect(adjustment).toBeDefined();
      expect(adjustment.gap).toBe(15000);
      expect(adjustment.gapPercentage).toBe('15.79');
      expect(adjustment.justification).toBe('market-competitive');
    });

    test('should flag high-priority compensation gaps', () => {
      const adjustment = service.identifyCompensationAdjustments('EMP-002', {
        currentSalary: 60000,
        marketRate: 85000,
        effectiveDate: new Date(),
      });

      expect(adjustment.priority).toBe('high');
    });

    test('should handle above-market compensation', () => {
      const adjustment = service.identifyCompensationAdjustments('EMP-003', {
        currentSalary: 110000,
        marketRate: 95000,
        effectiveDate: new Date(),
      });

      expect(adjustment.gap).toBeLessThan(0);
      expect(adjustment.justification).toBe('above-market');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Workforce Analytics & Insights', () => {
    test('should generate department analytics', () => {
      const analytics = service.getDepartmentAnalytics('DEPT-001');

      expect(analytics).toBeDefined();
      expect(analytics.departmentId).toBe('DEPT-001');
      expect(analytics.overview).toBeDefined();
      expect(analytics.compensation).toBeDefined();
      expect(analytics.performance).toBeDefined();
    });

    test('should throw error for missing department ID', () => {
      expect(() => service.getDepartmentAnalytics()).toThrow('Missing required field');
    });

    test('should include recommendations in analytics', () => {
      const analytics = service.getDepartmentAnalytics('DEPT-002');

      expect(analytics.recommendations).toBeDefined();
      expect(Array.isArray(analytics.recommendations)).toBe(true);
    });

    test('should generate workforce report', () => {
      const report = service.generateWorkforceReport({
        period: 'Q4 2024',
        generatedBy: 'HR Director',
      });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^WFR-/);
      expect(report.period).toBe('Q4 2024');
      expect(report.executiveSummary).toBeDefined();
      expect(report.keyMetrics).toBeDefined();
    });

    test('should throw error for missing period', () => {
      expect(() => service.generateWorkforceReport({})).toThrow('Missing required field');
    });

    test('should calculate workforce health score', () => {
      service.analyzeRetention({
        department: 'IT',
        period: 'Q1 2025',
        startHeadcount: 100,
        separations: 5,
      });

      const health = service.getWorkforceHealthScore();

      expect(health).toBeDefined();
      expect(health.overallHealthScore).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.status).toMatch(/healthy|at-risk|critical/);
    });

    test('should provide health recommendations', () => {
      const health = service.getWorkforceHealthScore();

      expect(health.recommendations).toBeDefined();
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION & COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Workforce Planning Workflow', () => {
    test('should handle end-to-end workforce planning', () => {
      // 1. Create headcount plan
      const plan = service.createHeadcountPlan({
        departmentId: 'DEPT-ENG',
        planYear: 2025,
        targetHeadcount: 120,
        currentHeadcount: 100,
      });

      // 2. Approve plan
      const approved = service.approveHeadcountPlan(plan.id, {
        status: 'approved',
        approver: 'CFO',
      });

      // 3. Create forecast
      const forecast = service.createForecast({
        metric: 'cost',
        department: 'Engineering',
        period: 'Q1 2025',
        predictedValue: 1500000,
      });

      // 4. Create succession plan
      const succession = service.createSuccessionPlan({
        positionId: 'POS-ENG-MGR',
        currentHolder: 'Jane Manager',
        criticalityLevel: 'high',
      });

      expect(plan.status).toBe('approved');
      expect(forecast.metric).toBe('cost');
      expect(succession.replacementReadiness).toBe('high-risk');
    });

    test('should maintain data isolation across departments', () => {
      service.createHeadcountPlan({
        departmentId: 'DEPT-SALES',
        planYear: 2025,
        targetHeadcount: 50,
      });

      service.createHeadcountPlan({
        departmentId: 'DEPT-MARKETING',
        planYear: 2025,
        targetHeadcount: 30,
      });

      expect(service.headcountPlans.length).toBe(2);
      expect(service.headcountPlans[0].departmentId).toBe('DEPT-SALES');
      expect(service.headcountPlans[1].departmentId).toBe('DEPT-MARKETING');
    });

    test('should support concurrent analytics operations', () => {
      service.createSkillMapping({
        employeeId: 'EMP-001',
        department: 'IT',
        skills: [{ skillName: 'Python', proficiency: 4, yearsOfExperience: 5 }],
      });

      service.analyzeRetention({
        department: 'IT',
        period: 'Q1 2025',
        startHeadcount: 50,
        separations: 2,
      });

      service.analyzeCompensation({
        department: 'IT',
        totalPayroll: 2000000,
        headcount: 50,
      });

      expect(service.skills.length).toBe(1);
      expect(service.retentionAnalysis.length).toBe(1);
      expect(service.compensationData.length).toBe(1);
    });
  });
});
