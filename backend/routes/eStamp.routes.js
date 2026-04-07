/**
 * E-Stamp Routes — مسارات الختم الإلكتروني
 *
 * Endpoints:
 *   GET    /stats                Dashboard statistics
 *   GET    /                     List stamps (filter/paginate)
 *   POST   /                     Create stamp
 *   POST   /:id/upload-image     Upload custom stamp image
 *   GET    /:id                  Get single stamp
 *   PUT    /:id                  Update stamp
 *   POST   /:id/submit-approval  Submit for approval
 *   POST   /:id/approve          Approve stamp
 *   POST   /:id/reject           Reject stamp
 *   POST   /:id/activate         Activate
 *   POST   /:id/deactivate       Suspend stamp
 *   POST   /:id/revoke           Revoke stamp
 *   POST   /:id/renew            Renew expired stamp
 *   POST   /:id/apply            Apply stamp to document
 *   GET    /:id/usage            Usage history
 *   GET    /:id/audit            Audit trail
 *   POST   /:id/authorize        Add authorized user
 *   DELETE /:id/authorize/:userId Remove authorized user
 *   GET    /verify/:code         Verify stamp application
 *   POST   /:id/transfer         Transfer ownership
 *   DELETE /:id                  Soft-delete
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const EStamp = require('../models/EStamp');
const { escapeRegex } = require('../utils/sanitize');
const _validateObjectId = require('../middleware/validateObjectId');

const MAX_PAGE_LIMIT = 100;

/* ─── Multer config for stamp image uploads (memory storage → base64) ───── */
const stampImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|jpg|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم — يُسمح فقط بـ PNG, JPG, WebP'));
    }
  },
});

router.use(authenticate);

/* ─── Validate :id param as ObjectId on all sub-routes ────────────────────── */
router.param('id', (req, res, next, val) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'معرّف id غير صالح' });
  }
  next();
});

