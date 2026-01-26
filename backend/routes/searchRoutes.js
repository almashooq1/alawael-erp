/**
 * Advanced Search API Routes
 * Full-text search, filtering, faceted navigation, and search analytics
 */

const express = require('express');
const router = express.Router();
const advancedSearchService = require('../services/advancedSearchService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/search/index
 * Add content to search index
 */
router.post('/index', authMiddleware, async (req, res) => {
  try {
    const { id, content, type, metadata = {} } = req.body;

    if (!id || !content || !type) {
      return res.status(400).json({
        success: false,
        error: 'ID, content, and type required',
      });
    }

    const result = await advancedSearchService.indexContent(id, content, type, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/search/search
 * Basic full-text search
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const result = await advancedSearchService.search(query, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/search/advanced
 * Advanced search with filters
 */
router.post('/advanced', authMiddleware, async (req, res) => {
  try {
    const { query, filters = {}, limit = 20, offset = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const result = await advancedSearchService.advancedSearch(query, {
      ...filters,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/search/facets
 * Get faceted search results
 */
router.get('/facets', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const result = await advancedSearchService.facetedSearch(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/search/save
 * Save search query
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { searchName, query, filters = {} } = req.body;

    if (!searchName || !query) {
      return res.status(400).json({
        success: false,
        error: 'Search name and query required',
      });
    }

    const result = await advancedSearchService.saveSearch(userId, searchName, query, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/search/saved
 * Get saved searches for user
 */
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50 } = req.query;

    const result = await advancedSearchService.getSavedSearches(userId, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/search/load/:searchId
 * Load and execute saved search
 */
router.post('/load/:searchId', authMiddleware, async (req, res) => {
  try {
    const { searchId } = req.params;
    const { limit = 20, offset = 0 } = req.body;

    const result = await advancedSearchService.loadSavedSearch(searchId, parseInt(limit), parseInt(offset));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/search/:searchId
 * Delete saved search
 */
router.delete('/:searchId', authMiddleware, async (req, res) => {
  try {
    const { searchId } = req.params;

    const result = await advancedSearchService.deleteSavedSearch(searchId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions/autocomplete
 */
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query required',
      });
    }

    const result = await advancedSearchService.getSearchSuggestions(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/search/analytics
 * Get search analytics
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await advancedSearchService.getSearchAnalytics(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/search/clear-old-data
 * Clear old search data (admin only)
 */
router.post('/clear-old-data', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { daysOld = 90 } = req.body;

    const result = await advancedSearchService.clearOldData(parseInt(daysOld));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

