/**
 * ⭐ مسارات تقييم أداء السائقين
 */

const express = require('express');
const router = express.Router();
const driverRatingService = require('../services/driverRatingService');
const { authenticateToken } = require('../middleware/auth');

// إضافة تقييم
router.post('/', authenticateToken, (req, res) => {
  try {
    const rating = driverRatingService.addRating(req.body);
    if (!rating) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
    }
    res.json({
      success: true,
      message: 'تم إضافة التقييم بنجاح',
      rating,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب تقييمات السائق
router.get('/driver/:driverId', (req, res) => {
  try {
    const result = driverRatingService.getDriverRatings(req.params.driverId, req.query.limit || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// متوسط التقييم
router.get('/driver/:driverId/average', (req, res) => {
  try {
    const average = driverRatingService.calculateAverageRating(req.params.driverId);
    res.json({ driverId: req.params.driverId, averageRating: average });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// درجة الأداء
router.get('/driver/:driverId/performance-score', (req, res) => {
  try {
    const score = driverRatingService.getPerformanceScore(req.params.driverId);
    const level = driverRatingService.getPerformanceLevel(req.params.driverId);
    res.json({
      driverId: req.params.driverId,
      performanceScore: score,
      performanceLevel: level,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مستوى الأداء
router.get('/driver/:driverId/level', (req, res) => {
  try {
    const level = driverRatingService.getPerformanceLevel(req.params.driverId);
    res.json(level);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحليل الأداء
router.get('/driver/:driverId/insights', (req, res) => {
  try {
    const insights = driverRatingService.getPerformanceInsights(req.params.driverId);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الأداء الشامل
router.get('/driver/:driverId/report', (req, res) => {
  try {
    const report = driverRatingService.getPerformanceReport(req.params.driverId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مقارنة السائقين
router.post('/compare', (req, res) => {
  try {
    const comparison = driverRatingService.compareDrivers(req.body.driverIds);
    res.json({ comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تنبيهات الأداء
router.get('/driver/:driverId/alerts', (req, res) => {
  try {
    const alerts = driverRatingService.getPerformanceAlerts(req.params.driverId);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مقاييس الأداء الشهرية
router.get('/driver/:driverId/metrics', (req, res) => {
  try {
    const metrics = driverRatingService.getDriverMetrics(
      req.params.driverId,
      req.query.period || 'monthly'
    );
    res.json({ driverId: req.params.driverId, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
