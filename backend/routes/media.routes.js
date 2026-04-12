/**
 * Media Routes — مسارات نظام الوسائط
 *
 * Comprehensive media library API:
 *  - Upload (single & bulk)
 *  - CRUD operations
 *  - Album management
 *  - Search, filter, sort
 *  - Favorites, pins
 *  - Analytics & storage stats
 *  - Download & streaming
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');
const { validateUploadedFile } = require('../utils/uploadValidator');

// ─── Models ──────────────────────────────────────────────────────────────────
const Media = require('../models/Media');
const MediaAlbum = require('../models/MediaAlbum');

// ─── Auth middleware (optional — graceful if missing) ────────────────────────
let authenticate;
try {
  const authMw = require('../middleware/auth');
  authenticate = authMw.authenticate || authMw.protect || authMw;
} catch {
  authenticate = (req, _res, next) => {
    req.user = req.user || { _id: 'system', name: 'System' };
    next();
  };
}

// ─── Upload setup ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads/media');
const thumbsDir = path.join(uploadsDir, 'thumbnails');
[uploadsDir, thumbsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, ''); // sanitize extension
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    cb(null, `${name}-${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // SVG removed — can contain embedded JavaScript (stored XSS risk)
    'image/bmp',
    'image/tiff',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
    'text/csv',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────
const classifyMime = mime => {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.includes('text') ||
    mime.includes('csv')
  )
    return 'document';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'archive';
  return 'other';
};

const formatSize = bytes => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const buildMediaUrl = (req, fileName) => {
  return `/api/media/file/${fileName}`;
};

// ============================================================================
// DASHBOARD & STATS
// ============================================================================

/**
 * GET /api/media
 * Media library dashboard: stats, recent files, storage breakdown
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?._id;
    const [stats, recent, albums, favorites] = await Promise.all([
      Media.getStorageStats(userId),
      Media.getRecentMedia(12),
      MediaAlbum.find({ status: 'نشط' }).sort({ updatedAt: -1 }).limit(8).lean(),
      Media.find({ isFavorite: true, status: 'نشط' })
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate('uploadedBy', 'name avatar')
        .lean(),
    ]);

    // Storage quota (configurable, default 5 GB)
    const quotaBytes = parseInt(process.env.MEDIA_QUOTA_MB || '5120') * 1024 * 1024;
    const usedBytes = stats.total.size;

    res.json({
      success: true,
      data: {
        stats: {
          totalFiles: stats.total.count,
          totalSize: usedBytes,
          totalSizeFormatted: formatSize(usedBytes),
          quota: quotaBytes,
          quotaFormatted: formatSize(quotaBytes),
          usagePercent: Math.round((usedBytes / quotaBytes) * 100),
          byType: stats.byType.map(t => ({
            type: t._id,
            count: t.count,
            size: t.totalSize,
            sizeFormatted: formatSize(t.totalSize),
          })),
        },
        recent: recent.map(m => ({
          ...m,
          url: buildMediaUrl(req, m.fileName),
          formattedSize: formatSize(m.fileSize),
        })),
        albums,
        favorites: favorites.map(m => ({
          ...m,
          url: buildMediaUrl(req, m.fileName),
          formattedSize: formatSize(m.fileSize),
        })),
      },
    });
  } catch (error) {
    safeError(res, error, 'GET /media dashboard error');
  }
});

/**
 * GET /api/media/stats
 * Detailed storage analytics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [overall, monthly, topUploaders] = await Promise.all([
      Media.getStorageStats(),
      Media.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
      Media.aggregate([
        { $match: { status: { $ne: 'محذوف' } } },
        {
          $group: {
            _id: '$uploadedBy',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
          },
        },
        { $sort: { totalSize: -1 } },
        { $limit: 10 },
        {
          $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$user.name', 'غير معروف'] },
            count: 1,
            totalSize: 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        overall: {
          ...overall.total,
          byType: overall.byType.map(t => ({
            type: t._id,
            count: t.count,
            size: t.totalSize,
            sizeFormatted: formatSize(t.totalSize),
          })),
        },
        monthly: monthly.map(m => ({
          month: m._id,
          count: m.count,
          size: m.totalSize,
          sizeFormatted: formatSize(m.totalSize),
        })),
        topUploaders: topUploaders.map(u => ({
          name: u.name,
          count: u.count,
          size: u.totalSize,
          sizeFormatted: formatSize(u.totalSize),
        })),
      },
    });
  } catch (error) {
    safeError(res, error, 'GET /media/stats error');
  }
});

// ============================================================================
// MEDIA CRUD
// ============================================================================

/**
 * POST /api/media/upload
 * Upload a single file
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  validateUploadedFile,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'لم يتم تحديد ملف للتحميل' });
      }

      const { title, description, alt, category, album, tags, visibility, folder } = req.body;

      const media = new Media({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        title: title || req.file.originalname,
        description: description || '',
        alt: alt || '',
        filePath: req.file.path,
        url: buildMediaUrl(req, req.file.filename),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        extension: path.extname(req.file.originalname).slice(1).toLowerCase(),
        mediaType: classifyMime(req.file.mimetype),
        category: category || 'عام',
        album: album || null,
        tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
        visibility: visibility || 'public',
        folder: folder || '/',
        uploadedBy: req.user._id,
        activityLog: [
          {
            action: 'upload',
            performedBy: req.user._id,
            details: `تحميل الملف: ${req.file.originalname}`,
          },
        ],
      });

      await media.save();

      // Update album media count
      if (album) {
        await MediaAlbum.findByIdAndUpdate(album, {
          $inc: { mediaCount: 1, totalSize: req.file.size },
        });
      }

      const populated = await Media.findById(media._id)
        .populate('uploadedBy', 'name email avatar')
        .lean();

      res.status(201).json({
        success: true,
        message: 'تم تحميل الملف بنجاح',
        data: {
          ...populated,
          url: buildMediaUrl(req, media.fileName),
          formattedSize: formatSize(media.fileSize),
        },
      });
    } catch (error) {
      // Clean up file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      safeError(res, error, 'POST /media/upload error');
    }
  }
);

/**
 * POST /api/media/upload-bulk
 * Upload multiple files at once (max 20)
 */
