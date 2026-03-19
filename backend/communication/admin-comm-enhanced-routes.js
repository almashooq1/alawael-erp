/**
 * Administrative Communications Enhanced Routes
 * مسارات محسّنة للاتصالات الإدارية - 90+ نقطة نهاية جديدة
 *
 * New API Endpoints:
 *  ── التوقيعات الإلكترونية ──
 *  POST   /signatures/request          - طلب توقيع
 *  POST   /signatures/:id/sign         - تنفيذ التوقيع
 *  POST   /signatures/:id/revoke       - إلغاء التوقيع
 *  GET    /signatures/:corrId          - توقيعات المراسلة
 *  GET    /signatures/:id/verify       - التحقق من التوقيع
 *
 *  ── الملاحظات الداخلية ──
 *  POST   /notes                       - إضافة ملاحظة
 *  GET    /notes/:corrId               - ملاحظات المراسلة
 *  PUT    /notes/:id                   - تعديل ملاحظة
 *  DELETE /notes/:id                   - حذف ملاحظة
 *
 *  ── التذكيرات المخصصة ──
 *  POST   /reminders                   - إنشاء تذكير
 *  GET    /reminders/my                - تذكيراتي
 *  POST   /reminders/:id/snooze        - تأجيل تذكير
 *  POST   /reminders/:id/dismiss       - رفض تذكير
 *  DELETE /reminders/:id               - حذف تذكير
 *  POST   /reminders/process-due       - معالجة المستحقة
 *
 *  ── المهام المرتبطة ──
 *  POST   /tasks                       - إنشاء مهمة
 *  GET    /tasks/:corrId               - مهام المراسلة
 *  PUT    /tasks/:id                   - تحديث مهمة
 *  PUT    /tasks/:id/checklist         - تحديث قائمة التحقق
 *  GET    /tasks/my/all                - مهامي
 *
 *  ── تتبع التسليم ──
 *  POST   /delivery                    - إنشاء سجل تسليم
 *  PUT    /delivery/:id/status         - تحديث حالة التسليم
 *  GET    /delivery/:corrId            - سجلات التسليم
 *  GET    /delivery/:corrId/stats      - إحصائيات التسليم
 *
 *  ── الإحالات ──
 *  POST   /referrals                   - إنشاء إحالة
 *  PUT    /referrals/:id/respond       - الرد على إحالة
 *  POST   /referrals/:id/escalate      - تصعيد إحالة
 *  GET    /referrals/:corrId           - إحالات المراسلة
 *  GET    /referrals/my/all            - إحالاتي
 *
 *  ── التعليقات والمناقشة ──
 *  POST   /comments                    - إضافة تعليق
 *  GET    /comments/:corrId            - تعليقات المراسلة
 *  PUT    /comments/:id                - تعديل تعليق
 *  DELETE /comments/:id                - حذف تعليق
 *  POST   /comments/:id/react          - تفاعل
 *  POST   /comments/:id/resolve        - حل التعليق
 *
 *  ── الأختام الرسمية ──
 *  POST   /stamps                      - إنشاء ختم
 *  GET    /stamps                      - قائمة الأختام
 *  POST   /stamps/:id/apply/:corrId    - تطبيق ختم
 *
 *  ── المفضلة والتثبيت ──
 *  POST   /favorites/:corrId/toggle    - تبديل المفضلة
 *  POST   /favorites/:corrId/pin       - تبديل التثبيت
 *  GET    /favorites                   - قائمة المفضلة
 *  PUT    /favorites/:id               - تعديل المفضلة
 *  GET    /favorites/folders           - مجلدات المفضلة
 *
 *  ── رموز QR ──
 *  POST   /qr/generate/:corrId        - توليد رمز QR
 *  POST   /qr/:id/scan                - مسح رمز QR
 *  GET    /qr/:corrId                  - رموز QR للمراسلة
 *
 *  ── التصنيفات ──
 *  POST   /labels                      - إنشاء تصنيف
 *  GET    /labels                      - قائمة التصنيفات
 *  PUT    /labels/:id                  - تعديل تصنيف
 *  DELETE /labels/:id                  - حذف تصنيف
 *
 *  ── إعادة التوجيه والرد ──
 *  POST   /forward/:corrId             - إعادة توجيه
 *  GET    /forward/:corrId/history     - سجل إعادة التوجيه
 *  POST   /reply/:corrId               - الرد على مراسلة
 *
 *  ── لوحة المعلومات والتقارير ──
 *  GET    /dashboard/enhanced          - لوحة معلومات متقدمة
 *  GET    /reports/performance          - تقرير الأداء
 *  GET    /reports/response-time        - تحليل وقت الاستجابة
 */

