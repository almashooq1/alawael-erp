/* eslint-disable no-unused-vars */
/**
 * Documents Management System - Real MongoDB API Routes
 * نظام إدارة المستندات - مع قاعدة بيانات MongoDB حقيقية
 *
 * Features:
 * - Document Upload & Management (real file storage)
 * - Categories & Tags
 * - Advanced Search & Filters
 * - Version Control
 * - Permissions & Sharing
 * - Reports & Analytics
 * - Download & Preview
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// Lazy-loaded dependencies (avoid circular imports)
let Document;
const getDocument = () => {
  if (!Document) Document = require('../../models/Document');
  return Document;
};

// Upload middleware (disk storage, 50MB)
const { upload, handleUploadError, fileFilter } = require('../../middleware/uploadMiddleware');

// Uploads directory
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// RBAC Integration
let createRBACMiddleware;
try {
  const rbacModule = require('../../rbac');
  createRBACMiddleware = rbacModule.createRBACMiddleware;
} catch (err) {
  createRBACMiddleware = _permissions => (_req, _res, next) => next();
}

// Document Categories (Arabic)
const CATEGORIES = [
  { id: 'تقارير', name: 'التقارير', nameEn: 'Reports', icon: 'chart', color: '#FF9800' },
  { id: 'عقود', name: 'العقود', nameEn: 'Contracts', icon: 'document', color: '#2196F3' },
  { id: 'سياسات', name: 'السياسات', nameEn: 'Policies', icon: 'clipboard', color: '#F44336' },
  { id: 'تدريب', name: 'التدريب', nameEn: 'Training', icon: 'education', color: '#9C27B0' },
  { id: 'مالي', name: 'المالي', nameEn: 'Financial', icon: 'money', color: '#4CAF50' },
  { id: 'شهادات', name: 'الشهادات', nameEn: 'Certificates', icon: 'badge', color: '#E91E63' },
  { id: 'مراسلات', name: 'المراسلات', nameEn: 'Correspondence', icon: 'mail', color: '#00BCD4' },
  { id: 'أخرى', name: 'أخرى', nameEn: 'Other', icon: 'folder', color: '#607D8B' },
];

// Supported file type extensions (shared across all upload routes)
const KNOWN_FILE_TYPES = [
  'pdf',
  'doc',
  'docx',
  'docm',
  'xls',
  'xlsx',
  'xlsm',
  'ppt',
  'pptx',
  'pptm',
  'odt',
  'ods',
  'odp',
  'txt',
  'csv',
  'rtf',
  'html',
  'htm',
  'xml',
  'json',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'tiff',
  'tif',
  'svg',
  'zip',
  'rar',
  '7z',
  'gz',
  'tar',
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'ogv',
];

// Dangerous file types that must be rejected on upload
const BLOCKED_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'dll',
  'scr',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'ps1',
  'pif',
  'hta',
  'cpl',
  'inf',
  'reg',
];

/**
 * Check if a user can access a document.
 * Returns true if: user is admin, document owner, or explicitly shared with user.
 */
function canAccessDocument(document, userId, userRole) {
  if (userRole === 'admin') return true;
  if (document.isPublic) return true;
  const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
  if (ownerId === userId) return true;
  if (document.sharedWith?.some(s => s.userId?.toString() === userId || s.email === userId)) {
    return true;
  }
  return false;
}

// Apply authentication to all routes
router.use(authenticateToken);

// ========================================================================
// DASHBOARD
// ========================================================================

/**
 * @route   GET /api/documents/dashboard
 * @desc    Dashboard with stats, categories, recent documents
 */
