'use strict';

/**
 * اختبارات وحدة تحسين مسارات النقل
 * Transport Route Optimization — Unit Tests
 *
 * يغطي:
 *  - Haversine distance formula
 *  - calculateRouteTotalDistance
 *  - nearestNeighborSort
 *  - twoOptSwap & twoOptImprove
 *  - optimizeRoute (الدالة الرئيسية)
 *  - addEstimatedTimes
 *  - checkVehicleCapacity
 *  - getPreTripChecklist & validatePreTripInspection
 *  - estimateReturnTime
 *  - estimateFuelCost
 *  - timeToMinutes & minutesToTime
 */

const {
  haversineDistance,
  calculateRouteTotalDistance,
  nearestNeighborSort,
  twoOptSwap,
  twoOptImprove,
  optimizeRoute,
  addEstimatedTimes,
  checkVehicleCapacity,
  getPreTripChecklist,
  validatePreTripInspection,
  estimateReturnTime,
  estimateFuelCost,
  timeToMinutes,
  minutesToTime,
  AVG_CITY_SPEED_KMH,
  STOP_DURATION_MINUTES,
  EARTH_RADIUS_KM,
} = require('../services/transport/routeOptimization.service');

// ─── بيانات الاختبار ──────────────────────────────────────────────────────────

/** موقع فرع الرياض (وسط المدينة تقريباً) */
const RIYADH_BRANCH = { lat: 24.7136, lng: 46.6753, id: 'branch' };

/** نقاط توقف في أحياء الرياض المختلفة */
const RIYADH_WAYPOINTS = [
  { id: 'w1', lat: 24.7742, lng: 46.7382, name: 'العليا' }, // ~8 كم شمال
  { id: 'w2', lat: 24.6877, lng: 46.7224, name: 'الملقا' }, // ~5 كم شرق
  { id: 'w3', lat: 24.6555, lng: 46.643, name: 'النزهة' }, // ~7 كم جنوب
  { id: 'w4', lat: 24.74, lng: 46.62, name: 'الروضة' }, // ~5 كم شمال غرب
];

// ─── haversineDistance ────────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('يُعيد 0 للنقطة نفسها', () => {
    expect(haversineDistance(24.7136, 46.6753, 24.7136, 46.6753)).toBe(0);
  });

  it('يحسب مسافة تقريبية صحيحة بين مكة والمدينة', () => {
    // مكة المكرمة → المدينة المنورة ≈ 340 كم
    const dist = haversineDistance(21.3891, 39.8579, 24.5247, 39.5692);
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(360);
  });

  it('المسافة متماثلة في الاتجاهين (A→B = B→A)', () => {
    const d1 = haversineDistance(24.7136, 46.6753, 24.7742, 46.7382);
    const d2 = haversineDistance(24.7742, 46.7382, 24.7136, 46.6753);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.0001);
  });

  it('يُعيد قيمة موجبة لنقطتين مختلفتين', () => {
    const dist = haversineDistance(24.7136, 46.6753, 24.7742, 46.7382);
    expect(dist).toBeGreaterThan(0);
  });

  it('يرمي خطأ عند إحداثيات غير رقمية', () => {
    expect(() => haversineDistance('24.7', 46.6, 24.8, 46.7)).toThrow('إحداثيات غير صالحة');
    expect(() => haversineDistance(24.7, null, 24.8, 46.7)).toThrow('إحداثيات غير صالحة');
    expect(() => haversineDistance(24.7, 46.6, 24.8, undefined)).toThrow('إحداثيات غير صالحة');
  });

  it('المسافة بين نقطتين قريبتين أقل من بعيدتين', () => {
    const close = haversineDistance(24.7136, 46.6753, 24.72, 46.68);
    const far = haversineDistance(24.7136, 46.6753, 24.9, 47.0);
    expect(close).toBeLessThan(far);
  });
});

// ─── calculateRouteTotalDistance ─────────────────────────────────────────────

