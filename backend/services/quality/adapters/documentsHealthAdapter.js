'use strict';

/**
 * documentsHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Adapter over the Document model producing:
 *
 *   getValidDocsRate({ branchId }) => 0..1 | null
 *
 * Valid = active + not archived + (no expiry OR expiry in future).
 *
 * Branch-scope caveat: the Document model has no `branchId` field
 * in the current schema, so passing `branchId` is currently
 * ignored and the metric is org-wide. When a branch field is
 * added later the adapter picks it up automatically — we try
 * filtering first and fall back to the unfiltered query if the
 * first query returns nothing (handles both schema variants).
 *
 * Active status sentinel is the Arabic 'نشط' per the existing
 * Document schema.
 */

const ACTIVE_STATUS_VALUES = Object.freeze(['نشط', 'active', 'published']);

function createDocumentsHealthAdapter({ model, logger = console, now = () => new Date() } = {}) {
  if (!model) throw new Error('documentsHealthAdapter: model is required');

  async function getValidDocsRate({ branchId } = {}) {
    const base = {};
    let docs;
    try {
      // Try branch-filtered first; if the model has no branch
      // field it will simply return []. Detect by running both.
      if (branchId) {
        const branchFiltered = await model.find({ ...base, branchId }).limit(5000);
        if (branchFiltered.length > 0) {
          return _computeRate(branchFiltered, now());
        }
      }
      docs = await model.find(base).limit(5000);
    } catch (err) {
      logger.warn(`[documentsAdapter] query failed: ${err.message}`);
      return null;
    }
    return _computeRate(docs, now());
  }

  function _computeRate(docs, nowDate) {
    if (!docs || !docs.length) return null;
    let valid = 0;
    let total = 0;
    for (const d of docs) {
      total++;
      if (d.isArchived) continue;
      const status = d.status;
      if (status && !ACTIVE_STATUS_VALUES.includes(status)) continue;
      if (d.expiryDate) {
        const exp = new Date(d.expiryDate);
        if (exp.getTime() < nowDate.getTime()) continue;
      }
      valid++;
    }
    if (!total) return null;
    return valid / total;
  }

  return { getValidDocsRate };
}

module.exports = {
  createDocumentsHealthAdapter,
  ACTIVE_STATUS_VALUES,
};
