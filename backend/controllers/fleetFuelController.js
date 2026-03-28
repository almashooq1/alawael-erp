/**
 * Fleet Fuel Controller - تحكم إدارة الوقود
 */

const fleetFuelService = require('../services/fleetFuelService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetFuelController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetFuelService.create(data);
      res
        .status(201)
        .json({ success: true, message: 'تم تسجيل معاملة الوقود بنجاح', data: record });
    } catch (error) {
      logger.error('FleetFuel create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تسجيل معاملة الوقود', error: safeError(error) });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetFuelService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب سجلات الوقود', ...result });
    } catch (error) {
      logger.error('FleetFuel getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجلات الوقود', error: safeError(error) });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetFuelService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الوقود غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetFuel getById error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجل الوقود', error: safeError(error) });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetFuelService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'سجل الوقود غير موجود' });
      res.json({ success: true, message: 'تم تحديث سجل الوقود', data: record });
    } catch (error) {
      logger.error('FleetFuel update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث سجل الوقود', error: safeError(error) });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetFuelService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الوقود غير موجود' });
      res.json({ success: true, message: 'تم حذف سجل الوقود' });
    } catch (error) {
      logger.error('FleetFuel delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حذف سجل الوقود', error: safeError(error) });
    }
  }

  static async verify(req, res) {
    try {
      const record = await fleetFuelService.verify(req.params.id, req.user?._id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الوقود غير موجود' });
      res.json({ success: true, message: 'تم التحقق من سجل الوقود', data: record });
    } catch (error) {
      logger.error('FleetFuel verify error:', error);
      res.status(500).json({ success: false, message: 'خطأ في التحقق', error: safeError(error) });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const result = await fleetFuelService.getByVehicle(req.params.vehicleId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetFuel getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجلات وقود المركبة', error: safeError(error) });
    }
  }

  static async getByDriver(req, res) {
    try {
      const result = await fleetFuelService.getByDriver(req.params.driverId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetFuel getByDriver error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجلات وقود السائق', error: safeError(error) });
    }
  }

  static async getAnomalies(req, res) {
    try {
      const result = await fleetFuelService.getAnomalies({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'حالات الشذوذ في استهلاك الوقود', ...result });
    } catch (error) {
      logger.error('FleetFuel getAnomalies error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب حالات الشذوذ', error: safeError(error) });
    }
  }

  static async getEfficiencyReport(req, res) {
    try {
      const result = await fleetFuelService.getEfficiencyReport(req.params.vehicleId);
      res.json({ success: true, message: 'تقرير كفاءة الوقود', data: result });
    } catch (error) {
      logger.error('FleetFuel efficiency error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تقرير الكفاءة', error: safeError(error) });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetFuelService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات الوقود', data: stats });
    } catch (error) {
      logger.error('FleetFuel statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetFuelController;