router.get('/dashboard', async (req, res) => {
  try {
    const Doc = getDocument();

    // Run all independent queries in parallel for performance
    const [
      totalDocuments,
      totalSizeAgg,
      catAgg,
      recentDocuments,
      activityAgg,
      pendingApproval,
      sharedDocuments,
    ] = await Promise.all([
      Doc.countDocuments({ status: { $ne: 'محذوف' } }),
      Doc.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
      Doc.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Doc.find({ status: { $ne: 'محذوف' } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title category fileType fileSize createdAt uploadedByName status')
        .lean(),
      Doc.aggregate([
        { $unwind: { path: '$activityLog', preserveNullAndEmptyArrays: false } },
        { $sort: { 'activityLog.performedAt': -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            documentId: '$_id',
            documentTitle: '$title',
            action: '$activityLog.action',
            performedByName: '$activityLog.performedByName',
            performedAt: '$activityLog.performedAt',
            details: '$activityLog.details',
          },
        },
      ]),
      Doc.countDocuments({ approvalStatus: 'معلق', status: 'نشط' }),
      Doc.countDocuments({
        'sharedWith.0': { $exists: true },
        status: { $ne: 'محذوف' },
      }),
    ]);

    const totalSize = totalSizeAgg[0]?.total || 0;

    const catMap = {};
    catAgg.forEach(c => {
      catMap[c._id] = c.count;
    });
    const categoryBreakdown = CATEGORIES.map(cat => ({
      ...cat,
      count: catMap[cat.id] || 0,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalDocuments,
          totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          pendingApproval,
          sharedDocuments,
        },
        categoryBreakdown,
        recentDocuments,
        recentActivities: activityAgg,
        categories: CATEGORIES,
      },
    });
  } catch (error) {
    logger.error('[Documents] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب لوحة المعلومات' });
  }
});

// ========================================================================
// LIST & SEARCH
// ========================================================================

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const Doc = getDocument();
    const matchQuery = { status: { $ne: 'محذوف' } };

    const [totalDocuments, totalSizeAgg, byCategory] = await Promise.all([
      Doc.countDocuments(matchQuery),
      Doc.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
      Doc.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
      ]),
    ]);

    res.json({
      totalDocuments,
      totalSize: totalSizeAgg[0]?.total || 0,
      byCategory,
    });
  } catch (error) {
    logger.error('[Documents] Stats error:', error);
    res.status(500).json({ message: 'خطأ في جلب الإحصائيات' });
  }
});

/**
 * @route   GET /api/documents/search
 * @desc    Advanced search for documents
 */
router.get('/search', async (req, res) => {
  try {
    const Doc = getDocument();
    const { q, category, dateFrom, dateTo } = req.query;

    const query = { status: { $ne: 'محذوف' } };

    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedQ, $options: 'i' } },
        { description: { $regex: escapedQ, $options: 'i' } },
        { tags: { $in: [new RegExp(escapedQ, 'i')] } },
      ];
    }

    if (category) query.category = category;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (isNaN(from.getTime()))
          return res.status(400).json({ message: 'تاريخ البداية غير صالح' });
        query.createdAt.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (isNaN(to.getTime())) return res.status(400).json({ message: 'تاريخ النهاية غير صالح' });
        query.createdAt.$lte = to;
      }
    }

    const documents = await Doc.find(query)
      .populate('uploadedBy', 'name email')
      .sort('-createdAt')
      .limit(200)
      .lean();

    res.json({ total: documents.length, documents });
  } catch (error) {
    logger.error('[Documents] Search error:', error);
    res.status(500).json({ message: 'خطأ في البحث' });
  }
});

/**
 * @route   GET /api/documents/search/advanced
 * @desc    Advanced search with more filters
 */
router.get('/search/advanced', async (req, res) => {
  try {
    const Doc = getDocument();
    const { query: q, categoryId, status, dateFrom, dateTo } = req.query;

    const matchQuery = { status: { $ne: 'محذوف' } };

    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.$or = [
        { title: { $regex: escapedQ, $options: 'i' } },
        { description: { $regex: escapedQ, $options: 'i' } },
        { tags: { $in: [new RegExp(escapedQ, 'i')] } },
      ];
    }

    if (categoryId) matchQuery.category = categoryId;
    if (status) matchQuery.status = status;
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (isNaN(from.getTime()))
        return res.status(400).json({ success: false, message: 'تاريخ البداية غير صالح' });
      matchQuery.createdAt = { ...(matchQuery.createdAt || {}), $gte: from };
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (isNaN(to.getTime()))
        return res.status(400).json({ success: false, message: 'تاريخ النهاية غير صالح' });
      matchQuery.createdAt = { ...(matchQuery.createdAt || {}), $lte: to };
    }

    const results = await Doc.find(matchQuery).sort('-createdAt').limit(200).lean();

    res.json({ success: true, data: { results, count: results.length } });
  } catch (error) {
    logger.error('[Documents] Advanced search error:', error);
    res.status(500).json({ success: false, message: 'خطأ في البحث المتقدم' });
  }
});

