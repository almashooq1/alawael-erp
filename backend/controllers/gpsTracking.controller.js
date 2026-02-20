/**
 * GPS Tracking Controller
 * متحكم تتبع GPS المتقدم
 */

const GPSTrackingService = require('../services/gpsTrackingService');
const GPSLocation = require('../models/GPSLocation');

class GPSTrackingController {
  /**
   * تسجيل موقع جديد (WebSocket/Real-time)
   * POST /api/gps/location
   */
  static async recordLocation(req, res) {
    try {
      const { driverId, coordinates, speed, heading, altitude, accuracy, satellites, acceleration, seatbeltStatus, engineRunning } =
        req.body;

      // التحقق من المدخلات
      if (!driverId || !coordinates) {
        return res.status(400).json({
          success: false,
          message: 'معرف السائق والإحداثيات مطلوبة',
        });
      }

      // تسجيل الموقع
      const location = await GPSTrackingService.recordLocation(driverId, {
        coordinates,
        speed: speed || 0,
        heading,
        altitude,
        accuracy,
        satellites,
        acceleration,
        seatbeltStatus,
        engineRunning,
      });

      return res.status(201).json({
        success: true,
        message: 'تم تسجيل الموقع بنجاح',
        location,
      });
    } catch (error) {
      console.error('خطأ في تسجيل الموقع:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على الموقع الحالي
   * GET /api/gps/location/:driverId
   */
  static async getCurrentLocation(req, res) {
    try {
      const { driverId } = req.params;

      const location = await GPSTrackingService.getCurrentLocation(driverId);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'لا يوجد موقع متاح للسائق',
        });
      }

      return res.status(200).json({
        success: true,
        location: {
          lat: location.lat,
          lon: location.lon,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          alerts: location.getActiveAlerts(),
        },
      });
    } catch (error) {
      console.error('خطأ في جلب الموقع الحالي:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على خريطة المسار
   * GET /api/gps/route/:driverId?startTime=...&endTime=...
   */
  static async getRouteMap(req, res) {
    try {
      const { driverId } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'startTime و endTime مطلوبة',
        });
      }

      const routeMap = await GPSTrackingService.getRouteMap(
        driverId,
        new Date(startTime),
        new Date(endTime)
      );

      if (!routeMap) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد بيانات مسار متاحة',
        });
      }

      return res.status(200).json({
        success: true,
        route: routeMap,
      });
    } catch (error) {
      console.error('خطأ في جلب المسار:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على تقرير السلوك
   * GET /api/gps/behavior/:driverId?startTime=...&endTime=...
   */
  static async getBehaviorReport(req, res) {
    try {
      const { driverId } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        // استخدام اليوم الحالي كقيمة افتراضية
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return res.status(400).json({
          success: false,
          message: 'startTime و endTime مطلوبة',
        });
      }

      const report = await GPSTrackingService.getBehaviorReport(
        driverId,
        new Date(startTime),
        new Date(endTime)
      );

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('خطأ في جلب تقرير السلوك:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * البحث عن السائقين بالقرب من موقع
   * GET /api/gps/nearby?longitude=...&latitude=...&distance=...
   */
  static async findNearbyDrivers(req, res) {
    try {
      const { longitude, latitude, distance = 1000 } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: 'longitude و latitude مطلوبة',
        });
      }

      const drivers = await GPSTrackingService.findNearbyDrivers(
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(distance)
      );

      return res.status(200).json({
        success: true,
        driversCount: drivers.length,
        drivers: drivers.map((d) => ({
          driverId: d.driver,
          lat: d.lat,
          lon: d.lon,
          speed: d.speed,
          distance: d.getDistanceTo({ location: { coordinates: [longitude, latitude] } }),
        })),
      });
    } catch (error) {
      console.error('خطأ في البحث عن السائقين:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على إحصائيات الأسطول
   * GET /api/gps/fleet-stats?timeRange=today
   */
  static async getFleetStatistics(req, res) {
    try {
      const { timeRange = 'today', driverId } = req.query;

      const stats = await GPSTrackingService.getFleetStatistics(driverId, timeRange);

      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأسطول:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على سجل الموقع الكامل
   * GET /api/gps/history/:driverId?startTime=...&endTime=...&limit=100
   */
  static async getLocationHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { startTime, endTime, limit = 100 } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'startTime و endTime مطلوبة',
        });
      }

      const locations = await GPSLocation.getLocationsInTimeRange(
        driverId,
        new Date(startTime),
        new Date(endTime)
      )
        .limit(parseInt(limit))
        .lean();

      return res.status(200).json({
        success: true,
        locationsCount: locations.length,
        locations: locations.map((loc) => ({
          lat: loc.location.coordinates[1],
          lon: loc.location.coordinates[0],
          speed: loc.speed,
          accuracy: loc.accuracy,
          timestamp: loc.timestamp,
        })),
      });
    } catch (error) {
      console.error('خطأ في جلب السجل:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * تأكيد تنبيه
   * POST /api/gps/acknowledge-alert/:locationId/:alertIndex
   */
  static async acknowledgeAlert(req, res) {
    try {
      const { locationId, alertIndex } = req.params;
      const { acknowledgedBy } = req.body;

      const location = await GPSLocation.findById(locationId);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'الموقع غير موجود',
        });
      }

      await location.acknowledgeAlert(parseInt(alertIndex), acknowledgedBy);

      return res.status(200).json({
        success: true,
        message: 'تم تأكيد التنبيه',
      });
    } catch (error) {
      console.error('خطأ في تأكيد التنبيه:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * الحصول على التنبيهات النشطة
   * GET /api/gps/active-alerts/:driverId
   */
  static async getActiveAlerts(req, res) {
    try {
      const { driverId } = req.params;
      const { limit = 10 } = req.query;

      const locations = await GPSLocation.find({ driver: driverId, 'alerts.acknowledged': false })
        .select('alerts timestamp')
        .limit(parseInt(limit))
        .sort({ timestamp: -1 });

      const activeAlerts = locations.flatMap((loc) =>
        loc.getActiveAlerts().map((alert) => ({
          ...alert.toObject(),
          locationId: loc._id,
          timestamp: loc.timestamp,
        }))
      );

      return res.status(200).json({
        success: true,
        alertsCount: activeAlerts.length,
        alerts: activeAlerts,
      });
    } catch (error) {
      console.error('خطأ في جلب التنبيهات:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * تصدير بيانات تتبع (CSV/PDF)
   * GET /api/gps/export/:driverId?format=csv&startTime=...&endTime=...
   */
  static async exportTrackingData(req, res) {
    try {
      const { driverId } = req.params;
      const { format = 'csv', startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'startTime و endTime مطلوبة',
        });
      }

      const locations = await GPSLocation.getLocationsInTimeRange(
        driverId,
        new Date(startTime),
        new Date(endTime)
      );

      if (format === 'csv') {
        // تحويل إلى CSV
        const csvHeader = 'DateTime,Latitude,Longitude,Speed,Heading,Accuracy\n';
        const csvData = locations
          .map((loc) => `${loc.timestamp},${loc.lat},${loc.lon},${loc.speed},${loc.heading},${loc.accuracy}`)
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tracking_${driverId}.csv"`);
        res.send(csvHeader + csvData);
      } else {
        return res.status(400).json({
          success: false,
          message: 'الصيغة المطلوبة غير مدعومة',
        });
      }
    } catch (error) {
      console.error('خطأ في تصدير البيانات:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = GPSTrackingController;
