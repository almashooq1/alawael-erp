/**
 * خدمة تحسين مسارات النقل
 * Route Optimization Service
 *
 * خوارزميات:
 * 1. Haversine Formula - حساب المسافة بين نقطتين جغرافيتين
 * 2. Nearest Neighbor - ترتيب أولي للمحطات
 * 3. 2-opt Improvement - تحسين المسار
 * 4. حساب الأوقات المتوقعة لكل محطة
 * 5. التحقق من تقاطع المسارات
 *
 * @module routeOptimization.service
 * @version 2.0
 */

'use strict';

// =========================================
// ثوابت
// =========================================

/** نصف قطر الأرض بالكيلومترات */
const EARTH_RADIUS_KM = 6371;

/** متوسط سرعة السيارة داخل المدينة (كم/ساعة) */
const DEFAULT_CITY_SPEED_KMH = 30;

/** وقت التوقف عند كل محطة (دقائق) */
const DEFAULT_STOP_DURATION_MINUTES = 3;

/** aliases للتوافق مع الاختبارات القديمة */
const AVG_CITY_SPEED_KMH = DEFAULT_CITY_SPEED_KMH;
const STOP_DURATION_MINUTES = DEFAULT_STOP_DURATION_MINUTES;

/** الحد الأقصى للرحلة في يوم واحد (كم) */
const MAX_TRIP_DISTANCE_KM = 200;

/** الحد الأقصى لعدد محطات المسار */
const MAX_STOPS_PER_ROUTE = 30;

/** الحد الأقصى لعدد تكرارات 2-opt */
const MAX_2OPT_ITERATIONS = 100;

/** أنواع الخدمات الخاصة بالمركبات */
const VEHICLE_TYPES = {
  BUS: 'bus',
  VAN: 'van',
  CAR: 'car',
  WHEELCHAIR_VAN: 'wheelchair_van',
};

/** حالات الرحلة */
const TRIP_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// =========================================
// الدوال المساعدة - Helpers
// =========================================

/**
 * التحقق من صحة إحداثيات GPS
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @throws {Error} إذا كانت الإحداثيات غير صحيحة
 */
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('إحداثيات غير صالحة: يجب أن تكون أرقاماً');
  }
  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('الإحداثيات لا يمكن أن تكون NaN');
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`خط العرض يجب أن يكون بين -90 و 90، القيمة: ${lat}`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`خط الطول يجب أن يكون بين -180 و 180، القيمة: ${lng}`);
  }
}

/**
 * تحويل الدرجات إلى راديان
 * @param {number} degrees - القيمة بالدرجات
 * @returns {number} القيمة بالراديان
 */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * تقريب المسافة إلى منزلتين عشريتين
 * @param {number} value
 * @returns {number}
 */
function roundDistance(value) {
  return Math.round(value * 100) / 100;
}

/**
 * تقريب الوقت إلى رقم صحيح (دقائق)
 * @param {number} value
 * @returns {number}
 */
function roundMinutes(value) {
  return Math.round(value);
}

// =========================================
// حساب المسافة - Haversine Formula
// =========================================

/**
 * حساب المسافة بين نقطتين جغرافيتين باستخدام معادلة Haversine
 *
 * المعادلة:
 * a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
 * c = 2 × atan2(√a, √(1-a))
 * d = R × c
 *
 * @param {number} lat1 - خط عرض النقطة الأولى
 * @param {number} lng1 - خط طول النقطة الأولى
 * @param {number} lat2 - خط عرض النقطة الثانية
 * @param {number} lng2 - خط طول النقطة الثانية
 * @returns {number} المسافة بالكيلومترات
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  validateCoordinates(lat1, lng1);
  validateCoordinates(lat2, lng2);

  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * حساب المسافة بالأمتار
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} المسافة بالأمتار
 */
function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  return haversineDistance(lat1, lng1, lat2, lng2) * 1000;
}

/**
 * حساب إجمالي مسافة قائمة من النقاط (بالترتيب)
 * @param {Array<{lat: number, lng: number}>} points - مصفوفة النقاط
 * @returns {number} المسافة الكلية بالكيلومترات
 */
