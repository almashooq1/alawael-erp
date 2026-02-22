/**
 * ===================================================================
 * STUDENT TRANSPORTATION SYSTEM - Routes
 * نظام نقل الطلاب - المسارات
 * ===================================================================
 */

const express = require('express');
const router = express.Router();

const {
  studentController,
  busRouteController,
  driverController,
  vehicleController,
  attendanceController,
  paymentController,
  incidentController,
  notificationController,
  systemController,
} = require('../controllers/transportation-controllers');

// ===================================================================
// SYSTEM ROUTES - مسارات النظام
// ===================================================================

// Health check
router.get('/health', systemController.getHealth);

// System statistics
router.get('/stats', systemController.getSystemStats);

// Dashboard
router.get('/dashboard', systemController.getDashboard);

// ===================================================================
// STUDENT ROUTES - مسارات الطالب
// ===================================================================

// GET all students
router.get('/students', studentController.getAllStudents);

// GET student statistics
router.get('/students/stats', studentController.getStudentStats);

// GET specific student
router.get('/students/:id', studentController.getStudentById);

// CREATE new student
router.post('/students', studentController.createStudent);

// UPDATE student
router.put('/students/:id', studentController.updateStudent);

// DELETE student
router.delete('/students/:id', studentController.deleteStudent);

// ASSIGN student to route
router.post('/students/assign-route', studentController.assignToRoute);

// GET student attendance history
router.get('/students/:id/attendance', studentController.getAttendanceHistory);

// ===================================================================
// BUS ROUTE ROUTES - مسارات الحافلة
// ===================================================================

// GET all routes
router.get('/routes', busRouteController.getAllRoutes);

// GET route statistics
router.get('/routes/stats', busRouteController.getRouteStats);

// GET specific route
router.get('/routes/:id', busRouteController.getRouteById);

// CREATE new route
router.post('/routes', busRouteController.createRoute);

// UPDATE route
router.put('/routes/:id', busRouteController.updateRoute);

// DELETE route
router.delete('/routes/:id', busRouteController.deleteRoute);

// GET route stops
router.get('/routes/:id/stops', busRouteController.getRouteStops);

// GET students on route
router.get('/routes/:id/students', busRouteController.getRouteStudents);

// TRACK route in real-time
router.get('/routes/:id/track', busRouteController.trackRoute);

// ===================================================================
// DRIVER ROUTES - مسارات السائق
// ===================================================================

// GET all drivers
router.get('/drivers', driverController.getAllDrivers);

// GET driver statistics
router.get('/drivers/stats', driverController.getDriverStats);

// GET specific driver
router.get('/drivers/:id', driverController.getDriverById);

// CREATE new driver
router.post('/drivers', driverController.createDriver);

// UPDATE driver
router.put('/drivers/:id', driverController.updateDriver);

// DELETE driver
router.delete('/drivers/:id', driverController.deleteDriver);

// START driver shift
router.post('/drivers/shift/start', driverController.startShift);

// END driver shift
router.post('/drivers/shift/end', driverController.endShift);

// UPDATE driver location
router.post('/drivers/location/update', driverController.updateLocation);

// GET driver performance
router.get('/drivers/:id/performance', driverController.getDriverPerformance);

// ===================================================================
// VEHICLE ROUTES - مسارات المركبة
// ===================================================================

// GET all vehicles
router.get('/vehicles', vehicleController.getAllVehicles);

// GET vehicle statistics
router.get('/vehicles/stats', vehicleController.getVehicleStats);

// GET specific vehicle
router.get('/vehicles/:id', vehicleController.getVehicleById);

// CREATE new vehicle
router.post('/vehicles', vehicleController.createVehicle);

// UPDATE vehicle
router.put('/vehicles/:id', vehicleController.updateVehicle);

// DELETE vehicle
router.delete('/vehicles/:id', vehicleController.deleteVehicle);

// SCHEDULE vehicle maintenance
router.post('/vehicles/maintenance/schedule', vehicleController.scheduleMaintenance);

// UPDATE vehicle fuel
router.post('/vehicles/fuel/update', vehicleController.updateFuel);

// ===================================================================
// ATTENDANCE ROUTES - مسارات الحضور
// ===================================================================

// GET all attendance records
router.get('/attendance', attendanceController.getAttendanceRecords);

// GET attendance statistics
router.get('/attendance/stats', attendanceController.getAttendanceStats);

// GET student attendance
router.get('/attendance/student/:studentId', attendanceController.getStudentAttendance);

// RECORD attendance
router.post('/attendance', attendanceController.recordAttendance);

// UPDATE attendance
router.put('/attendance/:id', attendanceController.updateAttendance);

// GENERATE attendance report
router.get('/attendance/report', attendanceController.generateReport);

// ===================================================================
// PAYMENT ROUTES - مسارات الدفع
// ===================================================================

// GET all payments
router.get('/payments', paymentController.getAllPayments);

// GET payment statistics
router.get('/payments/stats', paymentController.getPaymentStats);

// GET specific payment
router.get('/payments/:id', paymentController.getPaymentById);

// CREATE new payment
router.post('/payments', paymentController.createPayment);

// PROCESS payment
router.post('/payments/:paymentId/process', paymentController.processPayment);

// GET student payments
router.get('/payments/student/:studentId', paymentController.getStudentPayments);

// GENERATE invoice
router.get('/payments/:paymentId/invoice', paymentController.generateInvoice);

// ===================================================================
// INCIDENT ROUTES - مسارات الحادثة
// ===================================================================

// GET all incidents
router.get('/incidents', incidentController.getAllIncidents);

// GET incident statistics
router.get('/incidents/stats', incidentController.getIncidentStats);

// GET specific incident
router.get('/incidents/:id', incidentController.getIncidentById);

// REPORT incident
router.post('/incidents', incidentController.reportIncident);

// UPDATE incident
router.put('/incidents/:id', incidentController.updateIncident);

// CLOSE incident
router.post('/incidents/:id/close', incidentController.closeIncident);

// ===================================================================
// NOTIFICATION ROUTES - مسارات الإخطارات
// ===================================================================

// GET notifications
router.get('/notifications', notificationController.getNotifications);

// GET unread notifications
router.get('/notifications/unread', notificationController.getUnreadNotifications);

// SEND notification
router.post('/notifications', notificationController.sendNotification);

// MARK notification as read
router.put('/notifications/:id/read', notificationController.markAsRead);

// DELETE notification
router.delete('/notifications/:id', notificationController.deleteNotification);

// ===================================================================
// Export Router
// ===================================================================
module.exports = router;
