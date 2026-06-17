'use strict';

/**
 * W1395 — minimal runtime env template guard.
 *
 * Locks `backend/.env.minimum.example` to the strict runtime contract from
 * `config/validateEnv.js` so minimum-operational docs do not drift.
 */

const fs = require('fs');
const path = require('path');

const { STRICT_REQUIRED_KEYS } = require('../config/validateEnv');

const MIN_ENV = path.join(__dirname, '..', '.env.minimum.example');

/**
 * @param {string} text
 * @returns {Set<string>}
 */
function assignableKeys(text) {
  const keys = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z0-9_]+)\s*=/.exec(line);
    if (m) keys.add(m[1]);
  }
  return keys;
}

describe('W1395 — .env.minimum.example matches strict env contract', () => {
  const text = fs.readFileSync(MIN_ENV, 'utf8');
  const keys = assignableKeys(text);

  test('strict-required keys are all documented in minimum template', () => {
    const missing = STRICT_REQUIRED_KEYS.filter(k => !keys.has(k));
    expect(missing).toEqual([]);
  });

  test('minimum template keeps essential runtime anchors', () => {
    expect(keys.has('NODE_ENV')).toBe(true);
    expect(keys.has('PORT')).toBe(true);
    expect(keys.has('MONGODB_URI')).toBe(true);
  });

  test('template includes generation hint and no blank strict placeholders', () => {
    expect(text).toContain('openssl rand -base64 64');
    for (const key of STRICT_REQUIRED_KEYS) {
      const line = text.split(/\r?\n/).find(l => l.trim().startsWith(`${key}=`));
      expect(line).toBeDefined();
      const value = String(line).split('=').slice(1).join('=').trim();
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
