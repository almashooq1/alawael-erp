/**
 * reporting-webhook-handler.test.js — Phase 10 Commit 4.
 *
 * Covers per-provider normalisation + the state-transition rules in
 * WebhookHandler against a fake DeliveryModel. No HTTP layer here —
 * that's reporting-webhooks-routes.test.js.
 */

'use strict';

const {
  WebhookHandler,
  PROVIDER_MAPS,
  normaliseSendGrid,
  normaliseMailgun,
  normaliseTwilio,
  normaliseWhatsApp,
  normalisePortal,
} = require('../services/reporting/webhookHandler');

// ─── Fakes ────────────────────────────────────────────────────────

function makeFakeDelivery(overrides = {}) {
  const row = {
    _id: 'd1',
    providerMessageId: 'pm-1',
    status: 'SENT',
    channel: 'email',
    confidentiality: 'restricted',
    sentAt: new Date(),
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    accessLog: [],
    metadata: {},
    ...overrides,
    markDelivered(at) {
      this.status = 'DELIVERED';
      this.deliveredAt = at || new Date();
    },
    markRead(at) {
      this.status = 'READ';
      this.readAt = at || new Date();
      if (!this.deliveredAt) this.deliveredAt = this.readAt;
    },
    markFailed(err) {
      this.status = 'FAILED';
      this.failedAt = new Date();
      this.providerError = err;
    },
    recordAccess(entry) {
      this.accessLog.push(entry);
      if (entry.action === 'view' && !this.readAt) this.markRead(entry.at);
    },
    isTerminal() {
      return ['READ', 'ESCALATED', 'CANCELLED'].includes(this.status);
    },
    save: jest.fn(async function () {
      return this;
    }),
  };
  return row;
}

function makeFakeModel(rows) {
  return {
    model: {
      async findById(id) {
        return rows.find(r => r._id === id) || null;
      },
      async findOne(filter) {
        if (filter.providerMessageId) {
          return rows.find(r => r.providerMessageId === filter.providerMessageId) || null;
        }
        return null;
      },
    },
  };
}

function makeBus() {
  const events = [];
  return { events, bus: { emit: (n, p) => events.push({ n, p }) } };
}

// ─── Normalisers ─────────────────────────────────────────────────

describe('normaliseSendGrid', () => {
  test('extracts sg_message_id (first dot-segment) and event', () => {
    const out = normaliseSendGrid({
      sg_message_id: 'abc.def.ghi',
      event: 'delivered',
      email: 'x@y.sa',
      timestamp: 1700000000,
    });
    expect(out).toMatchObject({
      provider: 'sendgrid',
      event: 'delivered',
      providerMessageId: 'abc',
      recipient: 'x@y.sa',
    });
    expect(out.timestamp).toBeInstanceOf(Date);
  });
});

describe('normaliseMailgun', () => {
  test('pulls message-id from the nested headers bag', () => {
    const out = normaliseMailgun({
      'event-data': {
        event: 'Opened',
        message: { headers: { 'message-id': 'mg-42' } },
        recipient: 'x@y.sa',
        timestamp: 1700000000,
      },
    });
    expect(out.event).toBe('opened');
    expect(out.providerMessageId).toBe('mg-42');
    expect(out.recipient).toBe('x@y.sa');
  });
});

describe('normaliseTwilio', () => {
  test('maps MessageStatus + MessageSid', () => {
    const out = normaliseTwilio({
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      To: '+966500000001',
    });
    expect(out.providerMessageId).toBe('SM123');
    expect(out.event).toBe('delivered');
    expect(out.recipient).toBe('+966500000001');
  });
});

describe('normaliseWhatsApp', () => {
  test('walks entry[].changes[].value.statuses[] into a flat list', () => {
    const out = normaliseWhatsApp({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wa-1',
                    status: 'delivered',
                    recipient_id: '9665',
                    timestamp: '1700000000',
                  },
                  { id: 'wa-2', status: 'read', recipient_id: '9665', timestamp: '1700000060' },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ event: 'delivered', providerMessageId: 'wa-1' });
    expect(out[1]).toMatchObject({ event: 'read', providerMessageId: 'wa-2' });
  });

  test('accepts a simple shape (for tests)', () => {
    const out = normaliseWhatsApp({ status: 'read', id: 'wa-x', recipient_id: '9665' });
    expect(out).toHaveLength(1);
    expect(out[0].event).toBe('read');
  });
});

describe('normalisePortal', () => {
  test('passes through action + enrichment fields', () => {
    const out = normalisePortal({
      deliveryId: 'd1',
      action: 'viewed',
      actor: 'u1',
      ip: '1.2.3.4',
      userAgent: 'ua',
    });
    expect(out).toMatchObject({
      provider: 'portal',
      event: 'viewed',
      deliveryId: 'd1',
      actor: 'u1',
      ip: '1.2.3.4',
    });
  });
});

// ─── Handler state transitions ───────────────────────────────────

