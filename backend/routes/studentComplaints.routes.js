/**
 * Student Complaints & Suggestions Routes
 * مسارات الشكاوى والمقترحات للطلاب
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Complaint Schema ────────────────────────────────────────────────────────
const complaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['شكوى', 'مقترح', 'استفسار', 'ملاحظة'], required: true },
    category: {
      type: String,
      enum: ['أكاديمي', 'إداري', 'مرافق', 'نقل', 'تغذية', 'تقنية', 'سلوكي', 'صحي', 'أخرى'],
      required: true,
    },
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    priority: { type: String, enum: ['عالي', 'متوسط', 'منخفض'], default: 'متوسط' },
    status: {
      type: String,
      enum: ['جديدة', 'قيد المراجعة', 'قيد المعالجة', 'تم الحل', 'مغلقة', 'مرفوضة'],
      default: 'جديدة',
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    responses: [
      {
        responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        responderName: String,
        responderRole: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: String,
    isAnonymous: { type: Boolean, default: false },
    resolvedAt: Date,
    referenceNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

complaintSchema.pre('save', function (next) {
  if (!this.referenceNumber) {
    const date = new Date();
    const prefix = this.type === 'شكوى' ? 'CMP' : this.type === 'مقترح' ? 'SUG' : 'INQ';
    this.referenceNumber = `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

let Complaint;
try {
  Complaint = mongoose.model('StudentComplaint');
} catch {
  Complaint = mongoose.model('StudentComplaint', complaintSchema);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET / — قائمة الشكاوى والمقترحات للطالب
router.get('/:studentId', async (req, res) => {
  try {
    const { status, type, category, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.params.studentId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Complaint.countDocuments(filter),
    ]);

    // إحصائيات سريعة
    const stats = await Complaint.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(req.params.studentId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    });
  } catch (err) {
    logger.error('Student complaints list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشكاوى والمقترحات' });
  }
});

// POST / — إنشاء شكوى أو مقترح جديد
router.post('/:studentId', async (req, res) => {
  try {
    const complaint = new Complaint({
      studentId: req.params.studentId,
      ...req.body,
    });
    await complaint.save();
    logger.info(`New ${complaint.type} created: ${complaint.referenceNumber}`);
    res.status(201).json({
      success: true,
      data: complaint,
      message: `تم إرسال ${complaint.type} بنجاح - الرقم المرجعي: ${complaint.referenceNumber}`,
    });
  } catch (err) {
    logger.error('Student complaint create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الشكوى/المقترح' });
  }
});

// GET /:id/details — تفاصيل شكوى محددة
router.get('/:studentId/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      studentId: req.params.studentId,
    }).lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    logger.error('Student complaint detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الشكوى' });
  }
});

// PUT /:id — تحديث شكوى (مثلاً إضافة رد من الإدارة)
router.put('/:studentId/:id', async (req, res) => {
  try {
    const updates = req.body;
    if (updates.status === 'تم الحل') updates.resolvedAt = new Date();
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updates },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint, message: 'تم تحديث الشكوى بنجاح' });
  } catch (err) {
    logger.error('Student complaint update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الشكوى' });
  }
});

// POST /:id/response — إضافة رد على الشكوى
router.post('/:studentId/:id/response', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    complaint.responses.push({
      responderId: req.user?._id,
      responderName: req.body.responderName || req.user?.fullName,
      responderRole: req.body.responderRole || req.user?.role,
      message: req.body.message,
    });
    if (req.body.updateStatus) complaint.status = req.body.updateStatus;
    await complaint.save();
    res.json({ success: true, data: complaint, message: 'تم إضافة الرد بنجاح' });
  } catch (err) {
    logger.error('Student complaint response error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الرد' });
  }
});

// POST /:id/rate — تقييم الخدمة بعد الحل
router.post('/:studentId/:id/rate', async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id, studentId: req.params.studentId },
      { $set: { rating: req.body.rating, ratingComment: req.body.comment } },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint, message: 'شكراً لتقييمك' });
  } catch (err) {
    logger.error('Student complaint rate error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقييم الخدمة' });
  }
});

// GET /stats/summary — إحصائيات عامة
router.get('/:studentId/stats/summary', async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);
    const [byType, byStatus, byCategory, avgRating] = await Promise.all([
      Complaint.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { studentId, rating: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        byType: byType.reduce((a, t) => {
          a[t._id] = t.count;
          return a;
        }, {}),
        byStatus: byStatus.reduce((a, s) => {
          a[s._id] = s.count;
          return a;
        }, {}),
        byCategory: byCategory.reduce((a, c) => {
          a[c._id] = c.count;
          return a;
        }, {}),
        averageRating: avgRating[0]?.avg || 0,
      },
    });
  } catch (err) {
    logger.error('Student complaints stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
