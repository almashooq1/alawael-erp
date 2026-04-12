/**
 * Unit tests for trafficAccidentService.js
 * Singleton instance (new TrafficAccidentService()), 23 methods
 * Model instance methods: generateReportNumber, calculateTotalLoss, archive,
 *   markAsUnderInvestigation, completeInvestigation, close, recordView
 */

/* ─── mocks ─── */
let mockReportInstance;
jest.mock('../../models/TrafficAccidentReport', () => {
  const Mock = jest.fn().mockImplementation(function (data) {
    Object.assign(this, {
      _id: 'aabbccddeeff00112233aabb',
      status: 'open',
      severity: 'medium',
      vehicles: [{ plateNumber: 'ABC123', insurance: null, damage: null }],
      comments: [],
      witnesses: [],
      attachments: [],
      investigation: {},
      followUp: {},
      accidentInfo: {
        accidentDateTime: new Date(),
        location: { address: 'St 1', city: 'Riyadh' },
        description: 'Test',
      },
      financialImpact: { totalLoss: 0, repairCosts: 0, medicalCosts: 0 },
      auditInfo: { createdBy: 'cc00112233445566778899aa', createdAt: new Date() },
      archived: false,
      ...data,
      generateReportNumber: jest.fn(),
      calculateTotalLoss: jest.fn(),
      archive: jest.fn(),
      markAsUnderInvestigation: jest.fn(),
      completeInvestigation: jest.fn(),
      close: jest.fn(),
      recordView: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    });
  });
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.countDocuments = jest.fn();
  Mock.updateMany = jest.fn();
  Mock.getStatistics = jest.fn();
  Mock.getStatusDistribution = jest.fn();
  Mock.getSeverityDistribution = jest.fn();
  return Mock;
});
jest.mock('../../models/Driver');
jest.mock('../../models/Vehicle');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/escapeRegex', () => jest.fn(s => s));
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn(),
  }));
});
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRows: jest.fn(),
      getRow: jest.fn().mockReturnValue({ font: {} }),
    }),
  })),
}));

const TrafficAccidentReport = require('../../models/TrafficAccidentReport');
const service = require('../../services/trafficAccidentService');

/* ─── helpers ─── */
const fakeId = 'aabbccddeeff00112233aabb';
const uid = 'cc00112233445566778899aa';

