/**
 * red-flag-engine.test.js — Beneficiary-360 Commit 3a.
 *
 * End-to-end orchestration without DB or real services. A fake
 * locator supplies canned observations; the engine wires it through
 * the canonical registry + pure evaluator and produces verdicts.
 * These tests establish that:
 *
 *   - the engine invokes the right service/method per flag
 *   - subset filters (domains/severities/flagIds) narrow correctly
 *   - blocking + raised counts match the fixture
 *   - a single bad service produces an `error` verdict without
 *     sinking the rest of the run (safety invariant)
 *   - async and sync service methods both work
 */

'use strict';

const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');
const { byId } = require('../config/red-flags.registry');

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Stand up a locator where every service required by the subset of
 * flags under test is pre-registered with canned responses.
 * `responses` is a map of `${flagId}` → raw response the method
 * should return for the given beneficiary.
 */
function fakeLocatorFor(flagIds, responses = {}, { throwFor = [], async = false } = {}) {
  const locator = createLocator();
  // Group flags by service name so one "service" can host many methods.
  const services = new Map();
  for (const id of flagIds) {
    const flag = byId(id);
    if (!flag) throw new Error(`fixture error: unknown flag ${id}`);
    const { service, method } = flag.trigger.source;
    if (!services.has(service)) services.set(service, {});
    const svc = services.get(service);
    // A method can be referenced by multiple flags, but in the
    // registry each flag has its own (service, method) pair — we
    // install one function per flag anyway.
    svc[method] = _beneficiaryId => {
      if (throwFor.includes(id)) {
        throw new Error(`fake service error for ${id}`);
      }
      const value = responses[id];
      return async ? Promise.resolve(value) : value;
    };
  }
  for (const [name, obj] of services) locator.register(name, obj);
  return locator;
}

// ─── Construction guardrails ────────────────────────────────────

describe('createEngine — construction', () => {
  it('throws when locator is missing', () => {
    expect(() => createEngine({})).toThrow(/locator/);
  });

  it('throws when locator lacks resolve()', () => {
    expect(() => createEngine({ locator: {} })).toThrow(/resolve/);
  });

  it('throws when registry lacks RED_FLAGS', () => {
    const locator = createLocator();
    expect(() => createEngine({ locator, registry: {} })).toThrow(/RED_FLAGS/);
  });

  it('throws when evaluator lacks evaluateFlag', () => {
    const locator = createLocator();
    expect(() => createEngine({ locator, evaluator: {} })).toThrow(/evaluateFlag/);
  });

  it('throws when beneficiaryId is missing at evaluation time', async () => {
    const locator = createLocator();
    const engine = createEngine({ locator });
    await expect(engine.evaluateBeneficiary('')).rejects.toThrow(/beneficiaryId/);
    await expect(engine.evaluateBeneficiary(null)).rejects.toThrow(/beneficiaryId/);
  });
});

// ─── End-to-end verdicts against the real registry ──────────────

describe('evaluateBeneficiary — raises / clears based on observations', () => {
  it('raises attendance.monthly.rate.low_70 when rate is 55', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: { attendanceRate: 55 } });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });

    expect(result.flagsEvaluated).toBe(1);
    expect(result.raisedCount).toBe(1);
    expect(result.erroredCount).toBe(0);
    expect(result.verdicts[0]).toMatchObject({
      flagId,
      kind: 'raised',
      observedValue: 55,
    });
  });

  it('clears attendance.monthly.rate.low_70 when rate is 92', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: { attendanceRate: 92 } });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });
    expect(result.raisedCount).toBe(0);
    expect(result.verdicts[0].kind).toBe('clear');
  });

  it('detects blockingRaised for consent-missing (critical + blocking)', async () => {
    const flagId = 'clinical.consent.treatment.missing_pre_session';
    const locator = fakeLocatorFor([flagId], { [flagId]: { treatmentActive: false } });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });
    expect(result.raisedCount).toBe(1);
    expect(result.blockingRaisedCount).toBe(1);
    expect(result.blockingRaised[0].flagId).toBe(flagId);
  });

  it('blocking count is zero when only warning flags fire', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: { attendanceRate: 55 } });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });
    expect(result.raisedCount).toBe(1);
    expect(result.blockingRaisedCount).toBe(0);
  });

  it('handles async service methods (Promise-returning observations)', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: { attendanceRate: 40 } }, { async: true });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });
    expect(result.raisedCount).toBe(1);
  });

  it('stamps evaluatedAt from an injected clock', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: { attendanceRate: 50 } });
    const engine = createEngine({ locator });
    const now = new Date('2026-04-22T09:00:00.000Z');
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId], now });
    expect(result.evaluatedAt).toBe('2026-04-22T09:00:00.000Z');
    expect(result.verdicts[0].evaluatedAt).toBe('2026-04-22T09:00:00.000Z');
  });
});

// ─── Error isolation ────────────────────────────────────────────

