/**
 * reporting-engine.test.js — Phase 10 Commit 1.
 *
 * Exercises the ReportingEngine end-to-end with in-memory fakes for
 * models, channels, resolvers, and the event bus. No Mongo, no cron,
 * no real channels. The engine's job is orchestration; the fakes let
 * us pin that behavior exactly.
 */

'use strict';

const {
  ReportingEngine,
  computeInstanceKey,
  hashPayload,
} = require('../services/reporting/reportingEngine');

// ─── Fakes ────────────────────────────────────────────────────────

function makeFakeCatalog(entries) {
  const REPORTS = entries.map(r => Object.freeze({ ...r }));
  return {
    REPORTS,
    byId: id => REPORTS.find(r => r.id === id) || null,
    resolveApprovers: r => (r.approvalRequired ? [...(r.approverRoles || ['ceo'])] : []),
  };
}

function makeFakeDeliveryModel() {
  const rows = [];
  // Simulate a minimal Mongoose document with state-machine methods.
  function createRow(doc) {
    const row = {
      _id: `d_${rows.length + 1}`,
      ...doc,
      attempts: 0,
      sentAt: null,
      failedAt: null,
      status: doc.status || 'QUEUED',
      markSent(msgId) {
        this.status = 'SENT';
        this.sentAt = new Date();
        this.attempts += 1;
        this.providerMessageId = msgId;
      },
      markFailed(err) {
        this.status = 'FAILED';
        this.failedAt = new Date();
        this.attempts += 1;
        this.providerError = err;
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
  }
  return {
    model: {
      async findOneAndUpdate(filter, update /* , opts */) {
        const existing = rows.find(
          r =>
            r.instanceKey === filter.instanceKey &&
            String(r.recipientId) === String(filter.recipientId) &&
            r.channel === filter.channel
        );
        if (existing) return existing;
        const inserted = (update && update.$setOnInsert) || {};
        return createRow(inserted);
      },
      __rows: rows,
    },
  };
}

function makeFakeApprovalModel() {
  const rows = [];
  return {
    model: {
      async findOne(filter) {
        return rows.find(r => r.instanceKey === filter.instanceKey) || null;
      },
      async findById(id) {
        return rows.find(r => r._id === id) || null;
      },
      async create(doc) {
        const row = {
          _id: `a_${rows.length + 1}`,
          ...doc,
          state: doc.state || 'PENDING',
          stateHistory: doc.stateHistory || [],
          markDispatched(actor) {
            this.state = 'DISPATCHED';
            this.dispatchedAt = new Date();
            this.stateHistory.push({ state: 'DISPATCHED', actor, at: new Date() });
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

function makeFakeChannel(name, { fail = false, messageId = `${name}-1` } = {}) {
  const sent = [];
  return {
    __sent: sent,
    send: jest.fn(async (payload, recipients) => {
      sent.push({ payload, recipients });
      if (fail) return { success: false, error: `${name} unavailable` };
      return { success: true, providerMessageId: messageId };
    }),
  };
}

function makeEventRecorder() {
  const events = [];
  return {
    events,
    bus: { emit: (name, payload) => events.push({ name, payload }) },
  };
}

// ─── Test suite ───────────────────────────────────────────────────

describe('computeInstanceKey / hashPayload', () => {
  test('instanceKey is stable and includes scope or global', () => {
    expect(computeInstanceKey('a.b', '2026-W17', 'branch:1')).toBe('a.b:2026-W17:branch:1');
    expect(computeInstanceKey('a.b', '2026-W17')).toBe('a.b:2026-W17:global');
  });
  test('hashPayload is deterministic for equivalent docs', () => {
    const a = hashPayload({ x: 1, y: [1, 2] });
    const b = hashPayload({ x: 1, y: [1, 2] });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('ReportingEngine — happy path', () => {
  const catalog = makeFakeCatalog([
    {
      id: 'ben.progress.weekly',
      nameEn: 'Weekly Progress',
      category: 'clinical',
      periodicity: 'weekly',
      audiences: ['guardian'],
      channels: ['email', 'whatsapp'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'fakeBuilders.weekly',
      approvalRequired: false,
      enabled: true,
    },
  ]);

  test('dispatches to every channel for every recipient, ledgers all rows', async () => {
    const builders = {
      fakeBuilders: {
        weekly: jest.fn(async () => ({ headline: 'good week', kpi: 0.9 })),
      },
    };
    const channels = {
      email: makeFakeChannel('email'),
      whatsapp: makeFakeChannel('whatsapp'),
    };
    const recipientResolver = {
      resolve: jest.fn(async audience => {
        if (audience === 'guardian') {
          return [
            { id: 'g1', locale: 'ar', recipientModel: 'Guardian' },
            { id: 'g2', locale: 'en', recipientModel: 'Guardian' },
          ];
        }
        return [];
      }),
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const { bus, events } = makeEventRecorder();

    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
      eventBus: bus,
    });

    const res = await engine.runInstance({
      reportId: 'ben.progress.weekly',
      periodKey: '2026-W17',
      scopeKey: 'beneficiary:b1',
    });

    expect(res.status).toBe('dispatched');
    // 2 guardians × 2 channels = 4 deliveries
    expect(DeliveryModel.model.__rows.length).toBe(4);
    expect(DeliveryModel.model.__rows.every(r => r.status === 'SENT')).toBe(true);
    expect(builders.fakeBuilders.weekly).toHaveBeenCalledTimes(1);
    expect(channels.email.__sent.length).toBe(2);
    expect(channels.whatsapp.__sent.length).toBe(2);
    expect(events.map(e => e.name)).toEqual(
      expect.arrayContaining(['report.instance.built', 'report.delivery.sent'])
    );
  });

  test('idempotent: second run upserts same ledger rows, no duplication', async () => {
    const builders = {
      fakeBuilders: { weekly: async () => ({ a: 1 }) },
    };
    const channels = { email: makeFakeChannel('email'), whatsapp: makeFakeChannel('whatsapp') };
    const recipientResolver = {
      resolve: async a =>
        a === 'guardian' ? [{ id: 'g1', locale: 'ar', recipientModel: 'Guardian' }] : [],
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    await engine.runInstance({ reportId: 'ben.progress.weekly', periodKey: '2026-W17' });
    await engine.runInstance({ reportId: 'ben.progress.weekly', periodKey: '2026-W17' });
    expect(DeliveryModel.model.__rows.length).toBe(2); // 1 recipient × 2 channels
  });

  test('missing channel adapter marks delivery FAILED', async () => {
    const builders = { fakeBuilders: { weekly: async () => ({ a: 1 }) } };
    // only provide email; whatsapp is in catalog but no adapter registered
    const channels = { email: makeFakeChannel('email') };
    const recipientResolver = {
      resolve: async a => (a === 'guardian' ? [{ id: 'g1', locale: 'ar' }] : []),
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    const res = await engine.runInstance({
      reportId: 'ben.progress.weekly',
      periodKey: '2026-W17',
    });
    expect(res.status).toBe('dispatched');
    const wa = DeliveryModel.model.__rows.find(r => r.channel === 'whatsapp');
    expect(wa.status).toBe('FAILED');
    expect(wa.providerError).toMatch(/not registered/);
  });
});

describe('ReportingEngine — approval gate', () => {
  const catalog = makeFakeCatalog([
    {
      id: 'exec.kpi.board.quarterly',
      nameEn: 'Board Pack',
      category: 'executive',
      periodicity: 'quarterly',
      audiences: ['executive'],
      channels: ['portal_inbox'],
      confidentiality: 'confidential',
      locales: ['en', 'ar'],
      formats: ['pdf'],
      builder: 'fakeBuilders.boardPack',
      approvalRequired: true,
      approverRoles: ['ceo'],
      enabled: true,
    },
  ]);

  test('first run creates PENDING approval, no dispatch', async () => {
    const builders = { fakeBuilders: { boardPack: async () => ({ kpis: [1, 2, 3] }) } };
    const channels = { portal_inbox: makeFakeChannel('portal_inbox') };
    const recipientResolver = {
      resolve: async a => (a === 'executive' ? [{ id: 'ceo1', locale: 'en' }] : []),
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const { bus, events } = makeEventRecorder();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
      eventBus: bus,
    });

    const res = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    expect(res.status).toBe('awaiting_approval');
    expect(res.approvalRequestId).toBeTruthy();
    expect(ApprovalModel.model.__rows.length).toBe(1);
    expect(ApprovalModel.model.__rows[0].state).toBe('PENDING');
    expect(DeliveryModel.model.__rows.length).toBe(0);
    expect(events.map(e => e.name)).toContain('report.approval.requested');
    expect(channels.portal_inbox.send).not.toHaveBeenCalled();
  });

  test('re-run while PENDING short-circuits with same approval id', async () => {
    const builders = { fakeBuilders: { boardPack: async () => ({ v: 1 }) } };
    const channels = { portal_inbox: makeFakeChannel('portal_inbox') };
    const recipientResolver = {
      resolve: async () => [{ id: 'ceo1', locale: 'en' }],
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    const a = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    const b = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    expect(a.approvalRequestId).toBe(b.approvalRequestId);
    expect(ApprovalModel.model.__rows.length).toBe(1);
  });

  test('APPROVED + matching hash → dispatches on next run', async () => {
    const builders = {
      fakeBuilders: { boardPack: async () => ({ kpis: [1, 2, 3] }) },
    };
    const channels = { portal_inbox: makeFakeChannel('portal_inbox') };
    const recipientResolver = {
      resolve: async () => [{ id: 'ceo1', locale: 'en' }],
    };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    // 1st run → PENDING
    await engine.runInstance({ reportId: 'exec.kpi.board.quarterly', periodKey: '2026-Q2' });
    // Simulate approval.
    const approval = ApprovalModel.model.__rows[0];
    approval.state = 'APPROVED';
    approval.markDispatched = function (actor) {
      this.state = 'DISPATCHED';
      this.dispatchedAt = new Date();
    };
    // 2nd run → dispatches (hash matches because builder is pure).
    const res = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    expect(res.status).toBe('dispatched');
    expect(DeliveryModel.model.__rows.length).toBe(1);
    expect(approval.state).toBe('DISPATCHED');
  });

  test('REJECTED approval blocks re-run', async () => {
    const builders = { fakeBuilders: { boardPack: async () => ({ v: 1 }) } };
    const channels = { portal_inbox: makeFakeChannel('portal_inbox') };
    const recipientResolver = { resolve: async () => [{ id: 'ceo1' }] };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    await engine.runInstance({ reportId: 'exec.kpi.board.quarterly', periodKey: '2026-Q2' });
    ApprovalModel.model.__rows[0].state = 'REJECTED';
    const res = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    expect(res.status).toBe('blocked');
    expect(DeliveryModel.model.__rows.length).toBe(0);
  });

  test('payload drift after approval refuses to dispatch', async () => {
    let version = 1;
    const builders = {
      fakeBuilders: { boardPack: async () => ({ v: version }) },
    };
    const channels = { portal_inbox: makeFakeChannel('portal_inbox') };
    const recipientResolver = { resolve: async () => [{ id: 'ceo1' }] };
    const DeliveryModel = makeFakeDeliveryModel();
    const ApprovalModel = makeFakeApprovalModel();
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel,
      ApprovalModel,
      builders,
      channels,
      recipientResolver,
    });
    await engine.runInstance({ reportId: 'exec.kpi.board.quarterly', periodKey: '2026-Q2' });
    const approval = ApprovalModel.model.__rows[0];
    approval.state = 'APPROVED';
    // Builder now returns different data → hash drift.
    version = 2;
    const res = await engine.runInstance({
      reportId: 'exec.kpi.board.quarterly',
      periodKey: '2026-Q2',
    });
    expect(res.status).toBe('payload_drift');
    expect(DeliveryModel.model.__rows.length).toBe(0);
  });
});

describe('ReportingEngine — edge cases', () => {
  test('unknown reportId returns not_found', async () => {
    const catalog = makeFakeCatalog([]);
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      builders: {},
      channels: {},
      recipientResolver: { resolve: async () => [] },
    });
    const res = await engine.runInstance({ reportId: 'missing', periodKey: 'x' });
    expect(res.status).toBe('not_found');
  });

  test('disabled report returns disabled', async () => {
    const catalog = makeFakeCatalog([
      {
        id: 'x.y',
        nameEn: 'x',
        category: 'clinical',
        periodicity: 'daily',
        audiences: ['guardian'],
        channels: ['email'],
        confidentiality: 'internal',
        locales: ['ar'],
        formats: ['html'],
        builder: 'b.f',
        approvalRequired: false,
        enabled: false,
      },
    ]);
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      builders: {},
      channels: {},
      recipientResolver: { resolve: async () => [] },
    });
    const res = await engine.runInstance({ reportId: 'x.y', periodKey: 'x' });
    expect(res.status).toBe('disabled');
  });

  test('builder not registered returns builder_missing', async () => {
    const catalog = makeFakeCatalog([
      {
        id: 'x.y',
        nameEn: 'x',
        category: 'clinical',
        periodicity: 'daily',
        audiences: ['guardian'],
        channels: ['email'],
        confidentiality: 'internal',
        locales: ['ar'],
        formats: ['html'],
        builder: 'nope.nada',
        approvalRequired: false,
        enabled: true,
      },
    ]);
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      builders: {},
      channels: { email: makeFakeChannel('email') },
      recipientResolver: { resolve: async () => [{ id: 'g1' }] },
    });
    const res = await engine.runInstance({ reportId: 'x.y', periodKey: 'x' });
    expect(res.status).toBe('builder_missing');
  });

  test('no recipients returns dispatched with error note', async () => {
    const catalog = makeFakeCatalog([
      {
        id: 'x.y',
        nameEn: 'x',
        category: 'clinical',
        periodicity: 'daily',
        audiences: ['guardian'],
        channels: ['email'],
        confidentiality: 'internal',
        locales: ['ar'],
        formats: ['html'],
        builder: 'b.f',
        approvalRequired: false,
        enabled: true,
      },
    ]);
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      builders: { b: { f: async () => ({ ok: true }) } },
      channels: { email: makeFakeChannel('email') },
      recipientResolver: { resolve: async () => [] },
    });
    const res = await engine.runInstance({ reportId: 'x.y', periodKey: 'x' });
    expect(res.status).toBe('dispatched');
    expect(res.errors).toContain('no recipients resolved');
  });

  test('confidential strips non-portal channels at dispatch time', async () => {
    const catalog = makeFakeCatalog([
      {
        id: 'x.conf',
        nameEn: 'x',
        category: 'executive',
        periodicity: 'annual',
        audiences: ['executive'],
        channels: ['email', 'portal_inbox', 'in_app'],
        confidentiality: 'confidential',
        locales: ['en'],
        formats: ['pdf'],
        builder: 'b.f',
        approvalRequired: false,
        enabled: true,
      },
    ]);
    const channels = {
      email: makeFakeChannel('email'),
      portal_inbox: makeFakeChannel('portal_inbox'),
      in_app: makeFakeChannel('in_app'),
    };
    const engine = new ReportingEngine({
      catalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      builders: { b: { f: async () => ({ v: 1 }) } },
      channels,
      recipientResolver: { resolve: async () => [{ id: 'u1' }] },
    });
    await engine.runInstance({ reportId: 'x.conf', periodKey: '2026' });
    expect(channels.email.send).not.toHaveBeenCalled();
    expect(channels.portal_inbox.send).toHaveBeenCalled();
    expect(channels.in_app.send).toHaveBeenCalled();
  });
});
