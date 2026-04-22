/**
 * progress-engine-locator-wiring.test.js — Phase 9 Commit 12.
 *
 * Proves that the three goalProgressService-keyed red-flags resolve
 * to callable methods after bootstrap:
 *   • clinical.progress.regression.significant → deltaVsBaseline
 *   • clinical.goal.stalled.21d                → daysSinceLastProgress
 *   • clinical.goal.regression.consecutive_2   → consecutiveRatings
 *
 * Source-level + unit checks — no Mongo.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { buildGoalProgressTriggerSource } = require('../services/progressEngine');
const { byId } = require('../config/red-flags.registry');

describe('Phase 9 Commit 12 — goalProgressService trigger merge', () => {
  it('all three goalProgressService-keyed flags declare the service under the shared key', () => {
    const ids = [
      'clinical.progress.regression.significant',
      'clinical.goal.stalled.21d',
      'clinical.goal.regression.consecutive_2',
    ];
    for (const id of ids) {
      const flag = byId(id);
      expect(flag).not.toBeNull();
      expect(flag.trigger.source.service).toBe('goalProgressService');
    }
  });

  it('the three flags declare distinct methods on the shared service', () => {
    const methods = [
      'clinical.progress.regression.significant',
      'clinical.goal.stalled.21d',
      'clinical.goal.regression.consecutive_2',
    ].map(id => byId(id).trigger.source.method);
    expect(new Set(methods).size).toBe(3);
    expect(methods).toContain('deltaVsBaseline');
    expect(methods).toContain('daysSinceLastProgress');
    expect(methods).toContain('consecutiveRatings');
  });

  it('buildGoalProgressTriggerSource exposes the two progressEngine methods', async () => {
    const src = buildGoalProgressTriggerSource({
      fetchEntries: async () => [],
    });
    expect(typeof src.consecutiveRatings).toBe('function');
    expect(typeof src.daysSinceLastProgress).toBe('function');

    const streak = await src.consecutiveRatings('goal-x');
    expect(streak.regressedStreak).toBe(0);
    const daysOut = await src.daysSinceLastProgress('goal-x');
    expect(daysOut.daysSince).toBe(Number.POSITIVE_INFINITY);
  });

  it('merge pattern: spreading baseObs + progressLifecycle produces all three methods', async () => {
    // Simulates exactly what redFlagBootstrap does at runtime. Ensures
    // Object.freeze on baseObs doesn't block Object.assign from reading.
    const frozenBase = Object.freeze({
      async deltaVsBaseline() {
        return { deltaPct: -5 };
      },
    });
    const lifecycle = buildGoalProgressTriggerSource({
      fetchEntries: async () => [],
    });
    const merged = Object.assign({}, frozenBase, lifecycle);
    expect(typeof merged.deltaVsBaseline).toBe('function');
    expect(typeof merged.daysSinceLastProgress).toBe('function');
    expect(typeof merged.consecutiveRatings).toBe('function');
  });

  it('bootstrap source declares the merge + progressEngine require', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../startup/redFlagBootstrap.js'), 'utf8');
    expect(src).toContain("require('../services/progressEngine')");
    expect(src).toContain('buildGoalProgressTriggerSource');
    expect(src).toContain('progressLifecycle');
    expect(src).toContain('Object.assign({}, baseObs, progressLifecycle)');
  });
});
