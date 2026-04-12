/* eslint-disable no-unused-vars */
/**
 * Administrative Communications Routes - مسارات الاتصالات الإدارية
 * REST API endpoints for administrative communications system
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  adminCommService,
  Correspondence,
  ExternalEntity,
  CorrespondenceTemplate,
  CorrespondenceAction,
  CorrespondenceType,
  Priority,
  Status,
  ConfidentialityLevel,
  SenderType,
} = require('./administrative-communications-service');

const { authenticate, authorize } = require('../middleware/advancedAuth');
const safeError = require('../utils/safeError');

// ==================== Multer Configuration ====================

// إنشاء مجلد المرفقات إذا لم يكن موجوداً
const uploadDir = path.join(__dirname, '../uploads/correspondences');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sanitize path parameter to prevent directory traversal
const sanitizePathParam = param => {
  if (!param) return null;
  // Strip path separators and parent directory references
  const sanitized = path.basename(String(param)).replace(/[\\/:*?"<>|]/g, '');
  if (!sanitized || sanitized === '.' || sanitized === '..') return null;
  return sanitized;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const safeId = sanitizePathParam(req.params.id) || 'temp';
    const correspondenceDir = path.join(uploadDir, safeId);
    if (!fs.existsSync(correspondenceDir)) {
      fs.mkdirSync(correspondenceDir, { recursive: true });
    }
    cb(null, correspondenceDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

// ==================== Middleware ====================

// التحقق من الصلاحيات للاتصالات الإدارية
const checkCorrespondenceAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const correspondence = await Correspondence.findById(id);

    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة',
      });
    }

    // التحقق من صلاحية الوصول
    const userId = req.user._id.toString();
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('manager');

    // المرسل أو المستلم أو المسؤول يمكنهم الوصول
    const isSender = correspondence.sender.entityId?.toString() === userId;
    const isRecipient = correspondence.recipients.some(r => r.entityId?.toString() === userId);
    const isCreator = correspondence.createdBy.toString() === userId;

    if (!isAdmin && !isSender && !isRecipient && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول إلى هذه المراسلة',
      });
    }

    req.correspondence = correspondence;
    next();
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
};

// ==================== Enums Routes ====================

/**
 * @route GET /api/admin-communications/enums
 * @desc الحصول على قوائم التعداد
 * @access Private
 */
router.get('/enums', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      correspondenceTypes: Object.entries(CorrespondenceType).map(([key, value]) => ({
        key,
        value,
        nameAr: getArabicTypeName(value),
      })),
      priorities: Object.entries(Priority).map(([key, value]) => ({
        key,
        value,
        nameAr: getArabicPriorityName(value),
      })),
      statuses: Object.entries(Status).map(([key, value]) => ({
        key,
        value,
        nameAr: getArabicStatusName(value),
      })),
      confidentialityLevels: Object.entries(ConfidentialityLevel).map(([key, value]) => ({
        key,
        value,
        nameAr: getArabicConfidentialityName(value),
      })),
      senderTypes: Object.entries(SenderType).map(([key, value]) => ({
        key,
        value,
        nameAr: getArabicSenderTypeName(value),
      })),
    },
  });
});

// ==================== Correspondence Routes ====================

/**
 * @route POST /api/admin-communications/correspondences
 * @desc إنشاء مراسلة جديدة
 * @access Private
 */
