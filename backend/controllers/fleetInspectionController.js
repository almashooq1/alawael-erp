/**
 * Fleet Inspection Controller - التحكم في فحص المركبات
 */

const FleetInspectionService = require('../services/fleetInspectionService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetInspectionController {
  /** إنشاء فحص جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, inspector: req.user?._id, organization: req.user?.organization };
      const inspection = await FleetInspectionService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الفحص بنجاح', data: inspection });
    } catch (error) {
      logger.error('خطأ في إنشاء الفحص:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء الفحص', error: safeError(error) });
    }
  }

  /** جلب جميع الفحوصات */
  static async getAll(req, res) {
    try {
      const { vehicle, driver, type, status, overallResult, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (overallResult) filter.overallResult = overallResult;
      const result = await FleetInspectionService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الفحوصات', error: safeError(error) });
    }
  }

  /** جلب فحص بالمعرف */
  static async getById(req, res) {
    try {
      const inspection = await FleetInspectionService.getById(req.params.id);
      if (!inspection) return res.status(404).json({ success: false, message: 'الفحص غير موجود' });
      res.json({ success: true, data: inspection });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الفحص', error: safeError(error) });
    }
  }

  /** تحديث فحص */
  static async update(req, res) {
    try {
      const inspection = await FleetInspectionService.update(req.params.id, req.body);
      if (!inspection) return res.status(404).json({ success: false, message: 'الفحص غير موجود' });
      res.json({ success: true, message: 'تم تحديث الفحص', data: inspection });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الفحص', error: safeError(error) });
    }
  }

  /** بدء الفحص */
  static async startInspection(req, res) {
    try {
      const inspection = await FleetInspectionService.startInspection(req.params.id, req.user?._id);
      if (!inspection) return res.status(404).json({ success: false, message: 'الفحص غير موجود' });
      res.json({ success: true, message: 'تم بدء الفحص', data: inspection });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل بدء الفحص', error: safeError(error) });
    }
  }

  /** تحديث عنصر فحص */
  static async updateItem(req, res) {
    try {
      const inspection = await FleetInspectionService.updateItem(
        req.params.id,
        req.params.itemId,
        req.body
      );
      if (!inspection) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, message: 'تم تحديث العنصر', data: inspection });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث العنصر', error: safeError(error) });
    }
  }

  /** إكمال الفحص */
  static async completeInspection(req, res) {
    try {
      const inspection = await FleetInspectionService.completeInspection(req.params.id);
      if (!inspection) return res.status(404).json({ success: false, message: 'الفحص غير موجود' });
      res.json({ success: true, message: 'تم إكمال الفحص بنجاح', data: inspection });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إكمال الفحص', error: safeError(error) });
    }
  }

  /** حل خلل */
  static async resolveDefect(req, res) {
    try {
      const inspection = await FleetInspectionService.resolveDefect(
        req.params.id,
        req.params.defectId,
        req.body.resolution,
        req.user?._id
      );
      if (!inspection) return res.status(404).json({ success: false, message: 'غير موجود' });
      res.json({ success: true, message: 'تم حل الخلل', data: inspection });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل حل الخلل', error: safeError(error) });
    }
  }

  /** سجل فحوصات المركبة */
  static async getVehicleHistory(req, res) {
    try {
      const history = await FleetInspectionService.getVehicleHistory(
        req.params.vehicleId,
        parseInt(req.query.limit) || 20
      );
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب السجل', error: safeError(error) });
    }
  }

  /** إحصائيات الفحوصات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetInspectionService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: safeError(error) });
    }
  }

  // ─── Templates ────────────────────────────────────────────────────

  /** إنشاء قالب فحص */
  static async createTemplate(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const template = await FleetInspectionService.createTemplate(data);
      res.status(201).json({ success: true, message: 'تم إنشاء القالب', data: template });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إنشاء القالب', error: safeError(error) });
    }
  }

  /** جلب القوالب */
  static async getTemplates(req, res) {
    try {
      const templates = await FleetInspectionService.getTemplates(req.user?.organization);
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القوالب', error: safeError(error) });
    }
  }

  /** جلب قالب */
  static async getTemplateById(req, res) {
    try {
      const template = await FleetInspectionService.getTemplateById(req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب القالب', error: safeError(error) });
    }
  }

  /** تحديث قالب */
  static async updateTemplate(req, res) {
    try {
      const template = await FleetInspectionService.updateTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res.json({ success: true, message: 'تم تحديث القالب', data: template });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث القالب', error: safeError(error) });
    }
  }
}

module.exports = FleetInspectionController;
