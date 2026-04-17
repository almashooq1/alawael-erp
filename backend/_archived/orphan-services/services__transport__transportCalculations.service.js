'use strict';

/**
 * Transport Calculations Service
 * خدمة حسابات النقل وإدارة الأسطول
 * تحسين المسارات + GPS + فحص المركبات + إشعارات أولياء الأمور
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

// ========================================
// CONSTANTS
// ========================================
const TRANSPORT_CONSTANTS = {
  VEHICLE_TYPES: {
    BUS: 'bus',
    VAN: 'van',
    CAR: 'car',
  },

  VEHICLE_STATUS: {
    ACTIVE: 'active',
    MAINTENANCE: 'maintenance',
    OUT_OF_SERVICE: 'out_of_service',
    RETIRED: 'retired',
  },

  TRIP_STATUS: {
    SCHEDULED: 'scheduled',
    PRE_INSPECTION: 'pre_inspection',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  TRIP_DIRECTION: {
    PICKUP: 'pickup',
    DROPOFF: 'dropoff',
  },

  PASSENGER_STATUS: {
    PENDING: 'pending',
    PICKED_UP: 'picked_up',
    ABSENT: 'absent',
    DROPPED_OFF: 'dropped_off',
    CANCELLED: 'cancelled',
  },

  MAINTENANCE_TYPES: {
    SCHEDULED: 'scheduled',
    UNSCHEDULED: 'unscheduled',
    ACCIDENT: 'accident',
    INSPECTION: 'inspection',
  },

  // سرعات متوسطة لحساب الأوقات (km/h)
  AVERAGE_SPEEDS: {
    CITY: 30,
    HIGHWAY: 80,
    MIXED: 45,
  },

  // وقت التوقف عند كل محطة (دقيقة)
  STOP_DURATION_MINUTES: 3,

  // حدود السرعة للتنبيهات
  SPEED_LIMITS: {
    CITY_MAX: 80,
    SCHOOL_ZONE_MAX: 30,
    HIGHWAY_MAX: 120,
  },

  // الحد الأقصى للمسافة يومياً (km)
  MAX_DAILY_DISTANCE_KM: 300,

  // فترات الصيانة (كيلومتر)
  MAINTENANCE_INTERVALS: {
    OIL_CHANGE: 5000,
    TIRE_ROTATION: 10000,
    MAJOR_SERVICE: 50000,
  },

  EARTH_RADIUS_KM: 6371,

  // قائمة فحص ما قبل الرحلة
  PRE_TRIP_CHECKLIST: {
    exterior: [
      { key: 'tires_condition', labelAr: 'حالة الإطارات', required: true },
      { key: 'lights_working', labelAr: 'جميع الأضواء تعمل', required: true },
      { key: 'mirrors_clean', labelAr: 'المرايا نظيفة وسليمة', required: true },
      { key: 'body_damage', labelAr: 'لا يوجد أضرار بالهيكل', required: true },
      { key: 'wheelchair_ramp', labelAr: 'منحدر الكرسي المتحرك يعمل', required: false },
    ],
    interior: [
      { key: 'seats_belts', labelAr: 'أحزمة الأمان سليمة', required: true },
      { key: 'ac_working', labelAr: 'المكيف يعمل', required: true },
      { key: 'clean_interior', labelAr: 'نظافة المركبة من الداخل', required: true },
      { key: 'first_aid_kit', labelAr: 'صندوق إسعافات أولية', required: true },
      { key: 'fire_extinguisher', labelAr: 'طفاية حريق صالحة', required: true },
      { key: 'wheelchair_locks', labelAr: 'أقفال تثبيت الكراسي المتحركة', required: false },
    ],
    safety: [
      { key: 'brakes', labelAr: 'الفرامل تعمل بشكل سليم', required: true },
      { key: 'fuel_level', labelAr: 'مستوى الوقود كافٍ', required: true },
      { key: 'camera_working', labelAr: 'كاميرا المراقبة تعمل', required: false },
      { key: 'gps_active', labelAr: 'جهاز GPS يعمل', required: true },
      { key: 'emergency_exit', labelAr: 'مخرج الطوارئ سليم', required: true },
    ],
  },
};

// ========================================
// HAVERSINE DISTANCE
// ========================================

/**
 * حساب المسافة بين نقطتين جغرافيتين (Haversine Formula)
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} - المسافة بالكيلومتر
 */
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lng1 === null ||
    lng1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lng2 === null ||
    lng2 === undefined
  ) {
    return 0;
  }

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;

  const R = TRANSPORT_CONSTANTS.EARTH_RADIUS_KM;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return round2(R * c);
}

