'use strict';

/**
 * caseload-assignment.routes.js — Wave 436 (Phase E4 wire-up + F2 close).
 *
 * Read-only assignment-suggestion surface using the W432 Caseload Matcher
 * V2 pure lib. Pairs with:
 *   - W510 caseload-rebalance.routes.js   (rebalance EXISTING assignments)
 *   - this file                             (suggest a NEW assignment)
 *   - W509 measure-alert-auto-assignment    (auto-route alerts to a therapist)
 *
 * Route surface:
 *   GET /api/v1/caseload-assignment/suggest/:beneficiaryId
 *     ?specialty=speech_therapy        (required)
 *     &limit=5                         (default 5, cap 20)
 *     &maxLoad=25                      (override per-branch policy)
 *
 *   Returns: { success, data: { beneficiary, candidates: [{therapist, score,
 *             signals[]}], excludedCount, outcome } }
 *
 *   outcome ∈ {match_found, no_candidates, all_excluded} — also surfaces
 *   to the W435 incCaseloadMatch counter for ops visibility.
 *
 * Auth: authenticate + requireBranchAccess. Cross-branch isolation via
 * assertBeneficiaryInScope — a restricted caller suggesting a therapist
 * for a beneficiary in another branch gets 404 (uniform "not found" so
 * existence isn't probable per the W269 family contract).
 *
 * NOTE: This endpoint NEVER writes — it returns suggestions for a human
 * supervisor to apply via a separate (future) admin endpoint. Read-only
 * by design, same contract as W510 rebalance.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');
const matcher = require('../intelligence/caseload-matcher.lib');
const metricsModule = require('../intelligence/smart-platform-metrics.service');

router.use(authenticate);
router.use(requireBranchAccess);

function _parsePositiveInt(val, fallback, max) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max && n > max ? max : n;
}

/**
 * Lazy-bind to W435 metrics facade. Emits incCaseloadMatch(outcome) per
 * request so the Phase F2 observability surface reports matcher activity.
 * Wrapped in try/catch — metric failure NEVER breaks the response.
 */
function _emitMatchMetric(outcome) {
  try {
    const m = metricsModule.getDefault();
    if (m && typeof m.incCaseloadMatch === 'function') {
      m.incCaseloadMatch(outcome);
    }
  } catch {
    /* metric drop */
  }
}

/**
 * Resolve the canonical TherapeuticGoal model regardless of which loader
 * registered it first. Returns null when the model isn't registered
 * (e.g. mock-DB test boot).
 */
function _resolveModel(name, relPath) {
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(relPath);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

router.get('/suggest/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!beneficiaryId) {
      _emitMatchMetric('no_candidates');
      return res.status(400).json({ success: false, error: 'beneficiaryId required' });
    }

    const specialty = String(req.query.specialty || '').trim();
    if (!specialty) {
      _emitMatchMetric('no_candidates');
      return res.status(400).json({
        success: false,
        error: 'specialty query param required',
      });
    }

    // Cross-branch isolation — restricted callers can't probe foreign
    // beneficiaries. assertBeneficiaryInScope returns a written 404 when
    // the caller can't see this beneficiary; we MUST return early then.
    const denied = await assertBeneficiaryInScope(req, beneficiaryId);
    if (denied) {
      _emitMatchMetric('no_candidates');
      return denied; // 404 already written
    }

    const limit = _parsePositiveInt(req.query.limit, 5, 20);
    const maxLoad = _parsePositiveInt(req.query.maxLoad, 25, 200);

    // Fetch beneficiary shape needed by the matcher.
    const Beneficiary = _resolveModel('Beneficiary', '../models/Beneficiary');
    if (!Beneficiary) {
      _emitMatchMetric('no_candidates');
      return res.status(503).json({
        success: false,
        error: 'beneficiary_model_unavailable',
      });
    }
    const beneficiary = await Beneficiary.findById(beneficiaryId)
      .select(
        '_id firstName lastName languages primaryLanguage therapistGenderPreference branchId regionId'
      )
      .lean();
    if (!beneficiary) {
      _emitMatchMetric('no_candidates');
      return res.status(404).json({ success: false, error: 'beneficiary_not_found' });
    }

    // Fetch therapist candidates scoped to the caller's branch (User
    // with role 'therapist'). Branch-scoped + therapist-only filter.
    const User = _resolveModel('User', '../models/User');
    if (!User) {
      _emitMatchMetric('no_candidates');
      return res.status(503).json({ success: false, error: 'user_model_unavailable' });
    }
    const therapistFilter = {
      ...branchFilter(req),
      role: 'therapist',
      isActive: { $ne: false },
    };
    const rawTherapists = await User.find(therapistFilter)
      .select(
        '_id firstName lastName specialties languages gender branchId regionId experienceYears currentLoad'
      )
      .limit(500)
      .lean();

    if (!rawTherapists || rawTherapists.length === 0) {
      _emitMatchMetric('no_candidates');
      return res.json({
        success: true,
        data: {
          beneficiary: { _id: beneficiary._id, branchId: beneficiary.branchId },
          candidates: [],
          excludedCount: 0,
          outcome: 'no_candidates',
        },
      });
    }

    // Build matcher inputs. caseload-matcher.lib expects:
    //   beneficiary.requiredSpecialty (string or array)
    //   therapist.{specialties, languages, gender, branchId, regionId,
    //              currentLoad, experienceYears, priorSessionsWithBeneficiary180d}
    const matcherBeneficiary = {
      ...beneficiary,
      requiredSpecialty: specialty,
    };

    const top = matcher.topCandidates(rawTherapists, matcherBeneficiary, limit, {
      maxLoad,
    });

    // Excluded count = (total - included). The W432 lib filters excluded
    // candidates OUT of rankCandidates/topCandidates results, so the
    // delta tells us how many were specialty-mismatched.
    const includedCount = matcher.rankCandidates(rawTherapists, matcherBeneficiary, {
      maxLoad,
    }).length;
    const excludedCount = rawTherapists.length - includedCount;

    let outcome;
    if (includedCount > 0) outcome = 'match_found';
    else if (excludedCount === rawTherapists.length) outcome = 'all_excluded';
    else outcome = 'no_candidates';

    _emitMatchMetric(outcome);

    return res.json({
      success: true,
      data: {
        beneficiary: {
          _id: beneficiary._id,
          branchId: beneficiary.branchId,
          requiredSpecialty: specialty,
        },
        candidates: top,
        excludedCount,
        outcome,
      },
    });
  } catch (err) {
    if (err && err.status === 403) {
      _emitMatchMetric('no_candidates');
      return res.status(403).json({ success: false, error: err.message });
    }
    logger.warn(
      '[caseload-assignment] /suggest failed: %s',
      err && err.message ? err.message : err
    );
    return safeError(res, err, 'caseload-assignment.suggest');
  }
});

module.exports = router;
