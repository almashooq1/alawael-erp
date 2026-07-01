'use strict';

/**
 * CCTV branch-scope helper.
 *
 * CCTV models (CctvCamera / CctvRecording / CctvEvent / CctvNvr / CctvAlert) key
 * on `branchCode` (String, uppercase) — NOT `branchId` (ObjectId). So the usual
 * `branchFilter(req)` (which emits `{ branchId: ObjectId }`) is a phantom no-op
 * here. This helper resolves the caller's branch to its `branchCode` so CCTV
 * handlers can scope reads/asserts correctly.
 *
 * Requires `requireBranchAccess` to have populated `req.branchScope`.
 * Returns null for cross-branch / all-branches callers (i.e. no restriction).
 */

const mongoose = require('mongoose');

async function callerCctvBranchCode(req) {
  const bs = req && req.branchScope;
  if (!bs || bs.allBranches || !bs.branchId) return null;
  let Branch;
  try {
    Branch = mongoose.model('Branch');
  } catch (_e) {
    return null; // Branch model not registered → cannot resolve; fail-open is caller's concern
  }
  const b = await Branch.findById(bs.branchId).select('code').lean();
  return b && b.code ? String(b.code).toUpperCase() : null;
}

/**
 * True when `docBranchCode` is visible to the caller: either the caller is
 * cross-branch (callerCode == null) or the codes match.
 */
function branchCodeVisible(callerCode, docBranchCode) {
  if (!callerCode) return true; // cross-branch / all-branches
  return String(docBranchCode || '').toUpperCase() === callerCode;
}

module.exports = { callerCctvBranchCode, branchCodeVisible };
