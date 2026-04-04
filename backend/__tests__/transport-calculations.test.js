'use strict';

const {
  TRANSPORT_CONSTANTS,
  calculateHaversineDistance,
  nearestNeighborSort,
  twoOptOptimize,
  calculateRouteTotalDistance,
  optimizeRoute,
  calculateEstimatedTimes,
  estimateRouteDuration,
  sortWaypointsByDirection,
  checkVehicleEligibility,
  calculateVehicleOccupancy,
  calculateNextMaintenanceDue,
  checkVehicleCapacityForPassengers,
  getPreTripChecklist,
  validatePreTripInspection,
  calculateTripDelay,
  calculateActualTripDuration,
  calculateTripStatistics,
  validateGpsCoordinates,
  checkSpeedLimit,
  calculateGpsDistance,
  detectGpsStops,
  calculateFleetStatistics,
  calculateTripStatisticsPeriod,
  buildPickupNotificationMessage,
  buildDropoffNotificationMessage,
  buildDelayNotificationMessage,
  calculateFuelConsumption,
} = require('../services/transport/transportCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('TRANSPORT_CONSTANTS', () => {
  test('VEHICLE_STATUS محددة', () => {
    expect(TRANSPORT_CONSTANTS.VEHICLE_STATUS.ACTIVE).toBe('active');
    expect(TRANSPORT_CONSTANTS.VEHICLE_STATUS.MAINTENANCE).toBe('maintenance');
    expect(TRANSPORT_CONSTANTS.VEHICLE_STATUS.OUT_OF_SERVICE).toBe('out_of_service');
  });

  test('TRIP_STATUS محددة', () => {
    expect(TRANSPORT_CONSTANTS.TRIP_STATUS.SCHEDULED).toBe('scheduled');
    expect(TRANSPORT_CONSTANTS.TRIP_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(TRANSPORT_CONSTANTS.TRIP_STATUS.COMPLETED).toBe('completed');
  });

  test('AVERAGE_SPEEDS محددة', () => {
    expect(TRANSPORT_CONSTANTS.AVERAGE_SPEEDS.CITY).toBe(30);
    expect(TRANSPORT_CONSTANTS.AVERAGE_SPEEDS.HIGHWAY).toBe(80);
  });

  test('MAINTENANCE_INTERVALS محددة', () => {
    expect(TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.OIL_CHANGE).toBe(5000);
    expect(TRANSPORT_CONSTANTS.MAINTENANCE_INTERVALS.MAJOR_SERVICE).toBe(50000);
  });

  test('PRE_TRIP_CHECKLIST لها 3 أقسام', () => {
    const checklist = TRANSPORT_CONSTANTS.PRE_TRIP_CHECKLIST;
    expect(checklist.exterior).toBeDefined();
    expect(checklist.interior).toBeDefined();
    expect(checklist.safety).toBeDefined();
  });

  test('EARTH_RADIUS_KM = 6371', () => {
    expect(TRANSPORT_CONSTANTS.EARTH_RADIUS_KM).toBe(6371);
  });
});

// ========================================
// HAVERSINE DISTANCE
// ========================================
describe('calculateHaversineDistance', () => {
  test('نفس النقطة → صفر', () => {
    expect(calculateHaversineDistance(24.7, 46.7, 24.7, 46.7)).toBe(0);
  });

  test('الرياض إلى جدة ~ 855 km', () => {
    const dist = calculateHaversineDistance(24.7136, 46.6753, 21.3891, 39.8579);
    expect(dist).toBeGreaterThan(750);
    expect(dist).toBeLessThan(920);
  });

  test('مسافة قصيرة ضمن المدينة (~ 5 km)', () => {
    // نقطتان على بعد ~5 كم في الرياض
    const dist = calculateHaversineDistance(24.6877, 46.7219, 24.7136, 46.6753);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(8);
  });

  test('null → 0', () => {
    expect(calculateHaversineDistance(null, 46.7, 24.7, 46.8)).toBe(0);
    expect(calculateHaversineDistance(24.7, null, 24.7, 46.8)).toBe(0);
  });

  test('NaN → 0', () => {
    expect(calculateHaversineDistance(NaN, 46.7, 24.7, 46.8)).toBe(0);
  });

  test('نتيجة موجبة دائماً', () => {
    const dist = calculateHaversineDistance(24.7, 46.7, 25.0, 47.0);
    expect(dist).toBeGreaterThan(0);
  });
});

