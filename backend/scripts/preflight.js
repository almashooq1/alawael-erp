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

function main() {
  const results = PROVIDERS.map(name => ({ name, ...loadAdapter(name) }));

  const loadErrors = results.filter(r => !r.ok);
  const liveMisconfigured = results.filter(
    r => r.ok && r.cfg?.mode === 'live' && !r.cfg?.configured
  );
  const liveConfigured = results.filter(r => r.ok && r.cfg?.mode === 'live' && r.cfg?.configured);
  const mockAdapters = results.filter(r => r.ok && r.cfg?.mode === 'mock');

  const healthy = liveMisconfigured.length === 0 && loadErrors.length === 0;

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
    console.log('');
    console.log(
      healthy
        ? `  ${c.green}${c.bold}✓ preflight pass${c.reset}  — safe to deploy\n`
        : `  ${c.red}${c.bold}✗ preflight FAIL${c.reset}  — fix env before deploy\n`
    );
  } else if (!healthy) {
    // CI mode: compact stderr summary for build logs
    const names = liveMisconfigured.map(r => r.name).join(',');
    process.stderr.write(`preflight fail: misconfigured live adapters: ${names}\n`);
  }

  if (loadErrors.length) process.exit(2);
  process.exit(healthy ? 0 : 1);
}

main();
