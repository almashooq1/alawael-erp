/**
 * reporting-engine-rate-limit.test.js — Phase 10 Commit 18.
 *
 * The ReportingEngine consults an optional `rateLimiter.check()` right
 * before calling `channel.send()`. Over-limit recipients get their
 * delivery row marked CANCELLED with reason='rate_limited' and a
 * `report.delivery.cancelled` event fires so ops can alert. No
 * provider traffic is emitted.
 *
 * Tests cover:
 *   - engine without a rateLimiter behaves exactly as before
 *   - engine with a limiter that allows → channel.send() runs, delivery SENT
 *   - engine with a limiter that denies → no channel.send(), delivery CANCELLED,
 *     event emitted with recipient + limit data
 *   - a crashing rateLimiter fails open (delivery still attempts send)
 *   - non-object / no-check limiter is ignored (back-compat)
 */

'use strict';

const { ReportingEngine } = require('../services/reporting/reportingEngine');

function makeFakeCatalog(entries) {
  const REPORTS = entries.map(r => Object.freeze({ ...r }));
  return {
    REPORTS,
    byId: id => REPORTS.find(r => r.id === id) || null,
    resolveApprovers: () => [],
  };
}

function makeFakeDeliveryModel() {
  const rows = [];
  return {
    model: {
      async findOneAndUpdate(filter, update) {
        const existing = rows.find(
          r =>
            r.instanceKey === filter.instanceKey &&
            String(r.recipientId) === String(filter.recipientId) &&
            r.channel === filter.channel
        );
        if (existing) return existing;
        const row = {
          _id: `d_${rows.length + 1}`,
          ...((update && update.$setOnInsert) || {}),
          status: 'QUEUED',
          attempts: 0,
          metadata: {},
          markSent(msgId) {
            this.status = 'SENT';
            this.sentAt = new Date();
            this.providerMessageId = msgId;
            this.attempts += 1;
          },
          markFailed(reason) {
            this.status = 'FAILED';
            this.lastError = reason;
            this.attempts += 1;
          },
          markCancelled(reason) {
            this.status = 'CANCELLED';
            this.cancelledAt = new Date();
            this.metadata = { ...(this.metadata || {}), cancellationReason: reason };
          },
          isTerminal() {
            return ['READ', 'ESCALATED', 'CANCELLED'].includes(this.status);
          },
          async save() {
            return this;
          },
        };
        rows.push(row);
        return row;
      },
      __rows: rows,
    },
  };
}

function makeFakeApprovalModel() {
  return {
    model: {
      async findOne() {
        return null;
      },
      async create() {
        return null;
      },
    },
  };
}

function makeRecipientResolver(recipients) {
  return {
    resolve: async () => recipients,
  };
}

function makeChannel() {
  const send = jest.fn(async () => ({ success: true, providerMessageId: 'pm_1' }));
  return { channel: { send }, send };
}

const catalog = makeFakeCatalog([
  {
    id: 'r.test',
    nameEn: 'Test',
    category: 'operational',
    periodicity: 'daily',
    audiences: ['guardian'],
    channels: ['email'],
    confidentiality: 'internal',
    locales: ['en'],
    formats: ['html'],
    builder: 'fake.build',
    approvalRequired: false,
    enabled: true,
  },
]);

function makeEngine({ rateLimiter, eventBus } = {}) {
  const delivery = makeFakeDeliveryModel();
  const { channel, send } = makeChannel();
  const engine = new ReportingEngine({
    catalog,
    DeliveryModel: delivery,
    ApprovalModel: makeFakeApprovalModel(),
    recipientResolver: makeRecipientResolver([
      { id: 'r1', role: 'guardian', email: 'r1@example.com' },
    ]),
    builders: { fake: { build: async () => ({ sections: [] }) } },
    channels: { email: channel },
    renderer: { render: () => ({ subject: 's', bodyHtml: 'h', bodyText: 't', attachments: [] }) },
    eventBus,
    rateLimiter,
  });
  return { engine, send, deliveryRows: delivery.model.__rows };
}

describe('ReportingEngine — rate limiter enforcement (C18)', () => {
  test('no rateLimiter → back-compat; channel.send runs', async () => {
    const { engine, send, deliveryRows } = makeEngine();
    await engine.runInstance({ reportId: 'r.test', periodKey: '2026-04-22' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(deliveryRows[0].status).toBe('SENT');
  });

  test('limiter allows → send runs; row SENT', async () => {
    const rateLimiter = {
      check: jest.fn(async () => ({ allowed: true, current: 3, limit: 20 })),
    };
    const { engine, send, deliveryRows } = makeEngine({ rateLimiter });
    await engine.runInstance({ reportId: 'r.test', periodKey: '2026-04-22' });
    expect(rateLimiter.check).toHaveBeenCalledWith({ recipientId: 'r1', role: 'guardian' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(deliveryRows[0].status).toBe('SENT');
  });

  test('limiter denies → send NOT called; row CANCELLED; event emitted', async () => {
    const rateLimiter = {
      check: jest.fn(async () => ({ allowed: false, current: 21, limit: 20 })),
    };
    const events = [];
    const eventBus = { emit: (name, payload) => events.push({ name, payload }) };
    const { engine, send, deliveryRows } = makeEngine({ rateLimiter, eventBus });
    await engine.runInstance({ reportId: 'r.test', periodKey: '2026-04-22' });
    expect(send).not.toHaveBeenCalled();
    expect(deliveryRows[0].status).toBe('CANCELLED');
    expect(deliveryRows[0].metadata.cancellationReason).toMatch(/rate_limited/);
    const cancelled = events.find(e => e.name === 'report.delivery.cancelled');
    expect(cancelled).toBeDefined();
    expect(cancelled.payload).toMatchObject({
      recipientId: 'r1',
      role: 'guardian',
      reason: 'rate_limited',
      current: 21,
      limit: 20,
    });
  });

  test('crashing limiter fails open → send still called', async () => {
    const rateLimiter = {
      check: jest.fn(async () => {
        throw new Error('redis down');
      }),
    };
    const { engine, send, deliveryRows } = makeEngine({ rateLimiter });
    await engine.runInstance({ reportId: 'r.test', periodKey: '2026-04-22' });
    expect(rateLimiter.check).toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(deliveryRows[0].status).toBe('SENT');
  });

  test('limiter without a check() function is ignored', async () => {
    const { engine, send } = makeEngine({ rateLimiter: { notAFunction: true } });
    await engine.runInstance({ reportId: 'r.test', periodKey: '2026-04-22' });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
