/**
 * ApprovalChainEngine — walks a resource through its approval chain.
 *
 * Not persistent on its own; it operates on an `ApprovalRequest` object
 * passed in, mutating it in-place and returning it. The caller owns
 * persistence (Mongoose / in-memory / etc.).
 *
 * Responsibilities:
 *   - Validate chain id and current step bounds.
 *   - Ensure the approver has the required role for the current step.
 *   - Enforce segregation: initiator cannot be an approver on any step.
 *   - Record decisions with timestamp + actor + note.
 *   - Move to next step on approve; back to requester on reject.
 *   - Detect SLA breach from `dueHours`.
 *   - Detect completion when last step is approved.
 */

'use strict';

const { CHAINS } = require('./chains');

const STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'escalated', 'cancelled'];

class ApprovalChainEngine {
  constructor({ chains = CHAINS, now = () => new Date() } = {}) {
    this.chains = chains;
    this.now = now;
  }

  /**
   * Start an approval request.
   *
   * @param {Object} params
   * @param {string} params.chainId
   * @param {string} params.resourceType
   * @param {*} params.resourceId
   * @param {*} params.initiatorId
   * @param {string} [params.branchId]
   * @returns {object} approvalRequest
   */
  start({ chainId, resourceType, resourceId, initiatorId, branchId, metadata }) {
    const chain = this.chains[chainId];
    if (!chain) throw new Error(`ApprovalChain: unknown chain ${chainId}`);
    if (resourceType && chain.resourceType && resourceType !== chain.resourceType) {
      throw new Error(
        `ApprovalChain ${chainId} expects resourceType=${chain.resourceType}, got ${resourceType}`
      );
    }
    const now = this.now();
    return {
      chainId,
      resourceType: resourceType || chain.resourceType,
      resourceId,
      initiatorId,
      branchId,
      status: 'pending_approval',
      currentStep: 0,
      steps: chain.steps.map(s => ({ ...s })),
      decisions: [],
      openedAt: now,
      slaDeadline: this._deadlineFor(chain.steps[0], now),
      metadata: metadata || {},
    };
  }

  /**
   * Record an approval.
   *
   * @param {object} req approvalRequest (mutated)
   * @param {Object} actor { userId, roles[] }
   * @param {string} note
   * @returns {object} updated approvalRequest
   */
  approve(req, actor, note) {
    this._assertActive(req);
    if (String(actor.userId) === String(req.initiatorId)) {
      throw new Error('approval_sod_initiator_cannot_approve');
    }
    const step = req.steps[req.currentStep];
    if (!step) throw new Error('approval_no_current_step');
    if (!(actor.roles || []).includes(step.role)) {
      const err = new Error('approval_wrong_role');
      err.required = step.role;
      throw err;
    }
    // Prevent the same user approving two steps.
    if (req.decisions.some(d => String(d.actorId) === String(actor.userId))) {
      throw new Error('approval_sod_user_already_approved');
    }

    const now = this.now();
    req.decisions.push({
      step: req.currentStep,
      role: step.role,
      actorId: actor.userId,
      decision: 'approve',
      note: note || null,
      at: now,
    });
    req.currentStep += 1;

    if (req.currentStep >= req.steps.length) {
      req.status = 'approved';
      req.finalizedAt = now;
      req.slaDeadline = null;
    } else {
      req.slaDeadline = this._deadlineFor(req.steps[req.currentStep], now);
    }
    return req;
  }

  reject(req, actor, note) {
    this._assertActive(req);
    const step = req.steps[req.currentStep];
    if (!step) throw new Error('approval_no_current_step');
    if (!(actor.roles || []).includes(step.role)) {
      const err = new Error('approval_wrong_role');
      err.required = step.role;
      throw err;
    }
    const now = this.now();
    req.decisions.push({
      step: req.currentStep,
      role: step.role,
      actorId: actor.userId,
      decision: 'reject',
      note: note || null,
      at: now,
    });
    req.status = 'rejected';
    req.finalizedAt = now;
    req.slaDeadline = null;
    return req;
  }

  cancel(req, actor, note) {
    this._assertActive(req);
    if (String(actor.userId) !== String(req.initiatorId)) {
      throw new Error('approval_cancel_requires_initiator');
    }
    const now = this.now();
    req.status = 'cancelled';
    req.finalizedAt = now;
    req.decisions.push({
      step: req.currentStep,
      decision: 'cancel',
      actorId: actor.userId,
      note: note || null,
      at: now,
    });
    return req;
  }

  /**
   * Is the current step overdue?
   */
  isBreached(req, now = this.now()) {
    if (!req || req.status !== 'pending_approval') return false;
    if (!req.slaDeadline) return false;
    const deadline =
      req.slaDeadline instanceof Date
        ? req.slaDeadline.getTime()
        : new Date(req.slaDeadline).getTime();
    return now.getTime() > deadline;
  }

  /** Mark escalated (caller decides how to act on escalation). */
  escalate(req, actor, note) {
    if (req.status !== 'pending_approval') throw new Error('approval_only_pending_can_escalate');
    const now = this.now();
    req.status = 'escalated';
    req.decisions.push({
      step: req.currentStep,
      decision: 'escalate',
      actorId: actor && actor.userId,
      note: note || null,
      at: now,
    });
    return req;
  }

  currentApproverRole(req) {
    if (!req || req.status !== 'pending_approval') return null;
    const step = req.steps[req.currentStep];
    return step ? step.role : null;
  }

  _assertActive(req) {
    if (!req) throw new Error('approval_missing_request');
    if (req.status !== 'pending_approval') {
      throw new Error(`approval_not_active:${req.status}`);
    }
  }

  _deadlineFor(step, now) {
    if (!step || !step.dueHours) return null;
    return new Date(now.getTime() + step.dueHours * 3600 * 1000);
  }
}

module.exports = { ApprovalChainEngine, STATUSES };
