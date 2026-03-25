/* eslint-disable no-unused-vars */
/**
 * Traffic Accident Controller — Unit Tests
 * اختبارات وحدة لمتحكم الحوادث المرورية
 *
 * Re-integrated from _archived/trafficAccidents.test.js (audit item 5.4)
 * Covers all 20 controller actions + validation branches.
 */

jest.mock('../services/trafficAccidentService');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const trafficAccidentService = require('../services/trafficAccidentService');
const controller = require('../controllers/trafficAccidentController');

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

const mockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  user: { id: 'user123', name: 'Test User', role: 'admin' },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════
// 1. createAccidentReport
// ═══════════════════════════════════════════════════════════════════════

describe('createAccidentReport', () => {
  const validData = {
    accidentInfo: {
      accidentDateTime: new Date().toISOString(),
      location: { address: 'شارع الملك فهد', city: 'الرياض' },
      weather: 'clear',
      visibility: 'good',
      lightingConditions: 'daylight',
      roadConditions: 'dry',
      roadType: 'highway',
      speedLimit: 120,
      description: 'حادثة اصطدام',
    },
    severity: 'moderate',
    priority: 'high',
    vehicles: [{ plateNumber: 'ج ا ب 1234' }],
  };

  test('creates report successfully (201)', async () => {
    const fakeReport = { _id: 'rep1', reportNumber: 'TAR-001', status: 'draft', ...validData };
    trafficAccidentService.createAccidentReport.mockResolvedValue(fakeReport);

    const req = mockReq({ body: { accidentData: validData } });
    const res = mockRes();

    await controller.createAccidentReport(req, res);

    expect(trafficAccidentService.createAccidentReport).toHaveBeenCalledWith(validData, 'user123');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeReport })
    );
  });

  test('returns 400 when accidentData missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await controller.createAccidentReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('returns 500 on service error', async () => {
    trafficAccidentService.createAccidentReport.mockRejectedValue(new Error('DB error'));

    const req = mockReq({ body: { accidentData: validData } });
    const res = mockRes();

    await controller.createAccidentReport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getAllReports
// ═══════════════════════════════════════════════════════════════════════

describe('getAllReports', () => {
  test('returns paginated list (200)', async () => {
    const fakeResult = { reports: [{ _id: 'r1' }], pagination: { total: 1, pages: 1 } };
    trafficAccidentService.getAllReports.mockResolvedValue(fakeResult);

    const req = mockReq({ query: { severity: 'critical', page: '2', limit: '10' } });
    const res = mockRes();

    await controller.getAllReports(req, res);

    expect(trafficAccidentService.getAllReports).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
      2,
      10
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('strips undefined query filters', async () => {
    trafficAccidentService.getAllReports.mockResolvedValue({ reports: [], pagination: {} });

    const req = mockReq({ query: {} });
    const res = mockRes();

    await controller.getAllReports(req, res);

    const passedFilters = trafficAccidentService.getAllReports.mock.calls[0][0];
    expect(Object.keys(passedFilters)).toHaveLength(0);
  });

  test('returns 500 on service error', async () => {
    trafficAccidentService.getAllReports.mockRejectedValue(new Error('timeout'));

    const req = mockReq({ query: {} });
    const res = mockRes();

    await controller.getAllReports(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. getReportById
// ═══════════════════════════════════════════════════════════════════════

describe('getReportById', () => {
  test('returns single report and records view', async () => {
    const fakeReport = { _id: 'r1', reportNumber: 'TAR-100' };
    trafficAccidentService.getReportById.mockResolvedValue(fakeReport);
    trafficAccidentService.recordViewHistory.mockResolvedValue(true);

    const req = mockReq({ params: { id: 'r1' } });
    const res = mockRes();

    await controller.getReportById(req, res);

    expect(trafficAccidentService.getReportById).toHaveBeenCalledWith('r1');
    expect(trafficAccidentService.recordViewHistory).toHaveBeenCalledWith('r1', 'user123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeReport })
    );
  });

  test('returns 500 when report not found', async () => {
    trafficAccidentService.getReportById.mockRejectedValue(new Error('Not found'));

    const req = mockReq({ params: { id: 'missing' } });
    const res = mockRes();

    await controller.getReportById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. updateAccidentReport
// ═══════════════════════════════════════════════════════════════════════

describe('updateAccidentReport', () => {
  test('updates report successfully', async () => {
    const fakeReport = { _id: 'r1', severity: 'critical' };
    trafficAccidentService.updateAccidentReport.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { updateData: { severity: 'critical' } },
    });
    const res = mockRes();

    await controller.updateAccidentReport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeReport })
    );
  });

  test('returns 400 when updateData missing', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: {} });
    const res = mockRes();

    await controller.updateAccidentReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. deleteAccidentReport
// ═══════════════════════════════════════════════════════════════════════

describe('deleteAccidentReport', () => {
  test('archives report with reason', async () => {
    trafficAccidentService.deleteAccidentReport.mockResolvedValue({
      message: 'تم الأرشفة بنجاح',
    });

    const req = mockReq({
      params: { id: 'r1' },
      body: { reason: 'تقرير مكرر' },
    });
    const res = mockRes();

    await controller.deleteAccidentReport(req, res);

    expect(trafficAccidentService.deleteAccidentReport).toHaveBeenCalledWith(
      'r1',
      'user123',
      'تقرير مكرر'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. updateReportStatus
// ═══════════════════════════════════════════════════════════════════════

describe('updateReportStatus', () => {
  test('updates status with notes', async () => {
    const fakeReport = { _id: 'r1', status: 'submitted' };
    trafficAccidentService.updateReportStatus.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { status: 'submitted', notes: 'مراجعة' },
    });
    const res = mockRes();

    await controller.updateReportStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeReport })
    );
  });

  test('returns 400 when status missing', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: {} });
    const res = mockRes();

    await controller.updateReportStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. startInvestigation
// ═══════════════════════════════════════════════════════════════════════

describe('startInvestigation', () => {
  test('starts investigation with officer ID', async () => {
    const fakeReport = {
      _id: 'r1',
      investigation: { status: 'in_progress' },
    };
    trafficAccidentService.startInvestigation.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { investigatingOfficerId: 'officer1' },
    });
    const res = mockRes();

    await controller.startInvestigation(req, res);

    expect(trafficAccidentService.startInvestigation).toHaveBeenCalledWith(
      'r1',
      'officer1',
      'user123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without investigatingOfficerId', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: {} });
    const res = mockRes();

    await controller.startInvestigation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. completeInvestigation
// ═══════════════════════════════════════════════════════════════════════

describe('completeInvestigation', () => {
  test('completes investigation with full data', async () => {
    const fakeReport = { _id: 'r1', investigation: { status: 'completed' } };
    trafficAccidentService.completeInvestigation.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: {
        findings: 'السبب هو عدم الانتباه',
        rootCause: 'human_error',
        contributingFactors: ['السرعة الزائدة'],
        recommendations: ['دورة تدريبية'],
      },
    });
    const res = mockRes();

    await controller.completeInvestigation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without findings', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: { rootCause: 'x' } });
    const res = mockRes();

    await controller.completeInvestigation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 without rootCause', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: { findings: 'x' } });
    const res = mockRes();

    await controller.completeInvestigation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. addComment
// ═══════════════════════════════════════════════════════════════════════

describe('addComment', () => {
  test('adds comment to report', async () => {
    const fakeReport = { _id: 'r1', comments: [{ text: 'ملاحظة' }] };
    trafficAccidentService.addComment.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { comment: 'ملاحظة مهمة' },
    });
    const res = mockRes();

    await controller.addComment(req, res);

    expect(trafficAccidentService.addComment).toHaveBeenCalledWith(
      'r1',
      'user123',
      'Test User',
      'ملاحظة مهمة',
      undefined
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without comment text', async () => {
    const req = mockReq({ params: { id: 'r1' }, body: {} });
    const res = mockRes();

    await controller.addComment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. addWitness
// ═══════════════════════════════════════════════════════════════════════

describe('addWitness', () => {
  test('adds witness with required fields', async () => {
    const fakeReport = { _id: 'r1', witnesses: [{ name: 'محمد' }] };
    trafficAccidentService.addWitness.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { name: 'محمد أحمد', phone: '+966501234567', statement: 'شهادة' },
    });
    const res = mockRes();

    await controller.addWitness(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without name', async () => {
    const req = mockReq({
      params: { id: 'r1' },
      body: { phone: '+966501234567' },
    });
    const res = mockRes();

    await controller.addWitness(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 without phone', async () => {
    const req = mockReq({
      params: { id: 'r1' },
      body: { name: 'محمد' },
    });
    const res = mockRes();

    await controller.addWitness(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. addAttachment
// ═══════════════════════════════════════════════════════════════════════

describe('addAttachment', () => {
  test('adds attachment successfully', async () => {
    const fakeReport = { _id: 'r1', attachments: [{ fileName: 'photo.jpg' }] };
    trafficAccidentService.addAttachment.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { fileName: 'photo.jpg', fileUrl: '/uploads/photo.jpg', fileType: 'image/jpeg' },
    });
    const res = mockRes();

    await controller.addAttachment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without fileName', async () => {
    const req = mockReq({
      params: { id: 'r1' },
      body: { fileUrl: '/uploads/x.jpg' },
    });
    const res = mockRes();

    await controller.addAttachment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 without fileUrl', async () => {
    const req = mockReq({
      params: { id: 'r1' },
      body: { fileName: 'photo.jpg' },
    });
    const res = mockRes();

    await controller.addAttachment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. addInsuranceInfo
// ═══════════════════════════════════════════════════════════════════════

describe('addInsuranceInfo', () => {
  test('adds insurance info for vehicle', async () => {
    const fakeReport = { _id: 'r1' };
    trafficAccidentService.addInsuranceInfo.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1', vehicleIndex: '0' },
      body: { provider: 'شركة تأمين', policyNumber: 'POL-001' },
    });
    const res = mockRes();

    await controller.addInsuranceInfo(req, res);

    expect(trafficAccidentService.addInsuranceInfo).toHaveBeenCalledWith(
      'r1',
      0,
      expect.any(Object),
      'user123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. determineLiability
// ═══════════════════════════════════════════════════════════════════════

describe('determineLiability', () => {
  test('determines liability successfully', async () => {
    const fakeReport = { _id: 'r1' };
    trafficAccidentService.determineLiability.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: {
        primaryResponsiblePartyId: 'driver1',
        responsibilityPercentage: 80,
        determination: 'مسؤول بنسبة 80%',
      },
    });
    const res = mockRes();

    await controller.determineLiability(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. closeReport
// ═══════════════════════════════════════════════════════════════════════

describe('closeReport', () => {
  test('closes report with conclusion data', async () => {
    const fakeReport = { _id: 'r1', status: 'closed' };
    trafficAccidentService.closeReport.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1' },
      body: { resolution: 'تم الحل', finalNotes: 'تم إغلاق التقرير' },
    });
    const res = mockRes();

    await controller.closeReport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 15. getStatistics
// ═══════════════════════════════════════════════════════════════════════

describe('getStatistics', () => {
  test('returns statistics with filters', async () => {
    const fakeStats = {
      summary: { total: 50 },
      statusDistribution: { draft: 10 },
      severityDistribution: { critical: 5 },
    };
    trafficAccidentService.getStatistics.mockResolvedValue(fakeStats);

    const req = mockReq({ query: { city: 'الرياض', severity: 'critical' } });
    const res = mockRes();

    await controller.getStatistics(req, res);

    expect(trafficAccidentService.getStatistics).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'الرياض', severity: 'critical' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeStats })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 16. searchReports
// ═══════════════════════════════════════════════════════════════════════

describe('searchReports', () => {
  test('searches with query string', async () => {
    const fakeResult = { reports: [], pagination: {} };
    trafficAccidentService.searchReports.mockResolvedValue(fakeResult);

    const req = mockReq({ query: { q: 'الرياض', page: '1', limit: '10' } });
    const res = mockRes();

    await controller.searchReports(req, res);

    expect(trafficAccidentService.searchReports).toHaveBeenCalledWith('الرياض', {}, 1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without search query', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();

    await controller.searchReports(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 17. getNearbyAccidents
// ═══════════════════════════════════════════════════════════════════════

describe('getNearbyAccidents', () => {
  test('returns nearby accidents with coordinates', async () => {
    trafficAccidentService.getNearbyAccidents.mockResolvedValue([{ _id: 'r1' }]);

    const req = mockReq({
      query: { latitude: '24.7136', longitude: '46.6753', maxDistance: '3000' },
    });
    const res = mockRes();

    await controller.getNearbyAccidents(req, res);

    expect(trafficAccidentService.getNearbyAccidents).toHaveBeenCalledWith(24.7136, 46.6753, 3000);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 without latitude', async () => {
    const req = mockReq({ query: { longitude: '46.6753' } });
    const res = mockRes();

    await controller.getNearbyAccidents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 without longitude', async () => {
    const req = mockReq({ query: { latitude: '24.7136' } });
    const res = mockRes();

    await controller.getNearbyAccidents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 18. getOverdueFollowUps
// ═══════════════════════════════════════════════════════════════════════

describe('getOverdueFollowUps', () => {
  test('returns overdue list with default threshold', async () => {
    const fakeReports = [{ _id: 'r1' }, { _id: 'r2' }];
    trafficAccidentService.getOverdueFollowUps.mockResolvedValue(fakeReports);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await controller.getOverdueFollowUps(req, res);

    expect(trafficAccidentService.getOverdueFollowUps).toHaveBeenCalledWith(30);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 2, data: fakeReports })
    );
  });

  test('uses custom threshold', async () => {
    trafficAccidentService.getOverdueFollowUps.mockResolvedValue([]);

    const req = mockReq({ query: { daysThreshold: '7' } });
    const res = mockRes();

    await controller.getOverdueFollowUps(req, res);

    expect(trafficAccidentService.getOverdueFollowUps).toHaveBeenCalledWith(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 19. updateDamageInfo
// ═══════════════════════════════════════════════════════════════════════

describe('updateDamageInfo', () => {
  test('updates damage info for vehicle', async () => {
    const fakeReport = { _id: 'r1' };
    trafficAccidentService.updateDamageInfo.mockResolvedValue(fakeReport);

    const req = mockReq({
      params: { id: 'r1', vehicleIndex: '1' },
      body: { severity: 'major', description: 'ضرر بالغ في المقدمة' },
    });
    const res = mockRes();

    await controller.updateDamageInfo(req, res);

    expect(trafficAccidentService.updateDamageInfo).toHaveBeenCalledWith(
      'r1',
      1,
      expect.any(Object),
      'user123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 20. exportPDF
// ═══════════════════════════════════════════════════════════════════════

describe('exportPDF', () => {
  test('sets PDF headers and pipes document', async () => {
    const fakePdfDoc = { pipe: jest.fn(), end: jest.fn() };
    trafficAccidentService.generatePDFReport.mockResolvedValue(fakePdfDoc);

    const req = mockReq({ params: { id: 'r1' } });
    const res = mockRes();

    await controller.exportPDF(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(fakePdfDoc.pipe).toHaveBeenCalledWith(res);
    expect(fakePdfDoc.end).toHaveBeenCalled();
  });

  test('returns 500 on PDF generation error', async () => {
    trafficAccidentService.generatePDFReport.mockRejectedValue(new Error('PDF fail'));

    const req = mockReq({ params: { id: 'r1' } });
    const res = mockRes();

    await controller.exportPDF(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 21. exportExcel
// ═══════════════════════════════════════════════════════════════════════

describe('exportExcel', () => {
  test('sets Excel headers and writes workbook', async () => {
    const fakeWorkbook = { write: jest.fn() };
    trafficAccidentService.generateExcelReport.mockResolvedValue(fakeWorkbook);

    const req = mockReq({ query: { city: 'جدة' } });
    const res = mockRes();

    await controller.exportExcel(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(fakeWorkbook.write).toHaveBeenCalledWith(res);
    expect(res.end).toHaveBeenCalled();
  });
});
