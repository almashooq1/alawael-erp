/**
 * Workflow Tags — extracted from workflowEnhanced.routes.js.
 *
 * 6 endpoints (URLs unchanged externally):
 *   GET    /tags
 *   POST   /tags
 *   PUT    /tags/:id
 *   DELETE /tags/:id
 *   POST   /tags/assign/:instanceId
 *   DELETE /tags/assign/:instanceId/:tagName
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowInstance } = require('../workflow/intelligent-workflow-engine');
const { WorkflowTag } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** List all tags */
router.get('/tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category) query.category = category;
    const tags = await WorkflowTag.find(query).sort({ usageCount: -1, name: 1 }).lean();
    res.json({ success: true, data: tags });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create tag */
router.post('/tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const tag = await WorkflowTag.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'الوسم موجود بالفعل' });
    }
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update tag */
router.put('/tags/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const tag = await WorkflowTag.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
    });
    if (!tag) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: tag });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete tag */
router.delete('/tags/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowTag.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف الوسم' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Add tags to an instance */
router.post('/tags/assign/:instanceId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { tags } = req.body; // Array of tag names
    const instance = await WorkflowInstance.findById(req.params.instanceId);
    if (!instance) return res.status(404).json({ success: false, message: 'المثيل غير موجود' });

    // Merge tags (avoid duplicates)
    const existing = instance.tags || [];
    const merged = [...new Set([...existing, ...(tags || [])])];
    instance.tags = merged;
    await instance.save();

    // Increment usage count
    await WorkflowTag.updateMany({ name: { $in: tags } }, { $inc: { usageCount: 1 } });

    res.json({ success: true, data: { tags: instance.tags } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Remove tag from instance */
router.delete(
  '/tags/assign/:instanceId/:tagName',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const instance = await WorkflowInstance.findById(req.params.instanceId);
      if (!instance) return res.status(404).json({ success: false, message: 'غير موجود' });

      instance.tags = (instance.tags || []).filter(t => t !== req.params.tagName);
      await instance.save();

      await WorkflowTag.updateOne({ name: req.params.tagName }, { $inc: { usageCount: -1 } });

      res.json({ success: true, data: { tags: instance.tags } });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

module.exports = router;