router.post(
  '/upload-bulk',
  authenticate,
  upload.array('files', 20),
  validateUploadedFile,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'لم يتم تحديد ملفات للتحميل' });
      }

      const { category, album, tags, visibility, folder } = req.body;
      const parsedTags = tags
        ? typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : tags
        : [];

      const mediaItems = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        title: file.originalname,
        filePath: file.path,
        url: buildMediaUrl(req, file.filename),
        mimeType: file.mimetype,
        fileSize: file.size,
        extension: path.extname(file.originalname).slice(1).toLowerCase(),
        mediaType: classifyMime(file.mimetype),
        category: category || 'عام',
        album: album || null,
        tags: parsedTags,
        visibility: visibility || 'public',
        folder: folder || '/',
        uploadedBy: req.user._id,
        activityLog: [
          {
            action: 'upload',
            performedBy: req.user._id,
            details: `تحميل الملف: ${file.originalname}`,
          },
        ],
      }));

      const saved = await Media.insertMany(mediaItems);

      if (album) {
        const totalSize = req.files.reduce((s, f) => s + f.size, 0);
        await MediaAlbum.findByIdAndUpdate(album, {
          $inc: { mediaCount: req.files.length, totalSize },
        });
      }

      res.status(201).json({
        success: true,
        message: `تم تحميل ${saved.length} ملف بنجاح`,
        data: saved.map(m => ({
          ...m.toObject(),
          url: buildMediaUrl(req, m.fileName),
          formattedSize: formatSize(m.fileSize),
        })),
      });
    } catch (error) {
      // Clean up
      if (req.files) {
        req.files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      safeError(res, error, 'POST /media/upload-bulk error');
    }
  }
);

