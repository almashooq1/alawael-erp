'use strict';

/**
 * event-parser-mfa-service-layer-wave275u.test.js — Wave 275u.
 *
 * Service-layer MFA on event-parser via W275q system-actor. Also
 * documents the pre-existing scheduler bug fixed in this commit:
 * scheduler called `eventParser.drainPending()` but the service
 * exports `processBatch`. Renamed call site to match.
 */

const {
  createHikvisionEventParserService,
} = require('../intelligence/hikvision-event-parser.service');
const { makeSystemActor } = require('../intelligence/system-actor.lib');
const reg = require('../intelligence/hikvision.registry');

// Helper: return a chainable thenable resolving to []. Mongoose query
// builders satisfy this protocol — chain methods return same query,
// awaiting resolves to the result. Pure JS approximation below.
function _emptyQuery() {
  const arr = [];
  const q = Promise.resolve(arr);
  q.sort = () => q;
  q.limit = () => q;
  q.lean = () => q;
  return q;
}

const _stubModel = Object.freeze({
  find() {
    return _emptyQuery();
  },
  findById() {
    return Promise.resolve(null);
  },
});
const _stubGate = { evaluate: () => ({ decision: 'accept' }) };
const _stubAttendanceSource = { createSourceEvent: () => Promise.resolve({ ok: true }) };

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionEventParserService({
    rawEventModel: _stubModel,
    processedEventModel: _stubModel,
    deviceModel: _stubModel,
    gateService: _stubGate,
    attendanceSourceService: _stubAttendanceSource,
    enforceMfa,
    now,
  });
}

// ─── 1. processRawEvent — tier 2 ──────────────────────────────────

describe('Wave 275u — processRawEvent MFA enforcement', () => {
  test('rejects when no actor', async () => {
    const svc = _makeService();
    const r = await svc.processRawEvent('raw-1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor', async () => {
    const now = () => new Date('2026-05-22T15:00:00Z');
    const svc = _makeService({ now });
    const r = await svc.processRawEvent('raw-1', { actor: makeSystemActor({ now }) });
    // Past MFA → reaches findById → null → returns RAW_EVENT_NOT_FOUND.
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.RAW_EVENT_NOT_FOUND);
  });
});

// ─── 2. processBatch — tier 2 (cron-callable) ─────────────────────

describe('Wave 275u — processBatch MFA enforcement', () => {
  test('rejects when no actor (cron without W275q lib fails)', async () => {
    const svc = _makeService();
    const r = await svc.processBatch({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor (proves cron path works after W275u)', async () => {
    const svc = _makeService();
    const r = await svc.processBatch({ actor: makeSystemActor() });
    // Past MFA → empty stub → batch returns ok with 0 processed.
    expect(r.ok || r.reason !== reg.REASON.MFA_TIER_REQUIRED).toBe(true);
  });
});

// ─── 3. reprocessFailed — tier 2 ──────────────────────────────────

describe('Wave 275u — reprocessFailed MFA enforcement', () => {
  test('rejects when no actor', async () => {
    const svc = _makeService();
    const r = await svc.reprocessFailed({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes with system actor', async () => {
    const svc = _makeService();
    const r = await svc.reprocessFailed({ actor: makeSystemActor() });
    expect(r.ok || r.reason !== reg.REASON.MFA_TIER_REQUIRED).toBe(true);
  });
});

// ─── 4. Factory enforceMfa flag ───────────────────────────────────

describe('Wave 275u — factory enforceMfa flag', () => {
  test('default OFF (backwards-compatible with Wave 98 tests)', async () => {
    const svc = createHikvisionEventParserService({
      rawEventModel: _stubModel,
      processedEventModel: _stubModel,
      deviceModel: _stubModel,
      gateService: _stubGate,
      attendanceSourceService: _stubAttendanceSource,
    });
    const r = await svc.processBatch({});
    // Default OFF → bypassed → returns ok or non-MFA error.
    expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
  });
});
