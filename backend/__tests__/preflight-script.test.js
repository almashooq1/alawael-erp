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
    timeout: 35000,
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

  // ─────────────────────────────────────────────────────────────────────
  // Phase 3 cron-readiness gates (W286 DA cron stub-builder + W284d Speech
  // S3 PDPL). These are deploy-time checks that mirror the env-flag
  // readiness table in PRODUCTION_GAPS_BEFORE_LIVE.md §7.
  // ─────────────────────────────────────────────────────────────────────
  describe('Phase 3 cron-readiness gates', () => {
    it('disabilityAuthority + sehhaty are checked alongside the 10 gov providers', () => {
      // In default mock mode, both should appear in JSON output.
      const r = runPreflight({}, ['--json']);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.mock).toEqual(expect.arrayContaining(['disabilityAuthority', 'sehhaty']));
    });

    it('disabilityAuthority in live mode without creds → preflight FAIL', () => {
      const r = runPreflight(
        { DISABILITY_AUTHORITY_MODE: 'live' /* no BASE_URL/API_KEY/CENTER_ID */ },
        ['--json']
      );
      expect(r.status).toBe(1);
      const parsed = JSON.parse(r.stdout);
      const da = parsed.live.misconfigured.find(x => x.name === 'disabilityAuthority');
      expect(da).toBeTruthy();
      expect(da.missing).toEqual(
        expect.arrayContaining([
          'DISABILITY_AUTHORITY_BASE_URL',
          'DISABILITY_AUTHORITY_API_KEY',
          'DISABILITY_AUTHORITY_CENTER_ID',
        ])
      );
    });

    it('DA cron enabled + live mode + stub builder still in bootstrap → cronFailure', () => {
      // Bootstrap source still contains `note: adapter.STUB_PAYLOAD_MARKER`
      // (this commit) so the gate trips.
      const r = runPreflight(
        {
          DISABILITY_AUTHORITY_MODE: 'live',
          DISABILITY_AUTHORITY_BASE_URL: 'https://sandbox.example.sa',
          DISABILITY_AUTHORITY_API_KEY: 'k',
          DISABILITY_AUTHORITY_CENTER_ID: 'c',
          ENABLE_DA_PERIODIC_CRON: 'true',
        },
        ['--json']
      );
      expect(r.status).toBe(1);
      const parsed = JSON.parse(r.stdout);
      const cron = parsed.cronFailures.find(f => f.name === 'da-periodic-cron');
      expect(cron).toBeTruthy();
      expect(cron.reason).toMatch(/stub builder|STUB_PAYLOAD_MARKER/i);
    });

    it('Speech retention cron enabled + AWS SDK missing → cronFailure', () => {
      // @aws-sdk/client-s3 is intentionally NOT in package.json (W284d
      // design — install per-env). So enabling the cron always trips
      // this gate until an ops install happens.
      const r = runPreflight({ ENABLE_SPEECH_RETENTION_CRON: 'true' }, ['--json']);
      expect(r.status).toBe(1);
      const parsed = JSON.parse(r.stdout);
      const cron = parsed.cronFailures.find(f => f.name === 'speech-retention-cron');
      expect(cron).toBeTruthy();
      expect(cron.reason).toMatch(/@aws-sdk\/client-s3|AWS_REGION/);
    });

    it('DA cron disabled OR DA mock → no cronFailure regardless of stub builder', () => {
      // Default state: ENABLE_DA_PERIODIC_CRON unset → gate does not fire.
      const r = runPreflight({}, ['--json']);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.cronFailures.find(f => f.name === 'da-periodic-cron')).toBeFalsy();
      // Cron enabled but mock mode → also no failure.
      const r2 = runPreflight({ ENABLE_DA_PERIODIC_CRON: 'true' }, ['--json']);
      const parsed2 = JSON.parse(r2.stdout);
      expect(parsed2.cronFailures.find(f => f.name === 'da-periodic-cron')).toBeFalsy();
    });

    it('CI_PREFLIGHT compact stderr mentions cron-readiness failures', () => {
      const r = runPreflight({ ENABLE_SPEECH_RETENTION_CRON: 'true', CI_PREFLIGHT: '1' });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/cron-readiness: speech-retention-cron/);
    });
  });
});
