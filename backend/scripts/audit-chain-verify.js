#!/usr/bin/env node
/**
 * audit-chain-verify.js — scheduled integrity check for the audit
 * hash chain (Phase-7 Commit 7).
 *
 * Walks the audit log in append order and verifies every entry's
 * `chainHash` equals `SHA-256(prevHash || canonicalJSON(entry))`.
 * A break means:
 *   • someone modified a historical entry (tamper), OR
 *   • a legitimate migration changed excluded field semantics, OR
 *   • a bug in the pre-save hook produced wrong hashes for new rows.
 *
 * Any of the three warrants immediate investigation.
 *
 * Exit codes:
 *   0  chain intact over the window
 *   1  ≥1 break detected (alert required)
 *   2  internal error (DB unreachable, schema missing, etc.)
 *
 * Options:
 *   --window=N       — verify the most recent N entries (default 10_000)
 *   --json           — machine-readable output
 *   --quiet          — stderr-only on breaks (cron-safe)
 *
 * Env:
 *   MONGODB_URI
 */

'use strict';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const QUIET = args.includes('--quiet');
const windowArg = args.find(a => a.startsWith('--window='));
const WINDOW = windowArg ? parseInt(windowArg.split('=')[1], 10) || 10_000 : 10_000;

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'audit-chain-verify — Phase-7 audit hash-chain integrity check',
      '',
      'Exit codes:',
      '  0  chain intact',
      '  1  ≥1 break (alert required)',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/audit-chain-verify.js',
      '  node scripts/audit-chain-verify.js --window=5000 --json',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const useColor = !JSON_MODE && !QUIET && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

async function main() {
  const mongoose = require('mongoose');
  const AuditLog = require('../models/auditLog.model');
  const { verifyChain } = require('../services/auditHashChainService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  // Pull the most recent N entries in ascending order (oldest of
  // the window first). We query with .sort({createdAt:-1}).limit(N)
  // then reverse so verify walks old→new.
  const recent = await AuditLog.find({}).sort({ createdAt: -1, _id: -1 }).limit(WINDOW).lean();

  const orderedOldToNew = recent.reverse();

  // Seed the verifier with the prevHash of the entry BEFORE the
  // window (if any), so we detect tampering at the window boundary.
  const firstInWindow = orderedOldToNew[0];
  let seedPrevHash = '';
  if (firstInWindow) {
    const priorEntry = await AuditLog.findOne({
      createdAt: { $lt: firstInWindow.createdAt },
    })
      .sort({ createdAt: -1, _id: -1 })
      .select('chainHash')
      .lean();
    if (priorEntry?.chainHash) seedPrevHash = priorEntry.chainHash;
  }

  // Prepend a synthetic sentinel so verifyChain starts with the
  // seeded prevHash. Easier than parameterizing.
  const sentinel = { _id: '__seed__', chainHash: seedPrevHash, prevHash: null };
  // Can't just verify sentinel directly — it wouldn't have its own
  // hash compute-able. Instead inline the seed by temporarily
  // setting `lastHash` via a copy of verifyChain with initial hash
  // support. Simpler: skip the first check if seedPrevHash is set by
  // trusting the prior entry, and verify from entry 0 onward.
  const result = verifyChain(orderedOldToNew);

  // If we have a seed and the first entry's prevHash doesn't match
  // it, add an explicit boundary-break report.
  if (
    firstInWindow &&
    seedPrevHash &&
    firstInWindow.prevHash !== undefined &&
    firstInWindow.prevHash !== null &&
    firstInWindow.prevHash !== seedPrevHash
  ) {
    result.breaks.unshift({
      index: -1,
      entryId: String(firstInWindow._id),
      reason: 'window_boundary_mismatch',
      expected: seedPrevHash,
      actual: firstInWindow.prevHash,
    });
    result.ok = false;
  }

  await mongoose.disconnect();

  const payload = {
    checkedAt: new Date().toISOString(),
    windowSize: WINDOW,
    verifiedCount: result.verifiedCount,
    breakCount: result.breaks.length,
    ok: result.ok,
    breaks: result.breaks.slice(0, 50), // sample for digest
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (!QUIET) {
    console.log(`\n${c.bold}audit-chain-verify${c.reset}\n`);
    console.log(
      `  ${c.dim}Window: ${c.cyan}${WINDOW}${c.reset}  ${c.dim}Verified: ${c.cyan}${result.verifiedCount}${c.reset}`
    );
    if (result.ok) {
      console.log(`  ${c.green}✓ chain intact${c.reset} — ${result.verifiedCount} entries\n`);
    } else {
      console.log(`  ${c.red}✗ ${result.breaks.length} break(s) detected${c.reset}\n`);
      for (const b of result.breaks.slice(0, 10)) {
        console.log(
          `    ${c.red}#${b.index}${c.reset} ${c.dim}${b.entryId}${c.reset} reason=${c.yellow}${b.reason}${c.reset}` +
            `\n      expected ${c.dim}${b.expected}${c.reset}` +
            `\n      actual   ${c.red}${b.actual}${c.reset}`
        );
      }
      console.log();
    }
  } else if (!result.ok) {
    process.stderr.write(
      `audit-chain-verify: ${result.breaks.length} break(s) in window=${WINDOW}\n`
    );
  }

  return result.ok ? 0 : 1;
}

module.exports = { _isTestOnly: true };

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      if (!JSON_MODE) console.error(`${c.red}audit-chain-verify failed:${c.reset} ${err.message}`);
      else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      process.exit(2);
    });
}
