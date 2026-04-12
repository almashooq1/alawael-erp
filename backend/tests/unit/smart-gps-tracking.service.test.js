/**
 * Smart GPS Tracking Service - Unit Tests
 * خدمة تتبع GPS الذكية - اختبارات الوحدة
 *
 * Tests all static methods on SmartGPSTrackingService
 */

/* ───── mocks (hoisted) ───── */
const mockVehicle = {
  findById: jest.fn(),
  findOne: jest.fn(),
};
const mockTrip = {
  findOne: jest.fn(),
  find: jest.fn(),
};
const mockNotificationService = {
  sendAlert: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
};

jest.mock('../../models/Vehicle', () => mockVehicle);
jest.mock('../../models/Trip', () => mockTrip);
jest.mock('../../models/Driver', () => ({}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../services/notificationService', () => mockNotificationService);

const SmartGPSTrackingService = require('../../services/smartGPSTracking.service');

/* ───── helpers ───── */
const buildVehicleDoc = (overrides = {}) => ({
  _id: 'v1',
  plateNumber: 'ABC-1234',
  gpsTracking: {
    currentLocation: {
      type: 'Point',
      coordinates: [46.7, 24.7],
      speed: 60,
      bearing: 90,
    },
    currentSpeed: 60,
    heading: 90,
    accuracy: 5,
    lastUpdateTime: new Date(Date.now() - 30000),
    locationHistory: [],
  },
  maintenance: {
    fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 30),
    tires: { averageWear: 40 },
  },
  assignedDriver: { name: 'أحمد' },
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

/* ========================================================
   1. Module exports
   ======================================================== */
describe('Module exports', () => {
  it('exports SmartGPSTrackingService class', () => {
    expect(SmartGPSTrackingService).toBeDefined();
    expect(typeof SmartGPSTrackingService).toBe('function');
  });

  it('has all expected static methods', () => {
    const methods = [
      'updateLocationWithIntelligence',
      'enrichLocationData',
      'classifySpeed',
      'detectMovementPattern',
      'detectAnomalies',
      'generateSmartAlerts',
      'generateSafetyAlerts',
      'generateEfficiencyAlerts',
      'generateMaintenanceAlerts',
      'generateBehaviorAlerts',
      'predictETA',
      'predictFuelConsumption',
      'optimizeRoute',
      'calculateDistanceHaversine',
      'toRad',
      'calculateBearingChange',
      'validateGPSData',
      'addToLocationHistory',
      'getAverageSpeed',
      'getSpeedLimitByZone',
      'getTrafficFactor',
      'getWeatherFactor',
      'getTimeOfDayFactor',
      'calculateETAConfidence',
      'getSpeedVariation',
      'findOptimalSequence',
      'getActiveTrip',
      'updateTripData',
    ];
    methods.forEach(m => {
      expect(typeof SmartGPSTrackingService[m]).toBe('function');
    });
  });
});

/* ========================================================
   2. validateGPSData
   ======================================================== */
describe('validateGPSData', () => {
  it('returns true for valid GPS data', () => {
    const result = SmartGPSTrackingService.validateGPSData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      accuracy: 5,
    });
    expect(result).toBe(true);
  });

  it('throws when latitude is missing', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('بيانات الموقع ناقصة');
  });

  it('throws when longitude is missing', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('بيانات الموقع ناقصة');
  });

  it('throws when latitude is out of range (>90)', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 91,
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('إحداثيات غير صالحة');
  });

  it('throws when latitude is out of range (<-90)', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: -91,
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('إحداثيات غير صالحة');
  });

  it('throws when longitude is out of range (>180)', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 181,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('إحداثيات غير صالحة');
  });

  it('throws when longitude is out of range (<-180)', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: -181,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('إحداثيات غير صالحة');
  });

  it('throws when speed is negative', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 46.7,
        speed: -5,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('السرعة غير منطقية');
  });

  it('throws when speed exceeds 350', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 46.7,
        speed: 351,
        bearing: 0,
        accuracy: 5,
      })
    ).toThrow('السرعة غير منطقية');
  });

  it('throws when bearing is negative', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 46.7,
        speed: 0,
        bearing: -1,
        accuracy: 5,
      })
    ).toThrow('الاتجاه غير صحيح');
  });

  it('throws when bearing exceeds 360', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 46.7,
        speed: 0,
        bearing: 361,
        accuracy: 5,
      })
    ).toThrow('الاتجاه غير صحيح');
  });

  it('throws when accuracy is negative', () => {
    expect(() =>
      SmartGPSTrackingService.validateGPSData({
        latitude: 24.7,
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: -1,
      })
    ).toThrow('الدقة غير صحيحة');
  });
});

/* ========================================================
   3. classifySpeed
   ======================================================== */
describe('classifySpeed', () => {
  it('returns "متوقف" for speed 0', () => {
    expect(SmartGPSTrackingService.classifySpeed(0)).toBe('متوقف');
  });

  it('returns "سرعة منخفضة" for speed < 20', () => {
    expect(SmartGPSTrackingService.classifySpeed(10)).toBe('سرعة منخفضة');
    expect(SmartGPSTrackingService.classifySpeed(19)).toBe('سرعة منخفضة');
  });

  it('returns "سرعة عادية" for speed 20-49', () => {
    expect(SmartGPSTrackingService.classifySpeed(20)).toBe('سرعة عادية');
    expect(SmartGPSTrackingService.classifySpeed(40)).toBe('سرعة عادية');
    expect(SmartGPSTrackingService.classifySpeed(49)).toBe('سرعة عادية');
  });

  it('returns "سرعة نشطة" for speed 50-79', () => {
    expect(SmartGPSTrackingService.classifySpeed(50)).toBe('سرعة نشطة');
    expect(SmartGPSTrackingService.classifySpeed(79)).toBe('سرعة نشطة');
  });

  it('returns "سرعة عالية" for speed 80-119', () => {
    expect(SmartGPSTrackingService.classifySpeed(80)).toBe('سرعة عالية');
    expect(SmartGPSTrackingService.classifySpeed(100)).toBe('سرعة عالية');
    expect(SmartGPSTrackingService.classifySpeed(119)).toBe('سرعة عالية');
  });

  it('returns "سرعة خطيرة" for speed >= 120', () => {
    expect(SmartGPSTrackingService.classifySpeed(120)).toBe('سرعة خطيرة');
    expect(SmartGPSTrackingService.classifySpeed(150)).toBe('سرعة خطيرة');
    expect(SmartGPSTrackingService.classifySpeed(200)).toBe('سرعة خطيرة');
  });

  it('handles null/undefined inputs', () => {
    // undefined: NaN comparisons all fail → falls through to 'سرعة خطيرة'
    expect(SmartGPSTrackingService.classifySpeed(undefined)).toBe('سرعة خطيرة');
    // null: null === 0 is false, but null < 20 is true (coerces to 0) → 'سرعة منخفضة'
    expect(SmartGPSTrackingService.classifySpeed(null)).toBe('سرعة منخفضة');
  });
});

