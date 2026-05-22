/**
 * Workflow Favorites & Bookmarks — extracted from workflowEnhanced.routes.js.
 *
 * 4 endpoints (URLs unchanged externally):
 *   GET    /favorites
 *   POST   /favorites/toggle
 *   GET    /favorites/check/:targetType/:targetId
 *   PUT    /favorites/reorder
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowDefinition, WorkflowInstance } = require('../workflow/intelligent-workflow-engine');
const { WorkflowFavorite } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** List my favorites */
router.get('/favorites', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const favorites = await WorkflowFavorite.find({ user: userId })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Expand references
    const expanded = await Promise.all(
      favorites.map(async fav => {
        let target = null;
        if (fav.targetType === 'definition') {
          target = await WorkflowDefinition.findById(fav.targetId)
            .select('name nameAr code category status')
            .lean();
        } else if (fav.targetType === 'instance') {
          target = await WorkflowInstance.findById(fav.targetId)
            .select('title status priority currentStep')
            .populate('definition', 'name nameAr')
            .lean();
        }
        return { ...fav, target };
      })
    );

    res.json({ success: true, data: expanded });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Toggle favorite */
router.post('/favorites/toggle', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { targetType, targetId, label, color } = req.body;
    const userId = uid(req);

    const existing = await WorkflowFavorite.findOne({ user: userId, targetType, targetId });
    if (existing) {
      await WorkflowFavorite.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        data: { isFavorite: false },
        message: 'تمت الإزالة من المفضلة',
      });
    }

    const fav = await WorkflowFavorite.create({
      user: userId,
      targetType,
      targetId,
      label,
      color,
    });
    res.status(201).json({
      success: true,
      data: { isFavorite: true, favorite: fav },
      message: 'تمت الإضافة للمفضلة',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Check if favorited */
router.get(
  '/favorites/check/:targetType/:targetId',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const exists = await WorkflowFavorite.exists({
        user: uid(req),
        targetType: req.params.targetType,
        targetId: req.params.targetId,
      });
      res.json({ success: true, data: { isFavorite: !!exists } });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Reorder favorites */
router.put('/favorites/reorder', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { items } = req.body; // [{id, sortOrder}]
    const ops = (items || []).map(i =>
      WorkflowFavorite.updateOne({ _id: i.id, user: uid(req) }, { sortOrder: i.sortOrder })
    );
    await Promise.all(ops);
    res.json({ success: true, message: 'تم إعادة الترتيب' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