// ========================================
// ROUTE OPTIMIZATION
// ========================================
describe('nearestNeighborSort', () => {
  const center = { lat: 24.7136, lng: 46.6753 }; // الرياض
  const points = [
    { lat: 24.78, lng: 46.75, id: 'A' }, // بعيد
    { lat: 24.72, lng: 46.69, id: 'B' }, // قريب
    { lat: 24.75, lng: 46.72, id: 'C' }, // متوسط
  ];

  test('يُعيد جميع النقاط', () => {
    const result = nearestNeighborSort(center, points);
    expect(result.length).toBe(3);
  });

  test('النقطة الأقرب للمركز تأتي أولاً', () => {
    const result = nearestNeighborSort(center, points);
    expect(result[0].id).toBe('B'); // B أقرب للمركز
  });

  test('null start → []', () => {
    expect(nearestNeighborSort(null, points)).toEqual([]);
  });

  test('قائمة فارغة → []', () => {
    expect(nearestNeighborSort(center, [])).toEqual([]);
  });

  test('نقطة واحدة → تُعاد كما هي', () => {
    const result = nearestNeighborSort(center, [{ lat: 24.7, lng: 46.7, id: 'X' }]);
    expect(result.length).toBe(1);
  });

  test('كل نقطة لها distanceFromPrev', () => {
    const result = nearestNeighborSort(center, points);
    result.forEach(p => expect(p.distanceFromPrev).toBeDefined());
  });
});

describe('twoOptOptimize', () => {
  test('يُعيد نفس عدد النقاط', () => {
    const points = [
      { lat: 24.71, lng: 46.67 },
      { lat: 24.78, lng: 46.75 },
      { lat: 24.72, lng: 46.69 },
      { lat: 24.75, lng: 46.72 },
    ];
    const result = twoOptOptimize(points);
    expect(result.length).toBe(4);
  });

  test('نقطتان → تُعادان كما هما', () => {
    const points = [
      { lat: 24.7, lng: 46.7 },
      { lat: 24.8, lng: 46.8 },
    ];
    const result = twoOptOptimize(points);
    expect(result.length).toBe(2);
  });

  test('null → []', () => {
    expect(twoOptOptimize(null)).toEqual([]);
  });

  test('نقطة واحدة → تُعاد كما هي', () => {
    const points = [{ lat: 24.7, lng: 46.7 }];
    expect(twoOptOptimize(points).length).toBe(1);
  });
});

describe('calculateRouteTotalDistance', () => {
  const center = { lat: 24.7136, lng: 46.6753 };
  const waypoints = [
    { lat: 24.72, lng: 46.69 },
    { lat: 24.75, lng: 46.72 },
    { lat: 24.78, lng: 46.75 },
  ];

  test('مسافة إجمالية موجبة', () => {
    const dist = calculateRouteTotalDistance(center, waypoints);
    expect(dist).toBeGreaterThan(0);
  });

  test('null start → 0', () => {
    expect(calculateRouteTotalDistance(null, waypoints)).toBe(0);
  });

  test('قائمة فارغة → 0', () => {
    expect(calculateRouteTotalDistance(center, [])).toBe(0);
  });

  test('نقطة واحدة → ذهاب وإياب', () => {
    const dist = calculateRouteTotalDistance(center, [{ lat: 24.72, lng: 46.69 }]);
    // ذهاب + إياب = 2 × المسافة
    expect(dist).toBeGreaterThan(0);
  });
});