/* ========================================================
   4. detectMovementPattern
   ======================================================== */
describe('detectMovementPattern', () => {
  it('returns "توقف طويل" when speed is 0 and timeDelta > 300', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(0, 301)).toBe('توقف طويل');
    expect(SmartGPSTrackingService.detectMovementPattern(0, 600)).toBe('توقف طويل');
  });

  it('returns "توقف مؤقت" when speed is 0 and timeDelta <= 300', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(0, 100)).toBe('توقف مؤقت');
    expect(SmartGPSTrackingService.detectMovementPattern(0, 0)).toBe('توقف مؤقت');
  });

  it('returns "حركة بطيئة" when speed < 5 and timeDelta > 60', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(3, 120)).toBe('حركة بطيئة');
    expect(SmartGPSTrackingService.detectMovementPattern(4.9, 61)).toBe('حركة بطيئة');
  });

  it('returns "حركة سير بطيء" when speed > 0 and speed < 20 (timeDelta <= 60 or speed >= 5)', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(10, 30)).toBe('حركة سير بطيء');
    expect(SmartGPSTrackingService.detectMovementPattern(19, 10)).toBe('حركة سير بطيء');
    expect(SmartGPSTrackingService.detectMovementPattern(5, 10)).toBe('حركة سير بطيء');
  });

  it('returns "حركة طبيعية" when speed >= 20', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(20, 10)).toBe('حركة طبيعية');
    expect(SmartGPSTrackingService.detectMovementPattern(60, 10)).toBe('حركة طبيعية');
    expect(SmartGPSTrackingService.detectMovementPattern(120, 10)).toBe('حركة طبيعية');
  });

  it('returns "حركة طبيعية" for high speed', () => {
    expect(SmartGPSTrackingService.detectMovementPattern(200, 60)).toBe('حركة طبيعية');
  });

  it('handles boundary: speed exactly 5 and timeDelta > 60 → "حركة سير بطيء" (not "حركة بطيئة", since >= 5)', () => {
    // speed < 5 is false when speed === 5 → falls to speed > 0 && speed < 20 → 'حركة سير بطيء'
    expect(SmartGPSTrackingService.detectMovementPattern(5, 120)).toBe('حركة سير بطيء');
  });
});

/* ========================================================
   5. enrichLocationData
   ======================================================== */
describe('enrichLocationData', () => {
  it('calculates distance, timeDelta, acceleration, bearingChange with previousLocation', () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 30000); // 30s ago
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.8,
      longitude: 46.8,
      speed: 80,
      bearing: 100,
      accuracy: 5,
      timestamp: now,
      previousLocation: {
        coordinates: [46.7, 24.7],
        speed: 60,
        bearing: 90,
      },
      previousTimestamp: prev,
    });

    expect(result.distance).toBeGreaterThan(0);
    expect(result.timeDelta).toBe(30);
    expect(result.acceleration).not.toBe(0);
    expect(result.bearingChange).toBe(10);
  });

  it('sets zeros without previousLocation', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      accuracy: 5,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });

    expect(result.distance).toBe(0);
    expect(result.timeDelta).toBe(0);
    expect(result.acceleration).toBe(0);
    expect(result.bearingChange).toBe(0);
  });

  it('includes speedStatus from classifySpeed', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 100,
      bearing: 90,
      accuracy: 5,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });
    expect(result.speedStatus).toBe('سرعة عالية');
  });

  it('includes movementPattern from detectMovementPattern', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 0,
      bearing: 0,
      accuracy: 5,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });
    expect(result.movementPattern).toBe('توقف مؤقت');
  });

  it('quality = "عالية" when accuracy <= 10', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      accuracy: 5,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });
    expect(result.quality).toBe('عالية');
  });

  it('quality = "متوسطة" when accuracy 11-50', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      accuracy: 30,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });
    expect(result.quality).toBe('متوسطة');
  });

  it('quality = "منخفضة" when accuracy > 50', () => {
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      accuracy: 100,
      timestamp: new Date(),
      previousLocation: null,
      previousTimestamp: null,
    });
    expect(result.quality).toBe('منخفضة');
  });

  it('calculates acceleration correctly: (speed-prevSpeed)/3.6/timeDelta', () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 10000); // 10s
    const result = SmartGPSTrackingService.enrichLocationData({
      latitude: 24.71,
      longitude: 46.71,
      speed: 72,
      bearing: 90,
      accuracy: 5,
      timestamp: now,
      previousLocation: { coordinates: [46.7, 24.7], speed: 36, bearing: 90 },
      previousTimestamp: prev,
    });
    // (72-36)/3.6/10 = 36/3.6/10 = 1 m/s²
    expect(result.acceleration).toBeCloseTo(1, 1);
  });
});

/* ========================================================
   6. detectAnomalies
   ======================================================== */