/**
 * GET /api/media/list
 * List media with filtering, sorting, searching, pagination
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      mediaType,
      category,
      album,
      tag,
      search,
      sort = '-createdAt',
      visibility,
      status = 'نشط',
      favorites,
      folder,
    } = req.query;

    const query = { status };

    if (mediaType) query.mediaType = mediaType;
    if (category) query.category = category;
    if (album) query.album = album;
    if (tag) query.tags = { $in: Array.isArray(tag) ? tag : [tag] };
    if (visibility) query.visibility = visibility;
    if (favorites === 'true') query.isFavorite = true;
    if (folder && folder !== '/') query.folder = folder;
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { originalName: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { tags: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const MEDIA_SAFE_SORTS = {
      '-createdAt': { createdAt: -1 },
      createdAt: { createdAt: 1 },
      '-title': { title: -1 },
      title: { title: 1 },
      '-fileSize': { fileSize: -1 },
      fileSize: { fileSize: 1 },
    };
    const safeSort = MEDIA_SAFE_SORTS[sort] || { createdAt: -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Media.find(query)
        .sort(safeSort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'name email avatar')
        .populate('album', 'name')
        .lean(),
      Media.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items.map(m => ({
        ...m,
        url: buildMediaUrl(req, m.fileName),
        formattedSize: formatSize(m.fileSize),
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    safeError(res, error, 'GET /media/list error');
  }
});

/**
 * GET /api/media/:id
 * Get single media details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'name email avatar')
      .populate('album', 'name description')
      .lean();

    if (!media || media.status === 'محذوف') {
      return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });
    }

    // Increment view count
    await Media.findByIdAndUpdate(req.params.id, {
      $inc: { viewCount: 1 },
      $push: {
        activityLog: {
          $each: [{ action: 'view', performedBy: req.user?._id, timestamp: new Date() }],
          $slice: -200,
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...media,
        url: buildMediaUrl(req, media.fileName),
        formattedSize: formatSize(media.fileSize),
      },
    });
  } catch (error) {
    safeError(res, error, 'GET /media/:id error');
  }
});

/**
 * PUT /api/media/:id
 * Update media metadata
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      alt,
      category,
      album,
      tags,
      visibility,
      folder,
      isFavorite,
      isPinned,
    } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (alt !== undefined) updates.alt = alt;
    if (category !== undefined) updates.category = category;
    if (album !== undefined) updates.album = album || null;
    if (tags !== undefined)
      updates.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    if (visibility !== undefined) updates.visibility = visibility;
    if (folder !== undefined) updates.folder = folder;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;
    if (isPinned !== undefined) updates.isPinned = isPinned;

    const media = await Media.findByIdAndUpdate(
      req.params.id,
      {
        $set: updates,
        $push: {
          activityLog: {
            $each: [
              {
                action: 'edit',
                performedBy: req.user?._id,
                details: 'تحديث البيانات',
                timestamp: new Date(),
              },
            ],
            $slice: -200,
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate('uploadedBy', 'name email avatar')
      .lean();

    if (!media) {
      return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات الوسيط بنجاح',
      data: {
        ...media,
        url: buildMediaUrl(req, media.fileName),
        formattedSize: formatSize(media.fileSize),
      },
    });
  } catch (error) {
    safeError(res, error, 'PUT /media/:id error');
  }
});

/**
 * DELETE /api/media/:id
 * Soft-delete media
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const media = await Media.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'محذوف' },
        $push: {
          activityLog: {
            $each: [{ action: 'delete', performedBy: req.user?._id, timestamp: new Date() }],
            $slice: -200,
          },
        },
      },
      { new: true }
    );

    if (!media) {
      return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });
    }

    // Update album count
    if (media.album) {
      await MediaAlbum.findByIdAndUpdate(media.album, {
        $inc: { mediaCount: -1, totalSize: -media.fileSize },
      });
    }

    res.json({ success: true, message: 'تم حذف الوسيط بنجاح' });
  } catch (error) {
    safeError(res, error, 'DELETE /media/:id error');
  }
});

/**
 * POST /api/media/:id/restore
 * Restore soft-deleted media
 */
