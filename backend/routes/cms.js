// Content Management System (CMS) Routes
// نقاط إدارة المحتوى

const express = require('express');
const router = express.Router();
const CMSService = require('../services/cmsService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { authenticate, _authorize } = require('../middleware/auth');

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
    return next(new ApiError(500, 'Failed to fetch pages', ['حدث خطأ في الخادم']));
  }
});

// الحصول على صفحة بالرابط الودي
router.get('/pages/:slug', (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = CMSService.getPageBySlug(slug);

    return res.status(200).json(new ApiResponse(200, result, 'Page fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch page', ['حدث خطأ في الخادم']));
  }
});

// إنشاء صفحة جديدة
router.post('/pages', authenticate, (req, res, next) => {
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
    return next(new ApiError(500, 'Failed to create page', ['حدث خطأ في الخادم']));
  }
});

// تحديث الصفحة
router.put('/pages/:pageId', authenticate, (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.updatePage(pageId, req.body);

    return res.status(200).json(new ApiResponse(200, result, 'Page updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update page', ['حدث خطأ في الخادم']));
  }
});

// حذف الصفحة
router.delete('/pages/:pageId', authenticate, (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.deletePage(pageId);

    return res.status(200).json(new ApiResponse(200, result, 'Page deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete page', ['حدث خطأ في الخادم']));
  }
});

// نشر الصفحة
router.post('/pages/:pageId/publish', authenticate, (req, res, next) => {
  try {
    const { pageId } = req.params;

    const result = CMSService.publishPage(pageId);

    return res.status(200).json(new ApiResponse(200, result, 'Page published'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to publish page', ['حدث خطأ في الخادم']));
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
    return next(new ApiError(500, 'Failed to fetch posts', ['حدث خطأ في الخادم']));
  }
});

// إنشاء منشور جديد
router.post('/posts', authenticate, (req, res, next) => {
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
    return next(new ApiError(500, 'Failed to create post', ['حدث خطأ في الخادم']));
  }
});

// ============ COMMENTS ============

// الحصول على منشور بالمعرف
router.get('/posts/:postId', (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = CMSService.getPostById ? CMSService.getPostById(postId) : { id: postId };
    return res.status(200).json(new ApiResponse(200, result, 'Post fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch post', ['حدث خطأ في الخادم']));
  }
});

// تحديث المنشور
router.put('/posts/:postId', authenticate, (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = CMSService.updatePost
      ? CMSService.updatePost(postId, req.body)
      : { id: postId, ...req.body, updatedAt: new Date() };
    return res.status(200).json(new ApiResponse(200, result, 'Post updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update post', ['حدث خطأ في الخادم']));
  }
});

// حذف المنشور
router.delete('/posts/:postId', authenticate, (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = CMSService.deletePost
      ? CMSService.deletePost(postId)
      : { id: postId, deleted: true };
    return res.status(200).json(new ApiResponse(200, result, 'Post deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete post', ['حدث خطأ في الخادم']));
  }
});

// تحديث الفئة
router.put('/categories/:categoryId', authenticate, (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const result = CMSService.updateCategory
      ? CMSService.updateCategory(categoryId, req.body)
      : { id: categoryId, ...req.body, updatedAt: new Date() };
    return res.status(200).json(new ApiResponse(200, result, 'Category updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update category', ['حدث خطأ في الخادم']));
  }
});

// حذف الفئة
router.delete('/categories/:categoryId', authenticate, (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const result = CMSService.deleteCategory
      ? CMSService.deleteCategory(categoryId)
      : { id: categoryId, deleted: true };
    return res.status(200).json(new ApiResponse(200, result, 'Category deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete category', ['حدث خطأ في الخادم']));
  }
});

// الحصول على التعليقات
router.get('/pages/:pageId/comments', (req, res, next) => {
  try {
    const { pageId } = req.params;
    const filters = req.query;

    const result = CMSService.getComments(pageId, filters);

    return res.status(200).json(new ApiResponse(200, result, 'Comments fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch comments', ['حدث خطأ في الخادم']));
  }
});

// الموافقة على التعليق
router.post('/comments/:commentId/approve', authenticate, (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = CMSService.approveComment(commentId);

    return res.status(200).json(new ApiResponse(200, result, 'Comment approved'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to approve comment', ['حدث خطأ في الخادم']));
  }
});

// حذف التعليق
router.delete('/comments/:commentId', authenticate, (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = CMSService.deleteComment(commentId);

    return res.status(200).json(new ApiResponse(200, result, 'Comment deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete comment', ['حدث خطأ في الخادم']));
  }
});

// ============ CATEGORIES ============

// الحصول على الفئات
router.get('/categories', (req, res, next) => {
  try {
    const result = CMSService.getCategories();

    return res.status(200).json(new ApiResponse(200, result, 'Categories fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch categories', ['حدث خطأ في الخادم']));
  }
});

// إنشاء فئة جديدة
router.post('/categories', authenticate, (req, res, next) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return next(new ApiError(400, 'Name and slug are required'));
    }

    const result = CMSService.createCategory({ name, slug });

    return res.status(201).json(new ApiResponse(201, result, 'Category created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create category', ['حدث خطأ في الخادم']));
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
    return next(new ApiError(500, 'Failed to fetch media', ['حدث خطأ في الخادم']));
  }
});

// تحميل ملف
router.post('/media/upload', authenticate, (req, res, next) => {
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
    return next(new ApiError(500, 'Failed to upload media', ['حدث خطأ في الخادم']));
  }
});

// حذف ملف
router.delete('/media/:mediaId', authenticate, (req, res, next) => {
  try {
    const { mediaId } = req.params;

    const result = CMSService.deleteMedia(mediaId);

    return res.status(200).json(new ApiResponse(200, result, 'Media deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete media', ['حدث خطأ في الخادم']));
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
      error: 'حدث خطأ في الخادم',
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
      error: 'حدث خطأ في الخادم',
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
      error: 'حدث خطأ في الخادم',
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
      error: 'حدث خطأ في الخادم',
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
    return next(new ApiError(500, 'Failed to export content', ['حدث خطأ داخلي']));
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
    return next(new ApiError(500, 'Failed to import content', ['حدث خطأ داخلي']));
  }
});

module.exports = router;