describe('detectAnomalies', () => {
  const vehicle = buildVehicleDoc();

  it('detects extreme_acceleration when |acceleration| > 10', () => {
    const data = {
      speed: 60,
      acceleration: 11,
      bearingChange: 0,
      distance: 0,
      timeDelta: 10,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'extreme_acceleration')).toBe(true);
  });

  it('detects extreme_acceleration for negative acceleration < -10', () => {
    const data = {
      speed: 60,
      acceleration: -12,
      bearingChange: 0,
      distance: 0,
      timeDelta: 10,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'extreme_acceleration')).toBe(true);
  });

  it('detects sharp_turn when |bearingChange| > 60 and speed > 40', () => {
    const data = {
      speed: 50,
      acceleration: 0,
      bearingChange: 70,
      distance: 0,
      timeDelta: 10,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'sharp_turn')).toBe(true);
  });

  it('does NOT detect sharp_turn when speed <= 40', () => {
    const data = {
      speed: 30,
      acceleration: 0,
      bearingChange: 70,
      distance: 0,
      timeDelta: 10,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'sharp_turn')).toBe(false);
  });

  it('detects impossible_speed when speed > 150', () => {
    const data = {
      speed: 160,
      acceleration: 0,
      bearingChange: 0,
      distance: 0,
      timeDelta: 10,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'impossible_speed')).toBe(true);
  });

  it('detects gps_spoofing when distance > 10 and timeDelta < 10', () => {
    const data = {
      speed: 60,
      acceleration: 0,
      bearingChange: 0,
      distance: 15,
      timeDelta: 5,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'gps_spoofing')).toBe(true);
  });

  it('detects low_gps_accuracy when accuracy > 100', () => {
    const data = {
      speed: 60,
      acceleration: 0,
      bearingChange: 0,
      distance: 0,
      timeDelta: 10,
      accuracy: 150,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies.some(a => a.type === 'low_gps_accuracy')).toBe(true);
  });

  it('returns empty array for perfectly normal data', () => {
    const data = {
      speed: 60,
      acceleration: 2,
      bearingChange: 10,
      distance: 0.5,
      timeDelta: 30,
      accuracy: 5,
    };
    const anomalies = SmartGPSTrackingService.detectAnomalies(vehicle, data);
    expect(anomalies).toHaveLength(0);
  });
});

/* ========================================================
   7. generateSafetyAlerts
   ======================================================== */
describe('generateSafetyAlerts', () => {
  const vehicle = buildVehicleDoc();

  it('generates speeding alert (medium) when speed slightly exceeds speedLimit', () => {
    const data = {
      speed: 85,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 10,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    const speeding = alerts.find(a => a.type === 'speeding');
    expect(speeding).toBeDefined();
    expect(speeding.severity).toBe('medium');
  });

  it('generates speeding alert (high) when speed > speedLimit + 10', () => {
    const data = {
      speed: 95,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 10,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    const speeding = alerts.find(a => a.type === 'speeding');
    expect(speeding).toBeDefined();
    expect(speeding.severity).toBe('high');
  });

  it('generates speeding alert (critical) when speed > speedLimit + 30', () => {
    const data = {
      speed: 115,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 10,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    const speeding = alerts.find(a => a.type === 'speeding');
    expect(speeding).toBeDefined();
    expect(speeding.severity).toBe('critical');
  });

  it('generates harsh_braking alert when acceleration < -8', () => {
    const data = {
      speed: 60,
      acceleration: -9,
      bearingChange: 0,
      timeDelta: 10,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    expect(alerts.some(a => a.type === 'harsh_braking')).toBe(true);
  });

  it('generates harsh_acceleration alert when acceleration > 8', () => {
    const data = {
      speed: 60,
      acceleration: 9,
      bearingChange: 0,
      timeDelta: 10,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    expect(alerts.some(a => a.type === 'harsh_acceleration')).toBe(true);
  });

  it('generates prolonged_idle when speed=0 and timeDelta > 600', () => {
    const data = {
      speed: 0,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 700,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    expect(alerts.some(a => a.type === 'prolonged_idle')).toBe(true);
  });

  it('returns no alerts for normal driving data', () => {
    const data = {
      speed: 60,
      acceleration: 1,
      bearingChange: 5,
      timeDelta: 30,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    expect(alerts).toHaveLength(0);
  });

  it('does not generate idle alert when timeDelta <= 600', () => {
    const data = {
      speed: 0,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 300,
      latitude: 24.7,
      longitude: 46.7,
    };
    const alerts = SmartGPSTrackingService.generateSafetyAlerts(vehicle, data, null);
    expect(alerts.some(a => a.type === 'prolonged_idle')).toBe(false);
  });
});

/* ========================================================
   8. generateEfficiencyAlerts
   ======================================================== */
describe('generateEfficiencyAlerts', () => {
  it('generates high_fuel_consumption when averageConsumption > 10', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 15, currentFuelLevel: 50 } },
    });
    const alerts = SmartGPSTrackingService.generateEfficiencyAlerts(v);
    expect(alerts.some(a => a.type === 'high_fuel_consumption')).toBe(true);
  });

  it('generates low_fuel when currentFuelLevel < 20', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 8, currentFuelLevel: 15 } },
    });
    const alerts = SmartGPSTrackingService.generateEfficiencyAlerts(v);
    expect(alerts.some(a => a.type === 'low_fuel')).toBe(true);
  });

  it('low_fuel severity is "high" when level < 10', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 8, currentFuelLevel: 5 } },
    });
    const alerts = SmartGPSTrackingService.generateEfficiencyAlerts(v);
    const lowFuel = alerts.find(a => a.type === 'low_fuel');
    expect(lowFuel.severity).toBe('high');
  });

  it('low_fuel severity is "medium" when level 10-19', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 8, currentFuelLevel: 15 } },
    });
    const alerts = SmartGPSTrackingService.generateEfficiencyAlerts(v);
    const lowFuel = alerts.find(a => a.type === 'low_fuel');
    expect(lowFuel.severity).toBe('medium');
  });

  it('returns no alerts when fuel is fine', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 8, currentFuelLevel: 60 } },
    });
    const alerts = SmartGPSTrackingService.generateEfficiencyAlerts(v);
    expect(alerts).toHaveLength(0);
  });
});

/* ========================================================
   9. generateMaintenanceAlerts
   ======================================================== */
