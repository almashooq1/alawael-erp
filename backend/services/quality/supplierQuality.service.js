'use strict';

/**
 * supplierQuality.service.js — World-Class QMS Phase 29 Commit 8.
 *
 * Owns:
 *   • SCAR lifecycle (open → acknowledged → in_progress → response →
 *     verifying → verified → closed).
 *   • Per-supplier weighted scorecard.
 *
 * Events:
 *   quality.supplier.scar_raised
 *   quality.supplier.scar_status_changed
 *   quality.supplier.scar_response_submitted
 *   quality.supplier.scar_verified
 *   quality.supplier.scar_overdue (emitted by the scheduler if wired)
 *   quality.supplier.scorecard_computed
 */

const {
  SCAR_STATUSES,
  TERMINAL_STATUSES: _TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  SCAR_SEVERITY,
  computeScorecard,
} = require('../../config/supplier-quality.registry');

class SupplierQualityService {
  constructor({
    scarModel,
    vendorModel = null,
    purchaseOrderModel = null,
    dispatcher = null,
    logger = console,
    now = () => new Date(),
  } = {}) {
    if (!scarModel) throw new Error('SupplierQualityService: scarModel is required');
    this.scarModel = scarModel;
    this.vendorModel = vendorModel;
    this.purchaseOrderModel = purchaseOrderModel;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  async _emit(name, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(name, payload);
    } catch (err) {
      this.logger.warn(`[SupplierQuality] dispatch ${name} failed: ${err.message}`);
    }
  }

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal SCAR transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async _load(id) {
    const doc = await this.scarModel.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('SCAR not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  // ── SCAR lifecycle ───────────────────────────────────────────────

  async raiseScar(data, userId) {
    if (!data || !data.vendorId || !data.title || !data.description || !data.severity) {
      throw Object.assign(new Error('vendorId, title, description, severity required'), {
        code: 'VALIDATION',
      });
    }
    const sevSpec = SCAR_SEVERITY.find(s => s.code === data.severity);
    if (!sevSpec) {
      throw Object.assign(new Error(`unknown severity: ${data.severity}`), { code: 'VALIDATION' });
    }
    const responseDueBy = data.responseDueBy
      ? new Date(data.responseDueBy)
      : new Date(this.now().getTime() + sevSpec.responseDays * 86400000);

    const doc = await this.scarModel.create({
      vendorId: data.vendorId,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      title: data.title,
      description: data.description,
      severity: data.severity,
      defectCategory: data.defectCategory || null,
      affectedLotIds: data.affectedLotIds || [],
      affectedQuantity: data.affectedQuantity || null,
      purchaseOrderId: data.purchaseOrderId || null,
      relatedIncidentId: data.relatedIncidentId || null,
      responseDueBy,
      status: 'open',
      createdBy: userId,
    });

    await this._emit('quality.supplier.scar_raised', {
      scarId: String(doc._id),
      scarNumber: doc.scarNumber,
      vendorId: String(doc.vendorId),
      severity: doc.severity,
      responseDueBy: doc.responseDueBy,
      by: String(userId),
    });
    return doc;
  }

  async setStatus(id, to, userId, payload = {}) {
    const doc = await this._load(id);
    this._assertTransition(doc.status, to);
    const from = doc.status;
    doc.status = to;
    if (to === 'rejected') doc.rejectedReason = payload.reason || null;
    if (to === 'cancelled') doc.cancelledReason = payload.reason || null;
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.supplier.scar_status_changed', {
      scarId: String(doc._id),
      scarNumber: doc.scarNumber,
      vendorId: String(doc.vendorId),
      from,
      to,
      by: String(userId),
    });
    return doc;
  }

