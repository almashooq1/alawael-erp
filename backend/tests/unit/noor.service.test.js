/**
 * Unit Tests — NoorService
 * P#73 - Batch 34
 *
 * Singleton (module.exports = new NoorService()). Depends on NoorStudent,
 * NoorIEP, NoorProgressReport, NoorConfig (from noor.models) + logger.
 * Covers: config, students CRUD, IEPs CRUD, progress reports, dashboard
 */

'use strict';

const mockConfigFindOne = jest.fn();
const mockConfigCreate = jest.fn();
const mockConfigFindOneAndUpdate = jest.fn();

const mockStudentFind = jest.fn();
const mockStudentCountDocuments = jest.fn();
const mockStudentCreate = jest.fn();
const mockStudentFindById = jest.fn();
const mockStudentFindByIdAndUpdate = jest.fn();

const mockIEPFind = jest.fn();
const mockIEPCountDocuments = jest.fn();
const mockIEPCreate = jest.fn();
const mockIEPFindById = jest.fn();
const mockIEPFindByIdAndUpdate = jest.fn();

const mockReportFind = jest.fn();
const mockReportCountDocuments = jest.fn();
const mockReportCreate = jest.fn();
const mockReportFindById = jest.fn();

jest.mock('../../models/noor.models', () => ({
  NoorConfig: {
    findOne: (...a) => mockConfigFindOne(...a),
    create: (...a) => mockConfigCreate(...a),
    findOneAndUpdate: (...a) => mockConfigFindOneAndUpdate(...a),
  },
  NoorStudent: {
    find: (...a) => mockStudentFind(...a),
    countDocuments: (...a) => mockStudentCountDocuments(...a),
    create: (...a) => mockStudentCreate(...a),
    findById: (...a) => mockStudentFindById(...a),
    findByIdAndUpdate: (...a) => mockStudentFindByIdAndUpdate(...a),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  NoorIEP: {
    find: (...a) => mockIEPFind(...a),
    countDocuments: (...a) => mockIEPCountDocuments(...a),
    create: (...a) => mockIEPCreate(...a),
    findById: (...a) => mockIEPFindById(...a),
    findByIdAndUpdate: (...a) => mockIEPFindByIdAndUpdate(...a),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  NoorProgressReport: {
    find: (...a) => mockReportFind(...a),
    countDocuments: (...a) => mockReportCountDocuments(...a),
    create: (...a) => mockReportCreate(...a),
    findById: (...a) => mockReportFindById(...a),
  },
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let service;
beforeEach(() => {
  jest.clearAllMocks();
  jest.isolateModules(() => {
    service = require('../../services/noor.service');
  });
});

describe('NoorService', () => {
  /* ================================================================ */
  /*  getConfig                                                         */
  /* ================================================================ */
  describe('getConfig', () => {
    it('returns existing config', async () => {
      const cfg = {
        organization: 'ORG-1',
        credentials: { encryptedApiKey: 'SECRET' },
        toObject: jest.fn().mockReturnValue({
          organization: 'ORG-1',
          credentials: { encryptedApiKey: 'SECRET' },
        }),
      };
      mockConfigFindOne.mockResolvedValue(cfg);
      const res = await service.getConfig('ORG-1');
      expect(res.organization).toBe('ORG-1');
      expect(res.credentials.encryptedApiKey).not.toBe('SECRET');
    });

    it('creates default config when none exists', async () => {
      mockConfigFindOne.mockResolvedValue(null);
      const newCfg = {
        organization: 'ORG-2',
        credentials: {},
        toObject: jest.fn().mockReturnValue({ organization: 'ORG-2', credentials: {} }),
      };
      mockConfigCreate.mockResolvedValue(newCfg);
      const res = await service.getConfig('ORG-2');
      expect(mockConfigCreate).toHaveBeenCalled();
    });
  });

  /* ================================================================ */
  /*  updateConfig                                                      */
  /* ================================================================ */
  describe('updateConfig', () => {
    it('updates and returns config', async () => {
      const updated = {
        organization: 'ORG-1',
        credentials: { encryptedApiKey: 'HIDDEN' },
        toObject: jest.fn().mockReturnValue({
          organization: 'ORG-1',
          credentials: { encryptedApiKey: 'HIDDEN' },
        }),
      };
      mockConfigFindOneAndUpdate.mockResolvedValue(updated);
      const res = await service.updateConfig('ORG-1', {}, 'USER-1');
      expect(res.organization).toBe('ORG-1');
    });
  });

  /* ================================================================ */
  /*  getStudents                                                       */
  /* ================================================================ */
  describe('getStudents', () => {
    it('returns paginated data', async () => {
      mockStudentFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ _id: 'S1' }]),
            }),
          }),
        }),
      });
      mockStudentCountDocuments.mockResolvedValue(1);

      const res = await service.getStudents({});
      expect(res.students).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  /* ================================================================ */
  /*  createStudent                                                     */
  /* ================================================================ */
  describe('createStudent', () => {
    it('creates and returns student', async () => {
      const data = { name: 'Ahmad' };
      mockStudentCreate.mockResolvedValue({ ...data, _id: 'S-NEW', createdBy: 'USER-1' });
      const res = await service.createStudent(data, 'USER-1');
      expect(res._id).toBe('S-NEW');
      expect(mockStudentCreate).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'USER-1', name: 'Ahmad' })
      );
    });
  });

  /* ================================================================ */
  /*  getStudentById                                                    */
  /* ================================================================ */
  describe('getStudentById', () => {
    it('returns student with populated beneficiary', async () => {
      mockStudentFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: 'S1', name: 'Ali' }),
        }),
      });
      const res = await service.getStudentById('S1');
      expect(res.name).toBe('Ali');
    });

    it('returns null when not found', async () => {
      mockStudentFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      const res = await service.getStudentById('bad');
      expect(res).toBeNull();
    });
  });

  /* ================================================================ */
  /*  syncStudent                                                       */
  /* ================================================================ */
  describe('syncStudent', () => {
    it('syncs and returns student', async () => {
      const doc = {
        _id: 'S1',
        syncStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      mockStudentFindById.mockResolvedValue(doc);
      const res = await service.syncStudent('S1');
      expect(res.syncStatus).toBe('synced');
      expect(res.lastSyncAt).toBeDefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws when student not found', async () => {
      mockStudentFindById.mockResolvedValue(null);
      await expect(service.syncStudent('bad')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  bulkSync                                                          */
  /* ================================================================ */
  describe('bulkSync', () => {
    it('returns synced/failed counts', async () => {
      const s1 = { _id: 'S1', syncStatus: 'pending', save: jest.fn().mockResolvedValue(true) };
      const s2 = {
        _id: 'S2',
        syncStatus: 'pending',
        save: jest.fn().mockRejectedValue(new Error('err')),
      };
      mockStudentFind.mockResolvedValue([s1, s2]);

      const res = await service.bulkSync('2025');
      expect(res.synced).toBe(1);
      expect(res.failed).toBe(1);
      expect(res.errors).toHaveLength(1);
    });

    it('returns 0 when no students', async () => {
      mockStudentFind.mockResolvedValue([]);
      const res = await service.bulkSync('2025');
      expect(res.synced).toBe(0);
      expect(res.failed).toBe(0);
    });
  });

  /* ================================================================ */
  /*  getIEPs / createIEP                                               */
  /* ================================================================ */
  describe('IEPs', () => {
    it('getIEPs returns paginated data', async () => {
      mockIEPFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ _id: 'IEP-1' }]),
              }),
            }),
          }),
        }),
      });
      mockIEPCountDocuments.mockResolvedValue(1);

      const res = await service.getIEPs({});
      expect(res.ieps).toHaveLength(1);
    });

    it('createIEP generates auto planNumber', async () => {
      mockIEPCountDocuments.mockResolvedValue(5);
      const data = { academicYear: '2025' };
      mockIEPCreate.mockImplementation(d => Promise.resolve(d));
      const res = await service.createIEP(data, 'USER-1');
      expect(res.planNumber).toMatch(/^IEP-2025-\d{4,}$/);
    });
  });

  /* ================================================================ */
  /*  submitIEPToNoor                                                   */
  /* ================================================================ */
  describe('submitIEPToNoor', () => {
    it('submits active IEP', async () => {
      const doc = {
        _id: 'IEP-1',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };
      mockIEPFindById.mockResolvedValue(doc);
      const res = await service.submitIEPToNoor('IEP-1', 'USER-1');
      expect(res.noorSubmissionStatus).toBe('submitted');
    });

    it('throws when IEP not found', async () => {
      mockIEPFindById.mockResolvedValue(null);
      await expect(service.submitIEPToNoor('bad', 'U')).rejects.toThrow();
    });

    it('throws when IEP not active', async () => {
      mockIEPFindById.mockResolvedValue({ _id: 'IEP-1', status: 'draft' });
      await expect(service.submitIEPToNoor('IEP-1', 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  updateGoalProgress                                                */
  /* ================================================================ */
  describe('updateGoalProgress', () => {
    it('updates goal at given index', async () => {
      const doc = {
        _id: 'IEP-1',
        goals: [
          { goalText: 'Goal A', progressPercent: 0 },
          { goalText: 'Goal B', progressPercent: 0 },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockIEPFindById.mockResolvedValue(doc);
      const res = await service.updateGoalProgress(
        'IEP-1',
        0,
        { progressPercent: 50, status: 'in_progress' },
        'U'
      );
      expect(doc.goals[0].progressPercent).toBe(50);
      expect(doc.goals[0].status).toBe('in_progress');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws when goal index invalid', async () => {
      const doc = { _id: 'IEP-1', goals: [{ goalText: 'A' }] };
      mockIEPFindById.mockResolvedValue(doc);
      await expect(service.updateGoalProgress('IEP-1', 5, {}, 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  createProgressReport                                              */
  /* ================================================================ */
  describe('createProgressReport', () => {
    it('calculates attendance rate from attendance object', async () => {
      const data = { attendance: { presentDays: 18, totalDays: 20 } };
      mockReportCreate.mockResolvedValue(data);
      await service.createProgressReport(data, 'USER-1');
      expect(data.attendance.attendanceRate).toBe(90);
    });

    it('skips attendance rate when totalDays is 0', async () => {
      const data = { attendance: { presentDays: 0, totalDays: 0 } };
      mockReportCreate.mockResolvedValue(data);
      await service.createProgressReport(data, 'USER-1');
      expect(data.attendance.attendanceRate).toBeUndefined();
    });

    it('skips attendance rate when no attendance object', async () => {
      const data = {};
      mockReportCreate.mockResolvedValue(data);
      await service.createProgressReport(data, 'USER-1');
      expect(data.attendance).toBeUndefined();
    });
  });

  /* ================================================================ */
  /*  submitReportToNoor                                                */
  /* ================================================================ */
  describe('submitReportToNoor', () => {
    it('marks report as submitted', async () => {
      const doc = {
        _id: 'R1',
        noorSubmitted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockReportFindById.mockResolvedValue(doc);
      const res = await service.submitReportToNoor('R1');
      expect(res.noorSubmitted).toBe(true);
      expect(res.noorSubmissionDate).toBeDefined();
    });

    it('throws when report not found', async () => {
      mockReportFindById.mockResolvedValue(null);
      await expect(service.submitReportToNoor('bad')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  getDashboard                                                      */
  /* ================================================================ */
  describe('getDashboard', () => {
    it('returns dashboard with counts', async () => {
      mockStudentCountDocuments.mockResolvedValue(50);
      mockIEPCountDocuments.mockResolvedValue(30);
      mockReportCountDocuments.mockResolvedValue(20);

      const res = await service.getDashboard('2025');
      expect(res.academicYear).toBe('2025');
      expect(res.students.total).toBe(50);
      expect(res.ieps.total).toBe(30);
      expect(res.reports.total).toBe(20);
    });
  });
});
