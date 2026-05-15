'use strict';

/**
 * fmea.service.js — World-Class QMS Phase 29 Commit 1.
 *
 * Owns the lifecycle of FMEA / HFMEA worksheets. Pulls in scoring
 * rules from `config/fmea.registry.js` so the math is testable
 * without a database round-trip.
 *
 * Events emitted:
 *   quality.fmea.created
 *   quality.fmea.row_added
 *   quality.fmea.row_updated
 *   quality.fmea.action_added
 *   quality.fmea.action_status_updated
 *   quality.fmea.submitted
 *   quality.fmea.team_signed
 *   quality.fmea.row_rerated
 *   quality.fmea.verified
 *   quality.fmea.archived
 *   quality.fmea.cancelled
 *   quality.fmea.high_priority_detected — auto-fired on any row that lands in 'high'
 */

const {
  FMEA_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  aiagActionPriority,
  hfmeaHazardScore,
  hfmeaIsActionable,
  hfmeaProceedToAction,
  validateRating,
  validateTeamComposition,
  AIAG_ACTION_PRIORITY,
} = require('../../config/fmea.registry');

class FmeaService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('FmeaService: model is required');
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
      this.logger.warn(`[FmeaService] dispatch ${eventName} failed: ${err.message}`);
    }
  }

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal FMEA transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async _load(worksheetId) {
    const doc = await this.model.findOne({ _id: worksheetId, deleted_at: null });
    if (!doc) {
      const err = new Error('FMEA worksheet not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  // ── lifecycle ────────────────────────────────────────────────────

  async createWorksheet(data, userId) {
    if (!data || !data.title) throw new Error('title is required');
    if (!data.type) throw new Error('type is required');
    if (!data.scale) throw new Error('scale is required');
    if (!data.scope) throw new Error('scope is required');
    if (!userId) throw new Error('userId is required');

    const doc = await this.model.create({
      type: data.type,
      scale: data.scale,
      title: data.title,
      description: data.description || null,
      scope: data.scope,
      processFlow: data.processFlow || null,
      boundaries: data.boundaries || null,
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      facilitatorUserId: data.facilitatorUserId || userId,
      team: Array.isArray(data.team) ? data.team : [],
      relatedIncidentIds: data.relatedIncidentIds || [],
      relatedRiskIds: data.relatedRiskIds || [],
      status: 'draft',
      rows: [],
      createdBy: userId,
    });

    await this._emit('quality.fmea.created', {
      worksheetId: String(doc._id),
      fmeaNumber: doc.fmeaNumber,
      type: doc.type,
      scale: doc.scale,
      branchId: doc.branchId ? String(doc.branchId) : null,
      createdBy: String(userId),
    });
    return doc;
  }

  // ── row authoring ────────────────────────────────────────────────

  _computeRowDerived(scale, row) {
    if (scale === 'aiag_10') {
      if (row.severity && row.occurrence && row.detection) {
        row.rpn = row.severity * row.occurrence * row.detection;
        row.actionPriority = aiagActionPriority({
          severity: row.severity,
          occurrence: row.occurrence,
          detection: row.detection,
        });
      }
    } else if (scale === 'hfmea_5') {
      if (row.severity && row.probability) {
        row.hazardScore = hfmeaHazardScore({
          severity: row.severity,
          probability: row.probability,
        });
        // If hazard score ≥8, automatically actionable.
        if (hfmeaIsActionable(row.hazardScore)) {
          row.actionPriority = 'high';
        } else if (row.hazardScore >= 4) {
          // Borderline — depends on decision tree (if filled).
          const dt = row.decisionTree || {};
          if (
            dt.singlePointWeakness !== null &&
            dt.singlePointWeakness !== undefined &&
            dt.existingControl !== null &&
            dt.existingControl !== undefined &&
            dt.detectability !== null &&
            dt.detectability !== undefined
          ) {
            const proceed = hfmeaProceedToAction({
              singlePointWeakness: !!dt.singlePointWeakness,
              existingControl: !!dt.existingControl,
              detectability: !!dt.detectability,
            });
            row.decisionTree.proceedToAction = proceed;
            row.actionPriority = proceed ? 'medium' : 'low';
          } else {
            row.actionPriority = 'medium'; // pending decision-tree answers
          }
        } else {
          row.actionPriority = 'low';
        }
      }
    }
    return row;
  }

  async addRow(worksheetId, rowInput, userId) {
    const ws = await this._load(worksheetId);
    if (TERMINAL_STATUSES.includes(ws.status) || ws.status === 'verified') {
      throw Object.assign(new Error('Cannot add rows to a closed worksheet'), {
        code: 'INVALID_PHASE',
      });
    }
    const validation = validateRating({
      scale: ws.scale,
      severity: rowInput.severity,
      occurrence: rowInput.occurrence,
      detection: rowInput.detection,
      probability: rowInput.probability,
    });
    if (!validation.ok) {
      const err = new Error(`Invalid ratings: ${validation.errors.join(', ')}`);
      err.code = 'VALIDATION';
      err.fields = validation.errors;
      throw err;
    }

    const nextRowNumber = (ws.rows || []).reduce((m, r) => Math.max(m, r.rowNumber || 0), 0) + 1;
    const row = this._computeRowDerived(ws.scale, {
      rowNumber: nextRowNumber,
      functionAr: rowInput.functionAr,
      functionEn: rowInput.functionEn || null,
      failureMode: rowInput.failureMode,
      failureEffect: rowInput.failureEffect,
      failureCauses: Array.isArray(rowInput.failureCauses) ? rowInput.failureCauses : [],
      preventionControls: Array.isArray(rowInput.preventionControls)
        ? rowInput.preventionControls
        : [],
      detectionControls: Array.isArray(rowInput.detectionControls)
        ? rowInput.detectionControls
        : [],
      severity: rowInput.severity,
      occurrence: rowInput.occurrence || null,
      detection: rowInput.detection || null,
      probability: rowInput.probability || null,
      decisionTree: rowInput.decisionTree || {},
      notes: rowInput.notes || null,
    });

    ws.rows.push(row);
    ws.updatedBy = userId;
    await ws.save();

    const created = ws.rows[ws.rows.length - 1];
    await this._emit('quality.fmea.row_added', {
      worksheetId: String(ws._id),
      rowId: String(created._id),
      rowNumber: created.rowNumber,
      actionPriority: created.actionPriority,
      rpn: created.rpn,
      hazardScore: created.hazardScore,
      by: String(userId),
    });

    if (created.actionPriority === 'high') {
      await this._emit('quality.fmea.high_priority_detected', {
        worksheetId: String(ws._id),
        rowId: String(created._id),
        functionAr: created.functionAr,
        failureMode: created.failureMode,
        rpn: created.rpn,
        hazardScore: created.hazardScore,
      });
    }

    return ws;
  }

  async updateRow(worksheetId, rowId, patch, userId) {
    const ws = await this._load(worksheetId);
    if (TERMINAL_STATUSES.includes(ws.status) || ws.status === 'verified') {
      throw Object.assign(new Error('Cannot edit rows on a closed worksheet'), {
        code: 'INVALID_PHASE',
      });
    }
    const row = ws.rows.id(rowId);
    if (!row) {
      throw Object.assign(new Error('Row not found'), { code: 'NOT_FOUND' });
    }

    const editable = [
      'functionAr',
      'functionEn',
      'failureMode',
      'failureEffect',
      'failureCauses',
      'preventionControls',
      'detectionControls',
      'severity',
      'occurrence',
      'detection',
      'probability',
      'decisionTree',
      'notes',
    ];
    for (const key of editable) {
      if (patch[key] !== undefined) row[key] = patch[key];
    }

    this._computeRowDerived(ws.scale, row);
    ws.updatedBy = userId;
    await ws.save();

    await this._emit('quality.fmea.row_updated', {
      worksheetId: String(ws._id),
      rowId: String(rowId),
      actionPriority: row.actionPriority,
      rpn: row.rpn,
      hazardScore: row.hazardScore,
      by: String(userId),
    });
    return ws;
  }

  async deleteRow(worksheetId, rowId, userId) {
    const ws = await this._load(worksheetId);
    if (TERMINAL_STATUSES.includes(ws.status) || ws.status === 'verified') {
      throw Object.assign(new Error('Cannot delete rows on a closed worksheet'), {
        code: 'INVALID_PHASE',
      });
    }
    const row = ws.rows.id(rowId);
    if (!row) {
      throw Object.assign(new Error('Row not found'), { code: 'NOT_FOUND' });
    }
    row.deleteOne();
    ws.updatedBy = userId;
    await ws.save();
    await this._emit('quality.fmea.row_updated', {
      worksheetId: String(ws._id),
      rowId: String(rowId),
      deleted: true,
      by: String(userId),
    });
    return ws;
  }

  // ── actions on rows ──────────────────────────────────────────────

  async addAction(worksheetId, rowId, actionInput, userId) {
    const ws = await this._load(worksheetId);
    if (TERMINAL_STATUSES.includes(ws.status)) {
      throw Object.assign(new Error('Cannot add actions on a terminal worksheet'), {
        code: 'INVALID_PHASE',
      });
    }
    const row = ws.rows.id(rowId);
    if (!row) {
      throw Object.assign(new Error('Row not found'), { code: 'NOT_FOUND' });
    }
    if (!actionInput || !actionInput.type || !actionInput.description || !actionInput.ownerUserId) {
      throw new Error('action.type, description and ownerUserId are required');
    }

    const priority = actionInput.priority || row.actionPriority || 'medium';
    const slaDays = (AIAG_ACTION_PRIORITY[priority] || AIAG_ACTION_PRIORITY.medium).slaDays;
    const dueDate = actionInput.dueDate
      ? new Date(actionInput.dueDate)
      : new Date(this.now().getTime() + slaDays * 86400000);

    row.actions.push({
      type: actionInput.type,
      description: actionInput.description,
      ownerUserId: actionInput.ownerUserId,
      priority,
      dueDate,
      status: 'open',
      linkedCapaId: actionInput.linkedCapaId || null,
    });
    ws.updatedBy = userId;

    // If we add an action while in 'team_signed', move to 'actions_open'.
    if (ws.status === 'team_signed') ws.status = 'actions_open';

    await ws.save();
    const created = row.actions[row.actions.length - 1];

    await this._emit('quality.fmea.action_added', {
      worksheetId: String(ws._id),
      rowId: String(row._id),
      actionId: String(created._id),
      type: created.type,
      priority: created.priority,
      ownerUserId: String(created.ownerUserId),
      dueDate: created.dueDate,
      by: String(userId),
    });
    return ws;
  }

  async updateActionStatus(worksheetId, rowId, actionId, { status, completionNotes } = {}, userId) {
    const VALID = ['open', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!VALID.includes(status)) {
      throw Object.assign(new Error(`Invalid status: ${status}`), { code: 'VALIDATION' });
    }
    const ws = await this._load(worksheetId);
    const row = ws.rows.id(rowId);
    if (!row) throw Object.assign(new Error('Row not found'), { code: 'NOT_FOUND' });
    const action = row.actions.id(actionId);
    if (!action) throw Object.assign(new Error('Action not found'), { code: 'NOT_FOUND' });

    action.status = status;
    if (completionNotes) action.completionNotes = completionNotes;
    if (status === 'completed') action.completedAt = this.now();

    // If all actions on the worksheet are completed, advance status.
    if (ws.status === 'actions_open') {
      let allComplete = true;
      for (const r of ws.rows) {
        for (const a of r.actions) {
          if (!['completed', 'cancelled'].includes(a.status)) {
            allComplete = false;
            break;
          }
        }
        if (!allComplete) break;
      }
      if (allComplete) ws.status = 'actions_completed';
    }

    ws.updatedBy = userId;
    await ws.save();

    await this._emit('quality.fmea.action_status_updated', {
      worksheetId: String(ws._id),
      rowId: String(rowId),
      actionId: String(actionId),
      status,
      by: String(userId),
    });
    return ws;
  }

  // ── re-rating (Step 8) ───────────────────────────────────────────

  async rerateRow(worksheetId, rowId, ratings, userId) {
    const ws = await this._load(worksheetId);
    if (!['actions_completed', 'actions_open', 'team_signed'].includes(ws.status)) {
      throw Object.assign(new Error('Re-rating only allowed after actions completed'), {
        code: 'INVALID_PHASE',
      });
    }
    const row = ws.rows.id(rowId);
    if (!row) throw Object.assign(new Error('Row not found'), { code: 'NOT_FOUND' });

    const v = validateRating({
      scale: ws.scale,
      severity: ratings.severity,
      occurrence: ratings.occurrence,
      detection: ratings.detection,
      probability: ratings.probability,
    });
    if (!v.ok) {
      throw Object.assign(new Error(`Invalid ratings: ${v.errors.join(', ')}`), {
        code: 'VALIDATION',
      });
    }

    row.revisedSeverity = ratings.severity;
    row.revisedOccurrence = ratings.occurrence || null;
    row.revisedDetection = ratings.detection || null;
    row.revisedProbability = ratings.probability || null;
    if (ws.scale === 'aiag_10') {
      row.revisedRpn = ratings.severity * ratings.occurrence * ratings.detection;
    } else if (ws.scale === 'hfmea_5') {
      row.revisedHazardScore = ratings.severity * ratings.probability;
    }
    row.revisedAt = this.now();
    row.revisedBy = userId;

    ws.updatedBy = userId;
    await ws.save();

    await this._emit('quality.fmea.row_rerated', {
      worksheetId: String(ws._id),
      rowId: String(rowId),
      revisedRpn: row.revisedRpn,
      revisedHazardScore: row.revisedHazardScore,
      by: String(userId),
    });
    return ws;
  }

  // ── state transitions ────────────────────────────────────────────

  async submit(worksheetId, userId) {
    const ws = await this._load(worksheetId);
    this._assertTransition(ws.status, 'in_review');
    if (!ws.rows || ws.rows.length === 0) {
      throw Object.assign(new Error('Cannot submit empty worksheet'), { code: 'VALIDATION' });
    }
    ws.status = 'in_review';
    ws.submittedAt = this.now();
    ws.updatedBy = userId;
    await ws.save();
    await this._emit('quality.fmea.submitted', {
      worksheetId: String(ws._id),
      by: String(userId),
    });
    return ws;
  }

  async teamSign(worksheetId, { signatureHash, role } = {}, userId) {
    const ws = await this._load(worksheetId);
    if (ws.status !== 'in_review' && ws.status !== 'team_signed') {
      throw Object.assign(new Error('Worksheet not in review phase'), { code: 'INVALID_PHASE' });
    }

    const member = (ws.team || []).find(t => String(t.userId) === String(userId));
    if (!member) {
      throw Object.assign(new Error('Signer is not part of the team'), { code: 'FORBIDDEN' });
    }
    member.signedAt = this.now();
    member.signatureHash = signatureHash || null;

    // Check whether ALL required roles have signed.
    const composition = validateTeamComposition(ws.team);
    if (composition.ok) {
      const signed = ws.team.filter(t => t.signedAt).map(t => t.role);
      const distinctRoles = new Set(signed);
      // If at least one signer per required role exists, advance.
      const requiredOk = require('../../config/fmea.registry').HFMEA_REQUIRED_ROLES.every(r =>
        distinctRoles.has(r)
      );
      if (ws.type === 'hfmea' ? requiredOk : signed.length >= ws.team.length) {
        ws.status = 'team_signed';
        ws.signedAt = this.now();
      }
    }
    ws.updatedBy = userId;
    await ws.save();

    await this._emit('quality.fmea.team_signed', {
      worksheetId: String(ws._id),
      signerUserId: String(userId),
      role: role || member.role,
      status: ws.status,
    });
    return ws;
  }

  async verify(worksheetId, userId) {
    const ws = await this._load(worksheetId);
    if (ws.status !== 'actions_completed') {
      throw Object.assign(new Error('All actions must be completed before verification'), {
        code: 'INVALID_PHASE',
      });
    }
    // Every actionable row must have a revised rating.
    const missing = (ws.rows || [])
      .filter(r => r.actionPriority === 'high' || r.actionPriority === 'medium')
      .filter(r => {
        if (ws.scale === 'aiag_10') return !r.revisedRpn;
        return !r.revisedHazardScore;
      });
    if (missing.length > 0) {
      const err = new Error(`Missing re-ratings on ${missing.length} actionable row(s)`);
      err.code = 'INCOMPLETE';
      err.rows = missing.map(r => r.rowNumber);
      throw err;
    }

    ws.status = 'verified';
    ws.verifiedAt = this.now();
    ws.updatedBy = userId;
    await ws.save();

    await this._emit('quality.fmea.verified', {
      worksheetId: String(ws._id),
      verifiedAt: ws.verifiedAt,
      by: String(userId),
    });
    return ws;
  }

  async archive(worksheetId, userId) {
    const ws = await this._load(worksheetId);
    if (ws.status !== 'verified') {
      throw Object.assign(new Error('Only verified worksheets can be archived'), {
        code: 'INVALID_PHASE',
      });
    }
    ws.status = 'archived';
    ws.archivedAt = this.now();
    ws.updatedBy = userId;
    await ws.save();
    await this._emit('quality.fmea.archived', {
      worksheetId: String(ws._id),
      by: String(userId),
    });
    return ws;
  }

  async cancel(worksheetId, reason, userId) {
    const ws = await this._load(worksheetId);
    if (TERMINAL_STATUSES.includes(ws.status)) {
      throw Object.assign(new Error('Worksheet already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    if (!reason || !String(reason).trim()) {
      throw new Error('cancellation reason is required');
    }
    ws.status = 'cancelled';
    ws.cancelledReason = String(reason).trim();
    ws.updatedBy = userId;
    await ws.save();
    await this._emit('quality.fmea.cancelled', {
      worksheetId: String(ws._id),
      reason: ws.cancelledReason,
      by: String(userId),
    });
    return ws;
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(worksheetId) {
    return this.model.findOne({ _id: worksheetId, deleted_at: null });
  }

  async list({ branchId, status, type, scale, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (type) q.type = type;
    if (scale) q.scale = scale;
    return this.model
      .find(q)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;

    const [total, byStatus, byType, highPriority] = await Promise.all([
      this.model.countDocuments(q),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.model.aggregate([{ $match: q }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      this.model.countDocuments({ ...q, 'rows.actionPriority': 'high' }),
    ]);

    const statusMap = Object.fromEntries(FMEA_STATUSES.map(s => [s, 0]));
    for (const r of byStatus) statusMap[r._id] = r.count;

    const typeMap = {};
    for (const r of byType) typeMap[r._id] = r.count;

    return {
      total,
      byStatus: statusMap,
      byType: typeMap,
      highPriorityWorksheets: highPriority,
    };
  }
}

// ── factory + lazy singleton ───────────────────────────────────────

function createFmeaService(deps) {
  return new FmeaService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/FmeaWorksheet.model');
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* bus optional */
    }
    _defaultInstance = new FmeaService({ model, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  FmeaService,
  createFmeaService,
  getDefault,
  _replaceDefault,
  ALLOWED_TRANSITIONS,
  FMEA_STATUSES,
};