/**
 * @route   GET /api/documents/folders
 * @desc    Get folder list with counts
 */
router.get('/folders', async (req, res) => {
  try {
    const Doc = getDocument();

    const folders = await Doc.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: '$folder', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(folders);
  } catch (error) {
    logger.error('[Documents] Folders error:', error);
    res.status(500).json({ message: 'خطأ في جلب المجلدات' });
  }
});

/**
 * @route   GET /api/documents/categories/all
 * @desc    Get all document categories
 */
router.get('/categories/all', async (req, res) => {
  try {
    const Doc = getDocument();

    const catAgg = await Doc.aggregate([
      { $match: { status: { $ne: 'محذوف' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const catMap = {};
    catAgg.forEach(c => {
      catMap[c._id] = c.count;
    });

    const categories = CATEGORIES.map(cat => ({
      ...cat,
      count: catMap[cat.id] || 0,
    }));

    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('[Documents] Categories error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الفئات' });
  }
});

/**
 * @route   GET /api/documents/templates/all
 * @desc    Get document templates
 */
router.get('/templates/all', async (req, res) => {
  try {
    let Template;
    try {
      Template = require('../../models/Template');
    } catch (_e) {
      /* no template model */
    }

    if (Template) {
      const templates = await Template.find({ type: 'document' }).lean();
      return res.json({ success: true, data: templates });
    }

    res.json({
      success: true,
      data: [
        { id: 'tpl_01', name: 'عقد عمل', category: 'عقود', format: 'docx' },
        { id: 'tpl_02', name: 'تقرير شهري', category: 'تقارير', format: 'docx' },
        { id: 'tpl_03', name: 'سياسة داخلية', category: 'سياسات', format: 'docx' },
        { id: 'tpl_04', name: 'شهادة إتمام', category: 'شهادات', format: 'pdf' },
      ],
    });
  } catch (error) {
    logger.error('[Documents] Templates error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب القوالب' });
  }
});

/**
 * @route   GET /api/documents/reports/analytics
 * @desc    Documents analytics and reports
 */
router.get('/reports/analytics', async (req, res) => {
  try {
    const Doc = getDocument();

    const activeMatch = { status: { $ne: 'محذوف' } };
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Run all independent queries in parallel
    const [
      totalDocuments,
      sizeAgg,
      downloadsAgg,
      catAgg,
      statusAgg,
      mostDownloaded,
      formatAgg,
      monthlyAgg,
    ] = await Promise.all([
      Doc.countDocuments(activeMatch),
      Doc.aggregate([
        { $match: activeMatch },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
      Doc.aggregate([
        { $match: activeMatch },
        { $group: { _id: null, total: { $sum: '$downloadCount' }, views: { $sum: '$viewCount' } } },
      ]),
      Doc.aggregate([
        { $match: activeMatch },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Doc.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Doc.find(activeMatch)
        .sort({ downloadCount: -1 })
        .limit(5)
        .select('title downloadCount viewCount')
        .lean(),
      Doc.aggregate([
        { $match: activeMatch },
        { $group: { _id: '$fileType', count: { $sum: 1 } } },
      ]),
      Doc.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, ...activeMatch } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalSize = sizeAgg[0]?.total || 0;
    const totalDownloads = downloadsAgg[0]?.total || 0;
    const totalViews = downloadsAgg[0]?.views || 0;

    const documentsByCategory = catAgg.map(c => ({
      category: c._id || 'أخرى',
      count: c.count,
      percentage: totalDocuments > 0 ? ((c.count / totalDocuments) * 100).toFixed(1) : '0',
    }));

    const documentsByStatus = {};
    statusAgg.forEach(s => {
      documentsByStatus[s._id] = s.count;
    });

    const byFormat = {};
    formatAgg.forEach(f => {
      byFormat[f._id || 'other'] = f.count;
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalDocuments,
          totalDownloads,
          totalViews,
          storageUsage: formatFileSize(totalSize),
        },
        documentsByCategory,
        documentsByStatus,
        mostDownloaded,
        storageUsage: { total: formatFileSize(totalSize), byFormat },
        monthlyUploads: monthlyAgg,
      },
    });
  } catch (error) {
    logger.error('[Documents] Analytics error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التحليلات' });
  }
});

// ========================================================================
// CRUD OPERATIONS
// ========================================================================

/**
 * @route   GET /api/documents
 * @desc    Get all documents with filters + pagination
 */
router.get('/', async (req, res) => {
  try {
    const Doc = getDocument();
    const { category, search, folder, status, sortBy, page = 1, limit = 20 } = req.query;

    const query = { status: { $ne: 'محذوف' } };

    if (category) query.category = category;
    if (folder) query.folder = folder;
    if (status) query.status = status;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } },
        { originalFileName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 500);
    const skip = (safePage - 1) * safeLimit;
    const total = await Doc.countDocuments(query);

    const documents = await Doc.find(query)
      .sort(sortBy || '-createdAt')
      .skip(skip)
      .limit(safeLimit)
      .populate('uploadedBy', 'name email')
      .lean();

    res.json({
      total,
      documents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error('[Documents] List error:', error);
    res.status(500).json({ message: 'خطأ في جلب المستندات' });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get a single document by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // Access control: owner, shared, admin, or public
    if (!canAccessDocument(document, req.user?.id, req.user?.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لعرض هذا المستند' });
    }

    // viewCount is only incremented in the preview route, not on detail fetch

    const relatedDocuments = await Doc.find({
      category: document.category,
      _id: { $ne: document._id },
      status: { $ne: 'محذوف' },
    })
      .limit(5)
      .select('title category fileType fileSize createdAt')
      .lean();

    // Strip sensitive server path from response
    const docObj = document.toObject ? document.toObject() : { ...document };
    delete docObj.filePath;
    if (docObj.previousVersions) {
      docObj.previousVersions = docObj.previousVersions.map(v => {
        const { filePath: _fp, ...rest } =
          typeof v.toObject === 'function' ? v.toObject() : { ...v };
        return rest;
      });
    }

    res.json({
      success: true,
      data: {
        document: docObj,
        relatedDocuments,
        activities: document.activityLog || [],
      },
    });
  } catch (error) {
    logger.error('[Documents] Get by ID error:', error);
    res.status(500).json({ message: 'خطأ في جلب المستند' });
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a new document (real file storage)
 */
router.post(
  '/upload',
  (req, res, next) => {
    upload(req, res, err => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'حدث خطأ أثناء رفع الملف',
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'لم يتم تحديد ملف للتحميل' });
      }

      if (req.file.size === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'لا يمكن تحميل ملف فارغ' });
      }

      const { title, description, category, tags, folder } = req.body;
      if (!req.user?.id) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(401).json({ message: 'يجب تسجيل الدخول' });
      }
      const userId = req.user.id;
      const userName = req.user.name || req.user.email || 'مستخدم';

      if (!title) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'العنوان مطلوب' });
      }

      const ext = path.extname(req.file.originalname).toLowerCase().slice(1);

      // Block dangerous file types
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'نوع الملف غير مسموح به لأسباب أمنية' });
      }

      const fileType = KNOWN_FILE_TYPES.includes(ext) ? ext : 'other';

      const Doc = getDocument();
      const document = new Doc({
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileType,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        title,
        description: description || '',
        category: category || 'أخرى',
        tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
        folder: folder || 'root',
        uploadedBy: userId,
        uploadedByName: userName,
        uploadedByEmail: req.user?.email || '',
        status: 'نشط',
        activityLog: [
          {
            action: 'تحميل',
            performedBy: userId,
            performedByName: userName,
            details: 'تم تحميل الملف ' + req.file.originalname,
          },
        ],
      });

      await document.save();

      logger.info(
        '[Documents] File uploaded: ' +
          document.title +
          ' (' +
          formatFileSize(document.fileSize) +
          ')'
      );

      res.status(201).json({
        message: 'تم تحميل المستند بنجاح',
        document,
      });
    } catch (error) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      logger.error('[Documents] Upload error:', error);
      res.status(500).json({ message: 'خطأ في تحميل المستند' });
    }
  }
);

