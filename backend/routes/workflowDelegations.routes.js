/**
 * Workflow Delegation & Out-of-Office — extracted from workflowEnhanced.routes.js.
 *
 * Concrete sub-module #2 of the workflowEnhanced refactor. Same router,
 * same endpoint paths, same middleware order — only the file boundary
 * is new. Mounted through `workflowEnhanced.routes.js` via
 * `router.use('/', require('./workflowDelegations.routes'))` so public
 * URLs (`/api/workflow-enhanced/delegations/...` + v1 alias) are
 * unchanged.
 *
 * Endpoints:
 *   GET   /delegations
 *   POST  /delegations
 *   POST  /delegations/:id/cancel
 *   GET   /delegations/active/:userId
 *   POST  /delegations/process
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowDelegation } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// DELEGATION & OUT-OF-OFFICE — التفويض والنيابة
// ════════════════════════════════════════════════════════════════════════════════

/** List my delegations (as delegator or delegate) */
router.get('/delegations', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const { role = 'all', status } = req.query;
    const query = {};
    if (role === 'delegator') query.delegator = userId;
    else if (role === 'delegate') query.delegate = userId;
    else query.$or = [{ delegator: userId }, { delegate: userId }];
    if (status) query.status = status;

    const delegations = await WorkflowDelegation.find(query)
      .populate('delegator', 'name avatar')
      .populate('delegate', 'name avatar')
      .populate('workflowDefinitions', 'name nameAr')
      .sort({ startDate: -1 })
      .lean();

    res.json({ success: true, data: delegations });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create delegation */
router.post('/delegations', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const {
      delegate,
      scope,
      workflowDefinitions,
      categories,
      startDate,
      endDate,
      reason,
      reasonText,
      autoReplyEnabled,
      autoReplyMessage,
    } = req.body;

    if (!delegate || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: 'المفوض إليه وتاريخ البداية والنهاية مطلوبة' });
    }

    if (delegate === userId?.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تفويض نفسك' });
    }

    // Check for overlapping active delegations
    const overlap = await WorkflowDelegation.findOne({
      delegator: userId,
      status: { $in: ['active', 'pending'] },
      $or: [{ startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }],
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: 'يوجد تفويض متداخل في نفس الفترة' });
    }

    const now = new Date();
    const start = new Date(startDate);
    const delegation = await WorkflowDelegation.create({
      delegator: userId,
      delegate,
      scope: scope || 'all',
      workflowDefinitions: workflowDefinitions || [],
      categories: categories || [],
      startDate: start,
      endDate: new Date(endDate),
      reason: reason || 'vacation',
      reasonText,
      autoReplyEnabled: autoReplyEnabled || false,
      autoReplyMessage,
      status: start <= now ? 'active' : 'pending',
      createdBy: userId,
    });

    const populated = await WorkflowDelegation.findById(delegation._id)
      .populate('delegator', 'name')
      .populate('delegate', 'name')
      .lean();

    res.status(201).json({ success: true, data: populated, message: 'تم إنشاء التفويض بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في إنشاء التفويض', error: safeError(error) });
  }
});

/** Cancel delegation */
router.post('/delegations/:id/cancel', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const delegation = await WorkflowDelegation.findById(req.params.id);
    if (!delegation) return res.status(404).json({ success: false, message: 'التفويض غير موجود' });

    delegation.status = 'cancelled';
    delegation.cancelledBy = uid(req);
    delegation.cancelledAt = new Date();
    await delegation.save();

    res.json({ success: true, message: 'تم إلغاء التفويض' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get active delegation for a user (used by task assignment) */
router.get('/delegations/active/:userId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();
    const delegation = await WorkflowDelegation.findOne({
      delegator: req.params.userId,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('delegate', 'name')
      .lean();

    res.json({ success: true, data: delegation });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Auto-activate/expire delegations (cron-friendly) */
router.post('/delegations/process', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();

    // Activate pending delegations whose start date has passed
    const activated = await WorkflowDelegation.updateMany(
      { status: 'pending', startDate: { $lte: now } },
      { status: 'active' }
    );

    // Expire active delegations whose end date has passed
    const expired = await WorkflowDelegation.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { status: 'expired' }
    );

    res.json({
      success: true,
      data: { activated: activated.modifiedCount, expired: expired.modifiedCount },
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
