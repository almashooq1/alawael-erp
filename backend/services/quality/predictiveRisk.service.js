'use strict';

/**
 * predictiveRisk.service.js — World-Class QMS Phase 29 Commit 13.
 *
 * Aggregates leading + lagging signals from the QMS data sources and
 * surfaces a forward-looking per-branch risk score.
 *
 * Pure-function compute method `computeScore(signals)` is tested
 * directly; `assembleSignals(branchId)` pulls live data from the
 * various models if they are wired.
 */

const { scoreFromSignals, band, SIGNAL_WEIGHTS } = require('../../config/predictive-risk.registry');

class PredictiveRiskService {
  constructor({
    incidentModel = null,
    complaintModel = null,
    capaModel = null,
    supplierScarModel = null,
    auditOccurrenceModel = null,
    calibrationAssetModel = null,
    standardsTraceModel = null,
    riskModel = null,
    dispatcher = null,
    logger = console,
    now = () => new Date(),
  } = {}) {
    this.incidentModel = incidentModel;
    this.complaintModel = complaintModel;
    this.capaModel = capaModel;
    this.supplierScarModel = supplierScarModel;
    this.auditOccurrenceModel = auditOccurrenceModel;
    this.calibrationAssetModel = calibrationAssetModel;
    this.standardsTraceModel = standardsTraceModel;
    this.riskModel = riskModel;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  /**
   * Pure compute — testable without DB.
   */
  computeScore(signals) {
    const score = scoreFromSignals(signals);
    return {
      score,
      band: band(score),
      signals,
      weights: SIGNAL_WEIGHTS,
    };
  }

  /**
   * Pull all signals from wired models for one branch (or all branches
   * when `branchId` is null).
   */
  async assembleSignals({ branchId = null } = {}) {
    const now = this.now();
    const cutoff30 = new Date(now.getTime() - 30 * 86400000);
    const branchFilter = branchId ? { branchId } : {};

    const safeCount = async (model, query) => {
      if (!model) return null;
      try {
        return await model.countDocuments(query);
      } catch (_) {
        return null;
      }
    };

    const [
      recentIncidents,
      recentCriticalIncidents,
      recentComplaints,
      openCapa,
      overdueCapa,
      openCriticalScar,
      overdueAudit,
      overdueCalibration,
      activeHighRisk,
      lapsedClauses,
    ] = await Promise.all([
      safeCount(this.incidentModel, {
        ...branchFilter,
        deleted_at: null,
        createdAt: { $gte: cutoff30 },
      }),
      safeCount(this.incidentModel, {
        ...branchFilter,
        deleted_at: null,
        createdAt: { $gte: cutoff30 },
        severity: { $in: ['critical', 'major'] },
      }),
      safeCount(this.complaintModel, {
        ...branchFilter,
        deleted_at: null,
        createdAt: { $gte: cutoff30 },
      }),
      safeCount(this.capaModel, {
        ...branchFilter,
        deleted_at: null,
        status: { $in: ['open', 'in_progress'] },
      }),
      safeCount(this.capaModel, {
        ...branchFilter,
        deleted_at: null,
        status: { $in: ['open', 'in_progress', 'overdue'] },
        dueDate: { $lt: now },
      }),
      safeCount(this.supplierScarModel, {
        deleted_at: null,
        severity: 'critical',
        status: { $in: ['open', 'acknowledged', 'in_progress'] },
      }),
      safeCount(this.auditOccurrenceModel, {
        ...branchFilter,
        deleted_at: null,
        status: { $in: ['planned', 'scheduled'] },
        plannedFor: { $lt: now },
      }),
      safeCount(this.calibrationAssetModel, {
        ...branchFilter,
        deleted_at: null,
        status: { $in: ['active', 'awaiting_calibration'] },
        nextDueDate: { $lt: now },
      }),
      safeCount(this.riskModel, {
        ...branchFilter,
        status: { $in: ['open', 'mitigating'] },
        riskLevel: { $in: ['high', 'critical'] },
      }),
      safeCount(this.standardsTraceModel, { ...branchFilter, deleted_at: null, status: 'lapsed' }),
    ]);

    return {
      recent_incidents_30d: recentIncidents || 0,
      recent_critical_incidents_30d: recentCriticalIncidents || 0,
      recent_complaints_30d: recentComplaints || 0,
      open_capa: openCapa || 0,
      overdue_capa: overdueCapa || 0,
      open_critical_scar: openCriticalScar || 0,
      overdue_audit: overdueAudit || 0,
      overdue_calibration: overdueCalibration || 0,
      active_high_risk: activeHighRisk || 0,
      lapsed_clauses: lapsedClauses || 0,
    };
  }

  async getRiskReport({ branchId } = {}) {
    const signals = await this.assembleSignals({ branchId });
    const result = this.computeScore(signals);
    if (this.dispatcher) {
      try {
        await this.dispatcher.emit('quality.predictive_risk.computed', {
          branchId: branchId ? String(branchId) : null,
          score: result.score,
          band: result.band,
        });
      } catch (_) {
        /* swallow */
      }
    }
    return {
      branchId: branchId ? String(branchId) : null,
      computedAt: this.now(),
      ...result,
    };
  }
}

function createPredictiveRiskService(deps) {
  return new PredictiveRiskService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const tryRequire = p => {
      try {
        return require(p);
      } catch (_) {
        return null;
      }
    };
    const deps = {
      incidentModel: tryRequire('../../models/quality/Incident.model'),
      complaintModel: tryRequire('../../models/quality/Complaint.model'),
      capaModel: tryRequire('../../models/CapaItem'),
      supplierScarModel: tryRequire('../../models/quality/SupplierScar.model'),
      auditOccurrenceModel: tryRequire('../../models/quality/AuditOccurrence.model'),
      calibrationAssetModel: tryRequire('../../models/quality/CalibrationAsset.model'),
      standardsTraceModel: tryRequire('../../models/quality/StandardsTraceability.model'),
      riskModel: tryRequire('../../models/quality/Risk.model'),
    };
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new PredictiveRiskService({ ...deps, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  PredictiveRiskService,
  createPredictiveRiskService,
  getDefault,
  _replaceDefault,
};
