/**
 * Vehicle Assignment Controller - التحكم في تعيينات المركبات
 */

const VehicleAssignmentService = require('../services/vehicleAssignmentService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class VehicleAssignmentController {
  /** إنشاء تعيين جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const assignment = await VehicleAssignmentService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء التعيين بنجاح', data: assignment });
    } catch (error) {
      logger.error('خطأ في إنشاء التعيين:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء التعيين', error: safeError(error) });
    }
  }

  /** جلب جميع التعيينات */
  static async getAll(req, res) {
    try {
      const { vehicle, driver, status, type, department, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (department) filter.department = department;
      const result = await VehicleAssignmentService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التعيينات', error: safeError(error) });
    }
  }

  /** جلب تعيين بالمعرف */
  static async getById(req, res) {
    try {
      const assignment = await VehicleAssignmentService.getById(req.params.id);
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, data: assignment });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التعيين', error: safeError(error) });
    }
  }

  /** تحديث تعيين */
  static async update(req, res) {
    try {
      const assignment = await VehicleAssignmentService.update(req.params.id, req.body);
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, message: 'تم تحديث التعيين', data: assignment });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث التعيين', error: safeError(error) });
    }
  }

  /** حذف تعيين */
  static async delete(req, res) {
    try {
      const assignment = await VehicleAssignmentService.delete(req.params.id);
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, message: 'تم حذف التعيين' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف التعيين', error: safeError(error) });
    }
  }

  /** تسجيل التسليم */
  static async recordHandover(req, res) {
    try {
      const assignment = await VehicleAssignmentService.recordHandover(req.params.id, req.body);
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, message: 'تم تسجيل التسليم', data: assignment });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل التسليم', error: safeError(error) });
    }
  }

  /** تسجيل الإرجاع */
  static async recordReturn(req, res) {
    try {
      const assignment = await VehicleAssignmentService.recordReturn(req.params.id, req.body);
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, message: 'تم تسجيل الإرجاع', data: assignment });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الإرجاع', error: safeError(error) });
    }
  }

  /** نقل المركبة لسائق آخر */
  static async transfer(req, res) {
    try {
      const { newDriverId, ...transferData } = req.body;
      const assignment = await VehicleAssignmentService.transfer(req.params.id, newDriverId, {
        ...transferData,
        createdBy: req.user?._id,
      });
      if (!assignment)
        return res.status(404).json({ success: false, message: 'التعيين غير موجود' });
      res.json({ success: true, message: 'تم نقل المركبة', data: assignment });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل نقل المركبة', error: safeError(error) });
    }
  }

  /** التعيين النشط للمركبة */
  static async getActiveByVehicle(req, res) {
    try {
      const assignment = await VehicleAssignmentService.getActiveByVehicle(req.params.vehicleId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التعيين', error: safeError(error) });
    }
  }

  /** التعيين النشط للسائق */
  static async getActiveByDriver(req, res) {
    try {
      const assignment = await VehicleAssignmentService.getActiveByDriver(req.params.driverId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التعيين', error: safeError(error) });
    }
  }

  /** سجل تعيينات المركبة */
  static async getHistory(req, res) {
    try {
      const history = await VehicleAssignmentService.getHistory(req.params.vehicleId);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السجل', error: safeError(error) });
    }
  }

  /** سجل تعيينات السائق */
  static async getDriverHistory(req, res) {
    try {
      const history = await VehicleAssignmentService.getDriverHistory(req.params.driverId);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السجل', error: safeError(error) });
    }
  }

  /** إحصائيات التعيينات */
  static async getStatistics(req, res) {
    try {
      const stats = await VehicleAssignmentService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = VehicleAssignmentController;
