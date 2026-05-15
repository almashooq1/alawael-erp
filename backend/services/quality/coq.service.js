'use strict';

const { summarise, classifyCoqRatio } = require('../../config/coq.registry');

class CoqService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('CoqService: model is required');
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
      this.logger.warn(`[CoQ] dispatch ${name} failed: ${err.message}`);
    }
  }

  async recordEntry(data, userId) {
    if (!data || !data.category || data.amount == null || !data.description || !data.period) {
      throw Object.assign(new Error('category, amount, description, period required'), {
        code: 'VALIDATION',
      });
    }
    if (data.amount < 0) {
      throw Object.assign(new Error('amount must be ≥ 0'), { code: 'VALIDATION' });
    }
    if (!data.period.year || !data.period.month) {
      throw Object.assign(new Error('period.year and period.month required'), {
        code: 'VALIDATION',
      });
    }
    const doc = await this.model.create({
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      period: data.period,
      category: data.category,
      subcategory: data.subcategory || null,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'SAR',
      sourceType: data.sourceType || null,
      sourceId: data.sourceId || null,
      notes: data.notes || null,
      createdBy: userId,
    });
    await this._emit('quality.coq.entry_recorded', {
      entryId: String(doc._id),
      entryNumber: doc.entryNumber,
      category: doc.category,
      amount: doc.amount,
    });
    return doc;
  }

  async listEntries({ branchId, year, month, category, limit = 100, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (year) q['period.year'] = Number(year);
    if (month) q['period.month'] = Number(month);
    if (category) q.category = category;
    return this.model
      .find(q)
      .sort({ 'period.year': -1, 'period.month': -1 })
      .skip(skip)
      .limit(Math.min(limit, 500));
  }

  async getMonthlyReport({ branchId, year, month, revenue } = {}) {
    if (!year || !month) {
      throw Object.assign(new Error('year and month required'), { code: 'VALIDATION' });
    }
    const q = { deleted_at: null, 'period.year': Number(year), 'period.month': Number(month) };
    if (branchId) q.branchId = branchId;
    const entries = await this.model.find(q).lean();
    return summarise(entries, revenue);
  }

  async getYearlyReport({ branchId, year, revenue } = {}) {
    if (!year) {
      throw Object.assign(new Error('year required'), { code: 'VALIDATION' });
    }
    const q = { deleted_at: null, 'period.year': Number(year) };
    if (branchId) q.branchId = branchId;
    const entries = await this.model.find(q).lean();
    const annual = summarise(entries, revenue);

    // Monthly trend.
    const trend = [];
    for (let m = 1; m <= 12; m++) {
      const monthEntries = entries.filter(e => e.period && e.period.month === m);
      const summary = summarise(monthEntries, null);
      trend.push({ month: m, ...summary.totals, total: summary.total });
    }
    return { year, annual, trend };
  }

  async getDashboard({ branchId } = {}) {
    const now = this.now();
    const q = { deleted_at: null, 'period.year': now.getUTCFullYear() };
    if (branchId) q.branchId = branchId;
    const entries = await this.model.find(q).lean();
    const summary = summarise(entries, null);
    return {
      currentYear: now.getUTCFullYear(),
      totals: summary.totals,
      total: summary.total,
      paafShare: summary.paafShare,
      shiftLeft: summary.shiftLeft,
    };
  }

  classifyRatio(ratio) {
    return classifyCoqRatio(ratio);
  }
}

function createCoqService(deps) {
  return new CoqService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/CoqEntry.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new CoqService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { CoqService, createCoqService, getDefault, _replaceDefault };
