'use strict';

const {
  ALLOWED_TRANSITIONS,
  TERMINAL,
  shouldGoToCab,
  RISK_LEVELS,
} = require('../../config/change-control.registry');

class ChangeControlService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('ChangeControlService: model is required');
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
      this.logger.warn(`[ChangeControl] dispatch ${name} failed: ${err.message}`);
    }
  }

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal CR transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async _load(id) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('Change request not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  async createRequest(data, userId) {
    if (!data || !data.title || !data.rationale || !data.type) {
      throw Object.assign(new Error('title, rationale, type required'), { code: 'VALIDATION' });
    }
    if (!RISK_LEVELS.find(r => r.code === (data.riskLevel || 'medium'))) {
      throw Object.assign(new Error('invalid risk level'), { code: 'VALIDATION' });
    }
    const riskLevel = data.riskLevel || 'medium';
    const doc = await this.model.create({
      title: data.title,
      rationale: data.rationale,
      type: data.type,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      requestedBy: userId,
      ownerUserId: data.ownerUserId || userId,
      riskLevel,
      cabRequired: shouldGoToCab(riskLevel),
      impactAreas: data.impactAreas || [],
      status: 'draft',
      createdBy: userId,
    });
    await this._emit('quality.change.created', {
      crId: String(doc._id),
      crNumber: doc.crNumber,
      type: doc.type,
      riskLevel: doc.riskLevel,
      by: String(userId),
    });
    return doc;
  }

  async submitImpactAssessment(id, payload, userId) {
    const doc = await this._load(id);
    if (!['submitted', 'impact_assessment'].includes(doc.status)) {
      throw Object.assign(new Error('not in submission phase'), { code: 'INVALID_PHASE' });
    }
    if (payload.impactAssessment) doc.impactAssessment = payload.impactAssessment;
    if (payload.rollbackPlan) doc.rollbackPlan = payload.rollbackPlan;
    if (payload.testingPlan) doc.testingPlan = payload.testingPlan;
    if (Array.isArray(payload.impactAreas)) doc.impactAreas = payload.impactAreas;
    if (payload.riskLevel) {
      doc.riskLevel = payload.riskLevel;
      doc.cabRequired = shouldGoToCab(payload.riskLevel);
    }
    doc.status = 'impact_assessment';
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async castCabVote(id, vote, userId, { rationale, role } = {}) {
    if (!['approve', 'reject', 'abstain'].includes(vote)) {
      throw Object.assign(new Error('invalid vote'), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    if (doc.status !== 'cab_review' && doc.status !== 'impact_assessment') {
      throw Object.assign(new Error('CR not awaiting CAB vote'), { code: 'INVALID_PHASE' });
    }
    // Auto-advance from impact_assessment to cab_review on first vote.
    if (doc.status === 'impact_assessment') {
      doc.status = 'cab_review';
    }
    // Replace existing vote if same voter votes again.
    doc.cabVotes = doc.cabVotes.filter(v => String(v.voterUserId) !== String(userId));
    doc.cabVotes.push({
      voterUserId: userId,
      role: role || null,
      vote,
      rationale: rationale || null,
      votedAt: this.now(),
    });
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.change.cab_vote', {
      crId: String(doc._id),
      crNumber: doc.crNumber,
      voterUserId: String(userId),
      vote,
    });
    return doc;
  }

  /**
   * Decide CAB outcome from cast votes. Simple majority of approve vs
   * reject (abstain ignored). Caller is the CAB chair / quality manager.
   */
  async decideCab(id, userId) {
    const doc = await this._load(id);
    if (doc.status !== 'cab_review') {
      throw Object.assign(new Error('CR not in CAB review'), { code: 'INVALID_PHASE' });
    }
    const approve = doc.cabVotes.filter(v => v.vote === 'approve').length;
    const reject = doc.cabVotes.filter(v => v.vote === 'reject').length;
    if (approve === 0 && reject === 0) {
      throw Object.assign(new Error('no votes cast'), { code: 'VALIDATION' });
    }
    const passed = approve > reject;
    doc.status = passed ? 'approved' : 'rejected';
    doc.cabDecisionAt = this.now();
    if (!passed) doc.rejectedReason = `CAB vote ${approve} approve / ${reject} reject`;
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.change.cab_decision', {
      crId: String(doc._id),
      crNumber: doc.crNumber,
      outcome: passed ? 'approved' : 'rejected',
      approve,
      reject,
    });
    return doc;
  }

  async setStatus(id, to, userId, payload = {}) {
    const doc = await this._load(id);
    this._assertTransition(doc.status, to);
    doc.status = to;
    if (to === 'in_implementation') doc.actualStart = this.now();
    if (to === 'verification') doc.actualEnd = this.now();
    if (to === 'rejected') doc.rejectedReason = payload.reason || null;
    if (to === 'cancelled') doc.cancelledReason = payload.reason || null;
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async addStep(id, payload, userId) {
    const doc = await this._load(id);
    if (TERMINAL.includes(doc.status)) {
      throw Object.assign(new Error('CR closed'), { code: 'INVALID_PHASE' });
    }
    if (!payload.description || !payload.ownerUserId || !payload.dueDate) {
      throw Object.assign(new Error('description, ownerUserId, dueDate required'), {
        code: 'VALIDATION',
      });
    }
    doc.implementationSteps.push({
      description: payload.description,
      ownerUserId: payload.ownerUserId,
      dueDate: new Date(payload.dueDate),
      status: 'open',
    });
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async setStepStatus(id, stepId, status, userId) {
    if (!['open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      throw Object.assign(new Error('invalid step status'), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    const step = doc.implementationSteps.id(stepId);
    if (!step) throw Object.assign(new Error('Step not found'), { code: 'NOT_FOUND' });
    step.status = status;
    if (status === 'completed') step.completedAt = this.now();
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  async verify(id, outcome, notes, userId) {
    if (!['successful', 'unsuccessful'].includes(outcome)) {
      throw Object.assign(new Error('invalid outcome'), { code: 'VALIDATION' });
    }
    const doc = await this._load(id);
    if (doc.status !== 'verification') {
      throw Object.assign(new Error('CR not in verification'), { code: 'INVALID_PHASE' });
    }
    doc.verificationOutcome = outcome;
    doc.verificationNotes = notes || null;
    doc.status = outcome === 'successful' ? 'closed' : 'in_implementation';
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.change.verified', {
      crId: String(doc._id),
      crNumber: doc.crNumber,
      outcome,
    });
    return doc;
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id) {
    return this.model.findOne({ _id: id, deleted_at: null });
  }

  async list({ branchId, status, type, riskLevel, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (type) q.type = type;
    if (riskLevel) q.riskLevel = riskLevel;
    return this.model.find(q).sort({ updatedAt: -1 }).skip(skip).limit(Math.min(limit, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const [total, byStatus, byRisk] = await Promise.all([
      this.model.countDocuments(q),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
    ]);
    const statusMap = {};
    for (const r of byStatus) statusMap[r._id] = r.count;
    const riskMap = {};
    for (const r of byRisk) riskMap[r._id] = r.count;
    return { total, byStatus: statusMap, byRisk: riskMap };
  }
}

function createChangeControlService(deps) {
  return new ChangeControlService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/ChangeRequest.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new ChangeControlService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = { ChangeControlService, createChangeControlService, getDefault, _replaceDefault };