describe('WebhookHandler.handleEvents', () => {
  test('sendgrid delivered → markDelivered and bus emit', async () => {
    const d = makeFakeDelivery();
    const Model = makeFakeModel([d]);
    const { bus, events } = makeBus();
    const handler = new WebhookHandler({ DeliveryModel: Model, eventBus: bus });
    const summary = await handler.handleEvents('sendgrid', [
      { sg_message_id: 'pm-1', event: 'delivered', email: 'x@y.sa', timestamp: 1700000000 },
    ]);
    expect(summary).toMatchObject({ accepted: 1, applied: 1, skipped: 0 });
    expect(d.status).toBe('DELIVERED');
    expect(d.save).toHaveBeenCalled();
    expect(events.map(e => e.n)).toContain('report.delivery.delivered');
  });

  test('sendgrid open → markRead', async () => {
    const d = makeFakeDelivery({ status: 'DELIVERED', deliveredAt: new Date() });
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    const summary = await handler.handleEvents('sendgrid', [
      { sg_message_id: 'pm-1', event: 'open', email: 'x@y.sa' },
    ]);
    expect(summary.applied).toBe(1);
    expect(d.status).toBe('READ');
  });

  test('sendgrid bounce → markFailed with provider + reason in error', async () => {
    const d = makeFakeDelivery();
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    await handler.handleEvents('sendgrid', [
      { sg_message_id: 'pm-1', event: 'bounce', reason: 'mailbox full' },
    ]);
    expect(d.status).toBe('FAILED');
    expect(d.providerError).toContain('provider:sendgrid');
    expect(d.providerError).toContain('mailbox full');
  });

  test('twilio delivered on SMS row advances state', async () => {
    const d = makeFakeDelivery({ channel: 'sms', providerMessageId: 'SM123' });
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    const summary = await handler.handleEvents('twilio', {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      To: '+966500000001',
    });
    expect(summary.applied).toBe(1);
    expect(d.status).toBe('DELIVERED');
  });

  test('whatsapp read status → markRead', async () => {
    const d = makeFakeDelivery({ channel: 'whatsapp', providerMessageId: 'wa-1' });
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    await handler.handleEvents('whatsapp', {
      entry: [
        {
          changes: [{ value: { statuses: [{ id: 'wa-1', status: 'read', recipient_id: '9' }] } }],
        },
      ],
    });
    expect(d.status).toBe('READ');
  });

  test('portal viewed → markRead AND appends to accessLog', async () => {
    const d = makeFakeDelivery({ _id: 'd42', status: 'DELIVERED' });
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    const summary = await handler.handleEvents('portal', {
      deliveryId: 'd42',
      action: 'viewed',
      actor: 'u1',
      ip: '1.2.3.4',
    });
    expect(summary.applied).toBe(1);
    expect(d.status).toBe('READ');
    expect(d.accessLog.length).toBeGreaterThan(0);
    expect(d.accessLog[0].action).toBe('view');
  });

  test('missing delivery (webhook races dispatcher save) → skip, not error', async () => {
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([]) });
    const summary = await handler.handleEvents('sendgrid', [
      { sg_message_id: 'unknown', event: 'delivered' },
    ]);
    expect(summary.accepted).toBe(1);
    expect(summary.applied).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  test('ignored events (sendgrid processed/deferred) count as skipped', async () => {
    const d = makeFakeDelivery();
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    const summary = await handler.handleEvents('sendgrid', [
      { sg_message_id: 'pm-1', event: 'processed' },
      { sg_message_id: 'pm-1', event: 'deferred' },
    ]);
    expect(summary.applied).toBe(0);
    expect(summary.skipped).toBe(2);
    expect(d.status).toBe('SENT');
  });

  test('terminal READ state cannot be regressed by a later "delivered" event', async () => {
    const d = makeFakeDelivery({ status: 'READ', readAt: new Date() });
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    await handler.handleEvents('sendgrid', [{ sg_message_id: 'pm-1', event: 'delivered' }]);
    expect(d.status).toBe('READ');
  });

  test('unknown provider throws', async () => {
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([]) });
    await expect(handler.handleEvents('martian', [{}])).rejects.toThrow(/unknown provider/);
  });

  test('idempotent: replaying the same event is safe', async () => {
    const d = makeFakeDelivery();
    const handler = new WebhookHandler({ DeliveryModel: makeFakeModel([d]) });
    await handler.handleEvents('sendgrid', [{ sg_message_id: 'pm-1', event: 'delivered' }]);
    await handler.handleEvents('sendgrid', [{ sg_message_id: 'pm-1', event: 'delivered' }]);
    expect(d.status).toBe('DELIVERED');
    expect(d.save).toHaveBeenCalledTimes(2); // save is idempotent, not deduped
  });
});

describe('PROVIDER_MAPS invariants', () => {
  test('every mapped action is one of delivered/read/failed/null', () => {
    const allowed = new Set(['delivered', 'read', 'failed', null]);
    for (const [, map] of Object.entries(PROVIDER_MAPS)) {
      for (const v of Object.values(map)) {
        expect(allowed.has(v)).toBe(true);
      }
    }
  });
});
