/**
 * Unit tests for research.service.js — Research & Evidence-Based Practice Service
 * 35 standalone exported functions, 6 Mongoose models, utility dep (escapeRegex)
 */

/* ─── mocks ─── */
jest.mock('../../models/ResearchStudy');
jest.mock('../../models/OutcomeMeasure');
jest.mock('../../models/AnonymizedDataset');
jest.mock('../../models/ProgramEffectiveness');
jest.mock('../../models/BenchmarkingReport');
jest.mock('../../models/ResearchDataExport');
jest.mock('../../utils/sanitize', () => ({ escapeRegex: jest.fn(s => s) }));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const ResearchStudy = require('../../models/ResearchStudy');
const OutcomeMeasure = require('../../models/OutcomeMeasure');
const AnonymizedDataset = require('../../models/AnonymizedDataset');
const ProgramEffectiveness = require('../../models/ProgramEffectiveness');
const BenchmarkingReport = require('../../models/BenchmarkingReport');
const ResearchDataExport = require('../../models/ResearchDataExport');

const svc = require('../../services/research.service');

/* ─── helpers ─── */
const fakeId = 'aabbccddeeff00112233aabb';
const uid = 'cc00112233445566778899aa';

const chainable = (resolveValue = []) => {
  const chain = {};
  ['populate', 'sort', 'skip', 'limit', 'select', 'lean'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = resolve => resolve(resolveValue);
  chain[Symbol.toStringTag] = 'Promise';
  // make it thenable so await works
  return new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') return res => Promise.resolve(resolveValue).then(res);
      if (prop === 'catch') return rej => Promise.resolve(resolveValue).catch(rej);
      return target[prop] || jest.fn().mockReturnValue(target);
    },
  });
};

const makeFindChain = resolveValue => {
  const c = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolveValue),
  };
  return c;
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// §1  Research Studies
// ═══════════════════════════════════════════════════════════════════════════

