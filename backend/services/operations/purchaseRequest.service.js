'use strict';

/**
 * purchaseRequest.service.js — Phase 16 Commit 4 (4.0.69).
 *
 * Owns the PR→PO workflow:
 *
 *   createDraft      — new PR, status=draft
 *   submit           — draft → submitted; snapshot approval chain;
 *                      activate `procurement.pr.approval` SLA
 *   approveStep      — record approval for current level; advance
 *                      to next level or flip to `approved`
 *   reject           — any step rejects; flip to `rejected`; close SLA
 *   returnForClarification — pause SLA, status → returned_for_clarification
 *   resubmit         — resume SLA, status → under_review
 *   cancel           — any open status → cancelled; close SLA
 *   convertToPo      — approved → converted_to_po; create PurchaseOrder;
 *                      close PR-approval SLA as met;
 *                      activate po-issuance SLA; back-link both ways
 *
 * Design notes:
 *
 *   1. **The service is the only legal mutator**. Routes call this;
 *      direct `doc.save()` would bypass the state machine, SLA
 *      hooks, and audit trail.
 *
 *   2. **Dependencies are injected** — model, poModel, slaEngine,
 *      dispatcher, logger. Bootstrap wires real singletons; tests
 *      pass recorders.
 *
 *   3. **Approval chain is snapshotted at submit time** from the
 *      tier, so a later tier-threshold change never retroactively
 *      rewrites a live approval cycle.
 *
 *   4. **Every transition emits `ops.pr.<event>`** on the bus so
 *      the Phase-15 notification router can subscribe without
 *      touching PR internals.
 *
 * Error codes:
 *   NOT_FOUND                 — PR does not exist
 *   ILLEGAL_TRANSITION        — status change not allowed
 *   MISSING_FIELD             — required field absent
 *   CONFLICT                  — e.g. wrong approver, already converted
 */

const registry = require('../../config/purchaseRequest.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}
class ConflictError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'CONFLICT';
  }
}

