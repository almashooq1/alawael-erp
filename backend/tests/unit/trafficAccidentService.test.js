/**
 * Unit tests for services/trafficAccidentService.js
 * TrafficAccidentService — Accident reports, investigation, PDF/Excel (singleton)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockReportSave = jest.fn().mockResolvedValue(undefined);

function freshReport(overrides = {}) {
  return {
    _id: 'r1',
    reportNumber: 'ACC-2025-00001',
    status: 'submitted',
    severity: 'medium',
    accidentInfo: {
      accidentDateTime: new Date('2025-06-01'),
      location: { address: 'Main St', city: 'Riyadh', coordinates: [46.7, 24.7] },
      description: 'Collision',
    },
    vehicles: [
      { plateNumber: 'ABC-123', vehicleType: 'sedan', damage: { type: 'front' }, insurance: {} },
    ],
    financialImpact: { totalLoss: 5000, repairCosts: 3000, medicalCosts: 2000 },
    investigation: { findings: null, investigatingOfficer: null },
    comments: [],
    witnesses: [],
    attachments: [],
    liability: {},
    followUp: { status: 'pending', nextFollowUpDate: new Date() },
    auditInfo: { createdBy: 'u1' },
    archived: false,
    totalInjured: 1,
    totalDeaths: 0,
    generateReportNumber: jest.fn(),
    calculateTotalLoss: jest.fn(),
    archive: jest.fn(),
    markAsUnderInvestigation: jest.fn(),
    completeInvestigation: jest.fn(),
    close: jest.fn(),
    recordView: jest.fn(),
    save: mockReportSave,
    ...overrides,
  };
}

const mockFindById = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('../../models/TrafficAccidentReport', () => {
  const Model = jest.fn().mockImplementation(data => ({
    ...data,
    _id: 'new-r1',
    generateReportNumber: jest.fn(),
    calculateTotalLoss: jest.fn(),
    save: mockReportSave,
  }));
  Model.findById = (...a) => mockFindById(...a);
  Model.find = (...a) => mockFind(...a);
  Model.countDocuments = (...a) => mockCountDocuments(...a);
  Model.aggregate = (...a) => mockAggregate(...a);
  Model.updateMany = (...a) => mockUpdateMany(...a);
  Model.getStatistics = jest.fn();
  Model.getStatusDistribution = jest.fn();
  Model.getSeverityDistribution = jest.fn();
  return Model;
});

jest.mock('../../models/Driver', () => ({}));
jest.mock('../../models/Vehicle', () => ({}));

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
    addWorksheet: jest.fn(() => ({
      columns: [],
      addRows: jest.fn(),
      getRow: jest.fn(() => ({ font: {} })),
    })),
  })),
}));

const TrafficAccidentReport = require('../../models/TrafficAccidentReport');
const service = require('../../services/trafficAccidentService');

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('TrafficAccidentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createAccidentReport ─────────────────────────────────────────

  describe('createAccidentReport', () => {
    it('creates and saves report', async () => {
      const result = await service.createAccidentReport(
        { accidentInfo: { description: 'Test' } },
        'u1'
      );

      expect(result._id).toBe('new-r1');
      expect(mockReportSave).toHaveBeenCalled();
    });

    it('throws when save fails', async () => {
      mockReportSave.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.createAccidentReport({}, 'u1')).rejects.toThrow('DB error');
    });
  });

  // ── getAllReports ────────────────────────────────────────────────

  describe('getAllReports', () => {
    it('returns paginated reports', async () => {
      mockCountDocuments.mockResolvedValue(25);
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([freshReport()]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getAllReports({}, 1, 20);

      expect(result.reports).toHaveLength(1);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(2);
    });

    it('applies all filters', async () => {
      mockCountDocuments.mockResolvedValue(0);
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getAllReports({
        status: 'submitted',
        severity: 'high',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        city: 'Riyadh',
        priority: 'high',
      });

      expect(result.reports).toEqual([]);
    });
  });

  // ── getReportById ────────────────────────────────────────────────

  describe('getReportById', () => {
    it('returns populated report', async () => {
      const report = freshReport();
      mockFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                      populate: jest.fn().mockResolvedValue(report),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getReportById('r1');

      expect(result.reportNumber).toBe('ACC-2025-00001');
    });

    it('throws when not found', async () => {
      mockFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                      populate: jest.fn().mockResolvedValue(null),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.getReportById('bad')).rejects.toThrow('التقرير غير موجود');
    });
  });

  // ── updateAccidentReport ─────────────────────────────────────────

  describe('updateAccidentReport', () => {
    it('updates allowed fields only', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      const result = await service.updateAccidentReport(
        'r1',
        { description: 'Updated', status: 'closed' /* not allowed */ },
        'u1'
      );

      expect(result.description).toBe('Updated');
      expect(report.calculateTotalLoss).toHaveBeenCalled();
      expect(mockReportSave).toHaveBeenCalled();
    });

    it('throws when report not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.updateAccidentReport('bad', {}, 'u1')).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ── deleteAccidentReport ─────────────────────────────────────────

  describe('deleteAccidentReport', () => {
    it('archives report', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      const result = await service.deleteAccidentReport('r1', 'u1', 'obsolete');

      expect(report.archive).toHaveBeenCalledWith('u1', 'obsolete');
      expect(result.message).toContain('أرشفة');
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.deleteAccidentReport('bad', 'u1', 'reason')).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ── updateReportStatus ───────────────────────────────────────────

  describe('updateReportStatus', () => {
    it('updates status and adds comment with notes', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.updateReportStatus('r1', 'closed', 'u1', 'Case resolved');

      expect(report.status).toBe('closed');
      expect(report.comments).toHaveLength(1);
      expect(mockReportSave).toHaveBeenCalled();
    });

    it('updates without comment when no notes', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.updateReportStatus('r1', 'investigating', 'u1');

      expect(report.comments).toHaveLength(0);
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.updateReportStatus('bad', 'closed', 'u1')).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ── startInvestigation ───────────────────────────────────────────

  describe('startInvestigation', () => {
    it('marks report as under investigation', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.startInvestigation('r1', 'officer1', 'u1');

      expect(report.markAsUnderInvestigation).toHaveBeenCalledWith('officer1');
      expect(mockReportSave).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.startInvestigation('bad', 'o1', 'u1')).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ── completeInvestigation ────────────────────────────────────────

  describe('completeInvestigation', () => {
    it('completes investigation with results', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.completeInvestigation(
        'r1',
        {
          findings: 'Driver error',
          rootCause: 'Speeding',
          contributingFactors: ['weather'],
          recommendations: 'Speed limit',
          primaryCause: 'speeding',
        },
        'u1'
      );

      expect(report.completeInvestigation).toHaveBeenCalledWith(
        'Driver error',
        'Speeding',
        'Speed limit'
      );
      expect(report.investigation.contributingFactors).toEqual(['weather']);
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.completeInvestigation('bad', {}, 'u1')).rejects.toThrow(
        'التقرير غير موجود'
      );
    });
  });

  // ── addComment ───────────────────────────────────────────────────

  describe('addComment', () => {
    it('pushes comment to report', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.addComment('r1', 'u1', 'Admin', 'A note');

      expect(report.comments).toHaveLength(1);
      expect(report.comments[0].comment).toBe('A note');
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.addComment('bad', 'u1', 'N', 'C')).rejects.toThrow('التقرير غير موجود');
    });
  });

  // ── addWitness ───────────────────────────────────────────────────

  describe('addWitness', () => {
    it('pushes witness to report', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.addWitness('r1', { name: 'Ali', phone: '050' }, 'u1');

      expect(report.witnesses).toHaveLength(1);
      expect(report.witnesses[0].name).toBe('Ali');
    });
  });

  // ── addAttachment ────────────────────────────────────────────────

  describe('addAttachment', () => {
    it('pushes attachment to report', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.addAttachment('r1', { filename: 'photo.jpg' }, 'u1');

      expect(report.attachments).toHaveLength(1);
    });
  });

  // ── addInsuranceInfo ─────────────────────────────────────────────

  describe('addInsuranceInfo', () => {
    it('sets insurance on vehicle by index', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.addInsuranceInfo('r1', 0, { company: 'InsureCo' }, 'u1');

      expect(report.vehicles[0].insurance).toEqual({ company: 'InsureCo' });
    });

    it('throws for invalid vehicle index', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await expect(service.addInsuranceInfo('r1', 5, {}, 'u1')).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });

    it('throws for negative vehicle index', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await expect(service.addInsuranceInfo('r1', -1, {}, 'u1')).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });
  });

  // ── determineLiability ───────────────────────────────────────────

  describe('determineLiability', () => {
    it('sets liability object', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.determineLiability('r1', 'driver1', 70, 'Speeding', 'u1');

      expect(report.liability.primaryResponsibleParty).toBe('driver1');
      expect(report.liability.responsibilityPercentage).toBe(70);
    });
  });

  // ── closeReport ──────────────────────────────────────────────────

  describe('closeReport', () => {
    it('closes report and sets followUp resolved', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.closeReport('r1', {}, 'u1');

      expect(report.close).toHaveBeenCalled();
      expect(report.followUp.status).toBe('resolved');
    });
  });

  // ── generatePDFReport ────────────────────────────────────────────

  describe('generatePDFReport', () => {
    it('returns PDFDocument instance', async () => {
      // Mock getReportById via service internally
      const report = freshReport();
      mockFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                      populate: jest.fn().mockResolvedValue(report),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const doc = await service.generatePDFReport('r1');

      expect(doc.fontSize).toBeDefined();
      expect(doc.text).toBeDefined();
    });
  });

  // ── generateExcelReport ──────────────────────────────────────────

  describe('generateExcelReport', () => {
    it('returns ExcelJS workbook', async () => {
      mockCountDocuments.mockResolvedValue(1);
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([freshReport()]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const wb = await service.generateExcelReport({});

      expect(wb.addWorksheet).toBeDefined();
    });
  });

  // ── getStatistics ────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns summary with distributions', async () => {
      TrafficAccidentReport.getStatistics.mockResolvedValue([
        { totalReports: 50, totalInjured: 20, totalDeaths: 2, totalFinancialLoss: 500000 },
      ]);
      TrafficAccidentReport.getStatusDistribution.mockResolvedValue([
        { _id: 'submitted', count: 30 },
      ]);
      TrafficAccidentReport.getSeverityDistribution.mockResolvedValue([
        { _id: 'medium', count: 25 },
      ]);

      const result = await service.getStatistics({});

      expect(result.summary.totalReports).toBe(50);
      expect(result.statusDistribution).toHaveLength(1);
      expect(result.severityDistribution).toHaveLength(1);
    });

    it('returns defaults when no stats', async () => {
      TrafficAccidentReport.getStatistics.mockResolvedValue([]);
      TrafficAccidentReport.getStatusDistribution.mockResolvedValue([]);
      TrafficAccidentReport.getSeverityDistribution.mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.summary.totalReports).toBe(0);
    });
  });

  // ── searchReports ────────────────────────────────────────────────

  describe('searchReports', () => {
    it('returns search results paginated', async () => {
      mockCountDocuments.mockResolvedValue(5);
      mockFind.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([freshReport()]),
          }),
        }),
      });

      const result = await service.searchReports('collision', {}, 1, 10);

      expect(result.reports).toHaveLength(1);
      expect(result.pagination.total).toBe(5);
    });
  });

  // ── getNearbyAccidents ───────────────────────────────────────────

  describe('getNearbyAccidents', () => {
    it('queries by geo coordinates', async () => {
      mockFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([freshReport()]),
      });

      const result = await service.getNearbyAccidents(24.7, 46.7, 5000);

      expect(result).toHaveLength(1);
    });
  });

  // ── recordViewHistory ────────────────────────────────────────────

  describe('recordViewHistory', () => {
    it('records view on report', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await service.recordViewHistory('r1', 'u1');

      expect(report.recordView).toHaveBeenCalledWith('u1');
    });

    it('does not throw when report not found', async () => {
      mockFindById.mockResolvedValue(null);

      // recordViewHistory catches the error internally
      await expect(service.recordViewHistory('bad', 'u1')).resolves.toBeUndefined();
    });
  });

  // ── getOverdueFollowUps ──────────────────────────────────────────

  describe('getOverdueFollowUps', () => {
    it('returns overdue reports', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([freshReport()]),
        }),
      });

      const result = await service.getOverdueFollowUps(30);

      expect(result).toHaveLength(1);
    });
  });

  // ── updateDamageInfo ─────────────────────────────────────────────

  describe('updateDamageInfo', () => {
    it('updates damage for vehicle by index', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      const result = await service.updateDamageInfo('r1', 0, { type: 'rear' }, 'u1');

      expect(result.vehicles[0].damage).toEqual({ type: 'rear' });
      expect(report.calculateTotalLoss).toHaveBeenCalled();
    });

    it('throws for invalid vehicle index', async () => {
      const report = freshReport();
      mockFindById.mockResolvedValue(report);

      await expect(service.updateDamageInfo('r1', 5, {}, 'u1')).rejects.toThrow(
        'المركبة غير موجودة'
      );
    });
  });

  // ── applyArchivalFilter ──────────────────────────────────────────

  describe('applyArchivalFilter', () => {
    it('archives reports beyond retention', async () => {
      mockUpdateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await service.applyArchivalFilter(['r1', 'r2', 'r3'], 'u1', 365);

      expect(result.modifiedCount).toBe(3);
      expect(mockUpdateMany).toHaveBeenCalled();
    });
  });
});
