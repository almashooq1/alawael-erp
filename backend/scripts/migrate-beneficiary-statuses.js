/**
 * migrate-beneficiary-statuses.js
 *
 * W0-LifecycleAlign: one-time migration to canonical lifecycle states.
 *
 * Maps legacy status aliases to their canonical lifecycle states:
 *   inactive  → archived
 *   pending   → draft
 *   graduated → discharged
 *
 * Also keeps the legacy `isArchived` flag in sync with the new state.
 *
 * Usage:
 *   node scripts/migrate-beneficiary-statuses.js --dry-run
 *   node scripts/migrate-beneficiary-statuses.js --batch-size 500
 */

'use strict';

const mongoose = require('mongoose');
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? Number(batchSizeArg.split('=')[1]) || 500 : 500;

const LEGACY_STATUS_MAP = {
  inactive: 'archived',
  pending: 'draft',
  graduated: 'discharged',
};

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael';

async function connect() {
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
  });
  console.log(`Connected to ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
}

async function main() {
  const start = Date.now();
  await connect();

  // Lazy-load the model so the script can run against the real DB connection.
  const Beneficiary = require('../models/Beneficiary');

  const legacyStatuses = Object.keys(LEGACY_STATUS_MAP);
  const totalToMigrate = await Beneficiary.countDocuments({
    status: { $in: legacyStatuses },
  });

  console.log(`\nMigration target: ${totalToMigrate} beneficiaries with legacy status`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no writes)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  if (totalToMigrate === 0) {
    console.log('Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  let processed = 0;
  let updated = 0;

  while (processed < totalToMigrate) {
    const batch = await Beneficiary.find({ status: { $in: legacyStatuses } })
      .limit(BATCH_SIZE)
      .select('_id status isArchived archivedDate archivedReason')
      .lean();

    if (batch.length === 0) break;

    const bulkOps = [];
    for (const doc of batch) {
      const canonical = LEGACY_STATUS_MAP[doc.status];
      const archivedStates = new Set(['archived', 'deleted', 'deletion-pending']);
      const setPayload = {
        status: canonical,
        isArchived: archivedStates.has(canonical),
      };

      if (canonical === 'archived' && !doc.isArchived) {
        setPayload.archivedDate = doc.archivedDate || new Date();
        if (!doc.archivedReason) setPayload.archivedReason = 'legacy-inactive-alias';
      }

      if (!isDryRun) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: setPayload },
          },
        });
      }
    }

    if (!isDryRun && bulkOps.length > 0) {
      const res = await Beneficiary.bulkWrite(bulkOps);
      updated += res.modifiedCount;
    }

    processed += batch.length;
    console.log(`  processed ${processed}/${totalToMigrate}`);
  }

  const remaining = await Beneficiary.countDocuments({ status: { $in: legacyStatuses } });

  console.log(`\nDone in ${Date.now() - start}ms`);
  if (isDryRun) {
    console.log(`Would migrate ${processed} records. Run without --dry-run to apply.`);
  } else {
    console.log(`Migrated ${updated} records. Remaining legacy statuses: ${remaining}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
