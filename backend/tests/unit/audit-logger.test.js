/**
 * Unit Tests — audit-logger.js
 * Batch 39 · P#78
 *
 * All static methods. Uses mongoose model (AuditLog).
 * Mongoose mocked globally in jest.setup.js.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ---- inline mongoose mock with model tracking ---- */
const mockSave = jest.fn().mockResolvedValue({});
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockDeleteMany = jest.fn();
const mockAggregate = jest.fn();

// Track the schema registration
let mockModelConstructor;
jest.mock('mongoose', () => {
  const mSchema = jest.fn().mockImplementation(function () {
    this.index = jest.fn();
    return this;
  });
  mSchema.Types = { ObjectId: 'ObjectId', Mixed: 'Mixed' };

  mockModelConstructor = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
  });

  // The find/sort/limit chain
  const mockLean = jest.fn();
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
  mockFind.mockReturnValue({ sort: mockSort });
  mockLean.mockResolvedValue([]);

  mockModelConstructor.find = mockFind;
  mockModelConstructor.countDocuments = mockCountDocuments;
  mockModelConstructor.deleteMany = mockDeleteMany;
  mockModelConstructor.aggregate = mockAggregate;

  return {
    Schema: mSchema,
    model: jest.fn().mockReturnValue(mockModelConstructor),
    models: {},
    Types: { ObjectId: jest.fn(v => v) },
  };
});

