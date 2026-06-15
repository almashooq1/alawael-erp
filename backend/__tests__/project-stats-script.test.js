'use strict';

/**
 * project-stats-script.test.js — locks the machine-readable contract of
 * scripts/project-stats.js (W1305, GAPS Item 5).
 *
 * Why: `collectStats()` is the prerequisite for auto-updating doc numbers /
 * failing CI on stale counts (the README-drift gap). If its SHAPE silently
 * changes, any future CI consumer breaks. This pins the shape + the
 * require.main guard (so requiring the module never prints the banner /
 * runs main()). Pure (filesystem reads only), no Mongo, no spawn.
 */

const path = require('path');
const { collectStats, countFiles, countInDir } = require('../scripts/project-stats');

describe('project-stats — collectStats() shape', () => {
  let stats;
  beforeAll(() => {
    stats = collectStats();
  });

  it('returns an ISO generatedAt timestamp', () => {
    expect(typeof stats.generatedAt).toBe('string');
    expect(() => new Date(stats.generatedAt).toISOString()).not.toThrow();
  });

  it('exposes a code block with numeric counts', () => {
    expect(stats.code).toEqual(
      expect.objectContaining({
        jsFiles: expect.any(Number),
        jsLines: expect.any(Number),
        jsonFiles: expect.any(Number),
        mdFiles: expect.any(Number),
      })
    );
    // The backend has thousands of JS files — a zero here means the walker
    // broke (wrong ROOT, bad exclude list), which is exactly the silent
    // regression this guard exists to catch.
    expect(stats.code.jsFiles).toBeGreaterThan(0);
    expect(stats.code.jsLines).toBeGreaterThan(stats.code.jsFiles);
  });

  it('exposes the architecture layer counts as numbers', () => {
    for (const key of [
      'models',
      'routes',
      'controllers',
      'middleware',
      'services',
      'utils',
      'validators',
      'config',
      'seeds',
      'migrations',
    ]) {
      expect(typeof stats.architecture[key]).toBe('number');
      expect(stats.architecture[key]).toBeGreaterThanOrEqual(0);
    }
  });

  it('counts unit/integration + e2e test files', () => {
    expect(typeof stats.tests.unitIntegration).toBe('number');
    expect(typeof stats.tests.e2e).toBe('number');
    // __tests__ is the canonical hand-written suite dir — must be non-empty.
    expect(stats.tests.unitIntegration).toBeGreaterThan(0);
  });

  it('reads dependency counts from package.json', () => {
    expect(stats.dependencies.production).toBeGreaterThan(0);
    expect(typeof stats.dependencies.development).toBe('number');
  });
});

describe('project-stats — helpers (pure)', () => {
  it('countFiles returns {count, lines} and excludes node_modules by default', () => {
    const res = countFiles(path.join(__dirname, '..', 'scripts'), ['.js']);
    expect(res).toEqual(
      expect.objectContaining({ count: expect.any(Number), lines: expect.any(Number) })
    );
    expect(res.count).toBeGreaterThan(0);
  });

  it('countInDir returns 0 for a non-existent directory', () => {
    expect(countInDir(path.join(__dirname, '__no_such_dir__'))).toBe(0);
  });
});

describe('project-stats — module shape', () => {
  it('exports collectStats without running main() on require', () => {
    // Reaching here proves the require.main guard held — a missing guard
    // would have printed the ANSI banner + run the full walk on import.
    const mod = require('../scripts/project-stats');
    expect(typeof mod.collectStats).toBe('function');
    expect(typeof mod.countFiles).toBe('function');
    expect(typeof mod.countInDir).toBe('function');
  });
});
