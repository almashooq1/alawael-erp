/**
 * Fleet Tire Controller - التحكم بإدارة الإطارات
 */

const FleetTireService = require('../services/fleetTireService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetTireController {
  /** إضافة إطار */
  static async create(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user?._id };
      const tire = await FleetTireService.create(data);
      res.status(201).json({ success: true, message: 'تم إضافة الإطار', data: tire });
    } catch (error) {
      logger.error('Tire create error:', error.message);
      res.status(400).json({ success: false, message: 'فشل إضافة الإطار', error: safeError(error) });
    }
  }

  /** جلب الكل */
  static async getAll(req, res) {
    try {
      const { status, brand, vehicle, type, page = 1, limit = 20 } = req.query;
      const result = await FleetTireService.getAll({ status, brand, vehicle, type }, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل الجلب', error: safeError(error) });
    }
  }

  /** جلب بالـ ID */
  static async getById(req, res) {
    try {
      const tire = await FleetTireService.getById(req.params.id);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, data: tire });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** تحديث */
  static async update(req, res) {
    try {
      const tire = await FleetTireService.update(req.params.id, req.body);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم التحديث', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التحديث', error: safeError(error) });
    }
  }

  /** تركيب إطار على مركبة */
  static async install(req, res) {
    try {
      const { vehicleId, position } = req.body;
      const tire = await FleetTireService.installTire(req.params.id, vehicleId, position);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم التركيب', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التركيب', error: safeError(error) });
    }
  }

  /** إزالة إطار */
  static async remove(req, res) {
    try {
      const tire = await FleetTireService.removeTire(req.params.id);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم إزالة الإطار', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإزالة', error: safeError(error) });
    }
  }

  /** تبديل مواقع الإطارات */
  static async rotateTires(req, res) {
    try {
      const result = await FleetTireService.rotateTires(req.body.rotations);
      res.json({ success: true, message: `تم تبديل ${result.length} إطارات`, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التبديل', error: safeError(error) });
    }
  }

  /** تسجيل قراءة تآكل */
  static async recordTread(req, res) {
    try {
      const { depth, position, measuredBy } = req.body;
      const tire = await FleetTireService.recordTreadReading(
        req.params.id,
        depth,
        position,
        measuredBy
      );
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم تسجيل القراءة', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التسجيل', error: safeError(error) });
    }
  }

  /** تسجيل ضغط */
  static async recordPressure(req, res) {
    try {
      const { pressure } = req.body;
      const tire = await FleetTireService.recordPressure(req.params.id, pressure);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم تسجيل الضغط', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل التسجيل', error: safeError(error) });
    }
  }

  /** إضافة إصلاح */
  static async addRepair(req, res) {
    try {
      const tire = await FleetTireService.addRepair(req.params.id, req.body);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم إضافة الإصلاح', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الإضافة', error: safeError(error) });
    }
  }

  /** التخلص من إطار */
  static async dispose(req, res) {
    try {
      const tire = await FleetTireService.disposeTire(req.params.id, req.body);
      if (!tire) return res.status(404).json({ success: false, message: 'الإطار غير موجود' });
      res.json({ success: true, message: 'تم التخلص من الإطار', data: tire });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل', error: safeError(error) });
    }
  }

  /** إطارات تحتاج استبدال */
  static async needingReplacement(req, res) {
    try {
      const tires = await FleetTireService.getTiresNeedingReplacement(req.query.organization);
      res.json({ success: true, data: tires });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** إطارات تحتاج تبديل دوري */
  static async needingRotation(req, res) {
    try {
      const tires = await FleetTireService.getTiresNeedingRotation(req.query.organization);
      res.json({ success: true, data: tires });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** إطارات مركبة */
  static async getVehicleTires(req, res) {
    try {
      const tires = await FleetTireService.getVehicleTires(req.params.vehicleId);
      res.json({ success: true, data: tires });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
    }
  }

  /** إحصائيات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetTireService.getStatistics(req.query.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetTireController;
