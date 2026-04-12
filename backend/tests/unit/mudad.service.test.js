/**
 * Unit tests for mudad.service.js — Mudad WPS Service
 * Singleton instance. 4 models from mudad.models.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__mdQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

global.__mkMdModel = function (tag) {
  const M = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = `${tag}-1`;
    this.save = jest.fn().mockResolvedValue(this);
    this.toObject = jest.fn().mockReturnValue({ _id: `${tag}-1`, ...data });
  });
  M.find = jest.fn(() => global.__mdQ([]));
  M.findById = jest.fn(() => global.__mdQ(null));
  M.findOne = jest.fn(() => global.__mdQ(null));
  M.findOneAndUpdate = jest.fn(() => global.__mdQ(null));
  M.findByIdAndUpdate = jest.fn(() => global.__mdQ(null));
  M.findByIdAndDelete = jest.fn(() => global.__mdQ(null));
  M.countDocuments = jest.fn().mockResolvedValue(0);
  M.aggregate = jest.fn().mockResolvedValue([]);
  M.create = jest.fn().mockImplementation(async d => ({
    _id: `${tag}-new`,
    ...d,
    save: jest.fn(),
    auditLog: d.auditLog || [],
  }));
  M.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
  return M;
};

jest.mock('../../models/mudad.models', () => ({
  MudadSalaryRecord: global.__mkMdModel('msr'),
  MudadBatch: global.__mkMdModel('mb'),
  MudadConfig: global.__mkMdModel('mc'),
  MudadComplianceReport: global.__mkMdModel('mcr'),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/mudad.service');
const {
  MudadSalaryRecord,
  MudadBatch,
  MudadConfig,
  MudadComplianceReport,
} = require('../../models/mudad.models');
const Q = global.__mdQ;

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  [MudadSalaryRecord, MudadBatch, MudadConfig, MudadComplianceReport].forEach(M => {
    M.find.mockImplementation(() => Q([]));
    M.findById.mockImplementation(() => Q(null));
    M.findOne.mockImplementation(() => Q(null));
    M.findOneAndUpdate.mockImplementation(() => Q(null));
    M.findByIdAndUpdate.mockImplementation(() => Q(null));
    M.findByIdAndDelete.mockImplementation(() => Q(null));
    M.countDocuments.mockResolvedValue(0);
    M.aggregate.mockResolvedValue([]);
    M.updateMany.mockResolvedValue({ modifiedCount: 0 });
  });
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('MudadService', () => {
  /* ── Config ──────────────────────────────────────────────────────── */
  describe('getConfig', () => {
    test('returns config when found', async () => {
      MudadConfig.findOne.mockImplementation(() => Q({ organizationId: 'org1', isActive: true }));
      const res = await svc.getConfig('org1');
      expect(res.exists).toBe(true);
      expect(res.config).toBeDefined();
    });

    test('returns not-found message when missing', async () => {
      const res = await svc.getConfig('org1');
      expect(res.exists).toBe(false);
      expect(res.message).toBeDefined();
    });

    test('throws on DB error', async () => {
      MudadConfig.findOne.mockImplementation(() => {
        throw new Error('DB');
      });
      await expect(svc.getConfig('org1')).rejects.toThrow('DB');
    });
  });

  describe('saveConfig', () => {
    test('upserts config', async () => {
      MudadConfig.findOneAndUpdate.mockImplementation(() => Q({ organizationId: 'org1' }));
      const res = await svc.saveConfig('org1', { key: 'val' }, 'user1');
      expect(MudadConfig.findOneAndUpdate).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    test('throws on error', async () => {
      MudadConfig.findOneAndUpdate.mockImplementation(() => {
        throw new Error('fail');
      });
      await expect(svc.saveConfig('org1', {}, 'u')).rejects.toThrow('fail');
    });
  });

  /* ── getSalaryRecords ────────────────────────────────────────────── */
  describe('getSalaryRecords', () => {
    test('returns records with summary', async () => {
      const records = [
        { netSalary: 5000, paymentStatus: 'paid', mudadStatus: 'accepted' },
        { netSalary: 3000, paymentStatus: 'pending', mudadStatus: 'draft' },
      ];
      MudadSalaryRecord.find.mockImplementation(() => Q(records));
      const res = await svc.getSalaryRecords('2024-01', 'est1');
      expect(res.records).toHaveLength(2);
      expect(res.summary.total).toBe(2);
      expect(res.summary.totalAmount).toBe(8000);
    });

    test('applies filters', async () => {
      MudadSalaryRecord.find.mockImplementation(() => Q([]));
      await svc.getSalaryRecords('2024-01', 'est1', {
        status: 'paid',
        mudadStatus: 'accepted',
        branch: 'b1',
      });
      expect(MudadSalaryRecord.find).toHaveBeenCalled();
    });

    test('throws on error', async () => {
      MudadSalaryRecord.find.mockImplementation(() => {
        throw new Error('DB');
      });
      await expect(svc.getSalaryRecords('m', 'e')).rejects.toThrow('DB');
    });
  });

  /* ── createBatch ─────────────────────────────────────────────────── */
  describe('createBatch', () => {
    test('creates batch with records', async () => {
      const records = [
        { _id: 'r1', netSalary: 5000 },
        { _id: 'r2', netSalary: 3000 },
      ];
      MudadSalaryRecord.find.mockImplementation(() => Q(records));
      MudadBatch.create.mockResolvedValue({
        _id: 'b1',
        batchNumber: 'MDD-est1-2024-01-XXX',
        totalEmployees: 2,
      });
      const res = await svc.createBatch('2024-01', 'est1', 'user1');
      expect(res.success).toBe(true);
      expect(res.batch).toBeDefined();
      expect(MudadSalaryRecord.updateMany).toHaveBeenCalled();
    });

    test('returns failure when no records', async () => {
      const res = await svc.createBatch('2024-01', 'est1', 'user1');
      expect(res.success).toBe(false);
    });

    test('throws on DB error', async () => {
      MudadSalaryRecord.find.mockImplementation(() => {
        throw new Error('fail');
      });
      await expect(svc.createBatch('m', 'e', 'u')).rejects.toThrow('fail');
    });
  });

  /* ── generateWPSFile ─────────────────────────────────────────────── */
  describe('generateWPSFile', () => {
    test('generates file content', async () => {
      const batch = {
        _id: 'b1',
        batchNumber: 'MDD-1',
        establishmentId: 'est1',
        salaryMonth: '2024-01',
        status: 'draft',
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      const records = [
        {
          employeeNationalId: '1234567890123',
          iban: 'SA1234567890123456789012',
          basicSalary: 5000,
          housingAllowance: 1000,
          otherAllowances: 500,
          deductions: 200,
          netSalary: 6300,
        },
      ];
      MudadBatch.findById.mockImplementation(() => Q(batch));
      MudadSalaryRecord.find.mockImplementation(() => Q(records));

      const res = await svc.generateWPSFile('b1');
      expect(res.success).toBe(true);
      expect(res.fileContent).toContain('HDR');
      expect(res.fileContent).toContain('REC');
      expect(batch.save).toHaveBeenCalled();
    });

    test('throws for non-existent batch', async () => {
      await expect(svc.generateWPSFile('nope')).rejects.toThrow('الدفعة غير موجودة');
    });
  });

  /* ── validateBatch ───────────────────────────────────────────────── */
  describe('validateBatch', () => {
    test('validates — all valid', async () => {
      const batch = {
        batchNumber: 'B1',
        validationErrors: [],
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      const records = [
        {
          iban: 'SA1234567890123456789012',
          employeeNationalId: '123',
          netSalary: 5000,
          bankCode: '80',
        },
      ];
      MudadBatch.findById.mockImplementation(() => Q(batch));
      MudadSalaryRecord.find.mockImplementation(() => Q(records));

      const res = await svc.validateBatch('b1');
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    test('validates — invalid IBAN', async () => {
      const batch = {
        batchNumber: 'B1',
        validationErrors: [],
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      const records = [
        { iban: 'INVALID', employeeNationalId: '123', netSalary: 5000, bankCode: '80' },
      ];
      MudadBatch.findById.mockImplementation(() => Q(batch));
      MudadSalaryRecord.find.mockImplementation(() => Q(records));

      const res = await svc.validateBatch('b1');
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.field === 'iban')).toBe(true);
    });

    test('validates — missing nationalId', async () => {
      const batch = {
        batchNumber: 'B1',
        validationErrors: [],
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      const records = [
        {
          iban: 'SA1234567890123456789012',
          employeeNationalId: '',
          netSalary: 5000,
          bankCode: '80',
        },
      ];
      MudadBatch.findById.mockImplementation(() => Q(batch));
      MudadSalaryRecord.find.mockImplementation(() => Q(records));

      const res = await svc.validateBatch('b1');
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.field === 'nationalId')).toBe(true);
    });

    test('validates — zero salary warning', async () => {
      const batch = {
        batchNumber: 'B1',
        validationErrors: [],
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      const records = [
        {
          iban: 'SA1234567890123456789012',
          employeeNationalId: '123',
          netSalary: 0,
          bankCode: '80',
        },
      ];
      MudadBatch.findById.mockImplementation(() => Q(batch));
      MudadSalaryRecord.find.mockImplementation(() => Q(records));

      const res = await svc.validateBatch('b1');
      expect(res.warnings.some(w => w.field === 'netSalary')).toBe(true);
    });

    test('throws for non-existent batch', async () => {
      await expect(svc.validateBatch('nope')).rejects.toThrow('الدفعة غير موجودة');
    });
  });

  /* ── uploadBatch ─────────────────────────────────────────────────── */
  describe('uploadBatch', () => {
    test('uploads validated batch', async () => {
      const batch = {
        _id: 'b1',
        batchNumber: 'B1',
        status: 'validated',
        auditLog: [],
        save: jest.fn().mockResolvedValue(true),
      };
      MudadBatch.findById.mockImplementation(() => Q(batch));
      const res = await svc.uploadBatch('b1', 'user1');
      expect(res.success).toBe(true);
      expect(batch.save).toHaveBeenCalled();
      expect(MudadSalaryRecord.updateMany).toHaveBeenCalled();
    });

    test('throws for non-existent batch', async () => {
      await expect(svc.uploadBatch('nope', 'u')).rejects.toThrow('الدفعة غير موجودة');
    });

    test('throws for invalid status', async () => {
      const batch = { status: 'draft', auditLog: [] };
      MudadBatch.findById.mockImplementation(() => Q(batch));
      await expect(svc.uploadBatch('b1', 'u')).rejects.toThrow();
    });
  });

  /* ── getBatches ──────────────────────────────────────────────────── */
  describe('getBatches', () => {
    test('returns batches list', async () => {
      MudadBatch.find.mockImplementation(() => Q([{ _id: 'b1' }, { _id: 'b2' }]));
      const res = await svc.getBatches('est1');
      expect(res).toHaveLength(2);
    });

    test('applies filters', async () => {
      MudadBatch.find.mockImplementation(() => Q([]));
      await svc.getBatches('est1', { status: 'uploaded', salaryMonth: '2024-01' });
      expect(MudadBatch.find).toHaveBeenCalled();
    });
  });

  /* ── generateComplianceReport ────────────────────────────────────── */
  describe('generateComplianceReport', () => {
    test('generates report with records', async () => {
      const records = [
        {
          paymentStatus: 'paid',
          paymentDate: new Date(),
          mudadStatus: 'accepted',
          netSalary: 5000,
        },
        { paymentStatus: 'pending', mudadStatus: 'draft', netSalary: 3000 },
      ];
      MudadSalaryRecord.find.mockImplementation(() => Q(records));
      MudadComplianceReport.findOneAndUpdate.mockImplementation(() =>
        Q({ _id: 'r1', complianceRate: 50 })
      );

      const res = await svc.generateComplianceReport('2024-01', 'est1', 'user1');
      expect(res.success).toBe(true);
      expect(res.report).toBeDefined();
    });

    test('returns failure when no records', async () => {
      const res = await svc.generateComplianceReport('2024-01', 'est1', 'user1');
      expect(res.success).toBe(false);
    });
  });

  /* ── getComplianceReports ────────────────────────────────────────── */
  describe('getComplianceReports', () => {
    test('returns reports', async () => {
      MudadComplianceReport.find.mockImplementation(() => Q([{ _id: 'r1' }]));
      const res = await svc.getComplianceReports('est1');
      expect(res).toHaveLength(1);
    });

    test('filters by year', async () => {
      MudadComplianceReport.find.mockImplementation(() => Q([]));
      await svc.getComplianceReports('est1', { year: '2024' });
      expect(MudadComplianceReport.find).toHaveBeenCalled();
    });
  });

  /* ── getDashboardStats ───────────────────────────────────────────── */
  describe('getDashboardStats', () => {
    test('returns dashboard stats', async () => {
      const records = [
        { netSalary: 5000, paymentStatus: 'paid' },
        { netSalary: 3000, paymentStatus: 'pending' },
      ];
      MudadSalaryRecord.find
        .mockImplementationOnce(() => Q(records)) // current month
        .mockImplementationOnce(() => Q([])); // last month
      MudadBatch.findOne.mockImplementation(() =>
        Q({ batchNumber: 'B1', status: 'uploaded', createdAt: new Date() })
      );
      MudadComplianceReport.findOne.mockImplementation(() =>
        Q({ complianceRate: 95, overallRisk: 'low', reportMonth: '2024-01' })
      );

      const res = await svc.getDashboardStats('est1');
      expect(res.currentMonth.totalEmployees).toBe(2);
      expect(res.currentMonth.totalAmount).toBe(8000);
      expect(res.latestBatch).toBeDefined();
      expect(res.compliance.rate).toBe(95);
    });
  });

  /* ── Pure helpers ────────────────────────────────────────────────── */
  describe('Pure helpers', () => {
    test('_buildSIFHeader — correct format', () => {
      const batch = { establishmentId: 'EST001', salaryMonth: '2024-01' };
      const records = [{ netSalary: 5000 }, { netSalary: 3000 }];
      const header = svc._buildSIFHeader(batch, records);
      expect(header).toContain('HDR');
      expect(header).toContain('EST001');
    });

    test('_buildSIFRecord — correct format', () => {
      const record = {
        employeeNationalId: '1234567890',
        iban: 'SA1234567890123456789012',
        basicSalary: 5000,
        housingAllowance: 1000,
        otherAllowances: 500,
        deductions: 200,
        netSalary: 6300,
      };
      const line = svc._buildSIFRecord(record);
      expect(line).toContain('REC');
      expect(line).toContain('1234567890');
    });

    test('_calculateDeadline — returns 3rd of next month', () => {
      const deadline = svc._calculateDeadline('2024-06');
      expect(deadline.getMonth()).toBe(6); // July (0-indexed)
      expect(deadline.getDate()).toBe(3);
    });

    test('_calculateDeadline — December wraps to January', () => {
      const deadline = svc._calculateDeadline('2024-12');
      expect(deadline.getFullYear()).toBe(2025);
      expect(deadline.getMonth()).toBe(0); // January
      expect(deadline.getDate()).toBe(3);
    });
  });
});