// ========================================
// ROUTE OPTIMIZATION
// ========================================

/**
 * خوارزمية Nearest Neighbor لترتيب نقاط الاستقبال
 * @param {object} start - {lat, lng} نقطة البداية (المركز)
 * @param {Array} points - [{lat, lng, beneficiaryId, ...}]
 * @returns {Array} - نقاط مرتبة
 */
function nearestNeighborSort(start, points) {
  if (!start || !Array.isArray(points) || points.length === 0) return [];

  const ordered = [];
  let remaining = [...points];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateHaversineDistance(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push({ ...remaining[nearestIdx], distanceFromPrev: nearestDist });
    current = remaining[nearestIdx];
    remaining.splice(nearestIdx, 1);
  }

  return ordered;
}

/**
 * تحسين المسار بخوارزمية 2-opt
 * تقليص المسافة الكلية بتبديل الأزواج
 * @param {Array} points - [{lat, lng, ...}]
 * @returns {Array} - مسار محسّن
 */
function twoOptOptimize(points) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];

  let route = [...points];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const currentDist =
          calculateHaversineDistance(
            route[i].lat,
            route[i].lng,
            route[i + 1].lat,
            route[i + 1].lng
          ) +
          calculateHaversineDistance(
            route[j].lat,
            route[j].lng,
            route[(j + 1) % route.length]?.lat || route[j].lat,
            route[(j + 1) % route.length]?.lng || route[j].lng
          );

        const newRoute = [...route];
        // عكس القطعة بين i+1 و j
        const segment = newRoute.slice(i + 1, j + 1).reverse();
        newRoute.splice(i + 1, j - i, ...segment);

        const newDist =
          calculateHaversineDistance(
            newRoute[i].lat,
            newRoute[i].lng,
            newRoute[i + 1].lat,
            newRoute[i + 1].lng
          ) +
          calculateHaversineDistance(
            newRoute[j].lat,
            newRoute[j].lng,
            newRoute[(j + 1) % newRoute.length]?.lat || newRoute[j].lat,
            newRoute[(j + 1) % newRoute.length]?.lng || newRoute[j].lng
          );

        if (newDist < currentDist - 0.001) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * حساب إجمالي مسافة مسار
 * @param {object} start - {lat, lng}
 * @param {Array} waypoints - [{lat, lng}]
 * @returns {number} - km
 */
function calculateRouteTotalDistance(start, waypoints) {
  if (!start || !Array.isArray(waypoints) || waypoints.length === 0) return 0;

  let total = 0;
  let prev = start;

  for (const wp of waypoints) {
    total += calculateHaversineDistance(prev.lat, prev.lng, wp.lat, wp.lng);
    prev = wp;
  }

  // العودة للمركز
  total += calculateHaversineDistance(prev.lat, prev.lng, start.lat, start.lng);

  return round2(total);
}

/**
 * تحسين المسار الكامل: NN + 2-opt + حساب الأوقات
 * @param {object} start - {lat, lng} - موقع المركز
 * @param {Array} waypoints - [{lat, lng, beneficiaryId, ...}]
 * @param {string} startTime - 'HH:MM'
 * @returns {object}
 */