describe('evaluateBeneficiary — error isolation', () => {
  it('records `error` verdict when the service is not registered, without sinking peers', async () => {
    const okId = 'attendance.monthly.rate.low_70';
    const brokenId = 'clinical.progress.regression.significant';
    // Register only `attendanceService`, not `goalProgressService`
    const locator = createLocator();
    locator.register('attendanceService', {
      beneficiaryMonthlyRate: () => ({ attendanceRate: 60 }),
    });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [okId, brokenId] });

    expect(result.flagsEvaluated).toBe(2);
    expect(result.erroredCount).toBe(1);
    expect(result.raisedCount).toBe(1);
    const errored = result.verdicts.find(v => v.flagId === brokenId);
    expect(errored.kind).toBe('error');
    expect(errored.reason).toMatch(/locator-error.*goalProgressService/);
  });

  it('records `error` verdict when the service method throws', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const locator = fakeLocatorFor([flagId], { [flagId]: null }, { throwFor: [flagId] });
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: [flagId] });
    expect(result.erroredCount).toBe(1);
    expect(result.verdicts[0].kind).toBe('error');
    expect(result.verdicts[0].reason).toMatch(/service-error/);
  });

  it('records `error` verdict when evaluator rejects a composite operator', async () => {
    // Swap in a fake registry entry with a composite operator.
    const locator = createLocator();
    locator.register('svc', { m: () => ({ x: 1 }) });
    const fakeRegistry = {
      RED_FLAGS: [
        {
          id: 'test.composite',
          domain: 'clinical',
          severity: 'warning',
          category: 'composite',
          trigger: {
            source: { service: 'svc', method: 'm', path: 'x' },
            condition: { operator: 'and', value: null },
          },
          response: { blocking: false, notify: ['admin'], escalateTo: 'admin', taskTemplate: 't' },
          slaHours: 0,
          cooldownHours: 0,
          autoResolve: null,
          owner: 'admin',
          compliance: [],
          kpiLinks: [],
        },
      ],
      byId: id => (id === 'test.composite' ? fakeRegistry.RED_FLAGS[0] : null),
    };
    const engine = createEngine({ locator, registry: fakeRegistry });
    const result = await engine.evaluateBeneficiary('BEN-1');
    expect(result.erroredCount).toBe(1);
    expect(result.verdicts[0].reason).toMatch(/evaluator-error.*composite/);
  });
});

// ─── Subset filters ─────────────────────────────────────────────

describe('evaluateBeneficiary — subset filters', () => {
  it('domains filter narrows to the requested domain', async () => {
    // Register everything the "clinical" domain flags need.
    const clinicalIds = [
      'clinical.allergy.severe.medication_conflict',
      'clinical.progress.regression.significant',
      'clinical.seizure.cluster.48h',
      'clinical.pediatric.weight.drop_5pct',
      'clinical.vaccination.overdue.60d',
      'clinical.consent.treatment.missing_pre_session',
      'clinical.puberty.consent_review.due',
    ];
    const responses = {};
    for (const id of clinicalIds) responses[id] = {};
    const locator = fakeLocatorFor(clinicalIds, responses);
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { domains: 'clinical' });
    expect(result.flagsEvaluated).toBe(clinicalIds.length);
    for (const v of result.verdicts) {
      expect(v.flagId.startsWith('clinical.')).toBe(true);
    }
  });

  it('severities filter narrows to critical only', async () => {
    const { RED_FLAGS } = require('../config/red-flags.registry');
    const criticalIds = RED_FLAGS.filter(f => f.severity === 'critical').map(f => f.id);
    const responses = {};
    for (const id of criticalIds) responses[id] = {};
    const locator = fakeLocatorFor(criticalIds, responses);
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { severities: 'critical' });
    expect(result.flagsEvaluated).toBe(criticalIds.length);
  });

  it('flagIds filter narrows to an explicit set', async () => {
    const ids = ['attendance.monthly.rate.low_70', 'attendance.missed.streak_3_consecutive'];
    const responses = {
      'attendance.monthly.rate.low_70': { attendanceRate: 95 },
      'attendance.missed.streak_3_consecutive': { streakCount: 0 },
    };
    const locator = fakeLocatorFor(ids, responses);
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', { flagIds: ids });
    expect(result.flagsEvaluated).toBe(2);
    expect(result.raisedCount).toBe(0);
  });

  it('combined domains + severities intersect', async () => {
    const { RED_FLAGS } = require('../config/red-flags.registry');
    const wanted = RED_FLAGS.filter(f => f.domain === 'clinical' && f.severity === 'critical');
    const ids = wanted.map(f => f.id);
    const responses = {};
    for (const id of ids) responses[id] = {};
    const locator = fakeLocatorFor(ids, responses);
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary('BEN-1', {
      domains: 'clinical',
      severities: 'critical',
    });
    expect(result.flagsEvaluated).toBe(wanted.length);
  });
});

// ─── Service method is invoked with the beneficiary id ──────────

describe('evaluateBeneficiary — service invocation contract', () => {
  it('invokes each service method with exactly the beneficiary id', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const seen = [];
    const locator = createLocator();
    locator.register('attendanceService', {
      beneficiaryMonthlyRate: beneficiaryId => {
        seen.push(beneficiaryId);
        return { attendanceRate: 80 };
      },
    });
    const engine = createEngine({ locator });
    await engine.evaluateBeneficiary('BEN-42', { flagIds: [flagId] });
    expect(seen).toEqual(['BEN-42']);
  });

  it('forwards the injected clock to the service method as options.now', async () => {
    const flagId = 'attendance.monthly.rate.low_70';
    const seenOpts = [];
    const locator = createLocator();
    locator.register('attendanceService', {
      beneficiaryMonthlyRate: (_bId, opts) => {
        seenOpts.push(opts);
        return { attendanceRate: 80 };
      },
    });
    const engine = createEngine({ locator });
    const fixed = new Date('2026-04-22T09:00:00.000Z');
    await engine.evaluateBeneficiary('BEN-42', { flagIds: [flagId], now: fixed });
    expect(seenOpts).toHaveLength(1);
    expect(seenOpts[0].now).toBe(fixed);
  });
});
