/**
 * Delegations REST routes.
 *
 * L2+ roles grant temporary authority. Routes are thin — a service
 * layer should own conflict/validation for production use.
 */

'use strict';

const express = require('express');

function buildRouter({ DelegationGrantModel, audit }) {
  if (!DelegationGrantModel) throw new Error('delegations.routes: DelegationGrantModel required');
  const router = express.Router();

  // GET /api/delegations — admin list (or scoped to current user if not L2+)
  router.get('/', async (req, res, next) => {
    try {
      const roles = (req.user && req.user.roles) || [];
      const isL2Plus = roles.some(r =>
        ['super_admin', 'head_office_admin', 'compliance_officer', 'dpo'].includes(r)
      );
      const q = isL2Plus ? {} : { $or: [{ fromUserId: req.user.id }, { toUserId: req.user.id }] };
      const docs = await DelegationGrantModel.model.find(q).sort({ effectiveTo: -1 }).limit(200);
      res.json({ count: docs.length, grants: docs });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/delegations/active-for-me — what authority do I have right now?
  router.get('/active-for-me', async (req, res, next) => {
    try {
      const uid = req.user && req.user.id;
      const docs = await DelegationGrantModel.model.findActiveFor(uid);
      res.json({ count: docs.length, grants: docs });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/delegations — grant (requires L2+)
  router.post('/', async (req, res, next) => {
    try {
      const roles = (req.user && req.user.roles) || [];
      const isL2Plus = roles.some(r =>
        ['super_admin', 'head_office_admin', 'compliance_officer', 'dpo'].includes(r)
      );
      if (!isL2Plus) return res.status(403).json({ error: 'l2_or_higher_required' });

      const {
        fromUserId,
        toUserId,
        roles: grantedRoles,
        branchIds,
        effectiveFrom,
        effectiveTo,
        reason,
      } = req.body || {};
      if (!fromUserId || !toUserId || !effectiveTo || !reason || reason.length < 10) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      const doc = await DelegationGrantModel.model.create({
        fromUserId,
        toUserId,
        roles: grantedRoles || [],
        branchIds: branchIds || [],
        effectiveFrom: effectiveFrom || new Date(),
        effectiveTo,
        reason,
        approvedBy: req.user.id,
        status: 'active',
      });
      if (audit) audit(req, { action: 'delegation.granted', resourceId: doc._id });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/delegations/:id/revoke
  router.post('/:id/revoke', async (req, res, next) => {
    try {
      const doc = await DelegationGrantModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (doc.status !== 'active') return res.status(409).json({ error: `already_${doc.status}` });
      doc.status = 'revoked';
      doc.revokedAt = new Date();
      doc.revokedBy = req.user && req.user.id;
      await doc.save();
      if (audit) audit(req, { action: 'delegation.revoked', resourceId: doc._id });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildRouter };
