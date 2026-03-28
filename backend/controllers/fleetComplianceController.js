/**
 * Fleet Compliance Controller - التحكم في الامتثال التنظيمي
 */

const FleetComplianceService = require('../services/fleetComplianceService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetComplianceController {
  /** إنشاء عنصر امتثال */
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const item = await FleetComplianceService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء عنصر الامتثال', data: item });
    } catch (error) {
      logger.error('خطأ في إنشاء عنصر الامتثال:', error);
      res
        .status(400)
        .json({ success: false, message: 'فشل إنشاء عنصر الامتثال', error: safeError(error) });
    }
  }

  /** جلب جميع عناصر الامتثال */
  static async getAll(req, res) {
    try {
      const { vehicle, driver, category, status, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (category) filter.category = category;
      if (status) filter.status = status;
      const result = await FleetComplianceService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب عناصر الامتثال', error: safeError(error) });
    }
  }

  /** جلب عنصر */
  static async getById(req, res) {
    try {
      const item = await FleetComplianceService.getById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب العنصر', error: safeError(error) });
    }
  }

  /** تحديث عنصر */
  static async update(req, res) {
    try {
      const item = await FleetComplianceService.update(req.params.id, req.body, req.user?._id);
      if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, message: 'تم تحديث العنصر', data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث العنصر', error: safeError(error) });
    }
  }

  /** تعيين كممتثل */
  static async markCompliant(req, res) {
    try {
      const item = await FleetComplianceService.markCompliant(
        req.params.id,
        req.body,
        req.user?._id
      );
      if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, message: 'تم تعيين الامتثال', data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تعيين الامتثال', error: safeError(error) });
    }
  }

  /** تعيين كغير ممتثل */
  static async markNonCompliant(req, res) {
    try {
      const item = await FleetComplianceService.markNonCompliant(
        req.params.id,
        req.body.findings,
        req.user?._id
      );
      if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, message: 'تم تسجيل عدم الامتثال', data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التسجيل', error: safeError(error) });
    }
  }

  /** إضافة مستند */
  static async addDocument(req, res) {
    try {
      const item = await FleetComplianceService.addDocument(req.params.id, req.body);
      if (!item) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
      res.json({ success: true, message: 'تم إضافة المستند', data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إضافة المستند', error: safeError(error) });
    }
  }

  /** عناصر تنتهي قريباً */
  static async getExpiring(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const items = await FleetComplianceService.getExpiring(days, req.user?.organization);
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب العناصر', error: safeError(error) });
    }
  }

  /** عناصر غير ممتثلة */
  static async getNonCompliant(req, res) {
    try {
      const items = await FleetComplianceService.getNonCompliant(req.user?.organization);
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب العناصر', error: safeError(error) });
    }
  }

  /** امتثال المركبة */
  static async getVehicleCompliance(req, res) {
    try {
      const items = await FleetComplianceService.getVehicleCompliance(req.params.vehicleId);
      res.json({ success: true, data: items });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب بيانات الامتثال', error: safeError(error) });
    }
  }

  /** امتثال السائق */
  static async getDriverCompliance(req, res) {
    try {
      const items = await FleetComplianceService.getDriverCompliance(req.params.driverId);
      res.json({ success: true, data: items });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب بيانات الامتثال', error: safeError(error) });
    }
  }

  /** نقاط الامتثال */
  static async getScore(req, res) {
    try {
      const score = await FleetComplianceService.getComplianceScore(req.params.vehicleId);
      res.json({ success: true, data: score });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حساب النقاط', error: safeError(error) });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetComplianceService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetComplianceController;
