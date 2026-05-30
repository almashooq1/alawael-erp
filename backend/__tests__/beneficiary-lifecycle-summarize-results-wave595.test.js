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
      { name: OP.END_ACTIVE_SCHEDULES, category: 'data', skipped: true, reason: 'appointment-model-unavailable' },
      { name: OP.CLOSE_OPEN_EPISODES, category: 'data', skipped: true, reason: 'episode-model-unavailable' },
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
    expect(
      s.byCategory.notification + s.byCategory.compliance + s.byCategory.workflow
    ).toBe(s.deferred);
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
    expect(s.health).toEqual({ ok: true, failedRatio: 0 });
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
    expect(s.health).toEqual({ ok: true, failedRatio: 0 });
  });
});
