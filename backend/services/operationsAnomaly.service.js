'use strict';

/**
 * operationsAnomaly.service.js — READ-ONLY Tier-3 multivariate anomaly scan (W1215).
 * ════════════════════════════════════════════════════════════════════════════
 * Wires the previously-dormant Tier-3 engine (services/isolationForest.service —
 * "wire OR delete") into a concrete, useful, READ-ONLY operational surface: it
 * flags therapists whose *combination* of productivity metrics is anomalous vs
 * their peers — a multivariate signal the univariate supervisor views (each
 * metric alone) cannot see. Examples it catches: high session count but very low
 * documentation rate; unusual no-show pattern; minutes-vs-sessions mismatch.
 *
 * It does NOT touch the LIVE Tier-2 dashboard-KPI anomaly path (anomalyDetector
 * .service) — it is an additive, self-contained scan over the W1173
 * branchProductivity output. Pure given the productivity map; no DB here.
 */

const { buildIsolationForestDetector } = require('./isolationForest.service');

// The 4 productivity features the isolation forest scores over. Order matters
// (the vector is positional). Documentation rate defaults to 100 (a therapist
// with no completed sessions is not "under-documenting").
const PRODUCTIVITY_FEATURES = Object.freeze([
  'completed',
  'deliveredMinutes',
  'documentedRate',
  'noShow',
]);

function productivityFeatureExtractor(rec = {}) {
  return [
    Number(rec.completed) || 0,
    Number(rec.deliveredMinutes) || 0,
    typeof rec.documentedRate === 'number' ? rec.documentedRate : 100,
    Number(rec.noShow) || 0,
  ];
}

// The isolation forest needs ≥8 points to train a meaningful sub-sampled forest.
const MIN_THERAPISTS = 8;

/**
 * PURE — given the W1173 branchProductivity `byTherapist` map, score each
 * therapist's productivity vector against the whole-branch population via the
 * Tier-3 isolation forest and return the anomalous ones (most-anomalous first).
 *
 * Degrades to `{ eligible:false }` when there are too few therapists for the
 * forest — a small team is not a statistical population.
 *
 * @param {{ byTherapist?: Record<string, object>, threshold?: number, seed?: number }} opts
 * @returns {{ eligible:boolean, reason?:string, scanned:number, threshold:number, anomalies:object[] }}
 */
function detectProductivityAnomalies(opts = {}) {
  const byTherapist = opts.byTherapist || {};
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.6;
  const seed = typeof opts.seed === 'number' ? opts.seed : 1;

  const records = Object.entries(byTherapist).map(([therapistId, stats]) => ({
    therapistId,
    ...stats,
  }));

  if (records.length < MIN_THERAPISTS) {
    return {
      eligible: false,
      reason: `insufficient_therapists:${records.length}/${MIN_THERAPISTS}`,
      scanned: records.length,
      threshold,
      anomalies: [],
    };
  }

  const detector = buildIsolationForestDetector({
    threshold,
    seed,
    featureExtractor: productivityFeatureExtractor,
  });

  const anomalies = [];
  for (const rec of records) {
    const verdict = detector.detect({ history: records, current: rec });
    if (verdict.anomaly && typeof verdict.score === 'number') {
      anomalies.push({
        therapistId: rec.therapistId,
        score: Math.round(verdict.score * 1000) / 1000,
        features: {
          completed: Number(rec.completed) || 0,
          deliveredMinutes: Number(rec.deliveredMinutes) || 0,
          documentedRate: typeof rec.documentedRate === 'number' ? rec.documentedRate : 100,
          noShow: Number(rec.noShow) || 0,
        },
      });
    }
  }

  anomalies.sort((a, b) => b.score - a.score);
  return { eligible: true, scanned: records.length, threshold, anomalies };
}

module.exports = {
  PRODUCTIVITY_FEATURES,
  MIN_THERAPISTS,
  productivityFeatureExtractor,
  detectProductivityAnomalies,
};
