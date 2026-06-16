#!/usr/bin/env node
/**
 * check-env.js — pre-deploy environment preflight (W1354)
 *
 * Lists, in ONE pass, every security-critical env var that a production /
 * CI deployment requires but the current environment is missing or blank —
 * instead of letting the app crash at boot on the first missing one.
 *
 * The required-key list is imported from `config/validateEnv.js`
 * (STRICT_REQUIRED_KEYS, derived from the strict Joi schema) so this tool
 * can never drift from what the boot validator actually enforces.
 *
 * Usage:
 *   node scripts/check-env.js            # check process.env (+ .env if present)
 *   npm run env:check
 *
 * Exit codes: 0 = all required keys present · 1 = one or more missing.
 * This is a REPORT, never throws — operators get a clean actionable list.
 */
'use strict';

const { STRICT_REQUIRED_KEYS, findMissingStrictEnv } = require('../config/validateEnv');

// Generation hints so an operator can fix each gap immediately.
const HINTS = Object.freeze({
  MONGODB_URI: 'mongodb://user:pass@host:27017/alawael-erp  (or mongodb+srv://…)',
  JWT_SECRET: 'openssl rand -base64 64   (min 32 chars)',
  JWT_REFRESH_SECRET: 'openssl rand -base64 64   (min 32 chars, distinct from JWT_SECRET)',
  ENCRYPTION_KEY: 'openssl rand -base64 48   (min 32 chars)',
  SESSION_SECRET: 'openssl rand -base64 32   (min 16 chars)',
});

/**
 * Build the human report. Pure — takes the missing list, returns lines + ok.
 * @param {string[]} missing
 * @returns {{ ok: boolean, lines: string[] }}
 */
function buildReport(missing) {
  if (missing.length === 0) {
    return {
      ok: true,
      lines: [`✓ env:check — all ${STRICT_REQUIRED_KEYS.length} strict-required keys are set`],
    };
  }
  const lines = [
    `✖ env:check — ${missing.length} of ${STRICT_REQUIRED_KEYS.length} strict-required keys missing/blank:`,
    '',
  ];
  for (const k of missing) {
    lines.push(`  • ${k}`);
    if (HINTS[k]) lines.push(`      → ${HINTS[k]}`);
  }
  lines.push('');
  lines.push('These are enforced at boot when NODE_ENV=production or CI=true.');
  return { ok: false, lines };
}

function main() {
  // Best-effort load of a local .env so the preflight reflects what boot will see.
  try {
    require('dotenv').config();
  } catch {
    /* dotenv optional — process.env already populated in CI */
  }
  const { ok, lines } = buildReport(findMissingStrictEnv(process.env));
  console.log(lines.join('\n'));
  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { buildReport, HINTS };
