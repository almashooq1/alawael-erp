/**
 * reporting-engine-value-resolver.test.js — Phase 10 Commit 15.
 *
 * The ReportingEngine now accepts a `valueResolver` in its constructor
 * and auto-injects it into every builder's ctx. This closes the
 * last-mile gap: before C15 the KPI builders received
 * `ctx.valueResolver === undefined` unless the caller explicitly
 * passed one in `input.builderCtx`, so the 5 P10-C12 KPIs landed in
 * the digest as `status='unknown'`.
 *
 * Tests verify:
 *   - engine.valueResolver accessor exposes the injected function
 *   - builders receive `ctx.valueResolver` when the engine has one
 *   - caller-provided `builderCtx.valueResolver` wins over the
 *     engine's default
 *   - engine with no valueResolver leaves ctx unchanged (back-compat)
 */

'use strict';

const { ReportingEngine } = require('../services/reporting/reportingEngine');

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
        const row = {
          _id: `d_${rows.length + 1}`,
          ...((update && update.$setOnInsert) || {}),
          status: 'QUEUED',
          attempts: 0,
          markSent(msgId) {
            this.status = 'SENT';
            this.sentAt = new Date();
            this.providerMessageId = msgId;
            this.attempts += 1;
          },
          markFailed() {
            this.status = 'FAILED';
            this.attempts += 1;
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

const baseCatalog = makeFakeCatalog([
  {
    id: 'k.report',
    nameEn: 'KPI report',
    category: 'executive',
    periodicity: 'daily',
    audiences: ['executive'],
    channels: ['email'],
    confidentiality: 'internal',
    locales: ['en'],
    formats: ['html'],
    builder: 'fake.buildKpi',
    approvalRequired: false,
    enabled: true,
  },
]);

describe('ReportingEngine — valueResolver auto-injection (C15)', () => {
  test('engine.valueResolver exposes the injected function', () => {
    const fn = async () => 42;
    const e = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: { fake: { buildKpi: async () => ({}) } },
      valueResolver: fn,
    });
    expect(e.valueResolver).toBe(fn);
  });

  test('engine.valueResolver is null when none supplied (back-compat)', () => {
    const e = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: { fake: { buildKpi: async () => ({}) } },
    });
    expect(e.valueResolver).toBeNull();
  });

  test('non-function valueResolver is rejected (stored as null)', () => {
    const e = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: { fake: { buildKpi: async () => ({}) } },
      valueResolver: 'not-a-function',
    });
    expect(e.valueResolver).toBeNull();
  });

  test('builder receives ctx.valueResolver when engine has one', async () => {
    const engineResolver = jest.fn(async () => 0.5);
    let ctxSeen;
    const engine = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: {
        fake: {
          buildKpi: async ({ ctx }) => {
            ctxSeen = ctx;
            return { status: 'ok' };
          },
        },
      },
      valueResolver: engineResolver,
    });
    await engine.runInstance({ reportId: 'k.report', periodKey: '2026-04-22' });
    expect(ctxSeen).toBeDefined();
    expect(ctxSeen.valueResolver).toBe(engineResolver);
  });

  test('caller-provided builderCtx.valueResolver wins over engine default', async () => {
    const engineResolver = jest.fn();
    const callerResolver = jest.fn();
    let ctxSeen;
    const engine = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: {
        fake: {
          buildKpi: async ({ ctx }) => {
            ctxSeen = ctx;
            return {};
          },
        },
      },
      valueResolver: engineResolver,
    });
    await engine.runInstance({
      reportId: 'k.report',
      periodKey: '2026-04-22',
      builderCtx: { valueResolver: callerResolver, customFlag: true },
    });
    expect(ctxSeen.valueResolver).toBe(callerResolver);
    expect(ctxSeen.customFlag).toBe(true);
  });

  test('engine with no valueResolver leaves caller ctx untouched', async () => {
    let ctxSeen;
    const engine = new ReportingEngine({
      catalog: baseCatalog,
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: {
        fake: {
          buildKpi: async ({ ctx }) => {
            ctxSeen = ctx;
            return {};
          },
        },
      },
      // no valueResolver
    });
    await engine.runInstance({
      reportId: 'k.report',
      periodKey: '2026-04-22',
      builderCtx: { onlyMe: 1 },
    });
    expect(ctxSeen).toEqual({ onlyMe: 1 });
    expect('valueResolver' in ctxSeen).toBe(false);
  });

  test('engine valueResolver is reachable end-to-end via the real KPI builder', async () => {
    // Stand up a real kpiReportBuilder.buildExecDigest path, inject
    // an engine valueResolver, and verify the builder consults it.
    const kpiBuilder = require('../services/reporting/builders/kpiReportBuilder');
    const fakeRegistry = {
      KPIS: [
        {
          id: 'test.kpi',
          frequency: 'daily',
          direction: 'higher_is_better',
          target: 10,
          warningThreshold: 5,
          criticalThreshold: 2,
          nameEn: 'x',
          domain: 'quality',
          dataSource: { service: 's', method: 'm', path: 'v' },
          owner: 'admin',
          compliance: [],
        },
      ],
      classify(k, v) {
        if (v == null) return 'unknown';
        if (v >= k.target) return 'green';
        if (v >= k.warningThreshold) return 'amber';
        return 'red';
      },
    };
    const engineResolver = jest.fn(async () => 12);
    const engine = new ReportingEngine({
      catalog: makeFakeCatalog([
        {
          id: 'exec.kpi.digest.daily',
          nameEn: 'Daily',
          category: 'executive',
          periodicity: 'daily',
          audiences: ['executive'],
          channels: ['email'],
          confidentiality: 'internal',
          locales: ['en'],
          formats: ['html'],
          builder: 'kpi.buildExecDigest',
          approvalRequired: false,
          enabled: true,
        },
      ]),
      DeliveryModel: makeFakeDeliveryModel(),
      ApprovalModel: makeFakeApprovalModel(),
      recipientResolver: { resolve: async () => [] },
      builders: {
        kpi: {
          buildExecDigest: input =>
            kpiBuilder.buildExecDigest({
              ...input,
              ctx: { ...input.ctx, models: { kpiRegistry: fakeRegistry } },
            }),
        },
      },
      valueResolver: engineResolver,
    });
    await engine.runInstance({
      reportId: 'exec.kpi.digest.daily',
      periodKey: '2026-04-22',
    });
    expect(engineResolver).toHaveBeenCalled();
    expect(engineResolver.mock.calls[0][0].id).toBe('test.kpi');
  });
});
