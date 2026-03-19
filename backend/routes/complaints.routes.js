/**
 * مسارات الشكاوى والمقترحات الموحدة
 * Unified Complaints & Suggestions Routes
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const Complaint = require('../models/Complaint');

router.use(authenticate);

// GET / — List all complaints (paginated, filterable)
router.get('/', async (req, res) => {
  try {
    const { type, source, status, priority, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('submittedBy', 'name email')
        .populate('assignedTo', 'name email')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Complaints list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكاوى' });
  }
});

// GET /stats — Summary statistics
router.get('/stats', async (req, res) => {
  try {
    const [byStatus, byType, byPriority, bySource, total] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]),
      Complaint.countDocuments(),
    ]);

    const resolved = await Complaint.countDocuments({ status: { $in: ['resolved', 'closed'] } });
    const avgRating = await Complaint.aggregate([
      { $match: { rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        resolved,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
        byStatus,
        byType,
        byPriority,
        bySource,
      },
    });
  } catch (err) {
    logger.error('Complaints stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

// GET /:id — Get complaint details
router.get('/:id', async (req, res) => {
  try {
    const doc = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Complaint detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكوى' });
  }
});

// POST / — Create complaint/suggestion
router.post(
  '/',
  validate([
    body('subject').trim().notEmpty().withMessage('عنوان الشكوى مطلوب'),
    body('description').trim().notEmpty().withMessage('وصف الشكوى مطلوب'),
    body('source')
      .isIn(['employee', 'student', 'customer', 'parent', 'other'])
      .withMessage('مصدر الشكوى غير صالح'),
  ]),
  async (req, res) => {
    try {
      const doc = new Complaint({
        ...req.body,
        submittedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
      });
      await doc.save();
      res.status(201).json({ success: true, data: doc, message: 'تم تقديم الشكوى بنجاح' });
    } catch (err) {
      logger.error('Complaint create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تقديم الشكوى' });
    }
  }
);

// PUT /:id — Update complaint
router.put(
  '/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('status')
      .optional()
      .isIn(['new', 'under_review', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected'])
      .withMessage('حالة غير صالحة'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('أولوية غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === 'resolved' && !updates.resolvedAt) {
        updates.resolvedAt = new Date();
      }
      const doc = await Complaint.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم تحديث الشكوى بنجاح' });
    } catch (err) {
      logger.error('Complaint update error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث الشكوى' });
    }
  }
);

// POST /:id/respond — Add a response
router.post(
  '/:id/respond',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('content').trim().notEmpty().withMessage('محتوى الرد مطلوب'),
  ]),
  async (req, res) => {
    try {
      const doc = await Complaint.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });

      doc.responses.push({
        content: req.body.content,
        respondedBy: req.user._id || req.userId,
      });
      if (doc.status === 'new') doc.status = 'under_review';
      await doc.save();
      res.json({ success: true, data: doc, message: 'تم إضافة الرد بنجاح' });
    } catch (err) {
      logger.error('Complaint respond error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إضافة الرد' });
    }
  }
);

// POST /:id/escalate — Escalate complaint
router.post(
  '/:id/escalate',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('assignedTo').optional().isMongoId().withMessage('معرف الموظف غير صالح'),
  ]),
  async (req, res) => {
    try {
      const doc = await Complaint.findByIdAndUpdate(
        req.params.id,
        {
          priority: 'critical',
          status: 'escalated',
          assignedTo: req.body.assignedTo,
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم تصعيد الشكوى بنجاح' });
    } catch (err) {
      logger.error('Complaint escalate error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تصعيد الشكوى' });
    }
  }
);

// POST /:id/resolve — Resolve complaint
router.post(
  '/:id/resolve',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('resolution').trim().notEmpty().withMessage('نص الحل مطلوب'),
  ]),
  async (req, res) => {
    try {
      const doc = await Complaint.findByIdAndUpdate(
        req.params.id,
        {
          status: 'resolved',
          resolution: req.body.resolution,
          resolvedAt: new Date(),
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'تم حل الشكوى بنجاح' });
    } catch (err) {
      logger.error('Complaint resolve error:', err);
      res.status(500).json({ success: false, message: 'خطأ في حل الشكوى' });
    }
  }
);

// POST /:id/rate — Rate resolution
router.post(
  '/:id/rate',
  validate([
    param('id').isMongoId().withMessage('معرف الشكوى غير صالح'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
  ]),
  async (req, res) => {
    try {
      const doc = await Complaint.findByIdAndUpdate(
        req.params.id,
        { rating: req.body.rating },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: doc, message: 'شكراً لتقييمك' });
    } catch (err) {
      logger.error('Complaint rate error:', err);
      res.status(500).json({ success: false, message: 'خطأ في التقييم' });
    }
  }
);

// DELETE /:id
router.delete('/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const doc = await Complaint.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, message: 'تم حذف الشكوى بنجاح' });
  } catch (err) {
    logger.error('Complaint delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الشكوى' });
  }
});

module.exports = router;