describe('calculateRouteTotalDistance', () => {
  it('يُعيد 0 لمصفوفة فارغة', () => {
    expect(calculateRouteTotalDistance([])).toBe(0);
  });

  it('يُعيد 0 لنقطة واحدة', () => {
    expect(calculateRouteTotalDistance([RIYADH_BRANCH])).toBe(0);
  });

  it('يحسب مسافة مسار من نقطتين', () => {
    const dist = calculateRouteTotalDistance([RIYADH_BRANCH, RIYADH_WAYPOINTS[0]]);
    expect(dist).toBeGreaterThan(0);
  });

  it('مسافة مسار من 3 نقاط = مجموع المسافتين', () => {
    const p1 = RIYADH_BRANCH;
    const p2 = RIYADH_WAYPOINTS[0];
    const p3 = RIYADH_WAYPOINTS[1];

    const d12 = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const d23 = haversineDistance(p2.lat, p2.lng, p3.lat, p3.lng);
    const total = calculateRouteTotalDistance([p1, p2, p3]);

    expect(Math.abs(total - (d12 + d23))).toBeLessThan(0.0001);
  });

  it('يرفض إدخال غير مصفوفة', () => {
    expect(calculateRouteTotalDistance(null)).toBe(0);
    expect(calculateRouteTotalDistance(undefined)).toBe(0);
  });
});

// ─── timeToMinutes & minutesToTime ────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('يحوّل 07:00 إلى 420', () => expect(timeToMinutes('07:00')).toBe(420));
  it('يحوّل 09:30 إلى 570', () => expect(timeToMinutes('09:30')).toBe(570));
  it('يحوّل 16:00 إلى 960', () => expect(timeToMinutes('16:00')).toBe(960));
  it('يرمي خطأ على ساعة غير صالحة', () => {
    expect(() => timeToMinutes('25:00')).toThrow();
  });
  it('يرمي خطأ على دقائق غير صالحة', () => {
    expect(() => timeToMinutes('10:60')).toThrow();
  });
  it('يرمي خطأ على قيمة غير نصية', () => {
    expect(() => timeToMinutes(700)).toThrow();
    expect(() => timeToMinutes(null)).toThrow();
  });
});

describe('minutesToTime', () => {
  it('يحوّل 420 إلى 07:00', () => expect(minutesToTime(420)).toBe('07:00'));
  it('يحوّل 570 إلى 09:30', () => expect(minutesToTime(570)).toBe('09:30'));
  it('يحوّل 960 إلى 16:00', () => expect(minutesToTime(960)).toBe('16:00'));
  it('يحوّل 0 إلى 00:00', () => expect(minutesToTime(0)).toBe('00:00'));
  it('قراءة عكسية: timeToMinutes(minutesToTime(x)) === x', () => {
    [0, 420, 570, 960, 1439].forEach(m => {
      expect(timeToMinutes(minutesToTime(m))).toBe(m);
    });
  });
});

// ─── nearestNeighborSort ──────────────────────────────────────────────────────