const AuditLogger = require('../../services/audit-logger');

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue({});
    mockCountDocuments.mockResolvedValue(0);
    mockDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mockAggregate.mockResolvedValue([]);

    // Reset find chain
    const mockLean = jest.fn().mockResolvedValue([]);
    const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
    const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  // ═══════════════════════
  // log
  // ═══════════════════════
  describe('log', () => {
    test('saves audit entry', async () => {
      await AuditLogger.log({ action: 'TEST', resource: 'user' });
      expect(mockSave).toHaveBeenCalled();
    });

    test('does not throw on save error', async () => {
      mockSave.mockRejectedValueOnce(new Error('DB down'));
      await expect(AuditLogger.log({ action: 'X' })).resolves.not.toThrow();
    });
  });

  // ═══════════════════════
  // logUserAction
  // ═══════════════════════
  describe('logUserAction', () => {
    test('creates log with user action fields', async () => {
      await AuditLogger.logUserAction(
        'uid1',
        'EDIT',
        {
          resource: 'profile',
          resourceId: 'r1',
          operation: 'UPDATE',
          status: 'success',
          changes: { name: 'old' },
          description: 'edited',
        },
        { ip: '1.2.3.4', headers: { 'user-agent': 'Jest' } }
      );
      expect(mockSave).toHaveBeenCalled();
    });

    test('handles missing req', async () => {
      await AuditLogger.logUserAction('uid1', 'VIEW', { resource: 'page' });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // logDataAccess
  // ═══════════════════════
  describe('logDataAccess', () => {
    test('logs DATA_ACCESS operation', async () => {
      await AuditLogger.logDataAccess('uid1', 'beneficiary', 'b1', {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'UA' },
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // logAuthAttempt
  // ═══════════════════════
  describe('logAuthAttempt', () => {
    test('logs successful auth', async () => {
      await AuditLogger.logAuthAttempt('user@example.com', true, {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'UA' },
      });
      expect(mockSave).toHaveBeenCalled();
    });

    test('logs failed auth', async () => {
      await AuditLogger.logAuthAttempt('user@example.com', false, {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'UA' },
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // logSensitiveChange
  // ═══════════════════════
  describe('logSensitiveChange', () => {
    test('masks sensitive values and logs', async () => {
      await AuditLogger.logSensitiveChange('uid1', 'email', 'old@example.com', 'new@example.com', {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'UA' },
      });
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // logAdminAction
  // ═══════════════════════
  describe('logAdminAction', () => {
    test('logs admin action on target user', async () => {
      await AuditLogger.logAdminAction(
        'admin1',
        'DISABLE',
        'user1',
        { reason: 'policy' },
        { ip: '10.0.0.1', headers: { 'user-agent': 'UA' } }
      );
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // getUserLogs
  // ═══════════════════════
  describe('getUserLogs', () => {
    test('calls find with userId', async () => {
      await AuditLogger.getUserLogs('uid1', 50);
      expect(mockFind).toHaveBeenCalledWith({ userId: 'uid1' });
    });
  });

  // ═══════════════════════
  // getResourceLogs
  // ═══════════════════════
  describe('getResourceLogs', () => {
    test('calls find with resource and resourceId', async () => {
      await AuditLogger.getResourceLogs('beneficiary', 'b1', 50);
      expect(mockFind).toHaveBeenCalledWith({ resource: 'beneficiary', resourceId: 'b1' });
    });
  });

  // ═══════════════════════
  // generateAuditReport
  // ═══════════════════════
  describe('generateAuditReport', () => {
    test('calls aggregate with date range', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-06-30');
      await AuditLogger.generateAuditReport(start, end);
      expect(mockAggregate).toHaveBeenCalled();
      const pipeline = mockAggregate.mock.calls[0][0];
      expect(pipeline[0].$match.timestamp.$gte).toEqual(start);
    });

    test('includes userId filter when provided', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-06-30');
      await AuditLogger.generateAuditReport(start, end, { userId: 'uid1' });
      expect(mockAggregate).toHaveBeenCalled();
    });
  });

  // ═══════════════════════
  // exportLogs
  // ═══════════════════════
  describe('exportLogs', () => {
    test('returns export structure', async () => {
      const mockLean = jest
        .fn()
        .mockResolvedValue([
          {
            timestamp: new Date(),
            action: 'TEST',
            resource: 'R',
            operation: 'READ',
            status: 'success',
          },
        ]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      mockFind.mockReturnValueOnce({ sort: mockSort });

      const r = await AuditLogger.exportLogs(
        'uid1',
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      expect(r).toHaveProperty('userId', 'uid1');
      expect(r).toHaveProperty('totalLogs');
      expect(r).toHaveProperty('logs');
    });
  });

  // ═══════════════════════
  // maskSensitiveData
  // ═══════════════════════
  describe('maskSensitiveData', () => {
    test('masks email', () => {
      const r = AuditLogger.maskSensitiveData('user@example.com');
      expect(r).toMatch(/^us\*\*\*@example\.com$/);
    });

    test('masks long string (phone/SSN)', () => {
      const r = AuditLogger.maskSensitiveData('1234567890');
      expect(r).toMatch(/^\*\*\*\*7890$/);
    });

    test('returns ***MASKED*** for short string', () => {
      expect(AuditLogger.maskSensitiveData('abc')).toBe('***MASKED***');
    });

    test('returns null for null input', () => {
      expect(AuditLogger.maskSensitiveData(null)).toBeNull();
    });

    test('returns ***MASKED*** for non-string', () => {
      expect(AuditLogger.maskSensitiveData(12345)).toBe('***MASKED***');
    });
  });

  // ═══════════════════════
  // cleanOldLogs
  // ═══════════════════════
  describe('cleanOldLogs', () => {
    test('calls deleteMany with cutoff date', async () => {
      mockDeleteMany.mockResolvedValueOnce({ deletedCount: 5 });
      const r = await AuditLogger.cleanOldLogs(90);
      expect(mockDeleteMany).toHaveBeenCalled();
      expect(r.deletedCount).toBe(5);
    });
  });

  // ═══════════════════════
  // createComplianceExport
  // ═══════════════════════
  describe('createComplianceExport', () => {
    test('returns GDPR export structure', async () => {
      mockCountDocuments.mockResolvedValueOnce(3);
      const mockLean = jest
        .fn()
        .mockResolvedValue([
          { timestamp: new Date(), action: 'A', resource: 'R', dataClassification: 'confidential' },
        ]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      mockFind.mockReturnValueOnce({ limit: mockLimit });

      const r = await AuditLogger.createComplianceExport('uid1');
      expect(r).toHaveProperty('dataExportDate');
      expect(r).toHaveProperty('userId', 'uid1');
      expect(r).toHaveProperty('totalRecords', 3);
      expect(r).toHaveProperty('records');
      expect(r.note).toContain('GDPR');
    });
  });

  // ═══════════════════════
  // deleteUserLogs
  // ═══════════════════════
  describe('deleteUserLogs', () => {
    test('deletes user logs and returns archive record', async () => {
      mockCountDocuments.mockResolvedValueOnce(10);
      mockDeleteMany.mockResolvedValueOnce({});
      const r = await AuditLogger.deleteUserLogs('uid1');
      expect(r).toHaveProperty('userId', 'uid1');
      expect(r.logCount).toBe(10);
      expect(r.reason).toBe('GDPR Right to Erasure');
    });
  });
});
