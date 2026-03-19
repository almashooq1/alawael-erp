/**
 * Vehicle Insurance Controller - التحكم في تأمين المركبات
 */

const VehicleInsuranceService = require('../services/vehicleInsuranceService');
const logger = require('../utils/logger');

class VehicleInsuranceController {
  /** إنشاء بوليصة تأمين */
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const policy = await VehicleInsuranceService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء بوليصة التأمين', data: policy });
    } catch (error) {
      logger.error('خطأ في إنشاء بوليصة التأمين:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء البوليصة', error: error.message });
    }
  }

  /** جلب جميع البوالص */
  static async getAll(req, res) {
    try {
      const { vehicle, status, type, provider, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (provider) filter.provider = provider;
      const result = await VehicleInsuranceService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب البوالص', error: error.message });
    }
  }

  /** جلب بوليصة */
  static async getById(req, res) {
    try {
      const policy = await VehicleInsuranceService.getById(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.json({ success: true, data: policy });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب البوليصة', error: error.message });
    }
  }

  /** تحديث بوليصة */
  static async update(req, res) {
    try {
      const policy = await VehicleInsuranceService.update(req.params.id, req.body);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث البوليصة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث البوليصة', error: error.message });
    }
  }

  /** تفعيل بوليصة */
  static async activate(req, res) {
    try {
      const policy = await VehicleInsuranceService.activatePolicy(req.params.id);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.json({ success: true, message: 'تم تفعيل البوليصة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تفعيل البوليصة', error: error.message });
    }
  }

  /** إلغاء بوليصة */
  static async cancel(req, res) {
    try {
      const policy = await VehicleInsuranceService.cancelPolicy(req.params.id, req.body.reason);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.json({ success: true, message: 'تم إلغاء البوليصة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إلغاء البوليصة', error: error.message });
    }
  }

  /** إضافة دفعة */
  static async addPayment(req, res) {
    try {
      const policy = await VehicleInsuranceService.addPayment(req.params.id, req.body);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.json({ success: true, message: 'تم إضافة الدفعة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إضافة الدفعة', error: error.message });
    }
  }

  /** تقديم مطالبة */
  static async fileClaim(req, res) {
    try {
      const policy = await VehicleInsuranceService.fileClaim(req.params.id, req.body);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.status(201).json({ success: true, message: 'تم تقديم المطالبة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /** تحديث مطالبة */
  static async updateClaim(req, res) {
    try {
      const policy = await VehicleInsuranceService.updateClaim(
        req.params.id,
        req.params.claimId,
        req.body
      );
      if (!policy) return res.status(404).json({ success: false, message: 'غير موجود' });
      res.json({ success: true, message: 'تم تحديث المطالبة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث المطالبة', error: error.message });
    }
  }

  /** بوالص تنتهي قريباً */
  static async getExpiring(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const policies = await VehicleInsuranceService.getExpiringPolicies(
        days,
        req.user?.organization
      );
      res.json({ success: true, data: policies });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب البوالص', error: error.message });
    }
  }

  /** تأمينات المركبة */
  static async getVehicleInsurance(req, res) {
    try {
      const policies = await VehicleInsuranceService.getVehicleInsurance(req.params.vehicleId);
      res.json({ success: true, data: policies });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب التأمينات', error: error.message });
    }
  }

  /** تجديد بوليصة */
  static async renew(req, res) {
    try {
      const policy = await VehicleInsuranceService.renewPolicy(req.params.id, req.body);
      if (!policy) return res.status(404).json({ success: false, message: 'البوليصة غير موجودة' });
      res.status(201).json({ success: true, message: 'تم تجديد البوليصة', data: policy });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تجديد البوليصة', error: error.message });
    }
  }

  /** إحصائيات التأمين */
  static async getStatistics(req, res) {
    try {
      const stats = await VehicleInsuranceService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = VehicleInsuranceController;