/**
 * @route   POST /api/documents/upload-bulk
 * @desc    Bulk upload documents
 */
router.post(
  '/upload-bulk',
  (req, res, next) => {
    const multer = require('multer');
    const bulkStorage = multer.diskStorage({
      destination: (_r, _f, cb) => cb(null, uploadsDir),
      filename: (_r, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext);
      },
    });
    const bulkUpload = multer({
      storage: bulkStorage,
      fileFilter,
      limits: { fileSize: 50 * 1024 * 1024 },
    });
    bulkUpload.array('files', 20)(req, res, err => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      const Doc = getDocument();
      const files = req.files || [];
      if (!req.user?.id) {
        return res.status(401).json({ message: 'يجب تسجيل الدخول' });
      }
      const userId = req.user.id;
      const userName = req.user.name || 'مستخدم';

      const uploaded = [];
      const blocked = [];
      const failed = [];
      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase().slice(1);

        // Block dangerous file types
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
          blocked.push(file.originalname);
          continue; // skip this file
        }

        const fileType = KNOWN_FILE_TYPES.includes(ext) ? ext : 'other';

        try {
          const doc = new Doc({
            fileName: file.filename,
            originalFileName: file.originalname,
            fileType,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            title: file.originalname,
            category: req.body.category || 'أخرى',
            folder: req.body.folder || 'root',
            uploadedBy: userId,
            uploadedByName: userName,
            status: 'نشط',
            activityLog: [
              {
                action: 'تحميل',
                performedBy: userId,
                performedByName: userName,
                details: 'تحميل جماعي: ' + file.originalname,
              },
            ],
          });

          await doc.save();
          uploaded.push(doc);
        } catch (saveErr) {
          logger.error('[Documents] Bulk upload - failed to save:', file.originalname, saveErr);
          failed.push(file.originalname);
        }
      }

      let msg = 'تم تحميل ' + uploaded.length + ' مستند بنجاح';
      if (blocked.length) msg += '. تم رفض ' + blocked.length + ' ملف غير مسموح';
      if (failed.length) msg += '. فشل حفظ ' + failed.length + ' ملف';
      res.json({
        success: true,
        message: msg,
        uploaded,
        blocked,
        failed,
        filesProcessed: uploaded.length,
      });
    } catch (error) {
      logger.error('[Documents] Bulk upload error:', error);
      res.status(500).json({ success: false, message: 'خطأ في التحميل الجماعي' });
    }
  }
);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const { title, description, category, tags, folder, status } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || 'ضيف';

    // Ownership check: only owner or admin can update
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل هذا المستند' });
    }

    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (category) document.category = category;
    if (tags) {
      document.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }
    if (folder) document.folder = folder;
    if (status) document.status = status;
    document.lastModified = new Date();
    document.lastModifiedBy = userId;

    document.activityLog.push({
      action: 'تعديل',
      performedBy: userId,
      performedByName: userName,
      details: 'تم تحديث بيانات المستند',
    });

    await document.save();

    res.json({ message: 'تم تحديث المستند بنجاح', document });
  } catch (error) {
    logger.error('[Documents] Update error:', error);
    res.status(500).json({ message: 'خطأ في تحديث المستند' });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Soft-delete document
 */
router.delete('/:id', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const userId = req.user?.id;
    const userName = req.user?.name || 'ضيف';

    // Ownership check: only owner or admin can delete
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذا المستند' });
    }

    document.status = 'محذوف';
    document.activityLog.push({
      action: 'حذف',
      performedBy: userId,
      performedByName: userName,
    });
    await document.save();

    res.json({ message: 'تم حذف المستند. يمكنك استرجاعه خلال 30 يوماً', document });
  } catch (error) {
    logger.error('[Documents] Delete error:', error);
    res.status(500).json({ message: 'خطأ في حذف المستند' });
  }
});

