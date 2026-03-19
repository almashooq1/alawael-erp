/**
 * Fleet Parts Controller - التحكم في قطع غيار الأسطول
 */

const FleetPartService = require('../services/fleetPartService');
const logger = require('../utils/logger');

class FleetPartController {
  /** إنشاء قطعة جديدة */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const part = await FleetPartService.create(data);
      res.status(201).json({ success: true, message: 'تم إضافة القطعة بنجاح', data: part });
    } catch (error) {
      logger.error('خطأ في إضافة القطعة:', error);
      res.status(400).json({ success: false, message: 'فشل إضافة القطعة', error: error.message });
    }
  }

  /** جلب جميع القطع */
  static async getAll(req, res) {
    try {
      const { category, status, brand, search, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (brand) filter.brand = brand;
      if (search) filter.search = search;
      const result = await FleetPartService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطع', error: error.message });
    }
  }

  /** جلب قطعة بالمعرف */
  static async getById(req, res) {
    try {
      const part = await FleetPartService.getById(req.params.id);
      if (!part) return res.status(404).json({ success: false, message: 'القطعة غير موجودة' });
      res.json({ success: true, data: part });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطعة', error: error.message });
    }
  }

  /** تحديث قطعة */
  static async update(req, res) {
    try {
      const part = await FleetPartService.update(req.params.id, req.body);
      if (!part) return res.status(404).json({ success: false, message: 'القطعة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث القطعة', data: part });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث القطعة', error: error.message });
    }
  }

  /** حذف قطعة */
  static async delete(req, res) {
    try {
      const part = await FleetPartService.delete(req.params.id);
      if (!part) return res.status(404).json({ success: false, message: 'القطعة غير موجودة' });
      res.json({ success: true, message: 'تم حذف القطعة' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف القطعة', error: error.message });
    }
  }

  /** تعديل المخزون */
  static async adjustStock(req, res) {
    try {
      const { quantity, type } = req.body;
      const part = await FleetPartService.adjustStock(req.params.id, quantity, type);
      if (!part) return res.status(404).json({ success: false, message: 'القطعة غير موجودة' });
      res.json({ success: true, message: 'تم تعديل المخزون', data: part });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'فشل تعديل المخزون' });
    }
  }

  /** القطع منخفضة المخزون */
  static async getLowStock(req, res) {
    try {
      const parts = await FleetPartService.getLowStock(req.user?.organization);
      res.json({ success: true, data: parts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطع', error: error.message });
    }
  }

  /** القطع المنتهية من المخزون */
  static async getOutOfStock(req, res) {
    try {
      const parts = await FleetPartService.getOutOfStock(req.user?.organization);
      res.json({ success: true, data: parts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطع', error: error.message });
    }
  }

  /** القطع حسب الفئة */
  static async getByCategory(req, res) {
    try {
      const parts = await FleetPartService.getByCategory(
        req.user?.organization,
        req.params.category
      );
      res.json({ success: true, data: parts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطع', error: error.message });
    }
  }

  /** القطع المتوافقة */
  static async getCompatible(req, res) {
    try {
      const { make, model, year } = req.query;
      const parts = await FleetPartService.getCompatibleParts(make, model, parseInt(year));
      res.json({ success: true, data: parts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القطع', error: error.message });
    }
  }

  /** إحصائيات المخزون */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetPartService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetPartController;
