'use strict';

/**
 * capa.service.js — W344 (CAPA Pass 3).
 *
 * Service layer for CapaItem (W337 model + W340 pre-save hook). Wraps every
 * lifecycle write so callers (routes, schedulers, the audit/RCA/FMEA producers)
 * never touch mongoose directly. Mirrors the W334 Pass 2 aiRecommendation.service
 * pattern exactly — same shape, same error propagation.
 *
 * Public surface:
 *   createCapaItem({ source, type, title, description, ownerUserId, dueDate, branchId, tenantId, priority, ... })
 *     — produces a new CAPA in OPEN status; auto-numbered via pre('validate') hook
 *
 *   transitionCapaItem({ capaId, to, actorUserId, reasonCode, notes, mfaTier })
 *     — sets $locals.transition then saves; pre-save hook delegates to lib.validateTransition
 *
 *   listOverdue({ branchId, now, limit })
 *     — non-terminal items with dueDate < now (default: now=Date.now)
 *
 *   sweepOverdue({ now })
 *     — emits ops events for overdue items (does NOT auto-transition; CAPA escalation
 *       is a human decision, only the alert is automated). Mirrors W286 DA cron shape.
 *
 *   listByStatus({ status, branchId, limit })
 *     — QMS dashboard view (paginated; default limit 50)
 *
 * Errors thrown carry `.code` from the lib (INVALID_TRANSITION / REASON_CODE_REQUIRED /
 * MFA_TIER_INSUFFICIENT) so HTTP routes can map to 400/403/422.
 *
 * Factory pattern with `enforceMfa:true` — W275 service-layer defense matching the
 * W276 drift guard's MFA_AWARE_FACTORIES list. Bootstrap constructs with
 * enforceMfa:true so cron/CLI callers can't bypass MFA tier rules.
 */

const mongoose = require('mongoose');
const lib = require('../../intelligence/capa-lifecycle.lib');

function _CapaModel() {
  try {
    return mongoose.model('CapaItem');
  } catch {
    require('../../models/quality/CapaItem.model');
    return mongoose.model('CapaItem');
  }
}