router.post('/:id/restore', authenticate, async (req, res) => {
  try {
    const media = await Media.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'نشط' },
        $push: {
          activityLog: {
            $each: [{ action: 'restore', performedBy: req.user?._id, timestamp: new Date() }],
            $slice: -200,
          },
        },
      },
      { new: true }
    );

    if (!media) return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });

    if (media.album) {
      await MediaAlbum.findByIdAndUpdate(media.album, {
        $inc: { mediaCount: 1, totalSize: media.fileSize },
      });
    }

    res.json({ success: true, message: 'تم استعادة الوسيط بنجاح' });
  } catch (error) {
    safeError(res, error, 'POST /media/:id/restore error');
  }
});

/**
 * DELETE /api/media/:id/permanent
 * Permanently delete media and file from disk
 */
router.delete('/:id/permanent', authenticate, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });

    // Remove file from disk
    if (media.filePath && fs.existsSync(media.filePath)) {
      fs.unlinkSync(media.filePath);
    }
    // Remove thumbnails
    if (media.thumbnails?.length) {
      media.thumbnails.forEach(t => {
        if (t.path && fs.existsSync(t.path)) fs.unlinkSync(t.path);
      });
    }

    await Media.findByIdAndDelete(req.params.id);

    if (media.album) {
      await MediaAlbum.findByIdAndUpdate(media.album, {
        $inc: { mediaCount: -1, totalSize: -media.fileSize },
      });
    }

    res.json({ success: true, message: 'تم حذف الوسيط نهائياً' });
  } catch (error) {
    safeError(res, error, 'DELETE /media/:id/permanent error');
  }
});

// ============================================================================
// FAVORITES & PINS
// ============================================================================

/**
 * POST /api/media/:id/favorite
 * Toggle favorite
 */
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });

    media.isFavorite = !media.isFavorite;
    media.activityLog.push({
      action: 'favorite',
      performedBy: req.user?._id,
      details: media.isFavorite ? 'مفضل' : 'إلغاء المفضل',
    });
    await media.save();

    res.json({
      success: true,
      data: { isFavorite: media.isFavorite },
      message: media.isFavorite ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة',
    });
  } catch (error) {
    safeError(res, error, 'POST /media/:id/favorite error');
  }
});

/**
 * POST /api/media/:id/pin
 * Toggle pin
 */
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: 'الوسيط غير موجود' });

    media.isPinned = !media.isPinned;
    await media.save();

    res.json({
      success: true,
      data: { isPinned: media.isPinned },
      message: media.isPinned ? 'تم التثبيت' : 'تم إلغاء التثبيت',
    });
  } catch (error) {
    safeError(res, error, 'POST /media/:id/pin error');
  }
});

// ============================================================================
// FILE SERVING & DOWNLOAD
// ============================================================================

/**
 * GET /api/media/file/:filename
 * Serve / stream media file
 */
router.get('/file/:filename', authenticate, (req, res) => {
  try {
    // Path-traversal protection: strip directory components
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, safeName);
    // Verify resolved path stays within uploads directory
    if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    const ext = path.extname(req.params.filename).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.pdf': 'application/pdf',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Streaming for video/audio
    if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });
        const { pipeline } = require('stream');
        pipeline(fs.createReadStream(filePath, { start, end }), res, err => {
          if (err && !res.headersSent) {
            safeError(res, error, 'media');
          }
        });
        return;
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const { pipeline: pipe2 } = require('stream');
    pipe2(fs.createReadStream(filePath), res, err => {
      if (err && !res.headersSent) {
        safeError(res, error, 'media');
      }
    });
  } catch (error) {
    safeError(res, error, 'GET /media/file/:filename error');
  }
});

