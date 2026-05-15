#!/usr/bin/env node
/**
 * backfill-branch-national-address.js
 *
 * Migrates the deprecated `Branch.wasel_short_code` + `Branch.wasel_verification`
 * fields into the unified `Branch.nationalAddress` subdocument added in
 * the 2026-05-15 Phase 28 rollout.
 *
 * Strategy:
 *   • For every branch document where `wasel_short_code` is set AND
 *     `nationalAddress` is missing/empty, build a `nationalAddress`
 *     object from the legacy fields and write it back.
 *   • The legacy fields are kept in place (NOT deleted) — both shapes
 *     still read fine. A second sweep can drop them once consumers
 *     have moved to `nationalAddress`.
 *
 * Usage:
 *   node scripts/backfill-branch-national-address.js                    # all branches
 *   node scripts/backfill-branch-national-address.js --dry-run          # preview only
 *   node scripts/backfill-branch-national-address.js --uri=mongodb://...# override URI
 *
 * Idempotent: re-running after a successful pass is a no-op because
 * the second pass sees `nationalAddress` already populated and skips.
 */

'use strict';

const path = require('path');
process.env.NODE_PATH = path.join(__dirname, '..');
require('module').Module._initPaths();

const mongoose = require('mongoose');

/**
 * Pure transform from a legacy Branch document to the canonical
 * `nationalAddress` subdocument shape. Exported so unit tests can
 * exercise the mapping without a live DB.
 *
 * Returns null when there is nothing to backfill (no short code).
 */
function projectLegacyToNationalAddress(branchDoc) {
  if (!branchDoc) return null;
  const sc = (branchDoc.wasel_short_code || '').toString().trim().toUpperCase();
  if (!sc) return null;
  const wv = branchDoc.wasel_verification || {};
  return {
    shortCode: sc,
    buildingNumber: wv.buildingNumber || undefined,
    additionalNumber: wv.additionalNumber || undefined,
    postalCode: wv.postalCode || undefined,
    district: wv.district || undefined,
    city: wv.city || undefined,
    fullAddress: wv.address || undefined,
    country: 'SA',
    geo: wv.geo && wv.geo.lat != null ? { lat: wv.geo.lat, lng: wv.geo.lng } : undefined,
    isDeliverable: wv.isDeliverable,
    verification: {
      verified: wv.verified === true,
      status: wv.status || (wv.verified === true ? 'match' : 'unverified'),
      mode: wv.mode,
      verifiedAt: wv.lastVerifiedAt,
      message: wv.message,
    },
  };
}

function isAddressMeaningful(addr) {
  if (!addr || typeof addr !== 'object') return false;
  // Any of these being set means the new subdoc was already populated.
  return !!(addr.shortCode || addr.city || addr.district || addr.fullAddress);
}

function parseArgs() {
  const out = { dryRun: false, uri: undefined };
  for (const a of process.argv.slice(2)) {
    if (a === '--dry-run' || a === '-n') out.dryRun = true;
    else if (a.startsWith('--uri=')) out.uri = a.slice(6);
    else if (a === '--help' || a === '-h') {
      console.log(
        'usage: node scripts/backfill-branch-national-address.js [--dry-run] [--uri=...]'
      );
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const uri = args.uri || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('No MongoDB URI. Set MONGODB_URI env var or pass --uri=...');
    process.exit(1);
  }
  const Branch = require('../models/Branch');

  console.log(`[backfill] connecting to ${uri.replace(/:\/\/[^@]+@/, '://***@')}`);
  await mongoose.connect(uri);

  let scanned = 0;
  let candidates = 0;
  let written = 0;
  let skipped_already_set = 0;
  let skipped_no_legacy = 0;

  const cursor = Branch.find({}, { wasel_short_code: 1, wasel_verification: 1, nationalAddress: 1 })
    .lean()
    .cursor();

  for await (const doc of cursor) {
    scanned += 1;

    if (isAddressMeaningful(doc.nationalAddress)) {
      skipped_already_set += 1;
      continue;
    }
    const projected = projectLegacyToNationalAddress(doc);
    if (!projected) {
      skipped_no_legacy += 1;
      continue;
    }
    candidates += 1;

    if (args.dryRun) {
      console.log(`[dry-run] would update branch=${doc._id} shortCode=${projected.shortCode}`);
      continue;
    }

    await Branch.updateOne({ _id: doc._id }, { $set: { nationalAddress: projected } });
    written += 1;
    if (written % 25 === 0) console.log(`[backfill] wrote ${written}/${candidates} so far…`);
  }

  console.log(`\n[backfill] done.`);
  console.log(`  scanned             : ${scanned}`);
  console.log(`  candidates          : ${candidates}`);
  console.log(`  written             : ${written}${args.dryRun ? ' (dry-run — no writes)' : ''}`);
  console.log(`  skipped (already set): ${skipped_already_set}`);
  console.log(`  skipped (no legacy)  : ${skipped_no_legacy}`);

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { projectLegacyToNationalAddress, isAddressMeaningful };