router.post('/correspondences', authenticate, async (req, res) => {
  try {
    const correspondence = await adminCommService.createCorrespondence(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'فشل في إنشاء المراسلة',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route GET /api/admin-communications/correspondences
 * @desc البحث في المراسلات
 * @access Private
 */
router.get('/correspondences', authenticate, async (req, res) => {
  try {
    const options = {
      query: req.query.q,
      type: req.query.type,
      status: req.query.status,
      priority: req.query.priority,
      confidentiality: req.query.confidentiality,
      senderId: req.query.senderId,
      recipientId: req.query.recipientId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      dueDateFrom: req.query.dueDateFrom,
      dueDateTo: req.query.dueDateTo,
      keywords: req.query.keywords ? req.query.keywords.split(',') : [],
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort: req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 },
    };

    const result = await adminCommService.searchCorrespondences(options);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route GET /api/admin-communications/correspondences/inbox
 * @desc الحصول على صندوق الوارد
 * @access Private
 */
router.get('/correspondences/inbox', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      'recipients.entityId': userId,
      status: { $ne: Status.DRAFT },
    };

    if (req.query.status) {
      filter['recipients.status'] = req.query.status;
    }

    if (req.query.unreadOnly === 'true') {
      filter['recipients.readAt'] = { $exists: false };
    }

    const [results, total, unreadCount] = await Promise.all([
      Correspondence.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender.entityId', 'name nameAr')
        .populate('createdBy', 'name nameAr'),
      Correspondence.countDocuments(filter),
      Correspondence.countDocuments({
        'recipients.entityId': userId,
        'recipients.readAt': { $exists: false },
      }),
    ]);

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route GET /api/admin-communications/correspondences/outbox
 * @desc الحصول على صندوق المرسل
 * @access Private
 */
router.get('/correspondences/outbox', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ 'sender.entityId': userId }, { createdBy: userId }],
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [results, total] = await Promise.all([
      Correspondence.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipients.entityId', 'name nameAr'),
      Correspondence.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route GET /api/admin-communications/correspondences/overdue
 * @desc الحصول على المراسلات المتأخرة
 * @access Private
 */
router.get(
  '/correspondences/overdue',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const daysThreshold = parseInt(req.query.days) || 0;
      const correspondences = await adminCommService.getOverdueCorrespondences(daysThreshold);

      res.json({
        success: true,
        data: correspondences,
        count: correspondences.length,
      });
    } catch (error) {
      safeError(res, error, 'administrative-communications');
    }
  }
);

/**
 * @route GET /api/admin-communications/correspondences/statistics
 * @desc الحصول على إحصائيات المراسلات
 * @access Private
 */
router.get('/correspondences/statistics', authenticate, async (req, res) => {
  try {
    const options = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      branchId: req.query.branchId,
    };

    const statistics = await adminCommService.getStatistics(options);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route GET /api/admin-communications/correspondences/:id
 * @desc الحصول على مراسلة بالتفصيل
 * @access Private
 */
router.get('/correspondences/:id', authenticate, checkCorrespondenceAccess, async (req, res) => {
  try {
    const correspondence = await Correspondence.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .populate('sender.entityId')
      .populate('recipients.entityId')
      .populate('parentCorrespondence')
      .populate('relatedCorrespondences')
      .populate('approvalWorkflow.approvals.approverId', 'name nameAr');

    res.json({
      success: true,
      data: correspondence,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route PUT /api/admin-communications/correspondences/:id
 * @desc تحديث مراسلة
 * @access Private
 */
router.put('/correspondences/:id', authenticate, checkCorrespondenceAccess, async (req, res) => {
  try {
    const correspondence = await adminCommService.updateCorrespondence(
      req.params.id,
      req.body,
      req.user._id
    );

    res.json({
      success: true,
      message: 'تم تحديث المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'فشل في تحديث المراسلة',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/admin-communications/correspondences/:id/send
 * @desc إرسال مراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/send',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const correspondence = await adminCommService.sendCorrespondence(req.params.id, req.user._id);

      res.json({
        success: true,
        message: 'تم إرسال المراسلة بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في إرسال المراسلة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/receive
 * @desc استلام مراسلة
 * @access Private
 */
router.post('/correspondences/:id/receive', authenticate, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const correspondence = await adminCommService.receiveCorrespondence(
      req.params.id,
      recipientId,
      req.user._id
    );

    res.json({
      success: true,
      message: 'تم استلام المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'فشل في استلام المراسلة',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/admin-communications/correspondences/:id/approve
 * @desc الموافقة على مراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/approve',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const { comments } = req.body;
      const correspondence = await adminCommService.approveCorrespondence(
        req.params.id,
        req.user._id,
        comments
      );

      res.json({
        success: true,
        message: 'تمت الموافقة على المراسلة بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في الموافقة على المراسلة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/reject
 * @desc رفض مراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/reject',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const correspondence = await adminCommService.rejectCorrespondence(
        req.params.id,
        req.user._id,
        reason
      );

      res.json({
        success: true,
        message: 'تم رفض المراسلة',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في رفض المراسلة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/directive
 * @desc إضافة توجيه على المراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/directive',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const correspondence = await adminCommService.addDirective(
        req.params.id,
        {
          ...req.body,
          fromUserName: req.user.name || req.user.nameAr,
        },
        req.user._id
      );

      res.json({
        success: true,
        message: 'تم إضافة التوجيه بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في إضافة التوجيه',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/attachments
 * @desc إضافة مرفق للمراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/attachments',
  authenticate,
  checkCorrespondenceAccess,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي ملف',
        });
      }

      const attachmentData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        description: req.body.description,
        isConfidential: req.body.isConfidential === 'true',
      };

      const correspondence = await adminCommService.addAttachment(
        req.params.id,
        attachmentData,
        req.user._id
      );

      res.json({
        success: true,
        message: 'تم رفع المرفق بنجاح',
        data: {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileSize: req.file.size,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في رفع المرفق',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route GET /api/admin-communications/correspondences/:id/attachments/:filename
 * @desc تحميل مرفق
 * @access Private
 */
router.get(
  '/correspondences/:id/attachments/:filename',
  authenticate,
  checkCorrespondenceAccess,
  (req, res) => {
    const safeId = sanitizePathParam(req.params.id);
    const safeFilename = sanitizePathParam(req.params.filename);
    if (!safeId || !safeFilename) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }
    const filePath = path.join(uploadDir, safeId, safeFilename);
    // Verify resolved path stays within uploadDir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
      });
    }

    res.download(filePath);
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/archive
 * @desc أرشفة مراسلة
 * @access Private
 */
router.post(
  '/correspondences/:id/archive',
  authenticate,
  authorize(['admin', 'archivist']),
  async (req, res) => {
    try {
      const correspondence = await adminCommService.archiveCorrespondence(
        req.params.id,
        req.body,
        req.user._id
      );

      res.json({
        success: true,
        message: 'تم أرشفة المراسلة بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في أرشفة المراسلة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route GET /api/admin-communications/correspondences/:id/thread
 * @desc الحصول على سلسلة المراسلات
 * @access Private
 */
router.get(
  '/correspondences/:id/thread',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const thread = await adminCommService.getCorrespondenceThread(req.params.id);

      res.json({
        success: true,
        data: thread,
      });
    } catch (error) {
      safeError(res, error, 'administrative-communications');
    }
  }
);

/**
 * @route GET /api/admin-communications/correspondences/:id/history
 * @desc الحصول على سجل إجراءات المراسلة
 * @access Private
 */
router.get(
  '/correspondences/:id/history',
  authenticate,
  checkCorrespondenceAccess,
  async (req, res) => {
    try {
      const actions = await CorrespondenceAction.find({
        correspondenceId: req.params.id,
      })
        .sort({ performedAt: -1 })
        .populate('performedBy', 'name nameAr');

      res.json({
        success: true,
        data: actions,
      });
    } catch (error) {
      safeError(res, error, 'administrative-communications');
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/:id/read
 * @desc تحديد المراسلة كمقروءة
 * @access Private
 */
router.post('/correspondences/:id/read', authenticate, async (req, res) => {
  try {
    const correspondence = await Correspondence.findById(req.params.id);

    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة',
      });
    }

    const userId = req.user._id.toString();
    const recipient = correspondence.recipients.find(r => r.entityId?.toString() === userId);

    if (recipient && !recipient.readAt) {
      recipient.readAt = new Date();
      await correspondence.save();
    }

    res.json({
      success: true,
      message: 'تم تحديد المراسلة كمقروءة',
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

// ==================== Templates Routes ====================

/**
 * @route GET /api/admin-communications/templates
 * @desc الحصول على قوالب المراسلات
 * @access Private
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await adminCommService.getTemplates(req.query.type);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route POST /api/admin-communications/templates
 * @desc إنشاء قالب جديد
 * @access Private
 */
router.post('/templates', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const template = await adminCommService.createTemplate(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القالب بنجاح',
      data: template,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'فشل في إنشاء القالب',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/admin-communications/templates/:id/apply
 * @desc تطبيق قالب
 * @access Private
 */
router.post('/templates/:id/apply', authenticate, async (req, res) => {
  try {
    const result = await adminCommService.applyTemplate(req.params.id, req.body.placeholders || {});

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'فشل في تطبيق القالب',
      error: 'حدث خطأ داخلي',
    });
  }
});

// ==================== External Entities Routes ====================

/**
 * @route GET /api/admin-communications/external-entities
 * @desc البحث في الجهات الخارجية
 * @access Private
 */
router.get('/external-entities', authenticate, async (req, res) => {
  try {
    const entities = await adminCommService.searchExternalEntities(
      req.query.q || '',
      req.query.type
    );

    res.json({
      success: true,
      data: entities,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route POST /api/admin-communications/external-entities
 * @desc إضافة جهة خارجية جديدة
 * @access Private
 */
router.post(
  '/external-entities',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const entity = await adminCommService.createExternalEntity(req.body);

      res.status(201).json({
        success: true,
        message: 'تم إضافة الجهة بنجاح',
        data: entity,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في إضافة الجهة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route GET /api/admin-communications/external-entities/:id
 * @desc الحصول على جهة خارجية
 * @access Private
 */
router.get('/external-entities/:id', authenticate, async (req, res) => {
  try {
    const entity = await ExternalEntity.findById(req.params.id);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'الجهة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    safeError(res, error, 'administrative-communications');
  }
});

/**
 * @route PUT /api/admin-communications/external-entities/:id
 * @desc تحديث جهة خارجية
 * @access Private
 */
router.put(
  '/external-entities/:id',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { name, type, contactPerson, email, phone, address, notes, status } = req.body;
      const entity = await ExternalEntity.findByIdAndUpdate(
        req.params.id,
        { name, type, contactPerson, email, phone, address, notes, status },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'الجهة غير موجودة',
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث الجهة بنجاح',
        data: entity,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل في تحديث الجهة',
        error: 'حدث خطأ داخلي',
      });
    }
  }
);

// ==================== Government Integration Routes ====================

/**
 * @route GET /api/admin-communications/government/ministries
 * @desc الحصول على قائمة الوزارات السعودية
 * @access Private
 */
router.get('/government/ministries', authenticate, (req, res) => {
  const ministries = [
    { id: 'MOI', nameAr: 'وزارة الداخلية', nameEn: 'Ministry of Interior' },
    { id: 'MOFA', nameAr: 'وزارة الخارجية', nameEn: 'Ministry of Foreign Affairs' },
    { id: 'MOF', nameAr: 'وزارة المالية', nameEn: 'Ministry of Finance' },
    { id: 'MOH', nameAr: 'وزارة الصحة', nameEn: 'Ministry of Health' },
    { id: 'MOE', nameAr: 'وزارة التعليم', nameEn: 'Ministry of Education' },
    { id: 'MOL', nameAr: 'وزارة العمل', nameEn: 'Ministry of Labor' },
    { id: 'MOJ', nameAr: 'وزارة العدل', nameEn: 'Ministry of Justice' },
    { id: 'MOHA', nameAr: 'وزارة الشؤون الإسلامية', nameEn: 'Ministry of Islamic Affairs' },
    { id: 'MOC', nameAr: 'وزارة التجارة', nameEn: 'Ministry of Commerce' },
    {
      id: 'MOMRA',
      nameAr: 'وزارة الشؤون البلدية والقروية',
      nameEn: 'Ministry of Municipal Affairs',
    },
    { id: 'MOT', nameAr: 'وزارة النقل', nameEn: 'Ministry of Transport' },
    { id: 'MOAW', nameAr: 'وزارة البيئة والمياه والزراعة', nameEn: 'Ministry of Environment' },
    { id: 'MOCI', nameAr: 'وزارة الثقافة', nameEn: 'Ministry of Culture' },
    { id: 'MOHRS', nameAr: 'وزارة الموارد البشرية', nameEn: 'Ministry of Human Resources' },
    { id: 'MOTI', nameAr: 'وزارة الصناعة والثروة المعدنية', nameEn: 'Ministry of Industry' },
    { id: 'MOD', nameAr: 'وزارة الدفاع', nameEn: 'Ministry of Defense' },
  ];

  res.json({
    success: true,
    data: ministries,
  });
});

/**
 * @route GET /api/admin-communications/government/regions
 * @desc الحصول على قائمة المناطق السعودية
 * @access Private
 */
router.get('/government/regions', authenticate, (req, res) => {
  const regions = [
    { id: 'RJ', nameAr: 'منطقة الرياض', nameEn: 'Riyadh Region' },
    { id: 'MK', nameAr: 'منطقة مكة المكرمة', nameEn: 'Makkah Region' },
    { id: 'EM', nameAr: 'المنطقة الشرقية', nameEn: 'Eastern Province' },
    { id: 'MD', nameAr: 'منطقة المدينة المنورة', nameEn: 'Madinah Region' },
    { id: 'AS', nameAr: 'منطقة عسير', nameEn: 'Asir Region' },
    { id: 'QS', nameAr: 'منطقة القصيم', nameEn: 'Qassim Region' },
    { id: 'TB', nameAr: 'منطقة تبوك', nameEn: 'Tabuk Region' },
    { id: 'HZ', nameAr: 'منطقة حائل', nameEn: 'Hail Region' },
    { id: 'NF', nameAr: 'منطقة الحدود الشمالية', nameEn: 'Northern Borders Region' },
    { id: 'JZ', nameAr: 'منطقة جازان', nameEn: 'Jazan Region' },
    { id: 'NJ', nameAr: 'منطقة نجران', nameEn: 'Najran Region' },
    { id: 'BA', nameAr: 'منطقة الباحة', nameEn: 'Al Bahah Region' },
    { id: 'JF', nameAr: 'منطقة الجوف', nameEn: 'Al Jawf Region' },
  ];

  res.json({
    success: true,
    data: regions,
  });
});

// ==================== Bulk Operations ====================

/**
 * @route POST /api/admin-communications/correspondences/bulk/status
 * @desc تحديث حالة مجموعة مراسلات
 * @access Private
 */
router.post(
  '/correspondences/bulk/status',
  authenticate,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { ids, status } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد المراسلات المراد تحديثها',
        });
      }

      const result = await Correspondence.updateMany(
        { _id: { $in: ids } },
        { status, updatedBy: req.user._id }
      );

      res.json({
        success: true,
        message: `تم تحديث ${result.modifiedCount} مراسلة`,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        },
      });
    } catch (error) {
      safeError(res, error, 'administrative-communications');
    }
  }
);

/**
 * @route POST /api/admin-communications/correspondences/bulk/archive
 * @desc أرشفة مجموعة مراسلات
 * @access Private
 */
router.post(
  '/correspondences/bulk/archive',
  authenticate,
  authorize(['admin', 'archivist']),
  async (req, res) => {
    try {
      const { ids, archiveLocation, retentionPeriod } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد المراسلات المراد أرشفتها',
        });
      }

      const archiveInfo = {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user._id,
        archiveLocation,
        retentionPeriod,
      };

      const result = await Correspondence.updateMany(
        { _id: { $in: ids } },
        {
          status: Status.ARCHIVED,
          archiveInfo,
          updatedBy: req.user._id,
        }
      );

      res.json({
        success: true,
        message: `تم أرشفة ${result.modifiedCount} مراسلة`,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        },
      });
    } catch (error) {
      safeError(res, error, 'administrative-communications');
    }
  }
);

// ==================== Helper Functions ====================

function getArabicTypeName(type) {
  const names = {
    [CorrespondenceType.INTERNAL_MEMO]: 'مذكرة داخلية',
    [CorrespondenceType.OFFICIAL_LETTER]: 'خطاب رسمي',
    [CorrespondenceType.CIRCULAR]: 'تعميم',
    [CorrespondenceType.DECISION]: 'قرار',
    [CorrespondenceType.REPORT]: 'تقرير',
    [CorrespondenceType.REQUEST]: 'طلب',
    [CorrespondenceType.RESPONSE]: 'رد',
    [CorrespondenceType.NOTIFICATION]: 'إشعار',
    [CorrespondenceType.CONTRACT]: 'عقد',
    [CorrespondenceType.INVITATION]: 'دعوة',
    [CorrespondenceType.MINUTES]: 'محضر',
  };
  return names[type] || type;
}

function getArabicPriorityName(priority) {
  const names = {
    [Priority.URGENT]: 'عاجل',
    [Priority.HIGH]: 'مهم جداً',
    [Priority.NORMAL]: 'عادي',
    [Priority.LOW]: 'قليل الأهمية',
  };
  return names[priority] || priority;
}

function getArabicStatusName(status) {
  const names = {
    [Status.DRAFT]: 'مسودة',
    [Status.PENDING_REVIEW]: 'قيد المراجعة',
    [Status.PENDING_APPROVAL]: 'قيد الاعتماد',
    [Status.APPROVED]: 'معتمد',
    [Status.REJECTED]: 'مرفوض',
    [Status.SENT]: 'مرسل',
    [Status.RECEIVED]: 'مستلم',
    [Status.IN_PROGRESS]: 'قيد التنفيذ',
    [Status.COMPLETED]: 'مكتمل',
    [Status.ARCHIVED]: 'مؤرشف',
    [Status.CANCELLED]: 'ملغي',
  };
  return names[status] || status;
}

function getArabicConfidentialityName(level) {
  const names = {
    [ConfidentialityLevel.PUBLIC]: 'عام',
    [ConfidentialityLevel.INTERNAL]: 'داخلي',
    [ConfidentialityLevel.CONFIDENTIAL]: 'سري',
    [ConfidentialityLevel.HIGHLY_CONFIDENTIAL]: 'سري للغاية',
  };
  return names[level] || level;
}

function getArabicSenderTypeName(type) {
  const names = {
    [SenderType.INTERNAL]: 'جهة داخلية',
    [SenderType.EXTERNAL]: 'جهة خارجية',
    [SenderType.GOVERNMENT]: 'جهة حكومية',
    [SenderType.PRIVATE]: 'قطاع خاص',
  };
  return names[type] || type;
}

module.exports = router;
