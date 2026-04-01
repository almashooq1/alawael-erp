const Vehicle = require('../../models/transport/Vehicle');
const TransportRoute = require('../../models/transport/TransportRoute');
const Trip = require('../../models/transport/Trip');
const GpsTracking = require('../../models/transport/GpsTracking');

// ===== خوارزمية تحسين المسار =====
class RouteOptimizationService {
  /**
   * حساب المسافة بين نقطتين باستخدام Haversine Formula
   */
  static haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * حساب المسافة الكلية لمسار
   */
  static totalDistance(waypoints) {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += RouteOptimizationService.haversineDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
    }
    return total;
  }

  /**
   * Nearest Neighbor Algorithm: نقطة البداية ← أقرب نقطة غير مزارة
   */
  static nearestNeighbor(center, pickupPoints) {
    const points = [...pickupPoints];
    const route = [];
    let current = center;

    while (points.length > 0) {
      let minDist = Infinity;
      let nearestIdx = 0;

      for (let i = 0; i < points.length; i++) {
        const dist = RouteOptimizationService.haversineDistance(
          current.lat,
          current.lng,
          points[i].lat,
          points[i].lng
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      route.push(points[nearestIdx]);
      current = points[nearestIdx];
      points.splice(nearestIdx, 1);
    }
    return route;
  }

  /**
   * 2-opt تحسين: إذا كان تبديل حافتين يقلل المسافة → نفذ التبديل
   */
  static twoOpt(route) {
    let improved = true;
    let bestRoute = [...route];

    while (improved) {
      improved = false;
      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 2; j < bestRoute.length; j++) {
          const newRoute = [
            ...bestRoute.slice(0, i + 1),
            ...bestRoute.slice(i + 1, j + 1).reverse(),
            ...bestRoute.slice(j + 1),
          ];
          if (
            RouteOptimizationService.totalDistance(newRoute) <
            RouteOptimizationService.totalDistance(bestRoute)
          ) {
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }
    return bestRoute;
  }

  /**
   * تحسين مسار كامل: Nearest Neighbor + 2-opt
   */
  static async optimizeRoute(routeId) {
    const route = await TransportRoute.findById(routeId).populate('waypoints.beneficiary_id');
    if (!route) throw new Error('المسار غير موجود');

    const center = {
      lat: route.waypoints.find(w => w.waypoint_type === 'center')?.lat || 24.7136,
      lng: route.waypoints.find(w => w.waypoint_type === 'center')?.lng || 46.6753,
    };
    const pickups = route.waypoints
      .filter(w => w.waypoint_type === 'pickup' && w.lat && w.lng)
      .map(w => ({ ...w.toObject(), order: w.order }));

    if (pickups.length < 2) return route;

    // الخطوة 1: Nearest Neighbor
    const nnRoute = RouteOptimizationService.nearestNeighbor(center, pickups);
    // الخطوة 2: 2-opt تحسين
    const optimizedPickups = RouteOptimizationService.twoOpt(nnRoute);

    // تحديث ترتيب النقاط
    optimizedPickups.forEach((wp, idx) => {
      const waypointIndex = route.waypoints.findIndex(w => w._id.toString() === wp._id.toString());
      if (waypointIndex !== -1) route.waypoints[waypointIndex].order = idx + 1;
    });

    const totalDist = RouteOptimizationService.totalDistance([center, ...optimizedPickups, center]);
    route.total_distance_km = Math.round(totalDist * 10) / 10;
    route.estimated_duration_minutes = Math.round(totalDist * 3); // تقدير: 3 دقائق/كم
    route.optimized = true;
    return route.save();
  }
}

// ===== خدمة فحص ما قبل الرحلة =====
class PreTripInspectionService {
  static getChecklist() {
    return [
      { key: 'fuel_level', label_ar: 'مستوى الوقود', required: true },
      { key: 'tire_condition', label_ar: 'حالة الإطارات', required: true },
      { key: 'lights_working', label_ar: 'الأضواء تعمل', required: true },
      { key: 'brakes_ok', label_ar: 'الفرامل سليمة', required: true },
      { key: 'first_aid_kit', label_ar: 'حقيبة الإسعافات الأولية موجودة', required: true },
      { key: 'fire_extinguisher', label_ar: 'طفاية الحريق موجودة وصالحة', required: true },
      { key: 'seat_belts_ok', label_ar: 'أحزمة الأمان سليمة', required: true },
      { key: 'wheelchair_lock_ok', label_ar: 'قفل الكرسي المتحرك يعمل', required: false },
      { key: 'ac_working', label_ar: 'المكيف يعمل', required: false },
      { key: 'cleanliness_ok', label_ar: 'المركبة نظيفة', required: false },
    ];
  }

  static async completeInspection(tripId, inspectionData, driverId) {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error('الرحلة غير موجودة');
    if (trip.driver_id.toString() !== driverId.toString())
      throw new Error('غير مصرح لك بهذه الرحلة');

    // التحقق من البنود الإلزامية
    const checklist = PreTripInspectionService.getChecklist();
    const requiredItems = checklist.filter(c => c.required);
    for (const item of requiredItems) {
      if (item.key !== 'fuel_level' && inspectionData[item.key] === false) {
        throw new Error(`الفحص الإلزامي فشل: ${item.label_ar}. يجب إصلاحه قبل المغادرة`);
      }
    }

    trip.pre_trip_inspection = {
      ...inspectionData,
      completed: true,
      completed_at: new Date(),
    };
    trip.status = 'in_progress';
    trip.actual_departure = new Date();
    return trip.save();
  }
}

// ===== خدمة إشعارات أولياء الأمور =====
class ParentNotificationService {
  static async notifyPickup(tripId, beneficiaryId) {
    const trip = await Trip.findById(tripId)
      .populate('vehicle_id', 'license_plate')
      .populate('driver_id', 'full_name_ar phone');

    const passenger = trip.passengers.find(
      p => p.beneficiary_id.toString() === beneficiaryId.toString()
    );
    if (!passenger) throw new Error('المستفيد غير مسجل في هذه الرحلة');

    passenger.status = 'picked_up';
    passenger.pickup_time_actual = new Date();
    await trip.save();

    return {
      type: 'pickup',
      message: `تم استلام ${beneficiaryId} في الساعة ${new Date().toLocaleTimeString('ar-SA')}`,
      vehicle: trip.vehicle_id?.license_plate,
      driver: trip.driver_id?.full_name_ar,
    };
  }

  static async notifyDropoff(tripId, beneficiaryId) {
    const trip = await Trip.findById(tripId);
    const passenger = trip.passengers.find(
      p => p.beneficiary_id.toString() === beneficiaryId.toString()
    );
    if (!passenger) throw new Error('المستفيد غير مسجل في هذه الرحلة');

    passenger.status = 'dropped_off';
    passenger.dropoff_time_actual = new Date();
    await trip.save();

    return {
      type: 'dropoff',
      message: `تم إيصال ${beneficiaryId} إلى المنزل في الساعة ${new Date().toLocaleTimeString('ar-SA')}`,
    };
  }

  static async getTrackingLink(tripId, vehicleId) {
    const gps = await GpsTracking.findOne({ vehicle_id: vehicleId }).sort({ timestamp: -1 });
    return {
      trip_id: tripId,
      current_lat: gps?.lat,
      current_lng: gps?.lng,
      speed_kmh: gps?.speed_kmh,
      last_update: gps?.timestamp,
      tracking_url: `/track/${tripId}`,
    };
  }
}

module.exports = { RouteOptimizationService, PreTripInspectionService, ParentNotificationService };
