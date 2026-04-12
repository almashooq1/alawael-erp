/**
 * Unit tests for services/treatmentAuthorization.service.js
 * TreatmentAuthorizationService — Static methods (class export)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockSave = jest.fn().mockImplementation(function () {
  return Promise.resolve(this);
});

// Constructor-function mock for `new TreatmentAuthorization({...})`
const MockTA = jest.fn().mockImplementation(function (data) {
  Object.assign(this, data);
  this.save = mockSave;
  if (!this.auditLog) this.auditLog = [];
  if (!this.followUps) this.followUps = [];
  return this;
});

const mockFindById = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();

MockTA.findById = mockFindById;
MockTA.findOne = mockFindOne;
MockTA.find = mockFind;
MockTA.countDocuments = mockCountDocuments;
MockTA.aggregate = mockAggregate;

jest.mock('../../models/treatmentAuthorization.model', () => ({
  TreatmentAuthorization: MockTA,
}));

jest.mock('../../utils/escapeRegex', () => jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const Service = require('../../services/treatmentAuthorization.service');

/* ─── helpers ───────────────────────────────────────────────────────── */

function fakeDoc(overrides = {}) {
  return {
    _id: 'auth1',
    status: 'draft',
    beneficiary: 'ben1',
    isDeleted: false,
    insurance: { provider: 'ins1', copayPercentage: 20, policyNumber: 'P001' },
    services: [
      {
        serviceCode: 'PT01',
        serviceName: 'Physical Therapy',
        serviceCategory: 'rehabilitation',
        requestedSessions: 10,
        approvedSessions: 10,
        usedSessions: 0,
        estimatedCost: 500,
        status: 'pending',
      },
    ],
    financials: {
      totalEstimatedCost: 500,
      totalApprovedCost: 0,
      patientResponsibility: 0,
      insurerResponsibility: 0,
    },
    workflow: {},
    clinicalInfo: { medicalJustification: 'Needs PT' },
    requestingProvider: { name: 'Dr. X' },
    auditLog: [],
    followUps: [],
    save: mockSave,
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('TreatmentAuthorizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockImplementation(function () {
      return Promise.resolve(this);
    });
  });

  // ── createRequest ────────────────────────────────────────────────

  describe('createRequest', () => {
    it('creates request with generated auth number and audit log', async () => {
      mockCountDocuments.mockResolvedValue(5);

      const result = await Service.createRequest(
        { services: [{ estimatedCost: 200 }, { estimatedCost: 300 }] },
        'user1'
      );

      expect(MockTA).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      const year = new Date().getFullYear();
      expect(result.authorizationNumber).toBe(`TA-${year}-00006`);
      expect(result.financials.totalEstimatedCost).toBe(500);
      expect(result.auditLog[0].action).toBe('created');
    });

    it('handles empty services array', async () => {
      mockCountDocuments.mockResolvedValue(0);

      const result = await Service.createRequest({ services: [] }, 'u1');

      expect(result.financials.totalEstimatedCost).toBe(0);
    });

    it('handles undefined services', async () => {
      mockCountDocuments.mockResolvedValue(0);

      const result = await Service.createRequest({}, 'u1');

      expect(result.financials.totalEstimatedCost).toBe(0);
    });
  });

  // ── getRequests ──────────────────────────────────────────────────

  describe('getRequests', () => {
    it('returns paginated results', async () => {
      const docs = [fakeDoc()];
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue(docs),
                }),
              }),
            }),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(1);

      const result = await Service.getRequests({});

      expect(result.requests).toEqual(docs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('applies filters', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      const result = await Service.getRequests({
        status: 'approved',
        beneficiary: 'ben1',
        branch: 'b1',
        priority: 'high',
        requestType: 'initial',
        insuranceProvider: 'ins1',
        search: 'test',
        page: '2',
        limit: '5',
      });

      expect(result.page).toBe(2);
      expect(result.pages).toBe(0);
    });
  });

  // ── getRequestById ───────────────────────────────────────────────

  describe('getRequestById', () => {
    it('returns populated request', async () => {
      const doc = fakeDoc();
      // findOne().populate().populate().populate().populate().populate()
      const p5 = jest.fn().mockResolvedValue(doc);
      const p4 = jest.fn().mockReturnValue({ populate: p5 });
      const p3 = jest.fn().mockReturnValue({ populate: p4 });
      const p2 = jest.fn().mockReturnValue({ populate: p3 });
      const p1 = jest.fn().mockReturnValue({ populate: p2 });
      mockFindOne.mockReturnValue({ populate: p1 });

      const result = await Service.getRequestById('auth1');
      expect(result._id).toBe('auth1');
    });
  });

  // ── updateRequest ────────────────────────────────────────────────

  describe('updateRequest', () => {
    it('updates draft request', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);

      await Service.updateRequest('auth1', { priority: 'high' }, 'user1');

      expect(doc.priority).toBe('high');
      expect(doc.auditLog).toHaveLength(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it('recalculates cost when services updated', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);

      await Service.updateRequest(
        'auth1',
        { services: [{ estimatedCost: 100 }, { estimatedCost: 200 }] },
        'user1'
      );

      expect(doc.financials.totalEstimatedCost).toBe(300);
    });

    it('allows update for info_requested status', async () => {
      const doc = fakeDoc({ status: 'info_requested' });
      mockFindById.mockResolvedValue(doc);

      await expect(Service.updateRequest('auth1', {}, 'u1')).resolves.toBeDefined();
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(Service.updateRequest('bad', {}, 'u')).rejects.toThrow('الطلب غير موجود');
    });

    it('throws for non-editable status', async () => {
      const doc = fakeDoc({ status: 'approved' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.updateRequest('auth1', {}, 'u')).rejects.toThrow('لا يمكن تعديل');
    });
  });

  // ── submitForReview ──────────────────────────────────────────────

  describe('submitForReview', () => {
    it('submits draft for review', async () => {
      const doc = fakeDoc({
        status: 'draft',
        beneficiary: 'ben1',
        insurance: { provider: 'ins1' },
        services: [{ serviceCode: 'X' }],
        clinicalInfo: { medicalJustification: 'reason' },
        requestingProvider: { name: 'Dr' },
      });
      mockFindById.mockResolvedValue(doc);

      await Service.submitForReview('auth1', 'u1');

      expect(doc.status).toBe('pending_review');
      expect(mockSave).toHaveBeenCalled();
    });

    it('throws when not draft', async () => {
      const doc = fakeDoc({ status: 'submitted' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.submitForReview('auth1', 'u1')).rejects.toThrow('مسودة');
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(Service.submitForReview('bad', 'u')).rejects.toThrow('الطلب غير موجود');
    });
  });

  // ── submitToInsurer ──────────────────────────────────────────────

  describe('submitToInsurer', () => {
    it('submits pending_review to insurer', async () => {
      const doc = fakeDoc({ status: 'pending_review', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.submitToInsurer('auth1', 'u1');

      expect(doc.status).toBe('submitted');
      expect(doc.workflow.submittedBy).toBe('u1');
      expect(mockSave).toHaveBeenCalled();
    });

    it('throws when not pending_review', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.submitToInsurer('auth1', 'u1')).rejects.toThrow('غير جاهز');
    });
  });

  // ── recordInsurerResponse ────────────────────────────────────────

  describe('recordInsurerResponse', () => {
    it('approves with financial calculations', async () => {
      const doc = fakeDoc({
        status: 'submitted',
        insurance: { copayPercentage: 20 },
        services: [{ serviceCode: 'PT01' }],
        workflow: {},
      });
      mockFindById.mockResolvedValue(doc);

      await Service.recordInsurerResponse(
        'auth1',
        {
          decision: 'approved',
          approvedAmount: 1000,
          validTo: new Date('2026-12-31'),
          serviceApprovals: [{ serviceCode: 'PT01', approvedSessions: 8, approvedCost: 800 }],
        },
        'u1'
      );

      expect(doc.status).toBe('approved');
      expect(doc.financials.totalApprovedCost).toBe(1000);
      expect(doc.financials.insurerResponsibility).toBe(800); // 1000 * 80%
      expect(doc.financials.patientResponsibility).toBe(200); // 1000 * 20%
    });

    it('handles denied response', async () => {
      const doc = fakeDoc({ status: 'submitted', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.recordInsurerResponse('auth1', { decision: 'denied' }, 'u1');

      expect(doc.status).toBe('denied');
    });

    it('handles partially_approved', async () => {
      const doc = fakeDoc({ status: 'submitted', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.recordInsurerResponse(
        'auth1',
        { decision: 'partially_approved', approvedAmount: 500, validTo: new Date() },
        'u1'
      );

      expect(doc.status).toBe('partially_approved');
      expect(doc.financials.totalApprovedCost).toBe(500);
    });

    it('handles info_requested', async () => {
      const doc = fakeDoc({ status: 'submitted', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.recordInsurerResponse('auth1', { decision: 'info_requested' }, 'u1');

      expect(doc.status).toBe('info_requested');
    });

    it('throws when status not allowed', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);
      await expect(
        Service.recordInsurerResponse('auth1', { decision: 'approved' }, 'u1')
      ).rejects.toThrow('ليس في مرحلة');
    });
  });

  // ── submitAppeal ─────────────────────────────────────────────────

  describe('submitAppeal', () => {
    it('submits appeal on denied request', async () => {
      const doc = fakeDoc({ status: 'denied', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.submitAppeal('auth1', { reason: 'Strong justification' }, 'u1');

      expect(doc.status).toBe('appealed');
      expect(doc.appeal.reason).toBe('Strong justification');
    });

    it('allows appeal on partially_approved', async () => {
      const doc = fakeDoc({ status: 'partially_approved', workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.submitAppeal('auth1', { reason: 'Need more' }, 'u1');

      expect(doc.status).toBe('appealed');
    });

    it('throws when status not appealable', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.submitAppeal('auth1', {}, 'u1')).rejects.toThrow('لا يمكن الاستئناف');
    });
  });

  // ── recordAppealDecision ─────────────────────────────────────────

  describe('recordAppealDecision', () => {
    it('approves appeal', async () => {
      const doc = fakeDoc({ status: 'appealed', appeal: {}, workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.recordAppealDecision('auth1', 'approved', 'Good case', 'u1');

      expect(doc.status).toBe('appeal_approved');
      expect(doc.appeal.decision).toBe('approved');
    });

    it('denies appeal', async () => {
      const doc = fakeDoc({ status: 'appealed', appeal: {}, workflow: {} });
      mockFindById.mockResolvedValue(doc);

      await Service.recordAppealDecision('auth1', 'denied', 'Insufficient', 'u1');

      expect(doc.status).toBe('appeal_denied');
    });

    it('throws when not appealed', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.recordAppealDecision('auth1', 'approved', '', 'u')).rejects.toThrow(
        'لا يوجد استئناف'
      );
    });
  });

  // ── recordSessionUsage ───────────────────────────────────────────

  describe('recordSessionUsage', () => {
    it('increments usedSessions for matching service', async () => {
      const doc = fakeDoc({
        status: 'approved',
        services: [
          { serviceCode: 'PT01', serviceName: 'PT', usedSessions: 2, requestedSessions: 10 },
        ],
        followUps: [],
      });
      mockFindById.mockResolvedValue(doc);

      await Service.recordSessionUsage('auth1', 'PT01', { notes: 'Session 3' }, 'u1');

      expect(doc.services[0].usedSessions).toBe(3);
      expect(doc.followUps).toHaveLength(1);
    });

    it('throws when service not found', async () => {
      const doc = fakeDoc({ status: 'approved' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.recordSessionUsage('auth1', 'NONE', {}, 'u')).rejects.toThrow(
        'الخدمة غير موجودة'
      );
    });

    it('throws when not approved', async () => {
      const doc = fakeDoc({ status: 'draft' });
      mockFindById.mockResolvedValue(doc);
      await expect(Service.recordSessionUsage('auth1', 'PT01', {}, 'u')).rejects.toThrow(
        'غير موافق'
      );
    });
  });

  // ── addFollowUp ──────────────────────────────────────────────────

  describe('addFollowUp', () => {
    it('pushes follow-up to request', async () => {
      const doc = fakeDoc({ followUps: [] });
      mockFindById.mockResolvedValue(doc);

      await Service.addFollowUp('auth1', { notes: 'Called patient' }, 'u1');

      expect(doc.followUps).toHaveLength(1);
      expect(doc.followUps[0].by).toBe('u1');
      expect(mockSave).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(Service.addFollowUp('bad', {}, 'u')).rejects.toThrow('الطلب غير موجود');
    });
  });

  // ── checkExpiring ────────────────────────────────────────────────

  describe('checkExpiring', () => {
    it('returns expiring authorizations', async () => {
      const docs = [fakeDoc()];
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(docs),
          }),
        }),
      });

      const result = await Service.checkExpiring();
      expect(result).toEqual(docs);
    });
  });

  // ── getDashboard ─────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns dashboard summary', async () => {
      // countDocuments calls: total, pending, approved, denied
      mockCountDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(50) // approved
        .mockResolvedValueOnce(10); // denied

      // checkExpiring → find chain
      mockFind
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([fakeDoc()]),
            }),
          }),
        })
        // recentRequests → find chain
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([fakeDoc()]),
                }),
              }),
            }),
          }),
        })
        // _calculateAvgResponseTime → find chain
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

      mockAggregate.mockResolvedValue([{ _id: 'rehabilitation', count: 5 }]);

      const result = await Service.getDashboard('b1');

      expect(result.summary.totalRequests).toBe(100);
      expect(result.summary.approvalRate).toBe(83); // 50/(50+10)*100 = 83.33 → 83
      expect(result.recentRequests).toHaveLength(1);
      expect(result.byServiceCategory).toHaveLength(1);
    });

    it('handles zero decisions gracefully', async () => {
      mockCountDocuments.mockResolvedValue(0);
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      mockAggregate.mockResolvedValue([]);

      const result = await Service.getDashboard();

      expect(result.summary.approvalRate).toBe(0);
      expect(result.summary.avgResponseTimeDays).toBe(0);
    });
  });

  // ── _generateAuthNumber ──────────────────────────────────────────

  describe('_generateAuthNumber', () => {
    it('generates sequential number based on count', async () => {
      mockCountDocuments.mockResolvedValue(42);
      const num = await Service._generateAuthNumber();
      const year = new Date().getFullYear();
      expect(num).toBe(`TA-${year}-00043`);
    });

    it('starts from 1 when no existing records', async () => {
      mockCountDocuments.mockResolvedValue(0);
      const num = await Service._generateAuthNumber();
      expect(num).toMatch(/^TA-\d{4}-00001$/);
    });
  });

  // ── _validateRequest ─────────────────────────────────────────────

  describe('_validateRequest', () => {
    it('passes for valid request', () => {
      expect(() =>
        Service._validateRequest({
          beneficiary: 'ben1',
          insurance: { provider: 'ins1' },
          services: [{ serviceCode: 'X' }],
          clinicalInfo: { medicalJustification: 'reason' },
          requestingProvider: { name: 'Dr.' },
        })
      ).not.toThrow();
    });

    it('throws with combined error messages for missing fields', () => {
      expect(() => Service._validateRequest({})).toThrow('المستفيد مطلوب');
    });

    it('throws when services empty', () => {
      expect(() =>
        Service._validateRequest({
          beneficiary: 'b',
          insurance: { provider: 'i' },
          services: [],
          clinicalInfo: { medicalJustification: 'r' },
          requestingProvider: { name: 'D' },
        })
      ).toThrow('خدمة واحدة');
    });
  });

  // ── _calculateAvgResponseTime ────────────────────────────────────

  describe('_calculateAvgResponseTime', () => {
    it('returns 0 when no decided requests', async () => {
      mockFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const avg = await Service._calculateAvgResponseTime({});
      expect(avg).toBe(0);
    });

    it('calculates average response time in days', async () => {
      const submitted = new Date('2025-06-01');
      const approved = new Date('2025-06-04'); // 3 days
      mockFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([{ workflow: { submittedAt: submitted, approvedAt: approved } }]),
        }),
      });

      const avg = await Service._calculateAvgResponseTime({});
      expect(avg).toBe(3);
    });
  });
});
