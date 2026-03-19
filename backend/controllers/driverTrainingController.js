/**
 * Driver Training & Certification Controller - التحكم في تدريب وشهادات السائقين
 */

const DriverTrainingService = require('../services/driverTrainingService');
const logger = require('../utils/logger');

class DriverTrainingController {
  // ─── Training Programs ────────────────────────────────────────────

  /** إنشاء برنامج تدريبي */
  static async createTraining(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const training = await DriverTrainingService.createTraining(data);
      res
        .status(201)
        .json({ success: true, message: 'تم إنشاء البرنامج التدريبي', data: training });
    } catch (error) {
      logger.error('خطأ في إنشاء البرنامج التدريبي:', error);
      res
        .status(400)
        .json({ success: false, message: 'فشل إنشاء البرنامج التدريبي', error: error.message });
    }
  }

  /** جلب جميع البرامج التدريبية */
  static async getAllTrainings(req, res) {
    try {
      const { category, status, type, isMandatory, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (isMandatory !== undefined) filter.isMandatory = isMandatory === 'true';
      const result = await DriverTrainingService.getAllTrainings(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب البرامج التدريبية', error: error.message });
    }
  }

  /** جلب برنامج تدريبي */
  static async getTrainingById(req, res) {
    try {
      const training = await DriverTrainingService.getTrainingById(req.params.id);
      if (!training) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      res.json({ success: true, data: training });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب البرنامج', error: error.message });
    }
  }

  /** تحديث برنامج تدريبي */
  static async updateTraining(req, res) {
    try {
      const training = await DriverTrainingService.updateTraining(req.params.id, req.body);
      if (!training) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      res.json({ success: true, message: 'تم تحديث البرنامج', data: training });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث البرنامج', error: error.message });
    }
  }

  /** تسجيل سائق في برنامج */
  static async enrollDriver(req, res) {
    try {
      const training = await DriverTrainingService.enrollDriver(req.params.id, req.body.driverId);
      if (!training) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      res.json({ success: true, message: 'تم تسجيل السائق بنجاح', data: training });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /** تحديث نتيجة المشارك */
  static async updateParticipantResult(req, res) {
    try {
      const training = await DriverTrainingService.updateParticipantResult(
        req.params.id,
        req.params.driverId,
        req.body
      );
      if (!training) return res.status(404).json({ success: false, message: 'غير موجود' });
      res.json({ success: true, message: 'تم تحديث النتيجة', data: training });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث النتيجة', error: error.message });
    }
  }

  /** إصدار شهادة */
  static async issueCertificate(req, res) {
    try {
      const cert = await DriverTrainingService.issueCertificate(req.params.id, req.body.driverId);
      res.status(201).json({ success: true, message: 'تم إصدار الشهادة', data: cert });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /** تدريبات السائق */
  static async getDriverTrainings(req, res) {
    try {
      const trainings = await DriverTrainingService.getDriverTrainings(req.params.driverId);
      res.json({ success: true, data: trainings });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'فشل جلب تدريبات السائق', error: error.message });
    }
  }

  /** إحصائيات التدريب */
  static async getStatistics(req, res) {
    try {
      const stats = await DriverTrainingService.getTrainingStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }

  // ─── Certifications ───────────────────────────────────────────────

  /** إنشاء شهادة */
  static async createCertification(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization };
      const cert = await DriverTrainingService.createCertification(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الشهادة', data: cert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إنشاء الشهادة', error: error.message });
    }
  }

  /** شهادات السائق */
  static async getDriverCertifications(req, res) {
    try {
      const certs = await DriverTrainingService.getDriverCertifications(req.params.driverId);
      res.json({ success: true, data: certs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشهادات', error: error.message });
    }
  }

  /** تحديث شهادة */
  static async updateCertification(req, res) {
    try {
      const cert = await DriverTrainingService.updateCertification(req.params.id, req.body);
      if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث الشهادة', data: cert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الشهادة', error: error.message });
    }
  }

  /** شهادات تنتهي قريباً */
  static async getExpiringCertifications(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const certs = await DriverTrainingService.getExpiringCertifications(
        days,
        req.user?.organization
      );
      res.json({ success: true, data: certs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشهادات', error: error.message });
    }
  }

  /** شهادات منتهية */
  static async getExpiredCertifications(req, res) {
    try {
      const certs = await DriverTrainingService.getExpiredCertifications(req.user?.organization);
      res.json({ success: true, data: certs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الشهادات', error: error.message });
    }
  }

  /** تجديد شهادة */
  static async renewCertification(req, res) {
    try {
      const cert = await DriverTrainingService.renewCertification(
        req.params.id,
        req.body.newExpiryDate
      );
      if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
      res.json({ success: true, message: 'تم تجديد الشهادة', data: cert });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تجديد الشهادة', error: error.message });
    }
  }
}

module.exports = DriverTrainingController;
