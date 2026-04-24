/**
 * isolationForest.service.js — Tier 3 multivariate anomaly
 * detection (Phase 18 Commit 7).
 *
 * Implements a lightweight, dependency-free version of Isolation
 * Forest (Liu, Ting, Zhou — 2008). Anomalies are points that can
 * be isolated with few random splits; normal points need many.
 *
 * The implementation is intentionally compact + deterministic so
 * it can ship without a native ML library:
 *
 *   - **Random split trees**: each tree picks a random feature +
 *     a random threshold on each node, then recurses until the
 *     subset is size 1 or the max depth is hit.
 *   - **Sub-sampling**: each tree is trained on a random
 *     `sampleSize` subset (default 64).
 *   - **Anomaly score**: averaged path length over the forest
 *     normalised by the expected path length of BST on
 *     `sampleSize` → score ∈ (0, 1]. s > 0.6 → anomaly.
 *   - **Deterministic PRNG**: Mulberry32 seeded via an injected
 *     seed so tests are fully reproducible.
 *
 * The "features" for a KPI are any numeric vector the caller
 * provides — in the dashboard platform we use `[value, delta]` by
 * default but operators can inject richer feature extractors
 * (seasonal lag, cohort sliced counts, etc.) later.
 *
 * Pure functions + factory — no I/O, no DB.
 */

'use strict';

const EULER_MASCHERONI = 0.5772156649;

function expectedPathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + EULER_MASCHERONI) - (2 * (n - 1)) / n;
}

// Mulberry32 — small, fast, deterministic PRNG. We take a 32-bit
// seed and produce a function that returns floats in [0, 1).
function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, lo, hi) {
  if (hi <= lo) return lo;
  return Math.floor(lo + rng() * (hi - lo));
}

function pickSubsample(rng, points, sampleSize) {
  if (points.length <= sampleSize) return points.slice();
  const indices = new Set();
  while (indices.size < sampleSize) {
    indices.add(randomInt(rng, 0, points.length));
  }
  return Array.from(indices).map(i => points[i]);
}

function buildTree(points, depth, maxDepth, rng) {
  if (points.length <= 1 || depth >= maxDepth) {
    return { leaf: true, size: points.length };
  }
  const featureCount = points[0].length;
  const featureIndex = randomInt(rng, 0, featureCount);
  // Pick split value between min + max of this feature.
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const v = p[featureIndex];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { leaf: true, size: points.length };
  const split = min + rng() * (max - min);
  const left = [];
  const right = [];
  for (const p of points) {
    if (p[featureIndex] < split) left.push(p);
    else right.push(p);
  }
  if (left.length === 0 || right.length === 0) {
    return { leaf: true, size: points.length };
  }
  return {
    leaf: false,
    featureIndex,
    split,
    left: buildTree(left, depth + 1, maxDepth, rng),
    right: buildTree(right, depth + 1, maxDepth, rng),
  };
}

function pathLength(tree, point, depth = 0) {
  if (tree.leaf) return depth + expectedPathLength(tree.size);
  if (point[tree.featureIndex] < tree.split) {
    return pathLength(tree.left, point, depth + 1);
  }
  return pathLength(tree.right, point, depth + 1);
}

function trainForest({ points, numTrees = 50, sampleSize = 64, seed = 1 }) {
  if (!Array.isArray(points) || points.length === 0) {
    return { trees: [], sampleSize, numTrees, featureCount: 0 };
  }
  const featureCount = points[0].length;
  const maxDepth = Math.ceil(Math.log2(Math.max(2, sampleSize)));
  const rng = mulberry32(seed);
  const trees = [];
  for (let i = 0; i < numTrees; i += 1) {
    const subsample = pickSubsample(rng, points, sampleSize);
    trees.push(buildTree(subsample, 0, maxDepth, rng));
  }
  return { trees, sampleSize, numTrees, featureCount };
}

function scorePoint(forest, point) {
  if (!forest || !Array.isArray(forest.trees) || forest.trees.length === 0) return 0;
  const avgPath = forest.trees.reduce((s, t) => s + pathLength(t, point), 0) / forest.trees.length;
  const expected = expectedPathLength(forest.sampleSize);
  if (expected <= 0) return 0;
  return 2 ** (-avgPath / expected);
}

function buildIsolationForestDetector({
  numTrees = 50,
  sampleSize = 64,
  seed = 1,
  threshold = 0.6,
  featureExtractor = defaultFeatureExtractor,
} = {}) {
  function detect({ history = [], current }) {
    if (!Array.isArray(history) || history.length < 8) {
      return {
        anomaly: false,
        score: null,
        reason: `insufficient_history:${(history || []).length}/8`,
        threshold,
      };
    }
    let trainingPoints;
    try {
      trainingPoints = history.map(h => featureExtractor(h));
    } catch (_) {
      return { anomaly: false, score: null, reason: 'feature_extractor_failed', threshold };
    }
    const valid = trainingPoints.filter(
      v => Array.isArray(v) && v.length > 0 && v.every(n => Number.isFinite(n))
    );
    if (valid.length < 8) {
      return { anomaly: false, score: null, reason: 'insufficient_valid_points', threshold };
    }

    const effSampleSize = Math.min(sampleSize, valid.length);
    const forest = trainForest({
      points: valid,
      numTrees,
      sampleSize: effSampleSize,
      seed,
    });

    let currentVec;
    try {
      currentVec = featureExtractor(current);
    } catch (_) {
      return { anomaly: false, score: null, reason: 'current_feature_extractor_failed', threshold };
    }
    if (!Array.isArray(currentVec) || !currentVec.every(n => Number.isFinite(n))) {
      return { anomaly: false, score: null, reason: 'invalid_current_features', threshold };
    }

    const score = scorePoint(forest, currentVec);
    return {
      anomaly: score >= threshold,
      score,
      reason: score >= threshold ? 'isolation_forest_flag' : 'within_forest_normal',
      threshold,
      forestMeta: { numTrees, sampleSize: effSampleSize, featureCount: forest.featureCount },
    };
  }

  return { detect };
}

function defaultFeatureExtractor(record) {
  if (record && Array.isArray(record)) return record;
  if (record && typeof record === 'object' && 'v' in record) {
    return [Number(record.v)];
  }
  if (typeof record === 'number') return [record];
  return [0];
}

module.exports = {
  buildIsolationForestDetector,
  trainForest,
  scorePoint,
  expectedPathLength,
  _internals: {
    mulberry32,
    randomInt,
    pickSubsample,
    pathLength,
    buildTree,
    defaultFeatureExtractor,
  },
};
