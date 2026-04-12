/* eslint-disable no-unused-vars */
/**
 * Student Transport Routes - مسارات نقل الطلاب
 * API Endpoints for School Bus Management
 */

const express = require('express');
const router = express.Router();
const { studentTransportService, transportConfig } = require('./student-transport-service');
const safeError = require('../utils/safeError');

// ============ Configuration ============

router.get('/config/vehicle-types', (req, res) => {
  res.json({ success: true, data: transportConfig.vehicleTypes });
});

router.get('/config/trip-types', (req, res) => {
  res.json({ success: true, data: transportConfig.tripTypes });
});

router.get('/config/grade-levels', (req, res) => {
  res.json({ success: true, data: transportConfig.gradeLevels });
});

// ============ Statistics ============

router.get('/statistics/:schoolId', async (req, res) => {
  try {
    const stats = await studentTransportService.getTransportStatistics(req.params.schoolId);
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

// ============ Buses ============

router.get('/buses/school/:schoolId', async (req, res) => {
  try {
    const buses = await studentTransportService.getBusesBySchool(req.params.schoolId);
    res.json({ success: true, data: buses, count: buses.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/buses/active/:schoolId', async (req, res) => {
  try {
    const buses = await studentTransportService.getActiveBuses(req.params.schoolId);
    res.json({ success: true, data: buses, count: buses.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/buses/:busId', async (req, res) => {
  try {
    const bus = await studentTransportService.getBus(req.params.busId);
    if (!bus) return res.status(404).json({ success: false, error: 'Bus not found' });
    res.json({ success: true, data: bus });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.post('/buses', async (req, res) => {
  try {
    const bus = await studentTransportService.createBus({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: bus, message: 'تم إضافة الحافلة' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/buses/:busId/location', async (req, res) => {
  try {
    const bus = await studentTransportService.updateBusLocation(req.params.busId, req.body);
    res.json({ success: true, data: bus, message: 'تم تحديث الموقع' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

// ============ Students ============

router.get('/students/school/:schoolId', async (req, res) => {
  try {
    const students = await studentTransportService.getStudentsBySchool(req.params.schoolId);
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/students/bus/:busId', async (req, res) => {
  try {
    const students = await studentTransportService.getStudentsByBus(req.params.busId);
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/students/:studentId', async (req, res) => {
  try {
    const student = await studentTransportService.getStudent(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.post('/students', async (req, res) => {
  try {
    const student = await studentTransportService.createStudent({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: student, message: 'تم تسجيل الطالب' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/students/:studentId/pickup', async (req, res) => {
  try {
    const student = await studentTransportService.updateStudentPickup(
      req.params.studentId,
      req.body
    );
    res.json({ success: true, data: student, message: 'تم تحديث نقطة التوصيل' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/students/:studentId/attendance', async (req, res) => {
  try {
    const { status } = req.body;
    const student = await studentTransportService.markStudentAttendance(
      req.params.studentId,
      status
    );
    res.json({ success: true, data: student, message: 'تم تحديث الحضور' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

// ============ Trips ============

router.get('/trips/today/:schoolId', async (req, res) => {
  try {
    const trips = await studentTransportService.getTodayTrips(req.params.schoolId);
    res.json({ success: true, data: trips, count: trips.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/trips/active/:schoolId', async (req, res) => {
  try {
    const trips = await studentTransportService.getActiveTrips(req.params.schoolId);
    res.json({ success: true, data: trips, count: trips.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.post('/trips', async (req, res) => {
  try {
    const trip = await studentTransportService.createTrip({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: trip, message: 'تم إنشاء الرحلة' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/trips/:tripId/start', async (req, res) => {
  try {
    const trip = await studentTransportService.startTrip(req.params.tripId);
    res.json({ success: true, data: trip, message: 'تم بدء الرحلة' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/trips/:tripId/complete', async (req, res) => {
  try {
    const trip = await studentTransportService.completeTrip(req.params.tripId, req.body);
    res.json({ success: true, data: trip, message: 'تم إكمال الرحلة' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/trips/:tripId/location', async (req, res) => {
  try {
    const trip = await studentTransportService.updateTripLocation(req.params.tripId, req.body);
    res.json({ success: true, data: trip });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/trips/:tripId/pickup/:studentId', async (req, res) => {
  try {
    const trip = await studentTransportService.recordStudentPickup(
      req.params.tripId,
      req.params.studentId
    );
    res.json({ success: true, data: trip, message: 'تم تسجيل صعود الطالب' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/trips/:tripId/dropoff/:studentId', async (req, res) => {
  try {
    const trip = await studentTransportService.recordStudentDropoff(
      req.params.tripId,
      req.params.studentId
    );
    res.json({ success: true, data: trip, message: 'تم تسجيل نزول الطالب' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

// ============ Routes ============

router.get('/routes/school/:schoolId', async (req, res) => {
  try {
    const routes = await studentTransportService.getRoutesBySchool(req.params.schoolId);
    res.json({ success: true, data: routes, count: routes.length });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.get('/routes/:routeId', async (req, res) => {
  try {
    const route = await studentTransportService.getRoute(req.params.routeId);
    if (!route) return res.status(404).json({ success: false, error: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.post('/routes', async (req, res) => {
  try {
    const route = await studentTransportService.createRoute({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: route, message: 'تم إنشاء المسار' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

router.put('/routes/:routeId/optimize', async (req, res) => {
  try {
    const route = await studentTransportService.optimizeRoute(req.params.routeId);
    res.json({ success: true, data: route, message: 'تم تحسين المسار' });
  } catch (error) {
    safeError(res, error, 'student-transport');
  }
});

module.exports = router;
