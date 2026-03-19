/**
 * Traffic Fine & Toll Controller - التحكم في المخالفات المرورية والرسوم
 */

const TrafficFineService = require('../services/trafficFineService');
const logger = require('../utils/logger');

class TrafficFineController {
  // ─── Traffic Fines ────────────────────────────────────────────────

  /** إنشاء مخالفة */
  static async createFine(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const fine = await TrafficFineService.createFine(data);
      res.status(201).json({ success: true, message: 'تم تسجيل المخالفة', data: fine });
    } catch (error) {
      logger.error('خطأ في تسجيل المخالفة:', error);
      res.status(400).json({ success: false, message: 'فشل تسجيل المخالفة', error: error.message });
    }
  }

  /** جلب جميع المخالفات */
  static async getAllFines(req, res) {
    try {
      const {
        vehicle,
        driver,
        status,
        type,
        source,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (source) filter.source = source;
      if (dateFrom) filter.dateFrom = dateFrom;
      if (dateTo) filter.dateTo = dateTo;
      const result = await TrafficFineService.getAllFines(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المخالفات', error: error.message });
    }
  }

  /** جلب مخالفة */
  static async getFineById(req, res) {
    try {
      const fine = await TrafficFineService.getFineById(req.params.id);
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, data: fine });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المخالفة', error: error.message });
    }
  }

  /** تحديث مخالفة */
  static async updateFine(req, res) {
    try {
      const fine = await TrafficFineService.updateFine(req.params.id, req.body);
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث المخالفة', data: fine });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث المخالفة', error: error.message });
    }
  }

  /** دفع مخالفة */
  static async payFine(req, res) {
    try {
      const fine = await TrafficFineService.payFine(req.params.id, req.body);
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم دفع المخالفة', data: fine });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل دفع المخالفة', error: error.message });
    }
  }

  /** الاعتراض على مخالفة */
  static async disputeFine(req, res) {
    try {
      const fine = await TrafficFineService.disputeFine(req.params.id, {
        ...req.body,
        filedBy: req.user?._id,
      });
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم تقديم الاعتراض', data: fine });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تقديم الاعتراض', error: error.message });
    }
  }

  /** حل اعتراض */
  static async resolveDispute(req, res) {
    try {
      const fine = await TrafficFineService.resolveDispute(
        req.params.id,
        req.body.outcome,
        req.body.resolvedAmount
      );
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم حل الاعتراض', data: fine });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل حل الاعتراض', error: error.message });
    }
  }

  /** تعيين مخالفة لسائق */
  static async assignToDriver(req, res) {
    try {
      const fine = await TrafficFineService.assignToDriver(req.params.id, req.body);
      if (!fine) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم تعيين المخالفة', data: fine });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التعيين', error: error.message });
    }
  }

  /** مخالفات السائق */
  static async getDriverFines(req, res) {
    try {
      const fines = await TrafficFineService.getDriverFines(req.params.driverId);
      res.json({ success: true, data: fines });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب مخالفات السائق', error: error.message });
    }
  }

  /** مخالفات المركبة */
  static async getVehicleFines(req, res) {
    try {
      const fines = await TrafficFineService.getVehicleFines(req.params.vehicleId);
      res.json({ success: true, data: fines });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب مخالفات المركبة', error: error.message });
    }
  }

  /** مخالفات متأخرة */
  static async getOverdue(req, res) {
    try {
      const fines = await TrafficFineService.getOverdueFines(req.user?.organization);
      res.json({ success: true, data: fines });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب المخالفات المتأخرة', error: error.message });
    }
  }

  /** إحصائيات المخالفات */
  static async getFineStatistics(req, res) {
    try {
      const stats = await TrafficFineService.getFineStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }

  // ─── Toll Transactions ────────────────────────────────────────────

  /** إنشاء معاملة عبور */
  static async createToll(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization };
      const toll = await TrafficFineService.createToll(data);
      res.status(201).json({ success: true, message: 'تم تسجيل معاملة العبور', data: toll });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل المعاملة', error: error.message });
    }
  }

  /** جلب جميع معاملات العبور */
  static async getAllTolls(req, res) {
    try {
      const { vehicle, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (status) filter.status = status;
      if (dateFrom) filter.dateFrom = dateFrom;
      if (dateTo) filter.dateTo = dateTo;
      const result = await TrafficFineService.getAllTolls(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المعاملات', error: error.message });
    }
  }

  /** إحصائيات العبور */
  static async getTollStatistics(req, res) {
    try {
      const stats = await TrafficFineService.getTollStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }

  /** معاملات عبور المركبة */
  static async getVehicleTolls(req, res) {
    try {
      const tolls = await TrafficFineService.getVehicleTolls(req.params.vehicleId);
      res.json({ success: true, data: tolls });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المعاملات', error: error.message });
    }
  }
}

module.exports = TrafficFineController;
