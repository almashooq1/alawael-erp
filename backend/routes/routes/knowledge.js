const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeSearchLog,
  KnowledgeRating,
} = require('../models/KnowledgeBase');

// ============ GET ENDPOINTS ============

// Get all articles (with filtering)
router.get('/articles', async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10, sortBy = 'createdAt' } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    query.isPublic = true;

    const skip = (page - 1) * limit;
    const articles = await KnowledgeArticle.find(query)
      .populate('author', 'name email')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await KnowledgeArticle.countDocuments(query);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single article
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await KnowledgeArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name email')
      .populate('relatedArticles', 'title slug');

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Log the search
    if (req.user?.id) {
      await KnowledgeSearchLog.create({
        user: req.user.id,
        query: article.title,
        category: article.category,
        clickedArticle: article._id,
      });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search articles
router.get('/search', async (req, res) => {
  try {
    const { q, category, tags, limit = 20 } = req.query;

    const query = { isPublic: true };

    if (q) {
      query.$text = { $search: q };
    }

    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };

    const articles = await KnowledgeArticle.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, views: -1 })
      .limit(parseInt(limit))
      .select('title description category slug views ratings');

    // Log search query
    if (req.user?.id && q) {
      await KnowledgeSearchLog.create({
        user: req.user.id,
        query: q,
        resultsCount: articles.length,
      });
    }

    res.json({
      success: true,
      data: {
        results: articles,
        count: articles.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await KnowledgeCategory.find().sort({ order: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get articles by category
router.get('/categories/:category', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const articles = await KnowledgeArticle.find({ category: req.params.category, isPublic: true })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title description slug views ratings createdAt');

    const total = await KnowledgeArticle.countDocuments({
      category: req.params.category,
      isPublic: true,
    });

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get trending articles
router.get('/trending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const articles = await KnowledgeArticle.find({ isPublic: true })
      .sort({ views: -1, 'ratings.average': -1 })
      .limit(parseInt(limit))
      .select('title slug views ratings');

    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get top rated articles
router.get('/top-rated', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const articles = await KnowledgeArticle.find({ isPublic: true, 'ratings.count': { $gt: 0 } })
      .sort({ 'ratings.average': -1 })
      .limit(parseInt(limit))
      .select('title slug ratings');

    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ POST ENDPOINTS (Authenticated) ============

// Create article
router.post('/articles', authMiddleware, roleMiddleware(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, content, category, tags, sections } = req.body;

    // Generate slug
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const article = new KnowledgeArticle({
      title,
      description,
      content,
      category,
      tags: tags || [],
      sections: sections || [],
      author: req.user.id,
      slug,
    });

    await article.save();

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Rate article
router.post('/articles/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { rating, helpful, feedback } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check if user already rated this article
    const existingRating = await KnowledgeRating.findOne({
      article: req.params.id,
      user: req.user.id,
    });

    let ratingRecord;
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.helpful = helpful;
      existingRating.feedback = feedback;
      ratingRecord = await existingRating.save();
    } else {
      ratingRecord = await KnowledgeRating.create({
        article: req.params.id,
        user: req.user.id,
        rating,
        helpful,
        feedback,
      });
    }

    // Update article ratings
    const ratings = await KnowledgeRating.aggregate([
      { $match: { article: new require('mongoose').Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (ratings.length > 0) {
      await KnowledgeArticle.findByIdAndUpdate(req.params.id, {
        'ratings.average': ratings[0].average,
        'ratings.count': ratings[0].count,
      });
    }

    res.json({
      success: true,
      message: 'Rating saved successfully',
      data: ratingRecord,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PUT ENDPOINTS (Authenticated) ============

// Update article
router.put(
  '/articles/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  async (req, res) => {
    try {
      const { title, description, content, category, tags, sections, status } = req.body;

      const article = await KnowledgeArticle.findById(req.params.id);

      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }

      if (article.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Update fields
      if (title) article.title = title;
      if (description) article.description = description;
      if (content) article.content = content;
      if (category) article.category = category;
      if (tags) article.tags = tags;
      if (sections) article.sections = sections;
      if (status) article.status = status;

      article.lastModifiedBy = req.user.id;
      article.updatedAt = new Date();

      await article.save();

      res.json({
        success: true,
        message: 'Article updated successfully',
        data: article,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============ DELETE ENDPOINTS (Authenticated) ============

// Delete article
router.delete(
  '/articles/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  async (req, res) => {
    try {
      const article = await KnowledgeArticle.findById(req.params.id);

      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }

      if (article.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await KnowledgeArticle.deleteOne({ _id: req.params.id });

      res.json({
        success: true,
        message: 'Article deleted successfully',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============ ANALYTICS ENDPOINTS ============

// Get search analytics
router.get('/analytics/searches', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const searches = await KnowledgeSearchLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, data: searches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get article statistics
router.get('/analytics/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const stats = await KnowledgeArticle.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          avgRating: { $avg: '$ratings.average' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalArticles = await KnowledgeArticle.countDocuments();
    const totalViews = await KnowledgeArticle.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    res.json({
      success: true,
      data: {
        stats,
        totalArticles,
        totalViews: totalViews[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
