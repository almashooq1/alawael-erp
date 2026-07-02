#!/usr/bin/env node
/**
 * backfill-ei-branch.js — W1608
 *
 * Sets `branchId` on pre-W1599 Early-Intervention documents so the branch
 * isolation shipped in #914/#925/#928/#931 fully covers LEGACY data too — after
 * which the legacy-null escape in earlyIntervention.service.js can be dropped for
 * a hard enforce. On a fresh / pre-adoption DB (empty EI collections) this is a
 * no-op, so it is always safe to run.
 *
 * Branch source for a child (first hit wins):
 *   1. createdBy       → User.branchId
 *   2. primaryCoordinator → User.branchId
 * Sub-resources (screening / milestone / IFSP / referral) INHERIT their parent
 * child's branchId.
 *
 * Idempotent — only documents with no branchId are touched. Dry-run by default.
 *
 * Usage:
 *   node scripts/backfill-ei-branch.js                         # dry-run (report only)
 *   MONGODB_URI=... node scripts/backfill-ei-branch.js --apply # write
 */
'use strict';

const mongoose = require('mongoose');

const NO_BRANCH = { branchId: { $in: [null, undefined] } };

async function resolveUserBranch(User, cache, userId) {
  if (!userId) return null;
  const key = String(userId);
  if (cache.has(key)) return cache.get(key);
  const u = await User.findById(userId).select('branchId').lean();
  const branch = u && u.branchId ? u.branchId : null;
  cache.set(key, branch);
  return branch;
}

/**
 * Core logic — assumes an active mongoose connection with the EI + User models
 * registered. Returns a report; writes only when `apply` is true.
 */
async function backfillEiBranch({ apply = false } = {}) {
  const EarlyInterventionChild = mongoose.model('EarlyInterventionChild');
  const User = mongoose.model('User');
  const subModels = ['DevelopmentalScreening', 'DevelopmentalMilestone', 'IFSP', 'EarlyReferral'].map(
    n => mongoose.model(n)
  );

  const report = { childrenMapped: 0, childrenUnmapped: 0, subMapped: 0, subUnmapped: 0 };
  const userBranchCache = new Map();
  const childBranch = new Map(); // childId -> branchId (ALL children, for inheritance)

  // Children: keep existing branchId, else derive from createdBy / coordinator.
  const children = await EarlyInterventionChild.find({})
    .select('_id branchId createdBy primaryCoordinator')
    .lean();
  for (const c of children) {
    let branchId = c.branchId || null;
    if (!branchId) {
      branchId =
        (await resolveUserBranch(User, userBranchCache, c.createdBy)) ||
        (await resolveUserBranch(User, userBranchCache, c.primaryCoordinator));
      if (branchId) {
        report.childrenMapped++;
        if (apply) await EarlyInterventionChild.updateOne({ _id: c._id }, { $set: { branchId } });
      } else {
        report.childrenUnmapped++;
      }
    }
    if (branchId) childBranch.set(String(c._id), branchId);
  }

  // Sub-resources inherit their parent child's branchId.
  for (const Model of subModels) {
    const rows = await Model.find(NO_BRANCH).select('_id child').lean();
    for (const r of rows) {
      const branchId = childBranch.get(String(r.child));
      if (branchId) {
        report.subMapped++;
        if (apply) await Model.updateOne({ _id: r._id }, { $set: { branchId } });
      } else {
        report.subUnmapped++;
      }
    }
  }

  return report;
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && !process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is required for --apply.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/alawael');
  require('../models/User');
  require('../models/EarlyIntervention');

  const report = await backfillEiBranch({ apply });
  console.log(JSON.stringify({ mode: apply ? 'APPLIED' : 'DRY-RUN', ...report }, null, 2));
  if (report.childrenUnmapped || report.subUnmapped) {
    console.log(
      `\n⚠ ${report.childrenUnmapped} children + ${report.subUnmapped} sub-resources have no ` +
        `derivable branch (no createdBy/coordinator branch, or orphaned child). They keep the ` +
        `legacy-null escape — resolve those manually before dropping it for a hard enforce.`
    );
  }
  await mongoose.disconnect();
}

module.exports = { backfillEiBranch, resolveUserBranch };

if (require.main === module) {
  main().catch(err => {
    console.error('[backfill-ei-branch] failed:', err);
    process.exit(1);
  });
}
