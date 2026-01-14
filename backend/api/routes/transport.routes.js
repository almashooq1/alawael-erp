/**
 * APIs نظام النقل والمواصلات
 * Transport System APIs
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  BusService,
  DriverService,
  RouteService,
  StudentTransportService,
  AttendanceService,
  PaymentService,
  ComplaintService,
  NotificationService,
} = require('../services/transport.services');

// ==================== APIs إدارة الحافلات ====================

// إضافة حافلة
router.post('/buses', authenticateToken, async (req, res) => {
  try {
    const bus = await BusService.createBus(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الحافلة بنجاح',
      data: bus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على جميع الحافلات
router.get('/buses', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;

    const buses = await BusService.getAllBuses(filters);
    res.json({
      success: true,
      data: buses,
      total: buses.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على حافلة واحدة
router.get('/buses/:busId', authenticateToken, async (req, res) => {
  try {
    const bus = await BusService.getBusById(req.params.busId);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'الحافلة غير موجودة',
      });
    }
    res.json({
      success: true,
      data: bus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديث الحافلة
router.put('/buses/:busId', authenticateToken, async (req, res) => {
  try {
    const bus = await BusService.updateBus(req.params.busId, req.body);
    res.json({
      success: true,
      message: 'تم تحديث الحافلة بنجاح',
      data: bus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// حذف الحافلة
router.delete('/buses/:busId', authenticateToken, async (req, res) => {
  try {
    await BusService.deleteBus(req.params.busId);
    res.json({
      success: true,
      message: 'تم حذف الحافلة بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديث موقع GPS
router.post('/buses/:busId/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const bus = await BusService.updateBusLocation(req.params.busId, latitude, longitude);
    res.json({
      success: true,
      message: 'تم تحديث الموقع',
      data: bus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs إدارة السائقين ====================

// إضافة سائق
router.post('/drivers', authenticateToken, async (req, res) => {
  try {
    const driver = await DriverService.createDriver(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة السائق بنجاح',
      data: driver,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على جميع السائقين
router.get('/drivers', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;

    const drivers = await DriverService.getAllDrivers(filters);
    res.json({
      success: true,
      data: drivers,
      total: drivers.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على سائق واحد
router.get('/drivers/:driverId', authenticateToken, async (req, res) => {
  try {
    const driver = await DriverService.getDriverById(req.params.driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'السائق غير موجود',
      });
    }
    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديث بيانات السائق
router.put('/drivers/:driverId', authenticateToken, async (req, res) => {
  try {
    const driver = await DriverService.updateDriver(req.params.driverId, req.body);
    res.json({
      success: true,
      message: 'تم تحديث بيانات السائق',
      data: driver,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// حذف السائق
router.delete('/drivers/:driverId', authenticateToken, async (req, res) => {
  try {
    await DriverService.deleteDriver(req.params.driverId);
    res.json({
      success: true,
      message: 'تم حذف السائق بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// التحقق من صلاحية الرخصة
router.get('/drivers/:driverId/verify-license', authenticateToken, async (req, res) => {
  try {
    const result = await DriverService.verifyLicenseValidity(req.params.driverId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs إدارة المسارات ====================

// إضافة مسار
router.post('/routes', authenticateToken, async (req, res) => {
  try {
    const route = await RouteService.createRoute(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة المسار بنجاح',
      data: route,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على جميع المسارات
router.get('/routes', authenticateToken, async (req, res) => {
  try {
    const routes = await RouteService.getAllRoutes();
    res.json({
      success: true,
      data: routes,
      total: routes.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على مسار واحد
router.get('/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const route = await RouteService.getRouteById(req.params.routeId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'المسار غير موجود',
      });
    }
    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديث مسار
router.put('/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const route = await RouteService.updateRoute(req.params.routeId, req.body);
    res.json({
      success: true,
      message: 'تم تحديث المسار بنجاح',
      data: route,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs تسجيل الطالب في النقل ====================

// تسجيل طالب في النقل
router.post('/student-registration', authenticateToken, async (req, res) => {
  try {
    const registration = await StudentTransportService.registerStudent(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الطالب بنجاح، في انتظار الموافقة',
      data: registration,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على تسجيلات الطلاب
router.get('/student-registration', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.routeId) filters.currentRoute = req.query.routeId;

    const registrations = await StudentTransportService.getStudentRegistrations(filters);
    res.json({
      success: true,
      data: registrations,
      total: registrations.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الموافقة على التسجيل
router.post('/student-registration/:registrationId/approve', authenticateToken, async (req, res) => {
  try {
    const registration = await StudentTransportService.approveRegistration(req.params.registrationId, req.user.id);
    res.json({
      success: true,
      message: 'تمت الموافقة على التسجيل',
      data: registration,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// إلغاء التسجيل
router.post('/student-registration/:registrationId/cancel', authenticateToken, async (req, res) => {
  try {
    const registration = await StudentTransportService.cancelRegistration(req.params.registrationId, req.body.reason);
    res.json({
      success: true,
      message: 'تم إلغاء التسجيل',
      data: registration,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs الحضور والغياب ====================

// تسجيل الحضور
router.post('/attendance', authenticateToken, async (req, res) => {
  try {
    const attendance = await AttendanceService.recordAttendance(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الحضور',
      data: attendance,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على سجل الحضور
router.get('/attendance/:studentTransportId', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const records = await AttendanceService.getAttendanceRecords(req.params.studentTransportId, month, year);
    res.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// حساب معدل الحضور
router.get('/attendance/:studentTransportId/rate', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const rate = await AttendanceService.calculateAttendanceRate(req.params.studentTransportId, month, year);
    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs الدفعات ====================

// تسجيل دفعة
router.post('/payments', authenticateToken, async (req, res) => {
  try {
    const payment = await PaymentService.recordPayment(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      data: payment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على سجل الدفعات
router.get('/payments/:studentTransportId', authenticateToken, async (req, res) => {
  try {
    const records = await PaymentService.getPaymentRecords(req.params.studentTransportId);
    res.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على الحسابات المتأخرة
router.get('/payments/overdue/all', authenticateToken, async (req, res) => {
  try {
    const overdue = await PaymentService.getOverdueAccounts();
    res.json({
      success: true,
      data: overdue,
      total: overdue.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تقرير الإيرادات
router.get('/payments/report/:month/:year', authenticateToken, async (req, res) => {
  try {
    const report = await PaymentService.getRevenueReport(req.params.month, req.params.year);
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs الشكاوى ====================

// إضافة شكوى
router.post('/complaints', authenticateToken, async (req, res) => {
  try {
    const complaint = await ComplaintService.createComplaint(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الشكوى بنجاح',
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على الشكاوى
router.get('/complaints', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severity) filters.severity = req.query.severity;

    const complaints = await ComplaintService.getComplaints(filters);
    res.json({
      success: true,
      data: complaints,
      total: complaints.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديث الشكوى
router.put('/complaints/:complaintId', authenticateToken, async (req, res) => {
  try {
    const complaint = await ComplaintService.updateComplaintStatus(req.params.complaintId, req.body.status, req.body.resolution);
    res.json({
      success: true,
      message: 'تم تحديث الشكوى',
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// إحصائيات الشكاوى
router.get('/complaints/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await ComplaintService.getComplaintStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs التنبيهات ====================

// الحصول على التنبيهات
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await NotificationService.getNotifications(req.user.id);
    res.json({
      success: true,
      data: notifications,
      total: notifications.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// تحديد التنبيه كمقروء
router.post('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.notificationId);
    res.json({
      success: true,
      message: 'تم تحديث التنبيه',
      data: notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== APIs لوحة التحكم ====================

// إحصائيات عامة للنقل
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const buses = await BusService.getAllBuses();
    const drivers = await DriverService.getAllDrivers();
    const routes = await RouteService.getAllRoutes();
    const complaints = await ComplaintService.getComplaintStatistics();

    res.json({
      success: true,
      data: {
        totalBuses: buses.length,
        activeBuses: buses.filter(b => b.status === 'active').length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.status === 'active').length,
        totalRoutes: routes.length,
        activeRoutes: routes.filter(r => r.status === 'active').length,
        complaints: complaints,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