function optimizeRoute(start, waypoints, startTime = '07:00') {
  if (!start || !Array.isArray(waypoints) || waypoints.length === 0) {
    return { isValid: false, waypoints: [], totalDistance: 0, estimatedDuration: 0 };
  }

  // 1. Nearest Neighbor
  const nnSorted = nearestNeighborSort(start, waypoints);

  // 2. 2-opt improvement
  const optimized = twoOptOptimize(nnSorted);

  // 3. حساب الأوقات المتوقعة
  const withTimes = calculateEstimatedTimes(optimized, startTime, start);

  // 4. المسافة الإجمالية
  const totalDistance = calculateRouteTotalDistance(start, optimized);

  // 5. المدة الإجمالية
  const estimatedDuration = estimateRouteDuration(totalDistance, optimized.length);

  return {
    isValid: true,
    waypoints: withTimes,
    totalDistance,
    estimatedDuration,
    stopCount: optimized.length,
  };
}

/**
 * حساب الأوقات المتوقعة لكل محطة
 * @param {Array} waypoints
 * @param {string} startTime - 'HH:MM'
 * @param {object} prevPoint - نقطة البداية
 * @returns {Array}
 */
function calculateEstimatedTimes(waypoints, startTime, prevPoint = null) {
  if (!Array.isArray(waypoints)) return [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMin;
  let prev = prevPoint;

  return waypoints.map((wp, index) => {
    if (index > 0 || prev) {
      const from = prev || waypoints[index - 1];
      if (from) {
        const dist = calculateHaversineDistance(from.lat, from.lng, wp.lat, wp.lng);
        const travelMinutes = Math.ceil((dist / TRANSPORT_CONSTANTS.AVERAGE_SPEEDS.CITY) * 60);
        currentMinutes += travelMinutes + TRANSPORT_CONSTANTS.STOP_DURATION_MINUTES;
      }
    }

    prev = wp;

    const hours = Math.floor(currentMinutes / 60) % 24;
    const mins = currentMinutes % 60;
    const estimatedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    return { ...wp, order: index + 1, estimatedTime };
  });
}

/**
 * تقدير مدة الرحلة بالدقائق
 * @param {number} distanceKm
 * @param {number} stopCount
 * @returns {number}
 */
function estimateRouteDuration(distanceKm, stopCount) {
  const travelMinutes = (distanceKm / TRANSPORT_CONSTANTS.AVERAGE_SPEEDS.CITY) * 60;
  return Math.ceil(travelMinutes + stopCount * TRANSPORT_CONSTANTS.STOP_DURATION_MINUTES);
}

// ========================================
// VEHICLE MANAGEMENT
// ========================================

/**
 * التحقق من صلاحية المركبة للرحلة
 * @param {object} vehicle
 * @param {string} currentDate - 'YYYY-MM-DD'
 * @returns {object} - {isEligible, issues}
 */
function checkVehicleEligibility(vehicle, currentDate = new Date().toISOString().split('T')[0]) {
  if (!vehicle) return { isEligible: false, issues: ['بيانات المركبة مطلوبة'] };

  const issues = [];

  // حالة المركبة
  if (vehicle.status !== TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE) {
    issues.push(`المركبة غير نشطة: ${vehicle.status}`);
  }

  // انتهاء تسجيل المركبة
  if (vehicle.registrationExpiry && vehicle.registrationExpiry < currentDate) {
    issues.push('انتهى تسجيل المركبة');
  }

  // انتهاء التأمين
  if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < currentDate) {
    issues.push('انتهى تأمين المركبة');
  }

  // موعد الصيانة
  if (vehicle.nextInspectionDate && vehicle.nextInspectionDate < currentDate) {
    issues.push('موعد الفحص الدوري متأخر');
  }

  return {
    isEligible: issues.length === 0,
    issues,
    vehicleId: vehicle.id,
    vehicleNumber: vehicle.vehicleNumber,
  };
}

