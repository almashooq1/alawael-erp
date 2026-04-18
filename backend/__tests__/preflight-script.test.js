/**
 * preflight-script.test.js — exit-code contract for scripts/preflight.js
 *
 * The preflight script is a deploy gate (k8s initContainer / CI job).
 * Its contract is its exit code, so the tests spawn it as a child
 * process and assert on status + output, just like a real CI runner
 * would.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'preflight.js');

function runPreflight(extraEnv = {}, args = []) {
  // Strip any *_MODE env the outer jest runner set so we control the
  // whole test env. Start with a clean slate, then layer extras.
  const baseEnv = { ...process.env };
  for (const k of Object.keys(baseEnv)) {
    if (/^[A-Z]+_MODE$/.test(k)) delete baseEnv[k];
  }
  const result = spawnSync('node', [SCRIPT, ...args], {
    env: { ...baseEnv, ...extraEnv },
    encoding: 'utf8',
  });
  return result;
}

describe('preflight script — exit code contract', () => {
  it('exits 0 when every adapter is in mock mode', () => {
    const r = runPreflight();
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/preflight pass/);
  });

  it('exits 1 when any adapter is live but missing env vars', () => {
    const r = runPreflight({ GOSI_MODE: 'live' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/gosi is LIVE but missing/);
    expect(r.stdout).toMatch(/GOSI_BASE_URL/);
    expect(r.stdout).toMatch(/preflight FAIL/);
  });

  it('exits 0 when live adapter has all required vars', () => {
    const r = runPreflight({
      GOSI_MODE: 'live',
      GOSI_BASE_URL: 'https://mock.example.sa',
      GOSI_CLIENT_ID: 'id',
      GOSI_CLIENT_SECRET: 'secret',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/live \+ configured/);
    expect(r.stdout).toMatch(/gosi/);
  });

  it('--json produces machine-readable output', () => {
    const r = runPreflight({ GOSI_MODE: 'live' }, ['--json']);
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.preflight).toBe('fail');
    expect(parsed.live.misconfigured).toEqual([
      expect.objectContaining({ name: 'gosi', missing: expect.any(Array) }),
    ]);
  });

  it('CI_PREFLIGHT=1 emits compact stderr on failure, no stdout noise', () => {
    const r = runPreflight({ GOSI_MODE: 'live', CI_PREFLIGHT: '1' });
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toMatch(/preflight fail: misconfigured live adapters: gosi/);
  });

  it('CI_PREFLIGHT=1 produces zero output on success', () => {
    const r = runPreflight({ CI_PREFLIGHT: '1' });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  it('multiple misconfigured live adapters are all reported', () => {
    const r = runPreflight({ GOSI_MODE: 'live', ABSHER_MODE: 'live', NPHIES_MODE: 'live' }, [
      '--json',
    ]);
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout);
    const names = parsed.live.misconfigured.map(x => x.name).sort();
    expect(names).toEqual(['absher', 'gosi', 'nphies']);
  });
});
