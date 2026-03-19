/**
 * Driver Leave Controller - التحكم في إجازات السائقين
 */

const DriverLeaveService = require('../services/driverLeaveService');
const logger = require('../utils/logger');

class DriverLeaveController {
  /** إنشاء طلب إجازة */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const leave = await DriverLeaveService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء طلب الإجازة بنجاح', data: leave });
    } catch (error) {
      logger.error('خطأ في إنشاء الإجازة:', error);
      res.status(400).json({ success: false, message: error.message || 'فشل إنشاء الإجازة' });
    }
  }

  /** جلب جميع الإجازات */
  static async getAll(req, res) {
    try {
      const { driver, type, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (driver) filter.driver = driver;
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (dateFrom) filter.dateFrom = dateFrom;
      if (dateTo) filter.dateTo = dateTo;
      const result = await DriverLeaveService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإجازات', error: error.message });
    }
  }

  /** جلب إجازة بالمعرف */
  static async getById(req, res) {
    try {
      const leave = await DriverLeaveService.getById(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, data: leave });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإجازة', error: error.message });
    }
  }

  /** تحديث إجازة */
  static async update(req, res) {
    try {
      const leave = await DriverLeaveService.update(req.params.id, req.body);
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث الإجازة', data: leave });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الإجازة', error: error.message });
    }
  }

  /** حذف إجازة */
  static async delete(req, res) {
    try {
      const leave = await DriverLeaveService.delete(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الإجازة' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف الإجازة', error: error.message });
    }
  }

  /** الموافقة على الإجازة */
  static async approve(req, res) {
    try {
      const leave = await DriverLeaveService.approve(req.params.id, req.user?._id);
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم الموافقة على الإجازة', data: leave });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الموافقة', error: error.message });
    }
  }

  /** رفض الإجازة */
  static async reject(req, res) {
    try {
      const leave = await DriverLeaveService.reject(
        req.params.id,
        req.user?._id,
        req.body.rejectionReason
      );
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم رفض الإجازة', data: leave });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل رفض الإجازة', error: error.message });
    }
  }

  /** إلغاء الإجازة */
  static async cancel(req, res) {
    try {
      const leave = await DriverLeaveService.cancel(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم إلغاء الإجازة', data: leave });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إلغاء الإجازة', error: error.message });
    }
  }

  /** تعيين سائق بديل */
  static async assignSubstitute(req, res) {
    try {
      const { substituteDriverId, reassignmentNotes } = req.body;
      const leave = await DriverLeaveService.assignSubstitute(
        req.params.id,
        substituteDriverId,
        reassignmentNotes
      );
      if (!leave) return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
      res.json({ success: true, message: 'تم تعيين السائق البديل', data: leave });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تعيين البديل', error: error.message });
    }
  }

  /** الإجازات النشطة */
  static async getActiveLeaves(req, res) {
    try {
      const leaves = await DriverLeaveService.getActiveLeaves(req.user?.organization);
      res.json({ success: true, data: leaves });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإجازات', error: error.message });
    }
  }

  /** الإجازات القادمة */
  static async getUpcoming(req, res) {
    try {
      const days = parseInt(req.query.days) || 14;
      const leaves = await DriverLeaveService.getUpcomingLeaves(req.user?.organization, days);
      res.json({ success: true, data: leaves });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإجازات', error: error.message });
    }
  }

  /** طلبات الموافقة المعلقة */
  static async getPendingApprovals(req, res) {
    try {
      const leaves = await DriverLeaveService.getPendingApprovals(req.user?.organization);
      res.json({ success: true, data: leaves });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الطلبات', error: error.message });
    }
  }

  /** رصيد إجازات السائق */
  static async getDriverBalance(req, res) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const balance = await DriverLeaveService.getDriverBalance(req.params.driverId, year);
      res.json({ success: true, data: balance });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الرصيد', error: error.message });
    }
  }

  /** إحصائيات الإجازات */
  static async getStatistics(req, res) {
    try {
      const stats = await DriverLeaveService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = DriverLeaveController;
