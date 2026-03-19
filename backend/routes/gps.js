/* eslint-disable no-unused-vars */
/**
 * GPS Tracking Routes
 * مسارات تتبع GPS المتقدمة
 * Phase 30 - Real-time GPS Tracking
 */

const express = require('express');
const GPSTrackingController = require('../controllers/gpsTracking.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All GPS routes require authentication
router.use(authenticate);

/**
 * ===== Location Recording =====
 */

/**
 * تسجيل موقع جديد في الوقت الفعلي
 * POST /api/gps/location
 */
router.post('/location', GPSTrackingController.recordLocation);

/**
 * تتبع موقع مركبة (alias for frontend compatibility)
 * POST /api/gps/track
 */
router.post('/track', GPSTrackingController.recordLocation);

/**
 * ===== Current Location =====
 */

/**
 * الحصول على جميع المواقع الحالية
 * GET /api/gps/locations
 */
router.get('/locations', GPSTrackingController.getFleetStatistics);

/**
 * الحصول على موقع مركبة محددة
 * GET /api/gps/locations/:vehicleId
 */
router.get('/locations/:vehicleId', GPSTrackingController.getCurrentLocation);

/**
 * الحصول على الموقع الحالي للسائق
 * GET /api/gps/location/:driverId
 */
router.get('/location/:driverId', GPSTrackingController.getCurrentLocation);

/**
 * ===== Route & History =====
 */

/**
 * الحصول على خريطة المسار
 * GET /api/gps/route/:driverId?startTime=2024-01-01&endTime=2024-01-02
 */
router.get('/route/:driverId', GPSTrackingController.getRouteMap);

/**
 * الحصول على سجل الموقع الكامل
 * GET /api/gps/history/:driverId?startTime=...&endTime=...&limit=100
 */
router.get('/history/:driverId', GPSTrackingController.getLocationHistory);

/**
 * ===== Behavior Analysis =====
 */

/**
 * الحصول على تقرير السلوك والقيادة
 * GET /api/gps/behavior/:driverId?startTime=...&endTime=...
 */
router.get('/behavior/:driverId', GPSTrackingController.getBehaviorReport);

/**
 * ===== Fleet Operations =====
 */

/**
 * البحث عن السائقين بالقرب من موقع معين
 * GET /api/gps/nearby?longitude=...&latitude=...&distance=1000
 */
router.get('/nearby', GPSTrackingController.findNearbyDrivers);

/**
 * الحصول على إحصائيات الأسطول
 * GET /api/gps/fleet-stats?timeRange=today&driverId=...
 */
router.get('/fleet-stats', GPSTrackingController.getFleetStatistics);

/**
 * ===== Alerts & Notifications =====
 */

/**
 * الحصول على التنبيهات النشطة للسائق
 * GET /api/gps/active-alerts/:driverId?limit=10
 */
router.get('/active-alerts/:driverId', GPSTrackingController.getActiveAlerts);

/**
 * تأكيد/الاعتراف بتنبيه
 * POST /api/gps/acknowledge-alert/:locationId/:alertIndex
 */
router.post('/acknowledge-alert/:locationId/:alertIndex', GPSTrackingController.acknowledgeAlert);

/**
 * ===== Data Export =====
 */

/**
 * تصدير بيانات التتبع (CSV/PDF)
 * GET /api/gps/export/:driverId?format=csv&startTime=...&endTime=...
 */
router.get('/export/:driverId', GPSTrackingController.exportTrackingData);

module.exports = router;