describe('optimizeRoute', () => {
  const center = { lat: 24.7136, lng: 46.6753 };
  const waypoints = [
    { lat: 24.78, lng: 46.75, beneficiaryId: 'B1' },
    { lat: 24.72, lng: 46.69, beneficiaryId: 'B2' },
    { lat: 24.75, lng: 46.72, beneficiaryId: 'B3' },
  ];

  test('مسار صالح', () => {
    const r = optimizeRoute(center, waypoints);
    expect(r.isValid).toBe(true);
    expect(r.waypoints.length).toBe(3);
    expect(r.totalDistance).toBeGreaterThan(0);
    expect(r.estimatedDuration).toBeGreaterThan(0);
  });

  test('كل نقطة لها order وestimatedTime', () => {
    const r = optimizeRoute(center, waypoints);
    r.waypoints.forEach(wp => {
      expect(wp.order).toBeDefined();
      expect(wp.estimatedTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  test('null → isValid false', () => {
    expect(optimizeRoute(null, waypoints).isValid).toBe(false);
    expect(optimizeRoute(center, []).isValid).toBe(false);
  });

  test('وقت بدء مخصص', () => {
    const r = optimizeRoute(center, waypoints, '08:30');
    expect(r.isValid).toBe(true);
    // الوقت الأول يجب أن يبدأ بعد 08:30
    expect(r.waypoints[0].estimatedTime >= '08:30').toBe(true);
  });

  test('stopCount صحيح', () => {
    const r = optimizeRoute(center, waypoints);
    expect(r.stopCount).toBe(3);
  });
});

describe('estimateRouteDuration', () => {
  test('10 كم + 3 محطات', () => {
    // 10/30*60 = 20 دقيقة تنقل + 9 دقائق توقف = 29
    const dur = estimateRouteDuration(10, 3);
    expect(dur).toBeGreaterThan(25);
    expect(dur).toBeLessThan(40);
  });

  test('مسافة صفر → يعتمد على المحطات فقط', () => {
    const dur = estimateRouteDuration(0, 5);
    expect(dur).toBe(Math.ceil(5 * TRANSPORT_CONSTANTS.STOP_DURATION_MINUTES));
  });
});

describe('sortWaypointsByDirection', () => {
  const center = { lat: 24.7136, lng: 46.6753 };
  const waypoints = [
    { lat: 24.72, lng: 46.69, id: 'close' }, // قريب
    { lat: 24.78, lng: 46.75, id: 'far' }, // بعيد
    { lat: 24.75, lng: 46.72, id: 'medium' }, // متوسط
  ];

  test('pickup: من الأبعد للأقرب', () => {
    const result = sortWaypointsByDirection(center, waypoints, 'pickup');
    expect(result[0].id).toBe('far');
    expect(result[result.length - 1].id).toBe('close');
  });

  test('dropoff: من الأقرب للأبعد', () => {
    const result = sortWaypointsByDirection(center, waypoints, 'dropoff');
    expect(result[0].id).toBe('close');
    expect(result[result.length - 1].id).toBe('far');
  });

  test('null → []', () => {
    expect(sortWaypointsByDirection(null, waypoints)).toEqual([]);
    expect(sortWaypointsByDirection(center, null)).toEqual([]);
  });

  test('كل نقطة لها distanceFromCenter', () => {
    const result = sortWaypointsByDirection(center, waypoints, 'pickup');
    result.forEach(wp => expect(wp.distanceFromCenter).toBeGreaterThan(0));
  });
});

// ========================================
// VEHICLE MANAGEMENT
// ========================================
describe('checkVehicleEligibility', () => {
  const activeVehicle = {
    id: 'V1',
    vehicleNumber: 'ABC-123',
    status: 'active',
    registrationExpiry: '2026-12-31',
    insuranceExpiry: '2026-06-30',
    nextInspectionDate: '2026-03-01',
  };

  test('مركبة سليمة → مؤهلة', () => {
    const r = checkVehicleEligibility(activeVehicle, '2025-01-01');
    expect(r.isEligible).toBe(true);
    expect(r.issues.length).toBe(0);
  });

  test('مركبة في صيانة → غير مؤهلة', () => {
    const r = checkVehicleEligibility({ ...activeVehicle, status: 'maintenance' }, '2025-01-01');
    expect(r.isEligible).toBe(false);
    expect(r.issues.some(i => i.includes('maintenance'))).toBe(true);
  });

  test('تسجيل منتهي → مشكلة', () => {
    const r = checkVehicleEligibility(
      { ...activeVehicle, registrationExpiry: '2024-12-31' },
      '2025-01-15'
    );
    expect(r.isEligible).toBe(false);
    expect(r.issues.some(i => i.includes('تسجيل'))).toBe(true);
  });

  test('تأمين منتهٍ → مشكلة', () => {
    const r = checkVehicleEligibility(
      { ...activeVehicle, insuranceExpiry: '2024-12-01' },
      '2025-01-01'
    );
    expect(r.isEligible).toBe(false);
    expect(r.issues.some(i => i.includes('تأمين'))).toBe(true);
  });

  test('موعد فحص متأخر → مشكلة', () => {
    const r = checkVehicleEligibility(
      { ...activeVehicle, nextInspectionDate: '2024-12-01' },
      '2025-01-01'
    );
    expect(r.isEligible).toBe(false);
    expect(r.issues.some(i => i.includes('فحص'))).toBe(true);
  });

  test('null → غير مؤهلة', () => {
    const r = checkVehicleEligibility(null);
    expect(r.isEligible).toBe(false);
  });

  test('مشاكل متعددة تُجمع', () => {
    const r = checkVehicleEligibility(
      {
        ...activeVehicle,
        status: 'out_of_service',
        registrationExpiry: '2020-01-01',
        insuranceExpiry: '2020-01-01',
      },
      '2025-01-01'
    );
    expect(r.issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe('calculateVehicleOccupancy', () => {
  test('نصف ممتلئة', () => {
    const r = calculateVehicleOccupancy(14, 7);
    expect(r.occupancyRate).toBe(50);
    expect(r.availableSeats).toBe(7);
    expect(r.isFull).toBe(false);
    expect(r.isOverCapacity).toBe(false);
  });

  test('ممتلئة تماماً', () => {
    const r = calculateVehicleOccupancy(14, 14);
    expect(r.isFull).toBe(true);
    expect(r.availableSeats).toBe(0);
    expect(r.occupancyRate).toBe(100);
  });

  test('تجاوز الطاقة', () => {
    const r = calculateVehicleOccupancy(10, 12);
    expect(r.isOverCapacity).toBe(true);
    expect(r.availableSeats).toBe(0);
  });

  test('صفر ركاب', () => {
    const r = calculateVehicleOccupancy(14, 0);
    expect(r.occupancyRate).toBe(0);
    expect(r.availableSeats).toBe(14);
  });

  test('طاقة صفر → isValid false', () => {
    expect(calculateVehicleOccupancy(0, 5).isValid).toBe(false);
  });
});

describe('calculateNextMaintenanceDue', () => {
  test('تغيير زيت - 3000 كم → 2000 كم متبقي', () => {
    const r = calculateNextMaintenanceDue(3000, 'oil_change');
    expect(r.isValid).toBe(true);
    expect(r.nextServiceMileage).toBe(5000);
    expect(r.remainingKm).toBe(2000);
    expect(r.isDue).toBe(false);
  });

  test('تغيير زيت - 5100 كم → استحق', () => {
    const r = calculateNextMaintenanceDue(5100, 'oil_change');
    expect(r.nextServiceMileage).toBe(10000);
    expect(r.remainingKm).toBe(4900);
    expect(r.isDue).toBe(false);
  });

  test('تحذير عند 10% متبقي (4600 كم)', () => {
    const r = calculateNextMaintenanceDue(4600, 'oil_change');
    expect(r.isWarning).toBe(true); // 400 كم متبقي = 8% من 5000
  });

  test('تدوير إطارات', () => {
    const r = calculateNextMaintenanceDue(8000, 'tire_rotation');
    expect(r.interval).toBe(10000);
    expect(r.nextServiceMileage).toBe(10000);
  });

  test('قيم غير صالحة → isValid false', () => {
    expect(calculateNextMaintenanceDue(-100).isValid).toBe(false);
    expect(calculateNextMaintenanceDue('abc').isValid).toBe(false);
  });
});

describe('checkVehicleCapacityForPassengers', () => {
  const vehicle = {
    capacity: 14,
    wheelchairAccessible: true,
    wheelchairSlots: 2,
  };

  test('ركاب عاديون ضمن الطاقة → صالح', () => {
    const passengers = Array(10).fill({ requiresWheelchair: false });
    const r = checkVehicleCapacityForPassengers(vehicle, passengers);
    expect(r.isValid).toBe(true);
    expect(r.totalPassengers).toBe(10);
    expect(r.wheelchairPassengers).toBe(0);
  });

  test('كراسي متحركة ضمن المقاعد المخصصة → صالح', () => {
    const passengers = [
      { requiresWheelchair: true },
      { requiresWheelchair: true },
      { requiresWheelchair: false },
    ];
    const r = checkVehicleCapacityForPassengers(vehicle, passengers);
    expect(r.isValid).toBe(true);
    expect(r.wheelchairPassengers).toBe(2);
  });

  test('تجاوز الطاقة الكلية', () => {
    const passengers = Array(16).fill({ requiresWheelchair: false });
    const r = checkVehicleCapacityForPassengers(vehicle, passengers);
    expect(r.isValid).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  test('كراسي متحركة في مركبة غير مجهزة', () => {
    const noWheelchairVehicle = { ...vehicle, wheelchairAccessible: false, wheelchairSlots: 0 };
    const passengers = [{ requiresWheelchair: true }];
    const r = checkVehicleCapacityForPassengers(noWheelchairVehicle, passengers);
    expect(r.isValid).toBe(false);
  });

  test('تجاوز مقاعد الكرسي المتحرك', () => {
    const passengers = [
      { requiresWheelchair: true },
      { requiresWheelchair: true },
      { requiresWheelchair: true }, // 3 > 2
    ];
    const r = checkVehicleCapacityForPassengers(vehicle, passengers);
    expect(r.isValid).toBe(false);
  });

  test('null → isValid false', () => {
    expect(checkVehicleCapacityForPassengers(null, [])).toEqual({ isValid: false });
  });
});

// ========================================
// PRE-TRIP INSPECTION
// ========================================
describe('getPreTripChecklist', () => {
  test('يُعيد قائمة الفحص', () => {
    const checklist = getPreTripChecklist();
    expect(checklist.exterior).toBeDefined();
    expect(checklist.interior).toBeDefined();
    expect(checklist.safety).toBeDefined();
  });

  test('العناصر الإلزامية موجودة', () => {
    const checklist = getPreTripChecklist();
    const allItems = [...checklist.exterior, ...checklist.interior, ...checklist.safety];
    const requiredCount = allItems.filter(i => i.required).length;
    expect(requiredCount).toBeGreaterThan(5);
  });
});

describe('validatePreTripInspection', () => {
  const allPassedData = {
    tires_condition: true,
    lights_working: true,
    mirrors_clean: true,
    body_damage: true,
    seats_belts: true,
    ac_working: true,
    clean_interior: true,
    first_aid_kit: true,
    fire_extinguisher: true,
    brakes: true,
    fuel_level: true,
    gps_active: true,
    emergency_exit: true,
  };

  test('جميع العناصر ممتازة → passed', () => {
    const r = validatePreTripInspection(allPassedData);
    expect(r.passed).toBe(true);
    expect(r.failedItems.length).toBe(0);
    expect(r.completionRate).toBe(100);
  });

  test('فشل عنصر إلزامي → رفض', () => {
    const r = validatePreTripInspection({ ...allPassedData, brakes: false });
    expect(r.passed).toBe(false);
    expect(r.failedItems.some(i => i.includes('الفرامل'))).toBe(true);
  });

  test('عنصر مفقود إلزامي → رفض', () => {
    const data = { ...allPassedData };
    delete data.fuel_level;
    const r = validatePreTripInspection(data);
    expect(r.passed).toBe(false);
    expect(r.missingItems.length).toBeGreaterThan(0);
  });

  test('null → رفض', () => {
    const r = validatePreTripInspection(null);
    expect(r.passed).toBe(false);
    expect(r.completionRate).toBe(0);
  });

  test('completionRate محسوب بشكل صحيح', () => {
    // تمرير 50% من العناصر الإلزامية
    const partialData = {
      tires_condition: true,
      lights_working: true,
      mirrors_clean: true,
      body_damage: true,
      brakes: true,
      fuel_level: true,
      // باقي العناصر الإلزامية مفقودة
    };
    const r = validatePreTripInspection(partialData);
    expect(r.completionRate).toBeLessThan(100);
  });
});

// ========================================
// TRIP CALCULATIONS
// ========================================
describe('calculateTripDelay', () => {
  test('تأخر 15 دقيقة', () => {
    const r = calculateTripDelay('07:00', '07:15');
    expect(r.isDelayed).toBe(true);
    expect(r.delayMinutes).toBe(15);
    expect(r.isEarly).toBe(false);
  });

  test('وصول مبكر 10 دقائق', () => {
    const r = calculateTripDelay('07:00', '06:50');
    expect(r.isDelayed).toBe(false);
    expect(r.isEarly).toBe(true);
    expect(r.earlyMinutes).toBe(10);
  });

  test('في الوقت المحدد', () => {
    const r = calculateTripDelay('08:00', '08:00');
    expect(r.isDelayed).toBe(false);
    expect(r.delayMinutes).toBe(0);
    expect(r.isEarly).toBe(false);
  });

  test('null → ليس متأخراً', () => {
    const r = calculateTripDelay(null, '08:00');
    expect(r.isDelayed).toBe(false);
  });
});

describe('calculateActualTripDuration', () => {
  test('رحلة ساعة واحدة', () => {
    const r = calculateActualTripDuration('07:00', '08:00');
    expect(r.isValid).toBe(true);
    expect(r.durationMinutes).toBe(60);
    expect(r.durationHours).toBe(1);
  });

  test('رحلة 45 دقيقة', () => {
    const r = calculateActualTripDuration('07:15', '08:00');
    expect(r.durationMinutes).toBe(45);
    expect(r.durationHours).toBe(0.75);
  });

  test('رحلة تتجاوز منتصف الليل', () => {
    const r = calculateActualTripDuration('23:30', '00:30');
    expect(r.durationMinutes).toBe(60);
  });

  test('null → isValid false', () => {
    expect(calculateActualTripDuration(null, '08:00').isValid).toBe(false);
  });
});

describe('calculateTripStatistics', () => {
  const trip = {
    actualStartTime: '07:00',
    actualEndTime: '08:15',
    actualDistanceKm: 25.5,
  };

  const passengers = [
    { pickupStatus: 'picked_up', dropoffStatus: 'dropped_off' },
    { pickupStatus: 'picked_up', dropoffStatus: 'dropped_off' },
    { pickupStatus: 'absent', dropoffStatus: 'pending' },
    { pickupStatus: 'picked_up', dropoffStatus: 'dropped_off' },
  ];

  test('إحصائيات صحيحة', () => {
    const r = calculateTripStatistics(trip, passengers);
    expect(r.isValid).toBe(true);
    expect(r.totalPassengers).toBe(4);
    expect(r.pickedUp).toBe(3);
    expect(r.absent).toBe(1);
    expect(r.droppedOff).toBe(3);
    expect(r.attendanceRate).toBe(75);
  });

  test('مع مدة الرحلة', () => {
    const r = calculateTripStatistics(trip, passengers);
    expect(r.duration).toBeDefined();
    expect(r.duration.durationMinutes).toBe(75);
  });

  test('بدون ركاب → نسبة حضور 0', () => {
    const r = calculateTripStatistics(trip, []);
    expect(r.attendanceRate).toBe(0);
    expect(r.totalPassengers).toBe(0);
  });

  test('null → isValid false', () => {
    expect(calculateTripStatistics(null, []).isValid).toBe(false);
  });
});

// ========================================
// GPS & SPEED MONITORING
// ========================================
describe('validateGpsCoordinates', () => {
  test('إحداثيات الرياض صالحة', () => {
    expect(validateGpsCoordinates(24.7136, 46.6753)).toBe(true);
  });

  test('إحداثيات جدة صالحة', () => {
    expect(validateGpsCoordinates(21.3891, 39.8579)).toBe(true);
  });

  test('خط العرض > 90 → غير صالح', () => {
    expect(validateGpsCoordinates(91, 46.7)).toBe(false);
  });

  test('خط الطول > 180 → غير صالح', () => {
    expect(validateGpsCoordinates(24.7, 181)).toBe(false);
  });

  test('قيم سالبة صالحة (نصف الكرة الجنوبي)', () => {
    expect(validateGpsCoordinates(-33.8688, 151.2093)).toBe(true); // سيدني
  });

  test('null → غير صالح', () => {
    expect(validateGpsCoordinates(null, 46.7)).toBe(false);
    expect(validateGpsCoordinates(24.7, null)).toBe(false);
  });

  test('NaN → غير صالح', () => {
    expect(validateGpsCoordinates(NaN, 46.7)).toBe(false);
  });
});

describe('checkSpeedLimit', () => {
  test('سرعة مقبولة في المدينة', () => {
    const r = checkSpeedLimit(60, 'city');
    expect(r.isValid).toBe(true);
    expect(r.isExceeded).toBe(false);
    expect(r.severity).toBe('ok');
  });

  test('تجاوز طفيف', () => {
    const r = checkSpeedLimit(90, 'city'); // حد 80
    expect(r.isExceeded).toBe(true);
    expect(r.excess).toBe(10);
    expect(r.severity).toBe('minor');
  });

  test('تجاوز متوسط', () => {
    const r = checkSpeedLimit(95, 'city'); // حد 80، زيادة 15
    expect(r.severity).toBe('warning');
  });

  test('تجاوز حرج', () => {
    const r = checkSpeedLimit(105, 'city'); // حد 80، زيادة 25
    expect(r.severity).toBe('critical');
  });

  test('منطقة مدرسية - حد 30', () => {
    const r = checkSpeedLimit(35, 'school_zone');
    expect(r.isExceeded).toBe(true);
    expect(r.limit).toBe(30);
  });

  test('طريق سريع - حد 120', () => {
    const r = checkSpeedLimit(100, 'highway');
    expect(r.isExceeded).toBe(false);
  });

  test('قيمة سالبة → isValid false', () => {
    expect(checkSpeedLimit(-10).isValid).toBe(false);
  });
});

describe('calculateGpsDistance', () => {
  test('3 نقاط GPS', () => {
    const points = [
      { lat: 24.7136, lng: 46.6753 },
      { lat: 24.72, lng: 46.69 },
      { lat: 24.73, lng: 46.7 },
    ];
    const r = calculateGpsDistance(points);
    expect(r.totalDistance).toBeGreaterThan(0);
    expect(r.pointCount).toBe(3);
    expect(r.startPoint).toEqual(points[0]);
    expect(r.endPoint).toEqual(points[2]);
  });

  test('نقطة واحدة → صفر', () => {
    const r = calculateGpsDistance([{ lat: 24.7, lng: 46.7 }]);
    expect(r.totalDistance).toBe(0);
    expect(r.pointCount).toBe(1);
  });

  test('null → صفر', () => {
    const r = calculateGpsDistance(null);
    expect(r.totalDistance).toBe(0);
  });

  test('قائمة فارغة → صفر', () => {
    const r = calculateGpsDistance([]);
    expect(r.totalDistance).toBe(0);
  });
});

describe('detectGpsStops', () => {
  test('يكشف توقفاً طويلاً', () => {
    const now = new Date('2025-01-06T09:00:00Z');
    const points = [
      { lat: 24.7136, lng: 46.6753, recordedAt: new Date(now.getTime() + 0).toISOString() },
      { lat: 24.7136, lng: 46.6753, recordedAt: new Date(now.getTime() + 60000).toISOString() }, // 1 دقيقة
      { lat: 24.7136, lng: 46.6753, recordedAt: new Date(now.getTime() + 120000).toISOString() }, // 2 دقيقة
      { lat: 24.75, lng: 46.7, recordedAt: new Date(now.getTime() + 180000).toISOString() }, // تحرك
    ];
    const stops = detectGpsStops(points, 2);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0].durationMinutes).toBeGreaterThanOrEqual(2);
  });

  test('لا توقف → قائمة فارغة', () => {
    const points = [
      { lat: 24.71, lng: 46.67, recordedAt: '2025-01-06T09:00:00Z' },
      { lat: 24.72, lng: 46.68, recordedAt: '2025-01-06T09:05:00Z' },
      { lat: 24.73, lng: 46.69, recordedAt: '2025-01-06T09:10:00Z' },
    ];
    const stops = detectGpsStops(points, 2);
    expect(stops.length).toBe(0);
  });

  test('null → []', () => {
    expect(detectGpsStops(null)).toEqual([]);
  });

  test('نقطة واحدة → []', () => {
    expect(detectGpsStops([{ lat: 24.7, lng: 46.7 }])).toEqual([]);
  });
});

// ========================================
// FLEET STATISTICS
// ========================================
describe('calculateFleetStatistics', () => {
  const vehicles = [
    { id: 'V1', status: 'active', capacity: 14, wheelchairAccessible: true },
    { id: 'V2', status: 'active', capacity: 10, wheelchairAccessible: false },
    { id: 'V3', status: 'maintenance', capacity: 14, wheelchairAccessible: true },
    { id: 'V4', status: 'out_of_service', capacity: 8, wheelchairAccessible: false },
    { id: 'V5', status: 'retired', capacity: 12, wheelchairAccessible: false },
  ];

  test('إحصائيات صحيحة', () => {
    const r = calculateFleetStatistics(vehicles);
    expect(r.total).toBe(5);
    expect(r.active).toBe(2);
    expect(r.maintenance).toBe(1);
    expect(r.outOfService).toBe(1);
    expect(r.retired).toBe(1);
  });

  test('الطاقة الإجمالية للنشطة', () => {
    const r = calculateFleetStatistics(vehicles);
    expect(r.totalCapacity).toBe(24); // 14 + 10
  });

  test('المركبات المجهزة للكراسي المتحركة', () => {
    const r = calculateFleetStatistics(vehicles);
    expect(r.wheelchairCapable).toBe(2); // V1 و V3
  });

  test('معدل الاستخدام', () => {
    const r = calculateFleetStatistics(vehicles);
    expect(r.utilizationRate).toBe(40); // 2/5 = 40%
  });

  test('قائمة فارغة → أصفار', () => {
    const r = calculateFleetStatistics([]);
    expect(r.total).toBe(0);
    expect(r.utilizationRate).toBe(0);
  });

  test('null → أصفار', () => {
    const r = calculateFleetStatistics(null);
    expect(r.total).toBe(0);
  });
});

describe('calculateTripStatisticsPeriod', () => {
  const trips = [
    {
      branchId: 'BR1',
      tripDate: '2025-01-06',
      status: 'completed',
      actualDistanceKm: 25,
      actualPassengers: 8,
    },
    {
      branchId: 'BR1',
      tripDate: '2025-01-07',
      status: 'completed',
      actualDistanceKm: 22,
      actualPassengers: 7,
    },
    {
      branchId: 'BR1',
      tripDate: '2025-01-07',
      status: 'cancelled',
      actualDistanceKm: 0,
      actualPassengers: 0,
    },
    {
      branchId: 'BR2',
      tripDate: '2025-01-06',
      status: 'completed',
      actualDistanceKm: 30,
      actualPassengers: 10,
    },
    {
      branchId: 'BR1',
      tripDate: '2025-01-08',
      status: 'in_progress',
      actualDistanceKm: 15,
      actualPassengers: 6,
    },
  ];

  test('إحصائيات بدون فلتر', () => {
    const r = calculateTripStatisticsPeriod(trips);
    expect(r.total).toBe(5);
    expect(r.completed).toBe(3);
    expect(r.cancelled).toBe(1);
  });

  test('فلتر الفرع', () => {
    const r = calculateTripStatisticsPeriod(trips, { branchId: 'BR1' });
    expect(r.total).toBe(4);
    expect(r.completed).toBe(2);
  });

  test('المسافة الإجمالية', () => {
    const r = calculateTripStatisticsPeriod(trips, { branchId: 'BR1' });
    expect(r.totalDistance).toBe(62);
  });

  test('معدل الإتمام', () => {
    const r = calculateTripStatisticsPeriod(trips, { branchId: 'BR1' });
    expect(r.completionRate).toBe(50); // 2/4 = 50%
  });

  test('متوسط الركاب', () => {
    const r = calculateTripStatisticsPeriod(trips, { branchId: 'BR1' });
    expect(r.averagePassengersPerTrip).toBeGreaterThan(0);
  });

  test('فلتر التاريخ', () => {
    const r = calculateTripStatisticsPeriod(trips, {
      branchId: 'BR1',
      dateFrom: '2025-01-07',
      dateTo: '2025-01-08',
    });
    expect(r.total).toBe(3);
  });

  test('null → total:0', () => {
    expect(calculateTripStatisticsPeriod(null).total).toBe(0);
  });
});

// ========================================
// NOTIFICATION HELPERS
// ========================================
describe('buildPickupNotificationMessage', () => {
  test('رسالة استقبال صحيحة', () => {
    const msg = buildPickupNotificationMessage('أحمد محمد', 'ABC-123', 'علي سالم', '07:30');
    expect(msg.type).toBe('pickup');
    expect(msg.titleAr).toContain('استقبال');
    expect(msg.bodyAr).toContain('أحمد محمد');
    expect(msg.bodyAr).toContain('ABC-123');
    expect(msg.bodyAr).toContain('علي سالم');
    expect(msg.data.estimatedTime).toBe('07:30');
  });
});

describe('buildDropoffNotificationMessage', () => {
  test('رسالة توصيل صحيحة', () => {
    const msg = buildDropoffNotificationMessage('فاطمة علي', '15:45');
    expect(msg.type).toBe('dropoff');
    expect(msg.bodyAr).toContain('فاطمة علي');
    expect(msg.bodyAr).toContain('15:45');
  });
});

describe('buildDelayNotificationMessage', () => {
  test('رسالة تأخر مع سبب', () => {
    const msg = buildDelayNotificationMessage('محمد أحمد', 20, 'ازدحام مروري');
    expect(msg.type).toBe('delay');
    expect(msg.bodyAr).toContain('20');
    expect(msg.bodyAr).toContain('ازدحام مروري');
    expect(msg.data.delayMinutes).toBe(20);
  });

  test('رسالة تأخر بدون سبب', () => {
    const msg = buildDelayNotificationMessage('محمد أحمد', 10);
    expect(msg.bodyAr).not.toContain('السبب');
  });
});

// ========================================
// FUEL TRACKING
// ========================================
describe('calculateFuelConsumption', () => {
  test('100 كم، 12 لتر/100كم', () => {
    const r = calculateFuelConsumption(100, 12, 0.91);
    expect(r.isValid).toBe(true);
    expect(r.fuelLiters).toBe(12);
    expect(r.fuelCost).toBe(10.92);
    expect(r.costPerKm).toBe(0.11);
  });

  test('50 كم', () => {
    const r = calculateFuelConsumption(50, 12, 0.91);
    expect(r.fuelLiters).toBe(6);
  });

  test('صفر كم → صفر', () => {
    const r = calculateFuelConsumption(0);
    expect(r.fuelLiters).toBe(0);
    expect(r.costPerKm).toBe(0);
  });

  test('قيمة سالبة → isValid false', () => {
    expect(calculateFuelConsumption(-10).isValid).toBe(false);
  });

  test('قيمة غير رقمية → isValid false', () => {
    expect(calculateFuelConsumption('abc').isValid).toBe(false);
  });

  test('قيم افتراضية صحيحة', () => {
    const r = calculateFuelConsumption(100);
    expect(r.fuelConsumptionPer100Km).toBe(12);
    expect(r.fuelPricePerLiter).toBe(0.91);
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - دورة رحلة كاملة', () => {
  test('تخطيط → فحص → تنفيذ → إحصائيات', () => {
    const center = { lat: 24.7136, lng: 46.6753 };
    const waypoints = [
      { lat: 24.78, lng: 46.75, beneficiaryId: 'B1', requiresWheelchair: false },
      { lat: 24.72, lng: 46.69, beneficiaryId: 'B2', requiresWheelchair: true },
      { lat: 24.75, lng: 46.72, beneficiaryId: 'B3', requiresWheelchair: false },
    ];

    // 1. التحقق من المركبة
    const vehicle = {
      id: 'V1',
      vehicleNumber: 'ABC-123',
      status: 'active',
      capacity: 14,
      wheelchairAccessible: true,
      wheelchairSlots: 2,
      registrationExpiry: '2026-12-31',
      insuranceExpiry: '2026-06-30',
      nextInspectionDate: '2026-03-01',
    };

    const eligibility = checkVehicleEligibility(vehicle, '2025-01-06');
    expect(eligibility.isEligible).toBe(true);

    // 2. التحقق من الطاقة
    const capacity = checkVehicleCapacityForPassengers(vehicle, waypoints);
    expect(capacity.isValid).toBe(true);

    // 3. تحسين المسار
    const route = optimizeRoute(center, waypoints, '07:00');
    expect(route.isValid).toBe(true);
    expect(route.waypoints.length).toBe(3);

    // 4. فحص ما قبل الرحلة
    const inspection = validatePreTripInspection({
      tires_condition: true,
      lights_working: true,
      mirrors_clean: true,
      body_damage: true,
      seats_belts: true,
      ac_working: true,
      clean_interior: true,
      first_aid_kit: true,
      fire_extinguisher: true,
      brakes: true,
      fuel_level: true,
      gps_active: true,
      emergency_exit: true,
    });
    expect(inspection.passed).toBe(true);

    // 5. إحصائيات الرحلة بعد الاكتمال
    const trip = { actualStartTime: '07:05', actualEndTime: '08:00', actualDistanceKm: 22 };
    const passengers = waypoints.map(() => ({
      pickupStatus: 'picked_up',
      dropoffStatus: 'dropped_off',
    }));
    const stats = calculateTripStatistics(trip, passengers);
    expect(stats.attendanceRate).toBe(100);
    expect(stats.pickedUp).toBe(3);
  });

  test('حساب تكلفة الوقود والتأخر', () => {
    const delay = calculateTripDelay('07:00', '07:20');
    expect(delay.isDelayed).toBe(true);
    expect(delay.delayMinutes).toBe(20);

    const fuel = calculateFuelConsumption(22, 12, 0.91);
    expect(fuel.isValid).toBe(true);
    expect(fuel.fuelLiters).toBe(2.64);

    // رسالة تأخر
    const msg = buildDelayNotificationMessage('أحمد', delay.delayMinutes, 'ازدحام');
    expect(msg.type).toBe('delay');
  });
});
