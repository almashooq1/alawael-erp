/**
 * Geofence Service - خدمة السياج الجغرافي
 *
 * إدارة المناطق الجغرافية والتنبيهات والتحليلات
 */

const Geofence = require('../models/Geofence');
const logger = require('../utils/logger');

class GeofenceService {
  /**
   * إنشاء سياج جغرافي جديد
   */
  static async create(data) {
    const geofence = new Geofence(data);
    await geofence.save();
    logger.info(`Geofence created: ${geofence.name} (${geofence._id})`);
    return geofence;
  }

  /**
   * جلب جميع السياجات الجغرافية مع الفلترة
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.organization) query.organization = filters.organization;

    const [geofences, total] = await Promise.all([
      Geofence.find(query)
        .populate('createdBy', 'name email')
        .populate('vehiclesInside.vehicleId', 'plateNumber type')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 }),
      Geofence.countDocuments(query),
    ]);

    return { geofences, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب سياج بالـ ID
   */
  static async getById(id) {
    return Geofence.findById(id)
      .populate('createdBy', 'name email')
      .populate('vehiclesInside.vehicleId', 'plateNumber type status')
      .populate('vehiclesInside.driverId', 'name phone')
      .populate('rules.allowedVehicles', 'plateNumber')
      .populate('notificationRecipients', 'name email');
  }

  /**
   * تحديث سياج
   */
  static async update(id, data) {
    const geofence = await Geofence.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (geofence) logger.info(`Geofence updated: ${geofence.name}`);
    return geofence;
  }

  /**
   * حذف سياج
   */
  static async delete(id) {
    const geofence = await Geofence.findByIdAndDelete(id);
    if (geofence) logger.info(`Geofence deleted: ${geofence.name}`);
    return geofence;
  }

  /**
   * التحقق من وجود مركبة داخل سياج
   */
  static async checkVehicleInGeofence(vehicleLocation, geofenceId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) return null;

    const [lng, lat] = vehicleLocation;

    if (geofence.type === 'circle') {
      const result = await Geofence.findOne({
        _id: geofenceId,
        geometry: {
          $geoIntersects: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
          },
        },
      });
      return !!result;
    }

    // للمضلع
    const result = await Geofence.findOne({
      _id: geofenceId,
      geometry: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      },
    });
    return !!result;
  }

  /**
   * تسجيل دخول مركبة إلى سياج
   */
  static async recordVehicleEntry(geofenceId, vehicleId, driverId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) return null;

    // التحقق من عدم وجود المركبة بالفعل
    const alreadyInside = geofence.vehiclesInside.some(v => v.vehicleId?.toString() === vehicleId);
    if (alreadyInside) return geofence;

    geofence.vehiclesInside.push({ vehicleId, driverId, enteredAt: new Date() });
    geofence.stats.totalEntries += 1;
    geofence.stats.lastActivity = new Date();

    if (geofence.rules.alertOnEntry) {
      geofence.alerts.push({
        vehicleId,
        driverId,
        alertType: 'entry',
        location: { type: 'Point', coordinates: [0, 0] },
        severity: 'low',
      });
      geofence.stats.totalAlerts += 1;
    }

    await geofence.save();
    return geofence;
  }

  /**
   * تسجيل خروج مركبة من سياج
   */
  static async recordVehicleExit(geofenceId, vehicleId, driverId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) return null;

    geofence.vehiclesInside = geofence.vehiclesInside.filter(
      v => v.vehicleId?.toString() !== vehicleId
    );
    geofence.stats.totalExits += 1;
    geofence.stats.lastActivity = new Date();

    if (geofence.rules.alertOnExit) {
      geofence.alerts.push({
        vehicleId,
        driverId,
        alertType: 'exit',
        location: { type: 'Point', coordinates: [0, 0] },
        severity: 'medium',
      });
      geofence.stats.totalAlerts += 1;
    }

    await geofence.save();
    return geofence;
  }

  /**
   * جلب التنبيهات غير المقروءة
   */
  static async getUnacknowledgedAlerts(geofenceId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) return [];
    return geofence.alerts.filter(a => !a.acknowledged);
  }

  /**
   * تأكيد تنبيه
   */
  static async acknowledgeAlert(geofenceId, alertId, userId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) return null;

    const alert = geofence.alerts.id(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      await geofence.save();
    }
    return alert;
  }

  /**
   * إحصائيات السياج
   */
  static async getStatistics(organizationId) {
    const stats = await Geofence.aggregate([
      { $match: organizationId ? { organization: organizationId } : {} },
      {
        $group: {
          _id: null,
          totalGeofences: { $sum: 1 },
          activeGeofences: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalAlerts: { $sum: '$stats.totalAlerts' },
          totalEntries: { $sum: '$stats.totalEntries' },
          totalExits: { $sum: '$stats.totalExits' },
          totalVehiclesInside: { $sum: { $size: '$vehiclesInside' } },
          byCategory: { $push: '$category' },
        },
      },
    ]);

    const categoryCounts = await Geofence.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    return {
      ...(stats[0] || {
        totalGeofences: 0,
        activeGeofences: 0,
        totalAlerts: 0,
        totalEntries: 0,
        totalExits: 0,
        totalVehiclesInside: 0,
      }),
      categoryCounts,
    };
  }

  /**
   * البحث عن سياجات قريبة من موقع معين
   */
  static async findNearby(lng, lat, maxDistanceMeters = 5000) {
    return Geofence.find({
      status: 'active',
      geometry: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).limit(20);
  }
}

module.exports = GeofenceService;
