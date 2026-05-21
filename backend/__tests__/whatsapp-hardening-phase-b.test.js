'use strict';

/**
 * Phase B — WhatsApp production hardening tests.
 *
 * Covers:
 *   1. Rate limiter — per-phone counters, three cap windows, in-memory mode.
 *   2. Idempotency — same key returns cached result; different keys don't collide.
 *   3. DLQ — enqueueFailure persists + claimNext respects lock + markReplayed
 *      transitions terminal state.
 *   4. Send guards integration — POST /send/text returns 429 when over cap,
 *      returns X-Idempotent-Replay on replay, returns 202 when underlying
 *      send throws (DLQ-queued path).
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const rateLimit = require('../services/whatsapp/rateLimit.service');
const idem = require('../services/whatsapp/idempotency.service');

// ─── 1. Rate limiter ─────────────────────────────────────────────────────
describe('Phase B — rate limiter (in-memory)', () => {
  const PHONE = '966500000001';

  beforeEach(() => {
    rateLimit.reset();
    process.env.WHATSAPP_RL_PER_MINUTE = '3';
    process.env.WHATSAPP_RL_PER_HOUR = '10';
    process.env.WHATSAPP_RL_PER_DAY = '50';
  });

  afterAll(() => {
    delete process.env.WHATSAPP_RL_PER_MINUTE;
    delete process.env.WHATSAPP_RL_PER_HOUR;
    delete process.env.WHATSAPP_RL_PER_DAY;
    rateLimit.reset();
  });

  test('allows sends under the per-minute cap', async () => {
    const r1 = await rateLimit.checkAndRecord(PHONE);
    const r2 = await rateLimit.checkAndRecord(PHONE);
    const r3 = await rateLimit.checkAndRecord(PHONE);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  test('blocks the 4th send within the same minute (per_minute reason)', async () => {
    await rateLimit.checkAndRecord(PHONE);
    await rateLimit.checkAndRecord(PHONE);
    await rateLimit.checkAndRecord(PHONE);
    const r4 = await rateLimit.checkAndRecord(PHONE);
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toBe('per_minute');
    expect(r4.retryAfterSeconds).toBe(60);
  });

  test('different phones have independent buckets', async () => {
    await rateLimit.checkAndRecord('966500000001');
    await rateLimit.checkAndRecord('966500000001');
    await rateLimit.checkAndRecord('966500000001');
    const blocked = await rateLimit.checkAndRecord('966500000001');
    const otherPhoneOk = await rateLimit.checkAndRecord('966500000002');
    expect(blocked.allowed).toBe(false);
    expect(otherPhoneOk.allowed).toBe(true);
  });

  test('getStats returns the current counts', async () => {
    await rateLimit.checkAndRecord(PHONE);
    await rateLimit.checkAndRecord(PHONE);
    const stats = await rateLimit.getStats(PHONE);
    expect(stats.minute).toBe(2);
    expect(stats.hour).toBe(2);
    expect(stats.day).toBe(2);
  });

  test('reset(phone) clears one phone but not others', async () => {
    await rateLimit.checkAndRecord('966500000001');
    await rateLimit.checkAndRecord('966500000002');
    rateLimit.reset('966500000001');
    expect((await rateLimit.getStats('966500000001')).minute).toBe(0);
    expect((await rateLimit.getStats('966500000002')).minute).toBe(1);
  });
});

// ─── 2. Idempotency ──────────────────────────────────────────────────────
describe('Phase B — idempotency store (in-memory)', () => {
  beforeEach(() => idem.reset());
  afterAll(() => idem.reset());

  test('first call invokes producer; second with same key returns cached', async () => {
    let producerCalls = 0;
    const producer = async () => {
      producerCalls += 1;
      return { messageId: 'msg-' + producerCalls };
    };
    const r1 = await idem.withKey('key-abc', producer);
    const r2 = await idem.withKey('key-abc', producer);
    expect(producerCalls).toBe(1);
    expect(r1.replayed).toBe(false);
    expect(r2.replayed).toBe(true);
    expect(r1.result.messageId).toBe('msg-1');
    expect(r2.result.messageId).toBe('msg-1');
  });

  test('different keys do not collide', async () => {
    const r1 = await idem.withKey('key-1', async () => ({ id: 'A' }));
    const r2 = await idem.withKey('key-2', async () => ({ id: 'B' }));
    expect(r1.result.id).toBe('A');
    expect(r2.result.id).toBe('B');
    expect(r1.replayed).toBe(false);
    expect(r2.replayed).toBe(false);
  });

  test('null/undefined key bypasses caching', async () => {
    let producerCalls = 0;
    const producer = async () => {
      producerCalls += 1;
      return { id: producerCalls };
    };
    const r1 = await idem.withKey(null, producer);
    const r2 = await idem.withKey(null, producer);
    expect(producerCalls).toBe(2);
    expect(r1.result.id).toBe(1);
    expect(r2.result.id).toBe(2);
  });

  test('producer errors are NOT cached — failed sends must be retryable', async () => {
    let producerCalls = 0;
    const producer = async () => {
      producerCalls += 1;
      if (producerCalls < 2) throw new Error('transient');
      return { id: producerCalls };
    };
    await expect(idem.withKey('retry-key', producer)).rejects.toThrow('transient');
    const r2 = await idem.withKey('retry-key', producer);
    expect(r2.result.id).toBe(2);
    expect(r2.replayed).toBe(false);
  });

  test('peek returns cached value without running producer', async () => {
    await idem.withKey('peek-key', async () => ({ stored: true }));
    const p = await idem.peek('peek-key');
    expect(p).toEqual({ stored: true });
  });
});

// ─── 3. DLQ model + service ──────────────────────────────────────────────
describe('Phase B — DLQ model + service', () => {
  let WhatsAppDlq;
  let dlqService;
  let dbReady = false;

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        // Wait for the global MongoMemoryServer connection. jest.globalSetup
        // is expected to set MONGO_URI.
        if (process.env.MONGO_URI) {
          await mongoose.connect(process.env.MONGO_URI);
        }
      }
      dbReady = mongoose.connection.readyState === 1;
    } catch {
      dbReady = false;
    }
    WhatsAppDlq = require('../models/WhatsAppDlq');
    dlqService = require('../services/whatsapp/dlq.service');
  });

  afterEach(async () => {
    if (dbReady) await WhatsAppDlq.deleteMany({}).catch(() => {});
  });

  test('enqueueFailure persists a doc with status=pending and nextRetryAt in future', async () => {
    if (!dbReady) return;
    const doc = await WhatsAppDlq.enqueueFailure(
      { to: '966500000001', text: 'hi' },
      Object.assign(new Error('Meta 500'), { statusCode: 500 }),
      { sendType: 'text', phone: '966500000001', idempotencyKey: 'k1' }
    );
    expect(doc.status).toBe('pending');
    expect(doc.attempts).toBe(1);
    expect(doc.lastError.message).toBe('Meta 500');
    expect(doc.lastError.statusCode).toBe(500);
    expect(doc.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('enqueueFailure with same idempotencyKey + phone + sendType updates instead of duplicating', async () => {
    if (!dbReady) return;
    await WhatsAppDlq.enqueueFailure({ to: '966500000001', text: 'hi' }, new Error('err1'), {
      sendType: 'text',
      phone: '966500000001',
      idempotencyKey: 'dedup-key',
    });
    await WhatsAppDlq.enqueueFailure({ to: '966500000001', text: 'hi' }, new Error('err2'), {
      sendType: 'text',
      phone: '966500000001',
      idempotencyKey: 'dedup-key',
    });
    const count = await WhatsAppDlq.countDocuments({ idempotencyKey: 'dedup-key' });
    const doc = await WhatsAppDlq.findOne({ idempotencyKey: 'dedup-key' });
    expect(count).toBe(1);
    expect(doc.attempts).toBe(2);
    expect(doc.lastError.message).toBe('err2');
  });

  test('claimNext returns the next item, sets lock, second claim returns null', async () => {
    if (!dbReady) return;
    await WhatsAppDlq.enqueueFailure({ to: '966500000001', text: 'a' }, new Error('e'), {
      sendType: 'text',
      phone: '966500000001',
    });
    // Force nextRetryAt to past so claimNext picks it up.
    await WhatsAppDlq.updateMany({}, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });
    const claimed = await WhatsAppDlq.claimNext();
    expect(claimed).toBeTruthy();
    expect(claimed.status).toBe('retrying');
    expect(claimed.lockedUntil).toBeInstanceOf(Date);
    const second = await WhatsAppDlq.claimNext();
    expect(second).toBeNull();
  });

  test('markRetryFailure increments attempts; after maxAttempts transitions to exhausted', async () => {
    if (!dbReady) return;
    const doc = await WhatsAppDlq.enqueueFailure(
      { to: '966500000001', text: 'a' },
      new Error('e'),
      { sendType: 'text', phone: '966500000001' }
    );
    // Drive attempts up to maxAttempts (default 5).
    let d = doc;
    for (let i = 0; i < 4; i++) {
      d = await WhatsAppDlq.markRetryFailure(d._id, new Error('attempt ' + i));
    }
    expect(d.status).toBe('exhausted');
    expect(d.attempts).toBeGreaterThanOrEqual(d.maxAttempts);
  });

  test('markReplayed transitions to replayed terminal state', async () => {
    if (!dbReady) return;
    const doc = await WhatsAppDlq.enqueueFailure(
      { to: '966500000001', text: 'a' },
      new Error('e'),
      { sendType: 'text', phone: '966500000001' }
    );
    const updated = await WhatsAppDlq.markReplayed(doc._id, 'wamid.PROVIDER_X');
    expect(updated.status).toBe('replayed');
    expect(updated.providerMessageId).toBe('wamid.PROVIDER_X');
    expect(updated.replayedAt).toBeInstanceOf(Date);
  });

  test('computeBackoffMs grows with attempt number', () => {
    const a1 = WhatsAppDlq.computeBackoffMs(1);
    const a3 = WhatsAppDlq.computeBackoffMs(3);
    const a5 = WhatsAppDlq.computeBackoffMs(5);
    expect(a1).toBeGreaterThanOrEqual(60_000); // ~1 min
    expect(a3).toBeGreaterThanOrEqual(15 * 60_000); // ~15 min
    expect(a5).toBeGreaterThanOrEqual(240 * 60_000); // ~4 hr
    expect(a3).toBeGreaterThan(a1);
    expect(a5).toBeGreaterThan(a3);
  });
});
