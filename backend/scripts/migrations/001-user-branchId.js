/**
 * Migration 001: User branchId Field
 *
 * Copies the legacy `branch` field value to the new `branchId` field
 * for all user documents where branchId is not yet set.
 *
 * Run: node backend/scripts/migrations/001-user-branchId.js
 * Prerequisite: MongoDB connection configured in environment
 * Safe: Additive only — does not delete or overwrite existing data
 */

'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael';

async function migrate() {
  console.log('[Migration 001] Starting: User branch → branchId');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  // Step 1: Copy `branch` to `branchId` where branchId is missing
  const result = await usersCol.updateMany(
    {
      branch: { $exists: true, $ne: null },
      $or: [{ branchId: { $exists: false } }, { branchId: null }],
    },
    [{ $set: { branchId: '$branch' } }]
  );
  console.log(`[Migration 001] Copied branch → branchId for ${result.modifiedCount} users`);

  // Step 2: Create indexes
  await usersCol.createIndex({ branchId: 1 }, { background: true, name: 'idx_branchId' });
  await usersCol.createIndex(
    { branchId: 1, role: 1 },
    { background: true, name: 'idx_branchId_role' }
  );
  console.log('[Migration 001] Indexes created: idx_branchId, idx_branchId_role');

  // Step 3: Verify
  const total = await usersCol.countDocuments({});
  const withBranch = await usersCol.countDocuments({ branchId: { $exists: true, $ne: null } });
  const withoutBranch = await usersCol.countDocuments({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  });
  console.log(
    `[Migration 001] Summary: ${total} total, ${withBranch} with branchId, ${withoutBranch} without (system/unassigned users)`
  );

  await mongoose.disconnect();
  console.log('[Migration 001] Complete');
}

migrate().catch(err => {
  console.error('[Migration 001] FAILED:', err);
  process.exit(1);
});
