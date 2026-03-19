/**
 * Fleet Route Plan Controller - تحكم تخطيط المسارات
 */

const fleetRoutePlanService = require('../services/fleetRoutePlanService');
const logger = require('../utils/logger');

class FleetRoutePlanController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetRoutePlanService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء خطة المسار بنجاح', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إنشاء خطة المسار', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetRoutePlanService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب خطط المسارات', ...result });
    } catch (error) {
      logger.error('FleetRoutePlan getAll error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب خطط المسارات', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetRoutePlanService.getById(req.params.id);
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetRoutePlan getById error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب خطة المسار', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetRoutePlanService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, message: 'تم تحديث خطة المسار', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث خطة المسار', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetRoutePlanService.delete(req.params.id);
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, message: 'تم حذف خطة المسار' });
    } catch (error) {
      logger.error('FleetRoutePlan delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حذف خطة المسار', error: error.message });
    }
  }

  static async approve(req, res) {
    try {
      const record = await fleetRoutePlanService.approve(req.params.id, req.user?._id);
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, message: 'تمت الموافقة على خطة المسار', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan approve error:', error);
      res.status(500).json({ success: false, message: 'خطأ في الموافقة', error: error.message });
    }
  }

  static async start(req, res) {
    try {
      const record = await fleetRoutePlanService.start(req.params.id);
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, message: 'تم بدء المسار', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan start error:', error);
      res.status(500).json({ success: false, message: 'خطأ في بدء المسار', error: error.message });
    }
  }

  static async complete(req, res) {
    try {
      const record = await fleetRoutePlanService.complete(req.params.id, req.body);
      if (!record)
        return res.status(404).json({ success: false, message: 'خطة المسار غير موجودة' });
      res.json({ success: true, message: 'تم إكمال المسار', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan complete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إكمال المسار', error: error.message });
    }
  }

  static async completeWaypoint(req, res) {
    try {
      const record = await fleetRoutePlanService.completeWaypoint(
        req.params.id,
        req.params.order,
        req.body
      );
      res.json({ success: true, message: 'تم تسجيل نقطة التوقف', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan completeWaypoint error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تسجيل نقطة التوقف', error: error.message });
    }
  }

  static async skipWaypoint(req, res) {
    try {
      const record = await fleetRoutePlanService.skipWaypoint(
        req.params.id,
        req.params.order,
        req.body.reason
      );
      res.json({ success: true, message: 'تم تخطي نقطة التوقف', data: record });
    } catch (error) {
      logger.error('FleetRoutePlan skipWaypoint error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تخطي نقطة التوقف', error: error.message });
    }
  }

  static async getActive(req, res) {
    try {
      const result = await fleetRoutePlanService.getActive({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'المسارات النشطة', ...result });
    } catch (error) {
      logger.error('FleetRoutePlan getActive error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب المسارات النشطة', error: error.message });
    }
  }

  static async getUpcoming(req, res) {
    try {
      const result = await fleetRoutePlanService.getUpcoming({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'المسارات القادمة', ...result });
    } catch (error) {
      logger.error('FleetRoutePlan getUpcoming error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب المسارات القادمة', error: error.message });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetRoutePlanService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات المسارات', data: stats });
    } catch (error) {
      logger.error('FleetRoutePlan statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetRoutePlanController;
