'use strict';
/**
 * Canonical RiskProfile — module: Risk & Outcome Prediction (W286 + W287).
 *
 * Describes the unified per-beneficiary risk profile returned by
 * `intelligence/risk/orchestrator.getBeneficiaryRiskProfile()`.
 *
 * This is NOT a persisted entity — it's a derived view. Adding a
 * canonical contract over it guarantees:
 *   1. Every shipped score carries explainable factors[] (the project
 *      rule "كل اقتراح ذكي يجب أن يكون قابلاً للتفسير").
 *   2. UI / downstream agents can rely on a stable shape across waves.
 *   3. Drift between source plugins (clinical/dropout/psych/cdss) and
 *      the unified shape is caught at the boundary, not in production.
 */

const { z, ObjectIdLike, IsoDateLoose } = require('../_primitives');

const RiskTier = z.enum(['low', 'moderate', 'high', 'critical']);

const RiskSourceName = z.enum([
  'clinical',
  'psych_flags',
  'dropout',
  'cdss',
  'behavioral_escalation',
]);

/**
 * One explainable factor — every score must decompose into factors,
 * and every factor must self-describe its provenance.
 */
const RiskFactor = z.object({
  code: z.string().min(1),
  label: z.string().optional(),
  weight: z.number().finite().optional(),
  value: z.number().finite().nullable().optional(),
  contribution: z.number().finite().nullable().optional(),
  evidence: z.any().nullable().optional(),
  source: RiskSourceName,
});

/**
 * Per-source result. Sources are graceful — `available:false` ships
 * `score:null` + a `reason` code; thrown errors surface as
 * `RISK_SCORING_FAILED`.
 */
const RiskSourceResult = z.object({
  source: RiskSourceName,
  available: z.boolean(),
  reason: z.string().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  trend: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  computedAt: IsoDateLoose.nullable().optional(),
  factors: z.array(RiskFactor).default([]),
  error: z.string().optional(),
  raw: z.record(z.any()).optional(),
});

const RiskComposite = z.object({
  weightUsed: z.number().min(0).max(1),
  sourceCount: z.number().int().min(0),
  sourcesContributing: z.array(RiskSourceName),
});

const RiskProfile = z
  .object({
    beneficiaryId: ObjectIdLike,
    episodeId: ObjectIdLike.nullable().optional(),

    overallScore: z.number().min(0).max(100).nullable(),
    overallTier: RiskTier.nullable(),
    overallTierAr: z.string().nullable(),

    sources: z.record(RiskSourceResult),
    topFactors: z.array(RiskFactor).max(5),
    composite: RiskComposite,

    computedAt: IsoDateLoose,
    reason: z.enum(['RISK_SCORE_COMPUTED', 'RISK_NO_SOURCES_AVAILABLE']),
    explanation: z.string().min(1),
  })
  .refine(p => (p.overallScore == null) === (p.overallTier == null), {
    message: 'overallScore and overallTier must both be null or both be set',
    path: ['overallTier'],
  })
  .refine(
    p =>
      p.reason === 'RISK_NO_SOURCES_AVAILABLE'
        ? p.overallScore == null && p.composite.sourceCount === 0
        : p.composite.sourceCount > 0,
    {
      message:
        'reason=RISK_NO_SOURCES_AVAILABLE requires null score + 0 sources; ' +
        'reason=RISK_SCORE_COMPUTED requires at least one contributing source',
      path: ['reason'],
    }
  );

module.exports = {
  name: 'RiskProfile',
  modulePath: 'Risk & Outcome Prediction',
  // Derived view — no Mongoose model; drift check skips it.
  mongooseModelName: null,
  schema: RiskProfile,
  // Sub-schemas exported for tests + future reuse.
  parts: { RiskTier, RiskSourceName, RiskFactor, RiskSourceResult, RiskComposite },
};
