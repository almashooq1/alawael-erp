/* eslint-disable no-unused-vars */
/**
 * WhatsApp Enhanced Routes - مسارات متقدمة لنظام الوتساب
 * =====================================================
 * 60+ endpoints للميزات المتقدمة:
 *
 * /chatbot         - الشات بوت والردود التلقائية (10 endpoints)
 * /scheduled       - الرسائل المجدولة (7 endpoints)
 * /campaigns       - الحملات التسويقية (9 endpoints)
 * /contacts        - إدارة جهات الاتصال (12 endpoints)
 * /groups          - المجموعات (6 endpoints)
 * /labels          - الملصقات (6 endpoints)
 * /quick-replies   - الردود السريعة (6 endpoints)
 * /auto-assign     - التعيين التلقائي (5 endpoints)
 * /surveys         - استطلاعات الرأي (8 endpoints)
 * /flows           - سير العمل (7 endpoints)
 * /analytics       - التحليلات المتقدمة (5 endpoints)
 * /blacklist       - القائمة السوداء (4 endpoints)
 * /preferences     - تفضيلات الإشعارات (2 endpoints)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const {
  ChatbotEngine,
  MessageScheduler,
  CampaignManager,
  ContactManager,
  QuickReplyManager,
  AutoAssignmentEngine,
  SurveyManager,
  FlowEngine,
  AnalyticsEngine,
  NotificationPreferenceManager,
} = require('./whatsapp-enhanced-service');

// Safe rate limiter fallback
const apiLimiter = rateLimiter.apiLimiter || rateLimiter.generalLimiter;

// ── Helper: extract tenantId from user ──
const getTenantId = req =>
  req.user?.tenantId ||
  req.user?.tenant ||
  req.user?.organizationId ||
  req.user?.userId ||
  req.user?._id ||
  req.user?.id;

// ── Async wrapper ──
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════════
// CHATBOT - الشات بوت والردود التلقائية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/chatbot/rules
 * @desc    قائمة قواعد الشات بوت
 */
