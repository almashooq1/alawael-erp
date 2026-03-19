// Content Management System (CMS) Routes
// نقاط إدارة المحتوى

const express = require('express');
const router = express.Router();
const CMSService = require('../services/cmsService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// ============ PAGES ============

// الحصول على جميع الصفحات
router.get('/pages', (req, res, next) => {
  try {
    const { status, author } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (author) filters.author = author;

    const result = CMSService.getAllPages(filters);

    return res.status(200).json(new ApiResponse(200, result, 'Pages fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch pages', [error.message]));
  }
});

// الحصول على صفحة بالرابط الودي
router.get('/pages/:slug', (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = CMSService.getPageBySlug(slug);

    return res.status(200).json(new ApiResponse(200, result, 'Page fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch page', [error.message]));
  }
});

// إنشاء صفحة جديدة
router.post('/pages', (req, res, next) => {
  try {
    const { title, slug, content, author, status } = req.body;

    if (!title || !slug || !content) {
      return next(new ApiError(400, 'Title, slug, and content are required'));
    }

    const result = CMSService.createPage({
      title,
      slug,
      content,
      author,
      status,
    });

    return res.status(201).json(new ApiResponse(201, result, 'Page created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create page', [error.message]));
  }
});

// تحديث الصفحة
router.put('/pages/:pageId', (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.updatePage(pageId, req.body);

    return res.status(200).json(new ApiResponse(200, result, 'Page updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update page', [error.message]));
  }
});

// حذف الصفحة
router.delete('/pages/:pageId', (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.deletePage(pageId);

    return res.status(200).json(new ApiResponse(200, result, 'Page deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete page', [error.message]));
  }
});

// نشر الصفحة
router.post('/pages/:pageId/publish', (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.publishPage(pageId);

    return res.status(200).json(new ApiResponse(200, result, 'Page published'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to publish page', [error.message]));
  }
});

// ============ POSTS ============

// الحصول على جميع المنشورات
router.get('/posts', (req, res, next) => {
  try {
    const filters = req.query;

    const result = CMSService.getAllPosts(filters);

    return res.status(200).json(new ApiResponse(200, result, 'Posts fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch posts', [error.message]));
  }
});

// إنشاء منشور جديد
router.post('/posts', (req, res, next) => {
  try {
    const { title, slug, content, author, category } = req.body;

    if (!title || !slug || !content) {
      return next(new ApiError(400, 'Title, slug, and content are required'));
    }

    const result = CMSService.createPost({
      title,
      slug,
      content,
      author,
      category,
    });

    return res.status(201).json(new ApiResponse(201, result, 'Post created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create post', [error.message]));
  }
});

// ============ COMMENTS ============

// الحصول على التعليقات
router.get('/pages/:pageId/comments', (req, res, next) => {
  try {
    const { pageId } = req.params;
    const filters = req.query;

    const result = CMSService.getComments(pageId, filters);

    return res.status(200).json(new ApiResponse(200, result, 'Comments fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch comments', [error.message]));
  }
});

// الموافقة على التعليق
router.post('/comments/:commentId/approve', (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = CMSService.approveComment(commentId);

    return res.status(200).json(new ApiResponse(200, result, 'Comment approved'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to approve comment', [error.message]));
  }
});

// حذف التعليق
router.delete('/comments/:commentId', (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = CMSService.deleteComment(commentId);

    return res.status(200).json(new ApiResponse(200, result, 'Comment deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete comment', [error.message]));
  }
});

// ============ CATEGORIES ============

// الحصول على الفئات
router.get('/categories', (req, res, next) => {
  try {
    const result = CMSService.getCategories();

    return res.status(200).json(new ApiResponse(200, result, 'Categories fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch categories', [error.message]));
  }
});

// إنشاء فئة جديدة
router.post('/categories', (req, res, next) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return next(new ApiError(400, 'Name and slug are required'));
    }

    const result = CMSService.createCategory({ name, slug });

    return res.status(201).json(new ApiResponse(201, result, 'Category created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create category', [error.message]));
  }
});

// ============ MEDIA ============

// الحصول على مكتبة الوسائط
router.get('/media', (req, res, next) => {
  try {
    const filters = req.query;

    const result = CMSService.getMediaLibrary(filters);

    return res.status(200).json(new ApiResponse(200, result, 'Media fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch media', [error.message]));
  }
});

// تحميل ملف
router.post('/media/upload', (req, res, next) => {
  try {
    const { name, type, size } = req.body;

    if (!name || !type) {
      return next(new ApiError(400, 'File name and type are required'));
    }

    const result = CMSService.uploadMedia({
      name,
      type,
      size,
    });

    return res.status(201).json(new ApiResponse(201, result, 'Media uploaded'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to upload media', [error.message]));
  }
});

// حذف ملف
router.delete('/media/:mediaId', (req, res, next) => {
  try {
    const { mediaId } = req.params;

    const result = CMSService.deleteMedia(mediaId);

    return res.status(200).json(new ApiResponse(200, result, 'Media deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete media', [error.message]));
  }
});

// ============ STATISTICS ============

// إحصائيات المحتوى
router.get('/stats', (req, res) => {
  try {
    const result = CMSService.getContentStatistics();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

// ============ SCHEDULING ============

// جدولة المحتوى
router.post('/schedule', (req, res) => {
  try {
    const { contentId, publishDate } = req.body;

    if (!contentId || !publishDate) {
      return res.status(400).json({
        success: false,
        message: 'Content ID and publish date are required',
      });
    }

    const result = CMSService.scheduleContent(contentId, publishDate);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule content',
      error: error.message,
    });
  }
});

// ============ VERSIONS ============

// الحصول على المسودات التلقائية
router.get('/pages/:pageId/autosaves', (req, res) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.getAutosaves(pageId);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch autosaves',
      error: error.message,
    });
  }
});

// استرجاع النسخة السابقة
router.post('/pages/:pageId/restore/:versionId', (req, res) => {
  try {
    const { pageId, versionId } = req.params;

    const result = CMSService.restoreVersion(pageId, versionId);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore version',
      error: error.message,
    });
  }
});

// ============ IMPORT/EXPORT ============

// تصدير المحتوى
router.get('/export/:format', (req, res, next) => {
  try {
    const { format } = req.params;

    if (!['json', 'xml', 'csv'].includes(format)) {
      return next(new ApiError(400, 'Invalid format. Supported: json, xml, csv'));
    }

    const result = CMSService.exportContent(format);

    return res.status(200).json(new ApiResponse(200, result, 'Content exported'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to export content', [error.message]));
  }
});

// استيراد المحتوى
router.post('/import', (req, res, next) => {
  try {
    const { file } = req.body;

    if (!file) {
      return next(new ApiError(400, 'File required'));
    }

    const result = CMSService.importContent(file);

    return res.status(200).json(new ApiResponse(200, result, 'Content imported'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to import content', [error.message]));
  }
});

module.exports = router;
