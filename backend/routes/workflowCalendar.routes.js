/**
 * Workflow Calendar View — extracted from workflowEnhanced.routes.js.
 *
 * 1 endpoint (URL unchanged externally):
 *   GET /calendar  ← aggregates user's tasks + instance deadlines +
 *                     active reminders within the date range
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowInstance, TaskInstance } = require('../workflow/intelligent-workflow-engine');
const { WorkflowReminder } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** Get calendar events (tasks + instance deadlines) */
router.get('/calendar', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const { start, end, _view = 'month' } = req.query;

    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end
      ? new Date(end)
      : new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    // My tasks with deadlines
    const tasks = await TaskInstance.find({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
      $or: [
        { 'sla.deadline': { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    })
      .populate({
        path: 'workflowInstance',
        select: 'title definition',
        populate: { path: 'definition', select: 'name nameAr category' },
      })
      .lean();

    // Instance deadlines
    const instances = await WorkflowInstance.find({
      $and: [
        { $or: [{ requester: userId }, { currentAssignee: userId }] },
        {
          $or: [
            { 'sla.deadline': { $gte: startDate, $lte: endDate } },
            { dueDate: { $gte: startDate, $lte: endDate } },
          ],
        },
      ],
      status: 'running',
    })
      .populate('definition', 'name nameAr category')
      .lean();

    // Reminders in range
    const reminders = await WorkflowReminder.find({
      user: userId,
      status: 'pending',
      reminderDate: { $gte: startDate, $lte: endDate },
    }).lean();

    // Build calendar events
    const events = [];

    tasks.forEach(t => {
      events.push({
        id: `task-${t._id}`,
        type: 'task',
        title: t.nameAr || t.name,
        date: t.sla?.deadline || t.createdAt,
        priority: t.action?.type === 'urgent' ? 'urgent' : 'medium',
        status: t.status,
        isOverdue: t.sla?.violated || false,
        workflowName:
          t.workflowInstance?.definition?.nameAr || t.workflowInstance?.definition?.name,
        category: t.workflowInstance?.definition?.category,
        taskId: t._id,
        instanceId: t.workflowInstance?._id,
      });
    });

    instances.forEach(inst => {
      const deadline = inst.sla?.deadline || inst.dueDate;
      if (deadline) {
        events.push({
          id: `instance-${inst._id}`,
          type: 'deadline',
          title: inst.title,
          date: deadline,
          priority: inst.priority,
          status: inst.status,
          isOverdue: inst.sla?.violated || false,
          workflowName: inst.definition?.nameAr || inst.definition?.name,
          category: inst.definition?.category,
          instanceId: inst._id,
        });
      }
    });

    reminders.forEach(r => {
      events.push({
        id: `reminder-${r._id}`,
        type: 'reminder',
        title: r.title,
        date: r.reminderDate,
        priority: r.priority,
        message: r.message,
      });
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by date for calendar view
    const grouped = {};
    events.forEach(e => {
      const day = new Date(e.date).toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    });

    res.json({
      success: true,
      data: {
        events,
        grouped,
        range: { start: startDate, end: endDate },
        summary: {
          totalEvents: events.length,
          tasks: events.filter(e => e.type === 'task').length,
          deadlines: events.filter(e => e.type === 'deadline').length,
          reminders: events.filter(e => e.type === 'reminder').length,
          overdue: events.filter(e => e.isOverdue).length,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب التقويم', error: safeError(error) });
  }
});

module.exports = router;