const makeReport = (overrides = {}) => ({
  _id: fakeId,
  reportNumber: 'ACC-001',
  status: 'open',
  severity: 'medium',
  vehicles: [{ plateNumber: 'ABC123', insurance: null, damage: null }],
  comments: [],
  witnesses: [],
  attachments: [],
  investigation: {},
  followUp: {},
  accidentInfo: {
    accidentDateTime: new Date(),
    location: { address: 'St 1', city: 'Riyadh' },
    description: 'Test',
  },
  financialImpact: { totalLoss: 0, repairCosts: 0, medicalCosts: 0 },
  auditInfo: { createdBy: uid, createdAt: new Date() },
  archived: false,
  generateReportNumber: jest.fn(),
  calculateTotalLoss: jest.fn(),
  archive: jest.fn(),
  markAsUnderInvestigation: jest.fn(),
  completeInvestigation: jest.fn(),
  close: jest.fn(),
  recordView: jest.fn(),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('TrafficAccidentService', () => {
  // ─── 1. createAccidentReport ───
  describe('createAccidentReport', () => {
    it('creates report, generates number, calculates loss', async () => {
      const result = await service.createAccidentReport({ severity: 'high' }, uid);
      expect(result.generateReportNumber).toBeDefined();
      expect(result.save).toHaveBeenCalled();
    });

    it('throws on save error', async () => {
      TrafficAccidentReport.mockImplementationOnce(function (data) {
        Object.assign(this, data);
        this.generateReportNumber = jest.fn();
        this.calculateTotalLoss = jest.fn();
        this.save = jest.fn().mockRejectedValue(new Error('DB error'));
      });
      await expect(service.createAccidentReport({}, uid)).rejects.toThrow('DB error');
    });
  });

  // ─── 2. getAllReports ───
  describe('getAllReports', () => {
    it('returns paginated reports with default params', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: fakeId }]),
      };
      TrafficAccidentReport.find.mockReturnValue(chain);
      TrafficAccidentReport.countDocuments.mockResolvedValue(1);

      const result = await service.getAllReports();
      expect(result.reports).toHaveLength(1);
      expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
    });

    it('applies status/severity/dateRange/city/priority filters', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TrafficAccidentReport.find.mockReturnValue(chain);
      TrafficAccidentReport.countDocuments.mockResolvedValue(0);

      await service.getAllReports({
        status: 'closed',
        severity: 'high',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        city: 'Riyadh',
        priority: 'urgent',
      });
      const filter = TrafficAccidentReport.find.mock.calls[0][0];
      expect(filter.status).toBe('closed');
      expect(filter.severity).toBe('high');
      expect(filter['accidentInfo.location.city']).toBe('Riyadh');
      expect(filter.priority).toBe('urgent');
    });
  });

  // ─── 3. getReportById ───
  describe('getReportById', () => {
    it('returns populated report', async () => {
      const mockReturn = { _id: fakeId, reportNumber: 'ACC-001' };
      const chain = { populate: jest.fn() };
      let callCount = 0;
      chain.populate.mockImplementation(() => {
        callCount++;
        if (callCount >= 8) return mockReturn; // 8 populate calls
        return chain;
      });
      TrafficAccidentReport.findById.mockReturnValue(chain);

      const result = await service.getReportById(fakeId);
      expect(TrafficAccidentReport.findById).toHaveBeenCalledWith(fakeId);
      expect(result.reportNumber).toBe('ACC-001');
    });

    it('throws when report not found', async () => {
      const chain = { populate: jest.fn() };
      let cnt = 0;
      chain.populate.mockImplementation(() => {
        cnt++;
        if (cnt >= 8) return null;
        return chain;
      });
      TrafficAccidentReport.findById.mockReturnValue(chain);

      await expect(service.getReportById(fakeId)).rejects.toThrow('التقرير غير موجود');
    });
  });

  // ─── 4. updateAccidentReport ───
  describe('updateAccidentReport', () => {
    it('updates allowed fields and recalculates loss', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.updateAccidentReport(fakeId, { description: 'Updated', blocked: true }, uid);
      expect(report.description).toBe('Updated');
      expect(report.blocked).toBeUndefined(); // not in allowedFields
      expect(report.calculateTotalLoss).toHaveBeenCalled();
      expect(report.save).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      TrafficAccidentReport.findById.mockResolvedValue(null);
      await expect(service.updateAccidentReport(fakeId, {}, uid)).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ─── 5. deleteAccidentReport (archive) ───
  describe('deleteAccidentReport', () => {
    it('archives the report', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      const result = await service.deleteAccidentReport(fakeId, uid, 'Test reason');
      expect(report.archive).toHaveBeenCalledWith(uid, 'Test reason');
      expect(report.save).toHaveBeenCalled();
      expect(result.message).toBe('تم أرشفة التقرير بنجاح');
    });

    it('throws when not found', async () => {
      TrafficAccidentReport.findById.mockResolvedValue(null);
      await expect(service.deleteAccidentReport(fakeId, uid)).rejects.toThrow('التقرير غير موجود');
    });
  });

  // ─── 6. updateReportStatus ───
  describe('updateReportStatus', () => {
    it('updates status and adds comment if notes', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.updateReportStatus(fakeId, 'investigating', uid, 'started');
      expect(report.status).toBe('investigating');
      expect(report.comments).toHaveLength(1);
      expect(report.save).toHaveBeenCalled();
    });

    it('updates without comment if no notes', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.updateReportStatus(fakeId, 'closed', uid);
      expect(report.status).toBe('closed');
      expect(report.comments).toHaveLength(0);
    });

    it('throws when not found', async () => {
      TrafficAccidentReport.findById.mockResolvedValue(null);
      await expect(service.updateReportStatus(fakeId, 'x', uid)).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ─── 7. startInvestigation ───
  describe('startInvestigation', () => {
    it('calls markAsUnderInvestigation', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.startInvestigation(fakeId, 'officer1', uid);
      expect(report.markAsUnderInvestigation).toHaveBeenCalledWith('officer1');
      expect(report.save).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      TrafficAccidentReport.findById.mockResolvedValue(null);
      await expect(service.startInvestigation(fakeId, 'o', uid)).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ─── 8. completeInvestigation ───
  describe('completeInvestigation', () => {
    it('calls completeInvestigation + sets extras', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      const data = {
        findings: 'Found X',
        rootCause: 'Speeding',
        contributingFactors: ['wet road'],
        recommendations: 'Lower speed',
        primaryCause: 'human-error',
      };
      await service.completeInvestigation(fakeId, data, uid);
      expect(report.completeInvestigation).toHaveBeenCalledWith(
        'Found X',
        'Speeding',
        'Lower speed'
      );
      expect(report.investigation.contributingFactors).toEqual(['wet road']);
      expect(report.investigation.primaryCause).toBe('human-error');
    });
  });

  // ─── 9. addComment ───
  describe('addComment', () => {
    it('pushes comment to array', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.addComment(fakeId, uid, 'John', 'Test comment', []);
      expect(report.comments).toHaveLength(1);
      expect(report.comments[0].comment).toBe('Test comment');
    });
  });

  // ─── 10. addWitness ───
  describe('addWitness', () => {
    it('pushes witness to array', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.addWitness(fakeId, { name: 'Witness1' }, uid);
      expect(report.witnesses).toHaveLength(1);
      expect(report.witnesses[0].name).toBe('Witness1');
    });
  });

  // ─── 11. addAttachment ───
  describe('addAttachment', () => {
    it('pushes attachment', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.addAttachment(fakeId, { fileName: 'photo.jpg' }, uid);
      expect(report.attachments).toHaveLength(1);
      expect(report.attachments[0].fileName).toBe('photo.jpg');
    });
  });

  // ─── 12. addInsuranceInfo ───
  describe('addInsuranceInfo', () => {
    it('sets insurance on correct vehicle index', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.addInsuranceInfo(fakeId, 0, { provider: 'Tawuniya' }, uid);
      expect(report.vehicles[0].insurance).toEqual({ provider: 'Tawuniya' });
    });

    it('throws on invalid vehicle index', async () => {
      const report = makeReport({ vehicles: [] });
      TrafficAccidentReport.findById.mockResolvedValue(report);
      await expect(service.addInsuranceInfo(fakeId, 0, {}, uid)).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });

    it('throws on negative index', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);
      await expect(service.addInsuranceInfo(fakeId, -1, {}, uid)).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });
  });

  // ─── 13. determineLiability ───
  describe('determineLiability', () => {
    it('sets liability fields', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.determineLiability(fakeId, 'driver1', 80, 'At fault', uid);
      expect(report.liability).toEqual({
        primaryResponsibleParty: 'driver1',
        responsibilityPercentage: 80,
        determination: 'At fault',
      });
    });
  });

  // ─── 14. closeReport ───
  describe('closeReport', () => {
    it('calls close(), sets followUp', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.closeReport(fakeId, {}, uid);
      expect(report.close).toHaveBeenCalled();
      expect(report.followUp.status).toBe('resolved');
    });
  });

  // ─── 15. generatePDFReport ───
  describe('generatePDFReport', () => {
    it('generates a PDFDocument', async () => {
      // Mock getReportById via the service itself
      const reportData = {
        reportNumber: 'ACC-001',
        status: 'closed',
        severity: 'high',
        accidentInfo: {
          accidentDateTime: new Date(),
          location: { address: 'Street 1', city: 'Riyadh' },
          description: 'Collision',
        },
        vehicles: [{ plateNumber: 'ABC', vehicleType: 'sedan', damage: { type: 'front' } }],
        financialImpact: { totalLoss: 5000, repairCosts: 3000, medicalCosts: 2000 },
        investigation: { findings: 'Found cause' },
      };

      // Mock the getReportById internal call — 8 populates
      const chain = { populate: jest.fn() };
      let c = 0;
      chain.populate.mockImplementation(() => {
        c++;
        return c >= 8 ? reportData : chain;
      });
      TrafficAccidentReport.findById.mockReturnValue(chain);

      const doc = await service.generatePDFReport(fakeId);
      expect(doc).toBeDefined();
    });
  });

  // ─── 16. generateExcelReport ───
  describe('generateExcelReport', () => {
    it('generates a workbook', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TrafficAccidentReport.find.mockReturnValue(chain);
      TrafficAccidentReport.countDocuments.mockResolvedValue(0);

      const workbook = await service.generateExcelReport({});
      expect(workbook).toBeDefined();
    });
  });

  // ─── 17. getStatistics ───
  describe('getStatistics', () => {
    it('combines statistics, status, severity', async () => {
      TrafficAccidentReport.getStatistics = jest.fn().mockResolvedValue([{ totalReports: 10 }]);
      TrafficAccidentReport.getStatusDistribution = jest.fn().mockResolvedValue([]);
      TrafficAccidentReport.getSeverityDistribution = jest.fn().mockResolvedValue([]);

      const r = await service.getStatistics({});
      expect(r.summary.totalReports).toBe(10);
      expect(r.statusDistribution).toEqual([]);
    });

    it('defaults summary when empty', async () => {
      TrafficAccidentReport.getStatistics = jest.fn().mockResolvedValue([]);
      TrafficAccidentReport.getStatusDistribution = jest.fn().mockResolvedValue([]);
      TrafficAccidentReport.getSeverityDistribution = jest.fn().mockResolvedValue([]);

      const r = await service.getStatistics({});
      expect(r.summary.totalReports).toBe(0);
    });
  });

  // ─── 18. searchReports ───
  describe('searchReports', () => {
    it('searches across multiple fields', async () => {
      const chain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      TrafficAccidentReport.find.mockReturnValue(chain);
      TrafficAccidentReport.countDocuments.mockResolvedValue(0);

      const r = await service.searchReports('ACC-001', { severity: 'high' });
      const filter = TrafficAccidentReport.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      expect(filter.severity).toBe('high');
      expect(r.pagination.page).toBe(1);
    });
  });

  // ─── 19. getNearbyAccidents ───
  describe('getNearbyAccidents', () => {
    it('uses $near geolocation query', async () => {
      TrafficAccidentReport.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: fakeId }]),
      });

      const r = await service.getNearbyAccidents(24.7, 46.7, 3000);
      const filter = TrafficAccidentReport.find.mock.calls[0][0];
      expect(filter['accidentInfo.location.coordinates'].$near.$geometry.coordinates).toEqual([
        46.7, 24.7,
      ]);
      expect(filter['accidentInfo.location.coordinates'].$near.$maxDistance).toBe(3000);
    });
  });

  // ─── 20. recordViewHistory ───
  describe('recordViewHistory', () => {
    it('calls recordView on report', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.recordViewHistory(fakeId, uid);
      expect(report.recordView).toHaveBeenCalledWith(uid);
      expect(report.save).toHaveBeenCalled();
    });

    it('does not throw when not found', async () => {
      TrafficAccidentReport.findById.mockResolvedValue(null);
      // recordViewHistory catches errors silently (only logs)
      await expect(service.recordViewHistory(fakeId, uid)).resolves.toBeUndefined();
    });
  });

  // ─── 21. getOverdueFollowUps ───
  describe('getOverdueFollowUps', () => {
    it('queries pending follow-ups past due', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: fakeId }]),
      };
      TrafficAccidentReport.find.mockReturnValue(chain);

      const r = await service.getOverdueFollowUps(30);
      const filter = TrafficAccidentReport.find.mock.calls[0][0];
      expect(filter['followUp.status']).toBe('pending');
      expect(filter['followUp.nextFollowUpDate'].$lt).toBeDefined();
      expect(r).toHaveLength(1);
    });
  });

  // ─── 22. updateDamageInfo ───
  describe('updateDamageInfo', () => {
    it('updates vehicle damage and recalculates', async () => {
      const report = makeReport();
      TrafficAccidentReport.findById.mockResolvedValue(report);

      await service.updateDamageInfo(fakeId, 0, { type: 'side' }, uid);
      expect(report.vehicles[0].damage).toEqual({ type: 'side' });
      expect(report.calculateTotalLoss).toHaveBeenCalled();
    });

    it('throws on invalid vehicle index', async () => {
      const report = makeReport({ vehicles: [] });
      TrafficAccidentReport.findById.mockResolvedValue(report);
      await expect(service.updateDamageInfo(fakeId, 0, {}, uid)).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });
  });

  // ─── 23. applyArchivalFilter ───
  describe('applyArchivalFilter', () => {
    it('calls updateMany with retention cutoff', async () => {
      TrafficAccidentReport.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const r = await service.applyArchivalFilter([fakeId], uid, 365);
      expect(TrafficAccidentReport.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: [fakeId] },
          'accidentInfo.accidentDateTime': expect.any(Object),
        }),
        expect.objectContaining({
          archived: true,
          status: 'archived',
        })
      );
      expect(r.modifiedCount).toBe(3);
    });
  });
});