/* ═══════════════════════════════════════════════════════════════════════════
   Verify Stamp Application — MUST be before /:id to avoid route conflict
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/verify/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const stamp = await EStamp.findOne({
      'usageHistory.verificationCode': code,
    }).lean();

    if (!stamp) {
      return res.json({
        success: true,
        data: { valid: false, message: 'كود التحقق غير صالح' },
      });
    }

    const usage = stamp.usageHistory.find(u => u.verificationCode === code);

    res.json({
      success: true,
      data: {
        valid: true,
        stamp: {
          stampId: stamp.stampId,
          name_ar: stamp.name_ar,
          stampType: stamp.stampType,
          category: stamp.category,
          department: stamp.department,
          organization: stamp.organization,
          status: stamp.status,
          stampImage: stamp.stampImage,
        },
        application: {
          documentTitle: usage?.documentTitle,
          documentType: usage?.documentType,
          appliedByName: usage?.appliedByName,
          appliedAt: usage?.appliedAt,
          verificationHash: usage?.verificationHash,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحقق' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Dashboard Statistics
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/stats', async (req, res) => {
  try {
    const [total, active, pendingApproval, suspended, revoked, expired, draft] = await Promise.all([
      EStamp.countDocuments(),
      EStamp.countDocuments({ status: 'active' }),
      EStamp.countDocuments({ status: 'pending_approval' }),
      EStamp.countDocuments({ status: 'suspended' }),
      EStamp.countDocuments({ status: 'revoked' }),
      EStamp.countDocuments({ status: 'expired' }),
      EStamp.countDocuments({ status: 'draft' }),
    ]);

    // Usage stats
    const usageAgg = await EStamp.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usageCount' },
          avgUsage: { $avg: '$usageCount' },
        },
      },
    ]);

    // By type
    const byType = await EStamp.aggregate([
      { $group: { _id: '$stampType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // By department
    const byDepartment = await EStamp.aggregate([
      { $match: { department: { $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // By category
    const byCategory = await EStamp.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent applications
    const recentApplications = await EStamp.aggregate([
      { $unwind: '$usageHistory' },
      { $sort: { 'usageHistory.appliedAt': -1 } },
      { $limit: 10 },
      {
        $project: {
          stampId: 1,
          name_ar: 1,
          stampType: 1,
          usage: '$usageHistory',
        },
      },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await EStamp.aggregate([
      { $unwind: '$usageHistory' },
      { $match: { 'usageHistory.appliedAt': { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$usageHistory.appliedAt' },
            month: { $month: '$usageHistory.appliedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        pendingApproval,
        suspended,
        revoked,
        expired,
        draft,
        totalUsage: usageAgg[0]?.totalUsage || 0,
        avgUsage: Math.round(usageAgg[0]?.avgUsage || 0),
        byType,
        byDepartment,
        byCategory,
        recentApplications,
        monthlyTrend,
      },
    });
  } catch (err) {
    logger.error('E-Stamp stats error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في تحميل الإحصائيات' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   List Stamps (with filters & pagination)
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      stampType,
      category,
      department,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (stampType) filter.stampType = stampType;
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name_ar: { $regex: escapeRegex(search), $options: 'i' } },
        { name_en: { $regex: escapeRegex(search), $options: 'i' } },
        { stampId: { $regex: escapeRegex(search), $options: 'i' } },
        { department: { $regex: escapeRegex(search), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(search), 'i')] } },
      ];
    }

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;
    const ESTAMP_SAFE_SORTS = new Set([
      'createdAt',
      'name_ar',
      'name_en',
      'stampId',
      'status',
      'department',
      'stampType',
    ]);
    const safeSortBy = ESTAMP_SAFE_SORTS.has(sortBy) ? sortBy : 'createdAt';
    const sort = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [stamps, totalCount] = await Promise.all([
      EStamp.find(filter)
        .select('-usageHistory -auditTrail -stampSVG')
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      EStamp.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stamps,
      pagination: {
        total: totalCount,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(totalCount / safeLimit),
      },
    });
  } catch (err) {
    logger.error('E-Stamp list error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في تحميل الأختام' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Create Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    const stampId = await EStamp.generateStampId();
    const verificationSecret = require('crypto').randomBytes(16).toString('hex');

    const stamp = new EStamp({
      ...req.body,
      stampId,
      verificationSecret,
      createdBy: req.user?._id || req.user?.id,
      createdByName: req.user?.name || req.user?.fullName || 'مستخدم',
      authorizedUsers: [
        {
          userId: req.user?._id || req.user?.id,
          name: req.user?.name || req.user?.fullName || 'مستخدم',
          email: req.user?.email,
          role: 'owner',
          addedBy: req.user?._id || req.user?.id,
        },
        ...(req.body.authorizedUsers || []),
      ],
    });

    stamp.addAuditEntry('created', req.user, `تم إنشاء الختم: ${stamp.name_ar}`);

    await stamp.save();
    logger.info('E-Stamp created: %s by %s', stampId, req.user?.name);

    res.status(201).json({
      success: true,
      data: stamp,
      message: 'تم إنشاء الختم بنجاح',
    });
  } catch (err) {
    logger.error('E-Stamp create error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Upload Custom Stamp Image
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/upload-image', stampImageUpload.single('stampImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع صورة' });
    }
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) {
      return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    }

    // Convert buffer to base64 data URI
    const mimeType = req.file.mimetype;
    const base64 = req.file.buffer.toString('base64');
    stamp.stampImage = `data:${mimeType};base64,${base64}`;
    stamp.addAuditEntry('updated', req.user, 'تم رفع صورة مخصصة للختم');
    await stamp.save();

    logger.info('Stamp image uploaded for %s by %s', stamp.stampId, req.user?.name);
    res.json({
      success: true,
      data: { stampImage: stamp.stampImage },
      message: 'تم رفع صورة الختم بنجاح',
    });
  } catch (err) {
    logger.error('Stamp image upload error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في رفع الصورة' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Get Single Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id).select('-verificationSecret').lean();
    if (!stamp) {
      return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    }
    res.json({ success: true, data: stamp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحميل الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Update Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.put('/:id', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) {
      return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    }

    const allowedUpdates = [
      'name_ar',
      'name_en',
      'description',
      'stampType',
      'category',
      'stampImage',
      'stampSVG',
      'stampShape',
      'colorScheme',
      'size',
      'includeDate',
      'includeNumber',
      'includeQR',
      'department',
      'organization',
      'authorityLevel',
      'validFrom',
      'validUntil',
      'isExpirable',
      'maxUsageCount',
      'requireApprovalPerUse',
      'requireOTP',
      'ipWhitelist',
      'watermarkText',
      'tags',
      'priority',
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) stamp[field] = req.body[field];
    });

    stamp.addAuditEntry('updated', req.user, 'تم تحديث بيانات الختم');
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم تحديث الختم بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Submit for Approval
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/submit-approval', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    if (!['draft', 'suspended'].includes(stamp.status)) {
      return res
        .status(400)
        .json({ success: false, message: 'لا يمكن تقديم الختم للاعتماد في هذه الحالة' });
    }

    stamp.status = 'pending_approval';
    stamp.addAuditEntry('submitted_for_approval', req.user, 'تم تقديم الختم للاعتماد');
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم تقديم الختم للاعتماد' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تقديم الختم للاعتماد' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Approve Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/approve', authorize(['admin', 'manager', 'director']), async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });
    if (stamp.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'الختم ليس في انتظار الاعتماد' });
    }

    stamp.status = 'active';
    stamp.approvedBy = req.user?._id || req.user?.id;
    stamp.approvedByName = req.user?.name || req.user?.fullName;
    stamp.approvedAt = new Date();
    stamp.addAuditEntry('approved', req.user, `تم اعتماد الختم بواسطة ${stamp.approvedByName}`);
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم اعتماد الختم بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اعتماد الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Reject Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/reject', authorize(['admin', 'manager', 'director']), async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    stamp.status = 'draft';
    stamp.rejectedBy = req.user?._id || req.user?.id;
    stamp.rejectionReason = req.body.reason || '';
    stamp.addAuditEntry('rejected', req.user, `تم رفض الختم: ${req.body.reason || 'بدون سبب'}`);
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم رفض الختم' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في رفض الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Activate / Deactivate / Revoke
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/activate', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    stamp.status = 'active';
    stamp.addAuditEntry('activated', req.user, 'تم تفعيل الختم');
    await stamp.save();
    res.json({ success: true, data: stamp, message: 'تم تفعيل الختم' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

router.post('/:id/deactivate', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    stamp.status = 'suspended';
    stamp.addAuditEntry('deactivated', req.user, `تم تعليق الختم: ${req.body.reason || ''}`);
    await stamp.save();
    res.json({ success: true, data: stamp, message: 'تم تعليق الختم' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

router.post('/:id/revoke', authorize(['admin', 'manager', 'director']), async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    stamp.status = 'revoked';
    stamp.addAuditEntry('revoked', req.user, `تم إلغاء الختم: ${req.body.reason || ''}`);
    await stamp.save();
    res.json({ success: true, data: stamp, message: 'تم إلغاء الختم نهائياً' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Renew Stamp
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/renew', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const { validUntil } = req.body;
    if (!validUntil) {
      return res.status(400).json({ success: false, message: 'يجب تحديد تاريخ انتهاء جديد' });
    }

    stamp.validUntil = new Date(validUntil);
    stamp.status = 'active';
    stamp.addAuditEntry('renewed', req.user, `تم تجديد الختم حتى ${validUntil}`);
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم تجديد الختم بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تجديد الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Apply Stamp to Document
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/apply', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    if (stamp.status !== 'active') {
      return res.status(400).json({ success: false, message: 'الختم غير مفعّل' });
    }

    // Check authorization
    const userId = req.user?._id || req.user?.id;
    if (!stamp.isUserAuthorized(userId)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك باستخدام هذا الختم' });
    }

    // Check max usage
    if (stamp.maxUsageCount > 0 && stamp.usageCount >= stamp.maxUsageCount) {
      return res
        .status(400)
        .json({ success: false, message: 'تم تجاوز الحد الأقصى لاستخدام الختم' });
    }

    // Check expiry
    if (stamp.isExpirable && stamp.validUntil && new Date() > stamp.validUntil) {
      stamp.status = 'expired';
      stamp.addAuditEntry('expired', req.user, 'انتهت صلاحية الختم');
      await stamp.save();
      return res.status(400).json({ success: false, message: 'انتهت صلاحية الختم' });
    }

    const verificationCode = stamp.generateVerificationCode();
    const verificationHash = stamp.generateApplicationHash(req.body.documentId || 'unknown');

    const usageRecord = {
      documentId: req.body.documentId,
      documentTitle: req.body.documentTitle,
      documentType: req.body.documentType || 'other',
      appliedBy: req.user?._id || req.user?.id,
      appliedByName: req.user?.name || req.user?.fullName || 'مستخدم',
      position: req.body.position || {},
      verificationCode,
      verificationHash,
      notes: req.body.notes,
      ip: req.ip,
    };

    stamp.usageHistory.push(usageRecord);
    stamp.usageCount += 1;
    stamp.lastUsedAt = new Date();
    stamp.lastUsedBy = req.user?._id || req.user?.id;
    stamp.addAuditEntry(
      'applied',
      req.user,
      `تم استخدام الختم على: ${req.body.documentTitle || req.body.documentId}`
    );
    await stamp.save();

    logger.info(
      'E-Stamp applied: %s on document %s',
      stamp.stampId,
      String(req.body.documentId).replace(/[\r\n]/g, '')
    );

    res.json({
      success: true,
      data: {
        stampId: stamp.stampId,
        stampImage: stamp.stampImage,
        verificationCode,
        verificationHash,
        appliedAt: usageRecord.appliedAt || new Date(),
        usageCount: stamp.usageCount,
      },
      message: 'تم تطبيق الختم بنجاح',
    });
  } catch (err) {
    logger.error('E-Stamp apply error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في تطبيق الختم' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Usage History
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id/usage', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id)
      .select('stampId name_ar usageHistory usageCount')
      .lean();
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const usage = (stamp.usageHistory || []).sort(
      (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
    );

    res.json({ success: true, data: { ...stamp, usageHistory: usage } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Audit Trail
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id/audit', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id).select('stampId name_ar auditTrail').lean();
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const trail = (stamp.auditTrail || []).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({ success: true, data: { ...stamp, auditTrail: trail } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Authorize / Remove User
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/authorize', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const { userId, name, email, department, role } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مطلوب' });
    }

    // Check duplicate
    const exists = stamp.authorizedUsers.some(
      u => u.userId?.toString() === userId || u.email === email
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'المستخدم مفوّض بالفعل' });
    }

    stamp.authorizedUsers.push({
      userId,
      name,
      email,
      department,
      role: role || 'user',
      addedBy: req.user?._id || req.user?.id,
    });

    stamp.addAuditEntry('updated', req.user, `تم تفويض ${name} لاستخدام الختم`);
    await stamp.save();

    res.json({ success: true, data: stamp, message: `تم تفويض ${name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

router.delete('/:id/authorize/:userId', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const removed = stamp.authorizedUsers.find(
      u => u.userId?.toString() === req.params.userId || u._id?.toString() === req.params.userId
    );
    stamp.authorizedUsers = stamp.authorizedUsers.filter(
      u => u.userId?.toString() !== req.params.userId && u._id?.toString() !== req.params.userId
    );

    stamp.addAuditEntry(
      'updated',
      req.user,
      `تم إزالة تفويض ${removed?.name || req.params.userId}`
    );
    await stamp.save();

    res.json({ success: true, data: stamp, message: 'تم إزالة التفويض' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Transfer Ownership
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/transfer', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    const { userId, name, email } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'البيانات مطلوبة' });
    }

    // Update current owner to admin
    const currentOwner = stamp.authorizedUsers.find(u => u.role === 'owner');
    if (currentOwner) currentOwner.role = 'admin';

    // Add or update new owner
    const existingUser = stamp.authorizedUsers.find(
      u => u.userId?.toString() === userId || u.email === email
    );
    if (existingUser) {
      existingUser.role = 'owner';
    } else {
      stamp.authorizedUsers.push({
        userId,
        name,
        email,
        role: 'owner',
        addedBy: req.user?._id || req.user?.id,
      });
    }

    stamp.addAuditEntry('transferred', req.user, `تم نقل ملكية الختم إلى ${name}`);
    await stamp.save();

    res.json({ success: true, data: stamp, message: `تم نقل الملكية إلى ${name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Soft Delete
   ═══════════════════════════════════════════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    const stamp = await EStamp.findById(req.params.id);
    if (!stamp) return res.status(404).json({ success: false, message: 'الختم غير موجود' });

    stamp.status = 'revoked';
    stamp.addAuditEntry('deleted', req.user, 'تم حذف الختم (حذف ناعم)');
    await stamp.save();

    res.json({ success: true, message: 'تم حذف الختم' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف الختم' });
  }
});

module.exports = router;
