/**
 * Unit tests for icfAssessment.service.js (739L)
 * Static class methods — ICFAssessment, ICFCodeReference, ICFBenchmark
 *
 * Method names: create, getById, list, update, delete, changeStatus,
 * _calculateGapAnalysis, compareWithPrevious, getBeneficiaryTimeline,
 * benchmarkAssessment, getStatistics, getDomainDistribution,
 * searchCodes, getCodeTree, createBenchmark, listBenchmarks, importBenchmarks
 */

/* ── globals for jest.mock scope ── */
global.__mkICFDoc = (overrides = {}) => {
  const doc = {
    _id: 'a1',
    assessmentNumber: 'ICF-2024-001',
    beneficiaryId: 'b1',
    assessorId: 'u1',
    status: 'draft',
    isDeleted: false,
    assessmentDate: new Date('2024-06-01'),
    overallFunctioningScore: 60,
    overallSeverity: 'moderate',
    domainScores: [],
    activitiesParticipation: null,
    gapAnalysis: null,
    comparison: null,
    previousAssessmentId: null,
    calculateScores: jest.fn(),
    getAllCodes: jest.fn().mockReturnValue([]),
    save: jest.fn().mockResolvedValue(true),
    benchmarking: null,
    ...overrides,
  };
  return doc;
};

jest.mock('../../models/ICFAssessment', () => {
  const mkQ = () => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null),
  });

  const ICFAssessment = jest.fn(function (data) {
    const doc = global.__mkICFDoc(data);
    Object.assign(this, doc);
    this.save = doc.save;
    this.calculateScores = doc.calculateScores;
  });
  ICFAssessment.find = jest.fn().mockReturnValue(mkQ());
  ICFAssessment.findOne = jest.fn().mockReturnValue(mkQ());
  ICFAssessment.findById = jest.fn().mockResolvedValue(null);
  ICFAssessment.findOneAndUpdate = jest.fn().mockResolvedValue(null);
  ICFAssessment.countDocuments = jest.fn().mockResolvedValue(0);
  ICFAssessment.aggregate = jest.fn().mockResolvedValue([]);

  const ICFCodeReference = {
    find: jest.fn().mockReturnValue(mkQ()),
    aggregate: jest.fn().mockResolvedValue([]),
  };

  const ICFBenchmark = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  ICFBenchmark.find = jest.fn().mockReturnValue(mkQ());
  ICFBenchmark.bulkWrite = jest.fn().mockResolvedValue({
    matchedCount: 0,
    upsertedCount: 0,
    modifiedCount: 0,
  });

  // helper to create chainable query
  ICFAssessment.__mkQ = mkQ;

  return { ICFAssessment, ICFCodeReference, ICFBenchmark };
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const ICFAssessmentService = require('../../services/icfAssessment.service');
const { ICFAssessment, ICFCodeReference, ICFBenchmark } = require('../../models/ICFAssessment');

