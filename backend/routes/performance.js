// Performance Routes
const express = require('express');
const PerformanceService = require('../services/performanceService');

const router = express.Router();

// Get performance analysis
router.get('/analysis', (req, res) => {
  try {
    const analysis = PerformanceService.getPerformanceAnalysis();
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get caching recommendations
router.get('/caching/recommendations', (req, res) => {
  try {
    const recommendations = PerformanceService.getCachingRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get database optimization
router.get('/database/optimization', (req, res) => {
  try {
    const optimization = PerformanceService.getDatabaseOptimization();
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get code optimization
router.get('/code/optimization', (req, res) => {
  try {
    const optimization = PerformanceService.getCodeOptimization();
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get performance benchmarks
router.get('/benchmarks', (req, res) => {
  try {
    const benchmarks = PerformanceService.getPerformanceBenchmarks();
    res.json(benchmarks);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get optimization history
router.get('/history', (req, res) => {
  try {
    const history = PerformanceService.getOptimizationHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get load testing results
router.get('/load-testing', (req, res) => {
  try {
    const results = PerformanceService.getLoadTestingResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate performance report
router.post('/report/generate', (req, res) => {
  try {
    const report = PerformanceService.generatePerformanceReport();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