describe('generateMaintenanceAlerts', () => {
  it('generates maintenance_overdue when nextMaintenanceDate is in the past', () => {
    const v = buildVehicleDoc({
      maintenance: {
        nextMaintenanceDate: new Date(Date.now() - 86400000 * 5),
        tires: { averageWear: 40 },
        fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
      },
    });
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    expect(alerts.some(a => a.type === 'maintenance_overdue')).toBe(true);
  });

  it('generates maintenance_upcoming when within 7 days', () => {
    const v = buildVehicleDoc({
      maintenance: {
        nextMaintenanceDate: new Date(Date.now() + 86400000 * 3),
        tires: { averageWear: 40 },
        fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
      },
    });
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    expect(alerts.some(a => a.type === 'maintenance_upcoming')).toBe(true);
  });

  it('generates tire_wear when averageWear > 80', () => {
    const v = buildVehicleDoc({
      maintenance: {
        nextMaintenanceDate: new Date(Date.now() + 86400000 * 30),
        tires: { averageWear: 85 },
        fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
      },
    });
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    expect(alerts.some(a => a.type === 'tire_wear')).toBe(true);
  });

  it('returns no alerts when everything is fine', () => {
    const v = buildVehicleDoc();
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    expect(alerts).toHaveLength(0);
  });

  it('maintenance_overdue has severity "high"', () => {
    const v = buildVehicleDoc({
      maintenance: {
        nextMaintenanceDate: new Date(Date.now() - 86400000 * 10),
        tires: { averageWear: 40 },
        fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
      },
    });
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    const overdue = alerts.find(a => a.type === 'maintenance_overdue');
    expect(overdue.severity).toBe('high');
  });

  it('maintenance_upcoming has severity "medium"', () => {
    const v = buildVehicleDoc({
      maintenance: {
        nextMaintenanceDate: new Date(Date.now() + 86400000 * 5),
        tires: { averageWear: 40 },
        fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 },
      },
    });
    const alerts = SmartGPSTrackingService.generateMaintenanceAlerts(v);
    const upcoming = alerts.find(a => a.type === 'maintenance_upcoming');
    expect(upcoming.severity).toBe('medium');
  });
});

/* ========================================================
   10. generateBehaviorAlerts
   ======================================================== */
describe('generateBehaviorAlerts', () => {
  it('generates repeated_harsh_braking when harshBrakingCount > 5', async () => {
    const trip = { drivingBehavior: { harshBrakingCount: 8, speedingCount: 0 } };
    const vehicle = buildVehicleDoc();
    const data = { speed: 60, acceleration: 0, bearingChange: 0 };
    const alerts = await SmartGPSTrackingService.generateBehaviorAlerts(vehicle, trip, data);
    expect(alerts.some(a => a.type === 'repeated_harsh_braking')).toBe(true);
  });

  it('generates reckless_driving when speedingCount > 10', async () => {
    const trip = { drivingBehavior: { harshBrakingCount: 0, speedingCount: 15 } };
    const vehicle = buildVehicleDoc();
    const data = { speed: 60, acceleration: 0, bearingChange: 0 };
    const alerts = await SmartGPSTrackingService.generateBehaviorAlerts(vehicle, trip, data);
    expect(alerts.some(a => a.type === 'reckless_driving')).toBe(true);
  });

  it('returns no alerts when behavior is normal', async () => {
    const trip = { drivingBehavior: { harshBrakingCount: 2, speedingCount: 3 } };
    const vehicle = buildVehicleDoc();
    const data = { speed: 60, acceleration: 0, bearingChange: 0 };
    const alerts = await SmartGPSTrackingService.generateBehaviorAlerts(vehicle, trip, data);
    expect(alerts).toHaveLength(0);
  });

  it('returns empty when drivingBehavior is missing', async () => {
    const trip = {};
    const vehicle = buildVehicleDoc();
    const data = {};
    const alerts = await SmartGPSTrackingService.generateBehaviorAlerts(vehicle, trip, data);
    expect(alerts).toHaveLength(0);
  });

  it('generates both alerts when both thresholds exceeded', async () => {
    const trip = { drivingBehavior: { harshBrakingCount: 10, speedingCount: 20 } };
    const vehicle = buildVehicleDoc();
    const data = { speed: 60, acceleration: 0, bearingChange: 0 };
    const alerts = await SmartGPSTrackingService.generateBehaviorAlerts(vehicle, trip, data);
    expect(alerts).toHaveLength(2);
  });
});

/* ========================================================
   11. predictETA
   ======================================================== */
describe('predictETA', () => {
  let hourSpy;
  afterEach(() => {
    if (hourSpy) hourSpy.mockRestore();
  });

  it('returns ETA result with all expected fields', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const vehicle = buildVehicleDoc();
    const destination = { coordinates: [46.9, 24.9] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination);

    expect(result.success).toBe(true);
    expect(result.remainingDistance).toBeGreaterThan(0);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.eta).toBeDefined();
    expect(result.effectiveSpeed).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(50);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveProperty('traffic');
    expect(result.factors).toHaveProperty('weather');
    expect(result.factors).toHaveProperty('timeOfDay');
  });

  it('throws when vehicle has no currentLocation', async () => {
    const vehicle = buildVehicleDoc({ gpsTracking: {} });
    const destination = { coordinates: [46.9, 24.9] };
    await expect(SmartGPSTrackingService.predictETA(vehicle, destination)).rejects.toThrow(
      'الموقع الحالي غير متاح'
    );
  });

  it('throws when gpsTracking is null', async () => {
    const vehicle = buildVehicleDoc({ gpsTracking: null });
    const destination = { coordinates: [46.9, 24.9] };
    await expect(SmartGPSTrackingService.predictETA(vehicle, destination)).rejects.toThrow();
  });

  it('applies traffic factor during peak hours', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    const vehicle = buildVehicleDoc();
    const destination = { coordinates: [46.9, 24.9] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination);
    expect(result.factors.traffic).toBe(0.6);
  });

  it('applies traffic factor during off-peak hours', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const vehicle = buildVehicleDoc();
    const destination = { coordinates: [46.9, 24.9] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination);
    expect(result.factors.traffic).toBe(0.9);
  });

  it('weather factor is always 1.0', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const vehicle = buildVehicleDoc();
    const destination = { coordinates: [46.9, 24.9] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination);
    expect(result.factors.weather).toBe(1.0);
  });

  it('uses default speed 50 when no history', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [];
    const destination = { coordinates: [46.9, 24.9] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination);
    // effectiveSpeed = 50 * trafficFactor * weatherFactor * timeFactor
    // at hour 12: traffic=0.9, weather=1.0, time=1.0 → 50*0.9*1.0*1.0 = 45
    expect(result.effectiveSpeed).toBe(45);
  });

  it('accepts optional route parameter', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const vehicle = buildVehicleDoc();
    const destination = { coordinates: [46.9, 24.9] };
    const route = { waypoints: [] };
    const result = await SmartGPSTrackingService.predictETA(vehicle, destination, route);
    expect(result.success).toBe(true);
  });
});

/* ========================================================
   12. predictFuelConsumption
   ======================================================== */
