/**
 * Unit Tests — featureFlags.js
 * In-memory feature flag + A/B experiment system
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Fresh instance each test (singleton reset)
let FeatureFlagsClass;
let flags;

beforeEach(() => {
  jest.isolateModules(() => {
    FeatureFlagsClass = require('../../services/featureFlags');
  });
  flags = FeatureFlagsClass;
});

// ═══════════════════════════════════════
//  setFlag / getFlag / getAllFlags
// ═══════════════════════════════════════
describe('setFlag / getFlag / getAllFlags', () => {
  it('getFlag returns config for existing default flag', () => {
    const f = flags.getFlag('enable_dark_mode');
    expect(f).not.toBeNull();
    expect(f.enabled).toBe(true);
    expect(f.rolloutPercentage).toBe(100);
  });

  it('getFlag returns null for unknown flag', () => {
    expect(flags.getFlag('nonexistent_flag')).toBeNull();
  });

  it('setFlag creates new flag', () => {
    flags.setFlag('test_flag', { enabled: true, rolloutPercentage: 50 });
    const f = flags.getFlag('test_flag');
    expect(f.enabled).toBe(true);
    expect(f.rolloutPercentage).toBe(50);
    expect(f.updatedAt).toBeDefined();
  });

  it('setFlag updates existing flag', () => {
    flags.setFlag('enable_dark_mode', { enabled: false, rolloutPercentage: 0 });
    expect(flags.getFlag('enable_dark_mode').enabled).toBe(false);
  });

  it('getAllFlags returns array with name property', () => {
    const all = flags.getAllFlags();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all[0]).toHaveProperty('name');
  });
});

// ═══════════════════════════════════════
//  isEnabled
// ═══════════════════════════════════════
describe('isEnabled', () => {
  it('returns true for enabled flag with 100% rollout', () => {
    expect(flags.isEnabled('enable_dark_mode')).toBe(true);
  });

  it('returns false for disabled flag', () => {
    expect(flags.isEnabled('enable_advanced_search')).toBe(false);
  });

  it('returns false for unknown flag', () => {
    expect(flags.isEnabled('totally_unknown')).toBe(false);
  });

  it('returns true for enabled flag without userId (ignores rollout)', () => {
    flags.setFlag('partial', { enabled: true, rolloutPercentage: 50 });
    // No userId — skips rollout check, returns true
    expect(flags.isEnabled('partial')).toBe(true);
  });

  it('deterministic for same userId', () => {
    flags.setFlag('rollout_test', { enabled: true, rolloutPercentage: 50 });
    const r1 = flags.isEnabled('rollout_test', 'user_abc');
    const r2 = flags.isEnabled('rollout_test', 'user_abc');
    expect(r1).toBe(r2);
  });

  it('100% rollout with userId always returns true', () => {
    expect(flags.isEnabled('enable_dark_mode', 'any_user')).toBe(true);
  });
});

// ═══════════════════════════════════════
//  getUserHash
// ═══════════════════════════════════════
describe('getUserHash', () => {
  it('returns a non-negative integer', () => {
    const h = flags.getUserHash('user123');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
  });

  it('deterministic for same input', () => {
    expect(flags.getUserHash('abc')).toBe(flags.getUserHash('abc'));
  });

  it('different for different inputs', () => {
    expect(flags.getUserHash('user_a')).not.toBe(flags.getUserHash('user_b'));
  });
});

// ═══════════════════════════════════════
//  createExperiment
// ═══════════════════════════════════════
describe('createExperiment', () => {
  it('creates experiment with defaults', () => {
    const exp = flags.createExperiment('exp1', { description: 'Test' });
    expect(exp.name).toBe('exp1');
    expect(exp.variants).toEqual(['control', 'treatment']);
    expect(exp.trafficAllocation).toEqual({ control: 50, treatment: 50 });
    expect(exp.active).toBe(true);
    expect(exp.minSampleSize).toBe(100);
  });

  it('creates experiment with custom variants', () => {
    const exp = flags.createExperiment('exp2', {
      variants: ['a', 'b', 'c'],
      trafficAllocation: { a: 33, b: 33, c: 34 },
    });
    expect(exp.variants).toEqual(['a', 'b', 'c']);
  });
});

// ═══════════════════════════════════════
//  getUserVariant
// ═══════════════════════════════════════
describe('getUserVariant', () => {
  beforeEach(() => {
    flags.createExperiment('ab_test', {
      variants: ['control', 'treatment'],
      trafficAllocation: { control: 50, treatment: 50 },
    });
  });

  it('returns a valid variant', () => {
    const v = flags.getUserVariant('user1', 'ab_test');
    expect(['control', 'treatment']).toContain(v);
  });

  it('deterministic for same user', () => {
    const v1 = flags.getUserVariant('user1', 'ab_test');
    const v2 = flags.getUserVariant('user1', 'ab_test');
    expect(v1).toBe(v2);
  });

  it('throws for unknown experiment', () => {
    expect(() => flags.getUserVariant('user1', 'nonexistent')).toThrow('Unknown experiment');
  });
});

// ═══════════════════════════════════════
//  recordMetric / getExperimentResults
// ═══════════════════════════════════════
describe('recordMetric / getExperimentResults', () => {
  beforeEach(() => {
    flags.createExperiment('conversion_test', {
      variants: ['control', 'treatment'],
      trafficAllocation: { control: 50, treatment: 50 },
      minSampleSize: 2,
    });
  });

  it('recordMetric throws for unknown experiment', () => {
    expect(() => flags.recordMetric('unknown', 'u1', 'clicks', 5)).toThrow('Unknown experiment');
  });

  it('records and retrieves metrics', () => {
    flags.recordMetric('conversion_test', 'user_a', 'clicks', 10);
    flags.recordMetric('conversion_test', 'user_b', 'clicks', 20);

    const results = flags.getExperimentResults('conversion_test');
    expect(results.experimentName).toBe('conversion_test');
    expect(results.variants).toBeDefined();
  });

  it('getExperimentResults throws for unknown', () => {
    expect(() => flags.getExperimentResults('nope')).toThrow('Unknown experiment');
  });
});

// ═══════════════════════════════════════
//  calculateMetrics
// ═══════════════════════════════════════
describe('calculateMetrics', () => {
  it('calculates count/sum/average/min/max', () => {
    const data = [
      { metric: 'clicks', value: 10 },
      { metric: 'clicks', value: 20 },
      { metric: 'clicks', value: 30 },
    ];
    const r = flags.calculateMetrics(data);
    expect(r.clicks.count).toBe(3);
    expect(r.clicks.sum).toBe(60);
    expect(r.clicks.average).toBe(20);
    expect(r.clicks.min).toBe(10);
    expect(r.clicks.max).toBe(30);
  });

  it('handles multiple metric names', () => {
    const data = [
      { metric: 'clicks', value: 5 },
      { metric: 'views', value: 100 },
    ];
    const r = flags.calculateMetrics(data);
    expect(r.clicks).toBeDefined();
    expect(r.views).toBeDefined();
  });

  it('single value', () => {
    const r = flags.calculateMetrics([{ metric: 'x', value: 42 }]);
    expect(r.x.count).toBe(1);
    expect(r.x.average).toBe(42);
    expect(r.x.min).toBe(42);
    expect(r.x.max).toBe(42);
  });
});

// ═══════════════════════════════════════
//  getDashboard
// ═══════════════════════════════════════
describe('getDashboard', () => {
  it('returns flags, experiments, summary', () => {
    const d = flags.getDashboard();
    expect(d).toHaveProperty('flags');
    expect(d).toHaveProperty('experiments');
    expect(d).toHaveProperty('summary');
    expect(d.summary.totalFlags).toBeGreaterThanOrEqual(6);
    expect(typeof d.summary.enabledFlags).toBe('number');
    expect(typeof d.summary.activeExperiments).toBe('number');
  });
});
