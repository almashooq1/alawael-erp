/**
 * Break-Glass REST routes.
 *
 *   app.use('/api/break-glass',
 *     authenticateToken,
 *     buildRouter({ SessionModel, engine })
 *   );
 */

'use strict';

const express = require('express');
const { BreakGlassEngine } = require('./engine');

/**
 * An engine that persists through an injected Mongoose-like model.
 */
function makeDbBackedEngine({ SessionModel, onActivate, onCoSign, onExpire, now }) {
  const storage = {
    get: id => SessionModel.model.findById(id),
    set: (id, doc) => doc.save && doc.save(),
    values: () => SessionModel.model.find({}).then(d => d) /* unused */,
    delete: id => SessionModel.model.deleteOne({ _id: id }),
  };
  return { SessionModel, storage, onActivate, onCoSign, onExpire, now };
}

function buildRouter({ SessionModel, audit }) {
  if (!SessionModel) throw new Error('break-glass.routes: SessionModel required');
  const router = express.Router();

  // GET /api/break-glass/my — sessions for current user
  router.get('/my', async (req, res, next) => {
    try {
      const uid = req.user && req.user.id;
      const docs = await SessionModel.model
        .find({ userId: uid })
        .sort({ activatedAt: -1 })
        .limit(50);
      res.json({ count: docs.length, sessions: docs });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/break-glass/pending — sessions awaiting co-sign
  router.get('/pending', async (req, res, next) => {
    try {
      const now = new Date();
      const docs = await SessionModel.model
        .find({ coSignedAt: null, closedAt: null, coSignRequiredBy: { $gte: now } })
        .sort({ activatedAt: 1 })
        .limit(200);
      res.json({ count: docs.length, sessions: docs });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/break-glass/flagged — sessions missed co-sign (for DPO review)
  router.get('/flagged', async (req, res, next) => {
    try {
      const docs = await SessionModel.model
        .find({ flaggedForReview: true, reviewedAt: null })
        .sort({ activatedAt: -1 })
        .limit(200);
      res.json({ count: docs.length, sessions: docs });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/break-glass/activate
  router.post('/activate', async (req, res, next) => {
    try {
      const uid = req.user && req.user.id;
      if (!uid) return res.status(401).json({ error: 'unauthenticated' });
      const { scope, purpose, branchId, resourceHint } = req.body || {};
      if (!scope || !purpose) return res.status(400).json({ error: 'scope_and_purpose_required' });
      if (String(purpose).length < 10) return res.status(400).json({ error: 'purpose_too_short' });

      const now = new Date();
      // Rate limit: 3 per month.
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentCount = await SessionModel.model.countDocuments({
        userId: uid,
        activatedAt: { $gte: monthAgo },
      });
      if (recentCount >= 3)
        return res.status(429).json({ error: 'monthly_limit_reached', count: recentCount });

      const doc = await SessionModel.model.create({
        userId: uid,
        scope,
        purpose,
        branchId,
        resourceHint,
        activatedAt: now,
        expiresAt: new Date(now.getTime() + 4 * 3600 * 1000),
        coSignRequiredBy: new Date(now.getTime() + 24 * 3600 * 1000),
      });
      if (audit)
        audit(req, { action: 'break_glass.activated', resourceId: doc._id, severity: 'critical' });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/break-glass/:id/cosign
  router.post('/:id/cosign', async (req, res, next) => {
    try {
      const uid = req.user && req.user.id;
      const roles = (req.user && req.user.roles) || [];
      const L2_PLUS = new Set([
        'super_admin',
        'head_office_admin',
        'hq_ceo',
        'hq_cfo',
        'hq_cmo',
        'hq_cqo',
        'hq_chro',
        'compliance_officer',
        'dpo',
      ]);
      if (!roles.some(r => L2_PLUS.has(r))) {
        return res.status(403).json({ error: 'l2_or_higher_required' });
      }
      const doc = await SessionModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (String(doc.userId) === String(uid)) {
        return res.status(400).json({ error: 'cannot_cosign_self' });
      }
      if (doc.coSignedAt) return res.status(409).json({ error: 'already_cosigned' });
      if (new Date() > doc.coSignRequiredBy) {
        return res.status(410).json({ error: 'cosign_window_closed' });
      }
      doc.coSignedAt = new Date();
      doc.coSignedBy = uid;
      doc.coSignNote = (req.body && req.body.note) || null;
      await doc.save();
      if (audit) audit(req, { action: 'break_glass.cosigned', resourceId: doc._id });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/break-glass/:id/close
  router.post('/:id/close', async (req, res, next) => {
    try {
      const doc = await SessionModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (doc.closedAt) return res.status(409).json({ error: 'already_closed' });
      doc.closedAt = new Date();
      doc.closedBy = req.user && req.user.id;
      doc.closeReason = (req.body && req.body.reason) || null;
      await doc.save();
      if (audit) audit(req, { action: 'break_glass.closed', resourceId: doc._id });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildRouter, makeDbBackedEngine, BreakGlassEngine };
