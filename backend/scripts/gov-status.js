#!/usr/bin/env node
/**
 * gov-status.js — CLI snapshot of every gov adapter's health.
 *
 * Prints a colorized table to stdout. Useful for:
 *   • SSH-in-to-box sanity check (no UI needed)
 *   • Cron job: `node scripts/gov-status.js --json | jq '.unhealthy'`
 *   • Pre-deploy validation: CI greps for `all-green` in output
 *   • Slack bot digest: `node scripts/gov-status.js --json` and post
 *
 * Exit codes:
 *   0 — all adapters configured + no circuits open
 *   1 — at least one adapter misconfigured OR circuit open
 *   2 — internal error (unreadable adapter module, etc.)
 *
 * Usage:
 *   node scripts/gov-status.js                 # colorized table
 *   node scripts/gov-status.js --json          # machine-readable JSON
 *   node scripts/gov-status.js --quiet         # exit code only
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

const args = new Set(process.argv.slice(2));
const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');

// ANSI colors — skip if --json or not a TTY to keep piping clean
const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
  gray: useColor ? '\x1b[90m' : '',
};

function safeLoad(name) {
  try {
    const mod = require(`../services/${name}Adapter`);
    let cfg;
    if (typeof mod.getConfig === 'function') {
      cfg = mod.getConfig();
    } else {
      // SCFHS + Nafath historically lack getConfig — synthesize the
      // same fallback shape the /health/integrations route uses.
      const mode = (mod.MODE || 'unknown').toLowerCase();
      cfg = { provider: name, mode, configured: mode === 'mock' };
    }
    return { ok: true, cfg };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function pad(s, n) {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + ' '.repeat(n - str.length);
}

function formatRow(row) {
  const mode = row.cfg?.mode || 'unknown';
  const modeCol =
    mode === 'live' ? `${c.red}live${c.reset}` : mode === 'mock' ? `${c.dim}mock${c.reset}` : mode;
  const cfgCol = row.cfg?.configured ? `${c.green}  ✓${c.reset}` : `${c.red}  ✗${c.reset}`;
  const circuit = row.cfg?.circuit;
  let circuitCol;
  if (!circuit) circuitCol = `${c.gray}  —${c.reset}`;
  else if (circuit.open)
    circuitCol = `${c.red}OPEN ${Math.ceil(circuit.cooldownRemainingMs / 1000)}s${c.reset}`;
  else if (circuit.failures > 0) circuitCol = `${c.yellow}${circuit.failures} fail${c.reset}`;
  else circuitCol = `${c.green}closed${c.reset}`;
  const missingCol = row.cfg?.missing?.length
    ? `${c.red}${row.cfg.missing.join(',')}${c.reset}`
    : '';
  return (
    `  ${c.bold}${pad(row.name.toUpperCase(), 9)}${c.reset}` +
    `  ${pad(mode, 12)}`.replace(mode, modeCol) +
    `   ${cfgCol}` +
    `   ${pad(circuitCol, 22)}` +
    `   ${missingCol}`
  );
}

function main() {
  const rows = PROVIDERS.map(name => {
    const r = safeLoad(name);
    return { name, ...r };
  });

  const anyLoadError = rows.some(r => !r.ok);
  const misconfigured = rows.filter(r => r.ok && !r.cfg?.configured);
  const openCircuits = rows.filter(r => r.cfg?.circuit?.open);
  const healthy = misconfigured.length === 0 && openCircuits.length === 0 && !anyLoadError;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          healthy,
          checkedAt: new Date().toISOString(),
          total: rows.length,
          misconfigured: misconfigured.map(r => r.name),
          circuitOpen: openCircuits.map(r => r.name),
          providers: rows.map(r => ({
            name: r.name,
            loaded: r.ok,
            mode: r.cfg?.mode,
            configured: !!r.cfg?.configured,
            missing: r.cfg?.missing,
            circuit: r.cfg?.circuit,
            loadError: r.error,
          })),
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    const checkedAt = new Date().toLocaleString('en-US', { hour12: false });
    console.log(
      `\n${c.bold}Al-Awael — Gov Integrations status${c.reset}  ${c.dim}${checkedAt}${c.reset}\n`
    );
    console.log(
      `  ${c.dim}${pad('PROVIDER', 9)}  ${pad('MODE', 12)}  CFG  ${pad('CIRCUIT', 22)}   MISSING${c.reset}`
    );
    console.log(`  ${c.dim}${'─'.repeat(70)}${c.reset}`);
    for (const row of rows) {
      if (!row.ok) {
        console.log(
          `  ${c.bold}${pad(row.name.toUpperCase(), 9)}${c.reset}  ${c.red}load failed: ${row.error}${c.reset}`
        );
      } else {
        console.log(formatRow(row));
      }
    }
    console.log('');
    if (healthy) {
      console.log(
        `  ${c.green}${c.bold}✓ all-green${c.reset}  (${rows.length} providers, no issues)\n`
      );
    } else {
      const bits = [];
      if (misconfigured.length) bits.push(`${misconfigured.length} misconfigured`);
      if (openCircuits.length) bits.push(`${openCircuits.length} circuit open`);
      if (anyLoadError) bits.push(`${rows.filter(r => !r.ok).length} failed to load`);
      console.log(`  ${c.red}${c.bold}✗ unhealthy${c.reset}  (${bits.join(' · ')})\n`);
    }
  }

  if (anyLoadError) process.exit(2);
  process.exit(healthy ? 0 : 1);
}

main();
