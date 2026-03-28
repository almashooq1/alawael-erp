/**
 * Fleet Penalty Controller - تحكم المخالفات والغرامات
 */

const fleetPenaltyService = require('../services/fleetPenaltyService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetPenaltyController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetPenaltyService.create(data);
      res.status(201).json({ success: true, message: 'تم تسجيل المخالفة بنجاح', data: record });
    } catch (error) {
      logger.error('FleetPenalty create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تسجيل المخالفة', error: safeError(error) });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetPenaltyService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب المخالفات', ...result });
    } catch (error) {
      logger.error('FleetPenalty getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب المخالفات', error: safeError(error) });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetPenaltyService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetPenalty getById error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب المخالفة', error: safeError(error) });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetPenaltyService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث المخالفة', data: record });
    } catch (error) {
      logger.error('FleetPenalty update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث المخالفة', error: safeError(error) });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetPenaltyService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم حذف المخالفة' });
    } catch (error) {
      logger.error('FleetPenalty delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حذف المخالفة', error: safeError(error) });
    }
  }

  static async pay(req, res) {
    try {
      const record = await fleetPenaltyService.pay(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم دفع المخالفة بنجاح', data: record });
    } catch (error) {
      logger.error('FleetPenalty pay error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في دفع المخالفة', error: safeError(error) });
    }
  }

  static async fileAppeal(req, res) {
    try {
      const record = await fleetPenaltyService.fileAppeal(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم تقديم الاعتراض بنجاح', data: record });
    } catch (error) {
      logger.error('FleetPenalty fileAppeal error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تقديم الاعتراض', error: safeError(error) });
    }
  }

  static async resolveAppeal(req, res) {
    try {
      const record = await fleetPenaltyService.resolveAppeal(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'المخالفة غير موجودة' });
      res.json({ success: true, message: 'تم حل الاعتراض', data: record });
    } catch (error) {
      logger.error('FleetPenalty resolveAppeal error:', error);
      res.status(500).json({ success: false, message: 'خطأ في حل الاعتراض', error: safeError(error) });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const result = await fleetPenaltyService.getByVehicle(req.params.vehicleId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetPenalty getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب مخالفات المركبة', error: safeError(error) });
    }
  }

  static async getByDriver(req, res) {
    try {
      const result = await fleetPenaltyService.getByDriver(req.params.driverId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetPenalty getByDriver error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب مخالفات السائق', error: safeError(error) });
    }
  }

  static async getDriverDemeritPoints(req, res) {
    try {
      const result = await fleetPenaltyService.getDriverDemeritPoints(req.params.driverId);
      res.json({ success: true, message: 'نقاط المخالفات للسائق', data: result });
    } catch (error) {
      logger.error('FleetPenalty demeritPoints error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب نقاط المخالفات', error: safeError(error) });
    }
  }

  static async getUnpaid(req, res) {
    try {
      const result = await fleetPenaltyService.getUnpaid({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'المخالفات غير المدفوعة', ...result });
    } catch (error) {
      logger.error('FleetPenalty getUnpaid error:', error);
      res
        .status(500)
        .json({
          success: false,
          message: 'خطأ في جلب المخالفات غير المدفوعة',
          error: safeError(error),
        });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetPenaltyService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات المخالفات', data: stats });
    } catch (error) {
      logger.error('FleetPenalty statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetPenaltyController;
