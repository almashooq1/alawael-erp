'use strict';

/**
 * rca.service.js — World-Class QMS Phase 29 Commit 2.
 *
 * Owns the structured RCA lifecycle (Ishikawa fishbone + 5 Whys).
 *
 * Events emitted:
 *   quality.rca.created
 *   quality.rca.fishbone_updated
 *   quality.rca.five_whys_updated
 *   quality.rca.root_cause_added
 *   quality.rca.root_cause_promoted    — from a fishbone / five-whys node
 *   quality.rca.action_added
 *   quality.rca.action_status_updated
 *   quality.rca.status_changed
 *   quality.rca.verified
 *   quality.rca.cancelled
 */

const {
  RCA_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  ISHIKAWA_VARIANTS,
  validateFiveWhysChain,
  validateIshikawa,
} = require('../../config/rca.registry');

class RcaService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('RcaService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  async _emit(eventName, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(eventName, payload);
    } catch (err) {
      this.logger.warn(`[RcaService] dispatch ${eventName} failed: ${err.message}`);
    }
  }

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal RCA transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async _load(id) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('RCA investigation not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  // ── lifecycle ────────────────────────────────────────────────────

  async createInvestigation(data, userId) {
    if (!data || !data.title) throw new Error('title is required');
    if (!data.eventDate) throw new Error('eventDate is required');
    if (!data.eventDescription) throw new Error('eventDescription is required');
    if (!data.severity) throw new Error('severity is required');
    if (!userId) throw new Error('userId is required');

    const variant = data.ishikawaVariant || 'healthcare';
    if (!ISHIKAWA_VARIANTS[variant]) {
      throw Object.assign(new Error(`unknown ishikawa variant: ${variant}`), {
        code: 'VALIDATION',
      });
    }

    const ishikawa = new Map();
    for (const cat of ISHIKAWA_VARIANTS[variant]) ishikawa.set(cat.code, []);

    const doc = await this.model.create({
      title: data.title,
      eventDate: new Date(data.eventDate),
      eventDescription: data.eventDescription,
      severity: data.severity,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      incidentId: data.incidentId || null,
      complaintId: data.complaintId || null,
      facilitatorUserId: data.facilitatorUserId || userId,
      team: Array.isArray(data.team) ? data.team : [],
      ishikawaVariant: variant,
      ishikawa,
      fiveWhys: [],
      rootCauses: [],
      actions: [],
      status: 'draft',
      createdBy: userId,
    });

    await this._emit('quality.rca.created', {
      rcaId: String(doc._id),
      rcaNumber: doc.rcaNumber,
      severity: doc.severity,
      branchId: doc.branchId ? String(doc.branchId) : null,
      by: String(userId),
    });
    return doc;
  }

  // ── Ishikawa ─────────────────────────────────────────────────────

  async addIshikawaCause(id, category, text, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }
    const variant = ISHIKAWA_VARIANTS[doc.ishikawaVariant];
    if (!variant.find(c => c.code === category)) {
      throw Object.assign(new Error(`Unknown category: ${category}`), { code: 'VALIDATION' });
    }
    if (!text || !String(text).trim()) {
      throw Object.assign(new Error('text is required'), { code: 'VALIDATION' });
    }
    const list = doc.ishikawa.get(category) || [];
    list.push({ text: String(text).trim(), addedBy: userId, addedAt: this.now() });
    doc.ishikawa.set(category, list);
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.rca.fishbone_updated', {
      rcaId: String(doc._id),
      category,
      causeCount: list.length,
      by: String(userId),
    });
    return doc;
  }

  async removeIshikawaCause(id, category, causeId, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }
    const list = doc.ishikawa.get(category) || [];
    const next = list.filter(c => String(c._id) !== String(causeId));
    if (next.length === list.length) {
      throw Object.assign(new Error('cause not found'), { code: 'NOT_FOUND' });
    }
    doc.ishikawa.set(category, next);
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.rca.fishbone_updated', {
      rcaId: String(doc._id),
      category,
      causeCount: next.length,
      by: String(userId),
    });
    return doc;
  }

  // ── 5 Whys ───────────────────────────────────────────────────────

  async setFiveWhysChain(id, chain, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }
    const v = validateFiveWhysChain(chain);
    if (!v.ok) throw Object.assign(new Error(v.reason), { code: 'VALIDATION' });

    doc.fiveWhys = chain.map((node, i) => ({
      level: i + 1,
      question: String(node.question).trim(),
      answer: String(node.answer).trim(),
      evidence: node.evidence || null,
      isRootCause: !!node.isRootCause,
    }));
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.rca.five_whys_updated', {
      rcaId: String(doc._id),
      depth: doc.fiveWhys.length,
      by: String(userId),
    });
    return doc;
  }

  // ── Root causes ──────────────────────────────────────────────────

  async addRootCause(id, payload, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!payload || !payload.text || !payload.source) {
      throw Object.assign(new Error('text and source are required'), { code: 'VALIDATION' });
    }

    doc.rootCauses.push({
      text: payload.text,
      source: payload.source,
      sourceRefId: payload.sourceRefId || null,
      category: payload.category || null,
      severity: payload.severity || doc.severity,
      addressed: false,
    });
    doc.updatedBy = userId;

    if (doc.status === 'analysis' || doc.status === 'draft' || doc.status === 'data_collection') {
      doc.status = 'root_cause_identified';
    }

    await doc.save();
    const created = doc.rootCauses[doc.rootCauses.length - 1];
    await this._emit('quality.rca.root_cause_added', {
      rcaId: String(doc._id),
      rootCauseId: String(created._id),
      source: created.source,
      severity: created.severity,
      by: String(userId),
    });
    return doc;
  }

  /**
   * Convenience: promote a five-whys answer or an Ishikawa cause into a
   * full root-cause record. Used by the UI when the facilitator clicks
   * "this is a root cause" on a node.
   */
  async promoteToRootCause(id, source, refId, payload, userId) {
    if (!['five_whys', 'ishikawa'].includes(source)) {
      throw Object.assign(new Error(`unknown source: ${source}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot edit a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }

    let text = null;
    let category = null;
    if (source === 'five_whys') {
      const node = doc.fiveWhys.id(refId);
      if (!node) throw Object.assign(new Error('5-Whys node not found'), { code: 'NOT_FOUND' });
      node.isRootCause = true;
      text = node.answer;
    } else {
      let found = null;
      let foundCategory = null;
      for (const [cat, list] of doc.ishikawa.entries()) {
        const c = (list || []).find(x => String(x._id) === String(refId));
        if (c) {
          found = c;
          foundCategory = cat;
          break;
        }
      }
      if (!found) throw Object.assign(new Error('Ishikawa cause not found'), { code: 'NOT_FOUND' });
      found.isRootCause = true;
      text = found.text;
      category = foundCategory;
      // Persist the mark on the embedded map; mongoose needs a Set call.
      doc.ishikawa.set(foundCategory, doc.ishikawa.get(foundCategory));
    }

    doc.rootCauses.push({
      text: payload?.text || text,
      source,
      sourceRefId: refId,
      category,
      severity: payload?.severity || doc.severity,
      addressed: false,
    });

    if (['draft', 'data_collection', 'analysis'].includes(doc.status)) {
      doc.status = 'root_cause_identified';
    }
    doc.updatedBy = userId;
    await doc.save();

    const created = doc.rootCauses[doc.rootCauses.length - 1];
    await this._emit('quality.rca.root_cause_promoted', {
      rcaId: String(doc._id),
      rootCauseId: String(created._id),
      source,
      sourceRefId: String(refId),
      by: String(userId),
    });
    return doc;
  }

  // ── Actions ──────────────────────────────────────────────────────

  async addAction(id, payload, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Cannot add actions on a closed investigation'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!payload || !payload.description || !payload.ownerUserId || !payload.dueDate) {
      throw Object.assign(new Error('description, ownerUserId, dueDate are required'), {
        code: 'VALIDATION',
      });
    }
    doc.actions.push({
      description: payload.description,
      rootCauseId: payload.rootCauseId || null,
      ownerUserId: payload.ownerUserId,
      dueDate: new Date(payload.dueDate),
      priority: payload.priority || 'medium',
      status: 'open',
    });
    if (payload.rootCauseId) {
      const rc = doc.rootCauses.id(payload.rootCauseId);
      if (rc) rc.addressed = true;
    }
    if (doc.status === 'root_cause_identified') doc.status = 'actions_open';
    doc.updatedBy = userId;
    await doc.save();

    const created = doc.actions[doc.actions.length - 1];
    await this._emit('quality.rca.action_added', {
      rcaId: String(doc._id),
      actionId: String(created._id),
      ownerUserId: String(created.ownerUserId),
      dueDate: created.dueDate,
      by: String(userId),
    });
    return doc;
  }

  async updateActionStatus(id, actionId, { status, effectivenessNotes } = {}, userId) {
    const VALID = ['open', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!VALID.includes(status)) {
      throw Object.assign(new Error(`Invalid status: ${status}`), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    const action = doc.actions.id(actionId);
    if (!action) throw Object.assign(new Error('Action not found'), { code: 'NOT_FOUND' });

    action.status = status;
    if (status === 'completed') {
      action.completedAt = this.now();
      if (effectivenessNotes) {
        action.effectivenessNotes = effectivenessNotes;
        action.effectivenessVerified = true;
      }
    }

    if (doc.status === 'actions_open') {
      const allDone = doc.actions.every(a => ['completed', 'cancelled'].includes(a.status));
      if (allDone) doc.status = 'actions_completed';
    }

    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.rca.action_status_updated', {
      rcaId: String(doc._id),
      actionId: String(actionId),
      status,
      by: String(userId),
    });
    return doc;
  }

  // ── Transitions ──────────────────────────────────────────────────

  async setStatus(id, to, userId) {
    const doc = await this._load(id);
    this._assertTransition(doc.status, to);
    doc.status = to;
    doc.updatedBy = userId;
    if (to === 'verified') doc.verifiedAt = this.now();
    await doc.save();
    await this._emit('quality.rca.status_changed', {
      rcaId: String(doc._id),
      newStatus: to,
      by: String(userId),
    });
    return doc;
  }

  async verify(id, { lessonsLearned } = {}, userId) {
    const doc = await this._load(id);
    if (doc.status !== 'actions_completed') {
      throw Object.assign(new Error('All actions must be completed before verification'), {
        code: 'INVALID_PHASE',
      });
    }
    // every root cause must have at least one completed action
    const orphans = doc.rootCauses.filter(rc => {
      const matched = doc.actions.filter(
        a => String(a.rootCauseId) === String(rc._id) && a.status === 'completed'
      );
      return matched.length === 0;
    });
    if (orphans.length > 0) {
      const err = new Error(`${orphans.length} root cause(s) have no completed action`);
      err.code = 'INCOMPLETE';
      err.rootCauses = orphans.map(r => String(r._id));
      throw err;
    }
    doc.status = 'verified';
    doc.verifiedAt = this.now();
    if (lessonsLearned) doc.lessonsLearned = lessonsLearned;
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.rca.verified', {
      rcaId: String(doc._id),
      verifiedAt: doc.verifiedAt,
      by: String(userId),
    });
    return doc;
  }

  async cancel(id, reason, userId) {
    const doc = await this._load(id);
    if (TERMINAL_STATUSES.includes(doc.status)) {
      throw Object.assign(new Error('Already terminal'), { code: 'ILLEGAL_TRANSITION' });
    }
    if (!reason || !String(reason).trim()) {
      throw Object.assign(new Error('reason is required'), { code: 'VALIDATION' });
    }
    doc.status = 'cancelled';
    doc.cancelledReason = String(reason).trim();
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.rca.cancelled', {
      rcaId: String(doc._id),
      reason: doc.cancelledReason,
      by: String(userId),
    });
    return doc;
  }

  // ── Validation helpers (exposed for the UI to pre-check) ────────

  validateFiveWhys(chain) {
    return validateFiveWhysChain(chain);
  }

  validateIshikawa(map) {
    // Map → POJO if needed.
    const obj = map instanceof Map ? Object.fromEntries(map) : map;
    return validateIshikawa(obj);
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id) {
    return this.model.findOne({ _id: id, deleted_at: null });
  }

  async list({ branchId, status, severity, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (severity) q.severity = Number(severity);
    return this.model
      .find(q)
      .sort({ eventDate: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const [total, byStatus, bySeverity] = await Promise.all([
      this.model.countDocuments(q),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    ]);
    const statusMap = Object.fromEntries(RCA_STATUSES.map(s => [s, 0]));
    for (const r of byStatus) statusMap[r._id] = r.count;
    const sevMap = {};
    for (const r of bySeverity) sevMap[r._id] = r.count;
    return { total, byStatus: statusMap, bySeverity: sevMap };
  }
}

function createRcaService(deps) {
  return new RcaService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/RcaInvestigation.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new RcaService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  RcaService,
  createRcaService,
  getDefault,
  _replaceDefault,
  ALLOWED_TRANSITIONS,
  RCA_STATUSES,
};