/**
 * @route   POST /api/documents/:id/restore
 * @desc    Restore a soft-deleted document
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const userId = req.user?.id;
    const userName = req.user?.name || 'ضيف';

    // Ownership check: only owner or admin can restore
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لاسترجاع هذا المستند' });
    }

    document.status = 'نشط';
    document.activityLog.push({
      action: 'استرجاع',
      performedBy: userId,
      performedByName: userName,
    });
    await document.save();

    res.json({ message: 'تم استرجاع المستند بنجاح', document });
  } catch (error) {
    logger.error('[Documents] Restore error:', error);
    res.status(500).json({ message: 'خطأ في استرجاع المستند' });
  }
});

// ========================================================================
// SHARING
// ========================================================================

/**
 * @route   POST /api/documents/:id/share
 * @desc    Share document with a user
 */
router.post('/:id/share', async (req, res) => {
  try {
    const Doc = getDocument();
    const { email, permission } = req.body;

    if (!email || !permission) {
      return res.status(400).json({ message: 'البريد الإلكتروني والصلاحية مطلوبان' });
    }

    const document = await Doc.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const userId = req.user?.id;
    const userName = req.user?.name || 'ضيف';

    // Ownership check: only owner or admin can share
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لمشاركة هذا المستند' });
    }

    const existing = document.sharedWith.find(s => s.email === email);
    if (existing) {
      existing.permission = permission;
    } else {
      document.sharedWith.push({ email, permission });
    }

    document.activityLog.push({
      action: 'مشاركة',
      performedBy: userId,
      performedByName: userName,
      details: 'تم مشاركة المستند مع ' + email,
    });
    await document.save();

    res.json({ message: 'تم مشاركة المستند بنجاح', document });
  } catch (error) {
    logger.error('[Documents] Share error:', error);
    res.status(500).json({ message: 'خطأ في مشاركة المستند' });
  }
});

