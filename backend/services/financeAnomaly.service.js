'use strict';

/**
 * financeAnomaly.service.js — READ-ONLY Tier-3 expense anomaly scan (W1218).
 * ════════════════════════════════════════════════════════════════════════════
 * Applies the (now-wired, W1215) Tier-3 multivariate isolation-forest engine to
 * a domain that had NO anomaly detection: financial expenses. It flags expenses
 * whose feature COMBINATION is anomalous vs the branch's expense population —
 * the classic audit/fraud signals that a single amount-threshold misses:
 *
 *   features = [ amount, dayOfWeek, isCash, isRoundThousand ]
 *
 * e.g. a moderate-but-round cash expense on a weekend scores higher than a large
 * card expense on a normal business day. Pure given the expense array; no DB here
 * (the CLI/route supplies the rows). Read-only — flags for review, mutates nothing.
 *
 * NOTE: this is a complement to, not a replacement of, the Hikvision attendance
 * fraud detection (a different domain) — financial-transaction anomaly was a
 * genuine gap (no prior detector).
 */

const { buildIsolationForestDetector } = require('./isolationForest.service');

const EXPENSE_FEATURES = Object.freeze(['amount', 'dayOfWeek', 'isCash', 'isRoundThousand']);

// Isolation forest needs ≥8 points for a meaningful sub-sampled forest.
const MIN_EXPENSES = 8;

const CASH_METHODS = new Set(['cash']);

/**
 * PURE — map one expense (lean doc) to the positional numeric feature vector.
 * @param {object} e
 * @returns {number[]}
 */
function expenseFeatureExtractor(e = {}) {
  const amount = Number(e.amount) || 0;
  const d = e.date ? new Date(e.date) : null;
  const dayOfWeek = d && !Number.isNaN(d.getTime()) ? d.getDay() : 0; // 0=Sun … 6=Sat
  const isCash = CASH_METHODS.has(e.paymentMethod) ? 1 : 0;
  const isRoundThousand = amount > 0 && amount % 1000 === 0 ? 1 : 0;
  return [amount, dayOfWeek, isCash, isRoundThousand];
}

/**
 * PURE — score each expense against the population via the Tier-3 isolation
 * forest and return the anomalous ones (most-anomalous first). Degrades to
 * `{ eligible:false }` when there are too few expenses to form a population.
 *
 * @param {{ expenses?: object[], threshold?: number, seed?: number }} opts
 * @returns {{ eligible:boolean, reason?:string, scanned:number, threshold:number, anomalies:object[] }}
 */
function detectExpenseAnomalies(opts = {}) {
  const expenses = Array.isArray(opts.expenses) ? opts.expenses : [];
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.6;
  const seed = typeof opts.seed === 'number' ? opts.seed : 1;

  if (expenses.length < MIN_EXPENSES) {
    return {
      eligible: false,
      reason: `insufficient_expenses:${expenses.length}/${MIN_EXPENSES}`,
      scanned: expenses.length,
      threshold,
      anomalies: [],
    };
  }

  const detector = buildIsolationForestDetector({
    threshold,
    seed,
    featureExtractor: expenseFeatureExtractor,
  });

  const anomalies = [];
  for (const e of expenses) {
    const verdict = detector.detect({ history: expenses, current: e });
    if (verdict.anomaly && typeof verdict.score === 'number') {
      const amount = Number(e.amount) || 0;
      anomalies.push({
        expenseId: e._id ? String(e._id) : null,
        score: Math.round(verdict.score * 1000) / 1000,
        amount,
        category: e.category || null,
        paymentMethod: e.paymentMethod || null,
        vendor: e.vendor || null,
        date: e.date || null,
        // why it's notable (the human-readable multivariate signal)
        signals: [
          ...(CASH_METHODS.has(e.paymentMethod) ? ['cash'] : []),
          ...(amount > 0 && amount % 1000 === 0 ? ['round_thousand'] : []),
          ...(e.date && [0, 6].includes(new Date(e.date).getDay()) ? ['weekend'] : []),
        ],
      });
    }
  }

  anomalies.sort((a, b) => b.score - a.score);
  return { eligible: true, scanned: expenses.length, threshold, anomalies };
}

module.exports = {
  EXPENSE_FEATURES,
  MIN_EXPENSES,
  expenseFeatureExtractor,
  detectExpenseAnomalies,
};
