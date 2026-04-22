/**
 * reporting-kpi-resolvers.test.js — Phase 10 Commit 13.
 */

'use strict';

const {
  createReportingValueResolver,
  defaultPeriodKeyForFrequency,
  DEFAULT_MODULES,
} = require('../services/reporting/kpiResolvers');

function kpi(overrides = {}) {
  return {
    id: 'finance.invoices.aging.concentration.pct',
    frequency: 'weekly',
    dataSource: {
      service: 'financeReportBuilder',
      method: 'buildAgingReport',
      path: 'agingRatio',
    },
    ...overrides,
  };
}

// ─── defaultPeriodKeyForFrequency ───────────────────────────────

describe('defaultPeriodKeyForFrequency', () => {
  const now = new Date(Date.UTC(2026, 3, 22, 10, 0, 0)); // 2026-04-22 Wed
  test('daily → YYYY-MM-DD', () => {
    expect(defaultPeriodKeyForFrequency('daily', now)).toBe('2026-04-22');
  });
  test('hourly → same as daily (day granularity is enough for KPI aggregate)', () => {
    expect(defaultPeriodKeyForFrequency('hourly', now)).toBe('2026-04-22');
  });
  test('weekly → ISO YYYY-Www', () => {
    expect(defaultPeriodKeyForFrequency('weekly', now)).toMatch(/^2026-W\d{2}$/);
  });
  test('monthly → YYYY-MM', () => {
    expect(defaultPeriodKeyForFrequency('monthly', now)).toBe('2026-04');
  });
  test('unknown frequency → daily fallback', () => {
    expect(defaultPeriodKeyForFrequency('annual-ish', now)).toBe('2026-04-22');
  });
});

// ─── DEFAULT_MODULES coverage ──────────────────────────────────

describe('DEFAULT_MODULES', () => {
  test('includes every real Phase-10 builder module', () => {
    const expectedKeys = [
      'financeReportBuilder',
      'hrReportBuilder',
      'fleetReportBuilder',
      'qualityReportBuilder',
      'attendanceReportBuilder',
      'sessionReportBuilder',
      'therapistReportBuilder',
      'branchReportBuilder',
      'crmReportBuilder',
    ];
    for (const k of expectedKeys) expect(DEFAULT_MODULES[k]).toBeDefined();
  });
});

// ─── createReportingValueResolver ───────────────────────────────