/**
 * GET /api/media/:id/download
 * Force-download with proper filename
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media || media.status === 'محذوف') {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    const filePath = media.filePath || path.join(uploadsDir, media.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
    }

    await Media.findByIdAndUpdate(media._id, {
      $inc: { downloadCount: 1 },
      $push: {
        activityLog: {
          $each: [{ action: 'download', performedBy: req.user?._id, timestamp: new Date() }],
          $slice: -200,
        },
      },
    });

    const safeOriginalName = (media.originalName || media.fileName || 'download').replace(
      /[\r\n"]/g,
      '_'
    );
    res.download(filePath, safeOriginalName);
  } catch (error) {
    safeError(res, error, 'GET /media/:id/download error');
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/media/bulk-delete
 * Soft-delete multiple media
 */
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد ملفات للحذف' });
    }

    await Media.updateMany(
      { _id: { $in: ids } },
      {
        $set: { status: 'محذوف' },
        $push: {
          activityLog: {
            $each: [{ action: 'delete', performedBy: req.user?._id, timestamp: new Date() }],
            $slice: -200,
          },
        },
      }
    );

    res.json({ success: true, message: `تم حذف ${ids.length} ملف بنجاح` });
  } catch (error) {
    safeError(res, error, 'POST /media/bulk-delete error');
  }
});

/**
 * POST /api/media/bulk-move
 * Move multiple media to an album
 */
router.post('/bulk-move', authenticate, async (req, res) => {
  try {
    const { ids, album } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد ملفات للنقل' });
    }

    await Media.updateMany(
      { _id: { $in: ids } },
      {
        $set: { album: album || null },
        $push: {
          activityLog: {
            $each: [
              {
                action: 'move',
                performedBy: req.user?._id,
                details: `نقل إلى ألبوم`,
                timestamp: new Date(),
              },
            ],
            $slice: -200,
          },
        },
      }
    );

    res.json({ success: true, message: `تم نقل ${ids.length} ملف بنجاح` });
  } catch (error) {
    safeError(res, error, 'POST /media/bulk-move error');
  }
});

/**
 * POST /api/media/bulk-tag
 * Add tags to multiple media
 */
router.post('/bulk-tag', authenticate, async (req, res) => {
  try {
    const { ids, tags } = req.body;
    if (!ids?.length || !tags?.length) {
      return res.status(400).json({ success: false, message: 'يجب تحديد ملفات ووسوم' });
    }

    const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;

    await Media.updateMany(
      { _id: { $in: ids } },
      {
        $addToSet: { tags: { $each: parsedTags } },
        $push: {
          activityLog: {
            $each: [
              {
                action: 'tag',
                performedBy: req.user?._id,
                details: `إضافة وسوم: ${parsedTags.join(', ')}`,
                timestamp: new Date(),
              },
            ],
            $slice: -200,
          },
        },
      }
    );

    res.json({ success: true, message: `تم إضافة الوسوم لـ ${ids.length} ملف` });
  } catch (error) {
    safeError(res, error, 'POST /media/bulk-tag error');
  }
});

// ============================================================================
// ALBUMS CRUD
// ============================================================================

/**
 * GET /api/media/albums
 * List all albums
 */
router.get('/albums', authenticate, async (req, res) => {
  try {
    const { parent, search } = req.query;
    const query = { status: 'نشط' };
    if (parent) query.parentAlbum = parent;
    else query.parentAlbum = null;
    if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };

    const albums = await MediaAlbum.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .populate('coverImage', 'fileName mimeType')
      .populate('createdBy', 'name')
      .lean();

    res.json({ success: true, data: albums });
  } catch (error) {
    safeError(res, error, 'GET /media/albums error');
  }
});

/**
 * POST /api/media/albums
 * Create a new album
 */
