'use strict';

/**
 * paretoA3.service.js — World-Class QMS Phase 29 Commit 4.
 *
 * Pure-compute Pareto helper + A3-report lifecycle.
 *
 * Events:
 *   quality.a3.created
 *   quality.a3.section_updated
 *   quality.a3.status_changed
 *   quality.a3.action_added
 *   quality.a3.action_status_updated
 *   quality.a3.closed
 *   quality.a3.cancelled
 */

const {
  A3_SECTIONS,
  A3_STATUSES,
  A3_TERMINAL_STATUSES,
  A3_ALLOWED_TRANSITIONS,
  computePareto,
} = require('../../config/pareto-a3.registry');

class ParetoA3Service {
  constructor({
    model,
    dispatcher = null,
    logger = console,
    now = () => new Date(),
    incidentModel = null,
    complaintModel = null,
  } = {}) {
    if (!model) throw new Error('ParetoA3Service: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
    this.incidentModel = incidentModel;
    this.complaintModel = complaintModel;
  }

  async _emit(name, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(name, payload);
    } catch (err) {
      this.logger.warn(`[ParetoA3Service] dispatch ${name} failed: ${err.message}`);
    }
  }

  _assertTransition(from, to) {
    const allowed = A3_ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal A3 transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async _load(id) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('A3 report not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  // ── Pareto ───────────────────────────────────────────────────────

  paretoFromItems(items, options = {}) {
    return computePareto(items, options);
  }

  /**
   * Build a Pareto from an incident query window. Requires `incidentModel`
   * to be wired at construction time.
   */
  async paretoIncidents({ branchId, fromDate, toDate, groupBy = 'category', threshold } = {}) {
    if (!this.incidentModel) throw new Error('incidentModel not wired');
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (fromDate || toDate) {
      q.createdAt = {};
      if (fromDate) q.createdAt.$gte = new Date(fromDate);
      if (toDate) q.createdAt.$lte = new Date(toDate);
    }
    const docs = await this.incidentModel.find(q).select(groupBy).lean();
    const items = docs.map(d => ({ category: String(d[groupBy] || 'unknown'), count: 1 }));
    return computePareto(items, threshold ? { threshold } : {});
  }

  async paretoComplaints({ branchId, fromDate, toDate, groupBy = 'category', threshold } = {}) {
    if (!this.complaintModel) throw new Error('complaintModel not wired');
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (fromDate || toDate) {
      q.createdAt = {};
      if (fromDate) q.createdAt.$gte = new Date(fromDate);
      if (toDate) q.createdAt.$lte = new Date(toDate);
    }
    const docs = await this.complaintModel.find(q).select(groupBy).lean();
    const items = docs.map(d => ({ category: String(d[groupBy] || 'unknown'), count: 1 }));
    return computePareto(items, threshold ? { threshold } : {});
  }

  // ── A3 ───────────────────────────────────────────────────────────

  async createReport(data, userId) {
    if (!data || !data.title || !data.problemStatement) {
      throw new Error('title and problemStatement are required');
    }
    if (!userId) throw new Error('userId is required');

    const doc = await this.model.create({
      title: data.title,
      problemStatement: data.problemStatement,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      incidentId: data.incidentId || null,
      rcaId: data.rcaId || null,
      fmeaId: data.fmeaId || null,
      facilitatorUserId: data.facilitatorUserId || userId,
      sponsorUserId: data.sponsorUserId || null,
      sections: new Map(),
      actions: [],
      status: 'draft',
      createdBy: userId,
    });
    await this._emit('quality.a3.created', {
      a3Id: String(doc._id),
      reportNumber: doc.reportNumber,
      by: String(userId),
    });
    return doc;
  }

  async updateSection(id, sectionCode, body, userId) {
    const validCodes = A3_SECTIONS.map(s => s.code);
    if (!validCodes.includes(sectionCode)) {
      throw Object.assign(new Error(`unknown section: ${sectionCode}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    if (A3_TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed report'), { code: 'INVALID_PHASE' });
    }
    if (typeof body !== 'string') {
      throw Object.assign(new Error('body must be a string'), { code: 'VALIDATION' });
    }
    doc.sections.set(sectionCode, body);
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.a3.section_updated', {
      a3Id: String(doc._id),
      section: sectionCode,
      length: body.length,
      by: String(userId),
    });
    return doc;
  }

  async addAction(id, payload, userId) {
    const doc = await this._load(id);
    if (A3_TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed report'), { code: 'INVALID_PHASE' });
    }
    if (!payload || !payload.description || !payload.ownerUserId || !payload.dueDate) {
      throw Object.assign(new Error('description, ownerUserId, dueDate required'), {
        code: 'VALIDATION',
      });
    }
    doc.actions.push({
      description: payload.description,
      ownerUserId: payload.ownerUserId,
      dueDate: new Date(payload.dueDate),
      status: 'open',
    });
    doc.updatedBy = userId;
    await doc.save();
    const created = doc.actions[doc.actions.length - 1];
    await this._emit('quality.a3.action_added', {
      a3Id: String(doc._id),
      actionId: String(created._id),
      by: String(userId),
    });
    return doc;
  }

  async updateActionStatus(id, actionId, { status } = {}, userId) {
    const VALID = ['open', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!VALID.includes(status)) {
      throw Object.assign(new Error(`Invalid status: ${status}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    const action = doc.actions.id(actionId);
    if (!action) throw Object.assign(new Error('Action not found'), { code: 'NOT_FOUND' });
    action.status = status;
    if (status === 'completed') action.completedAt = this.now();
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.a3.action_status_updated', {
      a3Id: String(doc._id),
      actionId: String(actionId),
      status,
      by: String(userId),
    });
    return doc;
  }

  async setStatus(id, to, userId) {
    const doc = await this._load(id);
    this._assertTransition(doc.status, to);
    doc.status = to;
    if (to === 'approved') doc.approvedAt = this.now();
    if (to === 'closed') doc.closedAt = this.now();
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.a3.status_changed', {
      a3Id: String(doc._id),
      newStatus: to,
      by: String(userId),
    });
    if (to === 'closed') {
      await this._emit('quality.a3.closed', {
        a3Id: String(doc._id),
        closedAt: doc.closedAt,
        by: String(userId),
      });
    }
    return doc;
  }

  async cancel(id, reason, userId) {
    const doc = await this._load(id);
    if (A3_TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Already terminal'), { code: 'ILLEGAL_TRANSITION' });
    }
    if (!reason) throw Object.assign(new Error('reason required'), { code: 'VALIDATION' });
    doc.status = 'cancelled';
    doc.cancelledReason = String(reason).trim();
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.a3.cancelled', {
      a3Id: String(doc._id),
      reason: doc.cancelledReason,
      by: String(userId),
    });
    return doc;
  }

  async findById(id) {
    return this.model.findOne({ _id: id, deleted_at: null });
  }

  async list({ branchId, status, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    return this.model
      .find(q)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const [total, byStatus] = await Promise.all([
      this.model.countDocuments(q),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const statusMap = Object.fromEntries(A3_STATUSES.map(s => [s, 0]));
    for (const r of byStatus) statusMap[r._id] = r.count;
    return { total, byStatus: statusMap };
  }
}

function createParetoA3Service(deps) {
  return new ParetoA3Service(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/A3Report.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    let incidentModel = null;
    let complaintModel = null;
    try {
      incidentModel = require('../../models/quality/Incident.model');
    } catch (_) {
      /* optional */
    }
    try {
      complaintModel = require('../../models/quality/Complaint.model');
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new ParetoA3Service({ model, dispatcher, incidentModel, complaintModel });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  ParetoA3Service,
  createParetoA3Service,
  getDefault,
  _replaceDefault,
  A3_SECTIONS,
};
