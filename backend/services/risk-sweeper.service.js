'use strict';
/**
 * risk-sweeper.service.js — Wave 288.
 *
 * Periodically computes the unified risk profile for every active
 * beneficiary in a branch, persists a RiskSnapshot, compares the new
 * tier to the previous snapshot, and emits an AiAlert when the tier
 * worsens (or critical is reached for the first time).
 *
 * Design properties:
 *   - **Read-mostly**: orchestrator already isolates source failures;
 *     this layer adds per-beneficiary try/catch so one bad record
 *     doesn't poison the whole sweep.
 *   - **Idempotent per day**: sweepRunId derived from date so re-runs
 *     overwrite the day's snapshot for the same beneficiary
 *     (`updateOne` + upsert keyed on (beneficiaryId, sweepRunId)).
 *   - **Explainable alerts**: every alert carries the topFactors[]
 *     from the orchestrator + the previous→current tier transition.
 *   - **Zero new persistence on the alert side**: reuses AiAlert
 *     (alert_type='dropout_risk' — closest enum value; semantic code
 *     lives in `data.code='RISK_TIER_ESCALATED'`).
 */

const TIER_ORDER = { low: 0, moderate: 1, high: 2, critical: 3 };
const TIER_SEVERITY = {
  low: 'info',
  moderate: 'warning',
  high: 'critical',
  critical: 'urgent',
};
const TIER_AR = { low: 'منخفض', moderate: 'متوسط', high: 'مرتفع', critical: 'حرج' };

function todayRunId(now = new Date()) {
  // YYYY-MM-DD in UTC keeps cron + manual runs aligned regardless of
  // process timezone. Asia/Riyadh = UTC+3 so a 02:00 KSA run is still
  // the same UTC day as the rest of the night.
  return `sweep-${now.toISOString().slice(0, 10)}`;
}

function classifyTierDelta(prev, next) {
  if (next == null) return null;
  if (prev == null) return 'first';
  const pv = TIER_ORDER[prev];
  const nv = TIER_ORDER[next];
  if (pv == null || nv == null) return null;
  if (nv > pv) return 'escalated';
  if (nv < pv) return 'deescalated';
  return 'unchanged';
}

function shouldRaiseAlert(delta, newTier) {
  if (delta === 'escalated') return true;
  // First-time critical is a hard alert even with no prior snapshot.
  if (delta === 'first' && newTier === 'critical') return true;
  return false;
}

/**
 * @typedef {Object} SweeperDeps
 * @property {Function} getProfile - bound `getBeneficiaryRiskProfile`
 * @property {import('mongoose').Model} BeneficiaryModel
 * @property {import('mongoose').Model} RiskSnapshotModel
 * @property {import('mongoose').Model} [AiAlertModel] - optional; alerts skipped if absent
 * @property {Function} [onAlertRaised] - optional async hook called after an
 *   alert is created. Receives `{alertId, ben, profile, tierDelta, code, severity, sweepRunId}`.
 *   Failures are caught + logged; never block the sweep.
 * @property {{info:Function, warn:Function, error:Function}} [logger]
 */

class RiskSweeperService {
  /** @param {SweeperDeps} deps */
  constructor(deps) {
    if (!deps || typeof deps.getProfile !== 'function') {
      throw new Error('RiskSweeperService: deps.getProfile required');
    }
    if (!deps.BeneficiaryModel) throw new Error('RiskSweeperService: BeneficiaryModel required');
    if (!deps.RiskSnapshotModel) throw new Error('RiskSweeperService: RiskSnapshotModel required');
    this.getProfile = deps.getProfile;
    this.Beneficiary = deps.BeneficiaryModel;
    this.RiskSnapshot = deps.RiskSnapshotModel;
    this.AiAlert = deps.AiAlertModel || null;
    this.onAlertRaised = typeof deps.onAlertRaised === 'function' ? deps.onAlertRaised : null;
    this.logger = deps.logger || { info() {}, warn() {}, error() {} };
  }

