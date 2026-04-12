/**
 * Unit tests for familySatisfaction.service.js
 * Family Satisfaction Surveys — Templates, Responses, NPS, Analytics, Dashboard
 */

/* ───── Chainable query mock ───── */
function Q(val) {
  const q = {};
  ['lean', 'select', 'populate', 'sort', 'skip', 'limit'].forEach(m => {
    q[m] = jest.fn(() => q);
  });
  q.exec = jest.fn().mockResolvedValue(val);
  q.then = (cb, ecb) => Promise.resolve(val).then(cb, ecb);
  q.catch = ecb => Promise.resolve(val).catch(ecb);
  return q;
}

/* ───── Model mock factory on global (jest.mock hoisting safe) ───── */
global.__mkFSModel = () => {
  const M = jest.fn(function (data) {
    Object.assign(this, data || {});
    this.save = jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    });
    if (this.version === undefined) this.version = 0;
  });
  M.find = jest.fn();
  M.findOne = jest.fn();
  M.findById = jest.fn();
  M.create = jest.fn().mockResolvedValue({});
  M.countDocuments = jest.fn().mockResolvedValue(0);
  M.bulkWrite = jest.fn().mockResolvedValue({});
  return M;
};

jest.mock('../../models/familySatisfaction.models', () => ({
  SurveyTemplate: global.__mkFSModel(),
  SurveyResponse: global.__mkFSModel(),
  SurveyAnalytics: global.__mkFSModel(),
}));

const {
  SurveyTemplate,
  SurveyResponse,
  SurveyAnalytics,
} = require('../../models/familySatisfaction.models');
const Service = require('../../services/familySatisfaction.service');

afterAll(() => {
  delete global.__mkFSModel;
});