describe('predictFuelConsumption', () => {
  it('calculates fuel for normal condition (factor=1.0)', () => {
    const v = buildVehicleDoc();
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'normal');
    // (100/100) * 8 * 1.0 = 8
    expect(result.estimatedFuelNeeded).toBe(8);
    expect(result.drivingCondition).toBe('normal');
  });

  it('calculates fuel for highway condition (factor=0.8)', () => {
    const v = buildVehicleDoc();
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'highway');
    // (100/100) * 8 * 0.8 = 6.4
    expect(result.estimatedFuelNeeded).toBe(6.4);
  });

  it('calculates fuel for city condition (factor=1.2)', () => {
    const v = buildVehicleDoc();
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'city');
    // (100/100) * 8 * 1.2 = 9.6
    expect(result.estimatedFuelNeeded).toBe(9.6);
  });

  it('calculates fuel for mountain condition (factor=1.5)', () => {
    const v = buildVehicleDoc();
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'mountain');
    // (100/100) * 8 * 1.5 = 12
    expect(result.estimatedFuelNeeded).toBe(12);
  });

  it('warning is true when fuelNeeded > currentFuelLevel', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 20, currentFuelLevel: 5 } },
    });
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'normal');
    // (100/100) * 20 * 1.0 = 20 > 5 → warning true
    expect(result.warning).toBe(true);
  });

  it('warning is false when fuel is sufficient', () => {
    const v = buildVehicleDoc({
      maintenance: { fuelConsumption: { averageConsumption: 8, currentFuelLevel: 50 } },
    });
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'normal');
    // (100/100) * 8 * 1.0 = 8 < 50 → warning false
    expect(result.warning).toBe(false);
  });

  it('uses default baseFuelConsumption of 8 when missing', () => {
    const v = buildVehicleDoc({ maintenance: undefined });
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 200, 'normal');
    // (200/100) * 8 * 1.0 = 16
    expect(result.estimatedFuelNeeded).toBe(16);
  });

  it('uses factor 1.0 for unknown condition', () => {
    const v = buildVehicleDoc();
    const result = SmartGPSTrackingService.predictFuelConsumption(v, 100, 'unknown');
    expect(result.estimatedFuelNeeded).toBe(8);
  });
});

/* ========================================================
   13. optimizeRoute
   ======================================================== */
describe('optimizeRoute', () => {
  it('returns optimized route with total distance and time', async () => {
    const vehicle = buildVehicleDoc();
    const pickupPoints = [{ coordinates: [46.75, 24.75] }];
    const dropoffPoints = [{ coordinates: [46.8, 24.8] }];

    const result = await SmartGPSTrackingService.optimizeRoute(
      vehicle,
      pickupPoints,
      dropoffPoints
    );

    expect(result.success).toBe(true);
    expect(result.optimizedRoute).toBeDefined();
    expect(result.optimizedRoute.length).toBe(3); // start + 1 pickup + 1 dropoff
    expect(result.totalDistance).toBeGreaterThan(0);
    expect(result.estimatedTime).toBeGreaterThan(0);
  });

  it('returns savings info', async () => {
    const vehicle = buildVehicleDoc();
    const pickupPoints = [{ coordinates: [46.75, 24.75] }];
    const dropoffPoints = [{ coordinates: [46.8, 24.8] }];

    const result = await SmartGPSTrackingService.optimizeRoute(
      vehicle,
      pickupPoints,
      dropoffPoints
    );
    expect(result.savings).toHaveProperty('distance');
    expect(result.savings).toHaveProperty('time');
    expect(result.savings).toHaveProperty('fuel');
  });

  it('handles multiple pickup and dropoff points', async () => {
    const vehicle = buildVehicleDoc();
    const pickupPoints = [{ coordinates: [46.75, 24.75] }, { coordinates: [46.76, 24.76] }];
    const dropoffPoints = [{ coordinates: [46.8, 24.8] }, { coordinates: [46.85, 24.85] }];

    const result = await SmartGPSTrackingService.optimizeRoute(
      vehicle,
      pickupPoints,
      dropoffPoints
    );
    expect(result.optimizedRoute.length).toBe(5);
  });

  it('throws error when gpsTracking is broken', async () => {
    const vehicle = buildVehicleDoc({ gpsTracking: {} });
    await expect(
      SmartGPSTrackingService.optimizeRoute(vehicle, [{ coordinates: [46.8, 24.8] }], [])
    ).rejects.toThrow();
  });

  it('handles empty dropoff points', async () => {
    const vehicle = buildVehicleDoc();
    const pickupPoints = [{ coordinates: [46.75, 24.75] }];
    const result = await SmartGPSTrackingService.optimizeRoute(vehicle, pickupPoints, []);
    expect(result.optimizedRoute.length).toBe(2);
  });
});

/* ========================================================
   14. Haversine + helpers
   ======================================================== */
describe('calculateDistanceHaversine', () => {
  it('returns 0 for the same point', () => {
    const d = SmartGPSTrackingService.calculateDistanceHaversine(24.7, 46.7, 24.7, 46.7);
    expect(d).toBe(0);
  });

  it('calculates approximate distance (Riyadh to Jeddah ~950km)', () => {
    // Riyadh: 24.7136, 46.6753 → Jeddah: 21.4858, 39.1925
    const d = SmartGPSTrackingService.calculateDistanceHaversine(
      24.7136,
      46.6753,
      21.4858,
      39.1925
    );
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(1100);
  });

  it('returns small distance for nearby points', () => {
    const d = SmartGPSTrackingService.calculateDistanceHaversine(24.7, 46.7, 24.701, 46.701);
    expect(d).toBeLessThan(1); // less than 1 km
    expect(d).toBeGreaterThan(0);
  });

  it('works across hemispheres', () => {
    const d = SmartGPSTrackingService.calculateDistanceHaversine(10, 10, -10, -10);
    expect(d).toBeGreaterThan(0);
  });
});

