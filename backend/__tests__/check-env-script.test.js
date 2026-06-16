/**
 * check-env-script.test.js (W1354)
 *
 * Self-test for the env preflight: the required-key list is the single source
 * of truth (derived from the strict Joi schema), the pure helper detects
 * missing/blank keys, and the report renderer is deterministic. No IO, no boot.
 */
'use strict';

const { STRICT_REQUIRED_KEYS, findMissingStrictEnv } = require('../config/validateEnv');
const { buildReport, HINTS } = require('../scripts/check-env');

describe('env preflight — strict-required keys (W1354)', () => {
  it('STRICT_REQUIRED_KEYS is derived from the strict schema (the 5 security keys)', () => {
    expect(Array.isArray(STRICT_REQUIRED_KEYS)).toBe(true);
    for (const k of [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
    ]) {
      expect(STRICT_REQUIRED_KEYS).toContain(k);
    }
  });

  it('every required key has a generation hint', () => {
    for (const k of STRICT_REQUIRED_KEYS) {
      expect(typeof HINTS[k]).toBe('string');
      expect(HINTS[k].length).toBeGreaterThan(0);
    }
  });

  it('findMissingStrictEnv flags undefined and blank values, accepts set ones', () => {
    const full = {
      MONGODB_URI: 'mongodb://localhost:27017/x',
      JWT_SECRET: 'x'.repeat(40),
      JWT_REFRESH_SECRET: 'y'.repeat(40),
      ENCRYPTION_KEY: 'z'.repeat(40),
      SESSION_SECRET: 'w'.repeat(20),
    };
    expect(findMissingStrictEnv(full)).toEqual([]);

    const partial = { ...full, ENCRYPTION_KEY: '', SESSION_SECRET: '   ' };
    delete partial.JWT_REFRESH_SECRET;
    const missing = findMissingStrictEnv(partial);
    expect(missing).toEqual(
      expect.arrayContaining(['JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET'])
    );
    expect(missing).not.toContain('MONGODB_URI');
    expect(missing).not.toContain('JWT_SECRET');
  });

  it('buildReport is deterministic: ok-line when none missing, actionable list otherwise', () => {
    const okReport = buildReport([]);
    expect(okReport.ok).toBe(true);
    expect(okReport.lines.join('\n')).toMatch(/all \d+ strict-required keys/);

    const badReport = buildReport(['JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']);
    expect(badReport.ok).toBe(false);
    const text = badReport.lines.join('\n');
    expect(text).toContain('JWT_REFRESH_SECRET');
    expect(text).toContain('ENCRYPTION_KEY');
    expect(text).toMatch(/openssl rand/); // hint surfaced
  });
});
