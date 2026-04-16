/**
 * Communication Module Routes — مسارات وحدة التواصل
 * prompt_08: الوحدات التشغيلية — التواصل + الملفات + الفروع + المخزون + الجودة
 *
 * Base: /api/communication-module
 *
 * Endpoints:
 *   Announcements: GET / | POST / | GET /:id | PUT /:id | DELETE /:id | POST /:id/publish | POST /:id/read
 *   Messages:      GET /messages | POST /messages | GET /messages/:id | DELETE /messages/:id | POST /messages/:id/reply | GET /messages/inbox | GET /messages/sent | POST /messages/:id/mark-read
 *   Notifications: GET /notifications | PUT /notifications/:id/read | PUT /notifications/read-all | DELETE /notifications/:id | GET /notifications/unread-count
 *   Contacts:      GET /contacts | POST /contacts | GET /contacts/:id | PUT /contacts/:id | DELETE /contacts/:id
 */

const express = require('express');
const safeError = require('../utils/safeError');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// ─── Models ───────────────────────────────────────────────────────────────────
const Announcement = require('../models/communication/Announcement');
const InternalMessage = require('../models/communication/InternalMessage');
const NotificationLog = require('../models/communication/NotificationLog');
const ContactDirectory = require('../models/communication/ContactDirectory');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');

// ─── Middleware ───────────────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS — الإعلانات
// ══════════════════════════════════════════════════════════════