describe('toRad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(SmartGPSTrackingService.toRad(0)).toBe(0);
  });

  it('converts 180 degrees to PI', () => {
    expect(SmartGPSTrackingService.toRad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 90 degrees to PI/2', () => {
    expect(SmartGPSTrackingService.toRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it('converts 360 degrees to 2*PI', () => {
    expect(SmartGPSTrackingService.toRad(360)).toBeCloseTo(2 * Math.PI);
  });
});

describe('calculateBearingChange', () => {
  it('returns 0 when previous or current is falsy', () => {
    expect(SmartGPSTrackingService.calculateBearingChange(null, 90)).toBe(0);
    expect(SmartGPSTrackingService.calculateBearingChange(90, null)).toBe(0);
    expect(SmartGPSTrackingService.calculateBearingChange(0, 90)).toBe(0); // 0 is falsy
  });

  it('calculates simple difference', () => {
    expect(SmartGPSTrackingService.calculateBearingChange(90, 100)).toBe(10);
  });

  it('wraps around 360 → normalizes to -180..180', () => {
    // 350 → 10: diff = 10 - 350 = -340 → -340 + 360 = 20
    expect(SmartGPSTrackingService.calculateBearingChange(350, 10)).toBe(20);
  });

  it('wraps the other way', () => {
    // 10 → 350: diff = 350 - 10 = 340 → 340 - 360 = -20
    expect(SmartGPSTrackingService.calculateBearingChange(10, 350)).toBe(-20);
  });

  it('handles 180-degree turn', () => {
    // 90 → 270: diff = 270 - 90 = 180 → stays 180
    expect(SmartGPSTrackingService.calculateBearingChange(90, 270)).toBe(180);
  });
});

/* ========================================================
   15. addToLocationHistory
   ======================================================== */
describe('addToLocationHistory', () => {
  it('pushes enrichedData to locationHistory', () => {
    const vehicle = buildVehicleDoc();
    const data = {
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      timestamp: new Date(),
      accuracy: 5,
    };
    SmartGPSTrackingService.addToLocationHistory(vehicle, data);
    expect(vehicle.gpsTracking.locationHistory).toHaveLength(1);
    expect(vehicle.gpsTracking.locationHistory[0].latitude).toBe(24.7);
  });

  it('initializes locationHistory if missing', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = undefined;
    const data = {
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      timestamp: new Date(),
      accuracy: 5,
    };
    SmartGPSTrackingService.addToLocationHistory(vehicle, data);
    expect(vehicle.gpsTracking.locationHistory).toHaveLength(1);
  });

  it('caps at 10000 entries', () => {
    const vehicle = buildVehicleDoc();
    // Fill with 10000 items
    vehicle.gpsTracking.locationHistory = Array.from({ length: 10000 }, (_, i) => ({
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      bearing: 90,
      timestamp: new Date(),
      accuracy: 5,
    }));
    const data = {
      latitude: 25.0,
      longitude: 47.0,
      speed: 80,
      bearing: 180,
      timestamp: new Date(),
      accuracy: 5,
    };
    SmartGPSTrackingService.addToLocationHistory(vehicle, data);
    expect(vehicle.gpsTracking.locationHistory.length).toBe(10000);
    // last entry is the new one
    const last =
      vehicle.gpsTracking.locationHistory[vehicle.gpsTracking.locationHistory.length - 1];
    expect(last.latitude).toBe(25.0);
  });

  it('allows multiple pushes', () => {
    const vehicle = buildVehicleDoc();
    for (let i = 0; i < 5; i++) {
      const data = {
        latitude: 24.7 + i * 0.01,
        longitude: 46.7,
        speed: 60,
        bearing: 90,
        timestamp: new Date(),
        accuracy: 5,
      };
      SmartGPSTrackingService.addToLocationHistory(vehicle, data);
    }
    expect(vehicle.gpsTracking.locationHistory).toHaveLength(5);
  });

  it('slices oldest when exceeds 10000 (keeps newest)', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = Array.from({ length: 10000 }, (_, i) => ({
      latitude: i,
      longitude: 0,
      speed: 0,
      bearing: 0,
      timestamp: new Date(),
      accuracy: 0,
    }));
    const data = {
      latitude: 99999,
      longitude: 0,
      speed: 0,
      bearing: 0,
      timestamp: new Date(),
      accuracy: 0,
    };
    SmartGPSTrackingService.addToLocationHistory(vehicle, data);
    expect(vehicle.gpsTracking.locationHistory[0].latitude).toBe(1); // oldest (0) was removed
    expect(vehicle.gpsTracking.locationHistory[9999].latitude).toBe(99999);
  });
});

/* ========================================================
   16. getAverageSpeed
   ======================================================== */
describe('getAverageSpeed', () => {
  it('returns 50 when no locationHistory', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [];
    expect(SmartGPSTrackingService.getAverageSpeed(vehicle)).toBe(50);
  });

  it('returns 50 when gpsTracking is missing', () => {
    expect(SmartGPSTrackingService.getAverageSpeed({})).toBe(50);
  });

  it('calculates average of speeds', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 40 }, { speed: 60 }, { speed: 80 }];
    expect(SmartGPSTrackingService.getAverageSpeed(vehicle)).toBe(60);
  });

  it('treats missing speed as 0', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [
      { speed: 100 },
      {
        /* no speed */
      },
    ];
    expect(SmartGPSTrackingService.getAverageSpeed(vehicle)).toBe(50);
  });
});

/* ========================================================
   17. getSpeedLimitByZone
   ======================================================== */
describe('getSpeedLimitByZone', () => {
  it('returns 80 as default speed limit', () => {
    expect(SmartGPSTrackingService.getSpeedLimitByZone({ latitude: 24.7, longitude: 46.7 })).toBe(
      80
    );
  });
});

/* ========================================================
   18. Traffic / Weather / Time factors
   ======================================================== */
describe('getTrafficFactor', () => {
  let hourSpy;
  afterEach(() => {
    if (hourSpy) hourSpy.mockRestore();
  });

  it('returns 0.6 during morning peak (7-9)', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    const factor = await SmartGPSTrackingService.getTrafficFactor([46.7, 24.7], [46.9, 24.9]);
    expect(factor).toBe(0.6);
  });

  it('returns 0.6 during evening peak (16-18)', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(17);
    const factor = await SmartGPSTrackingService.getTrafficFactor([46.7, 24.7], [46.9, 24.9]);
    expect(factor).toBe(0.6);
  });

  it('returns 0.9 during off-peak hours', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    const factor = await SmartGPSTrackingService.getTrafficFactor([46.7, 24.7], [46.9, 24.9]);
    expect(factor).toBe(0.9);
  });

  it('returns 0.9 at night', async () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);
    const factor = await SmartGPSTrackingService.getTrafficFactor([46.7, 24.7], [46.9, 24.9]);
    expect(factor).toBe(0.9);
  });
});