/**
 * حساب نسبة إشغال المركبة
 * @param {number} capacity - الطاقة الاستيعابية
 * @param {number} passengerCount - عدد الركاب
 * @returns {object}
 */
function calculateVehicleOccupancy(capacity, passengerCount) {
  if (!capacity || capacity <= 0) return { isValid: false };
  const count = Math.max(0, passengerCount || 0);
  const occupancyRate = round2((count / capacity) * 100);

  return {
    isValid: true,
    capacity,
    passengerCount: count,
    occupancyRate,
    availableSeats: Math.max(0, capacity - count),
    isFull: count >= capacity,
    isOverCapacity: count > capacity,
  };
}

/**
 * حساب موعد الصيانة القادم
 * @param {number} currentMileage
 * @param {string} maintenanceType - 'oil_change'|'tire_rotation'|'major_service'
 * @returns {object}
 */
function calculateNextMaintenanceDue(currentMileage, maintenanceType = 'oil_change') {
  if (typeof currentMileage !== 'number' || currentMileage < 0) {
    return { isValid: false };
  }

  const intervals = {
    oil_change: TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.OIL_CHANGE,
    tire_rotation: TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.TIRE_ROTATION,
    major_service: TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.MAJOR_SERVICE,
  };

  const interval = intervals[maintenanceType] || intervals.oil_change;
  const lastServiceMileage = Math.floor(currentMileage / interval) * interval;
  const nextServiceMileage = lastServiceMileage + interval;
  const remainingKm = nextServiceMileage - currentMileage;

  return {
    isValid: true,
    currentMileage,
    maintenanceType,
    interval,
    nextServiceMileage,
    remainingKm,
    isDue: remainingKm <= 0,
    isWarning: remainingKm <= interval * 0.1, // تحذير عند 10% متبقي
  };
}

// ========================================
// PRE-TRIP INSPECTION
// ========================================

/**
 * الحصول على قائمة فحص ما قبل الرحلة
 * @returns {object}
 */
function getPreTripChecklist() {
  return TRANSPORT_CONSTANTS.PRE_TRIP_CHECKLIST;
}

/**
 * التحقق من نتائج فحص ما قبل الرحلة
 * @param {object} inspectionData - {tires_condition: true, lights_working: true, ...}
 * @returns {object}
 */
function validatePreTripInspection(inspectionData) {
  if (!inspectionData) {
    return { passed: false, failedItems: ['بيانات الفحص مطلوبة'], completionRate: 0 };
  }

  const checklist = TRANSPORT_CONSTANTS.PRE_TRIP_CHECKLIST;
  const failedItems = [];
  const missingItems = [];
  let totalRequired = 0;
  let passedRequired = 0;

  for (const category of Object.values(checklist)) {
    for (const item of category) {
      if (item.required) {
        totalRequired++;
        if (inspectionData[item.key] === undefined || inspectionData[item.key] === null) {
          missingItems.push(item.labelAr);
        } else if (!inspectionData[item.key]) {
          failedItems.push(item.labelAr);
        } else {
          passedRequired++;
        }
      }
    }
  }

  const completionRate = totalRequired > 0 ? Math.round((passedRequired / totalRequired) * 100) : 0;

  return {
    passed: failedItems.length === 0 && missingItems.length === 0,
    failedItems,
    missingItems,
    completionRate,
    totalRequired,
    passedRequired,
  };
}

// ========================================
// TRIP CALCULATIONS
// ========================================

/**
 * حساب تأخر الرحلة
 * @param {string} scheduledTime - 'HH:MM'
 * @param {string} actualTime - 'HH:MM'
 * @returns {object}
 */
function calculateTripDelay(scheduledTime, actualTime) {
  if (!scheduledTime || !actualTime) return { isDelayed: false, delayMinutes: 0 };

  const [sh, sm] = scheduledTime.split(':').map(Number);
  const [ah, am] = actualTime.split(':').map(Number);

  const scheduledMinutes = sh * 60 + sm;
  const actualMinutes = ah * 60 + am;
  const delayMinutes = actualMinutes - scheduledMinutes;

  return {
    isDelayed: delayMinutes > 0,
    delayMinutes: Math.max(0, delayMinutes),
    isEarly: delayMinutes < 0,
    earlyMinutes: Math.max(0, -delayMinutes),
  };
}

