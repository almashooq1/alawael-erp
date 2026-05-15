'use strict';

/**
 * inspectionSubmission.service.js — World-Class QMS Phase 29 Commit 16.
 *
 * Offline-first ingestion service for the Mobile Inspector PWA. Key
 * properties:
 *   • idempotent — `submit()` is safe to call N times with the same
 *     `clientUuid` (the model has a unique index on it).
 *   • supports bulk submission (`bulkSubmit`) — for when a device
 *     comes back online with a queue of N pending submissions.
 *   • computes overall score + outcome from item answers.
 */

class InspectionSubmissionService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('InspectionSubmissionService: model is required');
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
      this.logger.warn(`[Inspection] dispatch ${name} failed: ${err.message}`);
    }
  }

  _scoreItems(items) {
    if (!Array.isArray(items) || items.length === 0) return { score: null, outcome: null };
    let pass = 0;
    let fail = 0;
    let na = 0;
    for (const it of items) {
      const a = String(it.answer || '').toLowerCase();
      if (a === 'pass' || a === 'yes') pass++;
      else if (a === 'fail' || a === 'no') fail++;
      else if (a === 'n/a' || a === 'na') na++;
    }
    const denominator = pass + fail; // exclude N/A
    if (denominator === 0) return { score: null, outcome: null };
    const score = Math.round((pass / denominator) * 10000) / 100; // 0-100
    let outcome;
    if (fail === 0) outcome = 'pass';
    else if (score >= 75) outcome = 'pass_with_actions';
    else outcome = 'fail';
    return { score, outcome };
  }

  async submit(payload, inspectorUserId) {
    if (!payload || !payload.clientUuid) {
      throw Object.assign(new Error('clientUuid required'), { code: 'VALIDATION' });
    }
    if (!payload.inspectionType || !payload.title || !payload.capturedAt) {
      throw Object.assign(new Error('inspectionType, title, capturedAt required'), {
        code: 'VALIDATION',
      });
    }

    // Idempotency check.
    const existing = await this.model.findOne({ clientUuid: payload.clientUuid, deleted_at: null });
    if (existing) return { submission: existing, duplicate: true };

    const { score, outcome } = this._scoreItems(payload.items || []);

    const doc = await this.model.create({
      clientUuid: payload.clientUuid,
      inspectionType: payload.inspectionType,
      title: payload.title,
      checklistTemplateCode: payload.checklistTemplateCode || null,
      branchId: payload.branchId || null,
      tenantId: payload.tenantId || null,
      inspectorUserId,
      department: payload.department || null,
      location: payload.location || null,
      capturedAt: new Date(payload.capturedAt),
      submittedAt: this.now(),
      deviceInfo: payload.deviceInfo || null,
      offlineDurationMs: payload.offlineDurationMs || null,
      items: payload.items || [],
      photos: payload.photos || [],
      overallScore: score,
      overallOutcome: outcome,
      relatedIncidentId: payload.relatedIncidentId || null,
      notes: payload.notes || null,
      createdBy: inspectorUserId,
    });

    await this._emit('quality.inspection.submitted', {
      submissionId: String(doc._id),
      submissionNumber: doc.submissionNumber,
      inspectionType: doc.inspectionType,
      overallScore: doc.overallScore,
      overallOutcome: doc.overallOutcome,
      offlineDurationMs: doc.offlineDurationMs,
    });

    if (outcome === 'fail') {
      await this._emit('quality.inspection.fail_detected', {
        submissionId: String(doc._id),
        submissionNumber: doc.submissionNumber,
        inspectionType: doc.inspectionType,
        score,
      });
    }

    return { submission: doc, duplicate: false };
  }

  async bulkSubmit(payloads, inspectorUserId) {
    if (!Array.isArray(payloads)) {
      throw Object.assign(new Error('payloads must be an array'), { code: 'VALIDATION' });
    }
    const out = [];
    for (const p of payloads) {
      try {
        const r = await this.submit(p, inspectorUserId);
        out.push({
          clientUuid: p.clientUuid,
          ok: true,
          duplicate: r.duplicate,
          submissionId: String(r.submission._id),
        });
      } catch (err) {
        out.push({ clientUuid: p.clientUuid || null, ok: false, error: err.message });
      }
    }
    return out;
  }

  async findById(id) {
    return this.model.findOne({ _id: id, deleted_at: null });
  }

  async findByClientUuid(uuid) {
    return this.model.findOne({ clientUuid: uuid, deleted_at: null });
  }

  async list({ branchId, inspectionType, outcome, fromDate, toDate, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (inspectionType) q.inspectionType = inspectionType;
    if (outcome) q.overallOutcome = outcome;
    if (fromDate || toDate) {
      q.capturedAt = {};
      if (fromDate) q.capturedAt.$gte = new Date(fromDate);
      if (toDate) q.capturedAt.$lte = new Date(toDate);
    }
    return this.model.find(q).sort({ capturedAt: -1 }).skip(skip).limit(Math.min(limit, 200));
  }

  async getDashboard({ branchId, days = 30 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const cutoff = new Date(this.now().getTime() - days * 86400000);
    q.capturedAt = { $gte: cutoff };
    const [total, fails, byType, avgScoreAgg] = await Promise.all([
      this.model.countDocuments(q),
      this.model.countDocuments({ ...q, overallOutcome: 'fail' }),
      this.model.aggregate([
        { $match: q },
        { $group: { _id: '$inspectionType', count: { $sum: 1 } } },
      ]),
      this.model.aggregate([
        { $match: q },
        { $group: { _id: null, avg: { $avg: '$overallScore' } } },
      ]),
    ]);
    const typeMap = {};
    for (const r of byType) typeMap[r._id] = r.count;
    return {
      windowDays: days,
      total,
      fails,
      failRate: total > 0 ? Math.round((fails / total) * 100) : 0,
      byType: typeMap,
      avgScore: avgScoreAgg[0]?.avg != null ? Math.round(avgScoreAgg[0].avg * 100) / 100 : null,
    };
  }
}

function createInspectionSubmissionService(deps) {
  return new InspectionSubmissionService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/InspectionSubmission.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new InspectionSubmissionService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  InspectionSubmissionService,
  createInspectionSubmissionService,
  getDefault,
  _replaceDefault,
};
