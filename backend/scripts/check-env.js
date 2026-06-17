#!/usr/bin/env node
'use strict';

/**
 * check-env.js — environment preflight check (`npm run env:check`).
 *
 * Verifies that every security-critical, strict-required environment variable
 * is set and non-blank BEFORE a deploy. The key list is imported directly from
 * `config/validateEnv.js:STRICT_REQUIRED_KEYS` so this tool can never drift
 * from the schema the app actually enforces at boot (strict mode).
 *
 * Exit codes:
 *   0 — all strict-required keys are set (safe to proceed)
 *   1 — one or more keys are missing or blank (do NOT deploy)
 *
 * Usage:
 *   node scripts/check-env.js            # human-readable report
 *   node scripts/check-env.js --json     # machine-readable report
 *   npm run env:check
 *
 * Documented in: docs/runbooks/env-preflight-check.md
 * Guarded by:    __tests__/env-preflight-check-documentation-wave1398.test.js
 */

// Load .env if present (no-op when the file is absent — CI injects real envs).
try {
  require('dotenv').config();
} catch (_) {
  /* dotenv is optional at runtime; envs may be injected by the platform */
}

const { STRICT_REQUIRED_KEYS } = require('../config/validateEnv');

/**
 * Per-key human guidance: what the value is for + how to generate it.
 * Kept intentionally short — the full purpose table lives in the runbook.
 * @type {Record<string, string>}
 */
const HINTS = {
  MONGODB_URI: 'Mongo connection string — must start with mongodb:// or mongodb+srv://',
  JWT_SECRET: 'Signs access tokens (min 32 chars). Generate: openssl rand -base64 64',
  JWT_REFRESH_SECRET: 'Signs refresh tokens (min 32 chars). Generate: openssl rand -base64 64',
  ENCRYPTION_KEY: 'AES field-encryption key (min 32 chars). Generate: openssl rand -base64 64',
  SESSION_SECRET: 'Signs session cookies (min 16 chars). Generate: openssl rand -base64 64',
};

/**
 * Inspect the provided environment object against STRICT_REQUIRED_KEYS.
 * Pure — takes env in, returns a structured report (no I/O, no process.exit).
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {{ ok: boolean, total: number, results: Array<{key:string,set:boolean,hint:string}>, missing: string[] }}
 */
function buildReport(env = process.env) {
  const results = STRICT_REQUIRED_KEYS.map(key => {
    const raw = env[key];
    const set = typeof raw === 'string' && raw.trim().length > 0;
    return { key, set, hint: HINTS[key] || '' };
  });
  const missing = results.filter(r => !r.set).map(r => r.key);
  return { ok: missing.length === 0, total: results.length, results, missing };
}

/**
 * Render the report to the console.
 * @param {ReturnType<typeof buildReport>} report
 * @param {boolean} json
 */
function printReport(report, json) {
  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }
  process.stdout.write('Environment preflight check (strict-required keys)\n');
  process.stdout.write('─────────────────────────────────────────────────\n');
  for (const r of report.results) {
    process.stdout.write(`  ${r.set ? '✓' : '✖'} ${r.key}${r.set ? '' : '  — ' + r.hint}\n`);
  }
  process.stdout.write('─────────────────────────────────────────────────\n');
  if (report.ok) {
    process.stdout.write(`✓ all ${report.total} strict-required keys are set\nExit: 0\n`);
  } else {
    process.stdout.write(
      `✖ ${report.missing.length} of ${report.total} strict-required keys are missing or blank: ${report.missing.join(
        ', '
      )}\nExit: 1\n`
    );
  }
}

function main() {
  const json = process.argv.includes('--json');
  const report = buildReport(process.env);
  printReport(report, json);
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { buildReport, HINTS, STRICT_REQUIRED_KEYS };
