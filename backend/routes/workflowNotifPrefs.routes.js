/**
 * Workflow Notification Preferences — extracted from workflowEnhanced.routes.js.
 *
 * 2 endpoints (URLs unchanged externally):
 *   GET /notification-prefs
 *   PUT /notification-prefs
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowNotifPref } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** Get my notification preferences */
router.get('/notification-prefs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    let prefs = await WorkflowNotifPref.findOne({ user: uid(req) }).lean();
    if (!prefs) {
      // Return defaults
      prefs = { enabled: true, events: {}, digestEnabled: false, quietHoursEnabled: false };
    }
    res.json({ success: true, data: prefs });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update notification preferences */
router.put('/notification-prefs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const prefs = await WorkflowNotifPref.findOneAndUpdate(
      { user: uid(req) },
      { ...req.body, user: uid(req) },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: prefs, message: 'تم تحديث تفضيلات الإشعارات' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
