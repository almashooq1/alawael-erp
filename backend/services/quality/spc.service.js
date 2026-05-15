'use strict';

/**
 * spc.service.js — World-Class QMS Phase 29 Commit 3.
 *
 * Owns the SPC chart lifecycle + the compute pipeline (control
 * limits, capability, special-cause detection).
 *
 * Events:
 *   quality.spc.created
 *   quality.spc.measurement_added
 *   quality.spc.special_cause_detected — fired when a Western-Electric rule trips
 *   quality.spc.archived
 */

const {
  computeXbarR,
  computeXbarS,
  computeImr,
  computeP,
  computeNp,
  computeC,
  computeU,
  computeCapability,
  detectSpecialCauses,
} = require('../../config/spc.registry');

class SpcService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('SpcService: model is required');
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
      this.logger.warn(`[SpcService] dispatch ${name} failed: ${err.message}`);
    }
  }

  async _load(id) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('SPC chart not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  // ── CRUD ─────────────────────────────────────────────────────────

  async createChart(data, userId) {
    if (!data || !data.title || !data.chartType || !data.metric) {
      throw new Error('title, chartType and metric are required');
    }
    const doc = await this.model.create({
      title: data.title,
      description: data.description || null,
      chartType: data.chartType,
      metric: data.metric,
      unit: data.unit || null,
      subgroupSize: data.subgroupSize || null,
      usl: data.usl ?? null,
      lsl: data.lsl ?? null,
      target: data.target ?? null,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      indicatorId: data.indicatorId || null,
      measurements: [],
      status: 'active',
      createdBy: userId,
    });
    await this._emit('quality.spc.created', {
      chartId: String(doc._id),
      chartNumber: doc.chartNumber,
      chartType: doc.chartType,
      by: String(userId),
    });
    return doc;
  }

  async addMeasurement(id, payload, userId) {
    const doc = await this._load(id);
    if (doc.status !== 'active') {
      throw Object.assign(new Error('chart is not active'), { code: 'INVALID_PHASE' });
    }
    // Light validation.
    if (['xbar_r', 'xbar_s', 'imr'].includes(doc.chartType)) {
      if (!Array.isArray(payload.values) || payload.values.length === 0) {
        throw Object.assign(new Error('values[] required for continuous chart'), {
          code: 'VALIDATION',
        });
      }
    } else if (['p', 'np'].includes(doc.chartType)) {
      if (payload.defective == null || payload.sampleSize == null) {
        throw Object.assign(new Error('defective + sampleSize required'), { code: 'VALIDATION' });
      }
    } else if (doc.chartType === 'c') {
      if (payload.count == null) {
        throw Object.assign(new Error('count required'), { code: 'VALIDATION' });
      }
    } else if (doc.chartType === 'u') {
      if (payload.count == null || payload.units == null) {
        throw Object.assign(new Error('count + units required'), { code: 'VALIDATION' });
      }
    }

    doc.measurements.push({
      collectedAt: payload.collectedAt ? new Date(payload.collectedAt) : this.now(),
      collectedBy: userId,
      values: payload.values || [],
      sampleSize: payload.sampleSize ?? null,
      defective: payload.defective ?? null,
      count: payload.count ?? null,
      units: payload.units ?? null,
      note: payload.note || null,
    });
    doc.updatedBy = userId;
    await doc.save();

    // Recompute and check for fired rules.
    const analysis = this._computeAnalysis(doc);
    const latest = analysis.specialCauses[analysis.specialCauses.length - 1];
    if (latest && latest.fired && latest.fired.length > 0) {
      await this._emit('quality.spc.special_cause_detected', {
        chartId: String(doc._id),
        chartNumber: doc.chartNumber,
        index: latest.index,
        rules: latest.fired,
        value: latest.value,
      });
    }

    await this._emit('quality.spc.measurement_added', {
      chartId: String(doc._id),
      index: doc.measurements.length,
      by: String(userId),
    });
    return { chart: doc, analysis };
  }

  /**
   * Recompute statistics + run rules without writing.
   */
  computeAnalysis(doc) {
    return this._computeAnalysis(doc);
  }

  _computeAnalysis(doc) {
    const measurements = doc.measurements || [];
    if (measurements.length === 0) {
      return { stats: null, specialCauses: [], capability: null };
    }
    // Some chart types need ≥2 points before limits can be drawn.
    const flatCount = measurements.reduce((acc, m) => acc + (m.values?.length || 1), 0);
    if (['imr'].includes(doc.chartType) && flatCount < 2) {
      return { stats: null, specialCauses: [], capability: null };
    }
    if (['xbar_r', 'xbar_s'].includes(doc.chartType) && measurements.length < 2) {
      return { stats: null, specialCauses: [], capability: null };
    }
    let stats;
    let primaryValues;
    let cl;
    let ucl;
    let lcl;

    if (doc.chartType === 'xbar_r') {
      stats = computeXbarR(measurements.map(m => m.values));
      primaryValues = stats.points.map(p => p.xBar);
      cl = stats.xBarMean;
      ucl = stats.xBarUcl;
      lcl = stats.xBarLcl;
    } else if (doc.chartType === 'xbar_s') {
      stats = computeXbarS(measurements.map(m => m.values));
      primaryValues = stats.points.map(p => p.xBar);
      cl = stats.xBarMean;
      ucl = stats.xBarUcl;
      lcl = stats.xBarLcl;
    } else if (doc.chartType === 'imr') {
      const flat = measurements.flatMap(m => m.values);
      stats = computeImr(flat);
      primaryValues = stats.points.map(p => p.value);
      cl = stats.xBar;
      ucl = stats.iUcl;
      lcl = stats.iLcl;
    } else if (doc.chartType === 'p') {
      stats = computeP(
        measurements.map(m => ({ defective: m.defective, sampleSize: m.sampleSize }))
      );
      primaryValues = stats.points.map(p => p.p);
      cl = stats.pBar;
      ucl = stats.points.reduce((max, p) => Math.max(max, p.ucl), 0);
      lcl = stats.points.reduce((min, p) => Math.min(min, p.lcl), Infinity);
    } else if (doc.chartType === 'np') {
      stats = computeNp(
        measurements.map(m => ({ defective: m.defective, sampleSize: m.sampleSize }))
      );
      primaryValues = stats.points.map(p => p.defective);
      cl = stats.npBar;
      ucl = stats.ucl;
      lcl = stats.lcl;
    } else if (doc.chartType === 'c') {
      stats = computeC(measurements.map(m => ({ count: m.count })));
      primaryValues = stats.points.map(p => p.count);
      cl = stats.cBar;
      ucl = stats.ucl;
      lcl = stats.lcl;
    } else if (doc.chartType === 'u') {
      stats = computeU(measurements.map(m => ({ count: m.count, units: m.units })));
      primaryValues = stats.points.map(p => p.u);
      cl = stats.uBar;
      ucl = stats.points.reduce((max, p) => Math.max(max, p.ucl), 0);
      lcl = stats.points.reduce((min, p) => Math.min(min, p.lcl), Infinity);
    } else {
      throw new Error(`unknown chartType: ${doc.chartType}`);
    }

    const specialCauses = detectSpecialCauses(primaryValues, cl, ucl, lcl);

    // Capability when continuous + USL/LSL set.
    let capability = null;
    if (['xbar_r', 'xbar_s', 'imr'].includes(doc.chartType) && doc.usl != null && doc.lsl != null) {
      const allValues = measurements.flatMap(m => m.values);
      capability = computeCapability({ values: allValues, usl: doc.usl, lsl: doc.lsl });
    }

    return { stats, specialCauses, capability };
  }

  async archive(id, userId) {
    const doc = await this._load(id);
    doc.status = 'archived';
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.spc.archived', { chartId: String(doc._id), by: String(userId) });
    return doc;
  }

  async pause(id, userId) {
    const doc = await this._load(id);
    doc.status = 'paused';
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async resume(id, userId) {
    const doc = await this._load(id);
    doc.status = 'active';
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id, { withAnalysis = false } = {}) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) return null;
    if (!withAnalysis) return doc;
    return { chart: doc, analysis: this._computeAnalysis(doc) };
  }

  async list({ branchId, status, chartType, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (chartType) q.chartType = chartType;
    return this.model
      .find(q)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const [total, active, paused, archived, byType] = await Promise.all([
      this.model.countDocuments(q),
      this.model.countDocuments({ ...q, status: 'active' }),
      this.model.countDocuments({ ...q, status: 'paused' }),
      this.model.countDocuments({ ...q, status: 'archived' }),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$chartType', count: { $sum: 1 } } }]),
    ]);
    const typeMap = {};
    for (const r of byType) typeMap[r._id] = r.count;
    return { total, active, paused, archived, byType: typeMap };
  }
}

function createSpcService(deps) {
  return new SpcService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/SpcChart.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new SpcService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { SpcService, createSpcService, getDefault, _replaceDefault };
