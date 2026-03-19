/**
 * Fleet Alert Controller - التحكم في تنبيهات الأسطول
 */

const FleetAlertService = require('../services/fleetAlertService');
const logger = require('../utils/logger');

class FleetAlertController {
  /** إنشاء تنبيه جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const alert = await FleetAlertService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء التنبيه بنجاح', data: alert });
    } catch (error) {
      logger.error('خطأ في إنشاء التنبيه:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء التنبيه', error: error.message });
    }
  }

  /** جلب جميع التنبيهات */
  static async getAll(req, res) {
    try {
      const {
        vehicle,
        driver,
        category,
        severity,
        status,
        source,
        page = 1,
        limit = 20,
      } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (category) filter.category = category;
      if (severity) filter.severity = severity;
      if (status) filter.status = status;
      if (source) filter.source = source;
      const result = await FleetAlertService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيهات', error: error.message });
    }
  }

  /** جلب تنبيه بالمعرف */
  static async getById(req, res) {
    try {
      const alert = await FleetAlertService.getById(req.params.id);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, data: alert });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيه', error: error.message });
    }
  }

  /** تحديث تنبيه */
  static async update(req, res) {
    try {
      const alert = await FleetAlertService.update(req.params.id, req.body);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم تحديث التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث التنبيه', error: error.message });
    }
  }

  /** حذف تنبيه */
  static async delete(req, res) {
    try {
      const alert = await FleetAlertService.delete(req.params.id);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم حذف التنبيه' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف التنبيه', error: error.message });
    }
  }

  /** تأكيد الاستلام */
  static async acknowledge(req, res) {
    try {
      const alert = await FleetAlertService.acknowledge(req.params.id, req.user?._id);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم تأكيد استلام التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تأكيد الاستلام', error: error.message });
    }
  }

  /** حل التنبيه */
  static async resolve(req, res) {
    try {
      const alert = await FleetAlertService.resolve(
        req.params.id,
        req.user?._id,
        req.body.resolutionNotes
      );
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم حل التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل حل التنبيه', error: error.message });
    }
  }

  /** تجاهل التنبيه */
  static async dismiss(req, res) {
    try {
      const alert = await FleetAlertService.dismiss(req.params.id, req.user?._id);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم تجاهل التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تجاهل التنبيه', error: error.message });
    }
  }

  /** تصعيد التنبيه */
  static async escalate(req, res) {
    try {
      const alert = await FleetAlertService.escalate(req.params.id, req.body.escalatedTo);
      if (!alert) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
      res.json({ success: true, message: 'تم تصعيد التنبيه', data: alert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تصعيد التنبيه', error: error.message });
    }
  }

  /** التنبيهات النشطة */
  static async getActive(req, res) {
    try {
      const alerts = await FleetAlertService.getActive(req.user?.organization);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيهات', error: error.message });
    }
  }

  /** التنبيهات الحرجة */
  static async getCritical(req, res) {
    try {
      const alerts = await FleetAlertService.getCritical(req.user?.organization);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيهات', error: error.message });
    }
  }

  /** تنبيهات المركبة */
  static async getByVehicle(req, res) {
    try {
      const alerts = await FleetAlertService.getByVehicle(req.params.vehicleId);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيهات', error: error.message });
    }
  }

  /** تنبيهات السائق */
  static async getByDriver(req, res) {
    try {
      const alerts = await FleetAlertService.getByDriver(req.params.driverId);
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التنبيهات', error: error.message });
    }
  }

  /** تأكيد استلام مجمّع */
  static async bulkAcknowledge(req, res) {
    try {
      const result = await FleetAlertService.bulkAcknowledge(req.body.ids, req.user?._id);
      res.json({ success: true, message: 'تم تأكيد استلام التنبيهات', data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تأكيد الاستلام', error: error.message });
    }
  }

  /** إحصائيات التنبيهات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetAlertService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetAlertController;