function calculateTotalDistance(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  // لا تقريب هنا للحفاظ على دقة الحساب
  return total;
}

// =========================================
// خوارزمية Nearest Neighbor
// =========================================

/**
 * خوارزمية الجار الأقرب لترتيب المحطات
 * تبدأ من نقطة البداية وتختار أقرب نقطة غير مزارة
 *
 * التعقيد الزمني: O(n²)
 *
 * @param {{lat: number, lng: number}} start - نقطة البداية (المركز)
 * @param {Array<{lat: number, lng: number, id?: any}>} points - المحطات
 * @returns {Array} المحطات مرتبة حسب الجار الأقرب
 */
function nearestNeighborSort(start, points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  if (!start || typeof start !== 'object' || start.lat === undefined || start.lng === undefined) {
    throw new Error('نقطة البداية غير صالحة');
  }

  validateCoordinates(start.lat, start.lng);

  const remaining = [...points];
  const ordered = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining[nearestIdx]);
    current = remaining[nearestIdx];
    remaining.splice(nearestIdx, 1);
  }

  return ordered;
}

// =========================================
// خوارزمية 2-opt Improvement
// =========================================

/**
 * حساب مسافة قطعة من المسار بين مؤشرين
 * @param {Array<{lat: number, lng: number}>} route
 * @param {number} i
 * @param {number} j
 * @returns {number}
 */
function segmentDistance(route, i, j) {
  let dist = 0;
  for (let k = i; k < j; k++) {
    dist += haversineDistance(route[k].lat, route[k].lng, route[k + 1].lat, route[k + 1].lng);
  }
  return dist;
}

/**
 * تبديل 2-opt: عكس القطعة بين i+1 و j
 * @param {Array} route
 * @param {number} i
 * @param {number} j
 * @returns {Array} مسار جديد
 */
function twoOptSwap(route, i, j) {
  const before = route.slice(0, i + 1);
  const reversed = route.slice(i + 1, j + 1).reverse();
  const after = route.slice(j + 1);
  return [...before, ...reversed, ...after];
}

/**
 * تحسين المسار باستخدام خوارزمية 2-opt
 * تحاول عكس قطع من المسار لتقليل المسافة الكلية
 *
 * @param {Array<{lat: number, lng: number}>} route - المسار الأولي
 * @param {number} [maxIterations=MAX_2OPT_ITERATIONS] - الحد الأقصى للتكرار
 * @returns {{route: Array, improved: boolean, iterations: number}} المسار المحسن
 */
function twoOptImprove(route, maxIterations = MAX_2OPT_ITERATIONS) {
  if (!Array.isArray(route) || route.length < 4) {
    return { route: [...route], improved: false, iterations: 0 };
  }

  let currentRoute = [...route];
  let improved = true;
  let iterationCount = 0;
  let totalImproved = false;

  while (improved && iterationCount < maxIterations) {
    improved = false;
    iterationCount++;

    for (let i = 0; i < currentRoute.length - 2; i++) {
      for (let j = i + 2; j < currentRoute.length; j++) {
        // تجنب عكس المسار كاملاً
        if (i === 0 && j === currentRoute.length - 1) continue;

        const currentDist =
          haversineDistance(
            currentRoute[i].lat,
            currentRoute[i].lng,
            currentRoute[i + 1].lat,
            currentRoute[i + 1].lng
          ) +
          haversineDistance(
            currentRoute[j].lat,
            currentRoute[j].lng,
            currentRoute[(j + 1) % currentRoute.length]?.lat ?? currentRoute[j].lat,
            currentRoute[(j + 1) % currentRoute.length]?.lng ?? currentRoute[j].lng
          );

        const newDist =
          haversineDistance(
            currentRoute[i].lat,
            currentRoute[i].lng,
            currentRoute[j].lat,
            currentRoute[j].lng
          ) +
          haversineDistance(
            currentRoute[i + 1].lat,
            currentRoute[i + 1].lng,
            currentRoute[(j + 1) % currentRoute.length]?.lat ?? currentRoute[i + 1].lat,
            currentRoute[(j + 1) % currentRoute.length]?.lng ?? currentRoute[i + 1].lng
          );

        if (newDist < currentDist - 0.001) {
          currentRoute = twoOptSwap(currentRoute, i, j);
          improved = true;
          totalImproved = true;
        }
      }
    }
  }

  return {
    route: currentRoute,
    improved: totalImproved,
    iterations: iterationCount,
  };
}

