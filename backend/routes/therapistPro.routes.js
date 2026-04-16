/**
 * Therapist Portal Pro Routes — مسارات بوابة المعالج المتقدمة (الدفعة الثالثة)
 *
 * ─── /tasks           — سجل المهام اليومية
 * ─── /progress        — تتبع التقدم
 * ─── /library         — المكتبة العلمية
 * ─── /templates       — نماذج التوثيق
 * ─── /parent-comms    — التواصل مع الأهل
 * ─── /smart-goals     — الأهداف الذكية
 *
 * All routes protected via authenticateToken.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const svc = require('../services/therapistPortal.service');

router.use(authenticateToken);
router.use(requireBranchAccess);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
//  سجل المهام اليومية — Daily Task Board
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/tasks',
  wrap(async (req, res) => {
    const data = await svc.getDailyTasks(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/tasks',
  wrap(async (req, res) => {
    const data = await svc.createTask(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/tasks/:taskId',
  wrap(async (req, res) => {
    const data = await svc.updateTask(req.user.id, req.params.taskId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/tasks/:taskId',
  wrap(async (req, res) => {
    const ok = await svc.deleteTask(req.user.id, req.params.taskId);
    if (!ok) return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المهمة' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  تتبع التقدم — Progress Tracking
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/progress',
  wrap(async (req, res) => {
    const data = await svc.getProgressRecords(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/progress',
  wrap(async (req, res) => {
    const data = await svc.addProgressRecord(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.delete(
  '/progress/:recordId',
  wrap(async (req, res) => {
    const ok = await svc.deleteProgressRecord(req.user.id, req.params.recordId);
    if (!ok) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم حذف السجل' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  المكتبة العلمية — Clinical Library
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/library',
  wrap(async (req, res) => {
    const data = await svc.getLibraryItems(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/library/:itemId',
  wrap(async (req, res) => {
    const data = await svc.getLibraryItem(req.params.itemId);
    if (!data) return res.status(404).json({ success: false, error: 'العنصر غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/library',
  wrap(async (req, res) => {
    const data = await svc.addLibraryItem(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.delete(
  '/library/:itemId',
  wrap(async (req, res) => {
    const ok = await svc.deleteLibraryItem(req.params.itemId);
    if (!ok) return res.status(404).json({ success: false, error: 'العنصر غير موجود' });
    res.json({ success: true, message: 'تم حذف العنصر' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  نماذج التوثيق — Documentation Templates
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/templates',
  wrap(async (req, res) => {
    const data = await svc.getTemplates(req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/templates/:templateId',
  wrap(async (req, res) => {
    const data = await svc.getTemplateById(req.params.templateId);
    if (!data) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/templates',
  wrap(async (req, res) => {
    const data = await svc.createTemplate(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/templates/:templateId',
  wrap(async (req, res) => {
    const data = await svc.updateTemplate(req.user.id, req.params.templateId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    res.json({ success: true, data });
  })
);

router.post(
  '/templates/:templateId/use',
  wrap(async (req, res) => {
    const data = await svc.useTemplate(req.params.templateId);
    if (!data) return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/templates/:templateId',
  wrap(async (req, res) => {
    const ok = await svc.deleteTemplate(req.params.templateId);
    if (!ok)
      return res.status(400).json({ success: false, error: 'لا يمكن حذف النموذج الافتراضي' });
    res.json({ success: true, message: 'تم حذف النموذج' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التواصل مع الأهل — Parent Communication
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/parent-comms',
  wrap(async (req, res) => {
    const data = await svc.getParentMessages(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/parent-comms',
  wrap(async (req, res) => {
    const data = await svc.sendParentMessage(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.patch(
  '/parent-comms/:messageId/read',
  wrap(async (req, res) => {
    const data = await svc.markMessageRead(req.user.id, req.params.messageId);
    if (!data) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/parent-comms/:messageId',
  wrap(async (req, res) => {
    const ok = await svc.deleteParentMessage(req.user.id, req.params.messageId);
    if (!ok) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الرسالة' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الأهداف الذكية — SMART Goals Manager
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/smart-goals',
  wrap(async (req, res) => {
    const data = await svc.getSmartGoals(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/smart-goals',
  wrap(async (req, res) => {
    const data = await svc.createSmartGoal(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/smart-goals/:goalId',
  wrap(async (req, res) => {
    const data = await svc.updateSmartGoal(req.user.id, req.params.goalId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الهدف غير موجود' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/smart-goals/:goalId/milestones/:milestoneId',
  wrap(async (req, res) => {
    const data = await svc.updateMilestone(
      req.user.id,
      req.params.goalId,
      req.params.milestoneId,
      req.body
    );
    if (!data)
      return res.status(404).json({ success: false, error: 'الهدف أو المرحلة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/smart-goals/:goalId',
  wrap(async (req, res) => {
    const ok = await svc.deleteSmartGoal(req.user.id, req.params.goalId);
    if (!ok) return res.status(404).json({ success: false, error: 'الهدف غير موجود' });
    res.json({ success: true, message: 'تم حذف الهدف' });
  })
);

module.exports = router;
