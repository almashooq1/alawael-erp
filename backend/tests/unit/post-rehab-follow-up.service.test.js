/**
 * Unit Tests — PostRehabFollowUpService
 * خدمة المتابعة ما بعد التأهيل
 *
 * Covers: Cases, Visits, Impact Measurement, Surveys, Re-Enrollment, Dashboard, Helpers
 */

/* ---------- mock infrastructure ---------- */

// Store shared mockSave on global so jest.mock factory can access it
global.__mockSave = jest.fn().mockResolvedValue({});

jest.mock('../../models/PostRehabFollowUp', () => {
  const mockSave = global.__mockSave;
  function buildModel() {
    const C = jest.fn().mockImplementation(data => ({
      ...(data || {}),
      _id: data?._id || 'mock-id',
      save: mockSave,
      alerts: [],
      followUpPlan: {
        startDate: null,
        endDate: null,
        duration: '2_YEARS',
        frequency: 'MONTHLY',
        nextScheduledVisit: null,
        totalPlannedVisits: 0,
        completedVisits: 0,
        missedVisits: 0,
        ...(data?.followUpPlan || {}),
      },
      impactMilestones: data?.impactMilestones || [],
      dischargeScores: data?.dischargeScores || [],
    }));
    C.find = jest.fn().mockReturnThis();
    C.findById = jest.fn();
    C.findByIdAndUpdate = jest.fn();
    C.findOne = jest.fn();
    C.findOneAndUpdate = jest.fn();
    C.countDocuments = jest.fn().mockResolvedValue(0);
    C.aggregate = jest.fn().mockResolvedValue([]);
    C.populate = jest.fn().mockReturnThis();
    C.sort = jest.fn().mockReturnThis();
    C.skip = jest.fn().mockReturnThis();
    C.limit = jest.fn().mockReturnThis();
    return C;
  }
  return {
    PostRehabCase: buildModel(),
    FollowUpVisit: buildModel(),
    ImpactMeasurement: buildModel(),
    PostRehabSurvey: buildModel(),
    ReEnrollmentRequest: buildModel(),
  };
});

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

// Grab references AFTER mocking
const {
  PostRehabCase,
  FollowUpVisit,
  ImpactMeasurement,
  PostRehabSurvey,
  ReEnrollmentRequest,
} = require('../../models/PostRehabFollowUp');

const mockSave = global.__mockSave;

const service = require('../../services/postRehabFollowUp.service');

/* ---------- helpers ---------- */