describe('nearestNeighborSort', () => {
  it('يُعيد مصفوفة فارغة لمدخل فارغ', () => {
    expect(nearestNeighborSort(RIYADH_BRANCH, [])).toHaveLength(0);
  });

  it('يُعيد نقطة واحدة كما هي', () => {
    const result = nearestNeighborSort(RIYADH_BRANCH, [RIYADH_WAYPOINTS[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('w1');
  });

  it('يُعيد جميع النقاط مرتبة', () => {
    const result = nearestNeighborSort(RIYADH_BRANCH, RIYADH_WAYPOINTS);
    expect(result).toHaveLength(RIYADH_WAYPOINTS.length);
  });

  it('لا يكرر أي نقطة في النتيجة', () => {
    const result = nearestNeighborSort(RIYADH_BRANCH, RIYADH_WAYPOINTS);
    const ids = result.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(RIYADH_WAYPOINTS.length);
  });

  it('النقطة الأولى هي الأقرب للفرع', () => {
    const result = nearestNeighborSort(RIYADH_BRANCH, RIYADH_WAYPOINTS);
    const firstDist = haversineDistance(
      RIYADH_BRANCH.lat,
      RIYADH_BRANCH.lng,
      result[0].lat,
      result[0].lng
    );
    // كل نقطة أخرى يجب أن تكون أبعد أو مساوية من الفرع
    RIYADH_WAYPOINTS.forEach(wp => {
      if (wp.id !== result[0].id) {
        const dist = haversineDistance(RIYADH_BRANCH.lat, RIYADH_BRANCH.lng, wp.lat, wp.lng);
        expect(firstDist).toBeLessThanOrEqual(dist + 0.001);
      }
    });
  });

  it('يرمي خطأ إذا كانت نقطة البداية غير صالحة', () => {
    expect(() => nearestNeighborSort(null, RIYADH_WAYPOINTS)).toThrow('نقطة البداية غير صالحة');
    expect(() => nearestNeighborSort({ lat: 'abc', lng: 46.6 }, RIYADH_WAYPOINTS)).toThrow();
  });

  it('لا يعدّل المصفوفة الأصلية', () => {
    const original = [...RIYADH_WAYPOINTS];
    nearestNeighborSort(RIYADH_BRANCH, RIYADH_WAYPOINTS);
    expect(RIYADH_WAYPOINTS[0].id).toBe(original[0].id);
  });
});

// ─── twoOptSwap ───────────────────────────────────────────────────────────────

describe('twoOptSwap', () => {
  const route = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }];

  it('يعكس الجزء المحدد من المسار', () => {
    // swap(0, 2): [A, C, B, D, E]
    const result = twoOptSwap(route, 0, 2);
    expect(result.map(p => p.id)).toEqual(['A', 'C', 'B', 'D', 'E']);
  });

  it('يُعيد نفس المسار عند swap(i, i+1)', () => {
    // swap(1, 2): [A, B, C, D, E] - لا تغيير لأن عكس عنصر واحد نفسه
    const result = twoOptSwap(route, 1, 2);
    expect(result.map(p => p.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('لا يعدّل المصفوفة الأصلية', () => {
    twoOptSwap(route, 0, 3);
    expect(route[0].id).toBe('A');
    expect(route[1].id).toBe('B');
  });

  it('تبديل كامل i=0 و j=آخر', () => {
    const result = twoOptSwap(route, 0, 4);
    expect(result.map(p => p.id)).toEqual(['A', 'E', 'D', 'C', 'B']);
  });
});

// ─── twoOptImprove ────────────────────────────────────────────────────────────

describe('twoOptImprove', () => {
  it('يُعيد نسخة من المسار إذا كان أقل من 4 نقاط', () => {
    const short = [RIYADH_WAYPOINTS[0], RIYADH_WAYPOINTS[1], RIYADH_WAYPOINTS[2]];
    const result = twoOptImprove(short);
    // twoOptImprove تُرجع {route, improved, iterations}
    expect(result.route).toHaveLength(3);
  });

  it('لا يُقصّر أو يُطوّل المسار', () => {
    const result = twoOptImprove(RIYADH_WAYPOINTS);
    expect(result.route).toHaveLength(RIYADH_WAYPOINTS.length);
  });

  it('المسافة بعد التحسين <= المسافة قبله', () => {
    const original = RIYADH_WAYPOINTS;
    const improved = twoOptImprove(original);
    const originalDist = calculateRouteTotalDistance(original);
    const improvedDist = calculateRouteTotalDistance(improved.route);
    expect(improvedDist).toBeLessThanOrEqual(originalDist + 0.001);
  });

  it('يُعيد مصفوفة فارغة لمدخل فارغ', () => {
    expect(twoOptImprove([]).route).toHaveLength(0);
  });

  it('لا يعدّل المصفوفة الأصلية', () => {
    const original = [...RIYADH_WAYPOINTS];
    const firstId = RIYADH_WAYPOINTS[0].id;
    twoOptImprove(RIYADH_WAYPOINTS);
    expect(RIYADH_WAYPOINTS[0].id).toBe(firstId);
  });

  it('يُحسَّن مسار متشابك (crossing path)', () => {
    // مسار متشابك يمكن تحسينه
    // A(0,0) → C(2,2) → B(0,2) → D(2,0) - متشابك
    // الأفضل: A(0,0) → B(0,2) → C(2,2) → D(2,0)
    const tangled = [
      { id: 'A', lat: 0, lng: 0 },
      { id: 'C', lat: 2, lng: 2 },
      { id: 'B', lat: 0, lng: 2 },
      { id: 'D', lat: 2, lng: 0 },
    ];
    const improved = twoOptImprove(tangled);
    const origDist = calculateRouteTotalDistance(tangled);
    const impDist = calculateRouteTotalDistance(improved.route);
    expect(impDist).toBeLessThanOrEqual(origDist + 0.001);
  });
});

// ─── optimizeRoute ────────────────────────────────────────────────────────────

describe('optimizeRoute', () => {
  it('يُعيد بنية صحيحة للنتيجة', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    expect(result).toHaveProperty('waypoints');
    expect(result).toHaveProperty('totalDistanceKm');
    expect(result).toHaveProperty('estimatedDurationMinutes');
    expect(result).toHaveProperty('optimizationApplied');
  });

  it('يُطلق خطأ عند قائمة نقاط فارغة', () => {
    expect(() => optimizeRoute(RIYADH_BRANCH, [], '07:00')).toThrow('لا توجد محطات');
  });

  it('يحافظ على جميع نقاط التوقف', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    expect(result.waypoints).toHaveLength(RIYADH_WAYPOINTS.length);
  });

  it('كل نقطة لها وقت وصول متوقع', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    result.waypoints.forEach(wp => {
      expect(wp).toHaveProperty('estimatedArrival');
      expect(wp.estimatedArrival).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('كل نقطة لها ترتيب صحيح', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    result.waypoints.forEach((wp, i) => {
      expect(wp.order).toBe(i + 1);
    });
  });

  it('الوقت المتوقع يتزايد مع كل نقطة', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    for (let i = 1; i < result.waypoints.length; i++) {
      const prev = timeToMinutes(result.waypoints[i - 1].estimatedArrival);
      const curr = timeToMinutes(result.waypoints[i].estimatedArrival);
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it('المسافة الإجمالية موجبة', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    expect(result.totalDistanceKm).toBeGreaterThan(0);
  });

  it('الوقت المقدر موجب', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    expect(result.estimatedDurationMinutes).toBeGreaterThan(0);
  });

  it('يعمل مع نقطة واحدة فقط', () => {
    const result = optimizeRoute(RIYADH_BRANCH, [RIYADH_WAYPOINTS[0]], '07:00');
    expect(result.waypoints).toHaveLength(1);
    expect(result.totalDistanceKm).toBeGreaterThan(0);
  });

  it('يرمي خطأ لموقع فرع غير صالح', () => {
    expect(() => optimizeRoute(null, RIYADH_WAYPOINTS, '07:00')).toThrow('موقع الفرع غير صالح');
    expect(() => optimizeRoute({}, RIYADH_WAYPOINTS, '07:00')).toThrow('موقع الفرع غير صالح');
  });

  it('يرمي خطأ إذا كانت نقطة توقف بدون إحداثيات', () => {
    const badWaypoints = [...RIYADH_WAYPOINTS, { id: 'bad', name: 'بدون إحداثيات' }];
    expect(() => optimizeRoute(RIYADH_BRANCH, badWaypoints, '07:00')).toThrow('إحداثيات صالحة');
  });

  it('يدعم وقت مغادرة مختلف', () => {
    const result1 = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00');
    const result2 = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '14:00');

    // الأوقات مختلفة
    expect(result1.waypoints[0].estimatedArrival).not.toBe(result2.waypoints[0].estimatedArrival);
    // لكن المسافة نفسها
    expect(result1.totalDistanceKm).toBe(result2.totalDistanceKm);
  });

  it('يدعم تعطيل خوارزمية 2-opt', () => {
    const result = optimizeRoute(RIYADH_BRANCH, RIYADH_WAYPOINTS, '07:00', { applyTwoOpt: false });
    expect(result.optimizationApplied).toBe(false);
    expect(result.waypoints).toHaveLength(RIYADH_WAYPOINTS.length);
  });
});

// ─── addEstimatedTimes ────────────────────────────────────────────────────────

describe('addEstimatedTimes', () => {
  it('يُعيد مصفوفة فارغة لمدخل فارغ', () => {
    expect(addEstimatedTimes([], RIYADH_BRANCH, '07:00')).toHaveLength(0);
  });

  it('يضيف وقت الوصول لكل نقطة', () => {
    const result = addEstimatedTimes([RIYADH_WAYPOINTS[0]], RIYADH_BRANCH, '07:00');
    expect(result[0]).toHaveProperty('estimatedArrival');
    expect(result[0]).toHaveProperty('order', 1);
    expect(result[0]).toHaveProperty('distanceFromPrevKm');
    expect(result[0]).toHaveProperty('travelMinutes');
  });

  it('الوقت المتوقع بعد وقت المغادرة', () => {
    const result = addEstimatedTimes([RIYADH_WAYPOINTS[0]], RIYADH_BRANCH, '07:00');
    const arrivalMin = timeToMinutes(result[0].estimatedArrival);
    expect(arrivalMin).toBeGreaterThan(420); // > 07:00
  });

  it('يحافظ على بيانات النقطة الأصلية', () => {
    const result = addEstimatedTimes([RIYADH_WAYPOINTS[0]], RIYADH_BRANCH, '07:00');
    expect(result[0].id).toBe('w1');
    expect(result[0].name).toBe('العليا');
  });
});

// ─── checkVehicleCapacity ─────────────────────────────────────────────────────

describe('checkVehicleCapacity', () => {
  const bus = { capacity: 15, wheelchairSlots: 3 };

  it('يقبل ركاباً ضمن السعة', () => {
    const passengers = Array.from({ length: 10 }, () => ({ needsWheelchair: false }));
    const result = checkVehicleCapacity(bus, passengers);
    expect(result.canAccommodate).toBe(true);
    expect(result.totalPassengers).toBe(10);
  });

  it('يرفض عند تجاوز السعة الإجمالية', () => {
    const passengers = Array.from({ length: 16 }, () => ({ needsWheelchair: false }));
    const result = checkVehicleCapacity(bus, passengers);
    expect(result.canAccommodate).toBe(false);
    expect(result.message).toContain('ممتلئة');
  });

  it('يقبل كراسي متحركة ضمن الحد', () => {
    const passengers = [
      { needsWheelchair: true },
      { needsWheelchair: true },
      { needsWheelchair: false },
    ];
    const result = checkVehicleCapacity(bus, passengers);
    expect(result.canAccommodate).toBe(true);
    expect(result.wheelchairCount).toBe(2);
    expect(result.regularCount).toBe(1);
  });

  it('يرفض عند تجاوز أماكن الكراسي المتحركة', () => {
    const passengers = Array.from({ length: 4 }, () => ({ needsWheelchair: true }));
    const result = checkVehicleCapacity(bus, passengers);
    expect(result.canAccommodate).toBe(false);
    expect(result.message).toContain('كرسي متحرك');
  });

  it('يقبل قائمة فارغة', () => {
    const result = checkVehicleCapacity(bus, []);
    expect(result.canAccommodate).toBe(true);
    expect(result.totalPassengers).toBe(0);
  });

  it('مركبة بدون أماكن كرسي متحرك تحسب 0', () => {
    const minibus = { capacity: 8 }; // بدون wheelchairSlots
    const passengers = [{ needsWheelchair: true }];
    const result = checkVehicleCapacity(minibus, passengers);
    expect(result.canAccommodate).toBe(false);
  });

  it('يرمي خطأ لمركبة غير صالحة', () => {
    expect(() => checkVehicleCapacity(null, [])).toThrow('بيانات المركبة غير صالحة');
    expect(() => checkVehicleCapacity({}, [])).toThrow('بيانات المركبة غير صالحة');
  });

  it('يرمي خطأ لركاب غير مصفوفة', () => {
    expect(() => checkVehicleCapacity(bus, null)).toThrow('قائمة الركاب');
  });
});

// ─── getPreTripChecklist ──────────────────────────────────────────────────────

describe('getPreTripChecklist', () => {
  it('يُعيد 3 فئات رئيسية', () => {
    const checklist = getPreTripChecklist();
    expect(checklist).toHaveProperty('exterior');
    expect(checklist).toHaveProperty('interior');
    expect(checklist).toHaveProperty('safety');
  });

  it('يحتوي على عناصر إلزامية في كل فئة', () => {
    const checklist = getPreTripChecklist();
    const allRequired = [...checklist.exterior, ...checklist.interior, ...checklist.safety].filter(
      item => item.required
    );
    expect(allRequired.length).toBeGreaterThan(0);
  });

  it('كل عنصر له key و labelAr و required', () => {
    const checklist = getPreTripChecklist();
    const allItems = [...checklist.exterior, ...checklist.interior, ...checklist.safety];
    allItems.forEach(item => {
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('labelAr');
      expect(item).toHaveProperty('required');
      expect(typeof item.required).toBe('boolean');
    });
  });

  it('gps_active و brakes إلزاميان', () => {
    const checklist = getPreTripChecklist();
    const safetyKeys = checklist.safety.filter(i => i.required).map(i => i.key);
    expect(safetyKeys).toContain('gps_active');
    expect(safetyKeys).toContain('brakes');
  });

  it('camera_working اختياري', () => {
    const checklist = getPreTripChecklist();
    const camera = checklist.safety.find(i => i.key === 'camera_working');
    expect(camera.required).toBe(false);
  });
});

// ─── validatePreTripInspection ────────────────────────────────────────────────

describe('validatePreTripInspection', () => {
  /** نتائج فحص كاملة بنجاح لجميع العناصر */
  function allPassed() {
    const checklist = getPreTripChecklist();
    const results = {};
    [...checklist.exterior, ...checklist.interior, ...checklist.safety].forEach(item => {
      results[item.key] = true;
    });
    return results;
  }

  it('يقبل فحصاً مكتملاً بنجاح', () => {
    const result = validatePreTripInspection(allPassed());
    expect(result.passed).toBe(true);
    expect(result.failedRequired).toHaveLength(0);
  });

  it('يرفض إذا فشل عنصر إلزامي', () => {
    const results = allPassed();
    results.brakes = false; // إلزامي

    const result = validatePreTripInspection(results);
    expect(result.passed).toBe(false);
    expect(result.failedRequired.some(i => i.key === 'brakes')).toBe(true);
  });

  it('يقبل إذا فشل عنصر اختياري فقط', () => {
    const results = allPassed();
    results.camera_working = false; // اختياري

    const result = validatePreTripInspection(results);
    expect(result.passed).toBe(true);
    expect(result.failedOptional.some(i => i.key === 'camera_working')).toBe(true);
  });

  it('يُعيد allItems بنفس عدد عناصر الفحص', () => {
    const checklist = getPreTripChecklist();
    const totalItems =
      checklist.exterior.length + checklist.interior.length + checklist.safety.length;

    const result = validatePreTripInspection(allPassed());
    expect(result.allItems).toHaveLength(totalItems);
  });

  it('يُعامل العناصر المفقودة كفشل', () => {
    // نمرر كائن فارغ - كل العناصر = false
    const result = validatePreTripInspection({});
    expect(result.passed).toBe(false);
    expect(result.failedRequired.length).toBeGreaterThan(0);
  });

  it('يرمي خطأ لنتائج غير صالحة', () => {
    expect(() => validatePreTripInspection(null)).toThrow('نتائج الفحص غير صالحة');
    expect(() => validatePreTripInspection(undefined)).toThrow();
  });
});

// ─── estimateReturnTime ───────────────────────────────────────────────────────

describe('estimateReturnTime', () => {
  it('يحسب وقت العودة بعد 60 دقيقة', () => {
    expect(estimateReturnTime('07:00', 60)).toBe('08:00');
  });

  it('يحسب وقت العودة عبر منتصف النهار', () => {
    expect(estimateReturnTime('11:30', 90)).toBe('13:00');
  });

  it('يتعامل مع العبور إلى اليوم التالي', () => {
    const result = estimateReturnTime('23:00', 120);
    expect(result).toBe('01:00');
  });

  it('يُعيد نفس الوقت إذا كانت المدة 0', () => {
    expect(estimateReturnTime('09:00', 0)).toBe('09:00');
  });
});

// ─── estimateFuelCost ─────────────────────────────────────────────────────────

describe('estimateFuelCost', () => {
  it('يحسب تكلفة الوقود لمسافة 50 كم بالاستهلاك الافتراضي', () => {
    const result = estimateFuelCost(50, {});
    // 50 كم × 15 لتر/100كم = 7.5 لتر
    expect(result.liters).toBe(7.5);
    // 7.5 × 2.18 = 16.35 ريال
    expect(result.cost).toBeCloseTo(16.35, 1);
  });

  it('يستخدم استهلاك مخصص للمركبة', () => {
    const vehicle = { fuelConsumptionPer100km: 12 };
    const result = estimateFuelCost(100, vehicle);
    // 100 كم × 12 لتر/100كم = 12 لتر
    expect(result.liters).toBe(12);
  });

  it('يدعم سعر وقود مخصص', () => {
    const result = estimateFuelCost(100, { fuelConsumptionPer100km: 10 }, 2.0);
    expect(result.liters).toBe(10);
    expect(result.cost).toBe(20);
  });

  it('الوقود والتكلفة موجبان', () => {
    const result = estimateFuelCost(30, {});
    expect(result.liters).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('0 كم = 0 لتر (ولكن يُقرَّب للأعلى)', () => {
    const result = estimateFuelCost(0, {});
    expect(result.liters).toBe(0);
    expect(result.cost).toBe(0);
  });
});

// ─── ثوابت التصدير ────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('AVG_CITY_SPEED_KMH معقول (20-60 كم/ساعة)', () => {
    expect(AVG_CITY_SPEED_KMH).toBeGreaterThanOrEqual(20);
    expect(AVG_CITY_SPEED_KMH).toBeLessThanOrEqual(60);
  });

  it('STOP_DURATION_MINUTES معقول (1-10 دقائق)', () => {
    expect(STOP_DURATION_MINUTES).toBeGreaterThanOrEqual(1);
    expect(STOP_DURATION_MINUTES).toBeLessThanOrEqual(10);
  });

  it('EARTH_RADIUS_KM ≈ 6371', () => {
    expect(EARTH_RADIUS_KM).toBeCloseTo(6371, 0);
  });
});