  /**
   * Run a sweep for one branch.
   * @param {{branchId:string, now?:Date, limit?:number}} opts
   * @returns {Promise<{sweepRunId:string, branchId:string, processed:number, snapshotsCreated:number, alertsRaised:number, errors:Array}>}
   */
  async runSweepForBranch({ branchId, now = new Date(), limit = 5000 } = {}) {
    if (!branchId)
      throw Object.assign(new Error('branchId required'), { reason: 'SUBJECT_REQUIRED' });

    const sweepRunId = todayRunId(now);
    const startedAt = Date.now();
    let processed = 0;
    let snapshotsCreated = 0;
    let alertsRaised = 0;
    const errors = [];

    const cursor = this.Beneficiary.find({ status: 'active', branchId })
      .select('_id branchId')
      .limit(limit)
      .cursor();

    for await (const ben of cursor) {
      processed += 1;
      try {
        const profile = await this.getProfile(ben._id, { logger: this.logger });
        const prev = await this._loadPreviousSnapshot(ben._id, sweepRunId);
        const tierDelta = classifyTierDelta(prev && prev.overallTier, profile.overallTier);

        const snap = await this._upsertSnapshot({
          ben,
          profile,
          sweepRunId,
          previousTier: prev && prev.overallTier,
          tierDelta,
        });
        if (snap) snapshotsCreated += 1;

        if (this.AiAlert && shouldRaiseAlert(tierDelta, profile.overallTier)) {
          const created = await this._raiseAlert({ ben, profile, tierDelta, sweepRunId });
          if (created) alertsRaised += 1;
        }
      } catch (err) {
        this.logger.error('[risk-sweeper] beneficiary failed', {
          beneficiaryId: String(ben._id),
          err: err && err.message,
        });
        errors.push({ beneficiaryId: String(ben._id), error: err && err.message });
      }
    }

    this.logger.info('[risk-sweeper] done', {
      sweepRunId,
      branchId: String(branchId),
      processed,
      snapshotsCreated,
      alertsRaised,
      errorCount: errors.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      sweepRunId,
      branchId: String(branchId),
      processed,
      snapshotsCreated,
      alertsRaised,
      errors,
    };
  }

  async _loadPreviousSnapshot(beneficiaryId, currentRunId) {
    return this.RiskSnapshot.findOne({ beneficiaryId, sweepRunId: { $ne: currentRunId } })
      .sort({ computedAt: -1 })
      .select('overallTier overallScore sweepRunId computedAt')
      .lean();
  }

  async _upsertSnapshot({ ben, profile, sweepRunId, previousTier, tierDelta }) {
    const doc = {
      beneficiaryId: ben._id,
      episodeId: profile.episodeId || null,
      branchId: ben.branchId || null,
      sweepRunId,
      overallScore: profile.overallScore,
      overallTier: profile.overallTier,
      sources: profile.sources,
      topFactors: profile.topFactors,
      composite: profile.composite,
      reason: profile.reason,
      explanation: profile.explanation,
      previousTier: previousTier || null,
      tierDelta,
      computedAt: new Date(profile.computedAt),
    };
    await this.RiskSnapshot.updateOne(
      { beneficiaryId: ben._id, sweepRunId },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return true;
  }

  async _raiseAlert({ ben, profile, tierDelta, sweepRunId }) {
    const severity = TIER_SEVERITY[profile.overallTier] || 'warning';
    const newTierAr = TIER_AR[profile.overallTier] || profile.overallTier;
    const factorSummary = (profile.topFactors || [])
      .slice(0, 3)
      .map(f => f.label || f.code)
      .join('، ');
    const code = tierDelta === 'escalated' ? 'RISK_TIER_ESCALATED' : 'RISK_TIER_FIRST_CRITICAL';

    let alertDoc = null;
    try {
      alertDoc = await this.AiAlert.create({
        alert_type: 'dropout_risk',
        severity,
        target_type: 'beneficiary',
        target_id: ben._id,
        branch_id: ben.branchId || null,
        message_ar: `ارتفاع درجة الخطورة إلى ${newTierAr} (${profile.overallScore}/100)`,
        message_en: `Risk tier rose to ${profile.overallTier} (${profile.overallScore}/100)`,
        description_ar: factorSummary ? `أهم العوامل: ${factorSummary}` : profile.explanation,
        description_en: profile.explanation,
        data: {
          code,
          sweepRunId,
          score: profile.overallScore,
          tier: profile.overallTier,
          previousTier:
            tierDelta === 'first'
              ? null
              : (profile.composite && profile.composite.sourcesContributing) || null,
          tierDelta,
          topFactors: profile.topFactors,
          sourcesContributing: profile.composite && profile.composite.sourcesContributing,
          computedAt: profile.computedAt,
        },
      });
    } catch (err) {
      this.logger.warn('[risk-sweeper] alert create failed', {
        beneficiaryId: String(ben._id),
        err: err && err.message,
      });
      return false;
    }

    // ── W290: fire optional hook for downstream auto-actions ──────────
    // (e.g. risk-plan-review.service). Hook failures are isolated so
    // the sweep + alert remain authoritative.
    if (this.onAlertRaised) {
      try {
        await this.onAlertRaised({
          alertId: alertDoc && alertDoc._id,
          ben,
          profile,
          tierDelta,
          code,
          severity,
          sweepRunId,
        });
      } catch (err) {
        this.logger.warn('[risk-sweeper] onAlertRaised hook failed', {
          beneficiaryId: String(ben._id),
          err: err && err.message,
        });
      }
    }
    return true;
  }
}

module.exports = {
  RiskSweeperService,
  // Exported for tests + downstream consumers.
  TIER_ORDER,
  TIER_SEVERITY,
  classifyTierDelta,
  shouldRaiseAlert,
  todayRunId,
};
