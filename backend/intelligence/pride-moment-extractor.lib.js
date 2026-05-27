'use strict';

/**
 * pride-moment-extractor.lib.js — W481 (Phase F: Story Architecture).
 *
 * Pure library that scans beneficiary data signals and extracts
 * "pride moments" — significant achievements worth highlighting in
 * Quarterly Story Books (W479+W480). Pride moments are the emotional
 * core that transforms data dashboards into family-engaging stories.
 *
 * Extraction signals (in priority order):
 *   1. GAS jump ≥+1 level on any goal (T-score delta ≥10 = "major")
 *   2. ICF qualifier improvement ≥1 level (e.g. severe → moderate)
 *   3. First-time milestones (first independent step, first word, first
 *      successful self-feed) — derived from voice log + session notes
 *   4. Goal achievement (status transition to 'achieved')
 *   5. Sibling positive event (SDQ prosocial up + emotional down)
 *   6. WBCI band improvement (e.g. monitor → stable)
 *
 * Per v3 §6 Innovation 7. Pure functions only.
 */

const PRIDE_KINDS = Object.freeze([
  'gas_major_jump',
  'icf_qualifier_improvement',
  'first_time_milestone',
  'goal_achieved',
  'sibling_positive_event',
  'family_wellbeing_band_up',
  'voice_breakthrough',
  'community_participation',
]);

const SIGNIFICANCE_LEVELS = Object.freeze(['minor', 'moderate', 'major', 'milestone']);

/**
 * Extract pride moments from a quarterly data bundle.
 *
 * @param {Object} input
 * @param {Array}  [input.gasProgressions] — [{ goalId, earliestTScore, latestTScore }]
 * @param {Array}  [input.icfImprovements] — from W457 (improvedCodes)
 * @param {Array}  [input.voiceLogs] — from W460 (preference/dream entries)
 * @param {Array}  [input.goalsAchieved] — goals transitioned to 'achieved'
 * @param {Array}  [input.sdqDeltas] — [{ siblingId, total_before, total_after, prosocial_delta }]
 * @param {Array}  [input.wbciBandHistory] — [{ snapshotDate, band }]
 * @returns {{ moments: Array, totalCount: number, byKind: Object }}
 */
