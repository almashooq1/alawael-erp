/**
 * Workflow Advanced Batch Operations — extracted from workflowEnhanced.routes.js.
 *
 * 4 endpoints (URLs unchanged externally):
 *   POST /batch/reassign
 *   POST /batch/cancel-instances
 *   POST /batch/update-priority
 *   POST /batch/add-tags
 */

'use strict';

const express = require('express');
const router = express.Router();

const {
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
} = require('../workflow/intelligent-workflow-engine');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** Bulk reassign tasks */
router.post('/batch/reassign', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { taskIds, newAssignee, reason } = req.body;
    if (!taskIds?.length || !newAssignee) {
      return res.status(400).json({ success: false, message: 'المهام والمفوض إليه مطلوبان' });
    }

    const result = await TaskInstance.updateMany(
      { _id: { $in: taskIds }, status: { $in: ['assigned', 'in_progress'] } },
      { assignee: newAssignee, assignedAt: new Date() }
    );

    // Log audit
    for (const taskId of taskIds) {
      await WorkflowAuditLog.create({
        taskInstance: taskId,
        action: 'reassign',
        toAssignee: newAssignee,
        comment: reason || 'إعادة تعيين مجمعة',
        performedBy: uid(req),
      });
    }

    res.json({
      success: true,
      data: { modified: result.modifiedCount },
      message: 'تم إعادة التعيين بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Bulk cancel instances */
router.post('/batch/cancel-instances', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, reason } = req.body;
    if (!instanceIds?.length) {
      return res.status(400).json({ success: false, message: 'المثيلات مطلوبة' });
    }

    const result = await WorkflowInstance.updateMany(
      { _id: { $in: instanceIds }, status: { $in: ['running', 'suspended'] } },
      { status: 'cancelled', completedAt: new Date() }
    );

    // Cancel related tasks
    await TaskInstance.updateMany(
      {
        workflowInstance: { $in: instanceIds },
        status: { $in: ['pending', 'assigned', 'in_progress'] },
      },
      { status: 'cancelled' }
    );

    for (const instId of instanceIds) {
      await WorkflowAuditLog.create({
        workflowInstance: instId,
        action: 'cancel',
        comment: reason || 'إلغاء مجمع',
        performedBy: uid(req),
      });
    }

    res.json({
      success: true,
      data: { modified: result.modifiedCount },
      message: 'تم الإلغاء بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Bulk update task priority */
router.post('/batch/update-priority', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, priority } = req.body;
    if (!instanceIds?.length || !priority) {
      return res.status(400).json({ success: false, message: 'المثيلات والأولوية مطلوبان' });
    }

    const result = await WorkflowInstance.updateMany({ _id: { $in: instanceIds } }, { priority });

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Batch add tags to instances */
router.post('/batch/add-tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, tags } = req.body;
    if (!instanceIds?.length || !tags?.length) {
      return res.status(400).json({ success: false, message: 'المثيلات والوسوم مطلوبة' });
    }

    const result = await WorkflowInstance.updateMany(
      { _id: { $in: instanceIds } },
      { $addToSet: { tags: { $each: tags } } }
    );

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
