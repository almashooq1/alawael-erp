'use strict';

/**
 * notification-router.test.js — Phase 15 Commit 1 (4.0.64).
 *
 * Tests the notification router end-to-end: policy resolution,
 * recipient fan-out, outcomeFilter, dedup via NotificationLog,
 * channel dispatch, template rendering. Uses in-memory fake log
 * model + in-memory fake channel so we can assert dispatches
 * without external I/O.
 */

process.env.NODE_ENV = 'test';

const {
  createNotificationRouter,
} = require('../services/quality/notifications/notificationRouter.service');
const { createQualityEventBus } = require('../services/quality/qualityEventBus.service');
const {
  resolvePolicies,
  matches,
  priorityRank,
} = require('../config/notification-policies.registry');
const { render, TEMPLATES } = require('../services/quality/notifications/templates');

// ─── fake log model ─────────────────────────────────────────────

function makeFakeLogModel() {
  const docs = [];
  return {
    docs,
    create: async data => {
      docs.push({ ...data, createdAt: new Date(), _id: `log-${docs.length + 1}` });
      return docs[docs.length - 1];
    },
    findOne: filter => {
      const match = docs.find(d => _match(filter, d));
      return { lean: async () => match || null };
    },
    clear: () => docs.splice(0, docs.length),
  };
}

function _match(filter, doc) {
  for (const [k, cond] of Object.entries(filter || {})) {
    const path = k.split('.');
    const val = path.reduce((acc, p) => (acc == null ? undefined : acc[p]), doc);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      if (cond.$in && !cond.$in.includes(val)) return false;
      if (cond.$gte != null && !(val >= cond.$gte)) return false;
    } else if (cond === null) {
      if (val !== null && val !== undefined) return false;
    } else if (cond !== val) {
      return false;
    }
  }
  return true;
}

// ─── registry tests ─────────────────────────────────────────────

describe('notification-policies.registry', () => {
  it('matches patterns like the bus', () => {
    expect(matches('*', 'anything')).toBe(true);
    expect(matches('quality.review.*', 'quality.review.closed')).toBe(true);
    expect(matches('quality.review.*', 'compliance.evidence.ingested')).toBe(false);
  });

  it('priorityRank gives critical > high > normal > low', () => {
    expect(priorityRank('critical')).toBeGreaterThan(priorityRank('high'));
    expect(priorityRank('high')).toBeGreaterThan(priorityRank('normal'));
    expect(priorityRank('normal')).toBeGreaterThan(priorityRank('low'));
  });

  it('resolvePolicies returns matching policies sorted by priority', () => {
    const list = resolvePolicies('quality.capa.overdue');
    // capa.overdue (critical) + audit.all (low)
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].priority).toBe('critical');
  });

  it('wildcard catch-all (audit.all) matches any event', () => {
    const list = resolvePolicies('some.unrelated.event');
    expect(list.some(p => p.id === 'audit.all')).toBe(true);
  });
});

// ─── template tests ─────────────────────────────────────────────

describe('notification templates', () => {
  it('every referenced template is registered', () => {
    const { NOTIFICATION_POLICIES } = require('../config/notification-policies.registry');
    for (const p of NOTIFICATION_POLICIES) {
      expect(TEMPLATES[p.template]).toBeDefined();
    }
  });

  it('renders known templates with payload', () => {
    const out = render('evidence.expired', { code: 'EV-001', validUntil: new Date() });
    expect(out.subject).toMatch(/EV-001/);
    expect(out.body.length).toBeGreaterThan(10);
  });

  it('falls back to generic for unknown template', () => {
    const out = render('does.not.exist', { foo: 'bar' }, 'some.event');
    expect(out.subject).toContain('some.event');
  });

  it('generic template includes payload dump', () => {
    const out = render('generic', { id: 42 }, 'some.event');
    expect(out.body).toContain('42');
  });
});

// ─── router tests ───────────────────────────────────────────────

