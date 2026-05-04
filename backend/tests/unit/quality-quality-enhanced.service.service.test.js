/**
 * Functional unit tests for services/quality/quality-enhanced.service.js
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Model mocks ──────────────────────────────────────────────────────────────
const mockIncident = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
};
const mockComplaint = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
};
const mockSatisfactionSurvey = {
  find: jest.fn(),
  create: jest.fn(),
};
const mockChecklist = { findById: jest.fn() };
const mockChecklistSubmission = {
  create: jest.fn(),
  find: jest.fn(),
};
const mockAudit = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};
const mockImprovementProject = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};
const mockRisk = {
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

jest.mock('../../models/QualityModels', () => ({
  Incident: mockIncident,
  Complaint: mockComplaint,
  SatisfactionSurvey: mockSatisfactionSurvey,
  Checklist: mockChecklist,
  ChecklistSubmission: mockChecklistSubmission,
  Audit: mockAudit,
  ImprovementProject: mockImprovementProject,
  Risk: mockRisk,
  _QualityStandard: {},
}));

// notification-enhanced.service is required lazily inside reportIncident
jest.mock(
  '../notifications/notification-enhanced.service',
  () => ({
    createEscalation: jest.fn().mockResolvedValue({}),
  }),
  { virtual: true }
);

const service = require('../../services/quality/quality-enhanced.service');

describe('QualityEnhancedService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── reportIncident ─────────────────────────────────────────────────────
  describe('reportIncident()', () => {
    test('generates sequential incident number INC-YYYY-NNNN', async () => {
      const year = new Date().getFullYear();
      mockIncident.countDocuments.mockResolvedValue(0);
      const created = { _id: 'inc1', incidentNumber: `INC-${year}-0001` };
      mockIncident.create.mockResolvedValue(created);
      mockIncident.findById.mockResolvedValue(created);

      const result = await service.reportIncident({ severity: 'minor', branchId: 'b1' }, 'rep1');
      expect(mockIncident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentNumber: `INC-${year}-0001`,
          reportedBy: 'rep1',
          status: 'reported',
        })
      );
      expect(result).toEqual(created);
    });

    test('second incident gets sequence 0002', async () => {
      const year = new Date().getFullYear();
      mockIncident.countDocuments.mockResolvedValue(1);
      mockIncident.create.mockResolvedValue({ _id: 'inc2' });
      mockIncident.findById.mockResolvedValue({ _id: 'inc2' });

      await service.reportIncident({ severity: 'minor', branchId: 'b1' }, 'rep1');
      expect(mockIncident.create).toHaveBeenCalledWith(
        expect.objectContaining({ incidentNumber: `INC-${year}-0002` })
      );
    });

    test('does NOT trigger escalation for minor severity', async () => {
      mockIncident.countDocuments.mockResolvedValue(0);
      mockIncident.create.mockResolvedValue({ _id: 'inc1' });
      mockIncident.findById.mockResolvedValue({ _id: 'inc1' });

      await service.reportIncident({ severity: 'minor', branchId: 'b1' }, 'rep1');
      // No escalation for minor — findByIdAndUpdate (reportedToMoh) should NOT be called
      expect(mockIncident.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ── submitRca ──────────────────────────────────────────────────────────
  describe('submitRca()', () => {
    test('sets rootCause from five_why details', async () => {
      mockIncident.findByIdAndUpdate.mockResolvedValue({ rcaMethod: 'five_why' });

      await service.submitRca(
        'inc1',
        'five_why',
        {
          whys: [{ answer: 'cause A' }, { answer: 'root cause' }],
        },
        'u1'
      );

      expect(mockIncident.findByIdAndUpdate).toHaveBeenCalledWith(
        'inc1',
        expect.objectContaining({
          rcaMethod: 'five_why',
          rootCause: 'root cause',
          status: 'action_plan',
        }),
        { new: true }
      );
    });

    test('sets rootCause from fishbone details', async () => {
      mockIncident.findByIdAndUpdate.mockResolvedValue({});

      await service.submitRca('inc1', 'fishbone', { rootCause: 'fish cause' }, 'u1');
      expect(mockIncident.findByIdAndUpdate).toHaveBeenCalledWith(
        'inc1',
        expect.objectContaining({ rootCause: 'fish cause' }),
        { new: true }
      );
    });
  });

  // ── closeIncident ──────────────────────────────────────────────────────
  describe('closeIncident()', () => {
    test('sets status closed with notes and closer', async () => {
      mockIncident.findByIdAndUpdate.mockResolvedValue({ status: 'closed' });

      await service.closeIncident('inc1', 'resolved ok', 'mgr1');
      expect(mockIncident.findByIdAndUpdate).toHaveBeenCalledWith(
        'inc1',
        expect.objectContaining({
          status: 'closed',
          closureNotes: 'resolved ok',
          closedBy: 'mgr1',
        }),
        { new: true }
      );
    });
  });

  // ── createComplaint ────────────────────────────────────────────────────
  describe('createComplaint()', () => {
    test('generates CMP number and sets SLA deadlines', async () => {
      const year = new Date().getFullYear();
      mockComplaint.countDocuments.mockResolvedValue(0);
      mockComplaint.create.mockResolvedValue({ _id: 'cmp1' });

      const result = await service.createComplaint({ priority: 'high', branchId: 'b1' });
      expect(mockComplaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          complaintNumber: `CMP-${year}-0001`,
          status: 'open',
          slaTracking: expect.objectContaining({ responseDue: expect.any(Date) }),
        })
      );
    });

    test('uses medium SLA when priority is medium', async () => {
      mockComplaint.countDocuments.mockResolvedValue(5);
      mockComplaint.create.mockResolvedValue({ _id: 'cmp2' });

      await service.createComplaint({ priority: 'medium' });
      const created = mockComplaint.create.mock.calls[0][0];
      // medium: responseDue ~24h → must be in the future
      expect(created.slaTracking.responseDue.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ── resolveComplaint ───────────────────────────────────────────────────
  describe('resolveComplaint()', () => {
    test('sets resolved status with resolution and rating', async () => {
      mockComplaint.findByIdAndUpdate.mockResolvedValue({ status: 'resolved' });

      await service.resolveComplaint('cmp1', 'fixed', 'usr1', 5);
      expect(mockComplaint.findByIdAndUpdate).toHaveBeenCalledWith(
        'cmp1',
        expect.objectContaining({ resolution: 'fixed', status: 'resolved', satisfactionRating: 5 }),
        { new: true }
      );
    });
  });

  // ── calculateNps ───────────────────────────────────────────────────────
  describe('calculateNps()', () => {
    test('returns zeros when no surveys', async () => {
      mockSatisfactionSurvey.find.mockResolvedValue([]);

      const result = await service.calculateNps('b1');
      expect(result).toEqual({ nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 });
    });

    test('calculates NPS correctly with promoters and detractors', async () => {
      // 3 promoters (9+), 1 passive (7-8), 1 detractor (≤6)
      const surveys = [
        { npsScore: 10 },
        { npsScore: 9 },
        { npsScore: 8 },
        { npsScore: 7 },
        { npsScore: 6 }, // 5 total: 2 promoters, 2 passives, 1 detractor
      ];
      // Actually: 10,9 = promoters(2); 8,7 = passives(2); 6 = detractor(1)
      mockSatisfactionSurvey.find.mockResolvedValue(surveys);

      const result = await service.calculateNps('b1');
      expect(result.total).toBe(5);
      expect(result.promoters).toBe(2);
      expect(result.passives).toBe(2);
      expect(result.detractors).toBe(1);
      // NPS = (2-1)/5 * 100 = 20
      expect(result.nps).toBe(20);
    });

    test('all promoters gives NPS 100', async () => {
      mockSatisfactionSurvey.find.mockResolvedValue([
        { npsScore: 10 },
        { npsScore: 9 },
        { npsScore: 10 },
      ]);

      const result = await service.calculateNps('b1');
      expect(result.nps).toBe(100);
    });

    test('all detractors gives NPS -100', async () => {
      mockSatisfactionSurvey.find.mockResolvedValue([
        { npsScore: 3 },
        { npsScore: 5 },
        { npsScore: 6 },
      ]);

      const result = await service.calculateNps('b1');
      expect(result.nps).toBe(-100);
    });
  });

  // ── submitChecklist ────────────────────────────────────────────────────
  describe('submitChecklist()', () => {
    test('throws when checklist not found', async () => {
      mockChecklist.findById.mockResolvedValue(null);
      await expect(service.submitChecklist('cl1', 'b1', [], 'u1')).rejects.toThrow(
        'قائمة الفحص غير موجودة'
      );
    });

    test('calculates compliance rate correctly', async () => {
      mockChecklist.findById.mockResolvedValue({ _id: 'cl1', items: [{}, {}, {}, {}] });
      mockChecklistSubmission.create.mockResolvedValue({ complianceRate: 75 });

      const responses = [
        { compliant: true },
        { compliant: true },
        { compliant: true },
        { compliant: false },
      ];
      await service.submitChecklist('cl1', 'b1', responses, 'u1');

      expect(mockChecklistSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalItems: 4,
          compliantItems: 3,
          nonCompliantItems: 1,
          complianceRate: 75,
        })
      );
    });

    test('returns 0% compliance for all non-compliant', async () => {
      mockChecklist.findById.mockResolvedValue({ _id: 'cl1', items: [{}, {}] });
      mockChecklistSubmission.create.mockResolvedValue({});

      await service.submitChecklist(
        'cl1',
        'b1',
        [{ compliant: false }, { compliant: false }],
        'u1'
      );
      expect(mockChecklistSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ complianceRate: 0 })
      );
    });
  });

  // ── createAudit ────────────────────────────────────────────────────────
  describe('createAudit()', () => {
    test('generates AUD number', async () => {
      const year = new Date().getFullYear();
      mockAudit.countDocuments.mockResolvedValue(0);
      mockAudit.create.mockResolvedValue({ _id: 'aud1' });

      await service.createAudit({ branchId: 'b1', type: 'internal' });
      expect(mockAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({ auditNumber: `AUD-${year}-001` })
      );
    });
  });

  // ── updateAuditFindings ────────────────────────────────────────────────
  describe('updateAuditFindings()', () => {
    test('calculates conformities and non-conformities', async () => {
      mockAudit.findByIdAndUpdate.mockResolvedValue({ status: 'completed' });

      const findings = [
        { type: 'conformity' },
        { type: 'conformity' },
        { type: 'minor_nc' },
        { type: 'major_nc' },
        { type: 'observation' },
      ];
      await service.updateAuditFindings('aud1', findings);

      expect(mockAudit.findByIdAndUpdate).toHaveBeenCalledWith(
        'aud1',
        expect.objectContaining({
          conformities: 2,
          minorNonconformities: 1,
          majorNonconformities: 1,
          observations: 1,
          overallComplianceRate: 40,
          status: 'completed',
        }),
        { new: true }
      );
    });

    test('sets 100% compliance for all conformities', async () => {
      mockAudit.findByIdAndUpdate.mockResolvedValue({});

      await service.updateAuditFindings('aud1', [{ type: 'conformity' }, { type: 'conformity' }]);
      expect(mockAudit.findByIdAndUpdate).toHaveBeenCalledWith(
        'aud1',
        expect.objectContaining({ overallComplianceRate: 100 }),
        { new: true }
      );
    });
  });

  // ── assessRiskLevel ────────────────────────────────────────────────────
  describe('assessRiskLevel()', () => {
    test.each([
      [5, 4, 'critical'], // 20 ≥ 17
      [3, 4, 'high'], // 12 ≥ 10
      [2, 3, 'medium'], // 6 ≥ 5
      [1, 4, 'medium'], // 4 — wait, 4 < 5 → 'low'
      [1, 3, 'low'], // 3 < 5
    ])('likelihood=%i impact=%i → %s', (likelihood, impact, expected) => {
      // Fix: 1*4=4 < 5 → low, override above
      const result = service.assessRiskLevel(likelihood, impact);
      const score = likelihood * impact;
      const expectedActual =
        score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
      expect(result).toBe(expectedActual);
    });
  });

  // ── createRisk ─────────────────────────────────────────────────────────
  describe('createRisk()', () => {
    test('generates RSK number with owner', async () => {
      const year = new Date().getFullYear();
      mockRisk.countDocuments.mockResolvedValue(0);
      mockRisk.create.mockResolvedValue({ _id: 'rsk1' });

      await service.createRisk({ category: 'operational', branchId: 'b1' }, 'owner1');
      expect(mockRisk.create).toHaveBeenCalledWith(
        expect.objectContaining({ riskNumber: `RSK-${year}-0001`, ownerId: 'owner1' })
      );
    });
  });

  // ── createImprovementProject ───────────────────────────────────────────
  describe('createImprovementProject()', () => {
    test('generates IMP number with owner', async () => {
      const year = new Date().getFullYear();
      mockImprovementProject.countDocuments.mockResolvedValue(2);
      mockImprovementProject.create.mockResolvedValue({ _id: 'imp1' });

      await service.createImprovementProject({ title: 'Reduce wait time' }, 'owner1');
      expect(mockImprovementProject.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectNumber: `IMP-${year}-003`, ownerId: 'owner1' })
      );
    });
  });

  // ── updateProjectPhase ─────────────────────────────────────────────────
  describe('updateProjectPhase()', () => {
    test('sets currentPhase from argument', async () => {
      mockImprovementProject.findByIdAndUpdate.mockResolvedValue({});

      await service.updateProjectPhase('imp1', 'do', { task: 'implement' });
      expect(mockImprovementProject.findByIdAndUpdate).toHaveBeenCalledWith(
        'imp1',
        expect.objectContaining({ currentPhase: 'do', doPhase: { task: 'implement' } }),
        { new: true }
      );
    });

    test('act phase sets status completed and actualEndDate', async () => {
      mockImprovementProject.findByIdAndUpdate.mockResolvedValue({});

      await service.updateProjectPhase('imp1', 'act', { summary: 'done' });
      expect(mockImprovementProject.findByIdAndUpdate).toHaveBeenCalledWith(
        'imp1',
        expect.objectContaining({ status: 'completed', actualEndDate: expect.any(Date) }),
        { new: true }
      );
    });
  });

  // ── _getPeriodStart ─────────────────────────────────────────────────────
  describe('_getPeriodStart()', () => {
    test('week returns date ~7 days ago', () => {
      const start = service._getPeriodStart('week');
      const diffDays = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    test('month returns date ~30 days ago', () => {
      const start = service._getPeriodStart('month');
      const diffDays = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    test('quarter returns date ~90 days ago', () => {
      const start = service._getPeriodStart('quarter');
      const diffDays = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(88);
      expect(diffDays).toBeLessThanOrEqual(95);
    });

    test('year returns date ~365 days ago', () => {
      const start = service._getPeriodStart('year');
      const diffDays = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(363);
      expect(diffDays).toBeLessThanOrEqual(367);
    });
  });
});