describe('Research Service', () => {
  describe('§1 Studies', () => {
    it('getStudies — default pagination', async () => {
      const chain = makeFindChain([{ _id: fakeId }]);
      ResearchStudy.find.mockReturnValue(chain);
      ResearchStudy.countDocuments.mockResolvedValue(1);

      const result = await svc.getStudies();
      expect(ResearchStudy.find).toHaveBeenCalled();
      expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('getStudies — applies status/type/search filters', async () => {
      const chain = makeFindChain([]);
      ResearchStudy.find.mockReturnValue(chain);
      ResearchStudy.countDocuments.mockResolvedValue(0);

      await svc.getStudies({
        status: 'active',
        studyType: 'rct',
        search: 'rehab',
        principalInvestigator: uid,
      });
      const filter = ResearchStudy.find.mock.calls[0][0];
      expect(filter.status).toBe('active');
      expect(filter.studyType).toBe('rct');
      expect(filter.principalInvestigator).toBe(uid);
      expect(filter.$or).toBeDefined();
    });

    it('getStudies — custom page/limit/sort', async () => {
      const chain = makeFindChain([]);
      ResearchStudy.find.mockReturnValue(chain);
      ResearchStudy.countDocuments.mockResolvedValue(50);

      const result = await svc.getStudies({
        page: 3,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
      });
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.sort).toHaveBeenCalledWith({ title: 1 });
      expect(result.pagination.pages).toBe(5);
    });

    it('getStudyById — returns populated study', async () => {
      const chain = makeFindChain({ _id: fakeId, title: 'Test Study' });
      // findById returns a chainable
      ResearchStudy.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ _id: fakeId, title: 'Test Study' }),
              }),
            }),
          }),
        }),
      });

      const result = await svc.getStudyById(fakeId);
      expect(result.title).toBe('Test Study');
    });

    it('createStudy — spreads data + userId', async () => {
      const data = { title: 'New Study' };
      ResearchStudy.create.mockResolvedValue({ ...data, _id: fakeId, createdBy: uid });

      const result = await svc.createStudy(data, uid);
      expect(ResearchStudy.create).toHaveBeenCalledWith({ ...data, createdBy: uid });
      expect(result.createdBy).toBe(uid);
    });

    it('updateStudy — findByIdAndUpdate with $set', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: fakeId, title: 'Updated' }),
        }),
      };
      ResearchStudy.findByIdAndUpdate.mockReturnValue(chain);

      const result = await svc.updateStudy(fakeId, { title: 'Updated' });
      expect(ResearchStudy.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { $set: { title: 'Updated' } },
        { new: true, runValidators: true }
      );
      expect(result.title).toBe('Updated');
    });

    it('deleteStudy — soft-deletes via isActive: false', async () => {
      ResearchStudy.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId, isActive: false }),
      });

      const result = await svc.deleteStudy(fakeId);
      expect(ResearchStudy.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { isActive: false },
        { new: true }
      );
      expect(result.isActive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §2  Outcome Measures
  // ═══════════════════════════════════════════════════════════════════════

  describe('§2 Outcome Measures', () => {
    it('getOutcomeMeasures — default query', async () => {
      const chain = makeFindChain([{ name: 'FIM' }]);
      OutcomeMeasure.find.mockReturnValue(chain);
      OutcomeMeasure.countDocuments.mockResolvedValue(1);

      const result = await svc.getOutcomeMeasures();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('getOutcomeMeasures — applies category/domain/search/internationallyRecognized', async () => {
      const chain = makeFindChain([]);
      OutcomeMeasure.find.mockReturnValue(chain);
      OutcomeMeasure.countDocuments.mockResolvedValue(0);

      await svc.getOutcomeMeasures({
        category: 'pain',
        domain: 'body-functions',
        search: 'VAS',
        internationallyRecognized: 'true',
      });
      const filter = OutcomeMeasure.find.mock.calls[0][0];
      expect(filter.category).toBe('pain');
      expect(filter.domain).toBe('body-functions');
      expect(filter.internationallyRecognized).toBe(true);
      expect(filter.$or).toBeDefined();
    });

    it('getOutcomeMeasureById — returns lean doc', async () => {
      OutcomeMeasure.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId, name: 'BI' }),
      });

      const r = await svc.getOutcomeMeasureById(fakeId);
      expect(r.name).toBe('BI');
    });

    it('createOutcomeMeasure — adds createdBy', async () => {
      OutcomeMeasure.create.mockResolvedValue({ name: 'BI', createdBy: uid });
      const r = await svc.createOutcomeMeasure({ name: 'BI' }, uid);
      expect(OutcomeMeasure.create).toHaveBeenCalledWith({ name: 'BI', createdBy: uid });
    });

    it('updateOutcomeMeasure — $set + validators', async () => {
      OutcomeMeasure.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateOutcomeMeasure(fakeId, { name: 'BI v2' });
      expect(OutcomeMeasure.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { $set: { name: 'BI v2' } },
        { new: true, runValidators: true }
      );
    });

    it('deleteOutcomeMeasure — soft-delete', async () => {
      OutcomeMeasure.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: false }),
      });
      const r = await svc.deleteOutcomeMeasure(fakeId);
      expect(r.isActive).toBe(false);
    });

    it('seedStandardMeasures — creates non-existing, skips existing', async () => {
      let callCount = 0;
      OutcomeMeasure.findOne.mockImplementation(() => {
        callCount++;
        // first 3 calls return null (create), rest return existing
        return Promise.resolve(callCount <= 3 ? null : { _id: 'exists' });
      });
      OutcomeMeasure.create.mockResolvedValue({});

      const r = await svc.seedStandardMeasures(uid);
      expect(r.total).toBe(12); // 12 standard measures
      expect(r.created).toBe(3);
      expect(r.skipped).toBe(9);
      expect(OutcomeMeasure.create).toHaveBeenCalledTimes(3);
    });

    it('seedStandardMeasures — all already exist', async () => {
      OutcomeMeasure.findOne.mockResolvedValue({ _id: 'exists' });

      const r = await svc.seedStandardMeasures(uid);
      expect(r.created).toBe(0);
      expect(r.skipped).toBe(12);
      expect(OutcomeMeasure.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §3  Anonymized Datasets
  // ═══════════════════════════════════════════════════════════════════════

  describe('§3 Anonymized Datasets', () => {
    it('getDatasets — default + filters (studyId/status/sourceModule)', async () => {
      const chain = makeFindChain([]);
      AnonymizedDataset.find.mockReturnValue(chain);
      AnonymizedDataset.countDocuments.mockResolvedValue(0);

      await svc.getDatasets({ studyId: fakeId, status: 'ready', sourceModule: 'sessions' });
      const filter = AnonymizedDataset.find.mock.calls[0][0];
      expect(filter.studyId).toBe(fakeId);
      expect(filter.status).toBe('ready');
      expect(filter.sourceModule).toBe('sessions');
    });

    it('getDatasetById — populated', async () => {
      AnonymizedDataset.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ _id: fakeId }),
          }),
        }),
      });
      const r = await svc.getDatasetById(fakeId);
      expect(r._id).toBe(fakeId);
    });

    it('createDataset — adds createdBy', async () => {
      AnonymizedDataset.create.mockResolvedValue({ _id: fakeId });
      await svc.createDataset({ datasetName: 'DS1' }, uid);
      expect(AnonymizedDataset.create).toHaveBeenCalledWith({ datasetName: 'DS1', createdBy: uid });
    });

    it('updateDataset — $set', async () => {
      AnonymizedDataset.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateDataset(fakeId, { status: 'anonymized' });
      expect(AnonymizedDataset.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { $set: { status: 'anonymized' } },
        { new: true, runValidators: true }
      );
    });

    it('deleteDataset — soft-delete', async () => {
      AnonymizedDataset.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: false }),
      });
      const r = await svc.deleteDataset(fakeId);
      expect(r.isActive).toBe(false);
    });

    it('logDatasetAccess — pushes access entry', async () => {
      AnonymizedDataset.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ accessLog: [{}] }),
      });
      await svc.logDatasetAccess(fakeId, uid, 'view', '1.2.3.4', 'research');
      expect(AnonymizedDataset.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        {
          $push: {
            accessLog: expect.objectContaining({
              userId: uid,
              action: 'view',
              ipAddress: '1.2.3.4',
              purpose: 'research',
            }),
          },
        },
        { new: true }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §4  Program Effectiveness
  // ═══════════════════════════════════════════════════════════════════════

  describe('§4 Program Effectiveness', () => {
    it('getEffectivenessReports — applies filters', async () => {
      const chain = makeFindChain([]);
      ProgramEffectiveness.find.mockReturnValue(chain);
      ProgramEffectiveness.countDocuments.mockResolvedValue(0);

      await svc.getEffectivenessReports({ programType: 'OT', status: 'draft', studyId: fakeId });
      const filter = ProgramEffectiveness.find.mock.calls[0][0];
      expect(filter.programType).toBe('OT');
      expect(filter.status).toBe('draft');
      expect(filter.studyId).toBe(fakeId);
    });

    it('getEffectivenessReportById — populated', async () => {
      ProgramEffectiveness.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ _id: fakeId }),
              }),
            }),
          }),
        }),
      });
      const r = await svc.getEffectivenessReportById(fakeId);
      expect(r._id).toBe(fakeId);
    });

    it('createEffectivenessReport — adds createdBy', async () => {
      ProgramEffectiveness.create.mockResolvedValue({ _id: fakeId });
      await svc.createEffectivenessReport({ programType: 'PT' }, uid);
      expect(ProgramEffectiveness.create).toHaveBeenCalledWith({
        programType: 'PT',
        createdBy: uid,
      });
    });

    it('updateEffectivenessReport — $set', async () => {
      ProgramEffectiveness.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateEffectivenessReport(fakeId, { status: 'reviewed' });
      expect(ProgramEffectiveness.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { $set: { status: 'reviewed' } },
        { new: true, runValidators: true }
      );
    });

    it('deleteEffectivenessReport — soft-delete', async () => {
      ProgramEffectiveness.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: false }),
      });
      const r = await svc.deleteEffectivenessReport(fakeId);
      expect(r.isActive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §5  Benchmarking Reports
  // ═══════════════════════════════════════════════════════════════════════

  describe('§5 Benchmarking Reports', () => {
    it('getBenchmarkingReports — with reportType/status', async () => {
      const chain = makeFindChain([]);
      BenchmarkingReport.find.mockReturnValue(chain);
      BenchmarkingReport.countDocuments.mockResolvedValue(0);

      await svc.getBenchmarkingReports({ reportType: 'national', status: 'published' });
      const filter = BenchmarkingReport.find.mock.calls[0][0];
      expect(filter.reportType).toBe('national');
      expect(filter.status).toBe('published');
    });

    it('getBenchmarkingReportById — lean', async () => {
      BenchmarkingReport.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      const r = await svc.getBenchmarkingReportById(fakeId);
      expect(r._id).toBe(fakeId);
    });

    it('createBenchmarkingReport', async () => {
      BenchmarkingReport.create.mockResolvedValue({ _id: fakeId });
      await svc.createBenchmarkingReport({ reportType: 'national' }, uid);
      expect(BenchmarkingReport.create).toHaveBeenCalledWith({
        reportType: 'national',
        createdBy: uid,
      });
    });

    it('updateBenchmarkingReport', async () => {
      BenchmarkingReport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateBenchmarkingReport(fakeId, { status: 'final' });
      expect(BenchmarkingReport.findByIdAndUpdate).toHaveBeenCalledWith(
        fakeId,
        { $set: { status: 'final' } },
        { new: true, runValidators: true }
      );
    });

    it('deleteBenchmarkingReport', async () => {
      BenchmarkingReport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: false }),
      });
      const r = await svc.deleteBenchmarkingReport(fakeId);
      expect(r.isActive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §6  Research Data Exports
  // ═══════════════════════════════════════════════════════════════════════

  describe('§6 Data Exports', () => {
    it('getExports — with studyId/status/targetPlatform', async () => {
      const chain = makeFindChain([]);
      ResearchDataExport.find.mockReturnValue(chain);
      ResearchDataExport.countDocuments.mockResolvedValue(0);

      await svc.getExports({ studyId: fakeId, status: 'pending', targetPlatform: 'REDCap' });
      const filter = ResearchDataExport.find.mock.calls[0][0];
      expect(filter.studyId).toBe(fakeId);
      expect(filter.targetPlatform).toBe('REDCap');
    });

    it('getExportById — populated', async () => {
      ResearchDataExport.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({ _id: fakeId }),
              }),
            }),
          }),
        }),
      });
      const r = await svc.getExportById(fakeId);
      expect(r._id).toBe(fakeId);
    });

    it('createExport — includes auditTrail', async () => {
      ResearchDataExport.create.mockResolvedValue({ _id: fakeId });
      await svc.createExport({ targetPlatform: 'REDCap' }, uid);
      const arg = ResearchDataExport.create.mock.calls[0][0];
      expect(arg.createdBy).toBe(uid);
      expect(arg.auditTrail).toBeDefined();
      expect(arg.auditTrail[0].action).toBe('created');
    });

    it('updateExport — with userId includes $push auditTrail', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateExport(fakeId, { status: 'configured' }, uid);
      const updateArg = ResearchDataExport.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$push.auditTrail.action).toBe('configured');
    });

    it('updateExport — without userId skips $push', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: fakeId }),
      });
      await svc.updateExport(fakeId, { status: 'pending' });
      const updateArg = ResearchDataExport.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$push).toBeUndefined();
    });

    it('approveExport — sets status+compliance+auditTrail', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ status: 'approved' }),
      });
      const r = await svc.approveExport(fakeId, uid);
      const args = ResearchDataExport.findByIdAndUpdate.mock.calls[0];
      expect(args[1].status).toBe('approved');
      expect(args[1]['compliance.exportApprovedBy']).toBe(uid);
      expect(args[1].$push.auditTrail.action).toBe('approved');
    });

    it('revokeExport — sets status + reason', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ status: 'revoked' }),
      });
      await svc.revokeExport(fakeId, uid, 'Policy violation');
      const args = ResearchDataExport.findByIdAndUpdate.mock.calls[0];
      expect(args[1].status).toBe('revoked');
      expect(args[1].$push.auditTrail.details).toBe('Policy violation');
    });

    it('revokeExport — default reason', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({}),
      });
      await svc.revokeExport(fakeId, uid);
      const args = ResearchDataExport.findByIdAndUpdate.mock.calls[0];
      expect(args[1].$push.auditTrail.details).toBe('Export revoked');
    });

    it('deleteExport — soft-delete', async () => {
      ResearchDataExport.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ isActive: false }),
      });
      const r = await svc.deleteExport(fakeId);
      expect(r.isActive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // §7  Dashboard Stats
  // ═══════════════════════════════════════════════════════════════════════

  describe('§7 Dashboard', () => {
    it('getDashboardStats — 8-way Promise.all', async () => {
      ResearchStudy.aggregate.mockResolvedValue([{ _id: 'active', count: 5 }]);
      OutcomeMeasure.countDocuments.mockResolvedValue(10);
      AnonymizedDataset.countDocuments.mockResolvedValue(3);
      ProgramEffectiveness.countDocuments.mockResolvedValue(2);
      BenchmarkingReport.countDocuments.mockResolvedValue(1);
      ResearchDataExport.countDocuments.mockResolvedValue(4);
      const chain = makeFindChain([{ title: 'Recent' }]);
      ResearchStudy.find.mockReturnValue(chain);

      const r = await svc.getDashboardStats();
      expect(r.studies.total).toBe(5);
      expect(r.outcomeMeasures).toBe(10);
      expect(r.anonymizedDatasets).toBe(3);
      expect(r.effectivenessReports).toBe(2);
      expect(r.benchmarkingReports).toBe(1);
      expect(r.dataExports).toBe(4);
      expect(r.recentStudies).toBeDefined();
    });

    it('getDashboardStats — with organizationId filter', async () => {
      ResearchStudy.aggregate.mockResolvedValue([]);
      OutcomeMeasure.countDocuments.mockResolvedValue(0);
      AnonymizedDataset.countDocuments.mockResolvedValue(0);
      ProgramEffectiveness.countDocuments.mockResolvedValue(0);
      BenchmarkingReport.countDocuments.mockResolvedValue(0);
      ResearchDataExport.countDocuments.mockResolvedValue(0);
      const chain = makeFindChain([]);
      ResearchStudy.find.mockReturnValue(chain);

      await svc.getDashboardStats('org123');
      // aggregate receives filter with organizationId
      const aggCall = ResearchStudy.aggregate.mock.calls[0][0];
      expect(aggCall[0].$match.organizationId).toBe('org123');
    });

    it('getDashboardStats — empty aggregation', async () => {
      ResearchStudy.aggregate.mockResolvedValue([]);
      OutcomeMeasure.countDocuments.mockResolvedValue(0);
      AnonymizedDataset.countDocuments.mockResolvedValue(0);
      ProgramEffectiveness.countDocuments.mockResolvedValue(0);
      BenchmarkingReport.countDocuments.mockResolvedValue(0);
      ResearchDataExport.countDocuments.mockResolvedValue(0);
      const chain = makeFindChain([]);
      ResearchStudy.find.mockReturnValue(chain);

      const r = await svc.getDashboardStats();
      expect(r.studies.total).toBe(0);
      expect(r.studies.byStatus).toEqual({});
    });
  });
});
