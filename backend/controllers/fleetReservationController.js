/**
 * Fleet Reservation Controller - التحكم في حجوزات الأسطول
 */

const FleetReservationService = require('../services/fleetReservationService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetReservationController {
  /** إنشاء حجز جديد */
  static async create(req, res) {
    try {
      const data = {
        ...req.body,
        requestedBy: req.user?._id,
        createdBy: req.user?._id,
        organization: req.user?.organization,
      };
      const reservation = await FleetReservationService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الحجز بنجاح', data: reservation });
    } catch (error) {
      logger.error('خطأ في إنشاء الحجز:', error);
      res.status(400).json({ success: false, message: safeError(error) || 'فشل إنشاء الحجز' });
    }
  }

  /** جلب جميع الحجوزات */
  static async getAll(req, res) {
    try {
      const { vehicle, status, purpose, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
      const filter = { organization: req.user?.organization };
      if (vehicle) filter.vehicle = vehicle;
      if (status) filter.status = status;
      if (purpose) filter.purpose = purpose;
      if (dateFrom) filter.dateFrom = dateFrom;
      if (dateTo) filter.dateTo = dateTo;
      const result = await FleetReservationService.getAll(filter, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الحجوزات', error: safeError(error) });
    }
  }

  /** جلب حجز بالمعرف */
  static async getById(req, res) {
    try {
      const reservation = await FleetReservationService.getById(req.params.id);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, data: reservation });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الحجز', error: safeError(error) });
    }
  }

  /** تحديث حجز */
  static async update(req, res) {
    try {
      const reservation = await FleetReservationService.update(req.params.id, req.body);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم تحديث الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تحديث الحجز', error: safeError(error) });
    }
  }

  /** حذف حجز */
  static async delete(req, res) {
    try {
      const reservation = await FleetReservationService.delete(req.params.id);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم حذف الحجز' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل حذف الحجز', error: safeError(error) });
    }
  }

  /** الموافقة على الحجز */
  static async approve(req, res) {
    try {
      const reservation = await FleetReservationService.approve(req.params.id, req.user?._id);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم الموافقة على الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل الموافقة', error: safeError(error) });
    }
  }

  /** رفض الحجز */
  static async reject(req, res) {
    try {
      const reservation = await FleetReservationService.reject(
        req.params.id,
        req.user?._id,
        req.body.rejectionReason
      );
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم رفض الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل رفض الحجز', error: safeError(error) });
    }
  }

  /** تفعيل الحجز */
  static async activate(req, res) {
    try {
      const reservation = await FleetReservationService.activate(
        req.params.id,
        req.body.startOdometer
      );
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم تفعيل الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل تفعيل الحجز', error: safeError(error) });
    }
  }

  /** إكمال الحجز */
  static async complete(req, res) {
    try {
      const reservation = await FleetReservationService.complete(req.params.id, req.body);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم إكمال الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إكمال الحجز', error: safeError(error) });
    }
  }

  /** إلغاء الحجز */
  static async cancel(req, res) {
    try {
      const reservation = await FleetReservationService.cancel(req.params.id);
      if (!reservation) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, message: 'تم إلغاء الحجز', data: reservation });
    } catch (error) {
      res.status(400).json({ success: false, message: 'فشل إلغاء الحجز', error: safeError(error) });
    }
  }

  /** التحقق من التوفر */
  static async checkAvailability(req, res) {
    try {
      const { vehicleId, startDate, endDate, excludeId } = req.query;
      const result = await FleetReservationService.checkAvailability(
        vehicleId,
        startDate,
        endDate,
        excludeId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل التحقق', error: safeError(error) });
    }
  }

  /** الحجوزات القادمة */
  static async getUpcoming(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const reservations = await FleetReservationService.getUpcoming(req.user?.organization, days);
      res.json({ success: true, data: reservations });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الحجوزات', error: safeError(error) });
    }
  }

  /** إحصائيات الحجوزات */
  static async getStatistics(req, res) {
    try {
      const stats = await FleetReservationService.getStatistics(req.user?.organization);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'فشل جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetReservationController;
