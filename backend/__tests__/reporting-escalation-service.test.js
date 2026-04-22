/**
 * reporting-escalation-service.test.js — Phase 10 Commit 6.
 */

'use strict';

const {
  isRetryExhausted,
  isSlaBreach,
  findEscalationCandidates,
  notifyEscalatees,
  escalateOne,
  runEscalationSweep,
} = require('../services/reporting/escalationService');

function makeDelivery(overrides = {}) {
  const base = {
    _id: 'd1',
    reportId: 'ben.progress.weekly',
    channel: 'email',
    status: 'FAILED',
    attempts: 4,
    failedAt: new Date(),
    sentAt: null,
    readAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  return {
    ...base,
    markEscalated: jest.fn(function (escalatedTo) {
      this.status = 'ESCALATED';
      this.escalatedAt = new Date();
      this.metadata = { ...(this.metadata || {}), escalatedTo };
    }),
    save: jest.fn(async function () {
      return this;
    }),
  };
}

function makeCatalog(entries) {
  return {
    byId: id => entries.find(e => e.id === id) || null,
  };
}

function makeModel(rows) {
  return {
    model: {
      find(filter) {
        let out = rows.slice();
        if (filter.status && typeof filter.status === 'string') {
          out = out.filter(r => r.status === filter.status);
        }
        if (filter.status && filter.status.$in) {
          out = out.filter(r => filter.status.$in.includes(r.status));
        }
        if (filter.attempts && filter.attempts.$gte != null) {
          out = out.filter(r => (r.attempts || 0) >= filter.attempts.$gte);
        }
        if (filter.readAt === null) out = out.filter(r => !r.readAt);
        const chain = {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          then(res, rej) {
            return Promise.resolve(out).then(res, rej);
          },
        };
        return chain;
      },
    },
  };
}

// ─── Predicates ───────────────────────────────────────────────

describe('isRetryExhausted', () => {
  test('true only when FAILED + attempts >= max', () => {
    expect(isRetryExhausted(makeDelivery({ attempts: 4 }))).toBe(true);
    expect(isRetryExhausted(makeDelivery({ attempts: 3 }))).toBe(false);
    expect(isRetryExhausted(makeDelivery({ status: 'SENT', attempts: 4 }))).toBe(false);
  });
});

describe('isSlaBreach', () => {
  test('true when sent without read past slaHours', () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const sentAt = new Date(now.getTime() - 30 * 3600 * 1000); // 30h ago
    const d = makeDelivery({ status: 'SENT', sentAt });
    expect(isSlaBreach(d, 24, { now })).toBe(true);
    expect(isSlaBreach(d, 72, { now })).toBe(false); // still within
  });

  test('false once a read receipt landed', () => {
    const d = makeDelivery({ status: 'SENT', sentAt: new Date(0), readAt: new Date() });
    expect(isSlaBreach(d, 1)).toBe(false);
  });

  test('false when slaHours missing', () => {
    const d = makeDelivery({ status: 'SENT', sentAt: new Date(0) });
    expect(isSlaBreach(d)).toBe(false);
  });
});

// ─── findEscalationCandidates ─────────────────────────────────

describe('findEscalationCandidates', () => {
  test('returns retry_exhausted FAILED + sla_breach SENT rows', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const catalog = makeCatalog([
      { id: 'ben.progress.weekly', slaHours: 24 },
      { id: 'exec.kpi.digest.daily', slaHours: 3 },
    ]);
    const rows = [
      makeDelivery({
        _id: 'failed',
        status: 'FAILED',
        attempts: 4,
        reportId: 'ben.progress.weekly',
      }),
      makeDelivery({
        _id: 'sent-late',
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(now.getTime() - 26 * 3600 * 1000),
        reportId: 'ben.progress.weekly',
      }),
      makeDelivery({
        _id: 'sent-fresh',
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(now.getTime() - 60_000),
        reportId: 'ben.progress.weekly',
      }),
    ];
    const out = await findEscalationCandidates(makeModel(rows), catalog, { now });
    const ids = out.map(c => c.delivery._id).sort();
    expect(ids).toEqual(['failed', 'sent-late']);
    const reasons = Object.fromEntries(out.map(c => [c.delivery._id, c.reason]));
    expect(reasons).toEqual({ failed: 'retry_exhausted', 'sent-late': 'sla_breach' });
  });
});

