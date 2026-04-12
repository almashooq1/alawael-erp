/**
 * Unit Tests — SmartReportService
 * P#72 - Batch 33
 *
 * Static class. Depends on SmartPatientService + TherapySession (Mongoose).
 * Covers: generateProgressReport, generateDischargeSummary
 */

'use strict';

const mockGetUnifiedFile = jest.fn();
const mockSessionFind = jest.fn();

jest.mock('../../services/smartPatient.service', () => ({
  getUnifiedFile: (...a) => mockGetUnifiedFile(...a),
}));

jest.mock('../../models/TherapySession', () => ({
  find: (...a) => mockSessionFind(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartReportService = require('../../services/smartReport.service');

describe('SmartReportService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  generateProgressReport                                            */
  /* ================================================================ */
  describe('generateProgressReport', () => {
    const emrData = {
      profile: {
        firstName: 'Ahmad',
        lastName: 'Ali',
        fileNumber: 'F-100',
        dob: '2015-06-15',
      },
      clinical: {
        diagnosis: 'Autism',
        goals: [
          { description: 'Improve grip', status: 'IN_PROGRESS', progress: 60 },
          { description: 'Attention span', status: 'NOT_STARTED', progress: 0 },
        ],
      },
    };

    const sessions = [
      {
        _id: 'S1',
        date: new Date('2025-03-01'),
        notes: { assessment: 'Good progress in grip.' },
      },
      {
        _id: 'S2',
        date: new Date('2025-03-08'),
        notes: { assessment: 'Maintained level.' },
      },
      {
        _id: 'S3',
        date: new Date('2025-03-15'),
        notes: { assessment: 'Starting attention exercises.' },
      },
    ];

    const setupHappyPath = () => {
      mockGetUnifiedFile.mockResolvedValue(emrData);
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(sessions),
      });
    };

    it('returns report with all required fields', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res).toHaveProperty('reportId');
      expect(res).toHaveProperty('generatedDate');
      expect(res).toHaveProperty('period');
      expect(res).toHaveProperty('patient');
      expect(res).toHaveProperty('sections');
      expect(res).toHaveProperty('status');
    });

    it('reportId starts with REP-', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.reportId).toMatch(/^REP-\d+$/);
    });

    it('status is DRAFT', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.status).toBe('DRAFT');
    });

    it('period contains start and end dates', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.period.start).toBe('2025-03-01');
      expect(res.period.end).toBe('2025-03-31');
    });

    it('patient section includes name, id, diagnosis', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.patient.name).toBe('Ahmad Ali');
      expect(res.patient.id).toBe('F-100');
      expect(res.patient.diagnosis).toBe('Autism');
    });

    it('patient age is calculated from dob', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(typeof res.patient.age).toBe('number');
      expect(res.patient.age).toBeGreaterThan(0);
    });

    it('sections.attendance mentions session count', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.sections.attendance).toContain('3 sessions');
    });

    it('sections.goalsTable maps all goals with progress %', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.sections.goalsTable).toHaveLength(2);
      expect(res.sections.goalsTable[0].description).toBe('Improve grip');
      expect(res.sections.goalsTable[0].progress).toBe('60%');
    });

    it('sections.clinicalNarrative contains last 3 session notes', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.sections.clinicalNarrative).toContain('Good progress in grip.');
      expect(res.sections.clinicalNarrative).toContain('Starting attention exercises.');
    });

    it('sections.recommendations is present', async () => {
      setupHappyPath();
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.sections.recommendations).toContain('Continue');
    });

    it('throws when no completed sessions found', async () => {
      mockGetUnifiedFile.mockResolvedValue(emrData);
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });
      await expect(
        SmartReportService.generateProgressReport('BEN-1', '2025-03-01', '2025-03-31', 'USER-1')
      ).rejects.toThrow('No completed sessions found');
    });

    it('calls getUnifiedFile with beneficiaryId', async () => {
      setupHappyPath();
      await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(mockGetUnifiedFile).toHaveBeenCalledWith('BEN-1');
    });

    it('handles session with missing assessment note', async () => {
      mockGetUnifiedFile.mockResolvedValue(emrData);
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: 'S1', date: new Date('2025-03-01'), notes: {} }]),
      });
      const res = await SmartReportService.generateProgressReport(
        'BEN-1',
        '2025-03-01',
        '2025-03-31',
        'USER-1'
      );
      expect(res.sections.clinicalNarrative).toContain('No assessment recorded');
    });
  });

  /* ================================================================ */
  /*  generateDischargeSummary                                          */
  /* ================================================================ */
  describe('generateDischargeSummary', () => {
    it('returns placeholder message', async () => {
      const res = await SmartReportService.generateDischargeSummary('BEN-1');
      expect(res.message).toContain('placeholder');
    });
  });
});
