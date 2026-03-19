/**
 * Fleet Parking Controller - التحكم في مواقف الأسطول
 */

const FleetParkingService = require('../services/fleetParkingService');
const logger = require('../utils/logger');

class FleetParkingController {
  /** إنشاء سجل جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const record = await FleetParkingService.create(data);
      res.status(201).json({ success: true, message: 'تم الإنشاء بنجاح', data: record });
    } catch (error) {
      logger.error('خطأ في إنشاء سجل الموقف:', error);
      res.status(400).json({ success: false, message: 'فشل الإنشاء', error: error.message });
    }
  }

  /** جلب جميع السجلات */
  static async getAll(req, res) {
    try {
      const { type, status, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (type) filter.type = type;
      if (status) filter.status = status;
      const result = await FleetParkingService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السجلات', error: error.message });
    }
  }

  /** جلب سجل بالمعرف */
  static async getById(req, res) {
    try {
      const record = await FleetParkingService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السجل', error: error.message });
    }
  }

  /** تحديث سجل */
  static async update(req, res) {
    try {
      const record = await FleetParkingService.update(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم التحديث', data: record });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** حذف سجل */
  static async delete(req, res) {
    try {
      const record = await FleetParkingService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل الحذف', error: error.message });
    }
  }

  /** جلب المناطق */
  static async getZones(req, res) {
    try {
      const zones = await FleetParkingService.getZones(req.user?.organization);
      res.json({ success: true, data: zones });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المناطق', error: error.message });
    }
  }

  /** إشغال المنطقة */
  static async getZoneOccupancy(req, res) {
    try {
      const occupancy = await FleetParkingService.getZoneOccupancy(req.params.zoneId);
      if (!occupancy)
        return res.status(404).json({ success: false, message: 'المنطقة غير موجودة' });
      res.json({ success: true, data: occupancy });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإشغال', error: error.message });
    }
  }

  /** تسجيل دخول */
  static async logEntry(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const record = await FleetParkingService.logEntry(data);
      res.status(201).json({ success: true, message: 'تم تسجيل الدخول', data: record });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الدخول', error: error.message });
    }
  }

  /** تسجيل خروج */
  static async logExit(req, res) {
    try {
      const record = await FleetParkingService.logExit(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم تسجيل الخروج', data: record });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الخروج', error: error.message });
    }
  }

  /** إنشاء مخالفة */
  static async createViolation(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const record = await FleetParkingService.createViolation(data);
      res.status(201).json({ success: true, message: 'تم تسجيل المخالفة', data: record });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل المخالفة', error: error.message });
    }
  }

  /** دفع مخالفة */
  static async payViolation(req, res) {
    try {
      const record = await FleetParkingService.payViolation(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم دفع المخالفة', data: record });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الدفع', error: error.message });
    }
  }

  /** مخالفات المركبة */
  static async getVehicleViolations(req, res) {
    try {
      const violations = await FleetParkingService.getVehicleViolations(req.params.vehicleId);
      res.json({ success: true, data: violations });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المخالفات', error: error.message });
    }
  }

  /** إحصائيات المواقف */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetParkingService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetParkingController;