describe('getWeatherFactor', () => {
  it('always returns 1.0', async () => {
    const factor = await SmartGPSTrackingService.getWeatherFactor([46.7, 24.7]);
    expect(factor).toBe(1.0);
  });
});

describe('getTimeOfDayFactor', () => {
  let hourSpy;
  afterEach(() => {
    if (hourSpy) hourSpy.mockRestore();
  });

  it('returns 0.8 during morning rush (6-8)', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(7);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(0.8);
  });

  it('returns 0.7 during evening rush (17-19)', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(0.7);
  });

  it('returns 1.0 during midday', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(1.0);
  });

  it('returns 1.0 at night', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(1.0);
  });

  it('returns 0.8 at boundary hour 6', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(0.8);
  });

  it('returns 0.7 at boundary hour 19', () => {
    hourSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
    expect(SmartGPSTrackingService.getTimeOfDayFactor()).toBe(0.7);
  });
});

/* ========================================================
   19. calculateETAConfidence + getSpeedVariation
   ======================================================== */
describe('calculateETAConfidence', () => {
  it('returns value between 50 and 100', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 60 }, { speed: 70 }, { speed: 65 }];
    const confidence = SmartGPSTrackingService.calculateETAConfidence(vehicle, 60, 100);
    expect(confidence).toBeGreaterThanOrEqual(50);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('returns 100 (max) for zero variation (consistent speeds)', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 60 }, { speed: 60 }, { speed: 60 }];
    const confidence = SmartGPSTrackingService.calculateETAConfidence(vehicle, 60, 100);
    expect(confidence).toBe(100);
  });

  it('returns lower confidence for high speed variation', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [
      { speed: 10 },
      { speed: 100 },
      { speed: 10 },
      { speed: 100 },
    ];
    const confidence = SmartGPSTrackingService.calculateETAConfidence(vehicle, 60, 100);
    expect(confidence).toBeLessThan(100);
  });

  it('returns 100 when history is too short for variation', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 60 }];
    const confidence = SmartGPSTrackingService.calculateETAConfidence(vehicle, 60, 100);
    expect(confidence).toBe(100);
  });
});

describe('getSpeedVariation', () => {
  it('returns 0 when history has fewer than 2 entries', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 60 }];
    expect(SmartGPSTrackingService.getSpeedVariation(vehicle)).toBe(0);
  });

  it('returns 0 for identical speeds', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 60 }, { speed: 60 }];
    expect(SmartGPSTrackingService.getSpeedVariation(vehicle)).toBe(0);
  });

  it('returns positive value for varying speeds', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 40 }, { speed: 80 }];
    expect(SmartGPSTrackingService.getSpeedVariation(vehicle)).toBeGreaterThan(0);
  });

  it('returns coefficient of variation (stddev / mean)', () => {
    const vehicle = buildVehicleDoc();
    vehicle.gpsTracking.locationHistory = [{ speed: 40 }, { speed: 60 }];
    // mean = 50, variance = ((40-50)²+(60-50)²)/2 = 100, stddev = 10
    // CV = 10/50 = 0.2
    expect(SmartGPSTrackingService.getSpeedVariation(vehicle)).toBeCloseTo(0.2);
  });
});

/* ========================================================
   20. findOptimalSequence
   ======================================================== */
describe('findOptimalSequence', () => {
  it('returns start as first element', () => {
    const start = [46.7, 24.7];
    const pickups = [[46.75, 24.75]];
    const dropoffs = [[46.8, 24.8]];
    const seq = SmartGPSTrackingService.findOptimalSequence(start, pickups, dropoffs);
    expect(seq[0]).toEqual(start);
  });

  it('includes all points in result', () => {
    const start = [46.7, 24.7];
    const pickups = [
      [46.75, 24.75],
      [46.76, 24.76],
    ];
    const dropoffs = [[46.8, 24.8]];
    const seq = SmartGPSTrackingService.findOptimalSequence(start, pickups, dropoffs);
    expect(seq).toHaveLength(4);
  });

  it('handles single pickup and no dropoff', () => {
    const start = [46.7, 24.7];
    const seq = SmartGPSTrackingService.findOptimalSequence(start, [[46.75, 24.75]], []);
    expect(seq).toHaveLength(2);
  });

  it('handles empty pickups and empty dropoffs', () => {
    const start = [46.7, 24.7];
    const seq = SmartGPSTrackingService.findOptimalSequence(start, [], []);
    expect(seq).toEqual([start]);
  });

  it('orders by nearest-neighbor', () => {
    const start = [0, 0];
    const pickups = [
      [10, 10],
      [1, 1],
    ]; // [1,1] is closer to start
    const dropoffs = [];
    const seq = SmartGPSTrackingService.findOptimalSequence(start, pickups, dropoffs);
    expect(seq[1]).toEqual([1, 1]);
    expect(seq[2]).toEqual([10, 10]);
  });
});

/* ========================================================
   21. getActiveTrip + updateTripData
   ======================================================== */
describe('getActiveTrip', () => {
  it('calls Trip.findOne with vehicleId and active statuses', async () => {
    mockTrip.findOne.mockResolvedValue({ _id: 't1', status: 'active' });
    const result = await SmartGPSTrackingService.getActiveTrip('v1');
    expect(mockTrip.findOne).toHaveBeenCalledWith({
      vehicle: 'v1',
      status: { $in: ['جارية', 'active', 'in-progress'] },
    });
    expect(result._id).toBe('t1');
  });

  it('returns null when no active trip', async () => {
    mockTrip.findOne.mockResolvedValue(null);
    const result = await SmartGPSTrackingService.getActiveTrip('v1');
    expect(result).toBeNull();
  });
});

