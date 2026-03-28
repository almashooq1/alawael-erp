/**
 * Fleet KPI & Analytics Controller - التحكم في مؤشرات أداء الأسطول
 */

const FleetKPIService = require('../services/fleetKPIService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetKPIController {
  /** إنشاء تقرير KPI يدوي */
  static async create(req, res) {
    try {
      const data = {
        ...req.body,
        organization: req.user?.organization,
        generatedBy: req.user?._id,
      };
      const report = await FleetKPIService.createReport(data);
      res.status(201).json({ success: true, message: 'تم إنشاء تقرير الأداء', data: report });
    } catch (error) {
      logger.error('خطأ في إنشاء تقرير الأداء:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء التقرير', error: safeError(error) });
    }
  }

  /** جلب جميع التقارير */
  static async getAll(req, res) {
    try {
      const { periodType, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (periodType) filter.periodType = periodType;
      const result = await FleetKPIService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التقارير', error: safeError(error) });
    }
  }

  /** جلب تقرير بالمعرف */
  static async getById(req, res) {
    try {
      const report = await FleetKPIService.getById(req.params.id);
      if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التقرير', error: safeError(error) });
    }
  }

  /** جلب أحدث تقرير */
  static async getLatest(req, res) {
    try {
      const { periodType = 'monthly' } = req.query;
      const report = await FleetKPIService.getLatest(req.user?.organization, periodType);
      if (!report) return res.status(404).json({ success: false, message: 'لا يوجد تقرير' });
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التقرير', error: safeError(error) });
    }
  }

  /** توليد تقرير KPI تلقائي */
  static async generate(req, res) {
    try {
      const { periodType, startDate, endDate } = req.body;
      if (!periodType || !startDate || !endDate) {
        return res
          .status(400)
          .json({ success: false, message: 'يرجى تحديد الفترة وتواريخ البداية والنهاية' });
      }
      const report = await FleetKPIService.generateKPI(
        req.user?.organization,
        periodType,
        startDate,
        endDate
      );
      res.status(201).json({ success: true, message: 'تم توليد تقرير الأداء', data: report });
    } catch (error) {
      logger.error('خطأ في توليد تقرير الأداء:', error);
      res.status(400).json({ success: false, message: 'فشل توليد التقرير', error: safeError(error) });
    }
  }

  /** مقارنة فترتين */
  static async compare(req, res) {
    try {
      const { periodType, period1Start, period2Start } = req.query;
      const result = await FleetKPIService.comparePeriods(
        req.user?.organization,
        periodType,
        period1Start,
        period2Start
      );
      if (!result)
        return res.status(404).json({ success: false, message: 'لا توجد بيانات للمقارنة' });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل المقارنة', error: safeError(error) });
    }
  }

  /** اتجاه الأداء */
  static async getTrend(req, res) {
    try {
      const { periodType = 'monthly', months = 12 } = req.query;
      const trend = await FleetKPIService.getTrend(
        req.user?.organization,
        periodType,
        parseInt(months)
      );
      res.json({ success: true, data: trend });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الاتجاه', error: safeError(error) });
    }
  }

  /** ملخص لوحة القيادة */
  static async getDashboard(req, res) {
    try {
      const dashboard = await FleetKPIService.getDashboardSummary(req.user?.organization);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب ملخص لوحة القيادة', error: safeError(error) });
    }
  }
}

module.exports = FleetKPIController;
