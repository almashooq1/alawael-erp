#!/usr/bin/env node
'use strict';

/**
 * Migration: backfill nphies.submission.updatedAt for NphiesClaim docs.
 *
 * Context (W1437):
 *   The reconciliation sweeper query now relies on nphies.submission.updatedAt
 *   instead of the previous $exists:false fallback that caused full collection
 *   scans in production. This field was not declared in the original schema, so
 *   existing documents need to be backfilled before the new sweeper code is
 *   deployed.
 *
 * Run:
 *   NODE_ENV=production node backend/scripts/migrate-nphies-claim-updatedAt.js
 *
 * Safety:
 *   - Uses updateMany with a filter that only touches docs missing the field.
 *   - Defaults to submittedAt, then createdAt, then now.
 *   - Sets updatedBy='migration' for traceability.
 *   - Logs a summary and exits non-zero on error.
 */

const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[migrate-nphies-claim-updatedAt] MONGODB_URI/MONGO_URI is required');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
  });

  const NphiesClaim = mongoose.models.NphiesClaim || require('../models/NphiesClaim');

  const filter = {
    $or: [
      { 'nphies.submission.updatedAt': { $exists: false } },
      { 'nphies.submission.updatedAt': null },
    ],
  };

  const fallback = {
    $cond: [
      { $ifNull: ['$nphies.submission.submittedAt', false] },
      '$nphies.submission.submittedAt',
      {
        $cond: [{ $ifNull: ['$createdAt', false] }, '$createdAt', new Date()],
      },
    ],
  };

  const result = await NphiesClaim.updateMany(filter, [
    {
      $set: {
        'nphies.submission.updatedAt': fallback,
        'nphies.submission.updatedBy': 'migration',
      },
    },
  ]);

  console.log('[migrate-nphies-claim-updatedAt] done', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[migrate-nphies-claim-updatedAt] failed', err);
  process.exit(1);
});
