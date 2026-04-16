/**
 * Approvals REST routes.
 *
 * Mount under `/api/approvals` from the main route registry.
 *
 *   app.use('/api/approvals',
 *     authenticateToken,
 *     buildRouter({ ApprovalRequestModel, engine })
 *   );
 */

'use strict';

const express = require('express');
const { engine: defaultEngine, selectChain, CHAINS } = require('./index');

function buildRouter({ ApprovalRequestModel, engine = defaultEngine, audit }) {
  if (!ApprovalRequestModel) throw new Error('approvals.routes: ApprovalRequestModel required');
  const router = express.Router();

  // GET /api/approvals/chains — list chain metadata
  router.get('/chains', (_req, res) => {
    res.json({
      count: Object.keys(CHAINS).length,
      chains: Object.entries(CHAINS).map(([id, v]) => ({
        id,
        name: v.name,
        resourceType: v.resourceType,
        steps: v.steps,
      })),
    });
  });

  // GET /api/approvals/inbox — requests awaiting current user's approval
  router.get('/inbox', async (req, res, next) => {
    try {
      const roles = (req.user && req.user.roles) || [];
      const q = { status: 'pending_approval' };
      const docs = await ApprovalRequestModel.model.find(q).sort({ openedAt: 1 }).limit(200);
      const mine = docs.filter(d => {
        const step = d.steps[d.currentStep];
        return step && roles.includes(step.role);
      });
      res.json({ count: mine.length, requests: mine });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/approvals — list with filters
  router.get('/', async (req, res, next) => {
    try {
      const { status, chainId, resourceType, branchId, limit = '50' } = req.query || {};
      const q = {};
      if (status) q.status = status;
      if (chainId) q.chainId = chainId;
      if (resourceType) q.resourceType = resourceType;
      if (branchId) q.branchId = branchId;
      const lim = Math.min(500, parseInt(limit, 10) || 50);
      const docs = await ApprovalRequestModel.model.find(q).sort({ openedAt: -1 }).limit(lim);
      res.json({ count: docs.length, requests: docs });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/approvals/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const doc = await ApprovalRequestModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/approvals — start a new approval request
  router.post('/', async (req, res, next) => {
    try {
      const {
        chainFamily,
        chainId,
        resourceType,
        resourceId,
        resourceSnapshot,
        branchId,
        metadata,
      } = req.body || {};
      const finalChainId = chainFamily ? selectChain(chainFamily, resourceSnapshot || {}) : chainId;
      if (!finalChainId) return res.status(400).json({ error: 'chain_not_resolved' });
      const initiatorId = req.user && req.user.id;
      if (!initiatorId) return res.status(401).json({ error: 'unauthenticated' });

      let built;
      try {
        built = engine.start({
          chainId: finalChainId,
          resourceType,
          resourceId,
          initiatorId,
          branchId,
          metadata,
        });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      try {
        const doc = await ApprovalRequestModel.model.create(built);
        if (audit)
          audit(req, {
            action: 'approval.started',
            resourceId: doc._id,
            meta: { chain: finalChainId },
          });
        res.status(201).json(doc);
      } catch (err) {
        if (err && err.code === 11000) {
          return res.status(409).json({ error: 'duplicate_active_request' });
        }
        next(err);
      }
    } catch (err) {
      next(err);
    }
  });

  // POST /api/approvals/:id/approve
  // POST /api/approvals/:id/reject
  // POST /api/approvals/:id/cancel
  // POST /api/approvals/:id/escalate
  for (const action of ['approve', 'reject', 'cancel', 'escalate']) {
    router.post(`/:id/${action}`, async (req, res, next) => {
      try {
        const doc = await ApprovalRequestModel.model.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'not_found' });
        const actor = {
          userId: req.user && req.user.id,
          roles: (req.user && req.user.roles) || [],
        };
        const note = (req.body && req.body.note) || null;
        try {
          engine[action](doc, actor, note);
        } catch (err) {
          const code = (err.message || '').startsWith('approval_not_active') ? 409 : 400;
          return res.status(code).json({ error: err.message, required: err.required });
        }
        await doc.save();
        if (audit) audit(req, { action: `approval.${action}`, resourceId: doc._id });
        res.json(doc);
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}

module.exports = { buildRouter };
