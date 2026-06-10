/**
 * tasks.routes.js
 * ══════════════════════════════════════════════════════════════════
 * Task Management API — إدارة المهام
 * Covers: taskService.js frontend calls at /api/v1/tasks/*
 *
 * Mounted at: /api/v1/tasks
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { stripUpdateMeta } = require('../utils/sanitize');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const {
  assertBeneficiaryInScope,
  fetchScopedByBeneficiary,
} = require('../utils/beneficiaryBranchGate');

function Task() {
  try {
    return mongoose.model('Task');
  } catch (_e) {
    return mongoose.model(
      'Task',
      new mongoose.Schema(
        {
          title: { type: String, required: true },
          description: String,
          assignedTo: mongoose.Schema.Types.ObjectId,
          assignedBy: mongoose.Schema.Types.ObjectId,
          beneficiaryId: mongoose.Schema.Types.ObjectId,
          episodeId: mongoose.Schema.Types.ObjectId,
          sessionId: mongoose.Schema.Types.ObjectId,
          category: { type: String, default: 'general' },
          priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high', 'urgent'] },
          status: {
            type: String,
            default: 'pending',
            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
          },
          dueDate: Date,
          completedAt: Date,
          progress: { type: Number, default: 0, min: 0, max: 100 },
          tags: [String],
          attachments: [String],
          comments: [
            {
              author: mongoose.Schema.Types.ObjectId,
              text: String,
              createdAt: { type: Date, default: Date.now },
            },
          ],
          isDeleted: { type: Boolean, default: false },
        },
        { timestamps: true }
      )
    );
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// W1131 (W269 ownership) — a task may be mutated only by its owner
// (assignedTo / assignedBy) or a manager/admin. NO-OP for unauthenticated /
// internal / test contexts (auth is enforced at mount via dualMountAuth); the
// gate engages only when req.user is present. Closes the general-task edit/delete
// IDOR that W1125 left open (W1125 covered only the beneficiary-linked subset).
// The privileged-role set is a deliberate default chosen on the owner's behalf —
// widen it (e.g. + coordinator / clinical_supervisor) if those roles legitimately
// manage other staff's tasks.
const TASK_PRIVILEGED_ROLES = ['admin', 'super_admin', 'manager'];
function denyIfNotTaskOwnerOrManager(req, res, task) {
  if (!req || !req.user) return false; // no auth context (test/internal) → no-op
  const role = (req.user.role || '').toLowerCase();
  if (TASK_PRIVILEGED_ROLES.includes(role)) return false;
  const uid = String(req.user.id || req.user._id || '');
  const isOwner = uid && (String(task.assignedTo) === uid || String(task.assignedBy) === uid);
  if (isOwner) return false;
  res.status(403).json({ success: false, message: 'غير مصرّح: المهمة تخص مستخدماً آخر' });
  return true;
}

/* ══════════════════════ DASHBOARD ══════════════════════════════════════════ */

router.get(
  '/dashboard/stats',
  asyncHandler(async (req, res) => {
    const M = Task();
    const userId = req.user?.id || req.user?._id;
    const q = { isDeleted: { $ne: true } };
    if (userId) q.assignedTo = userId;

    const [total, byStatus, overdue] = await Promise.all([
      M.countDocuments(q),
      M.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      M.countDocuments({
        ...q,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: new Date() },
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));
    res.json({
      success: true,
      data: {
        total,
        pending: statusMap['pending'] || 0,
        inProgress: statusMap['in_progress'] || 0,
        completed: statusMap['completed'] || 0,
        overdue,
        byStatus: statusMap,
      },
    });
  })
);

/* ══════════════════════ CRUD ═══════════════════════════════════════════════ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const M = Task();
    const { status, priority, assignedTo, beneficiaryId, limit = 50, skip = 0 } = req.query;
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (assignedTo) q.assignedTo = assignedTo;
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);
    const [data, total] = await Promise.all([
      M.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const M = Task();
    const userId = req.user?.id || req.user?._id;
    const task = await M.create({ ...req.body, assignedBy: req.body.assignedBy || userId });
    res.status(201).json({ success: true, data: task });
  })
);

router.get(
  '/:id',
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const M = Task();
    // W269 — if the task is linked to a beneficiary, gate the read by that
    // beneficiary's branch BEFORE returning PHI (uniform 404). No-op for tasks
    // with no beneficiary + cross-branch/HQ roles + unscoped test calls.
    const { doc: task, denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    res.json({ success: true, data: task });
  })
);

router.put(
  '/:id',
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const M = Task();
    // W269 — gate cross-branch edit of a beneficiary-linked (clinical) task, then
    // task-ownership (W1131): owner (assignedTo/assignedBy) or a manager/admin only.
    const existing = await M.findById(req.params.id)
      .select('beneficiaryId assignedTo assignedBy')
      .lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
    const denied = await assertBeneficiaryInScope(req, existing.beneficiaryId, res);
    if (denied) return;
    if (denyIfNotTaskOwnerOrManager(req, res, existing)) return;
    const task = await M.findByIdAndUpdate(
      req.params.id,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  })
);

router.delete(
  '/:id',
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const M = Task();
    // W269 — gate cross-branch soft-delete of a beneficiary-linked (clinical) task,
    // then task-ownership (W1131): owner or manager/admin only.
    const existing = await M.findById(req.params.id)
      .select('beneficiaryId assignedTo assignedBy')
      .lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });
    const denied = await assertBeneficiaryInScope(req, existing.beneficiaryId, res);
    if (denied) return;
    if (denyIfNotTaskOwnerOrManager(req, res, existing)) return;
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const M = Task();
    const update = { status: req.body.status };
    if (req.body.status === 'completed') update.completedAt = new Date();
    const task = await M.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after' }
    ).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  })
);

router.patch(
  '/:id/progress',
  asyncHandler(async (req, res) => {
    const M = Task();
    const progress = Math.min(100, Math.max(0, Number(req.body.progress) || 0));
    const update = { progress };
    if (progress === 100) {
      update.status = 'completed';
      update.completedAt = new Date();
    }
    const task = await M.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after' }
    ).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  })
);

module.exports = router;