describe('updateTripData', () => {
  it('pushes location to trip.route', () => {
    const trip = {};
    const data = {
      latitude: 24.7,
      longitude: 46.7,
      speed: 60,
      timestamp: new Date(),
      distance: 1.5,
    };
    SmartGPSTrackingService.updateTripData(trip, data);
    expect(trip.route).toHaveLength(1);
    expect(trip.route[0].latitude).toBe(24.7);
  });

  it('updates statistics.totalDistance', () => {
    const trip = { route: [], statistics: { totalDistance: 10 } };
    const data = { latitude: 24.7, longitude: 46.7, speed: 60, timestamp: new Date(), distance: 5 };
    SmartGPSTrackingService.updateTripData(trip, data);
    expect(trip.statistics.totalDistance).toBe(15);
  });

  it('updates statistics.maxSpeed', () => {
    const trip = { route: [], statistics: { maxSpeed: 60 } };
    const data = {
      latitude: 24.7,
      longitude: 46.7,
      speed: 100,
      timestamp: new Date(),
      distance: 0,
    };
    SmartGPSTrackingService.updateTripData(trip, data);
    expect(trip.statistics.maxSpeed).toBe(100);
  });

  it('initializes route and statistics if missing', () => {
    const trip = {};
    const data = { latitude: 24.7, longitude: 46.7, speed: 80, timestamp: new Date(), distance: 2 };
    SmartGPSTrackingService.updateTripData(trip, data);
    expect(trip.route).toBeDefined();
    expect(trip.statistics).toBeDefined();
    expect(trip.statistics.totalDistance).toBe(2);
    expect(trip.statistics.maxSpeed).toBe(80);
  });
});

/* ========================================================
   22. updateLocationWithIntelligence (full pipeline)
   ======================================================== */
describe('updateLocationWithIntelligence', () => {
  it('succeeds with full pipeline', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(null);

    const result = await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 60,
      bearing: 95,
      accuracy: 5,
    });

    expect(result.success).toBe(true);
    expect(result.vehicle).toBeDefined();
    expect(result.vehicle.id).toBe('v1');
    expect(vehicleDoc.save).toHaveBeenCalled();
  });

  it('throws when vehicle not found', async () => {
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    await expect(
      SmartGPSTrackingService.updateLocationWithIntelligence('nonexistent', {
        latitude: 24.7,
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).rejects.toThrow('المركبة غير موجودة');
  });

  it('throws when GPS data is invalid (missing latitude)', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });

    await expect(
      SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
        longitude: 46.7,
        speed: 0,
        bearing: 0,
        accuracy: 5,
      })
    ).rejects.toThrow('بيانات الموقع ناقصة');
  });

  it('saves vehicle after update', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(null);

    await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 60,
      bearing: 90,
      accuracy: 5,
    });

    expect(vehicleDoc.save).toHaveBeenCalledTimes(1);
  });

  it('updates gpsTracking fields on vehicle', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(null);

    await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 70,
      bearing: 100,
      accuracy: 8,
    });

    expect(vehicleDoc.gpsTracking.currentSpeed).toBe(70);
    expect(vehicleDoc.gpsTracking.heading).toBe(100);
    expect(vehicleDoc.gpsTracking.accuracy).toBe(8);
  });

  it('calls addToLocationHistory', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(null);

    await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 60,
      bearing: 90,
      accuracy: 5,
    });

    expect(vehicleDoc.gpsTracking.locationHistory.length).toBeGreaterThan(0);
  });

  it('updates trip data when active trip exists', async () => {
    const vehicleDoc = buildVehicleDoc();
    const trip = { route: [], statistics: { totalDistance: 0, maxSpeed: 0 } };
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(trip);

    await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 60,
      bearing: 90,
      accuracy: 5,
    });

    expect(trip.route.length).toBeGreaterThan(0);
  });

  it('returns anomalies array in result', async () => {
    const vehicleDoc = buildVehicleDoc();
    mockVehicle.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(vehicleDoc) });
    mockTrip.findOne.mockResolvedValue(null);

    const result = await SmartGPSTrackingService.updateLocationWithIntelligence('v1', {
      latitude: 24.71,
      longitude: 46.71,
      speed: 60,
      bearing: 90,
      accuracy: 5,
    });

    expect(result.vehicle.anomalies).toBeDefined();
    expect(Array.isArray(result.vehicle.anomalies)).toBe(true);
  });
});

/* ========================================================
   23. generateSmartAlerts (combines all alert types)
   ======================================================== */
describe('generateSmartAlerts', () => {
  it('returns combined alerts from safety + efficiency + maintenance', async () => {
    const vehicle = buildVehicleDoc({
      maintenance: {
        fuelConsumption: { averageConsumption: 15, currentFuelLevel: 5 },
        nextMaintenanceDate: new Date(Date.now() - 86400000 * 5),
        tires: { averageWear: 90 },
      },
    });
    const data = {
      speed: 120,
      acceleration: -9,
      bearingChange: 10,
      timeDelta: 30,
      latitude: 24.7,
      longitude: 46.7,
      accuracy: 5,
    };
    const alerts = await SmartGPSTrackingService.generateSmartAlerts(vehicle, data, null);
    // Should include safety (speeding + harsh_braking) + efficiency (high_fuel + low_fuel) + maintenance (overdue + tire)
    expect(alerts.length).toBeGreaterThanOrEqual(4);
  });

  it('includes behavior alerts when trip is provided', async () => {
    const vehicle = buildVehicleDoc();
    const trip = { drivingBehavior: { harshBrakingCount: 10, speedingCount: 15 } };
    const data = {
      speed: 60,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 30,
      latitude: 24.7,
      longitude: 46.7,
      accuracy: 5,
    };
    const alerts = await SmartGPSTrackingService.generateSmartAlerts(vehicle, data, trip);
    expect(alerts.some(a => a.type === 'repeated_harsh_braking')).toBe(true);
    expect(alerts.some(a => a.type === 'reckless_driving')).toBe(true);
  });

  it('returns empty array when everything is normal', async () => {
    const vehicle = buildVehicleDoc();
    const data = {
      speed: 60,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 30,
      latitude: 24.7,
      longitude: 46.7,
      accuracy: 5,
    };
    const alerts = await SmartGPSTrackingService.generateSmartAlerts(vehicle, data, null);
    expect(alerts).toHaveLength(0);
  });

  it('filters out null/undefined alerts', async () => {
    const vehicle = buildVehicleDoc();
    const data = {
      speed: 60,
      acceleration: 0,
      bearingChange: 0,
      timeDelta: 30,
      latitude: 24.7,
      longitude: 46.7,
      accuracy: 5,
    };
    const alerts = await SmartGPSTrackingService.generateSmartAlerts(vehicle, data, null);
    alerts.forEach(a => {
      expect(a).not.toBeNull();
      expect(a).not.toBeUndefined();
    });
  });
});
