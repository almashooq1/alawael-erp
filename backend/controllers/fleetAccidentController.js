/**
 * Fleet Accident Controller - تحكم حوادث الأسطول
 */

const fleetAccidentService = require('../services/fleetAccidentService');
const logger = require('../utils/logger');

class FleetAccidentController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetAccidentService.create(data);
      res.status(201).json({ success: true, message: 'تم تسجيل تقرير الحادث بنجاح', data: record });
    } catch (error) {
      logger.error('FleetAccident create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تسجيل الحادث', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetAccidentService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب تقارير الحوادث', ...result });
    } catch (error) {
      logger.error('FleetAccident getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب تقارير الحوادث', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetAccidentService.getById(req.params.id);
      if (!record)
        return res.status(404).json({ success: false, message: 'تقرير الحادث غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetAccident getById error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب تقرير الحادث', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetAccidentService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record)
        return res.status(404).json({ success: false, message: 'تقرير الحادث غير موجود' });
      res.json({ success: true, message: 'تم تحديث تقرير الحادث', data: record });
    } catch (error) {
      logger.error('FleetAccident update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث التقرير', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetAccidentService.delete(req.params.id);
      if (!record)
        return res.status(404).json({ success: false, message: 'تقرير الحادث غير موجود' });
      res.json({ success: true, message: 'تم حذف تقرير الحادث' });
    } catch (error) {
      logger.error('FleetAccident delete error:', error);
      res.status(500).json({ success: false, message: 'خطأ في حذف التقرير', error: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const record = await fleetAccidentService.updateStatus(
        req.params.id,
        req.body.status,
        req.user?._id
      );
      if (!record)
        return res.status(404).json({ success: false, message: 'تقرير الحادث غير موجود' });
      res.json({ success: true, message: 'تم تحديث حالة الحادث', data: record });
    } catch (error) {
      logger.error('FleetAccident updateStatus error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث الحالة', error: error.message });
    }
  }

  static async updateInsuranceClaim(req, res) {
    try {
      const record = await fleetAccidentService.updateInsuranceClaim(req.params.id, req.body);
      if (!record)
        return res.status(404).json({ success: false, message: 'تقرير الحادث غير موجود' });
      res.json({ success: true, message: 'تم تحديث مطالبة التأمين', data: record });
    } catch (error) {
      logger.error('FleetAccident insurance error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث مطالبة التأمين', error: error.message });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const result = await fleetAccidentService.getByVehicle(req.params.vehicleId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetAccident getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب حوادث المركبة', error: error.message });
    }
  }

  static async getByDriver(req, res) {
    try {
      const result = await fleetAccidentService.getByDriver(req.params.driverId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetAccident getByDriver error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب حوادث السائق', error: error.message });
    }
  }

  static async getPendingClaims(req, res) {
    try {
      const result = await fleetAccidentService.getPendingClaims({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'مطالبات التأمين المعلقة', ...result });
    } catch (error) {
      logger.error('FleetAccident pendingClaims error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب المطالبات المعلقة', error: error.message });
    }
  }

  static async addWitness(req, res) {
    try {
      const record = await fleetAccidentService.addWitness(req.params.id, req.body);
      res.json({ success: true, message: 'تم إضافة الشاهد', data: record });
    } catch (error) {
      logger.error('FleetAccident addWitness error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إضافة الشاهد', error: error.message });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetAccidentService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات الحوادث', data: stats });
    } catch (error) {
      logger.error('FleetAccident statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetAccidentController;
