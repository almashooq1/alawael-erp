#!/usr/bin/env node
/**
 * blockchain-verify-chain.js — chain-wide tamper sweep
 *
 * Walks every issued blockchain certificate and reports any whose stored
 * fields don't match the recomputed hash, the merkle proof, or the anchor
 * ledger. Designed to be safe to run on prod (read-only) and to be wired
 * into CI as a guard against silent corruption.
 *
 * Exit codes:
 *    0  every cert verified
 *    1  one or more certs failed (tampered or unverifiable)
 *    2  unexpected runtime error (DB unreachable, etc.)
 *
 * Flags:
 *    --json           machine-readable single-line JSON
 *    --limit=<N>      stop after N certs (handy for sampling)
 *    --status=<s>     restrict to status (default: skip draft only)
 *
 * Examples:
 *    npm run blockchain:verify-chain
 *    npm run blockchain:verify-chain -- --json --limit=200
 */

'use strict';

const mongoose = require('mongoose');
const auditor = require('../services/blockchain/chainAuditor');

function parseArgs(argv) {
  const out = { json: false, limit: null, status: null };
  for (const a of argv.slice(2)) {
    if (a === '--json') out.json = true;
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice(8)) || null;
    else if (a.startsWith('--status=')) out.status = a.slice(9);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    console.error('blockchain-verify-chain: MONGODB_URI is not set — refusing to run.');
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  const filter = {};
  if (args.status) filter.status = args.status;

  const start = Date.now();
  const report = await auditor.auditAll({
    filter,
    limit: args.limit,
    skipDraft: !args.status,
    onProgress: args.json
      ? null
      : v => {
          if (!v.ok) {
            const r = v.reasons.length ? ` [${v.reasons.join(', ')}]` : '';
            console.log(`  ✕ ${v.certificateNumber || v._id}${r}`);
          }
        },
  });
  const ms = Date.now() - start;

  const exitCode = report.tampered === 0 ? 0 : 1;

  if (args.json) {
    console.log(
      JSON.stringify({
        scanned: report.scanned,
        ok: report.ok,
        tampered: report.tampered,
        durationMs: ms,
        failures: report.items.filter(i => !i.ok),
      })
    );
  } else {
    console.log('────────────────────────────────────────');
    console.log(`Scanned : ${report.scanned}`);
    console.log(`Verified: ${report.ok}`);
    console.log(`Tampered: ${report.tampered}`);
    console.log(`Duration: ${ms}ms`);
    console.log('────────────────────────────────────────');
    if (exitCode !== 0) {
      console.log('FAIL — see ✕ lines above.');
    } else {
      console.log('OK');
    }
  }

  await mongoose.disconnect();
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(err => {
    console.error('blockchain-verify-chain: unexpected error\n', err);
    process.exit(2);
  });
}
