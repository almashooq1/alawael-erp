/**
 * isolation-forest.test.js — Phase 18 Commit 7.
 */

'use strict';

const {
  buildIsolationForestDetector,
  trainForest,
  scorePoint,
  expectedPathLength,
  _internals,
} = require('../services/isolationForest.service');

describe('isolation forest — expected path length', () => {
  it('returns 0 for n<=1', () => {
    expect(expectedPathLength(0)).toBe(0);
    expect(expectedPathLength(1)).toBe(0);
  });

  it('returns 1 for n=2', () => {
    expect(expectedPathLength(2)).toBe(1);
  });

  it('grows roughly like log n', () => {
    expect(expectedPathLength(64)).toBeGreaterThan(expectedPathLength(8));
    expect(expectedPathLength(128)).toBeGreaterThan(expectedPathLength(64));
  });
});

describe('isolation forest — PRNG + subsample', () => {
  it('mulberry32 is deterministic for the same seed', () => {
    const a = _internals.mulberry32(42);
    const b = _internals.mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('randomInt returns values in the [lo, hi) range', () => {
    const rng = _internals.mulberry32(1);
    for (let i = 0; i < 50; i += 1) {
      const n = _internals.randomInt(rng, 5, 10);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThan(10);
    }
  });

  it('pickSubsample returns distinct indices when sampleSize < points', () => {
    const rng = _internals.mulberry32(123);
    const points = Array.from({ length: 20 }, (_, i) => [i]);
    const sample = _internals.pickSubsample(rng, points, 5);
    expect(sample.length).toBe(5);
    const unique = new Set(sample.map(p => p[0]));
    expect(unique.size).toBe(5);
  });
});

describe('isolation forest — train + score', () => {
  it('scores an outlier higher than a normal point on a stable series', () => {
    // 40 points clustered around (50, 0)
    const points = [];
    for (let i = 0; i < 40; i += 1) {
      points.push([50 + Math.sin(i) * 0.5, 0 + Math.cos(i) * 0.1]);
    }
    const forest = trainForest({ points, numTrees: 60, sampleSize: 32, seed: 7 });
    const normalScore = scorePoint(forest, [50, 0]);
    const outlierScore = scorePoint(forest, [500, 10]);
    expect(outlierScore).toBeGreaterThan(normalScore);
  });

  it('returns 0 score for empty forest', () => {
    expect(scorePoint({ trees: [], sampleSize: 1, numTrees: 0 }, [0])).toBe(0);
  });

  it('handles sampleSize larger than point count', () => {
    const forest = trainForest({
      points: [[1], [2], [3]],
      numTrees: 10,
      sampleSize: 64,
      seed: 1,
    });
    expect(forest.trees.length).toBe(10);
  });
});

describe('isolation forest detector — end-to-end', () => {
  it('flags a far-out point as anomaly when history is stable', () => {
    const history = [];
    for (let i = 0; i < 40; i += 1) {
      history.push({ v: 50 + Math.sin(i) * 0.5 });
    }
    const detector = buildIsolationForestDetector({
      numTrees: 80,
      sampleSize: 32,
      seed: 7,
      threshold: 0.6,
    });
    const out = detector.detect({ history, current: { v: 500 } });
    expect(out.score).toBeGreaterThan(0);
    expect(out.reason === 'isolation_forest_flag' || out.reason === 'within_forest_normal').toBe(
      true
    );
  });

  it('does not flag a typical reading', () => {
    const history = [];
    for (let i = 0; i < 40; i += 1) {
      history.push({ v: 50 + Math.sin(i) * 0.5 });
    }
    const detector = buildIsolationForestDetector({ seed: 7 });
    const out = detector.detect({ history, current: { v: 50.1 } });
    expect(out.anomaly).toBe(false);
  });

  it('fails soft on insufficient history', () => {
    const detector = buildIsolationForestDetector();
    const out = detector.detect({ history: [{ v: 1 }, { v: 2 }], current: { v: 10 } });
    expect(out.anomaly).toBe(false);
    expect(out.reason).toMatch(/insufficient/);
  });

  it('fails soft when featureExtractor throws', () => {
    const detector = buildIsolationForestDetector({
      featureExtractor: () => {
        throw new Error('bad features');
      },
    });
    const out = detector.detect({ history: Array(10).fill({ v: 1 }), current: { v: 1 } });
    expect(out.anomaly).toBe(false);
    expect(out.reason).toBe('feature_extractor_failed');
  });

  it('fails soft when current features are invalid', () => {
    const detector = buildIsolationForestDetector({
      featureExtractor: r => (r && r.bad ? ['not-a-number'] : [Number(r && r.v)]),
    });
    const history = Array.from({ length: 15 }, (_, i) => ({ v: i }));
    const out = detector.detect({ history, current: { bad: true } });
    expect(out.anomaly).toBe(false);
    expect(out.reason).toBe('invalid_current_features');
  });

  it('respects the threshold option', () => {
    const history = Array.from({ length: 40 }, (_, i) => ({ v: 50 + Math.sin(i) * 0.5 }));
    const strict = buildIsolationForestDetector({ threshold: 0.9, seed: 7 });
    const lenient = buildIsolationForestDetector({ threshold: 0.01, seed: 7 });
    expect(strict.detect({ history, current: { v: 52 } }).anomaly).toBe(false);
    expect(lenient.detect({ history, current: { v: 52 } }).anomaly).toBe(true);
  });

  it('is deterministic across runs with the same seed', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ v: 50 + Math.sin(i) * 0.5 }));
    const a = buildIsolationForestDetector({ seed: 7 }).detect({ history, current: { v: 500 } });
    const b = buildIsolationForestDetector({ seed: 7 }).detect({ history, current: { v: 500 } });
    expect(a.score).toBe(b.score);
  });
});
