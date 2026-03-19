/**
 * Fleet Tire Service - خدمة إدارة الإطارات
 *
 * تتبع دورة حياة الإطارات والتبديل والتآكل
 */

const FleetTire = require('../models/FleetTire');
const logger = require('../utils/logger');

class FleetTireService {
  /**
   * إضافة إطار جديد
   */
  static async create(data) {
    const tire = new FleetTire(data);
    await tire.save();
    logger.info(`Tire created: ${tire.serialNumber}`);
    return tire;
  }

  /**
   * جلب جميع الإطارات
   */
  static async getAll(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.brand) query.brand = filters.brand;
    if (filters.vehicle) query.currentVehicle = filters.vehicle;
    if (filters.type) query.type = filters.type;
    if (filters.organization) query.organization = filters.organization;

    const [tires, total] = await Promise.all([
      FleetTire.find(query)
        .populate('currentVehicle', 'plateNumber type')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 }),
      FleetTire.countDocuments(query),
    ]);

    return { tires, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب إطار بالـ ID
   */
  static async getById(id) {
    return FleetTire.findById(id)
      .populate('currentVehicle', 'plateNumber type model')
      .populate('createdBy', 'name email');
  }

  /**
   * تحديث إطار
   */
  static async update(id, data) {
    return FleetTire.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /**
   * تركيب إطار على مركبة
   */
  static async installTire(tireId, vehicleId, position) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.currentVehicle = vehicleId;
    tire.position = position;
    tire.status = 'in_use';
    tire.usage.installDate = new Date();

    await tire.save();
    logger.info(`Tire ${tire.serialNumber} installed on vehicle ${vehicleId} at ${position}`);
    return tire;
  }

  /**
   * إزالة إطار من مركبة
   */
  static async removeTire(tireId) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.currentVehicle = null;
    tire.position = 'storage';
    tire.status = 'spare';

    await tire.save();
    return tire;
  }

  /**
   * تبديل موقع الإطارات (Rotation)
   */
  static async rotateTires(rotations) {
    const results = [];
    for (const rotation of rotations) {
      const tire = await FleetTire.findById(rotation.tireId);
      if (!tire) continue;

      tire.rotations.push({
        date: new Date(),
        fromPosition: tire.position,
        toPosition: rotation.newPosition,
        odometerReading: rotation.odometer,
        performedBy: rotation.performedBy,
        notes: rotation.notes,
      });
      tire.position = rotation.newPosition;
      tire.lastRotation = new Date();
      if (rotation.odometer) {
        tire.nextRotationKm = rotation.odometer + tire.rotationIntervalKm;
      }

      await tire.save();
      results.push(tire);
    }

    logger.info(`Tire rotation completed for ${results.length} tires`);
    return results;
  }

  /**
   * تسجيل قراءة تآكل
   */
  static async recordTreadReading(tireId, depth, position, measuredBy) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.treadDepth.readings.push({
      date: new Date(),
      depth,
      position: position || tire.position,
      measuredBy,
    });
    tire.treadDepth.current = depth;

    // تنبيه إذا كان التآكل عالي
    if (depth <= tire.treadDepth.minimum) {
      tire.status = 'worn';
      logger.warn(`Tire ${tire.serialNumber} tread below minimum! Current: ${depth}mm`);
    }

    await tire.save();
    return tire;
  }

  /**
   * تسجيل ضغط الإطار
   */
  static async recordPressure(tireId, pressure) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.pressure.lastReading = pressure;
    tire.pressure.lastChecked = new Date();
    await tire.save();
    return tire;
  }

  /**
   * إضافة إصلاح
   */
  static async addRepair(tireId, repairData) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.repairs.push(repairData);
    tire.performance.totalCost += repairData.cost || 0;
    await tire.save();
    return tire;
  }

  /**
   * التخلص من إطار
   */
  static async disposeTire(tireId, disposalData) {
    const tire = await FleetTire.findById(tireId);
    if (!tire) return null;

    tire.status = 'disposed';
    tire.disposal = {
      ...disposalData,
      date: new Date(),
      totalLifeKm: tire.usage.totalKm,
    };
    tire.currentVehicle = null;
    tire.position = 'storage';

    await tire.save();
    logger.info(`Tire ${tire.serialNumber} disposed: ${disposalData.reason}`);
    return tire;
  }

  /**
   * الإطارات التي تحتاج استبدال
   */
  static async getTiresNeedingReplacement(organizationId) {
    const query = {
      status: 'in_use',
      $or: [
        { 'treadDepth.current': { $lte: 3 } }, // أقل من 3 ملم
        { 'usage.totalKm': { $gte: 55000 } }, // قاربت على الحد الأقصى
      ],
    };
    if (organizationId) query.organization = organizationId;

    return FleetTire.find(query)
      .populate('currentVehicle', 'plateNumber')
      .sort({ 'treadDepth.current': 1 });
  }

  /**
   * الإطارات التي تحتاج تبديل دوري
   */
  static async getTiresNeedingRotation(organizationId) {
    const query = {
      status: 'in_use',
      lastRotation: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // أكثر من 90 يوم
    };
    if (organizationId) query.organization = organizationId;

    return FleetTire.find(query)
      .populate('currentVehicle', 'plateNumber')
      .sort({ lastRotation: 1 });
  }

  /**
   * إطارات المركبة
   */
  static async getVehicleTires(vehicleId) {
    return FleetTire.find({ currentVehicle: vehicleId, status: 'in_use' }).sort({ position: 1 });
  }

  /**
   * إحصائيات الإطارات
   */
  static async getStatistics(organizationId) {
    const match = organizationId ? { organization: organizationId } : {};

    const stats = await FleetTire.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          inUse: { $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, 1, 0] } },
          spare: { $sum: { $cond: [{ $eq: ['$status', 'spare'] }, 1, 0] } },
          worn: { $sum: { $cond: [{ $eq: ['$status', 'worn'] }, 1, 0] } },
          disposed: { $sum: { $cond: [{ $eq: ['$status', 'disposed'] }, 1, 0] } },
          avgTreadDepth: { $avg: '$treadDepth.current' },
          totalCost: { $sum: '$performance.totalCost' },
          avgCostPerKm: { $avg: '$performance.costPerKm' },
        },
      },
    ]);

    const byBrand = await FleetTire.aggregate([
      { $match: { ...match, status: 'in_use' } },
      { $group: { _id: '$brand', count: { $sum: 1 }, avgTread: { $avg: '$treadDepth.current' } } },
      { $sort: { count: -1 } },
    ]);

    return { summary: stats[0] || {}, byBrand };
  }
}

module.exports = FleetTireService;
