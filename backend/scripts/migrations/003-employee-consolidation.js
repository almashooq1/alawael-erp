/**
 * Migration 003: Employee branch_id Backfill
 *
 * Ensures all employees in the HR/Employee schema have `branch_id` set
 * by looking up the linked user's branchId.
 *
 * Run: node backend/scripts/migrations/003-employee-consolidation.js
 * Prerequisite: Migration 001 must run first (users must have branchId)
 * Safe: Additive only — does not delete or overwrite existing data
 */

'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael';

async function migrate() {
  console.log('[Migration 003] Starting: Employee branch_id backfill');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const employeesCol = db.collection('employees');
  const usersCol = db.collection('users');

  // Find employees without branch_id
  const employees = await employeesCol
    .find({
      $or: [{ branch_id: { $exists: false } }, { branch_id: null }],
    })
    .toArray();

  console.log(`[Migration 003] Found ${employees.length} employees without branch_id`);

  let updated = 0;
  let skipped = 0;

  for (const emp of employees) {
    // Try userId first, then user_id (HR schema uses user_id)
    const userId = emp.userId || emp.user_id;
    if (!userId) {
      skipped++;
      continue;
    }

    const user = await usersCol.findOne(
      { _id: userId },
      { projection: { branchId: 1, branch: 1 } }
    );

    const userBranch = user?.branchId || user?.branch;
    if (userBranch) {
      await employeesCol.updateOne({ _id: emp._id }, { $set: { branch_id: userBranch } });
      updated++;
    } else {
      skipped++;
    }
  }

  // Ensure index on branch_id
  await employeesCol.createIndex(
    { branch_id: 1, status: 1 },
    { background: true, name: 'idx_branch_id_status' }
  );

  console.log(`[Migration 003] Updated: ${updated}, Skipped (no linked user/branch): ${skipped}`);
  console.log('[Migration 003] Index created: idx_branch_id_status');

  await mongoose.disconnect();
  console.log('[Migration 003] Complete');
}

migrate().catch(err => {
  console.error('[Migration 003] FAILED:', err);
  process.exit(1);
});
