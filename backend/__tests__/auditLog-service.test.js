/**
 * Smoke tests for services/auditLog.service.js — the minimal forwarder
 * shipped 2026-05-19 to activate the optional app.js audit hook
 * (previously try/catch-degraded to null).
 */

'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const logger = require('../utils/logger');
const { auditLogService } = require('../services/auditLog.service');

beforeEach(() => {
  logger.info.mockClear();
});

describe('auditLogService.log', () => {
  it('exposes a .log function (this is the shape app.js checks)', () => {
    expect(typeof auditLogService.log).toBe('function');
  });

  it('emits one structured audit line per call', async () => {
    await auditLogService.log({
      action: 'beneficiary.lifecycle.transition.requested',
      actorUserId: 'user-1',
      actorRole: 'clinical_supervisor',
      entityType: 'beneficiary',
      entityId: 'bn-9',
      resource: 'beneficiary#bn-9',
      ipAddress: '10.0.0.1',
      metadata: { reason: 'discharge' },
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [msg, line] = logger.info.mock.calls[0];
    expect(msg).toBe('audit: beneficiary.lifecycle.transition.requested');
    expect(line).toMatchObject({
      action: 'beneficiary.lifecycle.transition.requested',
      actorUserId: 'user-1',
      actorRole: 'clinical_supervisor',
      entityType: 'beneficiary',
      entityId: 'bn-9',
      resource: 'beneficiary#bn-9',
      ipAddress: '10.0.0.1',
      metadata: { reason: 'discharge' },
    });
  });

  it('returns a resolved promise even with null/undefined input', async () => {
    await expect(auditLogService.log()).resolves.toBeUndefined();
    await expect(auditLogService.log(null)).resolves.toBeUndefined();
  });

  it('defaults missing fields to null without throwing', async () => {
    await auditLogService.log({ action: 'data.read' });
    const [, line] = logger.info.mock.calls[0];
    expect(line).toEqual({
      action: 'data.read',
      actorUserId: null,
      actorRole: null,
      entityType: null,
      entityId: null,
      resource: null,
      ipAddress: null,
      metadata: null,
    });
  });

  it('coerces ObjectId-ish actorUserId/entityId to strings', async () => {
    await auditLogService.log({
      action: 'data.updated',
      actorUserId: { toString: () => 'oid-abc' },
      entityId: 12345,
    });
    const [, line] = logger.info.mock.calls[0];
    expect(line.actorUserId).toBe('oid-abc');
    expect(line.entityId).toBe('12345');
  });

  it('defaults unknown action when caller passes a non-object', async () => {
    await auditLogService.log('plain-string');
    expect(logger.info.mock.calls[0][0]).toBe('audit: plain-string');
  });
});
