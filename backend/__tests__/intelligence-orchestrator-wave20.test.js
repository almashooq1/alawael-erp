/**
 * intelligence-orchestrator-wave20.test.js — Wave 20.
 *
 * Tests the orchestrator that drives the generators on a schedule.
 * Mongo-free: the insightsService is replaced by a fake that records
 * every upsert call; generators are minimal hand-written stubs.
 *
 * Coverage:
 *   • runTick fans out across all registered generators
 *   • generators without a registered loader are silently skipped
 *   • generator throw in loader OR evaluate is isolated (one bad
 *     generator can't break the tick)
 *   • payload count is capped at maxPerGenerator
 *   • dedup return from insightsService is counted separately from emit
 *   • per-generator metrics accumulate across ticks
 *   • runGenerator(id) runs only one
 */

'use strict';

const { createOrchestrator } = require('../intelligence/orchestrator.service');

function makeStubGenerator(id, evaluateImpl) {
  return {
    id,
    kind: 'care-gap',
    category: 'clinical',
    scope: 'entity',
    evaluate: evaluateImpl,
  };
}

function makeFakeInsightsService() {
  const calls = [];
  return {
    calls,
    async upsertInsight(payload) {
      calls.push(payload);
      // Two-out-of-three pattern: first call emit, second dedup, then alternating.
      const i = calls.length;
      if (i % 3 === 0) return { ok: true, noop: true, deduped: true, insight: { _id: `i${i}` } };
      return { ok: true, insight: { _id: `i${i}` } };
    },
  };
}

// ─── runTick ───────────────────────────────────────────────────

describe('orchestrator — runTick', () => {
  test('fans out across all registered generators with loaders', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('care-gap.v1', async () => [
          { kind: 'care-gap', severity: 'low' },
          { kind: 'care-gap', severity: 'medium' },
        ]),
        makeStubGenerator('anomaly.v1', async () => [{ kind: 'anomaly', severity: 'high' }]),
      ],
      dataLoaders: {
        'care-gap.v1': async () => ({ beneficiaries: [] }),
        'anomaly.v1': async () => ({ series: [] }),
      },
      insightsService,
    });

    const summary = await orch.runTick();
    expect(summary.generatorsRun).toBe(2);
    expect(insightsService.calls).toHaveLength(3);
    expect(summary.emitted + summary.deduped).toBe(3);
  });

  test('skips generators with no registered loader (silently)', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('care-gap.v1', async () => [{ kind: 'care-gap', severity: 'low' }]),
        makeStubGenerator('anomaly.v1', async () => [{ kind: 'anomaly', severity: 'high' }]),
      ],
      dataLoaders: { 'care-gap.v1': async () => ({ beneficiaries: [] }) }, // anomaly skipped
      insightsService,
    });

    const summary = await orch.runTick();
    expect(summary.generatorsRun).toBe(1);
    expect(summary.perGenerator.find(p => p.generatorId === 'anomaly.v1').skipped).toBe(true);
    expect(insightsService.calls).toHaveLength(1);
  });

  test('isolates loader throws — one bad generator does not break the tick', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('bad.v1', async () => [{ kind: 'care-gap', severity: 'low' }]),
        makeStubGenerator('good.v1', async () => [{ kind: 'anomaly', severity: 'high' }]),
      ],
      dataLoaders: {
        'bad.v1': async () => {
          throw new Error('mongo down');
        },
        'good.v1': async () => ({ series: [] }),
      },
      insightsService,
      logger: { warn: () => {}, info: () => {} },
    });

    const summary = await orch.runTick();
    expect(summary.failures).toBe(1);
    expect(summary.emitted).toBe(1); // good.v1 still emitted
    expect(summary.perGenerator.find(p => p.generatorId === 'bad.v1').error).toMatch(/loader/);
  });

  test('isolates evaluate throws — counted as failures, tick continues', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('throws.v1', () => {
          throw new Error('boom');
        }),
        makeStubGenerator('ok.v1', async () => [{ kind: 'care-gap', severity: 'low' }]),
      ],
      dataLoaders: {
        'throws.v1': async () => ({}),
        'ok.v1': async () => ({}),
      },
      insightsService,
      logger: { warn: () => {}, info: () => {} },
    });

    const summary = await orch.runTick();
    expect(summary.failures).toBe(1);
    expect(summary.emitted).toBe(1);
    expect(summary.perGenerator.find(p => p.generatorId === 'throws.v1').error).toMatch(/evaluate/);
  });

  test('caps payloads per generator at maxPerGenerator', async () => {
    const insightsService = makeFakeInsightsService();
    const huge = Array.from({ length: 1000 }, () => ({ kind: 'care-gap', severity: 'low' }));
    const orch = createOrchestrator({
      generators: [makeStubGenerator('flood.v1', async () => huge)],
      dataLoaders: { 'flood.v1': async () => ({}) },
      insightsService,
      maxPerGenerator: 50,
      logger: { warn: () => {}, info: () => {} },
    });

    const summary = await orch.runTick();
    expect(insightsService.calls.length).toBe(50);
    expect(summary.emitted + summary.deduped).toBe(50);
  });

  test('treats empty payload array as success (not failure)', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [makeStubGenerator('quiet.v1', async () => [])],
      dataLoaders: { 'quiet.v1': async () => ({}) },
      insightsService,
    });

    const summary = await orch.runTick();
    expect(summary.emitted).toBe(0);
    expect(summary.failures).toBe(0);
    expect(orch.getMetrics()['quiet.v1'].successes).toBe(1);
  });
});

