/**
 * npsService — pure math over NpsResponse records.
 *
 * Standard NPS computation (Bain & Co. methodology):
 *   bucket(score)  → 'detractor' | 'passive' | 'promoter'
 *   summarize()    → counts + percentages + nps + sample size
 *   trendByPeriod() → series of {periodKey, nps, sample} for charting
 *   topThemes(comments, n) → frequency-ranked stop-word-stripped tokens
 *
 * No DB. Same architectural pattern as outcomeService.
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Min responses needed for a defensible NPS verdict. Below = 'insufficient'.
  get minSample() {
    return envInt('NPS_MIN_SAMPLE', 10);
  },
  // Detractor bucket cap (default 6 — Bain standard).
  get detractorMax() {
    return envInt('NPS_DETRACTOR_MAX', 6);
  },
  // Passive upper bound (default 8).
  get passiveMax() {
    return envInt('NPS_PASSIVE_MAX', 8);
  },
};

function bucket(score) {
  if (score == null || score === '') return null;
  const s = Number(score);
  if (!Number.isFinite(s)) return null;
  if (s <= THRESHOLDS.detractorMax) return 'detractor';
  if (s <= THRESHOLDS.passiveMax) return 'passive';
  return 'promoter';
}

function summarize(records) {
  const valid = records.filter(r => r && Number.isFinite(Number(r.score)));
  const counts = { detractor: 0, passive: 0, promoter: 0 };
  for (const r of valid) {
    const b = r.bucket || bucket(r.score);
    if (b in counts) counts[b] += 1;
  }
  const total = valid.length;
  if (total === 0) {
    return {
      sample: 0,
      detractors: 0,
      passives: 0,
      promoters: 0,
      detractorPercent: null,
      promoterPercent: null,
      nps: null,
      verdict: 'insufficient',
    };
  }
  const detractorPercent = Math.round((counts.detractor / total) * 1000) / 10;
  const promoterPercent = Math.round((counts.promoter / total) * 1000) / 10;
  const nps = Math.round((promoterPercent - detractorPercent) * 10) / 10;
  return {
    sample: total,
    detractors: counts.detractor,
    passives: counts.passive,
    promoters: counts.promoter,
    detractorPercent,
    promoterPercent,
    passivePercent: Math.round((counts.passive / total) * 1000) / 10,
    nps,
    verdict: total < THRESHOLDS.minSample ? 'insufficient' : 'ok',
  };
}

/**
 * Group responses by an arbitrary period key (e.g. 'YYYY-MM' for monthly,
 * surveyKey for per-campaign). Returns sorted-by-period series.
 */
function trendByPeriod(records, keyFn) {
  const buckets = new Map();
  for (const r of records) {
    if (!r || !Number.isFinite(Number(r.score))) continue;
    const k = keyFn(r);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(r);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([periodKey, items]) => ({ periodKey, ...summarize(items) }));
}

// Tiny Arabic + English stop-word list. Frequency ranking only — not a
// real NLP pipeline; surfaces obvious recurring words to spot themes.
const STOP_WORDS = new Set([
  'في',
  'من',
  'مع',
  'هو',
  'هي',
  'لا',
  'ما',
  'على',
  'أن',
  'إن',
  'أو',
  'كان',
  'كنت',
  'يكون',
  'هذا',
  'هذه',
  'ذلك',
  'تلك',
  'إلى',
  'و',
  'ال',
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'i',
  'we',
  'you',
  'they',
  'he',
  'she',
  'it',
  'this',
  'that',
  'with',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'as',
  'be',
  'have',
  'has',
  'do',
  'does',
  'did',
  'so',
  'not',
  'no',
]);

function topThemes(comments, n = 10) {
  const freq = new Map();
  for (const c of comments) {
    if (!c) continue;
    const tokens = String(c)
      .toLowerCase()
      // Strip punctuation but keep Arabic + ASCII letters
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t && t.length >= 3 && !STOP_WORDS.has(t));
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

module.exports = {
  THRESHOLDS,
  bucket,
  summarize,
  trendByPeriod,
  topThemes,
};
