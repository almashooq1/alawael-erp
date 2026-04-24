'use strict';

/**
 * hr-anomalies.routes.js — Phase 11 Commit 21 (4.0.38).
 *
 *   GET  /api/v1/hr/anomalies            [?status=pending|reviewed|all] [limit, skip]
 *   GET  /api/v1/hr/anomalies/:id
 *   POST /api/v1/hr/anomalies/:id/review { outcome, notes }
 *
 * MANAGER tier (see hr-admin-editable-fields.js) required for ALL
 * three endpoints. Subjects of an anomaly can see their own event
 * via `/me/access-log` (C15) — this admin surface is for ops.
 */

const express = require('express');
const mongoose = require('mongoose');

const { writeTierForRole } = require('../../config/hr-admin-editable-fields');

function createHrAnomaliesRouter({ service, logger = console } = {}) {
  if (
    service == null ||
    typeof service.listAnomalies !== 'function' ||
    typeof service.reviewAnomaly !== 'function' ||
    typeof service.getAnomaly !== 'function'
  ) {
    throw new Error(
      'createHrAnomaliesRouter: service with listAnomalies + getAnomaly + reviewAnomaly required'
    );
  }

  const router = express.Router();

  function requireManager(req, res) {
    if (!req.user) {
      res.status(401).json({ error: 'auth required' });
      return false;
    }
    const tier = writeTierForRole(req.user.role);
    if (tier !== 'manager') {
      res.status(403).json({ error: 'requires manager tier' });
      return false;
    }
    return true;
  }

  // ─── GET /anomalies ─────────────────────────────────────────

  router.get('/anomalies', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      const { status, limit, skip } = req.query;
      const allowedStatus = ['pending', 'reviewed', 'all'];
      const effectiveStatus = status && allowedStatus.includes(status) ? status : 'pending';
      const result = await service.listAnomalies({
        status: effectiveStatus,
        limit: limit != null ? Number.parseInt(String(limit), 10) : undefined,
        skip: skip != null ? Number.parseInt(String(skip), 10) : undefined,
      });
      return res.json(result);
    } catch (err) {
      logger.error && logger.error('[HrAnomalies:list]', err.message || err);
      return res.status(500).json({ error: 'list failed' });
    }
  });

  // ─── GET /anomalies/:id ─────────────────────────────────────

  router.get('/anomalies/:id', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const doc = await service.getAnomaly({ id: req.params.id });
      if (!doc) return res.status(404).json({ error: 'anomaly not found' });
      return res.json({ anomaly: doc });
    } catch (err) {
      logger.error && logger.error('[HrAnomalies:detail]', err.message || err);
      return res.status(500).json({ error: 'detail failed' });
    }
  });

  // ─── POST /anomalies/:id/review ─────────────────────────────

  router.post('/anomalies/:id/review', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'invalid id' });
      }
      const { outcome, notes } = req.body || {};
      const result = await service.reviewAnomaly({
        id: req.params.id,
        reviewerUserId: req.user.id || req.user._id,
        reviewerRole: req.user.role,
        outcome,
        notes: typeof notes === 'string' ? notes : null,
        ipAddress: req.ip,
      });
      switch (result.result) {
        case 'reviewed':
          return res.json({ anomaly: result.anomaly, reviewed: true });
        case 'already_reviewed':
          return res.status(409).json({
            error: 'already_reviewed',
            currentOutcome: result.currentOutcome,
            reviewedAt: result.reviewedAt,
          });
        case 'denied':
          return res.status(403).json({ error: result.reason });
        case 'invalid_outcome':
          return res.status(400).json({
            error: 'invalid_outcome',
            validOutcomes: result.validOutcomes,
          });
        case 'notes_required':
          return res.status(400).json({
            error: 'notes_required',
            outcome: result.outcome,
          });
        case 'not_found':
          return res.status(404).json({ error: 'anomaly not found' });
        default:
          return res.status(500).json({ error: 'unexpected service result' });
      }
    } catch (err) {
      logger.error && logger.error('[HrAnomalies:review]', err.message || err);
      return res.status(500).json({ error: 'review failed' });
    }
  });

  return router;
}

module.exports = { createHrAnomaliesRouter };