describe('NotificationRouter', () => {
  function build(opts = {}) {
    const { channels, resolveRoleRecipients } = opts;
    const bus = createQualityEventBus();
    const logModel = makeFakeLogModel();
    const quietLogger = { warn: () => {}, info: () => {}, log: () => {} };
    const router = createNotificationRouter({
      bus,
      logModel,
      channels,
      resolveRoleRecipients,
      logger: quietLogger,
    });
    return { bus, logModel, router };
  }

  it('dispatches to console channel for any event via audit.all', async () => {
    const calls = [];
    const { router, logModel } = build({
      channels: {
        console: {
          async send(msg) {
            calls.push(msg.subject);
            return { success: true };
          },
        },
      },
    });
    await router.handleEvent('unrelated.event.x', { id: 1 });
    expect(calls.length).toBeGreaterThan(0);
    expect(logModel.docs.some(d => d.status === 'sent')).toBe(true);
  });

  it('resolves recipients via injected role resolver', async () => {
    const sends = [];
    const { router } = build({
      channels: {
        email: {
          async send(msg) {
            sends.push(msg.to);
            return { success: true };
          },
          // console is stubbed by DEFAULT_CHANNELS
        },
      },
      resolveRoleRecipients: async role => {
        if (role === 'quality_manager') {
          return [{ userId: 'u1', email: 'qm@example.com', label: 'QM' }];
        }
        if (role === 'compliance_officer') {
          return [{ userId: 'u2', email: 'co@example.com', label: 'CO' }];
        }
        return [];
      },
    });
    await router.handleEvent('compliance.evidence.expired', {
      evidenceId: 'e1',
      code: 'EV-001',
      validUntil: new Date(),
    });
    expect(sends.sort()).toEqual(['co@example.com', 'qm@example.com']);
  });

  it('dedupes by (policy, eventKey, recipient, channel) within window', async () => {
    const sends = [];
    const { router, logModel } = build({
      channels: {
        email: {
          async send(msg) {
            sends.push(msg.to);
            return { success: true };
          },
        },
      },
      resolveRoleRecipients: async () => [{ userId: 'u1', email: 'qm@example.com' }],
    });
    const payload = { code: 'EV-001', evidenceId: 'e1', validUntil: new Date() };
    await router.handleEvent('compliance.evidence.expired', payload);
    await router.handleEvent('compliance.evidence.expired', payload);
    // 1 distinct send + 1 deduplicated log row
    expect(sends).toHaveLength(1);
    expect(logModel.docs.some(d => d.status === 'deduplicated')).toBe(true);
  });

  it('outcomeFilter blocks pass outcomes on control.tested', async () => {
    const sends = [];
    const { router } = build({
      channels: {
        email: {
          async send(msg) {
            sends.push(msg.subject);
            return { success: true };
          },
        },
      },
      resolveRoleRecipients: async () => [{ email: 'qm@example.com' }],
    });
    await router.handleEvent('compliance.control.tested', {
      controlId: 'cbahi.hr.01',
      outcome: 'pass',
    });
    expect(sends).toHaveLength(0);

    await router.handleEvent('compliance.control.tested', {
      controlId: 'cbahi.hr.01',
      outcome: 'fail',
    });
    expect(sends.length).toBeGreaterThan(0);
  });

  it('fallbackFromPayload sends to ownerUserId when role lookup empty', async () => {
    const { router } = build({
      channels: {
        email: {
          async send(msg) {
            return { success: true, _to: msg };
          },
        },
      },
      // Intentionally empty — forces fallback.
      resolveRoleRecipients: async () => [],
    });
    const result = await router.handleEvent('quality.capa.overdue', {
      capaId: 'c1',
      actionId: 'CAPA-001',
      daysOverdue: 12,
      ownerUserId: 'owner-42',
    });
    expect(result.dispatched).toBeGreaterThan(0);
  });

  it('records failed send on thrown channel', async () => {
    const { router, logModel } = build({
      channels: {
        email: {
          async send() {
            throw new Error('smtp down');
          },
        },
      },
      resolveRoleRecipients: async () => [{ email: 'qm@example.com' }],
    });
    await router.handleEvent('compliance.evidence.expired', {
      code: 'EV-001',
      evidenceId: 'e1',
      validUntil: new Date(),
    });
    expect(logModel.docs.some(d => d.status === 'failed')).toBe(true);
  });

  it('start() subscribes to bus and dispatches on emit', async () => {
    const sends = [];
    const { bus, router } = build({
      channels: {
        email: {
          async send(msg) {
            sends.push(msg.subject);
            return { success: true };
          },
        },
      },
      resolveRoleRecipients: async () => [{ email: 'qm@example.com' }],
    });
    router.start();
    await bus.emit('compliance.evidence.expired', {
      code: 'EV-002',
      evidenceId: 'e2',
      validUntil: new Date(),
    });
    await bus.flush();
    expect(sends.length).toBeGreaterThan(0);
    router.stop();
  });

  it('missing channel records skipped status', async () => {
    const { router, logModel } = build({
      channels: {}, // no email channel registered
      resolveRoleRecipients: async () => [{ email: 'qm@example.com' }],
    });
    await router.handleEvent('compliance.evidence.expired', {
      code: 'EV-003',
      evidenceId: 'e3',
      validUntil: new Date(),
    });
    expect(logModel.docs.some(d => d.status === 'skipped')).toBe(true);
  });
});
