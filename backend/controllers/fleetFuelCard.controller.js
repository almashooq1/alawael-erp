/**
 * Fleet Fuel Card Controller - التحكم ببطاقات الوقود
 */

const FleetFuelCardService = require('../services/fleetFuelCardService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetFuelCardController {
  /** إنشاء بطاقة */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const card = await FleetFuelCardService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء بطاقة الوقود', data: card });
    } catch (error) {
      logger.error('Fuel card create error:', error.message);
      res.status(400).json({ success: false, message: 'فشل إنشاء البطاقة', error: safeError(error) });
    }
  }

  /** جلب الكل */
  static async getAll(req, res) {
    try {
      const { status, provider, vehicle, driver, page = 1, limit = 20 } = req.query;
      const result = await FleetFuelCardService.getAll(
        { status, provider, vehicle, driver },
        page,
        limit
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل الجلب', error: safeError(error) });
    }
  }

  /** جلب بالـ ID */
  static async getById(req, res) {
    try {
      const card = await FleetFuelCardService.getById(req.params.id);
      if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, data: card });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** تحديث */
  static async update(req, res) {
    try {
      const card = await FleetFuelCardService.update(req.params.id, req.body);
      if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, message: 'تم التحديث', data: card });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: safeError(error) });
    }
  }

  /** تفعيل بطاقة */
  static async activate(req, res) {
    try {
      const card = await FleetFuelCardService.activateCard(req.params.id);
      if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, message: 'تم تفعيل البطاقة', data: card });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التفعيل', error: safeError(error) });
    }
  }

  /** تعليق بطاقة */
  static async suspend(req, res) {
    try {
      const { reason } = req.body;
      const card = await FleetFuelCardService.suspendCard(req.params.id, reason);
      if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, message: 'تم تعليق البطاقة', data: card });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التعليق', error: safeError(error) });
    }
  }

  /** تعيين بطاقة */
  static async assign(req, res) {
    try {
      const { vehicleId, driverId } = req.body;
      const card = await FleetFuelCardService.assignCard(req.params.id, vehicleId, driverId);
      if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, message: 'تم التعيين', data: card });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التعيين', error: safeError(error) });
    }
  }

  /** تسجيل معاملة وقود */
  static async recordTransaction(req, res) {
    try {
      const result = await FleetFuelCardService.recordTransaction(req.params.id, req.body);
      if (!result) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      const response = { success: true, message: 'تم تسجيل المعاملة', data: { card: result.card } };
      if (result.alerts.length > 0) response.warnings = result.alerts;
      res.json(response);
    } catch (error) {
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }

  /** جلب معاملات بطاقة */
  static async getTransactions(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await FleetFuelCardService.getCardTransactions(req.params.id, page, limit);
      if (!result) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** حل تنبيه احتيال */
  static async resolveFraudAlert(req, res) {
    try {
      const { resolution } = req.body;
      const alert = await FleetFuelCardService.resolveFraudAlert(
        req.params.id,
        req.params.alertId,
        resolution,
        req.user?._id
      );
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم حل التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل', error: safeError(error) });
    }
  }

  /** البطاقات المنتهية */
  static async getExpiring(req, res) {
    try {
      const { daysAhead = 30, organization } = req.query;
      const cards = await FleetFuelCardService.getExpiringCards(parseInt(daysAhead), organization);
      res.json({ success: true, data: cards });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** تنبيهات الاحتيال غير المحلولة */
  static async getUnresolvedAlerts(req, res) {
    try {
      const alerts = await FleetFuelCardService.getUnresolvedFraudAlerts(req.query.organization);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** تقرير الاستهلاك */
  static async getConsumptionReport(req, res) {
    try {
      const report = await FleetFuelCardService.getConsumptionReport(req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetFuelCardService.getStatistics(req.query.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetFuelCardController;
