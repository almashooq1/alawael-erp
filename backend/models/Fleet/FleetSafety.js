'use strict';
const mongoose = require('mongoose');

// W1607 — tenant isolation. The schema was `{}` strict:false (no branch dimension), so the
// fleet-safety routes could not scope by branch → cross-branch IDOR read/write. Declare a
// typed `branchId` (stamped on create from the caller's scope) so branchFilter(req) works.
// Additive (pre-adoption — collections empty; no backfill). strict:false is preserved.
const schema = new mongoose.Schema(
  { branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true } },
  { strict: false, timestamps: true }
);

module.exports = mongoose.models.FleetSafety || mongoose.model('FleetSafety', schema);
