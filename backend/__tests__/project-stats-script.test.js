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
const {
  collectStats,
  countFiles,
  countInDir,
  renderStatsBlock,
  extractStatsBlock,
  applyStatsBlock,
  checkStatsBlock,
  STATS_MARKER_START,
  STATS_MARKER_END,
} = require('../scripts/project-stats');

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

describe('project-stats — stats-block automation (GAPS Item 5 doc-drift gate)', () => {
  // A deterministic fixture so the rendered block is independent of the live
  // repo (the live shape is covered by the collectStats() tests above).
  const FIXTURE = {
    generatedAt: '2026-06-16T00:00:00.000Z',
    code: { jsFiles: 5000, jsLines: 999999, jsonFiles: 300, mdFiles: 200 },
    architecture: {
      models: 920,
      routes: 501,
      controllers: 80,
      middleware: 40,
      services: 300,
      utils: 60,
      validators: 70,
      config: 10,
      seeds: 5,
      migrations: 12,
    },
    tests: { unitIntegration: 2979, e2e: 14 },
    dependencies: { production: 120, development: 60 },
  };

  it('renders a deterministic block between the two markers', () => {
    const a = renderStatsBlock(FIXTURE);
    const b = renderStatsBlock(FIXTURE);
    expect(a).toBe(b);
    expect(a.startsWith(STATS_MARKER_START)).toBe(true);
    expect(a.endsWith(STATS_MARKER_END)).toBe(true);
  });

  it('includes drift-meaningful counts but NOT volatile jsLines / timestamp', () => {
    const block = renderStatsBlock(FIXTURE);
    expect(block).toContain('| Models | 920 |');
    expect(block).toContain('| Routes | 501 |');
    expect(block).toContain('| Tests (unit/integration) | 2979 |');
    expect(block).toContain('| Dependencies (prod) | 120 |');
    // Volatile values must be excluded so the gate fires on structure, not edits.
    expect(block).not.toContain('999999');
    expect(block).not.toContain('2026-06-16T00:00:00');
  });

  it('extractStatsBlock returns null when markers are absent', () => {
    expect(extractStatsBlock('# README\n\nno markers here')).toBe(null);
    expect(extractStatsBlock('')).toBe(null);
    expect(extractStatsBlock(null)).toBe(null);
  });

  it('extractStatsBlock round-trips an embedded block', () => {
    const block = renderStatsBlock(FIXTURE);
    const doc = `# Title\n\n${block}\n\nmore text`;
    expect(extractStatsBlock(doc)).toBe(block);
  });

  it('applyStatsBlock appends at EOF when no block exists yet', () => {
    const block = renderStatsBlock(FIXTURE);
    const out = applyStatsBlock('# README', block);
    expect(out).toContain('# README');
    expect(extractStatsBlock(out)).toBe(block);
  });

  it('applyStatsBlock replaces an existing (stale) block in place', () => {
    const stale = renderStatsBlock(FIXTURE);
    const doc = `intro\n\n${stale}\n\noutro`;
    const fresh = renderStatsBlock({
      ...FIXTURE,
      architecture: { ...FIXTURE.architecture, routes: 502 },
    });
    const out = applyStatsBlock(doc, fresh);
    expect(out).toContain('intro');
    expect(out).toContain('outro');
    expect(out).toContain('| Routes | 502 |');
    expect(out).not.toContain('| Routes | 501 |');
    // No duplicate block — exactly one marker pair remains.
    expect(out.split(STATS_MARKER_START).length - 1).toBe(1);
  });

  it('checkStatsBlock reports missing, stale, and up-to-date states', () => {
    const block = renderStatsBlock(FIXTURE);
    expect(checkStatsBlock('no markers', block)).toEqual({
      ok: false,
      reason: expect.stringMatching(/no PROJECT-STATS block/),
    });
    expect(checkStatsBlock(`x\n${block}\ny`, block)).toEqual({ ok: true, reason: 'up to date' });
    const stale = renderStatsBlock({
      ...FIXTURE,
      architecture: { ...FIXTURE.architecture, models: 921 },
    });
    expect(checkStatsBlock(`x\n${stale}\ny`, block).ok).toBe(false);
  });

  it('write-then-check is consistent against live stats', () => {
    const rendered = renderStatsBlock(collectStats());
    const written = applyStatsBlock('# Live\n', rendered);
    expect(checkStatsBlock(written, rendered)).toEqual({ ok: true, reason: 'up to date' });
  });
});
