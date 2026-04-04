'use strict';

/**
 * اختبارات خدمة تحسين مسارات النقل
 * Route Optimization Service Tests
 *
 * اختبارات نقية بدون قاعدة بيانات
 */

const {
  EARTH_RADIUS_KM,
  DEFAULT_CITY_SPEED_KMH,
  DEFAULT_STOP_DURATION_MINUTES,
  MAX_STOPS_PER_ROUTE,
  VEHICLE_TYPES,
  TRIP_STATUS,
  validateCoordinates,
  degreesToRadians,
  roundDistance,
  roundMinutes,
  haversineDistance,
  haversineDistanceMeters,
  calculateTotalDistance,
  nearestNeighborSort,
  twoOptSwap,
  twoOptImprove,
  timeToMinutes,
  minutesToTime,
  calculateEstimatedTimes,
  estimateRouteDuration,
  optimizeRoute,
  compareRoutes,
  calculateTripCost,
  checkVehicleConflict,
  checkVehicleCapacity,
  calculateFleetStats,
  generateVehicleMonthlyReport,
} = require('../services/transport/routeOptimization.service');

// =========================================
// بيانات الاختبار - إحداثيات مدن سعودية حقيقية
// =========================================

// الرياض - مركز المدينة
const RIYADH_CENTER = { lat: 24.6877, lng: 46.7219 };

// مواقع في الرياض للاختبار
const RIYADH_POINTS = [
  { lat: 24.7136, lng: 46.6753, id: 1, name: 'العليا' },
  { lat: 24.6508, lng: 46.7738, id: 2, name: 'الشرق' },
  { lat: 24.7272, lng: 46.7786, id: 3, name: 'الملز' },
  { lat: 24.6241, lng: 46.69, id: 4, name: 'الجنوب' },
  { lat: 24.75, lng: 46.75, id: 5, name: 'الشمال' },
];

// جدة - للاختبار
const JEDDAH_CENTER = { lat: 21.4858, lng: 39.1925 };

