/**
 * Fleet Cost Controller - التحكم بتكاليف الأسطول
 */

const FleetCostService = require('../services/fleetCostService');
const logger = require('../utils/logger');

class FleetCostController {
  /** إنشاء ميزانية */
  static async createBudget(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const budget = await FleetCostService.createBudget(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الميزانية', data: budget });
    } catch (error) {
      logger.error('Budget create error:', error.message);
      res
        .status(400)
        .json({ success: false, message: 'فشل إنشاء الميزانية', error: error.message });
    }
  }

  /** جلب جميع الميزانيات */
  static async getAllBudgets(req, res) {
    try {
      const { status, year, page = 1, limit = 20 } = req.query;
      const result = await FleetCostService.getAllBudgets(
        { status, year: year ? parseInt(year) : undefined },
        page,
        limit
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الميزانيات', error: error.message });
    }
  }

  /** جلب ميزانية بالـ ID */
  static async getBudgetById(req, res) {
    try {
      const budget = await FleetCostService.getBudgetById(req.params.id);
      if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
      res.json({ success: true, data: budget });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تحديث ميزانية */
  static async updateBudget(req, res) {
    try {
      const budget = await FleetCostService.updateBudget(req.params.id, req.body);
      if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
      res.json({ success: true, message: 'تم التحديث', data: budget });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** إضافة سجل تكلفة */
  static async addCostEntry(req, res) {
    try {
      const budget = await FleetCostService.addCostEntry(req.params.id, req.body);
      if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
      res.json({ success: true, message: 'تم إضافة التكلفة', data: budget });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإضافة', error: error.message });
    }
  }

  /** حذف سجل تكلفة */
  static async removeCostEntry(req, res) {
    try {
      const budget = await FleetCostService.removeCostEntry(req.params.id, req.params.entryId);
      if (!budget) return res.status(404).json({ success: false, message: 'غير موجود' });
      res.json({ success: true, message: 'تم الحذف', data: budget });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الحذف', error: error.message });
    }
  }

  /** الموافقة على ميزانية */
  static async approveBudget(req, res) {
    try {
      const budget = await FleetCostService.approveBudget(req.params.id, req.user?._id);
      if (!budget) return res.status(404).json({ success: false, message: 'الميزانية غير موجودة' });
      res.json({ success: true, message: 'تمت الموافقة', data: budget });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الموافقة', error: error.message });
    }
  }

  /** تحليل TCO */
  static async calculateTCO(req, res) {
    try {
      const { vehicleId, months = 12 } = req.query;
      if (!vehicleId) return res.status(400).json({ success: false, message: 'vehicleId مطلوب' });
      const result = await FleetCostService.calculateTCO(vehicleId, parseInt(months));
      if (!result) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** مقارنة تكاليف المركبات */
  static async compareVehicleCosts(req, res) {
    try {
      const { vehicleIds, months = 12 } = req.body;
      const result = await FleetCostService.getVehicleCostComparison(vehicleIds, parseInt(months));
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تنبيهات الميزانية */
  static async getBudgetAlerts(req, res) {
    try {
      const alerts = await FleetCostService.getBudgetAlerts(req.query.organization);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** إحصائيات عامة */
  static async getOverallStatistics(req, res) {
    try {
      const { organization, year } = req.query;
      const stats = await FleetCostService.getOverallStatistics(
        organization,
        year ? parseInt(year) : undefined
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: error.message });
    }
  }

  /** تقرير شهري */
  static async getMonthlyReport(req, res) {
    try {
      const { organization, year } = req.query;
      const report = await FleetCostService.getMonthlyCostReport(
        organization,
        year ? parseInt(year) : undefined
      );
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }
}

module.exports = FleetCostController;
