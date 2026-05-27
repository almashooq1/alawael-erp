/**
 * Core Documents Routes — مسارات إدارة المستندات الأساسية
 * ══════════════════════════════════════════════════════════════════
 * Base: /api/v1/documents  (also mirrored at /api/documents)
 *
 * Endpoints:
 *   POST   /upload                       رفع مستند جديد
 *   POST   /bulk                         عمليات جماعية (حذف/أرشفة)
 *   GET    /                             قائمة المستندات مع فلترة
 *   GET    /stats                        إحصائيات عامة
 *   GET    /dashboard                    بيانات لوحة التحكم
 *   GET    /reports/analytics            التحليلات
 *   GET    /folders                      المجلدات
 *   GET    /search                       البحث المتقدم
 *   GET    /:id                          تفاصيل مستند
 *   GET    /:id/preview                  معاينة المستند (inline)
 *   GET    /:id/download                 تنزيل المستند
 *   GET    /:id/versions                 قائمة الإصدارات
 *   PUT    /:id                          تحديث بيانات المستند
 *   DELETE /:id                          حذف ناعم
 *   POST   /:id/restore                  استرجاع من سلة المحذوفات
 *   POST   /:id/archive                  أرشفة
 *   POST   /:id/share                    مشاركة
 *   DELETE /:id/share/:shareId           إلغاء مشاركة
 *   POST   /:id/upload-version           رفع إصدار جديد
 *   POST   /:id/versions/:vid/restore    استرجاع إصدار
 */

'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const Document = require('../models/Document');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────────────────────────────────────
// Storage configuration
// ──────────────────────────────────────────────────────────────────────────────
const UPLOADS_ROOT =
  process.env.UPLOADS_ROOT ||
  (process.platform === 'win32'
    ? path.join(process.cwd(), 'uploads')
    : '/home/alawael/app/uploads');

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// Broad set of allowed MIME types for clinical documents
const ALLOWED_MIMES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroenabled.12',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint.presentation.macroenabled.12',
  'application/vnd.oasis.opendocument.presentation',
  // Text / data
  'text/plain',
  'text/csv',
  'application/json',
  'text/xml',
  'application/xml',
  'text/html',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/flac',
  'audio/aac',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/x-msvideo',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
]);

