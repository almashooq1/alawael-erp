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
const router = express.Router();
const mongoose = require('mongoose');

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

const routeOptimizer = new RouteOptimizationService();
const inspectionService = new PreTripInspectionService();
const notificationService = new ParentNotificationService();

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
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (vehicle_type) filter.vehicle_type = vehicle_type;
    if (branch_id) filter.branch_id = branch_id;
    if (wheelchair_accessible !== undefined)
      filter.wheelchair_accessible = wheelchair_accessible === 'true';
    if (search) {
      filter.$or = [
        { plate_number: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { vehicle_number: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .populate('assigned_driver_id', 'name phone')
      .populate('branch_id', 'name_ar')
      .sort({ vehicle_number: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // إحصاءات الأسطول
    const fleetStats = await Vehicle.aggregate([
      { $match: { deleted_at: null } },
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
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deleted_at: null })
      .populate('assigned_driver_id', 'name phone license_number')
      .populate('branch_id', 'name_ar');
    if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة' });
    res.json({ success: true, data: vehicle });
  })
);

// POST /transport-module/vehicles
router.post(
  '/vehicles',
  asyncHandler(async (req, res) => {
    const vehicle = new Vehicle({ ...req.body, created_by: req.user?._id });
    await vehicle.save();
    res.status(201).json({ success: true, data: vehicle, message: 'تم إضافة المركبة بنجاح' });
  })
);

// PUT /transport-module/vehicles/:id
router.put(
  '/vehicles/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { plate_number, vehicle_number, created_by, ...updateData } = req.body;
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
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
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), status: 'decommissioned' },
      { new: true }
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
      { _id: req.params.id, deleted_at: null },
      { assigned_driver_id: driver_id, updated_at: new Date() },
      { new: true }
    ).populate('assigned_driver_id', 'name phone');
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
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (branch_id) filter.branch_id = branch_id;
    if (day_of_week) filter.operating_days = day_of_week;
    if (search) {
      filter.$or = [
        { route_name_ar: { $regex: search, $options: 'i' } },
        { route_number: { $regex: search, $options: 'i' } },
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
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null })
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
    const route = new TransportRoute({ ...req.body, created_by: req.user?._id });
    await route.save();
    res.status(201).json({ success: true, data: route, message: 'تم إنشاء المسار بنجاح' });
  })
);

// PUT /transport-module/routes/:id
router.put(
  '/routes/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { route_number, created_by, ...updateData } = req.body;
    const route = await TransportRoute.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
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
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), status: 'inactive' },
      { new: true }
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
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null });
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
    const optimized = routeOptimizer.optimizeRoute(route.waypoints, startPoint);

    // تحديث ترتيب المحطات
    const reorderedWaypoints = optimized.optimizedOrder.map((idx, newOrder) => ({
      ...route.waypoints[idx],
      stop_order: newOrder + 1,
    }));

    route.waypoints = reorderedWaypoints;
    route.estimated_duration_minutes = Math.round(optimized.totalDistance * 2); // تقدير زمني بسيط
    route.total_distance_km = parseFloat(optimized.totalDistance.toFixed(2));
    await route.save();

    res.json({
      success: true,
      data: {
        route,
        optimizationResult: {
          originalDistance: optimized.originalDistance,
          optimizedDistance: optimized.totalDistance,
          improvement: optimized.improvement,
          estimatedTimeSaved: Math.round(
            (optimized.originalDistance - optimized.totalDistance) * 2
          ),
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
    const route = await TransportRoute.findOne({ _id: req.params.id, deleted_at: null });
    if (!route) return res.status(404).json({ success: false, message: 'المسار غير موجود' });

    const newWaypoint = {
      ...req.body,
      stop_order: (route.waypoints?.length || 0) + 1,
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
    const filter = { deleted_at: null };

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
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null })
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
    const trip = new Trip({ ...req.body, created_by: req.user?._id });
    await trip.save();
    res.status(201).json({ success: true, data: trip, message: 'تم إنشاء الرحلة بنجاح' });
  })
);

// PUT /transport-module/trips/:id
router.put(
  '/trips/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { trip_number, created_by, ...updateData } = req.body;
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
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
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null, status: 'scheduled' });
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: 'الرحلة غير موجودة أو لا يمكن بدؤها' });

    // التحقق من فحص ما قبل الرحلة
    if (req.body.skip_inspection !== true && !trip.pre_trip_inspection?.is_cleared) {
      return res.status(400).json({ success: false, message: 'يجب إكمال فحص ما قبل الرحلة أولاً' });
    }

    trip.status = 'in_progress';
    trip.actual_departure_time = new Date();
    await trip.save();

    // إشعار أولياء الأمور بالبدء
    const notifs = await notificationService.notifyPickup(trip);

    res.json({
      success: true,
      data: trip,
      notifications_sent: notifs.length,
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

    // إشعار أولياء الأمور بالوصول
    const notifs = await notificationService.notifyDropoff(trip);

    res.json({
      success: true,
      data: trip,
      notifications_sent: notifs.length,
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
      { _id: req.params.id, deleted_at: null, status: { $in: ['scheduled', 'in_progress'] } },
      {
        status: 'cancelled',
        cancellation_reason: req.body.reason,
        cancelled_at: new Date(),
        cancelled_by: req.user?._id,
      },
      { new: true }
    );
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: 'الرحلة غير موجودة أو لا يمكن إلغاؤها' });
    res.json({ success: true, data: trip, message: 'تم إلغاء الرحلة' });
  })
);