/**
 * حساب مدة الرحلة الفعلية
 * @param {string} startTime - 'HH:MM'
 * @param {string} endTime - 'HH:MM'
 * @returns {object}
 */
function calculateActualTripDuration(startTime, endTime) {
  if (!startTime || !endTime) return { isValid: false };

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  // التعامل مع تجاوز منتصف الليل
  if (endMinutes < startMinutes) endMinutes += 24 * 60;

  const durationMinutes = endMinutes - startMinutes;

  return {
    isValid: true,
    durationMinutes,
    durationHours: round2(durationMinutes / 60),
    startTime,
    endTime,
  };
}

/**
 * إحصائيات الرحلة
 * @param {object} trip
 * @param {Array} passengers
 * @returns {object}
 */
function calculateTripStatistics(trip, passengers) {
  if (!trip) return { isValid: false };

  const passengerList = Array.isArray(passengers) ? passengers : [];
  const pickedUp = passengerList.filter(p => p.pickupStatus === 'picked_up').length;
  const absent = passengerList.filter(p => p.pickupStatus === 'absent').length;
  const droppedOff = passengerList.filter(p => p.dropoffStatus === 'dropped_off').length;

  const attendanceRate =
    passengerList.length > 0 ? Math.round((pickedUp / passengerList.length) * 100) : 0;

  const duration =
    trip.actualStartTime && trip.actualEndTime
      ? calculateActualTripDuration(trip.actualStartTime, trip.actualEndTime)
      : null;

  return {
    isValid: true,
    totalPassengers: passengerList.length,
    pickedUp,
    absent,
    droppedOff,
    attendanceRate,
    duration,
    actualDistance: trip.actualDistanceKm || 0,
  };
}

// ========================================
// GPS & SPEED MONITORING
// ========================================

/**
 * التحقق من صحة إحداثيات GPS
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
function validateGpsCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * التحقق من السرعة والتنبيه عند التجاوز
 * @param {number} speed - km/h
 * @param {string} zoneType - 'city'|'highway'|'school_zone'
 * @returns {object}
 */
function checkSpeedLimit(speed, zoneType = 'city') {
  if (typeof speed !== 'number' || speed < 0) {
    return { isValid: false };
  }

  const limits = {
    city: TRANSPORT_CONSTANTS.SPEED_LIMITS.CITY_MAX,
    highway: TRANSPORT_CONSTANTS.SPEED_LIMITS.HIGHWAY_MAX,
    school_zone: TRANSPORT_CONSTANTS.SPEED_LIMITS.SCHOOL_ZONE_MAX,
  };

  const limit = limits[zoneType] || limits.city;
  const isExceeded = speed > limit;
  const excess = Math.max(0, speed - limit);

  return {
    isValid: true,
    speed,
    limit,
    zoneType,
    isExceeded,
    excess,
    severity: excess > 20 ? 'critical' : excess > 10 ? 'warning' : excess > 0 ? 'minor' : 'ok',
  };
}

/**
 * حساب المسافة المقطوعة من سجلات GPS
 * @param {Array} gpsPoints - [{lat, lng, recordedAt}]
 * @returns {object}
 */
function calculateGpsDistance(gpsPoints) {
  if (!Array.isArray(gpsPoints) || gpsPoints.length < 2) {
    return { totalDistance: 0, pointCount: gpsPoints?.length || 0 };
  }

  let totalDistance = 0;
  for (let i = 1; i < gpsPoints.length; i++) {
    totalDistance += calculateHaversineDistance(
      gpsPoints[i - 1].lat,
      gpsPoints[i - 1].lng,
      gpsPoints[i].lat,
      gpsPoints[i].lng
    );
  }

  return {
    totalDistance: round2(totalDistance),
    pointCount: gpsPoints.length,
    startPoint: gpsPoints[0],
    endPoint: gpsPoints[gpsPoints.length - 1],
  };
}

