/**
 * 🚗 مسارات الحجوزات والتجهيزات
 */

const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { authenticateToken } = require('../middleware/auth');

// إنشاء حجز جديد
router.post('/', authenticateToken, (req, res) => {
  try {
    const booking = bookingService.createBooking(req.body);
    res.json({
      success: true,
      message: 'تم إنشاء الحجز بنجاح',
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب الحجوزات
router.get('/', (req, res) => {
  try {
    const result = bookingService.getBookings(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب تفاصيل الحجز
router.get('/:id', (req, res) => {
  try {
    const booking = bookingService.getBookingDetails(parseInt(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تأكيد الحجز
router.post('/:id/confirm', authenticateToken, (req, res) => {
  try {
    const booking = bookingService.confirmBooking(parseInt(req.params.id), req.body);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    res.json({
      success: true,
      message: 'تم تأكيد الحجز',
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إلغاء الحجز
router.post('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const booking = bookingService.cancelBooking(parseInt(req.params.id), req.body.reason);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    res.json({
      success: true,
      message: 'تم إلغاء الحجز',
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التحقق من توفر المركبة
router.post('/check-availability', (req, res) => {
  try {
    const result = bookingService.checkVehicleAvailability(
      req.body.vehicleId,
      req.body.startDate,
      req.body.endDate
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جدول الحجوزات (التقويم)
router.get('/calendar/:vehicleId', (req, res) => {
  try {
    const calendar = bookingService.getBookingCalendar(req.params.vehicleId, req.query.month);
    res.json({ calendar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إضافة خدمات إضافية
router.post('/:id/add-services', authenticateToken, (req, res) => {
  try {
    const booking = bookingService.addAdditionalServices(
      parseInt(req.params.id),
      req.body.services
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    res.json({
      success: true,
      message: 'تمت إضافة الخدمات',
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إحصائيات الحجوزات
router.get('/stats', (req, res) => {
  try {
    const stats = bookingService.getBookingStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الاستخدام
router.get('/utilization/:vehicleId', (req, res) => {
  try {
    const report = bookingService.getUtilizationReport(
      req.params.vehicleId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
