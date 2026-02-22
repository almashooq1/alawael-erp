/**
 * Documents API Routes
 * مسارات واجهة برمجية متقدمة لإدارة الملفات والوثائق
 */

const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/zip',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('نوع الملف غير مدعوم', 400));
    }
  },
});

// ==================== UPLOAD & BASIC OPERATIONS ====================

// POST /api/documents/upload - Upload new document
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحميل أي ملف',
      });
    }

    const { title, description, category, tags } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'عنوان المستند مطلوب',
      });
    }

    // Create document
    const document = new Document({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileType: req.file.mimetype.split('/')[1],
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${req.file.filename}`,
      title: title,
      description: description || '',
      category: category || 'أخرى',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      uploadedByEmail: req.user.email,
    });

    // Add activity log
    document.addActivityLog('تحميل', req.user.id, req.user.name, 'تم تحميل الملف');

    await document.save();

    res.status(201).json({
      success: true,
      message: 'تم تحميل الملف بنجاح',
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ في تحميل الملف: ${error.message}`,
    });
  }
});

// ==================== SEARCH & FETCH ====================

// GET /api/documents/search - Search documents
router.get('/search', protect, async (req, res) => {
  try {
    const { q, category, status, archive } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (archive === 'true') filters.isArchived = true;
    if (archive === 'false') filters.isArchived = false;

    const results = await Document.find({
      $or: [
        { title: { $regex: q || '', $options: 'i' } },
        { description: { $regex: q || '', $options: 'i' } },
        { tags: { $in: [new RegExp(q || '', 'i')] } },
      ],
      ...filters,
      $or: [
        { uploadedBy: req.user.id },
        { 'sharedWith.userId': req.user.id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email');

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ في البحث: ${error.message}`,
    });
  }
});

// GET /api/documents/my-documents - Get user's documents
router.get('/my-documents', protect, async (req, res) => {
  try {
    const { category, status } = req.query;

    const query = {
      $or: [
        { uploadedBy: req.user.id },
        { 'sharedWith.userId': req.user.id },
      ],
    };

    if (category) query.category = category;
    if (status) query.status = status;

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email');

    res.json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ في الحصول على المستندات: ${error.message}`,
    });
  }
});

// GET /api/documents/:id - Get document details
router.get('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email')
      .populate('approvedBy', 'name');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    // Check access
    if (!document.hasAccess(req.user.id, 'view') && document.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض هذا المستند',
      });
    }

    // Increment view count
    document.viewCount = (document.viewCount || 0) + 1;
    document.addActivityLog('عرض', req.user.id, req.user.name, 'تم عرض المستند');
    await document.save();

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// ==================== SHARING ====================

// POST /api/documents/:id/share - Share document
router.post('/:id/share', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'فقط المالك يمكنه مشاركة المستند',
      });
    }

    const { userId, email, name, permission } = req.body;

    const shareData = {
      userId: userId,
      email: email || '',
      name: name || '',
      permission: permission || 'view',
      sharedAt: new Date(),
    };

    // Update or add share
    const existingIndex = document.sharedWith.findIndex(
      s => s.userId && s.userId.toString() === userId
    );

    if (existingIndex >= 0) {
      document.sharedWith[existingIndex] = shareData;
    } else {
      document.sharedWith.push(shareData);
    }

    document.addActivityLog(
      'مشاركة',
      req.user.id,
      req.user.name,
      `مشاركة مع ${name || email} (${permission})`
    );

    await document.save();

    res.json({
      success: true,
      message: 'تم مشاركة المستند بنجاح',
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ في المشاركة: ${error.message}`,
    });
  }
});

// DELETE /api/documents/:id/share/:userId - Revoke access
router.delete('/:id/share/:userId', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'فقط المالك يمكنه إلغاء المشاركة',
      });
    }

    document.sharedWith = document.sharedWith.filter(
      s => s.userId.toString() !== req.params.userId
    );

    document.addActivityLog(
      'إلغاء مشاركة',
      req.user.id,
      req.user.name,
      `تم إلغاء الوصول للمستخدم: ${req.params.userId}`
    );

    await document.save();

    res.json({
      success: true,
      message: 'تم إلغاء الوصول بنجاح',
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ في إلغاء الوصول: ${error.message}`,
    });
  }
});