/**
 * كشف التوقفات في مسار GPS
 * @param {Array} gpsPoints - [{lat, lng, recordedAt}]
 * @param {number} minStopMinutes - الحد الأدنى للتوقف بالدقائق
 * @returns {Array} - قائمة التوقفات
 */
function detectGpsStops(gpsPoints, minStopMinutes = 2) {
  if (!Array.isArray(gpsPoints) || gpsPoints.length < 2) return [];

  const stops = [];
  const MOVEMENT_THRESHOLD_KM = 0.05; // 50 متر حد أدنى للحركة

  let stopStart = null;
  let stopLocation = null;

  for (let i = 1; i < gpsPoints.length; i++) {
    const dist = calculateHaversineDistance(
      gpsPoints[i - 1].lat,
      gpsPoints[i - 1].lng,
      gpsPoints[i].lat,
      gpsPoints[i].lng
    );

    if (dist < MOVEMENT_THRESHOLD_KM) {
      // المركبة واقفة
      if (!stopStart) {
        stopStart = gpsPoints[i - 1].recordedAt;
        stopLocation = { lat: gpsPoints[i - 1].lat, lng: gpsPoints[i - 1].lng };
      }
    } else {
      // المركبة تتحرك
      if (stopStart) {
        const stopEnd = gpsPoints[i - 1].recordedAt;
        const durationMs = new Date(stopEnd) - new Date(stopStart);
        const durationMinutes = Math.floor(durationMs / 60000);

        if (durationMinutes >= minStopMinutes) {
          stops.push({
            startTime: stopStart,
            endTime: stopEnd,
            durationMinutes,
            location: stopLocation,
          });
        }

        stopStart = null;
        stopLocation = null;
      }
    }
  }

  return stops;
}

// ========================================
// ROUTE & PASSENGER MANAGEMENT
// ========================================

/**
 * التحقق من قدرة المركبة على استيعاب الركاب
 * (مع مراعاة مقاعد الكراسي المتحركة)
 * @param {object} vehicle
 * @param {Array} passengers - [{requiresWheelchair}]
 * @returns {object}
 */