// GET /announcements
router.get('/announcements', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, is_published, search } = req.query;
    const filter = { deleted_at: null };
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (is_published !== undefined) filter.is_published = is_published === 'true';
    if (search)
      filter.$or = [
        { title_ar: { $regex: escapeRegex(search), $options: 'i' } },
        { title_en: { $regex: escapeRegex(search), $options: 'i' } },
      ];

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('created_by', 'name')
        .sort({ publish_at: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Announcement.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /announcements
router.post('/announcements', async (req, res) => {
  try {
    const announcement = await Announcement.create({ ...stripUpdateMeta(req.body), created_by: req.user._id });
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /announcements/:id
router.get('/announcements/:id', async (req, res) => {
  try {
    const ann = await Announcement.findOne({ _id: req.params.id, deleted_at: null }).populate(
      'created_by',
      'name'
    );
    if (!ann) return res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
    // زيادة عداد المشاهدات
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { views_count: 1 } });
    res.json({ success: true, data: ann });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /announcements/:id
router.put('/announcements/:id', async (req, res) => {
  try {
    const ann = await Announcement.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...stripUpdateMeta(req.body), updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!ann) return res.status(404).json({ success: false, error: 'الإعلان غير موجود' });
    res.json({ success: true, data: ann });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ success: true, message: 'تم حذف الإعلان' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /announcements/:id/publish
router.post('/announcements/:id/publish', async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(
      req.params.id,
      { is_published: true, published_at: new Date() },
      { new: true }
    );
    res.json({ success: true, data: ann, message: 'تم نشر الإعلان' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /announcements/:id/read — تسجيل قراءة
router.post('/announcements/:id/read', async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { reads_count: 1 } });
    res.json({ success: true, message: 'تم تسجيل القراءة' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════
// INTERNAL MESSAGES — الرسائل الداخلية
// ══════════════════════════════════════════════════════════════

// GET /messages/inbox
router.get('/messages/inbox', async (req, res) => {
  try {
    const { page = 1, limit = 25, is_read } = req.query;
    const filter = {
      'recipients.user_id': req.user._id,
      'recipients.is_deleted': { $ne: true },
      deleted_at: null,
    };
    if (is_read !== undefined) {
      filter['recipients'] = { $elemMatch: { user_id: req.user._id, is_read: is_read === 'true' } };
    }

    const messages = await InternalMessage.find(filter)
      .populate('sender_id', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await InternalMessage.countDocuments(filter);
    const unread = await InternalMessage.countDocuments({
      recipients: { $elemMatch: { user_id: req.user._id, is_read: false } },
      deleted_at: null,
    });

    res.json({
      success: true,
      data: messages,
      unread_count: unread,
      pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /messages/sent
router.get('/messages/sent', async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const messages = await InternalMessage.find({
      sender_id: req.user._id,
      is_draft: false,
      deleted_at: null,
    })
      .populate('recipients.user_id', 'name email')
      .sort({ sent_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await InternalMessage.countDocuments({
      sender_id: req.user._id,
      is_draft: false,
      deleted_at: null,
    });
    res.json({
      success: true,
      data: messages,
      pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /messages — إرسال رسالة
router.post('/messages', async (req, res) => {
  try {
    const { subject, body, recipient_ids, message_type, priority, attachments } = req.body;
    const recipients = (recipient_ids || []).map(uid => ({ user_id: uid, is_read: false }));

    const message = await InternalMessage.create({
      sender_id: req.user._id,
      recipients,
      subject,
      body,
      message_type,
      priority,
      attachments,
      is_draft: false,
      sent_at: new Date(),
      branch_id: req.user.branch_id,
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /messages/:id
router.get('/messages/:id', async (req, res) => {
  try {
    const message = await InternalMessage.findOne({ _id: req.params.id, deleted_at: null })
      .populate('sender_id', 'name email')
      .populate('recipients.user_id', 'name email');
    if (!message) return res.status(404).json({ success: false, error: 'الرسالة غير موجودة' });
    res.json({ success: true, data: message });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /messages/:id/mark-read
router.post('/messages/:id/mark-read', async (req, res) => {
  try {
    await InternalMessage.updateOne(
      { _id: req.params.id, 'recipients.user_id': req.user._id },
      { $set: { 'recipients.$.is_read': true, 'recipients.$.read_at': new Date() } }
    );
    res.json({ success: true, message: 'تم تعليم الرسالة كمقروءة' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /messages/:id/reply — الرد على رسالة
router.post('/messages/:id/reply', async (req, res) => {
  try {
    const original = await InternalMessage.findById(req.params.id);
    if (!original)
      return res.status(404).json({ success: false, error: 'الرسالة الأصلية غير موجودة' });

    const reply = await InternalMessage.create({
      sender_id: req.user._id,
      recipients: [{ user_id: original.sender_id, is_read: false }],
      subject: `رد: ${original.subject}`,
      body: req.body.body,
      parent_message_id: original._id,
      thread_id: original.thread_id || original._id,
      is_draft: false,
      sent_at: new Date(),
    });

    res.status(201).json({ success: true, data: reply });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /messages/:id
router.delete('/messages/:id', async (req, res) => {
  try {
    await InternalMessage.updateOne(
      { _id: req.params.id, 'recipients.user_id': req.user._id },
      { $set: { 'recipients.$.is_deleted': true } }
    );
    res.json({ success: true, message: 'تم حذف الرسالة من صندوقك' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS — الإشعارات
// ══════════════════════════════════════════════════════════════

// GET /notifications
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 30, status, notification_type } = req.query;
    const filter = { user_id: req.user._id, deleted_at: null };
    if (status) filter.status = status;
    if (notification_type) filter.notification_type = notification_type;

    const [notifications, total, unread] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      NotificationLog.countDocuments(filter),
      NotificationLog.countDocuments({
        user_id: req.user._id,
        status: { $ne: 'read' },
        deleted_at: null,
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unread_count: unread,
      pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /notifications/unread-count
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const count = await NotificationLog.countDocuments({
      user_id: req.user._id,
      status: { $ne: 'read' },
      deleted_at: null,
    });
    res.json({ success: true, unread_count: count });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await NotificationLog.findByIdAndUpdate(req.params.id, { status: 'read', read_at: new Date() });
    res.json({ success: true, message: 'تم تعليم الإشعار كمقروء' });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /notifications/read-all
router.put('/notifications/read-all', async (req, res) => {
  try {
    await NotificationLog.updateMany(
      { user_id: req.user._id, status: { $ne: 'read' } },
      { status: 'read', read_at: new Date() }
    );
    res.json({ success: true, message: 'تم تعليم كل الإشعارات كمقروءة' });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE /notifications/:id
router.delete('/notifications/:id', async (req, res) => {
  try {
    await NotificationLog.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ success: true, message: 'تم حذف الإشعار' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════
// CONTACT DIRECTORY — دليل جهات الاتصال
// ══════════════════════════════════════════════════════════════

// GET /contacts
router.get('/contacts', async (req, res) => {
  try {
    const { page = 1, limit = 30, contact_type, search, is_active = true } = req.query;
    const filter = { deleted_at: null, is_active: is_active !== 'false' };
    if (contact_type) filter.contact_type = contact_type;
    if (search) filter.$text = { $search: search };

    const contacts = await ContactDirectory.find(filter)
      .sort({ name_ar: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await ContactDirectory.countDocuments(filter);
    res.json({
      success: true,
      data: contacts,
      pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /contacts
router.post('/contacts', async (req, res) => {
  try {
    const contact = await ContactDirectory.create({
      ...stripUpdateMeta(req.body),
      created_by: req.user._id,
      branch_id: req.user.branch_id,
    });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /contacts/:id
router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await ContactDirectory.findOne({ _id: req.params.id, deleted_at: null });
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, data: contact });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /contacts/:id
router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await ContactDirectory.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /contacts/:id
router.delete('/contacts/:id', async (req, res) => {
  try {
    await ContactDirectory.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ success: true, message: 'تم حذف جهة الاتصال' });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
