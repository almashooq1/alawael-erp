/**
 * Migration 002: Group branchId Backfill
 *
 * Backfills `branchId` for all groups by looking up the `createdBy` user's branch.
 *
 * Run: node backend/scripts/migrations/002-group-branchId.js
 * Prerequisite: Migration 001 must run first (users must have branchId)
 * Safe: Additive only — does not delete or overwrite existing data
 */

'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael';

async function migrate() {
  console.log('[Migration 002] Starting: Group branchId backfill');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const groupsCol = db.collection('groups');
  const usersCol = db.collection('users');

  // Find groups without branchId
  const groups = await groupsCol
    .find({
      $or: [{ branchId: { $exists: false } }, { branchId: null }],
      createdBy: { $exists: true, $ne: null },
    })
    .toArray();

  console.log(`[Migration 002] Found ${groups.length} groups without branchId`);

  let updated = 0;
  let skipped = 0;

  for (const group of groups) {
    const user = await usersCol.findOne(
      { _id: group.createdBy },
      { projection: { branchId: 1, branch: 1 } }
    );

    const userBranch = user?.branchId || user?.branch;
    if (userBranch) {
      await groupsCol.updateOne({ _id: group._id }, { $set: { branchId: userBranch } });
      updated++;
    } else {
      skipped++;
    }
  }

  // Create index
  await groupsCol.createIndex(
    { branchId: 1, status: 1 },
    { background: true, name: 'idx_branchId_status' }
  );

  console.log(`[Migration 002] Updated: ${updated}, Skipped (no user branch): ${skipped}`);
  console.log('[Migration 002] Index created: idx_branchId_status');

  await mongoose.disconnect();
  console.log('[Migration 002] Complete');
}

migrate().catch(err => {
  console.error('[Migration 002] FAILED:', err);
  process.exit(1);
});
