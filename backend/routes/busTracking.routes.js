/**
 * Bus Tracking Routes — مسارات تتبع الحافلات بالوقت الفعلي
 *
 * 23 API endpoints:
 *   🚌 Buses:       CRUD + list with filters
 *   🗺️  Routes:      CRUD + stops management
 *   🧒 Students:    Registration + parent lookup
 *   📍 Trips:       Start → waypoints → end + active + history
 *   🔴 Tracking:    GPS update, bus location, all locations
 *   👆 Boarding:    Board/alight events + history
 *   👨‍👩‍👧 Parent:      Dashboard, bus tracker, ETA
 *   🔔 Notifs:      List, mark read, mark all read
 *   ⚠️  Safety:      Alerts list, SOS, acknowledge
 *   📊 Dashboard:   KPIs + active trips + alerts
 *
 * Base path: /api/bus-tracking  (dual-mounted with /api/v1/bus-tracking)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const _logger = require('../utils/logger');

const MAX_PAGE_LIMIT = 100;

// ── Service ──
const busTracking = require('../services/busTracking.service');
const { safeError } = require('../utils/safeError');

// ── Validation helper ──
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// BUS MANAGEMENT — إدارة الحافلات
// ══════════════════════════════════════════════════════════════════════════════

// GET /buses — List all buses
router.get('/buses', authenticate, async (req, res) => {
  try {
    const buses = busTracking.getAllBuses(req.query);
    res.json({ success: true, data: buses, total: buses.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// GET /buses/:id — Get bus details
router.get('/buses/:id', authenticate, [param('id').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const bus = busTracking.getBusById(req.params.id);
    const students = busTracking.getStudentsByBus(req.params.id);
    res.json({ success: true, data: { ...bus, students } });
  } catch (err) {
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// POST /buses — Create bus
router.post(
  '/buses',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager']),
  [body('plateNumber').notEmpty(), body('capacity').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const bus = busTracking.createBus(req.body);
      res.status(201).json({ success: true, data: bus, message: 'تم إضافة الحافلة بنجاح' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// PUT /buses/:id — Update bus
router.put(
  '/buses/:id',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const bus = busTracking.updateBus(req.params.id, req.body);
      res.json({ success: true, data: bus, message: 'تم تحديث الحافلة' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// DELETE /buses/:id — Delete bus
router.delete(
  '/buses/:id',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      busTracking.deleteBus(req.params.id);
      res.json({ success: true, message: 'تم حذف الحافلة' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE MANAGEMENT — إدارة المسارات
// ══════════════════════════════════════════════════════════════════════════════

// GET /routes — List routes
router.get('/routes', authenticate, async (req, res) => {
  try {
    const routes = busTracking.getAllRoutes(req.query);
    res.json({ success: true, data: routes, total: routes.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// GET /routes/:id — Get route
router.get('/routes/:id', authenticate, [param('id').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const route = busTracking.getRouteById(req.params.id);
    res.json({ success: true, data: route });
  } catch (err) {
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// POST /routes — Create route
router.post(
  '/routes',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager']),
  [body('name').notEmpty(), body('stops').isArray({ min: 2 })],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const route = busTracking.createRoute(req.body);
      res.status(201).json({ success: true, data: route, message: 'تم إنشاء المسار' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// PUT /routes/:id — Update route
router.put(
  '/routes/:id',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const route = busTracking.updateRoute(req.params.id, req.body);
      res.json({ success: true, data: route, message: 'تم تحديث المسار' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// DELETE /routes/:id — Delete route
router.delete(
  '/routes/:id',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      busTracking.deleteRoute(req.params.id);
      res.json({ success: true, message: 'تم حذف المسار' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT REGISTRATION — تسجيل الطلاب
// ══════════════════════════════════════════════════════════════════════════════

// POST /students — Register student on bus
router.post(
  '/students',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'social_worker']),
  [body('name').notEmpty(), body('busId').isNumeric(), body('parentPhone').notEmpty()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const student = busTracking.registerStudent(req.body);
      res
        .status(201)
        .json({ success: true, data: student, message: 'تم تسجيل الطالب على الحافلة' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// GET /students/bus/:busId — Students on a bus
router.get('/students/bus/:busId', authenticate, [param('busId').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const students = busTracking.getStudentsByBus(req.params.busId);
    res.json({ success: true, data: students, total: students.length });
  } catch (err) {
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// GET /students/:id — Get student
router.get('/students/:id', authenticate, [param('id').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const student = busTracking.getStudentById(req.params.id);
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRIP LIFECYCLE — دورة حياة الرحلة
// ══════════════════════════════════════════════════════════════════════════════

// POST /trips/start — Start a trip
router.post(
  '/trips/start',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'driver']),
  [body('busId').isNumeric(), body('routeId').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const trip = busTracking.startTrip(req.body);
      res.status(201).json({ success: true, data: trip, message: 'بدأت الرحلة' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// POST /trips/:id/end — End a trip
router.post(
  '/trips/:id/end',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'driver']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const trip = busTracking.endTrip(req.params.id);
      res.json({ success: true, data: trip, message: 'انتهت الرحلة' });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// POST /trips/:id/arrive — Arrive at next stop
router.post(
  '/trips/:id/arrive',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'driver']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const result = busTracking.arriveAtStop(req.params.id, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// GET /trips/active — Get active trips
router.get('/trips/active', authenticate, async (req, res) => {
  try {
    const trips = busTracking.getActiveTrips();
    res.json({ success: true, data: trips, total: trips.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// GET /trips/history — Trip history
router.get('/trips/history', authenticate, async (req, res) => {
  try {
    const trips = busTracking.getTripHistory(req.query);
    res.json({ success: true, data: trips, total: trips.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// GET /trips/:id — Get trip details
router.get('/trips/:id', authenticate, [param('id').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const trip = busTracking.getTripById(req.params.id);
    res.json({ success: true, data: trip });
  } catch (err) {
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// REAL-TIME TRACKING — التتبع بالوقت الفعلي
// ══════════════════════════════════════════════════════════════════════════════

// POST /tracking/:busId/location — Update bus GPS location
router.post(
  '/tracking/:busId/location',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'driver', 'system']),
  [param('busId').isNumeric(), body('lat').isFloat(), body('lng').isFloat()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const location = busTracking.updateBusLocation(req.params.busId, req.body);
      res.json({ success: true, data: location });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// GET /tracking/:busId — Get bus current location
router.get('/tracking/:busId', authenticate, [param('busId').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const location = busTracking.getBusLocation(req.params.busId);
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// GET /tracking — All bus locations
router.get('/tracking', authenticate, async (req, res) => {
  try {
    const locations = busTracking.getAllBusLocations();
    res.json({ success: true, data: locations, total: locations.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BOARDING & ALIGHTING — صعود ونزول الطلاب
// ══════════════════════════════════════════════════════════════════════════════

// POST /boarding — Record boarding/alighting
router.post(
  '/boarding',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager', 'driver', 'assistant']),
  [body('tripId').isNumeric(), body('studentId').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const event = busTracking.recordBoarding(req.body);
      res.status(201).json({ success: true, data: event });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// GET /boarding/history — Boarding history
router.get('/boarding/history', authenticate, async (req, res) => {
  try {
    const events = busTracking.getBoardingHistory(req.query);
    res.json({ success: true, data: events, total: events.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PARENT TRACKING PORTAL — بوابة تتبع الأهالي
// ══════════════════════════════════════════════════════════════════════════════

// GET /parent/dashboard?phone=xxx — Parent dashboard
router.get('/parent/dashboard', authenticate, [query('phone').notEmpty()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const dashboard = busTracking.getParentDashboard(req.query.phone);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// GET /parent/track/:busId?phone=xxx — Track specific bus
router.get(
  '/parent/track/:busId',
  authenticate,
  [param('busId').isNumeric(), query('phone').notEmpty()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = busTracking.trackBusForParent(req.params.busId, req.query.phone);
      res.json({ success: true, data });
    } catch (err) {
      res.status(403).json({ success: false, error: safeError(err) });
    }
  }
);

// GET /parent/eta/:studentId — ETA for student stop
router.get(
  '/parent/eta/:studentId',
  authenticate,
  [param('studentId').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const eta = busTracking.getETAForStudent(req.params.studentId);
      res.json({ success: true, data: eta });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — الإشعارات
// ══════════════════════════════════════════════════════════════════════════════

// GET /notifications?phone=xxx — Parent notifications
router.get('/notifications', authenticate, [query('phone').notEmpty()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const notifs = busTracking.getParentNotifications(req.query.phone, {
      limit: Math.min(parseInt(req.query.limit) || 50, MAX_PAGE_LIMIT),
      unreadOnly: req.query.unreadOnly === 'true',
    });
    res.json({ success: true, data: notifs, total: notifs.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// PATCH /notifications/:id/read — Mark notification read
router.patch(
  '/notifications/:id/read',
  authenticate,
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const notif = busTracking.markNotificationRead(req.params.id);
      res.json({ success: true, data: notif });
    } catch (err) {
      res.status(404).json({ success: false, error: safeError(err) });
    }
  }
);

// POST /notifications/read-all — Mark all read
router.post(
  '/notifications/read-all',
  authenticate,
  [body('phone').notEmpty()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const result = busTracking.markAllNotificationsRead(req.body.phone);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY & ALERTS — السلامة والتنبيهات
// ══════════════════════════════════════════════════════════════════════════════

// GET /safety/alerts — Safety alerts
router.get('/safety/alerts', authenticate, async (req, res) => {
  try {
    const alerts = busTracking.getSafetyAlerts(req.query);
    res.json({ success: true, data: alerts, total: alerts.length });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

// POST /safety/sos/:busId — Raise SOS
router.post('/safety/sos/:busId', authenticate, [param('busId').isNumeric()], async (req, res) => {
  if (handleValidation(req, res)) return;
  try {
    const alert = busTracking.raiseSOS(req.params.busId, req.body);
    res.status(201).json({ success: true, data: alert, message: 'تم إرسال إشارة الطوارئ' });
  } catch (err) {
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// PATCH /safety/alerts/:id/acknowledge — Acknowledge alert
router.patch(
  '/safety/alerts/:id/acknowledge',
  authenticate,
  authorize(['admin', 'manager', 'fleet_manager']),
  [param('id').isNumeric()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const alert = busTracking.acknowledgeAlert(req.params.id);
      res.json({ success: true, data: alert });
    } catch (err) {
      res.status(404).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم
// ══════════════════════════════════════════════════════════════════════════════

// GET /dashboard/overview — Dashboard KPIs
router.get('/dashboard/overview', authenticate, async (req, res) => {
  try {
    const dashboard = busTracking.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (err) {
    safeError(res, err, 'busTracking');
  }
});

module.exports = router;
