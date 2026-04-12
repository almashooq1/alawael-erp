/**
 * Smart GPS Tracking API Routes
 * مسارات API شاملة لنظام تتبع الحافلات الذكي
 */

const express = require('express');
const router = express.Router();
const SmartGPSTrackingService = require('../services/smartGPSTracking.service');
const SmartFleetDashboardService = require('../services/smartFleetDashboard.service');
const GPSSecurityService = require('../services/gpsSecurityService');
const SmartGPSWebSocketService = require('../services/smartGPSWebSocket.service');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Alias for backward compatibility with .verifyToken pattern
const authMiddleware = { verifyToken: authenticateToken };

/**
 * ========== 1. تتبع الموقع الحي ==========
 */

/**
 * تحديث موقع مركبة مع التحليل الذكي
 * POST /api/gps/location/update
 */
router.post('/location/update', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId, latitude, longitude, speed, bearing, accuracy } = req.body;

    // التحقق من صحة البيانات
    if (!vehicleId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الموقع ناقصة',
      });
    }

    // تحديث الموقع مع التحليل الذكي
    const result = await SmartGPSTrackingService.updateLocationWithIntelligence(vehicleId, {
      latitude,
      longitude,
      speed,
      bearing,
      accuracy,
    });

    // إذا كانت هناك حالات شاذة، بث التنبيهات
    if (result.anomalies && result.anomalies.length > 0) {
      SmartGPSWebSocketService.broadcastAlert(
        {
          type: 'anomaly_detected',
          severity: 'medium',
          vehicleId,
          message: `تم اكتشاف حالة شاذة: ${result.anomalies[0].message}`,
          recommendation: result.anomalies[0].action,
        },
        [vehicleId]
      );
    }

    // بث تحديث الموقع الحي
    SmartGPSWebSocketService.broadcastLocationUpdate(vehicleId, result.vehicle.currentLocation);

    // تسجيل التدقيق
    await GPSSecurityService.logAccessEvent({
      userId: req.user.id,
      action: 'update_location',
      vehicleId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
      result: 'location_updated',
    });

    res.json(result);
  } catch (error) {
    safeError(res, error, 'خطأ في تحديث موقع المركبة');
  }
});

/**
 * الحصول على الموقع الحالي للمركبة
 * GET /api/gps/location/:vehicleId
 */
router.get('/location/:vehicleId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // التحقق من الصلاحيات
    const hasAccess = await GPSSecurityService.verifyAccessPermission(
      req.user,
      vehicleId,
      'view_location'
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحيات لعرض هذا الموقع',
      });
    }

    const locationData = await SmartGPSTrackingService.getCurrentLocationData(vehicleId);

    res.json({
      success: true,
      vehicle: vehicleId,
      location: locationData,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب الموقع');
  }
});

/**
 * الحصول على سجل المواقع التاريخية
 * GET /api/gps/location/history/:vehicleId?hours=24
 */
router.get('/location/history/:vehicleId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { hours = 24 } = req.query;

    const history = await SmartGPSTrackingService.getLocationHistory(vehicleId, parseInt(hours));

    res.json({
      success: true,
      vehicleId,
      hours: parseInt(hours),
      count: history.count,
      history: history.history,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب السجل');
  }
});

/**
 * ========== 2. لوحة التحكم والإحصائيات ==========
 */

/**
 * الحصول على لقطة شاملة للأسطول
 * GET /api/gps/fleet/snapshot
 */
router.get('/fleet/snapshot', authMiddleware.verifyToken, async (req, res) => {
  try {
    const snapshot = await SmartFleetDashboardService.getFleetSnapshot();

    res.json({
      success: true,
      data: snapshot,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب لقطة الأسطول');
  }
});

/**
 * لوحة التحكم المرئية للمركبات على الخريطة
 * GET /api/gps/fleet/map
 */
router.get('/fleet/map', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { status } = req.query;

    const vehicles = await SmartGPSTrackingService.getAllVehiclesOnMap({
      status: status || null,
    });

    res.json({
      success: true,
      vehicles: vehicles.vehicles,
      count: vehicles.count,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب بيانات الخريطة');
  }
});

/**
 * لوحة إدارة التنبيهات
 * GET /api/gps/alerts/dashboard?severity=critical&status=pending
 */
router.get('/alerts/dashboard', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { severity, status } = req.query;

    const alertsDashboard = await SmartFleetDashboardService.getAlertsDashboard({
      severity,
      status,
    });

    res.json(alertsDashboard);
  } catch (error) {
    safeError(res, error, 'خطأ في جلب لوحة التنبيهات');
  }
});