describe('FamilySatisfactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set default implementations after clearAllMocks
    SurveyTemplate.find.mockImplementation(() => Q([]));
    SurveyTemplate.findOne.mockImplementation(() => Q(null));
    SurveyTemplate.findById.mockImplementation(() => Q(null));
    SurveyTemplate.bulkWrite.mockResolvedValue({});
    SurveyResponse.find.mockImplementation(() => Q([]));
    SurveyResponse.findOne.mockImplementation(() => Q(null));
    SurveyResponse.findById.mockImplementation(() => Q(null));
    SurveyResponse.countDocuments.mockResolvedValue(0);
    SurveyAnalytics.findOne.mockImplementation(() => Q(null));
  });

  // ═══════════════════════════════════════════════════════════════
  // Templates
  // ═══════════════════════════════════════════════════════════════
  describe('createTemplate', () => {
    it('creates and saves a new template', async () => {
      const r = await Service.createTemplate({ title: 'Test', category: 'nps' }, 'user1');
      expect(r).toBeDefined();
      expect(r.title).toBe('Test');
      expect(r.createdBy).toBe('user1');
    });
  });

  describe('getTemplates', () => {
    it('returns templates with default filter', async () => {
      SurveyTemplate.find.mockReturnValue(Q([{ _id: 't1' }]));
      const r = await Service.getTemplates();
      expect(r).toHaveLength(1);
      const filter = SurveyTemplate.find.mock.calls[0][0];
      expect(filter.isDeleted).toBe(false);
    });

    it('filters by category and isActive', async () => {
      await Service.getTemplates({ category: 'nps', isActive: 'true' });
      const filter = SurveyTemplate.find.mock.calls[0][0];
      expect(filter.category).toBe('nps');
      expect(filter.isActive).toBe(true);
    });
  });

  describe('getTemplateById', () => {
    it('finds template by ID', async () => {
      SurveyTemplate.findOne.mockReturnValue(Q({ _id: 't1', title: 'T' }));
      const r = await Service.getTemplateById('t1');
      expect(r.title).toBe('T');
    });
  });

  describe('updateTemplate', () => {
    it('updates and increments version', async () => {
      const tpl = {
        _id: 't1',
        title: 'Old',
        version: 1,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      SurveyTemplate.findOne.mockReturnValue(Q(tpl));
      const r = await Service.updateTemplate('t1', { title: 'New' });
      expect(r.title).toBe('New');
      expect(r.version).toBe(2);
    });

    it('throws if template not found', async () => {
      await expect(Service.updateTemplate('x', {})).rejects.toThrow('القالب غير موجود');
    });
  });

  describe('seedDefaultTemplates', () => {
    it('bulk writes 3 default templates', async () => {
      await Service.seedDefaultTemplates('user1');
      expect(SurveyTemplate.bulkWrite).toHaveBeenCalled();
      const ops = SurveyTemplate.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(3);
      const codes = ops.map(o => o.updateOne.filter.code);
      expect(codes).toContain('FAMILY-SAT-GENERAL');
      expect(codes).toContain('POST-SESSION');
      expect(codes).toContain('NPS-QUICK');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Survey Responses
  // ═══════════════════════════════════════════════════════════════
  describe('sendSurvey', () => {
    it('sends a survey', async () => {
      SurveyTemplate.findById.mockReturnValue(Q({ _id: 'tmpl1', code: 'NPS-QUICK' }));
      const r = await Service.sendSurvey('tmpl1', {
        respondent: { name: 'أحمد' },
        beneficiary: 'b1',
        branch: 'branch1',
      });
      expect(r.template).toBe('tmpl1');
      expect(r.status).toBe('sent');
    });

    it('throws if template not found', async () => {
      await expect(Service.sendSurvey('x', {})).rejects.toThrow('القالب غير موجود');
    });
  });

  describe('submitResponse', () => {
    const makeResponse = (overrides = {}) => ({
      _id: 'resp1',
      status: 'sent',
      template: {
        questions: [
          { questionId: 'q1', type: 'rating_5', weight: 2, category: 'overall' },
          { questionId: 'q2', type: 'nps', weight: 1, category: 'nps' },
        ],
      },
      openedAt: new Date(Date.now() - 60000),
      answers: [],
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      ...overrides,
    });

    it('submits answers and calculates scores', async () => {
      SurveyResponse.findById.mockReturnValue(Q(makeResponse()));
      const answers = [
        { questionId: 'q1', value: 4 },
        { questionId: 'q2', value: 9 },
      ];
      const r = await Service.submitResponse('resp1', answers);
      expect(r.status).toBe('completed');
      expect(r.completedAt).toBeInstanceOf(Date);
      expect(r.scores).toBeDefined();
      expect(r.scores.overallSatisfaction).toBeGreaterThan(0);
      expect(r.scores.npsCategory).toBe('promoter'); // 9 >= 9
      expect(r.sentiment).toBeDefined();
    });

    it('calculates completion time if opened', async () => {
      SurveyResponse.findById.mockReturnValue(Q(makeResponse()));
      const r = await Service.submitResponse('resp1', [{ questionId: 'q1', value: 3 }]);
      expect(r.completionTime).toBeGreaterThan(0);
    });

    it('flags followUp if satisfaction < 40', async () => {
      SurveyResponse.findById.mockReturnValue(Q(makeResponse()));
      // rating_5: value 1 → (1/5)*100=20, very low
      const r = await Service.submitResponse('resp1', [
        { questionId: 'q1', value: 1 },
        { questionId: 'q2', value: 3 }, // detractor
      ]);
      expect(r.followUp).toBeDefined();
      expect(r.followUp.required).toBe(true);
    });

    it('throws if response not found', async () => {
      await expect(Service.submitResponse('x', [])).rejects.toThrow('الاستبيان غير موجود');
    });

    it('throws if already completed', async () => {
      SurveyResponse.findById.mockReturnValue(Q(makeResponse({ status: 'completed' })));
      await expect(Service.submitResponse('resp1', [])).rejects.toThrow('تم الإجابة');
    });
  });

  describe('createDirectResponse', () => {
    it('creates direct response for active template', async () => {
      SurveyTemplate.findOne.mockReturnValue(
        Q({
          _id: 'tmpl1',
          code: 'NPS-QUICK',
          isActive: true,
          questions: [{ questionId: 'nps1', type: 'nps', weight: 1, category: 'nps' }],
        })
      );
      const r = await Service.createDirectResponse('NPS-QUICK', {
        respondent: { name: 'Ali' },
        beneficiary: 'b1',
        answers: [{ questionId: 'nps1', value: 8 }],
      });
      expect(r.status).toBe('completed');
      expect(r.scores).toBeDefined();
      expect(r.scores.npsCategory).toBe('passive'); // 8 → 7-8 = passive
    });

    it('throws if template not found', async () => {
      await expect(Service.createDirectResponse('FAKE', {})).rejects.toThrow('القالب غير موجود');
    });
  });

  describe('getResponses', () => {
    it('returns paginated responses', async () => {
      SurveyResponse.find.mockReturnValue(Q([{ _id: 'r1' }]));
      SurveyResponse.countDocuments.mockResolvedValue(1);
      const r = await Service.getResponses();
      expect(r.responses).toHaveLength(1);
      expect(r.total).toBe(1);
      expect(r.page).toBe(1);
    });

    it('applies filters', async () => {
      SurveyResponse.find.mockReturnValue(Q([]));
      await Service.getResponses({
        template: 't1',
        status: 'completed',
        branch: 'b1',
        followUpRequired: true,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
      const filter = SurveyResponse.find.mock.calls[0][0];
      expect(filter.template).toBe('t1');
      expect(filter.status).toBe('completed');
      expect(filter.branch).toBe('b1');
      expect(filter['followUp.required']).toBe(true);
    });
  });

  describe('getResponseById', () => {
    it('returns response with populates', async () => {
      SurveyResponse.findOne.mockReturnValue(Q({ _id: 'r1', status: 'completed' }));
      const r = await Service.getResponseById('r1');
      expect(r.status).toBe('completed');
    });
  });

  describe('updateFollowUp', () => {
    it('updates follow-up data', async () => {
      const resp = {
        _id: 'r1',
        followUp: { required: true, status: 'pending' },
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      SurveyResponse.findById.mockResolvedValue(resp);
      const r = await Service.updateFollowUp('r1', { status: 'resolved', notes: 'done' }, 'u1');
      expect(r.followUp.status).toBe('resolved');
      expect(r.followUp.resolvedAt).toBeInstanceOf(Date);
    });

    it('assigns user if not set', async () => {
      const resp = {
        _id: 'r1',
        followUp: { required: true, status: 'pending' },
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      SurveyResponse.findById.mockResolvedValue(resp);
      await Service.updateFollowUp('r1', { notes: 'note' }, 'u1');
      expect(resp.followUp.assignedTo).toBe('u1');
    });

    it('throws if response not found', async () => {
      SurveyResponse.findById.mockResolvedValue(null);
      await expect(Service.updateFollowUp('x', {}, 'u1')).rejects.toThrow('الاستجابة غير موجودة');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Analytics
  // ═══════════════════════════════════════════════════════════════
  describe('calculateNPS', () => {
    it('returns zero when no responses', async () => {
      const r = await Service.calculateNPS();
      expect(r).toMatchObject({ score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 });
    });

    it('calculates NPS from responses', async () => {
      SurveyResponse.find.mockReturnValue(
        Q([
          { scores: { npsScore: 10, npsCategory: 'promoter' } },
          { scores: { npsScore: 9, npsCategory: 'promoter' } },
          { scores: { npsScore: 7, npsCategory: 'passive' } },
          { scores: { npsScore: 3, npsCategory: 'detractor' } },
        ])
      );
      const r = await Service.calculateNPS();
      expect(r.promoters).toBe(2);
      expect(r.passives).toBe(1);
      expect(r.detractors).toBe(1);
      expect(r.score).toBe(25); // ((2-1)/4)*100 = 25
    });
  });

  describe('generateAnalyticsReport', () => {
    it('generates analytics and saves', async () => {
      // responses
      SurveyResponse.find.mockReturnValue(Q([]));
      SurveyResponse.countDocuments.mockResolvedValue(0);
      const r = await Service.generateAnalyticsReport('2025-01-01', '2025-01-31', null, 'u1');
      expect(r).toBeDefined();
      expect(r.reportType).toBe('monthly');
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard summary', async () => {
      SurveyResponse.countDocuments
        .mockResolvedValueOnce(100) // totalResponses
        .mockResolvedValueOnce(20) // completedThisMonth
        .mockResolvedValueOnce(5); // pendingFollowUps
      SurveyResponse.find
        .mockReturnValueOnce(Q([])) // calculateNPS inner call responses
        .mockReturnValueOnce(Q([])) // recentResponses
        .mockReturnValueOnce(Q([])); // recentScores (after main parallel)
      const r = await Service.getDashboard();
      expect(r.summary).toBeDefined();
      expect(r.summary.totalResponses).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Private helpers (tested via static access)
  // ═══════════════════════════════════════════════════════════════
  describe('_calculateScores', () => {
    const questions = [
      { questionId: 'q1', type: 'rating_5', weight: 2, category: 'overall' },
      { questionId: 'q2', type: 'nps', weight: 1, category: 'nps' },
      { questionId: 'q3', type: 'yes_no', weight: 1, category: 'effectiveness' },
      { questionId: 'q4', type: 'scale', weight: 1, category: 'quality' },
    ];

    it('handles rating_5 type', () => {
      const r = Service._calculateScores([{ questionId: 'q1', value: 5 }], { questions });
      expect(r.overallSatisfaction).toBe(100); // (5/5)*100
    });

    it('handles nps type and sets category', () => {
      const r = Service._calculateScores([{ questionId: 'q2', value: 9 }], { questions });
      expect(r.npsScore).toBe(9);
      expect(r.npsCategory).toBe('promoter');
    });

    it('nps passive (7-8)', () => {
      const r = Service._calculateScores([{ questionId: 'q2', value: 7 }], { questions });
      expect(r.npsCategory).toBe('passive');
    });

    it('nps detractor (< 7)', () => {
      const r = Service._calculateScores([{ questionId: 'q2', value: 5 }], { questions });
      expect(r.npsCategory).toBe('detractor');
    });

    it('handles yes_no type', () => {
      const r = Service._calculateScores([{ questionId: 'q3', value: true }], { questions });
      expect(r.overallSatisfaction).toBe(100);
    });

    it('handles scale type', () => {
      const r = Service._calculateScores([{ questionId: 'q4', value: 5 }], { questions });
      expect(r.overallSatisfaction).toBe(50); // (5/10)*100
    });

    it('returns byCategory breakdown', () => {
      const r = Service._calculateScores(
        [
          { questionId: 'q1', value: 4 },
          { questionId: 'q3', value: 'yes' },
        ],
        { questions }
      );
      expect(r.byCategory.length).toBeGreaterThan(0);
    });

    it('returns 0 when no matching answers', () => {
      const r = Service._calculateScores([], { questions: [] });
      expect(r.overallSatisfaction).toBe(0);
    });
  });

  describe('_analyzeSentiment', () => {
    it('detects positive sentiment', () => {
      const r = Service._analyzeSentiment([{ comment: 'ممتاز رائع' }]);
      expect(r.overall).toBe('positive');
      expect(r.keywords.length).toBeGreaterThan(0);
    });

    it('detects negative sentiment', () => {
      const r = Service._analyzeSentiment([{ comment: 'سيء ضعيف إهمال' }]);
      expect(r.overall).toBe('negative');
    });

    it('neutral when no keywords', () => {
      const r = Service._analyzeSentiment([{ comment: 'عادي' }]);
      expect(r.overall).toBe('neutral');
    });

    it('deduplicates keywords', () => {
      const r = Service._analyzeSentiment([{ comment: 'ممتاز' }, { comment: 'ممتاز' }]);
      expect(r.keywords.filter(k => k === 'ممتاز')).toHaveLength(1);
    });
  });

  describe('_computeNPSFromScores', () => {
    it('returns 0 for empty scores', () => {
      expect(Service._computeNPSFromScores([])).toBe(0);
    });

    it('computes NPS correctly', () => {
      // 2 promoters (9,10), 1 passive (8), 1 detractor (5)
      // NPS = ((2-1)/4)*100 = 25
      expect(Service._computeNPSFromScores([9, 10, 8, 5])).toBe(25);
    });
  });

  describe('_getDefaultTemplates', () => {
    it('returns 3 default templates', () => {
      const templates = Service._getDefaultTemplates();
      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.code)).toEqual([
        'FAMILY-SAT-GENERAL',
        'POST-SESSION',
        'NPS-QUICK',
      ]);
    });
  });
});