// ==================== VERSIONING ====================

// POST /api/documents/:id/new-version - Create new version
router.post('/:id/new-version', protect, upload.single('file'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'فقط المالك يمكنه إنشاء إصدارات جديدة',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحميل ملف جديد',
      });
    }

    const { changeNotes } = req.body;

    // Save previous version
    document.previousVersions.push({
      versionNumber: document.version,
      uploadedAt: new Date(),
      uploadedBy: document.uploadedBy,
      filePath: document.filePath,
      fileSize: document.fileSize,
      changes: changeNotes || 'إصدار سابق',
    });

    // Update document
    document.fileName = req.file.filename;
    document.fileSize = req.file.size;
    document.filePath = `/uploads/${req.file.filename}`;
    document.version += 1;
    document.lastModified = new Date();
    document.lastModifiedBy = req.user.id;

    document.addActivityLog(
      'تحديث الإصدار',
      req.user.id,
      req.user.name,
      changeNotes || `تم إنشاء الإصدار ${document.version}`
    );

    await document.save();

    res.json({
      success: true,
      message: `تم إنشاء الإصدار ${document.version} بنجاح`,
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// GET /api/documents/:id/versions - Get all versions
router.get('/:id/versions', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).select(
      'version previousVersions lastModified lastModifiedBy'
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    res.json({
      success: true,
      currentVersion: document.version,
      versions: document.previousVersions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// ==================== ARCHIVE & DELETE ====================

// POST /api/documents/:id/archive - Archive document
router.post('/:id/archive', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'فقط المالك يمكنه أرشفة المستند',
      });
    }

    document.isArchived = true;
    document.archivedAt = new Date();
    document.archivedBy = req.user.id;
    document.status = 'مؤرشف';

    document.addActivityLog('أرشفة', req.user.id, req.user.name, 'تم أرشفة المستند');

    await document.save();

    res.json({
      success: true,
      message: 'تم أرشفة المستند بنجاح',
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// DELETE /api/documents/:id - Delete document permanently
router.delete('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لحذف هذا المستند',
      });
    }

    document.addActivityLog('حذف', req.user.id, req.user.name, 'تم حذف المستند');

    await Document.findByIdAndRemove(req.params.id);

    res.json({
      success: true,
      message: 'تم حذف المستند بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// ==================== STATS & ANALYTICS ====================

// GET /api/documents/stats/overview - Get statistics
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const stats = {
      totalDocuments: await Document.countDocuments({ uploadedBy: req.user.id }),
      totalSize: await Document.aggregate([
        { $match: { uploadedBy: req.user.id } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
      byCategory: await Document.aggregate([
        { $match: { uploadedBy: req.user.id } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      recentUploads: await Document.find({ uploadedBy: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title fileSize createdAt'),
      mostViewed: await Document.find({ uploadedBy: req.user.id })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title viewCount downloadCount'),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

// ==================== UPDATE ====================

// PUT /api/documents/:id - Update document metadata
router.put('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'المستند غير موجود',
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'فقط المالك يمكنه تعديل المستند',
      });
    }

    const { title, description, category, tags } = req.body;

    if (title) document.title = title;
    if (description) document.description = description;
    if (category) document.category = category;
    if (tags) document.tags = tags.split(',').map(t => t.trim());

    document.lastModified = new Date();
    document.lastModifiedBy = req.user.id;

    document.addActivityLog(
      'تعديل',
      req.user.id,
      req.user.name,
      'تم تحديث بيانات المستند'
    );

    await document.save();

    res.json({
      success: true,
      message: 'تم تحديث المستند بنجاح',
      data: document,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `خطأ: ${error.message}`,
    });
  }
});

module.exports = router;