/**
 * ========== 3. التنبؤات والتحليلات ==========
 */

/**
 * التنبؤ بوقت الوصول (ETA)
 * POST /api/gps/predict/eta
 */
router.post('/predict/eta', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId, destination } = req.body;

    if (!vehicleId || !destination) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة',
      });
    }

    const eta = await SmartGPSTrackingService.predictETA(vehicleId, destination);

    res.json(eta);
  } catch (error) {
    safeError(res, error, 'خطأ في حساب ETA');
  }
});

/**
 * التنبؤ بنقاط الخطر
 * GET /api/gps/predict/danger-points/:vehicleId
 */
router.get('/predict/danger-points/:vehicleId', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const dangerPoints = await SmartGPSTrackingService.predictDangerPoints(vehicleId);

    res.json({
      success: true,
      vehicleId,
      dangerPoints,
      count: dangerPoints.length,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في التنبؤ بنقاط الخطر');
  }
});

/**
 * التنبؤ باستهلاك الوقود
 * POST /api/gps/predict/fuel
 */
router.post('/predict/fuel', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId, distance, drivingCondition } = req.body;

    const fuelPrediction = await SmartGPSTrackingService.predictFuelConsumption(
      vehicleId,
      distance,
      drivingCondition
    );

    res.json({
      success: true,
      prediction: fuelPrediction,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في التنبؤ بالوقود');
  }
});

/**
 * ========== 4. تحسين المسارات ==========
 */

/**
 * تحسين المسار
 * POST /api/gps/routes/optimize
 */
router.post('/routes/optimize', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId, pickupPoints, dropoffPoints } = req.body;

    if (!vehicleId || !pickupPoints || !dropoffPoints) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة',
      });
    }

    const optimizedRoute = await SmartGPSTrackingService.optimizeRoute(
      vehicleId,
      pickupPoints,
      dropoffPoints
    );

    res.json(optimizedRoute);
  } catch (error) {
    safeError(res, error, 'خطأ في تحسين المسار');
  }
});

/**
 * ========== 5. أداء السائقين ==========
 */

/**
 * تقرير أداء السائق
 * GET /api/gps/drivers/:driverId/performance?days=30
 */
router.get('/drivers/:driverId/performance', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { days = 30 } = req.query;

    const report = await SmartFleetDashboardService.getDriverPerformanceReport(
      driverId,
      parseInt(days)
    );

    res.json(report);
  } catch (error) {
    safeError(res, error, 'خطأ في جلب تقرير الأداء');
  }
});

/**
 * ========== 6. مؤشرات الأداء الرئيسية (KPIs) ==========
 */

/**
 * KPIs الأسطول
 * GET /api/gps/fleet/kpis?timeframe=daily
 */
router.get('/fleet/kpis', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { timeframe = 'daily' } = req.query;

    const kpis = await SmartFleetDashboardService.getFleetKPIs(timeframe);

    res.json({
      success: true,
      kpis,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب KPIs');
  }
});

/**
 * ========== 7. إحصائيات WebSocket ==========
 */

/**
 * الحصول على إحصائيات الاتصالات الحية
 * GET /api/gps/websocket/stats
 */
router.get('/websocket/stats', authMiddleware.verifyToken, async (req, res) => {
  try {
    const stats = SmartGPSWebSocketService.getConnectionStatistics();

    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب إحصائيات WebSocket');
  }
});

/**
 * ========== 8. الأمان والتدقيق ==========
 */

/**
 * السجلات التدقيقية
 * GET /api/gps/audit-logs?vehicleId=xxx&days=7
 */
router.get('/audit-logs', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { vehicleId, days = 7, action } = req.query;

    const logs = await GPSSecurityService.searchAuditLogs({
      userId: req.user.id,
      vehicleId,
      action,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    res.json({
      success: true,
      logs: logs.results,
      total: logs.total,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب السجلات');
  }
});

/**
 * ========== 9. التقارير ==========
 */

/**
 * التقرير اليومي
 * GET /api/gps/reports/daily?date=2024-02-18
 */
router.get('/reports/daily', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { date } = req.query;

    const report = await SmartFleetDashboardService.getDailyReport(date);

    res.json({
      success: true,
      report,
      timestamp: new Date(),
    });
  } catch (error) {
    safeError(res, error, 'خطأ في جلب التقرير');
  }
});

module.exports = router;
