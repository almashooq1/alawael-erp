'use strict';

/**
 * check-speech-s3-ready-script.test.js — exit-code contract for
 * scripts/check-speech-s3-ready.js
 *
 * The script is the pre-cutover go/no-go signal for the W284d Speech
 * S3 PDPL gate. Its contract is its exit code (0 = ready, 1 = gaps).
 * Tests spawn it as a child process and assert on status + output.
 *
 * Same pattern as preflight-script.test.js.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-speech-s3-ready.js');

function runCheck(extraEnv = {}, args = []) {
  // Strip AWS_* env the outer jest runner might have set so we control
  // the whole test env.
  const baseEnv = { ...process.env };
  for (const k of Object.keys(baseEnv)) {
    if (k.startsWith('AWS_')) delete baseEnv[k];
  }
  return spawnSync('node', [SCRIPT, ...args], {
    env: { ...baseEnv, ...extraEnv },
    encoding: 'utf8',
    timeout: 15000,
  });
}

describe('check-speech-s3-ready script — exit code contract', () => {
  it('exits 1 in default env (no SDK, no AWS_REGION)', () => {
    // @aws-sdk/client-s3 is intentionally NOT in package.json (W284d
    // SDK is NOW installed as a dependency (2026-05-26). Default env
    // has SDK present + AWS_REGION unset → script reports 1 gap
    // (AWS_REGION), exits 1.
    const r = runCheck();
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/NOT ready/);
    expect(r.stdout).toMatch(/AWS_REGION/);
  });

  it('--json produces machine-readable output with checks object', () => {
    const r = runCheck({}, ['--json']);
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.check).toBe('speech-s3-ready');
    expect(parsed.ready).toBe(false);
    expect(parsed.checks).toMatchObject({
      sdkInstalled: { ok: true }, // SDK now in package.json (2026-05-26)
      regionSet: { ok: false, fix: expect.stringMatching(/AWS_REGION/) },
      bootstrapWiring: { ok: true }, // W284d wiring still in place
    });
    expect(parsed.summary).toMatch(/fall back to log-only/);
  });

  it('reports actionable fix line for the remaining gap (AWS_REGION)', () => {
    const r = runCheck();
    expect(r.stdout).toMatch(/fix.*export AWS_REGION/);
  });

  it('AWS_REGION set + SDK installed → fully ready', () => {
    const r = runCheck({ AWS_REGION: 'me-south-1' }, ['--json']);
    expect(r.status).toBe(0); // both gates pass now
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ready).toBe(true);
    expect(parsed.checks.regionSet).toEqual({ ok: true, value: 'me-south-1' });
    expect(parsed.checks.sdkInstalled.ok).toBe(true);
  });

  it('detects bootstrap wiring drift (would catch a future regression)', () => {
    // The static-source check inside the script reads
    // startup/speechBootstrap.js for `createS3Purger(`. If a future
    // refactor removes that call, the script flags it.
    const fs = require('fs');
    const bootPath = path.join(__dirname, '..', 'startup', 'speechBootstrap.js');
    const src = fs.readFileSync(bootPath, 'utf8');
    expect(src).toMatch(/createS3Purger\s*\(/);
  });
});
