'use strict';

/**
 * hikvision-fraud-score.service.js — Wave 100 Phase 5.
 *
 * Owns the rolling per-employee fraud score. The detection service
 * EMITS flags; this service AGGREGATES them with a decaying weight
 * function and writes `HikvisionFraudScore` rows for fast UI lookup.
 *
 * Public API:
 *   recomputeScore(employeeId) — full recompute from underlying flags
 *   applyFlag(flag)            — incremental update after a new flag
 *   decayAllScores({now?})     — cron-callable: recompute every score
 *                                (cheap because we only touch rows
 *                                that changed band)
 *   getScore(employeeId)       — read API
 *   listScores(filter)         — list with band/branch filters
 *   getBranchSummary(branchId) — counts per band for a branch
 *
 * Cron pattern: detection runs every N minutes → emits flags → applies
 * incrementally; daily cron then runs `decayAllScores` to flush
 * decayed contributions.
 */

const reg = require('./hikvision.registry');

function createHikvisionFraudScoreService({
  scoreModel = null,
  flagModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!scoreModel) {
    throw new Error('hikvision-fraud-score.service: scoreModel is required');
  }
  if (!flagModel) {
    throw new Error('hikvision-fraud-score.service: flagModel is required');
  }

  // ─── Core compute ────────────────────────────────────────────

  async function recomputeScore(employeeId) {
    if (!employeeId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }

    // Pull all flags for the employee — the helper handles decay/expiry.
    let cursor = flagModel.find({ employeeId }).sort({ detectedAt: -1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const flags = await cursor;

    const nowDate = now();
    const newScore = reg.computeScoreFromFlags(flags, { now: nowDate.getTime() });
    const band = reg.classifyScoreBand(newScore);

    const flagCount = _buildFlagCount(flags);

    // Find primary branch — branch with most flags.
    const branchCounts = new Map();
    for (const f of flags) {
      if (!f.branchId) continue;
      const k = String(f.branchId);
      branchCounts.set(k, (branchCounts.get(k) || 0) + 1);
    }
    let primaryBranchId = null;
    let max = 0;
    for (const [k, v] of branchCounts) {
      if (v > max) {
        max = v;
        primaryBranchId = k;
      }
    }

    const lastFlag = flags[0] || null; // already sorted DESC by detectedAt

    return _upsertScore({
      employeeId,
      currentScore: newScore,
      band,
      flagCount,
      lastFlagId: lastFlag ? lastFlag._id : null,
      lastFlagAt: lastFlag ? lastFlag.detectedAt : null,
      primaryBranchId,
      lastComputedAt: nowDate,
    });
  }

  /**
   * Incremental update — called by the detection service immediately
   * after emitting a flag. Faster than a full recompute because we
   * just add the new flag's impact + bump counters; the next
   * decay-all sweep corrects any drift.
   */
  async function applyFlag(flag) {
    if (!flag || !flag.employeeId) return { ok: true, skipped: true };

    const existing = await scoreModel.findOne({ employeeId: flag.employeeId }).lean();

    const nowDate = now();
    const addScore = Number.isFinite(flag.scoreImpact) ? flag.scoreImpact : 0;
    const newScore = Math.min(100, (existing?.currentScore || 0) + addScore);
    const band = reg.classifyScoreBand(newScore);

    const flagCount = {
      open: (existing?.flagCount?.open || 0) + (flag.state === reg.FRAUD_FLAG_STATE.OPEN ? 1 : 0),
      acknowledged: existing?.flagCount?.acknowledged || 0,
      dismissed: existing?.flagCount?.dismissed || 0,
      escalated: existing?.flagCount?.escalated || 0,
      expired: existing?.flagCount?.expired || 0,
      total: (existing?.flagCount?.total || 0) + 1,
    };

    return _upsertScore({
      employeeId: flag.employeeId,
      currentScore: newScore,
      band,
      flagCount,
      lastFlagId: flag._id,
      lastFlagAt: flag.detectedAt || nowDate,
      primaryBranchId: existing?.primaryBranchId || flag.branchId || null,
      lastComputedAt: nowDate,
    });
  }

  async function decayAllScores({ now: nowArg } = {}) {
    const nowDate = nowArg || now();

    // Discover every employeeId with a score row.
    let cursor = scoreModel.find({}).sort({ lastComputedAt: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const rows = await cursor;

    let recomputed = 0;
    let bandChanges = 0;
    for (const r of rows) {
      const prev = r.band;
      const res = await recomputeScore(r.employeeId);
      if (res.ok) {
        recomputed += 1;
        if (res.score && res.score.band !== prev) bandChanges += 1;
      }
    }
    return {
      ok: true,
      scanned: rows.length,
      recomputed,
      bandChanges,
      at: nowDate,
    };
  }

  // ─── Read APIs ───────────────────────────────────────────────

  async function getScore(employeeId) {
    if (!employeeId) return { ok: false, reason: reg.REASON.FRAUD_SCORE_NOT_FOUND };
    const s = await scoreModel.findOne({ employeeId }).lean();
    if (!s) return { ok: false, reason: reg.REASON.FRAUD_SCORE_NOT_FOUND };
    return { ok: true, score: s };
  }

  async function listScores(filter = {}) {
    const q = {};
    if (filter.band) q.band = filter.band;
    if (filter.primaryBranchId) q.primaryBranchId = filter.primaryBranchId;
    if (filter.minScore !== undefined) {
      q.currentScore = { ...(q.currentScore || {}), $gte: Number(filter.minScore) };
    }
    if (filter.maxScore !== undefined) {
      q.currentScore = { ...(q.currentScore || {}), $lte: Number(filter.maxScore) };
    }

    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = scoreModel.find(q).sort({ currentScore: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof scoreModel.countDocuments === 'function'
        ? await scoreModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getBranchSummary(branchId) {
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    let cursor = scoreModel.find({ primaryBranchId: branchId });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const rows = await cursor;

    const byBand = {};
    for (const b of reg.FRAUD_SEVERITIES) byBand[b] = 0;
    let maxScore = 0;
    let avgScore = 0;
    for (const r of rows) {
      const b = reg.FRAUD_SEVERITIES.includes(r.band) ? r.band : reg.FRAUD_SEVERITY.LOW;
      byBand[b] += 1;
      avgScore += r.currentScore || 0;
      if (r.currentScore > maxScore) maxScore = r.currentScore;
    }
    avgScore = rows.length === 0 ? 0 : avgScore / rows.length;
    return {
      ok: true,
      branchId,
      employeeCount: rows.length,
      byBand,
      maxScore,
      avgScore: Number(avgScore.toFixed(2)),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  async function _upsertScore(payload) {
    const existing = await scoreModel.findOne({ employeeId: payload.employeeId }).lean();
    if (existing) {
      const doc = await scoreModel.findById(existing._id);
      Object.assign(doc, payload);
      try {
        await doc.validate();
      } catch (err) {
        return _validationFail(err);
      }
      try {
        await doc.save();
      } catch (err) {
        logger.error('[Fraud Score] update failed:', err.message);
        return { ok: false, reason: reg.REASON.SAVE_FAILED };
      }
      return { ok: true, score: doc.toObject ? doc.toObject() : doc };
    }
    const doc = new scoreModel(payload);
    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Fraud Score] insert failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, score: doc.toObject ? doc.toObject() : doc };
  }

  function _buildFlagCount(flags) {
    const count = {
      open: 0,
      acknowledged: 0,
      dismissed: 0,
      escalated: 0,
      expired: 0,
      total: 0,
    };
    for (const f of flags || []) {
      count.total += 1;
      switch (f.state) {
        case reg.FRAUD_FLAG_STATE.OPEN:
          count.open += 1;
          break;
        case reg.FRAUD_FLAG_STATE.ACKNOWLEDGED:
          count.acknowledged += 1;
          break;
        case reg.FRAUD_FLAG_STATE.DISMISSED:
          count.dismissed += 1;
          break;
        case reg.FRAUD_FLAG_STATE.ESCALATED:
          count.escalated += 1;
          break;
        case reg.FRAUD_FLAG_STATE.EXPIRED:
          count.expired += 1;
          break;
        default:
          break;
      }
    }
    return count;
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    recomputeScore,
    applyFlag,
    decayAllScores,
    getScore,
    listScores,
    getBranchSummary,
  };
}

module.exports = { createHikvisionFraudScoreService };
