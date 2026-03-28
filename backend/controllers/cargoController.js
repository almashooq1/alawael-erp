/**
 * Cargo Controller - التحكم في إدارة الشحنات
 */

const CargoService = require('../services/cargoService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class CargoController {
  /** إنشاء شحنة جديدة */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const cargo = await CargoService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الشحنة بنجاح', data: cargo });
    } catch (error) {
      logger.error('خطأ في إنشاء الشحنة:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء الشحنة', error: safeError(error) });
    }
  }

  /** جلب جميع الشحنات */
  static async getAll(req, res) {
    try {
      const { vehicle, driver, type, status, search, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (search) filter.search = search;
      const result = await CargoService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنات', error: safeError(error) });
    }
  }

  /** جلب شحنة بالمعرف */
  static async getById(req, res) {
    try {
      const cargo = await CargoService.getById(req.params.id);
      if (!cargo) return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
      res.json({ success: true, data: cargo });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنة', error: safeError(error) });
    }
  }

  /** تحديث شحنة */
  static async update(req, res) {
    try {
      const cargo = await CargoService.update(req.params.id, req.body);
      if (!cargo) return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث الشحنة', data: cargo });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الشحنة', error: safeError(error) });
    }
  }

  /** حذف شحنة */
  static async delete(req, res) {
    try {
      const cargo = await CargoService.delete(req.params.id);
      if (!cargo) return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الشحنة' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف الشحنة', error: safeError(error) });
    }
  }

  /** تحديث حالة الشحنة */
  static async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const cargo = await CargoService.updateStatus(req.params.id, status, req.body);
      if (!cargo) return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث حالة الشحنة', data: cargo });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الحالة', error: safeError(error) });
    }
  }

  /** تأكيد التسليم */
  static async confirmDelivery(req, res) {
    try {
      const cargo = await CargoService.confirmDelivery(req.params.id, req.body);
      if (!cargo) return res.status(404).json({ success: false, message: 'الشحنة غير موجودة' });
      res.json({ success: true, message: 'تم تأكيد التسليم', data: cargo });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تأكيد التسليم', error: safeError(error) });
    }
  }

  /** شحنات المركبة */
  static async getByVehicle(req, res) {
    try {
      const shipments = await CargoService.getByVehicle(req.params.vehicleId, req.query.status);
      res.json({ success: true, data: shipments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنات', error: safeError(error) });
    }
  }

  /** شحنات السائق */
  static async getByDriver(req, res) {
    try {
      const shipments = await CargoService.getByDriver(req.params.driverId);
      res.json({ success: true, data: shipments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنات', error: safeError(error) });
    }
  }

  /** الشحنات قيد النقل */
  static async getInTransit(req, res) {
    try {
      const shipments = await CargoService.getInTransit(req.user?.organization);
      res.json({ success: true, data: shipments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنات', error: safeError(error) });
    }
  }

  /** الشحنات المتأخرة */
  static async getDelayed(req, res) {
    try {
      const shipments = await CargoService.getDelayed(req.user?.organization);
      res.json({ success: true, data: shipments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشحنات', error: safeError(error) });
    }
  }

  /** إحصائيات الشحنات */
  static async getStatistics(req, res) {
    try {
      const stats = await CargoService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = CargoController;