router.post('/albums', authenticate, async (req, res) => {
  try {
    const { name, description, parentAlbum, color, icon, visibility } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'اسم الألبوم مطلوب' });

    const album = new MediaAlbum({
      name,
      description,
      parentAlbum: parentAlbum || null,
      color: color || '#1976d2',
      icon: icon || 'folder',
      visibility: visibility || 'public',
      createdBy: req.user._id,
    });

    await album.save();
    res.status(201).json({ success: true, message: 'تم إنشاء الألبوم بنجاح', data: album });
  } catch (error) {
    safeError(res, error, 'POST /media/albums error');
  }
});

/**
 * PUT /api/media/albums/:id
 * Update an album
 */
router.put('/albums/:id', authenticate, async (req, res) => {
  try {
    // ── Mass-assignment protection: whitelist allowed fields ──
    const { name, description, coverImage, parentAlbum, color, icon, visibility, sortOrder } =
      req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (parentAlbum !== undefined) updates.parentAlbum = parentAlbum || null;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (visibility !== undefined) updates.visibility = visibility;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const album = await MediaAlbum.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!album) return res.status(404).json({ success: false, message: 'الألبوم غير موجود' });
    res.json({ success: true, message: 'تم تحديث الألبوم بنجاح', data: album });
  } catch (error) {
    safeError(res, error, 'PUT /media/albums/:id error');
  }
});

/**
 * DELETE /api/media/albums/:id
 * Soft-delete an album
 */
router.delete('/albums/:id', authenticate, async (req, res) => {
  try {
    const album = await MediaAlbum.findByIdAndUpdate(
      req.params.id,
      { status: 'محذوف' },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, message: 'الألبوم غير موجود' });

    // Move media out of album
    await Media.updateMany({ album: req.params.id }, { $set: { album: null } });

    res.json({ success: true, message: 'تم حذف الألبوم بنجاح' });
  } catch (error) {
    safeError(res, error, 'DELETE /media/albums/:id error');
  }
});

// ============================================================================
// TAGS
// ============================================================================

/**
 * GET /api/media/tags
 * Get all unique tags with counts
 */
router.get('/tags', authenticate, async (req, res) => {
  try {
    const tags = await Media.aggregate([
      { $match: { status: 'نشط' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    res.json({ success: true, data: tags.map(t => ({ tag: t._id, count: t.count })) });
  } catch (error) {
    safeError(res, error, 'GET /media/tags error');
  }
});

// ============================================================================
// TRASH
// ============================================================================

/**
 * GET /api/media/trash
 * List soft-deleted media
 */
router.get('/trash', authenticate, async (req, res) => {
  try {
    const items = await Media.find({ status: 'محذوف' })
      .sort({ updatedAt: -1 })
      .populate('uploadedBy', 'name')
      .lean();

    res.json({
      success: true,
      data: items.map(m => ({
        ...m,
        url: buildMediaUrl(req, m.fileName),
        formattedSize: formatSize(m.fileSize),
      })),
    });
  } catch (error) {
    safeError(res, error, 'GET /media/trash error');
  }
});

/**
 * POST /api/media/trash/empty
 * Permanently delete all trashed media
 */
router.post('/trash/empty', authenticate, async (req, res) => {
  try {
    const trashed = await Media.find({ status: 'محذوف' });

    // Remove files from disk
    for (const m of trashed) {
      if (m.filePath && fs.existsSync(m.filePath)) fs.unlinkSync(m.filePath);
      if (m.thumbnails)
        m.thumbnails.forEach(t => {
          if (t.path && fs.existsSync(t.path)) fs.unlinkSync(t.path);
        });
    }

    const result = await Media.deleteMany({ status: 'محذوف' });

    res.json({ success: true, message: `تم حذف ${result.deletedCount} ملف نهائياً` });
  } catch (error) {
    safeError(res, error, 'POST /media/trash/empty error');
  }
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ success: false, message: 'حجم الملف كبير جداً. الحد الأقصى 100 MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res
        .status(400)
        .json({ success: false, message: 'الحد الأقصى 20 ملف في المرة الواحدة' });
    }
    return res.status(400).json({ success: false, message: `خطأ في التحميل: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: safeError(err) || 'خطأ غير متوقع' });
  }
});

module.exports = router;
