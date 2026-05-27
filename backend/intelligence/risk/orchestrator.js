'use strict';

/**
 * risk/orchestrator.js — Wave 286
 * ═════════════════════════════════════════════════════════════════
 * Unified Beneficiary Risk Orchestrator
 *
 * READ-ONLY aggregator that fans out to existing scorers (clinical,
 * psych-flags, dropout, cdss), normalises their outputs to 0..100,
 * and returns a single explainable risk profile per beneficiary —
 * tied to canonical Beneficiary / EpisodeOfCare entities.
 *
 * Design principles (per copilot-instructions.md):
 *   - لا تنشئ وحدات معزولة → adapter pattern over existing services
 *   - كل اقتراح ذكي قابل للتفسير → every score ships with factors[]
 *   - لا تكرار للبيانات → zero new persistence
 *   - منصة مؤسسية قابلة للتوسع → source plugins, weighted composite
 *
 * Public API:
 *   getBeneficiaryRiskProfile(beneficiaryId, opts) → Promise<Profile>
 *   listSources() → string[]
 *
 * Profile shape:
 *   {
 *     beneficiaryId, episodeId?,
 *     overallScore: 0..100 | null,
 *     overallTier: 'low'|'moderate'|'high'|'critical' | null,
 *     overallTierAr: string,
 *     sources: { [name]: RiskSourceResult },
 *     topFactors: Factor[],   // top 5 contributing factors across all sources
 *     computedAt: ISO,
 *     reason: 'RISK_SCORE_COMPUTED' | 'RISK_NO_SOURCES_AVAILABLE',
 *     explanation: string (AR)
 *   }
 */

const { SOURCE_WEIGHTS, TIERS_AR, tierFromScore, weightedComposite } = require('./registry');

// Source plugins registered by SOURCE_NAME
const LOAD_SOURCES = [
  require('./sources/clinical.source'),
  require('./sources/psych-flags.source'),
  require('./sources/dropout.source'),
  require('./sources/cdss.source'),
  require('./sources/behavioral-escalation.source'), // W434 — Phase D2 5th source
];

function listSources() {
  return LOAD_SOURCES.map(s => s.SOURCE_NAME);
}

/**
 * @param {string} beneficiaryId
 * @param {{ episodeId?: string, logger?: any }} [opts]
 */
async function getBeneficiaryRiskProfile(beneficiaryId, opts = {}) {
  if (!beneficiaryId) {
    throw Object.assign(new Error('beneficiaryId is required'), {
      reason: 'SUBJECT_REQUIRED',
    });
  }
  const log = opts.logger || console;
  const computedAt = new Date();

  // Parallel fan-out — every source isolates its own failures
  const results = await Promise.all(
    LOAD_SOURCES.map(async src => {
      try {
        const out = await src.fetch(beneficiaryId, { episodeId: opts.episodeId });
        return [src.SOURCE_NAME, out];
      } catch (err) {
        log.warn?.(
          '[risk-orchestrator] source %s failed for %s: %s',
          src.SOURCE_NAME,
          beneficiaryId,
          err.message
        );
        return [
          src.SOURCE_NAME,
          {
            source: src.SOURCE_NAME,
            available: false,
            reason: 'RISK_SCORING_FAILED',
            score: null,
            factors: [],
            error: err.message,
          },
        ];
      }
    })
  );

  /** @type {Record<string, any>} */
  const sources = {};
  /** @type {Record<string, number>} */
  const sourceScores = {};
  /** @type {Array<any>} */
  const allFactors = [];

  for (const [name, result] of results) {
    sources[name] = result;
    if (result.available && typeof result.score === 'number') {
      sourceScores[name] = result.score;
    }
    if (Array.isArray(result.factors) && result.factors.length > 0) {
      // Annotate each factor with its source-level weight contribution
      const sourceWeight = SOURCE_WEIGHTS[name] || 0;
      for (const f of result.factors) {
        allFactors.push({
          ...f,
          contribution:
            typeof f.value === 'number'
              ? Math.round(sourceWeight * (f.weight || 1) * (f.value / 100) * 10000) / 10000
              : null,
        });
      }
    }
  }

  const composite = weightedComposite(sourceScores);
  const overallTier = tierFromScore(composite.score);

  // Sort + take top 5 contributing factors (highest absolute contribution)
  const topFactors = allFactors
    .filter(f => f.contribution != null)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5);

  const reason = composite.sourceCount > 0 ? 'RISK_SCORE_COMPUTED' : 'RISK_NO_SOURCES_AVAILABLE';

  const explanation = buildExplanationAr({
    overallScore: composite.score,
    overallTier,
    sourceCount: composite.sourceCount,
    topFactors,
  });

  const profile = {
    beneficiaryId: String(beneficiaryId),
    episodeId: opts.episodeId ? String(opts.episodeId) : null,
    overallScore: composite.score,
    overallTier,
    overallTierAr: overallTier ? TIERS_AR[overallTier] : null,
    sources,
    topFactors,
    composite: {
      weightUsed: composite.weightUsed,
      sourceCount: composite.sourceCount,
      sourcesContributing: Object.keys(sourceScores),
    },
    computedAt: computedAt.toISOString(),
    reason,
    explanation,
  };

  // W287 — Canonical self-validation. Any failure here is a coding bug
  // in this orchestrator or a source plugin; log + ship anyway (do NOT
  // crash a clinician-facing endpoint over a contract drift).
  assertCanonicalShape(profile, log);

  return profile;
}

let _RiskProfileSchema = null;
function assertCanonicalShape(profile, log) {
  if (_RiskProfileSchema === null) {
    try {
      // Lazy load to avoid a require cycle (canonical/index.js may grow
      // to depend on intelligence in the future).
      _RiskProfileSchema = require('../canonical/schemas/risk-profile.canonical').schema;
    } catch (_e) {
      _RiskProfileSchema = false; // disable further attempts
      return;
    }
  }
  if (!_RiskProfileSchema) return;
  const result = _RiskProfileSchema.safeParse(profile);
  if (!result.success) {
    (log.warn || log.log || console.warn).call(
      log,
      '[risk-orchestrator] canonical shape drift for beneficiary %s: %s',
      profile.beneficiaryId,
      JSON.stringify(result.error.errors.slice(0, 3))
    );
  }
}

function buildExplanationAr({ overallScore, overallTier, sourceCount, topFactors }) {
  if (overallScore == null) {
    return 'لا توجد بيانات كافية لحساب درجة الخطورة (لا يوجد مصدر بيانات متاح).';
  }
  const tierAr = TIERS_AR[overallTier] || 'غير محدد';
  const parts = [
    `درجة الخطورة الإجمالية ${overallScore}/100 (${tierAr})، محسوبة من ${sourceCount} مصدر${sourceCount > 1 ? '' : ''}.`,
  ];
  if (topFactors.length > 0) {
    const top = topFactors
      .slice(0, 3)
      .map(f => f.label || f.code)
      .join('، ');
    parts.push(`أهم العوامل المؤثرة: ${top}.`);
  }
  return parts.join(' ');
}

module.exports = { getBeneficiaryRiskProfile, listSources };
