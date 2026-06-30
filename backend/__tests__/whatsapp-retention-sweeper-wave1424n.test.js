'use strict';

/**
 * W1424n — WhatsApp conversation retention sweeper (env-gated, OFF by default).
 *
 * PDPL data-minimisation mechanism for guardian PII in WhatsApp conversations.
 * The retention WINDOW is a regulated owner decision, so this ships as a switch:
 * the sweeper deletes conversations older than the configured window only when
 * ENABLE_WHATSAPP_RETENTION_SWEEPER + WHATSAPP_RETENTION_DAYS are set.
 */

const mongoose = require('mongoose');
const { sweepExpired } = require('../services/whatsapp/whatsappRetentionSweeper');

describe('W1424n WhatsApp retention sweeper', () => {
  let deleteMany;
  let countDocuments;
  let spy;
  beforeEach(() => {
    deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });
    countDocuments = jest.fn().mockResolvedValue(5);
    spy = jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'WhatsAppConversation') return { deleteMany, countDocuments };
      return { deleteMany: jest.fn(), countDocuments: jest.fn() };
    });
  });
  afterEach(() => spy.mockRestore());

  const noLog = { info() {}, warn() {}, error() {} };

  test('deletes conversations older than the window (cutoff = now - days)', async () => {
    const now = new Date('2026-06-30T00:00:00Z');
    const r = await sweepExpired({ days: 90, now, logger: noLog });
    expect(r.ok).toBe(true);
    expect(r.deleted).toBe(3);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    const cutoff = deleteMany.mock.calls[0][0].$or[0].lastMessageAt.$lt;
    expect(cutoff.getTime()).toBe(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  });

  test('dry-run counts but never deletes', async () => {
    const r = await sweepExpired({ days: 30, dryRun: true, logger: noLog });
    expect(r.dryRun).toBe(true);
    expect(r.wouldDelete).toBe(5);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test('invalid/missing days is a safe no-op (never deletes)', async () => {
    for (const days of [0, -5, NaN, undefined]) {
      const r = await sweepExpired({ days, logger: noLog });
      expect(r.ok).toBe(false);
      expect(r.deleted).toBe(0);
    }
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
