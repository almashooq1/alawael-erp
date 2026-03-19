/**
 * Search Routes
 * Full-text search, fuzzy search, and advanced search operations
 * Phase 10: Advanced Features
 */

const express = require('express');
const router = express.Router();
const searchEngine = require('../services/searchEngine');
const responseFormatter = require('../services/responseFormatter');
const { optionalAuth } = require('../middleware/auth');

// Sample data for search
const sampleData = [
  {
    _id: '1',
    name: 'Accounting System',
    description: 'Complete accounting and financial management system with reports',
    category: 'finance',
    rating: 4.5,
  },
  {
    _id: '2',
    name: 'HR Management',
    description: 'Human resources and employee management solution',
    category: 'hr',
    rating: 4.8,
  },
  {
    _id: '3',
    name: 'Inventory Control',
    description: 'Inventory tracking and warehouse management system',
    category: 'supply',
    rating: 4.2,
  },
  {
    _id: '4',
    name: 'Customer Relationship',
    description: 'CRM system for managing customer relationships and sales',
    category: 'sales',
    rating: 4.6,
  },
  {
    _id: '5',
    name: 'Project Management',
    description: 'Project planning and team collaboration platform',
    category: 'operations',
    rating: 4.7,
  },
];

// Initialize search index
let indexInitialized = false;

const initializeIndex = () => {
  if (!indexInitialized) {
    searchEngine.buildIndex('systems', sampleData, ['name', 'description']);
    indexInitialized = true;
  }
};

/**
 * GET /api/search/full-text
 * Full-text search
 */
router.get('/full-text', optionalAuth, (req, res) => {
  try {
    const { query, collection = 'systems', limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json(responseFormatter.validationError('Query parameter is required'));
    }

    initializeIndex();

    const results = searchEngine.fullTextSearch(query, collection, parseInt(limit));

    res.json(
      responseFormatter.searchResults(results, query, results.length, 'Full-text search completed')
    );
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Search failed', error));
  }
});

/**
 * GET /api/search/fuzzy
 * Fuzzy search with tolerance
 */
router.get('/fuzzy', optionalAuth, (req, res) => {
  try {
    const { query, collection = 'systems', maxDistance = 2 } = req.query;

    if (!query) {
      return res.status(400).json(responseFormatter.validationError('Query parameter is required'));
    }

    initializeIndex();

    const results = searchEngine.fuzzySearch(query, collection, parseInt(maxDistance));

    res.json(
      responseFormatter.searchResults(results, query, results.length, 'Fuzzy search completed')
    );
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Fuzzy search failed', error));
  }
});

/**
 * POST /api/search/advanced
 * Advanced search with filters
 */
router.post('/advanced', optionalAuth, (req, res) => {
  try {
    const {
      query,
      collection = 'systems',
      filters = {},
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
    } = req.body;

    if (!query) {
      return res.status(400).json(responseFormatter.validationError('Query is required'));
    }

    initializeIndex();

    const result = searchEngine.advancedSearch(query, collection, filters, {
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    res.json(
      responseFormatter.paginated(
        result.results,
        result.total,
        Math.floor(offset / limit) + 1,
        limit,
        'Advanced search completed'
      )
    );
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Advanced search failed', error));
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions
 */
router.get('/suggestions', optionalAuth, (req, res) => {
  try {
    const { query, collection = 'systems', limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json(responseFormatter.validationError('Query parameter is required'));
    }

    initializeIndex();

    const suggestions = searchEngine.getSuggestions(query, collection, parseInt(limit));

    res.json(responseFormatter.success(suggestions, 'Suggestions retrieved'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Suggestions failed', error));
  }
});

/**
 * GET /api/search/stats
 * Get search engine statistics
 */
router.get('/stats', optionalAuth, (req, res) => {
  try {
    initializeIndex();
    const stats = searchEngine.getStats();

    res.json(responseFormatter.analytics(stats, 'current', 'Search engine statistics'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Stats retrieval failed', error));
  }
});

/**
 * POST /api/search/cache/clear
 * Clear search cache
 */
router.post('/cache/clear', optionalAuth, (req, res) => {
  try {
    searchEngine.clearCache();

    res.json(responseFormatter.success(null, 'Search cache cleared'));
  } catch (error) {
    res.status(500).json(responseFormatter.serverError('Cache clear failed', error));
  }
});

module.exports = router;
