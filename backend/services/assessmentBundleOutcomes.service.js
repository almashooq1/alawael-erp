'use strict';

/**
 * assessmentBundleOutcomes.service.js — Wave 207
 *
 * Outcome tracker for the W206 smart engine. Where W206f analytics
 * answers "did therapists accept what the engine suggested?", this
 * one answers the harder question: "did the underlying measure
 * actually move after the engine's intervention plan was applied?"
 *
 * Reads the `scoresInput` array persisted on every
 * AssessmentRecommendationBundle (W206d) for a given beneficiary,
 * orders them by createdAt, then computes per-measure timelines and
 * first→latest delta. The interpretation flag uses each measure's
 * `higherScoreMeaning` heuristic from the W206 engine library —
 * for GMFCS/MACS/CFCS (ordinal level 1-5, lower = better), a
 * decrease in level is improvement; for FIM/WeeFIM/Vineland
 * (higher = better), an increase is improvement.
 *
 * Pure factory + DI. No DB writes. Read-only.
 *
 * Companion to the existing `outcomeService.js` which trends raw
 * ClinicalAssessment records: that service answers "is the patient
 * improving overall?", this one answers "did the recommended
 * intervention move the specific measure it was triggered by?"
 */

// Higher-score-is-better for each measure (matches the W206 engine's
// implicit assumption when computing severity). Keep in sync with
// rehab-measures-library.js.
const HIGHER_BETTER = Object.freeze({
  GMFCS: false, // level 1 = best mobility
  MACS: false,
  CFCS: false,
  FIM: true, // higher total = more independent
  WeeFIM: true,
  BergBalance: true,
  CARS2: false, // higher total = more severe autism
  SCQ: false,
  CSI: false,
  Vineland3: true, // standardScore: 100=mean, higher=better
  PedsQL: true,
});

const STEADY_BAND_DEFAULT = {
  // For ordinal measures (level), any change ≥1 is meaningful
  ordinal: 0.5,
  // For numeric-band measures, use the typical MCID-ish step
  numeric: 5,
};

function createBundleOutcomes(deps = {}) {
  const BundleModel = deps.AssessmentRecommendationBundle;
  if (!BundleModel || typeof BundleModel.find !== 'function') {
    throw new Error('bundleOutcomes: AssessmentRecommendationBundle model is required');
  }

  /**
   * Extract a numeric score from a raw scoresInput entry.
   * Returns null when the entry isn't usable (e.g. measure with no
   * numeric input, malformed entry).
   */
  function extractScore(entry) {
    if (!entry) return null;
    if (typeof entry.level === 'number') return entry.level;
    if (typeof entry.totalScore === 'number') return entry.totalScore;
    if (typeof entry.standardScore === 'number') return entry.standardScore;
    return null;
  }

  function isOrdinal(measureKey) {
    return ['GMFCS', 'MACS', 'CFCS'].includes(measureKey);
  }

  /**
   * Per-measure timeline for one beneficiary.
   * Returns Map<measureKey, [{ date, score, bundleId, form? }]>
   */
  async function getMeasureTimelines(beneficiaryId) {
    const bundles = await BundleModel.find({ beneficiary: beneficiaryId })
      .sort({ createdAt: 1 })
      .select('createdAt scoresInput _id')
      .lean();
    const byMeasure = new Map();
    for (const b of bundles) {
      if (!Array.isArray(b.scoresInput)) continue;
      for (const entry of b.scoresInput) {
        if (!entry || !entry.measureKey) continue;
        const score = extractScore(entry);
        if (score === null) continue;
        if (!byMeasure.has(entry.measureKey)) byMeasure.set(entry.measureKey, []);
        byMeasure.get(entry.measureKey).push({
          date: b.createdAt,
          score,
          bundleId: String(b._id),
          form: entry.form || null,
        });
      }
    }
    return byMeasure;
  }

  /**
   * Compute first→latest delta per measure with direction verdict.
   * Direction: 'improving' / 'declining' / 'steady' / 'insufficient'.
   */
  function computeDeltas(timelinesMap) {
    const out = [];
    for (const [measureKey, points] of timelinesMap.entries()) {
      if (points.length === 0) continue;
      const first = points[0];
      const latest = points[points.length - 1];
      const higherBetter = HIGHER_BETTER[measureKey];
      const ord = isOrdinal(measureKey);
      const band = ord ? STEADY_BAND_DEFAULT.ordinal : STEADY_BAND_DEFAULT.numeric;
      const delta = latest.score - first.score;
      let direction;
      if (points.length < 2) {
        direction = 'insufficient';
      } else if (Math.abs(delta) < band) {
        direction = 'steady';
      } else {
        // For higher-better measures, +delta = improving; flip for lower-better
        const moved = higherBetter ? delta > 0 : delta < 0;
        direction = moved ? 'improving' : 'declining';
      }
      const daysBetween =
        points.length >= 2
          ? Math.floor(
              (new Date(latest.date).getTime() - new Date(first.date).getTime()) /
                (24 * 3600 * 1000)
            )
          : null;
      out.push({
        measureKey,
        pointCount: points.length,
        first: { score: first.score, date: first.date },
        latest: { score: latest.score, date: latest.date },
        delta,
        absoluteDelta: Math.abs(delta),
        direction,
        higherBetter: higherBetter === true,
        daysBetween,
      });
    }
    // Sort: improving first, then declining (the ones the team should react to)
    const directionRank = { declining: 0, improving: 1, steady: 2, insufficient: 3 };
    out.sort((a, b) => directionRank[a.direction] - directionRank[b.direction]);
    return out;
  }

  /**
   * Single-call full report for the b360 panel.
   */
  async function getOutcomeReport(beneficiaryId) {
    const timelines = await getMeasureTimelines(beneficiaryId);
    const deltas = computeDeltas(timelines);
    const timelinesArr = [];
    for (const [measureKey, points] of timelines.entries()) {
      timelinesArr.push({
        measureKey,
        points: points.map(p => ({
          date: p.date,
          score: p.score,
          bundleId: p.bundleId,
        })),
      });
    }
    const summary = {
      measuresTracked: deltas.length,
      improving: deltas.filter(d => d.direction === 'improving').length,
      declining: deltas.filter(d => d.direction === 'declining').length,
      steady: deltas.filter(d => d.direction === 'steady').length,
      insufficient: deltas.filter(d => d.direction === 'insufficient').length,
    };
    return { summary, deltas, timelines: timelinesArr };
  }

  return {
    extractScore,
    getMeasureTimelines,
    computeDeltas,
    getOutcomeReport,
  };
}

module.exports = createBundleOutcomes;
module.exports.HIGHER_BETTER = HIGHER_BETTER;
module.exports.STEADY_BAND_DEFAULT = STEADY_BAND_DEFAULT;