/**
 * @route   DELETE /api/documents/:id/share/:shareId
 * @desc    Revoke sharing access
 */
router.delete('/:id/share/:shareId', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // Ownership check: only owner or admin can revoke sharing
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإزالة المشاركة' });
    }

    document.sharedWith = document.sharedWith.filter(s => s._id.toString() !== req.params.shareId);

    document.activityLog.push({
      action: 'تعديل',
      performedBy: req.user?.id,
      performedByName: req.user?.name || 'ضيف',
      details: 'إزالة وصول مشاركة',
    });
    await document.save();

    res.json({ message: 'تم إزالة الوصول بنجاح', document });
  } catch (error) {
    logger.error('[Documents] Revoke share error:', error);
    res.status(500).json({ message: 'خطأ في إزالة الوصول' });
  }
});

// ========================================================================
// DOWNLOAD & PREVIEW
// ========================================================================

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download the actual document file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // Access control
    if (!canAccessDocument(document, req.user?.id, req.user?.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتنزيل هذا المستند' });
    }

    if (!document.filePath) {
      return res.status(404).json({ message: 'مسار الملف غير موجود' });
    }
    const UPLOADS_BASE = path.resolve(__dirname, '..', '..', 'uploads');
    const resolvedPath = path.resolve(document.filePath);
    if (!resolvedPath.startsWith(UPLOADS_BASE)) {
      return res.status(403).json({ message: 'مسار الملف غير مسموح' });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ message: 'الملف غير موجود على السيرفر' });
    }

    document.downloadCount = (document.downloadCount || 0) + 1;
    document.activityLog.push({
      action: 'تنزيل',
      performedBy: req.user?.id,
      performedByName: req.user?.name || 'ضيف',
    });
    await document.save();

    res.download(resolvedPath, document.originalFileName, err => {
      if (err) {
        logger.error('[Documents] Download file error:', err);
      }
    });
  } catch (error) {
    logger.error('[Documents] Download error:', error);
    res.status(500).json({ message: 'خطأ في تنزيل المستند' });
  }
});