function createCapaService(opts = {}) {
  const { enforceMfa = false, emitEvent = null, logger = console } = opts;

  async function createCapaItem(input) {
    const {
      source, // { module: 'audit'|'rca'|... , refId, collection }
      type, // 'corrective'|'preventive'|'both'
      title,
      description,
      ownerUserId,
      dueDate,
      branchId = null,
      tenantId = null,
      priority = 'medium',
      rootCause = null,
      actionPlan = null,
      verificationCriteria = null,
      createdBy,
    } = input || {};

    if (!source || !source.module) throw new Error('createCapaItem: source.module required');
    if (!type) throw new Error('createCapaItem: type required');
    if (!title) throw new Error('createCapaItem: title required');
    if (!description) throw new Error('createCapaItem: description required');
    if (!ownerUserId) throw new Error('createCapaItem: ownerUserId required');
    if (!dueDate) throw new Error('createCapaItem: dueDate required');
    if (!createdBy) throw new Error('createCapaItem: createdBy required');

    if (!lib.CAPA_TYPES.includes(type)) {
      throw new Error(
        `createCapaItem: invalid type "${type}" (expected ${lib.CAPA_TYPES.join('|')})`
      );
    }
    if (!lib.SOURCE_MODULES.includes(source.module)) {
      throw new Error(`createCapaItem: invalid source.module "${source.module}"`);
    }

    const Model = _CapaModel();
    const doc = new Model({
      source,
      type,
      title,
      description,
      ownerUserId,
      dueDate,
      branchId,
      tenantId,
      priority,
      rootCause,
      actionPlan,
      verificationCriteria,
      createdBy,
      // status defaults to OPEN via schema
    });
    await doc.save();

    if (emitEvent) {
      try {
        await emitEvent('quality.capa.created', {
          capaId: String(doc._id),
          capaNumber: doc.capaNumber,
          source: doc.source,
          ownerUserId: String(doc.ownerUserId),
        });
      } catch (err) {
        logger.warn?.(`[capa.service] emitEvent created failed: ${err.message}`);
      }
    }
    return doc;
  }

  async function transitionCapaItem(input) {
    const {
      capaId,
      to,
      actorUserId,
      reasonCode = null,
      notes = null,
      mfaTier = null,
    } = input || {};
    if (!capaId) throw new Error('transitionCapaItem: capaId required');
    if (!to) throw new Error('transitionCapaItem: to required');
    if (!actorUserId) throw new Error('transitionCapaItem: actorUserId required');

    const Model = _CapaModel();
    const doc = await Model.findById(capaId);
    if (!doc) {
      const err = new Error('CapaItem not found');
      err.code = 'CAPA_NOT_FOUND';
      throw err;
    }

    // W275 + W843 defense-in-depth: validate transition at service layer before
    // mutating status. The pre-save hook also validates, but relies on priorDoc
    // which may be absent in some persistence paths — this call is authoritative
    // for HTTP/cron callers using createCapaService({ enforceMfa: true }).
    const from = doc.status;
    const preCheck = lib.validateTransition({
      from,
      to,
      actor: actorUserId,
      reasonCode,
      notes,
      mfaTier: mfaTier != null ? mfaTier : enforceMfa ? 0 : Number.MAX_SAFE_INTEGER,
    });
    if (!preCheck.ok) {
      const err = new Error(preCheck.message);
      err.code = preCheck.code;
      throw err;
    }

    doc.$locals.transition = { actor: actorUserId, reasonCode, notes, mfaTier };
    doc.status = to;

    // Track dates implied by the new status.
    if (to === 'IMPLEMENTED' && !doc.implementedAt) doc.implementedAt = new Date();
    if (to === 'VERIFIED' && !doc.verifiedAt) doc.verifiedAt = new Date();
    if (to === 'CLOSED' && !doc.closedAt) {
      doc.closedAt = new Date();
      doc.closedBy = actorUserId;
    }
    doc.updatedBy = actorUserId;

    await doc.save();

    if (emitEvent) {
      try {
        await emitEvent('quality.capa.transitioned', {
          capaId: String(doc._id),
          capaNumber: doc.capaNumber,
          to,
          actorUserId: String(actorUserId),
        });
      } catch (err) {
        logger.warn?.(`[capa.service] emitEvent transitioned failed: ${err.message}`);
      }
    }
    return doc;
  }

  async function listOverdue({ branchId = null, now = new Date(), limit = 50 } = {}) {
    const Model = _CapaModel();
    const q = {
      status: { $in: ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED'] }, // non-terminal, non-VERIFIED
      dueDate: { $lt: now },
      deleted_at: null,
    };
    if (branchId) q.branchId = branchId;
    return Model.find(q).sort({ dueDate: 1 }).limit(limit).lean();
  }

  async function sweepOverdue({ now = new Date() } = {}) {
    const overdue = await listOverdue({ now, limit: 500 });
    let emitted = 0;
    for (const doc of overdue) {
      if (!emitEvent) continue;
      try {
        await emitEvent('quality.capa.overdue', {
          capaId: String(doc._id),
          capaNumber: doc.capaNumber,
          status: doc.status,
          dueDate: doc.dueDate,
          daysOverdue: Math.floor((now - doc.dueDate) / (1000 * 60 * 60 * 24)),
          ownerUserId: doc.ownerUserId ? String(doc.ownerUserId) : null,
          branchId: doc.branchId ? String(doc.branchId) : null,
        });
        emitted += 1;
      } catch (err) {
        logger.warn?.(
          `[capa.service] sweepOverdue emit for ${doc.capaNumber} failed: ${err.message}`
        );
      }
    }
    return { scanned: overdue.length, emitted };
  }

  async function listByStatus({ status, branchId = null, limit = 50 } = {}) {
    if (!status) throw new Error('listByStatus: status required');
    if (!lib.LIFECYCLE_STATES.includes(status)) {
      throw new Error(`listByStatus: invalid status "${status}"`);
    }
    const Model = _CapaModel();
    const q = { status, deleted_at: null };
    if (branchId) q.branchId = branchId;
    return Model.find(q).sort({ dueDate: 1 }).limit(limit).lean();
  }

  return {
    createCapaItem,
    transitionCapaItem,
    listOverdue,
    sweepOverdue,
    listByStatus,
    // expose for tests
    _opts: { enforceMfa, hasEmit: typeof emitEvent === 'function' },
  };
}

module.exports = { createCapaService };