// ─── runGenerator ─────────────────────────────────────────────

describe('orchestrator — runGenerator', () => {
  test('runs only the named generator', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('a.v1', async () => [{ kind: 'care-gap' }]),
        makeStubGenerator('b.v1', async () => [{ kind: 'anomaly' }]),
      ],
      dataLoaders: {
        'a.v1': async () => ({}),
        'b.v1': async () => ({}),
      },
      insightsService,
    });

    const result = await orch.runGenerator('b.v1');
    expect(result.generatorId).toBe('b.v1');
    expect(insightsService.calls).toHaveLength(1);
  });

  test('returns GENERATOR_NOT_FOUND when id is unknown', async () => {
    const orch = createOrchestrator({
      generators: [makeStubGenerator('a.v1', async () => [])],
      dataLoaders: { 'a.v1': async () => ({}) },
      insightsService: makeFakeInsightsService(),
    });
    const result = await orch.runGenerator('does-not-exist');
    expect(result.error).toBe('GENERATOR_NOT_FOUND');
  });
});

// ─── metrics & listGenerators ─────────────────────────────────

describe('orchestrator — metrics + introspection', () => {
  test('metrics accumulate across ticks', async () => {
    const insightsService = makeFakeInsightsService();
    const orch = createOrchestrator({
      generators: [makeStubGenerator('x.v1', async () => [{ kind: 'care-gap' }])],
      dataLoaders: { 'x.v1': async () => ({}) },
      insightsService,
    });
    await orch.runTick();
    await orch.runTick();
    await orch.runTick();
    const m = orch.getMetrics();
    expect(m['x.v1'].runs).toBe(3);
    expect(m['x.v1'].successes).toBe(3);
    expect(m['x.v1'].failures).toBe(0);
    expect(m['x.v1'].lastRunAt).toBeInstanceOf(Date);
  });

  test('listGenerators reports loader status', () => {
    const orch = createOrchestrator({
      generators: [
        makeStubGenerator('with.v1', async () => []),
        makeStubGenerator('without.v1', async () => []),
      ],
      dataLoaders: { 'with.v1': async () => ({}) },
      insightsService: makeFakeInsightsService(),
    });
    const list = orch.listGenerators();
    expect(list.find(g => g.id === 'with.v1').hasLoader).toBe(true);
    expect(list.find(g => g.id === 'without.v1').hasLoader).toBe(false);
  });
});
