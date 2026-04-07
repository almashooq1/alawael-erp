/* eslint-disable no-unused-vars */
/**
 * Intelligent Communications Routes - مسارات الاتصالات الذكية
 * Comprehensive API routes for intelligent administrative communications
 */

const express = require('express');
const router = express.Router();
const {
  intelligentCommService,
  IntelligentCommunicationsService,
} = require('./intelligent-communications-service');
const authMiddleware = require('../middleware/advancedAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { escapeRegex } = require('../utils/sanitize');

// ============================================
// File Upload Configuration
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/correspondences');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `corr-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
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
  },
});

// Apply authentication to all routes
router.use(authMiddleware.requireAuth);

// ============================================
// Correspondence CRUD Operations
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence
 * @desc    Create new correspondence with AI analysis
 * @access  Private
 */
router.post('/correspondence', upload.array('attachments', 10), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');

    // Process attachments
    if (req.files && req.files.length > 0) {
      data.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: req.user._id,
      }));
    }

    // Set sender
    data.sender = {
      user: req.user._id,
      department: req.user.department,
      branch: req.user.branch,
    };

    const correspondence = await intelligentCommService.createCorrespondence(data, req.user._id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/template/:templateId
 * @desc    Create correspondence from template
 * @access  Private
 */
router.post(
  '/correspondence/template/:templateId',
  upload.array('attachments', 10),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const data = JSON.parse(req.body.data || '{}');

      // Process attachments
      if (req.files && req.files.length > 0) {
        data.attachments = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedBy: req.user._id,
        }));
      }

      // Set sender
      data.sender = {
        user: req.user._id,
        department: req.user.department,
        branch: req.user.branch,
      };

      const correspondence = await intelligentCommService.createFromTemplate(
        templateId,
        data,
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء المراسلة من القالب بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route   GET /api/intelligent-communications/correspondence
 * @desc    Search correspondences with advanced filters
 * @access  Private
 */
router.get('/correspondence', async (req, res) => {
  try {
    // Safe-parse user-controlled sort param — return 400 on invalid JSON
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      try {
        sort = JSON.parse(req.query.sort);
      } catch (_parseErr) {
        return res.status(400).json({
          success: false,
          message: 'معامل الترتيب (sort) غير صالح — يجب أن يكون JSON',
        });
      }
    }

    const result = await intelligentCommService.search(req.query, {
      page: req.query.page,
      limit: req.query.limit,
      sort,
      fields: req.query.fields,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/correspondence/:id
 * @desc    Get correspondence by ID
 * @access  Private
 */
router.get('/correspondence/:id', async (req, res) => {
  try {
    const Correspondence = intelligentCommService.Correspondence;
    const correspondence = await Correspondence.findById(req.params.id)
      .populate('sender.user', 'name email position')
      .populate('sender.department', 'name')
      .populate('sender.branch', 'name')
      .populate('recipients.user', 'name email')
      .populate('externalEntity.entity', 'name')
      .populate('actions.assignee', 'name email')
      .populate('comments.user', 'name email')
      .populate('timeline.performedBy', 'name email');

    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة',
      });
    }

    // Increment view count
    correspondence.statistics.viewCount += 1;
    correspondence.statistics.lastViewedAt = new Date();
    await correspondence.save();

    res.json({
      success: true,
      data: correspondence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   PUT /api/intelligent-communications/correspondence/:id
 * @desc    Update correspondence (draft only)
 * @access  Private (Creator only)
 */
router.put('/correspondence/:id', upload.array('attachments', 10), async (req, res) => {
  try {
    const Correspondence = intelligentCommService.Correspondence;
    const correspondence = await Correspondence.findById(req.params.id);

    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة',
      });
    }

    if (correspondence.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'يمكن تعديل المسودات فقط',
      });
    }

    if (correspondence.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذه المراسلة',
      });
    }

    const data = JSON.parse(req.body.data || '{}');

    // Process new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: req.user._id,
      }));
      data.attachments = [...(correspondence.attachments || []), ...newAttachments];
    }

    // Update fields
    Object.assign(correspondence, data);
    correspondence.updatedBy = req.user._id;
    correspondence.statistics.editCount += 1;

    // Add timeline entry
    correspondence.timeline.push({
      action: 'updated',
      performedBy: req.user._id,
    });

    await correspondence.save();

    res.json({
      success: true,
      message: 'تم تحديث المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Workflow Operations
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/submit
 * @desc    Submit correspondence for review
 * @access  Private (Creator only)
 */
router.post('/correspondence/:id/submit', async (req, res) => {
  try {
    const correspondence = await intelligentCommService.submitForReview(
      req.params.id,
      req.user._id
    );

    res.json({
      success: true,
      message: 'تم إرسال المراسلة للمراجعة',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/approve
 * @desc    Approve correspondence
 * @access  Private (Approver only)
 */
router.post('/correspondence/:id/approve', async (req, res) => {
  try {
    const { comments } = req.body;
    const correspondence = await intelligentCommService.approve(
      req.params.id,
      req.user._id,
      comments
    );

    res.json({
      success: true,
      message: 'تم اعتماد المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/reject
 * @desc    Reject correspondence
 * @access  Private (Approver only)
 */
router.post('/correspondence/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب الرفض مطلوب',
      });
    }

    const correspondence = await intelligentCommService.reject(req.params.id, req.user._id, reason);

    res.json({
      success: true,
      message: 'تم رفض المراسلة',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/send
 * @desc    Send correspondence
 * @access  Private
 */
router.post('/correspondence/:id/send', async (req, res) => {
  try {
    const correspondence = await intelligentCommService.send(req.params.id, req.user._id, req.body);

    res.json({
      success: true,
      message: 'تم إرسال المراسلة بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Recipient Actions
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/read
 * @desc    Mark correspondence as read
 * @access  Private (Recipient only)
 */
router.post('/correspondence/:id/read', async (req, res) => {
  try {
    const correspondence = await intelligentCommService.markAsRead(req.params.id, req.user._id);

    res.json({
      success: true,
      message: 'تم تحديد المراسلة كمقروءة',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/acknowledge
 * @desc    Acknowledge correspondence receipt
 * @access  Private (Recipient only)
 */
router.post('/correspondence/:id/acknowledge', async (req, res) => {
  try {
    const data = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const correspondence = await intelligentCommService.acknowledge(
      req.params.id,
      req.user._id,
      data
    );

    res.json({
      success: true,
      message: 'تم إقرار الاستلام بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/forward
 * @desc    Forward correspondence
 * @access  Private
 */
router.post('/correspondence/:id/forward', async (req, res) => {
  try {
    const forwarded = await intelligentCommService.forward(req.params.id, req.user._id, req.body);

    res.status(201).json({
      success: true,
      message: 'تم تحويل المراسلة بنجاح',
      data: forwarded,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Action Management
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/actions
 * @desc    Add action to correspondence
 * @access  Private
 */
router.post('/correspondence/:id/actions', async (req, res) => {
  try {
    const correspondence = await intelligentCommService.addAction(
      req.params.id,
      req.body,
      req.user._id
    );

    res.json({
      success: true,
      message: 'تم إضافة الإجراء بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   PUT /api/intelligent-communications/correspondence/:id/actions/:actionIndex/complete
 * @desc    Complete an action
 * @access  Private (Assignee only)
 */
router.put(
  '/correspondence/:id/actions/:actionIndex/complete',
  upload.array('attachments', 5),
  async (req, res) => {
    try {
      const data = {
        ...req.body,
        attachments: req.files
          ? req.files.map(file => ({
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
              uploadedBy: req.user._id,
            }))
          : [],
      };

      const correspondence = await intelligentCommService.completeAction(
        req.params.id,
        parseInt(req.params.actionIndex),
        data,
        req.user._id
      );

      res.json({
        success: true,
        message: 'تم إتمام الإجراء بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

// ============================================
// Escalation
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/escalate
 * @desc    Escalate correspondence
 * @access  Private
 */
router.post('/correspondence/:id/escalate', async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب التصعيد مطلوب',
      });
    }

    const correspondence = await intelligentCommService.escalate(
      req.params.id,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: 'تم تصعيد المراسلة',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Comments
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/comments
 * @desc    Add comment to correspondence
 * @access  Private
 */
router.post('/correspondence/:id/comments', upload.array('attachments', 3), async (req, res) => {
  try {
    const { content, isPrivate } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'محتوى التعليق مطلوب',
      });
    }

    const correspondence = await intelligentCommService.addComment(
      req.params.id,
      req.user._id,
      content,
      isPrivate === 'true'
    );

    res.json({
      success: true,
      message: 'تم إضافة التعليق بنجاح',
      data: correspondence,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// AI Features
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/analyze
 * @desc    Trigger AI analysis for correspondence
 * @access  Private
 */
router.post('/correspondence/:id/analyze', async (req, res) => {
  try {
    const Correspondence = intelligentCommService.Correspondence;
    const correspondence = await Correspondence.findById(req.params.id);

    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة',
      });
    }

    const analysis = await intelligentCommService.analyzeWithAI(correspondence);

    res.json({
      success: true,
      message: 'تم تحليل المراسلة بنجاح',
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/correspondence/:id/similar
 * @desc    Find similar correspondences
 * @access  Private
 */
router.get('/correspondence/:id/similar', async (req, res) => {
  try {
    const similar = await intelligentCommService.findSimilar(req.params.id, req.query.limit || 5);

    res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// External Entities
// ============================================

/**
 * @route   POST /api/intelligent-communications/entities
 * @desc    Create external entity
 * @access  Private (Admin only)
 */
router.post('/entities', authMiddleware.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const entity = new intelligentCommService.ExternalEntity({
      ...req.body,
      createdBy: req.user._id,
    });

    await entity.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الجهة الخارجية بنجاح',
      data: entity,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/entities
 * @desc    Get all external entities
 * @access  Private
 */
router.get('/entities', async (req, res) => {
  try {
    const { type, active, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (active !== undefined) query.active = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const entities = await intelligentCommService.ExternalEntity.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 },
    });

    res.json({
      success: true,
      ...entities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/entities/:id
 * @desc    Get external entity by ID
 * @access  Private
 */
router.get('/entities/:id', async (req, res) => {
  try {
    const entity = await intelligentCommService.ExternalEntity.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Templates
// ============================================

/**
 * @route   POST /api/intelligent-communications/templates
 * @desc    Create correspondence template
 * @access  Private (Admin only)
 */
router.post('/templates', authMiddleware.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const template = new intelligentCommService.Template({
      ...req.body,
      createdBy: req.user._id,
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القالب بنجاح',
      data: template,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/templates
 * @desc    Get all templates
 * @access  Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { type, active, page = 1, limit = 20 } = req.query;

    const query = { active: true };
    if (type) query.type = type;
    if (active !== undefined) query.active = active === 'true';

    const templates = await intelligentCommService.Template.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 },
    });

    res.json({
      success: true,
      ...templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await intelligentCommService.Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'القالب غير موجود',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Statistics and Reports
// ============================================

/**
 * @route   GET /api/intelligent-communications/statistics
 * @desc    Get correspondence statistics
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await intelligentCommService.getStatistics(req.query);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/overdue
 * @desc    Get overdue correspondences
 * @access  Private
 */
router.get('/overdue', async (req, res) => {
  try {
    const overdue = await intelligentCommService.getOverdue(req.query);

    res.json({
      success: true,
      ...overdue,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route   GET /api/intelligent-communications/reports/:type
 * @desc    Generate report
 * @access  Private
 */
router.get('/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const report = await intelligentCommService.generateReport(type, req.query);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Government Integrations
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/send-government
 * @desc    Send correspondence to government entity
 * @access  Private
 */
router.post(
  '/correspondence/:id/send-government',
  authMiddleware.requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const { entityId } = req.body;

      if (!entityId) {
        return res.status(400).json({
          success: false,
          message: 'معرف الجهة الحكومية مطلوب',
        });
      }

      const result = await intelligentCommService.sendToGovernmentEntity(req.params.id, entityId);

      res.json({
        success: true,
        message: 'تم إرسال المراسلة للجهة الحكومية بنجاح',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

/**
 * @route   GET /api/intelligent-communications/track-post/:trackingNumber
 * @desc    Track with Saudi Post
 * @access  Private
 */
router.get('/track-post/:trackingNumber', async (req, res) => {
  try {
    const tracking = await intelligentCommService.trackWithSaudiPost(req.params.trackingNumber);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// Archival
// ============================================

/**
 * @route   POST /api/intelligent-communications/correspondence/:id/archive
 * @desc    Archive correspondence
 * @access  Private (Admin only)
 */
router.post(
  '/correspondence/:id/archive',
  authMiddleware.requireRole(['admin', 'records_manager']),
  async (req, res) => {
    try {
      const correspondence = await intelligentCommService.archive(
        req.params.id,
        req.user._id,
        req.body
      );

      res.json({
        success: true,
        message: 'تم أرشفة المراسلة بنجاح',
        data: correspondence,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'حدث خطأ داخلي',
      });
    }
  }
);

// ============================================
// Dashboard
// ============================================

/**
 * @route   GET /api/intelligent-communications/dashboard
 * @desc    Get user dashboard data
 * @access  Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get counts
    const Correspondence = intelligentCommService.Correspondence;

    const [sentCount, receivedCount, pendingActionCount, overdueCount, draftsCount] =
      await Promise.all([
        // Sent by user
        Correspondence.countDocuments({
          'sender.user': userId,
          deletedAt: null,
        }),
        // Received by user
        Correspondence.countDocuments({
          'recipients.user': userId,
          deletedAt: null,
        }),
        // Pending action
        Correspondence.countDocuments({
          'recipients.user': userId,
          'recipients.actionRequired.type': { $ne: 'none' },
          'recipients.status': { $nin: ['completed', 'actioned'] },
          deletedAt: null,
        }),
        // Overdue
        Correspondence.countDocuments({
          $or: [{ 'sender.user': userId }, { 'recipients.user': userId }],
          dueDate: { $lt: new Date() },
          status: { $nin: ['completed', 'archived', 'cancelled'] },
          deletedAt: null,
        }),
        // Drafts
        Correspondence.countDocuments({
          'sender.user': userId,
          status: 'draft',
          deletedAt: null,
        }),
      ]);

    // Get recent activity
    const recentActivity = await Correspondence.find({
      $or: [{ 'sender.user': userId }, { 'recipients.user': userId }],
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('referenceNumber subject status priority createdAt type');

    // Get statistics
    const stats = await intelligentCommService.getStatistics({ user: userId });

    res.json({
      success: true,
      data: {
        counts: {
          sent: sentCount,
          received: receivedCount,
          pendingAction: pendingActionCount,
          overdue: overdueCount,
          drafts: draftsCount,
        },
        recentActivity,
        statistics: stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي',
    });
  }
});

module.exports = router;