// =========================================
// حساب الأوقات المتوقعة
// =========================================

/**
 * تحويل وقت HH:MM إلى دقائق منذ منتصف الليل
 * @param {string} timeStr - الوقت بتنسيق "HH:MM"
 * @returns {number} الدقائق
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('الوقت يجب أن يكون نصاً بتنسيق HH:MM');
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`تنسيق الوقت غير صحيح: "${timeStr}"، المتوقع HH:MM`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) {
    throw new Error(`قيمة وقت غير صحيحة: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * تحويل الدقائق منذ منتصف الليل إلى تنسيق HH:MM
 * @param {number} totalMinutes - إجمالي الدقائق
 * @returns {string} الوقت بتنسيق "HH:MM"
 */
function minutesToTime(totalMinutes) {
  // التعامل مع تجاوز اليوم
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * حساب الأوقات المتوقعة لكل محطة بناءً على المسافات
 * @param {Array<{lat: number, lng: number}>} waypoints - المحطات مرتبة
 * @param {string} startTime - وقت الانطلاق "HH:MM"
 * @param {Object} [options]
 * @param {number} [options.speedKmh=DEFAULT_CITY_SPEED_KMH] - السرعة المتوسطة
 * @param {number} [options.stopDurationMinutes=DEFAULT_STOP_DURATION_MINUTES] - وقت التوقف
 * @returns {Array<{...waypoint, estimatedTime: string, estimatedMinutes: number, distanceFromPrev: number}>}
 */
function calculateEstimatedTimes(waypoints, startTime, options = {}) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return [];
  }

  const speed = options.speedKmh !== undefined ? options.speedKmh : DEFAULT_CITY_SPEED_KMH;
  const stopDuration =
    options.stopDurationMinutes !== undefined
      ? options.stopDurationMinutes
      : DEFAULT_STOP_DURATION_MINUTES;

  if (speed <= 0) throw new Error('السرعة يجب أن تكون أكبر من صفر');

  let currentMinutes = timeToMinutes(startTime);
  const result = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    let distanceFromPrev = 0;
    let travelMinutes = 0;

    if (i > 0) {
      distanceFromPrev = haversineDistance(
        waypoints[i - 1].lat,
        waypoints[i - 1].lng,
        wp.lat,
        wp.lng
      );
      // وقت السفر + وقت التوقف في المحطة السابقة
      travelMinutes = (distanceFromPrev / speed) * 60 + stopDuration;
      currentMinutes += roundMinutes(travelMinutes);
    }

    result.push({
      ...wp,
      order: i + 1,
      estimatedTime: minutesToTime(currentMinutes),
      estimatedArrival: minutesToTime(currentMinutes),
      estimatedMinutes: currentMinutes,
      distanceFromPrev: roundDistance(distanceFromPrev),
    });
  }

  return result;
}

// =========================================
// تحسين المسار الكامل
// =========================================

/**
 * تحسين المسار الكامل:
 * 1. Nearest Neighbor للترتيب الأولي
 * 2. 2-opt للتحسين
 * 3. حساب الأوقات المتوقعة
 *
 * @param {{lat: number, lng: number}} branchLocation - موقع المركز (نقطة الانطلاق)
 * @param {Array<{lat: number, lng: number, beneficiaryId?: any, name?: string}>} waypoints - المحطات
 * @param {string} startTime - وقت الانطلاق "HH:MM"
 * @param {Object} [options]
 * @param {number} [options.speedKmh] - السرعة المتوسطة
 * @param {number} [options.stopDurationMinutes] - وقت التوقف
 * @param {boolean} [options.use2opt=true] - استخدام تحسين 2-opt
 * @returns {Object} المسار المحسن مع الإحصاءات
 */