// ─── notifyEscalatees ─────────────────────────────────────────

describe('notifyEscalatees', () => {
  test('resolves escalateTo role, sends via in_app channel', async () => {
    const report = { id: 'r.x', escalateTo: 'supervisor', owner: 'supervisor' };
    const recipientResolver = {
      resolve: jest.fn(async role => (role === 'supervisor' ? [{ id: 's1' }, { id: 's2' }] : [])),
    };
    const inApp = {
      send: jest.fn(async (_p, users) => ({
        success: true,
        results: users.map(u => ({ recipientId: u.id, success: true })),
      })),
    };
    const out = await notifyEscalatees(makeDelivery(), report, {
      recipientResolver,
      channels: { in_app: inApp },
    });
    expect(out.notified).toBe(2);
    expect(inApp.send).toHaveBeenCalled();
  });

  test('returns 0 when in_app channel is missing', async () => {
    const out = await notifyEscalatees(
      makeDelivery(),
      { id: 'r.x', escalateTo: 'x' },
      {
        recipientResolver: { resolve: async () => [{ id: 'a' }] },
        channels: {},
      }
    );
    expect(out.notified).toBe(0);
    expect(out.errors.length).toBeGreaterThan(0);
  });
});

// ─── escalateOne ──────────────────────────────────────────────

describe('escalateOne', () => {
  test('sets ESCALATED, notifies role, emits event', async () => {
    const d = makeDelivery();
    const catalog = makeCatalog([{ id: 'ben.progress.weekly', escalateTo: 'supervisor' }]);
    const events = [];
    const res = await escalateOne(
      { delivery: d, reason: 'retry_exhausted' },
      {
        catalog,
        recipientResolver: { resolve: async () => [{ id: 's1' }] },
        channels: {
          in_app: { send: async () => ({ success: true, results: [{ success: true }] }) },
        },
        eventBus: { emit: (n, p) => events.push({ n, p }) },
      }
    );
    expect(res.status).toBe('escalated');
    expect(d.markEscalated).toHaveBeenCalledWith('supervisor');
    expect(d.save).toHaveBeenCalled();
    expect(events.find(e => e.n === 'report.delivery.escalated')).toBeTruthy();
  });
});

// ─── runEscalationSweep ───────────────────────────────────────

describe('runEscalationSweep', () => {
  test('escalates all candidates and returns a summary', async () => {
    const now = new Date('2026-04-22T12:00:00Z');
    const catalog = makeCatalog([
      { id: 'r1', escalateTo: 'supervisor', slaHours: 12 },
      { id: 'r2', escalateTo: 'quality_manager', slaHours: 6 },
    ]);
    const rows = [
      makeDelivery({ _id: 'a', status: 'FAILED', attempts: 4, reportId: 'r1' }),
      makeDelivery({
        _id: 'b',
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(now.getTime() - 24 * 3600 * 1000),
        reportId: 'r2',
      }),
    ];
    const summary = await runEscalationSweep({
      DeliveryModel: makeModel(rows),
      catalog,
      recipientResolver: { resolve: async () => [{ id: 'u1' }] },
      channels: {
        in_app: { send: async () => ({ success: true, results: [{ success: true }] }) },
      },
      now,
    });
    expect(summary.scanned).toBe(2);
    expect(summary.escalated).toBe(2);
  });

  test('throws when deps missing', async () => {
    await expect(runEscalationSweep({})).rejects.toThrow(/DeliveryModel \+ catalog required/);
  });
});
