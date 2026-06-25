/**
 * WhatsApp Insights routes (W1526) — read-only intelligence surfaces.
 *
 * Mounted at /api/(v1/)whatsapp-insights. Distinct from whatsapp.routes.js to
 * avoid touching that hot file. Branch-isolated via effectiveBranchScope.
 *
 * @module routes/whatsapp-insights.routes
 */

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');

const router = express.Router();
router.use(authenticate);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /engagement — WhatsApp conversation engagement health for the caller's
 * branch: per-tier counts (active/cooling/silent/dormant) + a ranked outreach
 * list of families who have gone quiet. Optional ?activeDays&coolingDays&silentDays
 * to tune the thresholds, ?limit for the list size.
 */
router.get(
  '/engagement',
  asyncHandler(async (req, res) => {
    const svc = require('../services/whatsapp/whatsappEngagementInsight.service');
    const thresholds = {};
    for (const [q, key] of [
      ['activeDays', 'active'],
      ['coolingDays', 'cooling'],
      ['silentDays', 'silent'],
    ]) {
      const n = Number(req.query[q]);
      if (Number.isFinite(n) && n > 0) thresholds[key] = n;
    }
    const data = await svc.buildEngagementInsight({
      branchScope: effectiveBranchScope(req),
      ...(Object.keys(thresholds).length ? { thresholds } : {}),
      ...(req.query.limit ? { listLimit: Number(req.query.limit) } : {}),
    });
    res.json({ success: true, data });
  })
);

module.exports = router;