/**
 * @route   GET /api/documents/:id/preview
 * @desc    Preview document (inline serving) with security headers & Range support
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // Access control
    if (!canAccessDocument(document, req.user?.id, req.user?.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية لمعاينة هذا المستند' });
    }

    if (!document.filePath) {
      return res.status(404).json({ message: 'مسار الملف غير موجود' });
    }
    const UPLOADS_BASE_PREV = path.resolve(__dirname, '..', '..', 'uploads');
    const resolvedPreviewPath = path.resolve(document.filePath);
    if (!resolvedPreviewPath.startsWith(UPLOADS_BASE_PREV)) {
      return res.status(403).json({ message: 'مسار الملف غير مسموح' });
    }
    if (!fs.existsSync(resolvedPreviewPath)) {
      return res.status(404).json({ message: 'الملف غير موجود على السيرفر' });
    }

    const mimeType = document.mimeType || 'application/octet-stream';
    const fileStat = fs.statSync(resolvedPreviewPath);
    const fileSize = fileStat.size;

    // Security: CSP for HTML/SVG to prevent XSS
    const dangerousMimes = ['text/html', 'application/xhtml+xml', 'image/svg+xml'];
    if (dangerousMimes.includes(mimeType)) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      'inline; filename="' + encodeURIComponent(document.originalFileName) + '"'
    );
    res.setHeader('Accept-Ranges', 'bytes');

    // Range request support for audio/video streaming
    const range = req.headers.range;

    // Only increment view count for non-Range requests (avoid inflation by media players)
    if (!range) {
      document.viewCount = (document.viewCount || 0) + 1;
      await document.save();
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const fileStream = fs.createReadStream(resolvedPreviewPath, { start, end });
      fileStream.pipe(res);
    } else {
      // Normal full-file response
      res.setHeader('Content-Length', fileSize);
      const fileStream = fs.createReadStream(resolvedPreviewPath);
      fileStream.pipe(res);
    }
  } catch (error) {
    logger.error('[Documents] Preview error:', error);
    res.status(500).json({ message: 'خطأ في معاينة المستند' });
  }
});

// ========================================================================
// VERSION MANAGEMENT
// ========================================================================

/**
 * @route   GET /api/documents/:id/versions
 * @desc    Get all versions of a document
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id)
      .select('version previousVersions title updatedAt')
      .lean();

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const versions = [
      {
        versionNumber: document.version || 1,
        isCurrent: true,
        uploadedAt: document.updatedAt,
      },
      ...(document.previousVersions || []).map(v => ({
        ...v,
        isCurrent: false,
      })),
    ];

    res.json({ success: true, documentId: req.params.id, versions });
  } catch (error) {
    logger.error('[Documents] Get versions error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب النسخ' });
  }
});

/**
 * @route   POST /api/documents/:id/upload-version
 * @desc    Upload a new version of a document
 */
router.post(
  '/:id/upload-version',
  (req, res, next) => {
    upload(req, res, err => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const Doc = getDocument();
      const document = await Doc.findById(req.params.id);

      if (!document) {
        return res.status(404).json({ message: 'المستند غير موجود' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'لم يتم تحديد ملف' });
      }

      const userId = req.user?.id;
      const userName = req.user?.name || 'ضيف';

      // Ownership check: only owner or admin can upload new version
      const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
      if (ownerId !== userId && req.user?.role !== 'admin') {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'ليس لديك صلاحية لرفع نسخة جديدة' });
      }

      // Save current version to history
      if (!document.previousVersions) document.previousVersions = [];
      document.previousVersions.push({
        versionNumber: document.version || 1,
        uploadedAt: document.updatedAt || document.createdAt,
        uploadedBy: document.uploadedBy,
        filePath: document.filePath,
        fileSize: document.fileSize,
        changes: req.body.changes || req.body.changeDescription || '',
      });

      // Update to new version
      document.fileName = req.file.filename;
      document.originalFileName = req.file.originalname;
      document.filePath = req.file.path;
      document.fileSize = req.file.size;
      document.mimeType = req.file.mimetype;
      document.version = (document.version || 1) + 1;
      document.lastModified = new Date();
      document.lastModifiedBy = userId;

      const ext = path.extname(req.file.originalname).toLowerCase().slice(1);

      // Block dangerous file types
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'نوع الملف غير مسموح به لأسباب أمنية' });
      }

      document.fileType = KNOWN_FILE_TYPES.includes(ext) ? ext : 'other';

      document.activityLog.push({
        action: 'تعديل',
        performedBy: userId,
        performedByName: userName,
        details: 'تم رفع نسخة جديدة (الإصدار ' + document.version + ')',
      });

      await document.save();

      res.json({
        success: true,
        message: 'تم رفع الإصدار ' + document.version + ' بنجاح',
        document,
        versionId: 'v' + document.version,
      });
    } catch (error) {
      logger.error('[Documents] Upload version error:', error);
      res.status(500).json({ success: false, message: 'خطأ في رفع النسخة الجديدة' });
    }
  }
);