/** Build a chainable query mock (find → populate → sort → skip → limit) */
const mockQuery = resolvedValue => {
  const chain = {
    populate: jest.fn().mockReturnValue(undefined), // overwritten below
    sort: jest.fn().mockReturnValue(undefined),
    skip: jest.fn().mockReturnValue(undefined),
    limit: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  return chain;
};

/** Build a chainable query for findById → populate chains */
const mockFindByIdChain = resolvedValue => {
  const chain = {
    populate: jest.fn().mockReturnValue(undefined),
    sort: jest.fn().mockReturnValue(undefined),
  };
  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  // The last populate call should resolve to the value
  // We use a trick: store resolved and make last populate resolve
  // Actually just make populate always return chain, and then set last call manually
  // The simplest: make chain itself thenable
  chain.then = resolve => resolve(resolvedValue);
  return chain;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — module exports', () => {
  it('should export an object (singleton)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  it.each([
    'createCase',
    'getCaseById',
    'listCases',
    'updateCase',
    'addAlert',
    'resolveAlert',
    'getOverdueCases',
    'scheduleVisit',
    'completeVisit',
    'getVisitById',
    'listVisits',
    'markVisitMissed',
    'getUpcomingVisits',
    'createImpactMeasurement',
    'getImpactMeasurementById',
    'listImpactMeasurements',
    'getImpactComparisonReport',
    'createSurvey',
    'submitSurveyResponses',
    'getSurveyById',
    'listSurveys',
    'getSurveyTemplates',
    'createReEnrollmentRequest',
    'reviewReEnrollmentRequest',
    'getReEnrollmentRequestById',
    'listReEnrollmentRequests',
    'getDashboardStats',
    '_calculateNextVisitDate',
    '_checkForRegression',
    '_autoTriggerReEnrollment',
    '_buildImpactTimeline',
  ])('should have method %s', method => {
    expect(typeof service[method]).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. POST-REHAB CASES
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Post-Rehab Cases', () => {
  // ── createCase ──────────────────────────────────────────────────────────
  describe('createCase', () => {
    it('should create a case without dischargeDate', async () => {
      const data = { beneficiary: 'b1', branch: 'br1' };
      const res = await service.createCase(data);
      expect(res.success).toBe(true);
      expect(res.message).toMatch(/تم إنشاء/);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should auto-generate 3 impact milestones when dischargeDate given', async () => {
      const data = {
        beneficiary: 'b1',
        dischargeDate: '2025-01-01',
        followUpPlan: { duration: '2_YEARS' },
      };
      PostRehabCase.mockImplementation(d => ({
        ...d,
        _id: 'case-1',
        followUpPlan: { duration: '2_YEARS', ...d.followUpPlan },
        impactMilestones: [],
        save: mockSave,
      }));
      const res = await service.createCase(data);
      expect(res.success).toBe(true);
      expect(res.data.impactMilestones).toHaveLength(3);
      const labels = res.data.impactMilestones.map(m => m.milestone);
      expect(labels).toEqual(['6_MONTHS', '1_YEAR', '2_YEARS']);
      res.data.impactMilestones.forEach(m => {
        expect(m.isCompleted).toBe(false);
        expect(m.dueDate).toBeInstanceOf(Date);
      });
    });

    it('should set followUpPlan.startDate to dischargeDate when not provided', async () => {
      const discharge = '2025-06-01';
      PostRehabCase.mockImplementation(d => ({
        ...d,
        _id: 'case-2',
        followUpPlan: { duration: '1_YEAR', ...d.followUpPlan },
        impactMilestones: [],
        save: mockSave,
      }));
      const res = await service.createCase({
        beneficiary: 'b1',
        dischargeDate: discharge,
        followUpPlan: { duration: '1_YEAR' },
      });
      expect(res.data.followUpPlan.startDate).toEqual(new Date(discharge));
    });

    it('should compute followUpPlan.endDate based on duration map', async () => {
      PostRehabCase.mockImplementation(d => ({
        ...d,
        _id: 'case-3',
        followUpPlan: { duration: '6_MONTHS', ...d.followUpPlan },
        impactMilestones: [],
        save: mockSave,
      }));
      const res = await service.createCase({
        beneficiary: 'b1',
        dischargeDate: '2025-01-01',
        followUpPlan: { duration: '6_MONTHS' },
      });
      expect(res.data.followUpPlan.endDate).toBeInstanceOf(Date);
    });

    it('should default duration to 24 months if unknown', async () => {
      PostRehabCase.mockImplementation(d => ({
        ...d,
        _id: 'case-def',
        followUpPlan: { duration: 'UNKNOWN', ...d.followUpPlan },
        impactMilestones: [],
        save: mockSave,
      }));
      const res = await service.createCase({
        beneficiary: 'b1',
        dischargeDate: '2025-01-01',
        followUpPlan: { duration: 'UNKNOWN' },
      });
      expect(res.data.followUpPlan.endDate).toBeInstanceOf(Date);
    });

    it('should not overwrite followUpPlan.endDate if already set', async () => {
      const explicitEnd = new Date('2030-01-01');
      PostRehabCase.mockImplementation(d => ({
        ...d,
        _id: 'case-4',
        followUpPlan: { duration: '2_YEARS', endDate: explicitEnd, ...d.followUpPlan },
        impactMilestones: [],
        save: mockSave,
      }));
      const res = await service.createCase({
        beneficiary: 'b1',
        dischargeDate: '2025-01-01',
        followUpPlan: { duration: '2_YEARS', endDate: explicitEnd },
      });
      expect(res.data.followUpPlan.endDate).toEqual(explicitEnd);
    });
  });

  // ── getCaseById ─────────────────────────────────────────────────────────
  describe('getCaseById', () => {
    it('should return case when found', async () => {
      const fakeCaseChain = mockFindByIdChain({ _id: 'c1', caseNumber: 'PR-001' });
      PostRehabCase.findById.mockReturnValue(fakeCaseChain);
      const res = await service.getCaseById('c1');
      expect(res.success).toBe(true);
      expect(res.data.caseNumber).toBe('PR-001');
    });

    it('should throw when case not found', async () => {
      PostRehabCase.findById.mockReturnValue(mockFindByIdChain(null));
      await expect(service.getCaseById('bad')).rejects.toThrow('حالة المتابعة غير موجودة');
    });
  });

  // ── listCases ──────────────────────────────────────────────────────────
  describe('listCases', () => {
    it('should return paginated results with default params', async () => {
      const chain = mockQuery([{ _id: 'c1' }]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(1);
      const res = await service.listCases();
      expect(res.success).toBe(true);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.limit).toBe(20);
    });

    it('should apply status filter', async () => {
      const chain = mockQuery([]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(0);
      await service.listCases({ status: 'ACTIVE' });
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter.status).toBe('ACTIVE');
    });

    it('should apply priority, category, assignedSpecialist, branch filters', async () => {
      const chain = mockQuery([]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(0);
      await service.listCases({
        priority: 'HIGH',
        category: 'PHYSICAL',
        assignedSpecialist: 's1',
        branch: 'br1',
      });
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter.priority).toBe('HIGH');
      expect(filter.category).toBe('PHYSICAL');
      expect(filter.assignedSpecialist).toBe('s1');
      expect(filter.branch).toBe('br1');
    });

    it('should build regex $or for search', async () => {
      const chain = mockQuery([]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(0);
      await service.listCases({ search: 'test' });
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter.$or).toHaveLength(4);
    });

    it('should apply dueSoon filter', async () => {
      const chain = mockQuery([]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(0);
      await service.listCases({ dueSoon: '14' });
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter['followUpPlan.nextScheduledVisit']).toBeDefined();
      expect(filter['followUpPlan.nextScheduledVisit'].$gte).toBeInstanceOf(Date);
      expect(filter['followUpPlan.nextScheduledVisit'].$lte).toBeInstanceOf(Date);
    });

    it('should default dueSoon to 7 days when non-numeric', async () => {
      const chain = mockQuery([]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(0);
      await service.listCases({ dueSoon: 'abc' });
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter['followUpPlan.nextScheduledVisit']).toBeDefined();
    });

    it('should compute pages in pagination', async () => {
      const chain = mockQuery([{}, {}, {}]);
      PostRehabCase.find.mockReturnValue(chain);
      PostRehabCase.countDocuments.mockResolvedValue(45);
      const res = await service.listCases({ page: 2, limit: 10 });
      expect(res.pagination.pages).toBe(5);
      expect(res.pagination.total).toBe(45);
    });
  });

  // ── updateCase ─────────────────────────────────────────────────────────
  describe('updateCase', () => {
    it('should update and return case', async () => {
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({ _id: 'c1', status: 'COMPLETED' });
      const res = await service.updateCase('c1', { status: 'COMPLETED' });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('COMPLETED');
    });

    it('should throw when case not found', async () => {
      PostRehabCase.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateCase('bad', {})).rejects.toThrow('حالة المتابعة غير موجودة');
    });
  });

  // ── addAlert ───────────────────────────────────────────────────────────
  describe('addAlert', () => {
    it('should push alert to case', async () => {
      const alerts = [];
      alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        alerts,
        priority: 'NORMAL',
        save: mockSave,
      });
      const res = await service.addAlert('c1', { type: 'INFO', severity: 'LOW' });
      expect(res.success).toBe(true);
      expect(alerts.push).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should escalate priority to CRITICAL when severity=CRITICAL', async () => {
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);
      await service.addAlert('c1', { severity: 'CRITICAL' });
      expect(caseObj.priority).toBe('CRITICAL');
    });

    it('should NOT escalate priority when already CRITICAL', async () => {
      const caseObj = { _id: 'c1', alerts: [], priority: 'CRITICAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);
      await service.addAlert('c1', { severity: 'CRITICAL' });
      expect(caseObj.priority).toBe('CRITICAL');
    });

    it('should throw when case not found', async () => {
      PostRehabCase.findById.mockResolvedValue(null);
      await expect(service.addAlert('bad', {})).rejects.toThrow('حالة المتابعة غير موجودة');
    });

    it('should initialise alerts array when undefined', async () => {
      const caseObj = { _id: 'c1', priority: 'NORMAL', save: mockSave };
      PostRehabCase.findById.mockResolvedValue(caseObj);
      await service.addAlert('c1', { severity: 'LOW' });
      expect(Array.isArray(caseObj.alerts)).toBe(true);
    });
  });

  // ── resolveAlert ──────────────────────────────────────────────────────
  describe('resolveAlert', () => {
    it('should mark alert as resolved', async () => {
      const alert = { isResolved: false, resolvedAt: null, resolvedBy: null };
      const caseObj = {
        _id: 'c1',
        alerts: { id: jest.fn().mockReturnValue(alert) },
        save: mockSave,
      };
      PostRehabCase.findById.mockResolvedValue(caseObj);
      const res = await service.resolveAlert('c1', 'a1', 'u1');
      expect(res.success).toBe(true);
      expect(alert.isResolved).toBe(true);
      expect(alert.resolvedBy).toBe('u1');
      expect(alert.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw when case not found', async () => {
      PostRehabCase.findById.mockResolvedValue(null);
      await expect(service.resolveAlert('bad', 'a1', 'u1')).rejects.toThrow(
        'حالة المتابعة غير موجودة'
      );
    });

    it('should throw when alert not found', async () => {
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        alerts: { id: jest.fn().mockReturnValue(null) },
        save: mockSave,
      });
      await expect(service.resolveAlert('c1', 'bad-alert', 'u1')).rejects.toThrow(
        'التنبيه غير موجود'
      );
    });
  });

  // ── getOverdueCases ────────────────────────────────────────────────────
  describe('getOverdueCases', () => {
    it('should return overdue ACTIVE cases', async () => {
      const chain = mockFindByIdChain([{ _id: 'c1' }, { _id: 'c2' }]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      PostRehabCase.find.mockReturnValue(chain);
      const res = await service.getOverdueCases();
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      const filter = PostRehabCase.find.mock.calls[0][0];
      expect(filter.status).toBe('ACTIVE');
      expect(filter['followUpPlan.nextScheduledVisit'].$lt).toBeInstanceOf(Date);
    });

    it('should return count 0 when no overdue', async () => {
      const chain = mockFindByIdChain([]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      PostRehabCase.find.mockReturnValue(chain);
      const res = await service.getOverdueCases();
      expect(res.count).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. FOLLOW-UP VISITS
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Follow-Up Visits', () => {
  // ── scheduleVisit ──────────────────────────────────────────────────────
  describe('scheduleVisit', () => {
    it('should auto-set visitNumber via countDocuments', async () => {
      FollowUpVisit.countDocuments.mockResolvedValue(4);
      FollowUpVisit.mockImplementation(d => ({ ...d, _id: 'v1', save: mockSave }));
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      const res = await service.scheduleVisit({
        postRehabCase: 'c1',
        scheduledDate: new Date(),
      });
      expect(res.success).toBe(true);
      expect(res.data.visitNumber).toBe(5);
    });

    it('should keep explicit visitNumber if provided', async () => {
      FollowUpVisit.mockImplementation(d => ({ ...d, _id: 'v1', save: mockSave }));
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      const res = await service.scheduleVisit({
        postRehabCase: 'c1',
        scheduledDate: new Date(),
        visitNumber: 10,
      });
      expect(res.data.visitNumber).toBe(10);
    });

    it('should update case nextScheduledVisit and inc totalPlannedVisits', async () => {
      FollowUpVisit.countDocuments.mockResolvedValue(0);
      FollowUpVisit.mockImplementation(d => ({ ...d, _id: 'v1', save: mockSave }));
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      const sched = new Date('2026-05-01');
      await service.scheduleVisit({ postRehabCase: 'c1', scheduledDate: sched });
      expect(PostRehabCase.findByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          'followUpPlan.nextScheduledVisit': sched,
          $inc: { 'followUpPlan.totalPlannedVisits': 1 },
        })
      );
    });
  });

  // ── completeVisit ─────────────────────────────────────────────────────
  describe('completeVisit', () => {
    const baseVisit = () => ({
      _id: 'v1',
      postRehabCase: 'c1',
      beneficiary: 'b1',
      needsReEnrollment: false,
      domainScores: [],
      save: mockSave,
    });

    it('should mark visit COMPLETED and update case completedVisits', async () => {
      const visit = baseVisit();
      FollowUpVisit.findById.mockResolvedValue(visit);
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        status: 'ACTIVE',
        followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2030-01-01') },
      });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      // Mock _checkForRegression - addAlert needs findById
      PostRehabCase.findById.mockResolvedValueOnce({
        _id: 'c1',
        status: 'ACTIVE',
        followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2030-01-01') },
      });

      const res = await service.completeVisit('v1', { notes: 'Good progress' });
      expect(res.success).toBe(true);
      expect(visit.status).toBe('COMPLETED');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should set actualDate to now if not provided', async () => {
      const visit = baseVisit();
      FollowUpVisit.findById.mockResolvedValue(visit);
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        status: 'ACTIVE',
        followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2030-01-01') },
      });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      await service.completeVisit('v1', {});
      expect(visit.actualDate).toBeInstanceOf(Date);
    });

    it('should throw when visit not found', async () => {
      FollowUpVisit.findById.mockResolvedValue(null);
      await expect(service.completeVisit('bad', {})).rejects.toThrow('الزيارة غير موجودة');
    });

    it('should trigger auto re-enrollment when needsReEnrollment', async () => {
      const visit = { ...baseVisit(), needsReEnrollment: true };
      FollowUpVisit.findById.mockResolvedValue(visit);
      // For _autoTriggerReEnrollment: need ReEnrollmentRequest.findOne to return null
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      // For createReEnrollmentRequest inside _autoTriggerReEnrollment
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-001',
        save: mockSave,
      }));
      // Call order: 1) addAlert→findById (needs save+alerts), 2) completeVisit→findById (needs status+followUpPlan)
      const alertCase = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      alertCase.alerts.push = jest.fn();
      PostRehabCase.findById
        .mockResolvedValueOnce(alertCase) // addAlert inside createReEnrollmentRequest
        .mockResolvedValueOnce({
          _id: 'c1',
          status: 'ACTIVE',
          followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2030-01-01') },
        }); // scheduling
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      const res = await service.completeVisit('v1', {});
      expect(res.success).toBe(true);
    });

    it('should NOT schedule next visit if case is not ACTIVE', async () => {
      const visit = baseVisit();
      FollowUpVisit.findById.mockResolvedValue(visit);
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        status: 'COMPLETED',
        followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2030-01-01') },
      });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      await service.completeVisit('v1', {});
      // caseUpdate should NOT have nextScheduledVisit
      const updateCall = PostRehabCase.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall['followUpPlan.nextScheduledVisit']).toBeUndefined();
    });

    it('should NOT schedule next visit if next date exceeds endDate', async () => {
      const visit = baseVisit();
      FollowUpVisit.findById.mockResolvedValue(visit);
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        status: 'ACTIVE',
        followUpPlan: { frequency: 'MONTHLY', endDate: new Date('2020-01-01') }, // past
      });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      await service.completeVisit('v1', { actualDate: new Date('2025-12-01') });
      const updateCall = PostRehabCase.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall['followUpPlan.nextScheduledVisit']).toBeUndefined();
    });
  });

  // ── getVisitById ──────────────────────────────────────────────────────
  describe('getVisitById', () => {
    it('should return visit when found', async () => {
      FollowUpVisit.findById.mockReturnValue(mockFindByIdChain({ _id: 'v1' }));
      const res = await service.getVisitById('v1');
      expect(res.success).toBe(true);
      expect(res.data._id).toBe('v1');
    });

    it('should throw when visit not found', async () => {
      FollowUpVisit.findById.mockReturnValue(mockFindByIdChain(null));
      await expect(service.getVisitById('bad')).rejects.toThrow('الزيارة غير موجودة');
    });
  });

  // ── listVisits ────────────────────────────────────────────────────────
  describe('listVisits', () => {
    it('should return paginated visits', async () => {
      const chain = mockQuery([{ _id: 'v1' }]);
      FollowUpVisit.find.mockReturnValue(chain);
      FollowUpVisit.countDocuments.mockResolvedValue(1);
      const res = await service.listVisits({ page: 1, limit: 10 });
      expect(res.success).toBe(true);
      expect(res.pagination.total).toBe(1);
    });

    it('should apply postRehabCase, beneficiary, conductedBy, status, visitType filters', async () => {
      const chain = mockQuery([]);
      FollowUpVisit.find.mockReturnValue(chain);
      FollowUpVisit.countDocuments.mockResolvedValue(0);
      await service.listVisits({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        conductedBy: 's1',
        status: 'COMPLETED',
        visitType: 'HOME',
      });
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.postRehabCase).toBe('c1');
      expect(filter.beneficiary).toBe('b1');
      expect(filter.conductedBy).toBe('s1');
      expect(filter.status).toBe('COMPLETED');
      expect(filter.visitType).toBe('HOME');
    });

    it('should apply date range filter', async () => {
      const chain = mockQuery([]);
      FollowUpVisit.find.mockReturnValue(chain);
      FollowUpVisit.countDocuments.mockResolvedValue(0);
      await service.listVisits({ startDate: '2025-01-01', endDate: '2025-12-31' });
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.scheduledDate.$gte).toBeInstanceOf(Date);
      expect(filter.scheduledDate.$lte).toBeInstanceOf(Date);
    });

    it('should apply only startDate', async () => {
      const chain = mockQuery([]);
      FollowUpVisit.find.mockReturnValue(chain);
      FollowUpVisit.countDocuments.mockResolvedValue(0);
      await service.listVisits({ startDate: '2025-01-01' });
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.scheduledDate.$gte).toBeInstanceOf(Date);
      expect(filter.scheduledDate.$lte).toBeUndefined();
    });
  });

  // ── markVisitMissed ───────────────────────────────────────────────────
  describe('markVisitMissed', () => {
    it('should mark visit as MISSED', async () => {
      FollowUpVisit.findByIdAndUpdate.mockResolvedValue({ _id: 'v1', postRehabCase: 'c1' });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        followUpPlan: { missedVisits: 1 },
      });
      const res = await service.markVisitMissed('v1', 'Patient unavailable');
      expect(res.success).toBe(true);
      expect(FollowUpVisit.findByIdAndUpdate).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({ status: 'MISSED' }),
        expect.anything()
      );
    });

    it('should throw when visit not found', async () => {
      FollowUpVisit.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.markVisitMissed('bad', 'reason')).rejects.toThrow('الزيارة غير موجودة');
    });

    it('should increment missedVisits on the case', async () => {
      FollowUpVisit.findByIdAndUpdate.mockResolvedValue({ _id: 'v1', postRehabCase: 'c1' });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      PostRehabCase.findById.mockResolvedValue({ _id: 'c1', followUpPlan: { missedVisits: 1 } });
      await service.markVisitMissed('v1', 'reason');
      expect(PostRehabCase.findByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          $inc: { 'followUpPlan.missedVisits': 1 },
        })
      );
    });

    it('should add HIGH alert when missedVisits >= 3', async () => {
      FollowUpVisit.findByIdAndUpdate.mockResolvedValue({ _id: 'v1', postRehabCase: 'c1' });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      const caseObj = {
        _id: 'c1',
        followUpPlan: { missedVisits: 3 },
        alerts: [],
        priority: 'NORMAL',
        save: mockSave,
      };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById
        .mockResolvedValueOnce(caseObj) // first call in markVisitMissed check
        .mockResolvedValueOnce(caseObj); // second call from addAlert
      const res = await service.markVisitMissed('v1', 'reason');
      expect(res.success).toBe(true);
      // addAlert should have been triggered
      expect(caseObj.alerts.push).toHaveBeenCalled();
    });

    it('should NOT add alert when missedVisits < 3', async () => {
      FollowUpVisit.findByIdAndUpdate.mockResolvedValue({ _id: 'v1', postRehabCase: 'c1' });
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        followUpPlan: { missedVisits: 2 },
      });
      await service.markVisitMissed('v1', 'reason');
      // save for addAlert should not be called extra times
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  // ── getUpcomingVisits ─────────────────────────────────────────────────
  describe('getUpcomingVisits', () => {
    it('should return SCHEDULED visits in N days range', async () => {
      const chain = mockFindByIdChain([{ _id: 'v1' }]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      FollowUpVisit.find.mockReturnValue(chain);
      const res = await service.getUpcomingVisits(14);
      expect(res.success).toBe(true);
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.status).toBe('SCHEDULED');
    });

    it('should default to 7 days', async () => {
      const chain = mockFindByIdChain([]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      FollowUpVisit.find.mockReturnValue(chain);
      await service.getUpcomingVisits();
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.scheduledDate.$gte).toBeInstanceOf(Date);
      expect(filter.scheduledDate.$lte).toBeInstanceOf(Date);
    });

    it('should add specialistId filter when provided', async () => {
      const chain = mockFindByIdChain([]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      FollowUpVisit.find.mockReturnValue(chain);
      await service.getUpcomingVisits(7, 'sp1');
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.conductedBy).toBe('sp1');
    });

    it('should NOT add specialistId filter when null', async () => {
      const chain = mockFindByIdChain([]);
      chain.sort = jest.fn().mockImplementation(() => chain);
      FollowUpVisit.find.mockReturnValue(chain);
      await service.getUpcomingVisits(7, null);
      const filter = FollowUpVisit.find.mock.calls[0][0];
      expect(filter.conductedBy).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMPACT MEASUREMENT
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Impact Measurement', () => {
  // ── createImpactMeasurement ────────────────────────────────────────────
  describe('createImpactMeasurement', () => {
    beforeEach(() => {
      ImpactMeasurement.mockImplementation(d => ({ ...d, _id: 'im1', save: mockSave }));
      PostRehabCase.findOneAndUpdate.mockResolvedValue({});
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
    });

    it('should calculate improvementPercentage', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallScore: 80,
        overallScoreAtDischarge: 50,
        milestone: '6_MONTHS',
      });
      expect(res.success).toBe(true);
      expect(res.data.improvementPercentage).toBe(60); // ((80-50)/50)*100 = 60
    });

    it('should set improvementPercentage to 0 when discharge score is 0', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        overallScore: 80,
        overallScoreAtDischarge: 0,
        milestone: '6_MONTHS',
      });
      expect(res.data.improvementPercentage).toBe(0);
    });

    it('should set overallTrend SIGNIFICANT_IMPROVEMENT when >= 20%', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        overallScore: 120,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBe('SIGNIFICANT_IMPROVEMENT');
    });

    it('should set overallTrend MODERATE_IMPROVEMENT when >= 5% and < 20%', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        overallScore: 110,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBe('MODERATE_IMPROVEMENT');
    });

    it('should set overallTrend STABLE when >= -5% and < 5%', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        overallScore: 100,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBe('STABLE');
    });

    it('should set overallTrend SLIGHT_DECLINE when >= -20% and < -5%', async () => {
      // needsIntervention triggers _autoTriggerReEnrollment → createReEnrollmentRequest → addAlert
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-A',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallScore: 85,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBe('SLIGHT_DECLINE');
      expect(res.data.riskLevel).toBe('HIGH');
      expect(res.data.needsIntervention).toBe(true);
    });

    it('should set overallTrend SIGNIFICANT_DECLINE when < -20%', async () => {
      // needsIntervention triggers _autoTriggerReEnrollment → createReEnrollmentRequest → addAlert
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-B',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallScore: 50,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBe('SIGNIFICANT_DECLINE');
      expect(res.data.riskLevel).toBe('CRITICAL');
      expect(res.data.needsIntervention).toBe(true);
    });

    it('should mark milestone on the case', async () => {
      await service.createImpactMeasurement({
        postRehabCase: 'c1',
        overallScore: 120,
        overallScoreAtDischarge: 100,
        milestone: '1_YEAR',
      });
      expect(PostRehabCase.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'c1', 'impactMilestones.milestone': '1_YEAR' },
        expect.objectContaining({
          $set: expect.objectContaining({
            'impactMilestones.$.isCompleted': true,
          }),
        })
      );
    });

    it('should trigger re-enrollment when needsIntervention', async () => {
      // _autoTriggerReEnrollment => createReEnrollmentRequest => addAlert
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-AUTO',
        save: mockSave,
      }));
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        alerts: [],
        priority: 'NORMAL',
        save: mockSave,
      });

      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallScore: 50,
        overallScoreAtDischarge: 100,
        milestone: '6_MONTHS',
      });
      expect(res.success).toBe(true);
      expect(ReEnrollmentRequest.findOne).toHaveBeenCalled();
    });

    it('should NOT set trend when scores are null', async () => {
      const res = await service.createImpactMeasurement({
        postRehabCase: 'c1',
        milestone: '6_MONTHS',
      });
      expect(res.data.overallTrend).toBeUndefined();
    });
  });

  // ── getImpactMeasurementById ──────────────────────────────────────────
  describe('getImpactMeasurementById', () => {
    it('should return measurement when found', async () => {
      ImpactMeasurement.findById.mockReturnValue(mockFindByIdChain({ _id: 'im1' }));
      const res = await service.getImpactMeasurementById('im1');
      expect(res.success).toBe(true);
    });

    it('should throw when not found', async () => {
      ImpactMeasurement.findById.mockReturnValue(mockFindByIdChain(null));
      await expect(service.getImpactMeasurementById('bad')).rejects.toThrow('قياس الأثر غير موجود');
    });
  });

  // ── listImpactMeasurements ────────────────────────────────────────────
  describe('listImpactMeasurements', () => {
    it('should return paginated measurements', async () => {
      const chain = mockQuery([{ _id: 'im1' }]);
      ImpactMeasurement.find.mockReturnValue(chain);
      ImpactMeasurement.countDocuments.mockResolvedValue(1);
      const res = await service.listImpactMeasurements({ page: 1, limit: 5 });
      expect(res.success).toBe(true);
      expect(res.pagination.total).toBe(1);
    });

    it('should apply postRehabCase, beneficiary, milestone, riskLevel filters', async () => {
      const chain = mockQuery([]);
      ImpactMeasurement.find.mockReturnValue(chain);
      ImpactMeasurement.countDocuments.mockResolvedValue(0);
      await service.listImpactMeasurements({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        milestone: '6_MONTHS',
        riskLevel: 'CRITICAL',
      });
      const filter = ImpactMeasurement.find.mock.calls[0][0];
      expect(filter.postRehabCase).toBe('c1');
      expect(filter.beneficiary).toBe('b1');
      expect(filter.milestone).toBe('6_MONTHS');
      expect(filter.riskLevel).toBe('CRITICAL');
    });
  });

  // ── getImpactComparisonReport ─────────────────────────────────────────
  describe('getImpactComparisonReport', () => {
    it('should return report structure', async () => {
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        caseNumber: 'PR-001',
        dischargeDate: new Date('2025-01-01'),
        dischargeScores: [{ domain: 'MOBILITY', score: 70 }],
      });
      const chain = {
        sort: jest.fn().mockResolvedValue([
          {
            milestone: '6_MONTHS',
            measurementDate: new Date(),
            monthsSinceDischarge: 6,
            overallScore: 80,
            improvementPercentage: 14,
            overallTrend: 'MODERATE_IMPROVEMENT',
            riskLevel: 'LOW',
            domainScores: [],
            qualityOfLife: {},
          },
        ]),
      };
      ImpactMeasurement.find.mockReturnValue(chain);

      const res = await service.getImpactComparisonReport('c1');
      expect(res.success).toBe(true);
      expect(res.data.caseNumber).toBe('PR-001');
      expect(res.data.dischargeScores).toHaveLength(1);
      expect(res.data.measurements).toHaveLength(1);
      expect(res.data.timeline).toBeDefined();
    });

    it('should throw when case not found', async () => {
      PostRehabCase.findById.mockResolvedValue(null);
      await expect(service.getImpactComparisonReport('bad')).rejects.toThrow(
        'حالة المتابعة غير موجودة'
      );
    });

    it('should handle empty measurements', async () => {
      PostRehabCase.findById.mockResolvedValue({
        _id: 'c1',
        caseNumber: 'PR-002',
        dischargeDate: new Date(),
        dischargeScores: [],
      });
      ImpactMeasurement.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
      const res = await service.getImpactComparisonReport('c1');
      expect(res.data.measurements).toHaveLength(0);
      expect(res.data.timeline).toHaveLength(1); // just the Discharge entry
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. SURVEYS
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Surveys', () => {
  // ── createSurvey ──────────────────────────────────────────────────────
  describe('createSurvey', () => {
    it('should create and return survey', async () => {
      PostRehabSurvey.mockImplementation(d => ({ ...d, _id: 'sv1', save: mockSave }));
      const res = await service.createSurvey({ postRehabCase: 'c1', surveyType: 'SATISFACTION' });
      expect(res.success).toBe(true);
      expect(res.message).toMatch(/تم إنشاء الاستبيان/);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ── submitSurveyResponses ─────────────────────────────────────────────
  describe('submitSurveyResponses', () => {
    const baseSurvey = () => ({
      _id: 'sv1',
      postRehabCase: 'c1',
      responses: [],
      save: mockSave,
    });

    it('should calculate totalScore, maxScore, scorePercentage', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      // addAlert needs this
      PostRehabCase.findById.mockResolvedValue(null);

      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 4, questionType: 'LIKERT' }, // max 5
          { score: 8, questionType: 'SCALE_1_10' }, // max 10
        ],
      });
      expect(survey.totalScore).toBe(12);
      expect(survey.maxScore).toBe(15);
      expect(survey.scorePercentage).toBe(80); // round(12/15*100)
    });

    it('should set satisfaction VERY_SATISFIED when >= 85%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 5, questionType: 'LIKERT' },
          { score: 9, questionType: 'SCALE_1_10' },
        ],
      });
      // 14/15 = 93%
      expect(survey.satisfactionLevel).toBe('VERY_SATISFIED');
    });

    it('should set satisfaction SATISFIED when >= 70% and < 85%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 4, questionType: 'LIKERT' }, // 4/5
          { score: 7, questionType: 'SCALE_1_10' }, // 7/10
        ],
      });
      // 11/15 = 73%
      expect(survey.satisfactionLevel).toBe('SATISFIED');
    });

    it('should set satisfaction NEUTRAL when >= 50% and < 70%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 3, questionType: 'LIKERT' }, // 3/5
          { score: 5, questionType: 'SCALE_1_10' }, // 5/10
        ],
      });
      // 8/15 = 53%
      expect(survey.satisfactionLevel).toBe('NEUTRAL');
    });

    it('should set satisfaction DISSATISFIED when >= 30% and < 50%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      // 33% < 40% triggers addAlert, so need PostRehabCase.findById mock
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 2, questionType: 'LIKERT' }, // 2/5
          { score: 3, questionType: 'SCALE_1_10' }, // 3/10
        ],
      });
      // 5/15 = 33%
      expect(survey.satisfactionLevel).toBe('DISSATISFIED');
    });

    it('should set satisfaction VERY_DISSATISFIED when < 30%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      // 13% < 40% triggers addAlert, so need PostRehabCase.findById mock
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 1, questionType: 'LIKERT' }, // 1/5
          { score: 1, questionType: 'SCALE_1_10' }, // 1/10
        ],
      });
      // 2/15 = 13%
      expect(survey.satisfactionLevel).toBe('VERY_DISSATISFIED');
    });

    it('should trigger low satisfaction alert when pct < 40%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 1, questionType: 'LIKERT' },
          { score: 2, questionType: 'SCALE_1_10' },
        ],
      });
      // 3/15 = 20% < 40 → alert
      expect(caseObj.alerts.push).toHaveBeenCalled();
    });

    it('should NOT trigger alert when pct >= 40%', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [
          { score: 4, questionType: 'LIKERT' },
          { score: 8, questionType: 'SCALE_1_10' },
        ],
      });
      // 80% → no alert
      expect(PostRehabCase.findById).not.toHaveBeenCalled();
    });

    it('should throw when survey not found', async () => {
      PostRehabSurvey.findById.mockResolvedValue(null);
      await expect(service.submitSurveyResponses('bad', {})).rejects.toThrow('الاستبيان غير موجود');
    });

    it('should set status COMPLETED and completedDate', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', { responses: [] });
      expect(survey.status).toBe('COMPLETED');
      expect(survey.completedDate).toBeInstanceOf(Date);
    });

    it('should handle scorePercentage 0 when maxScore is 0 (no scored responses)', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [{ questionType: 'TEXT', answer: 'Something' }],
      });
      expect(survey.scorePercentage).toBe(0);
    });

    it('should preserve respondentName/respondentRelation from responseData', async () => {
      const survey = baseSurvey();
      PostRehabSurvey.findById.mockResolvedValue(survey);
      await service.submitSurveyResponses('sv1', {
        responses: [],
        respondentName: 'John',
        respondentRelation: 'PARENT',
      });
      expect(survey.respondentName).toBe('John');
      expect(survey.respondentRelation).toBe('PARENT');
    });
  });

  // ── getSurveyById ─────────────────────────────────────────────────────
  describe('getSurveyById', () => {
    it('should return survey when found', async () => {
      PostRehabSurvey.findById.mockReturnValue(mockFindByIdChain({ _id: 'sv1' }));
      const res = await service.getSurveyById('sv1');
      expect(res.success).toBe(true);
    });

    it('should throw when survey not found', async () => {
      PostRehabSurvey.findById.mockReturnValue(mockFindByIdChain(null));
      await expect(service.getSurveyById('bad')).rejects.toThrow('الاستبيان غير موجود');
    });
  });

  // ── listSurveys ───────────────────────────────────────────────────────
  describe('listSurveys', () => {
    it('should return paginated surveys', async () => {
      const chain = mockQuery([]);
      PostRehabSurvey.find.mockReturnValue(chain);
      PostRehabSurvey.countDocuments.mockResolvedValue(0);
      const res = await service.listSurveys();
      expect(res.success).toBe(true);
      expect(res.pagination).toBeDefined();
    });

    it('should apply all filters', async () => {
      const chain = mockQuery([]);
      PostRehabSurvey.find.mockReturnValue(chain);
      PostRehabSurvey.countDocuments.mockResolvedValue(0);
      await service.listSurveys({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        surveyType: 'SATISFACTION',
        status: 'COMPLETED',
        milestone: '6_MONTHS',
      });
      const filter = PostRehabSurvey.find.mock.calls[0][0];
      expect(filter.postRehabCase).toBe('c1');
      expect(filter.surveyType).toBe('SATISFACTION');
      expect(filter.milestone).toBe('6_MONTHS');
    });
  });

  // ── getSurveyTemplates ────────────────────────────────────────────────
  describe('getSurveyTemplates', () => {
    it('should return 3 templates (SYNC)', () => {
      const res = service.getSurveyTemplates();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(3);
    });

    it('should include SATISFACTION template', () => {
      const res = service.getSurveyTemplates();
      const sat = res.data.find(t => t.type === 'SATISFACTION');
      expect(sat).toBeDefined();
      expect(sat.questions.length).toBeGreaterThan(0);
    });

    it('should include OUTCOME template', () => {
      const res = service.getSurveyTemplates();
      expect(res.data.find(t => t.type === 'OUTCOME')).toBeDefined();
    });

    it('should include FAMILY_FEEDBACK template', () => {
      const res = service.getSurveyTemplates();
      expect(res.data.find(t => t.type === 'FAMILY_FEEDBACK')).toBeDefined();
    });

    it('each template should have titleAr and questions with questionAr', () => {
      const res = service.getSurveyTemplates();
      res.data.forEach(t => {
        expect(t.titleAr).toBeDefined();
        t.questions.forEach(q => {
          expect(q.questionAr).toBeDefined();
        });
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. RE-ENROLLMENT
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Re-Enrollment', () => {
  // ── createReEnrollmentRequest ─────────────────────────────────────────
  describe('createReEnrollmentRequest', () => {
    it('should create request and add alert to case', async () => {
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-010',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      const res = await service.createReEnrollmentRequest({
        postRehabCase: 'c1',
        urgencyLevel: 'HIGH',
      });
      expect(res.success).toBe(true);
      expect(caseObj.alerts.push).toHaveBeenCalled();
    });

    it('should set CRITICAL severity when urgencyLevel=URGENT', async () => {
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-011',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service.createReEnrollmentRequest({
        postRehabCase: 'c1',
        urgencyLevel: 'URGENT',
      });
      const alertArg = caseObj.alerts.push.mock.calls[0][0];
      expect(alertArg.severity).toBe('CRITICAL');
    });

    it('should set HIGH severity when urgencyLevel is not URGENT', async () => {
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'r1',
        requestNumber: 'RE-012',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service.createReEnrollmentRequest({
        postRehabCase: 'c1',
        urgencyLevel: 'NORMAL',
      });
      const alertArg = caseObj.alerts.push.mock.calls[0][0];
      expect(alertArg.severity).toBe('HIGH');
    });

    it('should skip addAlert when no postRehabCase', async () => {
      ReEnrollmentRequest.mockImplementation(d => ({ ...d, _id: 'r1', save: mockSave }));
      const res = await service.createReEnrollmentRequest({ urgencyLevel: 'HIGH' });
      expect(res.success).toBe(true);
      expect(PostRehabCase.findById).not.toHaveBeenCalled();
    });
  });

  // ── reviewReEnrollmentRequest ─────────────────────────────────────────
  describe('reviewReEnrollmentRequest', () => {
    it('should approve request and set case status to RE_ENROLLED', async () => {
      const req = {
        _id: 'r1',
        postRehabCase: 'c1',
        save: mockSave,
      };
      ReEnrollmentRequest.findById.mockResolvedValue(req);
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});

      const res = await service.reviewReEnrollmentRequest('r1', {
        approved: true,
        reviewedBy: 'u1',
        notes: 'Approved',
      });
      expect(res.success).toBe(true);
      expect(req.status).toBe('APPROVED');
      expect(req.approvedBy).toBe('u1');
      expect(PostRehabCase.findByIdAndUpdate).toHaveBeenCalledWith('c1', { status: 'RE_ENROLLED' });
    });

    it('should reject request', async () => {
      const req = { _id: 'r1', postRehabCase: 'c1', save: mockSave };
      ReEnrollmentRequest.findById.mockResolvedValue(req);

      const res = await service.reviewReEnrollmentRequest('r1', {
        approved: false,
        reviewedBy: 'u1',
        rejectionReason: 'Not warranted',
      });
      expect(req.status).toBe('REJECTED');
      expect(req.rejectionReason).toBe('Not warranted');
      expect(res.message).toMatch(/رفض/);
    });

    it('should NOT update case status when rejected', async () => {
      const req = { _id: 'r1', postRehabCase: 'c1', save: mockSave };
      ReEnrollmentRequest.findById.mockResolvedValue(req);
      await service.reviewReEnrollmentRequest('r1', { approved: false, reviewedBy: 'u1' });
      expect(PostRehabCase.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw when request not found', async () => {
      ReEnrollmentRequest.findById.mockResolvedValue(null);
      await expect(service.reviewReEnrollmentRequest('bad', {})).rejects.toThrow(
        'طلب إعادة التسجيل غير موجود'
      );
    });

    it('should set reviewDate on approval', async () => {
      const req = { _id: 'r1', postRehabCase: 'c1', save: mockSave };
      ReEnrollmentRequest.findById.mockResolvedValue(req);
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      await service.reviewReEnrollmentRequest('r1', { approved: true, reviewedBy: 'u1' });
      expect(req.reviewDate).toBeInstanceOf(Date);
      expect(req.approvalDate).toBeInstanceOf(Date);
    });

    it('should use recommendedProgram from reviewData when provided', async () => {
      const req = { _id: 'r1', postRehabCase: 'c1', save: mockSave, recommendedProgram: 'old' };
      ReEnrollmentRequest.findById.mockResolvedValue(req);
      PostRehabCase.findByIdAndUpdate.mockResolvedValue({});
      await service.reviewReEnrollmentRequest('r1', {
        approved: true,
        reviewedBy: 'u1',
        recommendedProgram: 'program-new',
      });
      expect(req.recommendedProgram).toBe('program-new');
    });
  });

  // ── getReEnrollmentRequestById ────────────────────────────────────────
  describe('getReEnrollmentRequestById', () => {
    it('should return request when found', async () => {
      ReEnrollmentRequest.findById.mockReturnValue(mockFindByIdChain({ _id: 'r1' }));
      const res = await service.getReEnrollmentRequestById('r1');
      expect(res.success).toBe(true);
    });

    it('should throw when not found', async () => {
      ReEnrollmentRequest.findById.mockReturnValue(mockFindByIdChain(null));
      await expect(service.getReEnrollmentRequestById('bad')).rejects.toThrow(
        'طلب إعادة التسجيل غير موجود'
      );
    });
  });

  // ── listReEnrollmentRequests ──────────────────────────────────────────
  describe('listReEnrollmentRequests', () => {
    it('should return paginated results', async () => {
      const chain = mockQuery([]);
      ReEnrollmentRequest.find.mockReturnValue(chain);
      ReEnrollmentRequest.countDocuments.mockResolvedValue(0);
      const res = await service.listReEnrollmentRequests();
      expect(res.success).toBe(true);
    });

    it('should apply all filters', async () => {
      const chain = mockQuery([]);
      ReEnrollmentRequest.find.mockReturnValue(chain);
      ReEnrollmentRequest.countDocuments.mockResolvedValue(0);
      await service.listReEnrollmentRequests({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        status: 'PENDING',
        requestType: 'AUTOMATIC',
        urgencyLevel: 'URGENT',
      });
      const filter = ReEnrollmentRequest.find.mock.calls[0][0];
      expect(filter.postRehabCase).toBe('c1');
      expect(filter.status).toBe('PENDING');
      expect(filter.requestType).toBe('AUTOMATIC');
      expect(filter.urgencyLevel).toBe('URGENT');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Dashboard Stats', () => {
  beforeEach(() => {
    // Reset all countDocuments to return 0
    PostRehabCase.countDocuments.mockResolvedValue(0);
    FollowUpVisit.countDocuments.mockResolvedValue(0);
    PostRehabSurvey.countDocuments.mockResolvedValue(0);
    ReEnrollmentRequest.countDocuments.mockResolvedValue(0);
    ImpactMeasurement.countDocuments.mockResolvedValue(0);
    PostRehabSurvey.aggregate.mockResolvedValue([]);
    ImpactMeasurement.aggregate.mockResolvedValue([]);
    PostRehabCase.aggregate.mockResolvedValue([]);
  });

  it('should return full dashboard structure', async () => {
    const res = await service.getDashboardStats();
    expect(res.success).toBe(true);
    expect(res.data.cases).toBeDefined();
    expect(res.data.visits).toBeDefined();
    expect(res.data.surveys).toBeDefined();
    expect(res.data.reEnrollment).toBeDefined();
    expect(res.data.alerts).toBeDefined();
    expect(res.data.impact).toBeDefined();
    expect(res.data.categoryDistribution).toBeDefined();
  });

  it('should compute visits.completionRate correctly', async () => {
    // We need to control the order of countDocuments calls: 14 calls in Promise.all
    PostRehabCase.countDocuments
      .mockResolvedValueOnce(10) // totalCases
      .mockResolvedValueOnce(5) // activeCases
      .mockResolvedValueOnce(3) // completedCases
      .mockResolvedValueOnce(1) // reEnrolledCases
      .mockResolvedValueOnce(1) // lostCases
      .mockResolvedValueOnce(0); // criticalAlerts
    FollowUpVisit.countDocuments
      .mockResolvedValueOnce(100) // totalVisits
      .mockResolvedValueOnce(75) // completedVisits
      .mockResolvedValueOnce(10) // missedVisits
      .mockResolvedValueOnce(5); // upcomingVisits
    PostRehabSurvey.countDocuments
      .mockResolvedValueOnce(3) // pendingSurveys
      .mockResolvedValueOnce(7); // completedSurveys
    ReEnrollmentRequest.countDocuments.mockResolvedValueOnce(2); // pendingReEnrollments
    ImpactMeasurement.countDocuments.mockResolvedValueOnce(20); // impactMeasurements

    const res = await service.getDashboardStats();
    expect(res.data.visits.completionRate).toBe(75); // 75/100*100
  });

  it('should handle completionRate 0 when no visits', async () => {
    const res = await service.getDashboardStats();
    expect(res.data.visits.completionRate).toBe(0);
  });

  it('should pass branchId filter when provided', async () => {
    await service.getDashboardStats('branch-1');
    // First call should be PostRehabCase.countDocuments with branch filter
    const firstCall = PostRehabCase.countDocuments.mock.calls[0][0];
    expect(firstCall.branch).toBe('branch-1');
  });

  it('should handle aggregate results for satisfaction', async () => {
    PostRehabSurvey.aggregate.mockResolvedValue([{ _id: null, avgScore: 82.5 }]);
    const res = await service.getDashboardStats();
    expect(res.data.surveys.averageSatisfaction).toBe(83); // Math.round(82.5)
  });

  it('should handle null aggregate for satisfaction', async () => {
    PostRehabSurvey.aggregate.mockResolvedValue([]);
    const res = await service.getDashboardStats();
    expect(res.data.surveys.averageSatisfaction).toBeNull();
  });

  it('should build trendDistribution from aggregate', async () => {
    ImpactMeasurement.aggregate.mockResolvedValue([
      { _id: 'SIGNIFICANT_IMPROVEMENT', count: 5 },
      { _id: 'STABLE', count: 10 },
    ]);
    const res = await service.getDashboardStats();
    expect(res.data.impact.trendDistribution.SIGNIFICANT_IMPROVEMENT).toBe(5);
    expect(res.data.impact.trendDistribution.STABLE).toBe(10);
  });

  it('should build categoryDistribution from aggregate', async () => {
    PostRehabCase.aggregate.mockResolvedValue([
      { _id: 'PHYSICAL', count: 8 },
      { _id: 'COGNITIVE', count: 3 },
    ]);
    const res = await service.getDashboardStats();
    expect(res.data.categoryDistribution.PHYSICAL).toBe(8);
    expect(res.data.categoryDistribution.COGNITIVE).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
describe('PostRehabFollowUpService — Private Helpers', () => {
  // ── _calculateNextVisitDate ───────────────────────────────────────────
  describe('_calculateNextVisitDate', () => {
    const base = new Date('2025-06-15T10:00:00Z');

    it('WEEKLY → +7 days', () => {
      const r = service._calculateNextVisitDate(base, 'WEEKLY');
      expect(r.getDate()).toBe(22);
    });

    it('BIWEEKLY → +14 days', () => {
      const r = service._calculateNextVisitDate(base, 'BIWEEKLY');
      expect(r.getDate()).toBe(29);
    });

    it('MONTHLY → +1 month', () => {
      const r = service._calculateNextVisitDate(base, 'MONTHLY');
      expect(r.getMonth()).toBe(base.getMonth() + 1);
    });

    it('QUARTERLY → +3 months', () => {
      const r = service._calculateNextVisitDate(base, 'QUARTERLY');
      expect(r.getMonth()).toBe(base.getMonth() + 3);
    });

    it('SEMI_ANNUAL → +6 months', () => {
      const r = service._calculateNextVisitDate(base, 'SEMI_ANNUAL');
      expect(r.getMonth()).toBe((base.getMonth() + 6) % 12);
    });

    it('ANNUAL → +1 year', () => {
      const r = service._calculateNextVisitDate(base, 'ANNUAL');
      expect(r.getFullYear()).toBe(2026);
    });

    it('default → +1 month', () => {
      const r = service._calculateNextVisitDate(base, 'UNKNOWN');
      expect(r.getMonth()).toBe(base.getMonth() + 1);
    });
  });

  // ── _buildImpactTimeline ──────────────────────────────────────────────
  describe('_buildImpactTimeline', () => {
    it('should return discharge entry plus measurements', () => {
      const ds = [{ domain: 'MOBILITY', score: 70 }];
      const ms = [
        {
          milestone: '6_MONTHS',
          milestoneAr: '٦ أشهر',
          measurementDate: new Date('2025-07-01'),
          overallScore: 80,
          overallTrend: 'MODERATE_IMPROVEMENT',
          domainScores: [],
        },
      ];
      const tl = service._buildImpactTimeline(ds, ms);
      expect(tl).toHaveLength(2);
      expect(tl[0].label).toBe('Discharge');
      expect(tl[0].scores).toBe(ds);
      expect(tl[1].label).toBe('6_MONTHS');
      expect(tl[1].overallScore).toBe(80);
    });

    it('should return only discharge entry when no measurements', () => {
      const tl = service._buildImpactTimeline([], []);
      expect(tl).toHaveLength(1);
      expect(tl[0].label).toBe('Discharge');
    });

    it('should include labelAr from measurements', () => {
      const ms = [
        {
          milestone: '1_YEAR',
          milestoneAr: 'سنة واحدة',
          measurementDate: new Date(),
          overallScore: 90,
          overallTrend: 'SIGNIFICANT_IMPROVEMENT',
          domainScores: [],
        },
      ];
      const tl = service._buildImpactTimeline([], ms);
      expect(tl[1].labelAr).toBe('سنة واحدة');
    });
  });

  // ── _checkForRegression ───────────────────────────────────────────────
  describe('_checkForRegression', () => {
    it('should do nothing when domainScores is empty', async () => {
      await service._checkForRegression({ domainScores: [] });
      expect(PostRehabCase.findById).not.toHaveBeenCalled();
    });

    it('should do nothing when domainScores is undefined', async () => {
      await service._checkForRegression({});
      expect(PostRehabCase.findById).not.toHaveBeenCalled();
    });

    it('should add HIGH alert when < 3 declining domains', async () => {
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._checkForRegression({
        postRehabCase: 'c1',
        domainScores: [{ domain: 'MOBILITY', trend: 'DECLINING' }],
      });
      const alert = caseObj.alerts.push.mock.calls[0][0];
      expect(alert.severity).toBe('HIGH');
    });

    it('should add CRITICAL alert when >= 3 declining domains', async () => {
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._checkForRegression({
        postRehabCase: 'c1',
        domainScores: [
          { domain: 'MOBILITY', trend: 'DECLINING' },
          { domain: 'COGNITIVE', trend: 'DECLINING' },
          { domain: 'SOCIAL', trend: 'DECLINING' },
        ],
      });
      const alert = caseObj.alerts.push.mock.calls[0][0];
      expect(alert.severity).toBe('CRITICAL');
    });

    it('should detect domain below 80% of discharge score', async () => {
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._checkForRegression({
        postRehabCase: 'c1',
        domainScores: [
          { domain: 'MOBILITY', currentScore: 60, scoreAtDischarge: 100 }, // 60 < 80
        ],
      });
      expect(caseObj.alerts.push).toHaveBeenCalled();
    });

    it('should NOT alert when all scores are stable', async () => {
      await service._checkForRegression({
        postRehabCase: 'c1',
        domainScores: [
          { domain: 'MOBILITY', trend: 'IMPROVING', currentScore: 90, scoreAtDischarge: 80 },
        ],
      });
      // No findById needed since no declining domains
      expect(PostRehabCase.findById).not.toHaveBeenCalled();
    });
  });

  // ── _autoTriggerReEnrollment ──────────────────────────────────────────
  describe('_autoTriggerReEnrollment', () => {
    it('should skip when no source provided', async () => {
      await service._autoTriggerReEnrollment(null, null);
      expect(ReEnrollmentRequest.findOne).not.toHaveBeenCalled();
    });

    it('should skip when pending request already exists', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue({ _id: 'existing' });
      await service._autoTriggerReEnrollment(null, {
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallTrend: 'SIGNIFICANT_DECLINE',
        milestone: '6_MONTHS',
        overallScore: 50,
        riskLevel: 'CRITICAL',
      });
      expect(ReEnrollmentRequest).not.toHaveBeenCalled();
    });

    it('should create re-enrollment from measurement data', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'auto-r1',
        requestNumber: 'RE-AUTO',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._autoTriggerReEnrollment(null, {
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallTrend: 'SIGNIFICANT_DECLINE',
        milestone: '6_MONTHS',
        overallScore: 50,
        riskLevel: 'CRITICAL',
        assessedBy: 'u1',
        _id: 'im1',
      });
      expect(ReEnrollmentRequest).toHaveBeenCalled();
      const callData = ReEnrollmentRequest.mock.calls[0][0];
      expect(callData.requestType).toBe('AUTOMATIC');
      expect(callData.triggerType).toBe('REGRESSION_DETECTED');
    });

    it('should use LOW_IMPACT_SCORE for non-SIGNIFICANT_DECLINE', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'auto-r2',
        requestNumber: 'RE-AUTO2',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._autoTriggerReEnrollment(null, {
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallTrend: 'SLIGHT_DECLINE',
        milestone: '6_MONTHS',
        overallScore: 85,
        riskLevel: 'HIGH',
        assessedBy: 'u1',
        _id: 'im2',
      });
      const callData = ReEnrollmentRequest.mock.calls[0][0];
      expect(callData.triggerType).toBe('LOW_IMPACT_SCORE');
    });

    it('should create re-enrollment from visit data', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'auto-r3',
        requestNumber: 'RE-AUTO3',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._autoTriggerReEnrollment({
        postRehabCase: 'c1',
        beneficiary: 'b1',
        reEnrollmentReason: 'Patient regressed',
        conductedBy: 'u2',
        _id: 'v1',
      });
      const callData = ReEnrollmentRequest.mock.calls[0][0];
      expect(callData.triggerType).toBe('SPECIALIST_OBSERVATION');
      expect(callData.triggerDetails).toBe('Patient regressed');
    });

    it('should set urgencyLevel URGENT when riskLevel is CRITICAL', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'auto-r4',
        requestNumber: 'RE-AUTO4',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._autoTriggerReEnrollment(null, {
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallTrend: 'SIGNIFICANT_DECLINE',
        riskLevel: 'CRITICAL',
        milestone: '6_MONTHS',
        overallScore: 30,
        assessedBy: 'u1',
        _id: 'im3',
      });
      const callData = ReEnrollmentRequest.mock.calls[0][0];
      expect(callData.urgencyLevel).toBe('URGENT');
    });

    it('should set urgencyLevel HIGH when riskLevel is not CRITICAL', async () => {
      ReEnrollmentRequest.findOne.mockResolvedValue(null);
      ReEnrollmentRequest.mockImplementation(d => ({
        ...d,
        _id: 'auto-r5',
        requestNumber: 'RE-AUTO5',
        save: mockSave,
      }));
      const caseObj = { _id: 'c1', alerts: [], priority: 'NORMAL', save: mockSave };
      caseObj.alerts.push = jest.fn();
      PostRehabCase.findById.mockResolvedValue(caseObj);

      await service._autoTriggerReEnrollment(null, {
        postRehabCase: 'c1',
        beneficiary: 'b1',
        overallTrend: 'SLIGHT_DECLINE',
        riskLevel: 'HIGH',
        milestone: '6_MONTHS',
        overallScore: 85,
        assessedBy: 'u1',
        _id: 'im4',
      });
      const callData = ReEnrollmentRequest.mock.calls[0][0];
      expect(callData.urgencyLevel).toBe('HIGH');
    });
  });
});