function checkVehicleCapacityForPassengers(vehicle, passengers) {
  if (!vehicle || !Array.isArray(passengers)) {
    return { isValid: false };
  }

  const totalPassengers = passengers.length;
  const wheelchairPassengers = passengers.filter(p => p.requiresWheelchair).length;
  const regularPassengers = totalPassengers - wheelchairPassengers;

  const issues = [];

  if (totalPassengers > vehicle.capacity) {
    issues.push(`عدد الركاب (${totalPassengers}) يتجاوز طاقة المركبة (${vehicle.capacity})`);
  }

  if (vehicle.wheelchairAccessible === false && wheelchairPassengers > 0) {
    issues.push('المركبة لا تدعم الكراسي المتحركة');
  }

  if (wheelchairPassengers > (vehicle.wheelchairSlots || 0)) {
    issues.push(
      `عدد الكراسي المتحركة (${wheelchairPassengers}) يتجاوز مقاعد الكرسي المتحرك (${vehicle.wheelchairSlots || 0})`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    totalPassengers,
    wheelchairPassengers,
    regularPassengers,
    vehicleCapacity: vehicle.capacity,
    availableSeats: Math.max(0, vehicle.capacity - totalPassengers),
  };
}

/**
 * ترتيب المحطات لرحلة الاستقبال (من أبعد إلى الأقرب للمركز)
 * ولرحلة التوصيل (من الأقرب إلى الأبعد)
 * @param {object} center - {lat, lng}
 * @param {Array} waypoints - [{lat, lng, beneficiaryId}]
 * @param {string} direction - 'pickup'|'dropoff'
 * @returns {Array}
 */
function sortWaypointsByDirection(center, waypoints, direction = 'pickup') {
  if (!center || !Array.isArray(waypoints)) return [];

  const withDistances = waypoints.map(wp => ({
    ...wp,
    distanceFromCenter: calculateHaversineDistance(center.lat, center.lng, wp.lat, wp.lng),
  }));

  if (direction === 'pickup') {
    // للاستقبال: من الأبعد إلى الأقرب (نستقبل الأبعد أولاً)
    return withDistances.sort((a, b) => b.distanceFromCenter - a.distanceFromCenter);
  } else {
    // للتوصيل: من الأقرب إلى الأبعد (نوصّل الأقرب أولاً)
    return withDistances.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  }
}

// ========================================
// FLEET STATISTICS
// ========================================

/**
 * إحصائيات الأسطول
 * @param {Array} vehicles
 * @returns {object}
 */
function calculateFleetStatistics(vehicles) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return { total: 0, active: 0, maintenance: 0, outOfService: 0, utilizationRate: 0 };
  }

  const active = vehicles.filter(
    v => v.status === TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE
  ).length;
  const maintenance = vehicles.filter(
    v => v.status === TRANSPORT_CONSTANTS.VEHICLE_STATUS.MAINTENANCE
  ).length;
  const outOfService = vehicles.filter(
    v => v.status === TRANSPORT_CONSTANTS.VEHICLE_STATUS.OUT_OF_SERVICE
  ).length;
  const retired = vehicles.filter(
    v => v.status === TRANSPORT_CONSTANTS.VEHICLE_STATUS.RETIRED
  ).length;

  const totalCapacity = vehicles
    .filter(v => v.status === TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE)
    .reduce((sum, v) => sum + (v.capacity || 0), 0);

  const wheelchairCapable = vehicles.filter(v => v.wheelchairAccessible).length;

  const utilizationRate = vehicles.length > 0 ? Math.round((active / vehicles.length) * 100) : 0;

  return {
    total: vehicles.length,
    active,
    maintenance,
    outOfService,
    retired,
    totalCapacity,
    wheelchairCapable,
    utilizationRate,
  };
}

/**
 * إحصائيات رحلات فترة زمنية
 * @param {Array} trips
 * @param {object} filters - {branchId, dateFrom, dateTo}
 * @returns {object}
 */
function calculateTripStatisticsPeriod(trips, filters = {}) {
  if (!Array.isArray(trips)) return { total: 0 };

  let filtered = trips;

  if (filters.branchId) {
    filtered = filtered.filter(t => t.branchId === filters.branchId);
  }
  if (filters.dateFrom) {
    filtered = filtered.filter(t => t.tripDate >= filters.dateFrom);
  }
  if (filters.dateTo) {
    filtered = filtered.filter(t => t.tripDate <= filters.dateTo);
  }

  const completed = filtered.filter(
    t => t.status === TRANSPORT_CONSTANTS.TRIP_STATUS.COMPLETED
  ).length;
  const cancelled = filtered.filter(
    t => t.status === TRANSPORT_CONSTANTS.TRIP_STATUS.CANCELLED
  ).length;
  const totalDistance = round2(filtered.reduce((s, t) => s + (t.actualDistanceKm || 0), 0));
  const totalPassengers = filtered.reduce((s, t) => s + (t.actualPassengers || 0), 0);

  const completionRate = filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0;

  return {
    total: filtered.length,
    completed,
    cancelled,
    inProgress: filtered.filter(t => t.status === TRANSPORT_CONSTANTS.TRIP_STATUS.IN_PROGRESS)
      .length,
    totalDistance,
    totalPassengers,
    completionRate,
    averagePassengersPerTrip: filtered.length > 0 ? round2(totalPassengers / filtered.length) : 0,
  };
}

// ========================================
// NOTIFICATION HELPERS
// ========================================