// Use memory storage — hash content for dedup, then write to disk manually
const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    // Allow even if mime check misses, fall back to extension check
    const ext = path
      .extname(file.originalname || '')
      .toLowerCase()
      .slice(1);
    const KNOWN_EXTS = new Set([
      'pdf',
      'doc',
      'docx',
      'docm',
      'odt',
      'rtf',
      'xls',
      'xlsx',
      'xlsm',
      'ods',
      'csv',
      'ppt',
      'pptx',
      'pptm',
      'odp',
      'txt',
      'json',
      'xml',
      'html',
      'htm',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'webp',
      'tiff',
      'tif',
      'svg',
      'mp3',
      'wav',
      'ogg',
      'm4a',
      'flac',
      'aac',
      'mp4',
      'webm',
      'avi',
      'mkv',
      'mov',
      'zip',
      'rar',
      '7z',
      'gz',
      'tar',
    ]);
    if (KNOWN_EXTS.has(ext)) return cb(null, true);
    cb(Object.assign(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`), { statusCode: 400 }));
  },
});

/** Resolve file extension from mime or original name */
function extFor(mime, originalName) {
  const mimeMap = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.oasis.opendocument.text': '.odt',
    'text/rtf': '.rtf',
    'application/rtf': '.rtf',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.oasis.opendocument.spreadsheet': '.ods',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.oasis.opendocument.presentation': '.odp',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/xml': '.xml',
    'application/xml': '.xml',
    'text/html': '.html',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'video/x-msvideo': '.avi',
    'application/zip': '.zip',
    'application/x-7z-compressed': '.7z',
    'application/gzip': '.gz',
    'application/x-tar': '.tar',
  };
  if (mimeMap[mime]) return mimeMap[mime];
  return path.extname(originalName || '').toLowerCase() || '.bin';
}

/** Map mime type to Document.fileType enum value */
function mimeToFileType(mime, originalName) {
  const ext = path
    .extname(originalName || '')
    .toLowerCase()
    .slice(1);
  const VALID_TYPES = new Set([
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
  ]);
  if (VALID_TYPES.has(ext)) return ext;
  if (mime.startsWith('image/')) return 'jpg';
  if (mime.startsWith('audio/')) return 'mp3';
  if (mime.startsWith('video/')) return 'mp4';
  if (mime === 'application/pdf') return 'pdf';
  return 'other';
}

/** Save buffer to disk under UPLOADS_ROOT/documents/YYYY-MM/ using sha256 hash name */
function saveToDisk(buffer, mime, originalName) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = extFor(mime, originalName);
  const now = new Date();
  const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dir = path.join(UPLOADS_ROOT, 'documents', folder);
  fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  const filename = `${hash}${ext}`;
  const fullPath = path.join(dir, filename);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buffer, { mode: 0o644 });
  }
  return { hash, filename, fullPath, folder, relativePath: `documents/${folder}/${filename}` };
}

// ──────────────────────────────────────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ══════════════════════════════════════════════════════════════════════════════
// POST /upload — رفع مستند جديد
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/upload',
  upload.single('file'),
  wrap(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const { title, description, category, tags, folder, parentFolderId } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'عنوان المستند مطلوب' });
    }

    const {
      hash,
      relativePath: _relativePath,
      fullPath,
    } = saveToDisk(req.file.buffer, req.file.mimetype, req.file.originalname);

    const fileType = mimeToFileType(req.file.mimetype, req.file.originalname);
    const ext = extFor(req.file.mimetype, req.file.originalname);
    const fileName = `${hash}${ext}`;

    // Parse tags from comma-separated string or JSON array
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        parsedTags = String(tags)
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
      }
    }

    const doc = await Document.create({
      fileName,
      originalFileName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: fullPath,
      title: title.trim(),
      description: description || '',
      category: category || 'أخرى',
      tags: parsedTags,
      folder: folder || 'root',
      parentFolderId: parentFolderId || null,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name || req.user.fullName || '',
      uploadedByEmail: req.user.email || '',
      contentFingerprint: hash,
      status: 'نشط',
    });

    logger.info(`[Documents] Uploaded: ${doc.title} by ${req.user._id}`);
    res.status(201).json({ success: true, document: doc });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /bulk — عمليات جماعية
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/bulk',
  wrap(async (req, res) => {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'action و ids مطلوبان' });
    }
    if (!['delete', 'archive', 'restore'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action غير صالح' });
    }

    let update = {};
    if (action === 'delete') update = { status: 'محذوف', isArchived: false };
    else if (action === 'archive')
      update = {
        status: 'مؤرشف',
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user._id,
      };
    else if (action === 'restore') update = { status: 'نشط', isArchived: false };

    const result = await Document.updateMany(
      { _id: { $in: ids }, uploadedBy: req.user._id },
      { $set: update }
    );
    res.json({ success: true, modified: result.modifiedCount });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /stats — إحصائيات
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/stats',
  wrap(async (_req, res) => {
    const [total, byCategory, byStatus, sizeAgg] = await Promise.all([
      Document.countDocuments({ status: { $ne: 'محذوف' } }),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
        { $sort: { count: -1 } },
      ]),
      Document.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$fileSize' },
            totalDownloads: { $sum: '$downloadCount' },
            totalViews: { $sum: '$viewCount' },
          },
        },
      ]),
    ]);

    const agg = sizeAgg[0] || {};
    res.json({
      success: true,
      stats: {
        totalDocuments: total,
        totalSize: agg.totalSize || 0,
        totalDownloads: agg.totalDownloads || 0,
        totalViews: agg.totalViews || 0,
        byCategory,
        byStatus,
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /dashboard — بيانات لوحة التحكم
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalActive,
      totalArchived,
      totalDeleted,
      recentUploads,
      byCategory,
      byFileType,
      recentDocs,
      expiringDocs,
      totalSize,
    ] = await Promise.all([
      Document.countDocuments({ status: 'نشط' }),
      Document.countDocuments({ status: 'مؤرشف' }),
      Document.countDocuments({ status: 'محذوف' }),
      Document.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, status: 'نشط' }),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: '$fileType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Document.find({ status: 'نشط' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title originalFileName fileType fileSize uploadedByName createdAt category'),
      Document.find({
        expiryDate: { $gte: tomorrow, $lte: thirtyDaysLater },
        status: 'نشط',
      })
        .select('title expiryDate category')
        .limit(10),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } },
      ]),
    ]);

    const weeklyNew = await Document.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      status: 'نشط',
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalActive,
          totalArchived,
          totalDeleted,
          recentUploads,
          weeklyNew,
          totalSize: totalSize[0]?.total || 0,
        },
        categories: byCategory,
        fileTypes: byFileType,
        recentDocuments: recentDocs,
        expiringDocuments: expiringDocs,
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /reports/analytics — تحليلات
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/reports/analytics',
  wrap(async (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [uploadTrend, topDownloaded, topViewed, sizeByCategory] = await Promise.all([
      Document.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Document.find({ status: { $ne: 'محذوف' } })
        .sort({ downloadCount: -1 })
        .limit(5)
        .select('title downloadCount fileType category'),
      Document.find({ status: { $ne: 'محذوف' } })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title viewCount fileType category'),
      Document.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        { $group: { _id: '$category', totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } },
        { $sort: { totalSize: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: { uploadTrend, topDownloaded, topViewed, sizeByCategory },
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /folders — المجلدات
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/folders',
  wrap(async (_req, res) => {
    const folders = await Document.distinct('folder', { status: { $ne: 'محذوف' } });
    const result = folders.filter(Boolean).map(name => ({ name, label: name }));
    res.json({ success: true, folders: result });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /search — بحث متقدم
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/search',
  wrap(async (req, res) => {
    const { q, category, dateFrom, dateTo, fileType, page = 1, limit = 20 } = req.query;

    const filter = { status: { $ne: 'محذوف' } };

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } },
        { originalFileName: { $regex: escaped, $options: 'i' } },
        { extractedText: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (fileType) filter.fileType = fileType;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .select(
          'title originalFileName fileType fileSize category tags uploadedByName createdAt status downloadCount viewCount'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      documents,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET / — قائمة المستندات
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/',
  wrap(async (req, res) => {
    const {
      page = 1,
      limit = 15,
      category,
      status,
      search,
      folder,
      sortBy = '-createdAt',
      fileType,
      dateFrom,
      dateTo,
      isArchived,
      uploadedBy,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    else if (isArchived === 'true') filter.status = 'مؤرشف';
    else filter.status = { $ne: 'محذوف' };

    if (category) filter.category = category;
    if (fileType) filter.fileType = fileType;
    if (folder) filter.folder = folder;
    if (uploadedBy) filter.uploadedBy = uploadedBy;

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { originalFileName: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // sortBy: prefix '-' means desc
    const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
    const sortDir = sortBy.startsWith('-') ? -1 : 1;
    const sort = { [sortField]: sortDir };

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('uploadedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      documents,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /:id — تفاصيل مستند واحد
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/:id',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } }).populate(
      'uploadedBy',
      'name email'
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    // Increment view count + touch lastViewedAt (W197b — keeps the smart
    // archive recommender's idle signal honest; previously it could only
    // see updatedAt which never moves on pure reads).
    await Document.findByIdAndUpdate(req.params.id, {
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: new Date() },
    });

    res.json({ success: true, document: doc });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /:id/preview — معاينة المستند (inline stream)
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/:id/preview',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    // W454: defense-in-depth path-boundary check. `doc.filePath` is
    // currently set only by saveToDisk() (server-controlled) and PUT
    // /:id uses an explicit allowlist (no filePath update), so this
    // check is belt-and-suspenders against future regressions, direct
    // DB writes, or migrations that touch filePath.
    const resolvedPath = path.resolve(doc.filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
      logger.warn('[Documents] Path-boundary violation', {
        docId: String(doc._id),
        filePath: doc.filePath,
      });
      return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
    }

    // W462: Stored-XSS defense on preview. ALLOWED_MIMES includes
    // `text/html`, `text/xml`, and `application/xml` for legitimate
    // template/report uploads — but with Content-Disposition:inline
    // an attacker uploading malicious HTML (`<script>` tags) would
    // get it RENDERED in the application origin on preview, owning
    // any admin who clicks the preview link (session theft, CSRF
    // token theft, PHI exfil). `text/xml` carries the same risk via
    // XSL processing instructions.
    //
    // Mitigation: for these executable-script MIME types, force the
    // `attachment` disposition (browser downloads, never renders).
    // Also strip the X-Frame-Options header that some browsers honor
    // for iframe embedding. PDF/images/Word docs continue to preview
    // inline as before.
    const mime = doc.mimeType || 'application/octet-stream';
    const isExecutableScript =
      /^text\/(html|xml)/i.test(mime) ||
      /^application\/xml/i.test(mime) ||
      /^image\/svg/i.test(mime); // SVG can carry inline <script> too
    const disposition = isExecutableScript ? 'attachment' : 'inline';

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(doc.originalFileName)}"`
    );
    if (isExecutableScript) {
      // Defense-in-depth: even if a browser ignores the disposition,
      // these headers block in-iframe rendering and execution.
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
    stream.on('error', err => {
      logger.error('[Documents] Preview stream error:', err);
      if (!res.headersSent) safeError(res, err, 'preview');
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /:id/download — تنزيل المستند
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/:id/download',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    // W454: defense-in-depth path-boundary check (see /preview)
    const resolvedPath = path.resolve(doc.filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
      logger.warn('[Documents] Path-boundary violation', {
        docId: String(doc._id),
        filePath: doc.filePath,
      });
      return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
    }

    await Document.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });

    const safeFilename = encodeURIComponent(doc.originalFileName || doc.fileName);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', doc.fileSize);
    res.setHeader('Cache-Control', 'private, no-cache');

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
    stream.on('error', err => {
      logger.error('[Documents] Download stream error:', err);
      if (!res.headersSent) safeError(res, err, 'download');
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GET /:id/versions — قائمة الإصدارات
// ══════════════════════════════════════════════════════════════════════════════
router.get(
  '/:id/versions',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } }).select(
      'title version previousVersions isLatestVersion'
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const versions = [
      {
        versionNumber: doc.version || 1,
        isCurrent: true,
        uploadedAt: doc.updatedAt || doc.createdAt,
      },
      ...(doc.previousVersions || []).map(v => ({ ...(v.toObject?.() || v), isCurrent: false })),
    ].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));

    res.json({ success: true, versions, currentVersion: doc.version || 1 });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// PUT /:id — تحديث بيانات المستند
// ══════════════════════════════════════════════════════════════════════════════
router.put(
  '/:id',
  wrap(async (req, res) => {
    const { title, description, category, tags, folder, status, metadata } = req.body;

    const allowed = {};
    if (title) allowed.title = title.trim();
    if (description !== undefined) allowed.description = description;
    if (category) allowed.category = category;
    if (tags !== undefined) {
      try {
        allowed.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        allowed.tags = String(tags)
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
      }
    }
    if (folder) allowed.folder = folder;
    if (status) allowed.status = status;
    if (metadata) allowed.metadata = metadata;
    allowed.lastModified = new Date();
    allowed.lastModifiedBy = req.user._id;

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'محذوف' } },
      { $set: allowed },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    res.json({ success: true, document: doc });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /:id — حذف ناعم
// ══════════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'محذوف' } },
      { $set: { status: 'محذوف', isArchived: false } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    logger.info(`[Documents] Soft-deleted: ${doc.title} by ${req.user._id}`);
    res.json({ success: true, message: 'تم حذف المستند' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/restore — استرجاع من سلة المحذوفات
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/:id/restore',
  wrap(async (req, res) => {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, status: 'محذوف' },
      { $set: { status: 'نشط', isArchived: false } },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'المستند غير موجود في سلة المحذوفات' });

    res.json({ success: true, message: 'تم استرجاع المستند', document: doc });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/archive — أرشفة
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/:id/archive',
  wrap(async (req, res) => {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, status: 'نشط' },
      {
        $set: {
          status: 'مؤرشف',
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: req.user._id,
        },
      },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'المستند غير موجود أو مؤرشف بالفعل' });

    res.json({ success: true, message: 'تم أرشفة المستند', document: doc });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/share — مشاركة المستند
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/:id/share',
  wrap(async (req, res) => {
    const { email, permission = 'view', name } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    // Check if already shared
    const existing = doc.sharedWith.find(s => s.email === email.trim());
    if (existing) {
      existing.permission = permission;
      existing.sharedAt = new Date();
    } else {
      doc.sharedWith.push({
        email: email.trim(),
        name: name || '',
        permission,
        sharedAt: new Date(),
      });
    }

    await doc.save();
    res.json({ success: true, message: 'تمت المشاركة بنجاح', sharedWith: doc.sharedWith });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /:id/share/:shareId — إلغاء مشاركة
// ══════════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id/share/:shareId',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const before = doc.sharedWith.length;
    doc.sharedWith = doc.sharedWith.filter(s => String(s._id) !== req.params.shareId);

    if (doc.sharedWith.length === before) {
      return res.status(404).json({ success: false, message: 'المشاركة غير موجودة' });
    }

    await doc.save();
    res.json({ success: true, message: 'تم إلغاء المشاركة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/upload-version — رفع إصدار جديد
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/:id/upload-version',
  upload.single('file'),
  wrap(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const { hash, fullPath } = saveToDisk(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    // Save current version to previousVersions
    const prevEntry = {
      versionNumber: doc.version || 1,
      uploadedAt: doc.updatedAt || doc.createdAt,
      uploadedBy: doc.uploadedBy,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      changes: req.body.changes || '',
    };

    const newVersion = (doc.version || 1) + 1;
    const ext = extFor(req.file.mimetype, req.file.originalname);

    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        fileName: `${hash}${ext}`,
        originalFileName: req.file.originalname,
        fileType: mimeToFileType(req.file.mimetype, req.file.originalname),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: fullPath,
        contentFingerprint: hash,
        version: newVersion,
        isLatestVersion: true,
        lastModified: new Date(),
        lastModifiedBy: req.user._id,
      },
      $push: { previousVersions: prevEntry },
    });

    res.json({ success: true, message: 'تم رفع الإصدار الجديد', version: newVersion });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/versions/:vid/restore — استرجاع إصدار سابق
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/:id/versions/:vid/restore',
  wrap(async (req, res) => {
    const doc = await Document.findOne({ _id: req.params.id, status: { $ne: 'محذوف' } });
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const targetVersion = (doc.previousVersions || []).find(
      v => String(v._id) === req.params.vid || String(v.versionNumber) === req.params.vid
    );
    if (!targetVersion) {
      return res.status(404).json({ success: false, message: 'الإصدار غير موجود' });
    }

    // Save current as previous version entry
    const prevEntry = {
      versionNumber: doc.version || 1,
      uploadedAt: doc.updatedAt,
      uploadedBy: doc.uploadedBy,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      changes: `استرجاع إلى الإصدار ${targetVersion.versionNumber}`,
    };

    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        filePath: targetVersion.filePath,
        fileSize: targetVersion.fileSize,
        version: (doc.version || 1) + 1,
        lastModified: new Date(),
        lastModifiedBy: req.user._id,
      },
      $push: { previousVersions: prevEntry },
    });

    res.json({ success: true, message: `تم استرجاع الإصدار ${targetVersion.versionNumber}` });
  })
);

module.exports = router;