function optimizeRoute(branchLocation, waypoints, startTime, options = {}) {
  // التحقق من موقع الفرع
  if (
    !branchLocation ||
    typeof branchLocation !== 'object' ||
    branchLocation.lat === undefined ||
    branchLocation.lng === undefined
  ) {
    throw new Error('موقع الفرع غير صالح');
  }
  try {
    validateCoordinates(branchLocation.lat, branchLocation.lng);
  } catch (_e) {
    throw new Error('موقع الفرع غير صالح');
  }

  if (!waypoints || !Array.isArray(waypoints)) {
    throw new Error('المحطات يجب أن تكون مصفوفة');
  }
  if (waypoints.length === 0) {
    throw new Error('لا توجد محطات في المسار');
  }
  if (waypoints.length > MAX_STOPS_PER_ROUTE) {
    throw new Error(`عدد المحطات يتجاوز الحد الأقصى (${MAX_STOPS_PER_ROUTE})`);
  }

  // التحقق من إحداثيات كل نقطة توقف
  for (const wp of waypoints) {
    if (!wp || wp.lat === undefined || wp.lng === undefined) {
      throw new Error('كل نقطة توقف يجب أن تحتوي على إحداثيات صالحة');
    }
    try {
      validateCoordinates(wp.lat, wp.lng);
    } catch (_e) {
      throw new Error('كل نقطة توقف يجب أن تحتوي على إحداثيات صالحة');
    }
  }

  // 1. الترتيب الأولي بـ Nearest Neighbor
  const nnSorted = nearestNeighborSort(branchLocation, waypoints);

  // 2. تحسين بـ 2-opt (اختياري)
  // يدعم كلاً من use2opt و applyTwoOpt
  const shouldApply2opt = options.applyTwoOpt !== false && options.use2opt !== false;
  let finalRoute = nnSorted;
  let twoOptResult = { improved: false, iterations: 0 };

  if (shouldApply2opt && nnSorted.length >= 4) {
    twoOptResult = twoOptImprove(nnSorted);
    finalRoute = twoOptResult.route;
  }

  // 3. حساب الأوقات المتوقعة
  const routeWithTimes = calculateEstimatedTimes(finalRoute, startTime, options);

  // 4. حساب الإجماليات
  const allPoints = [branchLocation, ...finalRoute];
  const totalDistanceKm = calculateTotalDistance(allPoints);
  const estimatedDurationMinutes = estimateRouteDuration(
    totalDistanceKm,
    finalRoute.length,
    options
  );

  return {
    waypoints: routeWithTimes,
    totalDistanceKm,
    estimatedDurationMinutes,
    twoOptImproved: twoOptResult.improved,
    twoOptIterations: twoOptResult.iterations,
    optimizationApplied: shouldApply2opt ? twoOptResult.improved : false,
    stopsCount: finalRoute.length,
  };
}

/**
 * تقدير مدة الرحلة الكلية
 * @param {number} distanceKm
 * @param {number} stopsCount
 * @param {Object} [options]
 * @returns {number} الدقائق
 */
function estimateRouteDuration(distanceKm, stopsCount, options = {}) {
  const speed = options.speedKmh || DEFAULT_CITY_SPEED_KMH;
  const stopDuration =
    options.stopDurationMinutes !== undefined
      ? options.stopDurationMinutes
      : DEFAULT_STOP_DURATION_MINUTES;

  const travelMinutes = (distanceKm / speed) * 60;
  const stopsMinutes = stopsCount * stopDuration;
  return roundMinutes(travelMinutes + stopsMinutes);
}

// =========================================
// حساب الكفاءة ومقارنة المسارات
// =========================================

/**
 * مقارنة مسارين وحساب نسبة التحسين
 * @param {number} originalDistanceKm - مسافة المسار الأصلي
 * @param {number} optimizedDistanceKm - مسافة المسار المحسن
 * @returns {Object} إحصاءات المقارنة
 */
