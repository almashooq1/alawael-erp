'use strict';

/**
 * hr-change-requests.routes.js — Phase 11 Commit 12 (4.0.29).
 *
 *   GET    /api/v1/hr/change-requests          — list (filterable)
 *   GET    /api/v1/hr/change-requests/:id      — detail
 *   POST   /api/v1/hr/change-requests/:id/approve
 *   POST   /api/v1/hr/change-requests/:id/reject        { reason }
 *   POST   /api/v1/hr/change-requests/:id/cancel
 *
 * Authorization model:
 *
 *   list / detail   — OFFICER tier and up; requestor can also see
 *                     their own request.
 *   approve/reject  — MANAGER tier only, and NOT the requestor
 *                     (self-approval is also blocked inside the
 *                     service layer — route-level check short-
 *                     circuits to save a DB round-trip).
 *   cancel          — requestor only, while pending.
 *
 * The service is the authority on state transitions + validation;
 * this route is a thin translator between HTTP + service results.
 */

const express = require('express');
const mongoose = require('mongoose');

const { writeTierForRole } = require('../../config/hr-admin-editable-fields');

function createHrChangeRequestsRouter({
  changeRequestService,
  changeRequestModel,
  logger = console,
} = {}) {
  if (changeRequestService == null) {
    throw new Error('createHrChangeRequestsRouter: changeRequestService is required');
  }
  if (changeRequestModel == null) {
    throw new Error('createHrChangeRequestsRouter: changeRequestModel is required');
  }

  const router = express.Router();

  function resolveCaller(req) {
    if (!req.user) return null;
    return {
      userId: req.user.id || req.user._id,
      role: req.user.role || null,
      branchId: req.user.branchId || req.user.branch_id || null,
      ipAddress: req.ip,
    };
  }

  function hasTier(role, tier) {
    const caller = writeTierForRole(role);
    if (tier === 'manager') return caller === 'manager';
    if (tier === 'officer') return caller === 'manager' || caller === 'officer';
    return false;
  }

  // ───── GET /change-requests ─────────────────────────────────

  router.get('/change-requests', async (req, res) => {
    try {
      const caller = resolveCaller(req);
      if (!caller) return res.status(401).json({ error: 'auth required' });

      const { branchId, employeeId, status, limit, skip } = req.query;

      if (branchId != null && !mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ error: 'invalid branchId' });
      }
      if (employeeId != null && !mongoose.Types.ObjectId.isValid(String(employeeId))) {
        return res.status(400).json({ error: 'invalid employeeId' });
      }

      // Non-HR roles may still see their OWN requests, but not the queue.
      if (!hasTier(caller.role, 'officer')) {
        const items = await changeRequestModel
          .find({
            requestor_user_id: caller.userId,
            deleted_at: null,
            ...(status ? { status } : {}),
          })
          .sort({ createdAt: -1 })
          .limit(Math.min(Number.parseInt(limit || '25', 10), 100))
          .skip(Number.parseInt(skip || '0', 10))
          .lean();
        return res.json({ scope: 'own', items, total: items.length });
      }

      // OFFICER/MANAGER: default to branch scope unless HQ, or explicit filter.
      const effectiveBranch = branchId
        ? new mongoose.Types.ObjectId(String(branchId))
        : writeTierForRole(caller.role) === 'manager'
          ? null
          : caller.branchId; // officer-tier auto-scoped

      // listPending only covers status:'pending'. For other statuses or
      // unfiltered state, go direct to the model with the same filters.
      if (!status || status === 'pending') {
        const result = await changeRequestService.listPending({
          branchId: effectiveBranch,
          employeeId: employeeId ? new mongoose.Types.ObjectId(String(employeeId)) : null,
          limit: Number.parseInt(limit || '25', 10),
          skip: Number.parseInt(skip || '0', 10),
        });
        return res.json({ scope: 'queue', ...result });
      }

      const query = { deleted_at: null, status };
      if (effectiveBranch) query.branch_id = effectiveBranch;
      if (employeeId) query.employee_id = new mongoose.Types.ObjectId(String(employeeId));
      const [items, total] = await Promise.all([
        changeRequestModel
          .find(query)
          .sort({ createdAt: -1 })
          .limit(Math.min(Number.parseInt(limit || '25', 10), 100))
          .skip(Number.parseInt(skip || '0', 10))
          .lean(),
        changeRequestModel.countDocuments(query),
      ]);
      return res.json({ scope: 'queue', items, total });
    } catch (err) {
      logger.error && logger.error('[HrChangeRequests:list]', err.message || err);
      return res.status(500).json({ error: 'list failed' });
    }
  });

  // ───── GET /change-requests/:id ─────────────────────────────

  router.get('/change-requests/:id', async (req, res) => {
    try {
      const caller = resolveCaller(req);
      if (!caller) return res.status(401).json({ error: 'auth required' });

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid request id' });
      }
      const doc = await changeRequestModel.findOne({ _id: req.params.id, deleted_at: null }).lean();
      if (!doc) return res.status(404).json({ error: 'change request not found' });

      // Visibility: OFFICER+ see any in scope; non-tier only their own.
      const isOwn = String(doc.requestor_user_id) === String(caller.userId);
      if (!isOwn && !hasTier(caller.role, 'officer')) {
        return res.status(403).json({ error: 'not visible' });
      }
      // Branch scope for officer-tier viewing someone else's
      if (
        !isOwn &&
        writeTierForRole(caller.role) === 'officer' &&
        caller.branchId &&
        doc.branch_id &&
        String(doc.branch_id) !== String(caller.branchId)
      ) {
        return res.status(403).json({ error: 'out_of_branch_scope' });
      }
      return res.json({ request: doc });
    } catch (err) {
      logger.error && logger.error('[HrChangeRequests:detail]', err.message || err);
      return res.status(500).json({ error: 'detail failed' });
    }
  });

  // ───── POST /change-requests/:id/approve ─────────────────────

  router.post('/change-requests/:id/approve', async (req, res) => {
    try {
      const caller = resolveCaller(req);
      if (!caller) return res.status(401).json({ error: 'auth required' });
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid request id' });
      }
      if (!hasTier(caller.role, 'manager')) {
        return res.status(403).json({ error: 'requires manager tier' });
      }
      const result = await changeRequestService.approveRequest({
        requestId: req.params.id,
        approverUserId: caller.userId,
        approverRole: caller.role,
        ipAddress: caller.ipAddress,
      });
      return mapServiceResult(res, result);
    } catch (err) {
      logger.error && logger.error('[HrChangeRequests:approve]', err.message || err);
      return res.status(500).json({ error: 'approve failed' });
    }
  });

  // ───── POST /change-requests/:id/reject ─────────────────────

  router.post('/change-requests/:id/reject', async (req, res) => {
    try {
      const caller = resolveCaller(req);
      if (!caller) return res.status(401).json({ error: 'auth required' });
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid request id' });
      }
      if (!hasTier(caller.role, 'manager')) {
        return res.status(403).json({ error: 'requires manager tier' });
      }
      const reason =
        req.body && typeof req.body.reason === 'string' ? req.body.reason.trim() : null;
      const result = await changeRequestService.rejectRequest({
        requestId: req.params.id,
        approverUserId: caller.userId,
        approverRole: caller.role,
        reason,
        ipAddress: caller.ipAddress,
      });
      return mapServiceResult(res, result);
    } catch (err) {
      logger.error && logger.error('[HrChangeRequests:reject]', err.message || err);
      return res.status(500).json({ error: 'reject failed' });
    }
  });

  // ───── POST /change-requests/:id/cancel ─────────────────────

  router.post('/change-requests/:id/cancel', async (req, res) => {
    try {
      const caller = resolveCaller(req);
      if (!caller) return res.status(401).json({ error: 'auth required' });
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid request id' });
      }
      const result = await changeRequestService.cancelRequest({
        requestId: req.params.id,
        actorUserId: caller.userId,
        ipAddress: caller.ipAddress,
      });
      return mapServiceResult(res, result);
    } catch (err) {
      logger.error && logger.error('[HrChangeRequests:cancel]', err.message || err);
      return res.status(500).json({ error: 'cancel failed' });
    }
  });

  return router;
}

function mapServiceResult(res, result) {
  switch (result.result) {
    case 'applied':
    case 'rejected':
    case 'cancelled':
    case 'approved_not_applied':
      return res.json(result);
    case 'not_found':
      return res.status(404).json({ error: result.reason || 'not found' });
    case 'denied':
      return res.status(403).json({ error: result.reason || 'denied' });
    case 'invalid_state':
      return res.status(409).json({
        error: 'invalid_state',
        currentStatus: result.currentStatus,
      });
    default:
      return res.status(500).json({ error: 'unexpected service result' });
  }
}

module.exports = { createHrChangeRequestsRouter };
