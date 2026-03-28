/**
 * Geofence Controller - التحكم بالسياج الجغرافي
 */

const GeofenceService = require('../services/geofenceService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class GeofenceController {
  /** إنشاء سياج جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const geofence = await GeofenceService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء السياج الجغرافي', data: geofence });
    } catch (error) {
      logger.error('Geofence create error:', error.message);
      res.status(400).json({ success: false, message: 'فشل إنشاء السياج', error: safeError(error) });
    }
  }

  /** جلب الكل */
  static async getAll(req, res) {
    try {
      const { status, category, page = 1, limit = 20 } = req.query;
      const result = await GeofenceService.getAll({ status, category }, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السياجات', error: safeError(error) });
    }
  }

  /** جلب بالـ ID */
  static async getById(req, res) {
    try {
      const geofence = await GeofenceService.getById(req.params.id);
      if (!geofence) return res.status(404).json({ success: false, message: 'السياج غير موجود' });
      res.json({ success: true, data: geofence });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب السياج', error: safeError(error) });
    }
  }

  /** تحديث */
  static async update(req, res) {
    try {
      const data = { ...req.body, updatedBy: req.user?._id };
      const geofence = await GeofenceService.update(req.params.id, data);
      if (!geofence) return res.status(404).json({ success: false, message: 'السياج غير موجود' });
      res.json({ success: true, message: 'تم تحديث السياج', data: geofence });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: safeError(error) });
    }
  }

  /** حذف */
  static async delete(req, res) {
    try {
      const geofence = await GeofenceService.delete(req.params.id);
      if (!geofence) return res.status(404).json({ success: false, message: 'السياج غير موجود' });
      res.json({ success: true, message: 'تم حذف السياج' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل الحذف', error: safeError(error) });
    }
  }

  /** التحقق من مركبة داخل سياج */
  static async checkVehicle(req, res) {
    try {
      const { lng, lat } = req.query;
      const result = await GeofenceService.checkVehicleInGeofence(
        [parseFloat(lng), parseFloat(lat)],
        req.params.id
      );
      res.json({ success: true, data: { isInside: result } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في التحقق', error: safeError(error) });
    }
  }

  /** تسجيل دخول مركبة */
  static async recordEntry(req, res) {
    try {
      const { vehicleId, driverId } = req.body;
      const geofence = await GeofenceService.recordVehicleEntry(req.params.id, vehicleId, driverId);
      if (!geofence) return res.status(404).json({ success: false, message: 'السياج غير موجود' });
      res.json({ success: true, message: 'تم تسجيل الدخول', data: geofence });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الدخول', error: safeError(error) });
    }
  }

  /** تسجيل خروج مركبة */
  static async recordExit(req, res) {
    try {
      const { vehicleId, driverId } = req.body;
      const geofence = await GeofenceService.recordVehicleExit(req.params.id, vehicleId, driverId);
      if (!geofence) return res.status(404).json({ success: false, message: 'السياج غير موجود' });
      res.json({ success: true, message: 'تم تسجيل الخروج', data: geofence });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الخروج', error: safeError(error) });
    }
  }

  /** جلب التنبيهات غير المقروءة */
  static async getAlerts(req, res) {
    try {
      const alerts = await GeofenceService.getUnacknowledgedAlerts(req.params.id);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** تأكيد تنبيه */
  static async acknowledgeAlert(req, res) {
    try {
      const alert = await GeofenceService.acknowledgeAlert(
        req.params.id,
        req.params.alertId,
        req.user?._id
      );
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم تأكيد التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التأكيد', error: safeError(error) });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const stats = await GeofenceService.getStatistics(req.query.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: safeError(error) });
    }
  }

  /** البحث عن سياجات قريبة */
  static async findNearby(req, res) {
    try {
      const { lng, lat, maxDistance = 5000 } = req.query;
      const geofences = await GeofenceService.findNearby(
        parseFloat(lng),
        parseFloat(lat),
        parseInt(maxDistance)
      );
      res.json({ success: true, data: geofences });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في البحث', error: safeError(error) });
    }
  }
}

module.exports = GeofenceController;
