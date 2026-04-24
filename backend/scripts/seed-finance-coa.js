#!/usr/bin/env node
/**
 * seed-finance-coa.js — Phase 12 Commit 6.
 *
 * Standalone CLI to seed / refresh the default Chart of Accounts in
 * the shape the Phase-12 finance services expect.
 *
 *   node scripts/seed-finance-coa.js
 *
 * Idempotent: re-running only updates existing accounts. Exits with
 * code 0 on success, 1 on failure.
 */

'use strict';

const mongoose = require('mongoose');

async function main() {
  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alawael-erp';

  console.log(`[coa-seed] connecting to ${uri.replace(/:([^:@/]+)@/, ':****@')}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const ChartOfAccount = require('../models/finance/ChartOfAccount');
  const { bootstrap, listCodes } = require('../services/finance/chartOfAccountsBootstrap');

  const result = await bootstrap({ ChartOfAccountModel: ChartOfAccount });
  console.log(
    `[coa-seed] inserted=${result.inserted} updated=${result.updated} total=${result.total}`
  );
  console.log(`[coa-seed] codes managed: ${listCodes().join(', ')}`);

  await mongoose.disconnect();
}

main().then(
  () => process.exit(0),
  err => {
    console.error('[coa-seed] failed:', err.message);
    mongoose.disconnect().finally(() => process.exit(1));
  }
);
