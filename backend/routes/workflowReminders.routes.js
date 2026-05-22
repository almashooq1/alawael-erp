/**
 * Workflow Reminders — extracted from workflowEnhanced.routes.js.
 *
 * 4 endpoints (URLs unchanged externally):
 *   GET    /reminders
 *   POST   /reminders
 *   DELETE /reminders/:id
 *   POST   /reminders/process  ← cron-friendly: marks due reminders sent,
 *                                  reschedules recurring ones
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowReminder } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** List my reminders */
router.get('/reminders', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const reminders = await WorkflowReminder.find({ user: uid(req), status })
      .populate('workflowInstance', 'title status')
      .populate('taskInstance', 'name status')
      .sort({ reminderDate: 1 })
      .lean();
    res.json({ success: true, data: reminders });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create reminder */
router.post('/reminders', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const {
      workflowInstance,
      taskInstance,
      reminderDate,
      isRecurring,
      recurringInterval,
      recurringHours,
      title,
      message,
      priority,
      channels,
    } = req.body;

    if (!reminderDate || !title) {
      return res.status(400).json({ success: false, message: 'التاريخ والعنوان مطلوبان' });
    }

    const reminder = await WorkflowReminder.create({
      workflowInstance,
      taskInstance,
      user: uid(req),
      reminderDate: new Date(reminderDate),
      isRecurring: isRecurring || false,
      recurringInterval,
      recurringHours,
      nextReminderDate: isRecurring ? new Date(reminderDate) : null,
      title,
      message,
      priority: priority || 'medium',
      channels: channels || ['in_app'],
      createdBy: uid(req),
    });

    res.status(201).json({ success: true, data: reminder, message: 'تم إنشاء التذكير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Cancel reminder */
router.delete('/reminders/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowReminder.findOneAndUpdate(
      { _id: req.params.id, user: uid(req) },
      { status: 'cancelled' }
    );
    res.json({ success: true, message: 'تم إلغاء التذكير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Process due reminders (cron-friendly) */
router.post('/reminders/process', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();
    const dueReminders = await WorkflowReminder.find({
      status: 'pending',
      reminderDate: { $lte: now },
    }).lean();

    let sent = 0;
    for (const reminder of dueReminders) {
      // Mark as sent (actual notification logic can be added)
      await WorkflowReminder.updateOne(
        { _id: reminder._id },
        {
          status: 'sent',
          sentAt: now,
          ...(reminder.isRecurring
            ? {
                status: 'pending',
                reminderDate: _getNextDate(reminder),
                nextReminderDate: _getNextDate(reminder),
              }
            : {}),
        }
      );
      sent++;
    }

    res.json({ success: true, data: { processed: sent } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

function _getNextDate(reminder) {
  const d = new Date(reminder.reminderDate);
  if (reminder.recurringInterval === 'daily') d.setDate(d.getDate() + 1);
  else if (reminder.recurringInterval === 'weekly') d.setDate(d.getDate() + 7);
  else if (reminder.recurringInterval === 'custom_hours')
    d.setHours(d.getHours() + (reminder.recurringHours || 24));
  return d;
}

module.exports = router;