function extractPrideMoments(input = {}) {
  const moments = [];

  // 1. GAS major jumps
  for (const gas of input.gasProgressions || []) {
    if (typeof gas.earliestTScore !== 'number' || typeof gas.latestTScore !== 'number') continue;
    const delta = gas.latestTScore - gas.earliestTScore;
    if (delta >= 10) {
      moments.push({
        kind: 'gas_major_jump',
        significance: delta >= 20 ? 'milestone' : 'major',
        sourceRef: { goalId: gas.goalId },
        date: gas.latestSnapshotDate || new Date(),
        descriptionAr: `قفزة T-score بمقدار ${delta.toFixed(1)} نقطة في الهدف`,
        descriptionEn: `Goal Attainment T-score jumped by ${delta.toFixed(1)} points`,
        rawDelta: delta,
      });
    }
  }

  // 2. ICF qualifier improvements ≥1 level
  for (const icf of input.icfImprovements || []) {
    if (typeof icf.averageDelta !== 'number') continue;
    if (icf.averageDelta <= -1) {
      moments.push({
        kind: 'icf_qualifier_improvement',
        significance: icf.averageDelta <= -2 ? 'major' : 'moderate',
        sourceRef: { icfCode: icf.code },
        date: icf.snapshotDate || new Date(),
        descriptionAr: `تحسّن مستوى الأداء ${icf.code}`,
        descriptionEn: `ICF qualifier improvement for ${icf.code}`,
        rawDelta: icf.averageDelta,
      });
    }
  }

  // 3. First-time milestones from voice logs
  for (const voice of input.voiceLogs || []) {
    if (
      voice.entryKind === 'dream' ||
      (voice.entryKind === 'preference' && voice.capacityGrade === 'full')
    ) {
      moments.push({
        kind: 'voice_breakthrough',
        significance: 'moderate',
        sourceRef: { voiceLogId: voice._id },
        date: voice.capturedAt || new Date(),
        descriptionAr: 'لحظة تعبير مهمة من المستفيد',
        descriptionEn: 'Significant beneficiary voice moment',
      });
    }
  }

  // 4. Goal achievements
  for (const goal of input.goalsAchieved || []) {
    moments.push({
      kind: 'goal_achieved',
      significance: 'milestone',
      sourceRef: { goalId: goal._id || goal.goalId },
      date: goal.completionDate || new Date(),
      descriptionAr: `تحقّق هدف: ${goal.title || ''}`,
      descriptionEn: `Goal achieved: ${goal.title || ''}`,
    });
  }

  // 5. Sibling positive events
  for (const sdq of input.sdqDeltas || []) {
    const totalDelta = (sdq.total_after ?? 0) - (sdq.total_before ?? 0);
    const prosocialDelta = sdq.prosocial_delta ?? 0;
    if (totalDelta <= -3 && prosocialDelta >= 1) {
      moments.push({
        kind: 'sibling_positive_event',
        significance: 'moderate',
        sourceRef: { siblingId: sdq.siblingId },
        date: sdq.snapshotDate || new Date(),
        descriptionAr: 'تحسّن تكيّف الأخوة',
        descriptionEn: 'Sibling adjustment improvement',
      });
    }
  }

  // 6. WBCI band improvement
  if (Array.isArray(input.wbciBandHistory) && input.wbciBandHistory.length >= 2) {
    const sorted = input.wbciBandHistory
      .slice()
      .sort((a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate));
    const first = sorted[0].band;
    const last = sorted[sorted.length - 1].band;
    const order = ['crisis', 'at_risk', 'monitor', 'stable', 'thriving'];
    const firstIdx = order.indexOf(first);
    const lastIdx = order.indexOf(last);
    if (firstIdx >= 0 && lastIdx > firstIdx) {
      moments.push({
        kind: 'family_wellbeing_band_up',
        significance: lastIdx - firstIdx >= 2 ? 'major' : 'moderate',
        sourceRef: { fromBand: first, toBand: last },
        date: sorted[sorted.length - 1].snapshotDate || new Date(),
        descriptionAr: `ارتفاع مستوى رفاهية الأسرة من ${first} إلى ${last}`,
        descriptionEn: `Family wellbeing band improved from ${first} to ${last}`,
      });
    }
  }

  // Aggregate by kind
  const byKind = {};
  for (const m of moments) {
    byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  }

  return { moments, totalCount: moments.length, byKind };
}

/**
 * Rank pride moments by significance + recency. Returns top-N.
 * Used by W479 story-builder to populate the pride_moments section.
 */
function rankByImpact(moments, limit = 5) {
  if (!Array.isArray(moments)) return [];
  const sigOrder = { milestone: 0, major: 1, moderate: 2, minor: 3 };
  const sorted = moments.slice().sort((a, b) => {
    const sigDiff = (sigOrder[a.significance] ?? 9) - (sigOrder[b.significance] ?? 9);
    if (sigDiff !== 0) return sigDiff;
    return new Date(b.date) - new Date(a.date);
  });
  return sorted.slice(0, limit);
}

/**
 * Filter moments to those occurring within a date window.
 */
function filterByDateRange(moments, fromDate, toDate) {
  if (!Array.isArray(moments)) return [];
  const from = fromDate ? new Date(fromDate).getTime() : 0;
  const to = toDate ? new Date(toDate).getTime() : Date.now() + 86400000;
  return moments.filter(m => {
    const t = new Date(m.date).getTime();
    return t >= from && t <= to;
  });
}

module.exports = Object.freeze({
  extractPrideMoments,
  rankByImpact,
  filterByDateRange,
  // Constants
  PRIDE_KINDS,
  SIGNIFICANCE_LEVELS,
});