router.get(
  '/chatbot/rules',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const rules = await ChatbotEngine.getRules(tenantId, req.query);
    res.json({ success: true, data: rules, count: rules.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/chatbot/rules
 * @desc    إنشاء قاعدة شات بوت جديدة
 */
router.post(
  '/chatbot/rules',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const rule = await ChatbotEngine.createRule({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: rule, message: 'تم إنشاء قاعدة الشات بوت بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/chatbot/rules/:id
 * @desc    تفاصيل قاعدة
 */
router.get(
  '/chatbot/rules/:id',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const rule = await ChatbotEngine.getRuleById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, error: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/chatbot/rules/:id
 * @desc    تحديث قاعدة
 */
router.put(
  '/chatbot/rules/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const rule = await ChatbotEngine.updateRule(req.params.id, {
      ...req.body,
      updatedBy: req.user.userId || req.user._id || req.user.id,
    });
    if (!rule) return res.status(404).json({ success: false, error: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule, message: 'تم تحديث القاعدة بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/chatbot/rules/:id
 * @desc    حذف قاعدة
 */
router.delete(
  '/chatbot/rules/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await ChatbotEngine.deleteRule(req.params.id);
    res.json({ success: true, message: 'تم حذف القاعدة بنجاح' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/chatbot/rules/:id/toggle
 * @desc    تفعيل/تعطيل قاعدة
 */
router.patch(
  '/chatbot/rules/:id/toggle',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const rule = await ChatbotEngine.toggleRule(req.params.id);
    if (!rule) return res.status(404).json({ success: false, error: 'القاعدة غير موجودة' });
    res.json({
      success: true,
      data: rule,
      message: rule.isActive ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة',
    });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/chatbot/process
 * @desc    اختبار معالجة رسالة عبر الشات بوت
 */
router.post(
  '/chatbot/process',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const { phone, message } = req.body;
    const tenantId = getTenantId(req);
    const result = await ChatbotEngine.processIncomingMessage(tenantId, phone, message);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/chatbot/sessions
 * @desc    جلسات الشات بوت النشطة
 */
router.get(
  '/chatbot/sessions',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const sessions = await ChatbotEngine.getSessions(tenantId, req.query);
    res.json({ success: true, data: sessions, count: sessions.length });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/chatbot/stats
 * @desc    إحصائيات الشات بوت
 */
router.get(
  '/chatbot/stats',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const stats = await ChatbotEngine.getSessionStats(tenantId);
    res.json({ success: true, data: stats });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/chatbot/test
 * @desc    اختبار قاعدة شات بوت محددة
 */
router.post(
  '/chatbot/test',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const { ruleId, message } = req.body;
    const rule = await ChatbotEngine.getRuleById(ruleId);
    if (!rule) return res.status(404).json({ success: false, error: 'القاعدة غير موجودة' });

    const matched = ChatbotEngine._matchesRule(rule, message);
    res.json({
      success: true,
      data: {
        matched,
        rule: rule.name,
        matchType: rule.matchType,
        patterns: rule.patterns,
        message,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED MESSAGES - الرسائل المجدولة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/scheduled
 * @desc    قائمة الرسائل المجدولة
 */
router.get(
  '/scheduled',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const messages = await MessageScheduler.getAll(tenantId, req.query);
    res.json({ success: true, data: messages, count: messages.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/scheduled
 * @desc    جدولة رسالة جديدة
 */
router.post(
  '/scheduled',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const message = await MessageScheduler.create({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({
      success: true,
      data: message,
      message: 'تم جدولة الرسالة بنجاح',
    });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/scheduled/:id
 * @desc    تفاصيل رسالة مجدولة
 */
router.get(
  '/scheduled/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const message = await MessageScheduler.getById(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, data: message });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/scheduled/:id
 * @desc    تحديث رسالة مجدولة
 */
router.put(
  '/scheduled/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const message = await MessageScheduler.update(req.params.id, req.body);
    if (!message) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, data: message, message: 'تم تحديث الرسالة بنجاح' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/scheduled/:id/cancel
 * @desc    إلغاء رسالة مجدولة
 */
router.patch(
  '/scheduled/:id/cancel',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const message = await MessageScheduler.cancel(
      req.params.id,
      req.user.userId || req.user._id || req.user.id
    );
    if (!message) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, data: message, message: 'تم إلغاء الرسالة بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/scheduled/:id
 * @desc    حذف رسالة مجدولة
 */
router.delete(
  '/scheduled/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await MessageScheduler.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/scheduled/stats/summary
 * @desc    إحصائيات الرسائل المجدولة
 */
router.get(
  '/scheduled/stats/summary',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const stats = await MessageScheduler.getStats(tenantId);
    res.json({ success: true, data: stats });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS - الحملات التسويقية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/campaigns
 * @desc    قائمة الحملات
 */
router.get(
  '/campaigns',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const campaigns = await CampaignManager.getAll(tenantId, req.query);
    res.json({ success: true, data: campaigns, count: campaigns.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/campaigns
 * @desc    إنشاء حملة جديدة
 */
router.post(
  '/campaigns',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const campaign = await CampaignManager.create({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'تم إنشاء الحملة بنجاح',
    });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/campaigns/:id
 * @desc    تفاصيل حملة
 */
router.get(
  '/campaigns/:id',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.getById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'الحملة غير موجودة' });
    res.json({ success: true, data: campaign });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/campaigns/:id
 * @desc    تحديث حملة
 */
router.put(
  '/campaigns/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.update(req.params.id, {
      ...req.body,
      updatedBy: req.user.userId || req.user._id || req.user.id,
    });
    if (!campaign) return res.status(404).json({ success: false, error: 'الحملة غير موجودة' });
    res.json({ success: true, data: campaign, message: 'تم تحديث الحملة بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/campaigns/:id
 * @desc    حذف حملة
 */
router.delete(
  '/campaigns/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await CampaignManager.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف الحملة بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/campaigns/:id/launch
 * @desc    تشغيل حملة
 */
router.post(
  '/campaigns/:id/launch',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.launch(req.params.id);
    res.json({ success: true, data: campaign, message: 'تم تشغيل الحملة بنجاح' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/campaigns/:id/pause
 * @desc    إيقاف حملة مؤقتاً
 */
router.patch(
  '/campaigns/:id/pause',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.pause(req.params.id);
    res.json({ success: true, data: campaign, message: 'تم إيقاف الحملة مؤقتاً' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/campaigns/:id/resume
 * @desc    استئناف حملة
 */
router.patch(
  '/campaigns/:id/resume',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.resume(req.params.id);
    res.json({ success: true, data: campaign, message: 'تم استئناف الحملة' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/campaigns/:id/duplicate
 * @desc    نسخ حملة
 */
router.post(
  '/campaigns/:id/duplicate',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const campaign = await CampaignManager.duplicate(req.params.id);
    res.json({ success: true, data: campaign, message: 'تم نسخ الحملة بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/campaigns/stats/summary
 * @desc    إحصائيات الحملات
 */
router.get(
  '/campaigns/stats/summary',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const stats = await CampaignManager.getStats(tenantId);
    res.json({ success: true, data: stats });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS - إدارة جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/contacts
 * @desc    قائمة جهات الاتصال
 */
router.get(
  '/contacts',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const result = await ContactManager.getContacts(tenantId, req.query);
    res.json({ success: true, ...result });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/contacts
 * @desc    إنشاء جهة اتصال
 */
router.post(
  '/contacts',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const contact = await ContactManager.createContact({ ...req.body, tenantId });
    res.status(201).json({ success: true, data: contact, message: 'تم إنشاء جهة الاتصال بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/contacts/stats
 * @desc    إحصائيات جهات الاتصال
 */
router.get(
  '/contacts/stats',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const stats = await ContactManager.getContactStats(tenantId);
    res.json({ success: true, data: stats });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/contacts/phone/:phone
 * @desc    البحث بالرقم
 */
router.get(
  '/contacts/phone/:phone',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const contact = await ContactManager.getContactByPhone(tenantId, req.params.phone);
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, data: contact });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/contacts/:id
 * @desc    تحديث جهة اتصال
 */
router.put(
  '/contacts/:id',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const contact = await ContactManager.updateContact(req.params.id, req.body);
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, data: contact, message: 'تم تحديث جهة الاتصال بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/contacts/:id
 * @desc    حذف جهة اتصال
 */
router.delete(
  '/contacts/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await ContactManager.deleteContact(req.params.id);
    res.json({ success: true, message: 'تم حذف جهة الاتصال بنجاح' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/contacts/:id/tag
 * @desc    إضافة تصنيف
 */
router.patch(
  '/contacts/:id/tag',
  authenticate,
  asyncHandler(async (req, res) => {
    const { tag } = req.body;
    const contact = await ContactManager.addTag(req.params.id, tag);
    res.json({ success: true, data: contact });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/contacts/:id/tag/:tag
 * @desc    إزالة تصنيف
 */
router.delete(
  '/contacts/:id/tag/:tag',
  authenticate,
  asyncHandler(async (req, res) => {
    const contact = await ContactManager.removeTag(req.params.id, req.params.tag);
    res.json({ success: true, data: contact });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/contacts/:id/notes
 * @desc    إضافة ملاحظة
 */
router.post(
  '/contacts/:id/notes',
  authenticate,
  asyncHandler(async (req, res) => {
    const contact = await ContactManager.addNote(
      req.params.id,
      req.body.text,
      req.user.userId || req.user._id || req.user.id
    );
    res.json({ success: true, data: contact, message: 'تم إضافة الملاحظة بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/contacts/:id/block
 * @desc    حظر جهة اتصال
 */
router.post(
  '/contacts/:id/block',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const contact = await ContactManager.updateContact(req.params.id, {});
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    await ContactManager.blockContact(
      tenantId,
      contact.phone,
      req.body.reason || 'حظر يدوي',
      req.user.userId || req.user._id || req.user.id
    );
    res.json({ success: true, message: 'تم حظر جهة الاتصال بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/contacts/:id/unblock
 * @desc    إلغاء حظر جهة اتصال
 */
router.post(
  '/contacts/:id/unblock',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const contact = await ContactManager.updateContact(req.params.id, {});
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    await ContactManager.unblockContact(tenantId, contact.phone);
    res.json({ success: true, message: 'تم إلغاء حظر جهة الاتصال بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/contacts/import
 * @desc    استيراد جهات اتصال (batch)
 */
router.post(
  '/contacts/import',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'يجب إرسال مصفوفة contacts' });
    }
    const result = await ContactManager.importContacts(
      tenantId,
      contacts,
      req.user.userId || req.user._id || req.user.id
    );
    res.json({ success: true, data: result, message: 'تم الاستيراد بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS - المجموعات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/groups
 * @desc    قائمة المجموعات
 */
router.get(
  '/groups',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const groups = await ContactManager.getGroups(tenantId);
    res.json({ success: true, data: groups, count: groups.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/groups
 * @desc    إنشاء مجموعة
 */
router.post(
  '/groups',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const group = await ContactManager.createGroup({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: group, message: 'تم إنشاء المجموعة بنجاح' });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/groups/:id
 * @desc    تحديث مجموعة
 */
router.put(
  '/groups/:id',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const group = await ContactManager.updateGroup(req.params.id, req.body);
    if (!group) return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    res.json({ success: true, data: group, message: 'تم تحديث المجموعة بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/groups/:id
 * @desc    حذف مجموعة
 */
router.delete(
  '/groups/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await ContactManager.deleteGroup(req.params.id);
    res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/groups/:id/members
 * @desc    إضافة عضو للمجموعة
 */
router.post(
  '/groups/:id/members',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const group = await ContactManager.addMemberToGroup(req.params.id, {
      phone: req.body.phone,
      name: req.body.name,
      addedBy: req.user.userId || req.user._id || req.user.id,
    });
    if (!group) return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    res.json({ success: true, data: group, message: 'تم إضافة العضو بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/groups/:id/members/:phone
 * @desc    إزالة عضو من المجموعة
 */
router.delete(
  '/groups/:id/members/:phone',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const group = await ContactManager.removeMemberFromGroup(req.params.id, req.params.phone);
    if (!group) return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    res.json({ success: true, data: group, message: 'تم إزالة العضو بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// LABELS - الملصقات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/labels
 * @desc    قائمة الملصقات
 */
router.get(
  '/labels',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const labels = await ContactManager.getLabels(tenantId);
    res.json({ success: true, data: labels, count: labels.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/labels
 * @desc    إنشاء ملصق
 */
router.post(
  '/labels',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const label = await ContactManager.createLabel({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: label, message: 'تم إنشاء الملصق بنجاح' });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/labels/:id
 * @desc    تحديث ملصق
 */
router.put(
  '/labels/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const label = await ContactManager.updateLabel(req.params.id, req.body);
    if (!label) return res.status(404).json({ success: false, error: 'الملصق غير موجود' });
    res.json({ success: true, data: label, message: 'تم تحديث الملصق بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/labels/:id
 * @desc    حذف ملصق
 */
router.delete(
  '/labels/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await ContactManager.deleteLabel(req.params.id);
    res.json({ success: true, message: 'تم حذف الملصق بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/labels/:labelId/assign/:contactId
 * @desc    ربط ملصق بجهة اتصال
 */
router.post(
  '/labels/:labelId/assign/:contactId',
  authenticate,
  asyncHandler(async (req, res) => {
    await ContactManager.assignLabel(req.params.contactId, req.params.labelId);
    res.json({ success: true, message: 'تم ربط الملصق بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/labels/:labelId/assign/:contactId
 * @desc    إزالة ملصق من جهة اتصال
 */
router.delete(
  '/labels/:labelId/assign/:contactId',
  authenticate,
  asyncHandler(async (req, res) => {
    await ContactManager.removeLabel(req.params.contactId, req.params.labelId);
    res.json({ success: true, message: 'تم إزالة الملصق بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK REPLIES - الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/quick-replies
 * @desc    قائمة الردود السريعة
 */
router.get(
  '/quick-replies',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const replies = await QuickReplyManager.getAll(tenantId, req.query);
    res.json({ success: true, data: replies, count: replies.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/quick-replies
 * @desc    إنشاء رد سريع
 */
router.post(
  '/quick-replies',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const reply = await QuickReplyManager.create({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: reply, message: 'تم إنشاء الرد السريع بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/quick-replies/:id
 * @desc    تفاصيل رد سريع
 */
router.get(
  '/quick-replies/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const reply = await QuickReplyManager.getById(req.params.id);
    if (!reply) return res.status(404).json({ success: false, error: 'الرد السريع غير موجود' });
    res.json({ success: true, data: reply });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/quick-replies/:id
 * @desc    تحديث رد سريع
 */
router.put(
  '/quick-replies/:id',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const reply = await QuickReplyManager.update(req.params.id, req.body);
    if (!reply) return res.status(404).json({ success: false, error: 'الرد السريع غير موجود' });
    res.json({ success: true, data: reply, message: 'تم تحديث الرد السريع بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/quick-replies/:id
 * @desc    حذف رد سريع
 */
router.delete(
  '/quick-replies/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await QuickReplyManager.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف الرد السريع بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/quick-replies/send
 * @desc    إرسال رد سريع لرقم معين
 */
router.post(
  '/quick-replies/send',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { shortcut, phone, variables } = req.body;
    if (!shortcut || !phone) {
      return res.status(400).json({ success: false, error: 'shortcut و phone مطلوبان' });
    }
    const result = await QuickReplyManager.sendQuickReply(tenantId, shortcut, phone, variables);
    res.json({ success: true, data: result, message: 'تم إرسال الرد السريع بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-ASSIGNMENT - التعيين التلقائي
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/auto-assign/rules
 * @desc    قائمة قواعد التعيين
 */
router.get(
  '/auto-assign/rules',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const rules = await AutoAssignmentEngine.getRules(tenantId);
    res.json({ success: true, data: rules, count: rules.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/auto-assign/rules
 * @desc    إنشاء قاعدة تعيين
 */
router.post(
  '/auto-assign/rules',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const rule = await AutoAssignmentEngine.createRule({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: rule, message: 'تم إنشاء قاعدة التعيين بنجاح' });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/auto-assign/rules/:id
 * @desc    تحديث قاعدة تعيين
 */
router.put(
  '/auto-assign/rules/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const rule = await AutoAssignmentEngine.update(req.params.id, req.body);
    if (!rule) return res.status(404).json({ success: false, error: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule, message: 'تم تحديث القاعدة بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/auto-assign/rules/:id
 * @desc    حذف قاعدة تعيين
 */
router.delete(
  '/auto-assign/rules/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await AutoAssignmentEngine.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف القاعدة بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/auto-assign/test
 * @desc    اختبار التعيين التلقائي
 */
router.post(
  '/auto-assign/test',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { conversationId, messageText, contactTags } = req.body;
    const result = await AutoAssignmentEngine.assignConversation(
      tenantId,
      conversationId,
      messageText,
      contactTags
    );
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SURVEYS - استطلاعات الرأي
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/surveys
 * @desc    قائمة الاستطلاعات
 */
router.get(
  '/surveys',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const surveys = await SurveyManager.getAll(tenantId, req.query);
    res.json({ success: true, data: surveys, count: surveys.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/surveys
 * @desc    إنشاء استطلاع
 */
router.post(
  '/surveys',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const survey = await SurveyManager.create({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: survey, message: 'تم إنشاء الاستطلاع بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/surveys/:id
 * @desc    تفاصيل استطلاع
 */
router.get(
  '/surveys/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const survey = await SurveyManager.getById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, error: 'الاستطلاع غير موجود' });
    res.json({ success: true, data: survey });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/surveys/:id
 * @desc    تحديث استطلاع
 */
router.put(
  '/surveys/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const survey = await SurveyManager.update(req.params.id, req.body);
    if (!survey) return res.status(404).json({ success: false, error: 'الاستطلاع غير موجود' });
    res.json({ success: true, data: survey, message: 'تم تحديث الاستطلاع بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/surveys/:id
 * @desc    حذف استطلاع
 */
router.delete(
  '/surveys/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await SurveyManager.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف الاستطلاع بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/surveys/:id/launch
 * @desc    تشغيل استطلاع
 */
router.post(
  '/surveys/:id/launch',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const result = await SurveyManager.launch(req.params.id);
    res.json({ success: true, data: result, message: 'تم بدء الاستطلاع بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/surveys/:id/results
 * @desc    نتائج استطلاع
 */
router.get(
  '/surveys/:id/results',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const results = await SurveyManager.getResults(req.params.id);
    res.json({ success: true, data: results });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/surveys/:id/answer
 * @desc    تسجيل إجابة (يستخدمه webhook)
 */
router.post(
  '/surveys/:id/answer',
  asyncHandler(async (req, res) => {
    const { contactPhone, answer } = req.body;
    const result = await SurveyManager.processAnswer(req.params.id, contactPhone, answer);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// FLOWS - سير العمل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/flows
 * @desc    قائمة سير العمل
 */
router.get(
  '/flows',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const flows = await FlowEngine.getAll(tenantId);
    res.json({ success: true, data: flows, count: flows.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/flows
 * @desc    إنشاء سير عمل
 */
router.post(
  '/flows',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const flow = await FlowEngine.create({
      ...req.body,
      tenantId,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: flow, message: 'تم إنشاء سير العمل بنجاح' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/flows/:id
 * @desc    تفاصيل سير عمل
 */
router.get(
  '/flows/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const flow = await FlowEngine.getById(req.params.id);
    if (!flow) return res.status(404).json({ success: false, error: 'سير العمل غير موجود' });
    res.json({ success: true, data: flow });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/flows/:id
 * @desc    تحديث سير عمل
 */
router.put(
  '/flows/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const flow = await FlowEngine.update(req.params.id, {
      ...req.body,
      updatedBy: req.user.userId || req.user._id || req.user.id,
    });
    if (!flow) return res.status(404).json({ success: false, error: 'سير العمل غير موجود' });
    res.json({ success: true, data: flow, message: 'تم تحديث سير العمل بنجاح' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/flows/:id
 * @desc    حذف سير عمل
 */
router.delete(
  '/flows/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await FlowEngine.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف سير العمل بنجاح' });
  })
);

/**
 * @route   PATCH /api/whatsapp-enhanced/flows/:id/activate
 * @desc    تفعيل سير عمل
 */
router.patch(
  '/flows/:id/activate',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const flow = await FlowEngine.activate(req.params.id);
    if (!flow) return res.status(404).json({ success: false, error: 'سير العمل غير موجود' });
    res.json({ success: true, data: flow, message: 'تم تفعيل سير العمل بنجاح' });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/flows/:id/execute
 * @desc    تنفيذ سير عمل يدوياً
 */
router.post(
  '/flows/:id/execute',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const { contactPhone, triggerData } = req.body;
    if (!contactPhone) {
      return res.status(400).json({ success: false, error: 'contactPhone مطلوب' });
    }
    const result = await FlowEngine.execute(req.params.id, contactPhone, triggerData);
    res.json({ success: true, data: result, message: 'تم تنفيذ سير العمل بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS - التحليلات المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/analytics/dashboard
 * @desc    لوحة معلومات شاملة
 */
router.get(
  '/analytics/dashboard',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const dashboard = await AnalyticsEngine.getDashboard(tenantId);
    res.json({ success: true, data: dashboard });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/analytics/messages
 * @desc    تحليلات الرسائل حسب الفترة
 */
router.get(
  '/analytics/messages',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const { startDate, endDate } = req.query;
    const data = await AnalyticsEngine.getMessageAnalytics(
      tenantId,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date()
    );
    res.json({ success: true, data });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/analytics/templates
 * @desc    أداء القوالب
 */
router.get(
  '/analytics/templates',
  authenticate,
  authorize(['admin', 'system_admin', 'manager']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const data = await AnalyticsEngine.getTemplatePerformance(tenantId);
    res.json({ success: true, data });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/analytics/preferences
 * @desc    تحليلات تفضيلات الإشعارات
 */
router.get(
  '/analytics/preferences',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const data = await AnalyticsEngine.getNotificationPreferences(tenantId);
    res.json({ success: true, data });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/analytics/snapshot
 * @desc    إنشاء لقطة تحليلية يدوية
 */
router.post(
  '/analytics/snapshot',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const snapshot = await AnalyticsEngine.createDailySnapshot(tenantId);
    res.json({ success: true, data: snapshot, message: 'تم إنشاء اللقطة التحليلية بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// BLACKLIST - القائمة السوداء
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/blacklist
 * @desc    قائمة الأرقام المحظورة
 */
router.get(
  '/blacklist',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const list = await ContactManager.getBlacklist(tenantId);
    res.json({ success: true, data: list, count: list.length });
  })
);

/**
 * @route   POST /api/whatsapp-enhanced/blacklist
 * @desc    إضافة رقم للقائمة السوداء
 */
router.post(
  '/blacklist',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const entry = await ContactManager.addToBlacklist({
      ...req.body,
      tenantId,
      blockedBy: req.user.userId || req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: entry, message: 'تم إضافة الرقم للقائمة السوداء' });
  })
);

/**
 * @route   DELETE /api/whatsapp-enhanced/blacklist/:id
 * @desc    إزالة رقم من القائمة السوداء
 */
router.delete(
  '/blacklist/:id',
  authenticate,
  authorize(['admin', 'system_admin']),
  asyncHandler(async (req, res) => {
    await ContactManager.removeFromBlacklist(req.params.id);
    res.json({ success: true, message: 'تم إزالة الرقم من القائمة السوداء' });
  })
);

/**
 * @route   GET /api/whatsapp-enhanced/blacklist/check/:phone
 * @desc    التحقق إذا كان الرقم محظوراً
 */
router.get(
  '/blacklist/check/:phone',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const blocked = await ContactManager.isBlacklisted(tenantId, req.params.phone);
    res.json({ success: true, data: { phone: req.params.phone, blocked } });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCES - تفضيلات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/preferences/:phone
 * @desc    تفضيلات إشعارات جهة اتصال
 */
router.get(
  '/preferences/:phone',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const pref = await NotificationPreferenceManager.getPreference(tenantId, req.params.phone);
    res.json({ success: true, data: pref });
  })
);

/**
 * @route   PUT /api/whatsapp-enhanced/preferences/:phone
 * @desc    تحديث تفضيلات الإشعارات
 */
router.put(
  '/preferences/:phone',
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const pref = await NotificationPreferenceManager.updatePreference(
      tenantId,
      req.params.phone,
      req.body
    );
    res.json({ success: true, data: pref, message: 'تم تحديث التفضيلات بنجاح' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH & INFO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/whatsapp-enhanced/health
 * @desc    فحص صحة الخدمات المتقدمة
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'WhatsApp Enhanced Service',
    version: '2.0.0',
    features: [
      'chatbot',
      'scheduled-messages',
      'campaigns',
      'contacts',
      'groups',
      'labels',
      'quick-replies',
      'auto-assignment',
      'surveys',
      'flows',
      'analytics',
      'blacklist',
      'preferences',
    ],
    endpoints: 87,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/whatsapp-enhanced/features
 * @desc    قائمة الميزات المتاحة مع وصف
 */
router.get('/features', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'chatbot',
        name: 'الشات بوت والردود التلقائية',
        nameEn: 'Chatbot & Auto-Replies',
        description: 'محرك شات بوت ذكي مع تدفقات محادثة وأنماط مطابقة متعددة',
        endpoints: 10,
      },
      {
        id: 'scheduled',
        name: 'الرسائل المجدولة',
        nameEn: 'Scheduled Messages',
        description: 'جدولة الرسائل للإرسال في وقت لاحق مع دعم التكرار',
        endpoints: 7,
      },
      {
        id: 'campaigns',
        name: 'الحملات التسويقية',
        nameEn: 'Marketing Campaigns',
        description: 'إدارة حملات تسويقية مع A/B Testing وتتبع الأداء',
        endpoints: 9,
      },
      {
        id: 'contacts',
        name: 'إدارة جهات الاتصال',
        nameEn: 'Contact Management',
        description: 'إدارة شاملة لجهات الاتصال مع التصنيفات والملاحظات',
        endpoints: 12,
      },
      {
        id: 'groups',
        name: 'المجموعات',
        nameEn: 'Contact Groups',
        description: 'تنظيم جهات الاتصال في مجموعات للبث والحملات',
        endpoints: 6,
      },
      {
        id: 'labels',
        name: 'الملصقات',
        nameEn: 'Labels',
        description: 'تصنيف المحادثات وجهات الاتصال بملصقات ملونة',
        endpoints: 6,
      },
      {
        id: 'quick-replies',
        name: 'الردود السريعة',
        nameEn: 'Quick Replies / Canned Responses',
        description: 'ردود جاهزة مسبقاً مع دعم المتغيرات الديناميكية',
        endpoints: 6,
      },
      {
        id: 'auto-assign',
        name: 'التعيين التلقائي',
        nameEn: 'Auto-Assignment',
        description: 'توجيه المحادثات تلقائياً للموظفين حسب القواعد',
        endpoints: 5,
      },
      {
        id: 'surveys',
        name: 'استطلاعات الرأي',
        nameEn: 'Surveys & Polls',
        description: 'إنشاء وإرسال استطلاعات تفاعلية عبر الوتساب',
        endpoints: 8,
      },
      {
        id: 'flows',
        name: 'سير العمل',
        nameEn: 'Workflow Automation',
        description: 'تصميم وتنفيذ سير عمل آلي متعدد الخطوات',
        endpoints: 7,
      },
      {
        id: 'analytics',
        name: 'التحليلات المتقدمة',
        nameEn: 'Advanced Analytics',
        description: 'لوحة معلومات شاملة مع تحليلات الأداء والاتجاهات',
        endpoints: 5,
      },
      {
        id: 'blacklist',
        name: 'القائمة السوداء',
        nameEn: 'Blacklist Management',
        description: 'إدارة الأرقام المحظورة مع تصنيفات متعددة',
        endpoints: 4,
      },
      {
        id: 'preferences',
        name: 'تفضيلات الإشعارات',
        nameEn: 'Notification Preferences',
        description: 'إدارة تفضيلات الإشعارات لكل جهة اتصال',
        endpoints: 2,
      },
    ],
  });
});

// ── Error handler ──
router.use((err, req, res, _next) => {
  logger.error('WhatsApp Enhanced route error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'حدث خطأ داخلي في خدمة الوتساب المتقدمة',
  });
});

module.exports = router;