describe('ICFAssessmentService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ═══════════════ create ═══════════════ */
  describe('create', () => {
    it('creates assessment and calls calculateScores + save', async () => {
      const res = await ICFAssessmentService.create(
        { beneficiaryId: 'b1', assessmentType: 'initial' },
        'u1'
      );
      expect(res.calculateScores).toHaveBeenCalled();
      expect(res.save).toHaveBeenCalled();
      expect(res.createdBy).toBe('u1');
    });
  });

  /* ═══════════════ getById ═══════════════ */
  describe('getById', () => {
    it('returns assessment with populate chain', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue({ _id: 'a1', status: 'draft' });
      ICFAssessment.findOne.mockReturnValue(q);

      const res = await ICFAssessmentService.getById('a1');
      expect(res._id).toBe('a1');
      expect(ICFAssessment.findOne).toHaveBeenCalledWith({ _id: 'a1', isDeleted: false });
    });

    it('throws if not found', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue(null);
      ICFAssessment.findOne.mockReturnValue(q);

      await expect(ICFAssessmentService.getById('bad')).rejects.toThrow('التقييم غير موجود');
    });
  });

  /* ═══════════════ list ═══════════════ */
  describe('list', () => {
    it('returns paginated results', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([{ _id: 'a1' }]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(1);

      const res = await ICFAssessmentService.list({}, { page: 1, limit: 20 });
      expect(res.data).toEqual([{ _id: 'a1' }]);
      expect(res.pagination.total).toBe(1);
    });

    it('applies beneficiaryId filter', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({ beneficiaryId: 'b1' });
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.beneficiaryId).toBe('b1');
    });

    it('applies status filter', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({ status: 'completed' });
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.status).toBe('completed');
    });

    it('applies date range filter', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({ fromDate: '2024-01-01', toDate: '2024-12-31' });
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.assessmentDate.$gte).toBeInstanceOf(Date);
      expect(filter.assessmentDate.$lte).toBeInstanceOf(Date);
    });

    it('applies score range filters', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({ minScore: 30, maxScore: 80 });
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.overallFunctioningScore.$gte).toBe(30);
      expect(filter.overallFunctioningScore.$lte).toBe(80);
    });

    it('applies search filter', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({ search: 'test' });
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
    });

    it('excludes soft-deleted by default', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);
      ICFAssessment.countDocuments.mockResolvedValue(0);

      await ICFAssessmentService.list({});
      const filter = ICFAssessment.find.mock.calls[0][0];
      expect(filter.isDeleted).toBe(false);
    });
  });

  /* ═══════════════ update ═══════════════ */
  describe('update', () => {
    it('updates assessment fields and recalculates', async () => {
      const doc = global.__mkICFDoc({ status: 'draft' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      const res = await ICFAssessmentService.update('a1', { title: 'Updated' }, 'u1');
      expect(doc.calculateScores).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
      expect(res.title).toBe('Updated');
      expect(res.updatedBy).toBe('u1');
    });

    it('throws if not found', async () => {
      ICFAssessment.findOne.mockResolvedValue(null);
      await expect(ICFAssessmentService.update('bad', {}, 'u1')).rejects.toThrow(
        'التقييم غير موجود'
      );
    });

    it('throws if status is approved', async () => {
      const doc = global.__mkICFDoc({ status: 'approved' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await expect(ICFAssessmentService.update('a1', {}, 'u1')).rejects.toThrow(
        'لا يمكن تعديل تقييم تمت الموافقة عليه'
      );
    });
  });

  /* ═══════════════ delete (soft) ═══════════════ */
  describe('delete', () => {
    it('soft deletes assessment', async () => {
      ICFAssessment.findOneAndUpdate.mockResolvedValue({
        _id: 'a1',
        isDeleted: true,
        assessmentNumber: 'ICF-001',
      });

      const res = await ICFAssessmentService.delete('a1', 'u1');
      expect(res.isDeleted).toBe(true);
      expect(ICFAssessment.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'a1', isDeleted: false },
        { isDeleted: true, isActive: false, updatedBy: 'u1' },
        { new: true }
      );
    });

    it('throws if not found', async () => {
      ICFAssessment.findOneAndUpdate.mockResolvedValue(null);
      await expect(ICFAssessmentService.delete('bad', 'u1')).rejects.toThrow('التقييم غير موجود');
    });
  });

  /* ═══════════════ changeStatus ═══════════════ */
  describe('changeStatus', () => {
    it('transitions draft → inProgress', async () => {
      const doc = global.__mkICFDoc({ status: 'draft' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      const res = await ICFAssessmentService.changeStatus('a1', 'inProgress', 'u1');
      expect(res.status).toBe('inProgress');
      expect(doc.save).toHaveBeenCalled();
    });

    it('transitions inProgress → completed and sets completedDate', async () => {
      const doc = global.__mkICFDoc({ status: 'inProgress' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await ICFAssessmentService.changeStatus('a1', 'completed', 'u1');
      expect(doc.status).toBe('completed');
      expect(doc.completedDate).toBeInstanceOf(Date);
    });

    it('transitions completed → reviewed and sets reviewerId', async () => {
      const doc = global.__mkICFDoc({ status: 'completed' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await ICFAssessmentService.changeStatus('a1', 'reviewed', 'u1');
      expect(doc.status).toBe('reviewed');
      expect(doc.reviewerId).toBe('u1');
      expect(doc.reviewedDate).toBeInstanceOf(Date);
    });

    it('transitions reviewed → approved and sets approvedDate', async () => {
      const doc = global.__mkICFDoc({ status: 'reviewed' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await ICFAssessmentService.changeStatus('a1', 'approved', 'u1');
      expect(doc.status).toBe('approved');
      expect(doc.approvedDate).toBeInstanceOf(Date);
    });

    it('transitions approved → archived', async () => {
      const doc = global.__mkICFDoc({ status: 'approved' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await ICFAssessmentService.changeStatus('a1', 'archived', 'u1');
      expect(doc.status).toBe('archived');
    });

    it('rejects invalid transition', async () => {
      const doc = global.__mkICFDoc({ status: 'draft' });
      ICFAssessment.findOne.mockResolvedValue(doc);

      await expect(ICFAssessmentService.changeStatus('a1', 'approved', 'u1')).rejects.toThrow(
        'لا يمكن الانتقال'
      );
    });

    it('throws if not found', async () => {
      ICFAssessment.findOne.mockResolvedValue(null);
      await expect(ICFAssessmentService.changeStatus('bad', 'inProgress', 'u1')).rejects.toThrow(
        'التقييم غير موجود'
      );
    });
  });

  /* ═══════════════ _calculateGapAnalysis ═══════════════ */
  describe('_calculateGapAnalysis', () => {
    it('calculates gap from activitiesParticipation items', () => {
      const assessment = {
        activitiesParticipation: {
          chapter1: [
            { code: 'd110', title: 'Watching', performanceQualifier: 3, capacityQualifier: 1 },
            { code: 'd115', title: 'Listening', performanceQualifier: 2, capacityQualifier: 2 },
          ],
        },
        gapAnalysis: null,
      };

      ICFAssessmentService._calculateGapAnalysis(assessment);
      expect(assessment.gapAnalysis).toBeDefined();
      expect(assessment.gapAnalysis.averagePerformance).toBe(2.5);
      expect(assessment.gapAnalysis.averageCapacity).toBe(1.5);
      expect(assessment.gapAnalysis.averageGap).toBe(1);
      expect(assessment.gapAnalysis.significantGaps.length).toBe(1);
      expect(assessment.gapAnalysis.significantGaps[0].code).toBe('d110');
    });

    it('handles null activitiesParticipation', () => {
      const assessment = { activitiesParticipation: null, gapAnalysis: null };
      ICFAssessmentService._calculateGapAnalysis(assessment);
      expect(assessment.gapAnalysis).toBeNull();
    });

    it('handles activitiesParticipation with toObject() (Mongoose doc)', () => {
      const raw = {
        chapter1: [{ code: 'd110', performanceQualifier: 4, capacityQualifier: 2 }],
      };
      const assessment = {
        activitiesParticipation: { toObject: () => raw },
        gapAnalysis: null,
      };
      ICFAssessmentService._calculateGapAnalysis(assessment);
      expect(assessment.gapAnalysis.significantGaps.length).toBe(1);
    });

    it('generates recommendations for significant gaps', () => {
      const assessment = {
        activitiesParticipation: {
          ch1: [{ code: 'd110', title: 'A', performanceQualifier: 4, capacityQualifier: 1 }],
        },
        gapAnalysis: null,
      };
      ICFAssessmentService._calculateGapAnalysis(assessment);
      const gap = assessment.gapAnalysis.significantGaps[0];
      expect(gap.recommendation).toContain('Environmental modification');
      expect(gap.recommendationAr).toContain('تعديل بيئي');
    });
  });

  /* ═══════════════ compareWithPrevious ═══════════════ */
  describe('compareWithPrevious', () => {
    it('returns comparison when previous exists', async () => {
      const current = global.__mkICFDoc({
        _id: 'a2',
        beneficiaryId: 'b1',
        overallFunctioningScore: 70,
        assessmentDate: new Date('2024-06-01'),
        assessmentNumber: 'ICF-002',
        domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.0 }],
      });
      const previous = global.__mkICFDoc({
        _id: 'a1',
        beneficiaryId: 'b1',
        overallFunctioningScore: 50,
        assessmentDate: new Date('2024-01-01'),
        assessmentNumber: 'ICF-001',
        domainScores: [{ domain: 'bodyFunctions', averageQualifier: 3.0 }],
      });

      ICFAssessment.findById.mockResolvedValue(current);
      ICFAssessment.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(previous),
      });

      const res = await ICFAssessmentService.compareWithPrevious('a2');
      expect(res.current.id).toBe('a2');
      expect(res.previous.id).toBe('a1');
      expect(res.comparison.overallChange).toBeDefined();
      expect(current.save).toHaveBeenCalled();
    });

    it('returns message when no previous exists', async () => {
      const current = global.__mkICFDoc({ _id: 'a1', previousAssessmentId: null });
      ICFAssessment.findById.mockResolvedValue(current);
      ICFAssessment.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const res = await ICFAssessmentService.compareWithPrevious('a1');
      expect(res.message).toContain('لا يوجد تقييم سابق');
      expect(res.comparison).toBeNull();
    });

    it('uses previousAssessmentId if set', async () => {
      const current = global.__mkICFDoc({
        _id: 'a2',
        previousAssessmentId: 'a1',
        overallFunctioningScore: 60,
        assessmentNumber: 'ICF-002',
        domainScores: [],
      });
      const prev = global.__mkICFDoc({
        _id: 'a1',
        overallFunctioningScore: 55,
        assessmentNumber: 'ICF-001',
        domainScores: [],
      });
      ICFAssessment.findById
        .mockResolvedValueOnce(current) // first call: current
        .mockResolvedValueOnce(prev); // second call: previous by id

      const res = await ICFAssessmentService.compareWithPrevious('a2');
      expect(res.previous.id).toBe('a1');
    });

    it('throws if not found', async () => {
      ICFAssessment.findById.mockResolvedValue(null);
      await expect(ICFAssessmentService.compareWithPrevious('bad')).rejects.toThrow(
        'التقييم غير موجود'
      );
    });
  });

  /* ═══════════════ getBeneficiaryTimeline ═══════════════ */
  describe('getBeneficiaryTimeline', () => {
    it('returns timeline with trend data', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([
        {
          assessmentNumber: 'ICF-001',
          assessmentType: 'initial',
          assessmentDate: new Date('2024-01-01'),
          overallFunctioningScore: 40,
          overallSeverity: 'moderate',
          domainScores: [],
        },
        {
          assessmentNumber: 'ICF-002',
          assessmentType: 'followup',
          assessmentDate: new Date('2024-06-01'),
          overallFunctioningScore: 60,
          overallSeverity: 'mild',
          domainScores: [],
        },
      ]);
      ICFAssessment.find.mockReturnValue(q);

      const res = await ICFAssessmentService.getBeneficiaryTimeline('b1');
      expect(res.beneficiaryId).toBe('b1');
      expect(res.totalAssessments).toBe(2);
      expect(res.trend.length).toBe(2);
      expect(res.overallTrend).toBe('improving');
      expect(res.latestScore).toBe(60);
      expect(res.earliestScore).toBe(40);
    });

    it('returns insufficient_data for single assessment', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([
        { assessmentNumber: 'ICF-001', overallFunctioningScore: 40, domainScores: [] },
      ]);
      ICFAssessment.find.mockReturnValue(q);

      const res = await ICFAssessmentService.getBeneficiaryTimeline('b1');
      expect(res.overallTrend).toBe('insufficient_data');
    });

    it('returns empty for no assessments', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFAssessment.find.mockReturnValue(q);

      const res = await ICFAssessmentService.getBeneficiaryTimeline('b1');
      expect(res.totalAssessments).toBe(0);
      expect(res.latestScore).toBeNull();
    });
  });

  /* ═══════════════ benchmarkAssessment ═══════════════ */
  describe('benchmarkAssessment', () => {
    it('returns benchmarking data with z-scores', async () => {
      const assessment = global.__mkICFDoc({
        getAllCodes: jest.fn().mockReturnValue([
          { domain: 'bodyFunctions', code: 'b110', qualifier: 2 },
          { domain: 'bodyFunctions', code: 'b120', qualifier: 3 },
        ]),
      });
      ICFAssessment.findById.mockResolvedValue(assessment);

      const bq = ICFAssessment.__mkQ();
      bq.lean.mockResolvedValue([
        {
          code: 'b110',
          mean: 3.0,
          median: 3.0,
          standardDeviation: 1.0,
          population: 'general',
          isActive: true,
        },
        {
          code: 'b120',
          mean: 2.5,
          median: 2.5,
          standardDeviation: 0.8,
          population: 'general',
          isActive: true,
        },
      ]);
      ICFBenchmark.find.mockReturnValue(bq);

      const res = await ICFAssessmentService.benchmarkAssessment('a1');
      expect(res.domainBenchmarks).toBeDefined();
      expect(res.domainBenchmarks.length).toBe(1); // one domain
      expect(res.domainBenchmarks[0].domain).toBe('bodyFunctions');
      expect(res.domainBenchmarks[0].zScore).toBeDefined();
      expect(res.domainBenchmarks[0].percentileRank).toBeDefined();
      expect(assessment.save).toHaveBeenCalled();
    });

    it('handles domain with no benchmark data', async () => {
      const assessment = global.__mkICFDoc({
        getAllCodes: jest
          .fn()
          .mockReturnValue([{ domain: 'bodyStructures', code: 's110', qualifier: 2 }]),
      });
      ICFAssessment.findById.mockResolvedValue(assessment);

      const bq = ICFAssessment.__mkQ();
      bq.lean.mockResolvedValue([]);
      ICFBenchmark.find.mockReturnValue(bq);

      const res = await ICFAssessmentService.benchmarkAssessment('a1');
      expect(res.domainBenchmarks[0].benchmarkMean).toBeNull();
      expect(res.domainBenchmarks[0].interpretationAr).toContain('لا تتوفر');
    });

    it('throws if assessment not found', async () => {
      ICFAssessment.findById.mockResolvedValue(null);
      await expect(ICFAssessmentService.benchmarkAssessment('bad')).rejects.toThrow(
        'التقييم غير موجود'
      );
    });
  });

  /* ═══════════════ getStatistics ═══════════════ */
  describe('getStatistics', () => {
    it('returns combined statistics', async () => {
      ICFAssessment.aggregate
        .mockResolvedValueOnce([
          {
            totalAssessments: 50,
            avgFunctioningScore: 55.3,
            minScore: 20,
            maxScore: 90,
            uniqueBeneficiaries: 30,
            uniqueAssessors: 5,
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'initial', count: 30 },
          { _id: 'followup', count: 20 },
        ]) // byType
        .mockResolvedValueOnce([{ _id: 'moderate', count: 25 }]) // bySeverity
        .mockResolvedValueOnce([{ _id: 'completed', count: 20 }]) // byStatus
        .mockResolvedValueOnce([{ _id: { year: 2024, month: 6 }, count: 10, avgScore: 60 }]); // monthly

      const res = await ICFAssessmentService.getStatistics({});
      expect(res.summary.totalAssessments).toBe(50);
      expect(res.byType.length).toBe(2);
      expect(res.bySeverity.length).toBe(1);
    });

    it('applies date range filters', async () => {
      ICFAssessment.aggregate.mockResolvedValue([]);

      await ICFAssessmentService.getStatistics({
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      // Verify match filter has date range
      const call = ICFAssessment.aggregate.mock.calls[0][0];
      const matchStage = call[0].$match;
      expect(matchStage.assessmentDate.$gte).toBeInstanceOf(Date);
    });
  });

  /* ═══════════════ getDomainDistribution ═══════════════ */
  describe('getDomainDistribution', () => {
    it('returns domain distribution', async () => {
      ICFAssessment.aggregate.mockResolvedValue([
        { _id: 'bodyFunctions', avgQualifier: 2.1, count: 30, avgItems: 5 },
        { _id: 'bodyStructures', avgQualifier: 3.4, count: 20, avgItems: 4 },
      ]);

      const res = await ICFAssessmentService.getDomainDistribution({});
      expect(res.length).toBe(2);
      expect(res[0].domain).toBe('bodyFunctions');
      expect(res[0].averageQualifier).toBe(2.1);
    });
  });

  /* ═══════════════ searchCodes ═══════════════ */
  describe('searchCodes', () => {
    it('returns matching ICF codes', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([{ code: 'b110', title: 'Consciousness' }]);
      ICFCodeReference.find.mockReturnValue(q);

      const res = await ICFAssessmentService.searchCodes({ search: 'consciousness' });
      expect(res.length).toBe(1);
    });

    it('applies component filter', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFCodeReference.find.mockReturnValue(q);

      await ICFAssessmentService.searchCodes({ component: 'b' });
      const filter = ICFCodeReference.find.mock.calls[0][0];
      expect(filter.component).toBe('b');
    });

    it('applies chapter and level filters', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFCodeReference.find.mockReturnValue(q);

      await ICFAssessmentService.searchCodes({ chapter: '1', level: '2' });
      const filter = ICFCodeReference.find.mock.calls[0][0];
      expect(filter.chapter).toBe(1);
      expect(filter.level).toBe(2);
    });
  });

  /* ═══════════════ getCodeTree ═══════════════ */
  describe('getCodeTree', () => {
    it('builds hierarchical tree from flat codes', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([
        { code: 'b1', title: 'Mental', parentCode: null },
        { code: 'b110', title: 'Consciousness', parentCode: 'b1' },
        { code: 'b114', title: 'Orientation', parentCode: 'b1' },
      ]);
      ICFCodeReference.find.mockReturnValue(q);

      const tree = await ICFAssessmentService.getCodeTree('b');
      expect(tree.length).toBe(1);
      expect(tree[0].children.length).toBe(2);
    });

    it('returns empty for no codes', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFCodeReference.find.mockReturnValue(q);

      const tree = await ICFAssessmentService.getCodeTree('x');
      expect(tree).toEqual([]);
    });
  });

  /* ═══════════════ Benchmark Management ═══════════════ */
  describe('createBenchmark', () => {
    it('creates and saves benchmark', async () => {
      const res = await ICFAssessmentService.createBenchmark({
        code: 'b110',
        population: 'general',
        mean: 2.5,
        standardDeviation: 1.0,
      });
      expect(res.save).toHaveBeenCalled();
      expect(res.code).toBe('b110');
    });
  });

  describe('listBenchmarks', () => {
    it('returns active benchmarks', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([{ code: 'b110', mean: 2.5 }]);
      ICFBenchmark.find.mockReturnValue(q);

      const res = await ICFAssessmentService.listBenchmarks({});
      expect(res.length).toBe(1);
    });

    it('filters by population', async () => {
      const q = ICFAssessment.__mkQ();
      q.lean.mockResolvedValue([]);
      ICFBenchmark.find.mockReturnValue(q);

      await ICFAssessmentService.listBenchmarks({ population: 'pediatric' });
      const filter = ICFBenchmark.find.mock.calls[0][0];
      expect(filter.population).toBe('pediatric');
    });
  });

  describe('importBenchmarks', () => {
    it('bulk writes benchmarks with upsert', async () => {
      ICFBenchmark.bulkWrite.mockResolvedValue({
        matchedCount: 1,
        upsertedCount: 2,
        modifiedCount: 1,
      });

      const res = await ICFAssessmentService.importBenchmarks([
        { code: 'b110', population: 'general', mean: 2.5 },
        { code: 'b120', population: 'general', mean: 3.0 },
      ]);
      expect(res.matched).toBe(1);
      expect(res.upserted).toBe(2);
    });
  });
});
