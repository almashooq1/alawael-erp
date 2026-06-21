/**
 * sessionDocumentationService — documentation completeness for completed sessions.
 *
 * Powers KPI `rehab.progress.documented.pct` → summarize() → documentedPct.
 */

'use strict';

const mongoose = require('mongoose');

function getModels() {
  try {
    return {
      TherapySession: mongoose.models.TherapySession || require('../models/TherapySession'),
      SessionDocumentation:
        mongoose.models.SessionDocumentation || require('../models/SessionDocumentation'),
    };
  } catch {
    return {};
  }
}

function sinceDate(windowDays = 30) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

async function summarize(opts = {}) {
  const { TherapySession, SessionDocumentation } = getModels();
  if (!TherapySession || !SessionDocumentation) {
    return { documentedPct: null, completed: 0, documented: 0 };
  }

  const q = { date: { $gte: sinceDate(opts.windowDays ?? 30) }, status: 'COMPLETED' };
  if (opts.branchId) q.branchId = opts.branchId;
  if (opts.beneficiaryId) q.beneficiary = opts.beneficiaryId;

  const completed = await TherapySession.find(q, '_id').lean();
  const ids = completed.map(s => s._id);
  const documented = ids.length
    ? await SessionDocumentation.countDocuments({ session: { $in: ids } })
    : 0;

  return {
    documentedPct: ids.length > 0 ? Math.round((documented / ids.length) * 1000) / 10 : null,
    completed: ids.length,
    documented,
  };
}

module.exports = { summarize };
