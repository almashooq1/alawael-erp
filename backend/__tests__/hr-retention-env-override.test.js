'use strict';

/**
 * hr-retention-env-override.test.js — Phase 11 Commit 36 (4.0.51).
 *
 * Pure tests for the env-driven policy override loader. No DB.
 */

const {
  validatePolicies,
  resolveActivePolicies,
  POLICIES,
} = require('../config/hr-retention-policies');

// ─── validatePolicies ───────────────────────────────────────────

describe('validatePolicies', () => {
  it('rejects non-array', () => {
    expect(validatePolicies(null).ok).toBe(false);
    expect(validatePolicies({}).ok).toBe(false);
    expect(validatePolicies('bogus').ok).toBe(false);
  });

  it('rejects empty array', () => {
    expect(validatePolicies([]).ok).toBe(false);
  });

  it('rejects entry without tag', () => {
    const res = validatePolicies([{ archiveAfterDays: 100, purgeAfterDays: 300 }]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/valid tag/);
  });

  it('rejects duplicate tags', () => {
    const res = validatePolicies([
      { tag: 'hr:a', archiveAfterDays: 100, purgeAfterDays: 300 },
      { tag: 'hr:a', archiveAfterDays: 200, purgeAfterDays: 500 },
    ]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/duplicate/);
  });

  it('rejects non-numeric archiveAfterDays', () => {
    const res = validatePolicies([{ tag: 'hr:x', archiveAfterDays: 'lots', purgeAfterDays: 300 }]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/archiveAfterDays/);
  });

  it('rejects zero or negative days', () => {
    const a = validatePolicies([{ tag: 'hr:x', archiveAfterDays: 0, purgeAfterDays: 100 }]);
    const b = validatePolicies([{ tag: 'hr:x', archiveAfterDays: 100, purgeAfterDays: -1 }]);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it('rejects purge <= archive', () => {
    const res = validatePolicies([{ tag: 'hr:x', archiveAfterDays: 500, purgeAfterDays: 500 }]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/purgeAfterDays must be > archiveAfterDays/);
  });

  it('accepts a valid policy array', () => {
    const res = validatePolicies([
      { tag: 'hr:a', archiveAfterDays: 100, purgeAfterDays: 300 },
      { tag: 'hr:b', archiveAfterDays: 200, purgeAfterDays: 500 },
    ]);
    expect(res.ok).toBe(true);
    expect(res.policies).toHaveLength(2);
  });
});

// ─── resolveActivePolicies ──────────────────────────────────────

describe('resolveActivePolicies', () => {
  it('returns default + source="default" when env is empty', () => {
    const res = resolveActivePolicies('');
    expect(res.source).toBe('default');
    expect(res.policies.length).toBe(POLICIES.length);
  });

  it('returns default when env is undefined', () => {
    const res = resolveActivePolicies(undefined);
    // Note: this reads from process.env; unset it to be deterministic
    // in the test runner. Most CI env won't have it set.
    if (process.env.HR_RETENTION_POLICY_JSON === undefined) {
      expect(res.source).toBe('default');
    }
  });

  it('parses valid JSON and uses it (source="env")', () => {
    const env = JSON.stringify([
      { tag: 'hr:anomaly', archiveAfterDays: 100, purgeAfterDays: 1000, priority: 1 },
      { tag: 'hr:dashboard', archiveAfterDays: 30, purgeAfterDays: 90, priority: 99 },
    ]);
    const res = resolveActivePolicies(env);
    expect(res.source).toBe('env');
    expect(res.policies).toHaveLength(2);
    // Sorted by priority
    expect(res.policies[0].tag).toBe('hr:anomaly');
    expect(res.policies[1].tag).toBe('hr:dashboard');
  });

  it('falls back to default on parse failure + surfaces error', () => {
    const res = resolveActivePolicies('not-valid-json {{{');
    expect(res.source).toBe('default');
    expect(res.fallback).toBeDefined();
    expect(res.fallback.reason).toBe('parse_failed');
    expect(res.fallback.error).toBeDefined();
    expect(res.policies.length).toBe(POLICIES.length);
  });

  it('falls back to default on validation failure + surfaces error', () => {
    const env = JSON.stringify([{ tag: 'hr:x', archiveAfterDays: 500, purgeAfterDays: 500 }]);
    const res = resolveActivePolicies(env);
    expect(res.source).toBe('default');
    expect(res.fallback.reason).toBe('validation_failed');
    expect(res.fallback.error).toMatch(/purgeAfterDays/);
    expect(res.policies.length).toBe(POLICIES.length);
  });

  it('sorts env-loaded policies by priority ascending', () => {
    const env = JSON.stringify([
      { tag: 'hr:last', archiveAfterDays: 100, purgeAfterDays: 300, priority: 90 },
      { tag: 'hr:first', archiveAfterDays: 200, purgeAfterDays: 500, priority: 5 },
      { tag: 'hr:mid', archiveAfterDays: 150, purgeAfterDays: 400, priority: 50 },
    ]);
    const res = resolveActivePolicies(env);
    expect(res.source).toBe('env');
    expect(res.policies.map(p => p.tag)).toEqual(['hr:first', 'hr:mid', 'hr:last']);
  });

  it('never throws on garbage input', () => {
    const cases = [
      '[1, 2, 3]', // array of primitives
      '{"not": "array"}',
      '"scalar"',
      'null',
      'true',
      '',
    ];
    for (const input of cases) {
      expect(() => resolveActivePolicies(input)).not.toThrow();
    }
  });
});
