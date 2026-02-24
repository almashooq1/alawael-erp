// Performance Routes
const express = require('express');
const PerformanceService = require('../services/performanceService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

const router = express.Router();

// Get performance analysis
router.get('/analysis', (_req, res, next) => {
  try {
    const analysis = PerformanceService.getPerformanceAnalysis();
    return res.json(new ApiResponse(200, analysis, 'Performance analysis fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance analysis', [error.message]));
  }
});

// Get caching recommendations
router.get('/caching/recommendations', (_req, res, next) => {
  try {
    const recommendations = PerformanceService.getCachingRecommendations();
    return res.json(new ApiResponse(200, recommendations, 'Caching recommendations fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch caching recommendations', [error.message]));
  }
});

// Get database optimization
router.get('/database/optimization', (_req, res, next) => {
  try {
    const optimization = PerformanceService.getDatabaseOptimization();
    return res.json(new ApiResponse(200, optimization, 'Database optimization fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch database optimization', [error.message]));
  }
});

// Get code optimization
router.get('/code/optimization', (_req, res, next) => {
  try {
    const optimization = PerformanceService.getCodeOptimization();
    return res.json(new ApiResponse(200, optimization, 'Code optimization fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch code optimization', [error.message]));
  }
});

// Get performance benchmarks
router.get('/benchmarks', (_req, res, next) => {
  try {
    const benchmarks = PerformanceService.getPerformanceBenchmarks();
    return res.json(new ApiResponse(200, benchmarks, 'Performance benchmarks fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance benchmarks', [error.message]));
  }
});

// Get optimization history
router.get('/history', (_req, res, next) => {
  try {
    const history = PerformanceService.getOptimizationHistory();
    return res.json(new ApiResponse(200, history, 'Optimization history fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch optimization history', [error.message]));
  }
});

// Get load testing results
router.get('/load-testing', (_req, res) => {
  try {
    const results = PerformanceService.getLoadTestingResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate performance report
router.post('/report/generate', (_req, res) => {
  try {
    const report = PerformanceService.generatePerformanceReport();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
