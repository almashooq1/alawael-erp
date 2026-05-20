'use strict';
/**
 * Document Archive Smart Service — خدمة التوصية الذكية بالأرشفة
 * ══════════════════════════════════════════════════════════════════════════
 * Scans active documents and produces archive recommendations based on a
 * weighted score (0..1). Pure functions where possible so unit tests can
 * inject dates and documents directly.
 *
 * Signals (each contributes to score):
 *   - idle:           lastViewedAt / updatedAt older than `idleMonths`   (+0.30)
 *   - expired:        expiryDate in the past                              (+0.30)
 *   - low-traffic:    viewCount + downloadCount === 0 AND age > 12 mo     (+0.15)
 *   - workflow-dead:  workflowStatus in ('cancelled','rejected')          (+0.20)
 *   - approval-stale: approvalStatus = 'مرفوض' / 'موافق عليه' AND age>2y (+0.10)
 *
 * Score thresholds:
 *   ≥ 0.80 — strongly recommended (auto-eligible)
 *   ≥ 0.50 — recommended (default cutoff)
 *   < 0.50 — keep active
 *
 * The service never archives anything itself; it only marks documents
 * with `archiveRecommendation.{score,reasons,suggestedAt}`. Routes
 * surface those to an admin who acknowledges or dismisses.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * scoreDocument — pure function. Returns { score, reasons[] }.
 * @param {object} doc — lean Document
 * @param {object} opts
 * @param {Date}   opts.now           reference "now" (testable)
 * @param {number} opts.idleMonths    threshold for the idle signal
 */
function scoreDocument(doc, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const idleMonths = Number(opts.idleMonths) || 6;
  const reasons = [];
  let score = 0;

  const referenceDate = doc.lastViewedAt || doc.updatedAt || doc.lastModified || doc.createdAt;
  if (referenceDate) {
    const daysIdle = (now - new Date(referenceDate)) / MS_PER_DAY;
    const idleDayThreshold = idleMonths * 30;
    if (daysIdle >= idleDayThreshold) {
      score += 0.3;
      reasons.push(`غير مستخدم منذ ${Math.floor(daysIdle / 30)} شهراً`);
    }
  }

  if (doc.expiryDate && new Date(doc.expiryDate) < now) {
    score += 0.3;
    reasons.push('انتهت صلاحية المستند');
  }

  const viewCount = Number(doc.viewCount) || 0;
  const downloadCount = Number(doc.downloadCount) || 0;
  if (doc.createdAt) {
    const ageDays = (now - new Date(doc.createdAt)) / MS_PER_DAY;
    if (ageDays > 365 && viewCount === 0 && downloadCount === 0) {
      score += 0.15;
      reasons.push('لم يُفتح مطلقاً منذ سنة');
    }
    if (ageDays > 730 && (doc.approvalStatus === 'مرفوض' || doc.approvalStatus === 'موافق عليه')) {
      score += 0.1;
      reasons.push('قرار الموافقة قديم (>2 سنة)');
    }
  }

  if (doc.workflowStatus === 'cancelled' || doc.workflowStatus === 'rejected') {
    score += 0.2;
    reasons.push(`حالة سير العمل: ${doc.workflowStatus}`);
  }

  if (score > 1) score = 1;
  return { score: Number(score.toFixed(2)), reasons };
}

/**
 * scanAndRecommend — scans the DB and writes recommendations.
 * Returns a summary { scanned, recommended, dismissed, byBand }.
 */
async function scanAndRecommend(opts = {}) {
  const Document = safeModel('Document');
  if (!Document) {
    return { scanned: 0, recommended: 0, dismissed: 0, byBand: {} };
  }
  const idleMonths = Number(opts.idleMonths) || 6;
  const minScore = Number(opts.minScore) || 0.5;
  const limit = Math.min(Number(opts.limit) || 500, 2000);
  const now = opts.now instanceof Date ? opts.now : new Date();

  const candidates = await Document.find({
    isArchived: { $ne: true },
    status: { $ne: 'محذوف' },
    'archiveRecommendation.dismissed': { $ne: true },
  })
    .select(
      'createdAt updatedAt lastModified lastViewedAt expiryDate viewCount downloadCount workflowStatus approvalStatus'
    )
    .limit(limit)
    .lean();

  const byBand = { strong: 0, moderate: 0, weak: 0 };
  let recommended = 0;
  const ops = [];
  for (const doc of candidates) {
    const { score, reasons } = scoreDocument(doc, { now, idleMonths });
    if (score >= 0.8) byBand.strong += 1;
    else if (score >= 0.5) byBand.moderate += 1;
    else byBand.weak += 1;

    if (score >= minScore) {
      recommended += 1;
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              'archiveRecommendation.score': score,
              'archiveRecommendation.reasons': reasons,
              'archiveRecommendation.suggestedAt': now,
              'archiveRecommendation.acknowledged': false,
              'archiveRecommendation.dismissed': false,
            },
          },
        },
      });
    } else {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $unset: {
              'archiveRecommendation.score': '',
              'archiveRecommendation.reasons': '',
              'archiveRecommendation.suggestedAt': '',
            },
          },
        },
      });
    }
  }

  if (ops.length) {
    try {
      await Document.bulkWrite(ops, { ordered: false });
    } catch (err) {
      logger.warn(`[ArchiveSmart] bulkWrite partial failure: ${err.message}`);
    }
  }

  logger.info(
    `[ArchiveSmart] scanned=${candidates.length} recommended=${recommended} ` +
      `(strong=${byBand.strong} moderate=${byBand.moderate} weak=${byBand.weak})`
  );
  return { scanned: candidates.length, recommended, byBand };
}

/**
 * touchLastViewed — fire-and-forget helper for read paths to update
 * `lastViewedAt` without coupling them to mongoose directly.
 */
async function touchLastViewed(documentId) {
  if (!documentId) return;
  const Document = safeModel('Document');
  if (!Document) return;
  try {
    await Document.updateOne({ _id: documentId }, { $set: { lastViewedAt: new Date() } });
  } catch (err) {
    logger.warn(`[ArchiveSmart] touchLastViewed failed: ${err.message}`);
  }
}

function safeModel(name) {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
}

module.exports = {
  scoreDocument,
  scanAndRecommend,
  touchLastViewed,
};
