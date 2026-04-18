/**
 * dsar-hash-script.test.js — lock the contract between the dsar-hash
 * CLI helper and adapterAuditLogger.hashString().
 *
 * DSAR responses are only correct if the hash compliance computes
 * client-side matches the hash we stored in the audit row. These
 * tests assert that the CLI output matches the library output for
 * the same input — if anyone refactors either side, this fails.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { hashString } = require('../services/adapterAuditLogger');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'dsar-hash.js');

function runHash(id, env = {}) {
  const result = spawnSync('node', [SCRIPT, id], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return result;
}

describe('dsar-hash CLI', () => {
  it('exits 0 + prints the expected hash for a national ID', () => {
    const r = runHash('1234567890');
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(hashString('1234567890'));
  });

  it('output matches adapterAuditLogger.hashString for multiple inputs', () => {
    for (const id of ['1000000001', '2998877665', 'AB99', 'CCHI-memberId-zzz']) {
      const r = runHash(id);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(hashString(id));
    }
  });

  it('respects JWT_SECRET override (salt rotation scenario)', () => {
    const r = runHash('1234567890', { JWT_SECRET: 'rotated-secret' });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(hashString('1234567890', 'rotated-secret'));
  });

  it('different IDs produce different hashes', () => {
    const a = runHash('1000000001');
    const b = runHash('1000000002');
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(a.stdout.trim()).not.toBe(b.stdout.trim());
  });

  it('output is always 32 hex chars (truncated SHA-256)', () => {
    const r = runHash('1234567890');
    expect(r.stdout.trim()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('no-arg invocation prints usage and exits 1', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/Usage:/);
  });

  it('--help exits 0 with usage', () => {
    const r = spawnSync('node', [SCRIPT, '--help'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
  });
});
