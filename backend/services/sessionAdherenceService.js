/**
 * sessionAdherenceService — beneficiary-level session attendance rollup.
 *
 * Powers KPI `rehab.sessions.adherence.pct` → summarize() → adherencePct.
 * Pure math over hydrated SessionAttendance rows; the async summarize()
 * wrapper queries the model when called from the KPI resolver.
 */

'use strict';

const mongoose = require('mongoose');

const PRESENT_STATES = new Set(['present', 'late']);

function getModel() {
  try {
    return mongoose.models.SessionAttendance || require('../models/SessionAttendance');
  } catch {
    return null;
  }
}

function sinceDate(windowDays = 30) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

function summarizeRecords(records) {
  let present = 0;
  let total = 0;
  for (const r of records || []) {
    if (!r?.status) continue;
    total += 1;
    if (PRESENT_STATES.has(String(r.status).toLowerCase())) present += 1;
  }
  return {
    adherencePct: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
    total,
    present,
  };
}

async function summarize(opts = {}) {
  const Model = getModel();
  if (!Model) return summarizeRecords([]);

  const query = { scheduledDate: { $gte: sinceDate(opts.windowDays ?? 30) } };
  if (opts.branchId) query.branchId = opts.branchId;
  if (opts.beneficiaryId) query.beneficiaryId = opts.beneficiaryId;

  const records = await Model.find(query).lean();
  return summarizeRecords(records);
}

module.exports = {
  PRESENT_STATES,
  summarizeRecords,
  summarize,
};
