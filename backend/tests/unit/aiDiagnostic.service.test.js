/**
 * Unit Tests — aiDiagnostic.service.js
 * Batch 39 · P#78
 *
 * Singleton, pure in-memory (14 Maps). Uses jest.isolateModules.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

function loadService() {
  let svc;
  jest.isolateModules(() => {
    svc = require('../../services/aiDiagnostic.service');
  });
  return svc;
}

describe('AIDiagnosticService', () => {
  let svc;
  beforeEach(() => {
    svc = loadService();
  });

  // ═══════════════════════════════════════════
  // Seed data & Dashboard
  // ═══════════════════════════════════════════
  describe('seed data & getDashboard', () => {
    test('beneficiaries map is seeded with 5 entries', () => {
      expect(svc.beneficiaries.size).toBe(5);
    });
    test('assessments map is seeded', () => {
      expect(svc.assessments.size).toBeGreaterThanOrEqual(10);
    });
    test('sessions map is seeded', () => {
      expect(svc.sessions.size).toBeGreaterThanOrEqual(5);
    });
    test('goals map is seeded', () => {
      expect(svc.goals.size).toBeGreaterThanOrEqual(6);
    });
    test('treatmentPlans map is seeded', () => {
      expect(svc.treatmentPlans.size).toBeGreaterThanOrEqual(3);
    });
    test('getDashboard returns overview object', () => {
      const d = svc.getDashboard();
      expect(d).toHaveProperty('totalBeneficiaries');
      expect(d).toHaveProperty('totalSessions');
      expect(d).toHaveProperty('totalGoals');
      expect(d).toHaveProperty('activeAlerts');
      expect(d).toHaveProperty('averageProgress');
      expect(d).toHaveProperty('aiModelsActive');
      expect(d).toHaveProperty('alertsSummary');
      expect(d).toHaveProperty('disabilityDistribution');
      expect(typeof d.averageProgress).toBe('number');
    });
  });

  // ═══════════════════════════════════════════
  // Beneficiaries CRUD
  // ═══════════════════════════════════════════
  describe('Beneficiaries', () => {
    test('listBeneficiaries returns paginated data', () => {
      const r = svc.listBeneficiaries({ page: 1, limit: 2 });
      expect(r).toHaveProperty('data');
      expect(r).toHaveProperty('total');
      expect(r.data.length).toBeLessThanOrEqual(2);
    });

    test('listBeneficiaries filters by status', () => {
      const r = svc.listBeneficiaries({ status: 'active' });
      r.data.forEach(b => expect(b.status).toBe('active'));
    });

    test('listBeneficiaries filters by disabilityType', () => {
      const r = svc.listBeneficiaries({ disabilityType: 'autism' });
      r.data.forEach(b => expect(b.disabilityType).toBe('autism'));
    });

    test('listBeneficiaries search by name or nationalId', () => {
      const all = svc.listBeneficiaries();
      const first = all.data[0];
      const r = svc.listBeneficiaries({ search: first.name.substring(0, 3) });
      expect(r.data.length).toBeGreaterThanOrEqual(1);
    });

    test('getBeneficiary returns existing entry', () => {
      const b = svc.getBeneficiary('ben-101');
      expect(b.id).toBe('ben-101');
    });

    test('getBeneficiary throws 404 for unknown id', () => {
      expect(() => svc.getBeneficiary('xxx')).toThrow();
    });

    test('createBeneficiary adds new entry', () => {
      const b = svc.createBeneficiary({
        name: 'Test',
        nationalId: '1234567890',
        dateOfBirth: '2015-01-01',
        disabilityType: 'autism',
      });
      expect(b.id).toBeDefined();
      expect(b.status).toBe('active');
      expect(svc.beneficiaries.has(b.id)).toBe(true);
    });

    test('updateBeneficiary merges data', () => {
      const updated = svc.updateBeneficiary('ben-101', { status: 'inactive' });
      expect(updated.status).toBe('inactive');
      expect(updated.id).toBe('ben-101');
    });
  });

  // ═══════════════════════════════════════════
  // Assessments CRUD
  // ═══════════════════════════════════════════
  describe('Assessments', () => {
    test('listAssessments returns sorted items for beneficiary', () => {
      const items = svc.listAssessments('ben-101');
      expect(Array.isArray(items)).toBe(true);
    });

    test('listAssessments filters by scale', () => {
      const items = svc.listAssessments('ben-101', { scale: 'icf' });
      items.forEach(a => expect(a.scale).toBe('icf'));
    });

    test('getAssessment returns existing', () => {
      const a = svc.getAssessment('asmt-101');
      expect(a.id).toBe('asmt-101');
    });

    test('getAssessment throws 404', () => {
      expect(() => svc.getAssessment('xxx')).toThrow();
    });

    test('createAssessment validates beneficiary', () => {
      expect(() =>
        svc.createAssessment({ beneficiaryId: 'xxx', scale: 'icf', score: 50 })
      ).toThrow();
    });

    test('createAssessment stores entry and runs alert check', () => {
      const a = svc.createAssessment({
        beneficiaryId: 'ben-101',
        scale: 'icf',
        score: 55,
        assessor: 'Dr.X',
        domain: 'mobility',
      });
      expect(a.id).toBeDefined();
      expect(svc.assessments.has(a.id)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // Sessions CRUD
  // ═══════════════════════════════════════════
  describe('Sessions', () => {
    test('listSessions for beneficiary', () => {
      const items = svc.listSessions('ben-101');
      expect(Array.isArray(items)).toBe(true);
    });

    test('getSession returns existing', () => {
      const s = svc.getSession('sess-101');
      expect(s.id).toBe('sess-101');
    });

    test('getSession throws 404', () => {
      expect(() => svc.getSession('xxx')).toThrow();
    });

    test('createSession adds new session', () => {
      const s = svc.createSession({
        beneficiaryId: 'ben-101',
        therapistId: 'th-1',
        therapyType: 'speech_therapy',
      });
      expect(s.id).toBeDefined();
      expect(s.status).toBe('scheduled');
      expect(s.aiAnalysis).toBeNull();
    });

    test('createSession with completed status generates aiAnalysis', () => {
      const s = svc.createSession({
        beneficiaryId: 'ben-101',
        therapistId: 'th-1',
        therapyType: 'OT',
        status: 'completed',
        outcomes: { engagement: 80, progressRating: 4 },
      });
      expect(s.aiAnalysis).toBeDefined();
      expect(s.aiAnalysis).toHaveProperty('sentimentScore');
    });

    test('completeSession marks completed and generates aiAnalysis', () => {
      const s = svc.createSession({
        beneficiaryId: 'ben-101',
        therapistId: 'th-1',
        therapyType: 'PT',
      });
      const completed = svc.completeSession(s.id, { engagement: 70, progressRating: 3 });
      expect(completed.status).toBe('completed');
      expect(completed.aiAnalysis).toBeDefined();
      expect(completed.completedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // Goals CRUD
  // ═══════════════════════════════════════════
  describe('Goals', () => {
    test('listGoals for beneficiary', () => {
      const items = svc.listGoals('ben-101');
      expect(Array.isArray(items)).toBe(true);
    });

    test('getGoal returns existing', () => {
      const g = svc.getGoal('goal-101');
      expect(g.id).toBe('goal-101');
    });

    test('getGoal throws 404', () => {
      expect(() => svc.getGoal('xxx')).toThrow();
    });

    test('createGoal adds entry with progress 0', () => {
      const g = svc.createGoal({
        beneficiaryId: 'ben-101',
        category: 'communication',
        title: 'Test Goal',
        targetDate: '2025-12-31',
      });
      expect(g.progress).toBe(0);
      expect(g.status).toBe('in_progress');
    });

    test('updateGoalProgress updates progress and milestone', () => {
      // Create goal with milestones
      const g = svc.createGoal({
        beneficiaryId: 'ben-101',
        category: 'mobility',
        title: 'Walk 10m',
        targetDate: '2025-12-31',
        milestones: [
          { title: 'Stand', achieved: false },
          { title: 'Walk 5m', achieved: false },
        ],
      });
      const updated = svc.updateGoalProgress(g.id, 50, 0);
      expect(updated.progress).toBe(50);
      expect(updated.milestones[0].achieved).toBe(true);
    });

    test('updateGoalProgress sets achieved when progress >= 100', () => {
      const g = svc.createGoal({
        beneficiaryId: 'ben-101',
        category: 'social',
        title: 'Greet by name',
        targetDate: '2025-12-31',
      });
      const updated = svc.updateGoalProgress(g.id, 100);
      expect(updated.status).toBe('achieved');
      expect(updated.achievedDate).toBeDefined();
    });

    test('updateGoalProgress clamps 0-100', () => {
      const g = svc.createGoal({
        beneficiaryId: 'ben-101',
        category: 'cognitive',
        title: 'Count to 10',
        targetDate: '2025-12-31',
      });
      const updated = svc.updateGoalProgress(g.id, -20);
      expect(updated.progress).toBe(0);
      const updated2 = svc.updateGoalProgress(g.id, 200);
      expect(updated2.progress).toBe(100);
    });
  });

  // ═══════════════════════════════════════════
  // Treatment Plans
  // ═══════════════════════════════════════════
  describe('Treatment Plans', () => {
    test('listTreatmentPlans returns seeded data', () => {
      const items = svc.listTreatmentPlans();
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    test('listTreatmentPlans filters by beneficiaryId', () => {
      const items = svc.listTreatmentPlans({ beneficiaryId: 'ben-101' });
      items.forEach(p => expect(p.beneficiaryId).toBe('ben-101'));
    });

    test('getTreatmentPlan returns existing', () => {
      const p = svc.getTreatmentPlan('plan-101');
      expect(p.id).toBe('plan-101');
    });

    test('getTreatmentPlan throws 404', () => {
      expect(() => svc.getTreatmentPlan('xxx')).toThrow();
    });

    test('createTreatmentPlan adds new entry', () => {
      const p = svc.createTreatmentPlan({
        beneficiaryId: 'ben-101',
        diagnosis: 'ASD Level 2',
        primaryGoals: ['Communication'],
        therapies: [{ type: 'speech_therapy' }],
      });
      expect(p.status).toBe('active');
      expect(svc.treatmentPlans.has(p.id)).toBe(true);
    });

    test('updateTreatmentPlan merges data', () => {
      const updated = svc.updateTreatmentPlan('plan-101', { status: 'completed' });
      expect(updated.status).toBe('completed');
      expect(updated.id).toBe('plan-101');
    });
  });

  // ═══════════════════════════════════════════
  // AI Progress Analysis
  // ═══════════════════════════════════════════
  describe('analyzeProgress', () => {
    test('returns analysis object for seeded beneficiary', () => {
      const a = svc.analyzeProgress('ben-101');
      expect(a).toHaveProperty('overallScore');
      expect(a).toHaveProperty('trajectory');
      expect(a).toHaveProperty('engagementTrend');
      expect(a).toHaveProperty('goalStats');
      expect(a).toHaveProperty('behaviorAnalysis');
      expect(a).toHaveProperty('riskLevel');
      expect(a).toHaveProperty('strengths');
      expect(a).toHaveProperty('areasForImprovement');
      expect(a.model).toBeDefined();
    });

    test('stores snapshot in progressSnapshots map', () => {
      const before = svc.progressSnapshots.size;
      svc.analyzeProgress('ben-101');
      expect(svc.progressSnapshots.size).toBe(before + 1);
    });

    test('throws for unknown beneficiary', () => {
      expect(() => svc.analyzeProgress('xxx')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // AI Recommendations
  // ═══════════════════════════════════════════
  describe('generateRecommendations', () => {
    test('returns recommendations object for seeded beneficiary', () => {
      const r = svc.generateRecommendations('ben-101');
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('recommendations');
      expect(Array.isArray(r.recommendations)).toBe(true);
      expect(r.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(r.model).toBeDefined();
    });

    test('stores in recommendations map', () => {
      const before = svc.recommendations.size;
      svc.generateRecommendations('ben-102');
      expect(svc.recommendations.size).toBe(before + 1);
    });

    test('throws for unknown beneficiary', () => {
      expect(() => svc.generateRecommendations('xxx')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // Outcome Prediction
  // ═══════════════════════════════════════════
  describe('predictOutcome', () => {
    test('returns prediction for seeded beneficiary+goal', () => {
      const p = svc.predictOutcome('ben-101', 'goal-101');
      expect(p).toHaveProperty('probability');
      expect(p).toHaveProperty('estimatedCompletionDate');
      expect(p).toHaveProperty('riskFactors');
      expect(p).toHaveProperty('protectiveFactors');
      expect(p.model).toBeDefined();
    });

    test('stores prediction in predictions map', () => {
      const before = svc.predictions.size;
      svc.predictOutcome('ben-101', 'goal-101');
      expect(svc.predictions.size).toBe(before + 1);
    });

    test('throws for unknown beneficiary', () => {
      expect(() => svc.predictOutcome('xxx', 'goal-101')).toThrow();
    });

    test('throws for unknown goal', () => {
      expect(() => svc.predictOutcome('ben-101', 'xxx')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // Pattern Detection
  // ═══════════════════════════════════════════
  describe('detectPatterns', () => {
    test('returns patterns object for seeded beneficiary', () => {
      const result = svc.detectPatterns('ben-101');
      expect(result).toHaveProperty('patterns');
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(result).toHaveProperty('totalPatternsFound');
      expect(result.model).toBeDefined();
    });

    test('stores in patterns map', () => {
      const before = svc.patterns.size;
      svc.detectPatterns('ben-101');
      expect(svc.patterns.size).toBe(before + 1);
    });
  });

  // ═══════════════════════════════════════════
  // Risk Assessment
  // ═══════════════════════════════════════════
  describe('assessRisk', () => {
    test('returns risk object for seeded beneficiary', () => {
      const r = svc.assessRisk('ben-101');
      expect(r).toHaveProperty('riskScore');
      expect(r).toHaveProperty('riskLevel');
      expect(r).toHaveProperty('riskFactors');
      expect(r).toHaveProperty('mitigationSuggestions');
      expect(r.model).toBeDefined();
    });

    test('stores in riskAssessments map', () => {
      const before = svc.riskAssessments.size;
      svc.assessRisk('ben-101');
      expect(svc.riskAssessments.size).toBe(before + 1);
    });
  });

  // ═══════════════════════════════════════════
  // Treatment Plan Optimization
  // ═══════════════════════════════════════════
  describe('optimizeTreatmentPlan', () => {
    test('returns optimization for seeded plan', () => {
      const r = svc.optimizeTreatmentPlan('plan-101');
      expect(r).toHaveProperty('optimizations');
      expect(r).toHaveProperty('therapyEffectiveness');
      expect(r).toHaveProperty('analysisScore');
    });

    test('updates plan aiOptimization field', () => {
      svc.optimizeTreatmentPlan('plan-101');
      const p = svc.getTreatmentPlan('plan-101');
      expect(p.aiOptimization).toBeDefined();
      expect(p.aiOptimization.suggestions).toBeDefined();
    });

    test('throws for unknown plan', () => {
      expect(() => svc.optimizeTreatmentPlan('xxx')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // Behavior Logs
  // ═══════════════════════════════════════════
  describe('Behavior Logs', () => {
    test('listBehaviorLogs for beneficiary', () => {
      const items = svc.listBehaviorLogs('ben-101');
      expect(Array.isArray(items)).toBe(true);
    });

    test('listBehaviorLogs filters by type', () => {
      const items = svc.listBehaviorLogs('ben-101', { type: 'positive' });
      items.forEach(bl => expect(bl.type).toBe('positive'));
    });

    test('createBehaviorLog adds entry', () => {
      const bl = svc.createBehaviorLog({
        beneficiaryId: 'ben-101',
        type: 'positive',
        behavior: 'Shared toy',
        observer: 'Obs-1',
      });
      expect(bl.id).toBeDefined();
      expect(svc.behaviorLogs.has(bl.id)).toBe(true);
    });

    test('createBehaviorLog throws for unknown beneficiary', () => {
      expect(() =>
        svc.createBehaviorLog({
          beneficiaryId: 'xxx',
          type: 'positive',
          behavior: 'a',
          observer: 'o',
        })
      ).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // Alerts
  // ═══════════════════════════════════════════
  describe('Alerts', () => {
    test('listAlerts returns seeded alerts', () => {
      const items = svc.listAlerts();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    test('listAlerts filters by severity', () => {
      const items = svc.listAlerts({ severity: 'warning' });
      items.forEach(a => expect(a.severity).toBe('warning'));
    });

    test('listAlerts filters by resolved', () => {
      const items = svc.listAlerts({ resolved: false });
      items.forEach(a => expect(a.resolved).toBe(false));
    });

    test('resolveAlert marks resolved', () => {
      const alerts = svc.listAlerts({ resolved: false });
      if (alerts.length > 0) {
        const resolved = svc.resolveAlert(alerts[0].id);
        expect(resolved.resolved).toBe(true);
        expect(resolved.resolvedDate).toBeDefined();
      }
    });

    test('resolveAlert throws for unknown id', () => {
      expect(() => svc.resolveAlert('xxx')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // AI Report
  // ═══════════════════════════════════════════
  describe('generateAIReport', () => {
    test('returns comprehensive report', () => {
      const r = svc.generateAIReport('ben-101');
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('summary');
      expect(r.summary).toHaveProperty('overallScore');
      expect(r).toHaveProperty('progressAnalysis');
      expect(r).toHaveProperty('recommendations');
      expect(r).toHaveProperty('detectedPatterns');
      expect(r).toHaveProperty('riskAssessment');
      expect(r).toHaveProperty('conclusion');
      expect(r).toHaveProperty('nextSteps');
    });

    test('stores report in aiReports map', () => {
      const before = svc.aiReports.size;
      svc.generateAIReport('ben-101');
      expect(svc.aiReports.size).toBe(before + 1);
    });
  });

  // ═══════════════════════════════════════════
  // Reference Data
  // ═══════════════════════════════════════════
  describe('Reference data getters', () => {
    test('getClinicalScales returns object with scales', () => {
      const s = svc.getClinicalScales();
      expect(s).toHaveProperty('icf');
      expect(s).toHaveProperty('gaf');
    });

    test('getDisabilityTypes returns array', () => {
      const d = svc.getDisabilityTypes();
      expect(Array.isArray(d)).toBe(true);
      expect(d).toContain('autism');
    });

    test('getTherapyTypes returns array', () => {
      const t = svc.getTherapyTypes();
      expect(Array.isArray(t)).toBe(true);
      expect(t.length).toBeGreaterThanOrEqual(12);
    });

    test('getAIModels returns models config', () => {
      const m = svc.getAIModels();
      expect(m).toHaveProperty('progressAnalysis');
      expect(m).toHaveProperty('outcomePredictor');
    });
  });

  // ═══════════════════════════════════════════
  // Compare Assessments
  // ═══════════════════════════════════════════
  describe('compareAssessments', () => {
    test('returns comparison for valid assessments', () => {
      const benAssessments = svc.listAssessments('ben-101');
      if (benAssessments.length >= 2) {
        const c = svc.compareAssessments('ben-101', benAssessments[0].id, benAssessments[1].id);
        expect(c).toHaveProperty('scoreDifference');
        expect(c).toHaveProperty('percentChange');
        expect(c).toHaveProperty('direction');
        expect(c).toHaveProperty('timeBetween');
      }
    });

    test('throws 400 if assessment does not belong to beneficiary', () => {
      // asmt-101 belongs to ben-101, we pass ben-102 → should throw
      const ben102Assessments = svc.listAssessments('ben-102');
      if (ben102Assessments.length > 0) {
        expect(() =>
          svc.compareAssessments('ben-102', 'asmt-101', ben102Assessments[0].id)
        ).toThrow();
      }
    });

    test('throws for unknown assessment id', () => {
      expect(() => svc.compareAssessments('ben-101', 'xxx', 'yyy')).toThrow();
    });
  });

  // ═══════════════════════════════════════════
  // Alert auto-generation from assessment
  // ═══════════════════════════════════════════
  describe('_checkForAlerts on createAssessment', () => {
    test('creates alert when score drops by more than 10', () => {
      // Create two assessments for same scale, second much lower
      svc.createAssessment({
        beneficiaryId: 'ben-102',
        scale: 'gaf',
        score: 70,
        assessor: 'Dr.X',
        domain: 'func',
      });
      const beforeAlerts = svc.listAlerts().length;
      svc.createAssessment({
        beneficiaryId: 'ben-102',
        scale: 'gaf',
        score: 55,
        assessor: 'Dr.X',
        domain: 'func',
      });
      const afterAlerts = svc.listAlerts().length;
      expect(afterAlerts).toBeGreaterThan(beforeAlerts);
    });
  });
});
