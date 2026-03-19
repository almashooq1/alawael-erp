/**
 * Fleet Toll Controller - تحكم رسوم المرور
 */

const fleetTollService = require('../services/fleetTollService');
const logger = require('../utils/logger');

class FleetTollController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetTollService.create(data);
      res.status(201).json({ success: true, message: 'تم تسجيل رسم المرور بنجاح', data: record });
    } catch (error) {
      logger.error('FleetToll create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تسجيل رسم المرور', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetTollService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب سجلات الرسوم', ...result });
    } catch (error) {
      logger.error('FleetToll getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجلات الرسوم', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetTollService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الرسم غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetToll getById error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجل الرسم', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetTollService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'سجل الرسم غير موجود' });
      res.json({ success: true, message: 'تم تحديث سجل الرسم', data: record });
    } catch (error) {
      logger.error('FleetToll update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث سجل الرسم', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetTollService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الرسم غير موجود' });
      res.json({ success: true, message: 'تم حذف سجل الرسم' });
    } catch (error) {
      logger.error('FleetToll delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حذف سجل الرسم', error: error.message });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const result = await fleetTollService.getByVehicle(req.params.vehicleId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('FleetToll getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب رسوم المركبة', error: error.message });
    }
  }

  static async reconcile(req, res) {
    try {
      const record = await fleetTollService.reconcile(req.params.id, req.user?._id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الرسم غير موجود' });
      res.json({ success: true, message: 'تمت المطابقة بنجاح', data: record });
    } catch (error) {
      logger.error('FleetToll reconcile error:', error);
      res.status(500).json({ success: false, message: 'خطأ في المطابقة', error: error.message });
    }
  }

  static async pay(req, res) {
    try {
      const record = await fleetTollService.pay(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'سجل الرسم غير موجود' });
      res.json({ success: true, message: 'تم دفع الرسم بنجاح', data: record });
    } catch (error) {
      logger.error('FleetToll pay error:', error);
      res.status(500).json({ success: false, message: 'خطأ في دفع الرسم', error: error.message });
    }
  }

  static async getUnpaid(req, res) {
    try {
      const result = await fleetTollService.getUnpaid({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'الرسوم غير المدفوعة', ...result });
    } catch (error) {
      logger.error('FleetToll getUnpaid error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الرسوم غير المدفوعة', error: error.message });
    }
  }

  static async getTagSummary(req, res) {
    try {
      const result = await fleetTollService.getTagSummary(req.params.tagId);
      res.json({ success: true, message: 'ملخص البطاقة', data: result });
    } catch (error) {
      logger.error('FleetToll tagSummary error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب ملخص البطاقة', error: error.message });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetTollService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات الرسوم', data: stats });
    } catch (error) {
      logger.error('FleetToll statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetTollController;
