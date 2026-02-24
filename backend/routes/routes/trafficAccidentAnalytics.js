/**
 * Traffic Accident Analytics Routes - مسارات تحليلات الحوادث المرورية
 */

const express = require('express');
const router = express.Router();
const trafficAccidentAnalytics = require('../services/trafficAccidentAnalytics');
const logger = require('../utils/logger');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

/**
 * GET /api/traffic-accidents/analytics/timeline-trends
 * تحليل الاتجاهات على مدى الوقت
 */
router.get(
  '/timeline-trends',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'التواريخ (startDate, endDate) مطلوبة'
        });
      }

      const trends = await trafficAccidentAnalytics.analyzeTimelineTrends(
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error analyzing timeline trends', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/hotspots
 * تحليل الأماكن الخطرة (Hotspots)
 */
router.get(
  '/hotspots',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const hotspots = await trafficAccidentAnalytics.analyzeHotspots(
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: hotspots
      });
    } catch (error) {
      logger.error('Error analyzing hotspots', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/violations
 * تحليل أنماط المخالفات
 */
router.get(
  '/violations',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const patterns = await trafficAccidentAnalytics.analyzeViolationPatterns();

      res.status(200).json({
        success: true,
        data: patterns
      });
    } catch (error) {
      logger.error('Error analyzing violation patterns', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/injury-fatality-rates
 * تحليل معدلات الإصابات والوفيات
 */
router.get(
  '/injury-fatality-rates',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters = {};

      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      const rates = await trafficAccidentAnalytics.analyzeInjuryAndFatalityRates(
        filters
      );

      res.status(200).json({
        success: true,
        data: rates
      });
    } catch (error) {
      logger.error('Error analyzing injury rates', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/financial-impact
 * تحليل الخسائر المالية
 */
router.get(
  '/financial-impact',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { severity, startDate, endDate } = req.query;
      const filters = {};

      if (severity) filters.severity = severity;
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      const analysis = await trafficAccidentAnalytics.analyzeFinancialImpact(
        filters
      );

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error analyzing financial impact', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/investigator-performance
 * تقرير أداء المحققين
 */
router.get(
  '/investigator-performance',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const performance = await trafficAccidentAnalytics.getInvestigatorPerformance();

      res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error analyzing investigator performance', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/seasonal-trends
 * تحليل الاتجاهات الموسمية
 */
router.get(
  '/seasonal-trends',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const trends = await trafficAccidentAnalytics.analyzeSeasonalTrends();

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error analyzing seasonal trends', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/comprehensive-summary
 * الملخص الشامل
 */
router.get(
  '/comprehensive-summary',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { severity, startDate, endDate, city } = req.query;
      const filters = {};

      if (severity) filters.severity = severity;
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      if (city) filters.city = city;

      const summary = await trafficAccidentAnalytics.generateComprehensiveSummary(
        filters
      );

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error generating comprehensive summary', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/traffic-accidents/analytics/key-insights
 * استخراج الرؤى الرئيسية
 */
router.get(
  '/key-insights',
  authorize('view_accident_analytics'),
  async (req, res) => {
    try {
      const { severity, startDate, endDate, city } = req.query;
      const filters = {};

      if (severity) filters.severity = severity;
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      if (city) filters.city = city;

      const insights = await trafficAccidentAnalytics.extractKeyInsights(filters);

      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      logger.error('Error extracting key insights', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
