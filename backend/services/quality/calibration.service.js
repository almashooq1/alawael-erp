'use strict';

/**
 * calibration.service.js — World-Class QMS Phase 29 Commit 9.
 *
 * Events:
 *   quality.calibration.asset_registered
 *   quality.calibration.recorded
 *   quality.calibration.failed
 *   quality.calibration.overdue (fired by scheduler)
 *   quality.calibration.asset_retired
 */

const {
  CAL_STATUSES,
  computeNextDueDate,
  daysUntilDue,
} = require('../../config/calibration.registry');

class CalibrationService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('CalibrationService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  async _emit(name, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(name, payload);
    } catch (err) {
      this.logger.warn(`[Calibration] dispatch ${name} failed: ${err.message}`);
    }
  }

  async _load(id, scopeFilter = {}) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null, ...scopeFilter });
    if (!doc) {
      const err = new Error('Calibration asset not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  async registerAsset(data, userId) {
    if (!data || !data.name || !data.type) {
      throw Object.assign(new Error('name and type required'), { code: 'VALIDATION' });
    }
    const doc = await this.model.create({
      name: data.name,
      type: data.type,
      serialNumber: data.serialNumber || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      location: data.location || null,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      calibrationFrequency: data.calibrationFrequency || null,
      calibrationFrequencyUnit: data.calibrationFrequencyUnit || 'months',
      tolerance: data.tolerance || null,
      referenceStandard: data.referenceStandard || null,
      ownerUserId: data.ownerUserId || null,
      lastCalibratedAt: data.lastCalibratedAt ? new Date(data.lastCalibratedAt) : null,
      nextDueDate: data.lastCalibratedAt
        ? computeNextDueDate(
            data.lastCalibratedAt,
            data.calibrationFrequency,
            data.calibrationFrequencyUnit || 'months'
          )
        : null,
      status: 'active',
      createdBy: userId,
    });
    await this._emit('quality.calibration.asset_registered', {
      assetId: String(doc._id),
      assetCode: doc.assetCode,
      name: doc.name,
      by: String(userId),
    });
    return doc;
  }

  async recordCalibration(id, payload, userId, scopeFilter = {}) {
    if (!payload || !payload.outcome) {
      throw Object.assign(new Error('outcome required'), { code: 'VALIDATION' });
    }
    if (!['pass', 'pass_with_adjustment', 'fail'].includes(payload.outcome)) {
      throw Object.assign(new Error(`unknown outcome: ${payload.outcome}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id, scopeFilter);
    const calibratedAt = payload.calibratedAt ? new Date(payload.calibratedAt) : this.now();
    const nextDueDate = computeNextDueDate(
      calibratedAt,
      doc.calibrationFrequency,
      doc.calibrationFrequencyUnit
    );

    doc.calibrationRecords.push({
      calibratedAt,
      calibratedBy: payload.calibratedBy || null,
      vendorId: payload.vendorId || null,
      method: payload.method || null,
      referenceStandard: payload.referenceStandard || doc.referenceStandard || null,
      certificateNumber: payload.certificateNumber || null,
      certificateUrl: payload.certificateUrl || null,
      outcome: payload.outcome,
      deviationsMeasured: payload.deviationsMeasured || null,
      nextDueDate,
      notes: payload.notes || null,
      recordedBy: userId,
    });
    doc.lastCalibratedAt = calibratedAt;
    doc.nextDueDate = nextDueDate;

    if (payload.outcome === 'fail') {
      doc.status = 'failed';
      await this._emit('quality.calibration.failed', {
        assetId: String(doc._id),
        assetCode: doc.assetCode,
        calibratedAt,
        by: String(userId),
      });
    } else {
      doc.status = 'active';
    }
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.calibration.recorded', {
      assetId: String(doc._id),
      assetCode: doc.assetCode,
      outcome: payload.outcome,
      nextDueDate,
      by: String(userId),
    });
    return doc;
  }

  async setStatus(id, status, reason, userId, scopeFilter = {}) {
    if (!CAL_STATUSES.includes(status)) {
      throw Object.assign(new Error(`invalid status: ${status}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id, scopeFilter);
    doc.status = status;
    if (status === 'out_of_service' || status === 'retired') {
      doc.outOfServiceReason = reason || null;
    }
    doc.updatedBy = userId;
    await doc.save();
    if (status === 'retired') {
      await this._emit('quality.calibration.asset_retired', {
        assetId: String(doc._id),
        assetCode: doc.assetCode,
        reason,
      });
    }
    return doc;
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id, scopeFilter = {}) {
    return this.model.findOne({ _id: id, deleted_at: null, ...scopeFilter });
  }

  async list({ scopeFilter = {}, status, type, dueWithinDays, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null, ...scopeFilter };
    if (status) q.status = status;
    if (type) q.type = type;
    if (dueWithinDays != null) {
      const cutoff = new Date(this.now().getTime() + Number(dueWithinDays) * 86400000);
      q.nextDueDate = { $lte: cutoff };
    }
    return this.model
      .find(q)
      .sort({ nextDueDate: 1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ scopeFilter = {} } = {}) {
    const q = { deleted_at: null, ...scopeFilter };
    const now = this.now();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const [total, active, byStatus, dueSoon, overdue, failedCount] = await Promise.all([
      this.model.countDocuments(q),
      this.model.countDocuments({ ...q, status: 'active' }),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.model.countDocuments({
        ...q,
        status: { $in: ['active', 'awaiting_calibration'] },
        nextDueDate: { $gte: now, $lte: in30 },
      }),
      this.model.countDocuments({
        ...q,
        status: { $in: ['active', 'awaiting_calibration'] },
        nextDueDate: { $lt: now },
      }),
      this.model.countDocuments({ ...q, status: 'failed' }),
    ]);
    const statusMap = Object.fromEntries(CAL_STATUSES.map(s => [s, 0]));
    for (const r of byStatus) statusMap[r._id] = r.count;
    return { total, active, byStatus: statusMap, dueSoon, overdue, failedCount };
  }

  /**
   * Mark assets whose `nextDueDate` is before now as `awaiting_calibration`
   * and emit overdue events. Used by the scheduler.
   */
  async sweepOverdue() {
    const now = this.now();
    const overdue = await this.model.find({
      deleted_at: null,
      status: 'active',
      nextDueDate: { $lt: now },
    });
    for (const doc of overdue) {
      doc.status = 'awaiting_calibration';
      await doc.save();
      await this._emit('quality.calibration.overdue', {
        assetId: String(doc._id),
        assetCode: doc.assetCode,
        nextDueDate: doc.nextDueDate,
        daysOverdue: -daysUntilDue(doc.nextDueDate, now),
      });
    }
    return overdue.length;
  }
}

function createCalibrationService(deps) {
  return new CalibrationService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/CalibrationAsset.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new CalibrationService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { CalibrationService, createCalibrationService, getDefault, _replaceDefault };
