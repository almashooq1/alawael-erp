/**
 * Fleet Safety Controller - التحكم بالسلامة والحوادث
 */

const FleetSafetyService = require('../services/fleetSafetyService');
const logger = require('../utils/logger');

class FleetSafetyController {
  /** تسجيل حادث */
  static async reportIncident(req, res) {
    try {
      const data = { ...req.body, reportedBy: req.user?._id, createdBy: req.user?._id };
      const incident = await FleetSafetyService.reportIncident(data);
      res.status(201).json({ success: true, message: 'تم تسجيل الحادث', data: incident });
    } catch (error) {
      logger.error('Safety incident report error:', error.message);
      res.status(400).json({ success: false, message: 'فشل تسجيل الحادث', error: error.message });
    }
  }

  /** جلب جميع الحوادث */
  static async getAll(req, res) {
    try {
      const {
        type,
        severity,
        status,
        vehicle,
        driver,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;
      const result = await FleetSafetyService.getAll(
        { type, severity, status, vehicle, driver, dateFrom, dateTo },
        page,
        limit
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل الجلب', error: error.message });
    }
  }

  /** جلب حادث بالـ ID */
  static async getById(req, res) {
    try {
      const incident = await FleetSafetyService.getById(req.params.id);
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تحديث حادث */
  static async update(req, res) {
    try {
      const incident = await FleetSafetyService.update(req.params.id, req.body, req.user?._id);
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'تم التحديث', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** بدء التحقيق */
  static async startInvestigation(req, res) {
    try {
      const incident = await FleetSafetyService.startInvestigation(req.params.id, req.user?._id);
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'بدأ التحقيق', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل بدء التحقيق', error: error.message });
    }
  }

  /** إكمال التحقيق */
  static async completeInvestigation(req, res) {
    try {
      const incident = await FleetSafetyService.completeInvestigation(
        req.params.id,
        req.body,
        req.user?._id
      );
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'اكتمل التحقيق', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل', error: error.message });
    }
  }

  /** إضافة إجراء تصحيحي */
  static async addCorrectiveAction(req, res) {
    try {
      const incident = await FleetSafetyService.addCorrectiveAction(
        req.params.id,
        req.body,
        req.user?._id
      );
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'تم إضافة الإجراء', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإضافة', error: error.message });
    }
  }

  /** تحديث حالة إجراء تصحيحي */
  static async updateCorrectiveAction(req, res) {
    try {
      const { status } = req.body;
      const incident = await FleetSafetyService.updateCorrectiveAction(
        req.params.id,
        req.params.actionId,
        status,
        req.user?._id
      );
      if (!incident) return res.status(404).json({ success: false, message: 'غير موجود' });
      res.json({ success: true, message: 'تم التحديث', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: error.message });
    }
  }

  /** إغلاق حادث */
  static async closeIncident(req, res) {
    try {
      const incident = await FleetSafetyService.closeIncident(req.params.id, req.user?._id);
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'تم إغلاق الحادث', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإغلاق', error: error.message });
    }
  }

  /** مطالبة تأمينية */
  static async fileInsuranceClaim(req, res) {
    try {
      const incident = await FleetSafetyService.fileInsuranceClaim(
        req.params.id,
        req.body,
        req.user?._id
      );
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'تم تقديم المطالبة', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التقديم', error: error.message });
    }
  }

  /** رفع وثيقة */
  static async addDocument(req, res) {
    try {
      const incident = await FleetSafetyService.addDocument(req.params.id, req.body);
      if (!incident) return res.status(404).json({ success: false, message: 'الحادث غير موجود' });
      res.json({ success: true, message: 'تم رفع الوثيقة', data: incident });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الرفع', error: error.message });
    }
  }

  /** حوادث السائق */
  static async getDriverIncidents(req, res) {
    try {
      const incidents = await FleetSafetyService.getDriverIncidents(req.params.driverId);
      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** حوادث المركبة */
  static async getVehicleIncidents(req, res) {
    try {
      const incidents = await FleetSafetyService.getVehicleIncidents(req.params.vehicleId);
      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** تقييم سلامة سائق */
  static async getDriverSafetyScore(req, res) {
    try {
      const score = await FleetSafetyService.getDriverSafetyScore(req.params.driverId);
      res.json({ success: true, data: score });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }

  /** إحصائيات السلامة */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetSafetyService.getStatistics(req.query);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: error.message });
    }
  }

  /** السائقين الأعلى خطورة */
  static async getHighRiskDrivers(req, res) {
    try {
      const drivers = await FleetSafetyService.getHighRiskDrivers(
        req.query.organization,
        parseInt(req.query.limit) || 10
      );
      res.json({ success: true, data: drivers });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: error.message });
    }
  }
}

module.exports = FleetSafetyController;