// POST /transport-module/trips/:id/inspection — فحص ما قبل الرحلة
router.post(
  '/trips/:id/inspection',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const { checklist_results, notes } = req.body;
    const inspectionResult = inspectionService.processInspection(checklist_results);

    trip.pre_trip_inspection = {
      performed_at: new Date(),
      performed_by: req.user?._id,
      checklist: checklist_results || [],
      is_cleared: inspectionResult.isCleared,
      critical_failures: inspectionResult.criticalFailures,
      notes,
    };

    await trip.save();

    res.json({
      success: true,
      data: { trip, inspection: inspectionResult },
      message: inspectionResult.isCleared
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
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const passenger = trip.passengers.find(
      p => p.beneficiary_id?.toString() === req.params.beneficiaryId
    );
    if (!passenger)
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود في الرحلة' });

    passenger.pickup_status = 'picked_up';
    passenger.actual_pickup_time = new Date();
    await trip.save();

    // إشعار ولي الأمر
    await notificationService.notifyPickup(trip, passenger.beneficiary_id);

    res.json({ success: true, data: passenger, message: 'تم تسجيل استلام المستفيد' });
  })
);

// POST /transport-module/trips/:id/dropoff/:beneficiaryId — تسجيل توصيل مستفيد
router.post(
  '/trips/:id/dropoff/:beneficiaryId',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOne({ _id: req.params.id, deleted_at: null });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });

    const passenger = trip.passengers.find(
      p => p.beneficiary_id?.toString() === req.params.beneficiaryId
    );
    if (!passenger)
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود في الرحلة' });

    passenger.dropoff_status = 'dropped_off';
    passenger.actual_dropoff_time = new Date();
    await trip.save();

    // إشعار ولي الأمر
    await notificationService.notifyDropoff(trip, passenger.beneficiary_id);

    res.json({ success: true, data: passenger, message: 'تم تسجيل توصيل المستفيد' });
  })
);

// DELETE /transport-module/trips/:id
router.delete(
  '/trips/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'scheduled' },
      { deleted_at: new Date() },
      { new: true }
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
    const lastPoint = await GpsTracking.findOne({ vehicle_id: req.params.vehicleId })
      .sort({ timestamp: -1 })
      .select('latitude longitude speed heading altitude accuracy timestamp trip_id');

    if (!lastPoint) return res.status(404).json({ success: false, message: 'لا تتوفر بيانات GPS' });

    // إضافة معلومات الرحلة النشطة
    const activeTrip = await Trip.findOne({
      vehicle_id: req.params.vehicleId,
      status: 'in_progress',
    }).select('trip_number route_id passengers');

    res.json({
      success: true,
      data: {
        gps: lastPoint,
        active_trip: activeTrip,
        tracking_link: notificationService.getTrackingLink(req.params.vehicleId, activeTrip?._id),
      },
    });
  })
);

// POST /transport-module/gps — رفع نقطة GPS (من التطبيق في المركبة)
router.post(
  '/gps',
  asyncHandler(async (req, res) => {
    const { vehicle_id, latitude, longitude, speed, heading, altitude, accuracy, trip_id } =
      req.body;

    if (!vehicle_id || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'بيانات GPS ناقصة' });
    }

    const gpsPoint = new GpsTracking({
      vehicle_id,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      altitude: altitude || 0,
      accuracy: accuracy || 0,
      trip_id: trip_id || null,
      timestamp: new Date(),
    });

    await gpsPoint.save();

    // تحديث بيانات المركبة
    await Vehicle.findByIdAndUpdate(vehicle_id, {
      'current_location.latitude': latitude,
      'current_location.longitude': longitude,
      'current_location.updated_at': new Date(),
      'current_location.speed': speed || 0,
    });

    res.status(201).json({ success: true, message: 'تم تسجيل الموقع' });
  })
);

// GET /transport-module/gps/:vehicleId/history — تاريخ مسار المركبة
router.get(
  '/gps/:vehicleId/history',
  asyncHandler(async (req, res) => {
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
    const filter = { deleted_at: null };

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
      { $match: { deleted_at: null } },
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
    const record = await VehicleMaintenance.findOne({ _id: req.params.id, deleted_at: null })
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
    const record = new VehicleMaintenance({
      ...req.body,
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
    const { created_by, ...updateData } = req.body;
    const record = await VehicleMaintenance.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
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
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
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
    const tripFilter = { deleted_at: null };
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
        { $match: { deleted_at: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      VehicleMaintenance.aggregate([
        { $match: { deleted_at: null } },
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

module.exports = router;