function compareRoutes(originalDistanceKm, optimizedDistanceKm) {
  if (originalDistanceKm <= 0 || optimizedDistanceKm <= 0) {
    throw new Error('المسافات يجب أن تكون أكبر من صفر');
  }

  const savedKm = originalDistanceKm - optimizedDistanceKm;
  const improvementPercentage = (savedKm / originalDistanceKm) * 100;

  return {
    originalDistanceKm: roundDistance(originalDistanceKm),
    optimizedDistanceKm: roundDistance(optimizedDistanceKm),
    savedKm: roundDistance(savedKm),
    improvementPercentage: Math.round(improvementPercentage * 100) / 100,
    isImproved: savedKm > 0,
  };
}

/**
 * حساب تكلفة الرحلة بناءً على المسافة واستهلاك الوقود
 * @param {number} distanceKm - المسافة بالكيلومترات
 * @param {Object} [options]
 * @param {number} [options.fuelConsumptionPer100Km=12] - استهلاك الوقود لكل 100 كم (لتر)
 * @param {number} [options.fuelPricePerLiter=2.18] - سعر اللتر (ريال سعودي - بنزين 91)
 * @param {number} [options.driverCostPerHour=25] - تكلفة السائق في الساعة
 * @param {number} [options.durationMinutes=0] - مدة الرحلة
 * @returns {Object} تكلفة الرحلة
 */