describe('الثوابت', () => {
  test('EARTH_RADIUS_KM = 6371', () => {
    expect(EARTH_RADIUS_KM).toBe(6371);
  });

  test('DEFAULT_CITY_SPEED_KMH = 30', () => {
    expect(DEFAULT_CITY_SPEED_KMH).toBe(30);
  });

  test('DEFAULT_STOP_DURATION_MINUTES = 3', () => {
    expect(DEFAULT_STOP_DURATION_MINUTES).toBe(3);
  });

  test('MAX_STOPS_PER_ROUTE = 30', () => {
    expect(MAX_STOPS_PER_ROUTE).toBe(30);
  });

  test('VEHICLE_TYPES يحتوي الأنواع الصحيحة', () => {
    expect(VEHICLE_TYPES.BUS).toBe('bus');
    expect(VEHICLE_TYPES.VAN).toBe('van');
    expect(VEHICLE_TYPES.CAR).toBe('car');
    expect(VEHICLE_TYPES.WHEELCHAIR_VAN).toBe('wheelchair_van');
  });

  test('TRIP_STATUS يحتوي الحالات الصحيحة', () => {
    expect(TRIP_STATUS.SCHEDULED).toBe('scheduled');
    expect(TRIP_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(TRIP_STATUS.COMPLETED).toBe('completed');
    expect(TRIP_STATUS.CANCELLED).toBe('cancelled');
  });
});

// =========================================
describe('الدوال المساعدة', () => {
  describe('validateCoordinates', () => {
    test('إحداثيات صحيحة لا تُطلق خطأ', () => {
      expect(() => validateCoordinates(24.6877, 46.7219)).not.toThrow();
    });

    test('إحداثيات الحدود: lat=90, lng=180', () => {
      expect(() => validateCoordinates(90, 180)).not.toThrow();
    });

    test('إحداثيات الحدود: lat=-90, lng=-180', () => {
      expect(() => validateCoordinates(-90, -180)).not.toThrow();
    });

    test('lat > 90 تُطلق خطأ', () => {
      expect(() => validateCoordinates(91, 46)).toThrow();
    });

    test('lat < -90 تُطلق خطأ', () => {
      expect(() => validateCoordinates(-91, 46)).toThrow();
    });

    test('lng > 180 تُطلق خطأ', () => {
      expect(() => validateCoordinates(24, 181)).toThrow();
    });

    test('lng < -180 تُطلق خطأ', () => {
      expect(() => validateCoordinates(24, -181)).toThrow();
    });

    test('نص يُطلق خطأ', () => {
      expect(() => validateCoordinates('24', 46)).toThrow();
    });

    test('NaN يُطلق خطأ', () => {
      expect(() => validateCoordinates(NaN, 46)).toThrow();
    });
  });

  describe('degreesToRadians', () => {
    test('0 درجة = 0 راديان', () => {
      expect(degreesToRadians(0)).toBe(0);
    });

    test('180 درجة = π راديان', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
    });

    test('90 درجة = π/2 راديان', () => {
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    test('360 درجة = 2π راديان', () => {
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
    });
  });

  describe('roundDistance', () => {
    test('1.234 → 1.23', () => {
      expect(roundDistance(1.234)).toBe(1.23);
    });

    test('1.235 → 1.24', () => {
      expect(roundDistance(1.235)).toBe(1.24);
    });

    test('0 → 0', () => {
      expect(roundDistance(0)).toBe(0);
    });

    test('100.0 → 100', () => {
      expect(roundDistance(100.0)).toBe(100);
    });
  });

  describe('roundMinutes', () => {
    test('45.4 → 45', () => {
      expect(roundMinutes(45.4)).toBe(45);
    });

    test('45.5 → 46', () => {
      expect(roundMinutes(45.5)).toBe(46);
    });

    test('0 → 0', () => {
      expect(roundMinutes(0)).toBe(0);
    });
  });
});

// =========================================
describe('haversineDistance - معادلة Haversine', () => {
  test('نفس النقطة = مسافة صفر', () => {
    const dist = haversineDistance(24.6877, 46.7219, 24.6877, 46.7219);
    expect(dist).toBe(0);
  });

  test('المسافة بين الرياض وجدة ≈ 800-950 كم', () => {
    // الرياض: 24.6877, 46.7219
    // جدة: 21.4858, 39.1925
    // Haversine تعطي مسافة خط مستقيم ≈ 848 كم
    const dist = haversineDistance(24.6877, 46.7219, 21.4858, 39.1925);
    expect(dist).toBeGreaterThan(800);
    expect(dist).toBeLessThan(1000);
  });

  test('المسافة بين نقطتين قريبتين (~ 5 كم)', () => {
    // نقطتان في الرياض
    const dist = haversineDistance(24.6877, 46.7219, 24.7136, 46.6753);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(10);
  });

  test('المسافة ذاتها في الاتجاهين (تناظرية)', () => {
    const d1 = haversineDistance(24.6877, 46.7219, 21.4858, 39.1925);
    const d2 = haversineDistance(21.4858, 39.1925, 24.6877, 46.7219);
    expect(d1).toBeCloseTo(d2, 5);
  });

  test('إحداثيات غير صحيحة تُطلق خطأ', () => {
    expect(() => haversineDistance(200, 46, 24, 46)).toThrow();
  });

  test('haversineDistanceMeters = haversineDistance × 1000', () => {
    const km = haversineDistance(24.6877, 46.7219, 24.7136, 46.6753);
    const m = haversineDistanceMeters(24.6877, 46.7219, 24.7136, 46.6753);
    expect(m).toBeCloseTo(km * 1000, 3);
  });
});

// =========================================
describe('calculateTotalDistance', () => {
  test('أقل من نقطتين = 0', () => {
    expect(calculateTotalDistance([{ lat: 24, lng: 46 }])).toBe(0);
    expect(calculateTotalDistance([])).toBe(0);
  });

  test('نقطتان: مجموع المسافة بينهما', () => {
    const pts = [
      { lat: 24.6877, lng: 46.7219 },
      { lat: 24.7136, lng: 46.6753 },
    ];
    const dist = calculateTotalDistance(pts);
    const expected = haversineDistance(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng);
    expect(dist).toBeCloseTo(expected, 2);
  });

  test('ثلاث نقاط: مجموع المسافتين', () => {
    const pts = [
      { lat: 24.6877, lng: 46.7219 },
      { lat: 24.7136, lng: 46.6753 },
      { lat: 24.6508, lng: 46.7738 },
    ];
    const d1 = haversineDistance(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng);
    const d2 = haversineDistance(pts[1].lat, pts[1].lng, pts[2].lat, pts[2].lng);
    const total = calculateTotalDistance(pts);
    expect(total).toBeCloseTo(roundDistance(d1 + d2), 2);
  });
});

// =========================================
describe('nearestNeighborSort - خوارزمية الجار الأقرب', () => {
  test('مصفوفة فارغة تُرجع مصفوفة فارغة', () => {
    expect(nearestNeighborSort(RIYADH_CENTER, [])).toEqual([]);
  });

  test('نقطة واحدة: تُرجع النقطة نفسها', () => {
    const result = nearestNeighborSort(RIYADH_CENTER, [RIYADH_POINTS[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('يُرجع جميع النقاط', () => {
    const result = nearestNeighborSort(RIYADH_CENTER, RIYADH_POINTS);
    expect(result).toHaveLength(RIYADH_POINTS.length);
  });

  test('كل نقطة تظهر مرة واحدة فقط', () => {
    const result = nearestNeighborSort(RIYADH_CENTER, RIYADH_POINTS);
    const ids = result.map(p => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toHaveLength(uniqueIds.length);
  });

  test('أول نقطة هي الأقرب للمركز', () => {
    const result = nearestNeighborSort(RIYADH_CENTER, RIYADH_POINTS);
    const firstDist = haversineDistance(
      RIYADH_CENTER.lat,
      RIYADH_CENTER.lng,
      result[0].lat,
      result[0].lng
    );
    // التحقق أن أولى النقاط أقرب من أي نقطة أخرى للمركز
    const otherDists = result
      .slice(1)
      .map(p => haversineDistance(RIYADH_CENTER.lat, RIYADH_CENTER.lng, p.lat, p.lng));
    expect(firstDist).toBeLessThanOrEqual(Math.min(...otherDists));
  });

  test('إحداثيات بداية غير صحيحة تُطلق خطأ', () => {
    expect(() => nearestNeighborSort({ lat: 200, lng: 46 }, RIYADH_POINTS)).toThrow();
  });
});

// =========================================
describe('twoOptSwap', () => {
  const route = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

  test('تبديل i=1, j=3 يعكس العناصر من index 2 إلى 3', () => {
    // route: [1,2,3,4,5]
    // swap(1,3): before=[1,2], reversed=[4,3], after=[5]
    // نتيجة: [1,2,4,3,5]
    const result = twoOptSwap(route, 1, 3);
    expect(result.map(r => r.id)).toEqual([1, 2, 4, 3, 5]);
  });

  test('تبديل i=0, j=2 يعكس من 1 إلى 2', () => {
    // [1,2,3,4,5] → before=[1], reversed=[3,2], after=[4,5]
    // نتيجة: [1,3,2,4,5]
    const result = twoOptSwap(route, 0, 2);
    expect(result.map(r => r.id)).toEqual([1, 3, 2, 4, 5]);
  });

  test('لا يُعدّل المسار الأصلي', () => {
    const original = [{ id: 1 }, { id: 2 }, { id: 3 }];
    twoOptSwap(original, 0, 1);
    expect(original.map(r => r.id)).toEqual([1, 2, 3]);
  });

  test('يُرجع مصفوفة بنفس الطول', () => {
    const result = twoOptSwap(route, 1, 3);
    expect(result).toHaveLength(route.length);
  });
});

// =========================================
describe('twoOptImprove - تحسين 2-opt', () => {
  test('أقل من 4 نقاط: يُرجع المسار بدون تحسين', () => {
    const route = [
      { lat: 24.6877, lng: 46.7219 },
      { lat: 24.7136, lng: 46.6753 },
      { lat: 24.6508, lng: 46.7738 },
    ];
    const result = twoOptImprove(route);
    expect(result.improved).toBe(false);
    expect(result.iterations).toBe(0);
    expect(result.route).toHaveLength(3);
  });

  test('يُرجع مصفوفة route, improved, iterations', () => {
    const result = twoOptImprove(RIYADH_POINTS);
    expect(result).toHaveProperty('route');
    expect(result).toHaveProperty('improved');
    expect(result).toHaveProperty('iterations');
  });

  test('المسار المحسن يحتوي نفس عدد النقاط', () => {
    const result = twoOptImprove(RIYADH_POINTS);
    expect(result.route).toHaveLength(RIYADH_POINTS.length);
  });

  test('المسار المحسن لا يزيد عن الأصلي', () => {
    const result = twoOptImprove(RIYADH_POINTS);
    const originalDist = calculateTotalDistance(RIYADH_POINTS);
    const improvedDist = calculateTotalDistance(result.route);
    expect(improvedDist).toBeLessThanOrEqual(originalDist + 0.01);
  });

  test('مسار واضح التحسين: تقاطع يجب أن يُحسَّن', () => {
    // مسار يحتوي تقاطعاً واضحاً
    const crossedRoute = [
      { lat: 24.0, lng: 46.0 },
      { lat: 25.0, lng: 47.0 },
      { lat: 24.0, lng: 47.0 },
      { lat: 25.0, lng: 46.0 },
    ];
    const result = twoOptImprove(crossedRoute);
    const crossedDist = calculateTotalDistance(crossedRoute);
    const improvedDist = calculateTotalDistance(result.route);
    expect(improvedDist).toBeLessThan(crossedDist);
  });

  test('maxIterations=1 يحد التكرارات', () => {
    const result = twoOptImprove(RIYADH_POINTS, 1);
    expect(result.iterations).toBeLessThanOrEqual(1);
  });
});

// =========================================
describe('timeToMinutes', () => {
  test('07:00 = 420 دقيقة', () => {
    expect(timeToMinutes('07:00')).toBe(420);
  });

  test('08:30 = 510 دقيقة', () => {
    expect(timeToMinutes('08:30')).toBe(510);
  });

  test('00:00 = 0 دقيقة', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  test('23:59 = 1439 دقيقة', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  test('12:00 = 720 دقيقة', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  test('تنسيق خاطئ تُطلق خطأ', () => {
    expect(() => timeToMinutes('7:0')).toThrow();
    expect(() => timeToMinutes('700')).toThrow();
    expect(() => timeToMinutes('')).toThrow();
    expect(() => timeToMinutes(null)).toThrow();
  });

  test('ساعة > 23 تُطلق خطأ', () => {
    expect(() => timeToMinutes('25:00')).toThrow();
  });

  test('دقيقة > 59 تُطلق خطأ', () => {
    expect(() => timeToMinutes('12:60')).toThrow();
  });
});

// =========================================
describe('minutesToTime', () => {
  test('420 = 07:00', () => {
    expect(minutesToTime(420)).toBe('07:00');
  });

  test('510 = 08:30', () => {
    expect(minutesToTime(510)).toBe('08:30');
  });

  test('0 = 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  test('1439 = 23:59', () => {
    expect(minutesToTime(1439)).toBe('23:59');
  });

  test('1440 (تجاوز يوم) = 00:00', () => {
    expect(minutesToTime(1440)).toBe('00:00');
  });

  test('1500 (تجاوز يوم) = 01:00', () => {
    expect(minutesToTime(1500)).toBe('01:00');
  });

  test('timeToMinutes و minutesToTime عكسيتان', () => {
    const times = ['07:00', '08:30', '12:00', '15:45', '23:59'];
    times.forEach(t => {
      expect(minutesToTime(timeToMinutes(t))).toBe(t);
    });
  });
});

// =========================================
describe('calculateEstimatedTimes', () => {
  test('مصفوفة فارغة تُرجع مصفوفة فارغة', () => {
    expect(calculateEstimatedTimes([], '07:00')).toEqual([]);
  });

  test('أول محطة تبدأ بوقت الانطلاق', () => {
    const result = calculateEstimatedTimes([RIYADH_POINTS[0]], '07:00');
    expect(result[0].estimatedTime).toBe('07:00');
  });

  test('كل محطة تحتوي: order, estimatedTime, estimatedMinutes, distanceFromPrev', () => {
    const result = calculateEstimatedTimes(RIYADH_POINTS.slice(0, 3), '07:00');
    result.forEach(wp => {
      expect(wp).toHaveProperty('order');
      expect(wp).toHaveProperty('estimatedTime');
      expect(wp).toHaveProperty('estimatedMinutes');
      expect(wp).toHaveProperty('distanceFromPrev');
    });
  });

  test('order يبدأ من 1 ويزيد', () => {
    const result = calculateEstimatedTimes(RIYADH_POINTS, '07:00');
    result.forEach((wp, i) => {
      expect(wp.order).toBe(i + 1);
    });
  });

  test('أول محطة: distanceFromPrev = 0', () => {
    const result = calculateEstimatedTimes(RIYADH_POINTS, '07:00');
    expect(result[0].distanceFromPrev).toBe(0);
  });

  test('الأوقات تتزايد تدريجياً', () => {
    const result = calculateEstimatedTimes(RIYADH_POINTS, '07:00');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].estimatedMinutes).toBeGreaterThanOrEqual(result[i - 1].estimatedMinutes);
    }
  });

  test('سرعة 0 تُطلق خطأ', () => {
    expect(() => calculateEstimatedTimes(RIYADH_POINTS, '07:00', { speedKmh: 0 })).toThrow();
  });

  test('وقت توقف مخصص يؤثر على الأوقات', () => {
    const r1 = calculateEstimatedTimes(RIYADH_POINTS.slice(0, 2), '07:00', {
      stopDurationMinutes: 0,
    });
    const r2 = calculateEstimatedTimes(RIYADH_POINTS.slice(0, 2), '07:00', {
      stopDurationMinutes: 10,
    });
    // الثانية يجب أن تكون أكثر تأخيراً
    expect(r2[1].estimatedMinutes).toBeGreaterThan(r1[1].estimatedMinutes);
  });
});

// =========================================
describe('estimateRouteDuration', () => {
  test('10 كم بسرعة 30 + 3 محطات × 3 دقيقة', () => {
    // 10/30 * 60 + 3*3 = 20 + 9 = 29
    expect(estimateRouteDuration(10, 3, { speedKmh: 30, stopDurationMinutes: 3 })).toBe(29);
  });

  test('0 كم، 0 محطات = 0', () => {
    expect(estimateRouteDuration(0, 0)).toBe(0);
  });

  test('استخدام القيم الافتراضية', () => {
    const result = estimateRouteDuration(30, 5);
    // 30/30*60 + 5*3 = 60+15 = 75
    expect(result).toBe(75);
  });
});

// =========================================
describe('optimizeRoute - التحسين الكامل', () => {
  test('يُرجع بنية كاملة', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    expect(result).toHaveProperty('waypoints');
    expect(result).toHaveProperty('totalDistanceKm');
    expect(result).toHaveProperty('estimatedDurationMinutes');
    expect(result).toHaveProperty('twoOptImproved');
    expect(result).toHaveProperty('twoOptIterations');
    expect(result).toHaveProperty('stopsCount');
  });

  test('stopsCount = عدد المحطات المُدخلة', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    expect(result.stopsCount).toBe(RIYADH_POINTS.length);
  });

  test('waypoints تحتوي جميع المحطات', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    expect(result.waypoints).toHaveLength(RIYADH_POINTS.length);
  });

  test('totalDistanceKm > 0', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    expect(result.totalDistanceKm).toBeGreaterThan(0);
  });

  test('estimatedDurationMinutes > 0', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    expect(result.estimatedDurationMinutes).toBeGreaterThan(0);
  });

  test('مصفوفة فارغة تُطلق خطأ', () => {
    expect(() => optimizeRoute(RIYADH_CENTER, [], '07:00')).toThrow();
  });

  test('غير مصفوفة تُطلق خطأ', () => {
    expect(() => optimizeRoute(RIYADH_CENTER, null, '07:00')).toThrow();
  });

  test('تجاوز الحد الأقصى للمحطات تُطلق خطأ', () => {
    const tooMany = Array.from({ length: 31 }, (_, i) => ({
      lat: 24 + i * 0.01,
      lng: 46 + i * 0.01,
    }));
    expect(() => optimizeRoute(RIYADH_CENTER, tooMany, '07:00')).toThrow();
  });

  test('إحداثيات المركز غير صحيحة تُطلق خطأ', () => {
    expect(() => optimizeRoute({ lat: 200, lng: 46 }, RIYADH_POINTS, '07:00')).toThrow();
  });

  test('تعطيل 2-opt باستخدام use2opt=false', () => {
    const result = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00', { use2opt: false });
    expect(result.twoOptImproved).toBe(false);
    expect(result.twoOptIterations).toBe(0);
  });

  test('نقطة واحدة: يعمل بشكل صحيح', () => {
    const result = optimizeRoute(RIYADH_CENTER, [RIYADH_POINTS[0]], '07:00');
    expect(result.stopsCount).toBe(1);
    expect(result.waypoints).toHaveLength(1);
  });
});

// =========================================
describe('compareRoutes - مقارنة المسارات', () => {
  test('مسار محسن أقصر: isImproved = true', () => {
    const result = compareRoutes(50, 40);
    expect(result.isImproved).toBe(true);
    expect(result.savedKm).toBe(10);
  });

  test('مسار أطول: isImproved = false', () => {
    const result = compareRoutes(40, 50);
    expect(result.isImproved).toBe(false);
    expect(result.savedKm).toBe(-10);
  });

  test('نسبة التحسين صحيحة: (50-40)/50 = 20%', () => {
    const result = compareRoutes(50, 40);
    expect(result.improvementPercentage).toBeCloseTo(20, 1);
  });

  test('مسافة صفر تُطلق خطأ', () => {
    expect(() => compareRoutes(0, 40)).toThrow();
    expect(() => compareRoutes(50, 0)).toThrow();
  });

  test('يُرجع جميع الحقول', () => {
    const result = compareRoutes(50, 40);
    expect(result).toHaveProperty('originalDistanceKm');
    expect(result).toHaveProperty('optimizedDistanceKm');
    expect(result).toHaveProperty('savedKm');
    expect(result).toHaveProperty('improvementPercentage');
    expect(result).toHaveProperty('isImproved');
  });
});

// =========================================
describe('calculateTripCost - تكلفة الرحلة', () => {
  test('حساب تكلفة الوقود: 100 كم × 12 ل/100 × 2.18 ر = 26.16', () => {
    const result = calculateTripCost(100, {
      fuelConsumptionPer100Km: 12,
      fuelPricePerLiter: 2.18,
      driverCostPerHour: 0,
      durationMinutes: 0,
    });
    expect(result.fuelCost).toBeCloseTo(26.16, 1);
  });

  test('تكلفة السائق: 2 ساعة × 25 = 50 ر', () => {
    const result = calculateTripCost(0, {
      fuelConsumptionPer100Km: 0,
      fuelPricePerLiter: 0,
      driverCostPerHour: 25,
      durationMinutes: 120,
    });
    expect(result.driverTripCost).toBeCloseTo(50, 1);
  });

  test('totalCost = fuelCost + driverTripCost', () => {
    const result = calculateTripCost(100, {
      fuelConsumptionPer100Km: 12,
      fuelPricePerLiter: 2.18,
      driverCostPerHour: 25,
      durationMinutes: 120,
    });
    expect(result.totalCost).toBeCloseTo(result.fuelCost + result.driverTripCost, 1);
  });

  test('مسافة 0 = تكلفة وقود 0', () => {
    const result = calculateTripCost(0);
    expect(result.fuelCost).toBe(0);
  });

  test('costPerKm = totalCost / distanceKm', () => {
    const result = calculateTripCost(100, {
      fuelConsumptionPer100Km: 12,
      fuelPricePerLiter: 2.18,
      driverCostPerHour: 0,
    });
    expect(result.costPerKm).toBeCloseTo(result.totalCost / 100, 2);
  });

  test('مسافة سالبة تُطلق خطأ', () => {
    expect(() => calculateTripCost(-10)).toThrow();
  });
});

// =========================================
describe('checkVehicleConflict - تعارض المركبة', () => {
  test('تواريخ مختلفة: لا تعارض', () => {
    const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '09:00' };
    const t2 = { date: '2025-01-02', startTime: '08:00', endTime: '09:00' };
    expect(checkVehicleConflict(t1, t2)).toBe(false);
  });

  test('تداخل تام: تعارض', () => {
    const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
    const t2 = { date: '2025-01-01', startTime: '08:30', endTime: '09:30' };
    expect(checkVehicleConflict(t1, t2)).toBe(true);
  });

  test('تداخل جزئي: تعارض', () => {
    const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
    const t2 = { date: '2025-01-01', startTime: '09:00', endTime: '11:00' };
    expect(checkVehicleConflict(t1, t2)).toBe(true);
  });

  test('رحلتان متتاليتان: لا تعارض', () => {
    const t1 = { date: '2025-01-01', startTime: '08:00', endTime: '10:00' };
    const t2 = { date: '2025-01-01', startTime: '10:00', endTime: '12:00' };
    expect(checkVehicleConflict(t1, t2)).toBe(false);
  });

  test('رحلة ثانية قبل الأولى: لا تعارض', () => {
    const t1 = { date: '2025-01-01', startTime: '10:00', endTime: '12:00' };
    const t2 = { date: '2025-01-01', startTime: '07:00', endTime: '09:00' };
    expect(checkVehicleConflict(t1, t2)).toBe(false);
  });
});

// =========================================
describe('checkVehicleCapacity - سعة المركبة', () => {
  test('ركاب ضمن السعة: isSuitable = true', () => {
    const result = checkVehicleCapacity(10, 8);
    expect(result.isSuitable).toBe(true);
    expect(result.isCapacityOk).toBe(true);
  });

  test('ركاب = السعة: مناسب', () => {
    const result = checkVehicleCapacity(10, 10);
    expect(result.isCapacityOk).toBe(true);
  });

  test('ركاب > السعة: غير مناسب', () => {
    const result = checkVehicleCapacity(10, 12);
    expect(result.isCapacityOk).toBe(false);
    expect(result.isSuitable).toBe(false);
  });

  test('كرسي متحرك بدون مقعد مخصص: غير مناسب', () => {
    const result = checkVehicleCapacity(10, 5, true, 0);
    expect(result.isWheelchairOk).toBe(false);
    expect(result.isSuitable).toBe(false);
  });

  test('كرسي متحرك مع مقعد مخصص: مناسب', () => {
    const result = checkVehicleCapacity(10, 5, true, 2);
    expect(result.isWheelchairOk).toBe(true);
  });

  test('availableSeats = capacity - requested', () => {
    const result = checkVehicleCapacity(10, 7);
    expect(result.availableSeats).toBe(3);
  });

  test('occupancyPercentage صحيح: 7/10 = 70%', () => {
    const result = checkVehicleCapacity(10, 7);
    expect(result.occupancyPercentage).toBe(70);
  });

  test('سعة صفر تُطلق خطأ', () => {
    expect(() => checkVehicleCapacity(0, 5)).toThrow();
  });

  test('ركاب سالبون يُطلقون خطأ', () => {
    expect(() => checkVehicleCapacity(10, -1)).toThrow();
  });
});

// =========================================
describe('calculateFleetStats - إحصاءات الأسطول', () => {
  const trips = [
    { status: 'completed', actualDistanceKm: 20, actualPassengers: 5 },
    { status: 'completed', actualDistanceKm: 30, actualPassengers: 8 },
    { status: 'cancelled', actualDistanceKm: 0, actualPassengers: 0 },
    { status: 'completed', actualDistanceKm: 15, actualPassengers: 4 },
  ];

  test('مصفوفة فارغة تُرجع صفرات', () => {
    const result = calculateFleetStats([]);
    expect(result.totalTrips).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  test('totalTrips صحيح', () => {
    expect(calculateFleetStats(trips).totalTrips).toBe(4);
  });

  test('completedTrips صحيح', () => {
    expect(calculateFleetStats(trips).completedTrips).toBe(3);
  });

  test('cancelledTrips صحيح', () => {
    expect(calculateFleetStats(trips).cancelledTrips).toBe(1);
  });

  test('totalDistanceKm = 65', () => {
    expect(calculateFleetStats(trips).totalDistanceKm).toBe(65);
  });

  test('totalPassengers = 17', () => {
    expect(calculateFleetStats(trips).totalPassengers).toBe(17);
  });

  test('completionRate = 75%', () => {
    expect(calculateFleetStats(trips).completionRate).toBe(75);
  });

  test('avgDistancePerTrip = 65/4 = 16.25', () => {
    expect(calculateFleetStats(trips).avgDistancePerTrip).toBe(16.25);
  });
});

// =========================================
describe('generateVehicleMonthlyReport - تقرير المركبة الشهري', () => {
  const vehicleId = 'VEH-001';
  const trips = [
    { status: 'completed', actualDistanceKm: 50, actualPassengers: 6, durationMinutes: 60 },
    { status: 'completed', actualDistanceKm: 40, actualPassengers: 4, durationMinutes: 45 },
    { status: 'cancelled', actualDistanceKm: 0, actualPassengers: 0, durationMinutes: 0 },
  ];

  test('يُرجع تقريراً للمركبة الصحيحة', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report.vehicleId).toBe(vehicleId);
  });

  test('يحتوي على جميع الأقسام', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report).toHaveProperty('period');
    expect(report).toHaveProperty('distances');
    expect(report).toHaveProperty('passengers');
    expect(report).toHaveProperty('costs');
    expect(report).toHaveProperty('efficiency');
  });

  test('period.tripsCount صحيح', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report.period.tripsCount).toBe(3);
  });

  test('distances.totalKm صحيح', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report.distances.totalKm).toBe(90);
  });

  test('costs.totalCost > 0', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report.costs.totalCost).toBeGreaterThan(0);
  });

  test('efficiency.completionRate = 66.7%', () => {
    const report = generateVehicleMonthlyReport(vehicleId, trips);
    expect(report.efficiency.completionRate).toBeCloseTo(66.7, 0);
  });

  test('vehicleId مطلوب', () => {
    expect(() => generateVehicleMonthlyReport('', trips)).toThrow();
  });

  test('trips يجب أن تكون مصفوفة', () => {
    expect(() => generateVehicleMonthlyReport(vehicleId, null)).toThrow();
  });
});

