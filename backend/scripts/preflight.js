#!/usr/bin/env node
/**
 * preflight.js — deploy-time validator for gov adapter configuration.
 *
 * Intent: fail the deploy if any adapter has `{PROVIDER}_MODE=live`
 * but is missing required env vars. Catches the class of incident
 * where someone flips to live, forgets a secret, and production
 * silently returns `status: unknown` for every verify call.
 *
 * Strategy: load every adapter's getConfig() with the CURRENT
 * environment, then assert: if mode=live, configured MUST be true.
 * Mock mode is always considered healthy.
 *
 * Exit codes:
 *   0 — all live adapters fully configured (or all in mock)
 *   1 — at least one live adapter has missing env vars
 *   2 — adapter failed to load (unexpected — paging required)
 *
 * Usage:
 *   node scripts/preflight.js                   # human-readable
 *   node scripts/preflight.js --json            # machine-readable
 *   CI_PREFLIGHT=1 node scripts/preflight.js    # quiet mode for CI
 *
 * Recommended wiring:
 *   • Dockerfile: RUN npm run preflight:prod  # fails build if broken
 *   • k8s: initContainer runs this before the app container starts
 *   • CI deploy job: pre-promote gate
 */

'use strict';

const PROVIDERS = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
  // Phase 3 additions — adapters added W280-W281 with the same getConfig
  // shape (provider/mode/configured/missing). Their crons get a separate
  // readiness check in checkPhase3Crons() below.
  'disabilityAuthority',
  'sehhaty',
];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(
    [
      'preflight — live gov-adapter config deploy gate',
      '',
      'Checks every adapter with `*_MODE=live` has its full env-var set.',
      'Use as a pre-deploy gate: fail fast before the app boots with a',
      'half-configured live integration.',
      '',
      'Exit codes:',
      '  0  every live adapter is configured OR all adapters are mock',
      '  1  at least one live adapter is missing required env vars',
      '',
      'Usage:',
      '  node scripts/preflight.js           colorized TTY output',
      '  node scripts/preflight.js --json    machine-readable JSON',
      '  CI_PREFLIGHT=1 node scripts/preflight.js   compact stderr (CI/k8s initContainer)',
      '  node scripts/preflight.js --help    this message',
      '',
      'Operator docs: docs/OPERATIONS.md § "Deploying a gov-integration flip"',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = process.argv.includes('--json');
const CI_MODE = process.env.CI_PREFLIGHT === '1';
const useColor = !JSON_MODE && !CI_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  dim: useColor ? '\x1b[2m' : '',
};

function loadAdapter(name) {
  try {
    const mod = require(`../services/${name}Adapter`);
    let cfg;
    if (typeof mod.getConfig === 'function') {
      cfg = mod.getConfig();
    } else {
      const mode = (mod.MODE || 'mock').toLowerCase();
      cfg = { provider: name, mode, configured: mode === 'mock' };
    }
    return { ok: true, cfg };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Phase 3 cron-readiness checks — gaps not captured by the adapter
 * getConfig() loop above. Each returns either null (gate passes / not
 * relevant) OR a { name, reason } object describing the failure.
 *
 * These mirror the rows in docs/PRODUCTION_GAPS_BEFORE_LIVE.md §6 +
 * §7 (the env-flag readiness table). When a cron's env flag is set,
 * verify the dependencies the cron silently relies on.
 */
function checkPhase3Crons() {
  const failures = [];
  const fs = require('fs');
  const path = require('path');

  // DA monthly cron: when ENABLE_DA_PERIODIC_CRON=true + live mode, the
  // bootstrap's stub builder MUST have been replaced. The W286 commit
  // tagged the stub payload with STUB_PAYLOAD_MARKER and the W286 follow-up
  // (commit 7fccd9531) added an adapter safety guard. If the bootstrap
  // source still uses STUB_PAYLOAD_MARKER → production payload not wired.
  const daCron = String(process.env.ENABLE_DA_PERIODIC_CRON || '').toLowerCase() === 'true';
  const daLive = String(process.env.DISABILITY_AUTHORITY_MODE || '').toLowerCase() === 'live';
  if (daCron && daLive) {
    try {
      const bootSrc = fs.readFileSync(
        path.join(__dirname, '..', 'startup', 'disabilityAuthorityBootstrap.js'),
        'utf8'
      );
      if (/note:\s*adapter\.STUB_PAYLOAD_MARKER/.test(bootSrc)) {
        failures.push({
          name: 'da-periodic-cron',
          reason:
            'DA cron is enabled in live mode but bootstrap still uses STUB_PAYLOAD_MARKER ' +
            '(production payload builder not wired). Adapter safety guard will reject ' +
            'submissions with DA_STUB_PAYLOAD_REJECTED. Replace the stub builder in ' +
            'startup/disabilityAuthorityBootstrap.js with real metrics from ' +
            'DisabilityAuthorityReport + Beneficiary + Session models.',
        });
      }
    } catch (err) {
      failures.push({
        name: 'da-periodic-cron',
        reason: `failed to read disabilityAuthorityBootstrap.js: ${err.message}`,
      });
    }
  }

  // Speech retention cron: when ENABLE_SPEECH_RETENTION_CRON=true, PDPL
  // compliance requires `@aws-sdk/client-s3` installed + AWS_REGION set.
  // Otherwise the W284d real S3 purger returns null and the sweeper
  // falls back to log-only — audio not deleted, retention violated.
  const speechCron =
    String(process.env.ENABLE_SPEECH_RETENTION_CRON || '').toLowerCase() === 'true';
  if (speechCron) {
    let sdkAvailable = false;
    try {
      require.resolve('@aws-sdk/client-s3');
      sdkAvailable = true;
    } catch {
      sdkAvailable = false;
    }
    const missing = [];
    if (!sdkAvailable) missing.push('@aws-sdk/client-s3 (npm install)');
    if (!process.env.AWS_REGION) missing.push('AWS_REGION');
    if (missing.length) {
      failures.push({
        name: 'speech-retention-cron',
        reason: `Speech retention sweeper enabled but real S3 purger unavailable. Missing: ${missing.join(', ')}. Sweeper will fall back to log-only — audio NOT deleted, PDPL retention non-compliant.`,
      });
    }
  }

  return failures;
}

function main() {
  const results = PROVIDERS.map(name => ({ name, ...loadAdapter(name) }));

  const loadErrors = results.filter(r => !r.ok);
  const liveMisconfigured = results.filter(
    r => r.ok && r.cfg?.mode === 'live' && !r.cfg?.configured
  );
  const liveConfigured = results.filter(r => r.ok && r.cfg?.mode === 'live' && r.cfg?.configured);
  const mockAdapters = results.filter(r => r.ok && r.cfg?.mode === 'mock');

  const cronFailures = checkPhase3Crons();
  const healthy =
    liveMisconfigured.length === 0 && loadErrors.length === 0 && cronFailures.length === 0;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          preflight: healthy ? 'pass' : 'fail',
          checkedAt: new Date().toISOString(),
          live: {
            configured: liveConfigured.map(r => r.name),
            misconfigured: liveMisconfigured.map(r => ({
              name: r.name,
              missing: r.cfg?.missing || [],
            })),
          },
          mock: mockAdapters.map(r => r.name),
          cronFailures, // Phase 3 cron-readiness gates (W284d / DA stub builder)
          loadErrors: loadErrors.map(r => ({ name: r.name, error: r.error })),
        },
        null,
        2
      ) + '\n'
    );
  } else if (!CI_MODE) {
    console.log(`\n${c.bold}Al-Awael — Deploy preflight${c.reset}\n`);
    if (liveConfigured.length) {
      console.log(
        `  ${c.green}live + configured${c.reset}:  ${liveConfigured.map(r => r.name).join(', ')}`
      );
    }
    if (mockAdapters.length) {
      console.log(
        `  ${c.dim}mock${c.reset}:               ${mockAdapters.map(r => r.name).join(', ')}`
      );
    }
    if (liveMisconfigured.length) {
      console.log('');
      for (const r of liveMisconfigured) {
        console.log(
          `  ${c.red}${c.bold}✗ ${r.name}${c.reset} is LIVE but missing: ${c.yellow}${(r.cfg?.missing || []).join(', ')}${c.reset}`
        );
      }
    }
    if (loadErrors.length) {
      console.log('');
      for (const r of loadErrors) {
        console.log(`  ${c.red}${c.bold}✗ ${r.name}${c.reset} failed to load: ${r.error}`);
      }
    }
    if (cronFailures.length) {
      console.log('');
      for (const f of cronFailures) {
        console.log(`  ${c.red}${c.bold}✗ ${f.name}${c.reset}`);
        console.log(`      ${c.yellow}${f.reason}${c.reset}`);
      }
    }
    console.log('');
    console.log(
      healthy
        ? `  ${c.green}${c.bold}✓ preflight pass${c.reset}  — safe to deploy\n`
        : `  ${c.red}${c.bold}✗ preflight FAIL${c.reset}  — fix env before deploy\n`
    );
  } else if (!healthy) {
    // CI mode: compact stderr summary for build logs
    const parts = [];
    if (liveMisconfigured.length) {
      parts.push(`misconfigured live adapters: ${liveMisconfigured.map(r => r.name).join(',')}`);
    }
    if (cronFailures.length) {
      parts.push(`cron-readiness: ${cronFailures.map(f => f.name).join(',')}`);
    }
    process.stderr.write(`preflight fail: ${parts.join('; ')}\n`);
  }

  if (loadErrors.length) process.exit(2);
  process.exit(healthy ? 0 : 1);
}

main();