function calculateTripCost(distanceKm, options = {}) {
  if (distanceKm < 0) throw new Error('المسافة لا يمكن أن تكون سالبة');

  const fuelConsumption = options.fuelConsumptionPer100Km || 12;
  const fuelPrice = options.fuelPricePerLiter || 2.18;
  const driverCost = options.driverCostPerHour || 25;
  const durationHours = (options.durationMinutes || 0) / 60;

  const fuelCost = (distanceKm / 100) * fuelConsumption * fuelPrice;
  const driverTripCost = driverCost * durationHours;
  const totalCost = fuelCost + driverTripCost;

  return {
    distanceKm: distanceKm,
    fuelCost: Math.round(fuelCost * 100) / 100,
    driverTripCost: Math.round(driverTripCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerKm: distanceKm > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : 0,
  };
}

// =========================================
// التحقق من توفر المركبة
// =========================================

/**
 * التحقق من تعارض رحلتين للمركبة نفسها
 * @param {Object} trip1 - الرحلة الأولى {date, startTime, endTime}
 * @param {Object} trip2 - الرحلة الثانية {date, startTime, endTime}
 * @returns {boolean} true = يوجد تعارض
 */
function checkVehicleConflict(trip1, trip2) {
  if (trip1.date !== trip2.date) return false;

  const start1 = timeToMinutes(trip1.startTime);
  const end1 = timeToMinutes(trip1.endTime);
  const start2 = timeToMinutes(trip2.startTime);
  const end2 = timeToMinutes(trip2.endTime);

  // تعارض إذا كانت الفترتان متداخلتان
  return start1 < end2 && end1 > start2;
}

/**
 * التحقق من سعة المركبة
 *
 * يدعم أسلوبين من الاستدعاء:
 * 1. checkVehicleCapacity(vehicle: {capacity, wheelchairSlots}, passengers: [{needsWheelchair}])
 * 2. checkVehicleCapacity(vehicleCapacity: number, requestedPassengers: number, hasWheelchair?, wheelchairSlots?)
 *
 * @param {Object|number} vehicleOrCapacity
 * @param {Array|number} passengersOrCount
 * @returns {Object} نتيجة التحقق
 */
function checkVehicleCapacity(
  vehicleOrCapacity,
  passengersOrCount,
  hasWheelchair,
  wheelchairSlots
) {
  // الأسلوب الجديد: كائن مركبة + مصفوفة ركاب
  if (vehicleOrCapacity !== null && typeof vehicleOrCapacity === 'object') {
    const vehicle = vehicleOrCapacity;

    // التحقق من صحة المركبة
    if (!vehicle || typeof vehicle.capacity !== 'number' || vehicle.capacity <= 0) {
      throw new Error('بيانات المركبة غير صالحة: يجب أن تحتوي على capacity رقمي موجب');
    }

    // التحقق من صحة مصفوفة الركاب
    if (!Array.isArray(passengersOrCount)) {
      throw new Error('قائمة الركاب يجب أن تكون مصفوفة');
    }

    const passengers = passengersOrCount;
    const capacity = vehicle.capacity;
    const wheelchairSlots = vehicle.wheelchairSlots || 0;

    const wheelchairCount = passengers.filter(p => p && p.needsWheelchair).length;
    const regularCount = passengers.length - wheelchairCount;
    const totalPassengers = passengers.length;

    const capacityOk = totalPassengers <= capacity;
    const wheelchairOk = wheelchairCount <= wheelchairSlots;
    const canAccommodate = capacityOk && wheelchairOk;

    let message = null;
    if (!capacityOk) {
      message = `المركبة ممتلئة: السعة ${capacity} والطلب ${totalPassengers}`;
    } else if (!wheelchairOk) {
      message = `مقاعد كرسي متحرك غير كافية: المتاح ${wheelchairSlots} والمطلوب ${wheelchairCount}`;
    }

    return {
      canAccommodate,
      totalPassengers,
      wheelchairCount,
      regularCount,
      availableSeats: Math.max(0, capacity - totalPassengers),
      availableWheelchairSlots: Math.max(0, wheelchairSlots - wheelchairCount),
      message,
    };
  }

  // الأسلوب القديم: أرقام مباشرة (للتوافق العكسي)
  if (vehicleOrCapacity === null || vehicleOrCapacity === undefined) {
    throw new Error('بيانات المركبة غير صالحة');
  }

  const vehicleCapacity = vehicleOrCapacity;
  const requestedPassengers = passengersOrCount;

  if (typeof vehicleCapacity !== 'number' || vehicleCapacity <= 0) {
    throw new Error('بيانات المركبة غير صالحة');
  }
  if (typeof requestedPassengers !== 'number' || requestedPassengers < 0) {
    throw new Error('عدد الركاب لا يمكن أن يكون سالباً');
  }

  const isCapacityOk = requestedPassengers <= vehicleCapacity;
  // دعم hasWheelchair و wheelchairSlots للتوافق مع الـ API القديم
  const wheelchairSlotsVal = typeof wheelchairSlots === 'number' ? wheelchairSlots : 0;
  const isWheelchairOk = !hasWheelchair || wheelchairSlotsVal > 0;
  const availableSeats = vehicleCapacity - requestedPassengers;

  return {
    isCapacityOk,
    isWheelchairOk,
    isSuitable: isCapacityOk && isWheelchairOk,
    vehicleCapacity,
    requestedPassengers,
    availableSeats: Math.max(0, availableSeats),
    occupancyPercentage: Math.round((requestedPassengers / vehicleCapacity) * 100),
  };
}

// =========================================
// إحصاءات الرحلات
// =========================================

/**
 * حساب إحصاءات أسطول المركبات
 * @param {Array<Object>} trips - قائمة الرحلات
 * @returns {Object} الإحصاءات
 */
function calculateFleetStats(trips) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return {
      totalTrips: 0,
      totalDistanceKm: 0,
      totalPassengers: 0,
      avgPassengersPerTrip: 0,
      avgDistancePerTrip: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      completionRate: 0,
    };
  }

  const completed = trips.filter(t => t.status === TRIP_STATUS.COMPLETED);
  const cancelled = trips.filter(t => t.status === TRIP_STATUS.CANCELLED);
  const totalDistance = trips.reduce(
    (sum, t) => sum + (t.actualDistanceKm || t.estimatedDistanceKm || 0),
    0
  );
  const totalPassengers = trips.reduce(
    (sum, t) => sum + (t.actualPassengers || t.expectedPassengers || 0),
    0
  );

  return {
    totalTrips: trips.length,
    totalDistanceKm: roundDistance(totalDistance),
    totalPassengers,
    avgPassengersPerTrip:
      trips.length > 0 ? Math.round((totalPassengers / trips.length) * 10) / 10 : 0,
    avgDistancePerTrip: trips.length > 0 ? roundDistance(totalDistance / trips.length) : 0,
    completedTrips: completed.length,
    cancelledTrips: cancelled.length,
    completionRate:
      trips.length > 0 ? Math.round((completed.length / trips.length) * 100 * 10) / 10 : 0,
  };
}