/**
 * @route   POST /api/documents/:id/versions/:versionId/restore
 * @desc    Restore a previous version
 */
router.post('/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const userId = req.user?.id;
    const userName = req.user?.name || 'ضيف';

    // Ownership check: only owner or admin can restore version
    const ownerId = document.uploadedBy?._id?.toString() || document.uploadedBy?.toString();
    if (ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لاسترجاع هذه النسخة' });
    }

    const vNum = parseInt(req.params.versionId.replace('v', ''));
    const oldVersion = (document.previousVersions || []).find(v => v.versionNumber === vNum);

    if (!oldVersion) {
      return res.status(404).json({ message: 'النسخة غير موجودة' });
    }

    // Verify old version file still exists on disk
    if (!oldVersion.filePath || !fs.existsSync(oldVersion.filePath)) {
      return res.status(404).json({ message: 'ملف الإصدار القديم غير موجود على السيرفر' });
    }

    if (!document.previousVersions) document.previousVersions = [];
    document.previousVersions.push({
      versionNumber: document.version,
      uploadedAt: document.updatedAt,
      uploadedBy: document.uploadedBy,
      filePath: document.filePath,
      fileSize: document.fileSize,
      changes: 'استبدال بالإصدار ' + vNum,
    });

    document.filePath = oldVersion.filePath;
    document.fileSize = oldVersion.fileSize;
    document.version = (document.version || 1) + 1;

    document.activityLog.push({
      action: 'استرجاع',
      performedBy: userId,
      performedByName: userName,
      details: 'تم استرجاع الإصدار ' + vNum,
    });

    await document.save();

    res.json({
      success: true,
      message: 'تم استرجاع الإصدار ' + vNum + ' بنجاح',
      document,
    });
  } catch (error) {
    logger.error('[Documents] Restore version error:', error);
    res.status(500).json({ success: false, message: 'خطأ في استرجاع النسخة' });
  }
});

/**
 * @route   GET /api/documents/:id/versions/:versionId/compare
 * @desc    Compare two versions (metadata comparison)
 */
router.get('/:id/versions/:versionId/compare', async (req, res) => {
  try {
    const Doc = getDocument();
    const document = await Doc.findById(req.params.id).lean();

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    const v1Num = parseInt(req.params.versionId.replace('v', ''));
    const v2Num = req.query.with ? parseInt(req.query.with.replace('v', '')) : document.version;

    const v1 = (document.previousVersions || []).find(v => v.versionNumber === v1Num);
    const currentVersion = {
      versionNumber: document.version,
      fileSize: document.fileSize,
      uploadedAt: document.updatedAt,
    };

    const version1 = v1 || currentVersion;
    const version2 =
      v2Num === document.version
        ? currentVersion
        : (document.previousVersions || []).find(v => v.versionNumber === v2Num);

    res.json({
      success: true,
      documentId: req.params.id,
      comparison: {
        version1: { number: v1Num, ...version1 },
        version2: { number: v2Num, ...version2 },
        differences: {
          sizeChange: (version2?.fileSize || 0) - (version1?.fileSize || 0),
        },
      },
    });
  } catch (error) {
    logger.error('[Documents] Compare versions error:', error);
    res.status(500).json({ success: false, message: 'خطأ في مقارنة النسخ' });
  }
});

// ========================================================================
// HELPERS
// ========================================================================

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
