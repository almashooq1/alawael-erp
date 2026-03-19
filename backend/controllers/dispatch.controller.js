/**
 * Dispatch Controller - التحكم بالتوزيع والشحن
 */

const DispatchService = require('../services/dispatchService');
const logger = require('../utils/logger');

class DispatchController {
  /** إنشاء أمر توزيع */
  static async createOrder(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const order = await DispatchService.createOrder(data);
      res.status(201).json({ success: true, message: 'تم إنشاء أمر التوزيع', data: order });
    } catch (error) {
      logger.error('Dispatch create error:', error.message);
      res.status(400).json({ success: false, message: 'فشل إنشاء الأمر', error: error.message });
    }
  }

  /** جلب جميع الأوامر */
  static async getAll(req, res) {
    try {
      const {
        status,
        type,
        priority,
        vehicle,
        driver,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;
      const result = await DispatchService.getAll(
        { status, type, priority, vehicle, driver, dateFrom, dateTo },
        page,
        limit
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الأوامر', error: error.message });
    }
  }

  /** جلب أمر بالـ ID */
  static async getById(req, res) {
    try {
      const order = await DispatchService.getById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تحديث أمر */
  static async update(req, res) {
    try {
      const order = await DispatchService.update(req.params.id, req.body, req.user?._id);
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'تم التحديث', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** تعيين مركبة وسائق */
  static async assign(req, res) {
    try {
      const { vehicleId, driverId } = req.body;
      const order = await DispatchService.assignVehicleAndDriver(
        req.params.id,
        vehicleId,
        driverId,
        req.user?._id
      );
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'تم التعيين', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التعيين', error: error.message });
    }
  }

  /** بدء التوزيع */
  static async startDispatch(req, res) {
    try {
      const order = await DispatchService.startDispatch(req.params.id, req.user?._id);
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'بدأت الرحلة', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /** تحديث حالة نقطة توقف */
  static async updateStop(req, res) {
    try {
      const { stopIndex, status, signature, proofOfDelivery, notes, failureReason } = req.body;
      const order = await DispatchService.updateStopStatus(
        req.params.id,
        stopIndex,
        status,
        { signature, proofOfDelivery, notes, failureReason },
        req.user?._id
      );
      if (!order)
        return res.status(404).json({ success: false, message: 'الأمر أو النقطة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث النقطة', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** إلغاء أمر */
  static async cancel(req, res) {
    try {
      const { reason } = req.body;
      const order = await DispatchService.cancelOrder(req.params.id, reason, req.user?._id);
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'تم إلغاء الأمر', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإلغاء', error: error.message });
    }
  }

  /** تقييم */
  static async rate(req, res) {
    try {
      const { score, comment } = req.body;
      const order = await DispatchService.rateOrder(
        req.params.id,
        score,
        comment,
        req.user?.name || 'unknown'
      );
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'تم التقييم', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التقييم', error: error.message });
    }
  }

  /** الأوامر النشطة */
  static async getActive(req, res) {
    try {
      const orders = await DispatchService.getActiveOrders(req.query.organization);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** أوامر السائق */
  static async getDriverOrders(req, res) {
    try {
      const orders = await DispatchService.getDriverOrders(req.params.driverId, req.query.status);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تحسين المسار */
  static async optimizeRoute(req, res) {
    try {
      const order = await DispatchService.optimizeRoute(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
      res.json({ success: true, message: 'تم تحسين المسار', data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحسين', error: error.message });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const stats = await DispatchService.getStatistics(req.query);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: error.message });
    }
  }
}

module.exports = DispatchController;