/**
 * توليد تقرير المركبة الشهري
 * @param {string} vehicleId - معرف المركبة
 * @param {Array<Object>} trips - رحلات الشهر
 * @param {Object} [options]
 * @param {number} [options.fuelConsumptionPer100Km=12]
 * @param {number} [options.fuelPricePerLiter=2.18]
 * @returns {Object} التقرير الشهري
 */
function generateVehicleMonthlyReport(vehicleId, trips, options = {}) {
  if (!vehicleId) throw new Error('معرف المركبة مطلوب');
  if (!Array.isArray(trips)) throw new Error('قائمة الرحلات يجب أن تكون مصفوفة');

  const stats = calculateFleetStats(trips);
  const tripCost = calculateTripCost(stats.totalDistanceKm, {
    ...options,
    durationMinutes: trips.reduce((sum, t) => sum + (t.durationMinutes || 0), 0),
  });

  return {
    vehicleId,
    period: {
      tripsCount: stats.totalTrips,
      completedTrips: stats.completedTrips,
      cancelledTrips: stats.cancelledTrips,
    },
    distances: {
      totalKm: stats.totalDistanceKm,
      avgPerTrip: stats.avgDistancePerTrip,
    },
    passengers: {
      total: stats.totalPassengers,
      avgPerTrip: stats.avgPassengersPerTrip,
    },
    costs: {
      fuelCost: tripCost.fuelCost,
      totalCost: tripCost.totalCost,
      costPerKm: tripCost.costPerKm,
    },
    efficiency: {
      completionRate: stats.completionRate,
    },
  };
}

// =========================================
// دوال إضافية
// =========================================

/**
 * حساب وقت العودة المتوقع
 * @param {string} startTime - وقت البداية "HH:MM"
 * @param {number} durationMinutes - المدة بالدقائق
 * @returns {string} وقت العودة "HH:MM"
 */
function estimateReturnTime(startTime, durationMinutes) {
  const startMins = timeToMinutes(startTime);
  const returnMins = startMins + (durationMinutes || 0);
  return minutesToTime(returnMins);
}

/**
 * تقدير تكلفة الوقود
 * @param {number} distanceKm - المسافة بالكيلومترات
 * @param {Object} [vehicle] - بيانات المركبة {fuelConsumptionPer100km}
 * @param {number} [fuelPricePerLiter=2.18] - سعر اللتر
 * @returns {{liters: number, cost: number}}
 */
function estimateFuelCost(distanceKm, vehicle = {}, fuelPricePerLiter = 2.18) {
  const consumption = vehicle.fuelConsumptionPer100km || 15;
  const liters = Math.round((distanceKm / 100) * consumption * 100) / 100;
  const cost = Math.round(liters * fuelPricePerLiter * 100) / 100;
  return { liters, cost };
}

/**
 * قائمة فحص ما قبل الرحلة
 * @returns {Object} قائمة الفحص مقسمة إلى فئات
 */
