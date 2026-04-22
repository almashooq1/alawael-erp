/**
 * report-delivery-model.test.js — Phase 10 Commit 1.
 *
 * Exercises the ReportDelivery state-machine methods without touching
 * Mongo. Uses the jest.unmock('mongoose') pattern (see
 * plan-review-model.test.js) because the global mock strips mongoose's
 * document constructor & method prototypes.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
if (mongoose.models && mongoose.models.ReportDelivery) {
  delete mongoose.models.ReportDelivery;
  if (mongoose.modelSchemas) delete mongoose.modelSchemas.ReportDelivery;
}

const RD = require('../models/ReportDelivery');

function newDelivery(overrides = {}) {
  const Model = RD.model;
  return new Model({
    reportId: 'ben.progress.weekly',
    instanceKey: 'ben.progress.weekly:2026-W17:beneficiary:abc',
    periodKey: '2026-W17',
    recipientId: new mongoose.Types.ObjectId(),
    recipientModel: 'Guardian',
    recipientRole: 'guardian',
    channel: 'email',
    locale: 'ar',
    status: 'QUEUED',
    confidentiality: 'restricted',
    ...overrides,
  });
}

describe('ReportDelivery — constants', () => {
  test('exports the right closed sets', () => {
    expect(RD.STATUSES).toContain('QUEUED');
    expect(RD.STATUSES).toContain('READ');
    expect(RD.CHANNELS).toContain('email');
    expect(RD.CHANNELS).toContain('portal_inbox');
    expect(RD.CONFIDENTIALITY).toContain('confidential');
  });
});

describe('ReportDelivery — state transitions', () => {
  test('markSent advances status, bumps attempts, clears prior error', () => {
    const d = newDelivery({ status: 'FAILED', providerError: 'boom' });
    d.attempts = 1;
    d.markSent('prov-msg-1');
    expect(d.status).toBe('SENT');
    expect(d.sentAt).toBeInstanceOf(Date);
    expect(d.attempts).toBe(2);
    expect(d.providerMessageId).toBe('prov-msg-1');
    expect(d.providerError).toBeNull();
  });

  test('markDelivered implies sentAt', () => {
    const d = newDelivery();
    d.markDelivered();
    expect(d.status).toBe('DELIVERED');
    expect(d.deliveredAt).toBeInstanceOf(Date);
    expect(d.sentAt).toBeInstanceOf(Date);
  });

  test('markRead implies deliveredAt and sentAt (ledger integrity)', () => {
    const d = newDelivery();
    d.markRead();
    expect(d.status).toBe('READ');
    expect(d.readAt).toBeInstanceOf(Date);
    expect(d.deliveredAt).toBeInstanceOf(Date);
    expect(d.sentAt).toBeInstanceOf(Date);
  });

  test('markFailed bumps attempts and truncates long errors', () => {
    const d = newDelivery();
    const longErr = 'x'.repeat(2000);
    d.markFailed(longErr);
    expect(d.status).toBe('FAILED');
    expect(d.failedAt).toBeInstanceOf(Date);
    expect(d.attempts).toBe(1);
    expect(d.providerError.length).toBeLessThanOrEqual(1000);
  });

  test('markRetrying requires FAILED source state', () => {
    const d = newDelivery({ status: 'SENT' });
    expect(() => d.markRetrying()).toThrow(/cannot retry/);
    d.markFailed('boom');
    d.markRetrying();
    expect(d.status).toBe('RETRYING');
  });

  test('markEscalated records escalation target in metadata', () => {
    const d = newDelivery();
    d.markEscalated('supervisor');
    expect(d.status).toBe('ESCALATED');
    expect(d.escalatedAt).toBeInstanceOf(Date);
    expect(d.metadata.escalatedTo).toBe('supervisor');
  });

  test('markCancelled records a reason', () => {
    const d = newDelivery();
    d.markCancelled('approval rejected');
    expect(d.status).toBe('CANCELLED');
    expect(d.cancelledAt).toBeInstanceOf(Date);
    expect(d.metadata.cancellationReason).toBe('approval rejected');
  });

  test('isTerminal is true for READ / ESCALATED / CANCELLED', () => {
    expect(newDelivery({ status: 'READ' }).isTerminal()).toBe(true);
    expect(newDelivery({ status: 'ESCALATED' }).isTerminal()).toBe(true);
    expect(newDelivery({ status: 'CANCELLED' }).isTerminal()).toBe(true);
    expect(newDelivery({ status: 'SENT' }).isTerminal()).toBe(false);
    expect(newDelivery({ status: 'QUEUED' }).isTerminal()).toBe(false);
  });
});

describe('ReportDelivery — recordAccess', () => {
  test('view access flips readAt on first hit only', () => {
    const d = newDelivery();
    d.markSent();
    d.recordAccess({ action: 'view', actor: new mongoose.Types.ObjectId() });
    expect(d.status).toBe('READ');
    expect(d.readAt).toBeInstanceOf(Date);
    const firstReadAt = d.readAt;
    d.recordAccess({ action: 'view', actor: new mongoose.Types.ObjectId() });
    expect(d.readAt).toEqual(firstReadAt); // unchanged
    expect(d.accessLog.length).toBe(2);
  });

  test('download access appends to log without changing status', () => {
    const d = newDelivery({ status: 'DELIVERED' });
    d.recordAccess({ action: 'download', actor: new mongoose.Types.ObjectId() });
    expect(d.accessLog.length).toBe(1);
    expect(d.accessLog[0].action).toBe('download');
    expect(d.status).toBe('DELIVERED');
  });

  test('recordAccess without action is a no-op', () => {
    const d = newDelivery();
    d.recordAccess({});
    d.recordAccess(null);
    expect(d.accessLog.length).toBe(0);
  });
});
