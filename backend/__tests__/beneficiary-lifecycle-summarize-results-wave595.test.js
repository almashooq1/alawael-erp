'use strict';

/**
 * beneficiary-lifecycle-summarize-results-wave595.test.js — Wave 595.
 *
 * Covers the NEW W595 feature `summarizeSideEffectResults` — the pure operational
 * reducer that turns a side-effects dispatch run (array of per-op handler
 * results) into an actionable summary for the audit / dashboard layer.
 *
 * Pure unit — no DB, no Express boot. Builds the real handler map (no models →
 * deferred handlers run, real handlers self-skip) to feed REAL result shapes
 * into the reducer, plus synthetic rows for the data-mutation + failed paths.
 */

const {
  createBeneficiaryLifecycleSideEffectHandlers,
  summarizeSideEffectResults,
  allRegistryOps,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

describe('W595 — summarizeSideEffectResults is a total, actionable reducer', () => {
  test('non-array / empty input yields an all-zero summary (never throws)', () => {
    for (const bad of [undefined, null, 42, 'x', {}, []]) {
      const s = summarizeSideEffectResults(bad);
      expect(s.total).toBe(0);
      expect(s.real).toBe(0);
      expect(s.deferred).toBe(0);
      expect(s.dataMutations.total).toBe(0);
      expect(s.byCategory).toEqual({
        data: 0,
        notification: 0,
        compliance: 0,
        workflow: 0,
        unknown: 0,
      });
    }
  });

  test('aggregates real data-handler mutation counts', () => {
    const results = [
      { name: OP.END_ACTIVE_SCHEDULES, category: 'data', cancelledAppointments: 3 },
      { name: OP.CLOSE_OPEN_EPISODES, category: 'data', closedEpisodes: 2 },
      { name: OP.RELEASE_CARE_TEAM, category: 'data', releasedFromEpisodes: 5 },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.total).toBe(3);
    expect(s.real).toBe(3);
    expect(s.byCategory.data).toBe(3);
    expect(s.dataMutations.cancelledAppointments).toBe(3);
    expect(s.dataMutations.closedEpisodes).toBe(2);
    expect(s.dataMutations.releasedFromEpisodes).toBe(5);
    expect(s.dataMutations.total).toBe(10);
  });

  test('self-skipped data handlers count as real but contribute no mutations', () => {
    const results = [
      {
        name: OP.END_ACTIVE_SCHEDULES,
        category: 'data',
        skipped: true,
        reason: 'appointment-model-unavailable',
      },
      {
        name: OP.CLOSE_OPEN_EPISODES,
        category: 'data',
        skipped: true,
        reason: 'episode-model-unavailable',
      },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.real).toBe(2);
    expect(s.skipped).toBe(2);
    expect(s.dataMutations.total).toBe(0);
  });

  test('counts deferred + emitted + category buckets from a real dispatch run', async () => {
    // No models → real ops self-skip, every other op runs as a deferred handler.
    let emittedCount = 0;
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      eventSink: () => {
        emittedCount += 1;
      },
      now: () => new Date('2026-05-30T00:00:00.000Z'),
      logger: { warn() {} },
    });
    const ctx = { beneficiaryId: 'bene-595', toState: 'discharged' };
    const results = [];
    for (const op of allRegistryOps()) {
      results.push(await handlers[op](ctx));
    }
    const s = summarizeSideEffectResults(results);
    expect(s.total).toBe(results.length);
    // three real ops self-skip (category data), the rest are deferred + emitted
    expect(s.real).toBe(3);
    expect(s.byCategory.data).toBe(3);
    expect(s.deferred).toBe(results.length - 3);
    expect(s.emitted).toBe(results.length - 3);
    expect(s.emitted).toBe(emittedCount);
    // every deferred op is one of the three downstream categories
    expect(s.byCategory.notification + s.byCategory.compliance + s.byCategory.workflow).toBe(
      s.deferred
    );
    expect(s.byCategory.unknown).toBe(0);
  });

  test('failed rows and malformed entries are counted defensively', () => {
    const results = [
      { name: 'x', status: 'failed' },
      { failed: true, category: 'workflow' },
      null,
      'garbage',
      { category: 'mystery' },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.total).toBe(5);
    expect(s.failed).toBe(2);
    // categoryless 'failed' row + null + 'garbage' + mystery-category = 4 unknown
    expect(s.byCategory.unknown).toBe(4);
    expect(s.byCategory.workflow).toBe(1);
  });

  test('negative / non-finite mutation counts are clamped to zero', () => {
    const results = [
      { category: 'data', cancelledAppointments: -4 },
      { category: 'data', closedEpisodes: NaN },
      { category: 'data', releasedFromEpisodes: Infinity },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.dataMutations.total).toBe(0);
    expect(s.real).toBe(3);
  });

  test('W651 — health.ok is true and failedRatio 0 when nothing failed', () => {
    const results = [
      { category: 'data', cancelledAppointments: 2 },
      { category: 'notification', emitted: true },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.health).toEqual({
      ok: true,
      clean: true,
      mutated: true,
      failedRatio: 0,
      skippedRatio: 0,
    });
  });

  test('W651 — health flags a degraded run with a rounded failedRatio', () => {
    const results = [
      { category: 'data', cancelledAppointments: 1 },
      { status: 'failed' },
      { failed: true },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.failed).toBe(2);
    expect(s.health.ok).toBe(false);
    expect(s.health.failedRatio).toBeCloseTo(0.6667, 4);
  });

  test('W651 — empty input yields ok:true and failedRatio 0 (no divide-by-zero)', () => {
    const s = summarizeSideEffectResults([]);
    expect(s.health).toEqual({
      ok: true,
      clean: true,
      mutated: false,
      failedRatio: 0,
      skippedRatio: 0,
    });
  });

  test('W652 — health.clean is false when a handler was skipped even with no failures', () => {
    const results = [
      { name: OP.END_ACTIVE_SCHEDULES, category: 'data', skipped: true, reason: 'appointment-model-unavailable' },
      { category: 'data', cancelledAppointments: 1 },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.health.ok).toBe(true); // nothing failed
    expect(s.health.clean).toBe(false); // but a real cleanup was skipped
    expect(s.health.failedRatio).toBe(0);
    expect(s.health.skippedRatio).toBeCloseTo(0.5, 4);
  });

  test('W652 — health.skippedRatio is rounded and clean stays true on a fully-executed run', () => {
    const results = [
      { category: 'data', cancelledAppointments: 2 },
      { category: 'notification', emitted: true },
      { category: 'compliance', deferred: true },
    ];
    const s = summarizeSideEffectResults(results);
    expect(s.health.clean).toBe(true);
    expect(s.health.skippedRatio).toBe(0);
  });

  test('W653 — health.mutated is true only when real data mutations occurred', () => {
    const withImpact = summarizeSideEffectResults([
      { category: 'data', closedEpisodes: 2 },
      { category: 'notification', emitted: true },
    ]);
    expect(withImpact.dataMutations.total).toBe(2);
    expect(withImpact.health.mutated).toBe(true);
    expect(withImpact.health.clean).toBe(true);
  });

  test('W653 — a clean run that touched no beneficiary data is flagged mutated:false (benign no-op)', () => {
    const noOp = summarizeSideEffectResults([
      { category: 'notification', emitted: true },
      { category: 'compliance', deferred: true },
    ]);
    expect(noOp.health.ok).toBe(true);
    expect(noOp.health.clean).toBe(true);
    expect(noOp.dataMutations.total).toBe(0);
    expect(noOp.health.mutated).toBe(false);
  });

  test('W653 — a deferred data op does not count as a mutation', () => {
    const deferredData = summarizeSideEffectResults([
      { category: 'data', deferred: true, closedEpisodes: 5 },
    ]);
    expect(deferredData.dataMutations.total).toBe(0);
    expect(deferredData.health.mutated).toBe(false);
  });
});
