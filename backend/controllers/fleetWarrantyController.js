/**
 * Fleet Warranty Controller - تحكم ضمانات الأسطول
 */

const fleetWarrantyService = require('../services/fleetWarrantyService');
const logger = require('../utils/logger');

class FleetWarrantyController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetWarrantyService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الضمان بنجاح', data: record });
    } catch (error) {
      logger.error('FleetWarranty create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إنشاء الضمان', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetWarrantyService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب الضمانات', ...result });
    } catch (error) {
      logger.error('FleetWarranty getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الضمانات', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetWarrantyService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'الضمان غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetWarranty getById error:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب الضمان', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetWarrantyService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'الضمان غير موجود' });
      res.json({ success: true, message: 'تم تحديث الضمان', data: record });
    } catch (error) {
      logger.error('FleetWarranty update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث الضمان', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetWarrantyService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'الضمان غير موجود' });
      res.json({ success: true, message: 'تم حذف الضمان' });
    } catch (error) {
      logger.error('FleetWarranty delete error:', error);
      res.status(500).json({ success: false, message: 'خطأ في حذف الضمان', error: error.message });
    }
  }

  static async getExpiring(req, res) {
    try {
      const result = await fleetWarrantyService.getExpiring({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'الضمانات القريبة من الانتهاء', ...result });
    } catch (error) {
      logger.error('FleetWarranty getExpiring error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الضمانات', error: error.message });
    }
  }

  static async getExpired(req, res) {
    try {
      const result = await fleetWarrantyService.getExpired({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'الضمانات المنتهية', ...result });
    } catch (error) {
      logger.error('FleetWarranty getExpired error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الضمانات المنتهية', error: error.message });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const data = await fleetWarrantyService.getByVehicle(req.params.vehicleId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('FleetWarranty getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب ضمانات المركبة', error: error.message });
    }
  }

  static async addClaim(req, res) {
    try {
      const record = await fleetWarrantyService.addClaim(req.params.id, req.body);
      res.json({ success: true, message: 'تم إضافة المطالبة بنجاح', data: record });
    } catch (error) {
      logger.error('FleetWarranty addClaim error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إضافة المطالبة', error: error.message });
    }
  }

  static async updateClaim(req, res) {
    try {
      const record = await fleetWarrantyService.updateClaim(
        req.params.id,
        req.params.claimNumber,
        req.body
      );
      res.json({ success: true, message: 'تم تحديث المطالبة', data: record });
    } catch (error) {
      logger.error('FleetWarranty updateClaim error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث المطالبة', error: error.message });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetWarrantyService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات الضمانات', data: stats });
    } catch (error) {
      logger.error('FleetWarranty statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetWarrantyController;
