'use strict';

/**
 * standardsTraceability.service.js — World-Class QMS Phase 29 Commit 5.
 *
 * Generic compliance-traceability service. Joins the per-standard
 * static registry (clauses + labels + intent) with the per-(standard,
 * clause, branch) dynamic state stored in StandardsTraceability docs.
 *
 * Supports any standard registered in `backend/config/standards/` —
 * just by name. ISO 9001 ships in this commit; JCI + CBAHI plug in
 * during Pillar 2.2.
 *
 * Events emitted:
 *   quality.standard.clause_initialised
 *   quality.standard.clause_status_changed
 *   quality.standard.evidence_attached
 *   quality.standard.evidence_removed
 */

const standards = require('../../config/standards');

class StandardsTraceabilityService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('StandardsTraceabilityService: model is required');
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
      this.logger.warn(`[StandardsTraceability] dispatch ${name} failed: ${err.message}`);
    }
  }

  _assertClause(standardCode, clauseCode) {
    const clause = standards.findClause(standardCode, clauseCode);
    if (!clause) {
      const err = new Error(`unknown clause ${standardCode}:${clauseCode}`);
      err.code = 'VALIDATION';
      throw err;
    }
    return clause;
  }

  // ── reference data ─────────────────────────────────────────────

  listStandards() {
    return standards.listStandards();
  }

  getStandardDefinition(code) {
    const reg = standards.getStandard(code);
    return {
      standard: reg.STANDARD,
      clauses: reg.CLAUSES,
      statuses: reg.CLAUSE_STATUSES,
      statusLabels: reg.STATUS_LABELS,
      commonEvidenceTypes: reg.COMMON_EVIDENCE_TYPES || [],
    };
  }

  // ── initialise a branch against a standard ─────────────────────

  /**
   * Idempotently create a record per clause that requires evidence,
   * so the dashboard renders the full matrix from day 1.
   */
  async initialiseForBranch(standardCode, branchId, userId) {
    const reg = standards.getStandard(standardCode);
    const inserted = [];
    for (const clause of reg.CLAUSES) {
      if (!clause.evidenceRequired) continue;
      const existing = await this.model.findOne({
        standardCode,
        clauseCode: clause.code,
        branchId: branchId || null,
        deleted_at: null,
      });
      if (existing) continue;
      const created = await this.model.create({
        standardCode,
        clauseCode: clause.code,
        branchId: branchId || null,
        status: 'not_started',
        createdBy: userId,
      });
      inserted.push(created);
      await this._emit('quality.standard.clause_initialised', {
        standardCode,
        clauseCode: clause.code,
        recordId: String(created._id),
        branchId: branchId ? String(branchId) : null,
      });
    }
    return inserted;
  }

  // ── status + evidence operations ───────────────────────────────

  async setStatus(standardCode, clauseCode, branchId, payload, userId) {
    const clause = this._assertClause(standardCode, clauseCode);
    if (!payload || !payload.status) {
      throw Object.assign(new Error('status required'), { code: 'VALIDATION' });
    }
    const valid = standards.getStandard(standardCode).CLAUSE_STATUSES;
    if (!valid.includes(payload.status)) {
      throw Object.assign(new Error(`invalid status: ${payload.status}`), { code: 'VALIDATION' });
    }
    if (payload.status === 'not_applicable' && !payload.notApplicableReason) {
      throw Object.assign(new Error('notApplicableReason required when setting not_applicable'), {
        code: 'VALIDATION',
      });
    }

    const doc = await this._upsertRecord(standardCode, clauseCode, branchId, userId);
    const statusFrom = doc.status;
    if (statusFrom !== payload.status) {
      doc.reviewHistory.push({
        reviewedBy: userId,
        reviewedAt: this.now(),
        note: payload.note || null,
        statusFrom,
        statusTo: payload.status,
      });
    }
    doc.status = payload.status;
    if (payload.status === 'not_applicable') {
      doc.notApplicableReason = payload.notApplicableReason;
    }
    if (payload.nextReviewDue) doc.nextReviewDue = new Date(payload.nextReviewDue);
    if (payload.ownerUserId) doc.ownerUserId = payload.ownerUserId;
    if (payload.notes) doc.notes = payload.notes;
    doc.lastReviewedAt = this.now();
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.standard.clause_status_changed', {
      standardCode,
      clauseCode,
      branchId: branchId ? String(branchId) : null,
      statusFrom,
      statusTo: payload.status,
      by: String(userId),
      clauseName: clause.nameEn,
    });
    return doc;
  }

  async attachEvidence(standardCode, clauseCode, branchId, link, userId) {
    this._assertClause(standardCode, clauseCode);
    if (!link || !link.kind || !link.title) {
      throw Object.assign(new Error('kind and title required'), { code: 'VALIDATION' });
    }
    const doc = await this._upsertRecord(standardCode, clauseCode, branchId, userId);
    doc.evidenceLinks.push({
      kind: link.kind,
      refId: link.refId || null,
      url: link.url || null,
      title: link.title,
      addedBy: userId,
      addedAt: this.now(),
    });
    // Auto-advance status when the first evidence is attached.
    if (doc.status === 'not_started' || doc.status === 'in_progress') {
      doc.status = 'evidence_attached';
    }
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.standard.evidence_attached', {
      standardCode,
      clauseCode,
      branchId: branchId ? String(branchId) : null,
      kind: link.kind,
      title: link.title,
      by: String(userId),
    });
    return doc;
  }

  async removeEvidence(standardCode, clauseCode, branchId, linkId, userId) {
    this._assertClause(standardCode, clauseCode);
    const doc = await this._loadRecord(standardCode, clauseCode, branchId);
    if (!doc) throw Object.assign(new Error('record not found'), { code: 'NOT_FOUND' });
    const before = doc.evidenceLinks.length;
    doc.evidenceLinks = doc.evidenceLinks.filter(l => String(l._id) !== String(linkId));
    if (doc.evidenceLinks.length === before) {
      throw Object.assign(new Error('link not found'), { code: 'NOT_FOUND' });
    }
    if (doc.evidenceLinks.length === 0 && doc.status === 'evidence_attached') {
      doc.status = 'in_progress';
    }
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.standard.evidence_removed', {
      standardCode,
      clauseCode,
      branchId: branchId ? String(branchId) : null,
      linkId: String(linkId),
      by: String(userId),
    });
    return doc;
  }

  async _upsertRecord(standardCode, clauseCode, branchId, userId) {
    let doc = await this.model.findOne({
      standardCode,
      clauseCode,
      branchId: branchId || null,
      deleted_at: null,
    });
    if (!doc) {
      doc = await this.model.create({
        standardCode,
        clauseCode,
        branchId: branchId || null,
        status: 'not_started',
        createdBy: userId,
      });
    }
    return doc;
  }

  async _loadRecord(standardCode, clauseCode, branchId) {
    return this.model.findOne({
      standardCode,
      clauseCode,
      branchId: branchId || null,
      deleted_at: null,
    });
  }

  // ── reporting ──────────────────────────────────────────────────

  /**
   * Build the traceability matrix for one branch against one standard.
   * Returns: { standard, clauses[] each with current record (or null),
   *   coverage{}, gaps[] }.
   */
  async getTraceabilityMatrix(standardCode, branchId) {
    const reg = standards.getStandard(standardCode);
    const records = await this.model
      .find({ standardCode, branchId: branchId || null, deleted_at: null })
      .lean();
    const byClause = new Map();
    for (const r of records) byClause.set(r.clauseCode, r);

    const rows = reg.CLAUSES.map(clause => ({
      clause,
      record: byClause.get(clause.code) || null,
    }));

    const evidenceRequiredRows = rows.filter(r => r.clause.evidenceRequired);
    const summary = reg.summariseCoverage(
      evidenceRequiredRows.map(r => r.record || { status: 'not_started' })
    );

    const gaps = evidenceRequiredRows
      .filter(r => !r.record || ['not_started', 'lapsed', 'in_progress'].includes(r.record.status))
      .map(r => ({
        clauseCode: r.clause.code,
        clauseName: r.clause.nameEn,
        status: r.record?.status || 'not_started',
        owner: r.record?.ownerUserId || null,
      }));

    return {
      standard: reg.STANDARD,
      rows,
      summary: {
        coveragePercent: Math.round(summary.coverage * 100),
        byStatus: summary.byStatus,
        evidencedClauses: summary.evidencedClauses,
        totalClauses: evidenceRequiredRows.length,
      },
      gaps,
    };
  }

  async getDashboard({ branchId } = {}) {
    const dashboards = [];
    for (const std of standards.listStandards()) {
      const m = await this.getTraceabilityMatrix(std.code, branchId);
      dashboards.push({
        standard: std,
        coveragePercent: m.summary.coveragePercent,
        evidencedClauses: m.summary.evidencedClauses,
        totalClauses: m.summary.totalClauses,
        openGaps: m.gaps.length,
      });
    }
    return dashboards;
  }
}

function createStandardsTraceabilityService(deps) {
  return new StandardsTraceabilityService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/StandardsTraceability.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new StandardsTraceabilityService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  StandardsTraceabilityService,
  createStandardsTraceabilityService,
  getDefault,
  _replaceDefault,
};
