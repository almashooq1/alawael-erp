/* eslint-disable no-unused-vars */
/**
 * Meetings Management Routes
 * مسارات إدارة الاجتماعات
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const Meeting = require('../models/Meeting');

router.use(authenticate);

// ─── List meetings ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Meeting.find(filter).sort({ date: -1 }).skip(skip).limit(+limit).lean(),
      Meeting.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة الاجتماعات',
    });
  } catch (error) {
    logger.error('Error fetching meetings:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاجتماعات' });
  }
});

// ─── Get single meeting ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).lean();
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, data: meeting, message: 'بيانات الاجتماع' });
  } catch (error) {
    logger.error('Error fetching meeting:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاجتماع' });
  }
});

// ─── Create meeting ──────────────────────────────────────────────────────────
router.post(
  '/',
  authorize(['admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان الاجتماع مطلوب'),
    body('date')
      .notEmpty()
      .withMessage('تاريخ الاجتماع مطلوب')
      .isISO8601()
      .withMessage('تاريخ الاجتماع غير صالح'),
    body('type')
      .optional()
      .isIn(['department', 'board', 'general', 'emergency', 'project', 'training', 'review'])
      .withMessage('نوع الاجتماع غير صالح'),
    body('attendees').optional().isArray().withMessage('قائمة الحضور يجب أن تكون قائمة'),
  ]),
  async (req, res) => {
    try {
      const {
        title,
        type,
        date,
        attendees,
        location,
        agenda,
        startTime,
        endTime,
        description,
        duration,
        isVirtual,
        meetingLink,
        department,
      } = req.body;
      if (!title || !date) {
        return res.status(400).json({ success: false, message: 'العنوان والتاريخ مطلوبان' });
      }
      const count = await Meeting.countDocuments();
      const meetingId = `MTG-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const meeting = await Meeting.create({
        meetingId,
        title,
        description,
        type: type || 'department',
        date,
        startTime: startTime || '09:00',
        endTime,
        duration,
        attendees: attendees || [],
        location,
        isVirtual,
        meetingLink,
        department,
        agenda,
        organizer: req.user._id || req.user.id,
        status: 'scheduled',
      });
      res.status(201).json({ success: true, data: meeting, message: 'تم إنشاء الاجتماع بنجاح' });
    } catch (error) {
      logger.error('Error creating meeting:', error);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء الاجتماع' });
    }
  }
);

// ─── Update meeting ──────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      title,
      type,
      date,
      attendees,
      location,
      agenda,
      status,
      startTime,
      endTime,
      description,
      duration,
      isVirtual,
      meetingLink,
      department,
    } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      {
        title,
        type,
        date,
        attendees,
        location,
        agenda,
        status,
        startTime,
        endTime,
        description,
        duration,
        isVirtual,
        meetingLink,
        department,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, data: meeting, message: 'تم تحديث الاجتماع بنجاح' });
  } catch (error) {
    logger.error('Error updating meeting:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الاجتماع' });
  }
});

// ─── Delete meeting ──────────────────────────────────────────────────────────
router.delete('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, message: 'تم حذف الاجتماع بنجاح' });
  } catch (error) {
    logger.error('Error deleting meeting:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف الاجتماع' });
  }
});

// ─── Add minutes ─────────────────────────────────────────────────────────────
router.post(
  '/:id/minutes',
  authorize(['admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الاجتماع غير صالح'),
    body('content').trim().notEmpty().withMessage('محتوى المحضر مطلوب'),
  ]),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.id);
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
      meeting.minutes.push({
        content: req.body.content,
        recordedBy: req.user.id,
        decisions: req.body.decisions || [],
      });
      meeting.status = 'completed';
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم إضافة محضر الاجتماع' });
    } catch (error) {
      logger.error('Error adding minutes:', error);
      res.status(500).json({ success: false, message: 'خطأ في إضافة المحضر' });
    }
  }
);

// ─── RSVP ────────────────────────────────────────────────────────────────────
router.post(
  '/:id/rsvp',
  validate([
    param('id').isMongoId().withMessage('معرف الاجتماع غير صالح'),
    body('rsvpStatus')
      .optional()
      .isIn(['accepted', 'declined', 'tentative'])
      .withMessage('حالة الحضور غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.id);
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
      const attendee = meeting.attendees.find(a => a.userId?.toString() === req.user.id);
      if (attendee) {
        attendee.rsvp = req.body.rsvpStatus || 'accepted';
      } else {
        meeting.attendees.push({
          userId: req.user.id,
          name: req.user.name || req.user.email,
          rsvp: req.body.rsvpStatus || 'accepted',
        });
      }
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم تسجيل الحضور' });
    } catch (error) {
      logger.error('Error processing RSVP:', error);
      res.status(500).json({ success: false, message: 'خطأ في تسجيل الحضور' });
    }
  }
);

module.exports = router;
