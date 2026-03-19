/**
 * Fleet Document Controller - التحكم في مستندات الأسطول
 */

const FleetDocumentService = require('../services/fleetDocumentService');
const logger = require('../utils/logger');

class FleetDocumentController {
  /** إنشاء مستند جديد */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id, organization: req.user?.organization };
      const document = await FleetDocumentService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء المستند بنجاح', data: document });
    } catch (error) {
      logger.error('خطأ في إنشاء المستند:', error);
      res.status(400).json({ success: false, message: 'فشل إنشاء المستند', error: error.message });
    }
  }

  /** جلب جميع المستندات */
  static async getAll(req, res) {
    try {
      const { vehicle, driver, type, category, status, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (driver) filter.driver = driver;
      if (type) filter.type = type;
      if (category) filter.category = category;
      if (status) filter.status = status;
      const result = await FleetDocumentService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستندات', error: error.message });
    }
  }

  /** جلب مستند بالمعرف */
  static async getById(req, res) {
    try {
      const document = await FleetDocumentService.getById(req.params.id);
      if (!document) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, data: document });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستند', error: error.message });
    }
  }

  /** تحديث مستند */
  static async update(req, res) {
    try {
      const document = await FleetDocumentService.update(req.params.id, req.body);
      if (!document) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, message: 'تم تحديث المستند', data: document });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث المستند', error: error.message });
    }
  }

  /** حذف مستند */
  static async delete(req, res) {
    try {
      const document = await FleetDocumentService.delete(req.params.id);
      if (!document) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, message: 'تم حذف المستند' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف المستند', error: error.message });
    }
  }

  /** المستندات القريبة من الانتهاء */
  static async getExpiring(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const documents = await FleetDocumentService.getExpiring(req.user?.organization, days);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستندات', error: error.message });
    }
  }

  /** المستندات المنتهية */
  static async getExpired(req, res) {
    try {
      const documents = await FleetDocumentService.getExpired(req.user?.organization);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستندات', error: error.message });
    }
  }

  /** مستندات المركبة */
  static async getByVehicle(req, res) {
    try {
      const documents = await FleetDocumentService.getByVehicle(req.params.vehicleId);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستندات', error: error.message });
    }
  }

  /** مستندات السائق */
  static async getByDriver(req, res) {
    try {
      const documents = await FleetDocumentService.getByDriver(req.params.driverId);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب المستندات', error: error.message });
    }
  }

  /** التحقق من المستند */
  static async verify(req, res) {
    try {
      const document = await FleetDocumentService.verify(req.params.id, req.user?._id);
      if (!document) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, message: 'تم التحقق من المستند', data: document });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحقق', error: error.message });
    }
  }

  /** تجديد المستند */
  static async renew(req, res) {
    try {
      const document = await FleetDocumentService.renewDocument(req.params.id, req.body);
      if (!document) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, message: 'تم تجديد المستند', data: document });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تجديد المستند', error: error.message });
    }
  }

  /** إحصائيات المستندات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetDocumentService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetDocumentController;
