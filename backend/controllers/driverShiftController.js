/**
 * Driver Shift & Scheduling Controller - التحكم في مناوبات السائقين
 */

const DriverShiftService = require('../services/driverShiftService');
const logger = require('../utils/logger');

class DriverShiftController {
  /** إنشاء مناوبة */
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const shift = await DriverShiftService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء المناوبة', data: shift });
    } catch (error) {
      logger.error('خطأ في إنشاء المناوبة:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء المناوبة', error: error.message });
    }
  }

  /** جلب جميع المناوبات */
  static async getAll(req, res) {
    try {
      const {
        driver,
        vehicle,
        status,
        type,
        date,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;
      const filter = { organization: req.user?.organization };
      if (driver) filter.driver = driver;
      if (vehicle) filter.vehicle = vehicle;
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (date) filter.date = date;
      if (dateFrom) filter.dateFrom = dateFrom;
      if (dateTo) filter.dateTo = dateTo;
      const result = await DriverShiftService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المناوبات', error: error.message });
    }
  }

  /** جلب مناوبة */
  static async getById(req, res) {
    try {
      const shift = await DriverShiftService.getById(req.params.id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, data: shift });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المناوبة', error: error.message });
    }
  }

  /** تحديث مناوبة */
  static async update(req, res) {
    try {
      const shift = await DriverShiftService.update(req.params.id, req.body);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث المناوبة', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث المناوبة', error: error.message });
    }
  }

  /** تسجيل حضور */
  static async clockIn(req, res) {
    try {
      const shift = await DriverShiftService.clockIn(req.params.id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تسجيل الحضور', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الحضور', error: error.message });
    }
  }

  /** تسجيل انصراف */
  static async clockOut(req, res) {
    try {
      const shift = await DriverShiftService.clockOut(req.params.id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تسجيل الانصراف', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تسجيل الانصراف', error: error.message });
    }
  }

  /** تأكيد مناوبة */
  static async confirm(req, res) {
    try {
      const shift = await DriverShiftService.confirmShift(req.params.id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تأكيد المناوبة', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تأكيد المناوبة', error: error.message });
    }
  }

  /** إلغاء مناوبة */
  static async cancel(req, res) {
    try {
      const shift = await DriverShiftService.cancelShift(req.params.id, req.body.reason);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم إلغاء المناوبة', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إلغاء المناوبة', error: error.message });
    }
  }

  /** تسجيل عدم حضور */
  static async markNoShow(req, res) {
    try {
      const shift = await DriverShiftService.markNoShow(req.params.id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تسجيل عدم الحضور', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التسجيل', error: error.message });
    }
  }

  /** طلب تبديل */
  static async requestSwap(req, res) {
    try {
      const shift = await DriverShiftService.requestSwap(
        req.params.id,
        req.user?._id,
        req.body.reason
      );
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تم تقديم طلب التبديل', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل طلب التبديل', error: error.message });
    }
  }

  /** الموافقة على تبديل */
  static async approveSwap(req, res) {
    try {
      const shift = await DriverShiftService.approveSwap(req.params.id, req.user?._id);
      if (!shift) return res.status(404).json({ success: false, message: 'المناوبة غير موجودة' });
      res.json({ success: true, message: 'تمت الموافقة على التبديل', data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الموافقة', error: error.message });
    }
  }

  /** جدول السائق */
  static async getDriverSchedule(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      const shifts = await DriverShiftService.getDriverSchedule(
        req.params.driverId,
        dateFrom,
        dateTo
      );
      res.json({ success: true, data: shifts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الجدول', error: error.message });
    }
  }

  /** جدول اليومي */
  static async getDailyRoster(req, res) {
    try {
      const { date } = req.query;
      const roster = await DriverShiftService.getDailyRoster(
        req.user?.organization,
        date || new Date().toISOString().split('T')[0]
      );
      res.json({ success: true, data: roster });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب الجدول اليومي', error: error.message });
    }
  }

  /** فحص امتثال HOS */
  static async checkHOS(req, res) {
    try {
      const result = await DriverShiftService.checkHOSCompliance(req.params.driverId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل فحص الامتثال', error: error.message });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      const stats = await DriverShiftService.getStatistics(
        req.user?.organization,
        dateFrom,
        dateTo
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }

  // ─── Templates ────────────────────────────────────────────────────

  /** إنشاء قالب مناوبة */
  static async createTemplate(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization };
      const template = await DriverShiftService.createTemplate(data);
      res.status(201).json({ success: true, message: 'تم إنشاء القالب', data: template });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إنشاء القالب', error: error.message });
    }
  }

  /** جلب القوالب */
  static async getTemplates(req, res) {
    try {
      const templates = await DriverShiftService.getTemplates(req.user?.organization);
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القوالب', error: error.message });
    }
  }

  /** توليد مناوبات من قالب */
  static async generateFromTemplate(req, res) {
    try {
      const { templateId, driverId, startDate, weeks } = req.body;
      const shifts = await DriverShiftService.generateFromTemplate(
        templateId,
        req.user?.organization,
        driverId,
        startDate,
        weeks
      );
      if (!shifts) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res
        .status(201)
        .json({ success: true, message: `تم إنشاء ${shifts.length} مناوبة`, data: shifts });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التوليد', error: error.message });
    }
  }
}

module.exports = DriverShiftController;