/**
 * بناء رسالة إشعار للولي لرحلة الاستقبال
 * @param {string} beneficiaryName
 * @param {string} vehicleNumber
 * @param {string} driverName
 * @param {string} estimatedTime
 * @returns {object}
 */
function buildPickupNotificationMessage(beneficiaryName, vehicleNumber, driverName, estimatedTime) {
  return {
    titleAr: 'إشعار استقبال',
    bodyAr: `سيتم استقبال ${beneficiaryName} خلال ${estimatedTime} بواسطة سيارة رقم ${vehicleNumber} - السائق: ${driverName}`,
    type: 'pickup',
    data: { beneficiaryName, vehicleNumber, driverName, estimatedTime },
  };
}

/**
 * بناء رسالة إشعار للولي لرحلة التوصيل
 * @param {string} beneficiaryName
 * @param {string} time
 * @returns {object}
 */
function buildDropoffNotificationMessage(beneficiaryName, time) {
  return {
    titleAr: 'إشعار توصيل',
    bodyAr: `تم إيصال ${beneficiaryName} في تمام الساعة ${time}`,
    type: 'dropoff',
    data: { beneficiaryName, time },
  };
}

/**
 * بناء رسالة تأخر
 * @param {string} beneficiaryName
 * @param {number} delayMinutes
 * @param {string} reason
 * @returns {object}
 */
function buildDelayNotificationMessage(beneficiaryName, delayMinutes, reason = '') {
  return {
    titleAr: 'تنبيه تأخر',
    bodyAr: `تأخر الوصول لـ ${beneficiaryName} بمقدار ${delayMinutes} دقيقة${reason ? ` - السبب: ${reason}` : ''}`,
    type: 'delay',
    data: { beneficiaryName, delayMinutes, reason },
  };
}

// ========================================
// FUEL TRACKING
// ========================================

/**
 * حساب استهلاك الوقود
 * @param {number} distanceKm
 * @param {number} fuelConsumptionPer100Km - لتر/100كم
 * @param {number} fuelPricePerLiter - ريال/لتر
 * @returns {object}
 */
function calculateFuelConsumption(
  distanceKm,
  fuelConsumptionPer100Km = 12,
  fuelPricePerLiter = 0.91
) {
  if (typeof distanceKm !== 'number' || distanceKm < 0) return { isValid: false };

  const fuelLiters = round2((distanceKm * fuelConsumptionPer100Km) / 100);
  const fuelCost = round2(fuelLiters * fuelPricePerLiter);
  const costPerKm = distanceKm > 0 ? round2(fuelCost / distanceKm) : 0;

  return {
    isValid: true,
    distanceKm,
    fuelLiters,
    fuelCost,
    costPerKm,
    fuelConsumptionPer100Km,
    fuelPricePerLiter,
  };
}

// ========================================
// HELPERS
// ========================================
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  TRANSPORT_CONSTANTS,
  // Distance
  calculateHaversineDistance,
  // Route Optimization
  nearestNeighborSort,
  twoOptOptimize,
  calculateRouteTotalDistance,
  optimizeRoute,
  calculateEstimatedTimes,
  estimateRouteDuration,
  sortWaypointsByDirection,
  // Vehicle
  checkVehicleEligibility,
  calculateVehicleOccupancy,
  calculateNextMaintenanceDue,
  checkVehicleCapacityForPassengers,
  // Pre-trip Inspection
  getPreTripChecklist,
  validatePreTripInspection,
  // Trip
  calculateTripDelay,
  calculateActualTripDuration,
  calculateTripStatistics,
  // GPS
  validateGpsCoordinates,
  checkSpeedLimit,
  calculateGpsDistance,
  detectGpsStops,
  // Statistics
  calculateFleetStatistics,
  calculateTripStatisticsPeriod,
  // Notifications
  buildPickupNotificationMessage,
  buildDropoffNotificationMessage,
  buildDelayNotificationMessage,
  // Fuel
  calculateFuelConsumption,
};