describe('createReportingValueResolver — dispatch + path navigation', () => {
  test('returns null when kpi.dataSource is missing', async () => {
    const resolve = createReportingValueResolver();
    expect(await resolve({})).toBeNull();
    expect(await resolve(kpi({ dataSource: null }))).toBeNull();
  });

  test('returns null when dataSource.service is not a known module', async () => {
    const resolve = createReportingValueResolver();
    const k = kpi({ dataSource: { service: 'unknown', method: 'x', path: 'y' } });
    expect(await resolve(k)).toBeNull();
  });

  test('returns null when the declared method does not exist on the module', async () => {
    const resolve = createReportingValueResolver({
      modules: { finance: { buildAgingReport: undefined, somethingElse: () => {} } },
    });
    const k = kpi({
      dataSource: { service: 'finance', method: 'buildAgingReport', path: 'agingRatio' },
    });
    expect(await resolve(k)).toBeNull();
  });

  test('calls the builder with a report-shaped input and navigates the path', async () => {
    const build = jest.fn(async ({ report, periodKey, scopeKey, ctx }) => {
      expect(report.id).toBe('finance.invoices.aging.concentration.pct');
      expect(typeof periodKey).toBe('string');
      expect(ctx).toEqual(expect.any(Object));
      return { agingRatio: 0.18, totals: { unpaidInvoices: 12 } };
    });
    const resolve = createReportingValueResolver({
      modules: { financeReportBuilder: { buildAgingReport: build } },
    });
    const v = await resolve(kpi(), { periodKey: '2026-W17' });
    expect(v).toBeCloseTo(0.18);
    expect(build).toHaveBeenCalledTimes(1);
    expect(build.mock.calls[0][0].periodKey).toBe('2026-W17');
  });

  test('uses frequency-derived periodKey when ctx omits it', async () => {
    const capturedInputs = [];
    const build = jest.fn(async input => {
      capturedInputs.push(input);
      return { agingRatio: 0.1 };
    });
    const clock = { now: () => new Date(Date.UTC(2026, 3, 22)) };
    const resolve = createReportingValueResolver({
      modules: { financeReportBuilder: { buildAgingReport: build } },
      clock,
    });
    await resolve(kpi({ frequency: 'weekly' }));
    expect(capturedInputs[0].periodKey).toMatch(/^2026-W\d{2}$/);

    await resolve(kpi({ frequency: 'monthly' }));
    expect(capturedInputs[1].periodKey).toBe('2026-04');
  });

  test('propagates scopeKey + ctx hooks (loadBranch/loadBeneficiary/loadTherapists)', async () => {
    const build = jest.fn(async input => {
      expect(input.scopeKey).toBe('branch:br1');
      expect(typeof input.ctx.loadBranch).toBe('function');
      expect(typeof input.ctx.loadTherapists).toBe('function');
      return { rate: 42 };
    });
    const resolve = createReportingValueResolver({
      modules: { mod: { m: build } },
    });
    const k = kpi({ dataSource: { service: 'mod', method: 'm', path: 'rate' } });
    const v = await resolve(k, {
      periodKey: '2026-W17',
      scopeKey: 'branch:br1',
      loadBranch: async () => ({ id: 'br1', name: 'Riyadh' }),
      loadTherapists: async () => [],
    });
    expect(v).toBe(42);
  });

  test('builder throw → null + logger.warn', async () => {
    const warn = jest.fn();
    const build = async () => {
      throw new Error('boom');
    };
    const resolve = createReportingValueResolver({
      modules: { financeReportBuilder: { buildAgingReport: build } },
      logger: { warn },
    });
    const v = await resolve(kpi());
    expect(v).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  test('builder returns undefined / non-number at path → null', async () => {
    const resolve = createReportingValueResolver({
      modules: { financeReportBuilder: { buildAgingReport: async () => ({ agingRatio: 'n/a' }) } },
    });
    expect(await resolve(kpi())).toBeNull();

    const resolve2 = createReportingValueResolver({
      modules: { financeReportBuilder: { buildAgingReport: async () => null } },
    });
    expect(await resolve2(kpi())).toBeNull();
  });

  test('end-to-end with the real buildAgingReport — empty Invoice set yields null agingRatio', async () => {
    // Minimal in-memory Invoice fake so the real builder runs.
    const Invoice = {
      model: {
        async find() {
          return [];
        },
      },
    };
    const resolve = createReportingValueResolver();
    const k = kpi();
    const v = await resolve(k, {
      periodKey: '2026-W17',
      models: { Invoice },
    });
    // Zero unpaid invoices → the builder returns null agingRatio
    // (divide-by-zero guarded). The resolver must translate to null.
    expect(v).toBeNull();
  });

  test('end-to-end with real buildPunctuality — 2 completed / 1 cancelled trip → 0.666…', async () => {
    const Trip = {
      model: {
        async find() {
          return [
            {
              _id: 't1',
              status: 'اكتملت',
              vehicle: 'v1',
              startTime: new Date('2026-04-22T08:00Z'),
            },
            {
              _id: 't2',
              status: 'اكتملت',
              vehicle: 'v1',
              startTime: new Date('2026-04-22T10:00Z'),
            },
            { _id: 't3', status: 'ملغاة', vehicle: 'v2', startTime: new Date('2026-04-22T11:00Z') },
          ];
        },
      },
    };
    const resolve = createReportingValueResolver();
    const fleetKpi = kpi({
      id: 'multi-branch.fleet.completion.pct',
      frequency: 'weekly',
      dataSource: {
        service: 'fleetReportBuilder',
        method: 'buildPunctuality',
        path: 'completionRate',
      },
    });
    const v = await resolve(fleetKpi, {
      periodKey: '2026-W17',
      models: { Trip },
    });
    expect(v).toBeCloseTo(2 / 3);
  });
});
