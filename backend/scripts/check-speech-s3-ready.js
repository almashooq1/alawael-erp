#!/usr/bin/env node
/**
 * check-speech-s3-ready.js — pre-cutover verifier for Speech S3 retention
 * sweeper PDPL-compliance gate.
 *
 * Background: W284c shipped the speech-retention sweeper with a log-only
 * storage purger (audio not actually deleted). W284d (commit ad20c03cc)
 * added a real S3-backed purger factory that activates IF:
 *   1. @aws-sdk/client-s3 is installed in node_modules
 *   2. AWS_REGION env var is set
 * Otherwise the bootstrap falls back to log-only with a loud WARN.
 *
 * This script is the cutover go/no-go signal: run it BEFORE flipping
 * `ENABLE_SPEECH_RETENTION_CRON=true` in any environment. It returns
 * exit 0 (ready) or exit 1 (gaps), with a per-gap actionable message.
 *
 * Usage:
 *   node scripts/check-speech-s3-ready.js          # human-readable
 *   node scripts/check-speech-s3-ready.js --json   # machine-readable
 *
 * Exit codes:
 *   0 — PDPL retention will be enforced (real S3 purger active)
 *   1 — at least one gap; sweeper would fall back to log-only
 *
 * Cycle 1 collaboration test: Claude ships this script; user runs the
 * actual `npm install @aws-sdk/client-s3` + `export AWS_REGION=…` in
 * the pilot environment.
 */

'use strict';

const JSON_MODE = process.argv.includes('--json');
const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  dim: useColor ? '\x1b[2m' : '',
};

function checkSdk() {
  try {
    require.resolve('@aws-sdk/client-s3');
    return { ok: true };
  } catch {
    return {
      ok: false,
      fix: 'npm install @aws-sdk/client-s3',
      reason: '@aws-sdk/client-s3 not resolvable from backend/node_modules',
    };
  }
}

function checkRegion() {
  const region = process.env.AWS_REGION;
  if (region && region.length > 0) {
    return { ok: true, value: region };
  }
  return {
    ok: false,
    fix: 'export AWS_REGION=me-south-1 (or your chosen region)',
    reason: 'AWS_REGION env var unset',
  };
}

function checkCronGateExists() {
  // Sanity: the bootstrap source must still wire the createS3Purger
  // factory. If a future refactor removed it, this check would silently
  // pass but the sweeper would never call the SDK. Verify here.
  const fs = require('fs');
  const path = require('path');
  try {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'startup', 'speechBootstrap.js'),
      'utf8'
    );
    if (!/createS3Purger\s*\(/.test(src)) {
      return {
        ok: false,
        fix: 'restore speech-s3-purger wiring in startup/speechBootstrap.js',
        reason: 'bootstrap no longer calls createS3Purger() — W284d wiring lost',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      fix: 'investigate startup/speechBootstrap.js readability',
      reason: `failed to read speechBootstrap.js: ${err.message}`,
    };
  }
}

function main() {
  const checks = {
    sdkInstalled: checkSdk(),
    regionSet: checkRegion(),
    bootstrapWiring: checkCronGateExists(),
  };

  const failed = Object.entries(checks).filter(([, v]) => !v.ok);
  const ready = failed.length === 0;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          check: 'speech-s3-ready',
          ready,
          checkedAt: new Date().toISOString(),
          checks,
          summary: ready
            ? 'PDPL retention will be enforced when ENABLE_SPEECH_RETENTION_CRON=true'
            : `${failed.length} gap(s) — sweeper would fall back to log-only`,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(`\n${c.bold}Speech retention PDPL readiness check${c.reset}\n`);
    for (const [name, result] of Object.entries(checks)) {
      const icon = result.ok ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
      const label = `${c.bold}${name}${c.reset}`;
      if (result.ok) {
        const detail = result.value ? ` ${c.dim}(${result.value})${c.reset}` : '';
        console.log(`  ${icon} ${label}${detail}`);
      } else {
        console.log(`  ${icon} ${label}`);
        console.log(`      ${c.yellow}reason${c.reset}: ${result.reason}`);
        console.log(`      ${c.yellow}fix${c.reset}:    ${result.fix}`);
      }
    }
    console.log('');
    if (ready) {
      console.log(
        `  ${c.green}${c.bold}✓ ready${c.reset} — safe to flip ENABLE_SPEECH_RETENTION_CRON=true\n`
      );
      console.log(
        `  ${c.dim}On boot, the bootstrap will emit:${c.reset}\n` +
          `  ${c.dim}  [startup] Speech retention: real S3 purger wired … PDPL retention enforced${c.reset}\n`
      );
    } else {
      console.log(
        `  ${c.red}${c.bold}✗ NOT ready${c.reset} — fix the ${failed.length} gap(s) above before flipping the flag\n`
      );
      console.log(
        `  ${c.dim}Otherwise the sweeper falls back to log-only (boot WARN visible)${c.reset}\n` +
          `  ${c.dim}and PDPL retention will NOT be enforced.${c.reset}\n`
      );
    }
  }

  process.exit(ready ? 0 : 1);
}

main();