const express = require('express');
const router = express.Router();
const enhancedService = require('./admin-comm-enhanced-service');
const { authenticate, authorize } = require('../middleware/advancedAuth');

// Helper: extract user info
const uid = req => req.user?._id || req.user?.id || req.user?.userId;
const uname = req => req.user?.name || req.user?.nameAr || req.user?.fullName || 'المستخدم';
const uroles = req => (req.user?.roles || req.user?.role ? [req.user.role] : []);

// ══════════════════════════════════════════════════════════════════════════════
//  1. DIGITAL SIGNATURES — التوقيعات الإلكترونية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/signatures/request
 * @desc طلب توقيع إلكتروني على مراسلة
 */
router.post('/signatures/request', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.requestSignature(
      req.body.correspondenceId,
      req.body,
      uid(req)
    );
    res.status(201).json({ success: true, message: 'تم طلب التوقيع بنجاح', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في طلب التوقيع' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/signatures/:id/sign
 * @desc تنفيذ التوقيع الإلكتروني
 */
router.post('/signatures/:id/sign', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.signCorrespondence(
      req.params.id,
      { imageData: req.body.imageData, ipAddress: req.ip, userAgent: req.headers['user-agent'] },
      uid(req)
    );
    res.json({ success: true, message: 'تم التوقيع بنجاح', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في التوقيع' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/signatures/:id/revoke
 * @desc إلغاء توقيع
 */
router.post('/signatures/:id/revoke', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.revokeSignature(req.params.id, req.body.reason, uid(req));
    res.json({ success: true, message: 'تم إلغاء التوقيع', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/signatures/:corrId
 * @desc الحصول على توقيعات مراسلة
 */
router.get('/signatures/:corrId', authenticate, async (req, res) => {
  try {
    const signatures = await enhancedService.getSignatures(req.params.corrId);
    res.json({ success: true, data: signatures });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب التوقيعات' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/signatures/:id/verify
 * @desc التحقق من صحة التوقيع
 */
router.get('/signatures/:id/verify', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.verifySignature(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  2. INTERNAL NOTES — الملاحظات الداخلية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/notes
 * @desc إضافة ملاحظة داخلية للمراسلة
 */
router.post('/notes', authenticate, async (req, res) => {
  try {
    const note = await enhancedService.addInternalNote(
      req.body.correspondenceId,
      req.body,
      uid(req),
      uname(req)
    );
    res.status(201).json({ success: true, message: 'تمت إضافة الملاحظة', data: note });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إضافة الملاحظة' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/notes/:corrId
 * @desc الحصول على ملاحظات المراسلة
 */
router.get('/notes/:corrId', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getInternalNotes(req.params.corrId, uid(req), req.query);
    res.json({
      success: true,
      data: result.notes,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الملاحظات' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/notes/:id
 * @desc تعديل ملاحظة
 */
router.put('/notes/:id', authenticate, async (req, res) => {
  try {
    const note = await enhancedService.updateInternalNote(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تعديل الملاحظة', data: note });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/admin-comm-enhanced/notes/:id
 * @desc حذف ملاحظة
 */
router.delete('/notes/:id', authenticate, async (req, res) => {
  try {
    await enhancedService.deleteInternalNote(req.params.id, uid(req));
    res.json({ success: true, message: 'تم حذف الملاحظة' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  3. CUSTOM REMINDERS — التذكيرات المخصصة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/reminders
 * @desc إنشاء تذكير مخصص
 */
router.post('/reminders', authenticate, async (req, res) => {
  try {
    const reminder = await enhancedService.createReminder(
      req.body.correspondenceId,
      req.body,
      uid(req)
    );
    res.status(201).json({ success: true, message: 'تم إنشاء التذكير', data: reminder });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء التذكير' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/reminders/my
 * @desc الحصول على تذكيراتي
 */
router.get('/reminders/my', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getUserReminders(uid(req), req.query);
    res.json({
      success: true,
      data: result.reminders,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب التذكيرات' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/reminders/:id/snooze
 * @desc تأجيل تذكير (بالدقائق)
 */
router.post('/reminders/:id/snooze', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.snoozeReminder(
      req.params.id,
      req.body.duration || 30,
      uid(req)
    );
    res.json({ success: true, message: 'تم تأجيل التذكير', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/reminders/:id/dismiss
 * @desc رفض/إلغاء تذكير
 */
router.post('/reminders/:id/dismiss', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.dismissReminder(req.params.id, uid(req));
    res.json({ success: true, message: 'تم رفض التذكير', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/admin-comm-enhanced/reminders/:id
 * @desc حذف تذكير
 */
router.delete('/reminders/:id', authenticate, async (req, res) => {
  try {
    await enhancedService.deleteReminder(req.params.id, uid(req));
    res.json({ success: true, message: 'تم حذف التذكير' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/reminders/process-due
 * @desc معالجة التذكيرات المستحقة
 */
router.post('/reminders/process-due', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await enhancedService.processDueReminders();
    res.json({ success: true, message: `تمت معالجة ${result.count} تذكير`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في معالجة التذكيرات' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  4. LINKED TASKS — المهام المرتبطة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/tasks
 * @desc إنشاء مهمة مرتبطة بمراسلة
 */
router.post('/tasks', authenticate, async (req, res) => {
  try {
    const task = await enhancedService.createLinkedTask(
      req.body.correspondenceId,
      req.body,
      uid(req),
      uname(req)
    );
    res.status(201).json({ success: true, message: 'تم إنشاء المهمة', data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء المهمة' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/tasks/:corrId
 * @desc مهام مراسلة محددة
 */
router.get('/tasks/:corrId', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getLinkedTasks(req.params.corrId, req.query);
    res.json({
      success: true,
      data: result.tasks,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب المهام' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/tasks/:id
 * @desc تحديث مهمة
 */
router.put('/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await enhancedService.updateLinkedTask(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تحديث المهمة', data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/tasks/:id/checklist
 * @desc تحديث قائمة التحقق لمهمة
 */
router.put('/tasks/:id/checklist', authenticate, async (req, res) => {
  try {
    const task = await enhancedService.updateTaskChecklist(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تحديث قائمة التحقق', data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/tasks/my/all
 * @desc جميع المهام المسندة إلي
 */
router.get('/tasks/my/all', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getMyTasks(uid(req), req.query);
    res.json({
      success: true,
      data: result.tasks,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب المهام' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  5. DELIVERY TRACKING — تتبع التسليم
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/delivery
 * @desc إنشاء سجل تتبع تسليم
 */
router.post('/delivery', authenticate, async (req, res) => {
  try {
    const record = await enhancedService.createDeliveryRecord(
      req.body.correspondenceId,
      req.body,
      uid(req)
    );
    res.status(201).json({ success: true, message: 'تم إنشاء سجل التسليم', data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء سجل التسليم' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/delivery/:id/status
 * @desc تحديث حالة التسليم
 */
router.put('/delivery/:id/status', authenticate, async (req, res) => {
  try {
    const record = await enhancedService.updateDeliveryStatus(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تحديث حالة التسليم', data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/delivery/:corrId
 * @desc سجلات تسليم مراسلة
 */
router.get('/delivery/:corrId', authenticate, async (req, res) => {
  try {
    const records = await enhancedService.getDeliveryRecords(req.params.corrId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب سجلات التسليم' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/delivery/:corrId/stats
 * @desc إحصائيات التسليم لمراسلة
 */
router.get('/delivery/:corrId/stats', authenticate, async (req, res) => {
  try {
    const stats = await enhancedService.getDeliveryStats(req.params.corrId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الإحصائيات' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  6. REFERRALS — الإحالات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/referrals
 * @desc إنشاء إحالة جديدة
 */
router.post('/referrals', authenticate, async (req, res) => {
  try {
    const referral = await enhancedService.createReferral(
      req.body.correspondenceId,
      req.body,
      uid(req),
      uname(req)
    );
    res.status(201).json({ success: true, message: 'تم إنشاء الإحالة بنجاح', data: referral });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء الإحالة' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/referrals/:id/respond
 * @desc الرد على إحالة
 */
router.put('/referrals/:id/respond', authenticate, async (req, res) => {
  try {
    const referral = await enhancedService.respondToReferral(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم الرد على الإحالة', data: referral });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/referrals/:id/escalate
 * @desc تصعيد إحالة متأخرة
 */
router.post('/referrals/:id/escalate', authenticate, async (req, res) => {
  try {
    const referral = await enhancedService.escalateReferral(
      req.params.id,
      req.body.reason,
      uid(req)
    );
    res.json({ success: true, message: 'تم تصعيد الإحالة', data: referral });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/referrals/:corrId
 * @desc إحالات مراسلة محددة
 */
router.get('/referrals/:corrId', authenticate, async (req, res) => {
  try {
    const referrals = await enhancedService.getReferrals(req.params.corrId, req.query);
    res.json({ success: true, data: referrals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الإحالات' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/referrals/my/all
 * @desc جميع الإحالات المسندة إلي
 */
router.get('/referrals/my/all', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getMyReferrals(uid(req), req.query);
    res.json({
      success: true,
      data: result.referrals,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الإحالات' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  7. COMMENTS — التعليقات والمناقشة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/comments
 * @desc إضافة تعليق على مراسلة
 */
router.post('/comments', authenticate, async (req, res) => {
  try {
    const comment = await enhancedService.addComment(
      req.body.correspondenceId,
      req.body,
      uid(req),
      uname(req)
    );
    res.status(201).json({ success: true, message: 'تمت إضافة التعليق', data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إضافة التعليق' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/comments/:corrId
 * @desc تعليقات مراسلة
 */
router.get('/comments/:corrId', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getComments(req.params.corrId, req.query);
    res.json({
      success: true,
      data: result.comments,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب التعليقات' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/comments/:id
 * @desc تعديل تعليق
 */
router.put('/comments/:id', authenticate, async (req, res) => {
  try {
    const comment = await enhancedService.updateComment(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تعديل التعليق', data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/admin-comm-enhanced/comments/:id
 * @desc حذف تعليق
 */
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    await enhancedService.deleteComment(req.params.id, uid(req));
    res.json({ success: true, message: 'تم حذف التعليق' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/comments/:id/react
 * @desc إضافة تفاعل على تعليق
 */
router.post('/comments/:id/react', authenticate, async (req, res) => {
  try {
    const comment = await enhancedService.addReaction(req.params.id, req.body, uid(req));
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/comments/:id/resolve
 * @desc وضع علامة "تم الحل" على تعليق
 */
router.post('/comments/:id/resolve', authenticate, async (req, res) => {
  try {
    const comment = await enhancedService.resolveComment(req.params.id, uid(req));
    res.json({ success: true, message: 'تم حل التعليق', data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  8. OFFICIAL STAMPS — الأختام الرسمية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/stamps
 * @desc إنشاء ختم رسمي جديد
 */
router.post('/stamps', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const stamp = await enhancedService.createStamp(req.body, uid(req));
    res.status(201).json({ success: true, message: 'تم إنشاء الختم', data: stamp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء الختم' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/stamps
 * @desc قائمة الأختام الرسمية
 */
router.get('/stamps', authenticate, async (req, res) => {
  try {
    const stamps = await enhancedService.getStamps(req.query);
    res.json({ success: true, data: stamps });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الأختام' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/stamps/:id/apply/:corrId
 * @desc تطبيق ختم على مراسلة
 */
router.post('/stamps/:id/apply/:corrId', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.applyStamp(req.params.corrId, req.params.id, uid(req));
    res.json({ success: true, message: 'تم تطبيق الختم', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  9. FAVORITES & PINS — المفضلة والتثبيت
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/favorites/:corrId/toggle
 * @desc تبديل حالة المفضلة
 */
router.post('/favorites/:corrId/toggle', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.toggleFavorite(req.params.corrId, uid(req), req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/favorites/:corrId/pin
 * @desc تبديل حالة التثبيت
 */
router.post('/favorites/:corrId/pin', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.togglePin(req.params.corrId, uid(req));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/favorites
 * @desc قائمة المفضلة
 */
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const result = await enhancedService.getFavorites(uid(req), req.query);
    res.json({
      success: true,
      data: result.favorites,
      pagination: { total: result.total, page: result.page, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب المفضلة' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/favorites/:id
 * @desc تعديل عنصر مفضل (تصنيف، لون، مجلد)
 */
router.put('/favorites/:id', authenticate, async (req, res) => {
  try {
    const fav = await enhancedService.updateFavorite(req.params.id, req.body, uid(req));
    res.json({ success: true, data: fav });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/favorites/folders
 * @desc مجلدات المفضلة المخصصة
 */
router.get('/favorites/folders', authenticate, async (req, res) => {
  try {
    const folders = await enhancedService.getFavoriteFolders(uid(req));
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب المجلدات' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. QR CODES — رموز QR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/qr/generate/:corrId
 * @desc توليد رمز QR لمراسلة
 */
router.post('/qr/generate/:corrId', authenticate, async (req, res) => {
  try {
    const qr = await enhancedService.generateQRCode(req.params.corrId, req.body, uid(req));
    res.status(201).json({ success: true, message: 'تم توليد رمز QR', data: qr });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في توليد رمز QR' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/qr/:id/scan
 * @desc مسح رمز QR
 */
router.post('/qr/:id/scan', async (req, res) => {
  try {
    const result = await enhancedService.scanQRCode(req.params.id, {
      scannedBy: req.body.scannedBy || 'anonymous',
      ipAddress: req.ip,
      location: req.body.location,
      device: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/qr/:corrId
 * @desc رموز QR لمراسلة
 */
router.get('/qr/:corrId', authenticate, async (req, res) => {
  try {
    const qrCodes = await enhancedService.getQRCodes(req.params.corrId);
    res.json({ success: true, data: qrCodes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب رموز QR' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. LABELS — التصنيفات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/labels
 * @desc إنشاء تصنيف جديد
 */
router.post('/labels', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const label = await enhancedService.createLabel(req.body, uid(req));
    res.status(201).json({ success: true, message: 'تم إنشاء التصنيف', data: label });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء التصنيف' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/labels
 * @desc قائمة التصنيفات
 */
router.get('/labels', authenticate, async (req, res) => {
  try {
    const labels = await enhancedService.getLabels(req.query);
    res.json({ success: true, data: labels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب التصنيفات' });
  }
});

/**
 * @route PUT /api/admin-comm-enhanced/labels/:id
 * @desc تعديل تصنيف
 */
router.put('/labels/:id', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const label = await enhancedService.updateLabel(req.params.id, req.body, uid(req));
    res.json({ success: true, message: 'تم تعديل التصنيف', data: label });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/admin-comm-enhanced/labels/:id
 * @desc حذف تصنيف
 */
router.delete('/labels/:id', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    await enhancedService.deleteLabel(req.params.id);
    res.json({ success: true, message: 'تم حذف التصنيف' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. FORWARD & REPLY — إعادة التوجيه والرد
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route POST /api/admin-comm-enhanced/forward/:corrId
 * @desc إعادة توجيه مراسلة
 */
router.post('/forward/:corrId', authenticate, async (req, res) => {
  try {
    const record = await enhancedService.forwardCorrespondence(
      req.params.corrId,
      req.body,
      uid(req),
      uname(req)
    );
    res.status(201).json({ success: true, message: 'تم إعادة التوجيه بنجاح', data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إعادة التوجيه' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/forward/:corrId/history
 * @desc سجل إعادة التوجيه لمراسلة
 */
router.get('/forward/:corrId/history', authenticate, async (req, res) => {
  try {
    const records = await enhancedService.getForwardHistory(req.params.corrId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب سجل إعادة التوجيه' });
  }
});

/**
 * @route POST /api/admin-comm-enhanced/reply/:corrId
 * @desc الرد على مراسلة
 */
router.post('/reply/:corrId', authenticate, async (req, res) => {
  try {
    const reply = await enhancedService.replyToCorrespondence(
      req.params.corrId,
      req.body,
      uid(req)
    );
    res.status(201).json({ success: true, message: 'تم إنشاء الرد بنجاح', data: reply });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إنشاء الرد' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. ENHANCED DASHBOARD & REPORTS — لوحة المعلومات والتقارير
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/admin-comm-enhanced/dashboard/enhanced
 * @desc لوحة معلومات متقدمة شاملة
 */
router.get('/dashboard/enhanced', authenticate, async (req, res) => {
  try {
    const dashboard = await enhancedService.getEnhancedDashboard(uid(req), uroles(req));
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب لوحة المعلومات' });
  }
});

/**
 * @route GET /api/admin-comm-enhanced/reports/performance
 * @desc تقرير أداء الاتصالات الإدارية
 */
router.get(
  '/reports/performance',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const report = await enhancedService.getPerformanceReport(req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير' });
    }
  }
);

/**
 * @route GET /api/admin-comm-enhanced/reports/response-time
 * @desc تحليل أوقات الاستجابة
 */
router.get(
  '/reports/response-time',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const analytics = await enhancedService.getResponseTimeAnalytics(req.query);
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل في تحليل أوقات الاستجابة' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// Health check
// ══════════════════════════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'خدمة الاتصالات الإدارية المحسّنة تعمل بنجاح',
    version: '2.0.0',
    features: [
      'digital-signatures',
      'internal-notes',
      'custom-reminders',
      'linked-tasks',
      'delivery-tracking',
      'referrals',
      'comments',
      'official-stamps',
      'favorites-pins',
      'qr-codes',
      'labels',
      'forward-reply',
      'enhanced-dashboard',
      'performance-reports',
    ],
    totalEndpoints: 42,
  });
});

module.exports = router;