function getPreTripChecklist() {
  return {
    exterior: [
      { key: 'tires_condition', labelAr: 'حالة الإطارات', required: true },
      { key: 'lights_working', labelAr: 'جميع الأضواء تعمل', required: true },
      { key: 'mirrors_clean', labelAr: 'المرايا نظيفة وسليمة', required: true },
      { key: 'body_damage', labelAr: 'لا يوجد أضرار بالهيكل', required: true },
      { key: 'wheelchair_ramp', labelAr: 'منحدر الكرسي المتحرك يعمل', required: false },
    ],
    interior: [
      { key: 'seat_belts', labelAr: 'أحزمة الأمان سليمة', required: true },
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
  };
}

/**
 * التحقق من نتائج الفحص قبل الرحلة
 * @param {Object} results - نتائج الفحص {key: boolean}
 * @returns {{passed: boolean, failedRequired: string[], failedOptional: string[], allItems: Array}}
 */
function validatePreTripInspection(results) {
  if (!results || typeof results !== 'object') {
    throw new Error('نتائج الفحص غير صالحة');
  }

  const checklist = getPreTripChecklist();
  const allItems = [...checklist.exterior, ...checklist.interior, ...checklist.safety];
  const failedRequired = [];
  const failedOptional = [];

  for (const item of allItems) {
    const passed = results[item.key] === true;
    if (!passed) {
      if (item.required) {
        failedRequired.push(item);
      } else {
        failedOptional.push(item);
      }
    }
  }

  return {
    passed: failedRequired.length === 0,
    failedRequired,
    failedOptional,
    allItems,
  };
}

/** alias لـ calculateTotalDistance */
const calculateRouteTotalDistance = calculateTotalDistance;

/**
 * alias لـ calculateEstimatedTimes بتوقيع مختلف
 * addEstimatedTimes(waypoints, branchLocation, startTime, options?)
 *
 * يحسب الأوقات مع اعتبار المسافة من موقع الفرع للمحطة الأولى
 */
function addEstimatedTimes(waypoints, branchLocation, startTime, options = {}) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return [];
  }

  const speed = options.speedKmh !== undefined ? options.speedKmh : DEFAULT_CITY_SPEED_KMH;
  const stopDuration =
    options.stopDurationMinutes !== undefined
      ? options.stopDurationMinutes
      : DEFAULT_STOP_DURATION_MINUTES;

  if (speed <= 0) throw new Error('السرعة يجب أن تكون أكبر من صفر');

  let currentMinutes = timeToMinutes(startTime);
  const result = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    let distanceFromPrev = 0;
    let travelMinutes = 0;

    if (i === 0 && branchLocation) {
      // المسافة من الفرع إلى المحطة الأولى
      distanceFromPrev = haversineDistance(branchLocation.lat, branchLocation.lng, wp.lat, wp.lng);
      travelMinutes = (distanceFromPrev / speed) * 60;
      currentMinutes += roundMinutes(travelMinutes);
    } else if (i > 0) {
      // المسافة من المحطة السابقة
      distanceFromPrev = haversineDistance(
        waypoints[i - 1].lat,
        waypoints[i - 1].lng,
        wp.lat,
        wp.lng
      );
      travelMinutes = (distanceFromPrev / speed) * 60 + stopDuration;
      currentMinutes += roundMinutes(travelMinutes);
    }

    result.push({
      ...wp,
      order: i + 1,
      estimatedTime: minutesToTime(currentMinutes),
      estimatedArrival: minutesToTime(currentMinutes),
      estimatedMinutes: currentMinutes,
      distanceFromPrevKm: roundDistance(distanceFromPrev),
      travelMinutes: roundMinutes(i === 0 ? travelMinutes : travelMinutes - stopDuration),
    });
  }

  return result;
}

// =========================================
// التصدير
// =========================================

module.exports = {
  // ثوابت
  EARTH_RADIUS_KM,
  DEFAULT_CITY_SPEED_KMH,
  DEFAULT_STOP_DURATION_MINUTES,
  MAX_TRIP_DISTANCE_KM,
  MAX_STOPS_PER_ROUTE,
  MAX_2OPT_ITERATIONS,
  VEHICLE_TYPES,
  TRIP_STATUS,
  // aliases
  AVG_CITY_SPEED_KMH,
  STOP_DURATION_MINUTES,

  // دوال مساعدة
  validateCoordinates,
  degreesToRadians,
  roundDistance,
  roundMinutes,

  // Haversine
  haversineDistance,
  haversineDistanceMeters,
  calculateTotalDistance,

  // Nearest Neighbor
  nearestNeighborSort,

  // 2-opt
  twoOptSwap,
  twoOptImprove,

  // الأوقات
  timeToMinutes,
  minutesToTime,
  calculateEstimatedTimes,
  estimateRouteDuration,

  // التحسين الكامل
  optimizeRoute,

  // الكفاءة والتكلفة
  compareRoutes,
  calculateTripCost,

  // التحقق من المركبة
  checkVehicleConflict,
  checkVehicleCapacity,

  // الإحصاءات
  calculateFleetStats,
  generateVehicleMonthlyReport,

  // دوال إضافية
  estimateReturnTime,
  estimateFuelCost,
  getPreTripChecklist,
  validatePreTripInspection,
  calculateRouteTotalDistance,
  addEstimatedTimes,
};