  async addContainment(id, action, userId) {
    if (!action) throw Object.assign(new Error('action required'), { code: 'VALIDATION' });
    const doc = await this._load(id);
    doc.containmentActions.push({ action, performedAt: this.now(), performedBy: userId });
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async submitSupplierResponse(id, payload, userId) {
    if (!payload || !payload.rootCause || !payload.correctiveAction) {
      throw Object.assign(new Error('rootCause and correctiveAction required'), {
        code: 'VALIDATION',
      });
    }
    const doc = await this._load(id);
    if (!['acknowledged', 'in_progress', 'rejected'].includes(doc.status)) {
      throw Object.assign(new Error('SCAR not awaiting response'), { code: 'INVALID_PHASE' });
    }
    doc.supplierResponse = {
      rootCause: payload.rootCause,
      correctiveAction: payload.correctiveAction,
      preventiveAction: payload.preventiveAction || null,
      targetCompletionDate: payload.targetCompletionDate
        ? new Date(payload.targetCompletionDate)
        : null,
      submittedBy: payload.submittedBy || null,
      submittedAt: this.now(),
      attachments: payload.attachments || [],
    };
    doc.status = 'response_received';
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.supplier.scar_response_submitted', {
      scarId: String(doc._id),
      vendorId: String(doc.vendorId),
      submittedBy: payload.submittedBy || null,
    });
    return doc;
  }

  async verifyEffectiveness(id, payload, userId) {
    const doc = await this._load(id);
    if (!['response_received', 'verifying'].includes(doc.status)) {
      throw Object.assign(new Error('SCAR not in verification phase'), { code: 'INVALID_PHASE' });
    }
    if (!payload || !payload.outcome) {
      throw Object.assign(new Error('outcome required'), { code: 'VALIDATION' });
    }
    doc.verification = {
      method: payload.method || null,
      verifiedAt: this.now(),
      verifiedBy: userId,
      outcome: payload.outcome,
      notes: payload.notes || null,
    };
    doc.status = payload.outcome === 'effective' ? 'verified' : 'rejected';
    if (payload.outcome === 'ineffective') {
      doc.rejectedReason = payload.notes || 'verification failed';
    }
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.supplier.scar_verified', {
      scarId: String(doc._id),
      vendorId: String(doc.vendorId),
      outcome: payload.outcome,
      by: String(userId),
    });
    return doc;
  }

  // ── scorecard ────────────────────────────────────────────────────

  /**
   * Compute per-vendor scorecard. Requires the data sources to be
   * wired or the dimensions will be `null` and silently dropped.
   *
   * Returns { score (0-1), grade, components, raw, supplier }.
   */
  async computeVendorScorecard(vendorId, { windowDays = 180 } = {}) {
    const cutoff = new Date(this.now().getTime() - windowDays * 86400000);

    const scars = await this.scarModel
      .find({ vendorId, deleted_at: null, raisedAt: { $gte: cutoff } })
      .lean();

    // SCAR performance: 1 - normalised penalty for open critical SCARs.
    const openCritical = scars.filter(
      s => !['verified', 'closed', 'cancelled'].includes(s.status) && s.severity === 'critical'
    ).length;
    const openMajor = scars.filter(
      s => !['verified', 'closed', 'cancelled'].includes(s.status) && s.severity === 'major'
    ).length;
    const penalty = Math.min(1, openCritical * 0.25 + openMajor * 0.1);
    const scarPerformance = Math.max(0, 1 - penalty);

    // Responsiveness: mean (response time vs SLA) ratio across closed SCARs.
    const respondedScars = scars.filter(s => s.supplierResponse && s.responseDueBy);
    let responsiveness = null;
    if (respondedScars.length > 0) {
      let sum = 0;
      for (const s of respondedScars) {
        const sla = (s.responseDueBy - s.raisedAt) / 86400000; // days
        const actual = (s.supplierResponse.submittedAt - s.raisedAt) / 86400000;
        const ratio = actual <= sla ? 1 : Math.max(0, 1 - (actual - sla) / sla);
        sum += ratio;
      }
      responsiveness = sum / respondedScars.length;
    }

    // On-time delivery + quality acceptance — pulled from PurchaseOrder if available.
    let onTimeDelivery = null;
    let qualityAcceptance = null;
    if (this.purchaseOrderModel) {
      try {
        const pos = await this.purchaseOrderModel
          .find({ vendorId, createdAt: { $gte: cutoff } })
          .select('promisedDate deliveredDate status rejectedQty receivedQty')
          .lean();
        const delivered = pos.filter(p => p.deliveredDate);
        if (delivered.length > 0) {
          const onTime = delivered.filter(
            p => !p.promisedDate || p.deliveredDate <= p.promisedDate
          ).length;
          onTimeDelivery = onTime / delivered.length;
        }
        const lotSet = pos.filter(p => p.receivedQty != null);
        if (lotSet.length > 0) {
          const totalReceived = lotSet.reduce((a, p) => a + (p.receivedQty || 0), 0);
          const totalRejected = lotSet.reduce((a, p) => a + (p.rejectedQty || 0), 0);
          qualityAcceptance = totalReceived > 0 ? 1 - totalRejected / totalReceived : null;
        }
      } catch (_) {
        // PO model schema may not match — silently skip.
      }
    }

    let supplier = null;
    if (this.vendorModel) {
      supplier = await this.vendorModel.findById(vendorId).lean();
    }

    const dims = {
      onTimeDelivery,
      qualityAcceptance,
      scarPerformance,
      responsiveness,
      commercial: supplier?.rating != null ? supplier.rating / 5 : null,
    };

    const result = computeScorecard(dims);
    await this._emit('quality.supplier.scorecard_computed', {
      vendorId: String(vendorId),
      score: result.score,
      grade: result.grade,
    });
    return {
      vendorId,
      supplier: supplier
        ? {
            _id: supplier._id,
            name: supplier.name,
            category: supplier.category,
            rating: supplier.rating,
          }
        : null,
      windowDays,
      raw: {
        totalScarsInWindow: scars.length,
        openCritical,
        openMajor,
      },
      dimensions: dims,
      score: result.score,
      scorePercent: Math.round(result.score * 100),
      grade: result.grade,
      appliedWeight: result.appliedWeight,
    };
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id) {
    return this.scarModel.findOne({ _id: id, deleted_at: null });
  }

  async listScars({ vendorId, status, severity, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (vendorId) q.vendorId = vendorId;
    if (status) q.status = status;
    if (severity) q.severity = severity;
    return this.scarModel
      .find(q)
      .sort({ raisedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const [total, byStatus, bySeverity, overdue] = await Promise.all([
      this.scarModel.countDocuments(q),
      this.scarModel.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.scarModel.aggregate([
        { $match: q },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      this.scarModel.countDocuments({
        ...q,
        responseDueBy: { $lt: this.now() },
        status: { $in: ['open', 'acknowledged', 'in_progress'] },
      }),
    ]);
    const statusMap = Object.fromEntries(SCAR_STATUSES.map(s => [s, 0]));
    for (const r of byStatus) statusMap[r._id] = r.count;
    const sevMap = {};
    for (const r of bySeverity) sevMap[r._id] = r.count;
    return { total, byStatus: statusMap, bySeverity: sevMap, overdue };
  }
}

function createSupplierQualityService(deps) {
  return new SupplierQualityService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const scarModel = require('../../models/quality/SupplierScar.model');
    let vendorModel = null;
    let purchaseOrderModel = null;
    try {
      vendorModel = require('../../models/Vendor');
    } catch (_) {
      /* optional */
    }
    try {
      purchaseOrderModel = require('../../models/inventory/PurchaseOrder');
    } catch (_) {
      /* optional */
    }
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new SupplierQualityService({
      scarModel,
      vendorModel,
      purchaseOrderModel,
      dispatcher,
    });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  SupplierQualityService,
  createSupplierQualityService,
  getDefault,
  _replaceDefault,
};
