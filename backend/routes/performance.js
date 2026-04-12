// Performance Routes
const express = require('express');
const PerformanceService = require('../services/performanceService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { authenticate, authorize } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const router = express.Router();

// All performance routes require authentication and admin access
router.use(authenticate);
router.use(authorize(['admin', 'system_admin']));

// Get performance analysis
router.get('/analysis', (_req, res, next) => {
  try {
    const analysis = PerformanceService.getPerformanceAnalysis();
    return res.json(new ApiResponse(200, analysis, 'Performance analysis fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance analysis', ['حدث خطأ داخلي']));
  }
});

// Get caching recommendations
router.get('/caching/recommendations', (_req, res, next) => {
  try {
    const recommendations = PerformanceService.getCachingRecommendations();
    return res.json(new ApiResponse(200, recommendations, 'Caching recommendations fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch caching recommendations', ['حدث خطأ داخلي']));
  }
});

// Get database optimization
router.get('/database/optimization', (_req, res, next) => {
  try {
    const optimization = PerformanceService.getDatabaseOptimization();
    return res.json(new ApiResponse(200, optimization, 'Database optimization fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch database optimization', ['حدث خطأ داخلي']));
  }
});

// Get code optimization
router.get('/code/optimization', (_req, res, next) => {
  try {
    const optimization = PerformanceService.getCodeOptimization();
    return res.json(new ApiResponse(200, optimization, 'Code optimization fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch code optimization', ['حدث خطأ داخلي']));
  }
});

// Get performance benchmarks
router.get('/benchmarks', (_req, res, next) => {
  try {
    const benchmarks = PerformanceService.getPerformanceBenchmarks();
    return res.json(new ApiResponse(200, benchmarks, 'Performance benchmarks fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance benchmarks', ['حدث خطأ داخلي']));
  }
});

// Get optimization history
router.get('/history', (_req, res, next) => {
  try {
    const history = PerformanceService.getOptimizationHistory();
    return res.json(new ApiResponse(200, history, 'Optimization history fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch optimization history', ['حدث خطأ داخلي']));
  }
});

// Get load testing results
router.get('/load-testing', (_req, res) => {
  try {
    const results = PerformanceService.getLoadTestingResults();
    res.json(results);
  } catch (error) {
    safeError(res, error, 'performance');
  }
});

// Generate performance report
router.post('/report/generate', (_req, res) => {
  try {
    const report = PerformanceService.generatePerformanceReport();
    res.status(201).json(report);
  } catch (error) {
    safeError(res, error, 'performance');
  }
});

module.exports = router;
