'use strict';

/**
 * satisfactionHealthAdapter.js — Phase 14 Commit 1 (4.0.63).
 *
 * Adapter over SatisfactionSurvey producing:
 *
 *   getLatestNps({ branchId }) => { nps, responseCount }
 *
 * NPS defined per the standard methodology:
 *
 *   - Promoters: npsScore ≥ 9  →  counted as +1
 *   - Passives:  npsScore 7–8  →  counted as 0
 *   - Detractors: npsScore ≤ 6 →  counted as -1
 *
 *   NPS = (promoters - detractors) / totalRespondents × 100
 *
 * "Latest" means the most recent quarter (90-day window) with at
 * least one survey. Quarters are rolling rather than fixed-calendar
 * so a branch that just restarted surveys doesn't show a zero.
 *
 * Returns `{ nps: null, responseCount: 0 }` when no surveys.
 */

const DEFAULT_WINDOW_DAYS = 90;
const PROMOTER_MIN = 9;
const DETRACTOR_MAX = 6;

function createSatisfactionHealthAdapter({
  model,
  logger = console,
  windowDays = DEFAULT_WINDOW_DAYS,
  now = () => new Date(),
} = {}) {
  if (!model) throw new Error('satisfactionHealthAdapter: model is required');

  async function getLatestNps({ branchId } = {}) {
    const from = new Date(now().getTime() - windowDays * 86400000);
    const filter = { createdAt: { $gte: from } };
    if (branchId) filter.branchId = branchId;

    let docs;
    try {
      docs = await model.find(filter).limit(5000);
    } catch (err) {
      logger.warn(`[satisfactionAdapter] query failed: ${err.message}`);
      return { nps: null, responseCount: 0 };
    }

    const scored = docs.filter(d => typeof d.npsScore === 'number');
    if (!scored.length) return { nps: null, responseCount: 0 };

    let promoters = 0;
    let detractors = 0;
    for (const d of scored) {
      if (d.npsScore >= PROMOTER_MIN) promoters++;
      else if (d.npsScore <= DETRACTOR_MAX) detractors++;
    }
    const nps = Math.round(((promoters - detractors) / scored.length) * 100);
    return { nps, responseCount: scored.length };
  }

  return { getLatestNps };
}

module.exports = {
  createSatisfactionHealthAdapter,
  PROMOTER_MIN,
  DETRACTOR_MAX,
  DEFAULT_WINDOW_DAYS,
};
