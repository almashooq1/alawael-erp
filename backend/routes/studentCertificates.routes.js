/**
 * Student Certificates Routes
 * مسارات الشهادات والإفادات للطلاب
 */
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Certificate Schema ─────────────────────────────────────────────────────
const certificateSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'شهادة حضور',
        'شهادة إتمام برنامج',
        'إفادة قيد',
        'شهادة تفوق',
        'شهادة حسن سيرة وسلوك',
        'شهادة مشاركة',
        'إفادة نقل',
        'شهادة تخرج',
        'شهادة إنجاز',
        'إفادة طبية',
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['قيد الطلب', 'قيد المعالجة', 'معتمدة', 'جاهزة للطباعة', 'تم التسليم', 'مرفوضة'],
      default: 'قيد الطلب',
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    issuedAt: Date,
    expiresAt: Date,
    certificateNumber: { type: String, unique: true },
    pdfUrl: String,
    qrCode: String,
    templateId: String,
    metadata: {
      academicYear: String,
      semester: String,
      program: String,
      gpa: Number,
      attendanceRate: Number,
      completionDate: Date,
      achievement: String,
      eventName: String,
      eventDate: Date,
    },
    rejectionReason: String,
    notes: String,
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: Date,
  },
  { timestamps: true }
);

certificateSchema.pre('save', function (next) {
  if (!this.certificateNumber) {
    const date = new Date();
    this.certificateNumber = `CERT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  next();
});

let Certificate;
try {
  Certificate = mongoose.model('StudentCertificate');
} catch {
  Certificate =
    mongoose.models.StudentCertificate || mongoose.model('StudentCertificate', certificateSchema);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET / — قائمة شهادات الطالب
router.get('/:studentId', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.params.studentId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Certificate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Certificate.countDocuments(filter),
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
    });
  } catch (err) {
    logger.error('Student certificates list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشهادات' });
  }
});

// GET /available-types — أنواع الشهادات المتاحة
router.get('/:studentId/available-types', async (req, res) => {
  try {
    const types = [
      {
        id: 'attendance',
        name: 'شهادة حضور',
        description: 'شهادة تثبت حضور الطالب ونسبة الحضور',
        processingDays: 2,
        icon: '📋',
      },
      {
        id: 'program-completion',
        name: 'شهادة إتمام برنامج',
        description: 'شهادة إتمام برنامج تأهيلي أو تعليمي',
        processingDays: 5,
        icon: '🎓',
      },
      {
        id: 'enrollment',
        name: 'إفادة قيد',
        description: 'إفادة تثبت قيد الطالب في المركز',
        processingDays: 1,
        icon: '📝',
      },
      {
        id: 'excellence',
        name: 'شهادة تفوق',
        description: 'شهادة تفوق أكاديمي أو سلوكي',
        processingDays: 3,
        icon: '⭐',
      },
      {
        id: 'good-conduct',
        name: 'شهادة حسن سيرة وسلوك',
        description: 'شهادة حسن السيرة والسلوك',
        processingDays: 3,
        icon: '✅',
      },
      {
        id: 'participation',
        name: 'شهادة مشاركة',
        description: 'شهادة مشاركة في فعالية أو نشاط',
        processingDays: 2,
        icon: '🏅',
      },
      {
        id: 'transfer',
        name: 'إفادة نقل',
        description: 'إفادة لأغراض النقل بين المراكز',
        processingDays: 5,
        icon: '🔄',
      },
      {
        id: 'graduation',
        name: 'شهادة تخرج',
        description: 'شهادة التخرج من البرنامج',
        processingDays: 7,
        icon: '🎊',
      },
      {
        id: 'achievement',
        name: 'شهادة إنجاز',
        description: 'شهادة تقدير لإنجاز معين',
        processingDays: 3,
        icon: '🏆',
      },
      {
        id: 'medical',
        name: 'إفادة طبية',
        description: 'إفادة بالحالة الصحية والتقارير الطبية',
        processingDays: 5,
        icon: '🏥',
      },
    ];
    res.json({ success: true, data: types });
  } catch (err) {
    logger.error('Certificate types error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب أنواع الشهادات' });
  }
});

// POST / — طلب شهادة جديدة
router.post('/:studentId', async (req, res) => {
  try {
    const certificate = new Certificate({
      studentId: req.params.studentId,
      ...req.body,
    });
    await certificate.save();
    logger.info(`New certificate request: ${certificate.certificateNumber}`);
    res.status(201).json({
      success: true,
      data: certificate,
      message: `تم تقديم طلب الشهادة بنجاح - الرقم: ${certificate.certificateNumber}`,
    });
  } catch (err) {
    logger.error('Certificate request error:', err);
    res.status(500).json({ success: false, message: 'خطأ في طلب الشهادة' });
  }
});

// GET /:id — تفاصيل شهادة
router.get('/:studentId/:id', async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      _id: req.params.id,
      studentId: req.params.studentId,
    }).lean();
    if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    res.json({ success: true, data: cert });
  } catch (err) {
    logger.error('Certificate detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الشهادة' });
  }
});

// PUT /:id/approve — اعتماد الشهادة (للإدارة)
router.put('/:studentId/:id/approve', async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'معتمدة',
          approvedBy: req.user?._id,
          approverName: req.user?.fullName,
          processedAt: new Date(),
          issuedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    res.json({ success: true, data: cert, message: 'تم اعتماد الشهادة بنجاح' });
  } catch (err) {
    logger.error('Certificate approve error:', err);
    res.status(500).json({ success: false, message: 'خطأ في اعتماد الشهادة' });
  }
});

// PUT /:id/reject — رفض الشهادة
router.put('/:studentId/:id/reject', async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'مرفوضة', rejectionReason: req.body.reason, processedAt: new Date() } },
      { new: true }
    );
    if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    res.json({ success: true, data: cert, message: 'تم رفض طلب الشهادة' });
  } catch (err) {
    logger.error('Certificate reject error:', err);
    res.status(500).json({ success: false, message: 'خطأ في رفض الشهادة' });
  }
});

// POST /:id/download — تحميل الشهادة
router.post('/:studentId/:id/download', async (req, res) => {
  try {
    const cert = await Certificate.findOneAndUpdate(
      {
        _id: req.params.id,
        studentId: req.params.studentId,
        status: { $in: ['معتمدة', 'جاهزة للطباعة'] },
      },
      { $inc: { downloadCount: 1 }, $set: { lastDownloadedAt: new Date() } },
      { new: true }
    );
    if (!cert)
      return res.status(404).json({ success: false, message: 'الشهادة غير جاهزة للتحميل' });
    res.json({ success: true, data: cert, message: 'تم تحميل الشهادة' });
  } catch (err) {
    logger.error('Certificate download error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل الشهادة' });
  }
});

// GET /stats — إحصائيات الشهادات
router.get('/:studentId/stats/summary', async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);
    const [byType, byStatus, totalDownloads] = await Promise.all([
      Certificate.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Certificate.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Certificate.aggregate([
        { $match: { studentId } },
        { $group: { _id: null, total: { $sum: '$downloadCount' } } },
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
        totalDownloads: totalDownloads[0]?.total || 0,
      },
    });
  } catch (err) {
    logger.error('Certificate stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات الشهادات' });
  }
});

module.exports = router;