// =========================================
describe('سيناريوهات متكاملة', () => {
  test('دورة كاملة: تحسين مسار ثم حساب التكلفة', () => {
    const optimized = optimizeRoute(RIYADH_CENTER, RIYADH_POINTS, '07:00');
    const cost = calculateTripCost(optimized.totalDistanceKm, {
      durationMinutes: optimized.estimatedDurationMinutes,
    });
    expect(cost.totalCost).toBeGreaterThan(0);
    expect(cost.distanceKm).toBe(optimized.totalDistanceKm);
  });

  test('تحسين المسار يكون أفضل من الترتيب العشوائي في كثير من الحالات', () => {
    // مسار عشوائي بترتيب معكوس
    const reversedPoints = [...RIYADH_POINTS].reverse();
    const optimizedResult = optimizeRoute(RIYADH_CENTER, reversedPoints, '07:00');

    // المسار المحسن يجب ألا يزيد عن المسار العشوائي
    const allPoints1 = [RIYADH_CENTER, ...reversedPoints];
    const randomDist = calculateTotalDistance(allPoints1);
    expect(optimizedResult.totalDistanceKm).toBeLessThanOrEqual(randomDist + 0.1);
  });

  test('checkVehicleConflict + checkVehicleCapacity معاً', () => {
    const vehicle = { capacity: 15, wheelchairSlots: 2 };

    // رحلتان في نفس التاريخ والوقت
    const t1 = { date: '2025-03-01', startTime: '08:00', endTime: '09:30' };
    const t2 = { date: '2025-03-01', startTime: '09:00', endTime: '10:30' };

    const hasConflict = checkVehicleConflict(t1, t2);
    const capacityCheck = checkVehicleCapacity(vehicle.capacity, 12, false, 0);

    expect(hasConflict).toBe(true); // تعارض زمني
    expect(capacityCheck.isSuitable).toBe(true); // سعة كافية
  });

  test('تقرير شهري مع مسار محسن', () => {
    const trips = Array.from({ length: 20 }, (_, i) => ({
      status: i < 18 ? 'completed' : 'cancelled',
      actualDistanceKm: 15 + i,
      actualPassengers: 5 + (i % 3),
      durationMinutes: 40 + i,
    }));

    const report = generateVehicleMonthlyReport('VEH-001', trips);
    expect(report.period.tripsCount).toBe(20);
    expect(report.efficiency.completionRate).toBe(90);
    expect(report.costs.fuelCost).toBeGreaterThan(0);
  });

  test('تحسين مسار بنقطتين فقط', () => {
    const twoPoints = [RIYADH_POINTS[0], RIYADH_POINTS[1]];
    const result = optimizeRoute(RIYADH_CENTER, twoPoints, '08:00');
    expect(result.stopsCount).toBe(2);
    expect(result.waypoints).toHaveLength(2);
    // 2-opt لا يُطبَّق على أقل من 4 نقاط
    expect(result.twoOptImproved).toBe(false);
  });
});
