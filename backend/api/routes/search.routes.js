/**
 * Search Routes
 * مسارات البحث المتقدم
 */

const express = require('express');
const router = express.Router();
const AdvancedSearchService = require('../../services/advancedSearchService');

// Initialize service
const searchService = new AdvancedSearchService();

/**
 * POST /api/search
 * البحث المتقدم في جميع الحقول
 */
router.post('/search', (req, res, next) => {
  try {
    const { data, query, options } = req.body;

    if (!data || !query) {
      return res.status(400).json({
        success: false,
        error: 'البيانات والاستعلام مطلوبان',
      });
    }

    const results = searchService.advancedSearch(data, query, options);

    res.json({
      success: true,
      query,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/filters
 * تطبيق المرشحات المتقدمة
 */
router.post('/search/filters', (req, res, next) => {
  try {
    const { data, filters } = req.body;

    if (!data || !filters) {
      return res.status(400).json({
        success: false,
        error: 'البيانات والمرشحات مطلوبة',
      });
    }

    const results = searchService.applyFilters(data, filters);

    res.json({
      success: true,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/facets/:field
 * الحصول على فتيس البحث
 */
router.get('/search/facets/:field', (req, res, next) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'البيانات مطلوبة',
      });
    }

    const facets = searchService.facetedSearch(data, req.params.field);

    res.json({
      success: true,
      field: req.params.field,
      facets,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/autocomplete
 * الإكمال التلقائي
 */
router.post('/search/autocomplete', (req, res, next) => {
  try {
    const { data, query, field } = req.body;

    if (!data || !query) {
      return res.status(400).json({
        success: false,
        error: 'البيانات والاستعلام مطلوبان',
      });
    }

    const suggestions = searchService.autocompleteSearch(data, query, field);

    res.json({
      success: true,
      query,
      suggestionCount: suggestions.length,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/stats
 * إحصائيات البحث
 */
router.get('/search/stats', (req, res, next) => {
  try {
    const stats = searchService.getSearchStatistics();

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/compound
 * البحث المركب
 */
router.post('/search/compound', (req, res, next) => {
  try {
    const { data, searchCriteria } = req.body;

    if (!data || !searchCriteria) {
      return res.status(400).json({
        success: false,
        error: 'البيانات ومعايير البحث مطلوبة',
      });
    }

    const results = searchService.compoundSearch(data, searchCriteria);

    res.json({
      success: true,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/export
 * تصدير نتائج البحث
 */
router.post('/search/export', (req, res, next) => {
  try {
    const { results, format } = req.body;

    if (!results || !format) {
      return res.status(400).json({
        success: false,
        error: 'النتائج والصيغة مطلوبة',
      });
    }

    const exported = searchService.exportResults(results, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=search-results.csv');
      res.send(exported);
    } else if (format === 'json') {
      res.json({
        success: true,
        format: 'json',
        data: exported,
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