function createPurchaseRequestService({
  prModel,
  poModel = null,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!prModel) throw new Error('purchaseRequest.service: prModel required');
  registry.validate();

  // ── helpers ─────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[PR] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _ensureLegal(from, to) {
    if (!registry.canTransition(from, to)) {
      throw new IllegalTransitionError(`illegal transition ${from} → ${to}`, {
        from,
        to,
      });
    }
    return registry.eventForTransition(from, to);
  }

  function _pushHistory(pr, { from, to, event, actorId, notes }) {
    pr.statusHistory.push({
      from,
      to,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
  }

  function _snapshot(pr, { from = null, to = null, event = null } = {}) {
    return {
      prId: String(pr._id),
      requestNumber: pr.requestNumber,
      branchId: pr.branchId ? String(pr.branchId) : null,
      department: pr.department,
      estimatedValue: pr.summary?.estimatedValue || 0,
      currency: pr.currency,
      priority: pr.priority,
      status: pr.status,
      from,
      to,
      event,
      prSlaId: pr.prSlaId ? String(pr.prSlaId) : null,
      poSlaId: pr.poSlaId ? String(pr.poSlaId) : null,
    };
  }

  // ── createDraft ─────────────────────────────────────────────────

  async function createDraft(data, { actorId = null } = {}) {
    const required = ['requiredDate', 'items'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new MissingFieldError(['items (non-empty array)']);
    }

    const doc = await prModel.create({
      ...data,
      status: 'draft',
      statusHistory: [],
      approvals: [],
      createdBy: actorId,
    });
    await _emit('ops.pr.created', _snapshot(doc, { from: null, to: 'draft', event: 'created' }));
    return doc;
  }

  // ── submit ──────────────────────────────────────────────────────

  async function submit(prId, { actorId = null, notes = null } = {}) {
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');

    const event = _ensureLegal(pr.status, 'submitted');

    // Pre-save hook has already computed estimatedValue from items.
    // Ensure the chain is snapshotted now so a later tier edit
    // cannot retroactively change this PR's required signatures.
    const tier = registry.tierForValue(pr.summary?.estimatedValue || 0);
    pr.approvalTier = tier.name;
    pr.approvals = tier.chain.map(step => ({
      level: step.level,
      role: step.role,
      label: step.label,
      approverId: null,
      approverNameSnapshot: null,
      status: 'pending',
      decidedAt: null,
      comments: null,
    }));
    pr.currentApprovalLevel = 1;
    pr.submittedAt = now();

    _pushHistory(pr, { from: pr.status, to: 'submitted', event, actorId, notes });
    const prevStatus = pr.status;
    pr.status = 'submitted';
    pr.updatedBy = actorId || pr.updatedBy;

    // Activate PR-approval SLA clock.
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForApproval(),
          subjectType: 'PurchaseRequest',
          subjectId: pr._id,
          subjectRef: pr.requestNumber,
          branchId: pr.branchId || null,
          startedAt: pr.submittedAt,
          metadata: {
            estimatedValue: pr.summary?.estimatedValue || 0,
            tier: tier.name,
          },
        });
        pr.prSlaId = sla._id;
      } catch (err) {
        logger.warn(`[PR] SLA activate failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(`ops.pr.${event}`, _snapshot(pr, { from: prevStatus, to: 'submitted', event }));
    await _emit('ops.pr.transitioned', _snapshot(pr, { from: prevStatus, to: 'submitted', event }));
    return pr;
  }

  // ── approveStep ─────────────────────────────────────────────────

  async function approveStep(
    prId,
    { approverId, approverName = null, role, comments = null } = {}
  ) {
    if (!approverId || !role) {
      throw new MissingFieldError([!approverId && 'approverId', !role && 'role'].filter(Boolean));
    }
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    if (!['submitted', 'under_review'].includes(pr.status)) {
      throw new IllegalTransitionError(`Cannot record approval while status is '${pr.status}'`, {
        from: pr.status,
        to: 'approved',
      });
    }

    const step = pr.approvals.find(a => a.level === pr.currentApprovalLevel);
    if (!step) {
      throw new ConflictError(`No pending approval at level ${pr.currentApprovalLevel}`);
    }
    if (step.role !== role) {
      throw new ConflictError(
        `Approval step at level ${pr.currentApprovalLevel} requires role '${step.role}', got '${role}'`
      );
    }
    if (step.status !== 'pending') {
      throw new ConflictError(`Step already decided as '${step.status}'`);
    }

    step.status = 'approved';
    step.approverId = approverId;
    step.approverNameSnapshot = approverName || null;
    step.decidedAt = now();
    step.comments = comments || null;

    // Any remaining levels?
    const nextStep = pr.approvals.find(a => a.status === 'pending');
    const prevStatus = pr.status;
    let event;
    if (nextStep) {
      pr.currentApprovalLevel = nextStep.level;
      if (pr.status === 'submitted') {
        event = _ensureLegal('submitted', 'under_review');
        _pushHistory(pr, {
          from: 'submitted',
          to: 'under_review',
          event,
          actorId: approverId,
          notes: `L${step.level} approved`,
        });
        pr.status = 'under_review';
      }
    } else {
      // Last signature — PR fully approved.
      event = _ensureLegal(pr.status, 'approved');
      _pushHistory(pr, {
        from: pr.status,
        to: 'approved',
        event,
        actorId: approverId,
        notes: `L${step.level} approved (final)`,
      });
      pr.status = 'approved';

      // Close PR-approval SLA as met.
      if (slaEngine && pr.prSlaId) {
        try {
          await slaEngine.observe({
            slaId: pr.prSlaId,
            eventType: 'resolved',
            when: now(),
          });
        } catch (err) {
          logger.warn(`[PR] SLA resolve failed: ${err.message}`);
        }
      }
    }

    pr.updatedBy = approverId;
    await pr.save();
    await _emit(`ops.pr.${event}`, _snapshot(pr, { from: prevStatus, to: pr.status, event }));
    await _emit('ops.pr.transitioned', _snapshot(pr, { from: prevStatus, to: pr.status, event }));
    return pr;
  }

  // ── reject ──────────────────────────────────────────────────────

  async function reject(prId, { approverId, reason, role = null } = {}) {
    if (!approverId || !reason) {
      throw new MissingFieldError(
        [!approverId && 'approverId', !reason && 'reason'].filter(Boolean)
      );
    }
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    const event = _ensureLegal(pr.status, 'rejected');

    const step =
      pr.approvals.find(a => a.status === 'pending' && (!role || a.role === role)) ||
      pr.approvals[pr.approvals.length - 1];
    if (step) {
      step.status = 'rejected';
      step.approverId = approverId;
      step.decidedAt = now();
      step.comments = reason;
    }

    const prevStatus = pr.status;
    _pushHistory(pr, {
      from: prevStatus,
      to: 'rejected',
      event,
      actorId: approverId,
      notes: reason,
    });
    pr.status = 'rejected';
    pr.updatedBy = approverId;

    if (slaEngine && pr.prSlaId) {
      try {
        await slaEngine.observe({
          slaId: pr.prSlaId,
          eventType: 'cancelled',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[PR] SLA cancel failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(`ops.pr.${event}`, _snapshot(pr, { from: prevStatus, to: 'rejected', event }));
    await _emit('ops.pr.transitioned', _snapshot(pr, { from: prevStatus, to: 'rejected', event }));
    return pr;
  }

  // ── returnForClarification ──────────────────────────────────────

  async function returnForClarification(prId, { actorId, notes } = {}) {
    if (!notes) throw new MissingFieldError(['notes (clarification request)']);
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    const event = _ensureLegal(pr.status, 'returned_for_clarification');

    const prevStatus = pr.status;
    _pushHistory(pr, {
      from: prevStatus,
      to: 'returned_for_clarification',
      event,
      actorId,
      notes,
    });
    pr.status = 'returned_for_clarification';

    if (slaEngine && pr.prSlaId) {
      try {
        await slaEngine.observe({
          slaId: pr.prSlaId,
          eventType: 'state_changed',
          state: 'returned_for_clarification',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[PR] SLA pause failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(
      `ops.pr.${event}`,
      _snapshot(pr, { from: prevStatus, to: 'returned_for_clarification', event })
    );
    await _emit(
      'ops.pr.transitioned',
      _snapshot(pr, { from: prevStatus, to: 'returned_for_clarification', event })
    );
    return pr;
  }

  // ── resubmit ────────────────────────────────────────────────────

  async function resubmit(prId, { actorId = null, notes = null } = {}) {
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    const event = _ensureLegal(pr.status, 'under_review');

    const prevStatus = pr.status;
    _pushHistory(pr, { from: prevStatus, to: 'under_review', event, actorId, notes });
    pr.status = 'under_review';

    if (slaEngine && pr.prSlaId) {
      try {
        await slaEngine.observe({
          slaId: pr.prSlaId,
          eventType: 'state_changed',
          state: 'under_review',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[PR] SLA resume failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(`ops.pr.${event}`, _snapshot(pr, { from: prevStatus, to: 'under_review', event }));
    await _emit(
      'ops.pr.transitioned',
      _snapshot(pr, { from: prevStatus, to: 'under_review', event })
    );
    return pr;
  }

  // ── cancel ──────────────────────────────────────────────────────

  async function cancel(prId, { actorId = null, reason = null } = {}) {
    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    const event = _ensureLegal(pr.status, 'cancelled');

    const prevStatus = pr.status;
    _pushHistory(pr, {
      from: prevStatus,
      to: 'cancelled',
      event,
      actorId,
      notes: reason,
    });
    pr.status = 'cancelled';

    if (slaEngine && pr.prSlaId) {
      try {
        await slaEngine.observe({
          slaId: pr.prSlaId,
          eventType: 'cancelled',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[PR] SLA cancel failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(`ops.pr.${event}`, _snapshot(pr, { from: prevStatus, to: 'cancelled', event }));
    await _emit('ops.pr.transitioned', _snapshot(pr, { from: prevStatus, to: 'cancelled', event }));
    return pr;
  }

  // ── convertToPo ─────────────────────────────────────────────────

  async function convertToPo(
    prId,
    { actorId, supplierId = null, supplierName = null, poOverrides = {} } = {}
  ) {
    if (!actorId) throw new MissingFieldError(['actorId']);
    if (!poModel) {
      throw new ConflictError('poModel not configured on purchaseRequest.service');
    }

    const pr = await prModel.findById(prId);
    if (!pr) throw new NotFoundError('PR not found');
    const event = _ensureLegal(pr.status, 'converted_to_po');

    if (pr.relatedPurchaseOrderId) {
      throw new ConflictError(`PR already converted to PO ${pr.relatedPurchaseOrderNumber}`);
    }

    // Build PO from PR items.
    const poItems = (pr.items || []).map(it => ({
      item_id: it.itemId,
      item_name_ar: it.itemName,
      item_code: it.itemCode,
      quantity_ordered: it.quantity,
      quantity_received: 0,
      unit_cost: it.estimatedUnitPrice || 0,
      total_cost: (it.quantity || 0) * (it.estimatedUnitPrice || 0),
      unit_of_measure: it.unit,
      notes: it.notes,
    }));

    const po = await poModel.create({
      supplier_id: supplierId || null,
      supplier_name: supplierName || null,
      status: 'draft',
      items: poItems,
      currency: pr.currency || 'SAR',
      branch_id: pr.branchId || null,
      created_by: actorId,
      expected_delivery_date: pr.requiredDate,
      notes: `Converted from ${pr.requestNumber}. Justification: ${pr.justification || 'n/a'}`,
      ...poOverrides,
    });

    pr.relatedPurchaseOrderId = po._id;
    pr.relatedPurchaseOrderNumber = po.po_number || null;
    pr.convertedAt = now();
    pr.convertedBy = actorId;

    const prevStatus = pr.status;
    _pushHistory(pr, {
      from: prevStatus,
      to: 'converted_to_po',
      event,
      actorId,
      notes: `PO ${po.po_number || po._id}`,
    });
    pr.status = 'converted_to_po';

    // Activate PO-issuance SLA (clock runs from approval→PO issuance).
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForPoIssuance(),
          subjectType: 'PurchaseOrder',
          subjectId: po._id,
          subjectRef: po.po_number || String(po._id),
          branchId: pr.branchId || null,
          startedAt: now(),
          metadata: { fromPR: pr.requestNumber },
        });
        pr.poSlaId = sla._id;
      } catch (err) {
        logger.warn(`[PR] PO-issuance SLA activate failed: ${err.message}`);
      }
    }

    await pr.save();
    await _emit(
      `ops.pr.${event}`,
      _snapshot(pr, { from: prevStatus, to: 'converted_to_po', event })
    );
    await _emit(
      'ops.pr.transitioned',
      _snapshot(pr, { from: prevStatus, to: 'converted_to_po', event })
    );
    await _emit('ops.po.created', {
      poId: String(po._id),
      poNumber: po.po_number || null,
      fromPrId: String(pr._id),
      fromPrNumber: pr.requestNumber,
      branchId: pr.branchId ? String(pr.branchId) : null,
      supplierId: po.supplier_id ? String(po.supplier_id) : null,
    });
    return { purchaseRequest: pr, purchaseOrder: po };
  }

  // ── reads ───────────────────────────────────────────────────────

  async function findById(id) {
    const doc = await prModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function list({
    branchId = null,
    status = null,
    department = null,
    priority = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    return prModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
  }

  return {
    createDraft,
    submit,
    approveStep,
    reject,
    returnForClarification,
    resubmit,
    cancel,
    convertToPo,
    findById,
    list,
  };
}

module.exports = {
  createPurchaseRequestService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
