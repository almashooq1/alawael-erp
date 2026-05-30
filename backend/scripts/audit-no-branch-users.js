#!/usr/bin/env node
'use strict';

/**
 * audit-no-branch-users.js — READ-ONLY blast-radius audit for W597.
 * ════════════════════════════════════════════════════════════════════
 * Before flipping BRANCH_SCOPE_FAIL_CLOSED=true (which makes
 * requireBranchAccess DENY a restricted-tier user who has no branchId
 * instead of granting allBranches), this script tells you exactly WHO
 * that flip would lock out.
 *
 * It lists every active User who:
 *   • is NOT a CROSS_BRANCH_ROLE (those legitimately have no branch), and
 *   • is NOT a REGION_SCOPED_ROLE with regionIds (region-scoped, ok), and
 *   • has no `branchId` / `branch` / `branch_id`, and
 *   • has no active UserBranchRole secondment grant.
 *
 * Each row printed is an account that TODAY silently reads all 13
 * branches (the fail-OPEN hole) and that the fail-closed flip would deny.
 * An empty result = safe to flip the flag.
 *
 * READ-ONLY: performs only `.find().lean()` — never writes. Safe to run
 * against production.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/audit-no-branch-users.js
 *   MONGODB_URI=mongodb://... node scripts/audit-no-branch-users.js --json
 *
 * Exit codes: 0 = clean (no at-risk accounts) · 1 = at-risk accounts
 * found · 2 = usage/connection error.
 */

const JSON_OUT = process.argv.includes('--json');

const {
  CROSS_BRANCH_ROLES,
  REGION_SCOPED_ROLES,
  resolveRole,
} = require('../config/constants/roles.constants');

// External / portal roles (ADR-036 archetype = NON_MATRIX). These are NOT staff
// and are NOT branch-scoped: a parent/guardian/student is governed by the
// parent-portal + guardian-own-child ABAC policy (own beneficiary only), never
// by branchId. The BRANCH_SCOPE_FAIL_CLOSED flip changes STAFF branch scope, so
// a branch-less external account is NOT an at-risk fail-open hole — flagging
// them is a false positive that blocks the flip forever. (driver/bus_assistant
// are transport-ops and DO carry a branch, so they stay in scope.)
const EXTERNAL_PORTAL_ROLES = ['parent', 'guardian', 'student', 'viewer', 'user', 'guest'];

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  // Lazy-load models (need an active connection).
  const User = require('../models/User');
  let UserBranchRole = null;
  try {
    UserBranchRole = require('../models/UserBranchRole');
  } catch {
    UserBranchRole = null;
  }

  // Pull active users missing every branch identifier. Region-scoped
  // users are filtered in JS (role + regionIds combination).
  const candidates = await User.find({
    isActive: { $ne: false },
    $and: [
      { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
      { $or: [{ branch: { $exists: false } }, { branch: null }] },
      { $or: [{ branch_id: { $exists: false } }, { branch_id: null }] },
    ],
  })
    .select('_id email role regionIds')
    .lean();

  const atRisk = [];
  for (const u of candidates) {
    const role = resolveRole(u.role);
    if (CROSS_BRANCH_ROLES.includes(role)) continue; // legitimately branchless
    if (EXTERNAL_PORTAL_ROLES.includes(role)) continue; // portal/external — not staff branch scope
    if (REGION_SCOPED_ROLES.includes(role) && (u.regionIds || []).length > 0) continue; // region-scoped

    // Does an active secondment cover them? If so, post-W597 they're fine.
    let seconded = 0;
    if (UserBranchRole && typeof UserBranchRole.findActiveForUser === 'function') {
      try {
        const active = await UserBranchRole.findActiveForUser(u._id);
        seconded = (active || []).length;
      } catch {
        seconded = 0;
      }
    }
    if (seconded > 0) continue;

    atRisk.push({
      id: String(u._id),
      email: u.email || '(no email)',
      role: u.role || '(no role)',
      canonicalRole: role,
    });
  }

  if (JSON_OUT) {
    console.log(
      JSON.stringify({ ok: atRisk.length === 0, atRiskCount: atRisk.length, atRisk }, null, 2)
    );
  } else {
    log('');
    log('W597 fail-closed blast-radius audit');
    log('────────────────────────────────────');
    log(`Scanned ${candidates.length} active branch-less account(s).`);
    if (atRisk.length === 0) {
      log('✅ No at-risk accounts. Safe to set BRANCH_SCOPE_FAIL_CLOSED=true.');
    } else {
      log(`⚠️  ${atRisk.length} account(s) would be DENIED by the fail-closed flip:`);
      log('');
      for (const r of atRisk) {
        log(`   • ${r.email}  role=${r.role}  id=${r.id}`);
      }
      log('');
      log('Resolve each before flipping the flag: assign a branchId, grant a');
      log('UserBranchRole secondment, or promote to a CROSS_BRANCH / region role.');
    }
    log('');
  }

  await mongoose.disconnect();
  process.exit(atRisk.length === 0 ? 0 : 1);
})().catch(err => {
  console.error('audit-no-branch-users failed:', err.message);
  process.exit(2);
});
