/**
 * Unit Tests — AuditService
 * P#73 - Batch 34
 *
 * Static class + instance export. Depends on AuditLog (Mongoose) + logger.
 * Covers: log, getLogs
 */

'use strict';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();

jest.mock('../../models/AuditLog', () => {
  const MockAuditLog = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
    return this;
  });
  MockAuditLog.find = (...a) => mockFind(...a);
  MockAuditLog.countDocuments = (...a) => mockCountDocuments(...a);
  return MockAuditLog;
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const AuditService = require('../../services/audit.service');

describe('AuditService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  log                                                               */
  /* ================================================================ */
  describe('log', () => {
    const makeCtx = (overrides = {}) => ({
      user: {
        id: 'USER-1',
        fullName: 'Ahmad Ali',
        email: 'a@b.com',
        role: 'admin',
      },
      ip: '10.0.0.1',
      headers: { 'user-agent': 'Jest/1.0', 'x-forwarded-for': '' },
      method: 'POST',
      originalUrl: '/api/patients',
      connection: { remoteAddress: '10.0.0.1' },
      ...overrides,
    });

    it('creates AuditLog entry and calls save', async () => {
      mockSave.mockResolvedValue(true);
      await AuditService.log(makeCtx(), 'CREATE', 'PATIENTS', { id: 'P1', type: 'Patient' });
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('sets actor from ctx.user', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      await AuditService.log(makeCtx(), 'LOGIN', 'AUTH');

      const constructorCall = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(constructorCall.actor.id).toBe('USER-1');
      expect(constructorCall.actor.name).toBe('Ahmad Ali');
      expect(constructorCall.actor.email).toBe('a@b.com');
      expect(constructorCall.actor.role).toBe('admin');
    });

    it('uses GUEST actor when no user', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      await AuditService.log(
        {
          ip: '1.2.3.4',
          headers: {},
          method: 'GET',
          originalUrl: '/',
          connection: { remoteAddress: '1.2.3.4' },
        },
        'VIEW',
        'PUBLIC'
      );

      const constructorCall = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(constructorCall.actor.role).toBe('GUEST');
    });

    it('sets meta from request', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      await AuditService.log(makeCtx(), 'UPDATE', 'PATIENTS');

      const constructorCall = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(constructorCall.meta.userAgent).toBe('Jest/1.0');
      expect(constructorCall.meta.method).toBe('POST');
      expect(constructorCall.meta.url).toBe('/api/patients');
    });

    it('sets action, module, resource, changes, status, description', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      await AuditService.log(
        makeCtx(),
        'DELETE',
        'FILES',
        { id: 'F1', type: 'File' },
        { before: { name: 'old' }, after: null },
        'SUCCESS',
        'Deleted file F1'
      );

      const data = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(data.action).toBe('DELETE');
      expect(data.module).toBe('FILES');
      expect(data.resource.id).toBe('F1');
      expect(data.changes.before.name).toBe('old');
      expect(data.status).toBe('SUCCESS');
      expect(data.description).toBe('Deleted file F1');
    });

    it('defaults status to SUCCESS', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      await AuditService.log(makeCtx(), 'VIEW', 'REPORTS');

      const data = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(data.status).toBe('SUCCESS');
    });

    it('silently catches save errors', async () => {
      mockSave.mockRejectedValue(new Error('DB down'));
      await expect(AuditService.log(makeCtx(), 'LOGIN', 'AUTH')).resolves.toBeUndefined();
      const logger = require('../../utils/logger');
      expect(logger.error).toHaveBeenCalledWith('Audit Logging Failed:', 'DB down');
    });

    it('uses ip from x-forwarded-for', async () => {
      mockSave.mockResolvedValue(true);
      const AuditLog = require('../../models/AuditLog');
      const ctx = makeCtx();
      ctx.ip = undefined;
      ctx.headers['x-forwarded-for'] = '192.168.1.1';
      await AuditService.log(ctx, 'LOGIN', 'AUTH');

      const data = AuditLog.mock.calls[AuditLog.mock.calls.length - 1][0];
      expect(data.actor.ip).toBe('192.168.1.1');
    });
  });

  /* ================================================================ */
  /*  getLogs                                                           */
  /* ================================================================ */
  describe('getLogs', () => {
    it('returns paginated logs', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ _id: 'L1' }]),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(1);

      const res = await AuditService.getLogs();
      expect(res.logs).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.pages).toBe(1);
    });

    it('applies module filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await AuditService.getLogs({ module: 'AUTH' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ module: 'AUTH' }));
    });

    it('applies action filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await AuditService.getLogs({ action: 'LOGIN' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN' }));
    });

    it('applies userId filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await AuditService.getLogs({ userId: 'U1' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ 'actor.id': 'U1' }));
    });

    it('applies date range filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await AuditService.getLogs({ startDate: '2025-01-01', endDate: '2025-12-31' });
      const query = mockFind.mock.calls[0][0];
      expect(query.timestamp).toBeDefined();
      expect(query.timestamp.$gte).toBeInstanceOf(Date);
      expect(query.timestamp.$lte).toBeInstanceOf(Date);
    });

    it('paginates correctly (page 2, limit 10)', async () => {
      const mockSort = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });
      mockFind.mockReturnValue({ sort: mockSort });
      mockCountDocuments.mockResolvedValue(25);

      const res = await AuditService.getLogs({}, 2, 10);
      expect(res.page).toBe(2);
      expect(res.pages).toBe(3);
      // skip = (2-1)*10 = 10
      const skipCall = mockSort.mock.results[0].value.skip;
      expect(skipCall).toHaveBeenCalledWith(10);
    });

    it('defaults to page 1, limit 20', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({ skip: mockSkip }),
      });
      mockCountDocuments.mockResolvedValue(0);

      await AuditService.getLogs();
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
    });
  });
});
