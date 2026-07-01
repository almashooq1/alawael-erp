/**
 * Transportation Module Routes — وحدة النقل
 * prompt_07 — GPS + Route Optimization + Pre-Trip Inspection
 *
 * Endpoints:
 *  Vehicles        → /api/transport-module/vehicles
 *  Routes          → /api/transport-module/routes
 *  Trips           → /api/transport-module/trips
 *  GPS Tracking    → /api/transport-module/gps
 *  Maintenance     → /api/transport-module/maintenance
 *  Reports         → /api/transport-module/reports
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
let createCustomLimiter;
try {
  ({ createCustomLimiter } = require('../middleware/rateLimiter'));
} catch {
  createCustomLimiter = () => (_req, _res, next) => next();
}
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
const router = express.Router();
const mongoose = require('mongoose');

// 🔒 All transport routes require authentication
router.use(authenticate);
// W440: auto-enforce branch ownership on every :beneficiaryId param.
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(requireBranchAccess);

// Cross-branch isolation (W269): requireBranchAccess only rejects a request that
// NAMES a foreign branch — it does NOT scope `:id` Trip lookups. Trip is
// branch-scoped (snake `branch_id`); branchFilter() returns camelCase {branchId},
// so map it. {} for cross-branch roles → org-wide preserved.
function branchScope(req) {
  const f = branchFilter(req);
  return f && f.branchId ? { branch_id: f.branchId } : {};
}

// Rate-limiter for GPS endpoints: 600 single-point uploads / minute / device
// (1 ping every 100ms upper bound — well above the 10s typical cadence)
const gpsLimiter = createCustomLimiter({
  windowMs: 60 * 1000,
  max: 600,
  prefix: 'rl:gps:',
  message: { error: 'تجاوز معدل تحديثات GPS المسموح' },
  keyGenerator: req => req.body?.vehicle_id || req.user?.id || req.ip || 'anon',
});

// Rate-limiter for batch GPS uploads: 60 batches / minute / device
const gpsBatchLimiter = createCustomLimiter({
  windowMs: 60 * 1000,
  max: 60,
  prefix: 'rl:gps-batch:',
  message: { error: 'تجاوز معدل رفع دفعات GPS المسموح' },
  keyGenerator: req => req.body?.vehicle_id || req.user?.id || req.ip || 'anon',
});

// ─── GPS write authorization ─────────────────────────────────────────────────
const GPS_ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'FLEET_MANAGER']);
async function authorizeVehicleWrite(req, res, next) {
  try {
    const vehicleId = req.body?.vehicle_id;
    if (!vehicleId || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ success: false, message: 'معرّف المركبة غير صالح' });
    }
    const role = String(req.user?.role || req.user?.roleCode || '').toUpperCase();
    if (GPS_ADMIN_ROLES.has(role)) return next();

    // Otherwise: caller must be the vehicle's current driver
    // (lazy-require to avoid circular deps at module load)

    const VehicleM = require('../models/transport/Vehicle');
    const v = await VehicleM.findById(vehicleId).select('current_driver_id').lean();
    if (!v) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    if (String(v.current_driver_id) !== String(req.user?._id || req.user?.id)) {
      return res
        .status(403)
        .json({ success: false, message: 'غير مصرح: لست السائق المسجّل لهذه المركبة' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

// ─── GPS payload validation ──────────────────────────────────────────────────
const MAX_GPS_BATCH = 100;
function validateGpsPoint(p) {
  if (!p || typeof p !== 'object') return 'بيانات GPS غير صالحة';
  if (typeof p.latitude !== 'number' || p.latitude < -90 || p.latitude > 90) {
    return 'خط العرض (latitude) غير صالح';
  }
  if (typeof p.longitude !== 'number' || p.longitude < -180 || p.longitude > 180) {
    return 'خط الطول (longitude) غير صالح';
  }
  if (p.speed !== undefined && (typeof p.speed !== 'number' || p.speed < 0 || p.speed > 300)) {
    return 'السرعة غير منطقية';
  }
  if (p.heading !== undefined && (p.heading < 0 || p.heading > 360)) {
    return 'الاتجاه غير صالح (يجب 0-360)';
  }
  return null;
}
// ─── Models ──────────────────────────────────────────────────────────────────
const Vehicle = require('../models/transport/Vehicle');
const TransportRoute = require('../models/transport/TransportRoute');
const Trip = require('../models/transport/Trip');
const GpsTracking = require('../models/transport/GpsTracking');
const VehicleMaintenance = require('../models/transport/VehicleMaintenance');

// ─── Services ────────────────────────────────────────────────────────────────
const {
  RouteOptimizationService,
  PreTripInspectionService,
  ParentNotificationService,
} = require('../services/transport/TransportService');
const {
  nearestUnvisitedWaypoint,
  buildNavigationLinks,
  buildMultiStopGoogleMapsUrl,
  computeLiveEta,
  signTrackingToken,
  verifyTrackingToken: _verifyTrackingToken,
  haversineDistanceMeters,
  GEOFENCE_RADIUS_METERS,
} = require('../services/transport/smartTransport.service');
const { computeDriverScore, rankDrivers } = require('../services/transport/driverSafety.service');
const { analyzeDriver: analyzeFatigue } = require('../services/transport/driverFatigue.service');
const {
  getPreTripChecklist,
  validatePreTripInspection,
} = require('../services/transport/routeOptimization.service');
const parentNotifications = require('../services/transport/parentNotifications.service');
const escapeRegex = require('../utils/escapeRegex');

// W457: TRANSPORT_TRACKING_SECRET MUST be set in production —
// same secret as routes/transport-public-track.routes.js (tokens
// signed here are verified there).
const TRACKING_TOKEN_SECRET = (() => {
  const v = process.env.TRANSPORT_TRACKING_SECRET;
  if (v) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TRANSPORT_TRACKING_SECRET is required in production — refusing to start with a known default'
    );
  }

  console.warn('[transport-module] TRANSPORT_TRACKING_SECRET unset — using non-prod fallback');
  return 'transport-tracking-default-rotate-me';
})();

let _AuditLog = null;
function getAuditLog() {
  if (_AuditLog) return _AuditLog;
  try {
    _AuditLog = require('../models/auditLog.model').AuditLog;
  } catch {
    _AuditLog = null;
  }
  return _AuditLog;
}

// Fire-and-forget audit logger — never throws
function auditAsync(entry) {
  const M = getAuditLog();
  if (!M) return;
  M.create(entry).catch(() => {});
}

const _routeOptimizer = new RouteOptimizationService();
const _inspectionService = new PreTripInspectionService();
const _notificationService = new ParentNotificationService();

// ─── Helpers ─────────────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const validateObjectId =
  (param = 'id') =>
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    next();
  };

// ══════════════════════════════════════════════════════════════════════════════
// 1. VEHICLES — المركبات
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/vehicles
router.get(
  '/vehicles',
  asyncHandler(async (req, res) => {
    const {
      status,
      vehicle_type,
      wheelchair_accessible,
      branch_id,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null, ...branchScope(req) }; // W1553: enforce branch isolation

    if (status) filter.status = status;
    if (vehicle_type) filter.vehicle_type = vehicle_type;
    // W1553: only cross-branch roles may filter by an explicit branch_id; for a
    // restricted user branchScope already pinned filter.branch_id, so ignore the
    // client value (otherwise ?branch_id=<foreign> would override the enforced scope).
    if (branch_id && !branchScope(req).branch_id) filter.branch_id = branch_id;
    if (wheelchair_accessible !== undefined)
      filter.wheelchair_accessible = wheelchair_accessible === 'true';
    if (search) {
      filter.$or = [
        { plate_number: { $regex: escapeRegex(search), $options: 'i' } },
        { make: { $regex: escapeRegex(search), $options: 'i' } },
        { model: { $regex: escapeRegex(search), $options: 'i' } },
        { vehicle_number: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .populate('current_driver_id', 'name phone')
      .populate('branch_id', 'name_ar')
      .sort({ vehicle_number: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // إحصاءات الأسطول
    const fleetStats = await Vehicle.aggregate([
      { $match: { deleted_at: null, ...branchScope(req) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: vehicles,
      fleetStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /transport-module/vehicles/:id
router.get(
  '/vehicles/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) })
      .populate('current_driver_id', 'name phone license_number')
      .populate('branch_id', 'name_ar');
    if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    res.json({ success: true, data: vehicle });
  })
);

// POST /transport-module/vehicles
router.post(
  '/vehicles',
  asyncHandler(async (req, res) => {
    // W933 — branch_id is required on Vehicle but the web-admin form never sent
    // it. Stamp the creator's branch (W269: restricted users get their scoped
    // branch — enriched via ENABLE_USER_BRANCH_ENRICH; never trust a body branch
    // for them). A cross-branch creator may name an explicit branch in the body.
    const { branch_id: _b1, branchId: _b2, ...rest } = req.body || {};
    const branchId =
      req.branchScope?.branchId || (req.branchScope?.allBranches ? _b1 || _b2 : undefined);
    const vehicle = new Vehicle({
      ...rest,
      ...(branchId ? { branch_id: branchId } : {}),
      created_by: req.user?.id || req.user?._id,
    });
    await vehicle.save();
    res.status(201).json({ success: true, data: vehicle, message: 'تم إضافة المركبة بنجاح' });
  })
);

// PUT /transport-module/vehicles/:id
router.put(
  '/vehicles/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { _plate_number, _vehicle_number, _created_by, ...updateData } = req.body;
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { ...updateData, updated_at: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    res.json({ success: true, data: vehicle, message: 'تم تحديث بيانات المركبة' });
  })
);

// DELETE /transport-module/vehicles/:id
router.delete(
  '/vehicles/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      // W1562: 'decommissioned' is NOT in the Vehicle.status enum
      // {active,maintenance,out_of_service,retired}; findOneAndUpdate skips enum
      // validation by default, so this soft-delete was persisting an invalid status.
      // 'retired' is the enum's terminal "permanently removed from service" value.
      { deleted_at: new Date(), status: 'retired' },
      { returnDocument: 'after' }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المركبة' });
  })
);

// GET /transport-module/vehicles/:id/location — آخر موقع GPS
router.get(
  '/vehicles/:id/location',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    // W1574: GpsTracking has no branch field — gate on the vehicle's branch so a
    // foreign vehicle's GPS position can't be read cross-branch.
    const veh = await Vehicle.findOne({
      _id: req.params.id,
      deleted_at: null,
      ...branchScope(req),
    })
      .select('_id')
      .lean();
    if (!veh) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    const lastGps = await GpsTracking.findOne({ vehicle_id: req.params.id })
      .sort({ timestamp: -1 })
      .select('latitude longitude speed heading timestamp');

    if (!lastGps)
      return res.status(404).json({ success: false, message: 'لا تتوفر بيانات GPS للمركبة' });
    res.json({ success: true, data: lastGps });
  })
);

// POST /transport-module/vehicles/:id/assign-driver — تعيين سائق
router.post(
  '/vehicles/:id/assign-driver',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { driver_id } = req.body;
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { current_driver_id: driver_id, updated_at: new Date() },
      { returnDocument: 'after' }
    ).populate('current_driver_id', 'name phone');
    if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    res.json({ success: true, data: vehicle, message: 'تم تعيين السائق' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. TRANSPORT ROUTES — خطوط السير
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/routes
router.get(
  '/routes',
  asyncHandler(async (req, res) => {
    const { status, branch_id, day_of_week, search, page = 1, limit = 20 } = req.query;
    const filter = { deleted_at: null, ...branchScope(req) }; // W1553: enforce branch isolation

    if (status) filter.status = status;
    // W1553: only cross-branch roles may filter by an explicit branch_id; for a
    // restricted user branchScope already pinned filter.branch_id, so ignore the
    // client value (otherwise ?branch_id=<foreign> would override the enforced scope).
    if (branch_id && !branchScope(req).branch_id) filter.branch_id = branch_id;
    if (day_of_week) filter.operating_days = day_of_week;
    if (search) {
      filter.$or = [
        { route_name_ar: { $regex: escapeRegex(search), $options: 'i' } },
        { route_number: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await TransportRoute.countDocuments(filter);
    const routes = await TransportRoute.find(filter)
      .populate('vehicle_id', 'plate_number vehicle_type capacity')
      .populate('driver_id', 'name phone')
      .populate('branch_id', 'name_ar')
      .sort({ route_number: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: routes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /transport-module/routes/:id
router.get(
  '/routes/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) })
      .populate('vehicle_id', 'plate_number vehicle_type capacity wheelchair_accessible')
      .populate('driver_id', 'name phone license_number')
      .populate('waypoints.beneficiary_id', 'full_name_ar file_number address');
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });
    res.json({ success: true, data: route });
  })
);

// POST /transport-module/routes
router.post(
  '/routes',
  asyncHandler(async (req, res) => {
    // W1553: pin branch_id to the caller's branch (don't let the body plant a route
    // in another branch); cross-branch roles keep the body value (branchScope → {}).
    const route = new TransportRoute({ ...req.body, ...branchScope(req), created_by: req.user?._id });
    await route.save();
    res.status(201).json({ success: true, data: route, message: 'تم إنشاء المسار بنجاح' });
  })
);

// PUT /transport-module/routes/:id
router.put(
  '/routes/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { _route_number, _created_by, ...updateData } = req.body;
    const route = await TransportRoute.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { ...updateData, updated_at: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });
    res.json({ success: true, data: route, message: 'تم تحديث المسار' });
  })
);

// DELETE /transport-module/routes/:id
router.delete(
  '/routes/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const route = await TransportRoute.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { deleted_at: new Date(), status: 'inactive' },
      { returnDocument: 'after' }
    );
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });
    res.json({ success: true, message: 'تم حذف المسار' });
  })
);

// POST /transport-module/routes/:id/optimize — تحسين المسار (Nearest Neighbor + 2-opt)
router.post(
  '/routes/:id/optimize',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });

    if (!route.waypoints || route.waypoints.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'يجب أن يحتوي المسار على نقطتين على الأقل' });
    }

    const startPoint = req.body.start_point || {
      lat: route.start_location?.lat,
      lng: route.start_location?.lng,
    };
    void startPoint;
    // W1553: optimizeRoute is a STATIC method on RouteOptimizationService that takes
    // a routeId, re-fetches, runs nearest-neighbour + 2-opt, writes the waypoint
    // `order` field (the real schema field — the old inline code wrote a dropped
    // `stop_order`), and saves. The previous code invoked it on the service INSTANCE
    // → undefined → TypeError → every optimize request 500'd. Delegate to the static
    // (branch ownership already verified by the scoped findOne above).
    const optimizedRoute = await RouteOptimizationService.optimizeRoute(req.params.id);

    res.json({
      success: true,
      data: {
        route: optimizedRoute,
        optimizationResult: {
          optimizedDistance: optimizedRoute.total_distance_km,
          estimatedDurationMinutes: optimizedRoute.estimated_duration_minutes,
        },
      },
      message: 'تم تحسين المسار بنجاح',
    });
  })
);

// POST /transport-module/routes/:id/add-waypoint — إضافة محطة
router.post(
  '/routes/:id/add-waypoint',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });

    const newWaypoint = {
      ...req.body,
      // W1553: the schema field is `order`, not `stop_order` (strict mode silently
      // dropped stop_order → new stops sorted as order:undefined → collapsed to front).
      order: (route.waypoints?.length || 0) + 1,
    };

    route.waypoints = route.waypoints || [];
    route.waypoints.push(newWaypoint);
    await route.save();

    res.json({ success: true, data: route, message: 'تم إضافة المحطة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. TRIPS — الرحلات
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/trips
router.get(
  '/trips',
  asyncHandler(async (req, res) => {
    const {
      status,
      vehicle_id,
      driver_id,
      route_id,
      trip_date,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null, ...branchScope(req) }; // W1553: enforce branch isolation

    if (status) filter.status = status;
    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (driver_id) filter.driver_id = driver_id;
    if (route_id) filter.route_id = route_id;
    if (trip_date) filter.trip_date = new Date(trip_date);
    if (from_date || to_date) {
      filter.trip_date = {};
      if (from_date) filter.trip_date.$gte = new Date(from_date);
      if (to_date) filter.trip_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Trip.countDocuments(filter);
    const trips = await Trip.find(filter)
      .populate('vehicle_id', 'plate_number vehicle_type')
      .populate('driver_id', 'name phone')
      .populate('route_id', 'route_name_ar route_number')
      .sort({ trip_date: -1, departure_time: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: trips,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /transport-module/trips/:id
router.get(
  '/trips/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) })
      .populate('vehicle_id', 'plate_number vehicle_type capacity wheelchair_accessible')
      .populate('driver_id', 'name phone')
      .populate('route_id', 'route_name_ar route_number waypoints')
      .populate(
        'passengers.beneficiary_id',
        'full_name_ar file_number guardian_name guardian_phone'
      );
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    res.json({ success: true, data: trip });
  })
);

// POST /transport-module/trips
router.post(
  '/trips',
  asyncHandler(async (req, res) => {
    // Pin the branch for restricted users (scope wins over any client branch_id);
    // {} for cross-branch roles keeps the body value.
    const trip = new Trip({ ...req.body, ...branchScope(req), created_by: req.user?._id });
    await trip.save();
    res.status(201).json({ success: true, data: trip, message: 'تم إنشاء الرحلة بنجاح' });
  })
);

// PUT /transport-module/trips/:id
router.put(
  '/trips/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { _trip_number, _created_by, ...updateData } = req.body;
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { ...updateData, updated_at: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    res.json({ success: true, data: trip, message: 'تم تحديث الرحلة' });
  })
);

// POST /transport-module/trips/:id/start — بدء الرحلة
router.post(
  '/trips/:id/start',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({
      _id: req.params.id,
      deleted_at: null,
      status: 'scheduled',
      ...branchScope(req),
    })
      .populate('vehicle_id', 'license_plate vehicle_type')
      .populate('route_id', 'route_name_ar');
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: 'الرحلة غير موجودة أو لا يمكن بدؤها' });

    if (req.body.skip_inspection !== true && !trip.pre_trip_inspection?.completed) {
      return res.status(400).json({ success: false, message: 'يجب إكمال فحص ما قبل الرحلة أولاً' });
    }

    trip.status = 'in_progress';
    trip.actual_departure = new Date();
    await trip.save();

    // ── Phase J: notify all guardians with a live tracking link ──
    const trackingToken = signTrackingToken(String(trip._id), TRACKING_TOKEN_SECRET);
    const baseUrl = process.env.PUBLIC_BASE_URL || '';
    const trackingUrl = baseUrl ? `${baseUrl}/track/${trackingToken}` : `/track/${trackingToken}`;
    const startMessage = parentNotifications.buildTripStartedMessage({
      trip,
      route: trip.route_id,
      vehicle: trip.vehicle_id,
      trackingUrl,
    });
    const BeneficiaryM = mongoose.models.Beneficiary;
    if (BeneficiaryM && trip.passengers?.length) {
      const benIds = trip.passengers.map(p => p.beneficiary_id).filter(Boolean);
      BeneficiaryM.find({ _id: { $in: benIds } })
        .populate('guardians', 'phone alternatePhone name')
        .lean()
        .then(beneficiaries => {
          for (const ben of beneficiaries) {
            parentNotifications.sendAsync({
              beneficiary: ben,
              body: startMessage,
              templateKey: 'transport.trip_started',
              metadata: { tripId: String(trip._id), trackingUrl },
            });
          }
        })
        .catch(() => {});
    }

    res.json({
      success: true,
      data: trip,
      message: 'تم بدء الرحلة',
    });
  })
);

// POST /transport-module/trips/:id/complete — إنهاء الرحلة
router.post(
  '/trips/:id/complete',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({
      _id: req.params.id,
      deleted_at: null,
      status: 'in_progress',
      ...branchScope(req),
    });
    if (!trip)
      return res.status(404).json({ success: false, message: 'الرحلة غير موجودة أو لم تبدأ بعد' });

    trip.status = 'completed';
    trip.actual_arrival_time = new Date();
    trip.odometer_end = req.body.odometer_end || trip.odometer_end;

    if (trip.odometer_start && trip.odometer_end) {
      trip.total_distance_km = trip.odometer_end - trip.odometer_start;
    }

    await trip.save();

    // Notify each passenger's guardian of arrival. notifyDropoff is STATIC and
    // takes (tripId, beneficiaryId) — the old single instance-call with the trip
    // doc threw (undefined method + wrong args) and rejected /complete AFTER the
    // trip was already saved. allSettled so one bad notification can't fail it.
    const recipients = (trip.passengers || []).filter(p => p.beneficiary_id);
    await Promise.allSettled(
      recipients.map(p => ParentNotificationService.notifyDropoff(trip._id, p.beneficiary_id))
    );

    res.json({
      success: true,
      data: trip,
      notifications_sent: recipients.length,
      message: 'تم إنهاء الرحلة',
    });
  })
);

// POST /transport-module/trips/:id/cancel — إلغاء الرحلة
router.post(
  '/trips/:id/cancel',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.id,
        deleted_at: null,
        status: { $in: ['scheduled', 'in_progress'] },
        ...branchScope(req),
      },
      {
        status: 'cancelled',
        cancellation_reason: req.body.reason,
        cancelled_at: new Date(),
        cancelled_by: req.user?._id,
      },
      { returnDocument: 'after' }
    );
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: 'الرحلة غير موجودة أو لا يمكن إلغاؤها' });
    res.json({ success: true, data: trip, message: 'تم إلغاء الرحلة' });
  })
);

// GET /transport-module/inspection/checklist — قالب بنود الفحص (مرفقات + داخلي + أمان)
router.get(
  '/inspection/checklist',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: getPreTripChecklist() });
  })
);

// POST /transport-module/trips/:id/inspection — فحص ما قبل الرحلة
router.post(
  '/trips/:id/inspection',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    // Caller must be the driver assigned to this trip (or admin role)
    const role = String(req.user?.role || req.user?.roleCode || '').toUpperCase();
    const isAdmin = GPS_ADMIN_ROLES.has(role);
    if (!isAdmin && String(trip.driver_id) !== String(req.user?._id || req.user?.id)) {
      // W413: unify with 404 (anti-existence-probe). Non-admin caller who
      // isn't the assigned driver can't distinguish "trip exists but
      // assigned to another driver" from "trip doesn't exist". Matches
      // W411/W412 doctrine.
      return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    }

    const { results, notes, odometer_start, fuel_level } = req.body;
    if (!results || typeof results !== 'object') {
      return res
        .status(400)
        .json({ success: false, message: 'يجب إرسال نتائج الفحص (results: {key: boolean})' });
    }

    let validated;
    try {
      validated = validatePreTripInspection(results);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    trip.pre_trip_inspection = {
      completed: validated.passed,
      completed_at: new Date(),
      fuel_level: fuel_level || undefined,
      odometer_start: odometer_start || undefined,
      notes,
      // Persist the boolean snapshot per checklist key — schema accepts these
      tire_condition: results.tires_condition ?? results.tire_condition,
      lights_working: results.lights_working,
      brakes_ok: results.brakes,
      first_aid_kit: results.first_aid_kit,
      fire_extinguisher: results.fire_extinguisher,
      seat_belts_ok: results.seat_belts,
      wheelchair_lock_ok: results.wheelchair_locks,
      ac_working: results.ac_working,
      cleanliness_ok: results.clean_interior,
    };

    await trip.save();

    res.json({
      success: true,
      data: {
        trip,
        inspection: {
          passed: validated.passed,
          failedRequired: validated.failedRequired,
          failedOptional: validated.failedOptional,
        },
      },
      message: validated.passed
        ? 'الفحص مكتمل — الرحلة مسموح بها'
        : 'الفحص غير ناجح — يوجد بنود إلزامية فاشلة',
    });
  })
);

// POST /transport-module/trips/:id/pickup — تسجيل استلام مستفيد
router.post(
  '/trips/:id/pickup/:beneficiaryId',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const passenger = trip.passengers.find(
      p => p.beneficiary_id?.toString() === req.params.beneficiaryId
    );
    if (!passenger)
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود في الرحلة' });

    // The passenger subdoc has a single `status` + `pickup_time_actual` —
    // `pickup_status`/`actual_pickup_time` were phantom paths (strict mode
    // dropped them → the pickup was never recorded).
    passenger.status = 'picked_up';
    passenger.pickup_time_actual = new Date();
    await trip.save();

    // notifyPickup is a STATIC method (was called on an instance → undefined →
    // crash) and takes a tripId, not the doc. Fire-and-forget so a notification
    // failure never undoes a recorded pickup.
    ParentNotificationService.notifyPickup(trip._id, passenger.beneficiary_id).catch(() => {});

    res.json({ success: true, data: passenger, message: 'تم تسجيل استلام المستفيد' });
  })
);

// POST /transport-module/trips/:id/dropoff/:beneficiaryId — تسجيل توصيل مستفيد
router.post(
  '/trips/:id/dropoff/:beneficiaryId',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const passenger = trip.passengers.find(
      p => p.beneficiary_id?.toString() === req.params.beneficiaryId
    );
    if (!passenger)
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود في الرحلة' });

    // `dropoff_status`/`actual_dropoff_time` were phantom paths — the real
    // fields are `status` + `dropoff_time_actual`.
    passenger.status = 'dropped_off';
    passenger.dropoff_time_actual = new Date();
    await trip.save();

    // notifyDropoff is STATIC + takes a tripId; fire-and-forget.
    ParentNotificationService.notifyDropoff(trip._id, passenger.beneficiary_id).catch(() => {});

    res.json({ success: true, data: passenger, message: 'تم تسجيل توصيل المستفيد' });
  })
);

// DELETE /transport-module/trips/:id
router.delete(
  '/trips/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'scheduled', ...branchScope(req) },
      { deleted_at: new Date() },
      { returnDocument: 'after' }
    );
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: 'الرحلة غير موجودة أو لا يمكن حذفها' });
    res.json({ success: true, message: 'تم حذف الرحلة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. GPS TRACKING — تتبع GPS
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/gps/:vehicleId/live — الموقع الحي للمركبة
router.get(
  '/gps/:vehicleId/live',
  asyncHandler(async (req, res) => {
    // W1574: gate on the vehicle's branch (GpsTracking has no branch field) so a
    // foreign vehicle's live position/track can't be read cross-branch.
    if (!mongoose.isValidObjectId(req.params.vehicleId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const veh = await Vehicle.findOne({
      _id: req.params.vehicleId,
      deleted_at: null,
      ...branchScope(req),
    })
      .select('_id')
      .lean();
    if (!veh) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    const lastPoint = await GpsTracking.findOne({ vehicle_id: req.params.vehicleId })
      .sort({ timestamp: -1 })
      .select('latitude longitude speed heading altitude accuracy timestamp trip_id');

    if (!lastPoint) return res.status(404).json({ success: false, message: 'لا تتوفر بيانات GPS' });

    // إضافة معلومات الرحلة النشطة
    const activeTrip = await Trip.findOne({
      vehicle_id: req.params.vehicleId,
      status: 'in_progress',
      ...branchScope(req),
    }).select('trip_number route_id passengers');

    // W1553: getTrackingLink is a STATIC async method on ParentNotificationService —
    // it was called on an INSTANCE (`notificationService.…`) → undefined → TypeError
    // → every live-GPS request 500'd; the args were also swapped. Call the static with
    // the correct (tripId, vehicleId) order and await it before responding.
    const trackingLink = await ParentNotificationService.getTrackingLink(
      activeTrip?._id,
      req.params.vehicleId
    );
    res.json({
      success: true,
      data: {
        gps: lastPoint,
        active_trip: activeTrip,
        tracking_link: trackingLink,
      },
    });
  })
);

// POST /transport-module/gps — رفع نقطة GPS (من التطبيق في المركبة)
router.post(
  '/gps',
  gpsLimiter,
  authorizeVehicleWrite,
  asyncHandler(async (req, res) => {
    const { vehicle_id, trip_id, ...point } = req.body;

    if (!vehicle_id || !mongoose.Types.ObjectId.isValid(vehicle_id)) {
      return res.status(400).json({ success: false, message: 'معرّف المركبة غير صالح' });
    }
    const err = validateGpsPoint(point);
    if (err) return res.status(400).json({ success: false, message: err });

    const speedLimit = point.speed_limit || 120;
    const gpsPoint = await GpsTracking.create({
      vehicle_id,
      trip_id: trip_id && mongoose.Types.ObjectId.isValid(trip_id) ? trip_id : null,
      timestamp: point.timestamp ? new Date(point.timestamp) : new Date(),
      latitude: point.latitude,
      longitude: point.longitude,
      speed: point.speed || 0,
      heading: point.heading,
      altitude: point.altitude,
      accuracy: point.accuracy,
      engine_on: point.engine_on !== false,
      speed_limit: speedLimit,
      is_speeding: (point.speed || 0) > speedLimit,
      odometer: point.odometer,
      fuel_level: point.fuel_level,
    });

    // تحديث آخر موقع معروف للمركبة (الحقول الصحيحة في موديل Vehicle)
    await Vehicle.findByIdAndUpdate(vehicle_id, {
      last_known_lat: point.latitude,
      last_known_lng: point.longitude,
      last_gps_update: new Date(),
    });

    res
      .status(201)
      .json({ success: true, data: { _id: gpsPoint._id }, message: 'تم تسجيل الموقع' });
  })
);

// POST /transport-module/gps/batch — رفع دفعة GPS (للأجهزة بدون شبكة مستقرة)
router.post(
  '/gps/batch',
  gpsBatchLimiter,
  authorizeVehicleWrite,
  asyncHandler(async (req, res) => {
    const { vehicle_id, trip_id, points } = req.body;

    if (!vehicle_id || !mongoose.Types.ObjectId.isValid(vehicle_id)) {
      return res.status(400).json({ success: false, message: 'معرّف المركبة غير صالح' });
    }
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ success: false, message: 'الدفعة فارغة' });
    }
    if (points.length > MAX_GPS_BATCH) {
      return res
        .status(413)
        .json({ success: false, message: `الحد الأقصى ${MAX_GPS_BATCH} نقطة في الدفعة` });
    }

    const docs = [];
    const errors = [];
    for (let i = 0; i < points.length; i++) {
      const err = validateGpsPoint(points[i]);
      if (err) {
        errors.push({ index: i, error: err });
        continue;
      }
      const p = points[i];
      const speedLimit = p.speed_limit || 120;
      docs.push({
        vehicle_id,
        trip_id: trip_id && mongoose.Types.ObjectId.isValid(trip_id) ? trip_id : null,
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed || 0,
        heading: p.heading,
        altitude: p.altitude,
        accuracy: p.accuracy,
        engine_on: p.engine_on !== false,
        speed_limit: speedLimit,
        is_speeding: (p.speed || 0) > speedLimit,
        odometer: p.odometer,
        fuel_level: p.fuel_level,
      });
    }

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد نقاط صالحة', errors });
    }

    const inserted = await GpsTracking.insertMany(docs, { ordered: false });
    const latest = docs.reduce((acc, p) =>
      !acc || new Date(p.timestamp) > new Date(acc.timestamp) ? p : acc
    );
    await Vehicle.findByIdAndUpdate(vehicle_id, {
      last_known_lat: latest.latitude,
      last_known_lng: latest.longitude,
      last_gps_update: new Date(latest.timestamp),
    });

    res.status(201).json({
      success: true,
      inserted: inserted.length,
      rejected: errors.length,
      errors,
      message: 'تم رفع الدفعة',
    });
  })
);

// GET /transport-module/gps/:vehicleId/history — تاريخ مسار المركبة
router.get(
  '/gps/:vehicleId/history',
  asyncHandler(async (req, res) => {
    // W1574: gate on the vehicle's branch (GpsTracking has no branch field).
    if (!mongoose.isValidObjectId(req.params.vehicleId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const veh = await Vehicle.findOne({
      _id: req.params.vehicleId,
      deleted_at: null,
      ...branchScope(req),
    })
      .select('_id')
      .lean();
    if (!veh) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    const { from_date, to_date, trip_id, limit = 500 } = req.query;
    const filter = { vehicle_id: req.params.vehicleId };

    if (trip_id) filter.trip_id = trip_id;
    if (from_date || to_date) {
      filter.timestamp = {};
      if (from_date) filter.timestamp.$gte = new Date(from_date);
      if (to_date) filter.timestamp.$lte = new Date(to_date);
    }

    const points = await GpsTracking.find(filter)
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .select('latitude longitude speed heading timestamp');

    res.json({ success: true, data: points, count: points.length });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. VEHICLE MAINTENANCE — صيانة المركبات
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/maintenance
router.get(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const {
      vehicle_id,
      maintenance_type,
      status,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null, ...branchScope(req) }; // W1553: enforce branch isolation

    if (vehicle_id) filter.vehicle_id = vehicle_id;
    if (maintenance_type) filter.maintenance_type = maintenance_type;
    if (status) filter.status = status;
    if (from_date || to_date) {
      filter.maintenance_date = {};
      if (from_date) filter.maintenance_date.$gte = new Date(from_date);
      if (to_date) filter.maintenance_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await VehicleMaintenance.countDocuments(filter);
    const records = await VehicleMaintenance.find(filter)
      .populate('vehicle_id', 'plate_number vehicle_number make model')
      .populate('performed_by', 'name')
      .sort({ maintenance_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // تكلفة إجمالية
    const costStats = await VehicleMaintenance.aggregate([
      { $match: { deleted_at: null, ...branchScope(req) } },
      {
        $group: {
          _id: '$maintenance_type',
          total_cost: { $sum: '$total_cost' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: records,
      costStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /transport-module/maintenance/:id
router.get(
  '/maintenance/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const record = await VehicleMaintenance.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) })
      .populate('vehicle_id', 'plate_number make model year')
      .populate('performed_by', 'name')
      .populate('approved_by', 'name');
    if (!record) return res.status(404).json({ success: false, message: 'سجل الصيانة غير موجود' });
    res.json({ success: true, data: record });
  })
);

// POST /transport-module/maintenance
router.post(
  '/maintenance',
  asyncHandler(async (req, res) => {
    // W1553: pin branch_id to the caller's branch (don't let the body plant a
    // maintenance record in another branch); cross-branch roles keep the body value.
    const record = new VehicleMaintenance({
      ...req.body,
      ...branchScope(req),
      created_by: req.user?._id,
    });
    await record.save();

    // تحديث بيانات الصيانة في المركبة
    if (record.next_maintenance_date) {
      await Vehicle.findByIdAndUpdate(record.vehicle_id, {
        next_maintenance_date: record.next_maintenance_date,
        last_maintenance_date: record.maintenance_date,
        last_maintenance_km: record.odometer_reading,
      });
    }

    res.status(201).json({ success: true, data: record, message: 'تم تسجيل الصيانة بنجاح' });
  })
);

// PUT /transport-module/maintenance/:id
router.put(
  '/maintenance/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { _created_by, ...updateData } = req.body;
    const record = await VehicleMaintenance.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { ...updateData, updated_at: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'سجل الصيانة غير موجود' });
    res.json({ success: true, data: record, message: 'تم تحديث سجل الصيانة' });
  })
);

// DELETE /transport-module/maintenance/:id
router.delete(
  '/maintenance/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const record = await VehicleMaintenance.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, ...branchScope(req) },
      { deleted_at: new Date() },
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ success: false, message: 'سجل الصيانة غير موجود' });
    res.json({ success: true, message: 'تم حذف سجل الصيانة' });
  })
);

// GET /transport-module/maintenance/alerts/due-soon — تنبيهات الصيانة القادمة
router.get(
  '/maintenance/alerts/due-soon',
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days || '14');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const dueVehicles = await Vehicle.find({
      deleted_at: null,
      status: 'active',
      next_maintenance_date: { $lte: futureDate },
    }).select('plate_number vehicle_number make model next_maintenance_date current_odometer');

    res.json({
      success: true,
      data: dueVehicles,
      count: dueVehicles.length,
      days_ahead: daysAhead,
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. REPORTS — التقارير
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/reports/summary — ملخص النقل
router.get(
  '/reports/summary',
  asyncHandler(async (req, res) => {
    const { from_date, to_date, branch_id } = req.query;
    const tripFilter = { deleted_at: null, ...branchScope(req) }; // W1553: enforce branch isolation
    if (from_date || to_date) {
      tripFilter.trip_date = {};
      if (from_date) tripFilter.trip_date.$gte = new Date(from_date);
      if (to_date) tripFilter.trip_date.$lte = new Date(to_date);
    }
    if (branch_id) tripFilter.branch_id = branch_id;

    const [tripStats, fleetStats, maintenanceCost] = await Promise.all([
      Trip.aggregate([
        { $match: tripFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_passengers: { $sum: { $size: { $ifNull: ['$passengers', []] } } },
            total_distance: { $sum: '$total_distance_km' },
          },
        },
      ]),
      Vehicle.aggregate([
        { $match: { deleted_at: null, ...branchScope(req) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      VehicleMaintenance.aggregate([
        { $match: { deleted_at: null, ...branchScope(req) } },
        {
          $group: {
            _id: null,
            total_cost: { $sum: '$total_cost' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        tripStats,
        fleetStats,
        maintenanceCost: maintenanceCost[0] || { total_cost: 0, count: 0 },
      },
    });
  })
);

// GET /transport-module/reports/daily — تقرير يومي للرحلات
router.get(
  '/reports/daily',
  asyncHandler(async (req, res) => {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trips = await Trip.find({
      deleted_at: null,
      trip_date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('vehicle_id', 'plate_number vehicle_type')
      .populate('driver_id', 'name')
      .populate('route_id', 'route_name_ar')
      .sort({ departure_time: 1 });

    const summary = {
      date: targetDate.toISOString().split('T')[0],
      total_trips: trips.length,
      completed: trips.filter(t => t.status === 'completed').length,
      in_progress: trips.filter(t => t.status === 'in_progress').length,
      scheduled: trips.filter(t => t.status === 'scheduled').length,
      cancelled: trips.filter(t => t.status === 'cancelled').length,
      total_passengers: trips.reduce((sum, t) => sum + (t.passengers?.length || 0), 0),
    };

    res.json({ success: true, data: { trips, summary } });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 7. SMART DRIVER — رحلة السائق الذكية
// ══════════════════════════════════════════════════════════════════════════════

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// GET /transport-module/driver/my-trip-today
// السائق المسجّل دخوله يحصل على رحلته اليوم مع ترتيب المحطات + روابط ملاحة
router.get(
  '/driver/my-trip-today',
  asyncHandler(async (req, res) => {
    const driverId = req.user?._id || req.user?.id;
    if (!driverId) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول كسائق' });
    }

    const trip = await Trip.findOne({
      driver_id: driverId,
      deleted_at: null,
      trip_date: { $gte: startOfToday(), $lte: endOfToday() },
      status: { $in: ['scheduled', 'in_progress', 'delayed'] },
    })
      .populate(
        'vehicle_id',
        'license_plate vehicle_type capacity make model last_known_lat last_known_lng'
      )
      .populate(
        'passengers.beneficiary_id',
        'full_name_ar file_number guardian_name guardian_phone address national_address'
      )
      .populate({
        path: 'route_id',
        select: 'route_number route_name_ar waypoints total_distance_km estimated_duration_minutes',
        populate: { path: 'waypoints.beneficiary_id', select: 'full_name_ar guardian_phone' },
      })
      .sort({ scheduled_departure: 1 });

    if (!trip) {
      return res.json({
        success: true,
        data: null,
        message: 'لا توجد رحلة مجدولة لك اليوم',
      });
    }

    // آخر موقع للمركبة
    const lastGps = trip.vehicle_id
      ? await GpsTracking.findOne({ vehicle_id: trip.vehicle_id._id })
          .sort({ timestamp: -1 })
          .select('latitude longitude speed heading timestamp')
      : null;

    // ركاب تم استلامهم / توصيلهم
    const visitedIds = (trip.passengers || [])
      .filter(p => p.status === 'picked_up' || p.status === 'dropped_off')
      .map(p => p.beneficiary_id?._id || p.beneficiary_id);

    const orderedWaypoints = [...(trip.route_id?.waypoints || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    const navigationLinks = buildNavigationLinks(orderedWaypoints);

    // multi-stop link من الموقع الحالي للمركبة
    const origin = lastGps
      ? { latitude: lastGps.latitude, longitude: lastGps.longitude }
      : trip.vehicle_id?.last_known_lat
        ? { latitude: trip.vehicle_id.last_known_lat, longitude: trip.vehicle_id.last_known_lng }
        : null;
    const fullRouteUrl = origin ? buildMultiStopGoogleMapsUrl(origin, orderedWaypoints) : null;

    // ETA حي إذا توفر GPS
    const liveEta = lastGps
      ? computeLiveEta(
          { latitude: lastGps.latitude, longitude: lastGps.longitude },
          orderedWaypoints,
          visitedIds.map(String)
        )
      : [];

    // المحطة التالية + هل السائق داخل geofence؟
    const nextStop = lastGps
      ? nearestUnvisitedWaypoint(
          { latitude: lastGps.latitude, longitude: lastGps.longitude },
          orderedWaypoints,
          visitedIds.map(String)
        )
      : null;

    res.json({
      success: true,
      data: {
        trip: {
          _id: trip._id,
          trip_number: trip.trip_number,
          trip_type: trip.trip_type,
          status: trip.status,
          scheduled_departure: trip.scheduled_departure,
          actual_departure: trip.actual_departure,
          pre_trip_inspection_completed: trip.pre_trip_inspection?.completed || false,
          total_passengers: trip.total_passengers,
          picked_up_count: trip.picked_up_count,
          absent_count: trip.absent_count,
        },
        vehicle: trip.vehicle_id,
        route: {
          _id: trip.route_id?._id,
          route_number: trip.route_id?.route_number,
          route_name_ar: trip.route_id?.route_name_ar,
          total_distance_km: trip.route_id?.total_distance_km,
          estimated_duration_minutes: trip.route_id?.estimated_duration_minutes,
          waypoints: orderedWaypoints,
        },
        passengers: trip.passengers,
        gps: lastGps,
        nextStop,
        liveEta,
        navigationLinks,
        fullRouteUrl,
        geofence_radius_meters: GEOFENCE_RADIUS_METERS,
      },
    });
  })
);

// POST /transport-module/driver/trips/:id/pickup-at
// السائق يضغط "وصلت" — يتم التحقق من GPS وتسجيل الاستلام تلقائياً
router.post(
  '/driver/trips/:id/pickup-at',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const driverId = req.user?._id || req.user?.id;
    const { latitude, longitude, beneficiary_id, force } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ success: false, message: 'إحداثيات GPS مطلوبة' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) }).populate({
      path: 'route_id',
      select: 'waypoints',
    });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (String(trip.driver_id) !== String(driverId)) {
      // W413: unify with 404 (anti-existence-probe). Non-admin caller who
      // isn't the assigned driver can't distinguish "trip exists but
      // assigned to another driver" from "trip doesn't exist". Matches
      // W411/W412 doctrine.
      return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    }

    let passenger;
    if (beneficiary_id) {
      passenger = trip.passengers.find(p => String(p.beneficiary_id) === String(beneficiary_id));
    } else {
      // اختر المستفيد الأقرب جغرافياً ضمن المحطات غير المزارة
      const unvisited = (trip.route_id?.waypoints || []).filter(wp => {
        if (!wp.beneficiary_id || wp.lat == null) return false;
        const p = trip.passengers.find(
          pp => String(pp.beneficiary_id) === String(wp.beneficiary_id)
        );
        return p && p.status === 'scheduled';
      });
      const nearest = nearestUnvisitedWaypoint({ latitude, longitude }, unvisited);
      if (nearest) {
        passenger = trip.passengers.find(
          p => String(p.beneficiary_id) === String(nearest.waypoint.beneficiary_id)
        );
      }
    }

    if (!passenger) {
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد مستفيد قريب من موقعك ضمن قائمة الرحلة' });
    }

    // تحقق من القرب الجغرافي مع المحطة
    const wp = trip.route_id?.waypoints?.find(
      w => String(w.beneficiary_id) === String(passenger.beneficiary_id)
    );
    let distanceMeters = null;
    if (wp && wp.lat != null && wp.lng != null) {
      distanceMeters = Math.round(haversineDistanceMeters(latitude, longitude, wp.lat, wp.lng));
      if (distanceMeters > GEOFENCE_RADIUS_METERS && !force) {
        return res.status(409).json({
          success: false,
          message: `أنت ${distanceMeters}م من المستفيد. اقترب أو أعد المحاولة مع force=true`,
          distanceMeters,
          geofence_radius_meters: GEOFENCE_RADIUS_METERS,
          beneficiary_id: passenger.beneficiary_id,
        });
      }
    }

    passenger.status = 'picked_up';
    passenger.pickup_time_actual = new Date();
    passenger.pickup_lat = latitude;
    passenger.pickup_lng = longitude;
    await trip.save();

    // ── Phase J: notify the guardian (fire-and-forget) ──
    const BeneficiaryM = mongoose.models.Beneficiary;
    const VehicleM = mongoose.models.TransportVehicle || mongoose.models.Vehicle;
    if (BeneficiaryM) {
      Promise.all([
        BeneficiaryM.findById(passenger.beneficiary_id)
          .populate('guardians', 'phone alternatePhone name')
          .lean(),
        VehicleM ? VehicleM.findById(trip.vehicle_id).select('license_plate').lean() : null,
      ])
        .then(([ben, veh]) => {
          if (!ben) return;
          parentNotifications.sendAsync({
            beneficiary: ben,
            body: parentNotifications.buildPickupMessage({
              beneficiary: ben,
              vehicle: veh,
              when: passenger.pickup_time_actual,
            }),
            templateKey: 'transport.pickup',
            metadata: { tripId: String(trip._id), beneficiaryId: String(ben._id) },
          });
        })
        .catch(() => {});
    }

    // Audit: any pickup with force=true OR distance > geofence is a
    // bypass that operations needs visibility into.
    const isBypass =
      force === true || (distanceMeters != null && distanceMeters > GEOFENCE_RADIUS_METERS);
    if (isBypass) {
      auditAsync({
        eventType: 'security.suspicious_activity',
        eventCategory: 'security',
        severity: 'medium',
        status: 'success',
        userId: req.user?._id || req.user?.id,
        userRole: req.user?.role || req.user?.roleCode,
        ipAddress: req.ip,
        resource: `trip:${trip._id}`,
        message: `تسجيل استلام خارج النطاق الجغرافي (${distanceMeters ?? '?'}م)`,
        metadata: {
          custom: {
            tripId: String(trip._id),
            beneficiaryId: String(passenger.beneficiary_id),
            distanceMeters,
            geofenceRadiusMeters: GEOFENCE_RADIUS_METERS,
            forceFlag: force === true,
            lat: latitude,
            lng: longitude,
          },
        },
        flags: { requiresReview: true, isSuspicious: true },
        tags: ['transport', 'geofence-bypass'],
      });
    }

    res.json({
      success: true,
      data: {
        beneficiary_id: passenger.beneficiary_id,
        status: passenger.status,
        distanceMeters,
        pickup_time: passenger.pickup_time_actual,
        audited_bypass: isBypass,
      },
      message: 'تم تسجيل استلام المستفيد',
    });
  })
);

// POST /transport-module/driver/trips/:id/dropoff-at
router.post(
  '/driver/trips/:id/dropoff-at',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const driverId = req.user?._id || req.user?.id;
    const { latitude, longitude, beneficiary_id } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !beneficiary_id) {
      return res
        .status(400)
        .json({ success: false, message: 'إحداثيات GPS و beneficiary_id مطلوبة' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (String(trip.driver_id) !== String(driverId)) {
      // W413: unify with 404 (anti-existence-probe). Non-admin caller who
      // isn't the assigned driver can't distinguish "trip exists but
      // assigned to another driver" from "trip doesn't exist". Matches
      // W411/W412 doctrine.
      return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    }

    const passenger = trip.passengers.find(
      p => String(p.beneficiary_id) === String(beneficiary_id)
    );
    if (!passenger) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود في الرحلة' });
    }

    passenger.status = 'dropped_off';
    passenger.dropoff_time_actual = new Date();
    await trip.save();

    // ── Phase J: notify the guardian (fire-and-forget) ──
    const BeneficiaryDropoff = mongoose.models.Beneficiary;
    if (BeneficiaryDropoff) {
      BeneficiaryDropoff.findById(passenger.beneficiary_id)
        .populate('guardians', 'phone alternatePhone name')
        .lean()
        .then(ben => {
          if (!ben) return;
          parentNotifications.sendAsync({
            beneficiary: ben,
            body: parentNotifications.buildDropoffMessage({
              beneficiary: ben,
              when: passenger.dropoff_time_actual,
            }),
            templateKey: 'transport.dropoff',
            metadata: { tripId: String(trip._id), beneficiaryId: String(ben._id) },
          });
        })
        .catch(() => {});
    }

    res.json({
      success: true,
      data: {
        beneficiary_id,
        status: passenger.status,
        dropoff_time: passenger.dropoff_time_actual,
      },
      message: 'تم تسجيل توصيل المستفيد',
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 8. DISPATCHER LIVE — لوحة المراقبة الحية
// ══════════════════════════════════════════════════════════════════════════════

// GET /transport-module/live-fleet — كل المركبات النشطة + موقعها الحالي
router.get(
  '/live-fleet',
  asyncHandler(async (req, res) => {
    const { branch_id } = req.query;
    const vehicleFilter = { deleted_at: null, status: 'active', ...branchScope(req) }; // W1553: enforce branch isolation
    if (branch_id) vehicleFilter.branch_id = branch_id;

    const vehicles = await Vehicle.find(vehicleFilter)
      .select(
        'license_plate vehicle_number vehicle_type make model last_known_lat last_known_lng last_gps_update branch_id current_driver_id'
      )
      .populate('current_driver_id', 'name phone')
      .populate('branch_id', 'name_ar')
      .lean();

    const vehicleIds = vehicles.map(v => v._id);
    const activeTrips = await Trip.find({
      vehicle_id: { $in: vehicleIds },
      status: 'in_progress',
      deleted_at: null,
    })
      .select('trip_number trip_type vehicle_id route_id picked_up_count total_passengers')
      .populate('route_id', 'route_name_ar route_number')
      .lean();
    const tripByVehicle = new Map(activeTrips.map(t => [String(t.vehicle_id), t]));

    // تنبيهات: مركبات بدون GPS لأكثر من 10 دقائق
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const fleet = vehicles.map(v => {
      const stale = !v.last_gps_update || new Date(v.last_gps_update).getTime() < tenMinAgo;
      return {
        _id: v._id,
        license_plate: v.license_plate,
        vehicle_number: v.vehicle_number,
        vehicle_type: v.vehicle_type,
        make: v.make,
        model: v.model,
        branch: v.branch_id,
        driver: v.current_driver_id,
        latitude: v.last_known_lat ?? null,
        longitude: v.last_known_lng ?? null,
        last_gps_update: v.last_gps_update,
        gps_stale: stale,
        active_trip: tripByVehicle.get(String(v._id)) || null,
      };
    });

    res.json({
      success: true,
      data: fleet,
      summary: {
        total: fleet.length,
        with_gps: fleet.filter(f => f.latitude != null).length,
        on_active_trip: fleet.filter(f => f.active_trip).length,
        stale_gps: fleet.filter(f => f.gps_stale && f.latitude != null).length,
      },
    });
  })
);

// GET /transport-module/trips/:id/live-eta — حساب ETA الحي للرحلة من آخر GPS
router.get(
  '/trips/:id/live-eta',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) })
      .populate({ path: 'route_id', select: 'waypoints' })
      .select('vehicle_id route_id passengers');

    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const lastGps = await GpsTracking.findOne({ vehicle_id: trip.vehicle_id })
      .sort({ timestamp: -1 })
      .select('latitude longitude speed timestamp');
    if (!lastGps) {
      return res.json({ success: true, data: { eta: [], message: 'لا تتوفر بيانات GPS' } });
    }

    const visitedIds = (trip.passengers || [])
      .filter(p => p.status === 'picked_up' || p.status === 'dropped_off')
      .map(p => String(p.beneficiary_id));

    const eta = computeLiveEta(
      { latitude: lastGps.latitude, longitude: lastGps.longitude },
      trip.route_id?.waypoints || [],
      visitedIds
    );

    res.json({
      success: true,
      data: {
        gps: lastGps,
        eta,
        computed_at: new Date(),
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 9. PARENT TRACKING — تتبع أولياء الأمور (Public, signed token)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// 10. DRIVER SAFETY SCORE — Phase F
// ══════════════════════════════════════════════════════════════════════════════

function periodFilter(query) {
  const days = parseInt(query.days || '7', 10);
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(90, days)));
  return { since, days };
}

// GET /transport-module/safety/drivers/:driverId — نقاط سائق واحد
router.get(
  '/safety/drivers/:driverId',
  validateObjectId('driverId'),
  asyncHandler(async (req, res) => {
    const { since, days } = periodFilter(req.query);
    const driverTrips = await Trip.find({
      driver_id: req.params.driverId,
      deleted_at: null,
      trip_date: { $gte: since },
    })
      .select('vehicle_id status trip_date')
      .lean();

    const vehicleIds = [...new Set(driverTrips.map(t => String(t.vehicle_id)))];
    const points = vehicleIds.length
      ? await GpsTracking.find({
          vehicle_id: { $in: vehicleIds },
          timestamp: { $gte: since },
        })
          .sort({ timestamp: 1 })
          .select('speed is_speeding is_outside_geofence engine_on timestamp')
          .lean()
      : [];

    const result = computeDriverScore(points, driverTrips);
    res.json({
      success: true,
      data: { driverId: req.params.driverId, period_days: days, ...result },
    });
  })
);

// GET /transport-module/safety/drivers/:driverId/fatigue — حالة إرهاق السائق اليوم
router.get(
  '/safety/drivers/:driverId/fatigue',
  validateObjectId('driverId'),
  asyncHandler(async (req, res) => {
    // Find vehicles the driver has trips on today (fatigue resets each day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTrips = await Trip.find({
      driver_id: req.params.driverId,
      deleted_at: null,
      trip_date: { $gte: startOfDay },
    })
      .select('vehicle_id')
      .lean();

    const vehicleIds = [...new Set(todayTrips.map(t => String(t.vehicle_id)))];

    let points = [];
    if (vehicleIds.length > 0) {
      points = await GpsTracking.find({
        vehicle_id: { $in: vehicleIds.map(id => new mongoose.Types.ObjectId(id)) },
        timestamp: { $gte: startOfDay },
      })
        .sort({ timestamp: 1 })
        .select('timestamp speed')
        .lean();
    }

    const result = analyzeFatigue({ points, trips: todayTrips });
    res.json({
      success: true,
      data: { driverId: req.params.driverId, ...result },
    });
  })
);

// GET /transport-module/safety/leaderboard — ترتيب السائقين
router.get(
  '/safety/leaderboard',
  asyncHandler(async (req, res) => {
    const { since, days } = periodFilter(req.query);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000); // W1182 — DoS cap

    // اجمع كل السائقين الذين قادوا في الفترة
    const trips = await Trip.find({
      deleted_at: null,
      trip_date: { $gte: since },
    })
      .select('driver_id vehicle_id status')
      .lean();

    if (trips.length === 0) {
      return res.json({ success: true, data: [], period_days: days });
    }

    const byDriver = new Map();
    const allVehicleIds = new Set();
    for (const t of trips) {
      const key = String(t.driver_id);
      const vKey = String(t.vehicle_id);
      if (!byDriver.has(key))
        byDriver.set(key, { driverId: key, vehicleIds: new Set(), trips: [] });
      byDriver.get(key).vehicleIds.add(vKey);
      byDriver.get(key).trips.push(t);
      allVehicleIds.add(vKey);
    }

    // ─── single Mongo query for ALL GPS points across the fleet ─────────────
    // Avoids the N+1 fan-out (one query per driver) the previous version had.
    const pointsByVehicle = new Map();
    const objIds = [...allVehicleIds].map(id => new mongoose.Types.ObjectId(id));
    await GpsTracking.find({
      vehicle_id: { $in: objIds },
      timestamp: { $gte: since },
    })
      .sort({ vehicle_id: 1, timestamp: 1 })
      .select('vehicle_id speed is_speeding is_outside_geofence engine_on timestamp')
      .lean()
      .cursor()
      .eachAsync(p => {
        const v = String(p.vehicle_id);
        if (!pointsByVehicle.has(v)) pointsByVehicle.set(v, []);
        pointsByVehicle.get(v).push(p);
      });

    const items = [];
    for (const [driverId, entry] of byDriver) {
      const merged = [];
      for (const vId of entry.vehicleIds) {
        const pts = pointsByVehicle.get(vId);
        if (pts) merged.push(...pts);
      }
      merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const result = computeDriverScore(merged, entry.trips);
      items.push({
        driverId,
        score: result.score,
        grade: result.grade,
        samples: result.samples,
        trips: result.trips,
        speedingIncidents: result.breakdown.speeding.incidents,
        harshEvents: result.breakdown.harsh.accel + result.breakdown.harsh.brake,
      });
    }

    const ranked = rankDrivers(items).slice(0, limit);

    // Populate names
    const Employee = mongoose.models.Employee || mongoose.models.HREmployee;
    let driverNames = new Map();
    if (Employee) {
      const employees = await Employee.find({
        _id: { $in: ranked.map(r => r.driverId) },
      })
        .select('name phone')
        .lean();
      driverNames = new Map(employees.map(e => [String(e._id), e]));
    }

    res.json({
      success: true,
      data: ranked.map(r => ({
        ...r,
        name: driverNames.get(r.driverId)?.name || null,
        phone: driverNames.get(r.driverId)?.phone || null,
      })),
      period_days: days,
    });
  })
);

// GET /transport-module/notifications/logs — سجل الإشعارات المرسلة (admin)
router.get(
  '/notifications/logs',
  asyncHandler(async (req, res) => {
    const role = String(req.user?.role || req.user?.roleCode || '').toUpperCase();
    if (!GPS_ADMIN_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'صلاحية المدير مطلوبة' });
    }

    const { channel, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    // Only transport-tagged entries (templateKey starts with "transport.")
    filter.templateKey = { $regex: '^transport\\.' };
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    const NotificationLog =
      mongoose.models.NotificationDeliveryLog ||
      (() => {
        try {
          return require('../services/unifiedNotifier').NotificationDeliveryLog;
        } catch {
          return null;
        }
      })();
    if (!NotificationLog) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit, pages: 0 },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await NotificationLog.countDocuments(filter);
    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// POST /transport-module/trips/:id/tracking-token — توليد رابط تتبع لولي الأمر
router.post(
  '/trips/:id/tracking-token',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, ...branchScope(req) });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const token = signTrackingToken(String(trip._id), TRACKING_TOKEN_SECRET);
    res.json({
      success: true,
      data: {
        token,
        track_url: `/track/${token}`,
        expires_in_hours: 6,
      },
    });
  })
);

module.exports = router;
