/* eslint-disable no-unused-vars */
/**
 * 📚 Knowledge Center Advanced Routes — مسارات مركز المعرفة المتقدمة
 * AlAwael ERP — Full CRUD + Categories + Ratings + Comments + Bookmarks + Analytics
 *
 * Endpoints:
 *   /stats               — Dashboard stats
 *   /analytics            — Admin analytics
 *   /search               — Server-side search with logging
 *   /trending             — Trending articles
 *   /top-rated            — Top rated articles
 *   /recent               — Recently published
 *   /categories           — CRUD categories
 *   /bookmarks            — User bookmarks
 *   /articles             — CRUD articles
 *   /articles/:id/rate    — Rate article
 *   /articles/:id/comment — Add comment
 *   /articles/:id/status  — Change status (workflow)
 *   /articles/:id/bookmark — Toggle bookmark
 *   /seed                 — Demo data
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { knowledgeCenterService } = require('../services/knowledge-center.service');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('Knowledge center route error:', err.message);
    const status =
      err.message.includes('غير موجود') || err.message.includes('غير موجودة')
        ? 404
        : err.message.includes('لا يمكن')
          ? 400
          : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /knowledge-center/stats
router.get(
  '/stats',
  wrap(async _req => {
    return knowledgeCenterService.getStats();
  })
);

// GET /knowledge-center/analytics
router.get(
  '/analytics',
  authorize(['admin', 'manager']),
  wrap(async req => {
    return knowledgeCenterService.getAnalytics(req.query);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH & DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════════

// GET /knowledge-center/search
router.get(
  '/search',
  wrap(async req => {
    return knowledgeCenterService.search(req.query, getUserId(req));
  })
);

// GET /knowledge-center/trending
router.get(
  '/trending',
  wrap(async req => {
    return knowledgeCenterService.getTrending(req.query.limit);
  })
);

// GET /knowledge-center/top-rated
router.get(
  '/top-rated',
  wrap(async req => {
    return knowledgeCenterService.getTopRated(req.query.limit);
  })
);

// GET /knowledge-center/recent
router.get(
  '/recent',
  wrap(async req => {
    return knowledgeCenterService.getRecent(req.query.limit);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /knowledge-center/categories
router.get(
  '/categories',
  wrap(async _req => {
    return knowledgeCenterService.getCategories();
  })
);

// POST /knowledge-center/categories
router.post(
  '/categories',
  authorize(['admin', 'manager']),
  wrap(async req => {
    return knowledgeCenterService.createCategory(req.body);
  })
);

// PUT /knowledge-center/categories/:id
router.put(
  '/categories/:id',
  authorize(['admin', 'manager']),
  wrap(async req => {
    return knowledgeCenterService.updateCategory(req.params.id, req.body);
  })
);

// DELETE /knowledge-center/categories/:id
router.delete(
  '/categories/:id',
  authorize(['admin']),
  wrap(async req => {
    return knowledgeCenterService.deleteCategory(req.params.id);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKMARKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /knowledge-center/bookmarks
router.get(
  '/bookmarks',
  wrap(async req => {
    return knowledgeCenterService.getUserBookmarks(getUserId(req));
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════════

// POST /knowledge-center/seed
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/seed',
    authorize(['admin', 'super_admin']),
    wrap(async _req => {
      return knowledgeCenterService.seedDemoData();
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLES CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /knowledge-center/articles
router.get(
  '/articles',
  wrap(async req => {
    return knowledgeCenterService.getArticles(req.query);
  })
);

// POST /knowledge-center/articles
router.post(
  '/articles',
  authorize(['admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان المقال مطلوب'),
    body('description').trim().isLength({ min: 20 }).withMessage('الوصف مطلوب (20 حرف على الأقل)'),
    body('content').trim().isLength({ min: 100 }).withMessage('المحتوى مطلوب (100 حرف على الأقل)'),
    body('category')
      .isIn([
        'therapeutic_protocols',
        'case_studies',
        'research_experiments',
        'best_practices',
        'other',
      ])
      .withMessage('التصنيف غير صالح'),
  ]),
  wrap(async req => {
    return knowledgeCenterService.createArticle(req.body, getUserId(req));
  })
);

// GET /knowledge-center/articles/:id
router.get(
  '/articles/:id',
  wrap(async req => {
    return knowledgeCenterService.getArticleById(req.params.id, getUserId(req));
  })
);

// PUT /knowledge-center/articles/:id
router.put(
  '/articles/:id',
  authorize(['admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف المقال غير صالح'),
    body('category')
      .optional()
      .isIn([
        'therapeutic_protocols',
        'case_studies',
        'research_experiments',
        'best_practices',
        'other',
      ])
      .withMessage('التصنيف غير صالح'),
  ]),
  wrap(async req => {
    return knowledgeCenterService.updateArticle(req.params.id, req.body, getUserId(req));
  })
);

// DELETE /knowledge-center/articles/:id
router.delete(
  '/articles/:id',
  authorize(['admin']),
  wrap(async req => {
    return knowledgeCenterService.deleteArticle(req.params.id);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// ARTICLE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /knowledge-center/articles/:id/rate
router.post(
  '/articles/:id/rate',
  validate([
    param('id').isMongoId().withMessage('معرف المقال غير صالح'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
  ]),
  wrap(async req => {
    return knowledgeCenterService.rateArticle(
      req.params.id,
      getUserId(req),
      req.body.rating,
      req.body.feedback
    );
  })
);

// POST /knowledge-center/articles/:id/comment
router.post(
  '/articles/:id/comment',
  validate([
    param('id').isMongoId().withMessage('معرف المقال غير صالح'),
    body('text').trim().notEmpty().withMessage('نص التعليق مطلوب'),
  ]),
  wrap(async req => {
    return knowledgeCenterService.addComment(req.params.id, req.body.text, getUserId(req));
  })
);

// DELETE /knowledge-center/articles/:id/comment/:commentId
router.delete(
  '/articles/:id/comment/:commentId',
  wrap(async req => {
    return knowledgeCenterService.deleteComment(
      req.params.id,
      req.params.commentId,
      getUserId(req)
    );
  })
);

// POST /knowledge-center/articles/:id/status
router.post(
  '/articles/:id/status',
  authorize(['admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف المقال غير صالح'),
    body('status')
      .isIn(['draft', 'under_review', 'published', 'archived'])
      .withMessage('حالة غير صالحة'),
  ]),
  wrap(async req => {
    return knowledgeCenterService.changeStatus(req.params.id, req.body.status, getUserId(req));
  })
);

// POST /knowledge-center/articles/:id/bookmark
router.post(
  '/articles/:id/bookmark',
  wrap(async req => {
    return knowledgeCenterService.toggleBookmark(req.params.id, getUserId(req), req.body.note);
  })
);

module.exports = router;
